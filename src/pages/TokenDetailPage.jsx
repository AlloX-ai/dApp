import { useCallback, useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { ArrowLeft, Eye, Info, Loader2, Plus, X } from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { apiCall } from "../utils/api";
import { useAuth } from "../hooks/useAuth";
import { watchlistApi } from "../utils/alertsApi";
import { toast } from "sonner";

const CHART_TIMEFRAMES = [
  { label: "24h", value: "24h", interval: "1h" },
  { label: "7D", value: "7d", interval: "1h" },
  { label: "30D", value: "30d", interval: "1d" },
];

export function TokenDetailPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const symbol = searchParams.get("token")?.trim()?.toUpperCase() || "";
  const { ensureAuthenticated, logout } = useAuth();

  const [tokenData, setTokenData] = useState(null);
  const [chartData, setChartData] = useState([]);
  const [chartTimeframe, setChartTimeframe] = useState(CHART_TIMEFRAMES[1]);
  const [loading, setLoading] = useState(true);
  const [chartLoading, setChartLoading] = useState(true);
  const [error, setError] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [watchlistThreshold, setWatchlistThreshold] = useState("");
  const [isWatchlistModalOpen, setIsWatchlistModalOpen] = useState(false);
  const [watchlistItems, setWatchlistItems] = useState([]);
  const [isWatchlistLoading, setIsWatchlistLoading] = useState(false);
  const [isWatchlistPreviewOpen, setIsWatchlistPreviewOpen] = useState(false);
  const [isDeletingWatchlistItem, setIsDeletingWatchlistItem] = useState(false);

  const isTokenInWatchlist = watchlistItems.some(
    (item) => String(item?.symbol || "").toUpperCase() === symbol,
  );
  const watchlistTokenItem =
    watchlistItems.find(
      (item) => String(item?.symbol || "").toUpperCase() === symbol,
    ) || null;

  const loadTokenDetails = useCallback(async () => {
    if (!symbol) {
      setError("No token specified");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    try {
      await ensureAuthenticated();
      const response = await apiCall(`/tokens/${encodeURIComponent(symbol)}`);
      setTokenData(response);
    } catch (err) {
      if (err?.status === 401) logout();
      setError(err?.message || "Failed to load token details");
      setTokenData(null);
    } finally {
      setLoading(false);
    }
  }, [symbol, ensureAuthenticated, logout]);

  const loadChartData = useCallback(async () => {
    if (!symbol) {
      setChartData([]);
      setChartLoading(false);
      return;
    }
    setChartLoading(true);
    try {
      await ensureAuthenticated();
      const response = await apiCall(
        `/tokens/${encodeURIComponent(symbol)}/chart?timeframe=${chartTimeframe.value}&interval=${chartTimeframe.interval}`,
      );
      const points = Array.isArray(response?.dataPoints)
        ? response.dataPoints
        : [];
      setChartData(points);
    } catch (err) {
      if (err?.status === 401) logout();
      setChartData([]);
    } finally {
      setChartLoading(false);
    }
  }, [symbol, chartTimeframe, ensureAuthenticated, logout]);

  useEffect(() => {
    window.scrollTo(0, 0);
    document.title = "Token Details";
  }, []);

  useEffect(() => {
    loadTokenDetails();
  }, [loadTokenDetails]);

  useEffect(() => {
    loadChartData();
  }, [loadChartData]);

  useEffect(() => {
    const loadWatchlist = async () => {
      if (!symbol) return;
      try {
        setIsWatchlistLoading(true);
        await ensureAuthenticated();
        const data = await watchlistApi.getWatchlist();
        setWatchlistItems(Array.isArray(data?.items) ? data.items : []);
      } catch (err) {
        if (err?.status === 401) logout();
        setWatchlistItems([]);
      } finally {
        setIsWatchlistLoading(false);
      }
    };
    loadWatchlist();
  }, [symbol, ensureAuthenticated, logout]);

  const handleBack = () => {
    navigate("/trending");
  };

  const handleAddToWatchlist = async () => {
    if (!symbol) return;
    try {
      setIsAdding(true);
      await ensureAuthenticated();
      await watchlistApi.addToken({
        symbol,
        alertThreshold: Number(watchlistThreshold),
      });
      toast.success(`${symbol} added to watchlist`);
      const data = await watchlistApi.getWatchlist();
      setWatchlistItems(Array.isArray(data?.items) ? data.items : []);
      return true;
    } catch (err) {
      if (err?.status === 401) logout();
      if (err?.status === 409) {
        const data = await watchlistApi.getWatchlist();
        setWatchlistItems(Array.isArray(data?.items) ? data.items : []);
      }
      toast.error(err?.message || "Unable to add token to watchlist.");
      return false;
    } finally {
      setIsAdding(false);
    }
  };

  const handleDeleteFromWatchlist = async () => {
    if (!symbol) return;
    try {
      setIsDeletingWatchlistItem(true);
      await ensureAuthenticated();
      await watchlistApi.removeToken(symbol);
      const data = await watchlistApi.getWatchlist();
      setWatchlistItems(Array.isArray(data?.items) ? data.items : []);
      setIsWatchlistPreviewOpen(false);
      toast.success(`${symbol} removed from watchlist`);
    } catch (err) {
      if (err?.status === 401) logout();
      toast.error(err?.message || "Unable to delete watchlist item.");
    } finally {
      setIsDeletingWatchlistItem(false);
    }
  };

  const formatPrice = (val) =>
    val != null
      ? `$${Number(val).toLocaleString(undefined, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 6,
        })}`
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
    return `$${n.toFixed(2)}`;
  };

  const token = tokenData?.token ?? tokenData;
  const price = tokenData?.price ?? {};
  const priceHistory = tokenData?.priceHistory ?? [];
  const chartPoints = chartData.length > 0 ? chartData : priceHistory;

  const displayChartData = chartPoints.map((p, i) => ({
    ...p,
    close: p?.close ?? p?.price ?? p?.value,
    time: p?.timestamp ?? p?.time ?? p?.date ?? i,
  }));

  const hasChartData =
    displayChartData.length > 0 &&
    displayChartData.some((p) => p?.close != null);

  if (!symbol) {
    return (
      <div className="flex-1 px-6 py-8 overflow-y-auto">
        <button
          type="button"
          onClick={handleBack}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Trending
        </button>
        <p className="text-gray-600">
          No token specified. Use the search or click a token.
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 px-6 py-8 portfolio-wrapper ms-auto w-full overflow-y-auto">
      <button
        type="button"
        onClick={handleBack}
        className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Trending
      </button>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-10 h-10 animate-spin text-gray-400" />
        </div>
      ) : error ? (
        <div className="glass-card p-6">
          <p className="text-red-600">{error}</p>
        </div>
      ) : (
        <>
          {/* Header: token name, symbol, logo */}
          <div className="glass-card p-6 mb-6">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-4 flex-wrap">
                {token?.logo && (
                  <img
                    src={token.logo}
                    alt=""
                    className="w-14 h-14 rounded-full object-cover"
                  />
                )}
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">{symbol}</h1>
                  <p className="text-gray-600 font-mono">
                    {token?.name ?? symbol}
                  </p>
                  {(token?.tags?.length > 0 ||
                    token?.narratives?.length > 0) && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {[...(token?.tags || []), ...(token?.narratives || [])]
                        .slice(0, 6)
                        .map((t, index) => (
                          <span
                            key={t + index}
                            className="px-2 py-0.5 rounded-full text-xs bg-gray-200 text-gray-700"
                          >
                            {t}
                          </span>
                        ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                {isTokenInWatchlist ? (
                  <button
                    type="button"
                    onClick={() => setIsWatchlistPreviewOpen(true)}
                    className="px-4 py-2.5 rounded-xl border border-black text-black text-sm font-semibold inline-flex items-center gap-2 hover:bg-black hover:text-white transition-colors"
                  >
                    <Eye size={16} />
                    View watchlist
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setIsWatchlistModalOpen(true)}
                    className="px-4 py-2.5 rounded-xl bg-black text-white text-sm font-semibold inline-flex items-center gap-2 hover:bg-gray-800"
                  >
                    <Plus size={16} />
                    Add to watchlist
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Price stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
            {price?.usd != null && (
              <div className="glass-card p-4">
                <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">
                  Price (USD)
                </p>
                <p className="text-xl font-bold text-gray-900">
                  {formatPrice(price.usd)}
                </p>
              </div>
            )}
            {price?.marketCap != null && (
              <div className="glass-card p-4">
                <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">
                  Market Cap
                </p>
                <p className="text-xl font-bold text-gray-900">
                  {formatCompact(price.marketCap)}
                </p>
              </div>
            )}
            {price?.volume24h != null && (
              <div className="glass-card p-4">
                <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">
                  Volume 24h
                </p>
                <p className="text-xl font-bold text-gray-900">
                  {formatCompact(price.volume24h)}
                </p>
              </div>
            )}
            {price?.change24h != null && (
              <div className="glass-card p-4">
                <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">
                  24h Change
                </p>
                <p
                  className={`text-xl font-bold ${
                    Number(price.change24h) >= 0
                      ? "text-green-600"
                      : "text-red-600"
                  }`}
                >
                  {formatPercent(price.change24h)}
                </p>
              </div>
            )}
          </div>

          {/* Historical chart */}
          <div className="glass-card p-6 mb-6">
            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
              <h2 className="text-lg font-bold">Price Chart</h2>
              <div className="flex gap-2">
                {CHART_TIMEFRAMES.map((tf) => (
                  <button
                    key={tf.value}
                    type="button"
                    onClick={() => setChartTimeframe(tf)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      chartTimeframe.value === tf.value
                        ? "bg-gray-900 text-white"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                  >
                    {tf.label}
                  </button>
                ))}
              </div>
            </div>
            {chartLoading ? (
              <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
              </div>
            ) : !hasChartData ? (
              <div className="h-64 flex items-center justify-center text-gray-500">
                No chart data available
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={320}>
                <AreaChart
                  data={displayChartData}
                  margin={{ top: 5, right: 10, left: 10, bottom: 5 }}
                >
                  <defs>
                    <linearGradient id="chartFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                  <XAxis
                    stroke="#9ca3af"
                    dataKey="time"
                    tick={{ fontSize: 12 }}
                    tickFormatter={(v) =>
                      typeof v === "number"
                        ? ""
                        : new Date(v).toLocaleDateString(undefined, {
                            month: "short",
                            day: "numeric",
                          })
                    }
                  />
                  <YAxis
                    stroke="#9ca3af"
                    domain={["auto", "auto"]}
                    tick={{ fontSize: 12 }}
                    tickFormatter={(v) =>
                      typeof v === "number" && v >= 1e6
                        ? `$${(v / 1e6).toFixed(1)}M`
                        : typeof v === "number" && v >= 1e3
                          ? `$${(v / 1e3).toFixed(1)}K`
                          : `$${v}`
                    }
                  />
                  <Tooltip
                    formatter={(value) => [formatPrice(value), "Price"]}
                    labelFormatter={(label) =>
                      typeof label === "number"
                        ? ""
                        : new Date(label).toLocaleString()
                    }
                  />
                  <Area
                    type="monotone"
                    dataKey="close"
                    stroke="#8b5cf6"
                    strokeWidth={2}
                    fill="url(#chartFill)"
                    dot={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Raw price history from token details API if present and different from chart */}
          {/* {Array.isArray(priceHistory) &&
            priceHistory.length > 0 &&
            priceHistory !== chartData && (
              <div className="glass-card p-6">
                <h2 className="text-lg font-bold mb-4">Price History</h2>
                <div className="overflow-x-auto max-h-64 overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-gray-500 border-b">
                        <th className="pb-2 pr-4">Time</th>
                        <th className="pb-2">Price</th>
                      </tr>
                    </thead>
                    <tbody>
                      {priceHistory.slice(0, 50).map((p, i) => (
                        <tr key={i} className="border-b border-gray-100">
                          <td className="py-2 pr-4 text-gray-600">
                            {p?.timestamp
                              ? new Date(p.timestamp).toLocaleString()
                              : p?.time ?? "—"}
                          </td>
                          <td className="py-2 font-medium">
                            {formatPrice(p?.close ?? p?.price ?? p?.value)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )} */}
        </>
      )}
      {isWatchlistModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
          onClick={() => setIsWatchlistModalOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-bold">Add to watchlist</h3>
              <button
                type="button"
                onClick={() => setIsWatchlistModalOpen(false)}
                className="rounded-full p-1 hover:bg-black/5"
                aria-label="Close modal"
              >
                <X size={18} />
              </button>
            </div>
            <div className="rounded-xl bg-gray-50 border border-gray-100 p-3 text-sm text-gray-600 mb-4 flex items-start gap-2">
              <Info size={16} className="mt-0.5 shrink-0 text-gray-500" />
              <p>
                Set your preferred alert threshold in percentage (eg 2%). You
                will get alerts when the token's 24h move crosses this level.
              </p>
            </div>
            <div className="space-y-2 mb-5">
              <label className="text-xs font-medium text-gray-600">
                Alert threshold (%)
              </label>
              <input
                type="number"
                placeholder="2%"
                min={1}
                max={50}
                value={watchlistThreshold}
                onChange={(e) => setWatchlistThreshold(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-200 focus:border-violet-400"
              />
            </div>
            <button
              type="button"
              onClick={async () => {
                const ok = await handleAddToWatchlist();
                if (ok) setIsWatchlistModalOpen(false);
              }}
              disabled={isAdding}
              className="w-full px-4 py-2.5 rounded-xl bg-black text-white text-sm font-semibold inline-flex items-center justify-center gap-2 hover:bg-gray-800 disabled:opacity-60"
            >
              <Plus size={16} />
              {isAdding ? "Adding..." : `Add ${symbol} to watchlist`}
            </button>
          </div>
        </div>
      )}
      {isWatchlistPreviewOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
          onClick={() => setIsWatchlistPreviewOpen(false)}
        >
          <div
            className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold">My Watchlist</h3>
              <button
                type="button"
                onClick={() => setIsWatchlistPreviewOpen(false)}
                className="rounded-full p-1 hover:bg-black/5"
                aria-label="Close watchlist preview"
              >
                <X size={18} />
              </button>
            </div>
            <div className="max-h-72 overflow-y-auto border border-gray-100 rounded-2xl mb-4">
              {isWatchlistLoading ? (
                <div className="py-8 flex items-center justify-center">
                  <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
                </div>
              ) : !watchlistTokenItem ? (
                <p className="text-sm text-gray-500 py-8 text-center">
                  This token is not in your watchlist.
                </p>
              ) : (
                <div className="px-4 py-4 flex items-start gap-3">
                  {watchlistTokenItem?.logo ? (
                    <img
                      src={watchlistTokenItem.logo}
                      alt=""
                      className="h-10 w-10 rounded-full object-cover"
                    />
                  ) : (
                    <div className="h-10 w-10 rounded-full bg-gray-200" />
                  )}
                  <div className="min-w-0 w-full">
                    <p className="font-semibold text-base truncate">
                      {watchlistTokenItem?.symbol}
                    </p>
                    <div className="grid grid-cols-2 gap-2 mt-2 text-sm text-gray-600">
                      <span>
                        Threshold:{" "}
                        {Number(watchlistTokenItem?.alertThreshold || 5)}%
                      </span>
                      <span>
                        Current Price: $
                        {Number(
                          watchlistTokenItem?.currentPriceUsd || 0,
                        ).toFixed(4)}
                      </span>
                      <span
                        className={`${Number(watchlistTokenItem?.priceChange24h || 0) >= 0 ? "text-green-600" : "text-red-600"}`}
                      >
                        24h:{" "}
                        {Number(watchlistTokenItem?.priceChange24h || 0) >= 0
                          ? "+"
                          : ""}
                        {Number(
                          watchlistTokenItem?.priceChange24h || 0,
                        ).toFixed(2)}
                        %
                      </span>
                      <span
                        className={`${watchlistTokenItem?.pnlSinceAdd >= 0 ? "text-green-600" : "text-red-600"}`}
                      >
                        PnL:{" "}
                        {Number(watchlistTokenItem?.pnlSinceAdd || 0) >= 0
                          ? "+"
                          : ""}{" "}
                        {Number(watchlistTokenItem?.pnlSinceAdd || 0).toFixed(
                          2,
                        )}
                        %
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsWatchlistPreviewOpen(false)}
                className="px-4 py-2 rounded-xl border border-gray-200 text-sm hover:bg-gray-50"
              >
                Close
              </button>
              <button
                type="button"
                onClick={handleDeleteFromWatchlist}
                disabled={!isTokenInWatchlist || isDeletingWatchlistItem}
                className="px-4 py-2 rounded-xl bg-red-600 text-white text-sm hover:bg-red-700 disabled:opacity-60"
              >
                {isDeletingWatchlistItem ? "Deleting..." : "Delete watchlist"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
