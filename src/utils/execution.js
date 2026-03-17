import { ethers } from "ethers";
import { apiCall } from "./api";

const EXECUTION_API_BASE = "/execution";

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export async function executePortfolioOnChain(execution, { onUpdate } = {}) {
  const { chain, sourceToken, positions, portfolioData } = execution;

  const jwt = localStorage.getItem("authToken");
  if (!jwt) {
    throw new Error("You must be logged in before executing a portfolio.");
  }

  if (!window.ethereum) {
    throw new Error("Wallet not found. Please install a Web3 wallet (e.g. MetaMask).");
  }

  const provider = new ethers.providers.Web3Provider(window.ethereum);
  const signer = provider.getSigner();

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

  // ── Step 2: Approve (USDT/USDC only, once) ──
  if (quoteData.approvalNeeded) {
    update("APPROVAL_START", {
      approvalContract: quoteData.approvalContract,
      fromTokenAddress: quoteData.fromTokenAddress,
      sourceToken,
    });

    const erc20Abi = [
      "function approve(address spender, uint256 amount) returns (bool)",
    ];
    const sourceContract = new ethers.Contract(
      quoteData.fromTokenAddress,
      erc20Abi,
      signer,
    );

    const approveTx = await sourceContract.approve(
      quoteData.approvalContract,
      ethers.constants.MaxUint256,
    );
    await approveTx.wait();

    update("APPROVAL_COMPLETE", { txHash: approveTx.hash });
  }

  // ── Step 3: Execute each position sequentially ──
  const confirmedOrderIds = [];

  for (const pos of quotedPositions) {
    update("POSITION_START", { symbol: pos.symbol, executionOrderId: pos.executionOrderId });

    try {
      // 3a. Prepare
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

      // 3b. Sign & send
      const tx = await signer.sendTransaction({
        data: prepData.txData.data,
        to: prepData.txData.to,
        value: prepData.txData.value,
      });

      update("POSITION_TX_SUBMITTED", {
        symbol: pos.symbol,
        executionOrderId: pos.executionOrderId,
        txHash: tx.hash,
      });

      const receipt = await tx.wait();

      // 3c. Submit tx hash
      await apiCall(
        `${EXECUTION_API_BASE}/${pos.executionOrderId}/submit`,
        {
          method: "POST",
          body: JSON.stringify({ txHash: receipt.transactionHash }),
        },
      );

      // 3d. Poll for confirmation
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
        update("POSITION_FAILED", {
          symbol: pos.symbol,
          executionOrderId: pos.executionOrderId,
        });
      }
    } catch (error) {
      console.error(`Swap failed for ${pos.symbol}:`, error); // eslint-disable-line no-console
      update("POSITION_ERROR", {
        symbol: pos.symbol,
        executionOrderId: pos.executionOrderId,
        error: error?.message || String(error),
      });
    }
  }

  // ── Step 4: Complete — create the portfolio ──
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
      executionOrderIds: confirmedOrderIds,
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
  });

  return completeData.portfolioId;
}

