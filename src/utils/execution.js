import {
  getAccount,
  getPublicClient,
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

const BSC_CHAIN_ID = 56;
const RECEIPT_WAIT_TIMEOUT_MS = 120000;
const RECEIPT_POLL_INTERVAL_MS = 2500;
const RECEIPT_POLL_MAX_ATTEMPTS = 120;
const POSITION_STATUS_POLL_INTERVAL_MS = 1500;
const POSITION_STATUS_MAX_ATTEMPTS = 120;

const normalizeTxHash = (txResult) => {
  if (typeof txResult === "string") return txResult;
  if (txResult?.hash) return txResult.hash;
  if (txResult?.transactionHash) return txResult.transactionHash;
  return null;
};

const waitForReceiptWithFallback = async ({
  hash,
  timeoutMs = RECEIPT_WAIT_TIMEOUT_MS,
}) => {
  if (!hash) throw new Error("Missing transaction hash");

  // Prefer wagmi's receipt waiter first (handles replacements/reorgs),
  // but don't block forever on mobile wallet provider quirks.
  try {
    return await Promise.race([
      wagmiWaitForTransactionReceipt(wagmiClient, { hash }),
      new Promise((_, reject) =>
        setTimeout(
          () =>
            reject(
              new Error(
                `Timed out waiting for receipt for ${hash} after ${timeoutMs}ms`,
              ),
            ),
          timeoutMs,
        ),
      ),
    ]);
  } catch (waitErr) {
    const client = getPublicClient(wagmiClient, { chainId: BSC_CHAIN_ID });
    if (!client) throw waitErr;

    for (let i = 0; i < RECEIPT_POLL_MAX_ATTEMPTS; i += 1) {
      try {
        const receipt = await client.getTransactionReceipt({ hash });
        if (receipt) return receipt;
      } catch (pollErr) {
        const msg = String(pollErr?.message || pollErr).toLowerCase();
        // Keep polling while receipt is not indexed yet.
        if (!msg.includes("not found") && !msg.includes("unknown transaction")) {
          throw pollErr;
        }
      }
      await sleep(RECEIPT_POLL_INTERVAL_MS);
    }
    throw waitErr;
  }
};

/**
 * Default path: MetaMask / WalletConnect / etc. via wagmi.
 * @returns {{ userAddress: string, assertReady: () => void, sendTransaction: Function, waitForTransactionReceipt: Function }}
 */
export function createWagmiExecutionTxEnv() {
  const accountState = getAccount(wagmiClient);
  const userAddress = accountState?.address;
  return {
    userAddress,
    assertReady() {
      if (!accountState?.isConnected || !userAddress) {
        throw new Error(
          "Wallet not connected. Connect your wallet (including WalletConnect/QR) and try again.",
        );
      }
      if (Number(accountState?.chainId) !== BSC_CHAIN_ID) {
        throw new Error(
          "Please switch your wallet to BNB Chain (chainId 56) before executing on-chain.",
        );
      }
    },
    sendTransaction: async ({ to, data, value, nonce }) => {
      return wagmiSendTransaction(wagmiClient, {
        account: userAddress,
        chainId: BSC_CHAIN_ID,
        to,
        data,
        value: value ?? 0n,
        ...(nonce !== undefined && { nonce: Number(nonce) }),
      });
    },
    waitForTransactionReceipt: async ({ hash }) =>
      waitForReceiptWithFallback({ hash }),
  };
}

/**
 * Privy embedded wallet — same calldata/value as wagmi; signing happens in Privy’s modal.
 * @param {string} userAddress checksummed or lowercase 0x address
 * @param {Function} privySendTransaction from useSendTransaction()
 */
export function createPrivyExecutionTxEnv(userAddress, privySendTransaction) {
  return {
    userAddress,
    assertReady() {
      if (!userAddress) {
        throw new Error(
          "Embedded wallet not ready. Sign in again or refresh the page.",
        );
      }
    },
    sendTransaction: async ({ to, data, value, nonce }) => {
      const input = {
        to,
        data,
        value: value ?? 0n,
        chainId: BSC_CHAIN_ID,
      };
      if (nonce !== undefined) input.nonce = nonce;
      const txResult = await privySendTransaction(input);
      const hash = normalizeTxHash(txResult);
      if (!hash) {
        throw new Error("Privy transaction did not return a valid tx hash.");
      }
      return hash;
    },
    waitForTransactionReceipt: async ({ hash }) =>
      waitForReceiptWithFallback({ hash }),
  };
}

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

const parsePositiveNumber = (value, fallback) => {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n) || n <= 0) return fallback;
  return n;
};

const resolveInitialPrepareSlippage = (execution) => {
  const fromPayload = parsePositiveNumber(execution?.slippage, null);
  if (fromPayload != null) return fromPayload;
  return 0.5;
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

async function executeApprovalSteps({ approvalSteps, update, txEnv }) {
  for (const approvalStep of approvalSteps) {
    const to = approvalStep?.tx?.to;
    if (!to) throw new Error("Missing approval transaction target");

    const data = buildApprovalStepCalldata(approvalStep);
    const txHash = await txEnv.sendTransaction({
      to,
      data,
      value: 0n,
    });
    await txEnv.waitForTransactionReceipt({ hash: txHash });
    update("APPROVAL_PROGRESS", {
      target: to,
      txHash,
      type: approvalStep?.step || "APPROVAL_STEP",
    });
  }
}

async function ensurePermit2Approvals({
  permit2Approval,
  fromTokenAddress,
  userAddress,
  requiredAmount,
  update,
  txEnv,
}) {
  const permit2Address = permit2Approval?.permit2Address || PERMIT2_ADDRESS;
  const routerAddress = permit2Approval?.spender;

  if (!fromTokenAddress || !routerAddress) {
    throw new Error(
      "Permit2 approval requires permit2Approval.spender and fromTokenAddress from the server.",
    );
  }

  const chainId = BSC_CHAIN_ID;
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

    const txHash = await txEnv.sendTransaction({
      to: fromTokenAddress,
      data: approveData,
      value: 0n,
    });

    await txEnv.waitForTransactionReceipt({ hash: txHash });
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

    const txHash = await txEnv.sendTransaction({
      to: permit2Address,
      data: permit2ApproveData,
      value: 0n,
    });

    await txEnv.waitForTransactionReceipt({ hash: txHash });
    update("APPROVAL_PROGRESS", {
      target: routerAddress,
      txHash,
      type: "PERMIT2_TO_ROUTER",
    });
  }
}

async function ensureStandardApproval({
  approvalContract,
  tokenAddress,
  userAddress,
  requiredAmount,
  update,
  txEnv,
}) {
  if (!approvalContract || !tokenAddress) {
    throw new Error(
      "Standard approval requires approvalContract and fromTokenAddress from the server.",
    );
  }
  if (requiredAmount <= 0n) return;

  const chainId = BSC_CHAIN_ID;

  const erc20Allowance = await wagmiReadContract(wagmiClient, {
    address: tokenAddress,
    abi: ERC20_ABI,
    functionName: "allowance",
    args: [userAddress, approvalContract],
    chainId,
  });

  if (parseBigInt(erc20Allowance) < requiredAmount) {
    const approveData = encodeFunctionData({
      abi: ERC20_ABI,
      functionName: "approve",
      args: [approvalContract, requiredAmount],
    });

    const txHash = await txEnv.sendTransaction({
      to: tokenAddress,
      data: approveData,
      value: 0n,
    });

    await txEnv.waitForTransactionReceipt({ hash: txHash });
    update("APPROVAL_PROGRESS", {
      target: approvalContract,
      txHash,
      type: "ERC20_STANDARD",
    });
  }
}

export async function executePortfolioOnChain(
  execution,
  { onUpdate, onPrompt, txEnv: txEnvOption } = {},
) {
  const { chain, sourceToken, positions, portfolioData } = execution;
  const initialPrepareSlippage = resolveInitialPrepareSlippage(execution);

  const jwt = localStorage.getItem("authToken");
  if (!jwt) {
    throw new Error("You must be logged in before executing a portfolio.");
  }

  const txEnv = txEnvOption ?? createWagmiExecutionTxEnv();
  txEnv.assertReady();
  const userAddress = txEnv.userAddress;

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
    let slippageForPosition = initialPrepareSlippage;
    while (!done) {
      try {
        // 1) /prepare → fresh txData (slippage increases only after user confirms 422)
        let prepData;
        let prepareRound = 0;
        const maxPrepareRounds = 30;

        while (!prepData && prepareRound < maxPrepareRounds) {
          prepareRound += 1;
          try {
            prepData = await apiCall(
              `${EXECUTION_API_BASE}/${pos.executionOrderId}/prepare`,
              {
                method: "POST",
                body: JSON.stringify({ slippage: slippageForPosition }),
              },
            );
          } catch (prepareError) {
            const errBody = prepareError?.data;
            const approvalSteps = errBody?.approvalSteps;
            const needsApproval =
              prepareError?.status === 428 &&
              Array.isArray(approvalSteps) &&
              approvalSteps.length > 0;

            if (needsApproval) {
              update("APPROVAL_START", {
                symbol: pos.symbol,
                executionOrderId: pos.executionOrderId,
                fromTokenAddress: errBody?.fromTokenAddress,
                permit2Address: errBody?.permit2Address,
                routerAddress: errBody?.universalRouterAddress,
              });

              await executeApprovalSteps({
                approvalSteps,
                update,
                txEnv,
              });

              update("APPROVAL_COMPLETE", {
                symbol: pos.symbol,
                executionOrderId: pos.executionOrderId,
              });
              continue;
            }

            if (
              prepareError?.status === 422 &&
              errBody?.error === "SLIPPAGE_INCREASE_REQUIRED"
            ) {
              if (typeof onPrompt !== "function") {
                throw new Error(
                  errBody?.message ||
                    `Higher slippage (${errBody?.requiredSlippage}%) is required for ${errBody?.symbol || pos.symbol}.`,
                );
              }

              const decision = await onPrompt({
                type: "SLIPPAGE_INCREASE_REQUIRED",
                symbol: errBody?.symbol ?? pos.symbol,
                message: errBody?.message,
                requestedSlippage: errBody?.requestedSlippage,
                requiredSlippage: errBody?.requiredSlippage,
                executionOrderId: pos.executionOrderId,
              });

              if (decision === "accept") {
                const nextSlippage = parsePositiveNumber(
                  errBody?.requiredSlippage,
                  null,
                );
                if (nextSlippage == null) {
                  throw new Error(
                    "Server returned an invalid requiredSlippage value.",
                  );
                }
                slippageForPosition = nextSlippage;
                update("SLIPPAGE_ACCEPTED", {
                  symbol: pos.symbol,
                  executionOrderId: pos.executionOrderId,
                  slippage: slippageForPosition,
                });
                continue;
              }

              const declineErr = new Error(
                errBody?.message ||
                  `Higher slippage was not accepted for ${errBody?.symbol || pos.symbol}. Execution stopped.`,
              );
              declineErr.abortPortfolioExecution = true;
              throw declineErr;
            }

            throw prepareError;
          }
        }

        if (!prepData) {
          throw new Error(
            "Unable to prepare swap after approvals and slippage handling.",
          );
        }

        update("POSITION_PREPARED", {
          symbol: pos.symbol,
          executionOrderId: pos.executionOrderId,
        });

        const txData = prepData.txData;

        const fromTokenAddress =
          prepData.fromTokenAddress || quoteData.fromTokenAddress;
        const requiredAmount = parseBigInt(prepData.fromAmount, 0n);

        // Ensure approvals using /prepare payload (authoritative approvalType).
        if (prepData?.approvalNeeded) {
          if (prepData.approvalType === "permit2") {
            const p2 = prepData.permit2Approval;
            if (!p2?.spender) {
              throw new Error(
                "Prepare response is missing permit2Approval for approvalType permit2.",
              );
            }
            const permit2Address = p2.permit2Address || PERMIT2_ADDRESS;
            const routerAddress = p2.spender;
            const approvalKey = [
              String(userAddress).toLowerCase(),
              String(fromTokenAddress || "").toLowerCase(),
              String(permit2Address || "").toLowerCase(),
              String(routerAddress || "").toLowerCase(),
            ].join(":");

            if (
              fromTokenAddress &&
              !ensuredApprovalKeys.has(approvalKey)
            ) {
              update("APPROVAL_START", {
                fromTokenAddress,
                sourceToken,
                approvalType: "permit2",
                permit2Address,
                routerAddress,
                executionOrderId: pos.executionOrderId,
              });

              await ensurePermit2Approvals({
                permit2Approval: p2,
                fromTokenAddress,
                userAddress,
                requiredAmount,
                update,
                txEnv,
              });

              ensuredApprovalKeys.add(approvalKey);
              update("APPROVAL_COMPLETE", {
                executionOrderId: pos.executionOrderId,
                approvalType: "permit2",
              });
            }
          } else if (prepData.approvalType === "standard") {
            const approvalContract = prepData.approvalContract;
            if (!approvalContract) {
              throw new Error(
                "Prepare response is missing approvalContract for approvalType standard.",
              );
            }
            const approvalKey = [
              String(userAddress).toLowerCase(),
              String(fromTokenAddress || "").toLowerCase(),
              String(approvalContract).toLowerCase(),
              "standard",
            ].join(":");

            if (fromTokenAddress && !ensuredApprovalKeys.has(approvalKey)) {
              update("APPROVAL_START", {
                fromTokenAddress,
                sourceToken,
                approvalType: "standard",
                spenderAddress: approvalContract,
                executionOrderId: pos.executionOrderId,
              });

              await ensureStandardApproval({
                approvalContract,
                tokenAddress: fromTokenAddress,
                userAddress,
                requiredAmount,
                update,
                txEnv,
              });

              ensuredApprovalKeys.add(approvalKey);
              update("APPROVAL_COMPLETE", {
                executionOrderId: pos.executionOrderId,
                approvalType: "standard",
              });
            }
          } else if (prepData.approvalType == null) {
            throw new Error(
              "On-chain prepare returned approvalNeeded without approvalType. Refresh and try again, or contact support if this persists.",
            );
          } else {
            throw new Error(
              `Unsupported approvalType: ${String(prepData.approvalType)}`,
            );
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

          txHash = await txEnv.sendTransaction({
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
          // 3) Submit tx hash immediately, then poll backend status.
          // This avoids extra client-side waiting before the next token.
          await apiCall(`${EXECUTION_API_BASE}/${pos.executionOrderId}/submit`, {
            method: "POST",
            body: JSON.stringify({
              txHash,
            }),
          });

          // Poll for CONFIRMED/FAILED
          let status = "TX_SUBMITTED";
          let attempts = 0;

          while (
            !["CONFIRMED", "FAILED"].includes(status) &&
            attempts < POSITION_STATUS_MAX_ATTEMPTS
          ) {
            await sleep(POSITION_STATUS_POLL_INTERVAL_MS);
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
        if (error?.abortPortfolioExecution) {
          try {
            await apiCall(
              `${EXECUTION_API_BASE}/${pos.executionOrderId}/cancel`,
              { method: "POST" },
            );
            cancelledOrderIds.push(pos.executionOrderId);
            update("POSITION_CANCELLED", {
              symbol: pos.symbol,
              executionOrderId: pos.executionOrderId,
            });
          } catch (cancelErr) {
            console.error(cancelErr);
          }
          throw error;
        }
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
