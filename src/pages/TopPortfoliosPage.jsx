import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate, useSearchParams } from "react-router";
import {
  ArrowLeft,
  Loader2,
  TrendingUp,
  TrendingDown,
  Trophy,
} from "lucide-react";
import { apiCall } from "../utils/api";
import { useAuth } from "../hooks/useAuth";

export function TopPortfoliosPage() {
  const [selectedPeriod, setSelectedPeriod] = useState("24h");
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { ensureAuthenticated, logout } = useAuth();
  const selectedPortfolioId = searchParams.get("portfolio")?.trim() || "";

  useEffect(() => {
    window.scrollTo(0, 0);
    document.title = "Top Portfolios";
  }, []);

  const toNumber = (value) => {
    if (value == null) return null;
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  };

  const normalizeToken = (token, idx) => {
    if (!token) return null;
    if (typeof token === "string") {
      return { symbol: token, logo: null, id: token };
    }
    const symbol =
      token.symbol ?? token.ticker ?? token.token ?? token.name ?? "—";
    const logo =
      token.logo ?? token.logoUrl ?? token.image ?? token.icon ?? null;
    return {
      symbol: String(symbol),
      name: token.name ?? null,
      narrative: token.narrative ?? null,
      pnlUsd:
        toNumber(token.pnlUsd ?? token.profitUsd ?? token.changeUsd) ?? null,
      pnlPercent:
        toNumber(
          token.pnlPercent ?? token.pnlPercentage ?? token.changePercentage,
        ) ?? null,
      logo,
      id: token.id ?? token.address ?? `${String(symbol)}-${idx}`,
      currentPriceUsd: token.currentPriceUsd ?? 0,
      allocationUsd: token.allocationUsd ?? 0,
      currentValueUsd: token.currentValueUsd ?? 0,
      entryPriceUsd: token.entryPriceUsd ?? 0,
    };
  };

  const normalizePortfolio = (portfolio, idx) => {
    const rawTokens = Array.isArray(portfolio?.tokens)
      ? portfolio.tokens
      : Array.isArray(portfolio?.holdings)
        ? portfolio.holdings
        : Array.isArray(portfolio?.assets)
          ? portfolio.assets
          : [];
    const tokens = rawTokens.map(normalizeToken).filter(Boolean);
    const currentValue = toNumber(
      portfolio?.currentValue ??
        portfolio?.totalCurrentValue ??
        portfolio?.value ??
        portfolio?.totalValue ??
        portfolio?.portfolioValue ??
        portfolio?.currentValueUsd,
    );
    const totalInvestment = toNumber(portfolio?.totalInvestment ?? 0);
    const positionCount = Number(portfolio?.positionCount);
    const plDollar = toNumber(
      portfolio?.plDollar ??
        portfolio?.pnlUsd ??
        portfolio?.profitUsd ??
        portfolio?.profitLossUsd ??
        portfolio?.changeUsd,
    );
    const plPercentage = toNumber(
      portfolio?.plPercentage ??
        portfolio?.pnlPercent ??
        portfolio?.pnlPercentage ??
        portfolio?.profitPercentage ??
        portfolio?.profitLossPercentage ??
        portfolio?.changePercentage,
    );
    return {
      id:
        portfolio?.id ??
        portfolio?.portfolioId ??
        `${portfolio?.name ?? "portfolio"}-${idx}`,
      name:
        portfolio?.name ?? portfolio?.portfolioName ?? `Portfolio ${idx + 1}`,
      rank: toNumber(portfolio?.rank) ?? idx + 1,
      chain: portfolio?.chain ?? null,
      riskProfile: portfolio?.riskProfile ?? null,
      executionMode: portfolio?.executionMode ?? null,
      tokens,
      currentValue: currentValue ?? 0,
      plDollar: plDollar ?? 0,
      plPercentage: plPercentage ?? 0,
      totalInvestment: totalInvestment,
      positionCount: positionCount,
    };
  };

  const topPortfoliosQuery = useQuery({
    queryKey: ["portfolio", "top"],
    queryFn: async () => {
      await ensureAuthenticated();
      try {
        return await apiCall(`/portfolio/top`);
      } catch (err) {
        if (err?.status === 401) logout();
        throw err;
      }
    },
    staleTime: 2 * 60 * 1000,
  });

  const rawResponse = topPortfoliosQuery.data ?? {};
  const periodsData = {
    "24h": Array.isArray(rawResponse?.["24h"]) ? rawResponse["24h"] : [],
    "7d": Array.isArray(rawResponse?.["7d"]) ? rawResponse["7d"] : [],
    "30d": Array.isArray(rawResponse?.["30d"]) ? rawResponse["30d"] : [],
  };
  const portfolios = Array.isArray(periodsData[selectedPeriod])
    ? periodsData[selectedPeriod].map(normalizePortfolio)
    : [];
  const allPortfolios = useMemo(
    () =>
      [...periodsData["24h"], ...periodsData["7d"], ...periodsData["30d"]].map(
        normalizePortfolio,
      ),
    [rawResponse],
  );
  const selectedPortfolio = selectedPortfolioId
    ? allPortfolios.find((item) => item.id === selectedPortfolioId)
    : null;

  const goToToken = (symbol) => {
    if (!symbol) return;
    navigate(
      `/trending?token=${encodeURIComponent(String(symbol).toUpperCase())}`,
    );
  };

  const goToNarrative = (narrative) => {
    if (!narrative) return;
    navigate(`/trending?narrative=${encodeURIComponent(String(narrative))}`);
  };

  const openPortfolioDetail = (portfolioId) => {
    if (!portfolioId) return;
    navigate(`/top-portfolios?portfolio=${encodeURIComponent(portfolioId)}`);
  };

  const formatCurrency = (value) => `$${Number(value ?? 0).toLocaleString()}`;
  const formatPercent = (value) =>
    `${Number(value) >= 0 ? "+" : ""}${Number(value ?? 0).toFixed(2)}%`;

  if (selectedPortfolioId) {
    const holdings = Array.isArray(selectedPortfolio?.tokens)
      ? selectedPortfolio.tokens
      : [];
    const narratives = Array.from(
      new Set(
        holdings
          .map((item) => item?.narrative)
          .filter((item) => typeof item === "string" && item.trim().length > 0),
      ),
    );

    return (
      <div className="space-y-6 flex-1 px-6 py-8 portfolio-wrapper ms-auto w-full overflow-y-auto">
        <button
          type="button"
          onClick={() => navigate("/top-portfolios")}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Top Portfolios
        </button>

        {!selectedPortfolio && !topPortfoliosQuery.isLoading && (
          <div className="glass-card p-6 rounded-2xl">
            <p className="text-gray-700">Portfolio not found.</p>
          </div>
        )}

        {selectedPortfolio && (
          <>
            <div className="grid md:grid-cols-2 gap-4 mb-6">
              <div className="glass-card p-5">
                <div className="text-sm text-gray-600 mb-1">Title</div>
                <div className="text-3xl font-bold">
                  {selectedPortfolio.name || "My Portfolio"}
                </div>
                <div className="text-sm text-gray-600 mt-2">
                  {selectedPortfolio.riskProfile && (
                    <div className="text-sm text-gray-600">
                      Risk: {selectedPortfolio.riskProfile}
                    </div>
                  )}
                </div>
              </div>

              <div className="glass-card p-5">
                <div className="text-sm text-gray-600 mb-1">Total Value</div>
                <div className="text-4xl font-bold mb-2">
                  {formatCurrency(selectedPortfolio.currentValue)}
                </div>
                <div className="flex items-center gap-2">
                  <div
                    className={`text-base font-semibold ${
                      selectedPortfolio.plPercentage >= 0
                        ? "text-green-600"
                        : "text-red-600"
                    }`}
                  >
                    {selectedPortfolio.plPercentage >= 0 ? "+" : ""}
                    {selectedPortfolio.plPercentage.toFixed(2)}%
                  </div>
                  <div
                    className={`text-base font-semibold ${
                      selectedPortfolio.plDollar >= 0
                        ? "text-green-600"
                        : "text-red-600"
                    }`}
                  >
                    {selectedPortfolio.plDollar >= 0 ? "+" : ""}$
                    {selectedPortfolio.plDollar.toFixed(2)}
                  </div>
                </div>
              </div>
            </div>

            <div className="glass-card p-6">
              <h4 className="text-lg font-bold mb-3">Overview</h4>
              <div className="grid md:grid-cols-5 gap-4">
                {[
                  {
                    label: "Total Invested",
                    value: formatCurrency(selectedPortfolio.totalInvestment),
                  },
                  {
                    label: "Current Value",
                    value: formatCurrency(selectedPortfolio.currentValue),
                  },
                  {
                    label: "PnL $",
                    value: "$" + selectedPortfolio.plDollar,
                  },
                  {
                    label: "PnL %",
                    value: selectedPortfolio.plPercentage + "%",
                  },
                  {
                    label: "Positions",
                    value: selectedPortfolio.positionCount,
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

            <div className="glass-card p-6 rounded-2xl">
              <h3 className="text-lg font-bold mb-4">Token Holdings</h3>
              {holdings.length === 0 ? (
                <p className="text-sm text-gray-500">No holdings data.</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {holdings.map((token, idx) => (
                    <button
                      key={`${token.id ?? token.symbol}-${idx}`}
                      type="button"
                      onClick={() => goToToken(token.symbol)}
                      className="flex flex-col gap-2 justify-between text-left bg-white/70 border border-gray-200/60 rounded-xl p-4 hover:bg-white hover:border-gray-300 transition-colors"
                    >
                      <div className="flex items-center gap-4 mb-4">
                        {token.logo ? (
                          <img
                            src={token.logo}
                            alt=""
                            className="w-8 h-8 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-gray-100 border border-gray-200" />
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="font-bold text-lg truncate">
                              {token.symbol}
                            </div>
                            {token.narrative ? (
                              <span className="text-xs uppercase tracking-wide text-gray-500 bg-white/70 border border-gray-200/60 px-2 py-1 rounded-full shrink-0">
                                {String(token.narrative).replace(/_/g, " ")}
                              </span>
                            ) : null}
                          </div>
                          {name ? (
                            <div className="text-sm text-gray-500 truncate">
                              {token.name}
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
                            {token.allocationUsd != null
                              ? `$${Number(token.allocationUsd).toFixed(2)}`
                              : "—"}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-xs text-gray-500">
                            Current Value
                          </div>
                          <div className="font-medium text-gray-900">
                            {token.currentValueUsd != null
                              ? `$${Number(token.currentValueUsd).toFixed(2)}`
                              : "—"}
                          </div>
                        </div>

                        <div>
                          <div className="text-xs text-gray-500">
                            Token Current Price
                          </div>
                          <div className="font-medium text-gray-900">
                            {token.currentPriceUsd != null
                              ? `$${Number(token.currentPriceUsd).toFixed(2)}`
                              : "—"}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-xs text-gray-500">
                            Entry Price
                          </div>
                          <div className="font-medium text-gray-900">
                            {token.entryPriceUsd != null
                              ? `$${Number(token.entryPriceUsd).toFixed(2)}`
                              : "—"}
                          </div>
                        </div>

                        <div className="col-span-2">
                          <div className="flex items-center justify-between gap-3">
                            <div className="text-xs text-gray-500">PnL</div>
                            <div
                              className={`text-sm font-medium ${
                                token.pnlPercent == null
                                  ? "text-gray-700"
                                  : token.pnlPercent >= 0
                                    ? "text-green-600"
                                    : "text-red-600"
                              }`}
                            >
                              {token.pnlPercent != null ? (
                                <>
                                  {Number(token.pnlPercent) >= 0 ? "+" : ""}
                                  {Number(token.pnlPercent).toFixed(2)}%
                                </>
                              ) : token.pnlUsd != null ? (
                                <>
                                  {Number(token.pnlUsd) >= 0 ? "+" : ""}$
                                  {Number(token.pnlUsd).toFixed(2)}
                                </>
                              ) : (
                                "—"
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
            {narratives.length > 0 && (
              <div className="glass-card p-6 rounded-2xl">
                <h3 className="text-lg font-bold mb-3">Narratives</h3>
                <div className="flex flex-wrap gap-2">
                  {narratives.map((narrative) => (
                    <button
                      key={narrative}
                      type="button"
                      onClick={() => goToNarrative(narrative)}
                      className="px-3 py-1.5 rounded-lg text-sm font-medium bg-gray-100 hover:bg-gray-200 transition-colors"
                    >
                      {narrative}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6 flex-1 px-6 py-8 portfolio-wrapper ms-auto w-full overflow-y-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-center gap-3 justify-between">
        <div className="p-6 border-b border-gray-200/50">
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-3xl font-bold">Top Portfolios</h1>
          </div>
          <p className="text-gray-600">
            Explore the best performing portfolios on AlloX
          </p>
        </div>

        {/* Time Period Tabs */}

        <div className="flex gap-2 p-1.5 bg-gray-100 rounded-xl inline-flex">
          <button
            onClick={() => setSelectedPeriod("24h")}
            className={`px-6 py-2.5 text-sm font-semibold rounded-lg transition-all ${
              selectedPeriod === "24h"
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            24 Hours
          </button>
          <button
            onClick={() => setSelectedPeriod("7d")}
            className={`px-6 py-2.5 text-sm font-semibold rounded-lg transition-all ${
              selectedPeriod === "7d"
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            7 Days
          </button>
          <button
            onClick={() => setSelectedPeriod("30d")}
            className={`px-6 py-2.5 text-sm font-semibold rounded-lg transition-all ${
              selectedPeriod === "30d"
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            30 Days
          </button>
        </div>
      </div>

      {/* Portfolio List */}
      <div className="flex-1 overflow-y-auto">
        {topPortfoliosQuery.isLoading && (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
          </div>
        )}
        {!topPortfoliosQuery.isLoading && topPortfoliosQuery.error && (
          <div className="glass-card p-6 rounded-2xl">
            <p className="text-red-600 text-sm">
              {topPortfoliosQuery.error?.message ||
                "Failed to load top portfolios."}
            </p>
          </div>
        )}
        {!topPortfoliosQuery.isLoading &&
          !topPortfoliosQuery.error &&
          portfolios.length === 0 && (
            <div className="glass-card p-8 rounded-2xl text-center">
              <Trophy className="w-10 h-10 mx-auto text-gray-400 mb-3" />
              <p className="text-gray-600">
                No top portfolios available for this period.
              </p>
            </div>
          )}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {portfolios.map((portfolio, index) => (
            <div
              key={portfolio.id}
              role="button"
              tabIndex={0}
              onClick={() => openPortfolioDetail(portfolio.id)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  openPortfolioDetail(portfolio.id);
                }
              }}
              className="glass-card flex flex-col justify-between p-5 rounded-2xl hover:shadow-lg transition-all cursor-pointer group"
            >
              <div className="flex flex-col gap-2">
                {/* Header with Rank and Category */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-lg ${
                        index === 0
                          ? "bg-gradient-to-br from-yellow-400 to-yellow-600 text-white"
                          : index === 1
                            ? "bg-gradient-to-br from-gray-300 to-gray-400 text-gray-800"
                            : index === 2
                              ? "bg-gradient-to-br from-orange-400 to-orange-600 text-white"
                              : "bg-gray-100 text-gray-700"
                      }`}
                    >
                      #{portfolio.rank ?? index + 1}
                    </div>
                    <div>
                      <h3 className="font-bold text-lg text-gray-900 group-hover:text-blue-600 transition-colors">
                        {portfolio.name}
                      </h3>
                      {/* <span
                      className={`inline-block px-3 py-1 rounded-lg text-xs font-semibold mt-1 ${portfolio.categoryColor}`}
                    >
                      {portfolio.category}
                    </span> */}
                    </div>
                  </div>
                </div>

                {/* Tokens */}
                <div className="mb-4">
                  <div className="flex items-center gap-2 flex-wrap">
                    {portfolio.tokens.length > 0 ? (
                      portfolio.tokens.map((token, idx) => (
                        <div
                          key={token.id ?? idx}
                          className="flex items-center gap-1.5 bg-gray-50 px-3 py-1.5 rounded-lg group-hover:bg-gray-100 transition-colors"
                        >
                          {token.logo ? (
                            <img
                              src={token.logo}
                              alt=""
                              className="w-5 h-5 rounded-full object-cover"
                            />
                          ) : (
                            <div className="w-5 h-5 rounded-full bg-gray-200"></div>
                          )}
                          <span className="text-sm font-semibold text-gray-700">
                            {token.symbol}
                          </span>
                        </div>
                      ))
                    ) : (
                      <span className="text-sm text-gray-500">
                        No holdings data
                      </span>
                    )}
                  </div>
                </div>
              </div>
              {/* Stats Grid */}
              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-200/50">
                <div>
                  <div className="text-xs text-gray-500 mb-1">
                    Current Value
                  </div>
                  <div className="font-bold text-xl text-gray-900">
                    ${portfolio.currentValue.toLocaleString()}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-gray-500 mb-1">P&L</div>
                  <div className="flex items-center gap-2 justify-end">
                    <div
                      className={`flex items-center justify-end gap-1.5 font-bold text-xl ${
                        portfolio.plPercentage >= 0
                          ? "text-green-600"
                          : "text-red-600"
                      }`}
                    >
                      {portfolio.plPercentage >= 0 ? (
                        <TrendingUp className="w-5 h-5" />
                      ) : (
                        <TrendingDown className="w-5 h-5" />
                      )}
                      {portfolio.plPercentage >= 0 ? "+" : ""}
                      {portfolio.plPercentage.toFixed(2)}%
                    </div>
                    <div
                      className={`text-sm font-semibold ${
                        portfolio.plDollar >= 0
                          ? "text-green-600"
                          : "text-red-600"
                      }`}
                    >
                      {portfolio.plDollar >= 0 ? "+" : ""}$
                      {portfolio.plDollar.toLocaleString()}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
