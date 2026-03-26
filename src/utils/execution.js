import { ethers } from "ethers";
import {
  readContract as wagmiReadContract,
  sendTransaction as wagmiSendTransaction,
  waitForTransactionReceipt as wagmiWaitForTransactionReceipt,
} from "@wagmi/core";
import { encodeFunctionData } from "viem";
import { apiCall } from "./api";
import { wagmiClient } from "../wagmiConnectors";
const EXECUTION_API_BASE = "/execution";

const PERMIT2_ADDRESS = "0x31c2F6fcFf4F8759b3Bd5Bf0e1084A055615c768";
const MAX_UINT256 = BigInt(
  "0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff",
);
const MAX_UINT160 = BigInt("0xffffffffffffffffffffffffffffffffffffffff");
const MAX_UINT48 = BigInt("0xffffffffffff");

const ERC20_ABI = [
  {
    name: "approve",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    name: "allowance",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" },
    ],
    outputs: [{ name: "", type: "uint256" }],
  },
];

const PERMIT2_ABI = [
  {
    name: "approve",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "token", type: "address" },
      { name: "spender", type: "address" },
      { name: "amount", type: "uint160" },
      { name: "expiration", type: "uint48" },
    ],
    outputs: [],
  },
  {
    name: "allowance",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "owner", type: "address" },
      { name: "token", type: "address" },
      { name: "spender", type: "address" },
    ],
    outputs: [
      { name: "amount", type: "uint160" },
      { name: "expiration", type: "uint48" },
      { name: "nonce", type: "uint48" },
    ],
  },
];

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const isUserRejectedTx = (error) => {
  // MetaMask / EIP-1193 user rejected request
  if (!error) return false;
  if (error.code === 4001) return true;
  const msg = String(error.message || error).toLowerCase();
  return msg.includes("user rejected") || msg.includes("rejected the request");
};

const isExecutionReverted = (error) => {
  if (!error) return false;
  const msg = String(error.message || error).toLowerCase();
  const details = String(error.details || "").toLowerCase();
  const causeMsg = String(error?.cause?.message || "").toLowerCase();
  return (
    msg.includes("execution reverted") ||
    msg.includes("callexecutionerror") ||
    msg.includes("code=call_exception") ||
    details.includes("execution reverted") ||
    causeMsg.includes("execution reverted")
  );
};

const parseBigInt = (value, fallback = 0n) => {
  if (value == null || value === "") return fallback;
  try {
    return BigInt(value);
  } catch {
    return fallback;
  }
};

const buildApprovalStepCalldata = (approvalStep) => {
  const method = approvalStep?.tx?.method;
  const args = approvalStep?.tx?.args || [];

  if (method === "approve(address,uint256)") {
    return encodeFunctionData({
      abi: ERC20_ABI,
      functionName: "approve",
      args: [args[0], parseBigInt(args[1], MAX_UINT256)],
    });
  }

  if (method === "approve(address,address,uint160,uint48)") {
    return encodeFunctionData({
      abi: PERMIT2_ABI,
      functionName: "approve",
      args: [
        args[0],
        args[1],
        parseBigInt(args[2], MAX_UINT160),
        parseBigInt(args[3], MAX_UINT48),
      ],
    });
  }

  throw new Error(`Unsupported approval method: ${method || "unknown"}`);
};

async function executeApprovalSteps({ approvalSteps, account, update, chainId = 56 }) {
  for (const approvalStep of approvalSteps) {
    const to = approvalStep?.tx?.to;
    if (!to) throw new Error("Missing approval transaction target");

    const data = buildApprovalStepCalldata(approvalStep);
    const txHash = await wagmiSendTransaction(wagmiClient, {
      account,
      chainId,
      to,
      data,
      value: 0n,
    });
    await wagmiWaitForTransactionReceipt(wagmiClient, { hash: txHash });
    update("APPROVAL_PROGRESS", {
      target: to,
      txHash,
      type: approvalStep?.step || "APPROVAL_STEP",
    });
  }
}

async function ensureApprovals({
  permit2Approval,
  fromTokenAddress,
  userAddress,
  requiredAmount,
  update,
}) {
  const permit2Address = permit2Approval?.permit2Address || PERMIT2_ADDRESS;
  const routerAddress = permit2Approval?.spender;

  if (!fromTokenAddress || !routerAddress) return;

  const chainId = 56;
  const now = BigInt(Math.floor(Date.now() / 1000));

  // Approval 1: ERC20 approve token -> Permit2
  const erc20Allowance = await wagmiReadContract(wagmiClient, {
    address: fromTokenAddress,
    abi: ERC20_ABI,
    functionName: "allowance",
    args: [userAddress, permit2Address],
    chainId,
  });

  if (parseBigInt(erc20Allowance) < requiredAmount) {
    const approveData = encodeFunctionData({
      abi: ERC20_ABI,
      functionName: "approve",
      args: [permit2Address, MAX_UINT256],
    });

    const txHash = await wagmiSendTransaction(wagmiClient, {
      account: userAddress,
      chainId,
      to: fromTokenAddress,
      data: approveData,
      value: 0n,
    });

    await wagmiWaitForTransactionReceipt(wagmiClient, { hash: txHash });
    update("APPROVAL_PROGRESS", {
      target: permit2Address,
      txHash,
      type: "ERC20_TO_PERMIT2",
    });
  }

  // Approval 2: Permit2 approve token -> Universal Router
  const permit2AllowanceRaw = await wagmiReadContract(wagmiClient, {
    address: permit2Address,
    abi: PERMIT2_ABI,
    functionName: "allowance",
    args: [userAddress, fromTokenAddress, routerAddress],
    chainId,
  });

  const permit2Amount = parseBigInt(
    Array.isArray(permit2AllowanceRaw)
      ? permit2AllowanceRaw[0]
      : permit2AllowanceRaw?.amount,
  );
  const permit2Expiry = parseBigInt(
    Array.isArray(permit2AllowanceRaw)
      ? permit2AllowanceRaw[1]
      : permit2AllowanceRaw?.expiration,
  );

  if (permit2Amount < requiredAmount || permit2Expiry < now) {
    const permit2ApproveData = encodeFunctionData({
      abi: PERMIT2_ABI,
      functionName: "approve",
      args: [fromTokenAddress, routerAddress, MAX_UINT160, MAX_UINT48],
    });

    const txHash = await wagmiSendTransaction(wagmiClient, {
      account: userAddress,
      chainId,
      to: permit2Address,
      data: permit2ApproveData,
      value: 0n,
    });

    await wagmiWaitForTransactionReceipt(wagmiClient, { hash: txHash });
    update("APPROVAL_PROGRESS", {
      target: routerAddress,
      txHash,
      type: "PERMIT2_TO_ROUTER",
    });
  }
}

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
  const userAddress = await signer.getAddress();

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
  const failedTokens = Array.isArray(quoteData.failedTokens)
    ? quoteData.failedTokens
    : [];

  update("QUOTE_COMPLETE", {
    quotedCount: quotedPositions.length,
    failedCount: failedPositions.length,
    failedPositions,
    failedTokens,
    summary: quoteData.summary,
  });

  if (failedTokens.length > 0 && typeof onPrompt === "function") {
    const decision = await onPrompt({
      type: "QUOTE_FAILED_TOKENS",
      failedTokens,
      quotedCount: quotedPositions.length,
      summary: quoteData.summary,
      sourceToken,
    });

    if (decision === "edit") {
      throw new Error(
        "Execution paused. Edit your portfolio and replace tokens without valid swap routes.",
      );
    }
  }

  if (quotedPositions.length === 0) {
    throw new Error("All quotes failed. Try a different amount or tokens.");
  }

  // ── Step 2: Execute each position sequentially ──
  const confirmedOrderIds = [];
  const cancelledOrderIds = [];
  const skipped = [];
  const ensuredApprovalKeys = new Set();

  for (const pos of quotedPositions) {
    update("POSITION_START", {
      symbol: pos.symbol,
      executionOrderId: pos.executionOrderId,
    });

    let done = false;
    while (!done) {
      try {
        // 1) /prepare → fresh txData
        let prepData;
        let prepareAttempts = 0;
        while (!prepData && prepareAttempts < 5) {
          prepareAttempts += 1;
          try {
            prepData = await apiCall(
              `${EXECUTION_API_BASE}/${pos.executionOrderId}/prepare`,
              {
                method: "POST",
                body: JSON.stringify({ slippage: 3 }),
              },
            );
          } catch (prepareError) {
            const approvalSteps = prepareError?.data?.approvalSteps;
            const needsApproval =
              prepareError?.status === 428 &&
              Array.isArray(approvalSteps) &&
              approvalSteps.length > 0;

            if (!needsApproval) {
              throw prepareError;
            }

            update("APPROVAL_START", {
              symbol: pos.symbol,
              executionOrderId: pos.executionOrderId,
              fromTokenAddress: prepareError?.data?.fromTokenAddress,
              permit2Address: prepareError?.data?.permit2Address,
              routerAddress: prepareError?.data?.universalRouterAddress,
            });

            await executeApprovalSteps({
              approvalSteps,
              account: userAddress,
              update,
            });

            update("APPROVAL_COMPLETE", {
              symbol: pos.symbol,
              executionOrderId: pos.executionOrderId,
            });
          }
        }

        if (!prepData) {
          throw new Error(
            "Unable to prepare swap after completing required approvals.",
          );
        }

        update("POSITION_PREPARED", {
          symbol: pos.symbol,
          executionOrderId: pos.executionOrderId,
        });

        const txData = prepData.txData;

        // Ensure approvals using /prepare payload (authoritative source).
        if (sourceToken !== "BNB" && prepData?.approvalNeeded) {
          const fromTokenAddress =
            prepData.fromTokenAddress || quoteData.fromTokenAddress;
          const permit2Approval = prepData.permit2Approval || {
            permit2Address:
              prepData.approvalContract || quoteData.approvalContract,
            spender: txData?.to,
          };
          const permit2Address =
            permit2Approval?.permit2Address || PERMIT2_ADDRESS;
          const routerAddress = permit2Approval?.spender || txData?.to;
          const approvalKey = [
            String(userAddress).toLowerCase(),
            String(fromTokenAddress || "").toLowerCase(),
            String(permit2Address || "").toLowerCase(),
            String(routerAddress || "").toLowerCase(),
          ].join(":");

          if (
            fromTokenAddress &&
            routerAddress &&
            !ensuredApprovalKeys.has(approvalKey)
          ) {
            update("APPROVAL_START", {
              fromTokenAddress,
              sourceToken,
              permit2Address,
              routerAddress,
              executionOrderId: pos.executionOrderId,
            });

            await ensureApprovals({
              permit2Approval: { permit2Address, spender: routerAddress },
              fromTokenAddress,
              userAddress,
              requiredAmount: parseBigInt(prepData.fromAmount, 0n),
              update,
            });

            ensuredApprovalKeys.add(approvalKey);
            update("APPROVAL_COMPLETE", {
              executionOrderId: pos.executionOrderId,
            });
          }
        }

        // 2) Send to wallet
        let txHash;
        try {
          const nonce =
            txData && txData.nonce != null && txData.nonce !== ""
              ? txData.nonce
              : undefined;
          const value =
            txData && txData.value != null && txData.value !== ""
              ? BigInt(txData.value)
              : 0n;

          txHash = await wagmiSendTransaction(wagmiClient, {
            account: userAddress,
            chainId: 56,
            to: txData.to,
            data: txData.data,
            value,
            ...(nonce !== undefined && { nonce: Number(nonce) }),
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

            if (decision === "skip") {
              try {
                await apiCall(
                  `${EXECUTION_API_BASE}/${pos.executionOrderId}/cancel`,
                  { method: "POST" },
                );
                cancelledOrderIds.push(pos.executionOrderId);
                skipped.push({
                  executionOrderId: pos.executionOrderId,
                  symbol: pos.symbol,
                  reason: "USER_SKIPPED",
                });
                update("POSITION_CANCELLED", {
                  symbol: pos.symbol,
                  executionOrderId: pos.executionOrderId,
                });
              } catch (cancelErr) {
                console.error(cancelErr);
                update("POSITION_FAILED", {
                  symbol: pos.symbol,
                  executionOrderId: pos.executionOrderId,
                });
              }
              done = true;
              break;
            }

            // Default to retry if unknown decision
            continue;
          }
          throw err;
        }

        update("POSITION_TX_SUBMITTED", {
          symbol: pos.symbol,
          executionOrderId: pos.executionOrderId,
          txHash,
        });

        try {
          // 3) If wallet succeeds → /submit with txHash
          const receipt = await wagmiWaitForTransactionReceipt(wagmiClient, {
            hash: txHash,
          });
          await apiCall(
            `${EXECUTION_API_BASE}/${pos.executionOrderId}/submit`,
            {
              method: "POST",
              body: JSON.stringify({
                txHash: receipt.transactionHash || receipt.hash || txHash,
              }),
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
          // Handle on-chain reverts and dropped/cancelled txs
          console.error(
            `JSON-RPC error while waiting for ${pos.symbol} transaction:`,
            waitError,
          );

          const friendly = isExecutionReverted(waitError)
            ? "The swap transaction reverted on-chain for this token/amount. Skipping to the next token."
            : "The transaction was dropped or cancelled by the network. Skipping to the next token.";
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
              reason: isExecutionReverted(waitError)
                ? "REVERTED_ONCHAIN"
                : "DROPPED_OR_CANCELLED",
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
