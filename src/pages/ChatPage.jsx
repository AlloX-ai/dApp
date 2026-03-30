import { useRef, useEffect, useState, useCallback, useMemo } from "react";
import {
  Send,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Wallet,
  Gift,
  Clock,
  X,
  RefreshCw,
  HelpCircle,
  Check,
  RefreshCcw,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import { ChatBubble } from "../components/ChatBubble";
import {
  addCurrentMessage,
  setIsThinking,
  setMessage,
  setCurrentMessages,
  setViewingHistorySessionId,
  setRateLimit,
  setChatStatus,
  requestBackendChatReset,
} from "../redux/slices/chatSlice";
import { setWalletModal } from "../redux/slices/walletSlice";
import {
  setPointsBalance,
  INITIAL_CLAIM_POINTS,
} from "../redux/slices/pointsSlice";
import { apiCall } from "../utils/api";
import { executePortfolioOnChain } from "../utils/execution";
import { useAuth } from "../hooks/useAuth";
import { NavLink, useLocation, useNavigate } from "react-router";
import getFormattedNumber from "../hooks/get-formatted-number";
import { toast } from "sonner";
import { getPublicClient } from "@wagmi/core";
import { wagmiClient } from "../wagmiConnectors";
import { bsc } from "wagmi/chains";
import { erc20Abi, formatEther, formatUnits } from "viem";
import { AnimatePresence, motion } from "motion/react";
import ChatMoreInfoModal from "../components/ChatMoreInfoModal";
import { useQuery, useQueryClient } from "@tanstack/react-query";

function formatResetAt(resetAt) {
  if (resetAt == null || resetAt === "") return "";
  // Support ISO date strings (e.g. "2026-02-26T13:51:45.654Z") and timestamps
  const date =
    typeof resetAt === "number"
      ? new Date(resetAt)
      : new Date(String(resetAt).trim());
  if (Number.isNaN(date.getTime())) return "";
  const now = Date.now();
  const ms = date.getTime() - now;
  if (ms <= 0) return "soon";
  const mins = Math.round(ms / 60000);
  if (mins < 60) return `in ${mins} min`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `in ${hours} h`;
  const timeStr = date.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
  const today = new Date();
  const sameDay = (a, b) =>
    a.getDate() === b.getDate() &&
    a.getMonth() === b.getMonth() &&
    a.getFullYear() === b.getFullYear();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  if (sameDay(date, today)) return `at ${timeStr}`;
  if (sameDay(date, tomorrow)) return `tomorrow at ${timeStr}`;
  const dateStr = date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
  return `${dateStr} at ${timeStr}`;
}

const NARRATIVE_MODAL_OPTIONS = [
  {
    id: "rwa",
    label: "Real-World Assets (RWA)",
    description:
      "Protocols bringing real-world assets like treasuries, real estate, and credit on-chain.",
    riskProfile: "LOW_TO_MEDIUM",
  },
  {
    id: "ai",
    label: "AI-Powered Crypto",
    description:
      "Projects combining artificial intelligence with decentralized infrastructure and data.",
    riskProfile: "MEDIUM",
  },
  {
    id: "gaming",
    label: "Gaming",
    description: "Blockchain games, gaming platforms, and in-game economies.",
    riskProfile: "MEDIUM_TO_HIGH",
  },
  {
    id: "depin",
    label: "DePIN",
    description:
      "Decentralized physical infrastructure networks — storage, compute, wireless, IoT, and bandwidth.",
    riskProfile: "MEDIUM_TO_HIGH",
  },
];

export function ChatPage() {
  const dispatch = useDispatch();
  const location = useLocation();
  const navigate = useNavigate();
  const {
    message,
    currentMessages,
    isThinking,
    viewingHistorySessionId,
    rateLimit,
    chatStatus,
    backendResetRequestId,
  } = useSelector((state) => state.chat);
  const isReadOnly = !!viewingHistorySessionId;
  const isConnected = useSelector((state) => state.wallet.isConnected);
  const walletChainId = useSelector((state) => state.wallet.chainId);
  const walletAddress = useSelector((state) => state.wallet.address);
  const pointsBalance = useSelector((state) => state.points?.balance);
  const messagesRemaining = rateLimit?.remaining;
  const resetAt = rateLimit?.resetAt;
  const canRefresh = chatStatus?.activity?.canRefresh === true;
  const {
    user: authUser,
    setUser,
    ensureAuthenticated,
    claimSeason1,
    logout,
  } = useAuth();

  const speechBoxRef = useRef(null);
  const typingTimerRef = useRef(null);
  const typingMessageRef = useRef(null);
  const completedMessageIdsRef = useRef(new Set());
  const consumedRouteSuggestionKeysRef = useRef(new Set());
  const [showWalletPrompt, setShowWalletPrompt] = useState(false);
  const [showWelcomeGiftModal, setShowWelcomeGiftModal] = useState(false);
  const [userDismissedClaimModal, setUserDismissedClaimModal] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [claimError, setClaimError] = useState(null);
  const [claimSuccess, setClaimSuccess] = useState(false);
  // const [claimedPoints, setClaimedPoints] = useState(0);
  const [displayedTextById, setDisplayedTextById] = useState({});
  const [typingMessageId, setTypingMessageId] = useState(null);
  const [isNarrativesModalOpen, setIsNarrativesModalOpen] = useState(false);
  const [showRecentPortfoliosPanel, setShowRecentPortfoliosPanel] =
    useState(true);
  const [isBalancesCollapsed, setIsBalancesCollapsed] = useState(false);
  const queryClient = useQueryClient();
  const [onchainBlocked, setOnchainBlocked] = useState(null);
  const [refreshOnchainLoading, setRefreshOnchainLoading] = useState(false);
  const [refreshOnchainMessage, setRefreshOnchainMessage] = useState(null);
  const [statusLoading, setStatusLoading] = useState(false);
  const [executionState, setExecutionState] = useState({
    isExecuting: false,
    currentSymbol: null,
    completed: 0,
    total: 0,
    error: null,
    portfolioId: null,
    tokenStatuses: {},
  });
  const [executionPrompt, setExecutionPrompt] = useState(null);
  const executionPromptResolverRef = useRef(null);

  // Quick portfolio wizard (form-based UX)

  const [showMoreInfoModal, setShowMoreInfoModal] = useState(false);
  const [lastBuildMode, setLastBuildMode] = useState("guided"); // "guided" | "quick"
  const [quickWizardOpen, setQuickWizardOpen] = useState(false);
  const [quickWizardStep, setQuickWizardStep] = useState(0); // 0..3
  const [quickError, setQuickError] = useState("");
  const [quickIsGenerating, setQuickIsGenerating] = useState(false);
  const [quickIsExecuting, setQuickIsExecuting] = useState(false);
  const [quickRemoveTarget, setQuickRemoveTarget] = useState(null); // { symbol, name } | null
  const [quickIsRemoving, setQuickIsRemoving] = useState(false);
  const [quickForm, setQuickForm] = useState({
    chain: null, // "BSC" | "ETH" | "BASE"
    portfolioType: null, // "Diversified" | "Defi" | "RWA" | "AI" | ...
    amountUsd: null,
    customAmountUsdText: "",
    risk: null, // "CONSERVATIVE" | "BALANCED" | "AGGRESSIVE"
    paymentToken: null, // "BNB" | "USDT" | "USDC"
  });
  const [quickBasket, setQuickBasket] = useState([]);
  const [quickPreviewMeta, setQuickPreviewMeta] = useState(null); // { chain, executionMode, positions... }

  const resetQuickWizard = useCallback(() => {
    setQuickWizardStep(0);
    setQuickError("");
    setQuickIsGenerating(false);
    setQuickIsExecuting(false);
    setQuickIsRemoving(false);
    setQuickRemoveTarget(null);
    setQuickForm({
      chain: null,
      portfolioType: null,
      amountUsd: null,
      customAmountUsdText: "",
      risk: null,
      paymentToken: null,
    });
    setQuickBasket([]);
    setQuickPreviewMeta(null);
  }, []);

  const openQuickWizard = useCallback(() => {
    setLastBuildMode("quick");
    resetQuickWizard();
    setQuickWizardOpen(true);
  }, [resetQuickWizard]);

  const closeQuickWizard = useCallback(() => {
    setQuickWizardOpen(false);
  }, []);

  const handleQuickRequestRemoveToken = useCallback((token) => {
    if (!token?.symbol) return;
    setQuickRemoveTarget({
      symbol: String(token.symbol),
      name: token.name ? String(token.name) : null,
    });
  }, []);

  const handleQuickCancelRemoveToken = useCallback(() => {
    if (quickIsRemoving) return;
    setQuickRemoveTarget(null);
  }, [quickIsRemoving]);

  const buildBotMessage = useCallback((data) => {
    return {
      id: Date.now() + 1,
      type: "ai",
      content: data?.message || "Thanks. What would you like to do next?",
      options: Array.isArray(data?.options) ? data.options : [],
      data,
      timestamp: new Date(),
    };
  }, []);

  const parseQuickTokensFromMarkdown = useCallback((markdownText) => {
    if (typeof markdownText !== "string") return [];
    const lines = markdownText.split("\n");
    const tokensHeaderIdx = lines.findIndex((l) =>
      /^Tokens\s*\(\d+\):/i.test(String(l || "").trim()),
    );
    if (tokensHeaderIdx < 0) return [];

    const rows = [];
    for (let i = tokensHeaderIdx + 1; i < lines.length; i += 1) {
      const line = String(lines[i] || "").trim();
      if (!line) break;
      // Expected format:
      // "LINK (defi): $20.00 / 2.170597 tokens at $9.2141"
      const match = line.match(
        /^([A-Z0-9]+)\s*\(([^)]+)\):\s*\$?([\d.,]+)\s*\/\s*([\d.,]+)\s*tokens?\s+at\s+\$?([\d.,]+)/i,
      );
      if (!match) break;
      const symbol = match[1].toUpperCase();
      const category = match[2];
      const allocationUsd = Number(match[3].replace(/,/g, ""));
      const quantity = Number(match[4].replace(/,/g, ""));
      const price = Number(match[5].replace(/,/g, ""));
      rows.push({
        id: symbol,
        symbol,
        category,
        allocationUsd,
        quantity,
        price,
        logo: null,
        contractAddress: null,
      });
    }
    return rows;
  }, []);

  const parseQuickBasketFromResponse = useCallback(
    (response) => {
      const preview =
        response?.portfolioPreview ||
        response?.data?.portfolioPreview ||
        response?.portfolio_preview ||
        response?.data?.portfolio_preview;
      if (
        preview &&
        typeof preview === "object" &&
        Array.isArray(preview.positions)
      ) {
        const positions = preview.positions;
        const basket = positions
          .map((p, idx) => {
            const symbol = String(p?.symbol || p?.name || "").toUpperCase();
            if (!symbol) return null;
            return {
              id: p?.tokenId || p?.contractAddress || `${symbol}-${idx}`,
              symbol,
              logo: p?.logo || null,
              category:
                p?.category ||
                p?.narrative ||
                p?.riskProfile ||
                quickForm.portfolioType ||
                null,
              allocationUsd:
                p?.allocationUsd ?? p?.allocation_usd ?? p?.allocation ?? null,
              quantity:
                p?.tokenAmount ?? p?.token_amount ?? p?.quantity ?? null,
              price:
                p?.entryPriceUsd ?? p?.entry_price_usd ?? p?.priceUsd ?? null,
              contractAddress: p?.contractAddress || null,
            };
          })
          .filter(Boolean);
        return {
          previewMeta: {
            chain: preview.chain || quickForm.chain,
            executionMode: preview.executionMode || null,
          },
          basket,
        };
      }

      // Fallback: parse "Tokens (N):" markdown
      const markdownText = response?.message || response?.content || "";
      const basket = parseQuickTokensFromMarkdown(markdownText);
      if (basket.length > 0) {
        return {
          previewMeta: {
            chain: quickForm.chain,
            executionMode: quickForm.chain === "BSC" ? "ON_CHAIN" : "PAPER",
          },
          basket,
        };
      }

      return { previewMeta: null, basket: [] };
    },
    [parseQuickTokensFromMarkdown, quickForm.chain, quickForm.portfolioType],
  );

  const handleQuickConfirmRemoveToken = useCallback(async () => {
    const symbol = quickRemoveTarget?.symbol;
    if (!symbol) return;
    if (isReadOnly) return;
    if (!isConnected) {
      setShowWalletPrompt(true);
      return;
    }
    try {
      setQuickIsRemoving(true);
      setQuickError("");

      dispatch(
        addCurrentMessage({
          id: Date.now() + 1,
          type: "user",
          content: `remove ${symbol}`,
          timestamp: new Date(),
        }),
      );

      await ensureAuthenticated();
      const response = await apiCall("/chat/message", {
        method: "POST",
        body: JSON.stringify({ message: `remove ${symbol}` }),
      });

      dispatch(addCurrentMessage(buildBotMessage(response)));

      const { previewMeta, basket } = parseQuickBasketFromResponse(response);
      if (Array.isArray(basket) && basket.length > 0) {
        setQuickPreviewMeta(previewMeta);
        setQuickBasket(basket);
      } else {
        // Fallback: remove locally if response parsing fails
        setQuickBasket((prev) =>
          prev.filter(
            (t) =>
              String(t?.symbol || "").toUpperCase() !==
              String(symbol).toUpperCase(),
          ),
        );
      }

      setQuickRemoveTarget(null);
    } catch (e) {
      if (e?.status === 401) logout();
      setQuickError(
        e?.message ||
          e?.data?.message ||
          "Failed to remove token. Please try again.",
      );
    } finally {
      setQuickIsRemoving(false);
    }
  }, [
    apiCall,
    buildBotMessage,
    dispatch,
    ensureAuthenticated,
    isConnected,
    isReadOnly,
    logout,
    parseQuickBasketFromResponse,
    quickRemoveTarget?.symbol,
    setShowWalletPrompt,
  ]);

  useEffect(() => {
    const aiMessages = currentMessages.filter(
      (msg) => msg.type === "ai" && typeof msg.content === "string",
    );

    if (aiMessages.length === 0) return;

    const lastAiMessage = aiMessages[aiMessages.length - 1];

    setDisplayedTextById((prev) => {
      const next = { ...prev };
      aiMessages.forEach((msg) => {
        if (next[msg.id] === undefined) {
          if (msg.id === lastAiMessage.id) {
            next[msg.id] = "";
          } else {
            next[msg.id] = msg.content;
            completedMessageIdsRef.current.add(msg.id);
          }
        }
      });
      return next;
    });
  }, [currentMessages]);

  useEffect(() => {
    return () => {
      if (typingTimerRef.current) {
        clearInterval(typingTimerRef.current);
        typingTimerRef.current = null;
      }
    };
  }, []);

  // If a new chat starts (messages cleared), close the quick portfolio wizard too.
  useEffect(() => {
    if (currentMessages.length === 0) {
      setQuickWizardOpen(false);
      resetQuickWizard();
    }
  }, [currentMessages.length, resetQuickWizard]);

  // Fire a backend-only reset without adding a user message to UI history.
  useEffect(() => {
    closeQuickWizard();

    if (!backendResetRequestId) return;
    let cancelled = false;
    (async () => {
      try {
        await ensureAuthenticated();
        if (cancelled) return;
        await apiCall("/chat/message", {
          method: "POST",
          body: JSON.stringify({ message: "Start over" }),
        });
      } catch (e) {
        if (e?.status === 401) logout();
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [backendResetRequestId, ensureAuthenticated, logout]);

  useEffect(() => {
    window.scrollTo(0, 0);
    document.title = "AlloX AI Agent";
  }, []);

  const fetchChatStatus = useCallback(async () => {
    const token = localStorage.getItem("authToken");
    if (!token) return;
    try {
      const status = await apiCall("/chat/status");
      if (status?.rateLimit) {
        dispatch(setRateLimit(status.rateLimit));
      }
      dispatch(
        setChatStatus({
          rateLimit: status?.rateLimit,
          activity: status?.activity ?? null,
          points: status?.points,
          claimed: status?.claimed,
        }),
      );
      if (typeof status?.points === "number") {
        dispatch(setPointsBalance(status.points));
      }
      if (status?.claimed != null) {
        try {
          const stored = JSON.parse(localStorage.getItem("authUser") || "{}");
          setUser({
            ...stored,
            season1: { ...(stored?.season1 ?? {}), claimed: status.claimed },
          });
        } catch (e) {
          console.error(e);
        }
      }
    } catch (e) {
      if (e?.status !== 401) console.warn("Chat status fetch failed:", e);
    }
  }, [dispatch, setUser]);

  useEffect(() => {
    fetchChatStatus();
  }, [fetchChatStatus]);

  const handleRefreshLimit = useCallback(async () => {
    if (statusLoading || !canRefresh) return;
    setStatusLoading(true);
    try {
      await fetchChatStatus();
    } finally {
      setStatusLoading(false);
    }
  }, [statusLoading, canRefresh, fetchChatStatus]);

  const setWalletModalOpen = (nextValue) => {
    dispatch(setWalletModal(nextValue));
  };

  const hasAlreadyClaimed = authUser?.season1?.claimed === true;
  const needsToClaimPoints =
    isConnected &&
    !hasAlreadyClaimed &&
    (pointsBalance == null || pointsBalance === 0);
  const handleClaimPoints = async () => {
    setClaimError(null);
    setClaiming(true);
    try {
      // const authRes = await authenticate();
      // const authUser = authRes?.user ?? user;
      // if (authUser?.season1?.claimed) {
      //   setShowWelcomeGiftModal(false);
      //   setClaiming(false);
      //   return;
      // }
      const claimData = await claimSeason1();
      if (claimData?.success && claimData?.user) {
        const u = claimData.user;
        const updatedUser = {
          address: u.address,
          season1: {
            points: u.season1 ? u.season1.points : (u.points ?? 0),
            claimed: u.season1 ? u.season1.claimed : (u.claimed ?? true),
            claimedAt: u.season1 ? u.season1.claimedAt : u.claimedAt,
            ...(u.snapshot && { snapshot: u.snapshot }),
          },
        };
        setUser(updatedUser);
        dispatch(setPointsBalance(u.points ?? 0));
        // setClaimedPoints(u.points ?? 0);
        setClaimSuccess(true);
        setShowWelcomeGiftModal(false);
        setTimeout(() => {
          setClaimSuccess(false);
          // setClaimedPoints(0);
        }, 4000);
      } else {
        setClaimError(claimData?.message || "Claim failed. Please try again.");
      }
    } catch (err) {
      setClaimError(
        err?.message || "Failed to sign or claim. Please try again.",
      );
    } finally {
      setClaiming(false);
    }
  };

  const scrollToBottom = () => {
    const scrollable = speechBoxRef.current;
    if (scrollable) {
      speechBoxRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "end",
        inline: "nearest",
      });
    }
  };

  const handleRefreshOnchain = useCallback(async () => {
    if (refreshOnchainLoading) return;
    setRefreshOnchainLoading(true);
    setRefreshOnchainMessage(null);
    try {
      const data = await apiCall("/season1/refresh", { method: "POST" });
      const txs = data?.transactions ?? 0;
      const required = data?.required ?? data?.requiredTransactions ?? 1;
      const balance = data?.balance ?? 0;
      const requiredBalance = data?.requiredBalance ?? 5;
      const txsOk = txs >= required;
      const balanceOk = balance >= requiredBalance;
      if (txsOk && balanceOk) {
        setOnchainBlocked(null);
        setRefreshOnchainMessage(null);
      } else {
        const parts = [];
        if (!txsOk) {
          parts.push(
            "Make a transaction on any supported chain (Ethereum, Base, BNB, Solana).",
          );
        }
        if (!balanceOk) {
          parts.push(
            `Have at least $${requiredBalance} on any supported chain (current: $${Number(balance).toFixed(2)}).`,
          );
        }
        setRefreshOnchainMessage(parts.join(" Then tap Refresh again. "));
      }
    } catch (err) {
      const msg =
        err?.data?.message ||
        err?.message ||
        "Refresh failed. Try again or make a transaction on a supported chain.";
      setRefreshOnchainMessage(msg);
    } finally {
      setRefreshOnchainLoading(false);
    }
  }, [refreshOnchainLoading]);

  const getPortfolioTimestamp = (p) => {
    const raw =
      p?.createdAt ??
      p?.updatedAt ??
      p?.created_at ??
      p?.updated_at ??
      p?.date ??
      p?.timestamp;
    if (raw == null) return 0;
    const d = typeof raw === "number" ? new Date(raw) : new Date(String(raw));
    const t = d.getTime();
    return Number.isFinite(t) ? t : 0;
  };

  const recentPortfoliosQuery = useQuery({
    queryKey: ["recentPortfolios", walletAddress],
    enabled: isConnected && !isReadOnly,
    staleTime: 30_000,
    queryFn: async () => {
      await ensureAuthenticated();
      const response = await apiCall("/portfolio");
      const list = Array.isArray(response?.portfolios)
        ? response.portfolios
        : [];

      const normalized = list
        .map((p, idx) => {
          const id = p?.id ?? p?.portfolioId ?? p?.portfolio_id;
          return { ...p, id, __ts: getPortfolioTimestamp(p), __idx: idx };
        })
        .filter((p) => p?.id);

      const hasAnyTs = normalized.some((p) => p.__ts > 0);
      const sorted = hasAnyTs
        ? [...normalized].sort((a, b) => b.__ts - a.__ts || a.__idx - b.__idx)
        : normalized;

      return sorted.slice(0, 3).map((p) => {
        const { __ts, __idx, ...rest } = p;
        void __ts;
        void __idx;
        return rest;
      });
    },
    meta: { errorMessage: "Failed to load portfolios." },
  });

  useEffect(() => {
    const err = recentPortfoliosQuery.error;
    if (err?.status === 401) logout();
  }, [recentPortfoliosQuery.error, logout]);

  const recentPortfolios = Array.isArray(recentPortfoliosQuery.data)
    ? recentPortfoliosQuery.data
    : [];
  const recentPortfoliosLoading = recentPortfoliosQuery.isLoading;

  const bscBalancesQuery = useQuery({
    queryKey: ["bscBalances", walletAddress],
    enabled:
      isConnected &&
      !isReadOnly &&
      walletChainId === 56 &&
      !!walletAddress,
    staleTime: 20_000,
    queryFn: async () => {
      const USDT_BSC = "0x55d398326f99059fF775485246999027B3197955";
      const USDC_BSC = "0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d";

      const publicClient = getPublicClient(wagmiClient, { chainId: bsc.id });
      if (!publicClient) {
        throw new Error("BSC RPC provider unavailable.");
      }

      const bnbWei = await publicClient.getBalance({
        address: walletAddress,
      });

      const [usdtRaw, usdtDec, usdcRaw, usdcDec] = await Promise.all([
        publicClient.readContract({
          address: USDT_BSC,
          abi: erc20Abi,
          functionName: "balanceOf",
          args: [walletAddress],
        }),
        publicClient.readContract({
          address: USDT_BSC,
          abi: erc20Abi,
          functionName: "decimals",
        }),
        publicClient.readContract({
          address: USDC_BSC,
          abi: erc20Abi,
          functionName: "balanceOf",
          args: [walletAddress],
        }),
        publicClient.readContract({
          address: USDC_BSC,
          abi: erc20Abi,
          functionName: "decimals",
        }),
      ]);

      let prices = { bnbUsd: null, usdtUsd: 1, usdcUsd: 1 };
      try {
        const priceRes = await fetch(
          "https://api.coingecko.com/api/v3/simple/price?ids=binancecoin,tether,usd-coin&vs_currencies=usd",
        );
        if (priceRes.ok) {
          const priceData = await priceRes.json();
          prices = {
            bnbUsd: Number(priceData?.binancecoin?.usd ?? 0) || null,
            usdtUsd: Number(priceData?.tether?.usd ?? 1) || 1,
            usdcUsd: Number(priceData?.["usd-coin"]?.usd ?? 1) || 1,
          };
        }
      } catch {
        // Keep stable fallback prices and continue showing balances.
      }

      return {
        bnb: Number(formatEther(bnbWei)),
        usdt: Number(formatUnits(usdtRaw, usdtDec)),
        usdc: Number(formatUnits(usdcRaw, usdcDec)),
        bnbUsd: prices.bnbUsd,
        usdtUsd: prices.usdtUsd,
        usdcUsd: prices.usdcUsd,
      };
    },
  });

  const bscBalances = bscBalancesQuery.data ?? {
    bnb: null,
    usdt: null,
    usdc: null,
    bnbUsd: null,
    usdtUsd: 1,
    usdcUsd: 1,
  };

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
        next.portfolioId = null;
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
              if (failedSymbol) {
                acc[failedSymbol] = "skipped";
              }
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
        next.portfolioId = update.portfolioId || null;
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
    if (typeof resolve === "function") {
      resolve(decision);
    }
  };

  const handleStartExecution = useCallback(
    async (execution) => {
      try {
        setExecutionState((prev) => ({
          ...prev,
          isExecuting: true,
          currentSymbol: null,
          completed: 0,
          total: 0,
          error: null,
          portfolioId: null,
          tokenStatuses: {},
        }));
        const completeData = await executePortfolioOnChain(execution, {
          onUpdate: handleExecutionUpdate,
          onPrompt: promptExecutionDecision,
        });
        const portfolioId = completeData?.portfolioId;
        setExecutionState((prev) => ({
          ...prev,
          isExecuting: false,
          portfolioId,
        }));
        if (portfolioId) {
          // Show the same "portfolio created" message UI used by paper portfolios
          dispatch(
            addCurrentMessage({
              id: Date.now() + 1,
              type: "ai",
              content: "",
              data: { portfolioId, portfolio: completeData },
              timestamp: new Date(),
            }),
          );
          void queryClient.invalidateQueries({
            queryKey: ["recentPortfolios"],
          });
        }
      } catch (error) {
        setExecutionState((prev) => ({
          ...prev,
          isExecuting: false,
          error: error?.message || "Execution failed. Please try again.",
        }));
        dispatch(
          addCurrentMessage({
            id: Date.now() + 1,
            type: "ai",
            content:
              error?.message ||
              "Sorry, something went wrong with on-chain execution.",
            timestamp: new Date(),
          }),
        );
      }
    },
    [dispatch, handleExecutionUpdate, promptExecutionDecision],
  );

  const QUICK_CHAIN_LABELS = useMemo(
    () => ({
      BSC: "BNB Chain (On-Chain Execution)",
      ETH: "Ethereum (Paper Trading)",
      BASE: "Base (Paper Trading)",
    }),
    [],
  );

  const QUICK_PORTFOLIO_TYPE_TO_PROMPT = useMemo(
    () => ({
      Diversified: "Diversified",
      Defi: "DeFi",
      RWA: "Real world assets (RWA)",
      AI: "AI",
      Gaming: "Gaming",
      DePin: "DePin",
    }),
    [],
  );

  const QUICK_RISK_TO_PROMPT = useMemo(
    () => ({
      CONSERVATIVE: "conservative(low risk)",
      BALANCED: "Balanced (medium)",
      AGGRESSIVE: "Aggressive (High Risk)",
    }),
    [],
  );

  const handleQuickGenerate = useCallback(
    async (mode) => {
      setQuickError("");
      if (isReadOnly) return;
      if (!isConnected) {
        setShowWalletPrompt(true);
        return;
      }
      if (messagesRemaining !== null && messagesRemaining <= 0) {
        toast.error("You have no messages remaining. Try again later.");
        return;
      }
      if (
        !quickForm.chain ||
        !quickForm.portfolioType ||
        !quickForm.amountUsd ||
        !quickForm.risk
        //  || !quickForm.paymentToken
      ) {
        setQuickError("Please complete all form selections first.");
        return;
      }
      if (quickForm.chain === "BSC" && walletChainId !== 56) {
        toast.error(
          "Please switch your wallet to BNB Chain before continuing.",
        );
        return;
      }

      try {
        // const userActionLabel =
        //   mode === "regenerate" ? "Regenerate" : "Generate";
        // dispatch(
        //   addCurrentMessage({
        //     id: Date.now() + 1,
        //     type: "user",
        //     content: userActionLabel,
        //     timestamp: new Date(),
        //   }),
        // );

        setQuickIsGenerating(true);
        setQuickIsExecuting(false);

        await ensureAuthenticated();
        const chainLabel =
          QUICK_CHAIN_LABELS[quickForm.chain] || quickForm.chain;
        const interestLabel =
          QUICK_PORTFOLIO_TYPE_TO_PROMPT[quickForm.portfolioType] ||
          quickForm.portfolioType;
        const riskLabel =
          QUICK_RISK_TO_PROMPT[quickForm.risk] || quickForm.risk;

        const prompt = `Build a $${quickForm.amountUsd} ${quickForm.risk} ${quickForm.portfolioType} portfolio on ${quickForm.chain}`;

        const response = await apiCall("/chat/message", {
          method: "POST",
          body: JSON.stringify({ message: prompt }),
        });

        dispatch(addCurrentMessage(buildBotMessage(response)));

        const { previewMeta, basket } = parseQuickBasketFromResponse(response);

        if (!basket || basket.length === 0) {
          setQuickError(
            "Could not generate a token basket. Try regenerating or adjusting your inputs.",
          );
          return;
        }

        setQuickPreviewMeta(previewMeta);
        setQuickBasket(basket);
        setQuickWizardStep(3);
      } catch (e) {
        if (e?.status === 401) logout();
        setQuickError(
          e?.message ||
            e?.data?.message ||
            "Quick portfolio generation failed. Try again.",
        );
      } finally {
        setQuickIsGenerating(false);
      }
    },
    [
      QUICK_CHAIN_LABELS,
      QUICK_PORTFOLIO_TYPE_TO_PROMPT,
      QUICK_RISK_TO_PROMPT,
      apiCall,
      ensureAuthenticated,
      isConnected,
      isReadOnly,
      logout,
      messagesRemaining,
      parseQuickBasketFromResponse,
      quickForm.amountUsd,
      quickForm.chain,
      quickForm.paymentToken,
      quickForm.portfolioType,
      quickForm.risk,
      walletChainId,
      setShowWalletPrompt,
    ],
  );

  const handleQuickConfirmAndExecute = useCallback(async () => {
    setQuickError("");
    if (quickBasket.length === 0) return;
    if (isReadOnly) return;
    if (!isConnected) {
      setShowWalletPrompt(true);
      return;
    }

    try {
      dispatch(
        addCurrentMessage({
          id: Date.now() + 1,
          type: "user",
          content: "Confirm and Execute",
          timestamp: new Date(),
        }),
      );

      setQuickIsExecuting(true);
      setQuickIsGenerating(false);

      await ensureAuthenticated();

      const chainLabel = QUICK_CHAIN_LABELS[quickForm.chain] || quickForm.chain;
      const interestLabel =
        QUICK_PORTFOLIO_TYPE_TO_PROMPT[quickForm.portfolioType] ||
        quickForm.portfolioType;
      const riskLabel = QUICK_RISK_TO_PROMPT[quickForm.risk] || quickForm.risk;

      const tokenLines = quickBasket
        .map((t) => {
          const alloc = Number(t.allocationUsd ?? 0);
          const qty = t.quantity != null ? Number(t.quantity) : null;
          const price = t.price != null ? Number(t.price) : null;
          return `${t.symbol} (${t.category || "token"}): $${alloc.toFixed(
            2,
          )} / ${qty != null ? qty : 0} tokens at $${price != null ? price.toFixed(6) : "0"}`;
        })
        .join("\n");

      const prompt = `Confirm and execute this quick portfolio.\nChain: ${chainLabel}\nPayment token: ${quickForm.paymentToken}\n- Portfolio type: ${interestLabel}\n- Investment: $${quickForm.amountUsd}\n- Risk tolerance: ${riskLabel}\nTokens:\n${tokenLines}`;

      const response = await apiCall("/chat/message", {
        method: "POST",
        body: JSON.stringify({ message: prompt }),
      });

      // On-chain handoff
      if (response?.action === "START_EXECUTION" && response.execution) {
        if (response?.message) {
          dispatch(addCurrentMessage(buildBotMessage(response)));
        }
        setQuickWizardOpen(false);
        handleStartExecution(response.execution);
        return;
      }

      // Paper trading portfolio result
      dispatch(addCurrentMessage(buildBotMessage(response)));
      void queryClient.invalidateQueries({ queryKey: ["recentPortfolios"] });
      setQuickWizardOpen(false);
    } catch (e) {
      if (e?.status === 401) logout();
      setQuickError(
        e?.message || e?.data?.message || "Execution failed. Please try again.",
      );
    } finally {
      setQuickIsExecuting(false);
    }
  }, [
    QUICK_CHAIN_LABELS,
    QUICK_PORTFOLIO_TYPE_TO_PROMPT,
    QUICK_RISK_TO_PROMPT,
    addCurrentMessage,
    apiCall,
    buildBotMessage,
    dispatch,
    ensureAuthenticated,
    handleStartExecution,
    isConnected,
    isReadOnly,
    logout,
    quickBasket,
    quickForm.amountUsd,
    quickForm.chain,
    quickForm.paymentToken,
    quickForm.portfolioType,
    quickForm.risk,
    setShowWalletPrompt,
  ]);

  const handleSendMessage = () => {
    if (isReadOnly || !message.trim()) return;
    const trimmed = String(message).trim();
    if (trimmed === "Build Quick Portfolio") {
      setMessage("");
      closeQuickWizard();
      dispatch(
        addCurrentMessage({
          id: Date.now() + 1,
          type: "user",
          content: "Build Quick Portfolio",
          timestamp: new Date(),
        }),
      );
      dispatch(
        addCurrentMessage({
          id: Date.now() + 2,
          type: "ai",
          content: "",
          timestamp: new Date(),
        }),
      );
      openQuickWizard();
      return;
    }
    if (trimmed === "Build a Portfolio - Guided") {
      sendChatMessage("Build a Portfolio");
      dispatch(setMessage(""));
      return;
    }
    if (trimmed === "Build a Portfolio -- Guided") {
      sendChatMessage("Build a Portfolio");
      dispatch(setMessage(""));
      return;
    }
    if (trimmed === "Build a Portfolio") {
      setLastBuildMode("guided");
    }
    sendChatMessage(trimmed);
    dispatch(setMessage(""));
  };

  const handleStartNewChat = () => {
    closeQuickWizard();
    dispatch(requestBackendChatReset());
    dispatch(setViewingHistorySessionId(null));
    dispatch(setCurrentMessages([]));
  };

  const handleInputKeyDown = (event) => {
    if (event.key !== "Enter") return;
    event.preventDefault();
    handleSendMessage();
  };

  const sendChatMessage = useCallback(
    async (text) => {
      const trimmed = text.trim();
      if (!trimmed) return;
      if (isReadOnly) return;

      if (!isConnected) {
        setShowWalletPrompt(true);
        return;
      }
      // const hasEnoughPoints = pointsBalance != null;
      // if (!hasEnoughPoints) {
      //   dispatch(
      //     addCurrentMessage({
      //       id: Date.now() + 1,
      //       type: "ai",
      //       content: `You do not have enough points to send a message. You have ${pointsBalance ?? 0} points.`,
      //       timestamp: new Date(),
      //     }),
      //   );
      //   return;
      // }
      if (messagesRemaining !== null && messagesRemaining <= 0) {
        dispatch(
          addCurrentMessage({
            id: Date.now() + 1,
            type: "ai",
            content:
              "You have no messages remaining in your current limit. Try again later.",
            timestamp: new Date(),
          }),
        );
        return;
      }

      // dispatch(deductPoints(POINTS_DEDUCT_PER_MESSAGE));

      const userMsg = {
        id: Date.now(),
        type: "user",
        content: trimmed,
        timestamp: new Date(),
      };

      dispatch(addCurrentMessage(userMsg));
      dispatch(setIsThinking(true));

      try {
        await ensureAuthenticated();
        const response = await apiCall("/chat/message", {
          method: "POST",
          body: JSON.stringify({ message: trimmed }),
        });
        dispatch(addCurrentMessage(buildBotMessage(response)));

        const portfolioCreatedFromChat =
          response?.portfolioId != null ||
          (response?.portfolio != null &&
            (response.portfolio.id != null ||
              response.portfolio.portfolioId != null));
        if (portfolioCreatedFromChat) {
          void queryClient.invalidateQueries({
            queryKey: ["recentPortfolios"],
          });
        }

        if (response.points?.total != null) {
          dispatch(setPointsBalance(response.points.total));
        }
        if (response.rateLimit) {
          dispatch(setRateLimit(response.rateLimit));
        }

        // Keep authUser in localStorage in sync with points and rate limit from chat API
        if (response.points || response.rateLimit) {
          const nextUser = {
            ...(authUser ?? {}),
            season1: {
              ...(authUser?.season1 ?? {}),
              ...(response.points?.total != null && {
                points: response.points.total,
              }),
              ...(response.points?.earned != null && {
                lastEarned: response.points.earned,
              }),
              ...(response.points?.breakdown && {
                pointsBreakdown: response.points.breakdown,
              }),
              ...(response.rateLimit && { rateLimit: response.rateLimit }),
            },
          };
          setUser(nextUser);
        }

        // Handle on-chain execution handoff
        if (response.action === "START_EXECUTION" && response.execution) {
          handleStartExecution(response.execution);
        }
      } catch (error) {
        if (error?.status === 401) {
          logout();
        }
        const errCode = error?.data?.error;
        const errMessage =
          error?.data?.message ||
          error?.message ||
          "Sorry, something went wrong while reaching the server.";

        if (errCode === "CLAIM_REQUIRED") {
          dispatch(
            addCurrentMessage({
              id: Date.now() + 1,
              type: "ai",
              content: errMessage,
              timestamp: new Date(),
            }),
          );
          setShowWelcomeGiftModal(true);
          return;
        }

        if (error?.status === 403 && errCode === "NO_ONCHAIN_ACTIVITY") {
          const data = error?.data ?? {};
          setOnchainBlocked({
            message: errMessage,
            canRefresh: data.canRefresh === true,
            transactions: data.transactions ?? 0,
            required: data.required ?? data.requiredTransactions ?? 1,
            supportedChains: data.supportedChains ?? [],
            balance: data.balance ?? 0,
            requiredBalance: data.requiredBalance ?? 5,
          });
          setRefreshOnchainMessage(null);
          dispatch(
            addCurrentMessage({
              id: Date.now() + 1,
              type: "ai",
              content: errMessage,
              timestamp: new Date(),
            }),
          );
          return;
        }

        dispatch(
          addCurrentMessage({
            id: Date.now() + 1,
            type: "ai",
            content: errMessage,
            timestamp: new Date(),
          }),
        );
      } finally {
        dispatch(setIsThinking(false));
      }
    },
    [
      isReadOnly,
      isConnected,
      messagesRemaining,
      dispatch,
      ensureAuthenticated,
      buildBotMessage,
      logout,
      handleStartExecution,
      authUser,
      setUser,
    ],
  );

  const handleSuggestionClick = (suggestion) => {
    const s = String(suggestion);
    if (s === "Build Quick Portfolio") {
      // dispatch(
      //   addCurrentMessage({
      //     id: Date.now() + 1,
      //     type: "user",
      //     content: "Build Quick Portfolio",
      //     timestamp: new Date(),
      //   }),
      // );
      // dispatch(
      //   addCurrentMessage({
      //     id: Date.now() + 2,
      //     type: "ai",
      //     content: '',
      //     timestamp: new Date(),
      //   }),
      // );
      openQuickWizard();
      return;
    }
    if (
      s === "Build a Portfolio - Guided" ||
      s === "Build a Portfolio -- Guided"
    ) {
      setLastBuildMode("guided");
      sendChatMessage("Build a Portfolio");
      return;
    }
    if (s === "Build a Portfolio") {
      setLastBuildMode("guided");
    }
    sendChatMessage(s);
  };
  useEffect(() => {
    const suggestion = location.state?.chatSuggestion;
    if (!suggestion) return;
    if (consumedRouteSuggestionKeysRef.current.has(location.key)) return;
    consumedRouteSuggestionKeysRef.current.add(location.key);

    handleSuggestionClick(String(suggestion));
    navigate(location.pathname + location.search, {
      replace: true,
      state: null,
    });
  }, [location.state, location.pathname, location.search, navigate]);

  const handleOptionClick = useCallback(
    (option) => {
      if (option?.action === "open_narratives_tab") {
        setIsNarrativesModalOpen(true);
        return;
      }

      const message =
        option?.action === "SEND_MESSAGE"
          ? (option?.value ?? option?.label)
          : (option?.value ?? option?.label ?? option?.action);
      if (!message) return;
      // Block selecting BNB Chain (BSC) unless wallet is on BSC mainnet
      if (String(message).toUpperCase() === "BSC" && walletChainId !== 56) {
        toast.error(
          "Please switch your wallet to BNB Chain before continuing.",
        );
        return;
      }
      sendChatMessage(String(message));
    },
    [sendChatMessage, walletChainId],
  );

  // Open claim popup only when user has not already claimed and needs to claim
  useEffect(() => {
    if (needsToClaimPoints && !userDismissedClaimModal) {
      setShowWelcomeGiftModal(true);
    } else if (hasAlreadyClaimed) {
      setShowWelcomeGiftModal(false);
    }
  }, [needsToClaimPoints, userDismissedClaimModal, hasAlreadyClaimed]);

  useEffect(() => {
    scrollToBottom(); // Scroll to the bottom when messages update
  }, [currentMessages, isThinking, typingMessageId]);

  useEffect(() => {
    if (isConnected && showWalletPrompt) {
      setShowWalletPrompt(false);
    }
  }, [isConnected, showWalletPrompt]);

  useEffect(() => {
    const lastAiMessage = [...currentMessages]
      .reverse()
      .find((msg) => msg.type === "ai" && typeof msg.content === "string");

    if (!lastAiMessage) return;
    if (typingMessageRef.current === lastAiMessage.id) return;
    if (completedMessageIdsRef.current.has(lastAiMessage.id)) return;

    if (typingTimerRef.current) {
      clearInterval(typingTimerRef.current);
      typingTimerRef.current = null;
    }

    const batches = createTextBatches(lastAiMessage.content);
    let index = 0;
    let currentText = "";
    typingMessageRef.current = lastAiMessage.id;
    setTypingMessageId(lastAiMessage.id);
    setDisplayedTextById((prev) => ({ ...prev, [lastAiMessage.id]: "" }));

    typingTimerRef.current = setInterval(() => {
      if (index >= batches.length) return;
      currentText += batches[index];
      index += 1;
      setDisplayedTextById((prev) => ({
        ...prev,
        [lastAiMessage.id]: currentText,
      }));
      if (index >= batches.length) {
        clearInterval(typingTimerRef.current);
        typingTimerRef.current = null;
        typingMessageRef.current = null;
        completedMessageIdsRef.current.add(lastAiMessage.id);
        setTypingMessageId(null);
        setDisplayedTextById((prev) => ({
          ...prev,
          [lastAiMessage.id]: lastAiMessage.content,
        }));
      }
    }, 35);

    return () => {
      if (typingTimerRef.current) {
        clearInterval(typingTimerRef.current);
        typingTimerRef.current = null;
      }
    };
  }, [currentMessages]);

  const createTextBatches = (text) => {
    const tokens = text.split(/(\s+)/);
    const batches = [];
    let current = "";

    tokens.forEach((token) => {
      // Smaller batches + faster tick feels closer to "chat typing".
      const wordCount = current.trim() ? current.trim().split(/\s+/).length : 0;
      if (current.length >= 45 || wordCount >= 2) {
        batches.push(current);
        current = "";
      }
      current += token;
    });

    if (current) {
      batches.push(current);
    }

    return batches.length > 0 ? batches : [text];
  };

  const renderTokens = (tokens) => {
    if (!Array.isArray(tokens) || tokens.length === 0) return null;
    return (
      <div className="mt-3 space-y-2">
        {tokens.map((token, index) => {
          const label = token.symbol || token.name || `Token ${index + 1}`;
          const change =
            token.change24h ?? token.change ?? token.performance ?? null;
          return (
            <div
              key={`${label}-${index}`}
              className="flex items-center justify-between bg-white/40 rounded-xl p-3"
            >
              <span className="font-medium text-sm">{label}</span>
              {change !== null && (
                <span
                  className={`text-sm font-medium ${
                    Number(change) >= 0 ? "text-green-600" : "text-red-500"
                  }`}
                >
                  {Number(change) >= 0 ? "+" : ""}
                  {change}%
                </span>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  const renderPortfolioPreview = (preview) => {
    if (!preview || typeof preview !== "object") return null;
    const chainNames = {
      BSC: "BNB Chain",
      ETH: "Ethereum",
      BASE: "Base",
      SOL: "Solana",
    };
    const chainLabel = chainNames[preview.chain] || preview.chain || "Unknown";
    const isOnChain = preview.executionMode === "ON_CHAIN";

    return (
      <div className="mt-4 rounded-2xl bg-linear-to-br from-blue-50/80 to-purple-50/80 border border-blue-200/50 shadow-sm p-4 text-sm space-y-2">
        <div className="flex items-center justify-between">
          <div className="font-semibold text-gray-900">
            {chainLabel} ·{" "}
            {isOnChain ? "On-Chain Execution" : "Paper Trading Preview"}
          </div>
          {typeof preview.totalTokens === "number" && (
            <div className="text-xs text-gray-500">
              {preview.totalTokens} tokens
            </div>
          )}
        </div>
        {Array.isArray(preview.positions) && preview.positions.length > 0 && (
          <div className="mt-2 space-y-1 max-h-80 overflow-y-auto pr-1">
            {preview.positions.map((p, idx) => (
              <div
                key={`${p.symbol || p.name || idx}-${idx}`}
                className="flex items-center justify-between rounded-xl bg-gray-50 px-3 py-2"
              >
                <div className="flex items-center gap-2 min-w-0">
                  {p.logo ? (
                    <img
                      src={p.logo}
                      alt={p.symbol || p.name || "token"}
                      className="w-7 h-7 rounded-full bg-white border border-gray-200"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-7 h-7 rounded-full bg-gray-200 border border-gray-200" />
                  )}
                  <div className="flex flex-col min-w-0">
                    <span className="font-medium text-gray-900 text-xs truncate">
                      {p.symbol || p.name || `Token ${idx + 1}`}
                    </span>
                    {p.narrative && (
                      <span className="text-[11px] text-gray-500 truncate">
                        {p.narrative}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <div className="text-right text-xs text-gray-700">
                    {p.allocationUsd != null && (
                      <div>${Number(p.allocationUsd).toFixed(2)}</div>
                    )}
                    {p.entryPriceUsd != null && (
                      <div className="text-[11px] text-gray-500">
                        @ ${Number(p.entryPriceUsd).toFixed(4)}
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleQuickRequestRemoveToken({
                        symbol: p.symbol || p.name,
                        name: p.name,
                      });
                    }}
                    disabled={isReadOnly || quickIsRemoving}
                    className="p-1 rounded-lg hover:bg-black/5 text-gray-500 disabled:opacity-60"
                    aria-label={`Remove ${p.symbol || p.name || "token"}`}
                    title={`Remove ${p.symbol || p.name || "token"}`}
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const renderOnChainPortfolioCreated = (portfolio, options) => {
    const safeOptions = Array.isArray(options) ? options : [];
    if (!portfolio || typeof portfolio !== "object") return null;
    if (portfolio.executionMode !== "ON_CHAIN") return null;
    const chainNames = {
      BSC: "BNB Chain",
      ETH: "Ethereum",
      BASE: "Base",
      SOL: "Solana",
    };
    const chainLabel =
      chainNames[portfolio.chain] || portfolio.chain || "Unknown";
    const positions = Array.isArray(portfolio.positions)
      ? portfolio.positions
      : [];
    const skipped = Array.isArray(portfolio.skipped) ? portfolio.skipped : [];
    const summary = portfolio.summary || null;

    const getTxLink = (txHash) =>
      txHash ? `https://bscscan.com/tx/${txHash}` : null;

    return (
      <div className="mt-3 border border-gray-200 bg-white/80 shadow-sm p-4 rounded-2xl space-y-3">
        <div className="flex justify-center gap-3">
          <div className="p-6 text-center">
            <div className="mx-auto w-14 h-14 rounded-full bg-green-100 border border-green-200 flex items-center justify-center">
              <CheckCircle2 className="w-7 h-7 text-green-600" />
            </div>
            <div className="mt-1 text-xl font-bold text-gray-900">
              Portfolio Created!
            </div>
            {/* <div className="mt-1 text-sm text-gray-600">
            {summary?.confirmed != null
              ? `All ${summary.confirmed} transactions confirmed`
              : positions.length > 0
                ? `All ${positions.length} transactions confirmed`
                : "Transactions confirmed"}
          </div> */}
            {portfolio.totalInvestment != null && (
              <div className="mt-2 text-3xl font-bold text-gray-900">
                ${Number(portfolio.totalInvestment).toFixed(2)}
              </div>
            )}
            <div className="mt-2 text-xs text-gray-500">
              {chainLabel} · On-Chain Execution
            </div>
          </div>
          {/* 
          {portfolio.totalInvestment != null && (
            <div className="text-right flex  gap-2 items-center">
              <div className="text-xs text-green-700">Total executed</div>
              <div className="font-semibold text-green-900">
                ${Number(portfolio.totalInvestment).toFixed(2)}
              </div>
            </div>
          )} */}
        </div>

        {summary && (
          <div className="text-xs text-green-800">
            Summary: {summary.confirmed ?? 0} confirmed ·{" "}
            {summary.cancelled ?? 0} cancelled ·{" "}
            {summary.totalOrders ?? positions.length + skipped.length} total
          </div>
        )}

        {positions.length > 0 && (
          <div className="space-y-1 space-y-1  border border-green-200 bg-green-50/70 rounded-2xl p-2 text-sm text-green-800">
            <div className="text-xs font-semibold text-green-900">Swaps</div>
            <div className="space-y-1 max-h-44 overflow-y-auto pr-1">
              {positions.map((p, idx) => {
                const link = getTxLink(p.txHash);
                return (
                  <div
                    key={`${p.symbol || p.name || idx}-${idx}`}
                    className="flex items-center justify-between rounded-xl bg-white/70 border border-green-200/50 px-3 py-2"
                  >
                    <div className="min-w-0">
                      <div className="text-xs font-medium text-gray-900 truncate">
                        {p.symbol || p.name || `Token ${idx + 1}`}
                      </div>
                      <div className="text-[11px] text-gray-500">
                        {p.swapProvider ? `${p.swapProvider} · ` : ""}
                        {p.executionStatus || "—"}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      {p.allocationUsd != null && (
                        <div className="text-xs font-medium text-gray-900">
                          ${Number(p.allocationUsd).toFixed(2)}
                        </div>
                      )}
                      {link && (
                        <a
                          className="text-[11px] text-blue-700 underline hover:no-underline"
                          href={link}
                          target="_blank"
                          rel="noreferrer"
                        >
                          View tx
                        </a>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {skipped.length > 0 && (
          <div className="space-y-1 bg-amber-100 p-2 rounded-2xl">
            <div className="text-xs font-semibold text-orange-900">Skipped</div>
            <div className="space-y-1">
              {skipped.map((s, idx) => (
                <div
                  key={`${s.symbol || idx}-${idx}`}
                  className="flex items-center justify-between rounded-xl bg-white/60 border border-orange-200/50 px-3 py-2"
                >
                  <div className="text-xs font-medium text-gray-900">
                    {s.symbol || "Unknown"}
                  </div>
                  <div className="text-[11px] text-gray-600">
                    {s.reason || "Skipped"}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        <div className="flex gap-2">
          <NavLink
            to={`/portfolio?portfolio=${portfolio?.id}`}
            className="px-3 py-2 bg-white/80 border border-gray-200 rounded-xl text-xs font-medium hover:bg-white hover:border-gray-300 hover:shadow-md transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            View Portfolio
          </NavLink>
          <button
            onClick={() => {
              handleSuggestionClick(
                lastBuildMode === "quick"
                  ? "Build Quick Portfolio"
                  : "Build a Portfolio",
              );
            }}
            className="px-3 py-2 bg-white/80 border border-gray-200 rounded-xl text-xs font-medium hover:bg-white hover:border-gray-300 hover:shadow-md transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            Create another portfolio
          </button>
          {safeOptions.length > 0 && (
            <div className="border-t border-green-200/60">
              <div className="flex flex-wrap gap-2">
                {safeOptions.map((option, index) => (
                  <button
                    key={`${option.action}-${option.value}-${index}`}
                    onClick={() => handleOptionClick(option)}
                    disabled={isReadOnly}
                    className="px-3 py-2 bg-white/80 border border-gray-200 rounded-xl text-xs font-medium hover:bg-white hover:border-gray-300 hover:shadow-md transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {option.label || option.value || option.action}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderPaperPortfolioCreated = (portfolio, options) => {
    if (!portfolio || typeof portfolio !== "object") return null;
    const positions = Array.isArray(portfolio.positions)
      ? portfolio.positions
      : [];
    const portfolioId = portfolio.id || portfolio.portfolioId || null;
    const safeOptions = Array.isArray(options) ? options : [];

    return (
      <div className="mt-3 border border-gray-200 bg-white/80 shadow-sm p-4 rounded-2xl space-y-3">
        <div className="flex items-start justify-center gap-3">
          <div className="p-6 text-center">
            <div className="mx-auto w-14 h-14 rounded-full bg-green-100 border border-green-200 flex items-center justify-center">
              <CheckCircle2 className="w-7 h-7 text-green-600" />
            </div>
            <div className="mt-1 text-xl font-bold text-gray-900">
              Portfolio Created!
            </div>
            {/* <div className="mt-1 text-sm text-gray-600">
            {summary?.confirmed != null
              ? `All ${summary.confirmed} transactions confirmed`
              : positions.length > 0
                ? `All ${positions.length} transactions confirmed`
                : "Transactions confirmed"}
          </div> */}
            {portfolio.totalInvestment != null && (
              <div className="mt-2 text-3xl font-bold text-gray-900">
                ${Number(portfolio.totalInvestment).toFixed(2)}
              </div>
            )}
          </div>
          {/* {typeof portfolio.totalTokens === "number" && (
            <div className="text-right shrink-0 flex gap-2 items-center">
              <div className="text-xs text-green-700">Tokens</div>
              <div className="font-semibold text-green-900">
                {portfolio.totalTokens}
              </div>
            </div>
          )} */}
        </div>

        {positions.length > 0 && (
          <div className="space-y-1 space-y-1  border border-green-200 bg-green-50/70 rounded-2xl p-2 text-sm text-green-800">
            <div className="text-xs font-semibold text-green-900">
              Positions
            </div>
            <div className="space-y-1 max-h-56 overflow-y-auto pr-1">
              {positions.map((p, idx) => (
                <div
                  key={`${p.tokenId || p.symbol || idx}-${idx}`}
                  className="flex items-center justify-between rounded-xl bg-white/70 border border-green-200/50 px-3 py-2 gap-3"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    {p.logo ? (
                      <img
                        src={p.logo}
                        alt={p.symbol || p.name || "token"}
                        className="w-7 h-7 rounded-full bg-white border border-gray-200"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-7 h-7 rounded-full bg-gray-200 border border-gray-200" />
                    )}
                    <div className="min-w-0">
                      <div className="text-xs font-medium text-gray-900 truncate">
                        {p.symbol || p.name || `Token ${idx + 1}`}
                      </div>
                      <div className="text-[11px] text-gray-500 truncate">
                        {p.narrative ? `${p.narrative} · ` : ""}
                        {p.riskProfile || ""}
                      </div>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    {p.allocationUsd != null && (
                      <div className="text-xs font-medium text-gray-900">
                        ${Number(p.allocationUsd).toFixed(2)}
                      </div>
                    )}
                    {p.tokenAmount != null && p.entryPriceUsd != null && (
                      <div className="text-[11px] text-gray-500">
                        {Number(p.tokenAmount).toFixed(4)} @ $
                        {Number(p.entryPriceUsd).toFixed(4)}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {safeOptions.length > 0 && (
          <div className="pt-2 border-t border-green-200/60">
            <div className="flex flex-wrap gap-2">
              {safeOptions.map((option, index) => (
                <button
                  key={`${option.action}-${option.value}-${index}`}
                  onClick={() => handleOptionClick(option)}
                  disabled={isReadOnly}
                  className="px-3 py-2 bg-white/80 border border-gray-200 rounded-xl text-xs font-medium hover:bg-white hover:border-gray-300 hover:shadow-md transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {option.label || option.value || option.action}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="flex gap-2 pt-2">
          <NavLink
            to={`/portfolio?portfolio=${portfolio?.id}`}
            className="px-3 py-2 bg-white/80 border border-gray-200 rounded-xl text-xs font-medium hover:bg-white hover:border-gray-300 hover:shadow-md transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            View Portfolio
          </NavLink>
          <button
            type="button"
            onClick={() => {
              handleSuggestionClick(
                lastBuildMode === "quick"
                  ? "Build Quick Portfolio"
                  : "Build a Portfolio",
              );
            }}
            className="px-3 py-2 bg-white/80 border border-gray-200 rounded-xl text-xs font-medium hover:bg-white hover:border-gray-300 hover:shadow-md transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            Create another portfolio
          </button>
        </div>
      </div>
    );
  };

  // Parse token list line. Supports:
  // - Pipe format: "1. **LINK** (Chainlink): $8.84 USD | MC: $6.26B | Vol: $535M (DeFi)"
  // - Comma format: "1. **LINK** (Chainlink, Ethereum): $9.11 USD, Market Cap: $6.45B, 24h Vol: $567M" with optional "24h Change: +1.5%"
  // - Compact DeFi format: "1. **STABLE** ($0.0278, MC: $573M, Vol: $1.03B)"
  const parseTokenListLine = (line) => {
    // Comma format without colons:
    // "1. **LINK (Chainlink)**: $9.84, Market Cap $6.96B, 24h Vol $919M"
    // or "1. **LINK (Chainlink)**: $9.84 USD, Market Cap $6.96B, 24h Vol $919M"
    let match = line.match(
      /^(\d+)\.\s+\*\*([A-Z0-9]+)\s*\(([^)]+)\)\*\*:\s*\$?([\d,.]+)\s*(?:USD)?[,]?\s*Market Cap\s*:?\s*\$?([\d.]+[BMK]?)[,]?\s*24h Vol\s*:?\s*\$?([\d.]+[BMK]?)/i,
    );
    if (match) {
      return {
        rank: match[1],
        ticker: match[2],
        nameChain: match[3],
        price: match[4],
        marketCap: match[5],
        vol24h: match[6],
        change24h: null,
      };
    }
    // Pipe format (MC:, Vol:, optional narrative at end)
    match = line.match(
      /^(\d+)\.\s+\*\*([A-Z0-9]+)\*\*\s*\(([^)]+)\):\s*\$?([\d,.]+)\s*(?:USD)?\s*\|\s*MC:\s*\$?([\d.]+[BMK]?)\s*\|\s*Vol:\s*\$?([\d.]+[BMK]?)(?:\s*\([^)]*\))?\s*$/i,
    );
    if (match) {
      return {
        rank: match[1],
        ticker: match[2],
        nameChain: match[3],
        price: match[4],
        marketCap: match[5],
        vol24h: match[6],
        change24h: match[7],
      };
    }
    // Comma format (Market Cap:, 24h Vol:, optional 24h Change)
    match = line.match(
      /^(\d+)\.\s+\*\*([A-Z0-9]+)\*\*\s*\(([^)]+)\):\s*\$?([\d,.]+)\s*(?:USD)?[,]?\s*Market Cap:\s*\$?([\d.]+[BMK]?)[,]?\s*24h Vol:\s*\$?([\d.]+[BMK]?)(?:[,]?\s*(?:24h )?Change:\s*([+-]?[\d.]+)%?)?/i,
    );
    if (match) {
      return {
        rank: match[1],
        ticker: match[2],
        nameChain: match[3],
        price: match[4],
        marketCap: match[5],
        vol24h: match[6],
        change24h: match[7] != null ? parseFloat(match[7]) : null,
      };
    }
    // Compact DeFi format with price/MC/Vol only
    match = line.match(
      /^(\d+)\.\s+\*\*([A-Z0-9]+)\*\*\s*\(\$?([\d,.]+)\s*,\s*MC:\s*\$?([\d.]+[BMK]?)\s*,\s*Vol:\s*\$?([\d.]+[BMK]?)\)\s*$/i,
    );
    if (match) {
      return {
        rank: match[1],
        ticker: match[2],
        nameChain: null,
        price: match[3],
        marketCap: match[4],
        vol24h: match[5],
        change24h: null,
      };
    }
    return null;
  };

  // Parse token comparison bullet: "- **RENDER** (Render): $1.47 USD | MC: $765M | Vol: $43M | Change: +13.15%"
  const parseTokenCompareLine = (line) => {
    const trimmed = line.trim().replace(/^[-•]\s*/, "");
    const match = trimmed.match(
      /^\*\*([A-Z0-9]+)\*\*\s*\(([^)]+)\):\s*\$?([\d,.]+)\s*USD\s*\|\s*MC:\s*\$?([\d.]+[BMK]?)\s*\|\s*Vol:\s*\$?([\d.]+[BMK]?)\s*\|\s*Change:\s*([+-][\d.]+)%\s*$/i,
    );
    if (!match) return null;
    return {
      ticker: match[1],
      name: match[2].trim(),
      price: match[3],
      marketCap: match[4],
      vol: match[5],
      change: match[6],
    };
  };

  // Parse portfolio token line: "LINK (defi): $20.00 / 2.170597 tokens at $9.2141"
  const parsePortfolioTokenLine = (line) => {
    const trimmed = line.trim();
    const match = trimmed.match(
      /^([A-Z0-9]+)\s*\(([^)]+)\):\s*\$?([\d.,]+)\s*\/\s*([\d.,]+)\s*tokens?\s+at\s+\$?([\d.,]+)/i,
    );
    if (!match) return null;
    return {
      ticker: match[1],
      category: match[2],
      allocation: match[3],
      quantity: match[4],
      price: match[5],
    };
  };

  // Parse "core narratives" bullet: "- **AI**: Decentralized AI (RENDER; +152% 7d/+134% 24h—top performer)."
  const parseCoreNarrativeLine = (line) => {
    const trimmed = line.trim().replace(/^[-•]\s*/, "");
    const match = trimmed.match(/^\*\*([^*]+)\*\*:\s*(.+)$/);
    if (!match) return null;
    const name = match[1].trim();
    const description = match[2].trim();
    const pct7d = description.match(/([+-][\d.]+%)\s*7d/)?.[1] ?? null;
    const pct24h = description.match(/([+-][\d.]+%)\s*24h/)?.[1] ?? null;
    return { name, description, pct7d, pct24h };
  };

  // Parse narrative performance line: "- **AI** (192 tokens): +133.86% | MC: $5.91B | Vol: $953M | MEDIUM"
  const parseNarrativeListLine = (line) => {
    const trimmed = line.trim().replace(/^[-•]\s*/, "");
    const match = trimmed.match(
      /^\*\*([^*]+)\*\*\s*\(([^)]+)\):\s*([+-][\d.]+%)\s*\|\s*MC:\s*\$?([\d.]+[BMK]?)\s*\|\s*Vol:\s*\$?([\d.]+[BMK]?)\s*\|\s*(.+)$/i,
    );
    if (!match) return null;
    return {
      name: match[1].trim(),
      description: match[2].trim(),
      changePct: match[3],
      marketCap: match[4],
      vol: match[5],
      risk: match[6].trim(),
    };
  };

  const parseMarkdownTable = (tableLines) => {
    const rows = tableLines
      .map((line) =>
        line
          .split("|")
          .map((cell) => cell.trim())
          .filter((_, i, arr) => i > 0 && i < arr.length - 1),
      )
      .filter((cells) => cells.some((c) => c.length > 0));
    const isSeparator = (cells) => cells.every((c) => /^[-:\s]+$/.test(c));

    const separatorIndex = rows.findIndex(isSeparator);
    const bodyRows =
      separatorIndex >= 0 ? rows.slice(separatorIndex + 1) : rows.slice(1);
    const headers = separatorIndex >= 0 ? rows[0] : null;
    return { headers, bodyRows };
  };

  const renderFormattedMessage = (text) => {
    if (typeof text !== "string") return text;

    const lines = text.split("\n");
    const blocks = [];
    let bulletItems = [];
    let i = 0;

    const pushBullets = () => {
      if (bulletItems.length === 0) return;
      blocks.push(
        <ul
          key={`list-${blocks.length}`}
          className="list-disc pl-5 space-y-1 text-sm"
        >
          {bulletItems.map((item, index) => (
            <li key={`item-${index}`}>{item}</li>
          ))}
        </ul>,
      );
      bulletItems = [];
    };

    const renderInlineBold = (line) => {
      const parts = line.split("**");
      if (parts.length === 1) return line;
      return parts.map((part, index) =>
        index % 2 === 1 ? <strong key={index}>{part}</strong> : part,
      );
    };

    const normalizeTokenSymbol = (value) =>
      String(value || "")
        .replace(/\*\*/g, "")
        .replace(/\([^)]*\)/g, "")
        .replace(/[^a-zA-Z0-9]/g, "")
        .trim()
        .toUpperCase();

    const getTokenRowExecutionUi = (ticker) => {
      const symbol = String(ticker || "").toUpperCase();
      const currentSymbol = String(
        executionState.currentSymbol || "",
      ).toUpperCase();
      const status = executionState.tokenStatuses?.[symbol];
      const isProcessing = currentSymbol && currentSymbol === symbol;

      if (isProcessing || status === "processing") {
        return {
          rowClass:
            "bg-blue-100 border-y border-blue-200/80 hover:bg-blue-100/60 transition-colors",
          leftIcon: (
            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 border border-blue-200">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600" />
            </span>
          ),
          rightLabel: "Processing",
          rightLabelClass:
            "text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 px-2.5 py-1 rounded-full",
        };
      }
      if (status === "success") {
        return {
          rowClass:
            "bg-green-100 border-y border-green-200/80 hover:bg-green-100/60 transition-colors",
          leftIcon: (
            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-green-100 border border-green-200">
              <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />
            </span>
          ),
          rightLabel: "Done",
          rightLabelClass:
            "text-xs font-semibold text-green-700 bg-green-50 border border-green-200 px-2.5 py-1 rounded-full",
        };
      }
      if (status === "skipped") {
        return {
          rowClass:
            "bg-amber-100 border-y border-amber-200/90 hover:bg-amber-100/60 transition-colors",
          leftIcon: (
            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-100 border border-amber-200">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
            </span>
          ),
          rightLabel: "Skipped",
          rightLabelClass:
            "text-xs font-semibold text-amber-800 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-full",
        };
      }

      return {
        rowClass: "border-b border-gray-100 last:border-0 hover:bg-gray-50/50",
        leftIcon: (
          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-gray-100 border border-gray-200">
            <span className="w-2.5 h-2.5 rounded-full bg-gray-400" />
          </span>
        ),
        rightLabel: "Pending",
        rightLabelClass:
          "text-xs font-semibold text-gray-600 bg-gray-50 border border-gray-200 px-2.5 py-1 rounded-full",
      };
    };

    // Split content by ±X% (optional " 7d" or " 24h") and render green (+) / red (-); text parts get renderInlineBold
    // Handles: "+152% 7d", "+134% 24h", "-2% 7d", "+65% 7d" (core narratives format) and plain "+12.5%"
    const renderWithPercentageColors = (content) => {
      const percentageRegex = /([+-][\d.]+%(?:\s*(?:7d|24h))?)/g;
      const parts = content.split(percentageRegex);
      if (parts.length === 1) return renderInlineBold(content);
      return parts.map((part, index) => {
        if (index % 2 === 1) {
          const isPositive = part.startsWith("+");
          return (
            <span
              key={index}
              className={
                isPositive
                  ? "text-green-600 font-medium"
                  : "text-red-600 font-medium"
              }
            >
              {part}
            </span>
          );
        }
        return renderInlineBold(part);
      });
    };

    // Render bullet content; color "Change: ±X%" green/red when it appears (with or without "| " prefix, or as full line "**Change**: ±X%")
    const renderBulletContent = (content) => {
      // Narrative line: "**AI** (192 tokens): +152.78% | MC: ..." or "**Gaming**" (no stats)
      const narrativeMatch = content.match(
        /^(\*\*[^*]+\*\*(?:\s*\([^)]*\))?):\s*([+-][\d.]+%)(.*)$/,
      );
      if (narrativeMatch) {
        const [, labelPart, pct, rest] = narrativeMatch;
        const isPositive = pct.startsWith("+");
        return (
          <>
            {renderInlineBold(labelPart)}:{" "}
            <span
              className={
                isPositive
                  ? "text-green-600 font-semibold"
                  : "text-red-600 font-semibold"
              }
            >
              {pct}
            </span>
            {rest ? renderInlineBold(rest) : null}
          </>
        );
      }
      // Full line: "**Change**: -0.3%" or "**24h Change**: +0.45%"
      let changeMatch = content.match(
        /^\*\*((?:24h |7d )?Change)\*\*:\s*([+-]?[\d.]+)%/,
      );
      if (changeMatch) {
        const value = parseFloat(changeMatch[2]);
        const isPositive = value >= 0;
        return (
          <>
            <strong>{changeMatch[1]}</strong>:{" "}
            <span
              className={
                isPositive
                  ? "text-green-600 font-medium"
                  : "text-red-600 font-medium"
              }
            >
              {changeMatch[2]}%
            </span>
          </>
        );
      }
      // Inline: "... | 24h Vol: $279M | Change: -0.3%" anywhere in the line
      changeMatch = content.match(
        /\|\s*((?:24h |7d )?Change):\s*([+-]?[\d.]+)%/,
      );
      if (changeMatch) {
        const prefix = content.slice(0, content.indexOf(changeMatch[0]));
        const label = changeMatch[1];
        const valueStr = changeMatch[2];
        const value = parseFloat(valueStr);
        const isPositive = value >= 0;
        return (
          <>
            {renderInlineBold(prefix)}
            {" | "}
            {label}:{" "}
            <span
              className={
                isPositive
                  ? "text-green-600 font-medium"
                  : "text-red-600 font-medium"
              }
            >
              {valueStr}%
            </span>
          </>
        );
      }
      return renderWithPercentageColors(content);
    };

    while (i < lines.length) {
      const line = lines[i];
      const trimmed = line.trim();
      // Token list block: consecutive lines matching "N. **TICKER** (Name): $X USD | MC: $Y | Vol: $Z" or comma format
      const tokenEntries = [];
      let j = i;
      while (j < lines.length) {
        const parsed = parseTokenListLine(lines[j].trim());
        if (parsed) {
          tokenEntries.push(parsed);
          j++;
        } else break;
      }
      if (tokenEntries.length > 0) {
        pushBullets();
        const hasChange = tokenEntries.some((e) => e.change24h != null);
        const gridCols = hasChange
          ? "grid-cols-[auto_1fr_auto_auto_auto_auto]"
          : "grid-cols-5";
        blocks.push(
          <div
            key={`token-list-${blocks.length}`}
            className="my-4 rounded-xl border  bg-gradient-to-br from-blue-50/80 to-purple-50/80 border border-blue-200/50 shadow-sm overflow-hidden"
          >
            <div
              className={`grid ${gridCols} gap-x-4 gap-y-0 px-4 py-2.5 border-b border-gray-200 bg-gray-50/80 text-xs font-semibold text-gray-600 uppercase tracking-wide items-center`}
            >
              <span className="w-6">Rank</span>
              <span>Token</span>
              <span className="text-right">Price</span>
              <span className="text-right">MC</span>
              <span className="text-right">24h Vol</span>
              {hasChange && <span className="text-right">24h %</span>}
            </div>
            {tokenEntries.map((entry, idx) => {
              const rowUi = getTokenRowExecutionUi(entry.ticker);
              return (
                <div
                  key={idx}
                  className={`grid ${gridCols} gap-x-4 gap-y-0 px-4 py-2.5 items-center text-sm ${rowUi.rowClass}`}
                >
                  <span className="w-6 font-semibold text-gray-500">
                    {entry.rank}.
                  </span>
                  <div className="min-w-0 flex items-center justify-between gap-3">
                    <div className="min-w-0 flex flex-col">
                      <span className="font-bold text-gray-900 flex items-center gap-2 min-w-0">
                        {rowUi.leftIcon}
                        <span className="truncate">{entry.ticker}</span>
                      </span>
                      {entry.nameChain && (
                        <span className="text-gray-500 text-xs ml-8 truncate">
                          ({entry.nameChain})
                        </span>
                      )}
                    </div>
                    {/* <span className={rowUi.rightLabelClass}>
                      {rowUi.rightLabel}
                    </span> */}
                  </div>
                  <span className="text-right font-medium text-gray-900">
                    ${entry.price} USD
                  </span>
                  <span className="text-right font-medium text-gray-800">
                    {entry.marketCap}
                  </span>
                  <span className="text-right font-medium text-gray-800">
                    {entry.vol24h}
                  </span>
                  {hasChange && (
                    <span
                      className={`text-right font-medium ${
                        entry.change24h != null
                          ? Number(entry.change24h) >= 0
                            ? "text-green-600"
                            : "text-red-600"
                          : "text-gray-400"
                      }`}
                    >
                      {entry.change24h != null
                        ? `${Number(entry.change24h) >= 0 ? "+" : ""}${entry.change24h}%`
                        : "—"}
                    </span>
                  )}
                </div>
              );
            })}
          </div>,
        );
        i = j;
        continue;
      }

      // Narrative performance block: consecutive bullet lines "- **AI** (192 tokens): +133.86% | MC: $5.91B | Vol: $953M | MEDIUM"
      const narrativeEntries = [];
      let jNarr = i;
      while (jNarr < lines.length) {
        const t = lines[jNarr].trim();
        if (!t.startsWith("- ") && !t.startsWith("• ")) break;
        const parsed = parseNarrativeListLine(lines[jNarr]);
        if (!parsed) break;
        narrativeEntries.push(parsed);
        jNarr++;
      }
      if (narrativeEntries.length > 0) {
        pushBullets();
        blocks.push(
          <div
            key={`narrative-table-${blocks.length}`}
            className="my-4 rounded-xl border border-gray-200 bg-white/80 shadow-sm overflow-hidden"
          >
            <div className="overflow-x-auto">
              <table className="w-full min-w-[480px] text-sm bg-gradient-to-br from-blue-50/80 to-purple-50/80 border border-blue-200/50">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50/80">
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">
                      Narrative
                    </th>
                    <th className="px-4 py-3 text-right font-semibold text-gray-700">
                      7d %
                    </th>
                    <th className="px-4 py-3 text-right font-semibold text-gray-700">
                      MC
                    </th>
                    <th className="px-4 py-3 text-right font-semibold text-gray-700">
                      Vol
                    </th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">
                      Risk
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {narrativeEntries.map((entry, idx) => (
                    <tr
                      key={idx}
                      className="border-b border-gray-100 last:border-0 hover:bg-gray-50/50"
                    >
                      <td className="px-4 py-2.5">
                        <span className="font-bold text-gray-900">
                          {entry.name}
                        </span>
                        <span className="text-gray-500 text-xs ml-1">
                          ({entry.description})
                        </span>
                      </td>
                      <td
                        className={`text-right font-semibold ${
                          entry.changePct.startsWith("+")
                            ? "text-green-600"
                            : "text-red-600"
                        }`}
                      >
                        {entry.changePct}
                      </td>
                      <td className="text-right font-medium text-gray-800">
                        ${entry.marketCap}
                      </td>
                      <td className="text-right font-medium text-gray-800">
                        ${entry.vol}
                      </td>
                      <td className="px-4 py-2.5 font-medium text-gray-700">
                        {entry.risk.replace(/_/g, " ")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>,
        );
        i = jNarr;
        continue;
      }

      // Token comparison block: "- **RENDER** (Render): $1.47 USD | MC: $765M | Vol: $43M | Change: +13.15%" + optional "  (description)"
      const tokenCompareEntries = [];
      let jCompare = i;
      while (jCompare < lines.length) {
        const t = lines[jCompare].trim();
        if (!t.startsWith("- ") && !t.startsWith("• ")) break;
        const parsed = parseTokenCompareLine(lines[jCompare]);
        if (!parsed) break;
        const entry = { ...parsed, description: null };
        jCompare++;
        const descLine =
          jCompare < lines.length
            ? lines[jCompare].match(/^\s*\(([^)]+)\)\.?\s*$/)
            : null;
        if (descLine) {
          entry.description = descLine[1].trim();
          jCompare++;
        }
        tokenCompareEntries.push(entry);
      }
      if (tokenCompareEntries.length > 0) {
        pushBullets();
        blocks.push(
          <div
            key={`token-compare-table-${blocks.length}`}
            className="my-4 rounded-xl  bg-gradient-to-br from-blue-50/80 to-purple-50/80 border border-blue-200/50 shadow-sm overflow-hidden"
          >
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-sm">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50/80">
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">
                      Token
                    </th>
                    <th className="px-4 py-3 text-right font-semibold text-gray-700">
                      Price
                    </th>
                    <th className="px-4 py-3 text-right font-semibold text-gray-700">
                      MC
                    </th>
                    <th className="px-4 py-3 text-right font-semibold text-gray-700">
                      Vol
                    </th>
                    <th className="px-4 py-3 text-right font-semibold text-gray-700">
                      Change
                    </th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">
                      Description
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {tokenCompareEntries.map((entry, idx) => (
                    <tr
                      key={idx}
                      className="border-b border-gray-100 last:border-0 hover:bg-gray-50/50"
                    >
                      <td className="px-4 py-2.5">
                        <span className="font-bold text-gray-900">
                          {entry.ticker}
                        </span>
                        <span className="text-gray-500 text-xs ml-1">
                          ({entry.name})
                        </span>
                      </td>
                      <td className="text-right font-medium text-gray-900">
                        ${entry.price} USD
                      </td>
                      <td className="text-right font-medium text-gray-800">
                        ${entry.marketCap}
                      </td>
                      <td className="text-right font-medium text-gray-800">
                        {entry.vol}
                      </td>
                      <td
                        className={`text-right font-semibold ${
                          entry.change.startsWith("+")
                            ? "text-green-600"
                            : "text-red-600"
                        }`}
                      >
                        {entry.change}%
                      </td>
                      <td className="px-4 py-2.5 text-gray-600 text-xs">
                        {entry.description ?? "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>,
        );
        i = jCompare;
        continue;
      }

      // Core narratives block: "- **AI**: Decentralized AI (RENDER; +152% 7d/+134% 24h—top performer)."
      const coreNarrativeEntries = [];
      let jCore = i;
      while (jCore < lines.length) {
        const t = lines[jCore].trim();
        if (!t.startsWith("- ") && !t.startsWith("• ")) break;
        const parsed = parseCoreNarrativeLine(lines[jCore]);
        if (!parsed) break;
        coreNarrativeEntries.push(parsed);
        jCore++;
      }
      if (coreNarrativeEntries.length > 0) {
        pushBullets();
        blocks.push(
          <div
            key={`core-narrative-table-${blocks.length}`}
            className="my-4 rounded-xl  bg-gradient-to-br from-blue-50/80 to-purple-50/80 border border-blue-200/50 shadow-sm overflow-hidden"
          >
            <div className="overflow-x-auto">
              <table className="w-full min-w-[520px] text-sm">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50/80">
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">
                      Narrative
                    </th>
                    <th className="px-4 py-3 text-right font-semibold text-gray-700 w-20">
                      7d
                    </th>
                    <th className="px-4 py-3 text-right font-semibold text-gray-700 w-20">
                      24h
                    </th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">
                      Description
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {coreNarrativeEntries.map((entry, idx) => (
                    <tr
                      key={idx}
                      className="border-b border-gray-100 last:border-0 hover:bg-gray-50/50"
                    >
                      <td className="px-4 py-2.5 font-bold text-gray-900 align-top">
                        {entry.name}
                      </td>
                      <td className="px-4 py-2.5 text-right align-top">
                        {entry.pct7d != null ? (
                          <span
                            className={
                              entry.pct7d.startsWith("+")
                                ? "text-green-600 font-semibold"
                                : "text-red-600 font-semibold"
                            }
                          >
                            {entry.pct7d}
                          </span>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-right align-top">
                        {entry.pct24h != null ? (
                          <span
                            className={
                              entry.pct24h.startsWith("+")
                                ? "text-green-600 font-semibold"
                                : "text-red-600 font-semibold"
                            }
                          >
                            {entry.pct24h}
                          </span>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-gray-700 align-top">
                        {renderWithPercentageColors(entry.description)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>,
        );
        i = jCore;
        continue;
      }

      // Portfolio tokens block inside "Tokens (N):" section
      if (/^Tokens\s*\(\d+\):/i.test(trimmed)) {
        const portfolioTokenEntries = [];
        let jPort = i + 1;
        while (jPort < lines.length) {
          const parsed = parsePortfolioTokenLine(lines[jPort]);
          if (!parsed) break;
          portfolioTokenEntries.push(parsed);
          jPort += 1;
        }
        if (portfolioTokenEntries.length > 0) {
          pushBullets();
          blocks.push(
            <div
              key={`portfolio-tokens-${blocks.length}`}
              className="my-4 rounded-xl border border-gray-200 bg-white/80 shadow-sm overflow-hidden"
            >
              <div className="overflow-x-auto">
                <table className="w-full min-w-[480px] text-sm bg-gradient-to-br from-blue-50/80 to-purple-50/80 border border-blue-200/50">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50/80">
                      <th className="px-4 py-3 text-left font-semibold text-gray-700">
                        Token
                      </th>
                      <th className="px-4 py-3 text-right font-semibold text-gray-700">
                        Allocation
                      </th>
                      <th className="px-4 py-3 text-right font-semibold text-gray-700">
                        Quantity
                      </th>
                      <th className="px-4 py-3 text-right font-semibold text-gray-700">
                        Price
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {portfolioTokenEntries.map((entry, idx) => (
                      <tr
                        key={idx}
                        className="border-b border-gray-100 last:border-0 hover:bg-gray-50/50"
                      >
                        <td className="px-4 py-2.5">
                          <span className="font-bold text-gray-900">
                            {entry.ticker}
                          </span>
                          <span className="text-gray-500 text-xs ml-1">
                            {/* ({entry.category}) */}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-right font-medium text-gray-900">
                          ${entry.allocation}
                        </td>
                        <td className="px-4 py-2.5 text-right font-medium text-gray-800">
                          {getFormattedNumber(entry.quantity)}
                        </td>
                        <td className="px-4 py-2.5 text-right font-medium text-gray-800">
                          ${entry.price}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>,
          );
          i = jPort;
          continue;
        }
      }

      if (trimmed.startsWith("|") && trimmed.endsWith("|")) {
        const tableLines = [line];
        i += 1;
        while (i < lines.length && lines[i].trim().includes("|")) {
          tableLines.push(lines[i]);
          i += 1;
        }
        const { headers, bodyRows } = parseMarkdownTable(tableLines);
        if (headers?.length && bodyRows.length) {
          const tokenColumnIndex = headers.findIndex((h) =>
            /^token$/i.test(String(h || "").trim()),
          );
          blocks.push(
            <div
              key={`table-${blocks.length}`}
              className="my-4 overflow-x-auto rounded-xl border border-gray-200 bg-white/80 shadow-sm"
            >
              <table className="w-full min-w-[400px] text-sm bg-gradient-to-br from-blue-50/80 to-purple-50/80 border border-blue-200/50">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50/80">
                    {headers.map((h, hi) => (
                      <th
                        key={hi}
                        className="px-4 py-3 text-left font-semibold text-gray-700"
                      >
                        {renderInlineBold(h)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {bodyRows.map((row, ri) => {
                    const tokenCell =
                      tokenColumnIndex >= 0 ? row[tokenColumnIndex] : null;
                    const tokenSymbol = normalizeTokenSymbol(tokenCell);
                    const rowUi =
                      tokenColumnIndex >= 0 && tokenSymbol
                        ? getTokenRowExecutionUi(tokenSymbol)
                        : null;
                    const rowClass =
                      rowUi?.rowClass ||
                      "border-b border-gray-100 last:border-0 hover:bg-gray-50/50";

                    return (
                      <tr key={ri} className={rowClass}>
                        {row.map((cell, ci) => (
                          <td key={ci} className="px-4 py-2.5 text-gray-800">
                            {ci === tokenColumnIndex && rowUi ? (
                              <div className="flex items-center justify-between gap-3">
                                <span className="inline-flex items-center gap-2 min-w-0">
                                  {rowUi.leftIcon}
                                  <span className="truncate">
                                    {renderInlineBold(cell)}
                                  </span>
                                </span>
                                {/* <span className={rowUi.rightLabelClass}>
                                  {rowUi.rightLabel}
                                </span> */}
                              </div>
                            ) : (
                              renderInlineBold(cell)
                            )}
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>,
          );
        }
        continue;
      }

      const isBullet = trimmed.startsWith("- ") || trimmed.startsWith("• ");
      if (isBullet) {
        const content = trimmed.replace(/^[-•]\s*/, "");
        bulletItems.push(renderBulletContent(content));
        i += 1;
        continue;
      }

      pushBullets();
      if (trimmed === "") {
        blocks.push(<div key={`spacer-${blocks.length}`} className="h-2" />);
        i += 1;
        continue;
      }

      if (
        trimmed.startsWith("**") &&
        trimmed.endsWith("**") &&
        trimmed.length > 4
      ) {
        blocks.push(
          <p
            key={`heading-${blocks.length}`}
            className="text-sm font-semibold text-gray-900 mt-3 first:mt-0"
          >
            {renderInlineBold(trimmed)}
          </p>,
        );
      } else {
        blocks.push(
          <p key={`line-${blocks.length}`} className="text-sm">
            {renderInlineBold(line)}
          </p>,
        );
      }
      i += 1;
    }

    pushBullets();
    return <div className="space-y-2">{blocks}</div>;
  };

  return (
    <div className="flex-1 flex flex-col">
      <div className="flex-1 flex flex-col overflow-y-auto">
        {currentMessages.length === 0 && !quickWizardOpen && (
          <div className="h-full flex items-center justify-center px-6">
            <div className="text-center max-w-2xl">
              <h2 className="text-3xl font-bold mb-4">Hello, I'm AlloX</h2>

              <p className="text-gray-600 mb-8">
                I can help you discover, execute, and manage your portfolio.
              </p>

              <div className="flex flex-wrap gap-2 justify-center mb-8">
                {[
                  "Build Quick Portfolio",
                  "Build a Portfolio - Guided",

                  "Explain narratives",
                  "Trending Tokens",
                  "How should I invest $100?",
                  "Start guided chat",
                ].map((suggestion) => (
                  <button
                    key={suggestion}
                    onClick={() => handleSuggestionClick(suggestion)}
                    disabled={isReadOnly || messagesRemaining === 0}
                    className="px-4 py-2 bg-white shadow border border-white text-sm font-medium hover:bg-white/90 hover:shadow-lg hover:border hover:border-gray-200/50 transition-all duration-200 rounded-full disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:bg-white"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
      {isConnected && !isReadOnly && (
        <aside className="w-60 shrink-0 hidden lg:block fixed right-7">
          <div className="sticky top-24">
            <AnimatePresence initial={false}>
              {showRecentPortfoliosPanel && recentPortfolios.length > 0 && (
                <motion.div
                  key="recent-portfolios-card"
                  initial={{ opacity: 0, y: 10, height: 0 }}
                  animate={{ opacity: 1, y: 0, height: "auto" }}
                  exit={{ opacity: 0, y: -16, height: 0 }}
                  transition={{ duration: 0.24, ease: "easeInOut" }}
                  className="overflow-hidden"
                >
                  <div className="glass-card p-4 border border-gray-200/50 bg-white/40">
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <h3 className="text-sm font-bold text-gray-900">
                        Recent portfolios
                      </h3>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => setShowRecentPortfoliosPanel(false)}
                          className="p-1 rounded-lg hover:bg-black/5 text-gray-500"
                          aria-label="Hide recent portfolios"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    </div>

                    {recentPortfoliosLoading ? (
                      <div className="space-y-3">
                        {[0, 1, 2].map((i) => (
                          <div
                            key={i}
                            className="p-3 rounded-2xl border border-gray-200/60 bg-white/60 animate-pulse"
                          >
                            <div className="h-3 bg-gray-200/70 rounded w-2/3 mb-2" />
                            <div className="h-2 bg-gray-200/60 rounded w-4/5 mb-2" />
                            <div className="h-2 bg-gray-200/60 rounded w-1/2" />
                          </div>
                        ))}
                      </div>
                    ) : recentPortfolios.length > 0 ? (
                      <div className="space-y-3">
                        {recentPortfolios.map((p) => {
                          const pid = p?.id;
                          if (!pid) return null;
                          const name = p?.name || "Portfolio";
                          const displayId =
                            String(pid).length > 12
                              ? `${String(pid).slice(0, 6)}...${String(
                                  pid,
                                ).slice(-4)}`
                              : String(pid);
                          const totalValue =
                            p?.totalCurrentValue ??
                            p?.totalCurrentValueUsd ??
                            p?.totalValue;

                          return (
                            <button
                              key={String(pid)}
                              type="button"
                              disabled={messagesRemaining === 0}
                              onClick={() =>
                                sendChatMessage(
                                  `Tell me more details about my portfolio with ID: ${pid}`,
                                )
                              }
                              className="w-full text-left p-3 rounded-2xl border border-gray-200/60 bg-white/60 hover:bg-white/80 hover:border-gray-300 hover:shadow-md transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <div className="text-sm font-semibold text-gray-900 truncate">
                                    {name}
                                  </div>
                                  <div className="text-[11px] text-gray-600 mt-1 truncate">
                                    ID: {displayId}
                                  </div>
                                  {p?.riskProfile ? (
                                    <div className="text-[11px] text-gray-600 mt-1">
                                      Risk:{" "}
                                      {String(p.riskProfile).replace(/_/g, " ")}
                                    </div>
                                  ) : null}
                                </div>
                              </div>

                              {totalValue != null ? (
                                <div className="mt-2 text-xs text-gray-700">
                                  Value: {`$${Number(totalValue).toFixed(2)}`}
                                </div>
                              ) : null}
                            </button>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="text-xs text-gray-500">
                        No portfolios yet.
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="mt-3 glass-card p-4 border border-gray-200/50 bg-white/40">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-sm font-bold text-gray-900">
                  BNB Chain balances
                </h3>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setIsBalancesCollapsed((p) => !p)}
                    className="text-xs text-gray-500 hover:text-gray-700"
                    aria-label={
                      isBalancesCollapsed
                        ? "Expand balances"
                        : "Collapse balances"
                    }
                  >
                    {isBalancesCollapsed ? (
                      <ChevronDown className="w-4 h-4" />
                    ) : (
                      <ChevronUp className="w-4 h-4" />
                    )}
                  </button>
                  {!isBalancesCollapsed && (
                    <button
                      type="button"
                      onClick={() => void bscBalancesQuery.refetch()}
                      disabled={
                        !isConnected ||
                        isReadOnly ||
                        walletChainId !== 56 ||
                        bscBalancesQuery.isFetching
                      }
                      className="text-xs text-gray-500 hover:text-green-600 disabled:opacity-50"
                      aria-label="Refresh balances"
                    >
                      <RefreshCcw className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              {!isBalancesCollapsed && (
                <>
                  <div className="mb-3" />
                  {!isConnected ? (
                    <div className="text-xs text-gray-600">
                      Connect your wallet to view balances.
                    </div>
                  ) : walletChainId !== 56 ? (
                    <div className="text-xs text-gray-600">
                      Switch to BNB Chain to view BNB, USDT, and USDC balances.
                    </div>
                  ) : bscBalancesQuery.error ? (
                    <div className="text-xs text-red-600">
                      {bscBalancesQuery.error?.message ||
                        "Failed to load balances."}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {[
                        {
                          label: "BNB",
                          value: bscBalances.bnb,
                          usdPrice: bscBalances.bnbUsd,
                          icon: "https://cdn.allox.ai/allox/networks/bnbIcon.svg",
                        },
                        {
                          label: "USDT",
                          value: bscBalances.usdt,
                          usdPrice: bscBalances.usdtUsd,
                          icon: "https://cdn.allox.ai/allox/tokens/usdt.svg",
                        },
                        {
                          label: "USDC",
                          value: bscBalances.usdc,
                          usdPrice: bscBalances.usdcUsd,
                          icon: "https://cdn.allox.ai/allox/tokens/usdc.svg",
                        },
                      ].map((row) => (
                        <div
                          key={row.label}
                          className="flex items-center justify-between text-xs bg-white/60 border border-gray-200/60 rounded-xl px-3 py-2"
                        >
                          <div className="font-semibold text-gray-800 flex items-center gap-2">
                            <img src={row.icon} className="w-4 h-4" alt="" />{" "}
                            {row.label}
                          </div>
                          <div className="text-gray-900 tabular-nums">
                            {row.value != null && row.usdPrice != null && (
                              <div className="text-xs text-green-600 text-right">
                                {`$${(
                                  Number(row.value) * Number(row.usdPrice)
                                ).toLocaleString(undefined, {
                                  maximumFractionDigits: 2,
                                })}`}
                              </div>
                            )}
                            {row.value == null
                              ? "—"
                              : Number(row.value).toLocaleString(undefined, {
                                  maximumFractionDigits: 6,
                                })}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </aside>
      )}

      <div className="shrink-0 fixed left-0 w-full z-4 bottom-0 border-t border-gray-200/50 bg-pattern/95 backdrop-blur-lg">
        <div className="px-6 py-6 max-w-250 mx-auto w-full">
          {isReadOnly && (
            <div className="mb-4 glass-card p-4 border border-gray-200/50 bg-gray-50/50 flex items-center justify-between gap-4">
              <p className="text-sm text-gray-600">
                Viewing past conversation. You can’t send new messages here.
              </p>
              <button
                type="button"
                onClick={handleStartNewChat}
                className="btn-primary text-sm px-4 py-2 whitespace-nowrap"
              >
                Start new chat
              </button>
            </div>
          )}
          {showWalletPrompt && !isConnected && (
            <div className="mb-4 glass-card p-4 border border-blue-200/50 bg-blue-50/30">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <Wallet size={20} className="text-blue-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900 mb-1">
                    Connect wallet
                  </p>
                  <p className="text-xs text-gray-600">Required for AlloX</p>
                </div>
                <button
                  onClick={() => setWalletModalOpen(true)}
                  className="btn-primary text-sm px-4 py-2 whitespace-nowrap"
                >
                  Continue
                </button>
              </div>
            </div>
          )}
          {needsToClaimPoints && !isReadOnly && (
            <div className="mb-4 glass-card p-4 border border-amber-200/50 bg-amber-50/30">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <Gift size={20} className="text-amber-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900 mb-1">
                    Welcome Bonus
                  </p>
                  <p className="text-xs text-gray-600">
                    Claim your 5,000 Free Points
                  </p>
                </div>

                <button
                  onClick={() => setShowWelcomeGiftModal(true)}
                  className="btn-primary text-sm px-4 py-2 whitespace-nowrap"
                >
                  Claim
                </button>
              </div>
            </div>
          )}

          {onchainBlocked && !isReadOnly && (
            <div className="mb-4 glass-card p-4 border border-orange-200/50 bg-orange-50/30">
              <p className="text-sm text-gray-800 mb-3">
                {onchainBlocked.message}
              </p>
              {(onchainBlocked.balance != null ||
                onchainBlocked.requiredBalance != null) && (
                <p className="text-sm text-gray-700 mb-2">
                  Balance on supported chains: $
                  {Number(onchainBlocked.balance ?? 0).toFixed(2)} / $
                  {onchainBlocked.requiredBalance ?? 5} required.
                </p>
              )}
              {refreshOnchainMessage && (
                <p className="text-sm text-amber-800 mb-3">
                  {refreshOnchainMessage}
                </p>
              )}
              <button
                type="button"
                onClick={handleRefreshOnchain}
                disabled={refreshOnchainLoading}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl font-medium bg-gray-900 text-white hover:bg-gray-800 disabled:opacity-70 text-sm"
              >
                {refreshOnchainLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Refreshing...
                  </>
                ) : (
                  <>
                    <RefreshCw size={16} />
                    Refresh your on-chain activity
                  </>
                )}
              </button>
            </div>
          )}

          {messagesRemaining === 0 && !isReadOnly && (
            <div className="mb-4 glass-card p-4 border border-amber-200/50 bg-amber-50/30">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <Clock size={20} className="text-amber-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900 mb-1">
                    No messages left in your current limit
                  </p>
                  <p className="text-xs text-gray-600">
                    {resetAt
                      ? `Resets ${formatResetAt(resetAt)}.`
                      : "Try again later."}
                  </p>
                </div>
                {canRefresh && (
                  <button
                    type="button"
                    onClick={handleRefreshLimit}
                    disabled={statusLoading}
                    className="btn-primary text-sm px-4 py-2 whitespace-nowrap"
                  >
                    {statusLoading ? "Checking…" : "Refresh limit"}
                  </button>
                )}
              </div>
            </div>
          )}

          <>
            <div className="relative">
              <input
                type="text"
                value={message}
                onChange={(e) =>
                  !isReadOnly &&
                  (messagesRemaining == null || messagesRemaining > 0) &&
                  dispatch(setMessage(e.target.value))
                }
                onKeyDown={handleInputKeyDown}
                placeholder={
                  isReadOnly
                    ? "This conversation is read-only"
                    : messagesRemaining === 0
                      ? "Message limit reached"
                      : "Type your intent..."
                }
                disabled={
                  isReadOnly ||
                  (messagesRemaining !== null && messagesRemaining <= 0)
                }
                className="w-full px-6 py-4 pr-28 bg-white/60 backdrop-blur-sm border border-gray-200/50 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-black/10 focus:bg-white/80 transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
              />
              {!isReadOnly && (
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-2">
                  {message &&
                  (messagesRemaining == null || messagesRemaining > 0) ? (
                    <button
                      onClick={handleSendMessage}
                      className="p-3 bg-black rounded-xl hover:bg-gray-800 hover:shadow-lg transition-all duration-200"
                    >
                      <Send size={18} className="text-white" />
                    </button>
                  ) : (
                    <div
                      type="button"
                      className="p-3 bg-gray-200 rounded-xl cursor-not-allowed"
                    >
                      <Send size={18} className="text-gray-700" />
                    </div>
                  )}
                </div>
              )}
            </div>
            <p className="text-xs hidden md:block text-center text-gray-500 mt-3">
              {
                // messagesRemaining === 0 ? (
                //   <span className="text-amber-600 font-medium">
                //     No messages left in your current limit.
                //     {resetAt
                //       ? ` Resets ${formatResetAt(resetAt)}.`
                //       : " Try again later."}
                //     {canRefresh && (
                //       <>
                //         {" "}
                //         <button
                //           type="button"
                //           onClick={handleRefreshLimit}
                //           disabled={statusLoading}
                //           className="underline font-medium hover:no-underline disabled:opacity-60"
                //         >
                //           {statusLoading ? "Checking…" : "Refresh limit"}
                //         </button>
                //       </>
                //     )}
                //   </span>
                // ) :
                "AlloX can make mistakes. Always verify transactions before confirming."
              }
            </p>
          </>
        </div>
      </div>

      {isNarrativesModalOpen && !isReadOnly && (
        <div
          className="fixed inset-0 z-[65] flex items-center justify-center p-4 bg-black/20 backdrop-blur-sm"
          onClick={() => setIsNarrativesModalOpen(false)}
        >
          <div
            className="glass-card max-w-xl w-full p-6 animate-fade-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <h3 className="text-lg font-bold text-gray-900">
                  Choose a narrative
                </h3>
                <p className="text-xs text-gray-600 mt-1">
                  Pick one to explore related narratives.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsNarrativesModalOpen(false)}
                className="p-2 rounded-xl hover:bg-black/5 text-gray-500 bg-white"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-2">
              {NARRATIVE_MODAL_OPTIONS.map((n) => (
                <button
                  key={n.id}
                  type="button"
                  onClick={() => {
                    setIsNarrativesModalOpen(false);
                    sendChatMessage(n.id);
                  }}
                  className="w-full text-left rounded-2xl px-4 py-3 bg-white/80 border border-gray-200/70 hover:bg-white hover:border-gray-300 hover:shadow-md transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="font-semibold text-gray-900">
                        {n.label}
                      </div>
                      <div className="text-xs text-gray-600 mt-1">
                        {n.description}
                      </div>
                    </div>
                    <div
                      className={`shrink-0 text-[10px] uppercase tracking-wide px-2 py-1 rounded-full border ${
                        n.riskProfile === "LOW_TO_MEDIUM"
                          ? "bg-blue-100 border-blue-200 text-blue-700"
                          : n.riskProfile === "MEDIUM"
                            ? "bg-yellow-100 border-yellow-200 text-yellow-700"
                            : "bg-red-100 border-red-200 text-red-700"
                      }`}
                    >
                      {n.riskProfile.replace(/_/g, " ")}
                    </div>
                  </div>
                </button>
              ))}
            </div>

            {/* <div className="mt-4 flex justify-end">
              <button
                type="button"
                onClick={() => setIsNarrativesModalOpen(false)}
                className="px-4 py-2 rounded-xl text-sm font-medium bg-white border border-gray-200 hover:bg-gray-50 text-gray-800"
              >
                Close
              </button>
            </div> */}
          </div>
        </div>
      )}

      {claimSuccess && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="glass-card max-w-sm w-full p-8 text-center animate-in zoom-in-95 duration-300">
            <div className="text-5xl mb-4">🎉</div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">
              Congratulations!
            </h3>
            <p className="text-gray-600 mb-1">
              You claimed your Season 2 points.
            </p>
            {/* <p className="text-sm text-gray-500">Start chatting to use them.</p> */}
          </div>
        </div>
      )}

      {showWelcomeGiftModal && (
        <div
          className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          onClick={() => {
            if (!claiming) {
              setShowWelcomeGiftModal(false);
              setUserDismissedClaimModal(true);
            }
          }}
        >
          <div
            className="glass-card max-w-sm w-full p-8 relative animate-fade-in flex flex-col items-center text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => {
                if (!claiming) {
                  setShowWelcomeGiftModal(false);
                  setUserDismissedClaimModal(true);
                }
              }}
              className="absolute top-4 right-4 p-1 rounded-lg hover:bg-black/5 text-gray-500"
              aria-label="Close"
            >
              <X size={20} />
            </button>

            <div className="flex items-center gap-2 mb-2">
              <h3 className="text-xl font-bold">Welcome Bonus</h3>
              {/* <Gift className="w-5 h-5 text-amber-500" /> */}
            </div>
            <p className="text-sm text-gray-600 mb-6">
              Exclusive Web3 Community Benefit.
            </p>
            <div className="flex items-center justify-center gap-2 mb-1">
              <span className="text-4xl font-bold">
                {INITIAL_CLAIM_POINTS.toLocaleString()}
              </span>
              {/* <span className="w-6 h-6 rounded-full bg-amber-100 flex items-center justify-center">
                <span className="text-amber-600 text-xs font-bold">◆</span>
              </span> */}
            </div>
            <p className="text-sm text-gray-500 mb-8">Points</p>
            {claimError && (
              <p className="text-sm text-red-600 mb-2">{claimError}</p>
            )}
            <button
              onClick={handleClaimPoints}
              disabled={claiming}
              className="w-full py-4 rounded-2xl font-medium bg-gray-900 text-white hover:bg-gray-800 disabled:opacity-70 flex items-center justify-center gap-2"
            >
              {claiming ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Claiming...
                </>
              ) : (
                "Claim"
              )}
            </button>
          </div>
        </div>
      )}

      {(currentMessages.length > 0 || quickWizardOpen) && (
        <div
          className={`py-8 px-6 max-w-250 mx-auto w-full ${isReadOnly ? "chat-padding-readonly" : "chat-padding"}`}
          ref={speechBoxRef}
        >
          <div className="flex items-start gap-8">
            <div className="flex-1 min-w-0 space-y-6">
              {quickWizardOpen && (
                <ChatBubble type="ai">
                  <div className="space-y-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="text-lg font-bold truncate">
                          Quick Portfolio Builder
                        </h3>
                        <div className="text-xs text-gray-600 mt-1">
                          Fill the form and generate portfolio
                        </div>
                      </div>
                      <button
                        onClick={() => setShowMoreInfoModal(true)}
                        className="border border-gray-200 bg-white rounded-full px-3 py-2 hover:bg-gray-50 transition-colors flex items-center gap-2 text-xs whitespace-nowrap hover:bg-gray-200 transition-colors"
                      >
                        <HelpCircle size={14} className="text-blue-600" />
                        <span className="font-medium">More info</span>
                      </button>
                    </div>

                    {quickError && (
                      <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                        {quickError}
                      </div>
                    )}

                    <div className="space-y-4">
                      <div className="rounded-2xl bg-white/70 border border-gray-200/60 p-4 shadow-sm">
                        <div className="text-sm font-semibold text-gray-900 mb-2">
                          Which blockchain would you like to build on?
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {[
                            {
                              value: "BSC",
                              label: "BNB Chain (on chain)",
                              badge: "BSC",
                              icon: "https://cdn.allox.ai/allox/networks/bnbIcon.svg",
                            },
                            {
                              value: "ETH",
                              label: "Ethereum",
                              badge: "ETH",
                              icon: "https://cdn.allox.ai/allox/networks/eth.svg",
                            },
                            {
                              value: "BASE",
                              label: "Base",
                              badge: "BASE",
                              icon: "https://cdn.allox.ai/allox/networks/base.svg",
                            },
                            {
                              value: "SOL",
                              label: "Solana",
                              badge: "SOL",
                              icon: "https://cdn.allox.ai/allox/networks/solana.svg",
                            },
                          ].map((opt) => {
                            const selected = quickForm.chain === opt.value;
                            return (
                              <button
                                key={opt.value}
                                type="button"
                                onClick={() =>
                                  setQuickForm((p) => ({
                                    ...p,
                                    chain: opt.value,
                                  }))
                                }
                                disabled={quickIsGenerating || quickIsExecuting}
                                className={
                                  selected
                                    ? "flex items-center gap-2 px-4 py-2 bg-gray-900 text-white border border-gray-900 rounded-xl text-sm font-medium hover:bg-gray-800 shadow-sm"
                                    : "flex items-center gap-2 px-4 py-2 bg-white/80 border border-gray-200 rounded-xl text-sm font-medium hover:bg-white hover:border-gray-300"
                                }
                              >
                                <span className="inline-flex items-center gap-2">
                                  <img
                                    src={opt.icon}
                                    alt=""
                                    className="h-6 w-6"
                                  />
                                  {opt.label}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      <div className="rounded-2xl bg-white/70 border border-gray-200/60 p-4 shadow-sm">
                        <div className="text-sm font-semibold text-gray-900 mb-2">
                          What type of portfolio interests you?
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {[
                            {
                              value: "Diversified",
                              label: "Diversified",
                              badge: "D",
                            },
                            { value: "Defi", label: "DeFi", badge: "DeFi" },
                            {
                              value: "RWA",
                              label: "Real world assets (RWA)",
                              badge: "RWA",
                            },
                            { value: "AI", label: "AI", badge: "AI" },
                            { value: "Gaming", label: "Gaming", badge: "G" },
                            { value: "DePin", label: "DePin", badge: "DP" },
                          ].map((opt) => {
                            const selected =
                              quickForm.portfolioType === opt.value;
                            return (
                              <button
                                key={opt.value}
                                type="button"
                                onClick={() =>
                                  setQuickForm((p) => ({
                                    ...p,
                                    portfolioType: opt.value,
                                  }))
                                }
                                disabled={quickIsGenerating || quickIsExecuting}
                                className={
                                  selected
                                    ? "px-4 py-2 bg-gray-900 text-white border border-gray-900 rounded-xl text-sm font-medium hover:bg-gray-800 shadow-sm"
                                    : "px-4 py-2 bg-white/80 border border-gray-200 rounded-xl text-sm font-medium hover:bg-white hover:border-gray-300"
                                }
                              >
                                <span className="inline-flex items-center gap-2">
                                  {/* <span className="w-5 h-5 rounded-full bg-black/5 border border-gray-200 text-[10px] font-bold flex items-center justify-center">
                                    {opt.badge}
                                  </span> */}
                                  {opt.label}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      <div className="rounded-2xl bg-white/70 border border-gray-200/60 p-4 shadow-sm">
                        <div className="text-sm font-semibold text-gray-900 mb-2">
                          How much would you like to invest?
                        </div>
                        <div className="flex flex-wrap gap-2 mb-3">
                          {[5, 100, 500].map((amt) => {
                            const selected = quickForm.amountUsd === amt;
                            return (
                              <button
                                key={amt}
                                type="button"
                                onClick={() =>
                                  setQuickForm((p) => ({
                                    ...p,
                                    amountUsd: amt,
                                    customAmountUsdText: "",
                                  }))
                                }
                                disabled={quickIsGenerating || quickIsExecuting}
                                className={
                                  selected
                                    ? "px-4 py-2 bg-gray-900 text-white border border-gray-900 rounded-xl text-sm font-medium hover:bg-gray-800 shadow-sm"
                                    : "px-4 py-2 bg-white/80 border border-gray-200 rounded-xl text-sm font-medium hover:bg-white hover:border-gray-300"
                                }
                              >
                                ${amt}
                              </button>
                            );
                          })}
                          <button
                            type="button"
                            onClick={() =>
                              setQuickForm((p) => ({
                                ...p,
                                amountUsd: null,
                              }))
                            }
                            disabled={quickIsGenerating || quickIsExecuting}
                            className={
                              quickForm.amountUsd == null
                                ? "px-4 py-2 bg-gray-900 text-white border border-gray-900 rounded-xl text-sm font-medium hover:bg-gray-800 shadow-sm"
                                : "px-4 py-2 bg-white/80 border border-gray-200 rounded-xl text-sm font-medium hover:bg-white hover:border-gray-300"
                            }
                          >
                            Custom
                          </button>
                        </div>
                        <label className="block text-sm text-gray-700 mb-2">
                          Custom amount (USD)
                        </label>
                        <input
                          type="number"
                          min="1"
                          maxLength={8}
                          value={quickForm.customAmountUsdText}
                          placeholder="$ e.g. 250"
                          onChange={(e) => {
                            const raw = e.target.value;
                            setQuickForm((p) => ({
                              ...p,
                              customAmountUsdText: raw,
                              amountUsd: raw.trim() === "" ? null : Number(raw),
                            }));
                          }}
                          disabled={quickIsGenerating || quickIsExecuting}
                          className="w-full px-4 py-3 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-black/10 bg-white/70"
                        />
                      </div>

                      <div className="rounded-2xl bg-white/70 border border-gray-200/60 p-4 shadow-sm">
                        <div className="text-sm font-semibold text-gray-900 mb-2">
                          What's your risk tolerance?
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                          {[
                            {
                              value: "CONSERVATIVE",
                              title: "High Cap",
                              subtitle: "Lower risk",
                              base: "bg-green-50 border-green-200 text-green-800 hover:border-green-300",
                              selected:
                                "bg-green-100 border-green-400 ring-2 ring-green-300/60",
                            },
                            {
                              value: "BALANCED",
                              title: "Mid Cap",
                              subtitle: "Medium risk",
                              base: "bg-blue-50 border-blue-200 text-blue-800 hover:border-blue-300",
                              selected:
                                "bg-blue-100 border-blue-400 ring-2 ring-blue-300/60",
                            },
                            {
                              value: "AGGRESSIVE",
                              title: "Low Cap",
                              subtitle: "Higher risk",
                              base: "bg-orange-50 border-orange-200 text-orange-800 hover:border-orange-300",
                              selected:
                                "bg-orange-100 border-orange-400 ring-2 ring-orange-300/60",
                            },
                          ].map((opt) => {
                            const selected = quickForm.risk === opt.value;
                            return (
                              <button
                                key={opt.value}
                                type="button"
                                onClick={() =>
                                  setQuickForm((p) => ({
                                    ...p,
                                    risk: opt.value,
                                  }))
                                }
                                disabled={quickIsGenerating || quickIsExecuting}
                                className={` flex flex-col items-center px-4 py-2 rounded-xl border text-left transition-all ${
                                  selected ? opt.selected : opt.base
                                }`}
                              >
                                <div className="text-sm font-semibold leading-tight">
                                  {opt.value}
                                </div>
                                <div className="text-[11px] opacity-80 leading-tight mt-0.5">
                                  {opt.subtitle}
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* <div className="rounded-2xl bg-white/70 border border-gray-200/60 p-4 shadow-sm">
                        <div className="text-sm font-semibold text-gray-900 mb-2">
                          Choose payment token
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {[
                            { value: "BNB", label: "BNB" },
                            { value: "USDT", label: "USDT" },
                            { value: "USDC", label: "USDC" },
                          ].map((opt) => {
                            const selected =
                              quickForm.paymentToken === opt.value;
                            return (
                              <button
                                key={opt.value}
                                type="button"
                                onClick={() =>
                                  setQuickForm((p) => ({
                                    ...p,
                                    paymentToken: opt.value,
                                  }))
                                }
                                disabled={quickIsGenerating || quickIsExecuting}
                                className={
                                  selected
                                    ? "px-4 py-2 bg-gray-900 text-white border border-gray-900 rounded-xl text-sm font-medium hover:bg-gray-800 shadow-sm"
                                    : "px-4 py-2 bg-white/80 border border-gray-200 rounded-xl text-sm font-medium hover:bg-white hover:border-gray-300"
                                }
                              >
                                {opt.label}
                              </button>
                            );
                          })}
                        </div>
                      </div> */}

                      <div className="flex justify-end pt-2">
                        <button
                          type="button"
                          onClick={() => void handleQuickGenerate("generate")}
                          disabled={
                            quickIsGenerating ||
                            quickIsExecuting ||
                            !quickForm.chain ||
                            !quickForm.portfolioType ||
                            !quickForm.amountUsd ||
                            !quickForm.risk
                            // ||!quickForm.paymentToken
                          }
                          className="px-6 py-3 bg-gray-900 text-white border border-gray-900 rounded-2xl text-sm font-semibold hover:bg-gray-800 disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                          {quickIsGenerating ? "Generating..." : "Generate"}
                        </button>
                      </div>
                    </div>
                  </div>
                </ChatBubble>
              )}

              {currentMessages.map((msg, index) => {
                const isUser =
                  msg.type === "user" ||
                  msg.type === "human" ||
                  msg.role === "user";
                const isPaperPortfolioMessage =
                  msg.type === "ai" &&
                  msg.data?.portfolio &&
                  msg.data?.portfolio?.executionMode !== "ON_CHAIN";
                return (
                  <ChatBubble
                    key={(isUser ? "user" : "ai") + index}
                    type={isUser ? "user" : "ai"}
                  >
                    {typeof msg.content === "string" ? (
                      <div>
                        {isPaperPortfolioMessage ? null : msg.type === "ai" &&
                          msg.id === typingMessageId ? (
                          // During typing we avoid markdown parsing on every tick for smoother UX.
                          <div className="whitespace-pre-wrap text-sm">
                            {displayedTextById[msg.id] ?? ""}
                          </div>
                        ) : (
                          !isPaperPortfolioMessage &&
                          renderFormattedMessage(
                            msg.type === "ai"
                              ? completedMessageIdsRef.current.has(msg.id)
                                ? msg.content
                                : (displayedTextById[msg.id] ?? "")
                              : msg.content,
                          )
                        )}
                        {msg.type === "ai" &&
                          completedMessageIdsRef.current.has(msg.id) &&
                          msg.options?.length > 0 &&
                          !(
                            msg.data?.portfolio &&
                            msg.data?.portfolio?.executionMode !== "ON_CHAIN"
                          ) && (
                            <div className="mt-3 flex flex-wrap gap-2">
                              {msg.options.map((option, index) => (
                                <button
                                  key={`${option.action}-${option.value}-${index}`}
                                  onClick={() => handleOptionClick(option)}
                                  disabled={isReadOnly}
                                  className={
                                    option?.value === "confirm"
                                      ? "px-3 py-2 bg-black text-white border border-gray-200 rounded-xl text-xs font-medium hover:bg-gray-800 hover:shadow-md transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
                                      : "px-3 py-2 bg-white/80 border border-gray-200 rounded-xl text-xs font-medium hover:bg-white hover:border-gray-300 hover:shadow-md transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
                                  }
                                >
                                  {option.label ||
                                    option.value ||
                                    option.action}
                                </button>
                              ))}
                            </div>
                          )}
                        {msg.type === "ai" &&
                          msg.data?.portfolio?.executionMode === "ON_CHAIN" && (
                            <>
                              {renderOnChainPortfolioCreated(
                                msg.data.portfolio,
                                [
                                  {
                                    label: "Explain this portfolio",
                                    action: "SEND_MESSAGE",
                                    value: "Explain this portfolio",
                                  },

                                  {
                                    label: "Start over",
                                    value: "Start over",
                                    action: "SEND_MESSAGE",
                                  },
                                ],
                              )}
                            </>
                          )}
                        {msg.type === "ai" &&
                          msg.data?.portfolio &&
                          msg.data?.portfolio?.executionMode !== "ON_CHAIN" &&
                          renderPaperPortfolioCreated(
                            msg.data.portfolio,
                            msg.options,
                          )}
                        {msg.type === "ai" &&
                          !msg.data?.portfolio &&
                          msg.data?.portfolioId && (
                            <div className="mt-3 bg-green-50 border border-green-200 rounded-xl p-3 text-sm text-green-700">
                              ✅ Portfolio created: {msg.data.portfolioId}
                            </div>
                          )}
                        {msg.type === "ai" && renderTokens(msg.data?.tokens)}
                        {msg.type === "ai" &&
                          msg.data?.portfolioPreview &&
                          renderPortfolioPreview(msg.data.portfolioPreview)}
                      </div>
                    ) : (
                      msg.content
                    )}
                  </ChatBubble>
                );
              })}

              {isThinking && (
                <ChatBubble type="ai">
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="text-sm text-gray-600">
                      AlloX is thinking...
                    </span>
                  </div>
                </ChatBubble>
              )}

              {/* {quickBasket.length > 0 && (
                <ChatBubble type="ai">
                  <div className="space-y-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-sm font-semibold text-gray-900">
                          Token basket preview
                        </div>
                        <div className="text-xs text-gray-600 mt-1">
                          {quickPreviewMeta?.chain
                            ? `${quickPreviewMeta.chain} · ${
                                quickPreviewMeta?.executionMode === "ON_CHAIN"
                                  ? "On-Chain Execution"
                                  : "Paper Trading Preview"
                              }`
                            : ""}
                        </div>
                      </div>
                      
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[480px] text-sm bg-gradient-to-br from-blue-50/80 to-purple-50/80 border border-blue-200/50">
                        <thead>
                          <tr className="border-b border-gray-200 bg-gray-50/80">
                            <th className="px-4 py-3 text-left font-semibold text-gray-700">
                              Token
                            </th>
                            <th className="px-4 py-3 text-left font-semibold text-gray-700">
                              Category
                            </th>
                            <th className="px-4 py-3 text-right font-semibold text-gray-700">
                              Allocation
                            </th>
                            <th className="px-4 py-3 text-right font-semibold text-gray-700">
                              Quantity
                            </th>
                            <th className="px-4 py-3 text-right font-semibold text-gray-700">
                              Price
                            </th>
                            <th className="px-4 py-3 text-right font-semibold text-gray-700 w-10" />
                          </tr>
                        </thead>
                        <tbody>
                          {quickBasket.map((t, idx) => (
                            <tr
                              key={String(t.id || `${t.symbol}-${idx}`)}
                              className="border-b border-gray-100 last:border-0 hover:bg-gray-50/50"
                            >
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-3 min-w-0">
                                  {t.logo ? (
                                    <img
                                      src={t.logo}
                                      alt={t.symbol}
                                      className="w-7 h-7 rounded-full bg-white border border-gray-200 object-cover"
                                      loading="lazy"
                                    />
                                  ) : (
                                    <div className="w-7 h-7 rounded-full bg-gray-100 border border-gray-200" />
                                  )}
                                  <div className="min-w-0">
                                    <div className="font-bold text-gray-900 truncate">
                                      {t.symbol}
                                    </div>
                                  </div>
                                </div>
                              </td>
                              <td className="px-4 py-3 text-gray-800">
                                {t.category || "—"}
                              </td>
                              <td className="px-4 py-3 text-right font-medium text-gray-900">
                                ${Number(t.allocationUsd ?? 0).toFixed(2)}
                              </td>
                              <td className="px-4 py-3 text-right font-medium text-gray-800">
                                {t.quantity != null
                                  ? getFormattedNumber(t.quantity, 6)
                                  : "—"}
                              </td>
                              <td className="px-4 py-3 text-right font-medium text-gray-800">
                                {t.price != null
                                  ? `$${getFormattedNumber(t.price, 6)}`
                                  : "—"}
                              </td>
                              <td className="px-4 py-3 text-right">
                                <button
                                  type="button"
                                      onClick={() =>
                                        handleQuickRequestRemoveToken(t)
                                      }
                                  disabled={
                                    quickIsGenerating || quickIsExecuting
                                  }
                                  className="p-1 rounded-lg hover:bg-black/5 text-gray-500 disabled:opacity-60"
                                  aria-label={`Remove ${t.symbol}`}
                                >
                                  <X size={16} />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <div className="flex flex-wrap gap-2 justify-end pt-2">
                      <button
                        type="button"
                        onClick={() => void handleQuickGenerate("regenerate")}
                        disabled={
                          quickIsGenerating ||
                          quickIsExecuting ||
                          !quickForm.chain ||
                          !quickForm.portfolioType ||
                          !quickForm.amountUsd ||
                          !quickForm.risk ||
                          !quickForm.paymentToken
                        }
                        className="px-5 py-2 bg-white/80 border border-gray-200 rounded-xl text-sm font-semibold hover:bg-white hover:border-gray-300 disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        Regenerate
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleQuickConfirmAndExecute()}
                        disabled={
                          quickIsGenerating ||
                          quickIsExecuting ||
                          quickBasket.length === 0
                        }
                        className="px-5 py-2 bg-gray-900 text-white border border-gray-900 rounded-xl text-sm font-semibold hover:bg-gray-800 disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                       Confirm
                      </button>
                    </div>
                  </div>
                </ChatBubble>
              )} */}
              {executionState.isExecuting && (
                <div className="mt-4 glass-card p-4 border border-blue-200/60 bg-blue-50/40 flex items-center justify-between gap-3 text-sm">
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                    <div>
                      <p className="font-medium text-gray-900">
                        Executing on-chain portfolio...
                      </p>
                      <p className="text-xs text-gray-600">
                        {executionState.currentSymbol
                          ? `Processing ${executionState.currentSymbol} (${executionState.completed}/${executionState.total} done)`
                          : `Swaps completed: ${executionState.completed}/${executionState.total}`}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {quickRemoveTarget && (
                <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
                  <div className="glass-card p-6 max-w-sm w-full mx-4">
                    <h3 className="text-lg font-semibold mb-2">Remove token</h3>
                    <p className="text-sm text-gray-700 mb-4">
                      Remove{" "}
                      <span className="font-semibold">
                        {quickRemoveTarget.symbol}
                      </span>{" "}
                      {quickRemoveTarget.name
                        ? `(${quickRemoveTarget.name})`
                        : ""}{" "}
                      from this portfolio?
                    </p>
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        className="px-3 py-2 text-xs rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-100 disabled:opacity-60"
                        onClick={handleQuickCancelRemoveToken}
                        disabled={quickIsRemoving}
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        className="px-3 py-2 text-xs rounded-xl bg-red-600 text-white hover:bg-red-700 disabled:opacity-60"
                        onClick={() => void handleQuickConfirmRemoveToken()}
                        disabled={quickIsRemoving}
                      >
                        {quickIsRemoving ? "Removing..." : "Remove"}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {executionState.isExecuting && executionPrompt && (
                <div className="mt-3 glass-card p-4 border border-amber-200/60 bg-amber-50/50 text-sm">
                  {executionPrompt.type === "QUOTE_FAILED_TOKENS" ? (
                    <>
                      <p className="font-medium text-gray-900 mb-1">
                        Some tokens have no valid swap route
                      </p>
                      <p className="text-xs text-gray-700 mb-3">
                        {(executionPrompt.failedTokens || [])
                          .map((t) => `${t.symbol} ($${t.allocationUsd ?? 0})`)
                          .join(", ")}{" "}
                        were removed and redistributed to{" "}
                        {executionPrompt.quotedCount || 0} remaining tokens.
                        Continue with available routes or go back to edit.
                      </p>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => resolveExecutionPrompt("continue")}
                          className="px-3 py-2 rounded-xl bg-gray-900 text-white text-xs font-medium hover:bg-gray-800"
                        >
                          Continue with remaining tokens
                        </button>
                        <button
                          type="button"
                          onClick={() => resolveExecutionPrompt("edit")}
                          className="px-3 py-2 rounded-xl bg-white border border-gray-300 text-gray-700 text-xs font-medium hover:bg-gray-50"
                        >
                          Edit portfolio
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <p className="font-medium text-gray-900 mb-1">
                        Swap failed for {executionPrompt.symbol}
                      </p>
                      <p className="text-xs text-gray-700 mb-3">
                        The wallet did not submit the transaction. You can retry
                        with a fresh nonce, or skip this token and continue.
                      </p>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => resolveExecutionPrompt("retry")}
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

              {executionState.error && (
                <div className="mt-4 glass-card p-3 border border-red-200/60 bg-red-50/60 text-xs text-red-700">
                  {executionState.error}
                </div>
              )}

              {executionState.isExecuting && (
                <div className="mb-4 glass-card p-4 border border-amber-200/50 bg-amber-50/30">
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <HelpCircle size={20} className="text-amber-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900 mb-1">
                        Important note
                      </p>
                      <p className="text-xs text-gray-600">
                        You can safely confirm transactions even if a failure
                        warning appears. <b>Note:</b> MetaMask Smart
                        Transactions may affect execution.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      {showMoreInfoModal && (
        <ChatMoreInfoModal
          isOpen={showMoreInfoModal}
          onClose={() => {
            setShowMoreInfoModal(false);
          }}
        />
      )}
    </div>
  );
}
