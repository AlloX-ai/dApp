import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  X,
  SendHorizontal,
  ChevronDown,
  Loader2,
  HelpCircle,
} from "lucide-react";
import { toast } from "sonner";
import { useWallet } from "@solana/wallet-adapter-react";
import { useSendTransaction, useWallets } from "@privy-io/react-auth";
import { useAccount, useSwitchChain, useWriteContract } from "wagmi";
import type { Address } from "viem";
import { numberToHex } from "viem";
import { useAuth } from "../hooks/useAuth";
import { setChainId } from "../redux/slices/walletSlice";
import { store } from "../redux/store";
import OutsideClickHandler from "react-outside-click-handler";
import {
  getEmbeddedNumericChainId,
  getPrivyEmbedded,
  switchPrivyEmbeddedToChain,
} from "../utils/privyWalletUtils";
import {
  applyOptimisticPurchasedMessages,
  applyRateLimitFromServerPayload,
  refreshRateLimitAfterMessagePurchase,
} from "../utils/chatStatusFetch";
import {
  fetchMessagePackages,
  findErc20PriceForToken,
  formatEvmPriceLabel,
  getChainIcon,
  getChainLabel,
  formatSolanaChainPriceLabel,
  getEvmChainNumericIdForMessageChainKey,
  getSolanaPurchaseAmounts,
  hasInjectedSolanaProvider,
  listChainKeysFromPayload,
  messageChainKeyFromWalletChainId,
  postMessagePurchase,
  prefetchSolUsdPrice,
  purchaseEvmPackage,
  purchaseSolanaPackage,
  readErc20Decimals,
  readEvmPackagePricing,
  resolveSolanaPaymentWallet,
  tokenOptionsForChain,
  type MessageChainKey,
  type MessagePackage,
  type MessagesChains,
} from "../utils/messagePurchase";

const TOKEN_ICONS: Record<string, string> = {
  USDT: "https://cdn.allox.ai/allox/networks/usdt.svg",
  USDC: "https://cdn.allox.ai/allox/networks/usdc.svg",
  ETH: "https://cdn.allox.ai/allox/networks/eth.svg",
  BNB: "https://cdn.allox.ai/allox/networks/bnbIcon.svg",
  SOL: "https://cdn.allox.ai/allox/networks/solana.svg",
  /** Generic SPL option (pricing may resolve to USDC/USDT under the hood). */
  SPL: "https://cdn.allox.ai/allox/networks/usdc.svg",
};

/** Same key as `NetworkSelector` — cleared when switching EVM chain. */
const WALLET_PREFERRED_CHAIN_STORAGE_KEY = "walletPreferredChainId";

function tokenIcon(symbol: string): string {
  const s = symbol.toUpperCase();
  if (TOKEN_ICONS[s]) return TOKEN_ICONS[s];
  if (s === "NATIVE") return TOKEN_ICONS.ETH;
  return TOKEN_ICONS.USDT;
}

interface MessageLimitModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Rolling daily free allowance remaining. */
  dailyMessagesRemaining: number | null;
  /** Purchased messages remaining (used before daily). */
  bonusMessages: number | null;
  onPurchaseSuccess?: () => void;
}

export function MessageLimitModal({
  isOpen,
  onClose,
  dailyMessagesRemaining,
  bonusMessages,
  onPurchaseSuccess,
}: MessageLimitModalProps) {
  const dispatch = useDispatch();
  const { setUser, user: authUser } = useAuth();
  const { sendTransaction: privySendTransaction } = useSendTransaction();
  const { wallets } = useWallets();
  const walletType = useSelector(
    (state: { wallet?: { walletType?: string } }) => state.wallet?.walletType,
  );
  const solanaAddress = useSelector(
    (state: { wallet?: { address?: string } }) => state.wallet?.address,
  );
  const reduxChainId = useSelector(
    (state: { wallet?: { chainId?: number } }) => state.wallet?.chainId,
  );
  const sessionSource = useSelector(
    (state: { wallet?: { sessionSource?: string | null } }) =>
      state.wallet?.sessionSource ?? null,
  );

  const { publicKey, connected, sendTransaction } = useWallet();
  const { address: evmAddress, chainId: wagmiChainId, connector } = useAccount();
  const wagmiChainRef = useRef(wagmiChainId);
  wagmiChainRef.current = wagmiChainId;
  const { writeContractAsync } = useWriteContract();
  const { switchChainAsync } = useSwitchChain();

  const [packages, setPackages] = useState<MessagePackage[]>([]);
  const [chains, setChains] = useState<MessagesChains | undefined>();
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loadingPackages, setLoadingPackages] = useState(false);

  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [selectedChainKey, setSelectedChainKey] =
    useState<MessageChainKey>("bnb");
  const [selectedToken, setSelectedToken] = useState("USDT");
  const [isChainDropdownOpen, setIsChainDropdownOpen] = useState(false);
  const [isTokenDropdownOpen, setIsTokenDropdownOpen] = useState(false);

  const [priceLabel, setPriceLabel] = useState<string>("—");
  const [loadingPrice, setLoadingPrice] = useState(false);
  const [purchasing, setPurchasing] = useState(false);
  /** Bumps when SOL/USD is fetched so Solana price line recomputes (API has no packagePricing). */
  const [solUsdTick, setSolUsdTick] = useState(0);
  const [infoOpen, setInfoOpen] = useState<"daily" | "purchased" | null>(null);

  const isSolanaWallet = walletType === "solana";
  /* With Solana hidden from dropdowns, adapter-only state is unused here; restore with chainKeys block below.
  const hasSolanaAdapter = Boolean(connected && publicKey);
  */
  const evmChainId = wagmiChainId ?? reduxChainId ?? null;

  /** Phantom (redux) or Wallet Standard / MetaMask Solana (adapter). */
  const effectiveSolanaAddress = useMemo(() => {
    if (connected && publicKey) return publicKey.toBase58();
    if (walletType === "solana" && solanaAddress) return solanaAddress;
    return null;
  }, [connected, publicKey, walletType, solanaAddress]);

  const canSignSolanaTx = useMemo(
    () =>
      Boolean(
        effectiveSolanaAddress &&
        (typeof sendTransaction === "function" || hasInjectedSolanaProvider()),
      ),
    [effectiveSolanaAddress, sendTransaction],
  );

  const syncGlobalNetworkForMessageChain = useCallback(
    async (key: MessageChainKey) => {
      if (key === "solana") {
        toast.error("Switch to Solana from the network menu in the header.");
        throw new Error("solana");
      }
      const chainId = getEvmChainNumericIdForMessageChainKey(key);
      const isPrivyEvm =
        authUser?.authProvider === "privy" ||
        sessionSource === "privy" ||
        walletType === "privy";

      if (isPrivyEvm) {
        const embedded = getPrivyEmbedded(wallets);
        if (!embedded) {
          toast.error("Embedded wallet not ready. Refresh or sign in again.");
          throw new Error("no embedded");
        }
        await switchPrivyEmbeddedToChain(embedded, chainId);
        dispatch(setChainId(chainId));
        try {
          localStorage.removeItem(WALLET_PREFERRED_CHAIN_STORAGE_KEY);
        } catch {
          /* noop */
        }
        return;
      }

      if (switchChainAsync && connector) {
        try {
          await switchChainAsync({ chainId });
          dispatch(setChainId(chainId));
          try {
            localStorage.removeItem(WALLET_PREFERRED_CHAIN_STORAGE_KEY);
          } catch {
            /* noop */
          }
        } catch (err: unknown) {
          const code =
            err && typeof err === "object" && "code" in err
              ? (err as { code?: number }).code
              : undefined;
          if (code === 4902) {
            toast.error(
              "Add this network in your wallet or switch from the header menu.",
            );
          } else {
            toast.error("Failed to switch network.");
          }
          throw err;
        }
        return;
      }

      const eth = (
        typeof window !== "undefined"
          ? (
              window as unknown as {
                ethereum?: { request: (args: unknown) => Promise<unknown> };
              }
            ).ethereum
          : undefined
      );
      if (eth?.request) {
        const chainHex = numberToHex(chainId);
        await eth.request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId: chainHex }],
        });
        dispatch(setChainId(chainId));
        return;
      }

      toast.error("Connect a wallet to switch networks.");
      throw new Error("no wallet");
    },
    [
      authUser?.authProvider,
      sessionSource,
      walletType,
      wallets,
      switchChainAsync,
      connector,
      dispatch,
    ],
  );

  const chainKeys = useMemo(() => {
    const raw = listChainKeysFromPayload(chains);
    /* Solana: temporarily omit from chain + token dropdowns. Restore when ready:
    if (isSolanaWallet) return raw.filter((k) => k === "solana");
    if (hasSolanaAdapter && evmAddress) return raw;
    if (hasSolanaAdapter) return raw.filter((k) => k === "solana");
    return raw.filter((k) => k !== "solana");
    */
    return raw.filter((k) => k !== "solana");
  }, [chains]);

  const tokenOptions = useMemo(
    () => tokenOptionsForChain(selectedChainKey, chains),
    [selectedChainKey, chains],
  );

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    prefetchSolUsdPrice().finally(() => {
      if (!cancelled) setSolUsdTick((n) => n + 1);
    });
    setLoadingPackages(true);
    setLoadError(null);
    fetchMessagePackages()
      .then((data) => {
        if (cancelled) return;
        const list = Array.isArray(data?.packages) ? data.packages : [];
        setPackages(list);
        setChains(data?.chains);
        const keys = listChainKeysFromPayload(data?.chains);
        /* Solana: when re-enabled, restore default chain for Solana wallets:
        const keysEffective = isSolanaWallet
          ? keys.filter((k) => k === "solana")
          : keys.filter((k) => k !== "solana");
        const first = keysEffective[0] ?? (isSolanaWallet ? "solana" : "bnb");
        */
        const keysEffective = keys.filter((k) => k !== "solana");
        const walletNumericId =
          store.getState().wallet.chainId ?? wagmiChainRef.current ?? null;
        const fromWallet =
          messageChainKeyFromWalletChainId(walletNumericId);
        const pick =
          fromWallet &&
          fromWallet !== "solana" &&
          keysEffective.includes(fromWallet)
            ? fromWallet
            : keysEffective[0] ?? "bnb";
        setSelectedChainKey(pick);
      })
      .catch((err: { message?: string }) => {
        if (!cancelled) setLoadError(err?.message || "Failed to load packages");
      })
      .finally(() => {
        if (!cancelled) setLoadingPackages(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) setInfoOpen(null);
  }, [isOpen]);

  /** Keep payment chain in sync if the user switches network from the header while the modal is open. */
  useEffect(() => {
    if (!isOpen || chainKeys.length === 0) return;
    const fromWallet = messageChainKeyFromWalletChainId(
      reduxChainId ?? wagmiChainId ?? null,
    );
    if (
      fromWallet &&
      fromWallet !== "solana" &&
      chainKeys.includes(fromWallet)
    ) {
      setSelectedChainKey(fromWallet);
    }
  }, [isOpen, chainKeys, reduxChainId, wagmiChainId]);

  useEffect(() => {
    const opts = tokenOptionsForChain(selectedChainKey, chains);
    const first = opts[0]?.symbol;
    if (first && !opts.some((o) => o.symbol === selectedToken)) {
      setSelectedToken(first);
    }
  }, [selectedChainKey, chains, selectedToken, tokenOptions]);

  useEffect(() => {
    if (!isOpen || selectedChainKey === "solana") {
      setLoadingPrice(false);
      return;
    }
    const pkg = selectedIndex != null ? packages[selectedIndex] : null;

    if (!pkg) {
      setPriceLabel("—");
      setLoadingPrice(false);
      return;
    }
    const tok = tokenOptions.find((t) => t.symbol === selectedToken);
    if (!tok) {
      setPriceLabel("—");
      setLoadingPrice(false);
      return;
    }

    let cancelled = false;
    setLoadingPrice(true);
    (async () => {
      try {
        const chainKey = selectedChainKey as Exclude<MessageChainKey, "solana">;
        const { nativePrice, tokens, prices } = await readEvmPackagePricing(
          chainKey,
          pkg.id,
          chains,
        );
        if (cancelled) return;
        if (tok.type === "native") {
          setPriceLabel(
            formatEvmPriceLabel({
              chainKey,
              tokenSymbol: tok.symbol,
              tokenType: "native",
              nativePrice,
            }),
          );
          return;
        }
        const tokenMap = chains?.[chainKey]?.tokens ?? {};
        const match = findErc20PriceForToken(
          tok.symbol,
          tokenMap,
          tokens,
          prices,
        );
        let decimals = 18;
        if (match) {
          decimals = await readErc20Decimals(chainKey, match.address);
        }
        setPriceLabel(
          formatEvmPriceLabel({
            chainKey,
            tokenSymbol: tok.symbol,
            tokenType: "erc20",
            nativePrice,
            erc20: match != null ? { amount: match.amount, decimals } : null,
          }),
        );
      } catch {
        if (!cancelled) setPriceLabel("—");
      } finally {
        if (!cancelled) setLoadingPrice(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [
    isOpen,
    selectedChainKey,
    selectedIndex,
    selectedToken,
    packages,
    chains,
    tokenOptions,
  ]);

  useEffect(() => {
    if (!isOpen || selectedChainKey !== "solana") return;
    const pkg = selectedIndex != null ? packages[selectedIndex] : null;
    if (!pkg) {
      setPriceLabel("—");
      return;
    }
    const tok = tokenOptions.find((t) => t.symbol === selectedToken);
    setPriceLabel(formatSolanaChainPriceLabel(pkg, chains, tok));
  }, [
    isOpen,
    selectedChainKey,
    selectedIndex,
    selectedToken,
    packages,
    chains,
    tokenOptions,
    solUsdTick,
  ]);

  const handlePurchase = useCallback(async () => {
    if (selectedIndex == null || !packages[selectedIndex]) {
      toast.error("Select a package");
      return;
    }
    const pkg = packages[selectedIndex];
    const tok = tokenOptions.find((t) => t.symbol === selectedToken);
    if (!tok) {
      toast.error("Select a payment token");
      return;
    }

    const submitPurchaseWithRetry = async (payload: {
      txHash: string;
      chain: MessageChainKey;
      packageId: number;
      token: string;
    }) => {
      let lastErr: unknown = null;
      for (let attempt = 1; attempt <= 8; attempt += 1) {
        try {
          return await postMessagePurchase(payload);
        } catch (err: unknown) {
          lastErr = err;
          const msg =
            err && typeof err === "object" && "message" in err
              ? String((err as { message?: string }).message)
              : "";
          const status =
            err && typeof err === "object" && "status" in err
              ? Number((err as { status?: number }).status)
              : 0;
          const retryable =
            status >= 500 ||
            /not found|pending|index|receipt|confirm|processing|transaction/i.test(
              msg,
            );
          if (!retryable || attempt === 8) break;
          await new Promise((resolve) =>
            window.setTimeout(resolve, Math.min(1000 * attempt, 4000)),
          );
        }
      }
      throw lastErr;
    };

    setPurchasing(true);
    try {
      if (selectedChainKey === "solana") {
        await prefetchSolUsdPrice();
        if (!canSignSolanaTx || !effectiveSolanaAddress) {
          toast.error(
            "Connect a Solana wallet (Phantom, or MetaMask on Solana) to pay on Solana.",
          );
          return;
        }
        if (!resolveSolanaPaymentWallet(chains)) {
          toast.error("Solana payment address is not configured.");
          return;
        }
        if (!getSolanaPurchaseAmounts(pkg, chains, selectedToken)) {
          toast.error(
            "Missing Solana pricing for this package. Check back later.",
          );
          return;
        }
        const { txHash } = await purchaseSolanaPackage({
          pkg,
          chains,
          tokenSymbol: selectedToken,
          fromPubkey: effectiveSolanaAddress,
          sendTransaction: sendTransaction ?? undefined,
        });
        applyOptimisticPurchasedMessages(dispatch, setUser, pkg.messages);
        onClose();
        toast.success("Transaction sent. Finalizing purchase...");
        void (async () => {
          try {
            const purchaseRes = await submitPurchaseWithRetry({
              txHash,
              chain: "solana",
              packageId: pkg.id,
              token: selectedToken,
            });
            applyRateLimitFromServerPayload(dispatch, setUser, purchaseRes);
            void refreshRateLimitAfterMessagePurchase(dispatch, setUser);
            toast.success("Purchase submitted");
            onPurchaseSuccess?.();
          } catch (err: unknown) {
            const msg =
              err && typeof err === "object" && "message" in err
                ? String((err as { message?: string }).message)
                : "Purchase submitted, but confirmation is delayed.";
            toast.error(msg);
          }
        })();
        return;
      }

      if (isSolanaWallet) {
        toast.error("Use an EVM wallet for this network.");
        return;
      }

      const chainKey = selectedChainKey as Exclude<MessageChainKey, "solana">;
      const isPrivyEvm =
        authUser?.authProvider === "privy" ||
        sessionSource === "privy" ||
        walletType === "privy";

      if (isPrivyEvm) {
        const embedded = getPrivyEmbedded(wallets);
        const addr = (
          embedded?.address ||
          authUser?.address ||
          evmAddress ||
          solanaAddress ||
          ""
        ).trim();
        if (!/^0x[a-fA-F0-9]{40}$/i.test(addr)) {
          toast.error("Wallet address not available.");
          return;
        }
        if (!embedded) {
          toast.error("Embedded wallet not ready. Refresh or sign in again.");
          return;
        }
        const currentPrivyChain =
          getEmbeddedNumericChainId(embedded) ?? reduxChainId ?? null;
        const { txHash } = await purchaseEvmPackage({
          chainKey,
          packageId: pkg.id,
          chains,
          tokenSymbol: selectedToken,
          tokenType: tok.type === "native" ? "native" : "erc20",
          currentChainId: currentPrivyChain,
          privy: {
            walletAddress: addr as Address,
            sendTransaction: privySendTransaction,
            switchChain: (id) => switchPrivyEmbeddedToChain(embedded, id),
          },
        });

        const tokenForApi = tok.type === "native" ? tok.type : selectedToken;

        applyOptimisticPurchasedMessages(dispatch, setUser, pkg.messages);
        onClose();
        toast.success("Transaction sent. Finalizing purchase...");
        void (async () => {
          try {
            const purchaseResPrivy = await submitPurchaseWithRetry({
              txHash,
              chain: chainKey,
              packageId: pkg.id,
              token: tokenForApi,
            });
            applyRateLimitFromServerPayload(dispatch, setUser, purchaseResPrivy);
            void refreshRateLimitAfterMessagePurchase(dispatch, setUser);
            toast.success("Purchase confirmed");
            onPurchaseSuccess?.();
          } catch (err: unknown) {
            const msg =
              err && typeof err === "object" && "message" in err
                ? String((err as { message?: string }).message)
                : "Purchase submitted, but confirmation is delayed.";
            toast.error(msg);
          }
        })();
        return;
      }

      if (!evmAddress) {
        toast.error("Connect your wallet first.");
        return;
      }

      const { txHash } = await purchaseEvmPackage({
        chainKey,
        packageId: pkg.id,
        chains,
        tokenSymbol: selectedToken,
        tokenType: tok.type === "native" ? "native" : "erc20",
        writeContractAsync: writeContractAsync as (
          p: Record<string, unknown>,
        ) => Promise<`0x${string}`>,
        switchChainAsync,
        currentChainId: evmChainId,
      });

      const tokenForApi = tok.type === "native" ? tok.type : selectedToken;

      applyOptimisticPurchasedMessages(dispatch, setUser, pkg.messages);
      onClose();
      toast.success("Transaction sent. Finalizing purchase...");
      void (async () => {
        try {
          const purchaseRes = await submitPurchaseWithRetry({
            txHash,
            chain: chainKey,
            packageId: pkg.id,
            token: tokenForApi,
          });
          applyRateLimitFromServerPayload(dispatch, setUser, purchaseRes);
          void refreshRateLimitAfterMessagePurchase(dispatch, setUser);
          toast.success("Purchase confirmed");
          onPurchaseSuccess?.();
        } catch (err: unknown) {
          const msg =
            err && typeof err === "object" && "message" in err
              ? String((err as { message?: string }).message)
              : "Purchase submitted, but confirmation is delayed.";
          toast.error(msg);
        }
      })();
    } catch (e: unknown) {
      const msg =
        e && typeof e === "object" && "message" in e
          ? String((e as { message?: string }).message)
          : "Purchase failed";
      if (!msg.toLowerCase().includes("user rejected")) {
        toast.error(msg);
      }
    } finally {
      setPurchasing(false);
    }
  }, [
    selectedIndex,
    packages,
    tokenOptions,
    selectedToken,
    selectedChainKey,
    chains,
    isSolanaWallet,
    canSignSolanaTx,
    effectiveSolanaAddress,
    sendTransaction,
    authUser?.address,
    authUser?.authProvider,
    sessionSource,
    walletType,
    evmAddress,
    evmChainId,
    reduxChainId,
    solanaAddress,
    wallets,
    privySendTransaction,
    writeContractAsync,
    switchChainAsync,
    dispatch,
    setUser,
    onPurchaseSuccess,
    onClose,
  ]);

  if (!isOpen) return null;

  const selectedPkg = selectedIndex != null ? packages[selectedIndex] : null;
  const canBuy =
    selectedPkg != null &&
    !loadingPackages &&
    !loadingPrice &&
    !purchasing &&
    (selectedChainKey !== "solana" ||
      (!!resolveSolanaPaymentWallet(chains) &&
        !!getSolanaPurchaseAmounts(selectedPkg, chains, selectedToken) &&
        canSignSolanaTx));

  return (
    <>
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl flex max-h-[85vh] min-h-0 flex-col overflow-hidden">
          <div className="flex shrink-0 items-center justify-between border-b border-gray-200 bg-gray-100 p-6">
            <h4 className="text-lg font-bold text-gray-900">
              Balance: {bonusMessages == null && dailyMessagesRemaining == null
                ? "—"
                : ((bonusMessages ?? 0) + (dailyMessagesRemaining ?? 0)).toLocaleString()} Messages
            </h4>
            <button
              type="button"
              className="text-gray-500 hover:text-gray-700 transition-colors"
              onClick={onClose}
            >
              <X size={24} />
            </button>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
            <div className="space-y-6 p-6">
              {loadError && (
                <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2">
                  {loadError}
                </div>
              )}

              <div>
                <h3 className="font-bold text-gray-900 mb-4 text-xl">Buy Messages</h3>
                {loadingPackages ? (
                  <div className="flex justify-center py-8 text-gray-500">
                    <Loader2 className="animate-spin w-8 h-8" />
                  </div>
                ) : packages.length === 0 ? (
                  <p className="text-sm text-gray-500">No packages available.</p>
                ) : (
                  <div className="flex flex-col gap-3">
                    {packages.map((bundle, index) => {
                      const isLast = index === packages.length - 1;
                      const span =
                        isLast && packages.length % 2 === 1 ? "col-span-2" : "";
                      return (
                        <button
                          key={`${bundle.id}-${index}`}
                          type="button"
                          onClick={() => setSelectedIndex(index)}
                          className={`flex items-center justify-between px-3 py-2 rounded-xl transition-all ${span} ${selectedIndex === index
                            ? "bg-blue-600 text-white"
                            : "bg-gray-100 text-gray-900 hover:bg-gray-200"
                            }`}
                        >
                          <div className="flex items-center gap-2">
                            <SendHorizontal className="w-4 h-4" />
                            <span className="font-bold text-base">
                              {Number(bundle.messages).toLocaleString()}
                            </span>
                          </div>
                          <div
                            className={`px-3 py-1 rounded-lg font-bold text-sm min-w-17  ${selectedIndex === index
                              ? "bg-white/20 text-white"
                              : "bg-gray-200 text-gray-900"
                              }`}
                          >
                            {bundle.priceUSD != null
                              ? `$${Number(bundle.priceUSD).toFixed(2)}`
                              : "—"}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="space-y-4">
                <h3 className="font-bold text-gray-900 text-xl ">Payment Method</h3>
                <div className="flex items-start gap-4">
                  <div className="w-50 min-w-0 flex-1">
                    <label className="text-sm font-medium text-gray-700 mb-2 block">
                      Select Chain
                    </label>
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() =>
                          setIsChainDropdownOpen(!isChainDropdownOpen)
                        }
                        className="w-full flex items-center justify-between px-3 py-2 bg-white border border-gray-200 rounded-xl hover:border-blue-500 transition-all"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <img
                            src={getChainIcon(selectedChainKey)}
                            alt=""
                            className="w-5 h-5 shrink-0"
                          />
                          <span className="font-medium text-xs sm:text-base text-gray-900 truncate">
                            {getChainLabel(selectedChainKey)}
                          </span>
                        </div>
                        <ChevronDown
                          size={18}
                          className={`shrink-0 transition-transform ${isChainDropdownOpen ? "rotate-180" : ""}`}
                        />
                      </button>

                      {isChainDropdownOpen && (
                        <>
                          <div
                            className="fixed inset-0 z-10"
                            onClick={() => setIsChainDropdownOpen(false)}
                            aria-hidden
                          />
                          <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-xl shadow-xl z-20 overflow-hidden max-h-60 overflow-y-auto">
                            {chainKeys.map((key) => (
                              <button
                                key={key}
                                type="button"
                                onClick={() => {
                                  void (async () => {
                                    if (key === selectedChainKey) {
                                      setIsChainDropdownOpen(false);
                                      return;
                                    }
                                    const prev = selectedChainKey;
                                    setIsChainDropdownOpen(false);
                                    try {
                                      await syncGlobalNetworkForMessageChain(
                                        key,
                                      );
                                      setSelectedChainKey(key);
                                    } catch {
                                      setSelectedChainKey(prev);
                                    }
                                  })();
                                }}
                                className={`w-full flex items-center gap-3 text-left px-3 py-2 text-xs sm:text-base hover:bg-gray-50 transition-colors ${selectedChainKey === key
                                  ? "bg-blue-50 font-semibold text-blue-600"
                                  : "text-gray-700"
                                  }`}
                              >
                                <img
                                  src={getChainIcon(key)}
                                  alt=""
                                  className="w-5 h-5"
                                />
                                {getChainLabel(key)}
                              </button>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="w-50 min-w-0 flex-1">
                    <label className="text-sm font-medium text-gray-700 mb-2 block">
                      Select Token
                    </label>
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() =>
                          setIsTokenDropdownOpen(!isTokenDropdownOpen)
                        }
                        className="w-full flex items-center justify-between px-3 py-2 bg-white border border-gray-200 rounded-xl hover:border-blue-500 transition-all"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <img
                            src={tokenIcon(selectedToken)}
                            alt=""
                            className="w-5 h-5 shrink-0"
                          />
                          <span className="font-medium text-xs sm:text-base text-gray-900 truncate">
                            {selectedToken}
                          </span>
                        </div>
                        <ChevronDown
                          size={18}
                          className={`shrink-0 transition-transform ${isTokenDropdownOpen ? "rotate-180" : ""}`}
                        />
                      </button>

                      {isTokenDropdownOpen && (
                        <>
                          <div
                            className="fixed inset-0 z-10"
                            onClick={() => setIsTokenDropdownOpen(false)}
                            aria-hidden
                          />
                          <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-xl shadow-xl z-20 overflow-hidden max-h-60 overflow-y-auto">
                            {tokenOptions.map((t) => (
                              <button
                                key={`${t.type}-${t.symbol}`}
                                type="button"
                                onClick={() => {
                                  setSelectedToken(t.symbol);
                                  setIsTokenDropdownOpen(false);
                                }}
                                className={`w-full flex items-center gap-3 text-xs sm:text-base text-left px-3 py-2 hover:bg-gray-50 transition-colors ${selectedToken === t.symbol
                                  ? "bg-blue-50 font-semibold text-blue-600"
                                  : "text-gray-700"
                                  }`}
                              >
                                <img
                                  src={tokenIcon(t.symbol)}
                                  alt=""
                                  className="w-5 h-5"
                                />
                                {t.symbol}
                              </button>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {selectedPkg && (
                  <div className="text-sm text-gray-600 bg-gray-50 rounded-xl px-3 py-2 flex items-center justify-between gap-2">
                    <span>Price on this chain</span>
                    <span className="font-semibold text-gray-900 tabular-nums">
                      {loadingPrice ? (
                        <Loader2 className="inline w-4 h-4 animate-spin" />
                      ) : (
                        priceLabel
                      )}
                    </span>
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={handlePurchase}
                disabled={!canBuy}
                className={`w-full py-4 px-6 rounded-xl font-bold text-white transition-all flex items-center justify-center gap-2 ${!canBuy
                  ? "bg-gray-300 cursor-not-allowed"
                  : "bg-black hover:bg-black/80"
                  }`}
              >
                {purchasing ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Processing…
                  </>
                ) : (
                  "Buy"
                )}
              </button>

              <OutsideClickHandler onOutsideClick={() => setInfoOpen(null)}>
                <div className=" flex flex-col bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl px-3 py-2 border-2 border-indigo-200 text-sm hover:shadow-md transition-shadow flex justify-between gap-2">

                  <div className="flex items-center gap-2 justify-between">
                    <span className="font-semibold text-gray-900 shrink-0">
                      Daily messages
                    </span>
                    <div className="flex items-center gap-1.5 min-w-0 justify-end">
                      <span className="tabular-nums font-semibold text-gray-900">
                        {dailyMessagesRemaining ?? "—"}
                      </span>
                      <div className="relative shrink-0">
                        <button
                          type="button"
                          className="text-indigo-500 hover:text-indigo-700 p-0.5 rounded"
                          aria-label="About daily messages"
                          aria-expanded={infoOpen === "daily"}
                          onClick={() =>
                            setInfoOpen((v) => (v === "daily" ? null : "daily"))
                          }
                        >
                          <HelpCircle className="w-4 h-4" />
                        </button>
                        {infoOpen === "daily" && (
                          <div className="absolute right-0 -top-26 z-[60] mt-2 w-72 rounded-xl border border-gray-200 bg-white p-4 text-left text-sm text-gray-700 shadow-lg">
                            These messages reset daily
                            (starting from your first message in each period).
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 justify-between">
                    <span className="font-semibold text-gray-900 shrink-0">
                      Purchased messages
                    </span>
                    <div className="flex items-center gap-1.5 min-w-0 justify-end">
                      <span className="tabular-nums font-semibold text-gray-900">
                        {bonusMessages ?? "—"}
                      </span>
                      <div className="relative shrink-0">
                        <button
                          type="button"
                          className="text-indigo-500 hover:text-indigo-700 p-0.5 rounded"
                          aria-label="About purchased messages"
                          aria-expanded={infoOpen === "purchased"}
                          onClick={() =>
                            setInfoOpen((v) =>
                              v === "purchased" ? null : "purchased",
                            )
                          }
                        >
                          <HelpCircle className="w-4 h-4" />
                        </button>
                        {infoOpen === "purchased" && (
                          <div className="absolute right-0 -top-26 z-[60] mt-2 w-72 rounded-xl border border-gray-200 bg-white p-4 text-left text-sm text-gray-700 shadow-lg">
                            Purchased messages never expire. They are used before
                            your daily allowance.
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </OutsideClickHandler>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
