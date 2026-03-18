import { ethers } from "ethers";
import { apiCall } from "./api";

const EXECUTION_API_BASE = "/execution";

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const isUserRejectedTx = (error) => {
  // MetaMask / EIP-1193 user rejected request
  if (!error) return false;
  if (error.code === 4001) return true;
  const msg = String(error.message || error).toLowerCase();
  return msg.includes("user rejected") || msg.includes("rejected the request");
};

export async function executePortfolioOnChain(
  execution,
  { onUpdate, onPrompt } = {},
) {
  const { chain, sourceToken, positions, portfolioData } = execution;

  const jwt = localStorage.getItem("authToken");
  if (!jwt) {
    throw new Error("You must be logged in before executing a portfolio.");
  }

  if (!window.ethereum) {
    throw new Error(
      "Wallet not found. Please install a Web3 wallet (e.g. MetaMask).",
    );
  }

  const provider = new ethers.providers.Web3Provider(window.ethereum);
  const signer = provider.getSigner();

  const network = await provider.getNetwork();
  if (Number(network.chainId) !== 56) {
    throw new Error(
      "Please switch your wallet to BNB Chain (chainId 56) before executing on-chain.",
    );
  }

  const update = (step, payload) => {
    if (typeof onUpdate === "function") {
      onUpdate({ step, ...payload });
    }
  };

  // ── Step 1: Quote all positions ──
  update("QUOTE_START", { chain, sourceToken });

  const quoteData = await apiCall(`${EXECUTION_API_BASE}/quote`, {
    method: "POST",
    body: JSON.stringify({
      positions: positions.map((p) => ({
        symbol: p.symbol,
        contractAddress: p.contractAddress,
        allocationUsd: p.allocationUsd,
      })),
      sourceToken,
      chain,
      totalInvestment: portfolioData.totalInvestment,
    }),
  });

  const quotedPositions = (quoteData.positions || []).filter((p) => !p.error);
  const failedPositions = (quoteData.positions || []).filter((p) => p.error);

  update("QUOTE_COMPLETE", {
    quotedCount: quotedPositions.length,
    failedCount: failedPositions.length,
    failedPositions,
  });

  if (quotedPositions.length === 0) {
    throw new Error("All quotes failed. Try a different amount or tokens.");
  }

  // ── Step 2: Approve (USDT/USDC only) ──
  // Collect unique approval targets across Bridgers and PancakeSwap positions
  if (sourceToken !== "BNB") {
    const erc20Abi = [
      "function approve(address spender, uint256 amount) returns (bool)",
    ];
    const fromTokenAddress = quoteData.fromTokenAddress;
    const sourceContract = new ethers.Contract(
      fromTokenAddress,
      erc20Abi,
      signer,
    );

    const approvalTargets = new Set();
    for (const pos of quotedPositions) {
      const target =
        pos.swapProvider === "PANCAKESWAP"
          ? pos.approvalContract
          : pos.quote?.contractAddress;
      if (target) {
        approvalTargets.add(target);
      }
    }

    if (approvalTargets.size > 0) {
      update("APPROVAL_START", {
        fromTokenAddress,
        sourceToken,
        approvalTargets: Array.from(approvalTargets),
      });

      // Approve each unique target (usually 1–2 approvals)
      for (const target of approvalTargets) {
        const tx = await sourceContract.approve(
          target,
          ethers.constants.MaxUint256,
        );
        await tx.wait();
        update("APPROVAL_PROGRESS", { target, txHash: tx.hash });
      }

      update("APPROVAL_COMPLETE", {});
    }
  }

  // ── Step 3: Execute each position sequentially ──
  const confirmedOrderIds = [];
  const cancelledOrderIds = [];
  const skipped = [];

  for (const pos of quotedPositions) {
    update("POSITION_START", {
      symbol: pos.symbol,
      executionOrderId: pos.executionOrderId,
    });

    let done = false;
    while (!done) {
      try {
        // 1) /prepare → fresh txData
        const prepData = await apiCall(
          `${EXECUTION_API_BASE}/${pos.executionOrderId}/prepare`,
          {
            method: "POST",
            body: JSON.stringify({ slippage: 3 }),
          },
        );

        update("POSITION_PREPARED", {
          symbol: pos.symbol,
          executionOrderId: pos.executionOrderId,
        });

        const txData = prepData.txData;

        // 2) Send to wallet
        let tx;
        try {
          const nonce =
            txData && txData.nonce != null && txData.nonce !== ""
              ? txData.nonce
              : undefined;
          const gasLimit =
            txData && txData.gasLimit != null && txData.gasLimit !== ""
              ? txData.gasLimit
              : undefined;
          tx = await signer.sendTransaction({
            data: txData.data,
            to: txData.to,
            value: txData.value,
            ...(nonce !== undefined && { nonce }),
            ...(gasLimit !== undefined && { gasLimit }),
          });
        } catch (err) {
          console.error(err);
          // 4) MetaMask rejects (no txHash): offer Retry (call /prepare again for fresh nonce)
          if (isUserRejectedTx(err)) {
            update("POSITION_REJECTED", {
              symbol: pos.symbol,
              executionOrderId: pos.executionOrderId,
            });

            const decision =
              typeof onPrompt === "function"
                ? await onPrompt({
                    symbol: pos.symbol,
                    executionOrderId: pos.executionOrderId,
                  })
                : "retry";

            if (decision === "retry") {
              continue;
            }

            // Default to retry if unknown decision
            continue;
          }
          throw err;
        }

        update("POSITION_TX_SUBMITTED", {
          symbol: pos.symbol,
          executionOrderId: pos.executionOrderId,
          txHash: tx.hash,
        });

        try {
          // 3) If wallet succeeds → /submit with txHash
          const receipt = await tx.wait();
          await apiCall(
            `${EXECUTION_API_BASE}/${pos.executionOrderId}/submit`,
            {
              method: "POST",
              body: JSON.stringify({ txHash: receipt.transactionHash }),
            },
          );

          // Poll for CONFIRMED/FAILED
          let status = "TX_SUBMITTED";
          let attempts = 0;

          while (!["CONFIRMED", "FAILED"].includes(status) && attempts < 60) {
            await sleep(4000);
            const statusData = await apiCall(
              `${EXECUTION_API_BASE}/${pos.executionOrderId}/status`,
            );
            status = statusData.status;
            attempts += 1;

            update("POSITION_STATUS", {
              symbol: pos.symbol,
              executionOrderId: pos.executionOrderId,
              status,
            });
          }

          if (status === "CONFIRMED") {
            confirmedOrderIds.push(pos.executionOrderId);
            update("POSITION_CONFIRMED", {
              symbol: pos.symbol,
              executionOrderId: pos.executionOrderId,
            });
          } else {
            // best effort: cancel failed orders so /complete can accept partial fills
            try {
              await apiCall(
                `${EXECUTION_API_BASE}/${pos.executionOrderId}/cancel`,
                { method: "POST" },
              );
              cancelledOrderIds.push(pos.executionOrderId);
              skipped.push({
                executionOrderId: pos.executionOrderId,
                symbol: pos.symbol,
                reason: "FAILED",
              });
              update("POSITION_CANCELLED", {
                symbol: pos.symbol,
                executionOrderId: pos.executionOrderId,
              });
            } catch (err) {
              console.error(err);
              update("POSITION_FAILED", {
                symbol: pos.symbol,
                executionOrderId: pos.executionOrderId,
              });
            }
          }

          done = true;
        } catch (waitError) {
          // Handle tx dropped/cancelled by the network or JSON-RPC failures
          console.error(
            `JSON-RPC error while waiting for ${pos.symbol} transaction:`,
            waitError,
          );

          const friendly =
            "The transaction was dropped or cancelled by the network. Skipping to the next token.";
          update("POSITION_ERROR", {
            symbol: pos.symbol,
            executionOrderId: pos.executionOrderId,
            error: friendly,
          });

          try {
            await apiCall(
              `${EXECUTION_API_BASE}/${pos.executionOrderId}/cancel`,
              { method: "POST" },
            );
            cancelledOrderIds.push(pos.executionOrderId);
            skipped.push({
              executionOrderId: pos.executionOrderId,
              symbol: pos.symbol,
              reason: "DROPPED_OR_CANCELLED",
            });
            update("POSITION_CANCELLED", {
              symbol: pos.symbol,
              executionOrderId: pos.executionOrderId,
            });
          } catch (err) {
            console.error(err);
            // ignore; we've already informed the user and will move on
          }

          done = true;
        }
      } catch (error) {
        console.error(`Swap failed for ${pos.symbol}:`, error);
        const friendlyMessage = isUserRejectedTx(error)
          ? "The transaction was rejected in your wallet."
          : "The transaction failed unexpectedly. It may have been dropped or replaced. You can try again or skip this token.";
        update("POSITION_ERROR", {
          symbol: pos.symbol,
          executionOrderId: pos.executionOrderId,
          error: friendlyMessage,
        });

        // non-user-rejection errors: cancel and continue
        try {
          await apiCall(
            `${EXECUTION_API_BASE}/${pos.executionOrderId}/cancel`,
            {
              method: "POST",
            },
          );
          cancelledOrderIds.push(pos.executionOrderId);
          skipped.push({
            executionOrderId: pos.executionOrderId,
            symbol: pos.symbol,
            reason: "ERROR",
          });
          update("POSITION_CANCELLED", {
            symbol: pos.symbol,
            executionOrderId: pos.executionOrderId,
          });
        } catch (err) {
          console.error(err);
          // give up on cancelling; still mark done so flow can proceed
        }
        done = true;
      }
    }
  }

  // ── Step 4: Complete — create the portfolio ──
  const finalizedOrderIds = [...confirmedOrderIds, ...cancelledOrderIds];
  if (finalizedOrderIds.length === 0) {
    throw new Error(
      "No swaps were executed or finalized. Portfolio not created.",
    );
  }
  if (confirmedOrderIds.length === 0) {
    throw new Error("No swaps were confirmed. Portfolio not created.");
  }

  // Adjust totalInvestment to only include confirmed positions
  const confirmedPositions = quotedPositions.filter((p) =>
    confirmedOrderIds.includes(p.executionOrderId),
  );
  const adjustedTotalInvestment = confirmedPositions.reduce(
    (sum, p) => sum + (p.allocationUsd || 0),
    0,
  );

  const completeData = await apiCall(`${EXECUTION_API_BASE}/complete`, {
    method: "POST",
    body: JSON.stringify({
      executionOrderIds: finalizedOrderIds,
      portfolioData: {
        ...portfolioData,
        chain,
        sourceToken,
        totalInvestment: adjustedTotalInvestment,
      },
    }),
  });

  update("COMPLETE", {
    portfolioId: completeData.portfolioId,
    skipped: completeData.skipped ?? skipped,
    summary: completeData.summary,
    portfolio: completeData,
  });

  return completeData;
}
