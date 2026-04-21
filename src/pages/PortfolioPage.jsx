import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  BellPlus,
  BarChart3,
  Check,
  ChevronDown,
  Loader2,
  Plus,
  Pencil,
  RefreshCw,
  Search,
  Trash2,
  TrendingDown,
  TrendingUp,
  Wallet,
  DollarSign,
  HelpCircle,
  X,
} from "lucide-react";
import { AnimatePresence } from "motion/react";
import { encodeFunctionData } from "viem";
import { useDispatch, useSelector } from "react-redux";
import { NavLink, useLocation, useNavigate } from "react-router";
import {
  getEmbeddedConnectedWallet,
  useSendTransaction,
  useWallets,
} from "@privy-io/react-auth";
import OutsideClickHandler from "react-outside-click-handler/build/OutsideClickHandler";
import { setWalletModal } from "../redux/slices/walletSlice";
import getFormattedNumber from "../hooks/get-formatted-number";
import { apiCall } from "../utils/api";
import { useAuth } from "../hooks/useAuth";
import { PortfolioAlertSettings } from "../components/PortfolioAlertSettings";
import {
  checkTxStatus,
  createPrivyExecutionTxEnv,
  createWagmiExecutionTxEnv,
  ensurePermit2Approvals,
  ensureStandardApproval,
} from "../utils/execution";
import { PortfolioInfoModal } from "../components/PortfolioInfoModal";
import { useGemsStatus } from "../hooks/useGemsStatus";
import { getTierStyle } from "../utils/gemsTier";

const PERMIT2_ADDRESS = "0x31c2F6fcFf4F8759b3Bd5Bf0e1084A055615c768";
// Small grace period after on-chain approvals before we ask the backend to
// re-prepare the swap — gives its allowance indexer a moment to catch up.
const APPROVAL_INDEX_LAG_MS = 3000;
const PREPARE_RETRY_DELAY_MS = 2500;
const MAX_POST_APPROVAL_PREPARE_RETRIES = 4;

// Maps raw errors (wagmi connector hiccups, user-rejected sign prompts, etc.)
// to friendly copy so the UI never surfaces internal strings like
// "Connector not connected. Version: @wagmi/core@2.22.1".
const describeLoadError = (error) => {
  const raw = typeof error?.message === "string" ? error.message : "";
  if (/Connector not connected|getConnectorClient/i.test(raw)) {
    return "Wallet connection was interrupted. Please reconnect your wallet and retry.";
  }
  if (/user rejected|user denied|rejected the request/i.test(raw)) {
    return "Signature request was cancelled. Please retry to load your portfolios.";
  }
  if (error?.status === 401) {
    return "Your session expired. Please reconnect your wallet.";
  }
  return raw || "Unable to load your portfolios right now.";
};

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
];

const POLL_INTERVAL_MS = 3500;
const MAX_POLL_ATTEMPTS = 60;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const archivePortfolio = async (portfolioId) => {
  await apiCall(`/portfolio/${portfolioId}`, {
    method: "DELETE",
  });
};

const renamePortfolio = async (portfolioId, name) => {
  await apiCall(`/portfolio/${portfolioId}/name`, {
    method: "PATCH",
    body: JSON.stringify({ name }),
  });
};

const RISK_FILTER_OPTIONS = [
  { value: "ALL", label: "All Risk Levels" },
  { value: "CONSERVATIVE", label: "Conservative" },
  { value: "BALANCED", label: "Balanced" },
  { value: "AGGRESSIVE", label: "Aggressive" },
];

const EXECUTION_MODE_FILTER_OPTIONS = [
  { value: "ALL", label: "All Execution Modes" },
  { value: "PAPER", label: "Paper Trading" },
  { value: "ON_CHAIN", label: "On-Chain" },
];

const SORT_OPTIONS = [
  { value: "date", label: "Sort by: Recent" },
  { value: "name", label: "Sort by: Name" },
  { value: "value", label: "Sort by: Value" },
  { value: "pnl", label: "Sort by: Performance" },
];

const isOnChainExecutionMode = (executionMode) =>
  String(executionMode || "").toUpperCase() === "ON_CHAIN";

const isPortfolioClosed = (portfolio) =>
  String(portfolio?.status || portfolio?.sellStatus || "").toUpperCase() ===
  "CLOSED";

const CHAIN_INFO = {
  BSC: {
    label: "BNB Chain",
    icon: "https://cdn.allox.ai/allox/networks/bnbIcon.svg",
  },
  ETH: {
    label: "Ethereum",
    icon: "https://cdn.allox.ai/allox/networks/eth.svg",
  },
  BASE: {
    label: "Base",
    icon: "https://cdn.allox.ai/allox/networks/base.svg",
  },
  SOL: {
    label: "Solana",
    icon: "https://cdn.allox.ai/allox/networks/solana.svg",
  },
  SOLANA: {
    label: "Solana",
    icon: "https://cdn.allox.ai/allox/networks/solana.svg",
  },
};

const getChainInfo = (chain) => {
  if (!chain) return null;
  const key = String(chain).toUpperCase();
  return CHAIN_INFO[key] || { label: key, icon: null };
};

export function PortfolioPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const isConnected = useSelector((state) => state.wallet.isConnected);
  const sessionSource = useSelector((state) => state.wallet.sessionSource);
  const walletType = useSelector((state) => state.wallet.walletType);
  const { ensureAuthenticated, logout, user: authUser, token } = useAuth();
  const { wallets } = useWallets();
  const { sendTransaction: privySendTransaction } = useSendTransaction();
  const selectedPortfolioIdFromUrl = useMemo(
    () => new URLSearchParams(location.search).get("portfolio"),
    [location.search],
  );

  const goToPortfolio = useCallback(() => {
    navigate("/", {
      state: { chatSuggestion: "Build a Portfolio" },
    });
  }, [navigate]);

  const goToNarrative = useCallback(
    (id, label) => {
      if (!id) return;
      const params = new URLSearchParams();
      params.set("narrative", id);
      if (label) params.set("label", label);
      navigate(`/trending?${params.toString()}`);
    },
    [navigate],
  );

  const [portfolios, setPortfolios] = useState([]);
  const [activePortfolioId, setActivePortfolioId] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [analytics, setAnalytics] = useState(null);
  const [portfolioInfo, setPortfolioInfo] = useState(null);
  const [analyticsError, setAnalyticsError] = useState("");
  const [isAnalyticsLoading, setIsAnalyticsLoading] = useState(false);
  const [isArchiving, setIsArchiving] = useState(false);
  const [archiveError, setArchiveError] = useState("");
  const [isArchiveModalOpen, setIsArchiveModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterRisk, setFilterRisk] = useState("ALL");
  const [filterExecutionMode, setFilterExecutionMode] = useState("ALL");
  const [sortBy, setSortBy] = useState("date");
  const [editingPortfolioId, setEditingPortfolioId] = useState(null);
  const [renameDraft, setRenameDraft] = useState("");
  const [isRenaming, setIsRenaming] = useState(false);
  const [deleteCardPortfolio, setDeleteCardPortfolio] = useState(null);
  const [isDeletingCardPortfolio, setIsDeletingCardPortfolio] = useState(false);
  const [isRiskMenuOpen, setIsRiskMenuOpen] = useState(false);
  const [isExecutionModeMenuOpen, setIsExecutionModeMenuOpen] = useState(false);
  const [isSortMenuOpen, setIsSortMenuOpen] = useState(false);
  const [isAlertModalOpen, setIsAlertModalOpen] = useState(false);
  const [isSellModalOpen, setIsSellModalOpen] = useState(false);
  const [isSellInfoModalOpen, setIsSellInfoModalOpen] = useState(false);
  const [sellTarget, setSellTarget] = useState(null);
  const [sellSlippage, setSellSlippage] = useState("1");
  const [isSellQuoteLoading, setIsSellQuoteLoading] = useState(false);
  const [sellQuote, setSellQuote] = useState(null);
  const [sellQuoteError, setSellQuoteError] = useState("");
  const [sellRequiredSlippage, setSellRequiredSlippage] = useState(null);
  const [isSellExecuting, setIsSellExecuting] = useState(false);
  const [sellExecutionError, setSellExecutionError] = useState("");
  const [sellExecutionLogs, setSellExecutionLogs] = useState([]);
  // Per-order execution status: executionOrderId -> 'executing'|'confirmed'|'failed'
  const [orderStatusMap, setOrderStatusMap] = useState({});
  // Retry prompt state: pauses execution until user decides
  const [retryPrompt, setRetryPrompt] = useState(null); // { symbol, attempt, maxAttempts }
  const [showPortfolioInfoModal, setShowPortfolioInfoModal] = useState(false);
  const retryResolverRef = useRef(null);

  const goToToken = useCallback(
    (symbol) => {
      if (!symbol) return;
      const params = new URLSearchParams();
      params.set("token", String(symbol).toUpperCase());
      params.set("from", "portfolio");
      if (activePortfolioId) params.set("portfolioId", activePortfolioId);
      navigate(`/trending?${params.toString()}`);
    },
    [navigate, activePortfolioId],
  );

  const getAnalytics = useCallback(async (portfolioId) => {
    const response = await apiCall(`/portfolio/${portfolioId}/analytics`);
    return response;
  }, []);

  const getPortfolioInfo = useCallback(async (portfolioId) => {
    const response = await apiCall(`/portfolio/${portfolioId}`);
    return response;
  }, []);
  const handlePortfolioSelect = useCallback(
    async (portfolioId) => {
      setActivePortfolioId(portfolioId);
      setAnalytics(null);
      setAnalyticsError("");
      if (!portfolioId) return;

      setIsAnalyticsLoading(true);
      try {
        await ensureAuthenticated();
        const response = await getAnalytics(portfolioId);
        const portfolioResponse = await getPortfolioInfo(portfolioId);

        setAnalytics(response);
        setPortfolioInfo(portfolioResponse);
      } catch (error) {
        if (error?.status === 401) {
          logout();
        }
        setAnalyticsError(describeLoadError(error));
      } finally {
        setIsAnalyticsLoading(false);
      }
    },
    [ensureAuthenticated, getAnalytics, getPortfolioInfo, logout],
  );

  const loadPortfolios = useCallback(async () => {
    if (!isConnected) return;
    // When no JWT is available yet we deliberately avoid triggering
    // `ensureAuthenticated()` here: on first render wagmi's connector can
    // still be in a `reconnecting` / `connecting` state, and calling
    // `signMessageAsync` at that moment throws the raw wagmi error
    // ("Connector not connected. Version: @wagmi/core@…") which would leak
    // into the UI. Instead we wait — once `useAuth` finishes its initial
    // refresh and sets `token`, this effect re-runs and the fetch proceeds
    // with the Bearer already attached by `apiCall`.
    if (!token) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setErrorMessage("");
    try {
      const response = await apiCall("/portfolio");
      const list = Array.isArray(response?.portfolios)
        ? response.portfolios
        : [];
      setPortfolios(list);
      if (
        selectedPortfolioIdFromUrl &&
        list.some((portfolio) => portfolio.id === selectedPortfolioIdFromUrl)
      ) {
        handlePortfolioSelect(selectedPortfolioIdFromUrl);
      } else {
        setActivePortfolioId(null);
        setAnalytics(null);
        setPortfolioInfo(null);
      }
    } catch (error) {
      if (error?.status === 401) {
        logout();
      }
      setErrorMessage(describeLoadError(error));
    } finally {
      setIsLoading(false);
    }
  }, [
    isConnected,
    token,
    handlePortfolioSelect,
    logout,
    selectedPortfolioIdFromUrl,
  ]);

  const handleArchiveActivePortfolio = useCallback(() => {
    if (!activePortfolioId) return;
    setArchiveError("");
    setIsArchiveModalOpen(true);
  }, [activePortfolioId]);

  const confirmArchiveActivePortfolio = useCallback(async () => {
    if (!activePortfolioId) return;
    setIsArchiving(true);
    setArchiveError("");
    try {
      await ensureAuthenticated();
      await archivePortfolio(activePortfolioId);
      await loadPortfolios();
      setIsArchiveModalOpen(false);
    } catch (error) {
      if (error?.status === 401) {
        logout();
      }
      const msg =
        error?.message || "Unable to delete (archive) this portfolio.";
      setArchiveError(msg);
    } finally {
      setIsArchiving(false);
    }
  }, [activePortfolioId, ensureAuthenticated, loadPortfolios, logout]);

  useEffect(() => {
    loadPortfolios();
  }, [loadPortfolios]);

  useEffect(() => {
    window.scrollTo(0, 0);
    document.title = "Portfolio";
  }, []);
  useEffect(() => {
    if (!isConnected || portfolios.length === 0) return;

    if (!selectedPortfolioIdFromUrl) {
      setActivePortfolioId(null);
      setAnalytics(null);
      setPortfolioInfo(null);
      setAnalyticsError("");
      return;
    }

    const exists = portfolios.some(
      (portfolio) => portfolio.id === selectedPortfolioIdFromUrl,
    );
    if (!exists) return;

    if (activePortfolioId !== selectedPortfolioIdFromUrl) {
      handlePortfolioSelect(selectedPortfolioIdFromUrl);
    }
  }, [
    isConnected,
    portfolios,
    selectedPortfolioIdFromUrl,
    activePortfolioId,
    handlePortfolioSelect,
  ]);

  const activePortfolio = useMemo(
    () =>
      portfolios.find((portfolio) => portfolio.id === activePortfolioId) ??
      null,
    [portfolios, activePortfolioId],
  );
  const totalPortfolioValue = useMemo(
    () =>
      portfolios.reduce(
        (sum, portfolio) => sum + Number(portfolio?.totalCurrentValue || 0),
        0,
      ),
    [portfolios],
  );
  const totalInvested = useMemo(
    () =>
      portfolios.reduce(
        (sum, portfolio) => sum + Number(portfolio?.totalInvestment || 0),
        0,
      ),
    [portfolios],
  );
  const totalPortfolioPnL = totalPortfolioValue - totalInvested;
  const totalPortfolioPnLPercent =
    totalInvested > 0 ? (totalPortfolioPnL / totalInvested) * 100 : 0;

  const filteredPortfolios = useMemo(() => {
    const normalize = (value) => String(value || "").toLowerCase();
    const filtered = portfolios.filter((portfolio) => {
      const portfolioName = normalize(portfolio?.name);
      const narratives = Array.isArray(portfolio?.narratives)
        ? portfolio.narratives
        : Array.isArray(portfolio?.narrative)
          ? portfolio.narrative
          : [];
      const narrativeText = narratives.map((n) => normalize(n)).join(" ");
      const search = normalize(searchQuery);
      const matchesSearch =
        !search ||
        portfolioName.includes(search) ||
        narrativeText.includes(search);
      const risk = String(portfolio?.riskProfile || "").toUpperCase();
      const matchesRisk = filterRisk === "ALL" || risk === filterRisk;
      const executionMode = String(
        portfolio?.executionMode || "",
      ).toUpperCase();
      const matchesExecutionMode =
        filterExecutionMode === "ALL" || executionMode === filterExecutionMode;
      return matchesSearch && matchesRisk && matchesExecutionMode;
    });

    const sorted = [...filtered].sort((a, b) => {
      if (sortBy === "name") {
        return String(a?.name || "").localeCompare(String(b?.name || ""));
      }
      if (sortBy === "value") {
        return (
          Number(b?.totalCurrentValue || 0) - Number(a?.totalCurrentValue || 0)
        );
      }
      if (sortBy === "pnl") {
        return (
          Number(b?.totalPnLPercent || 0) - Number(a?.totalPnLPercent || 0)
        );
      }
      const aDate = new Date(a?.createdAt || a?.createdDate || 0).getTime();
      const bDate = new Date(b?.createdAt || b?.createdDate || 0).getTime();
      return bDate - aDate;
    });

    return sorted;
  }, [portfolios, searchQuery, filterRisk, filterExecutionMode, sortBy]);

  const getRiskColor = useCallback((riskProfile) => {
    const risk = String(riskProfile || "").toUpperCase();
    if (risk === "CONSERVATIVE") {
      return "bg-green-100 text-green-700 border-green-200";
    }
    if (risk === "BALANCED") {
      return "bg-blue-100 text-blue-700 border-blue-200";
    }
    if (risk === "AGGRESSIVE") {
      return "bg-orange-50 text-orange-800 border-orange-200";
    }
    return "bg-gray-100 text-gray-700 border-gray-200";
  }, []);
  const handlePortfolioCardClick = useCallback(
    (portfolioId) => {
      if (!portfolioId) return;
      navigate(`/portfolio?portfolio=${encodeURIComponent(portfolioId)}`);
    },
    [navigate],
  );
  const handleBackToPortfolios = useCallback(() => {
    navigate("/portfolio");
  }, [navigate]);
  const startRenamePortfolio = useCallback((portfolio) => {
    setEditingPortfolioId(portfolio?.id || null);
    setRenameDraft(String(portfolio?.name || ""));
  }, []);
  const cancelRenamePortfolio = useCallback(() => {
    setEditingPortfolioId(null);
    setRenameDraft("");
  }, []);
  const handleRenamePortfolio = useCallback(
    async (portfolioId) => {
      if (!portfolioId) return;
      const currentPortfolio = portfolios.find(
        (portfolio) => portfolio.id === portfolioId,
      );
      const currentName = String(currentPortfolio?.name || "").trim();
      const nextName = String(renameDraft || "").trim();
      if (!nextName || nextName === currentName) {
        cancelRenamePortfolio();
        return;
      }

      try {
        setIsRenaming(true);
        await ensureAuthenticated();
        await renamePortfolio(portfolioId, nextName);
        cancelRenamePortfolio();
        await loadPortfolios();
      } catch (error) {
        if (error?.status === 401) {
          logout();
          return;
        }
        setErrorMessage(error?.message || "Unable to rename portfolio.");
      } finally {
        setIsRenaming(false);
      }
    },
    [
      portfolios,
      renameDraft,
      cancelRenamePortfolio,
      ensureAuthenticated,
      loadPortfolios,
      logout,
    ],
  );
  const openDeletePortfolioCardModal = useCallback((portfolio) => {
    if (!portfolio?.id) return;
    setDeleteCardPortfolio(portfolio);
  }, []);
  const closeDeletePortfolioCardModal = useCallback(() => {
    if (isDeletingCardPortfolio) return;
    setDeleteCardPortfolio(null);
  }, [isDeletingCardPortfolio]);
  const handleDeletePortfolioCard = useCallback(async () => {
    const portfolioId = deleteCardPortfolio?.id;
    if (!portfolioId) return;

    try {
      setIsDeletingCardPortfolio(true);
      await ensureAuthenticated();
      await archivePortfolio(portfolioId);
      if (activePortfolioId === portfolioId) {
        navigate("/portfolio");
      }
      await loadPortfolios();
      setDeleteCardPortfolio(null);
    } catch (error) {
      if (error?.status === 401) {
        logout();
        return;
      }
      setErrorMessage(error?.message || "Unable to delete portfolio.");
    } finally {
      setIsDeletingCardPortfolio(false);
    }
  }, [
    deleteCardPortfolio,
    activePortfolioId,
    ensureAuthenticated,
    loadPortfolios,
    logout,
    navigate,
  ]);

  const addSellLog = useCallback((message) => {
    setSellExecutionLogs((prev) => [...prev, message]);
  }, []);

  const closeSellModal = useCallback(() => {
    if (isSellExecuting) return;
    setIsSellModalOpen(false);
    setIsSellInfoModalOpen(false);
    setSellTarget(null);
    setSellQuote(null);
    setSellQuoteError("");
    setSellExecutionError("");
    setSellExecutionLogs([]);
    setSellRequiredSlippage(null);
    setOrderStatusMap({});
    setRetryPrompt(null);
    retryResolverRef.current = null;
  }, [isSellExecuting]);

  const handleRetryDecision = useCallback((shouldRetry) => {
    setRetryPrompt(null);
    retryResolverRef.current?.(shouldRetry);
    retryResolverRef.current = null;
  }, []);

  const quoteSell = useCallback(
    async (target) => {
      if (!target?.portfolioId) return;
      setIsSellQuoteLoading(true);
      setSellQuoteError("");
      setSellExecutionError("");
      setSellRequiredSlippage(null);
      try {
        await ensureAuthenticated();
        const nextSlippage = Number(sellSlippage);
        const body = {
          ...(target?.symbol ? { symbol: target.symbol } : {}),
          ...(Number.isFinite(nextSlippage) && nextSlippage > 0
            ? { slippage: nextSlippage }
            : {}),
        };
        const quote = await apiCall(
          `/portfolio/${target.portfolioId}/sell/quote`,
          {
            method: "POST",
            body: JSON.stringify(body),
          },
        );
        setSellQuote(quote);
      } catch (error) {
        if (error?.status === 401) {
          logout();
        }
        setSellQuoteError(error?.message || "Unable to quote sell request.");
      } finally {
        setIsSellQuoteLoading(false);
      }
    },
    [ensureAuthenticated, logout, sellSlippage],
  );

  const openSellModal = useCallback(
    (target) => {
      if (!target?.portfolioId) return;
      setSellTarget(target);
      setIsSellModalOpen(true);
      setSellQuote(null);
      setSellQuoteError("");
      setSellExecutionError("");
      setSellExecutionLogs([]);
      setSellRequiredSlippage(null);
      quoteSell(target);
    },
    [quoteSell],
  );

  const runApprovalStep = useCallback(async (approvalStep, txEnv) => {
    const method = approvalStep?.tx?.method;
    const args = approvalStep?.tx?.args || [];
    const to = approvalStep?.tx?.to;
    if (!to || !method) {
      throw new Error("Approval step is missing transaction details.");
    }

    let data;
    if (method === "approve(address,uint256)") {
      data = encodeFunctionData({
        abi: ERC20_ABI,
        functionName: "approve",
        args: [args[0], BigInt(args[1])],
      });
    } else if (method === "approve(address,address,uint160,uint48)") {
      data = encodeFunctionData({
        abi: PERMIT2_ABI,
        functionName: "approve",
        args: [args[0], args[1], BigInt(args[2]), BigInt(args[3])],
      });
    } else {
      throw new Error(`Unsupported approval method: ${method}`);
    }

    const txHash = await txEnv.sendTransaction({ to, data, value: 0n });
    await txEnv.waitForTransactionReceipt({ hash: txHash });
    return txHash;
  }, []);

  const executeSingleOrder = useCallback(
    async (order, txEnv, slippageValue) => {
      const symbol = order?.symbol || "TOKEN";

      const describeWalletError = (err) => {
        const code = err?.code;
        const raw = String(err?.message || err || "").toLowerCase();
        if (
          code === 4001 ||
          raw.includes("user rejected") ||
          raw.includes("rejected the request") ||
          raw.includes("user denied")
        ) {
          return "rejected in wallet";
        }
        if (
          raw.includes("transaction failed") ||
          raw.includes("failed to send") ||
          raw.includes("send transaction failed") ||
          raw.includes("wallet request failed")
        ) {
          return "wallet transaction failed";
        }
        return err?.message || "wallet error";
      };

      const callPrepare = () =>
        apiCall(`/execution/${order.executionOrderId}/prepare`, {
          method: "POST",
          body: JSON.stringify({ slippage: slippageValue }),
        });

      // After approvals, the backend may still see the allowance as missing
      // for a second or two while it indexes the approval tx. Retry /prepare
      // on 428 **without** re-running the approval steps — otherwise Privy
      // would pop the approval dialog a second time.
      const prepareAfterApprovalsWithRetry = async () => {
        let lastErr;
        for (
          let attempt = 0;
          attempt < MAX_POST_APPROVAL_PREPARE_RETRIES;
          attempt += 1
        ) {
          if (attempt > 0) await sleep(PREPARE_RETRY_DELAY_MS);
          try {
            return await callPrepare();
          } catch (err) {
            lastErr = err;
            const stillWaitingForApproval =
              err?.status === 428 && Array.isArray(err?.data?.approvalSteps);
            if (!stillWaitingForApproval) throw err;
            // else loop: backend hasn't indexed the approval yet.
          }
        }
        throw lastErr;
      };

      let prepare;
      try {
        prepare = await callPrepare();
      } catch (error) {
        if (
          error?.status === 428 &&
          Array.isArray(error?.data?.approvalSteps)
        ) {
          addSellLog(`${symbol}: approvals required.`);
          try {
            for (const step of error.data.approvalSteps) {
              await runApprovalStep(step, txEnv);
            }
          } catch (approvalErr) {
            addSellLog(
              `${symbol}: approval ${describeWalletError(approvalErr)}.`,
            );
            return false;
          }
          // Give the backend a moment to see the approval tx before retrying.
          await sleep(APPROVAL_INDEX_LAG_MS);
          try {
            prepare = await prepareAfterApprovalsWithRetry();
          } catch (retryPrepareErr) {
            addSellLog(
              `${symbol}: prepare failed after approvals (${retryPrepareErr?.message || "error"}).`,
            );
            return false;
          }
        } else if (
          error?.status === 422 &&
          error?.data?.error === "SLIPPAGE_INCREASE_REQUIRED"
        ) {
          setSellRequiredSlippage(error?.data?.requiredSlippage ?? null);
          throw new Error(
            error?.data?.message ||
              `${symbol}: higher slippage is required to continue.`,
          );
        } else {
          throw error;
        }
      }

      const txData = prepare?.txData;
      if (!txData?.to || !txData?.data) {
        addSellLog(`${symbol}: invalid prepared transaction data.`);
        return false;
      }

      // Some backend responses return 200 OK with approvalNeeded:true plus the
      // swap txData. In that case the on-chain allowance may or may not
      // already be sufficient — delegate to the idempotent on-chain checks
      // from execution.js which read current allowance and only send an
      // approve tx if it's actually missing. This avoids duplicate Privy
      // prompts when the legacy 428 path and the success path overlap.
      if (prepare.approvalNeeded) {
        const fromTokenAddress = prepare.fromTokenAddress;
        const requiredAmount = (() => {
          try {
            return prepare.fromAmount != null && prepare.fromAmount !== ""
              ? BigInt(prepare.fromAmount)
              : 0n;
          } catch {
            return 0n;
          }
        })();

        try {
          if (prepare.approvalType === "permit2") {
            const p2 = prepare.permit2Approval;
            if (!p2?.spender) {
              addSellLog(
                `${symbol}: missing permit2 spender in prepare response.`,
              );
              return false;
            }
            await ensurePermit2Approvals({
              permit2Approval: {
                permit2Address: p2.permit2Address || PERMIT2_ADDRESS,
                spender: p2.spender,
              },
              fromTokenAddress,
              userAddress: txEnv.userAddress,
              requiredAmount,
              update: () => {},
              txEnv,
            });
          } else if (prepare.approvalType === "standard") {
            await ensureStandardApproval({
              approvalContract: prepare.approvalContract,
              tokenAddress: fromTokenAddress,
              userAddress: txEnv.userAddress,
              requiredAmount,
              update: () => {},
              txEnv,
            });
          }
        } catch (approvalErr) {
          addSellLog(
            `${symbol}: approval ${describeWalletError(approvalErr)}.`,
          );
          return false;
        }
      }

      addSellLog(`${symbol}: waiting for wallet confirmation...`);
      let txHash;
      try {
        txHash = await txEnv.sendTransaction({
          to: txData.to,
          data: txData.data,
          value:
            txData.value != null && txData.value !== ""
              ? BigInt(txData.value)
              : 0n,
          ...(txData.nonce != null && txData.nonce !== ""
            ? { nonce: Number(txData.nonce) }
            : {}),
        });
      } catch (walletErr) {
        addSellLog(`${symbol}: ${describeWalletError(walletErr)}.`);
        return false;
      }
      addSellLog(`${symbol}: tx submitted ${txHash.slice(0, 10)}...`);

      try {
        await apiCall(`/execution/${order.executionOrderId}/submit`, {
          method: "POST",
          body: JSON.stringify({ txHash }),
        });
      } catch (submitErr) {
        addSellLog(
          `${symbol}: submit failed (${submitErr?.message || "error"}).`,
        );
        return false;
      }

      // Immediately check if the tx is already mined as reverted — catches the
      // case where the user confirmed in the wallet, the tx failed on-chain,
      // and they returned to the browser before the backend detects it.
      const immediateOnChain = await checkTxStatus(txHash);
      if (immediateOnChain === "reverted") {
        addSellLog(`${symbol}: transaction failed on-chain.`);
        return false;
      }

      for (let i = 0; i < MAX_POLL_ATTEMPTS; i += 1) {
        await sleep(POLL_INTERVAL_MS);

        // Every 3rd iteration, re-check on-chain receipt independently of the
        // backend. A reverted tx emits no events so the backend may never
        // update its status — this catches it within ~10 s regardless.
        if (i % 3 === 0) {
          const onChainStatus = await checkTxStatus(txHash);
          if (onChainStatus === "reverted") {
            addSellLog(`${symbol}: transaction failed on-chain.`);
            return false;
          }
        }

        try {
          const statusData = await apiCall(
            `/execution/${order.executionOrderId}/status`,
          );
          const status = statusData?.status;
          if (status === "CONFIRMED") {
            addSellLog(`${symbol}: confirmed.`);
            return true;
          }
          if (status === "FAILED") {
            addSellLog(`${symbol}: failed on-chain.`);
            return false;
          }
        } catch {
          // transient status error — keep polling
        }
      }

      addSellLog(`${symbol}: status timeout.`);
      return false;
    },
    [addSellLog, runApprovalStep],
  );

  const MAX_ORDER_ATTEMPTS = 3;

  const confirmSell = useCallback(async () => {
    if (!sellTarget?.portfolioId || !sellQuote?.orders?.length) return;
    setIsSellExecuting(true);
    setSellExecutionError("");
    setSellRequiredSlippage(null);
    setSellExecutionLogs([]);
    setOrderStatusMap({});
    setRetryPrompt(null);
    const slippageValue = Number(sellSlippage) > 0 ? Number(sellSlippage) : 1;

    try {
      await ensureAuthenticated();
      let txEnv;
      // Detect Privy across all signals so a Privy session that lost
      // `authProvider` after /auth/me refresh still uses the embedded wallet
      // path instead of falling through to wagmi (which would throw
      // "Wallet not connected" and silently re-quote).
      const isPrivySession =
        authUser?.authProvider === "privy" ||
        sessionSource === "privy" ||
        walletType === "privy";
      if (isPrivySession) {
        const embedded = getEmbeddedConnectedWallet(wallets);
        if (!embedded) {
          throw new Error(
            "Embedded wallet not found. Refresh the page or sign in again.",
          );
        }
        const chainId = embedded.chainId;
        const onBsc =
          chainId === "eip155:56" ||
          (typeof chainId === "string" &&
            chainId.startsWith("0x") &&
            parseInt(chainId, 16) === 56) ||
          Number(chainId) === 56;
        if (!onBsc) {
          await embedded.switchChain(56);
        }
        txEnv = createPrivyExecutionTxEnv(
          embedded.address,
          privySendTransaction,
        );
      } else {
        txEnv = createWagmiExecutionTxEnv();
      }
      txEnv.assertReady();

      let confirmed = 0;
      for (const initialOrder of sellQuote.orders) {
        let currentOrder = initialOrder;
        let orderConfirmed = false;
        // statusKey stays tied to the row rendered from sellQuote.orders so
        // the UI keeps in sync even after a re-quote changes executionOrderId.
        const statusKey = initialOrder.executionOrderId;

        for (let attempt = 1; attempt <= MAX_ORDER_ATTEMPTS; attempt++) {
          setOrderStatusMap((prev) => ({
            ...prev,
            [statusKey]: "executing",
          }));

          const ok = await executeSingleOrder(
            currentOrder,
            txEnv,
            slippageValue,
          );

          if (ok) {
            setOrderStatusMap((prev) => ({
              ...prev,
              [statusKey]: "confirmed",
            }));
            orderConfirmed = true;
            // Persist this position as sold immediately.
            // /sell/complete is idempotent and skips already-sold positions,
            // so calling it per-order is safe. This ensures partial sells
            // (e.g. 3/4 tokens confirmed) are reflected on reload even if the
            // remaining orders fail or the user closes the modal.
            try {
              await apiCall(
                `/portfolio/${sellTarget.portfolioId}/sell/complete`,
                { method: "POST" },
              );
            } catch {
              // Non-fatal — the final /sell/complete call below will catch up.
            }
            break;
          }

          setOrderStatusMap((prev) => ({
            ...prev,
            [statusKey]: "failed",
          }));

          if (attempt >= MAX_ORDER_ATTEMPTS) {
            addSellLog(
              `${currentOrder.symbol}: max retries (${MAX_ORDER_ATTEMPTS}) reached, skipping.`,
            );
            break;
          }

          // Pause and wait for user retry/skip decision
          setRetryPrompt({
            symbol: currentOrder.symbol,
            attempt,
            maxAttempts: MAX_ORDER_ATTEMPTS,
          });
          const shouldRetry = await new Promise((resolve) => {
            retryResolverRef.current = resolve;
          });
          setRetryPrompt(null);

          if (!shouldRetry) {
            addSellLog(`${currentOrder.symbol}: skipped by user.`);
            break;
          }

          // Re-quote this token to get a fresh executionOrderId
          addSellLog(
            `${currentOrder.symbol}: re-quoting for retry ${attempt + 1}...`,
          );
          try {
            const reQuote = await apiCall(
              `/portfolio/${sellTarget.portfolioId}/sell/quote`,
              {
                method: "POST",
                body: JSON.stringify({
                  symbol: currentOrder.symbol,
                  slippage: slippageValue,
                }),
              },
            );
            const newOrder = reQuote?.orders?.[0];
            if (!newOrder?.executionOrderId) {
              addSellLog(
                `${currentOrder.symbol}: no new order from re-quote, skipping.`,
              );
              break;
            }
            currentOrder = newOrder;
          } catch {
            addSellLog(`${currentOrder.symbol}: re-quote failed, skipping.`);
            break;
          }
        }

        if (orderConfirmed) confirmed += 1;
      }

      if (confirmed > 0) {
        await apiCall(`/portfolio/${sellTarget.portfolioId}/sell/complete`, {
          method: "POST",
        });
      }
      addSellLog(
        `Completed. ${confirmed}/${sellQuote.orders.length} order(s) confirmed.`,
      );
      await loadPortfolios();
      await handlePortfolioSelect(sellTarget.portfolioId);
      if (confirmed > 0) {
        setTimeout(() => closeSellModal(), 900);
      }
    } catch (error) {
      if (error?.status === 401) {
        logout();
        return;
      }
      setSellExecutionError(error?.message || "Sell execution failed.");
      // Auto re-quote so user can retry with fresh execution order IDs
      quoteSell(sellTarget);
    } finally {
      setIsSellExecuting(false);
      setRetryPrompt(null);
      retryResolverRef.current = null;
    }
  }, [
    authUser?.authProvider,
    addSellLog,
    closeSellModal,
    ensureAuthenticated,
    executeSingleOrder,
    handlePortfolioSelect,
    loadPortfolios,
    logout,
    privySendTransaction,
    quoteSell,
    sellQuote?.orders,
    sellSlippage,
    sellTarget,
    sessionSource,
    walletType,
    wallets,
  ]);

  const totalBalance = Number(activePortfolio?.totalCurrentValue || 0);
  const totalPnL = Number(activePortfolio?.totalPnL || 0);
  const totalPnLPercent = Number(activePortfolio?.totalPnLPercent || 0);
  const analyticsData = analytics?.analytics || analytics;
  const overview = analyticsData?.overview;
  const narrativeBreakdown = analyticsData?.narrativeBreakdown || {};
  const riskBreakdown = analyticsData?.riskBreakdown || {};
  const topPerformers = analyticsData?.topPerformers || [];
  const bottomPerformers = analyticsData?.bottomPerformers || [];
  const positionsInfo = Array.isArray(portfolioInfo?.portfolio?.positions)
    ? portfolioInfo.portfolio.positions
    : [];
  const isPositionClosed = (pos) => {
    if (pos?.soldAt) return true;
    const status = String(pos?.status || "").toUpperCase();
    const sellStatus = String(pos?.sellStatus || "").toUpperCase();
    return (
      status === "CLOSED" ||
      sellStatus === "CLOSED" ||
      sellStatus === "CONFIRMED"
    );
  };
  const activePositionsInfo = useMemo(
    () => positionsInfo.filter((pos) => !isPositionClosed(pos)),
    [positionsInfo],
  );
  const closedPositionsInfo = useMemo(
    () => positionsInfo.filter((pos) => isPositionClosed(pos)),
    [positionsInfo],
  );
  const selectedRiskLabel =
    RISK_FILTER_OPTIONS.find((item) => item.value === filterRisk)?.label ||
    "All Risk Levels";
  const selectedExecutionModeLabel =
    EXECUTION_MODE_FILTER_OPTIONS.find(
      (item) => item.value === filterExecutionMode,
    )?.label || "All Execution Modes";
  const selectedSortLabel =
    SORT_OPTIONS.find((item) => item.value === sortBy)?.label ||
    "Sort by: Recent";
  const sellQuoteOrders = Array.isArray(sellQuote?.orders)
    ? sellQuote.orders
    : [];
  const sellFailedQuotes = Array.isArray(sellQuote?.failed)
    ? sellQuote.failed
    : [];
  const sellEstimatedUsdtTotal = sellQuoteOrders.reduce(
    (sum, order) => sum + Number(order?.estimatedUsdtOut || 0),
    0,
  );
  const highPriceImpactOrders = sellQuoteOrders.filter(
    (order) => Number(order?.priceImpact || 0) >= 5,
  );

  const { status: gemsStatus } = useGemsStatus();
  const userTierName = gemsStatus?.currentTier?.name || "Bronze";
  const userTierStyle = getTierStyle(userTierName);
  return (
    <div className="flex-1 px-6 py-8 portfolio-wrapper ms-auto w-full overflow-y-auto relative">
      <div className="">
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row items-center justify-between mb-6 gap-3">
            <div className="flex items-center gap-2">
              <h2 className="text-3xl font-bold">Portfolio</h2>
              <button
                onClick={() => setShowPortfolioInfoModal(true)}
                style={{ backgroundImage: userTierStyle.backgroundImage }}
                className="px-2.5 py-1 text-white text-xs font-bold rounded-lg transition-all cursor-pointer shadow-sm hover:brightness-110"
                title={`Your gems tier: ${userTierName}`}
              >
                {userTierName}
              </button>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 items-center">
              {!activePortfolio && (
                <button
                  type="button"
                  onClick={() => setIsSellInfoModalOpen(true)}
                  className="mt-3 border border-gray-200 bg-white rounded-full px-3 py-2 hover:bg-gray-100 transition-colors flex items-center gap-2 text-xs whitespace-nowrap"
                >
                  <HelpCircle size={14} className="text-blue-600" />
                  <span className="font-medium">More info</span>
                </button>
              )}
              {activePortfolio ? (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsAlertModalOpen(true)}
                    className="px-4 py-2.5 rounded-xl bg-black text-white text-sm font-semibold hover:bg-gray-800 inline-flex items-center gap-2"
                  >
                    <BellPlus size={16} />
                    Add portfolio alert
                  </button>
                  <button
                    type="button"
                    onClick={handleArchiveActivePortfolio}
                    disabled={!activePortfolioId || isArchiving}
                    className="px-4 py-2.5 glass-card text-sm text-red-600 hover:font-semibold disabled:opacity-60"
                  >
                    {isArchiving ? "Deleting..." : "Delete Portfolio"}
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </div>

        {isConnected ? (
          <>
            {isLoading && (
              <div className="glass-card p-6 mb-6 text-gray-600">
                Loading portfolio data...
              </div>
            )}

            {!isLoading && errorMessage && (
              <div className="glass-card p-6 mb-6 text-red-600 flex items-center justify-between">
                <span>{errorMessage}</span>
                <button
                  className="btn-primary text-sm px-4 py-2"
                  onClick={loadPortfolios}
                >
                  Retry
                </button>
              </div>
            )}

            {!isLoading && !errorMessage && portfolios.length === 0 && (
              <div className="glass-card p-12 text-center">
                <BarChart3 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-bold mb-2">No portfolios found</h3>
                <p className="text-gray-600 mb-6">
                  {searchQuery ||
                  filterRisk !== "ALL" ||
                  filterExecutionMode !== "ALL"
                    ? "Try adjusting your search or filters"
                    : "Create your first portfolio to get started"}
                </p>
                {!searchQuery &&
                  filterRisk === "ALL" &&
                  filterExecutionMode === "ALL" && (
                    <button
                      onClick={() => {
                        goToPortfolio();
                      }}
                      className="btn-primary px-6 py-3 inline-flex items-center gap-2"
                    >
                      <Plus size={20} />
                      Create Portfolio
                    </button>
                  )}
              </div>
            )}

            {!isLoading && !errorMessage && portfolios.length > 0 && (
              <>
                {/* {archiveError && (
                <div className="glass-card p-4 mb-4 text-red-600">
                  {archiveError}
                </div>
              )} */}
                {!activePortfolio && (
                  <>
                    <div className="grid md:grid-cols-4 gap-4 mb-6">
                      <div className="glass-card p-5">
                        <p className="text-sm text-gray-600 mb-1">
                          Total Value
                        </p>
                        <p className="text-3xl font-bold">
                          ${getFormattedNumber(totalPortfolioValue)}
                        </p>
                      </div>
                      <div className="glass-card p-5">
                        <p className="text-sm text-gray-600 mb-1">
                          Total Invested
                        </p>
                        <p className="text-2xl font-bold text-gray-700">
                          ${getFormattedNumber(totalInvested.toFixed(2))}
                        </p>
                      </div>
                      <div className="glass-card p-5">
                        <p className="text-sm text-gray-600 mb-1">Total P&L</p>
                        <p
                          className={`text-2xl font-bold ${
                            totalPortfolioPnL >= 0
                              ? "text-green-600"
                              : "text-red-600"
                          }`}
                        >
                          {totalPortfolioPnL >= 0 ? "+" : ""}$
                          {totalPortfolioPnL.toFixed(2)}
                        </p>
                      </div>
                      <div className="glass-card p-5">
                        <p className="text-sm text-gray-600 mb-1">
                          Total P&L %
                        </p>
                        <div className="flex items-center gap-2">
                          {totalPortfolioPnLPercent >= 0 ? (
                            <TrendingUp className="text-green-600" size={22} />
                          ) : (
                            <TrendingDown className="text-red-600" size={22} />
                          )}
                          <p
                            className={`text-2xl font-bold ${
                              totalPortfolioPnLPercent >= 0
                                ? "text-green-600"
                                : "text-red-600"
                            }`}
                          >
                            {totalPortfolioPnLPercent >= 0 ? "+" : ""}
                            {totalPortfolioPnLPercent.toFixed(2)}%
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col md:flex-row gap-3 mb-6">
                      <div className="flex-1 relative">
                        <Search
                          className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
                          size={20}
                        />
                        <input
                          type="text"
                          placeholder="Search portfolios or narratives..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="w-full pl-12 pr-4 py-3 glass-card text-sm focus:outline-none focus:ring-2 focus:ring-black/10"
                        />
                      </div>
                      <div className="flex gap-3 items-center">
                        <div className="flex items-center gap-2">
                          {/* <Filter size={18} className="text-gray-600" /> */}
                          <div className="relative">
                            <button
                              type="button"
                              onClick={() => {
                                setIsExecutionModeMenuOpen(false);
                                setIsSortMenuOpen(false);
                                setIsRiskMenuOpen((prev) => !prev);
                              }}
                              className="px-4 py-3 glass-card text-sm cursor-pointer inline-flex items-center gap-2"
                            >
                              {selectedRiskLabel}
                              <ChevronDown
                                size={16}
                                className="text-gray-500"
                              />
                            </button>
                            {isRiskMenuOpen && (
                              <div className="absolute top-full bg-white border border-gray-200 rounded-xl p-2 min-w-[200px] z-20 animate-fade-in">
                                <OutsideClickHandler
                                  onOutsideClick={() =>
                                    setIsRiskMenuOpen(false)
                                  }
                                >
                                  {RISK_FILTER_OPTIONS.map((option) => (
                                    <button
                                      type="button"
                                      key={option.value}
                                      onClick={() => {
                                        setFilterRisk(option.value);
                                        setIsRiskMenuOpen(false);
                                      }}
                                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm transition-colors ${
                                        filterRisk === option.value
                                          ? "bg-black text-white font-medium hover:bg-gray-800"
                                          : "hover:bg-black/5 hover:shadow-sm"
                                      }`}
                                    >
                                      <span>{option.label}</span>
                                    </button>
                                  ))}
                                </OutsideClickHandler>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="relative">
                          <button
                            type="button"
                            onClick={() => {
                              setIsRiskMenuOpen(false);
                              setIsSortMenuOpen(false);
                              setIsExecutionModeMenuOpen((prev) => !prev);
                            }}
                            className="px-4 py-3 glass-card text-sm cursor-pointer inline-flex items-center gap-2"
                          >
                            {selectedExecutionModeLabel}
                            <ChevronDown size={16} className="text-gray-500" />
                          </button>
                          {isExecutionModeMenuOpen && (
                            <div className="absolute top-full bg-white border border-gray-200 rounded-xl p-2 min-w-[220px] z-20 animate-fade-in">
                              <OutsideClickHandler
                                onOutsideClick={() =>
                                  setIsExecutionModeMenuOpen(false)
                                }
                              >
                                {EXECUTION_MODE_FILTER_OPTIONS.map((option) => (
                                  <button
                                    type="button"
                                    key={option.value}
                                    onClick={() => {
                                      setFilterExecutionMode(option.value);
                                      setIsExecutionModeMenuOpen(false);
                                    }}
                                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm transition-colors ${
                                      filterExecutionMode === option.value
                                        ? "bg-black text-white font-medium hover:bg-gray-800"
                                        : "hover:bg-black/5 hover:shadow-sm"
                                    }`}
                                  >
                                    <span>{option.label}</span>
                                  </button>
                                ))}
                              </OutsideClickHandler>
                            </div>
                          )}
                        </div>

                        <div className="relative">
                          <button
                            type="button"
                            onClick={() => {
                              setIsExecutionModeMenuOpen(false);
                              setIsRiskMenuOpen(false);
                              setIsSortMenuOpen((prev) => !prev);
                            }}
                            className="px-4 py-3 glass-card text-sm cursor-pointer inline-flex items-center gap-2"
                          >
                            {selectedSortLabel}
                            <ChevronDown size={16} className="text-gray-500" />
                          </button>
                          {isSortMenuOpen && (
                            <div className="absolute top-full right-0 bg-white border border-gray-200 rounded-xl p-2 min-w-[200px] z-20 animate-fade-in">
                              <OutsideClickHandler
                                onOutsideClick={() => setIsSortMenuOpen(false)}
                              >
                                {SORT_OPTIONS.map((option) => (
                                  <button
                                    type="button"
                                    key={option.value}
                                    onClick={() => {
                                      setSortBy(option.value);
                                      setIsSortMenuOpen(false);
                                    }}
                                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm transition-colors ${
                                      sortBy === option.value
                                        ? "bg-black text-white font-medium hover:bg-gray-800"
                                        : "hover:bg-black/5 hover:shadow-sm"
                                    }`}
                                  >
                                    <span>{option.label}</span>
                                  </button>
                                ))}
                              </OutsideClickHandler>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {filteredPortfolios.length > 0 ? (
                      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5 mb-6">
                        {filteredPortfolios.map((portfolio) => {
                          const pnl = Number(portfolio?.totalPnL || 0);
                          const pnlPercentValue = Number(
                            portfolio?.totalPnLPercent || 0,
                          );
                          const isActive =
                            portfolio?.id === activePortfolio?.id;
                          const isClosed = isPortfolioClosed(portfolio);

                          return (
                            <button
                              key={portfolio.id}
                              onClick={() =>
                                handlePortfolioCardClick(portfolio.id)
                              }
                              className={` p-6 text-left transition-all duration-200 group ${
                                isActive
                                  ? "ring-2 ring-black/80"
                                  : "hover:shadow-lg"
                              } ${
                                isClosed
                                  ? "bg-blue-50/70 border border-blue-200/70 rounded-2xl"
                                  : "glass-card"
                              }`}
                            >
                              <div className="flex items-start justify-between mb-4">
                                <div className="flex-1">
                                  {editingPortfolioId === portfolio.id ? (
                                    <div
                                      className="mb-2 relative flex justify-between items-center"
                                      onClick={(event) =>
                                        event.stopPropagation()
                                      }
                                    >
                                      <input
                                        autoFocus
                                        value={renameDraft}
                                        onChange={(event) =>
                                          setRenameDraft(event.target.value)
                                        }
                                        maxLength={20}
                                        onKeyDown={(event) => {
                                          if (event.key === "Enter") {
                                            event.preventDefault();
                                            handleRenamePortfolio(portfolio.id);
                                          } else if (event.key === "Escape") {
                                            event.preventDefault();
                                            cancelRenamePortfolio();
                                          }
                                        }}
                                        className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-black/10"
                                        placeholder="Portfolio name"
                                        disabled={isRenaming}
                                      />
                                      <div className="flex items-center gap-2 absolute pr-2 right-0">
                                        <button
                                          type="button"
                                          onClick={(event) => {
                                            event.stopPropagation();
                                            handleRenamePortfolio(portfolio.id);
                                          }}
                                          disabled={isRenaming}
                                          className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-lg border border-gray-200 hover:border-green-300 text-green-700 disabled:opacity-60"
                                        >
                                          <Check size={14} />
                                          {isRenaming ? "Saving..." : "Save"}
                                        </button>
                                        <button
                                          type="button"
                                          onClick={(event) => {
                                            event.stopPropagation();
                                            cancelRenamePortfolio();
                                          }}
                                          disabled={isRenaming}
                                          className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-lg border border-gray-200 hover:border-gray-300 text-gray-700 disabled:opacity-60"
                                        >
                                          <X size={14} />
                                          {/* Cancel */}
                                        </button>
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="flex items-center gap-2">
                                      <h3 className="text-lg font-bold mb-0 group-hover:text-blue-600 transition-colors">
                                        {portfolio?.name || "Portfolio"}
                                      </h3>
                                      {isOnChainExecutionMode(
                                        portfolio?.executionMode,
                                      ) &&
                                        !isClosed && (
                                          <button
                                            type="button"
                                            title="Sell portfolio"
                                            aria-label="Sell portfolio"
                                            onClick={(event) => {
                                              event.stopPropagation();
                                              openSellModal({
                                                type: "portfolio",
                                                portfolioId: portfolio.id,
                                                title:
                                                  portfolio?.name ||
                                                  "Portfolio",
                                              });
                                            }}
                                            className=" rounded-xl px-3 border border-gray-200 text-gray-500 hover:text-emerald-600 hover:border-emerald-200 bg-white/70 flex items-center justify-center"
                                          >
                                            <DollarSign size={15} /> Sell
                                          </button>
                                        )}
                                    </div>
                                  )}
                                  <div className="mt-1 flex items-center gap-2 flex-wrap">
                                    <span
                                      className={`inline-block text-xs px-2.5 py-1 rounded-full border font-medium ${getRiskColor(
                                        portfolio?.riskProfile,
                                      )}`}
                                    >
                                      {String(
                                        portfolio?.riskProfile || "UNKNOWN",
                                      ).toUpperCase()}
                                    </span>
                                    {(() => {
                                      const chainInfo = getChainInfo(
                                        portfolio?.chain,
                                      );
                                      if (!chainInfo) return null;
                                      return (
                                        <span className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border border-gray-200 bg-gray-50 text-gray-700 font-medium">
                                          {chainInfo.icon ? (
                                            <img
                                              src={chainInfo.icon}
                                              alt=""
                                              className="h-3.5 w-3.5"
                                            />
                                          ) : null}
                                          <span>Chain: {chainInfo.label}</span>
                                        </span>
                                      );
                                    })()}
                                    {isClosed && (
                                      <span className="inline-block text-xs px-2.5 py-1 rounded-full border font-medium bg-gray-100 text-gray-700 border-gray-200">
                                        CLOSED
                                      </span>
                                    )}
                                  </div>
                                </div>

                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity">
                                  <button
                                    type="button"
                                    title="Rename portfolio"
                                    aria-label="Rename portfolio"
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      startRenamePortfolio(portfolio);
                                    }}
                                    className="h-8 w-8 rounded-full border border-gray-200 text-gray-500 hover:text-blue-600 hover:border-blue-200 bg-white/70 flex items-center justify-center"
                                  >
                                    <Pencil size={15} />
                                  </button>
                                  <button
                                    type="button"
                                    title="Delete portfolio"
                                    aria-label="Delete portfolio"
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      openDeletePortfolioCardModal(portfolio);
                                    }}
                                    className="h-8 w-8 rounded-full border border-gray-200 text-gray-500 hover:text-red-600 hover:border-red-200 bg-white/70 flex items-center justify-center"
                                  >
                                    <Trash2 size={15} />
                                  </button>
                                </div>
                              </div>

                              <div className="mb-2 flex items-center gap-2 justify-between">
                                <div>
                                  <p className="text-sm text-gray-600 mb-1">
                                    Current Value
                                  </p>
                                  <p className="text-2xl font-bold mb-2">
                                    $
                                    {Number(
                                      portfolio?.totalCurrentValue || 0,
                                    ).toFixed(2)}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-sm text-gray-600 mb-1">
                                    P&L
                                  </p>
                                  <div className="flex items-center gap-2">
                                    <span
                                      className={`text-sm font-semibold ${
                                        pnl >= 0
                                          ? "text-green-600"
                                          : "text-red-600"
                                      }`}
                                    >
                                      {pnl >= 0 ? "+" : ""}
                                      {pnlPercentValue.toFixed(2)}%
                                    </span>
                                    <span
                                      className={`text-xs ${
                                        pnl >= 0
                                          ? "text-green-600"
                                          : "text-red-600"
                                      }`}
                                    >
                                      ({pnl >= 0 ? "+" : ""}${pnl.toFixed(2)})
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="glass-card p-8 text-center mb-6">
                        <h3 className="text-lg font-bold mb-2">
                          No portfolios found
                        </h3>
                        <p className="text-gray-600">
                          Try adjusting your search or filters.
                        </p>
                      </div>
                    )}
                  </>
                )}
                {activePortfolio ? (
                  <>
                    <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                      <div>
                        <button
                          type="button"
                          onClick={handleBackToPortfolios}
                          className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-black mb-3"
                        >
                          <ArrowLeft size={16} />
                          Back to portfolio
                        </button>
                      </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-4 mb-6">
                      <div className="glass-card p-5">
                        <div className="text-sm text-gray-600 mb-1">Title</div>
                        <div className="text-3xl font-bold">
                          {activePortfolio.name || "My Portfolio"}
                        </div>
                        <div className="text-sm text-gray-600 mt-2">
                          {activePortfolio.riskProfile && (
                            <div className="text-sm text-gray-600">
                              Risk: {activePortfolio.riskProfile}
                            </div>
                          )}
                          {isPortfolioClosed(activePortfolio) && (
                            <div className="mt-2">
                              <span className="inline-block text-xs px-2.5 py-1 rounded-full border font-medium bg-gray-100 text-gray-700 border-gray-200">
                                CLOSED
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="glass-card p-5">
                        <div className="text-sm text-gray-600 mb-1 flex items-center justify-between gap-3">
                          <span>Total Balance</span>
                          {isOnChainExecutionMode(
                            activePortfolio?.executionMode,
                          ) &&
                            !isPortfolioClosed(activePortfolio) && (
                              <button
                                type="button"
                                onClick={() =>
                                  openSellModal({
                                    type: "portfolio",
                                    portfolioId: activePortfolio.id,
                                    title: activePortfolio.name || "Portfolio",
                                  })
                                }
                                className="px-3 py-2 rounded-xl bg-black text-white text-xs font-semibold hover:bg-gray-800 inline-flex items-center gap-2"
                              >
                                <DollarSign size={14} />
                                Sell Portfolio
                              </button>
                            )}
                        </div>
                        <div className="text-4xl font-bold mb-2">
                          $
                          {totalBalance.toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </div>
                        <div
                          className={`text-base font-semibold ${
                            totalPnL >= 0 ? "text-green-600" : "text-red-600"
                          }`}
                        >
                          {totalPnL >= 0 ? "+" : ""}
                          {totalPnLPercent.toFixed(2)}% (${totalPnL.toFixed(2)})
                        </div>
                      </div>
                    </div>
                    {isAnalyticsLoading && (
                      <div className="glass-card p-6 mb-6 text-gray-600">
                        Loading analytics...
                      </div>
                    )}
                    {!isAnalyticsLoading && analyticsError && (
                      <div className="glass-card p-6 mb-6 text-red-600">
                        {analyticsError}
                      </div>
                    )}

                    {!isAnalyticsLoading &&
                      !analyticsError &&
                      analyticsData && (
                        <div className="space-y-4 mb-6">
                          <div className="flex flex-wrap items-center justify-between gap-4">
                            <h3 className="text-xl font-bold flex items-center gap-2">
                              <BarChart3 size={20} className="text-gray-500" />
                              Portfolio Analytics
                            </h3>
                          </div>

                          {overview && (
                            <div className="glass-card p-6">
                              <h4 className="text-lg font-bold mb-3">
                                Overview
                              </h4>
                              <div className="grid md:grid-cols-5 gap-4">
                                {[
                                  {
                                    label: "Total Invested",
                                    value: "$" + overview.totalInvestment,
                                  },
                                  {
                                    label: "Current Value",
                                    value:
                                      "$" +
                                      getFormattedNumber(
                                        overview.totalCurrentValue,
                                        4,
                                      ),
                                  },
                                  {
                                    label: "Total PnL",
                                    value: overview.totalPnL,
                                  },
                                  {
                                    label: "PnL %",
                                    value: overview.totalPnLPercent,
                                  },
                                  {
                                    label: "Positions",
                                    value: overview.positionCount,
                                  },
                                ].map((item) => (
                                  <div
                                    key={item.label}
                                    className="bg-white/70 border border-gray-200/60 rounded-xl p-4"
                                  >
                                    <div className="text-xs uppercase tracking-wide text-gray-600">
                                      {item.label}
                                    </div>
                                    <div className="text-lg font-semibold">
                                      {typeof item.value === "number"
                                        ? item.value.toLocaleString()
                                        : String(item.value ?? "--")}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          {positionsInfo.length > 0 && (
                            <div className="glass-card p-6">
                              <div className="flex items-center justify-between gap-4 mb-4">
                                <h4 className="text-lg font-bold mb-4">
                                  Positions
                                </h4>
                                <span className="text-xs text-gray-600 shrink-0">
                                  {positionsInfo.length} assets
                                </span>
                              </div>
                              <div className="grid md:grid-cols-3 gap-4">
                                {activePositionsInfo.map((pos, idx) => {
                                  const symbol =
                                    pos?.symbol ??
                                    pos?.name ??
                                    `Asset ${idx + 1}`;
                                  const name = pos?.name ?? "";
                                  const logo = pos?.logo;
                                  const narrative = pos?.narrative;
                                  const allocationUsd =
                                    pos?.allocationUsd ??
                                    pos?.allocation_usd ??
                                    null;
                                  const tokenAmount =
                                    pos?.tokenAmount ??
                                    pos?.token_amount ??
                                    null;
                                  const entryPriceUsd =
                                    pos?.entryPriceUsd ??
                                    pos?.entry_price_usd ??
                                    null;
                                  const currentValueUsd =
                                    pos?.currentValueUsd ??
                                    pos?.current_value_usd ??
                                    null;
                                  const pnlUsd =
                                    pos?.pnlUsd ?? pos?.pnl_usd ?? null;
                                  const pnlPercent =
                                    pos?.pnlPercent ?? pos?.pnl_percent ?? null;

                                  const pnlPositive =
                                    typeof pnlPercent === "number"
                                      ? pnlPercent >= 0
                                      : pnlUsd != null
                                        ? Number(pnlUsd) >= 0
                                        : null;

                                  return (
                                    <div
                                      onClick={() =>
                                        symbol && goToToken(symbol)
                                      }
                                      key={`${symbol}-${idx}`}
                                      className="glass-card p-5 cursor-pointer transition-all duration-200 hover:bg-white/80 hover:shadow-lg hover:border hover:border-gray-200/50"
                                    >
                                      <div className="flex items-center gap-4 mb-4">
                                        {logo ? (
                                          <img
                                            src={logo}
                                            alt=""
                                            className="w-12 h-12 rounded-full bg-white border border-gray-200 object-cover"
                                            loading="lazy"
                                          />
                                        ) : (
                                          <div className="w-12 h-12 rounded-full bg-gray-100 border border-gray-200" />
                                        )}
                                        <div className="min-w-0 flex-1">
                                          <div className="flex items-center gap-2 min-w-0 justify-between">
                                            <div className="flex items-center gap-2 min-w-0">
                                              <div className="font-bold text-lg truncate">
                                                {symbol}
                                              </div>
                                              {narrative ? (
                                                <span className="text-xs uppercase tracking-wide text-gray-500 bg-white/70 border border-gray-200/60 px-2 py-1 rounded-full shrink-0">
                                                  {String(narrative).replace(
                                                    /_/g,
                                                    " ",
                                                  )}
                                                </span>
                                              ) : null}
                                            </div>
                                            {isOnChainExecutionMode(
                                              activePortfolio?.executionMode,
                                            ) &&
                                              !isPortfolioClosed(
                                                activePortfolio,
                                              ) && (
                                                <button
                                                  type="button"
                                                  onClick={(event) => {
                                                    event.stopPropagation();
                                                    openSellModal({
                                                      type: "token",
                                                      portfolioId:
                                                        activePortfolio.id,
                                                      symbol: String(symbol),
                                                      title: `${symbol} in ${activePortfolio.name || "Portfolio"}`,
                                                    });
                                                  }}
                                                  className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-lg border border-emerald-200 text-emerald-700 hover:bg-emerald-50 shrink-0"
                                                >
                                                  <DollarSign size={12} />
                                                  Sell
                                                </button>
                                              )}
                                          </div>
                                          {name ? (
                                            <div className="text-sm text-gray-500 truncate">
                                              {name}
                                            </div>
                                          ) : null}
                                        </div>
                                      </div>

                                      <div className="grid grid-cols-2 gap-3 text-sm">
                                        <div>
                                          <div className="text-xs text-gray-500">
                                            Allocation
                                          </div>
                                          <div className="font-medium text-gray-900">
                                            {allocationUsd != null
                                              ? `$${Number(allocationUsd).toFixed(2)}`
                                              : "—"}
                                          </div>
                                        </div>
                                        <div className="text-right">
                                          <div className="text-xs text-gray-500">
                                            Current Value
                                          </div>
                                          <div className="font-medium text-gray-900">
                                            {currentValueUsd != null
                                              ? `$${Number(currentValueUsd).toFixed(2)}`
                                              : "—"}
                                          </div>
                                        </div>

                                        <div>
                                          <div className="text-xs text-gray-500">
                                            Token Amount
                                          </div>
                                          <div className="font-medium text-gray-900">
                                            {tokenAmount != null
                                              ? getFormattedNumber(
                                                  tokenAmount,
                                                  6,
                                                )
                                              : "—"}
                                          </div>
                                        </div>
                                        <div className="text-right">
                                          <div className="text-xs text-gray-500">
                                            Entry Price
                                          </div>
                                          <div className="font-medium text-gray-900">
                                            {entryPriceUsd != null
                                              ? `$${Number(entryPriceUsd).toFixed(6)}`
                                              : "—"}
                                          </div>
                                        </div>

                                        <div className="col-span-2">
                                          <div className="flex items-center justify-between gap-3">
                                            <div className="text-xs text-gray-500">
                                              PnL
                                            </div>
                                            <div
                                              className={`text-sm font-medium ${
                                                pnlPositive == null
                                                  ? "text-gray-700"
                                                  : pnlPositive
                                                    ? "text-green-600"
                                                    : "text-red-600"
                                              }`}
                                            >
                                              {pnlPercent != null ? (
                                                <>
                                                  {Number(pnlPercent) >= 0
                                                    ? "+"
                                                    : ""}
                                                  {Number(pnlPercent).toFixed(
                                                    2,
                                                  )}
                                                  %
                                                </>
                                              ) : pnlUsd != null ? (
                                                <>
                                                  {Number(pnlUsd) >= 0
                                                    ? "+"
                                                    : ""}
                                                  ${Number(pnlUsd).toFixed(2)}
                                                </>
                                              ) : (
                                                "—"
                                              )}
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                              {closedPositionsInfo.length > 0 && (
                                <div className="mt-6">
                                  <h5 className="text-sm font-semibold text-gray-600 mb-3">
                                    Closed positions
                                  </h5>
                                  <div className="grid md:grid-cols-3 gap-4">
                                    {closedPositionsInfo.map((pos, idx) => {
                                      const symbol =
                                        pos?.symbol ??
                                        pos?.name ??
                                        `Closed Asset ${idx + 1}`;
                                      const name = pos?.name ?? "";
                                      const logo = pos?.logo;
                                      const soldAmountUsd =
                                        pos?.soldAmountUsd ??
                                        pos?.sold_amount_usd ??
                                        null;
                                      const soldAt = pos?.soldAt ?? null;

                                      return (
                                        <div
                                          key={`closed-${symbol}-${idx}`}
                                          className="glass-card p-5 border border-gray-200/70 bg-gray-50/70 opacity-85"
                                        >
                                          <div className="flex items-center gap-4 mb-4">
                                            {logo ? (
                                              <img
                                                src={logo}
                                                alt=""
                                                className="w-12 h-12 rounded-full bg-white border border-gray-200 object-cover"
                                                loading="lazy"
                                              />
                                            ) : (
                                              <div className="w-12 h-12 rounded-full bg-gray-100 border border-gray-200" />
                                            )}
                                            <div className="min-w-0 flex-1">
                                              <div className="flex items-center gap-2">
                                                <div className="font-bold text-lg truncate text-gray-700">
                                                  {symbol}
                                                </div>
                                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-200 text-gray-700 uppercase tracking-wide">
                                                  Closed
                                                </span>
                                              </div>
                                              {name ? (
                                                <div className="text-sm text-gray-500 truncate">
                                                  {name}
                                                </div>
                                              ) : null}
                                            </div>
                                          </div>
                                          <div className="text-sm text-gray-600 space-y-1">
                                            <div>
                                              Realized:{" "}
                                              {soldAmountUsd != null
                                                ? `$${Number(soldAmountUsd).toFixed(2)}`
                                                : "—"}
                                            </div>
                                            <div>
                                              Sold at:{" "}
                                              {soldAt
                                                ? new Date(
                                                    soldAt,
                                                  ).toLocaleString()
                                                : "—"}
                                            </div>
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                          <div
                            className={
                              Object.keys(narrativeBreakdown).length > 0 ||
                              Object.keys(riskBreakdown).length > 0
                                ? "grid grid-cols-1 md:grid-cols-2 gap-4"
                                : ""
                            }
                          >
                            {Object.keys(narrativeBreakdown).length > 0 && (
                              <div className="glass-card p-6">
                                <h4 className="text-lg font-bold mb-3">
                                  Narrative Breakdown
                                </h4>
                                <div className="grid md:grid-cols-2 gap-3">
                                  {Object.entries(narrativeBreakdown).map(
                                    ([narrative, data]) => (
                                      <div
                                        key={narrative}
                                        role="button"
                                        className="flex cursor-pointer items-center justify-between bg-white/70 border border-gray-200/60 rounded-xl p-4 hover:bg-white/90 hover:border-gray-300 transition-colors"
                                        onClick={() =>
                                          narrative &&
                                          goToNarrative(
                                            narrative,
                                            activePortfolio.name,
                                          )
                                        }
                                      >
                                        <span className="font-medium">
                                          {narrative.toUpperCase()}
                                        </span>
                                        <div className="text-right text-sm text-gray-600">
                                          <div>
                                            {Number(
                                              data.currentValue || 0,
                                            ).toLocaleString()}{" "}
                                            value
                                          </div>
                                          <div>{data.count || 0} positions</div>
                                        </div>
                                      </div>
                                    ),
                                  )}
                                </div>
                              </div>
                            )}
                            {Object.keys(riskBreakdown).length > 0 && (
                              <div className="glass-card p-6">
                                <h4 className="text-lg font-bold mb-3">
                                  Risk Breakdown
                                </h4>
                                <div className="grid md:grid-cols-2 gap-3">
                                  {Object.entries(riskBreakdown).map(
                                    ([risk, data]) => (
                                      <div
                                        key={risk}
                                        className="bg-white/70 border border-gray-200/60 rounded-xl p-4"
                                      >
                                        <div className="text-xs uppercase tracking-wide text-gray-600">
                                          {risk.replace(/_/g, " ")}
                                        </div>
                                        <div className="text-lg font-semibold">
                                          {Number(
                                            data.value || 0,
                                          ).toLocaleString()}
                                        </div>
                                        <div className="text-sm text-gray-500">
                                          {Number(
                                            data?.percentage ?? 0,
                                          ).toFixed(2)}
                                          %
                                        </div>
                                      </div>
                                    ),
                                  )}
                                </div>
                              </div>
                            )}
                          </div>

                          {(topPerformers.length > 0 ||
                            bottomPerformers.length > 0) && (
                            <div className="grid md:grid-cols-2 gap-4">
                              {topPerformers.length > 0 && (
                                <div className="glass-card p-6">
                                  <h4 className="text-lg font-bold mb-3">
                                    Top Performers
                                  </h4>
                                  <div className="space-y-3">
                                    {topPerformers.map((item, index) => {
                                      const symbol = item.symbol || item.name;
                                      return (
                                        <div
                                          key={`${symbol}-${index}`}
                                          role="button"
                                          tabIndex={0}
                                          onClick={() =>
                                            symbol && goToToken(symbol)
                                          }
                                          onKeyDown={(e) => {
                                            if (
                                              symbol &&
                                              (e.key === "Enter" ||
                                                e.key === " ")
                                            ) {
                                              e.preventDefault();
                                              goToToken(symbol);
                                            }
                                          }}
                                          className="flex items-center justify-between bg-white/70 border border-gray-200/60 rounded-xl p-4 cursor-pointer hover:bg-white/90 hover:border-gray-300 transition-colors"
                                        >
                                          <span className="font-medium">
                                            {symbol}
                                          </span>
                                          <span className="text-green-600 text-sm font-medium">
                                            {Number(item.pnlPercent ?? 0) >= 0
                                              ? "+"
                                              : ""}
                                            {item.pnlPercent ?? 0}%
                                          </span>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              )}
                              {bottomPerformers.length > 0 && (
                                <div className="glass-card p-6">
                                  <h4 className="text-lg font-bold mb-3">
                                    Bottom Performers
                                  </h4>
                                  <div className="gap-3 grid md:grid-cols-3 ">
                                    {bottomPerformers.map((item, index) => {
                                      const symbol = item.symbol || item.name;
                                      return (
                                        <div
                                          key={`${symbol}-${index}`}
                                          role="button"
                                          tabIndex={0}
                                          onClick={() =>
                                            symbol && goToToken(symbol)
                                          }
                                          onKeyDown={(e) => {
                                            if (
                                              symbol &&
                                              (e.key === "Enter" ||
                                                e.key === " ")
                                            ) {
                                              e.preventDefault();
                                              goToToken(symbol);
                                            }
                                          }}
                                          className="flex items-center justify-between bg-white/70 border border-gray-200/60 rounded-xl p-4 cursor-pointer hover:bg-white/90 hover:border-gray-300 transition-colors"
                                        >
                                          <span className="font-medium">
                                            {symbol}
                                          </span>
                                          <span className="text-red-600 text-sm font-medium">
                                            {item.pnlPercent ?? 0}%
                                          </span>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                  </>
                ) : (
                  <></>
                )}

                {/* <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
                <h3 className="text-xl font-bold">Assets</h3>
              </div>
              {filteredTokens.length === 0 ? (
                <div className="glass-card p-8 text-center text-gray-500">
                  No assets found in this portfolio.
                </div>
              ) : (
                <div className="grid md:grid-cols-2 gap-4">
                  {filteredTokens.map((token, index) => {
                    const change =
                      Number(token.pnlPercent ?? token.change ?? 0) || 0;
                    const value =
                      Number(
                        token.currentValue ??
                          token.initialValue ??
                          token.value ??
                          0,
                      ) || 0;
                    return (
                      <div
                        key={`${token.symbol}-${index}`}
                        className="glass-card p-6 transition-all duration-200 hover:bg-white/80 hover:shadow-lg hover:border hover:border-gray-200/50 cursor-pointer"
                      >
                        <div className="flex items-center gap-4 mb-4">
                          <img
                            src={token.icon ?? 'https://cdn.allox.ai/allox/tokens/prime.svg'}
                            alt=""
                            className="w-14 h-14"
                          />
                          <div className="flex-1">
                            <div className="font-bold text-lg">
                              {token.symbol}
                            </div>
                            <div className="text-sm text-gray-500">
                              {token.tokenName || token.name || ""}
                            </div>
                          </div>
                          {token.narrative && (
                            <span className="text-xs uppercase tracking-wide text-gray-500 bg-white/70 border border-gray-200/60 px-2 py-1 rounded-full">
                              {token.narrative}
                            </span>
                          )}
                        </div>
                        <div className="flex justify-between items-end">
                          <div>
                            <div className="text-sm text-gray-500 mb-1">
                              Amount
                            </div>
                            <div className="font-medium">
                              {formatAmount(token.amount)}
                              {token.symbol}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-xl font-bold">
                              ${value.toFixed(2)}
                            </div>
                            <div
                              className={`text-sm ${
                                change >= 0 ? "text-green-600" : "text-red-600"
                              }`}
                            >
                              {change >= 0 ? "+" : ""}
                              {change.toFixed(2)}%
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )} */}
              </>
            )}
          </>
        ) : (
          <div className="glass-card p-12 text-center">
            <div className="w-20 h-20 bg-linear-to-br from-blue-500/20 to-purple-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <Wallet size={40} className="text-gray-400" />
            </div>
            <h3 className="text-xl font-bold mb-3">Connect Your Wallet</h3>
            <p className="text-gray-600 mb-6">
              Connect your wallet to view your portfolio
            </p>
            <button
              onClick={() => dispatch(setWalletModal(true))}
              className="btn-primary text-lg px-8 py-4 transition-all duration-200 hover:shadow-xl"
            >
              <Wallet size={20} className="mr-2" />
              Connect Wallet
            </button>
          </div>
        )}
      </div>

      {isArchiveModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="glass-card p-6 max-w-sm w-full mx-4">
            <h3 className="text-lg font-semibold mb-2">Delete portfolio</h3>
            <p className="text-sm text-gray-700 mb-4">
              Are you sure you want to delete this portfolio?
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                className="px-3 py-1.5 text-xs rounded-full border border-gray-200 text-gray-700 hover:bg-gray-100"
                onClick={() => setIsArchiveModalOpen(false)}
                disabled={isArchiving}
              >
                Cancel
              </button>
              <button
                type="button"
                className="px-3 py-1.5 text-xs rounded-full bg-red-600 text-white hover:bg-red-700 disabled:opacity-60"
                onClick={confirmArchiveActivePortfolio}
                disabled={isArchiving}
              >
                {isArchiving ? "Deleting..." : "Delete"}
              </button>
            </div>
            {archiveError && (
              <span className="text-red-600">{archiveError}</span>
            )}
          </div>
        </div>
      )}

      {deleteCardPortfolio && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="glass-card p-6 max-w-sm w-full mx-4">
            <h3 className="text-lg font-semibold mb-2">Delete portfolio</h3>
            <p className="text-sm text-gray-700 mb-4">
              Delete{" "}
              <span className="font-semibold">
                {deleteCardPortfolio.name || "this portfolio"}
              </span>
              ? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                className="px-3 py-1.5 text-xs rounded-full border border-gray-200 text-gray-700 hover:bg-gray-100"
                onClick={closeDeletePortfolioCardModal}
                disabled={isDeletingCardPortfolio}
              >
                Cancel
              </button>
              <button
                type="button"
                className="px-3 py-1.5 text-xs rounded-full bg-red-600 text-white hover:bg-red-700 disabled:opacity-60"
                onClick={handleDeletePortfolioCard}
                disabled={isDeletingCardPortfolio}
              >
                {isDeletingCardPortfolio ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {isAlertModalOpen && activePortfolioId && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
          onClick={() => setIsAlertModalOpen(false)}
        >
          <div
            className="w-full max-w-[580px]"
            onClick={(e) => e.stopPropagation()}
          >
            <PortfolioAlertSettings
              portfolioId={activePortfolioId}
              onClose={() => setIsAlertModalOpen(false)}
            />
          </div>
        </div>
      )}

      {isSellModalOpen && sellTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 backdrop-blur-sm p-4"
          onClick={closeSellModal}
        >
          <div
            className="w-full max-w-2xl bg-white border border-gray-200 rounded-3xl p-6 md:p-7 max-h-[85vh] overflow-y-auto shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <h3 className="text-2xl font-bold">
                  {sellTarget.type === "token"
                    ? "Sell Token"
                    : "Sell Portfolio"}
                </h3>
                <p className="text-sm text-gray-600">{sellTarget.title}</p>
              </div>
              <button
                type="button"
                onClick={closeSellModal}
                disabled={isSellExecuting}
                className="h-8 w-8 rounded-full border border-gray-200 flex items-center justify-center text-gray-500 hover:text-black disabled:opacity-50"
              >
                <X size={16} />
              </button>
            </div>

            <div className="flex flex-wrap items-end gap-3 mb-4 bg-gray-50 border border-gray-200 rounded-2xl p-3">
              <label className="text-sm text-gray-700">
                Slippage %
                <input
                  type="number"
                  min="0.1"
                  step="0.1"
                  value={sellSlippage}
                  onChange={(event) => setSellSlippage(event.target.value)}
                  disabled={isSellExecuting}
                  className="mt-1 w-32 px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none"
                />
              </label>
              <button
                type="button"
                onClick={() => quoteSell(sellTarget)}
                disabled={isSellQuoteLoading || isSellExecuting}
                className="px-3 py-2 rounded-xl border border-gray-200 text-sm hover:bg-gray-50 disabled:opacity-60"
              >
                {isSellQuoteLoading ? "Refreshing quote..." : "Refresh quote"}
              </button>
            </div>

            {sellQuoteError ? (
              <div className="mb-4 text-sm text-red-600">{sellQuoteError}</div>
            ) : null}

            {sellQuote ? (
              <div className="space-y-4">
                <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4">
                  <div className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">
                    Quote summary
                  </div>
                  <div className="grid md:grid-cols-3 gap-3 text-sm">
                    <div>
                      <span className="text-gray-500">Positions quoted:</span>{" "}
                      <span className="font-semibold">
                        {sellQuote?.summary?.quoted ?? sellQuoteOrders.length}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500">Failed:</span>{" "}
                      <span className="font-semibold">
                        {sellQuote?.summary?.failed ?? sellFailedQuotes.length}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500">Est. USDT out:</span>{" "}
                      <span className="font-semibold">
                        {sellEstimatedUsdtTotal.toFixed(4)}
                      </span>
                    </div>
                  </div>
                </div>

                {highPriceImpactOrders.length > 0 ? (
                  <div className="text-xs text-amber-800 bg-amber-50 border border-amber-300 rounded-2xl p-3">
                    {highPriceImpactOrders.length} route
                    {highPriceImpactOrders.length > 1 ? "s" : ""} have high
                    price impact (5%+). Review before confirming.
                  </div>
                ) : null}

                {sellQuoteOrders.length > 0 ? (
                  <div className="space-y-2">
                    {sellQuoteOrders.map((order) => {
                      const priceImpact = Number(order.priceImpact || 0);
                      const isHighImpact = priceImpact >= 5;
                      const orderStatus =
                        orderStatusMap[order.executionOrderId];
                      return (
                        <div
                          key={order.executionOrderId}
                          className={`border rounded-xl p-3 text-sm transition-colors ${
                            orderStatus === "confirmed"
                              ? "bg-emerald-50 border-emerald-300"
                              : orderStatus === "failed"
                                ? "bg-red-50 border-red-200"
                                : isHighImpact
                                  ? "bg-amber-50 border-amber-300"
                                  : "bg-white border-gray-200"
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="font-semibold flex items-center gap-2">
                              {order.symbol}
                              {isHighImpact && orderStatus !== "confirmed" ? (
                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-200 text-amber-900 uppercase tracking-wide">
                                  High impact
                                </span>
                              ) : null}
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-gray-700">
                                ~
                                {Number(order.estimatedUsdtOut || 0).toFixed(4)}{" "}
                                USDT
                              </span>
                              {orderStatus === "executing" && (
                                <Loader2
                                  size={15}
                                  className="animate-spin text-blue-500 shrink-0"
                                />
                              )}
                              {orderStatus === "confirmed" && (
                                <Check
                                  size={15}
                                  className="text-emerald-600 shrink-0"
                                />
                              )}
                              {orderStatus === "failed" && (
                                <AlertTriangle
                                  size={15}
                                  className="text-red-500 shrink-0"
                                />
                              )}
                            </div>
                          </div>
                          <div className="text-xs text-gray-500 mt-1 flex items-center gap-2 flex-wrap">
                            Provider: {order.swapProvider || "N/A"} | Price
                            impact:{" "}
                            <span
                              className={
                                isHighImpact
                                  ? "font-semibold text-amber-800"
                                  : ""
                              }
                            >
                              {priceImpact.toFixed(2)}%
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-sm text-amber-700">
                    No executable orders returned.
                  </div>
                )}

                {sellFailedQuotes.length > 0 ? (
                  <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-xl p-3">
                    Failed quotes:{" "}
                    {sellFailedQuotes
                      .map((item) => `${item.symbol}: ${item.error}`)
                      .join(" | ")}
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="text-sm text-gray-600">
                {isSellQuoteLoading
                  ? "Loading quote..."
                  : "Quote not loaded yet."}
              </div>
            )}

            {sellRequiredSlippage != null ? (
              <div className="mt-4 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-xl p-3">
                Higher slippage is required by the API. Required:{" "}
                {sellRequiredSlippage}%.
              </div>
            ) : null}
            {sellExecutionError ? (
              <div className="mt-4 text-sm text-red-600">
                {sellExecutionError}
              </div>
            ) : null}
            {sellExecutionLogs.length > 0 ? (
              <div className="mt-4 bg-black text-green-300 rounded-xl p-3 text-xs space-y-1 max-h-36 overflow-y-auto">
                {sellExecutionLogs.map((line, idx) => (
                  <div key={`${line}-${idx}`}>{line}</div>
                ))}
              </div>
            ) : null}

            {retryPrompt && (
              <div className="mt-4 bg-amber-50 border border-amber-300 rounded-xl p-4">
                <div className="text-sm text-amber-800 font-semibold mb-1 flex items-center gap-1">
                  <AlertTriangle size={14} className="shrink-0" />
                  {retryPrompt.symbol} failed (attempt {retryPrompt.attempt}/
                  {retryPrompt.maxAttempts})
                </div>
                <p className="text-xs text-amber-700 mb-3">
                  Would you like to retry this order?
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => handleRetryDecision(true)}
                    className="px-3 py-1.5 text-xs rounded-xl bg-amber-600 text-white hover:bg-amber-700 font-semibold"
                  >
                    Retry
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRetryDecision(false)}
                    className="px-3 py-1.5 text-xs rounded-xl border border-gray-200 hover:bg-gray-50"
                  >
                    Skip
                  </button>
                </div>
              </div>
            )}

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={closeSellModal}
                disabled={isSellExecuting}
                className="px-4 py-2 rounded-xl border border-gray-200 text-sm hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmSell}
                disabled={
                  isSellExecuting ||
                  isSellQuoteLoading ||
                  sellQuoteOrders.length === 0
                }
                className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 disabled:opacity-60"
              >
                {isSellExecuting ? "Executing sell..." : "Confirm Sell"}
              </button>
            </div>
          </div>
        </div>
      )}

      <AnimatePresence>
        {showPortfolioInfoModal && (
          <PortfolioInfoModal
            isOpen={showPortfolioInfoModal}
            onClose={() => setShowPortfolioInfoModal(false)}
            gemsStatus={gemsStatus}
          />
        )}
      </AnimatePresence>

      {isSellInfoModalOpen && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/45 backdrop-blur-sm p-4"
          onClick={() => setIsSellInfoModalOpen(false)}
        >
          <div
            className="w-full max-w-3xl bg-white border border-gray-200 rounded-3xl p-6 md:p-7 max-h-[85vh] overflow-y-auto shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 mb-5">
              <div>
                <h3 className="text-2xl font-bold">How selling works</h3>
                <p className="text-sm text-gray-600 mt-1">
                  Quick guide before you confirm a sell.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsSellInfoModalOpen(false)}
                className="h-8 w-8 rounded-full border border-gray-200 flex items-center justify-center text-gray-500 hover:text-black"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-4 text-sm text-gray-700">
              <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4">
                <div className="font-semibold text-gray-900 mb-2">
                  What you can sell
                </div>
                <p>
                  You can sell either:
                  <span className="font-medium"> some tokens</span> from a
                  portfolio, or{" "}
                  <span className="font-medium">the entire portfolio</span>.
                </p>
                <p className="mt-2">
                  Before final confirmation, you will see an estimated amount
                  you are expected to receive.
                </p>
              </div>

              <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4">
                <div className="font-semibold text-gray-900 mb-2">
                  What happens after you confirm
                </div>
                <p>
                  We first fetch the best available routes, then your wallet may
                  ask for one or more confirmations to complete the sale.
                </p>
                <p className="mt-2">
                  If the market moves too fast, you may be asked to increase
                  slippage to continue.
                </p>
              </div>

              <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4">
                <div className="font-semibold text-gray-900 mb-2">
                  Price impact and estimates
                </div>
                <p>
                  Estimated USDT values are shown before execution. Routes with
                  high price impact are highlighted so you can decide whether to
                  proceed.
                </p>
                <p className="mt-2">
                  Final received amounts can differ slightly from estimates due
                  to market movement and execution timing.
                </p>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4">
                <div className="font-semibold text-gray-900 mb-2">
                  After selling
                </div>
                <p>
                  Sold positions are marked as closed and become read-only in
                  the UI.
                </p>
                <p className="mt-2">
                  If all positions are sold, the portfolio status becomes
                  <span className="font-semibold"> CLOSED</span> and remains
                  visible in your portfolio list.
                </p>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
                <div className="font-semibold text-gray-900 mb-2">
                  If something fails
                </div>
                <p>
                  Some positions can fail while others succeed. You can retry
                  safely, and already sold positions are skipped automatically.
                </p>
                <p className="mt-2">
                  If you see an error, review the message in this modal and try
                  again with updated slippage or after a short wait.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
