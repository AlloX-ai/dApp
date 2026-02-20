import { useCallback, useState, useEffect } from "react";
import { useSelector } from "react-redux";
import { useWriteContract, useSwitchChain, useAccount } from "wagmi";
import bs58 from "bs58";
import { apiCall } from "../utils/api";
import {
  checkin_base_address,
  checkin_eth_address,
  checkin_bnb_address,
  CHECKIN_ABI,
} from "../constants/contracts";

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

export function useCheckin() {
  const walletType = useSelector((state) => state.wallet.walletType);
  const walletAddress = useSelector((state) => state.wallet.address);
  const chainId = useSelector((state) => state.wallet.chainId);
  const isConnected = useSelector((state) => state.wallet.isConnected);

  const { chainId: wagmiChainId } = useAccount();
  const { writeContractAsync } = useWriteContract();
  const { switchChainAsync } = useSwitchChain();

  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const isSolana = walletType === "phantom";
  const currentEVMChainId = isSolana ? null : (wagmiChainId ?? chainId);

  const fetchStatus = useCallback(async () => {
    const token = localStorage.getItem("authToken");
    if (!token) {
      setStatus(null);
      return;
    }
    try {
      const data = await apiCall("/checkin/status");
      setStatus(data);
      setError(null);
    } catch (err) {
      setStatus(null);
      if (err?.status !== 401) setError(err?.message || "Failed to load status");
    }
  }, []);

  useEffect(() => {
    if (isConnected) fetchStatus();
    else setStatus(null);
  }, [isConnected, fetchStatus]);

  const claimSolana = useCallback(async () => {
    const provider = window.phantom?.solana;
    if (!provider || !walletAddress) {
      throw new Error("Solana wallet not connected");
    }
    const today = new Date().toISOString().split("T")[0];
    const message = `AlloX Daily Check-In\n${today}\n${walletAddress}`;
    const encoded = new TextEncoder().encode(message);
    const { signature } = await provider.signMessage(encoded, "utf8");
    const signatureB58 = bs58.encode(signature);
    return apiCall("/checkin", {
      method: "POST",
      body: JSON.stringify({
        chain: "solana",
        signature: signatureB58,
        message,
      }),
    });
  }, [walletAddress]);

  const claimEVM = useCallback(
    async (targetChainId = currentEVMChainId) => {
      const effectiveChainId = SUPPORTED_EVM_CHAIN_IDS.includes(targetChainId)
        ? targetChainId
        : SUPPORTED_EVM_CHAIN_IDS[0];
      const apiChain = CHAIN_ID_TO_API[effectiveChainId];
      const contractAddress = CHAIN_ID_TO_ADDRESS[effectiveChainId];

      if (currentEVMChainId !== effectiveChainId && switchChainAsync) {
        try {
          await switchChainAsync({ chainId: effectiveChainId });
        } catch (switchErr) {
          if (switchErr?.code === 4902) {
            throw new Error(
              `Please add ${apiChain} network in your wallet and try again.`
            );
          }
          throw new Error(
            switchErr?.message ||
              `Please switch to ${apiChain} (chain ID ${effectiveChainId}) to claim.`
          );
        }
      }

      const txHash = await writeContractAsync({
        address: contractAddress,
        abi: CHECKIN_ABI,
        functionName: "checkIn",
        chainId: effectiveChainId,
      });

      return apiCall("/checkin", {
        method: "POST",
        body: JSON.stringify({
          chain: apiChain,
          txHash: typeof txHash === "string" ? txHash : txHash?.hash ?? txHash,
        }),
      });
    },
    [currentEVMChainId, switchChainAsync, writeContractAsync]
  );

  const claim = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      if (isSolana) {
        await claimSolana();
      } else {
        const targetChainId = SUPPORTED_EVM_CHAIN_IDS.includes(chainId)
          ? chainId
          : 1;
        await claimEVM(targetChainId);
      }
      await fetchStatus();
    } catch (err) {
      const msg =
        err?.message ||
        err?.data?.message ||
        (typeof err?.data?.error === "string" ? err.data.error : "Claim failed");
      setError(msg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [isSolana, chainId, claimSolana, claimEVM, fetchStatus]);

  const fetchHistory = useCallback(async () => {
    return apiCall("/checkin/history");
  }, []);

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
    isSolana,
  };
}
