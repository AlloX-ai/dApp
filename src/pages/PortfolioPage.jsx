import { useCallback, useEffect, useMemo, useState } from "react";
import { Wallet } from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import { setWalletModal } from "../redux/slices/walletSlice";

import { apiCall } from "../utils/api";
import { useAuth } from "../hooks/useAuth";

export function PortfolioPage() {
  const dispatch = useDispatch();
  const isConnected = useSelector((state) => state.wallet.isConnected);
  const { token, ensureAuthenticated, logout } = useAuth();
  const [portfolios, setPortfolios] = useState([]);
  const [activePortfolioId, setActivePortfolioId] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [analytics, setAnalytics] = useState(null);
  const [analyticsError, setAnalyticsError] = useState("");
  const [isAnalyticsLoading, setIsAnalyticsLoading] = useState(false);


  const getAnalytics = useCallback(async (portfolioId) => {
    const response = await apiCall(`/portfolio/${portfolioId}/analytics`);
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
        setAnalytics(response);
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
    [ensureAuthenticated, getAnalytics, logout],
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
      if (list[0]?.id) {
        handlePortfolioSelect(list[0].id);
      } else {
        setActivePortfolioId(null);
        setAnalytics(null);
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
  }, [isConnected, ensureAuthenticated, handlePortfolioSelect, logout]);

  useEffect(() => {
    loadPortfolios();
  }, [loadPortfolios]);

  const activePortfolio = useMemo(
    () =>
      portfolios.find((portfolio) => portfolio.id === activePortfolioId) ??
      portfolios[0],
    [portfolios, activePortfolioId],
  );

  const positions = Array.isArray(activePortfolio?.positions)
    ? activePortfolio.positions
    : [];
  const tokensWithBalance = positions.filter(
    (token) => Number(token.amount) > 0,
  );
  const filteredTokens = tokensWithBalance;
  const totalBalance = Number(activePortfolio?.totalCurrentValue || 0);
  const totalPnL = Number(activePortfolio?.totalPnL || 0);
  const totalPnLPercent = Number(activePortfolio?.totalPnLPercent || 0);
  const analyticsData = analytics?.analytics || analytics;
  const overview = analyticsData?.overview;
  const narrativeBreakdown = analyticsData?.narrativeBreakdown || {};
  const riskBreakdown = analyticsData?.riskBreakdown || {};
  const topPerformers = analyticsData?.topPerformers || [];
  const bottomPerformers = analyticsData?.bottomPerformers || [];
  const formatAmount = (amount) =>
    `${new Intl.NumberFormat("en-US", {
      maximumFractionDigits: 6,
    }).format(amount)} `;
  return (
    <div className="flex-1 px-6 py-8 portfolio-wrapper ms-auto w-full overflow-y-auto">
      <h2 className="text-3xl font-bold mb-6">Portfolio</h2>

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
            <div className="glass-card p-8 text-center text-gray-500">
              No portfolios found yet.
            </div>
          )}

          {!isLoading && !errorMessage && activePortfolio && (
            <>
              <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
                <div>
                  <h3 className="text-2xl font-bold">
                    {activePortfolio.name || "My Portfolio"}
                  </h3>
                  {activePortfolio.riskProfile && (
                    <div className="text-sm text-gray-500">
                      Risk: {activePortfolio.riskProfile}
                    </div>
                  )}
                </div>
                {portfolios.length > 1 && (
                  <div className="flex flex-wrap gap-2">
                    {portfolios.map((portfolio) => (
                      <button
                        key={portfolio.id}
                        onClick={() => handlePortfolioSelect(portfolio.id)}
                        className={`px-3 py-2 rounded-full text-xs font-medium border transition-all ${
                          portfolio.id === activePortfolio.id
                            ? "bg-black text-white border-black"
                            : "bg-white/80 border-gray-200 hover:border-gray-300"
                        }`}
                      >
                        {portfolio.name || "Portfolio"}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="bg-white p-8 mb-6 transition-all duration-200">
                <div className="text-sm text-gray-500 mb-2">Total Balance</div>
                <div className="text-5xl font-bold mb-3">
                  $
                  {totalBalance.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </div>
                <div
                  className={`text-lg ${
                    totalPnL >= 0 ? "text-green-600" : "text-red-600"
                  }`}
                >
                  {totalPnL >= 0 ? "+" : ""}
                  {totalPnLPercent.toFixed(2)}% (${totalPnL.toFixed(2)})
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

              {!isAnalyticsLoading && !analyticsError && analyticsData && (
                <div className="space-y-4 mb-6">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <h3 className="text-xl font-bold">Portfolio Analytics</h3>
                  </div>

                  {overview && (
                    <div className="glass-card p-6">
                      <h4 className="text-sm text-gray-500 mb-3">Overview</h4>
                      <div className="grid md:grid-cols-3 gap-4">
                        {[
                          {
                            label: "Total Invested",
                            value: "$" + overview.totalInvestment,
                          },
                          {
                            label: "Current Value",
                            value: "$" + overview.totalCurrentValue,
                          },
                          { label: "Total PnL", value: overview.totalPnL },
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
                            <div className="text-xs uppercase tracking-wide text-gray-500">
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

                  {Object.keys(narrativeBreakdown).length > 0 && (
                    <div className="glass-card p-6">
                      <h4 className="text-sm text-gray-500 mb-3">
                        Narrative Breakdown
                      </h4>
                      <div className="grid md:grid-cols-2 gap-3">
                        {Object.entries(narrativeBreakdown).map(
                          ([narrative, data]) => (
                            <div
                              key={narrative}
                              className="flex items-center justify-between bg-white/70 border border-gray-200/60 rounded-xl p-4"
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
                      <h4 className="text-sm text-gray-500 mb-3">
                        Risk Breakdown
                      </h4>
                      <div className="grid md:grid-cols-3 gap-3">
                        {Object.entries(riskBreakdown).map(([risk, data]) => (
                          <div
                            key={risk}
                            className="bg-white/70 border border-gray-200/60 rounded-xl p-4"
                          >
                            <div className="text-xs uppercase tracking-wide text-gray-500">
                              {risk.replace(/_/g, " ")}
                            </div>
                            <div className="text-lg font-semibold">
                              {Number(data.value || 0).toLocaleString()}
                            </div>
                            <div className="text-sm text-gray-500">
                              {Number(data.percentage) ?? "0.00"}%
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {(topPerformers.length > 0 ||
                    bottomPerformers.length > 0) && (
                    <div className="grid md:grid-cols-2 gap-4">
                      {topPerformers.length > 0 && (
                        <div className="glass-card p-6">
                          <h4 className="text-sm text-gray-500 mb-3">
                            Top Performers
                          </h4>
                          <div className="space-y-3">
                            {topPerformers.map((item, index) => (
                              <div
                                key={`${item.symbol || item.name}-${index}`}
                                className="flex items-center justify-between bg-white/70 border border-gray-200/60 rounded-xl p-4"
                              >
                                <span className="font-medium">
                                  {item.symbol || item.name}
                                </span>
                                <span className="text-green-600 text-sm font-medium">
                                  {Number(item.pnlPercent ?? 0) >= 0 ? "+" : ""}
                                  {item.pnlPercent ?? 0}%
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      {bottomPerformers.length > 0 && (
                        <div className="glass-card p-6">
                          <h4 className="text-sm text-gray-500 mb-3">
                            Bottom Performers
                          </h4>
                          <div className="space-y-3">
                            {bottomPerformers.map((item, index) => (
                              <div
                                key={`${item.symbol || item.name}-${index}`}
                                className="flex items-center justify-between bg-white/70 border border-gray-200/60 rounded-xl p-4"
                              >
                                <span className="font-medium">
                                  {item.symbol || item.name}
                                </span>
                                <span className="text-red-600 text-sm font-medium">
                                  {item.pnlPercent ?? 0}%
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
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
              )}
            </>
          )}
        </>
      ) : (
        <div className="glass-card p-12 text-center">
          <div className="w-20 h-20 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
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
  );
}
