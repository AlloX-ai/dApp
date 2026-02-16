import { useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Loader2 } from "lucide-react";
import { apiCall } from "../utils/api";
import { useAuth } from "../hooks/useAuth";

const TOKENS_LIMIT = 20;
const SORT_BY = "marketCap";
const NARRATIVE_TOKENS_STALE_MS = 2 * 60 * 1000;

export function NarrativeDetailPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const narrativeId = searchParams.get("narrative")?.trim() || "";
  const narrativeLabel = searchParams.get("label")?.trim() || "";
  const { ensureAuthenticated, logout } = useAuth();

  const tokensQuery = useQuery({
    queryKey: ["narratives", narrativeId, "tokens", TOKENS_LIMIT, SORT_BY],
    queryFn: async () => {
      await ensureAuthenticated();
      try {
        const response = await apiCall(
          `/narratives/${encodeURIComponent(narrativeId)}/tokens?limit=${TOKENS_LIMIT}&sortBy=${SORT_BY}`,
        );
        return Array.isArray(response?.tokens) ? response.tokens : [];
      } catch (err) {
        if (err?.status === 401) logout();
        throw err;
      }
    },
    enabled: !!narrativeId,
    staleTime: NARRATIVE_TOKENS_STALE_MS,
  });

  const tokens = tokensQuery.data ?? [];
  const loading = tokensQuery.isLoading;
  const error = tokensQuery.error?.message ?? "";

  const goToToken = useCallback(
    (symbol) => {
      if (!symbol) return;
      navigate(
        `/trending?token=${encodeURIComponent(String(symbol).toUpperCase())}`,
      );
    },
    [navigate],
  );

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

  const TokenRow = ({ item, onTokenClick }) => {
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
        role="button"
        tabIndex={0}
        onClick={handleClick}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            handleClick();
          }
        }}
        className="flex items-center justify-between py-3 px-4 rounded-lg transition-colors cursor-pointer hover:bg-black/10 active:bg-black/15"
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
          {change24h != null && (
            <span
              className={`text-sm font-medium w-16 text-right ${
                Number(change24h) >= 0 ? "text-green-600" : "text-red-600"
              }`}
            >
              {formatPercent(change24h)}
            </span>
          )}
        </div>
      </div>
    );
  };

  if (!narrativeId) {
    return (
      <div className="flex-1 px-6 py-8 overflow-y-auto">
        <button
          type="button"
          onClick={() => navigate("/trending")}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Trending
        </button>
        <p className="text-gray-600">
          No narrative specified. Click a narrative from the list.
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 px-6 py-8 portfolio-wrapper ms-auto w-full overflow-y-auto">
      <button
        type="button"
        onClick={() => navigate("/trending")}
        className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Trending
      </button>

      <h2 className="text-3xl font-bold mb-2">
        {narrativeLabel || narrativeId}
      </h2>
      <p className="text-gray-600 mb-6">
        Tokens in this narrative. Click a token for price chart and history.
      </p>

      <div className="glass-card p-6">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
          </div>
        ) : error ? (
          <p className="text-red-600 py-4">{error}</p>
        ) : tokens.length === 0 ? (
          <p className="text-gray-500 py-8 text-center">No tokens in this narrative.</p>
        ) : (
          <div className="divide-y divide-gray-100">
            {tokens.map((item, i) => (
              <TokenRow
                key={item?.token?.symbol ?? item?.symbol ?? i}
                item={item}
                onTokenClick={goToToken}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
