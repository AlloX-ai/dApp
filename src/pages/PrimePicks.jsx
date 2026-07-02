import { useState, useEffect, useCallback, useRef } from "react";
import {
  X,
  TrendingUp,
  ChevronRight,
  ArrowLeft,
  Loader2,
  CheckCircle2,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router";
import { useAccount, useSwitchChain } from "wagmi";
import {
  useWallets,
  getEmbeddedConnectedWallet,
  useSendTransaction,
} from "@privy-io/react-auth";
import { setWalletModal } from "../redux/slices/walletSlice";
import { useAuth } from "../hooks/useAuth";
import { toast } from "../utils/toast";
import { CHAINS, chainIdFor, normalizeChain } from "../config/chains";
import {
  executePortfolioOnChain,
  createPrivyExecutionTxEnv,
} from "../utils/execution";
import {
  BUNDLE_CHAIN,
  BUNDLE_DEFAULT_SLIPPAGE,
  BUNDLE_MIN_AMOUNT_USD,
  BUNDLE_SOURCE_TOKENS,
  buildBundleExecutionFromQuote,
  buildBundleQuotePayload,
  fetchBundleQuote,
  fetchBundles,
  formatBundlePercent,
  formatBundleReceiveAmount,
  formatYtdPercent,
  mapBundleQuoteDetailsBySymbol,
  parseBundleQuoteSummary,
} from "../utils/bundles";
import {
  parseCustomAmountUsd,
  isDecimalAmountInput,
} from "../utils/customAmountInput";

const PRESET_AMOUNTS = [20, 50, 100, 500];

const ytdColorClass = (value) => {
  if (value == null) return "text-gray-500";
  if (value > 0) return "text-green-600";
  if (value < 0) return "text-red-600";
  return "text-gray-600";
};

function BundlePositionAvatar({ position, size = "md" }) {
  const dim = size === "sm" ? "w-5 h-5" : "w-8 h-8";
  const label = position.displaySymbol || position.symbol;

  if (position.logo) {
    return (
      <img
        src={position.logo}
        alt={label}
        className={`${dim} rounded-full object-cover shrink-0`}
      />
    );
  }

  return (
    <div
      className={`${dim} rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold shrink-0`}
    >
      {label.slice(0, 2)}
    </div>
  );
}

const getPositionExecutionUi = ({
  position,
  tokenStatuses,
  currentSymbol,
  isExecuting,
  isQuoting,
}) => {
  const symKey = String(position.symbol || "").toUpperCase();
  const displayKey = String(
    position.displaySymbol || position.symbol || "",
  ).toUpperCase();
  const current = String(currentSymbol || "").toUpperCase();
  const status = tokenStatuses?.[symKey] ?? tokenStatuses?.[displayKey];
  const isRunning = isExecuting || isQuoting;
  const hasTrackedExecution =
    isRunning || Object.keys(tokenStatuses || {}).length > 0;

  if (!hasTrackedExecution) return null;

  const isProcessing =
    isRunning &&
    (status === "processing" || current === symKey || current === displayKey);

  if (isQuoting && !status) {
    return {
      rowClass: "bg-white/80 border border-gray-200/80",
      badgeClass:
        "inline-flex items-center gap-1.5 text-[11px] font-semibold text-gray-500 bg-gray-50 border border-gray-200 px-2 py-0.5 rounded-full",
      label: "Queued",
      icon: null,
    };
  }

  if (isProcessing) {
    return {
      rowClass: "bg-blue-50/90 border border-blue-200/80",
      badgeClass:
        "inline-flex items-center gap-1.5 text-[11px] font-semibold text-blue-700 bg-blue-100 border border-blue-200 px-2 py-0.5 rounded-full",
      label: "Processing",
      icon: <Loader2 className="w-3 h-3 animate-spin shrink-0" />,
    };
  }

  if (status === "success") {
    return {
      rowClass: "bg-green-50/90 border border-green-200/80",
      badgeClass:
        "inline-flex items-center gap-1.5 text-[11px] font-semibold text-green-700 bg-green-100 border border-green-200 px-2 py-0.5 rounded-full",
      label: "Confirmed",
      icon: <CheckCircle2 className="w-3 h-3 shrink-0" />,
    };
  }

  if (status === "skipped") {
    return {
      rowClass: "bg-red-50/90 border border-red-200/80",
      badgeClass:
        "inline-flex items-center gap-1.5 text-[11px] font-semibold text-red-700 bg-red-100 border border-red-200 px-2 py-0.5 rounded-full",
      label: "Skipped",
      icon: <X className="w-3 h-3 shrink-0" />,
    };
  }

  if (isRunning) {
    return {
      rowClass: "bg-white/80 border border-gray-200/80",
      badgeClass:
        "inline-flex items-center gap-1.5 text-[11px] font-semibold text-gray-500 bg-gray-50 border border-gray-200 px-2 py-0.5 rounded-full",
      label: "Pending",
      icon: null,
    };
  }

  return null;
};

function BundleAllocationPreview({
  positions,
  amount,
  sourceToken = "USDT",
  tokenStatuses,
  currentSymbol,
  isExecuting = false,
  isQuoting = false,
  quoteBySymbol = null,
  quoteSummary = null,
  isLoadingQuote = false,
  slippagePercent = BUNDLE_DEFAULT_SLIPPAGE,
}) {
  const showStatuses =
    isExecuting || isQuoting || Object.keys(tokenStatuses || {}).length > 0;
  const showQuoteDetails =
    !showStatuses &&
    quoteBySymbol != null &&
    (isLoadingQuote || Object.keys(quoteBySymbol).length > 0);

  return (
    <div className="mt-4 p-4 bg-gray-50 rounded-xl space-y-2">
      <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide mb-3">
        Allocation Preview
      </p>
      {showQuoteDetails && !isLoadingQuote && quoteSummary?.hasFailures && (
        <div
          className={`rounded-lg px-3 py-2.5 text-xs mb-2 ${
            quoteSummary.allFailed
              ? "bg-red-50 border border-red-200 text-red-800"
              : "bg-amber-50 border border-amber-200 text-amber-900"
          }`}
        >
          {quoteSummary.allFailed ? (
            <>
              <p className="font-semibold">No swap routes available</p>
              <p className="mt-1 leading-relaxed">
                None of the tokens in this bundle can be purchased with{" "}
                {sourceToken}. Try another payment token or amount.
              </p>
            </>
          ) : (
            <>
              <p className="font-semibold">
                {quoteSummary.failed} of {quoteSummary.totalPositions} tokens
                could not be quoted
              </p>
              {quoteSummary.redistributed &&
              quoteSummary.quotedSuccessfully > 0 ? (
                <p className="mt-1 leading-relaxed">
                  Their allocation will be redistributed across the remaining{" "}
                  {quoteSummary.quotedSuccessfully} token
                  {quoteSummary.quotedSuccessfully === 1 ? "" : "s"}.
                </p>
              ) : null}
            </>
          )}
        </div>
      )}
      {showQuoteDetails && (
        <div className="flex items-center justify-between gap-3 px-2 pb-1 text-[10px] font-semibold uppercase tracking-wide text-gray-400">
          <span>Token</span>
          <div className="flex items-center gap-3 shrink-0">
            <span className="w-14 text-right">Impact</span>
            <span className="w-14 text-right">Slippage</span>
            <span className="w-16 text-right">Amount</span>
          </div>
        </div>
      )}
      {positions.map((position) => {
        const symKey = String(position.symbol || "").toUpperCase();
        const displayKey = String(
          position.displaySymbol || position.symbol || "",
        ).toUpperCase();
        const quoteDetail =
          quoteBySymbol?.[symKey] ?? quoteBySymbol?.[displayKey] ?? null;
        const isFailed = quoteDetail?.failed === true;
        const impactNum = Number(quoteDetail?.priceImpact);
        const isHighImpact = Number.isFinite(impactNum) && impactNum >= 5;
        const executionUi = showStatuses
          ? getPositionExecutionUi({
              position,
              tokenStatuses,
              currentSymbol,
              isExecuting,
              isQuoting,
            })
          : null;
        const allocationUsd =
          quoteDetail?.allocationUsd ??
          (position.weightPct != null
            ? (amount * position.weightPct) / 100
            : null);

        return (
          <div
            key={position.id || position.symbol}
            className={`flex items-start justify-between gap-3 text-sm rounded-lg px-2 py-1.5 transition-colors ${
              executionUi?.rowClass ||
              (isFailed ? "bg-red-50/80 border border-red-200/80" : "")
            }`}
          >
            <div className="flex items-start gap-2 min-w-0 flex-1">
              <BundlePositionAvatar position={position} size="sm" />
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium">
                    {position.displaySymbol || position.symbol}
                  </span>
                  <span className="text-gray-400">
                    {position.weightPct != null
                      ? `${position.weightPct}%`
                      : "—"}
                  </span>
                </div>
                {showQuoteDetails && !showStatuses && (
                  <div className="mt-0.5 text-[11px] leading-relaxed">
                    {isLoadingQuote ? (
                      <span className="inline-flex items-center gap-1 text-gray-500">
                        <Loader2 className="w-3 h-3 animate-spin shrink-0" />
                        Fetching quote...
                      </span>
                    ) : isFailed ? (
                      <span className="text-red-700">
                        {quoteDetail?.reason || "No route available"}
                      </span>
                    ) : quoteDetail?.quoteError ? (
                      <span className="text-amber-700">
                        {quoteDetail.quoteError}
                      </span>
                    ) : // : quoteDetail?.route ? (
                    //   <span className="text-gray-500 truncate">
                    //     {quoteDetail.route}
                    //   </span>
                    // )
                    !quoteDetail ? (
                      <span className="text-gray-400">Quote pending...</span>
                    ) : null}
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {showQuoteDetails ? (
                <div className="flex items-center gap-3 text-xs tabular-nums">
                  <span
                    className={`w-14 text-right font-medium ${
                      isHighImpact ? "text-amber-700" : "text-gray-700"
                    }`}
                  >
                    {isLoadingQuote || isFailed || quoteDetail?.quoteError
                      ? "—"
                      : formatBundlePercent(quoteDetail?.priceImpact)}
                  </span>
                  <span className="w-14 text-right font-medium text-gray-700">
                    {isLoadingQuote ? "—" : `${slippagePercent}%`}
                  </span>
                  <span className="w-16 text-right font-bold text-gray-900">
                    {allocationUsd != null
                      ? `$${Number(allocationUsd).toFixed(2)}`
                      : "—"}
                  </span>
                </div>
              ) : (
                <span className="font-bold tabular-nums">
                  {allocationUsd != null
                    ? `$${Number(allocationUsd).toFixed(2)}`
                    : "—"}
                </span>
              )}
              {showQuoteDetails && isFailed && !executionUi && (
                <span className="inline-flex items-center text-[11px] font-semibold text-red-700 bg-red-100 border border-red-200 px-2 py-0.5 rounded-full shrink-0">
                  Failed
                </span>
              )}
              {executionUi && (
                <span className={executionUi.badgeClass}>
                  {executionUi.icon}
                  {executionUi.label}
                </span>
              )}
            </div>
          </div>
        );
      })}
      {showQuoteDetails && !showStatuses && !isLoadingQuote && (
        <div className="px-2 pt-1 text-[11px] text-gray-500 space-y-1">
          {positions.map((position) => {
            const symKey = String(position.symbol || "").toUpperCase();
            const displayKey = String(
              position.displaySymbol || position.symbol || "",
            ).toUpperCase();
            const quoteDetail =
              quoteBySymbol?.[symKey] ?? quoteBySymbol?.[displayKey] ?? null;
            if (
              quoteDetail?.failed ||
              !quoteDetail?.toTokenAmount ||
              quoteDetail?.quoteError
            ) {
              return null;
            }

            return (
              <div
                key={`receive-${position.id || position.symbol}`}
                className="flex items-center justify-between gap-3"
              >
                <span>
                  You&apos;ll receive{" "}
                  <span className="font-medium text-gray-700">
                    {position.displaySymbol || position.symbol}
                  </span>
                </span>
                <span className="font-medium text-gray-800 tabular-nums">
                  {formatBundleReceiveAmount(quoteDetail.toTokenAmount)}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function BundleInvestmentReadonly({ amount, sourceToken }) {
  const isPreset = PRESET_AMOUNTS.includes(amount);

  return (
    <>
      <div className="grid grid-cols-2 gap-3 mb-4">
        {PRESET_AMOUNTS.map((preset) => (
          <div
            key={preset}
            className={`px-4 py-2.5 rounded-xl border text-sm font-semibold text-center ${
              amount === preset
                ? "bg-gray-900 text-white border border-gray-900 shadow-sm"
                : "bg-white/50 border border-gray-200 text-gray-400"
            }`}
          >
            ${preset}
          </div>
        ))}
      </div>

      <div
        className={`w-full px-4 py-2.5 rounded-xl border text-sm font-semibold text-center mb-2 ${
          !isPreset
            ? "bg-gray-900 text-white border border-gray-900 shadow-sm"
            : "bg-white/50 border border-gray-200 text-gray-400"
        }`}
      >
        Custom Amount
      </div>

      <div className="relative mt-3 mb-4">
        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">
          $
        </span>
        <input
          type="number"
          disabled
          placeholder="Enter amount"
          className="w-full px-4 ps-8 py-3 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 bg-white/50"
        />
      </div>

      <div className="mb-4">
        <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide mb-2">
          Pay with
        </p>
        <div className="flex flex-wrap gap-2">
          {BUNDLE_SOURCE_TOKENS.map((symbol) => (
            <div
              key={symbol}
              className={`px-4 py-2 rounded-xl border-2 text-sm font-semibold ${
                sourceToken === symbol
                  ? "border-black bg-black text-white"
                  : "border-gray-200 bg-white/40 text-gray-400"
              }`}
            >
              {symbol}
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

function BundlePositionRow({
  position,
  trailing,
  compact = false,
  muted = false,
}) {
  const label = position.displaySymbol || position.symbol;

  return (
    <div
      className={`flex items-center justify-between gap-3 ${muted ? "opacity-60" : ""}`}
    >
      <div className="flex items-center gap-2 min-w-0">
        <BundlePositionAvatar
          position={position}
          size={compact ? "sm" : "md"}
        />
        <div className="min-w-0">
          <div className="font-medium text-sm truncate">{label}</div>
          {!compact && position.name && position.name !== label && (
            <div className="text-xs text-gray-600 truncate">
              {position.name}
            </div>
          )}
          {position.missing && (
            <div className="text-xs text-amber-700">Price unavailable</div>
          )}
        </div>
      </div>
      {trailing}
    </div>
  );
}

export function PrimePicks() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isConnected = useSelector((state) => state.wallet.isConnected);
  const walletChainId = useSelector((state) => state.wallet.chainId);
  const walletType = useSelector((state) => state.wallet.walletType);
  const sessionSource = useSelector((state) => state.wallet.sessionSource);
  const { user: authUser, ensureAuthenticated, logout } = useAuth();
  const { wallets } = useWallets();
  const { sendTransaction: privySendTransaction } = useSendTransaction();
  const { connector } = useAccount();
  const { switchChainAsync } = useSwitchChain();

  const [selectedBundle, setSelectedBundle] = useState(null);
  const [step, setStep] = useState("detail");
  const [selectedAmount, setSelectedAmount] = useState(null);
  const [customAmount, setCustomAmount] = useState("");
  const [isCustom, setIsCustom] = useState(false);
  const [sourceToken, setSourceToken] = useState("USDT");
  const [actionError, setActionError] = useState("");
  const [isQuoting, setIsQuoting] = useState(false);
  const [portfolioId, setPortfolioId] = useState(null);
  const [activeQuoteDetails, setActiveQuoteDetails] = useState(null);
  const [activeQuoteSummary, setActiveQuoteSummary] = useState(null);
  const [debouncedAmount, setDebouncedAmount] = useState(0);

  const [executionState, setExecutionState] = useState({
    isExecuting: false,
    currentSymbol: null,
    completed: 0,
    total: 0,
    error: null,
    tokenStatuses: {},
  });
  const [executionPrompt, setExecutionPrompt] = useState(null);
  const executionPromptResolverRef = useRef(null);

  const targetChainId = chainIdFor(BUNDLE_CHAIN);
  const targetChainLabel =
    CHAINS[normalizeChain(BUNDLE_CHAIN)]?.label || "BNB Chain";
  const onTargetChain =
    isConnected && Number(walletChainId) === Number(targetChainId);

  const bundlesQuery = useQuery({
    queryKey: ["bundles"],
    queryFn: fetchBundles,
    staleTime: 2 * 60 * 1000,
  });

  const bundles = bundlesQuery.data ?? [];

  useEffect(() => {
    document.title = "Prime Picks";
  }, []);

  const handleClose = () => {
    if (executionState.isExecuting || isQuoting) return;
    setSelectedBundle(null);
    setStep("detail");
    setSelectedAmount(null);
    setCustomAmount("");
    setIsCustom(false);
    setSourceToken("USDT");
    setActionError("");
    setPortfolioId(null);
    setActiveQuoteDetails(null);
    setActiveQuoteSummary(null);
    setDebouncedAmount(0);
    setExecutionState({
      isExecuting: false,
      currentSymbol: null,
      completed: 0,
      total: 0,
      error: null,
      tokenStatuses: {},
    });
    setExecutionPrompt(null);
    executionPromptResolverRef.current = null;
  };

  const handleSelectBundle = (bundle) => {
    setSelectedBundle(bundle);
    setStep("detail");
    setSelectedAmount(null);
    setCustomAmount("");
    setIsCustom(false);
    setSourceToken("USDT");
    setActionError("");
    setPortfolioId(null);
    setActiveQuoteDetails(null);
    setActiveQuoteSummary(null);
    setDebouncedAmount(0);
    setExecutionState({
      isExecuting: false,
      currentSymbol: null,
      completed: 0,
      total: 0,
      error: null,
      tokenStatuses: {},
    });
  };

  const effectiveAmount = isCustom
    ? parseCustomAmountUsd(customAmount) ?? 0
    : selectedAmount;

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedAmount(effectiveAmount || 0);
    }, 400);
    return () => clearTimeout(timer);
  }, [effectiveAmount]);

  const canFetchPreviewQuote =
    step === "invest" &&
    Boolean(selectedBundle?.id) &&
    debouncedAmount >= BUNDLE_MIN_AMOUNT_USD &&
    isConnected &&
    onTargetChain;

  const previewQuoteQuery = useQuery({
    queryKey: [
      "bundleQuotePreview",
      selectedBundle?.id,
      debouncedAmount,
      sourceToken,
    ],
    queryFn: () =>
      fetchBundleQuote(
        selectedBundle.id,
        buildBundleQuotePayload({
          totalInvestment: debouncedAmount,
          sourceToken,
        }),
      ),
    enabled: canFetchPreviewQuote,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
    retry: false,
  });

  const previewQuoteDetails =
    previewQuoteQuery.data?.quoteDetailsBySymbol ?? null;
  const previewQuoteSummary = previewQuoteQuery.data?.quoteSummary ?? null;
  const previewQuoteBlocksInvest = previewQuoteSummary?.allFailed === true;

  const handleExecutionUpdate = useCallback((update) => {
    setExecutionState((prev) => {
      const next = { ...prev, error: null };
      const symbolKey = update.symbol
        ? String(update.symbol).toUpperCase()
        : null;

      if (update.step === "QUOTE_START") {
        next.isExecuting = true;
        next.completed = 0;
        next.currentSymbol = null;
        next.tokenStatuses = {};
        setExecutionPrompt(null);
        executionPromptResolverRef.current = null;
      } else if (update.step === "QUOTE_COMPLETE") {
        next.total = (update.quotedCount || 0) + (update.failedCount || 0);
        if (
          Array.isArray(update.failedTokens) &&
          update.failedTokens.length > 0
        ) {
          const failedTokenStatuses = update.failedTokens.reduce(
            (acc, token) => {
              const failedSymbol = token?.symbol
                ? String(token.symbol).toUpperCase()
                : null;
              if (failedSymbol) acc[failedSymbol] = "skipped";
              return acc;
            },
            {},
          );
          next.tokenStatuses = {
            ...prev.tokenStatuses,
            ...failedTokenStatuses,
          };
        }
      } else if (
        update.step === "POSITION_START" ||
        update.step === "POSITION_PREPARED" ||
        update.step === "POSITION_TX_SUBMITTED" ||
        update.step === "POSITION_STATUS"
      ) {
        next.currentSymbol = update.symbol || null;
        if (symbolKey) {
          next.tokenStatuses = {
            ...prev.tokenStatuses,
            [symbolKey]: "processing",
          };
        }
      } else if (update.step === "POSITION_REJECTED") {
        next.currentSymbol = null;
        if (symbolKey) {
          next.tokenStatuses = {
            ...prev.tokenStatuses,
            [symbolKey]: "skipped",
          };
        }
      } else if (
        update.step === "POSITION_CONFIRMED" ||
        update.step === "POSITION_CANCELLED" ||
        update.step === "POSITION_FAILED" ||
        update.step === "POSITION_ERROR"
      ) {
        next.completed = (prev.completed || 0) + 1;
        next.currentSymbol = null;
        if (symbolKey) {
          const status =
            update.step === "POSITION_CONFIRMED" ? "success" : "skipped";
          next.tokenStatuses = {
            ...prev.tokenStatuses,
            [symbolKey]: status,
          };
        }
        if (update.step === "POSITION_ERROR") {
          next.error = update.error || null;
        }
      } else if (update.step === "COMPLETE") {
        next.isExecuting = false;
        next.currentSymbol = null;
      }

      return next;
    });
  }, []);

  const promptExecutionDecision = useCallback((promptData) => {
    return new Promise((resolve) => {
      executionPromptResolverRef.current = resolve;
      setExecutionPrompt(promptData);
    });
  }, []);

  const resolveExecutionPrompt = (decision) => {
    const resolve = executionPromptResolverRef.current;
    executionPromptResolverRef.current = null;
    setExecutionPrompt(null);
    if (typeof resolve === "function") resolve(decision);
  };

  const handleStartExecution = useCallback(
    async (execution) => {
      const isPrivyExecutionSession =
        authUser?.authProvider === "privy" ||
        sessionSource === "privy" ||
        walletType === "privy";

      let privyTxEnv;
      const executionChain = normalizeChain(execution?.chain);
      const executionChainId = chainIdFor(executionChain);

      if (isPrivyExecutionSession) {
        const embedded = getEmbeddedConnectedWallet(wallets);
        if (!embedded) {
          throw new Error(
            "Embedded wallet not found. Refresh the page or sign in again.",
          );
        }
        const cid = embedded.chainId;
        const onExecutionChain =
          cid === `eip155:${executionChainId}` ||
          (typeof cid === "string" &&
            cid.startsWith("0x") &&
            parseInt(cid, 16) === executionChainId) ||
          Number(cid) === executionChainId;
        if (!onExecutionChain) {
          await embedded.switchChain(executionChainId);
        }
        privyTxEnv = createPrivyExecutionTxEnv(
          embedded.address,
          privySendTransaction,
          executionChain,
        );
      }

      const completeData = await executePortfolioOnChain(execution, {
        onUpdate: handleExecutionUpdate,
        onPrompt: promptExecutionDecision,
        ...(privyTxEnv ? { txEnv: privyTxEnv } : {}),
      });

      return completeData;
    },
    [
      authUser?.authProvider,
      handleExecutionUpdate,
      privySendTransaction,
      promptExecutionDecision,
      sessionSource,
      walletType,
      wallets,
    ],
  );

  const handleConfirmInvest = async () => {
    setActionError("");

    if (!selectedBundle?.id) return;
    if (!isConnected) {
      dispatch(setWalletModal(true));
      return;
    }
    if (!onTargetChain) {
      void handleSwitchChain();
      return;
    }
    if (!effectiveAmount || effectiveAmount < BUNDLE_MIN_AMOUNT_USD) {
      setActionError(`Minimum investment is $${BUNDLE_MIN_AMOUNT_USD}.`);
      return;
    }

    try {
      setIsQuoting(true);
      setPortfolioId(null);
      setExecutionState({
        isExecuting: false,
        currentSymbol: null,
        completed: 0,
        total: 0,
        error: null,
        tokenStatuses: {},
      });

      await ensureAuthenticated();

      const { quote, meta, quoteSummary } = await fetchBundleQuote(
        selectedBundle.id,
        buildBundleQuotePayload({
          totalInvestment: effectiveAmount,
          sourceToken,
        }),
      );

      if (!quote) {
        setActionError("Bundle quote was not returned. Try again.");
        return;
      }

      const quoteDetails = mapBundleQuoteDetailsBySymbol(quote);
      const resolvedQuoteSummary =
        quoteSummary ?? parseBundleQuoteSummary(quote);
      setActiveQuoteDetails(quoteDetails);
      setActiveQuoteSummary(resolvedQuoteSummary);

      if (resolvedQuoteSummary.allFailed) {
        setActionError(
          `No swap routes are available for any token in this bundle with ${sourceToken}. Try another payment token.`,
        );
        return;
      }

      const execution = buildBundleExecutionFromQuote({
        bundleId: selectedBundle.id,
        quote,
        meta,
      });

      if (!execution) {
        setActionError("Could not build execution from quote. Try again.");
        return;
      }
      setIsQuoting(false);
      setStep("execute");

      const completeData = await handleStartExecution(execution);
      const nextPortfolioId = completeData?.portfolioId ?? null;
      setPortfolioId(nextPortfolioId);
      if (nextPortfolioId) {
        void queryClient.invalidateQueries({ queryKey: ["recentPortfolios"] });
      }
    } catch (error) {
      if (error?.status === 401) logout();
      const message =
        error?.message ||
        error?.data?.message ||
        "Investment failed. Please try again.";
      setActionError(message);
      const isChainError =
        message.toLowerCase().includes("switch your wallet") ||
        message.toLowerCase().includes("bnb chain");
      if (isChainError) toast.error(message);
    } finally {
      setIsQuoting(false);
      setExecutionState((prev) => ({ ...prev, isExecuting: false }));
    }
  };

  const handleSwitchChain = async () => {
    if (!isConnected) {
      dispatch(setWalletModal(true));
      return;
    }

    const isPrivySession =
      authUser?.authProvider === "privy" ||
      sessionSource === "privy" ||
      walletType === "privy";

    try {
      if (isPrivySession) {
        const embedded = getEmbeddedConnectedWallet(wallets);
        if (!embedded) {
          toast.error("Embedded wallet not found. Sign in again.");
          return;
        }
        await embedded.switchChain(targetChainId);
        return;
      }

      if (switchChainAsync) {
        await switchChainAsync({ chainId: targetChainId });
        return;
      }

      if (connector?.switchChain) {
        await connector.switchChain({ chainId: targetChainId });
      }
    } catch (error) {
      toast.error(error?.message || `Unable to switch to ${targetChainLabel}.`);
    }
  };

  const isBusy = isQuoting || executionState.isExecuting;
  const needsWalletConnect = !isConnected;
  const needsChainSwitch = isConnected && !onTargetChain;
  const showSuccess = portfolioId && !executionState.isExecuting && !isQuoting;

  return (
    <div className="space-y-6 flex-1 px-6 py-8 portfolio-wrapper ms-auto w-full overflow-y-auto">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold">Prime Picks</h2>
          <p className="text-gray-600 mt-2">Curated bundles on BNB Chain</p>
        </div>
      </div>

      {bundlesQuery.isLoading ? (
        <div className="flex items-center justify-center py-20 text-gray-600 gap-2">
          <Loader2 className="w-5 h-5 animate-spin" />
          Loading bundles...
        </div>
      ) : bundlesQuery.isError ? (
        <div className="glass-card p-8 text-center">
          <p className="text-gray-700 mb-4">
            {bundlesQuery.error?.message || "Unable to load bundles."}
          </p>
          <button
            type="button"
            onClick={() => bundlesQuery.refetch()}
            className="px-4 py-2 rounded-xl bg-black text-white text-sm font-medium hover:bg-gray-800"
          >
            Retry
          </button>
        </div>
      ) : bundles.length === 0 ? (
        <div className="glass-card p-8 text-center text-gray-600">
          No bundles available right now.
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {bundles.map((bundle) => (
            <motion.div
              key={bundle.id}
              layoutId={bundle.id}
              onClick={() => handleSelectBundle(bundle)}
              className="glass-card p-6 cursor-pointer hover:bg-white/80 hover:shadow-lg transition-all duration-200"
            >
              <div className="flex items-start justify-between mb-2">
                <h3 className="text-xl font-bold">{bundle.name}</h3>
                <div className="px-2 py-1 bg-yellow-100 text-yellow-700 text-xs font-medium rounded-lg shrink-0">
                  BNB Chain
                </div>
              </div>
              {bundle.tagline && (
                <p className="text-sm text-gray-600 mb-4">{bundle.tagline}</p>
              )}

              <div className="space-y-3 mb-4">
                {bundle?.positions?.map((position) => (
                  <BundlePositionRow
                    key={position.id || position.symbol}
                    position={position}
                    muted={position.missing}
                    trailing={
                      <div className="text-right shrink-0">
                        <div className="text-sm font-medium text-gray-700">
                          {position.weightPct != null
                            ? `${position.weightPct}%`
                            : "—"}
                        </div>
                        {position.hasPriceData &&
                          position.ytdPercent != null && (
                            <div
                              className={`text-xs font-medium ${ytdColorClass(position.ytdPercent)}`}
                            >
                              {formatYtdPercent(position.ytdPercent)}
                            </div>
                          )}
                      </div>
                    }
                  />
                ))}
              </div>

              <div className="pt-4 border-t border-gray-200/50">
                <div className="flex items-center justify-between">
                  <div className="text-xs text-gray-600">YTD Performance</div>
                  <div
                    className={`flex items-center gap-1 text-sm font-bold ${ytdColorClass(bundle.ytdPercent)}`}
                  >
                    <TrendingUp size={14} />
                    {formatYtdPercent(bundle.ytdPercent) ?? "—"}
                  </div>
                </div>
                {bundle.ytdCoverage &&
                  bundle.ytdCoverage.withData < bundle.ytdCoverage.total && (
                    <div className="text-[11px] text-gray-500 mt-1 text-right">
                      Based on {bundle.ytdCoverage.withData}/
                      {bundle.ytdCoverage.total} assets
                    </div>
                  )}
              </div>
            </motion.div>
          ))}
        </div>
      )}

      <AnimatePresence>
        {selectedBundle && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !isBusy && setSelectedBundle(null)}
              className="h-full fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
            />

            <motion.div
              layoutId={selectedBundle.id}
              className="fixed inset-4 md:inset-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-full md:max-w-2xl z-50"
            >
              <div className="glass-card p-8 h-full overflow-y-auto">
                <AnimatePresence mode="wait">
                  {showSuccess ? (
                    <motion.div
                      key="success"
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 12 }}
                    >
                      <div className="text-center py-6">
                        <CheckCircle2 className="w-14 h-14 text-green-600 mx-auto mb-4" />
                        <h2 className="text-2xl font-bold mb-2">
                          Investment Complete
                        </h2>
                        <p className="text-gray-600 mb-6">
                          Your {selectedBundle.name} bundle has been executed on
                          chain.
                        </p>
                        <div className="flex flex-col sm:flex-row gap-3 justify-center">
                          <button
                            type="button"
                            onClick={() => navigate("/portfolio")}
                            className="px-5 py-3 rounded-xl bg-black text-white font-semibold hover:bg-gray-800"
                          >
                            View Portfolio
                          </button>
                          <button
                            type="button"
                            onClick={handleClose}
                            className="px-5 py-3 rounded-xl border border-gray-300 text-gray-700 font-semibold hover:bg-gray-50"
                          >
                            Close
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  ) : step === "detail" ? (
                    <motion.div
                      key="detail"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.18 }}
                    >
                      <div className="flex items-start justify-between mb-6">
                        <div>
                          <h2 className="text-2xl font-bold mb-2">
                            {selectedBundle.name}
                          </h2>
                          {selectedBundle.tagline && (
                            <p className="text-sm text-gray-600 mb-2">
                              {selectedBundle.tagline}
                            </p>
                          )}
                          <div className="px-3 py-1 bg-yellow-100 text-yellow-700 text-xs font-medium rounded-lg inline-block">
                            BNB Chain
                          </div>
                        </div>
                        <button
                          onClick={handleClose}
                          className="p-2 hover:bg-black/5 rounded-lg transition-colors"
                        >
                          <X size={20} />
                        </button>
                      </div>

                      <div className="grid grid-cols-2 gap-4 mb-6">
                        <div className="glass-card p-4">
                          <div className="text-xs text-gray-600 mb-1">
                            YTD Performance
                          </div>
                          <div
                            className={`text-2xl font-bold ${ytdColorClass(selectedBundle.ytdPercent)}`}
                          >
                            {formatYtdPercent(selectedBundle.ytdPercent) ?? "—"}
                          </div>
                          {selectedBundle.ytdCoverage &&
                            selectedBundle.ytdCoverage.withData <
                              selectedBundle.ytdCoverage.total && (
                              <div className="text-xs text-gray-500 mt-1">
                                Based on {selectedBundle.ytdCoverage.withData}/
                                {selectedBundle.ytdCoverage.total} assets
                              </div>
                            )}
                        </div>
                        <div className="glass-card p-4">
                          <div className="text-xs text-gray-600 mb-1">
                            Number of Assets
                          </div>
                          <div className="text-2xl font-bold">
                            {selectedBundle.positions.length}
                          </div>
                        </div>
                      </div>

                      <div className="space-y-4 mb-6">
                        <h3 className="text-lg font-bold">Token Breakdown</h3>
                        {selectedBundle.positions.map((position) => (
                          <div
                            key={position.id || position.symbol}
                            className={`flex items-center justify-between p-4 bg-white/50 rounded-xl ${position.missing ? "opacity-70" : ""}`}
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <BundlePositionAvatar position={position} />
                              <div className="min-w-0">
                                <div className="font-bold">
                                  {position.displaySymbol || position.symbol}
                                </div>
                                {position.name && (
                                  <div className="text-sm text-gray-600 truncate">
                                    {position.name}
                                  </div>
                                )}
                                {position.hasPriceData &&
                                  position.currentPriceUsd != null && (
                                    <div className="text-xs text-gray-500 mt-0.5">
                                      $
                                      {position.currentPriceUsd.toLocaleString(
                                        undefined,
                                        { maximumFractionDigits: 2 },
                                      )}
                                    </div>
                                  )}
                                {position.missing && (
                                  <div className="text-xs text-amber-700 mt-0.5">
                                    Price unavailable
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="text-right shrink-0">
                              <div className="text-lg font-bold text-gray-700">
                                {position.weightPct != null
                                  ? `${position.weightPct}%`
                                  : "—"}
                              </div>
                              {position.hasPriceData &&
                                position.ytdPercent != null && (
                                  <div
                                    className={`text-sm font-medium ${ytdColorClass(position.ytdPercent)}`}
                                  >
                                    {formatYtdPercent(position.ytdPercent)}
                                  </div>
                                )}
                            </div>
                          </div>
                        ))}
                      </div>

                      <button
                        onClick={() => setStep("invest")}
                        className="w-full bg-black text-white font-semibold py-4 rounded-xl hover:bg-gray-800 transition-colors flex items-center justify-center gap-2"
                      >
                        Invest in {selectedBundle.name}
                        <ChevronRight size={18} />
                      </button>
                    </motion.div>
                  ) : step === "execute" ? (
                    <motion.div
                      key="execute"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      transition={{ duration: 0.18 }}
                    >
                      <div className="flex items-center justify-between mb-6">
                        <div>
                          <h2 className="text-2xl font-bold">Executing</h2>
                          <p className="text-sm text-gray-600">
                            {selectedBundle.name}
                          </p>
                        </div>
                        {!isBusy && (
                          <button
                            onClick={handleClose}
                            className="p-2 hover:bg-black/5 rounded-lg transition-colors"
                          >
                            <X size={20} />
                          </button>
                        )}
                      </div>

                      <BundleInvestmentReadonly
                        amount={effectiveAmount}
                        sourceToken={sourceToken}
                      />

                      <BundleAllocationPreview
                        positions={selectedBundle.positions}
                        amount={effectiveAmount}
                        sourceToken={sourceToken}
                        tokenStatuses={executionState.tokenStatuses}
                        currentSymbol={executionState.currentSymbol}
                        isExecuting={executionState.isExecuting}
                        isQuoting={isQuoting}
                        quoteBySymbol={activeQuoteDetails}
                        quoteSummary={activeQuoteSummary}
                        slippagePercent={BUNDLE_DEFAULT_SLIPPAGE}
                      />

                      <div className="glass-card p-4 border border-amber-200/50 bg-amber-50/30 mb-4 mt-6">
                        <div className="flex items-center gap-2 text-sm text-gray-800">
                          {isBusy ? (
                            <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                          ) : (
                            <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" />
                          )}
                          <span>
                            {executionState.currentSymbol
                              ? `Processing ${executionState.currentSymbol} (${executionState.completed}/${executionState.total} done)`
                              : executionState.total > 0
                                ? `Swaps completed: ${executionState.completed}/${executionState.total}`
                                : isQuoting
                                  ? "Fetching quote..."
                                  : "Preparing swaps..."}
                          </span>
                        </div>
                      </div>

                      {executionState.isExecuting && executionPrompt && (
                        <div className="mb-4 glass-card p-4 border border-amber-200/60 bg-amber-50/50 text-sm">
                          {executionPrompt.type === "QUOTE_FAILED_TOKENS" ? (
                            <>
                              <p className="font-medium text-gray-900 mb-1">
                                Some tokens have no valid swap route
                              </p>
                              <ul className="text-xs text-gray-700 mb-2 space-y-1 list-disc list-inside">
                                {(executionPrompt.failedTokens || []).map(
                                  (token) => (
                                    <li key={token.symbol}>
                                      <span className="font-medium">
                                        {token.symbol}
                                      </span>
                                      {token.reason
                                        ? `: ${token.reason}`
                                        : null}
                                    </li>
                                  ),
                                )}
                              </ul>
                              <p className="text-xs text-gray-700 mb-3">
                                Continue with available routes or go back to
                                edit.
                              </p>
                              <div className="flex flex-wrap gap-2">
                                <button
                                  type="button"
                                  onClick={() =>
                                    resolveExecutionPrompt("continue")
                                  }
                                  className="px-3 py-2 rounded-xl bg-gray-900 text-white text-xs font-medium hover:bg-gray-800"
                                >
                                  Continue
                                </button>
                                <button
                                  type="button"
                                  onClick={() => resolveExecutionPrompt("edit")}
                                  className="px-3 py-2 rounded-xl bg-white border border-gray-300 text-gray-700 text-xs font-medium hover:bg-gray-50"
                                >
                                  Cancel
                                </button>
                              </div>
                            </>
                          ) : executionPrompt.type ===
                            "SLIPPAGE_INCREASE_REQUIRED" ? (
                            <>
                              <p className="font-medium text-gray-900 mb-1">
                                Higher slippage needed for{" "}
                                {executionPrompt.symbol || "this token"}
                              </p>
                              <p className="text-xs text-gray-700 mb-3">
                                {executionPrompt.message ||
                                  "Simulation needs a higher slippage tolerance."}
                              </p>
                              <div className="flex flex-wrap gap-2">
                                <button
                                  type="button"
                                  onClick={() =>
                                    resolveExecutionPrompt("accept")
                                  }
                                  className="px-3 py-2 rounded-xl bg-gray-900 text-white text-xs font-medium hover:bg-gray-800"
                                >
                                  Accept and continue
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    resolveExecutionPrompt("decline")
                                  }
                                  className="px-3 py-2 rounded-xl bg-white border border-gray-300 text-gray-700 text-xs font-medium hover:bg-gray-50"
                                >
                                  Stop
                                </button>
                              </div>
                            </>
                          ) : (
                            <>
                              <p className="font-medium text-gray-900 mb-1">
                                Swap failed for {executionPrompt.symbol}
                              </p>
                              <div className="flex flex-wrap gap-2">
                                <button
                                  type="button"
                                  onClick={() =>
                                    resolveExecutionPrompt("retry")
                                  }
                                  className="px-3 py-2 rounded-xl bg-gray-900 text-white text-xs font-medium hover:bg-gray-800"
                                >
                                  Retry
                                </button>
                                <button
                                  type="button"
                                  onClick={() => resolveExecutionPrompt("skip")}
                                  className="px-3 py-2 rounded-xl bg-white border border-gray-300 text-gray-700 text-xs font-medium hover:bg-gray-50"
                                >
                                  Skip
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      )}

                      {(actionError || executionState.error) && (
                        <div className="mb-4 glass-card p-3 border border-red-200/60 bg-red-50/60 text-sm text-red-700">
                          {actionError || executionState.error}
                        </div>
                      )}

                      {!isBusy && (actionError || executionState.error) && (
                        <button
                          type="button"
                          onClick={() => {
                            setStep("invest");
                            setActionError("");
                            setExecutionState((prev) => ({
                              ...prev,
                              error: null,
                            }));
                            setSelectedAmount(null);
                            setIsCustom(false);
                            setCustomAmount("");
                          }}
                          className="w-full py-3 rounded-xl border border-gray-300 text-gray-700 font-semibold hover:bg-gray-50"
                        >
                          Back
                        </button>
                      )}
                    </motion.div>
                  ) : (
                    <motion.div
                      key="invest"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      transition={{ duration: 0.18 }}
                    >
                      <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => setStep("detail")}
                            className="p-2 hover:bg-black/5 rounded-lg transition-colors"
                          >
                            <ArrowLeft size={20} />
                          </button>
                          <div>
                            <h2 className="text-2xl font-bold">
                              Choose Amount
                            </h2>
                            <p className="text-sm text-gray-600">
                              {selectedBundle.name}
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={handleClose}
                          className="p-2 hover:bg-black/5 rounded-lg transition-colors"
                        >
                          <X size={20} />
                        </button>
                      </div>

                      <div className="grid grid-cols-2 gap-3 mb-4">
                        {PRESET_AMOUNTS.map((amount) => (
                          <button
                            key={amount}
                            onClick={() => {
                              setSelectedAmount(amount);
                              setIsCustom(false);
                              setCustomAmount("");
                              setActionError("");
                            }}
                            className={`px-4 py-2.5 rounded-xl border font-semibold text-sm transition-all ${
                              !isCustom && selectedAmount === amount
                                ? "px-4 py-2.5 bg-gray-900 text-white border border-gray-900 rounded-xl text-sm font-semibold hover:bg-gray-800 shadow-sm"
                                : "px-4 py-2.5 bg-white/80 border border-gray-200 rounded-xl text-sm font-semibold hover:bg-white hover:border-gray-300"
                            }`}
                          >
                            ${amount}
                          </button>
                        ))}
                      </div>

                      <button
                        onClick={() => {
                          setIsCustom(true);
                          setSelectedAmount(null);
                          setActionError("");
                        }}
                        className={`w-full px-4 py-2.5 rounded-xl border font-semibold transition-all mb-2 ${
                          isCustom
                            ? "px-4 py-2.5 bg-gray-900 text-white border border-gray-900 rounded-xl text-sm font-semibold hover:bg-gray-800 shadow-sm"
                            : "px-4 py-2.5 bg-white/80 border border-gray-200 rounded-xl text-sm font-semibold hover:bg-white hover:border-gray-300"
                        }`}
                      >
                        Custom Amount
                      </button>

                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.15 }}
                        className="overflow-hidden"
                      >
                        <div className="relative mt-3 mb-4">
                          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-bold">
                            $
                          </span>
                          <input
                            type="text"
                            inputMode="decimal"
                            autoComplete="off"
                            maxLength={12}
                            placeholder={`Enter amount (min $${BUNDLE_MIN_AMOUNT_USD})`}
                            value={customAmount}
                            onChange={(e) => {
                              const raw = e.target.value;
                              if (!isDecimalAmountInput(raw)) return;
                              setCustomAmount(raw);
                              setIsCustom(true);
                              setSelectedAmount(null);
                              setActionError("");
                            }}
                            onBlur={() => {
                              if (!isCustom) return;
                              const parsed = parseCustomAmountUsd(customAmount);
                              if (parsed != null) {
                                setCustomAmount(String(parsed));
                              }
                            }}
                            className="w-full px-4 ps-8 py-3 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 bg-white/70"
                          />
                        </div>
                      </motion.div>

                      <div className="mb-4">
                        <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide mb-2">
                          Pay with
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {BUNDLE_SOURCE_TOKENS.map((symbol) => (
                            <button
                              key={symbol}
                              type="button"
                              onClick={() => {
                                setSourceToken(symbol);
                                setActionError("");
                              }}
                              className={`px-4 py-2 rounded-xl border-2 text-sm font-semibold transition-all ${
                                sourceToken === symbol
                                  ? "border-black bg-black text-white"
                                  : "border-gray-200 bg-white/60 text-gray-800 hover:border-gray-400"
                              }`}
                            >
                              {symbol}
                            </button>
                          ))}
                        </div>
                      </div>

                      <BundleAllocationPreview
                        positions={selectedBundle.positions}
                        amount={effectiveAmount}
                        sourceToken={sourceToken}
                        quoteBySymbol={
                          canFetchPreviewQuote
                            ? (previewQuoteDetails ?? {})
                            : null
                        }
                        quoteSummary={previewQuoteSummary}
                        isLoadingQuote={previewQuoteQuery.isFetching}
                        slippagePercent={BUNDLE_DEFAULT_SLIPPAGE}
                      />

                      {actionError && (
                        <div className="mt-4 glass-card p-3 border border-red-200/60 bg-red-50/60 text-sm text-red-700">
                          {actionError}
                        </div>
                      )}

                      <button
                        type="button"
                        disabled={
                          isBusy ||
                          (needsWalletConnect || needsChainSwitch
                            ? false
                            : !effectiveAmount ||
                              effectiveAmount < BUNDLE_MIN_AMOUNT_USD ||
                              previewQuoteBlocksInvest ||
                              (canFetchPreviewQuote &&
                                previewQuoteQuery.isFetching))
                        }
                        onClick={() => {
                          if (needsWalletConnect) {
                            dispatch(setWalletModal(true));
                            return;
                          }
                          if (needsChainSwitch) {
                            void handleSwitchChain();
                            return;
                          }
                          void handleConfirmInvest();
                        }}
                        className="w-full mt-6 bg-black text-white font-semibold py-4 rounded-xl hover:bg-gray-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      >
                        {isQuoting ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Getting quote...
                          </>
                        ) : needsWalletConnect ? (
                          "Connect wallet"
                        ) : needsChainSwitch ? (
                          `Switch to ${targetChainLabel}`
                        ) : effectiveAmount > 0 ? (
                          "Confirm"
                        ) : (
                          "Select an Amount"
                        )}
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
