import { useCallback, useState, useEffect } from "react";
import { useSelector } from "react-redux";
import { useWriteContract, useSwitchChain, useAccount } from "wagmi";
import { useWallet } from "@solana/wallet-adapter-react";
import { waitForTransactionReceipt as wagmiWaitForTransactionReceipt } from "@wagmi/core";
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

export function useCheckin() {
  const walletType = useSelector((state) => state.wallet.walletType);
  const walletAddress = useSelector((state) => state.wallet.address);
  const chainId = useSelector((state) => state.wallet.chainId);
  const isConnected = useSelector((state) => state.wallet.isConnected);
  const { user: authUser } = useAuth();
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
    if (isConnected) fetchStatus();
    else 
      dispatch(setCheckinStatus(null));
  }, [isConnected,
     fetchStatus,
      dispatch]);

  const claimSolana = useCallback(async () => {
    if (!signMessageSolana || !walletAddress) {
      throw new Error("Solana wallet not connected");
    }
    const today = new Date().toISOString().split("T")[0];
    const message = `AlloX Daily Check-In\n${today}\n${walletAddress}`;
    const encoded = new TextEncoder().encode(message);
    const signature = await signMessageSolana(encoded);
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

      if (authUser?.authProvider === "privy") {
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
        const txResponse = await signer.sendTransaction({
          to: contractAddress,
          data,
        });
        const txHash = txResponse.hash;
        await txResponse.wait(1);

        return apiCall("/checkin", {
          method: "POST",
          body: JSON.stringify({
            chain: apiChain,
            txHash:
              typeof txHash === "string" ? txHash : (txHash?.hash ?? txHash),
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

      const txHash = await writeContractAsync({
        address: contractAddress,
        abi: CHECKIN_ABI,
        functionName: "checkIn",
        chainId: effectiveChainId,
      });

      let receipt;
      const maxRetries = 5;
      for (let i = 0; i < maxRetries; i++) {
        receipt = await wagmiWaitForTransactionReceipt(wagmiClient, {
          hash: txHash,
        }).catch(() => null);
        if (receipt) break;
        // wait 2 seconds before retry
        await new Promise((res) => setTimeout(res, 2000));
      }

      if (receipt) {
        return apiCall("/checkin", {
          method: "POST",
          body: JSON.stringify({
            chain: apiChain,
            txHash:
              typeof txHash === "string" ? txHash : (txHash?.hash ?? txHash),
          }),
        });
      }
    },
    [
      authUser?.authProvider,
      currentEVMChainId,
      switchChainAsync,
      wallets,
      writeContractAsync,
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
