import { useCallback, useEffect, useMemo, useState } from "react";
import { ExternalLink, Loader2, X } from "lucide-react";
import { useExportWallet, useSendTransaction, useWallets } from "@privy-io/react-auth";
import { useSelector } from "react-redux";
import { getPublicClient } from "@wagmi/core";
import { erc20Abi, formatEther, formatUnits } from "viem";
import { toast } from "../utils/toast";
import {
  getWithdrawTokens,
} from "../config/withdrawTokens";
import { withdrawAndLog } from "../lib/withdrawAndLog";
import { getPrivyEmbedded } from "../utils/privyWalletUtils";
import { apiCall, getApiUrl } from "../utils/api";
import { wagmiClient } from "../wagmiConnectors";
import { CHAINS, chainIdFor, explorerLink, normalizeChain } from "../config/chains";

const PENDING_POLL_MS = 10000;

function shortAddress(value) {
  if (!value || value.length < 10) return value;
  return `${value.slice(0, 6)}...${value.slice(-4)}`;
}

export function PrivyWithdrawModal({
  open,
  onClose,
  onSwitchTab,
  embedded = false,
  showJourneyTabs = true,
}) {
  const { wallets } = useWallets();
  const { sendTransaction: privySendTransaction } = useSendTransaction();
  const { exportWallet } = useExportWallet();
  const reduxWalletAddress = useSelector((state) => state.wallet.address);
  const privyWallet = useMemo(() => getPrivyEmbedded(wallets), [wallets]);
  const balanceAddress = useMemo(
    () => privyWallet?.address || reduxWalletAddress || "",
    [privyWallet?.address, reduxWalletAddress],
  );
  const [tab, setTab] = useState("send");
  const [selectedChain, setSelectedChain] = useState("BSC");
  const chainTokens = useMemo(
    () => getWithdrawTokens(selectedChain),
    [selectedChain],
  );
  const [selectedTokenSymbol, setSelectedTokenSymbol] = useState(
    chainTokens[0]?.symbol || "BNB",
  );
  const selectedToken = useMemo(
    () => chainTokens.find((t) => t.symbol === selectedTokenSymbol) ?? chainTokens[0],
    [chainTokens, selectedTokenSymbol],
  );
  const [balances, setBalances] = useState({});
  const [nativePriceUsd, setNativePriceUsd] = useState(0);
  const [toAddress, setToAddress] = useState("");
  const [amount, setAmount] = useState("");
  const [confirmRecipient, setConfirmRecipient] = useState(false);
  const [isLoadingBalances, setIsLoadingBalances] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [history, setHistory] = useState([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [error, setError] = useState("");
  const [lastTxHash, setLastTxHash] = useState("");

  const amountUsd = useMemo(() => {
    const n = Number(amount || 0);
    if (!Number.isFinite(n) || n <= 0) return 0;
    return n * (selectedToken?.isNative ? nativePriceUsd : 1);
  }, [amount, selectedToken?.isNative, nativePriceUsd]);

  const nativeSymbol = CHAINS[normalizeChain(selectedChain)].nativeSymbol;
  const nativeToken = chainTokens.find((t) => t.symbol === nativeSymbol);
  const nativeBalance = Number(balances[nativeSymbol] || 0);
  const selectedBalance = Number(balances[selectedToken?.symbol] || 0);
  const minRequiredNativeGas = nativeToken?.minGasBuffer || 0;
  const hasEnoughGas = nativeBalance > minRequiredNativeGas;
  const requiresRecipientCheck = amountUsd > 500;

  const loadBalances = useCallback(async () => {
    if (!balanceAddress) {
      return;
    }
    setIsLoadingBalances(true);
    try {
      const chainId = chainIdFor(selectedChain);
      const publicClient = getPublicClient(wagmiClient, { chainId });
      if (!publicClient) throw new Error("RPC provider unavailable.");
      const nativeWei = await publicClient.getBalance({ address: balanceAddress });
      const mapped = await Promise.all(
        chainTokens.map(async (token) => {
          if (!token.address) {
            return [token.symbol, String(Number(formatEther(nativeWei)))];
          }
          const raw = await publicClient.readContract({
            address: token.address,
            abi: erc20Abi,
            functionName: "balanceOf",
            args: [balanceAddress],
          });
          return [token.symbol, String(Number(formatUnits(raw, token.decimals)))];
        }),
      );
      setBalances(Object.fromEntries(mapped));
    } catch (e) {
      console.error(e);
      toast.error("Failed to load withdrawable balances.");
    } finally {
      setIsLoadingBalances(false);
    }
  }, [balanceAddress, chainTokens, selectedChain]);

  const loadNativePrice = useCallback(async () => {
    try {
      const symbol = CHAINS[normalizeChain(selectedChain)].nativeSymbol;
      const res = await fetch(`${getApiUrl()}/tokens/${symbol}/chart?timeframe=1h`);
      const data = await res.json();
      setNativePriceUsd(Number(data?.currentPrice || 0));
    } catch {
      setNativePriceUsd(0);
    }
  }, [selectedChain]);

  const loadHistory = useCallback(async () => {
    setIsLoadingHistory(true);
    try {
      const data = await apiCall("/withdraw/history?limit=50");
      setHistory(Array.isArray(data?.withdrawals) ? data.withdrawals : []);
    } catch (e) {
      console.error(e);
      toast.error("Failed to load withdrawal history.");
    } finally {
      setIsLoadingHistory(false);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    setError("");
    setTab("send");
    setAmount("");
    setToAddress("");
    setConfirmRecipient(false);
    setSelectedChain("BSC");
    setSelectedTokenSymbol(getWithdrawTokens("BSC")[0]?.symbol || "BNB");
    loadHistory();
  }, [open, loadHistory]);

  useEffect(() => {
    if (!open) return;
    loadBalances();
    loadNativePrice();
  }, [open, privyWallet?.address, balanceAddress, selectedChain, loadBalances, loadNativePrice]);

  useEffect(() => {
    setSelectedTokenSymbol((prev) => {
      const exists = chainTokens.some((token) => token.symbol === prev);
      return exists ? prev : chainTokens[0]?.symbol || prev;
    });
  }, [chainTokens]);

  useEffect(() => {
    if (!open) return undefined;
    const pending = history.filter((item) => item?.status === "PENDING");
    if (pending.length === 0) return undefined;

    const id = setInterval(async () => {
      try {
        const updates = await Promise.all(
          pending.map(async (row) => {
            try {
              const data = await apiCall(`/withdraw/${row.txHash}`);
              return data?.withdrawal ?? row;
            } catch {
              return row;
            }
          }),
        );
        setHistory((prev) =>
          prev.map((item) => updates.find((u) => u?.txHash === item.txHash) ?? item),
        );
      } catch (e) {
        console.warn("withdraw history poll failed", e);
      }
    }, PENDING_POLL_MS);

    return () => clearInterval(id);
  }, [open, history]);

  const handleExportPrivateKey = async () => {
    try {
      await exportWallet({ address: privyWallet?.address });
    } catch (e) {
      const message = String(e?.message || "");
      if (e?.code === 4001 || /reject/i.test(message)) {
        toast.error("Export cancelled.");
        return;
      }
      toast.error(message || "Could not open export flow.");
    }
  };

  const handleMax = () => {
    const max = Math.max(0, selectedBalance - (selectedToken?.minGasBuffer || 0));
    setAmount(max.toString());
  };

  const validate = () => {
    setError("");
    if (!/^0x[a-fA-F0-9]{40}$/.test(toAddress)) {
      setError("Invalid recipient address");
      return false;
    }
    const amountNum = Number(amount);
    if (!amountNum || amountNum <= 0) {
      setError("Enter a valid amount");
      return false;
    }
    if (!hasEnoughGas) {
      setError(`You need some ${nativeSymbol} for gas fees`);
      return false;
    }
    const maxAllowed = selectedBalance - (selectedToken?.minGasBuffer || 0);
    if (amountNum > maxAllowed) {
      setError("Insufficient balance for this withdrawal");
      return false;
    }
    if (requiresRecipientCheck && !confirmRecipient) {
      setError("Confirm the recipient address checkbox to continue");
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!privyWallet) {
      setError("Privy wallet not connected");
      return;
    }
    if (!validate()) return;
    setIsSubmitting(true);
    try {
      const { txHash } = await withdrawAndLog({
        sendTransaction: privySendTransaction,
        walletAddress: privyWallet?.address,
        chain: selectedChain,
        token: selectedToken,
        toAddress,
        amount,
        priceUsd: selectedToken?.isNative ? nativePriceUsd : 1,
      });
      setLastTxHash(txHash);
      toast.success("Withdrawal sent.");
      setAmount("");
      setToAddress("");
      setTimeout(() => {
        loadBalances();
        loadHistory();
      }, 4000);
    } catch (e) {
      const message = String(e?.message || "");
      if (e?.code === 4001 || /reject/i.test(message)) {
        setError("Transaction cancelled");
      } else {
        setError(message || "Transaction failed");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!open && !embedded) return null;

  const content = (
    <div className={embedded ? "px-1 py-1 space-y-4" : "px-5 py-4 space-y-4"}>
      {showJourneyTabs && (
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onSwitchTab?.("add")}
            className="px-3 py-1.5 rounded-full text-sm bg-gray-100 text-gray-700 hover:bg-gray-200"
          >
            Add funds
          </button>
          <button
            type="button"
            className="px-3 py-1.5 rounded-full text-sm bg-black text-white"
          >
            Withdraw funds
          </button>
        </div>
      )}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setTab("send")}
          className={`px-3 py-1.5 rounded-full text-sm ${tab === "send" ? "bg-black text-white" : "bg-gray-100 text-gray-700"}`}
        >
          Send
        </button>
        <button
          type="button"
          onClick={() => setTab("history")}
          className={`px-3 py-1.5 rounded-full text-sm ${tab === "history" ? "bg-black text-white" : "bg-gray-100 text-gray-700"}`}
        >
          History
        </button>
        <div className="ml-auto">
          <button
            type="button"
            onClick={handleExportPrivateKey}
            className="text-xs font-semibold px-3 py-2 rounded-full bg-amber-100 text-amber-900 hover:bg-amber-200"
          >
            Export private key
          </button>
        </div>
      </div>

      {tab === "send" ? (
        <>
          <div className="text-sm text-gray-600 bg-gray-50 rounded-xl p-3 border border-gray-100">
            Withdrawable tokens: <strong>BNB, USDT, USDC</strong> on BSC and{" "}
            <strong>ETH, USDC</strong> on Base. Other assets must be sold first.
          </div>
          <div className="grid grid-cols-2 gap-2">
            {["BSC", "BASE"].map((chain) => (
              <button
                key={chain}
                type="button"
                onClick={() => {
                  setSelectedChain(chain);
                  setAmount("");
                }}
                className={`rounded-xl border px-3 py-2 text-sm font-semibold ${
                  selectedChain === chain
                    ? "border-black bg-black text-white"
                    : "border-gray-200 hover:bg-gray-50"
                }`}
              >
                {CHAINS[chain].label}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-3 gap-2">
            {chainTokens.map((token) => (
              <button
                key={token.symbol}
                type="button"
                onClick={() => {
                  setSelectedTokenSymbol(token.symbol);
                  setAmount("");
                }}
                className={`rounded-xl border px-3 py-2 text-left ${selectedToken.symbol === token.symbol ? "border-black bg-black text-white" : "border-gray-200 hover:bg-gray-50"}`}
              >
                <div className="flex items-center gap-2">
                  <img src={token.logo} alt="" className="h-5 w-5" />
                  <span className="text-sm font-semibold">{token.symbol}</span>
                </div>
                <div className="text-xs mt-1 tabular-nums opacity-80">
                  {Number(balances[token.symbol] || 0).toFixed(4)}
                </div>
              </button>
            ))}
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1.5">
              Recipient address ({CHAINS[normalizeChain(selectedChain)].shortLabel})
            </label>
            <input
              value={toAddress}
              onChange={(e) => setToAddress(e.target.value.trim())}
              placeholder="0x..."
              disabled={isSubmitting}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-gray-400"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1.5">Amount</label>
            <div className="flex gap-2">
              <input
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.0"
                disabled={isSubmitting}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-gray-400"
              />
              <button
                type="button"
                onClick={handleMax}
                disabled={isSubmitting}
                className="px-3 rounded-xl border border-gray-200 text-sm font-semibold hover:bg-gray-50"
              >
                Max
              </button>
            </div>
            <div className="text-xs text-gray-500 mt-1">
              Balance: {selectedBalance.toFixed(6)} {selectedToken.symbol}
              {(selectedToken?.minGasBuffer || 0) > 0
                ? ` · Keep ${selectedToken.minGasBuffer} ${selectedToken.symbol} for gas`
                : ""}
            </div>
          </div>
          {!!amountUsd && (
            <div className="text-sm text-gray-700">Estimated value: ${amountUsd.toFixed(2)}</div>
          )}
          {requiresRecipientCheck && (
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={confirmRecipient}
                onChange={(e) => setConfirmRecipient(e.target.checked)}
              />
              I confirm the recipient address
            </label>
          )}
          {!hasEnoughGas && (
            <div className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
              Not enough {nativeSymbol} for gas (need more than {minRequiredNativeGas} {nativeSymbol}).
            </div>
          )}
          {error && <div className="text-sm text-red-600">{error}</div>}
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting || isLoadingBalances || !toAddress || !amount || !hasEnoughGas}
            className="w-full py-3 rounded-xl text-sm font-semibold bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Confirm in wallet...
              </>
            ) : (
              `Withdraw ${selectedToken.symbol}`
            )}
          </button>
        </>
      ) : (
        <div className="space-y-2">
          <div className="h-72 overflow-y-auto rounded-xl border border-gray-200 p-2">
            {isLoadingHistory ? (
              <div className="h-full flex items-center justify-center text-sm text-gray-500">
                Loading history...
              </div>
            ) : history.length === 0 ? (
              <div className="h-full flex items-center justify-center text-sm text-gray-500">
                No withdrawal history
              </div>
            ) : (
              <div className="space-y-2">
                {history.map((item) => (
                  <div
                    key={item.txHash}
                    className="border border-gray-200 rounded-xl p-3 flex items-start justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <div className="text-sm font-semibold">
                        {Number(item.amount || 0).toFixed(4)} {item?.token?.symbol || "TOKEN"}
                      </div>
                      <div className="text-xs text-gray-500 mt-0.5 font-mono">
                        to {shortAddress(item.toAddress)}
                      </div>
                      <div className="text-xs text-gray-500 mt-0.5">
                        {item.createdAt ? new Date(item.createdAt).toLocaleString() : ""}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div
                        className={`text-xs font-semibold ${item.status === "CONFIRMED" ? "text-emerald-600" : item.status === "FAILED" ? "text-red-600" : "text-amber-600"}`}
                      >
                        {item.status}
                      </div>
                      <a
                        href={explorerLink(item.chain || selectedChain, item.txHash)}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline mt-1"
                      >
                        View <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          {lastTxHash && (
            <div className="text-xs text-gray-500 pt-2">
              Latest tx:{" "}
              <a
                href={explorerLink(selectedChain, lastTxHash)}
                target="_blank"
                rel="noreferrer"
                className="text-blue-600 hover:underline"
              >
                {shortAddress(lastTxHash)}
              </a>
            </div>
          )}
        </div>
      )}
    </div>
  );

  if (embedded) return content;

  return (
    <div
      className="fixed inset-0 z-[310] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      onClick={() => !isSubmitting && onClose()}
    >
      <div
        className="bg-white rounded-2xl shadow-xl max-w-xl w-full max-h-[100dvh] overflow-y-auto border border-gray-200/80"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">Withdraw & export</h2>
          <button
            type="button"
            className="p-2 rounded-full hover:bg-gray-100 text-gray-600"
            onClick={onClose}
          >
            <X size={20} />
          </button>
        </div>

        {content}
      </div>
    </div>
  );
}
