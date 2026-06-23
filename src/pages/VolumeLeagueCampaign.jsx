import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, CheckCircle2, Loader2 } from "lucide-react";
import {
  TrendingUp,
  Users,
  Calendar,
  Crown,
  Medal,
  Award,
  Info,
  X,
  Lock,
  BarChart2,
  Wallet,
  PieChart,
  FileText,
  HelpCircle,
  BookOpen,
  Plus,
  Check,
} from "lucide-react";
import { useAccount, useSwitchChain } from "wagmi";
import {
  getEmbeddedConnectedWallet,
  useSendTransaction,
  useWallets,
} from "@privy-io/react-auth";
import { setChainId, setWalletModal } from "../redux/slices/walletSlice";
import {
  getPrivyEmbedded,
  switchPrivyEmbeddedToChain,
} from "../utils/privyWalletUtils";
import { useAuth } from "../hooks/useAuth";
import { useVolume } from "../hooks/useVolume";
import { apiCall } from "../utils/api";
import { toast } from "../utils/toast";
import { CHAIN_LIST, CHAINS, chainIdFor, normalizeChain } from "../config/chains";
import {
  createPrivyExecutionTxEnv,
  executePortfolioOnChain,
} from "../utils/execution";
import {
  BINANCE_CAMPAIGN_CHAIN,
  BINANCE_CAMPAIGN_MIN_AMOUNT_USD,
  BINANCE_CAMPAIGN_SOURCE_TOKENS,
  BINANCE_CAMPAIGN_AMOUNT_TIERS,
  PRIME_PICKS_INCLUDED_TOKENS,
  PRIME_PICKS_PORTFOLIO_SIZE,
} from "../utils/binanceCampaign";
import { PortfolioDetailModal } from "../components/PortfolioDetailModal";

const BNB_CHAIN_SWITCH = {
  chainId: 56,
  chainHex: "0x38",
  chainName: "BNB Chain",
  rpcUrls: ["https://bsc-dataseed.binance.org"],
  blockExplorerUrls: ["https://bscscan.com"],
  nativeCurrency: { name: "BNB", symbol: "BNB", decimals: 18 },
};

const isOnChainExecutionMode = (executionMode) =>
  String(executionMode || "").toUpperCase() === "ON_CHAIN";

const isPortfolioClosed = (portfolio) =>
  String(portfolio?.status || portfolio?.sellStatus || "").toUpperCase() ===
  "CLOSED";

const getChainInfo = (chain) => {
  const normalized = normalizeChain(chain || BINANCE_CAMPAIGN_CHAIN);
  const chainMeta = CHAINS[normalized];
  if (chainMeta?.label) {
    return { label: chainMeta.label, icon: null };
  }
  const key = String(chain || BINANCE_CAMPAIGN_CHAIN).toUpperCase();
  if (key === "BSC") {
    return {
      label: "BNB Chain",
      icon: "https://cdn.allox.ai/allox/networks/bnbIcon.svg",
    };
  }
  return { label: key, icon: null };
};

const TIERS = [
  {
    label: "Diamond",
    ranks: "Top 10",
    rankRange: [1, 10],
    volThreshold: 100_000,
    bonus: 1_000,
    slots: 10,
    budgetPerWeek: 10_000,
    color: "from-cyan-400 to-blue-500",
    bg: "bg-cyan-50",
    border: "border-cyan-300",
    text: "text-cyan-800",
    badge: "bg-cyan-100 text-cyan-700",
    iconColor: "text-cyan-600",
  },
  {
    label: "Gold",
    ranks: "Rank 11–30",
    rankRange: [11, 30],
    volThreshold: 50_000,
    bonus: 500,
    slots: 20,
    budgetPerWeek: 10_000,
    color: "from-yellow-400 to-amber-500",
    bg: "bg-yellow-50",
    border: "border-yellow-300",
    text: "text-yellow-800",
    badge: "bg-yellow-100 text-yellow-700",
    iconColor: "text-yellow-600",
  },
  {
    label: "Silver",
    ranks: "Rank 31–70",
    rankRange: [31, 70],
    volThreshold: 25_000,
    bonus: 150,
    slots: 40,
    budgetPerWeek: 6_000,
    color: "from-gray-400 to-gray-500",
    bg: "bg-gray-50",
    border: "border-gray-200",
    text: "text-gray-700",
    badge: "bg-gray-200 text-gray-700",
    iconColor: "text-gray-500",
  },
  {
    label: "Bronze",
    ranks: "Rank 71–150",
    rankRange: [71, 150],
    volThreshold: 5_000,
    bonus: 50,
    slots: 80,
    budgetPerWeek: 4_000,
    color: "from-amber-700 to-amber-600",
    bg: "bg-amber-50",
    border: "border-amber-200",
    text: "text-amber-800",
    badge: "bg-amber-100 text-amber-700",
    iconColor: "text-amber-600",
  },
];
const WEEKS = [
  { week: 1, dateRange: "Jun 15 – Jun 21", status: "live" },
  { week: 2, dateRange: "Jun 22 – Jun 28", status: "upcoming" },
  { week: 3, dateRange: "Jun 29 – Jul 5", status: "upcoming" },
  { week: 4, dateRange: "Jul 6 – Jul 12", status: "upcoming" },
  { week: 5, dateRange: "Jul 13 – Jul 15", status: "upcoming" },
];

const faqs = [
  {
    q: "Who qualifies for the Reward share  pool?",
    a: "Every user who trades any amount that week earns a share of the $70K weekly reward share pool. There is no minimum volume to participate in the reward share pool, if you trade, you earn.",
  },
  {
    q: "How is my reward share pool share calculated?",
    a: "Your share is proportional to your √(volume) relative to all participants. For example, if your √(volume) is 100 and the sum of all √(volume) across all users is 10,000, you receive 1% of the $70K reward share pool = $700. This square-root weighting means large traders don't dominate smaller ones.",
  },
  {
    q: "How do tier bonuses work?",
    a: "The top 150 ranked users each week are assigned a tier by rank position: top 10 = Diamond, 11–30 = Gold, 31–70 = Silver, 71–150 = Bronze. Each tier has a volume threshold you must hit to unlock your one-time bonus for that week.",
  },
  {
    q: "What are the tier volume thresholds?",
    a: "Diamond (top 10): $100K | Gold (rank 11–30): $50K | Silver (rank 31–70): $25K | Bronze (rank 71–150): $5K. If you are ranked in the top 150 but haven't hit your tier's threshold, your bonus shows as locked on the leaderboard.",
  },
  {
    q: "What happens to locked bonuses?",
    a: "Locked bonuses are not paid out.",
  },
  {
    q: "Can I earn a tier bonus multiple times per week?",
    a: "No. The tier bonus is a one-time reward per user per week. Exceeding your tier threshold multiple times does not multiply the bonus.",
  },
  {
    q: "How are rankings determined?",
    a: "Users are ranked weekly by √(volume) from highest to lowest. Rankings and pool shares reset every Monday at 00:00 UTC.",
  },
  {
    q: "What is the total prize pool?",
    a: "The total campaign prize is $500K across 5 weeks ($100K/week). Each week: $70K reward share pool (distributed to all traders) + $30K tier bonus budget (Diamond $10K, Gold $10K, Silver $6K, Bronze $4K).",
  },
  {
    q: "Can I participate with multiple wallets?",
    a: "No. Each user may only participate with one verified Binance Wallet. Using multiple wallets will result in permanent disqualification from all tiers and forfeiture of reward share pool earnings.",
  },
];
function getTierByRank(rank) {
  return (
    TIERS.find((t) => rank >= t.rankRange[0] && rank <= t.rankRange[1]) ?? null
  );
}

function fmt(n) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n}`;
}

function sqrtShare(vol) {
  return Math.sqrt(vol);
}

// Generate mock leaderboard
function generateLeaderboard(weekSeed) {
  const effectiveWeekSeed = ((weekSeed - 1) % 5) + 1;
  const rows = Array.from({ length: 25 }, (_, i) => {
    const rank = i + 1;
    const vol = Math.max(
      2_000,
      420_000 - rank * 15_000 + effectiveWeekSeed * 900 + (i % 4) * 3_000,
    );
    const tier = getTierByRank(rank);
    const unlocked = tier ? vol >= tier.volThreshold : false;
    const portfolios = Math.max(1, 20 - i + (weekSeed % 3));
    return { rank, vol, tier, unlocked, portfolios, sqrtVol: sqrtShare(vol) };
  });
  const totalSqrt = rows.reduce((s, r) => s + r.sqrtVol, 0);
  return rows.map((r) => ({
    ...r,
    baseShare: (r.sqrtVol / totalSqrt) * 70_000,
  }));
}

function PositionIcon({ rank }) {
  if (rank === 1) return <Crown size={16} className="text-yellow-500" />;
  if (rank === 2) return <Medal size={16} className="text-gray-400" />;
  if (rank === 3) return <Award size={16} className="text-amber-600" />;
  return <span className="text-gray-500 text-sm font-semibold">{rank}</span>;
}

function FAQItem({ q, a }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-gray-200/60 rounded-2xl overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50 transition-colors"
      >
        <span className="font-semibold text-gray-900 pr-4 text-sm">{q}</span>
        <svg
          width="16"
          height="16"
          viewBox="0 0 20 20"
          fill="none"
          className={`flex-shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
        >
          <path
            d="M5 7.5L10 12.5L15 7.5"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
      {open && (
        <div className="px-4 pb-4 text-gray-700 text-sm leading-relaxed border-t border-gray-100 pt-3">
          {a}
        </div>
      )}
    </div>
  );
}

function parseQuickTokensFromMarkdown(markdownText) {
  if (!markdownText) return [];
  const lines = String(markdownText).split("\n");
  const rows = [];
  for (const line of lines) {
    const match = line.match(
      /^([A-Z0-9]+)\s*\(([^)]+)\):\s*\$?([\d.,]+)\s*\/\s*([\d.,]+)\s*tokens?\s+at\s+\$?([\d.,]+)/i,
    );
    if (!match) continue;
    rows.push({
      id: match[1].toUpperCase(),
      symbol: match[1].toUpperCase(),
      category: match[2],
      allocationUsd: Number(match[3].replace(/,/g, "")),
      quantity: Number(match[4].replace(/,/g, "")),
      price: Number(match[5].replace(/,/g, "")),
      logo: null,
      contractAddress: null,
    });
  }
  return rows;
}

function getPortfolioTimestamp(portfolio) {
  const raw =
    portfolio?.createdAt ??
    portfolio?.updatedAt ??
    portfolio?.created_at ??
    portfolio?.updated_at ??
    portfolio?.date ??
    portfolio?.timestamp;
  if (raw == null) return 0;
  const parsed =
    typeof raw === "number" ? new Date(raw) : new Date(String(raw));
  const time = parsed.getTime();
  return Number.isFinite(time) ? time : 0;
}

export function VolumeLeagueCampaign() {
  const dispatch = useDispatch();
  const queryClient = useQueryClient();
  const {
    chainId: walletChainId,
    isConnected,
    connector: activeConnector,
  } = useAccount();
  const { switchChainAsync } = useSwitchChain();
  const { wallets } = useWallets();
  const { sendTransaction: privySendTransaction } = useSendTransaction();
  const { ensureAuthenticated, logout, user: authUser } = useAuth();
  const [showTutorialModal, setShowTutorialModal] = useState(false);
  const [selectedWeek, setSelectedWeek] = useState(0);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [showFAQModal, setShowFAQModal] = useState(false);
  const [showBonusModal, setShowBonusModal] = useState(false);
  const [positionWeek, setPositionWeek] = useState(0);
  const [createWizardOpen, setCreateWizardOpen] = useState(false);
  const [actionError, setActionError] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [isSwitchingChain, setIsSwitchingChain] = useState(false);
  const [generatedBasket, setGeneratedBasket] = useState([]);
  const [generatedMeta, setGeneratedMeta] = useState(null);
  const [detailModalPortfolio, setDetailModalPortfolio] = useState(null);
  const [detailModalInitialSell, setDetailModalInitialSell] = useState(null);
  const [detailModalRefreshKey, setDetailModalRefreshKey] = useState(0);
  const [portfolioSlide, setPortfolioSlide] = useState(0);
  const [executionPrompt, setExecutionPrompt] = useState(null);
  const executionPromptResolverRef = useRef(null);
  const [executionState, setExecutionState] = useState({
    isExecuting: false,
    currentSymbol: null,
    completed: 0,
    total: 0,
    error: null,
    portfolioId: null,
    tokenStatuses: {},
  });
  const [campaignForm, setCampaignForm] = useState({
    amountUsd: null,
    customAmountUsdText: "",
    sourceToken: "USDT",
  });
  const walletAddress = useSelector((state) => state.wallet.address);
  const sessionSource = useSelector((state) => state.wallet.sessionSource);
  const walletType = useSelector((state) => state.wallet.walletType);
  const { fetchCompetition, fetchLeaderboard, fetchUserCompetitionData } =
    useVolume();
  const selectedWeekStatus = WEEKS[selectedWeek].status;
  const targetChainId = chainIdFor(BINANCE_CAMPAIGN_CHAIN);
  const targetChainLabel =
    CHAINS[normalizeChain(BINANCE_CAMPAIGN_CHAIN)]?.label || "BNB Chain";
  const onTargetChain =
    isConnected && Number(walletChainId) === Number(targetChainId);
  const needsChainSwitch = isConnected && !onTargetChain;
  const currentChainLabel =
    CHAIN_LIST.find((c) => c.chainId === Number(walletChainId))?.label ||
    "another network";
  const amountMissingSelections = useMemo(() => {
    const missing = [];
    const amount =
      campaignForm.amountUsd != null ? Number(campaignForm.amountUsd) : null;
    if (amount == null || Number.isNaN(amount)) {
      missing.push("investment amount");
    } else if (amount < BINANCE_CAMPAIGN_MIN_AMOUNT_USD) {
      missing.push(
        `investment of at least $${BINANCE_CAMPAIGN_MIN_AMOUNT_USD}`,
      );
    }
    return missing;
  }, [campaignForm.amountUsd]);
  const canGenerate = amountMissingSelections.length === 0;
  const wizardPrimaryLabel = useMemo(() => {
    if (isExecuting || executionState.isExecuting) return "Executing...";
    if (isGenerating) return "Generating...";
    if (generatedBasket.length > 0) return "Confirm & Execute";
    return "Generate";
  }, [
    executionState.isExecuting,
    generatedBasket.length,
    isExecuting,
    isGenerating,
  ]);
  const wizardPrimaryDisabled =
    isGenerating ||
    isExecuting ||
    executionState.isExecuting ||
    !onTargetChain ||
    (generatedBasket.length === 0 && !canGenerate);

  const leaderboard = generateLeaderboard(selectedWeek + 1);

  // Mock current user
  const currentUser = {
    rank: 47,
    address: "0x7a8c...4f2e",
    portfolios: 8,
    totalVolume: 34_200,
    thisWeekVol: 28_500,
    tier: getTierByRank(47), // Silver
    unlocked: true,
    sqrtVol: sqrtShare(28_500),
  };
  const totalSqrt =
    leaderboard.reduce((s, r) => s + r.sqrtVol, 0) + currentUser.sqrtVol;
  const currentUserBaseShare = (currentUser.sqrtVol / totalSqrt) * 70_000;
  const currentUserBonusAmt =
    currentUser.tier && currentUser.unlocked ? currentUser.tier.bonus : 0;
  const currentUserWeeklyRewardUsd = currentUserBaseShare + currentUserBonusAmt;
  currentUser.estimatedGems = Math.floor(currentUserWeeklyRewardUsd / 5);

  const recentPortfoliosQuery = useQuery({
    queryKey: ["volumeLeaguePortfolios", walletAddress],
    enabled: isConnected && !!walletAddress,
    staleTime: 30_000,
    queryFn: async () => {
      await ensureAuthenticated();
      const response = await apiCall("/portfolio");
      const list = Array.isArray(response?.portfolios)
        ? response.portfolios
        : [];
      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);
      const startOfTodayMs = startOfToday.getTime();
      return list
        .map((portfolio) => {
          const id =
            portfolio?.id ?? portfolio?.portfolioId ?? portfolio?.portfolio_id;
          return {
            ...portfolio,
            id,
            __createdAtMs: getPortfolioTimestamp(portfolio),
          };
        })
        .filter((portfolio) => {
          const chain = String(portfolio?.chain || "").toUpperCase();
          return (
            portfolio?.id &&
            (!chain || chain === "BSC") &&
            portfolio.__createdAtMs >= startOfTodayMs
          );
        })
        .sort((a, b) => b.__createdAtMs - a.__createdAtMs)
        .map(({ __createdAtMs, ...portfolio }) => {
          void __createdAtMs;
          return portfolio;
        });
    },
  });

  const portfolios = Array.isArray(recentPortfoliosQuery.data)
    ? recentPortfoliosQuery.data
    : [];

  const closePortfolioDetailModal = useCallback(() => {
    setDetailModalPortfolio(null);
    setDetailModalInitialSell(null);
  }, []);

  const openPortfolioDetailModal = useCallback((portfolio, options = {}) => {
    const portfolioId = portfolio?.id ?? portfolio?.portfolioId;
    if (!portfolioId) return;
    setDetailModalPortfolio({ ...portfolio, id: portfolioId });
    setDetailModalInitialSell(options.startSell ? "portfolio" : null);
  }, []);

  const handlePortfolioSellComplete = useCallback(async () => {
    setDetailModalRefreshKey((key) => key + 1);
    await queryClient.invalidateQueries({
      queryKey: ["volumeLeaguePortfolios"],
    });
  }, [queryClient]);

  const parseCampaignBasketFromResponse = useCallback((response) => {
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
      const basket = preview.positions
        .map((position, index) => {
          const symbol = String(
            position?.symbol || position?.name || "",
          ).toUpperCase();
          if (!symbol) return null;
          return {
            id:
              position?.tokenId ||
              position?.contractAddress ||
              `${symbol}-${index}`,
            symbol,
            logo: position?.logo || null,
            category: position?.category || "BNB Chain",
            allocationUsd:
              position?.allocationUsd ??
              position?.allocation_usd ??
              position?.allocation ??
              null,
            quantity:
              position?.tokenAmount ??
              position?.token_amount ??
              position?.quantity ??
              null,
            price:
              position?.entryPriceUsd ??
              position?.entry_price_usd ??
              position?.priceUsd ??
              null,
            contractAddress: position?.contractAddress || null,
          };
        })
        .filter(Boolean);

      return {
        basket,
        execution: response?.execution || response?.data?.execution || null,
        meta: {
          chain: preview.chain || BINANCE_CAMPAIGN_CHAIN,
          executionMode: preview.executionMode || "ON_CHAIN",
        },
      };
    }

    const basket = parseQuickTokensFromMarkdown(
      response?.message || response?.content || "",
    );
    return {
      basket,
      execution: response?.execution || response?.data?.execution || null,
      meta: {
        chain: BINANCE_CAMPAIGN_CHAIN,
        executionMode: "ON_CHAIN",
      },
    };
  }, []);

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
      } else if (
        update.step === "POSITION_CONFIRMED" ||
        update.step === "POSITION_CANCELLED" ||
        update.step === "POSITION_FAILED" ||
        update.step === "POSITION_ERROR"
      ) {
        next.completed = (prev.completed || 0) + 1;
        next.currentSymbol = null;
        if (symbolKey) {
          next.tokenStatuses = {
            ...prev.tokenStatuses,
            [symbolKey]:
              update.step === "POSITION_CONFIRMED" ? "success" : "skipped",
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

  const resolveExecutionPrompt = useCallback((decision) => {
    const resolve = executionPromptResolverRef.current;
    executionPromptResolverRef.current = null;
    setExecutionPrompt(null);
    if (typeof resolve === "function") resolve(decision);
  }, []);

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

      return executePortfolioOnChain(execution, {
        onUpdate: handleExecutionUpdate,
        onPrompt: promptExecutionDecision,
        ...(privyTxEnv ? { txEnv: privyTxEnv } : {}),
      });
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

  const resetCreateWizard = useCallback(() => {
    setActionError("");
    setIsGenerating(false);
    setIsExecuting(false);
    setIsSwitchingChain(false);
    setGeneratedBasket([]);
    setGeneratedMeta(null);
    setExecutionPrompt(null);
    executionPromptResolverRef.current = null;
    setExecutionState({
      isExecuting: false,
      currentSymbol: null,
      completed: 0,
      total: 0,
      error: null,
      portfolioId: null,
      tokenStatuses: {},
    });
    setCampaignForm({
      amountUsd: null,
      customAmountUsdText: "",
      sourceToken: "USDT",
    });
  }, []);

  const openCreateWizard = useCallback(() => {
    if (!isConnected) {
      dispatch(setWalletModal(true));
      return;
    }
    setCreateWizardOpen(true);
  }, [dispatch, isConnected]);

  const handleSwitchChain = useCallback(async () => {
    if (!isConnected) {
      dispatch(setWalletModal(true));
      return;
    }

    const isPrivySession =
      authUser?.authProvider === "privy" ||
      sessionSource === "privy" ||
      walletType === "privy";

    try {
      setIsSwitchingChain(true);
      setActionError("");

      if (isPrivySession) {
        const embedded = getPrivyEmbedded(wallets);
        if (!embedded) {
          toast.error(
            "Embedded wallet not ready. Refresh the page or sign in again.",
          );
          return;
        }
        await switchPrivyEmbeddedToChain(embedded, BNB_CHAIN_SWITCH.chainId);
        dispatch(setChainId(BNB_CHAIN_SWITCH.chainId));
        toast.success(`Switched to ${targetChainLabel}.`);
        return;
      }

      if (!switchChainAsync) {
        toast.error(
          "Unable to switch chain. Please try reconnecting your wallet.",
        );
        return;
      }
      if (!activeConnector) {
        toast.error("No wallet connected. Please connect an EVM wallet first.");
        return;
      }

      try {
        await switchChainAsync({ chainId: BNB_CHAIN_SWITCH.chainId });
      } catch (error) {
        if (error?.code === 4902) {
          const provider = await activeConnector.getProvider();
          await provider.request({
            method: "wallet_addEthereumChain",
            params: [
              {
                chainId: BNB_CHAIN_SWITCH.chainHex,
                chainName: BNB_CHAIN_SWITCH.chainName,
                rpcUrls: BNB_CHAIN_SWITCH.rpcUrls,
                blockExplorerUrls: BNB_CHAIN_SWITCH.blockExplorerUrls,
                nativeCurrency: BNB_CHAIN_SWITCH.nativeCurrency,
              },
            ],
          });
          await switchChainAsync({ chainId: BNB_CHAIN_SWITCH.chainId });
        } else {
          throw error;
        }
      }

      dispatch(setChainId(BNB_CHAIN_SWITCH.chainId));
      toast.success(`Switched to ${targetChainLabel}.`);
    } catch (error) {
      console.error("Volume League chain switch error:", error);
      toast.error(`Failed to switch to ${targetChainLabel}.`);
    } finally {
      setIsSwitchingChain(false);
    }
  }, [
    activeConnector,
    authUser?.authProvider,
    dispatch,
    isConnected,
    sessionSource,
    switchChainAsync,
    targetChainLabel,
    walletType,
    wallets,
  ]);

  const handleGeneratePortfolio = useCallback(async () => {
    setActionError("");
    if (!isConnected) {
      dispatch(setWalletModal(true));
      return;
    }
    if (!onTargetChain) {
      setActionError(`Switch to ${targetChainLabel} to continue.`);
      return;
    }
    if (!canGenerate) {
      setActionError(`Please select ${amountMissingSelections.join(", ")}.`);
      return;
    }

    try {
      setIsGenerating(true);
      await ensureAuthenticated();
      const prompt = `Build a $${campaignForm.amountUsd} balanced diversified portfolio on BNB Chain (On-Chain Execution).`;
      const response = await apiCall("/chat/allox/message", {
        method: "POST",
        body: JSON.stringify({ message: prompt }),
      });
      const { basket, meta } = parseCampaignBasketFromResponse(response);
      if (!basket.length) {
        setActionError(
          "Could not generate a token basket. Try again or adjust your amount.",
        );
        return;
      }
      setGeneratedBasket(basket);
      setGeneratedMeta({
        ...meta,
        sourceToken: campaignForm.sourceToken,
        totalInvestment: campaignForm.amountUsd,
      });
    } catch (error) {
      if (error?.status === 401) logout();
      setActionError(
        error?.message || "Portfolio generation failed. Please try again.",
      );
    } finally {
      setIsGenerating(false);
    }
  }, [
    amountMissingSelections,
    campaignForm.amountUsd,
    campaignForm.sourceToken,
    canGenerate,
    dispatch,
    ensureAuthenticated,
    isConnected,
    logout,
    onTargetChain,
    parseCampaignBasketFromResponse,
    targetChainLabel,
  ]);

  const handleConfirmPortfolio = useCallback(async () => {
    setActionError("");
    if (!generatedBasket.length) return;
    if (!isConnected) {
      dispatch(setWalletModal(true));
      return;
    }
    if (!onTargetChain) {
      setActionError(`Switch to ${targetChainLabel} to continue.`);
      return;
    }

    try {
      setIsExecuting(true);
      await ensureAuthenticated();
      const tokenLines = generatedBasket
        .map((token) => {
          const allocation = Number(token.allocationUsd ?? 0);
          const quantity = token.quantity != null ? Number(token.quantity) : 0;
          const price = token.price != null ? Number(token.price) : 0;
          return `${token.symbol} (${token.category || "token"}): $${allocation.toFixed(
            2,
          )} / ${quantity} tokens at $${price.toFixed(6)}`;
        })
        .join("\n");
      const response = await apiCall("/chat/allox/message", {
        method: "POST",
        body: JSON.stringify({
          message: `Confirm and execute this quick portfolio.\nChain: BNB Chain (On-Chain Execution)\nPayment token: ${campaignForm.sourceToken}\n- Portfolio type: Diversified\n- Investment: $${campaignForm.amountUsd}\n- Risk tolerance: Balanced (medium)\nTokens:\n${tokenLines}`,
        }),
      });
      if (!(response?.action === "START_EXECUTION" && response?.execution)) {
        setActionError(
          "Execution payload was not returned. Please generate again and retry.",
        );
        return;
      }
      const completeData = await handleStartExecution({
        ...response.execution,
        sourceToken: campaignForm.sourceToken,
      });
      setExecutionState((prev) => ({
        ...prev,
        isExecuting: false,
        portfolioId:
          completeData?.portfolioId ||
          completeData?.id ||
          completeData?.portfolio?.id ||
          null,
      }));
      void queryClient.invalidateQueries({
        queryKey: ["volumeLeaguePortfolios"],
      });
      setCreateWizardOpen(false);
      resetCreateWizard();
    } catch (error) {
      if (error?.status === 401) logout();
      setActionError(error?.message || "Execution failed. Please try again.");
    } finally {
      setIsExecuting(false);
    }
  }, [
    campaignForm.amountUsd,
    campaignForm.sourceToken,
    dispatch,
    ensureAuthenticated,
    generatedBasket,
    handleStartExecution,
    isConnected,
    logout,
    onTargetChain,
    queryClient,
    resetCreateWizard,
    targetChainLabel,
  ]);

  const handleWizardPrimaryAction = useCallback(async () => {
    if (generatedBasket.length > 0) {
      await handleConfirmPortfolio();
    } else {
      await handleGeneratePortfolio();
    }
  }, [generatedBasket.length, handleConfirmPortfolio, handleGeneratePortfolio]);

  useEffect(() => {
    const loadVolumeCampaignData = async () => {
      try {
        const campaignResult = await fetchCompetition();
        // console.log(
        //   "[VolumeLeagueCampaign] /campaigns/volume-league",
        //   campaignResult,
        // );

        const leaderboardResult = await fetchLeaderboard({
          week: selectedWeek + 1,
          limit: 10,
        });
        // console.log(
        //   "[VolumeLeagueCampaign] /campaigns/volume-league/leaderboard",
        //   leaderboardResult,
        // );

        if (walletAddress) {
          const userResult = await fetchUserCompetitionData({
            address: walletAddress,
          });
          // console.log(
          //   "[VolumeLeagueCampaign] /campaigns/volume-league/?address=...",
          //   userResult,
          // );
        } else {
          // console.log(
          //   "[VolumeLeagueCampaign] skipped /campaigns/volume-league/?address=... because no wallet is connected yet",
          // );
        }
      } catch (fetchError) {
        console.error(
          "[VolumeLeagueCampaign] failed to load volume campaign data",
          fetchError,
        );
      }
    };

    loadVolumeCampaignData();
  }, [
    fetchCompetition,
    fetchLeaderboard,
    fetchUserCompetitionData,
    selectedWeek,
    walletAddress,
  ]);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-3">
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-4">
                <h2 className="text-xl md:text-3xl  font-bold text-gray-900">
                  Volume League
                </h2>
                <span className=" text-gray-600 text-md font-bold rounded-full  tracking-wider">
                  ($500,000 Reward)
                </span>
              </div>
              <p className="text-gray-500 mt-1 text-sm">
                Generate volume, climb tier brackets, and earn weekly guaranteed
                rewards
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Your Position */}
      <div className="glass-card p-5">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 sm:mb-0">
          <h3 className="font-bold text-gray-900 mb-5">
            2 Simple Steps To Earn
          </h3>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowTutorialModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
            >
              <HelpCircle className="w-3.5 h-3.5" />
              Guide
            </button>
            <button
              onClick={() => setShowFAQModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
            >
              <BookOpen className="w-3.5 h-3.5" />
              FAQs
            </button>
            <button
              onClick={() => setShowTermsModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
            >
              <FileText className="w-4 h-4" />
              Terms
            </button>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch gap-0">
          {/* Step 1 — Create a Portfolio */}
          <div className="flex-1 relative bg-blue-50 border border-blue-200/60 rounded-2xl p-4 sm:rounded-r-none sm:border-r-0">
            <div className="flex items-center gap-2 mb-2">
              <div className="px-2 py-1 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-white text-xs font-bold">Step 1</span>
              </div>
              <span className="font-bold text-gray-900 text-sm">
                {" "}
                Create a Portfolio
              </span>
            </div>
            <p className="text-xs text-gray-500 leading-relaxed ">
              Select tokens and build different portfolios with any amount.
            </p>
          </div>

          {/* Connector → */}
          <div className="hidden sm:flex items-center justify-center w-8 bg-gray-50 border-y border-gray-200/60 z-10">
            <div className="w-4 h-4 border-t-2 border-r-2 border-gray-900 rotate-45 -ml-2" />
          </div>
          <div className="flex sm:hidden items-center justify-center h-6">
            <div className="w-4 h-4 border-b-2 border-r-2 border-gray-900 rotate-45 -mt-2" />
          </div>

          {/* Step 2 — Generate Volume */}
          <div className="flex-1 relative bg-blue-50 border border-blue-200/60 rounded-2xl p-4 sm:rounded-none sm:border-x-0">
            <div className="flex items-center gap-2 mb-2">
              <div className="px-2 py-1 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-white text-xs font-bold">Step 2</span>
              </div>
              <span className="font-bold text-gray-900 text-sm">
                Generate Volume
              </span>
            </div>
            <p className="text-xs text-gray-500 leading-relaxed ">
              Every buy/sell counts to your weekly volume. A $500 minimum volume
              required.
            </p>
            {/* Progress bar */}
          </div>

          {/* Connector → */}
          <div className="flex items-center justify-center w-8 bg-gray-50 border-y border-gray-200/60 z-10 w-full sm:w-fit py-2 px-2">
            <div className="flex flex-col gap-1">
              <div className="w-4 h-0.5 bg-gray-900 rounded-full" />
              <div className="w-4 h-0.5 bg-gray-900 rounded-full" />
            </div>
          </div>

          {/* Step 3 — Guaranteed Rewards */}
          <div className="flex-1 relative bg-green-50 border border-green-200/60 rounded-2xl p-4 sm:rounded-l-none sm:border-l-0">
            <div className="flex items-center gap-2 mb-2">
              <div className="px-2 py-1 bg-green-600 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-white text-xs font-bold">Rewards</span>
              </div>
              <span className="font-bold text-gray-900 text-sm">
                Guaranteed Rewards + Bonus
              </span>
            </div>
            <p className="text-xs text-gray-500 leading-relaxed ">
              Every participant earns a reward share each week, plus an extra
              bonus.
            </p>
          </div>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        {/* My Position */}
        <div className="glass-card p-5 border-blue-200/50 bg-gradient-to-br from-blue-50/40 to-indigo-50/40 sm:h-[375px]">
          <div className="flex items-center justify-between gap-2 mb-4">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 bg-blue-100 rounded-lg flex items-center justify-center">
                <TrendingUp size={14} className="text-blue-600" />
              </div>
              <span className="font-bold text-gray-900 text-sm">
                My Position
              </span>
              <span className="hidden sm:flex px-2.5 py-1 bg-green-100 text-green-700 text-[10px] font-bold rounded-full uppercase tracking-wider">
                Guaranteed Rewards
              </span>
            </div>
            <div className="flex items-center gap-2">
              {currentUser.tier && (
                <span
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-bold ${currentUser.tier.badge}`}
                >
                  <div
                    className={`w-1.5 h-1.5 rounded-full bg-gradient-to-br ${currentUser.tier.color}`}
                  />
                  {currentUser.tier.label}
                </span>
              )}
              <select
                value={positionWeek}
                onChange={(e) => setPositionWeek(Number(e.target.value))}
                className="text-xs font-semibold text-gray-700 bg-white border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-300 cursor-pointer"
              >
                {WEEKS.map((w, i) => (
                  <option key={i} value={i}>
                    Wk {w.week}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Stats — Rank, Volume, Portfolios */}
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-white/70 rounded-xl p-2.5 text-center">
              <Crown size={13} className="text-yellow-500 mx-auto mb-1" />
              <div className="font-bold text-gray-900 text-lg">
                #{currentUser.rank}
              </div>
              <div className="text-[10px] text-gray-500">Reward Share</div>
            </div>
            <div className="bg-white/70 rounded-xl p-2.5 text-center">
              <Wallet size={13} className="text-green-500 mx-auto mb-1" />
              <div className="font-bold text-gray-900 text-lg">
                {fmt(currentUser.totalVolume)}
              </div>
              <div className="text-[10px] text-gray-500">Extra Bonus</div>
            </div>
            <div className="bg-white/70 rounded-xl p-2.5 text-center">
              <PieChart size={13} className="text-blue-500 mx-auto mb-1" />
              <div className="font-bold text-gray-900 text-lg">
                {portfolios.length}
              </div>
              <div className="text-[10px] text-gray-500">Volume</div>
            </div>
          </div>

          {recentPortfoliosQuery.error && (
            <div className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
              Failed to load portfolios for this wallet.
            </div>
          )}

          {actionError && !createWizardOpen && (
            <div className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
              {actionError}
            </div>
          )}

          {(executionState.isExecuting || isExecuting) && !createWizardOpen && (
            <div className="mt-3 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-800">
              {executionState.currentSymbol
                ? `Processing ${executionState.currentSymbol} (${executionState.completed}/${executionState.total} done)`
                : executionState.total > 0
                  ? `Swaps completed: ${executionState.completed}/${executionState.total}`
                  : "Preparing portfolio execution..."}
            </div>
          )}

          {/* Create Portfolio — big upload-style when empty, small when portfolios exist */}
          {portfolios.length === 0 ? (
            <button
              onClick={openCreateWizard}
              className="w-full group flex flex-col items-center justify-center gap-2 py-8 rounded-2xl border-2 border-dashed border-blue-300 bg-blue-50/50 hover:bg-blue-600 hover:border-blue-600 transition-all duration-200 sm:h-[205px]"
            >
              <div className="w-10 h-10 rounded-full bg-blue-100 group-hover:bg-blue-500 flex items-center justify-center transition-colors">
                <Plus
                  size={20}
                  className="text-blue-600 group-hover:text-white transition-colors"
                />
              </div>
              <div className="text-center">
                <div className="font-bold text-gray-900 group-hover:text-white text-sm transition-colors">
                  Create Portfolio
                </div>
                <div className="text-xs text-gray-400 group-hover:text-blue-100 transition-colors mt-0.5">
                  Select tokens · every trade counts as volume
                </div>
              </div>
            </button>
          ) : (
            <>
              <button
                onClick={openCreateWizard}
                className="w-full group flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 border-dashed border-blue-300 bg-blue-50/50 hover:bg-blue-600 hover:border-blue-600 transition-all duration-200 mb-3"
              >
                <Plus
                  size={14}
                  className="text-blue-600 group-hover:text-white transition-colors"
                />
                <span className="text-sm font-semibold text-gray-800 group-hover:text-white transition-colors">
                  Create Portfolio
                </span>
              </button>

              {/* Portfolio horizontal list / slider */}
              <div>
                <div className="flex items-center justify-between mb-2 h-6">
                  <span className="text-xs font-semibold text-gray-500">
                    My Portfolios
                  </span>
                  {portfolios.length > 3 && (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() =>
                          setPortfolioSlide((s) => Math.max(0, s - 1))
                        }
                        disabled={portfolioSlide === 0}
                        className="w-6 h-6 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center disabled:opacity-30 transition-all"
                      >
                        <svg
                          width="10"
                          height="10"
                          viewBox="0 0 20 20"
                          fill="none"
                        >
                          <path
                            d="M13 5l-5 5 5 5"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                          />
                        </svg>
                      </button>
                      <span className="text-[10px] text-gray-400">
                        {portfolioSlide + 1}–
                        {Math.min(portfolioSlide + 3, portfolios.length)} of{" "}
                        {portfolios.length}
                      </span>
                      <button
                        onClick={() =>
                          setPortfolioSlide((s) =>
                            Math.min(portfolios.length - 3, s + 1),
                          )
                        }
                        disabled={portfolioSlide >= portfolios.length - 3}
                        className="w-6 h-6 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center disabled:opacity-30 transition-all"
                      >
                        <svg
                          width="10"
                          height="10"
                          viewBox="0 0 20 20"
                          fill="none"
                        >
                          <path
                            d="M7 5l5 5-5 5"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                          />
                        </svg>
                      </button>
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {portfolios
                    .slice(portfolioSlide, portfolioSlide + 3)
                    .map((p) => {
                      const total =
                        p?.totalCurrentValue ??
                        p?.totalCurrentValueUsd ??
                        p?.totalValue ??
                        0;
                      const portfolioId = p?.id ?? p?.portfolioId;
                      return (
                        <div
                          key={String(portfolioId)}
                          role="button"
                          tabIndex={0}
                          onClick={() => openPortfolioDetailModal(p)}
                          onKeyDown={(event) => {
                            if (event.key === "Enter" || event.key === " ") {
                              event.preventDefault();
                              openPortfolioDetailModal(p);
                            }
                          }}
                          className="relative flex flex-col items-center p-3 bg-white/70 hover:bg-white border border-gray-200/60 hover:border-blue-300 rounded-xl transition-all group cursor-pointer"
                        >
                          <div className="w-9 h-9 bg-blue-100 group-hover:bg-blue-200 rounded-xl flex items-center justify-center mb-2 transition-colors">
                            <PieChart size={15} className="text-blue-600" />
                          </div>
                          <div className="text-[10px] font-bold text-gray-900 text-center leading-tight">
                            {p.name || "Portfolio"}
                          </div>
                          <div className="text-[10px] text-gray-400 mt-0.5">
                            {String(p?.riskProfile || "")
                              .slice(0, 8)
                              .trim() || "BNB Chain"}
                          </div>
                          <div className="text-xs font-bold text-gray-900 mt-1.5">
                            ${total.toFixed(0)}
                          </div>
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              openPortfolioDetailModal(p, { startSell: true });
                            }}
                            className="absolute right-2 top-0 mt-2 inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-white px-2.5 py-1 text-[10px] font-semibold text-emerald-600 hover:bg-emerald-200/30"
                          >
                            Sell
                          </button>
                        </div>
                      );
                    })}
                </div>
              </div>
            </>
          )}
        </div>

        {/* My Earnings — Tier Bonus info */}
        <div className="glass-card p-5 border-amber-200/50 bg-gradient-to-br from-amber-50/30 to-orange-50/30 sm:h-[375px]">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-7 h-7 bg-amber-100 rounded-lg flex items-center justify-center">
              <Award size={14} className="text-amber-600" />
            </div>
            <span className="font-bold text-gray-900 text-sm">
              Reward Tiers
            </span>
            <span className="px-2.5 py-1 bg-green-100 text-green-700 text-[10px] font-bold rounded-full uppercase tracking-wider">
              Extra Bonus
            </span>
          </div>
          <p className="text-xs text-gray-400 mb-4 pl-9">
            Rank in the top 150 and hit the volume threshold to unlock your tier
            bonus this week.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:h-[265px]">
            {TIERS.map((tier) => {
              const isUserTier = currentUser.tier?.label === tier.label;
              return (
                <div
                  key={tier.label}
                  className={`rounded-2xl p-3 border ${isUserTier ? `${tier.bg} ${tier.border} border-2` : "bg-white/60 border-gray-200/60"}`}
                >
                  <div
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-bold mb-2 ${tier.badge}`}
                  >
                    <div
                      className={`w-1.5 h-1.5 rounded-full bg-gradient-to-br ${tier.color}`}
                    />
                    {tier.label}
                  </div>
                  <div className="text-xs text-gray-500 mb-2 leading-relaxed">
                    {tier.ranks} · {fmt(tier.volThreshold)}+ volume required
                  </div>
                  <div className="font-bold text-gray-900">
                    ${tier.bonus.toLocaleString()}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Weekly Leaderboard */}
      <div className="glass-card p-6">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2">
                <Calendar size={18} className="text-gray-600" />
                <h3 className="font-bold text-gray-900">Weekly Leaderboard</h3>
              </div>
              <span className="px-2.5 py-1 bg-green-100 text-green-700 text-[12px] font-bold rounded-full  tracking-wider">
                $100K/Week
              </span>
            </div>
            <p className="text-xs text-gray-400 mb-4">
              The more volume you generate, the larger your reward share
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {WEEKS.map((w, i) => (
              <button
                key={w.week}
                onClick={() => setSelectedWeek(i)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border ${
                  selectedWeek === i
                    ? "bg-black text-white border-black"
                    : "text-gray-600 border-gray-200 hover:border-gray-400 hover:text-gray-900 bg-white"
                }`}
              >
                Week {w.week}
                <span className="ml-1.5 opacity-60">
                  {w.dateRange.split("–")[0].trim()}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="text-xs text-gray-500 mb-4 flex items-center gap-1.5">
          <Calendar size={12} /> {WEEKS[selectedWeek].dateRange}
          <span
            className={`ml-1 px-2 py-0.5 rounded-full capitalize ${
              selectedWeekStatus === "live"
                ? "bg-green-100 text-green-700"
                : "bg-gray-100 text-gray-500"
            }`}
          >
            {selectedWeekStatus}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-2.5 px-2 text-gray-500 font-semibold text-xs">
                  #
                </th>
                <th className="text-left py-2.5 px-2 text-gray-500 font-semibold text-xs">
                  Wallet
                </th>
                <th className="text-left py-2.5 px-2 text-gray-500 font-semibold text-xs">
                  Portfolios
                </th>
                <th className="text-left py-2.5 px-2 text-gray-500 font-semibold text-xs">
                  Volume
                </th>
                <th className="text-left py-2.5 px-2 text-gray-500 font-semibold text-xs">
                  Tier
                </th>
                <th className="text-left py-2.5 px-2 text-gray-500 font-semibold text-xs">
                  Reward Share
                </th>
                <th className="text-left py-2.5 px-2 text-gray-500 font-semibold text-xs">
                  Tier Bonus
                </th>
                <th className="text-left py-2.5 px-2 text-gray-500 font-semibold text-xs">
                  Total
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {leaderboard.map((row) => {
                const bonusAmt = row.tier && row.unlocked ? row.tier.bonus : 0;
                const total = row.baseShare + bonusAmt;
                const needed =
                  row.tier && !row.unlocked
                    ? row.tier.volThreshold - row.vol
                    : 0;
                return (
                  <tr
                    key={row.rank}
                    className="hover:bg-white/60 transition-colors"
                  >
                    <td className="py-2.5 px-2">
                      <div className="flex items-center justify-center w-5">
                        <PositionIcon rank={row.rank} />
                      </div>
                    </td>
                    <td className="py-2.5 px-2 font-mono text-xs text-gray-700">
                      0x{((row.rank * 0xd3ad) >>> 0).toString(16).slice(0, 4)}
                      ...{((row.rank * 0xbeef) >>> 0).toString(16).slice(0, 4)}
                    </td>
                    <td className="py-2.5 px-2 text-gray-700 font-medium">
                      {row.portfolios}
                    </td>
                    <td className="py-2.5 px-2 font-semibold text-gray-900">
                      {fmt(row.vol)}
                    </td>
                    <td className="py-2.5 px-2">
                      {row.tier ? (
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-bold ${row.tier.badge}`}
                        >
                          <div
                            className={`w-1.5 h-1.5 rounded-full bg-gradient-to-br ${row.tier.color}`}
                          />
                          {row.tier.label}
                        </span>
                      ) : (
                        <span className="text-gray-400 text-xs">—</span>
                      )}
                    </td>
                    <td className="py-2.5 px-2 text-blue-700 font-semibold text-xs">
                      ${row.baseShare.toFixed(0)}
                    </td>
                    <td className="py-2.5 px-2">
                      {row.tier ? (
                        <div className="relative group/tip inline-flex items-center gap-1">
                          <span
                            className={`inline-flex items-center gap-1 text-xs font-bold ${row.unlocked ? "text-green-600" : "text-gray-400"}`}
                          >
                            {row.unlocked ? (
                              <Check size={12} />
                            ) : (
                              <Lock size={12} />
                            )}
                            ${row.tier.bonus.toLocaleString()}
                          </span>
                          {/* Tooltip for locked bonus */}
                          {!row.unlocked && (
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover/tip:flex z-30 pointer-events-none">
                              <div className="bg-gray-900 text-white text-xs rounded-lg px-3 py-2 whitespace-nowrap shadow-xl">
                                <div className="font-semibold mb-0.5">
                                  Bonus locked
                                </div>
                                <div className="text-gray-300">
                                  Need{" "}
                                  <span className="text-white font-bold">
                                    {fmt(needed)}
                                  </span>{" "}
                                  more to unlock
                                </div>
                                <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900" />
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-400 text-xs">—</span>
                      )}
                    </td>
                    <td className="py-2.5 px-2">
                      <span
                        className={`text-xs font-bold ${row.unlocked && row.tier ? "text-gray-900" : "text-gray-900"}`}
                      >
                        ${total.toFixed(0)}
                        {row.tier && !row.unlocked && (
                          <span className="text-black-500 font-normal"> </span>
                        )}
                      </span>
                    </td>
                  </tr>
                );
              })}

              {/* Current user row */}
              {(() => {
                const userBonusAmt =
                  currentUser.tier && currentUser.unlocked
                    ? currentUser.tier.bonus
                    : 0;
                const userTotal = currentUserBaseShare + userBonusAmt;
                const userNeeded =
                  currentUser.tier && !currentUser.unlocked
                    ? currentUser.tier.volThreshold - currentUser.thisWeekVol
                    : 0;
                return (
                  <tr className="bg-blue-50/80 border-t-2 border-blue-300">
                    <td className="py-2.5 px-2">
                      <span className="text-blue-700 text-xs font-bold">
                        {currentUser.rank}
                      </span>
                    </td>
                    <td className="py-2.5 px-2 font-mono text-xs text-blue-700 font-semibold">
                      {currentUser.address} (you)
                    </td>
                    <td className="py-2.5 px-2 text-gray-700 font-medium">
                      {currentUser.portfolios}
                    </td>
                    <td className="py-2.5 px-2 font-semibold text-gray-900">
                      {fmt(currentUser.thisWeekVol)}
                    </td>
                    <td className="py-2.5 px-2">
                      {currentUser.tier && (
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-bold ${currentUser.tier.badge}`}
                        >
                          <div
                            className={`w-1.5 h-1.5 rounded-full bg-gradient-to-br ${currentUser.tier.color}`}
                          />
                          {currentUser.tier.label}
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-2 text-blue-700 font-semibold text-xs">
                      ${currentUserBaseShare.toFixed(0)}
                    </td>
                    <td className="py-2.5 px-2">
                      <div className="relative group/tip inline-flex items-center gap-1">
                        <span
                          className={`inline-flex items-center gap-1 text-xs font-bold ${currentUser.unlocked ? "text-green-600" : "text-gray-400"}`}
                        >
                          {currentUser.unlocked ? (
                            <Check size={12} />
                          ) : (
                            <Lock size={12} />
                          )}
                          ${currentUser.tier?.bonus.toLocaleString()}
                        </span>
                        {!currentUser.unlocked && userNeeded > 0 && (
                          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover/tip:flex z-30 pointer-events-none">
                            <div className="bg-gray-900 text-white text-xs rounded-lg px-3 py-2 whitespace-nowrap shadow-xl">
                              <div className="font-semibold mb-0.5">
                                Bonus locked 🔒
                              </div>
                              <div className="text-gray-300">
                                Need{" "}
                                <span className="text-white font-bold">
                                  {fmt(userNeeded)}
                                </span>{" "}
                                more to unlock
                              </div>
                              <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900" />
                            </div>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="py-2.5 px-2">
                      <span
                        className={`text-xs font-bold ${currentUser.unlocked ? "text-gray-900" : "text-gray-400"}`}
                      >
                        ${userTotal.toFixed(0)}
                        {currentUser.tier && !currentUser.unlocked && (
                          <span className="text-gray-300 font-normal">
                            {" "}
                            (+${currentUser.tier.bonus} locked)
                          </span>
                        )}
                      </span>
                    </td>
                  </tr>
                );
              })()}
            </tbody>
          </table>
        </div>
      </div>

      {showBonusModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[82vh] overflow-hidden flex flex-col">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold">Extra Bonuses</h3>
              </div>
              <button
                onClick={() => setShowBonusModal(false)}
                className="w-9 h-9 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center transition-colors"
              >
                <X size={18} />
              </button>
            </div>
            <div className="overflow-y-auto p-6 space-y-5">
              {/* Pool budget overview */}

              {/* Tier breakdown cards */}
              <div className="space-y-3">
                {TIERS.map((tier) => (
                  <div
                    key={tier.label}
                    className={`rounded-2xl p-4 ${tier.bg} border ${tier.border}`}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold mb-1 ${tier.badge}`}
                        >
                          <div
                            className={`w-2 h-2 rounded-full bg-gradient-to-br ${tier.color}`}
                          />
                          {tier.label}
                        </div>
                        <div className={`text-sm font-semibold ${tier.text}`}>
                          {tier.ranks}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-gray-900">
                          ${tier.bonus.toLocaleString()}
                        </div>
                        <div className="text-xs text-gray-500">
                          one-time bonus
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2 pt-3 border-t border-gray-200/60">
                      <div>
                        <div className="text-xs text-gray-500 mb-0.5">
                          Slots
                        </div>
                        <div className="font-semibold text-gray-900 text-sm">
                          {tier.slots}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500 mb-0.5">
                          Volume to unlock
                        </div>
                        <div className="font-semibold text-gray-900 text-sm">
                          {fmt(tier.volThreshold)}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500 mb-0.5">
                          Weekly budget
                        </div>
                        <div className="font-semibold text-gray-900 text-sm">
                          ${tier.budgetPerWeek.toLocaleString()}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── FAQ Modal ── */}
      {showFAQModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold">
                  Frequently Asked Questions
                </h3>
                <p className="text-sm text-gray-500 mt-0.5">Volume League</p>
              </div>
              <button
                onClick={() => setShowFAQModal(false)}
                className="w-9 h-9 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center transition-colors"
              >
                <X size={18} />
              </button>
            </div>
            <div className="overflow-y-auto p-6 space-y-2">
              {faqs.map((faq, i) => (
                <FAQItem key={i} q={faq.q} a={faq.a} />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Terms Modal ── */}
      {showTermsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold">Terms & Conditions</h3>
                <p className="text-sm text-gray-500 mt-0.5">Volume League</p>
              </div>
              <button
                onClick={() => setShowTermsModal(false)}
                className="w-9 h-9 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center transition-colors"
              >
                <X size={18} />
              </button>
            </div>
            <div className="overflow-y-auto p-6 space-y-6">
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Users size={16} className="text-gray-600" />
                  <h4 className="font-bold text-gray-900">Eligibility</h4>
                </div>
                <p className="text-sm text-gray-700 leading-relaxed">
                  All users participating in any active AlloX campaign are
                  eligible for Volume League. This includes participants from
                  the Binance Wallet Campaign, Prove Your Portfolio, Prime
                  Picks, and the Quick Portfolio Builder.
                </p>
              </div>
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <BarChart2 size={16} className="text-gray-600" />
                  <h4 className="font-bold text-gray-900">
                    Reward Share Pool Rules
                  </h4>
                </div>
                <ul className="space-y-2 text-sm text-gray-700">
                  {[
                    "Every user who trades a minimum of $500 in a given week earns a share of the $70K weekly reward share pool",
                    "Reward share is calculated as: √(your volume) ÷ Σ√(all users' volumes) × $70,000",
                    "Rankings and pool shares reset every week at 00:00 UTC on Monday",
                    "Volume from Prime Picks, Quick Portfolio Builder, and Binance Wallet Campaign tasks all count",
                  ].map((item, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-gray-400 mt-1.5 flex-shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Award size={16} className="text-gray-600" />
                  <h4 className="font-bold text-gray-900">Tier Bonus Rules</h4>
                </div>
                <ul className="space-y-2 text-sm text-gray-700">
                  {[
                    "Top 150 users by √(volume) rank each week are assigned a tier: top 10 = Diamond, 11–30 = Gold, 31–70 = Silver, 71–150 = Bronze",
                    "Each tier has a volume threshold that must be hit to unlock the bonus: Diamond $100K, Gold $50K, Silver $25K, Bronze $5K",

                    "Bonus amounts are fixed: Diamond $1,000 · Gold $500 · Silver $150 · Bronze $50",
                  ].map((item, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-gray-400 mt-1.5 flex-shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Lock size={16} className="text-gray-600" />
                  <h4 className="font-bold text-gray-900">General Terms</h4>
                </div>
                <ul className="space-y-2.5 text-sm text-gray-700">
                  {[
                    "Full rewards require total campaign volume to reach $100M. If not met, the reward pool scales proportionally",
                    "Using multiple wallets, wash trading, or any volume manipulation results in permanent disqualification",
                    "AlloX reserves the right to adjust pool sizes, tier thresholds, or campaign duration with reasonable notice",
                    "All rewards are subject to cliff and vesting linearly at ALLOX TGE",
                    "AlloX's decisions on eligibility, disqualification, and distribution are final",
                    "Participants from jurisdictions where participation is prohibited by law are not eligible",
                  ].map((item, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <div className="w-5 h-5 rounded-full border-2 border-gray-300 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <div className="w-1.5 h-1.5 rounded-full bg-gray-400" />
                      </div>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}
      {createWizardOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl max-w-3xl w-full max-h-[85vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold">Create Portfolio</h3>
                <p className="text-xs text-gray-500 mt-1">
                  Volume League uses BNB Chain only.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setCreateWizardOpen(false);
                  resetCreateWizard();
                }}
                className="w-9 h-9 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-orange-50 border border-orange-200/80 text-xs text-orange-900 w-fit">
                <img
                  src="https://cdn.allox.ai/allox/networks/bnbIcon.svg"
                  alt=""
                  className="h-5 w-5"
                />
                <span className="font-medium">{targetChainLabel}</span>
              </div> */}

              {actionError && (
                <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                  {actionError}
                </div>
              )}

              <div className="rounded-2xl bg-white/70 border border-gray-200/60 p-4 shadow-sm">
                <div className="text-sm font-semibold text-gray-900 mb-2">
                  Choose your investment amount
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-3">
                  {BINANCE_CAMPAIGN_AMOUNT_TIERS.map(({ amountUsd }) => {
                    const selected =
                      campaignForm.amountUsd === amountUsd &&
                      campaignForm.customAmountUsdText === "";
                    return (
                      <button
                        key={amountUsd}
                        type="button"
                        onClick={() =>
                          setCampaignForm((prev) => ({
                            ...prev,
                            amountUsd,
                            customAmountUsdText: "",
                          }))
                        }
                        className={
                          selected
                            ? "px-4 py-2.5 bg-gray-900 text-white border border-gray-900 rounded-xl text-sm font-semibold hover:bg-gray-800 shadow-sm"
                            : "px-4 py-2.5 bg-white/80 border border-gray-200 rounded-xl text-sm font-semibold hover:bg-white hover:border-gray-300"
                        }
                      >
                        ${amountUsd.toLocaleString("en-US")}
                      </button>
                    );
                  })}
                  <button
                    type="button"
                    onClick={() =>
                      setCampaignForm((prev) => ({
                        ...prev,
                        amountUsd: null,
                        customAmountUsdText: "",
                      }))
                    }
                    className={
                      campaignForm.customAmountUsdText !== ""
                        ? "px-4 py-2.5 bg-gray-900 text-white border border-gray-900 rounded-xl text-sm font-semibold hover:bg-gray-800 shadow-sm"
                        : "px-4 py-2.5 bg-white/80 border border-gray-200 rounded-xl text-sm font-semibold hover:bg-white hover:border-gray-300"
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
                  min={BINANCE_CAMPAIGN_MIN_AMOUNT_USD}
                  maxLength={8}
                  value={campaignForm.customAmountUsdText}
                  placeholder="$ e.g. 750"
                  onChange={(e) => {
                    const raw = e.target.value;
                    setCampaignForm((prev) => ({
                      ...prev,
                      customAmountUsdText: raw,
                      amountUsd: raw.trim() === "" ? null : Number(raw),
                    }));
                  }}
                  className="w-full px-4 py-3 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 bg-white/70"
                />
              </div>

              <div className="rounded-2xl bg-white/70 border border-gray-200/60 p-4 shadow-sm">
                <div className="text-sm font-semibold text-gray-900 mb-2">
                  Pay with
                </div>
                <div className="flex flex-wrap gap-2">
                  {BINANCE_CAMPAIGN_SOURCE_TOKENS.map((symbol) => {
                    const selected = campaignForm.sourceToken === symbol;
                    return (
                      <button
                        key={symbol}
                        type="button"
                        onClick={() =>
                          setCampaignForm((prev) => ({
                            ...prev,
                            sourceToken: symbol,
                          }))
                        }
                        className={
                          selected
                            ? "inline-flex items-center gap-2 px-4 py-2 bg-gray-900 text-white border border-gray-900 rounded-xl text-sm font-medium hover:bg-gray-800 shadow-sm"
                            : "inline-flex items-center gap-2 px-4 py-2 bg-white/80 border border-gray-200 rounded-xl text-sm font-medium hover:bg-white hover:border-gray-300"
                        }
                      >
                        {symbol}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="rounded-2xl bg-white/70 border border-gray-200/60 p-4 shadow-sm">
                <div className="text-sm font-semibold text-gray-900 mb-3">
                  What&apos;s Included?
                </div>
                <div className="flex flex-wrap gap-1 mb-3">
                  {PRIME_PICKS_INCLUDED_TOKENS.map((token) => (
                    <div
                      key={token.symbol}
                      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-gray-100 border border-gray-200/80"
                    >
                      <img
                        src={token.logo}
                        alt={token.symbol}
                        className="w-6 h-6"
                      />
                      <span className="text-sm font-medium text-gray-800">
                        {token.symbol}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="flex items-start gap-2 text-sm text-gray-600">
                  <Info size={16} className="shrink-0 mt-0.5 text-gray-400" />
                  <p>
                    Your portfolio will include {PRIME_PICKS_PORTFOLIO_SIZE}{" "}
                    randomly selected assets from the pool above.
                  </p>
                </div>
              </div>

              {generatedBasket.length > 0 && (
                <div className="rounded-2xl bg-blue-50/70 border border-blue-200/70 p-4 space-y-3">
                  <div>
                    <div className="text-sm font-semibold text-gray-900">
                      Your portfolio
                    </div>
                    <div className="text-xs text-gray-600 mt-1">
                      {generatedMeta?.chain || BINANCE_CAMPAIGN_CHAIN} ·
                      On-Chain Execution
                      {generatedMeta?.sourceToken
                        ? ` · Pay with ${generatedMeta.sourceToken}`
                        : ""}
                    </div>
                  </div>

                  <div className="space-y-2">
                    {generatedBasket.map((token, idx) => {
                      const status =
                        executionState.tokenStatuses?.[
                          String(token.symbol || "").toUpperCase()
                        ];
                      const isProcessing =
                        (executionState.isExecuting || isExecuting) &&
                        (executionState.currentSymbol === token.symbol ||
                          status === "processing");
                      return (
                        <div
                          key={String(token.id || `${token.symbol}-${idx}`)}
                          className={`flex items-center justify-between gap-3 rounded-xl border px-3 py-2.5 ${
                            status === "success"
                              ? "border-green-200 bg-green-50"
                              : status === "skipped"
                                ? "border-red-200 bg-red-50"
                                : isProcessing
                                  ? "border-blue-200 bg-blue-50"
                                  : "border-gray-200 bg-white/80"
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            {token.logo ? (
                              <img
                                src={token.logo}
                                alt={token.symbol}
                                className="w-8 h-8 rounded-full bg-white border border-gray-200"
                              />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-gray-100 border border-gray-200" />
                            )}
                            <div className="min-w-0">
                              <div className="text-sm font-semibold text-gray-900">
                                {token.symbol}
                              </div>
                              <div className="text-xs text-gray-500 truncate">
                                ${Number(token.allocationUsd || 0).toFixed(2)}{" "}
                                allocation
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-semibold text-gray-800">
                              {token.quantity != null
                                ? Number(token.quantity).toFixed(4)
                                : "—"}
                            </div>
                            <div className="text-xs text-gray-500 flex items-center justify-end gap-1">
                              {isProcessing && (
                                <Loader2 className="w-3 h-3 animate-spin shrink-0" />
                              )}
                              {status === "success" && (
                                <CheckCircle2 className="w-3 h-3 text-green-600 shrink-0" />
                              )}
                              {status === "skipped" && (
                                <AlertTriangle className="w-3 h-3 text-red-500 shrink-0" />
                              )}
                              {token.price != null
                                ? `@ $${Number(token.price).toFixed(4)}`
                                : "Ready"}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {(executionState.isExecuting || isExecuting) && (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2">
                  <div className="flex items-center gap-2 text-xs text-emerald-800 font-medium">
                    <Loader2 size={13} className="animate-spin shrink-0" />
                    <span>
                      {executionState.currentSymbol
                        ? `Processing ${executionState.currentSymbol} (${executionState.completed}/${executionState.total} done)`
                        : executionState.total > 0
                          ? `Swaps completed: ${executionState.completed}/${executionState.total}`
                          : "Preparing swaps..."}
                    </span>
                  </div>
                </div>
              )}

              {executionPrompt && (
                <div className="glass-card p-4 border border-amber-200/60 bg-amber-50/50 text-sm">
                  {executionPrompt.type === "QUOTE_FAILED_TOKENS" ? (
                    <>
                      <p className="font-medium text-gray-900 mb-1">
                        Some tokens have no valid swap route
                      </p>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => resolveExecutionPrompt("continue")}
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
                  ) : executionPrompt.type === "SLIPPAGE_INCREASE_REQUIRED" ? (
                    <>
                      <p className="font-medium text-gray-900 mb-1">
                        Higher slippage needed for{" "}
                        {executionPrompt.symbol || "this token"}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => resolveExecutionPrompt("accept")}
                          className="px-3 py-2 rounded-xl bg-gray-900 text-white text-xs font-medium hover:bg-gray-800"
                        >
                          Accept and continue
                        </button>
                        <button
                          type="button"
                          onClick={() => resolveExecutionPrompt("decline")}
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

              {needsChainSwitch && (
                <div className="flex items-start gap-2 text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
                  <AlertTriangle
                    size={16}
                    className="shrink-0 mt-0.5 text-amber-600"
                  />
                  <p>
                    You&apos;re connected on {currentChainLabel}. Switch to{" "}
                    {targetChainLabel} to generate and execute this portfolio.
                  </p>
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-2 justify-end pt-2 items-stretch sm:items-center">
                {generatedBasket.length === 0 &&
                  !canGenerate &&
                  !needsChainSwitch && (
                    <div className="italic mr-auto text-xs text-amber-700 rounded-xl px-3 py-2 flex items-center h-fit">
                      *Select {amountMissingSelections.join(", ")} to enable
                      Generate
                    </div>
                  )}
                {needsChainSwitch ? (
                  <button
                    type="button"
                    onClick={() => void handleSwitchChain()}
                    disabled={
                      isSwitchingChain || isGenerating || isExecuting
                    }
                    className="w-full sm:w-auto px-6 py-3 bg-orange-500 text-white border border-orange-600/30 rounded-2xl text-sm font-semibold hover:bg-orange-600 disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {isSwitchingChain
                      ? "Switching..."
                      : `Switch to ${targetChainLabel}`}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => void handleWizardPrimaryAction()}
                    disabled={wizardPrimaryDisabled}
                    className="w-full sm:w-auto px-6 py-3 bg-gray-900 text-white border border-gray-900 rounded-2xl text-sm font-semibold hover:bg-gray-800 disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {wizardPrimaryLabel}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {detailModalPortfolio && (
        <PortfolioDetailModal
          portfolio={detailModalPortfolio}
          onClose={closePortfolioDetailModal}
          onSellComplete={handlePortfolioSellComplete}
          getChainInfo={getChainInfo}
          isOnChainExecutionMode={isOnChainExecutionMode}
          isPortfolioClosed={isPortfolioClosed}
          refreshKey={detailModalRefreshKey}
          initialSellMode={detailModalInitialSell}
        />
      )}

      {showTutorialModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full max-h-[85vh] overflow-hidden flex flex-col">
            <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold">How Rewards Work</h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  Volume League · Weekly Distribution
                </p>
              </div>
              <button
                onClick={() => setShowTutorialModal(false)}
                className="w-9 h-9 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center transition-colors"
              >
                <X size={17} />
              </button>
            </div>

            <div className="overflow-y-auto px-6 py-5 space-y-5">
              {/* Minimum threshold */}

              {/* 2 steps */}
              <div>
                <div className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">
                  2 Simple Steps
                </div>
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="w-14 h-7 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-white text-[10px] font-bold">
                        Step 1
                      </span>
                    </div>
                    <div>
                      <div className="font-semibold text-gray-900 text-sm">
                        Create a Portfolio
                      </div>
                      <div className="text-xs text-gray-500 mt-0.5">
                        Select tokens and build an on-chain portfolio. Every buy
                        or sell transaction generates volume automatically.
                      </div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-14 h-7 bg-green-600 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-white text-[10px] font-bold">
                        Step 2
                      </span>
                    </div>
                    <div>
                      <div className="font-semibold text-gray-900 text-sm">
                        Generate Volume
                      </div>
                      <div className="text-xs text-gray-500 mt-0.5">
                        Trade more to increase your volume. The more you
                        generate, the larger your share of the $70K weekly base
                        pool.
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* How the base pool works */}
              <div>
                <div className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">
                  Weekly Reward Distribution
                </div>
                <ul className="space-y-2.5">
                  {[
                    {
                      icon: (
                        <Check
                          size={13}
                          className="text-green-600 flex-shrink-0 mt-0.5"
                        />
                      ),
                      text: "Every week, $70,000 is split among all participants who hit the $500 minimum volume.",
                    },
                    {
                      icon: (
                        <Check
                          size={13}
                          className="text-green-600 flex-shrink-0 mt-0.5"
                        />
                      ),
                      text: "Your share is calculated using √(your volume) ÷ √(total volume). This means everyone earns, not just the biggest traders.",
                    },
                    {
                      icon: (
                        <Check
                          size={13}
                          className="text-green-600 flex-shrink-0 mt-0.5"
                        />
                      ),
                      text: "Rankings reset every week. Your earnings are confirmed after each week closes.",
                    },
                    {
                      icon: (
                        <Check
                          size={13}
                          className="text-green-600 flex-shrink-0 mt-0.5"
                        />
                      ),
                      text: "Minimum to qualify: You need at least $500 in weekly volume to receive a reward share. Any trade counts, buy or sell.",
                    },
                  ].map((item, i) => (
                    <li
                      key={i}
                      className="flex items-start gap-2 text-sm text-gray-700"
                    >
                      {item.icon}
                      <span>{item.text}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Bonuses */}
              <div>
                <div className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">
                  Extra Tier Bonuses
                </div>
                <ul className="space-y-2">
                  {[
                    "The top 150 users by volume each week are assigned a tier: Diamond (top 10), Gold (11–30), Silver (31–70), Bronze (71–150).",
                    "Each tier has a one-time bonus on top of your base share, but only if you hit the tier's volume threshold.",
                    "Locked bonuses roll into the following week's pool, so unclaimed rewards stay in the game.",
                  ].map((text, i) => (
                    <li
                      key={i}
                      className="flex items-start gap-2 text-sm text-gray-700"
                    >
                      <div className="w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0 mt-1.5" />
                      {text}
                    </li>
                  ))}
                </ul>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  {TIERS.map((t) => (
                    <div
                      key={t.label}
                      className={`rounded-xl p-2.5 border ${t.bg} ${t.border}`}
                    >
                      <div className={`text-xs font-bold ${t.text} mb-0.5`}>
                        {t.label}
                      </div>
                      <div className="text-xs text-gray-500">
                        {t.ranks} · {fmt(t.volThreshold)}+
                      </div>
                      <div className="font-bold text-gray-900 text-sm mt-1">
                        ${t.bonus.toLocaleString()}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="px-6 pb-5 pt-2">
              <button
                onClick={() => setShowTutorialModal(false)}
                className="w-full bg-black text-white font-semibold py-3 rounded-xl hover:bg-gray-800 transition-colors text-sm"
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── How It Works Modal ── */}
    </div>
  );
}
