import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  BellPlus,
  BarChart3,
  Check,
  ChevronDown,
  Plus,
  Pencil,
  Search,
  Trash2,
  TrendingDown,
  TrendingUp,
  Wallet,
  X,
} from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import { NavLink, useLocation, useNavigate } from "react-router";
import OutsideClickHandler from "react-outside-click-handler/build/OutsideClickHandler";
import { setWalletModal } from "../redux/slices/walletSlice";
import getFormattedNumber from "../hooks/get-formatted-number";
import { apiCall } from "../utils/api";
import { useAuth } from "../hooks/useAuth";
import { PortfolioAlertSettings } from "../components/PortfolioAlertSettings";

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

const SORT_OPTIONS = [
  { value: "date", label: "Sort by: Recent" },
  { value: "name", label: "Sort by: Name" },
  { value: "value", label: "Sort by: Value" },
  { value: "pnl", label: "Sort by: Performance" },
];

export function PortfolioPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const isConnected = useSelector((state) => state.wallet.isConnected);
  const { ensureAuthenticated, logout } = useAuth();
  const selectedPortfolioIdFromUrl = useMemo(
    () => new URLSearchParams(location.search).get("portfolio"),
    [location.search],
  );

  const goToPortfolio = useCallback(() => {
    navigate("/", {
      state: { chatSuggestion: "Build a Portfolio" },
    });
  }, [navigate]);

  const goToToken = useCallback(
    (symbol) => {
      if (!symbol) return;
      navigate(
        `/trending?token=${encodeURIComponent(String(symbol).toUpperCase())}`,
      );
    },
    [navigate],
  );

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
  const [sortBy, setSortBy] = useState("date");
  const [editingPortfolioId, setEditingPortfolioId] = useState(null);
  const [renameDraft, setRenameDraft] = useState("");
  const [isRenaming, setIsRenaming] = useState(false);
  const [deleteCardPortfolio, setDeleteCardPortfolio] = useState(null);
  const [isDeletingCardPortfolio, setIsDeletingCardPortfolio] = useState(false);
  const [isRiskMenuOpen, setIsRiskMenuOpen] = useState(false);
  const [isSortMenuOpen, setIsSortMenuOpen] = useState(false);
  const [isAlertModalOpen, setIsAlertModalOpen] = useState(false);

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
        setAnalyticsError(
          error?.message || "Unable to load analytics for this portfolio.",
        );
      } finally {
        setIsAnalyticsLoading(false);
      }
    },
    [ensureAuthenticated, getAnalytics, getPortfolioInfo, logout],
  );

  const loadPortfolios = useCallback(async () => {
    if (!isConnected) return;
    setIsLoading(true);
    setErrorMessage("");
    try {
      await ensureAuthenticated();
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
      setErrorMessage(
        error?.message || "Unable to load your portfolios right now.",
      );
    } finally {
      setIsLoading(false);
    }
  }, [
    isConnected,
    ensureAuthenticated,
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
      return matchesSearch && matchesRisk;
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
  }, [portfolios, searchQuery, filterRisk, sortBy]);

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
  const selectedRiskLabel =
    RISK_FILTER_OPTIONS.find((item) => item.value === filterRisk)?.label ||
    "All Risk Levels";
  const selectedSortLabel =
    SORT_OPTIONS.find((item) => item.value === sortBy)?.label ||
    "Sort by: Recent";
  return (
    <div className="flex-1 px-6 py-8 portfolio-wrapper ms-auto w-full overflow-y-auto relative">
      <div className="">
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row items-center justify-between mb-6 gap-3">
            <h2 className="text-3xl font-bold">Portfolio</h2>
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
                  {searchQuery || filterRisk !== "ALL"
                    ? "Try adjusting your search or filters"
                    : "Create your first portfolio to get started"}
                </p>
                {!searchQuery && filterRisk === "ALL" && (
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
                          {totalPortfolioPnL >= 0 ? "+" : ""}
                          ${totalPortfolioPnL.toFixed(2)}
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

                          return (
                            <button
                              key={portfolio.id}
                              onClick={() =>
                                handlePortfolioCardClick(portfolio.id)
                              }
                              className={`glass-card p-6 text-left transition-all duration-200 group ${
                                isActive
                                  ? "ring-2 ring-black/80"
                                  : "hover:shadow-lg"
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
                                    <h3 className="text-lg font-bold mb-2 group-hover:text-blue-600 transition-colors">
                                      {portfolio?.name || "Portfolio"}
                                    </h3>
                                  )}
                                  <span
                                    className={`inline-block text-xs px-2.5 py-1 rounded-full border font-medium ${getRiskColor(
                                      portfolio?.riskProfile,
                                    )}`}
                                  >
                                    {String(
                                      portfolio?.riskProfile || "UNKNOWN",
                                    ).toUpperCase()}
                                  </span>
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
                          Try adjusting your search or risk filters.
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
                        </div>
                      </div>

                      <div className="glass-card p-5">
                        <div className="text-sm text-gray-600 mb-1">
                          Total Balance
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
                                {positionsInfo.map((pos, idx) => {
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
                                <div className="grid md:grid-cols-3 gap-3">
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
                                <div className="grid md:grid-cols-3 gap-3">
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
          <div className="w-full max-w-[580px]" onClick={(e) => e.stopPropagation()}>
            <PortfolioAlertSettings
              portfolioId={activePortfolioId}
              onClose={() => setIsAlertModalOpen(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
