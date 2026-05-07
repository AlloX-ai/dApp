import {
  getAccount,
  getPublicClient,
  readContract as wagmiReadContract,
  sendTransaction as wagmiSendTransaction,
  waitForTransactionReceipt as wagmiWaitForTransactionReceipt,
} from "@wagmi/core";
import { encodeFunctionData } from "viem";
import { apiCall } from "./api";
import { toast } from "./toast";
import { wagmiClient } from "../wagmiConnectors";
import { CHAINS, chainIdFor, normalizeChain } from "../config/chains";
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

// Keep the initial wagmi watcher short so we fall through to the explicit
// chain-scoped polling path quickly on mobile Privy (where the watcher can
// otherwise stall on a wrong/disconnected chain).
const RECEIPT_WAIT_TIMEOUT_MS = 10000;
const RECEIPT_POLL_INTERVAL_MS = 2500;
// Keep total polling window around 5 minutes (2.5s × 120).
const RECEIPT_POLL_MAX_ATTEMPTS = 120;
const POSITION_STATUS_POLL_INTERVAL_MS = 1500;
const POSITION_STATUS_MAX_ATTEMPTS = 120;
const MAX_SWAP_RETRIES = 3;
const MOBILE_WALLET_SEND_TIMEOUT_MS = 5 * 60 * 1000;
const CHAIN_TX_DETECT_DELAY_MS = 5000;
const CHAIN_TX_DETECT_INTERVAL_MS = 4000;
const IOS_WALLET_HANDOFF_TOAST_ID = "ios-wallet-handoff";
const IOS_WALLET_HANDOFF_STORAGE_KEY = "allox:iosWalletHandoff";

const normalizeExecutionChain = (chain) => normalizeChain(chain);

const RATE_LIMIT_MAX_BACKOFF_MS = 15000;
const BACKOFF_JITTER_MIN = 0.85;
const BACKOFF_JITTER_MAX = 1.15;

const isRateLimitedError = (error) => {
  if (!error) return false;
  if (error?.status === 429 || error?.code === 429) return true;
  const msg = String(error?.message || error).toLowerCase();
  return (
    msg.includes("429") ||
    msg.includes("too many requests") ||
    msg.includes("rate limit") ||
    msg.includes("limit exceeded")
  );
};

const withJitter = (ms) => {
  const jitter =
    BACKOFF_JITTER_MIN +
    Math.random() * (BACKOFF_JITTER_MAX - BACKOFF_JITTER_MIN);
  return Math.max(250, Math.round(ms * jitter));
};

const getBackoffDelayMs = ({
  attempt,
  baseMs,
  maxMs,
  error,
  rateLimitedBaseMs = 10000,
}) => {
  const exponential = Math.min(maxMs, Math.round(baseMs * 1.4 ** attempt));
  const rateLimited = isRateLimitedError(error)
    ? Math.max(exponential, rateLimitedBaseMs)
    : exponential;
  return withJitter(Math.min(RATE_LIMIT_MAX_BACKOFF_MS, rateLimited));
};

const normalizeTxHash = (txResult) => {
  if (typeof txResult === "string") return txResult;
  if (txResult?.hash) return txResult.hash;
  if (txResult?.transactionHash) return txResult.transactionHash;
  return null;
};

const isIosBrowser = () => {
  if (typeof navigator === "undefined") return false;
  const ua = String(navigator.userAgent || "").toLowerCase();
  const platform = String(navigator.platform || "").toLowerCase();
  return (
    /iphone|ipad|ipod/.test(ua) ||
    (/mac/.test(platform) &&
      typeof navigator.maxTouchPoints === "number" &&
      navigator.maxTouchPoints > 1)
  );
};

const persistIosWalletHandoff = (payload) => {
  if (typeof sessionStorage === "undefined") return;
  try {
    sessionStorage.setItem(
      IOS_WALLET_HANDOFF_STORAGE_KEY,
      JSON.stringify({
        ...payload,
        startedAt: Date.now(),
      }),
    );
  } catch {
    // Best effort only.
  }
};

const clearIosWalletHandoff = () => {
  if (typeof sessionStorage === "undefined") return;
  try {
    sessionStorage.removeItem(IOS_WALLET_HANDOFF_STORAGE_KEY);
  } catch {
    // Best effort only.
  }
};

const showIosWalletHandoffToast = (state = "initial") => {
  if (!isIosBrowser()) return;
  const message =
    state === "resume"
      ? "Returned from wallet. Keep Chrome open for 3-4 seconds so AlloX can resume the request, then switch back if Binance Wallet needs to reopen."
      : "On iPhone/iPad, if Binance Wallet opens and the request appears stuck, return to Chrome for 3-4 seconds, then switch back to Binance Wallet.";
  toast.info(message, {
    id: IOS_WALLET_HANDOFF_TOAST_ID,
    duration: 9000,
  });
};

// Poll for a sent tx using nonce advancement instead of getLogs.
//
// getLogs on a busy DEX contract returns hundreds of events per cycle,
// requiring a getTransactionReceipt call for each one. getTransactionCount is
// a single cheap counter read. We only scan blocks when we know the nonce has
// advanced (i.e., some tx from this address was confirmed), keeping RPC load
// minimal in the common case where the wallet is still pending.
//
// signal.cancelled is set by sendWithChainFallback's finally block so this
// loop stops immediately when the race resolves — it no longer runs 5 minutes
// in the background after the wallet already responded.
const pollForSentTx = async ({
  to,
  fromAddress,
  chainId,
  fromBlock,
  nonceBefore,
  signal,
  stopAfterMs = MOBILE_WALLET_SEND_TIMEOUT_MS,
}) => {
  const client = getPublicClient(wagmiClient, { chainId });
  if (!client)
    throw new Error(
      "Network unavailable while detecting submitted transaction.",
    );

  const from = String(fromAddress || "").toLowerCase();
  const toAddr = String(to || "").toLowerCase();
  const stopAt = Date.now() + stopAfterMs;
  let knownNonce = nonceBefore;
  let pollAttempt = 0;
  let lastPollError = null;

  while (Date.now() < stopAt) {
    if (signal.cancelled) return null;

    try {
      const currentNonce = await client.getTransactionCount({
        address: fromAddress,
        blockTag: "latest",
      });

      if (currentNonce > knownNonce) {
        // At least one tx from this address was confirmed — scan recent blocks
        // to find one going to our target contract. Limit to 50 blocks (~2.5 min
        // on BSC) to keep the scan bounded even after a long wallet round-trip.
        const latestBlock = await client.getBlockNumber();
        const scanStart =
          fromBlock > 0n
            ? fromBlock
            : latestBlock > 50n
              ? latestBlock - 50n
              : 0n;

        for (
          let bn = latestBlock;
          bn >= scanStart && !signal.cancelled;
          bn -= 1n
        ) {
          try {
            const block = await client.getBlock({
              blockNumber: bn,
              includeTransactions: true,
            });
            for (const tx of block?.transactions ?? []) {
              if (
                String(tx?.from ?? "").toLowerCase() === from &&
                String(tx?.to ?? "").toLowerCase() === toAddr
              ) {
                try {
                  const receipt = await client.getTransactionReceipt({
                    hash: tx.hash,
                  });
                  if (receipt?.status === "success") return tx.hash;
                  if (receipt?.status === "reverted")
                    throw new Error(
                      "Transaction failed on-chain. Please try again.",
                    );
                } catch (e) {
                  if (String(e?.message).includes("failed on-chain")) throw e;
                  // receipt not indexed yet — skip
                }
              }
            }
          } catch (e) {
            if (String(e?.message).includes("failed on-chain")) throw e;
            // block fetch failed — continue
          }
        }
        // The confirmed tx wasn't ours (user had another tx pending).
        // Update baseline and keep polling.
        knownNonce = currentNonce;
      }
      lastPollError = null;
    } catch (e) {
      if (String(e?.message).includes("failed on-chain")) throw e;
      // Transient RPC failure (including 429) — retry with adaptive backoff.
      lastPollError = e;
    }

    const nextDelay = getBackoffDelayMs({
      attempt: pollAttempt,
      baseMs: CHAIN_TX_DETECT_INTERVAL_MS,
      maxMs: 12000,
      error: lastPollError,
      rateLimitedBaseMs: 12000,
    });
    pollAttempt += 1;
    await sleep(nextDelay);
  }

  throw new Error(
    "Transaction sign request timed out. Open your wallet app and try again.",
  );
};

// Scan recent blocks (by tx list, not logs) to detect both confirmed and
// reverted transactions. getLogs() only returns events from successful txs,
// so a reverted tx would be invisible to the log poller — this catches it.
const scanRecentBlocksForTx = async ({ client, from, to, fromBlock }) => {
  const from_ = String(from || "").toLowerCase();
  const to_ = String(to || "").toLowerCase();
  try {
    const latest = await client.getBlockNumber();
    // BSC ~3 s/block: last 25 blocks ≈ 75 s, enough for any wallet round-trip.
    const lo = latest > 25n ? latest - 25n : 0n;
    const scanFrom = fromBlock > lo ? fromBlock : lo;
    for (let bn = latest; bn >= scanFrom; bn -= 1n) {
      let block;
      try {
        block = await client.getBlock({
          blockNumber: bn,
          includeTransactions: true,
        });
      } catch {
        continue;
      }
      if (!Array.isArray(block?.transactions)) continue;
      for (const tx of block.transactions) {
        if (
          String(tx?.from || "").toLowerCase() === from_ &&
          String(tx?.to || "").toLowerCase() === to_
        ) {
          try {
            const receipt = await client.getTransactionReceipt({
              hash: tx.hash,
            });
            if (receipt?.status === "success")
              return { hash: tx.hash, reverted: false };
            if (receipt?.status === "reverted")
              return { hash: tx.hash, reverted: true };
          } catch {
            // receipt not yet indexed — treat as not found
          }
        }
      }
    }
  } catch {
    // transient RPC failure — caller will fall back to the poll loop
  }
  return null;
};

const sendWithChainFallback = async ({
  sendTx,
  to,
  fromAddress,
  chainId,
  timeoutMs = MOBILE_WALLET_SEND_TIMEOUT_MS,
}) => {
  // Capture both block number and confirmed nonce before submission so the
  // poller knows exactly where to start scanning and when the nonce advances.
  let fromBlock = 0n;
  let nonceBefore = 0;
  try {
    const client = getPublicClient(wagmiClient, { chainId });
    if (client) {
      [fromBlock, nonceBefore] = await Promise.all([
        client.getBlockNumber(),
        client.getTransactionCount({
          address: fromAddress,
          blockTag: "latest",
        }),
      ]);
    }
  } catch {
    // Non-fatal; poller starts from block 0 / nonce 0.
  }

  persistIosWalletHandoff({
    to,
    fromAddress,
    chainId,
    fromBlock: fromBlock.toString(),
    nonceBefore,
  });
  showIosWalletHandoffToast("initial");

  const sendPromise = sendTx();

  const isRecoverableWalletSendError = (error) => {
    if (!error || isUserRejectedTx(error)) return false;
    const msg = String(error?.message || error).toLowerCase();
    const details = String(error?.details || "").toLowerCase();
    const causeMsg = String(error?.cause?.message || "").toLowerCase();
    return (
      msg.includes("sdk_action_failed") ||
      details.includes("sdk_action_failed") ||
      causeMsg.includes("sdk_action_failed") ||
      msg.includes("wallet request failed") ||
      msg.includes("failed to send") ||
      msg.includes("send transaction failed") ||
      msg.includes("connector") ||
      msg.includes("timeout") ||
      msg.includes("disconnected")
    );
  };

  // Surface fast user rejections immediately before launching the poller.
  let earlyRejectError = null;
  let earlyResolved = false;
  let earlyHash;
  const earlyCheck = new Promise((resolve, reject) => {
    const t = setTimeout(() => resolve(), 3000);
    sendPromise.then(
      (hash) => {
        clearTimeout(t);
        earlyResolved = true;
        earlyHash = hash;
        resolve();
      },
      (err) => {
        clearTimeout(t);
        if (isRecoverableWalletSendError(err)) {
          // Keep fallback detection running. Some mobile/SDK connectors
          // reject callbacks even when the tx was broadcast successfully.
          resolve();
          return;
        }
        earlyRejectError = err;
        reject(err);
      },
    );
  });

  try {
    await earlyCheck;
    if (earlyResolved) return earlyHash;
  } catch {
    throw earlyRejectError ?? new Error("Transaction rejected.");
  }

  // Shared cancellation flag — set in finally so the poller stops the moment
  // any race winner resolves instead of running 5 minutes in the background.
  const signal = { cancelled: false };

  const pollPromise = (async () => {
    await sleep(CHAIN_TX_DETECT_DELAY_MS);
    return pollForSentTx({
      to,
      fromAddress,
      chainId,
      fromBlock,
      nonceBefore,
      signal,
      stopAfterMs: timeoutMs,
    });
  })();

  const sendRacePromise = sendPromise.catch((err) => {
    if (isRecoverableWalletSendError(err)) {
      // Ignore callback-level errors and rely on chain detection/timeout.
      return new Promise(() => {});
    }
    throw err;
  });

  const timeoutPromise = new Promise((_, reject) =>
    setTimeout(
      () =>
        reject(
          new Error(
            "Transaction sign request timed out. Open your wallet app and try again.",
          ),
        ),
      timeoutMs,
    ),
  );

  // When the user returns to the browser tab from the wallet app,
  // visibilitychange fires immediately. Scan recent blocks so a reverted tx
  // — invisible to the nonce poller until the next cycle — is caught fast.
  let removeVisibilityListener = () => {};
  let removeFocusListener = () => {};
  let removePageShowListener = () => {};
  const visibilityPromise = new Promise((resolve, reject) => {
    const tryRecover = async () => {
      if (signal.cancelled) return;
      const client = getPublicClient(wagmiClient, { chainId });
      if (!client) return;
      showIosWalletHandoffToast("resume");
      // Grace period: let the browser/wallet deep-link settle before hitting chain.
      await sleep(3500);
      if (signal.cancelled) return;
      const found = await scanRecentBlocksForTx({
        client,
        from: fromAddress,
        to,
        fromBlock,
      });
      if (!found) return;
      if (found.reverted) {
        reject(new Error("Transaction failed on-chain. Please try again."));
      } else {
        resolve(found.hash);
      }
    };

    if (typeof document !== "undefined") {
      const onVisibilityChange = async () => {
        if (document.visibilityState !== "visible") return;
        await tryRecover();
      };
      removeVisibilityListener = () =>
        document.removeEventListener("visibilitychange", onVisibilityChange);
      document.addEventListener("visibilitychange", onVisibilityChange);
    }

    if (typeof window !== "undefined") {
      const onFocus = async () => {
        await tryRecover();
      };
      const onPageShow = async () => {
        await tryRecover();
      };
      removeFocusListener = () => window.removeEventListener("focus", onFocus);
      removePageShowListener = () =>
        window.removeEventListener("pageshow", onPageShow);
      window.addEventListener("focus", onFocus);
      window.addEventListener("pageshow", onPageShow);
    }
  });

  try {
    return await Promise.race([
      sendRacePromise,
      pollPromise,
      timeoutPromise,
      visibilityPromise,
    ]);
  } finally {
    signal.cancelled = true;
    removeVisibilityListener();
    removeFocusListener();
    removePageShowListener();
    clearIosWalletHandoff();
  }
};

const waitForReceiptWithFallback = async ({
  hash,
  chain = "BSC",
  timeoutMs = RECEIPT_WAIT_TIMEOUT_MS,
}) => {
  const chainId = chainIdFor(normalizeExecutionChain(chain));
  if (!hash) throw new Error("Missing transaction hash");

  // Prefer wagmi's receipt waiter first (handles replacements/reorgs), but
  // ALWAYS pin it to the execution chain. Without an explicit `chainId`,
  // wagmi uses the currently-connected account's chain and — for Privy
  // sessions where no wagmi account is connected — falls back to the first
  // chain in `config.chains` (mainnet here). That means it would watch the
  // wrong chain for a BSC approval and never see the receipt, freezing the
  // sell flow on mobile. Passing `chainId` fixes that.
  try {
    return await Promise.race([
      wagmiWaitForTransactionReceipt(wagmiClient, { hash, chainId }),
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
    // Fallback: poll the chain-scoped public client directly. This works even
    // when no wagmi account is connected (Privy/mobile) because it targets
    // the chain's default RPC transport explicitly.
    const client = getPublicClient(wagmiClient, { chainId });
    if (!client) throw waitErr;

    const isTransientReceiptLookupError = (error) => {
      const msg = String(error?.message || error).toLowerCase();
      return (
        msg.includes("not found") ||
        msg.includes("unknown transaction") ||
        msg.includes("could not be found") ||
        msg.includes("not be processed on a block yet") ||
        msg.includes("not processed on a block yet") ||
        msg.includes("not been mined") ||
        msg.includes("receipt with hash")
      );
    };

    for (let i = 0; i < RECEIPT_POLL_MAX_ATTEMPTS; i += 1) {
      let lastPollErr = null;
      try {
        const receipt = await client.getTransactionReceipt({ hash });
        if (receipt) return receipt;
      } catch (err) {
        // Keep polling while receipt is not indexed yet.
        if (!isTransientReceiptLookupError(err)) {
          throw err;
        }
        lastPollErr = err;
      }
      await sleep(
        getBackoffDelayMs({
          attempt: i,
          baseMs: RECEIPT_POLL_INTERVAL_MS,
          maxMs: 10000,
          error: lastPollErr,
          rateLimitedBaseMs: 12000,
        }),
      );
    }
    throw waitErr;
  }
};

/**
 * Single direct getTransactionReceipt call — no retries, no timeout.
 * Returns "success" | "reverted" | null (null = not yet mined or RPC error).
 * Used by the sell-status poll loop to detect on-chain failures independently
 * of the backend, so a reverted tx doesn't leave the UI spinning indefinitely.
 */
export const checkTxStatus = async (hash, chain = "BSC") => {
  const chainId = chainIdFor(normalizeExecutionChain(chain));
  const client = getPublicClient(wagmiClient, { chainId });
  if (!client) return null;
  try {
    const receipt = await client.getTransactionReceipt({ hash });
    return receipt?.status ?? null;
  } catch {
    return null;
  }
};

/**
 * Default path: MetaMask / WalletConnect / etc. via wagmi.
 * @returns {{ userAddress: string, assertReady: () => void, sendTransaction: Function, waitForTransactionReceipt: Function }}
 */
export function createWagmiExecutionTxEnv(chain = "BSC") {
  const normalizedChain = normalizeExecutionChain(chain);
  const executionChainId = chainIdFor(normalizedChain);
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
      if (Number(accountState?.chainId) !== executionChainId) {
        const targetLabel = CHAINS[normalizedChain]?.label || normalizedChain;
        throw new Error(
          `Please switch your wallet to ${targetLabel} before executing on-chain.`,
        );
      }
    },
    sendTransaction: async ({ to, data, value, nonce }) => {
      // Mobile WalletConnect can drop callback responses while Chrome is in
      // the background (Binance/MetaMask deep-link). Race wallet callback with
      // chain log detection so execution can continue even if callback is lost.
      return sendWithChainFallback({
        to,
        fromAddress: userAddress,
        chainId: executionChainId,
        sendTx: () =>
          wagmiSendTransaction(wagmiClient, {
            account: userAddress,
            chainId: executionChainId,
            to,
            data,
            value: value ?? 0n,
            ...(nonce !== undefined && { nonce: Number(nonce) }),
          }),
      });
    },
    waitForTransactionReceipt: async ({ hash }) =>
      waitForReceiptWithFallback({ hash, chain: normalizedChain }),
  };
}

/**
 * Privy embedded wallet — same calldata/value as wagmi; signing happens in Privy’s modal.
 * @param {string} userAddress checksummed or lowercase 0x address
 * @param {Function} privySendTransaction from useSendTransaction()
 */
export function createPrivyExecutionTxEnv(
  userAddress,
  privySendTransaction,
  chain = "BSC",
) {
  const normalizedChain = normalizeExecutionChain(chain);
  const executionChainId = chainIdFor(normalizedChain);
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
        chainId: executionChainId,
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
      waitForReceiptWithFallback({ hash, chain: normalizedChain }),
  };
}

const isUserRejectedTx = (error) => {
  // MetaMask / EIP-1193 user rejected request
  if (!error) return false;
  if (error.code === 4001) return true;
  const msg = String(error.message || error).toLowerCase();
  return msg.includes("user rejected") || msg.includes("rejected the request");
};

const isRetryableWalletTxFailure = (error) => {
  if (!error) return false;
  if (isUserRejectedTx(error)) return true;
  const msg = String(error.message || error).toLowerCase();
  return (
    msg.includes("transaction failed") ||
    msg.includes("failed to send") ||
    msg.includes("send transaction failed") ||
    msg.includes("wallet request failed")
  );
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

export async function ensurePermit2Approvals({
  chain = "BSC",
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

  const chainId = chainIdFor(normalizeExecutionChain(chain));
  const now = BigInt(Math.floor(Date.now() / 1000));

  // Approval 1: ERC20 approve token -> Permit2
  await ensurePermit2BaseApproval({
    chain,
    fromTokenAddress,
    userAddress,
    requiredAmount,
    txEnv,
    update,
    permit2Address,
  });

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

export async function ensurePermit2BaseApproval({
  chain = "BSC",
  fromTokenAddress,
  userAddress,
  requiredAmount,
  txEnv,
  update = () => {},
  permit2Address = PERMIT2_ADDRESS,
}) {
  if (!fromTokenAddress || !userAddress) {
    throw new Error(
      "Permit2 base approval requires fromTokenAddress and userAddress.",
    );
  }

  const chainId = chainIdFor(normalizeExecutionChain(chain));
  const erc20Allowance = await wagmiReadContract(wagmiClient, {
    address: fromTokenAddress,
    abi: ERC20_ABI,
    functionName: "allowance",
    args: [userAddress, permit2Address],
    chainId,
  });

  if (parseBigInt(erc20Allowance) >= requiredAmount) return false;

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
  return true;
}

export async function ensureStandardApproval({
  chain = "BSC",
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

  const chainId = chainIdFor(normalizeExecutionChain(chain));

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
  const incomingChain = String(execution?.chain || "").toUpperCase();
  if (incomingChain !== "BSC" && incomingChain !== "BASE"&& incomingChain !== "ETH") {
    throw new Error("On-chain execution supports BSC, BASE, and ETH only.");
  }
  const normalizedChain = normalizeExecutionChain(incomingChain);
  const { sourceToken, positions, portfolioData } = execution;
  const chain = normalizedChain;
  const initialPrepareSlippage = resolveInitialPrepareSlippage(execution);

  const jwt = localStorage.getItem("authToken");
  if (!jwt) {
    throw new Error("You must be logged in before executing a portfolio.");
  }

  const txEnv = txEnvOption ?? createWagmiExecutionTxEnv(chain);
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
    let swapRetryCount = 0;
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

            if (fromTokenAddress && !ensuredApprovalKeys.has(approvalKey)) {
              update("APPROVAL_START", {
                fromTokenAddress,
                sourceToken,
                approvalType: "permit2",
                permit2Address,
                routerAddress,
                executionOrderId: pos.executionOrderId,
              });

              await ensurePermit2Approvals({
                chain,
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
                chain,
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
          // Wallet send failed before tx hash (MetaMask/Privy/etc): offer Retry/Skip with capped retries.
          if (isRetryableWalletTxFailure(err)) {
            update("POSITION_REJECTED", {
              symbol: pos.symbol,
              executionOrderId: pos.executionOrderId,
            });

            const decision =
              typeof onPrompt === "function"
                ? await onPrompt({
                    symbol: pos.symbol,
                    executionOrderId: pos.executionOrderId,
                    retryCount: swapRetryCount + 1,
                    maxRetries: MAX_SWAP_RETRIES,
                  })
                : "retry";

            if (decision === "retry") {
              swapRetryCount += 1;
              if (swapRetryCount >= MAX_SWAP_RETRIES) {
                update("POSITION_ERROR", {
                  symbol: pos.symbol,
                  executionOrderId: pos.executionOrderId,
                  error: `Token could not be swapped after ${MAX_SWAP_RETRIES} attempts.`,
                });
                try {
                  await apiCall(
                    `${EXECUTION_API_BASE}/${pos.executionOrderId}/cancel`,
                    {
                      method: "POST",
                      body: JSON.stringify({ reason: "swap_failed" }),
                    },
                  );
                  cancelledOrderIds.push(pos.executionOrderId);
                  skipped.push({
                    executionOrderId: pos.executionOrderId,
                    symbol: pos.symbol,
                    reason: "SWAP_FAILED",
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
              continue;
            }

            if (decision === "skip") {
              const cancelReason =
                swapRetryCount >= MAX_SWAP_RETRIES ? "swap_failed" : undefined;
              try {
                await apiCall(
                  `${EXECUTION_API_BASE}/${pos.executionOrderId}/cancel`,
                  {
                    method: "POST",
                    ...(cancelReason
                      ? { body: JSON.stringify({ reason: cancelReason }) }
                      : {}),
                  },
                );
                cancelledOrderIds.push(pos.executionOrderId);
                skipped.push({
                  executionOrderId: pos.executionOrderId,
                  symbol: pos.symbol,
                  reason: cancelReason ? "SWAP_FAILED" : "USER_SKIPPED",
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
            swapRetryCount += 1;
            if (swapRetryCount >= MAX_SWAP_RETRIES) {
              update("POSITION_ERROR", {
                symbol: pos.symbol,
                executionOrderId: pos.executionOrderId,
                error: `Token could not be swapped after ${MAX_SWAP_RETRIES} attempts.`,
              });
              try {
                await apiCall(
                  `${EXECUTION_API_BASE}/${pos.executionOrderId}/cancel`,
                  {
                    method: "POST",
                    body: JSON.stringify({ reason: "swap_failed" }),
                  },
                );
                cancelledOrderIds.push(pos.executionOrderId);
                skipped.push({
                  executionOrderId: pos.executionOrderId,
                  symbol: pos.symbol,
                  reason: "SWAP_FAILED",
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
          await apiCall(
            `${EXECUTION_API_BASE}/${pos.executionOrderId}/submit`,
            {
              method: "POST",
              body: JSON.stringify({
                txHash,
              }),
            },
          );

          // Poll for CONFIRMED/FAILED
          let status = "TX_SUBMITTED";
          let attempts = 0;
          let lastStatusError = null;

          while (
            !["CONFIRMED", "FAILED"].includes(status) &&
            attempts < POSITION_STATUS_MAX_ATTEMPTS
          ) {
            await sleep(
              getBackoffDelayMs({
                attempt: attempts,
                baseMs: POSITION_STATUS_POLL_INTERVAL_MS,
                maxMs: 10000,
                error: lastStatusError,
                rateLimitedBaseMs: 12000,
              }),
            );
            try {
              const statusData = await apiCall(
                `${EXECUTION_API_BASE}/${pos.executionOrderId}/status`,
              );
              status = statusData.status;
              lastStatusError = null;
            } catch (statusErr) {
              lastStatusError = statusErr;
            }
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
