import { useCallback, useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { useSearchParams, useNavigate } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { apiCall } from "../utils/api";
import { useAuth } from "../hooks/useAuth";
import { TokenDetailPage } from "./TokenDetailPage";
import { NarrativeDetailPage } from "./NarrativeDetailPage";
import {
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  Search,
  Loader2,
  BarChart3,
  TrendingDown,
} from "lucide-react";

const LIMIT = 10;
const TIMEFRAME = "24h";
const MARKET_DATA_STALE_MS = 2 * 60 * 1000;
const SEARCH_STALE_MS = 60 * 1000;
const SEARCH_DEBOUNCE_MS = 300;

export function TradingPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const completedActions = useSelector((state) => state.chat.completedActions);
  const { ensureAuthenticated, logout } = useAuth();

  const tokenSymbol = searchParams.get("token")?.trim();
  const narrativeId = searchParams.get("narrative")?.trim();
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

  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(searchQuery.trim());
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [searchQuery]);

  const createMarketQueryFn = useCallback(
    (endpoint) => async () => {
      await ensureAuthenticated();
      try {
        return await apiCall(endpoint);
      } catch (err) {
        if (err?.status === 401) logout();
        throw err;
      }
    },
    [ensureAuthenticated, logout],
  );

  const trendingQuery = useQuery({
    queryKey: ["tokens", "trending", LIMIT],
    queryFn: createMarketQueryFn(`/tokens/list/trending?limit=${LIMIT}`),
    staleTime: MARKET_DATA_STALE_MS,
    select: (data) => (Array.isArray(data?.trending) ? data.trending : []),
  });
  const gainersQuery = useQuery({
    queryKey: ["tokens", "top-gainers", TIMEFRAME, LIMIT],
    queryFn: createMarketQueryFn(
      `/tokens/list/top-gainers?limit=${LIMIT}&timeframe=${TIMEFRAME}`,
    ),
    staleTime: MARKET_DATA_STALE_MS,
    select: (data) => (Array.isArray(data?.topGainers) ? data.topGainers : []),
  });
  const losersQuery = useQuery({
    queryKey: ["tokens", "top-losers", TIMEFRAME, LIMIT],
    queryFn: createMarketQueryFn(
      `/tokens/list/top-losers?limit=${LIMIT}&timeframe=${TIMEFRAME}`,
    ),
    staleTime: MARKET_DATA_STALE_MS,
    select: (data) => (Array.isArray(data?.topLosers) ? data.topLosers : []),
  });
  const narrativesQuery = useQuery({
    queryKey: ["narratives", "compare", TIMEFRAME],
    queryFn: createMarketQueryFn(
      `/narratives/compare/all?timeframe=${TIMEFRAME}`,
    ),
    staleTime: MARKET_DATA_STALE_MS,
    select: (data) => (Array.isArray(data?.narratives) ? data.narratives : []),
  });

  const searchQueryResult = useQuery({
    queryKey: ["tokens", "search", debouncedSearch],
    queryFn: async () => {
      await ensureAuthenticated();
      try {
        const response = await apiCall(
          `/tokens/search?q=${encodeURIComponent(debouncedSearch)}&limit=10`,
        );
        return Array.isArray(response?.tokens) ? response.tokens : [];
      } catch (err) {
        if (err?.status === 401) logout();
        throw err;
      }
    },
    enabled: debouncedSearch.length > 0,
    staleTime: SEARCH_STALE_MS,
  });

  const trending = trendingQuery.data ?? [];
  const topGainers = gainersQuery.data ?? [];
  const topLosers = losersQuery.data ?? [];
  const narratives = narrativesQuery.data ?? [];
  const searchResults = debouncedSearch ? (searchQueryResult.data ?? []) : [];

  if (tokenSymbol) {
    return <TokenDetailPage />;
  }
  if (narrativeId) {
    return <NarrativeDetailPage />;
  }

  const formatPrice = (val) =>
    val != null
      ? `$${Number(val).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}`
      : "—";
  const formatPercent = (val) =>
    val != null
      ? `${Number(val) >= 0 ? "+" : ""}${Number(val).toFixed(2)}%`
      : "—";
  const formatCompact = (val) => {
    if (val == null) return "—";
    const n = Number(val);
    if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
    if (n >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
    if (n >= 1e3) return `$${(n / 1e3).toFixed(2)}K`;
    return formatPrice(n);
  };

  const TokenRow = ({
    item,
    showChange = false,
    changePositive,
    onTokenClick,
  }) => {
    const token = item?.token ?? item;
    const price = item?.price ?? item;
    const symbol = token?.symbol ?? item?.symbol;
    const name = token?.name ?? item?.name ?? symbol;
    const usd = price?.usd ?? item?.usd ?? item?.price;
    const change24h = price?.change24h ?? item?.change24h ?? item?.change;
    const marketCap = price?.marketCap ?? item?.marketCap;
    const logo = token?.logo ?? item?.logo;

    const handleClick = () => {
      if (symbol && onTokenClick) onTokenClick(symbol);
    };

    return (
      <div
        role={onTokenClick ? "button" : undefined}
        tabIndex={onTokenClick ? 0 : undefined}
        onClick={onTokenClick ? handleClick : undefined}
        onKeyDown={
          onTokenClick
            ? (e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  handleClick();
                }
              }
            : undefined
        }
        className={`flex items-center justify-between py-3 px-4 rounded-lg transition-colors ${
          onTokenClick
            ? "cursor-pointer hover:bg-black/10 active:bg-black/15"
            : "hover:bg-black/5"
        }`}
      >
        <div className="flex items-center gap-3 min-w-0">
          {logo && (
            <img
              src={logo}
              alt=""
              className="w-8 h-8 rounded-full object-cover shrink-0"
            />
          )}
          <div className="min-w-0">
            <p className="font-semibold text-gray-900 truncate">{symbol}</p>
            <p className="text-xs text-gray-500 truncate">{name}</p>
          </div>
        </div>
        <div className="flex items-center gap-4 shrink-0">
          {marketCap != null && (
            <span className="text-sm text-gray-600 hidden sm:inline">
              {formatCompact(marketCap)}
            </span>
          )}
          <span className="text-sm font-medium text-gray-900 w-20 text-right">
            {formatPrice(usd)}
          </span>
          {showChange && change24h != null && (
            <span
              className={`text-sm font-medium w-16 text-right ${
                changePositive ? "text-green-600" : "text-red-600"
              }`}
            >
              {formatPercent(change24h)}
            </span>
          )}
        </div>
      </div>
    );
  };

  /** ~5-6 rows visible, rest scrollable (row ~52px) */
  const sectionListMaxHeight = "320px";

  const Section = ({
    title,
    icon: Icon,
    loading: isLoading,
    error,
    children,
    onRefresh,
    scrollable,
    color,
  }) => (
    <div className="glass-card p-6 transition-all duration-200 hover:bg-white/80 hover:shadow-lg hover:border hover:border-gray-200/50 flex flex-col min-h-0">
      <div className="flex items-center justify-between mb-4 shrink-0">
        <h3 className="text-lg font-bold flex items-center gap-2">
          {Icon && <Icon className={`w-5 h-5 ${color}`} />}
          {title}
        </h3>
        {onRefresh && (
          <button
            type="button"
            onClick={onRefresh}
            disabled={isLoading}
            className="text-xs text-gray-500 hover:text-gray-700 disabled:opacity-50"
          >
            Refresh
          </button>
        )}
      </div>
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
        </div>
      )}
      {!isLoading && error && (
        <p className="text-sm text-red-600 py-4">{error}</p>
      )}
      {!isLoading &&
        !error &&
        (scrollable ? (
          <div
            className="min-h-0 overflow-y-auto"
            style={{ maxHeight: sectionListMaxHeight }}
          >
            {children}
          </div>
        ) : (
          children
        ))}
    </div>
  );

  return (
    <div className="flex-1 px-6 py-8 portfolio-wrapper ms-auto w-full overflow-y-auto">
      <h2 className="text-3xl font-bold mb-2">Market Data</h2>
      <p className="text-gray-600 mb-6">
        Trending tokens, top gainers, losers, and narrative performance.
      </p>

      {/* Token search */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && searchResults.length > 0) {
              const first = searchResults[0];
              const sym = first?.token?.symbol ?? first?.symbol;
              if (sym) goToToken(sym);
            }
          }}
          placeholder="Search tokens..."
          className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 bg-white/80 focus:outline-none focus:ring-2 focus:ring-gray-300 focus:border-transparent"
        />
        {searchQueryResult.isFetching && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-gray-400" />
        )}
        {searchResults.length > 0 && (
          <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden z-10 max-h-80 overflow-y-auto">
            {searchResults.map((token, i) => (
              <TokenRow
                key={token?.symbol || i}
                item={token}
                showChange
                changePositive={true}
                onTokenClick={goToToken}
              />
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <Section
          title="Trending"
          icon={TrendingUp}
          loading={trendingQuery.isLoading}
          error={trendingQuery.error?.message}
          onRefresh={() => trendingQuery.refetch()}
          scrollable
        >
          {trending.length === 0 &&
            !trendingQuery.isLoading &&
            !trendingQuery.error && (
              <p className="text-sm text-gray-500 py-4">No trending data.</p>
            )}
          <div className="divide-y divide-gray-100">
            {trending.map((item, i) => (
              <TokenRow
                key={item?.token?.symbol || item?.symbol || i}
                item={item}
                showChange
                changePositive={true}
                onTokenClick={goToToken}
              />
            ))}
          </div>
        </Section>

        <Section
          title="Top Gainers (24h)"
          icon={TrendingUp}
          color="text-green-600"
          loading={gainersQuery.isLoading}
          error={gainersQuery.error?.message}
          onRefresh={() => gainersQuery.refetch()}
          scrollable
        >
          {topGainers.length === 0 &&
            !gainersQuery.isLoading &&
            !gainersQuery.error && (
              <p className="text-sm text-gray-500 py-4">No data.</p>
            )}
          <div className="divide-y divide-gray-100">
            {topGainers.map((item, i) => (
              <TokenRow
                key={item?.token?.symbol || item?.symbol || i}
                item={item}
                showChange
                changePositive={true}
                onTokenClick={goToToken}
              />
            ))}
          </div>
        </Section>

        <Section
          title="Top Losers (24h)"
          icon={TrendingDown}
          color="text-red-600"
          loading={losersQuery.isLoading}
          error={losersQuery.error?.message}
          onRefresh={() => losersQuery.refetch()}
          scrollable
        >
          {topLosers.length === 0 &&
            !losersQuery.isLoading &&
            !losersQuery.error && (
              <p className="text-sm text-gray-500 py-4">No data.</p>
            )}
          <div className="divide-y divide-gray-100">
            {topLosers.map((item, i) => (
              <TokenRow
                key={item?.token?.symbol || item?.symbol || i}
                item={item}
                showChange
                changePositive={false}
                onTokenClick={goToToken}
              />
            ))}
          </div>
        </Section>

        <Section
          title="Narrative Performance (24h)"
          icon={BarChart3}
          loading={narrativesQuery.isLoading}
          error={narrativesQuery.error?.message}
          onRefresh={() => narrativesQuery.refetch()}
          scrollable
        >
          {narratives.length === 0 &&
            !narrativesQuery.isLoading &&
            !narrativesQuery.error && (
              <p className="text-sm text-gray-500 py-4">No narrative data.</p>
            )}
          <div className="space-y-2">
            {narratives.map((n) => {
              const id = n?.id ?? n?.label ?? n?.name;
              const label = n?.label ?? n?.name ?? n?.id ?? "—";
              return (
                <div
                  key={id}
                  role="button"
                  tabIndex={0}
                  onClick={() => id && goToNarrative(id, label)}
                  onKeyDown={(e) => {
                    if (id && (e.key === "Enter" || e.key === " ")) {
                      e.preventDefault();
                      goToNarrative(id, label);
                    }
                  }}
                  className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-black/10 active:bg-black/15 cursor-pointer transition-colors"
                >
                  <div className="flex flex-col">
                    <span className="font-medium text-gray-900">{label}</span>
                    {n?.tokenCount != null && (
                      <span className="text-xs text-gray-500">
                        {n.tokenCount} tokens
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-4 shrink-0">
                    <span
                      className={
                        n?.averageChange >= 0
                          ? "text-green-600"
                          : "text-red-600"
                      }
                    >
                      {n?.averageChange != null
                        ? formatPercent(n.averageChange)
                        : "—"}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </Section>
      </div>

      {/* Completed actions from chat */}
      {/* <h3 className="text-xl font-bold mb-4">Recent Activity</h3>
      {completedActions.length > 0 ? (
        <div className="space-y-4">
          {completedActions.map((action) => (
            <div
              key={action.id}
              className="glass-card p-6 transition-all duration-200 hover:bg-white/80 hover:shadow-lg hover:border hover:border-gray-200/50"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <div
                      className={`px-3 py-1 rounded-full text-xs font-medium ${
                        action.status === "completed"
                          ? "bg-green-100 text-green-700"
                          : action.status === "pending"
                            ? "bg-orange-100 text-orange-700"
                            : "bg-red-100 text-red-700"
                      }`}
                    >
                      {action.status === "completed"
                        ? "✓ Completed"
                        : action.status === "pending"
                          ? "Pending"
                          : "Failed"}
                    </div>
                    <span className="text-xs text-gray-500">
                      {action.timestamp?.toLocaleTimeString?.() ?? ""}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold mb-1">{action.title}</h3>
                  <p className="text-sm text-gray-600">{action.description}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="glass-card p-8 text-center">
          <p className="text-gray-600 mb-4">No completed actions yet.</p>
          <p className="text-sm text-gray-500">
            Use the Chat to initiate trades and they'll show up here.
          </p>
        </div>
      )} */}
    </div>
  );
}
