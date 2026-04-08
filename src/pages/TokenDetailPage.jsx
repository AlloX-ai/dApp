import { useCallback, useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { ArrowLeft, Loader2 } from "lucide-react";
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

  const loadTokenDetails = useCallback(async () => {
    if (!symbol) {
      setError("No token specified");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    try {
      // await ensureAuthenticated();
      const response = await apiCall(`/tokens/${encodeURIComponent(symbol)}`);
      setTokenData(response);
    } catch (err) {
      if (err?.status === 401) logout();
      setError(err?.message || "Failed to load token details");
      setTokenData(null);
    } finally {
      setLoading(false);
    }
  }, [symbol, logout]);

  const loadChartData = useCallback(async () => {
    if (!symbol) {
      setChartData([]);
      setChartLoading(false);
      return;
    }
    setChartLoading(true);
    try {
      // await ensureAuthenticated();
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
  }, [symbol, chartTimeframe, logout]);

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

  const handleBack = () => {
    navigate("/trending");
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
                {(token?.tags?.length > 0 || token?.narratives?.length > 0) && (
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
    </div>
  );
}
