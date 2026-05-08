import { useCallback, useState, useEffect } from "react";
import { useSelector } from "react-redux";
import { useWriteContract, useSwitchChain, useAccount } from "wagmi";
import { useWallet } from "@solana/wallet-adapter-react";
import {
  getPublicClient,
  waitForTransactionReceipt as wagmiWaitForTransactionReceipt,
} from "@wagmi/core";
import { encodeFunctionData } from "viem";
import { ethers } from "ethers";
import { useWallets } from "@privy-io/react-auth";
import bs58 from "bs58";
import { apiCall } from "../utils/api";
import {
  checkin_base_address,
  checkin_eth_address,
  checkin_bnb_address,
  CHECKIN_ABI,
} from "../constants/contracts";
import { wagmiClient } from "../wagmiConnectors";
import {
  setCheckinStatus,
  addOptimisticCheckinPoints as addOptimisticCheckinPointsAction,
} from "../redux/slices/checkinSlice";
import { useDispatch } from "react-redux";
import { useAuth } from "./useAuth";
import {
  getPrivyEmbedded,
  switchPrivyEmbeddedToChain,
} from "../utils/privyWalletUtils";
const CHAIN_ID_TO_API = {
  1: "ethereum",
  56: "bnb",
  8453: "base",
};

const CHAIN_ID_TO_ADDRESS = {
  1: checkin_eth_address,
  56: checkin_bnb_address,
  8453: checkin_base_address,
};

const SUPPORTED_EVM_CHAIN_IDS = [1, 56, 8453];
export const SOLANA_CHAIN_ID = 101;
const WALLET_SIGN_TIMEOUT_MS = 3 * 60 * 1000;
const CHECKIN_RECEIPT_WAIT_TIMEOUT_MS = 12000;
const CHECKIN_RECEIPT_POLL_INTERVAL_MS = 2500;
const CHECKIN_RECEIPT_MAX_ATTEMPTS = 90;
const CHECKIN_CHAIN_POLL_DELAY_MS = 5000;
const CHECKIN_CHAIN_POLL_INTERVAL_MS = 3500;
const CHECKIN_TX_DETECT_TIMEOUT_MS = 3 * 60 * 1000;
const CHECKIN_LOG_BLOCK_CHUNK = 200n;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const normalizeTxHash = (txResult) => {
  if (typeof txResult === "string") return txResult;
  if (txResult?.hash) return txResult.hash;
  if (txResult?.transactionHash) return txResult.transactionHash;
  return null;
};

const waitWithTimeout = (promise, timeoutMs, timeoutMessage) =>
  Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(timeoutMessage)), timeoutMs),
    ),
  ]);

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

const pollContractLogsForCheckinTx = async ({
  contractAddress,
  fromAddress,
  chainId,
  fromBlock,
  stopAfterMs = CHECKIN_TX_DETECT_TIMEOUT_MS,
}) => {
  const client = getPublicClient(wagmiClient, { chainId });
  if (!client) throw new Error("Network unavailable");

  const stopAt = Date.now() + stopAfterMs;
  let nextBlock = fromBlock;
  const from = String(fromAddress || "").toLowerCase();
  const to = String(contractAddress || "").toLowerCase();

  while (Date.now() < stopAt) {
    try {
      const latestBlock = await client.getBlockNumber();
      if (latestBlock >= nextBlock) {
        for (
          let lo = nextBlock;
          lo <= latestBlock;
          lo += CHECKIN_LOG_BLOCK_CHUNK + 1n
        ) {
          const hi =
            lo + CHECKIN_LOG_BLOCK_CHUNK > latestBlock
              ? latestBlock
              : lo + CHECKIN_LOG_BLOCK_CHUNK;
          try {
            const logs = await client.getLogs({
              address: contractAddress,
              fromBlock: lo,
              toBlock: hi,
            });
            for (const log of logs) {
              if (!log.transactionHash) continue;
              try {
                const receipt = await client.getTransactionReceipt({
                  hash: log.transactionHash,
                });
                if (
                  String(receipt?.from || "").toLowerCase() === from &&
                  String(receipt?.to || "").toLowerCase() === to &&
                  receipt.status === "success"
                ) {
                  return log.transactionHash;
                }
              } catch {
                // Receipt not indexed yet.
              }
            }
          } catch {
            // Ignore transient RPC range failures.
          }
        }
        nextBlock = latestBlock + 1n;
      }
    } catch {
      // Ignore transient RPC failures and continue polling.
    }
    await sleep(CHECKIN_CHAIN_POLL_INTERVAL_MS);
  }

  throw new Error(
    "Transaction sign request timed out. If you already approved in wallet, check history then retry.",
  );
};

const waitForReceiptWithFallback = async ({
  hash,
  chainId,
  timeoutMs = CHECKIN_RECEIPT_WAIT_TIMEOUT_MS,
}) => {
  if (!hash) throw new Error("Missing transaction hash");
  try {
    return await waitWithTimeout(
      wagmiWaitForTransactionReceipt(wagmiClient, { hash, chainId }),
      timeoutMs,
      "Timed out waiting for transaction receipt.",
    );
  } catch (waitErr) {
    const client = getPublicClient(wagmiClient, { chainId });
    if (!client) throw waitErr;
    for (let i = 0; i < CHECKIN_RECEIPT_MAX_ATTEMPTS; i += 1) {
      try {
        const receipt = await client.getTransactionReceipt({ hash });
        if (receipt) return receipt;
      } catch (pollErr) {
        if (!isTransientReceiptLookupError(pollErr)) {
          throw pollErr;
        }
      }
      await sleep(CHECKIN_RECEIPT_POLL_INTERVAL_MS);
    }
    throw waitErr;
  }
};

const writeOrDetectCheckinTx = async ({
  writeTx,
  contractAddress,
  fromAddress,
  chainId,
}) => {
  let fromBlock = 0n;
  try {
    const client = getPublicClient(wagmiClient, { chainId });
    if (client) fromBlock = await client.getBlockNumber();
  } catch {
    // Non-fatal; poller can still scan from block 0.
  }

  const writePromise = writeTx();
  let earlyRejectError = null;
  const earlyCheck = new Promise((resolve, reject) => {
    const t = setTimeout(() => resolve("__poll__"), 3000);
    writePromise.then(
      (hash) => {
        clearTimeout(t);
        resolve(hash);
      },
      (err) => {
        clearTimeout(t);
        earlyRejectError = err;
        reject(err);
      },
    );
  });

  try {
    const earlyResult = await earlyCheck;
    if (earlyResult !== "__poll__") return earlyResult;
  } catch {
    throw earlyRejectError ?? new Error("Transaction rejected.");
  }

  const pollPromise = (async () => {
    await sleep(CHECKIN_CHAIN_POLL_DELAY_MS);
    return pollContractLogsForCheckinTx({
      contractAddress,
      fromAddress,
      chainId,
      fromBlock,
      stopAfterMs: CHECKIN_TX_DETECT_TIMEOUT_MS,
    });
  })();

  const timeoutPromise = new Promise((_, reject) =>
    setTimeout(
      () =>
        reject(
          new Error(
            "Transaction sign request timed out. If you already approved in wallet, check history then retry.",
          ),
        ),
      CHECKIN_TX_DETECT_TIMEOUT_MS,
    ),
  );

  return Promise.race([writePromise, pollPromise, timeoutPromise]);
};

export function useCheckin() {
  const walletType = useSelector((state) => state.wallet.walletType);
  const walletAddress = useSelector((state) => state.wallet.address);
  const chainId = useSelector((state) => state.wallet.chainId);
  const isConnected = useSelector((state) => state.wallet.isConnected);
  const sessionSource = useSelector((state) => state.wallet.sessionSource);
  const { user: authUser, isAuthenticated } = useAuth();
  const { wallets } = useWallets();

  const { chainId: wagmiChainId } = useAccount();
  const { writeContractAsync } = useWriteContract();
  const { switchChainAsync } = useSwitchChain();
  const { signMessage: signMessageSolana } = useWallet();

  const status = useSelector((state) => state.checkin?.status);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const isSolana = walletType === "solana";
  const currentEVMChainId = isSolana ? null : (wagmiChainId ?? chainId);
  const dispatch = useDispatch();
  const fetchStatus = useCallback(async () => {
    const token = localStorage.getItem("authToken");
    if (!token) {
      dispatch(setCheckinStatus(null));
      return;
    }
    try {
      const data = await apiCall("/checkin/status");
      dispatch(setCheckinStatus(data));
      setError(null);
    } catch (err) {
      dispatch(setCheckinStatus(null));
      if (err?.status !== 401)
        setError(err?.message || "Failed to load status");
    }
  }, [dispatch]);

  useEffect(() => {
    if (isAuthenticated) fetchStatus();
    else dispatch(setCheckinStatus(null));
  }, [isAuthenticated, fetchStatus, dispatch]);

  const claimSolana = useCallback(async () => {
    if (!signMessageSolana || !walletAddress) {
      throw new Error("Solana wallet not connected");
    }
    const today = new Date().toISOString().split("T")[0];
    const message = `AlloX Daily Check-In\n${today}\n${walletAddress}`;
    const encoded = new TextEncoder().encode(message);
    const signature = await waitWithTimeout(
      signMessageSolana(encoded),
      WALLET_SIGN_TIMEOUT_MS,
      "Sign request timed out. Re-open your wallet and try again.",
    );
    const signatureB58 = bs58.encode(new Uint8Array(signature));
    return apiCall("/checkin", {
      method: "POST",
      body: JSON.stringify({
        chain: "solana",
        signature: signatureB58,
        message,
      }),
    });
  }, [walletAddress, signMessageSolana]);

  const claimEVM = useCallback(
    async (targetChainId = currentEVMChainId) => {
      const effectiveChainId = SUPPORTED_EVM_CHAIN_IDS.includes(targetChainId)
        ? targetChainId
        : SUPPORTED_EVM_CHAIN_IDS[0];
      const apiChain = CHAIN_ID_TO_API[effectiveChainId];
      const contractAddress = CHAIN_ID_TO_ADDRESS[effectiveChainId];

      const isPrivySession =
        authUser?.authProvider === "privy" ||
        sessionSource === "privy" ||
        walletType === "privy";

      if (isPrivySession) {
        const embedded = getPrivyEmbedded(wallets);
        if (!embedded) {
          throw new Error(
            "Embedded wallet not found. Refresh the page or sign in again.",
          );
        }
        try {
          await switchPrivyEmbeddedToChain(embedded, effectiveChainId);
        } catch (switchErr) {
          throw new Error(
            switchErr?.message ||
              `Please switch to ${apiChain} (chain ID ${effectiveChainId}) to claim.`,
          );
        }
        const ethProvider = await embedded.getEthereumProvider();
        const web3Provider = new ethers.providers.Web3Provider(ethProvider);
        const signer = web3Provider.getSigner();
        const data = encodeFunctionData({
          abi: CHECKIN_ABI,
          functionName: "checkIn",
          args: [],
        });
        const txResponse = await waitWithTimeout(
          signer.sendTransaction({
            to: contractAddress,
            data,
          }),
          CHECKIN_TX_DETECT_TIMEOUT_MS,
          "Transaction sign request timed out. Re-open your wallet and try again.",
        );
        const txHash = normalizeTxHash(txResponse);
        if (!txHash) {
          throw new Error("Missing transaction hash from wallet.");
        }
        await waitForReceiptWithFallback({
          hash: txHash,
          chainId: effectiveChainId,
        });

        return apiCall("/checkin", {
          method: "POST",
          body: JSON.stringify({
            chain: apiChain,
            txHash,
          }),
        });
      }

      if (currentEVMChainId !== effectiveChainId && switchChainAsync) {
        try {
          await switchChainAsync({ chainId: effectiveChainId });
        } catch (switchErr) {
          if (switchErr?.code === 4902) {
            throw new Error(
              `Please add ${apiChain} network in your wallet and try again.`,
            );
          }
          throw new Error(
            switchErr?.message ||
              `Please switch to ${apiChain} (chain ID ${effectiveChainId}) to claim.`,
          );
        }
      }

      const fromAddress = walletAddress;
      if (!fromAddress) {
        throw new Error("Wallet not connected");
      }
      const txHash = await writeOrDetectCheckinTx({
        writeTx: () =>
          writeContractAsync({
            address: contractAddress,
            abi: CHECKIN_ABI,
            functionName: "checkIn",
            chainId: effectiveChainId,
          }),
        contractAddress,
        fromAddress,
        chainId: effectiveChainId,
      });

      await waitForReceiptWithFallback({
        hash: txHash,
        chainId: effectiveChainId,
      });

      return apiCall("/checkin", {
        method: "POST",
        body: JSON.stringify({
          chain: apiChain,
          txHash,
        }),
      });
    },
    [
      authUser?.authProvider,
      sessionSource,
      walletType,
      currentEVMChainId,
      switchChainAsync,
      wallets,
      writeContractAsync,
      walletAddress,
    ],
  );

  const claim = useCallback(
    async (targetChainIdOverride) => {
      setError(null);
      setLoading(true);
      try {
        const targetChainId =
          targetChainIdOverride ??
          (isSolana ? SOLANA_CHAIN_ID : chainId) ??
          1;

        if (targetChainId === SOLANA_CHAIN_ID) {
          if (!isSolana) {
            const err = new Error(
              "Solana requires a Solana-capable wallet (e.g. MetaMask with Solana). Please connect with a Solana wallet.",
            );
            err.code = "WALLET_SOLANA_REQUIRED";
            throw err;
          }
          await claimSolana();
        } else if (SUPPORTED_EVM_CHAIN_IDS.includes(targetChainId)) {
          if (isSolana) {
            const err = new Error(
              "EVM chains require an EVM wallet (e.g. MetaMask). Please connect with an EVM wallet.",
            );
            err.code = "WALLET_EVM_REQUIRED";
            throw err;
          }
          await claimEVM(targetChainId);
        } else {
          await claimEVM(SUPPORTED_EVM_CHAIN_IDS[0]);
        }
        await fetchStatus();
      } catch (err) {
        const msg =
          err?.message ||
          err?.data?.message ||
          (typeof err?.data?.error === "string"
            ? err.data.error
            : "Claim failed");
        setError(msg);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [isSolana, chainId, claimSolana, claimEVM,
       fetchStatus
      ],
  );

  const fetchHistory = useCallback(async () => {
    return apiCall("/checkin/history");
  }, []);

  const addOptimisticCheckinPoints = useCallback(
    (points) => dispatch(addOptimisticCheckinPointsAction(points)),
    [dispatch],
  );

  const checkedInToday = status?.checkedInToday ?? null;
  const canCheckIn = status?.canCheckIn === true;
  const canClaim = isConnected && (canCheckIn ?? !checkedInToday);

  return {
    status,
    checkedInToday,
    canCheckIn,
    canClaim,
    loading,
    error,
    claim,
    fetchStatus,
    fetchHistory,
    addOptimisticCheckinPoints,
    isSolana,
  };
}
