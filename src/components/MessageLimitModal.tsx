import { useCallback, useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { X, SendHorizontal, ChevronDown, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { formatUnits } from "viem";
import { useAccount, useSwitchChain, useWriteContract } from "wagmi";
import { useAuth } from "../hooks/useAuth";
import { fetchChatStatus as fetchChatStatusApi } from "../utils/chatStatusFetch";
import {
  fetchMessagePackages,
  findErc20PriceForToken,
  formatEvmPriceLabel,
  getChainIcon,
  getChainLabel,
  getSolanaPurchaseAmounts,
  listChainKeysFromPayload,
  postMessagePurchase,
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
};

function tokenIcon(symbol: string): string {
  const s = symbol.toUpperCase();
  if (TOKEN_ICONS[s]) return TOKEN_ICONS[s];
  if (s === "NATIVE") return TOKEN_ICONS.ETH;
  return TOKEN_ICONS.USDT;
}

interface MessageLimitModalProps {
  isOpen: boolean;
  onClose: () => void;
  messagesRemaining: number | null;
  onPurchaseSuccess?: () => void;
}

export function MessageLimitModal({
  isOpen,
  onClose,
  messagesRemaining,
  onPurchaseSuccess,
}: MessageLimitModalProps) {
  const dispatch = useDispatch();
  const { setUser } = useAuth();
  const walletType = useSelector((state: { wallet?: { walletType?: string } }) => state.wallet?.walletType);
  const solanaAddress = useSelector((state: { wallet?: { address?: string } }) => state.wallet?.address);
  const reduxChainId = useSelector((state: { wallet?: { chainId?: number } }) => state.wallet?.chainId);

  const { address: evmAddress, chainId: wagmiChainId } = useAccount();
  const { writeContractAsync } = useWriteContract();
  const { switchChainAsync } = useSwitchChain();

  const [packages, setPackages] = useState<MessagePackage[]>([]);
  const [chains, setChains] = useState<MessagesChains | undefined>();
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loadingPackages, setLoadingPackages] = useState(false);

  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [selectedChainKey, setSelectedChainKey] = useState<MessageChainKey>("bnb");
  const [selectedToken, setSelectedToken] = useState("USDT");
  const [isChainDropdownOpen, setIsChainDropdownOpen] = useState(false);
  const [isTokenDropdownOpen, setIsTokenDropdownOpen] = useState(false);

  const [priceLabel, setPriceLabel] = useState<string>("—");
  const [loadingPrice, setLoadingPrice] = useState(false);
  const [purchasing, setPurchasing] = useState(false);

  const isSolanaWallet = walletType === "solana";
  const evmChainId = wagmiChainId ?? reduxChainId ?? null;

  const chainKeys = useMemo(() => {
    const raw = listChainKeysFromPayload(chains);
    if (isSolanaWallet) return raw.filter((k) => k === "solana");
    return raw.filter((k) => k !== "solana");
  }, [chains, isSolanaWallet]);

  const tokenOptions = useMemo(
    () => tokenOptionsForChain(selectedChainKey, chains),
    [selectedChainKey, chains],
  );

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    setLoadingPackages(true);
    setLoadError(null);
    fetchMessagePackages()
      .then((data) => {
        if (cancelled) return;
        const list = Array.isArray(data?.packages) ? data.packages : [];
        setPackages(list);
        setChains(data?.chains);
        const keys = listChainKeysFromPayload(data?.chains);
        const keysEffective = isSolanaWallet
          ? keys.filter((k) => k === "solana")
          : keys.filter((k) => k !== "solana");
        const first = keysEffective[0] ?? (isSolanaWallet ? "solana" : "bnb");
        setSelectedChainKey(first);
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
  }, [isOpen, isSolanaWallet]);

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
            erc20:
              match != null
                ? { amount: match.amount, decimals }
                : null,
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
  }, [isOpen, selectedChainKey, selectedIndex, selectedToken, packages, chains, tokenOptions]);

  useEffect(() => {
    if (!isOpen || selectedChainKey !== "solana") return;
    const pkg = selectedIndex != null ? packages[selectedIndex] : null;
    if (!pkg) {
      setPriceLabel("—");
      return;
    }
    const plan = getSolanaPurchaseAmounts(pkg, chains, selectedToken);
    if (!plan) {
      setPriceLabel("—");
      return;
    }
    if (plan.kind === "native") {
      setPriceLabel(`${formatUnits(plan.lamports, 9)} SOL`);
    } else {
      const dec =
        selectedToken === "USDC" || selectedToken === "USDT" ? 6 : 9;
      setPriceLabel(
        `${formatUnits(plan.amount, dec)} ${selectedToken}`,
      );
    }
  }, [isOpen, selectedChainKey, selectedIndex, selectedToken, packages, chains]);

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

    setPurchasing(true);
    try {
      if (selectedChainKey === "solana") {
        if (!isSolanaWallet || !solanaAddress) {
          toast.error("Connect a Solana wallet (e.g. Phantom) to pay on Solana.");
          return;
        }
        if (!resolveSolanaPaymentWallet(chains)) {
          toast.error("Solana payment address is not configured.");
          return;
        }
        if (!getSolanaPurchaseAmounts(pkg, chains, selectedToken)) {
          toast.error("Missing Solana pricing for this package. Check back later.");
          return;
        }
        const { txHash } = await purchaseSolanaPackage({
          pkg,
          chains,
          tokenSymbol: selectedToken,
          fromPubkey: solanaAddress,
        });
        await postMessagePurchase({
          txHash,
          chain: "solana",
          packageId: pkg.id,
          token: selectedToken,
        });
        await fetchChatStatusApi(dispatch, { setUser });
        toast.success("Purchase submitted");
        onPurchaseSuccess?.();
        onClose();
        return;
      }

      if (isSolanaWallet) {
        toast.error("Use an EVM wallet for this network.");
        return;
      }
      if (!evmAddress) {
        toast.error("Connect your wallet first.");
        return;
      }

      const chainKey = selectedChainKey as Exclude<MessageChainKey, "solana">;
      const { txHash } = await purchaseEvmPackage({
        chainKey,
        packageId: pkg.id,
        chains,
        tokenSymbol: selectedToken,
        tokenType: tok.type === "native" ? "native" : "erc20",
        writeContractAsync: writeContractAsync as (p: Record<string, unknown>) => Promise<`0x${string}`>,
        switchChainAsync,
        currentChainId: evmChainId,
      });

      const tokenForApi =
        tok.type === "native" ? tok.type : selectedToken;

      await postMessagePurchase({
        txHash,
        chain: chainKey,
        packageId: pkg.id,
        token: tokenForApi,
      });
      await fetchChatStatusApi(dispatch, { setUser });
      toast.success("Purchase confirmed");
      onPurchaseSuccess?.();
      onClose();
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
    solanaAddress,
    evmAddress,
    evmChainId,
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
        !!getSolanaPurchaseAmounts(selectedPkg, chains, selectedToken)));

  return (
    <>
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl h-fit ">
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <h3 className="text-2xl font-bold text-gray-900">Messages</h3>
            <button
              type="button"
              className="text-gray-500 hover:text-gray-700 transition-colors"
              onClick={onClose}
            >
              <X size={24} />
            </button>
          </div>
          <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl p-3 mx-6 mt-2 border-2 border-indigo-200 text-sm hover:shadow-md transition-shadow">
            <span className="w-full">
              <b>Daily limit:</b> You have {messagesRemaining ?? "—"} messages
              remaining today. The limit resets every 24 hours.
            </span>
          </div>

          <div className="p-6 space-y-6">
            {loadError && (
              <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2">
                {loadError}
              </div>
            )}

            <div>
              <h4 className="font-bold text-gray-900 mb-4">Message packages</h4>
              {loadingPackages ? (
                <div className="flex justify-center py-8 text-gray-500">
                  <Loader2 className="animate-spin w-8 h-8" />
                </div>
              ) : packages.length === 0 ? (
                <p className="text-sm text-gray-500">No packages available.</p>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {packages.map((bundle, index) => {
                    const isLast = index === packages.length - 1;
                    const span =
                      isLast && packages.length % 2 === 1 ? "col-span-2" : "";
                    return (
                      <button
                        key={`${bundle.id}-${index}`}
                        type="button"
                        onClick={() => setSelectedIndex(index)}
                        className={`flex items-center justify-between p-3 rounded-xl transition-all ${span} ${selectedIndex === index
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
                          className={`px-3 py-1 rounded-lg font-bold text-sm ${selectedIndex === index
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
              <h4 className="font-bold text-gray-900">Payment Method</h4>
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
                      className="w-full flex items-center justify-between px-4 py-3 bg-white border border-gray-200 rounded-xl hover:border-blue-500 transition-all"
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
                                setSelectedChainKey(key);
                                setIsChainDropdownOpen(false);
                              }}
                              className={`w-full flex items-center gap-3 text-left px-4 py-3 text-xs sm:text-base hover:bg-gray-50 transition-colors ${selectedChainKey === key
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
                      className="w-full flex items-center justify-between px-4 py-3 bg-white border border-gray-200 rounded-xl hover:border-blue-500 transition-all"
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
                              className={`w-full flex items-center gap-3 text-xs sm:text-base text-left px-4 py-3 hover:bg-gray-50 transition-colors ${selectedToken === t.symbol
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
          </div>
        </div>
      </div>
    </>
  );
}
