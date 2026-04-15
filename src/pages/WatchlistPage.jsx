import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Bell,
  HelpCircle,
  Loader2,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "../hooks/useAuth";
import { apiCall } from "../utils/api";
import { watchlistApi } from "../utils/alertsApi";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "../components/ui/tooltip";

const POLL_MS = 60000;
const SEARCH_DEBOUNCE_MS = 250;
const MIN_THRESHOLD = 1;
const MAX_THRESHOLD = 50;

const NARRATIVE_OPTIONS = [
  // { id: "diversified", label: "Diversified" },
  { id: "defi", label: "DeFi" },
  { id: "layer2", label: "Layer 2" },
  { id: "privacy", label: "Privacy" },
  { id: "infra", label: "Infrastructure" },
  { id: "social", label: "SocialFi" },
  { id: "payments", label: "Payments" },
  { id: "ai", label: "AI-Powered Crypto" },
  { id: "gaming", label: "Gaming" },
  { id: "depin", label: "DePIN" },
  { id: "memes", label: "Memecoins" },
];

export function WatchlistPage() {
  const { ensureAuthenticated, logout } = useAuth();
  const [watchlistItems, setWatchlistItems] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [selectedToken, setSelectedToken] = useState(null);
  const [selectedThreshold, setSelectedThreshold] = useState(5);
  const [activeNarrative, setActiveNarrative] = useState(null);
  const [highlightedNarrativeId, setHighlightedNarrativeId] = useState(null);
  const [narrativeTokens, setNarrativeTokens] = useState([]);
  const [narrativeLoading, setNarrativeLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [thresholdDrafts, setThresholdDrafts] = useState({});
  const searchSectionRef = useRef(null);

  const normalizeThreshold = (value, fallback = 5) => {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return fallback;
    return Math.min(MAX_THRESHOLD, Math.max(MIN_THRESHOLD, parsed));
  };

  const loadWatchlist = useCallback(async () => {
    setLoading(true);
    setErrorMessage("");
    try {
      await ensureAuthenticated();
      const data = await watchlistApi.getWatchlist();
      const items = Array.isArray(data?.items) ? data.items : [];
      setWatchlistItems(items);
      setThresholdDrafts(
        items.reduce((acc, item) => {
          const key = String(item?.symbol || "").toUpperCase();
          if (key) acc[key] = Number(item?.alertThreshold || 5);
          return acc;
        }, {}),
      );
    } catch (error) {
      if (error?.status === 401) logout();
      setErrorMessage(error?.message || "Unable to load watchlist.");
    } finally {
      setLoading(false);
    }
  }, [ensureAuthenticated, logout]);

  const loadAlerts = useCallback(async () => {
    try {
      await ensureAuthenticated();
      const data = await watchlistApi.getAlerts();
      const next = Array.isArray(data?.alerts) ? data.alerts : [];
      setAlerts(next);
      if (next.length > 0) {
        toast.info(`You have ${next.length} watchlist alert(s).`);
      }
    } catch (error) {
      if (error?.status === 401) logout();
    }
  }, [ensureAuthenticated, logout]);

  useEffect(() => {
    loadWatchlist();
    loadAlerts();
    const id = setInterval(() => {
      loadAlerts();
    }, POLL_MS);
    return () => clearInterval(id);
  }, [loadAlerts, loadWatchlist]);

  useEffect(() => {
    const id = setTimeout(
      () => setDebouncedQuery(query.trim()),
      SEARCH_DEBOUNCE_MS,
    );
    return () => clearTimeout(id);
  }, [query]);

  useEffect(() => {
    const runSearch = async () => {
      if (!debouncedQuery) {
        setSearchResults([]);
        setSearchLoading(false);
        return;
      }
      setSearchLoading(true);
      try {
        await ensureAuthenticated();
        const data = await apiCall(
          `/tokens/search?q=${encodeURIComponent(debouncedQuery)}&limit=25`,
        );
        setSearchResults(Array.isArray(data?.tokens) ? data.tokens : []);
      } catch (error) {
        if (error?.status === 401) logout();
        setSearchResults([]);
      } finally {
        setSearchLoading(false);
      }
    };
    runSearch();
  }, [debouncedQuery, ensureAuthenticated, logout]);

  useEffect(() => {
    const handleOutside = (event) => {
      if (!searchSectionRef.current) return;
      if (!searchSectionRef.current.contains(event.target)) {
        setSearchResults([]);
        setQuery("");
        setDebouncedQuery("");
      }
    };
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);

  useEffect(() => {
    window.scrollTo(0, 0);
    document.title = "Watchlist";
  }, []);

  const handleAdd = async (
    token = selectedToken,
    threshold = selectedThreshold,
  ) => {
    const symbol =
      token?.symbol?.toUpperCase?.() ||
      String(token || "")
        .trim()
        .toUpperCase();
    if (!symbol) return;
    try {
      await ensureAuthenticated();
      await watchlistApi.addToken({
        symbol,
        chain: token?.chain || token?.chainId || undefined,
        alertThreshold: normalizeThreshold(threshold, 5),
      });
      setSelectedToken(null);
      setSelectedThreshold(5);
      setHighlightedNarrativeId(null);
      setQuery("");
      setDebouncedQuery("");
      setSearchResults([]);
      await loadWatchlist();
      toast.success(`${symbol} added to watchlist`);
    } catch (error) {
      if (error?.status === 401) logout();
      toast.error(error?.message || "Unable to add token.");
    }
  };

  const handleOpenNarrative = async (narrative) => {
    setActiveNarrative(narrative);
    setNarrativeLoading(true);
    try {
      await ensureAuthenticated();
      const data = await apiCall(
        `/narratives/${encodeURIComponent(narrative.id)}/tokens?limit=50&sortBy=marketCap`,
      );
      setNarrativeTokens(Array.isArray(data?.tokens) ? data.tokens : []);
    } catch (error) {
      if (error?.status === 401) logout();
      setNarrativeTokens([]);
      toast.error(error?.message || "Unable to load narrative tokens.");
    } finally {
      setNarrativeLoading(false);
    }
  };

  const handleRemove = async (symbol) => {
    try {
      await ensureAuthenticated();
      await watchlistApi.removeToken(symbol);
      setWatchlistItems((prev) =>
        prev.filter((item) => item?.symbol !== symbol),
      );
      toast.success(`${symbol} removed`);
    } catch (error) {
      if (error?.status === 401) logout();
      toast.error(error?.message || "Unable to remove token.");
    }
  };

  const handleThresholdInputChange = (symbol, value) => {
    const key = String(symbol || "").toUpperCase();
    const parsed = Number(value);
    setThresholdDrafts((prev) => ({
      ...prev,
      [key]: Number.isFinite(parsed) ? parsed : value,
    }));
  };

  const handleThresholdUpdate = async (symbol) => {
    const key = String(symbol || "").toUpperCase();
    const next = normalizeThreshold(thresholdDrafts[key], 5);
    try {
      await ensureAuthenticated();
      await watchlistApi.updateThreshold(symbol, next);
      setWatchlistItems((prev) =>
        prev.map((item) =>
          String(item?.symbol || "").toUpperCase() === key
            ? { ...item, alertThreshold: next }
            : item,
        ),
      );
      toast.success(`${symbol} threshold updated to ${next}%`);
    } catch (error) {
      if (error?.status === 401) logout();
      toast.error(error?.message || "Unable to update threshold.");
      loadWatchlist();
    }
  };

  const alertCount = useMemo(() => alerts.length, [alerts]);

  return (
    <div className="flex-1 px-6 py-8 portfolio-wrapper ms-auto w-full overflow-y-auto">
      <div className="flex items-center justify-between gap-4 mb-6">
        <h2 className="text-3xl font-bold">Token Watchlist</h2>
        <div className="inline-flex items-center gap-2 px-3 py-2 rounded-full bg-white border border-gray-200">
          <Bell className="size-4 text-gray-700" />
          <span className="text-sm font-semibold">{alertCount} alert(s)</span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 items-start">
        <div className="glass-card p-5 relative z-20">
          <h3 className="text-lg font-bold mb-3">Token Explorer</h3>
          <div className="relative mb-4" ref={searchSectionRef}>
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search token (e.g. ETH, ENA, PEPE...)"
              className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-gray-200"
            />
            {searchLoading && (
              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 size-4 animate-spin text-gray-400" />
            )}
            {searchResults.length > 0 && (
              <div className="absolute left-0 right-0 top-full mt-2 bg-white border border-gray-200 rounded-xl shadow-lg max-h-72 overflow-y-auto z-40">
                {searchResults.map((item, idx) => {
                  const token = item?.token ?? item;
                  const symbol = token?.symbol ?? item?.symbol;
                  const name = token?.name ?? item?.name;
                  return (
                    <button
                      type="button"
                      key={`${symbol}-${idx}`}
                      onClick={() => {
                        setSelectedToken(token);
                        // setSelectedThreshold("");
                        setHighlightedNarrativeId(null);
                        setSearchResults([]);
                        setQuery("");
                        setDebouncedQuery("");
                      }}
                      className="w-full text-left px-4 py-3 hover:bg-black/5 border-b last:border-b-0 border-gray-100"
                    >
                      <span className="font-semibold flex items-center gap-2">
                        {" "}
                        <img
                          src={item.logo}
                          alt=""
                          className="h-7 w-7 shrink-0 rounded-full object-cover ring-2 ring-white"
                        />
                        {symbol}
                      </span>
                      <span className="text-gray-500 text-sm">
                        {" "}
                        {name ? `- ${name}` : ""}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="mb-4">
            <h4 className="text-sm font-semibold mb-2">Narratives</h4>
            <div className="grid lg:grid-cols-5 md:grid-cols-4 grid-cols-2 gap-3">
              {NARRATIVE_OPTIONS.map((narrative) => {
                const isActive = highlightedNarrativeId === narrative.id;
                return (
                  <button
                    key={narrative.id}
                    type="button"
                    onClick={() => handleOpenNarrative(narrative)}
                    className={`px-3 py-1.5 rounded-full border text-sm transition-colors ${
                      isActive
                        ? "border-black bg-black text-white hover:bg-gray-900"
                        : "border-gray-200 hover:bg-black/5"
                    }`}
                  >
                    {narrative.label}
                  </button>
                );
              })}
            </div>
          </div>

          {selectedToken && (
            <div className="rounded-2xl border border-violet-200/80 bg-linear-to-br from-violet-50 via-white to-indigo-50/90 p-4 sm:p-5 shadow-sm ring-1 ring-violet-100/60">
              <div className="mb-4 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-gray-700">
                <span className="shrink-0">Add to watchlist</span>
                <span className="inline-flex min-w-0 max-w-full flex-wrap items-center gap-2 rounded-lg bg-white/80 px-2.5 py-1.5 shadow-sm ring-1 ring-gray-200/80">
                  {selectedToken?.logo ? (
                    <img
                      src={selectedToken.logo}
                      alt=""
                      className="h-7 w-7 shrink-0 rounded-full object-cover ring-2 ring-white"
                    />
                  ) : (
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-violet-100 text-[10px] font-bold text-violet-700 ring-2 ring-white">
                      {String(selectedToken?.symbol || "?").slice(0, 2)}
                    </span>
                  )}
                  <span className="font-semibold text-gray-900">
                    {selectedToken?.symbol}
                  </span>
                  {selectedToken?.name && (
                    <span className="truncate text-xs font-normal text-gray-500 sm:max-w-48">
                      {selectedToken.name}
                    </span>
                  )}
                </span>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
                <label className="flex min-w-0 flex-1 flex-col gap-1.5 sm:max-w-44">
                  <span className="text-xs font-medium text-gray-600 inline-flex items-center gap-1.5">
                    Alert threshold (%)
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          type="button"
                          className="text-red-500 hover:text-red-600"
                          aria-label="Threshold help"
                        >
                          <HelpCircle size={13} />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent
                        side="top"
                        sideOffset={8}
                        hideArrow
                        className="max-w-[280px] rounded-xl bg-black text-white px-3 py-2 text-xs"
                      >
                        This threshold is the 24h % move needed to trigger an
                        alert for this token in your watchlist. Token watchlist
                        thresholds are positive only (range: 1% to 50%).
                      </TooltipContent>
                    </Tooltip>
                  </span>
                  <input
                    type="number"
                    placeholder="1% to 50%"
                    min={MIN_THRESHOLD}
                    max={MAX_THRESHOLD}
                    value={selectedThreshold}
                    onChange={(e) => setSelectedThreshold(e.target.value)}
                    className="w-full min-w-0 rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm shadow-inner focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-200"
                  />
                </label>
                <button
                  type="button"
                  onClick={() => handleAdd(selectedToken, selectedThreshold)}
                  className="inline-flex w-full shrink-0 items-center justify-center gap-2 rounded-xl bg-black px-5 py-2.5 text-sm font-semibold text-white shadow-md transition-colors hover:bg-gray-900 sm:w-auto"
                >
                  <Plus size={16} className="shrink-0" />
                  Add to watchlist
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="relative z-0">
          {loading && (
            <div className="glass-card p-4 text-gray-600">Loading...</div>
          )}
          {!loading && !errorMessage && (
            <div className="glass-card overflow-x-auto">
              <div className="px-4 py-3 border-b border-gray-200">
                <h3 className="font-bold">My Watchlist</h3>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 text-left">
                    <th className="p-3">Token</th>
                    <th className="p-3">Current Price</th>
                    <th className="p-3">24h Change</th>
                    <th className="p-3">PnL Since Add</th>
                    <th className="p-3">Alert Threshold %</th>
                    <th className="p-3">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {watchlistItems.map((item) => {
                    const symbol = item?.symbol || "-";
                    const symbolKey = String(symbol).toUpperCase();
                    const priceChange24h = Number(item?.priceChange24h || 0);
                    const pnlSinceAdd = Number(item?.pnlSinceAdd || 0);
                    const draftThreshold =
                      thresholdDrafts[symbolKey] ??
                      Number(item?.alertThreshold || 5);
                    const hasPendingThreshold =
                      Number(draftThreshold) !==
                      Number(item?.alertThreshold || 5);
                    return (
                      <tr
                        key={`${symbol}-${item?.chain || ""}`}
                        className="border-b border-gray-100"
                      >
                        <td className="p-3 font-semibold">
                          <div className="flex items-center gap-2 w-fit">
                            <img
                              src={item.logo}
                              className="rounded-full h-6 w-6"
                              alt=""
                            />{" "}
                            {symbol}
                          </div>
                        </td>
                        <td className="p-3">
                          ${Number(item?.currentPriceUsd || 0).toFixed(4)}
                        </td>
                        <td
                          className={`p-3 ${priceChange24h >= 0 ? "text-green-600" : "text-red-600"}`}
                        >
                          {priceChange24h >= 0 ? "+" : ""}
                          {priceChange24h.toFixed(2)}%
                        </td>
                        <td
                          className={`p-3 ${pnlSinceAdd >= 0 ? "text-green-600" : "text-red-600"}`}
                        >
                          {pnlSinceAdd >= 0 ? "+" : ""}
                          {pnlSinceAdd.toFixed(2)}%
                        </td>
                        <td className="p-3">
                          <input
                            type="number"
                            min={MIN_THRESHOLD}
                            max={MAX_THRESHOLD}
                            value={draftThreshold}
                            onChange={(e) =>
                              handleThresholdInputChange(symbol, e.target.value)
                            }
                            className="w-20 px-2 py-1 rounded-lg border border-gray-200"
                          />
                        </td>
                        <td className="p-3">
                          <button
                            type="button"
                            onClick={() => handleThresholdUpdate(symbol)}
                            disabled={!hasPendingThreshold}
                            className="inline-flex items-center gap-1 text-emerald-600 hover:text-blue-800 disabled:opacity-40 disabled:cursor-not-allowed mr-3"
                          >
                            Update
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemove(symbol)}
                            className="inline-flex items-center gap-1 text-red-600 hover:text-red-700"
                          >
                            <Trash2 size={14} />
                            Remove
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  {watchlistItems.length === 0 && (
                    <tr>
                      <td colSpan={6} className="p-6 text-center text-gray-500">
                        No tokens in watchlist yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {!loading && errorMessage && (
        <div className="glass-card p-4 text-red-600">{errorMessage}</div>
      )}

      {activeNarrative && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
          onClick={() => setActiveNarrative(null)}
        >
          <div
            className="bg-white rounded-3xl shadow-2xl w-full max-w-[720px] p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-bold">{activeNarrative.label}</h3>
              <button
                type="button"
                className="rounded-full p-1 hover:bg-black/5"
                onClick={() => setActiveNarrative(null)}
              >
                <X size={18} />
              </button>
            </div>
            {narrativeLoading ? (
              <div className="py-10 flex items-center justify-center">
                <Loader2 className="size-6 animate-spin text-gray-500" />
              </div>
            ) : (
              <div className="max-h-[420px] overflow-y-auto border border-gray-100 rounded-2xl">
                {narrativeTokens.map((item, idx) => {
                  const token = item?.token ?? item;
                  const symbol = token?.symbol ?? item?.symbol;
                  const name = token?.name ?? item?.name;
                  return (
                    <div
                      key={`${symbol}-${idx}`}
                      className="px-4 py-3 border-b border-gray-100 flex items-center justify-between gap-3"
                    >
                      <div className="flex gap-2 items-center">
                        <img
                          src={item.logo}
                          alt=""
                          className="w-6 h-6 rounded-full"
                        />
                        <div>
                          <div className="font-semibold">{symbol}</div>
                          <div className="text-sm text-gray-500">{name}</div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setSelectedToken(token);
                          setSelectedThreshold("");
                          setHighlightedNarrativeId(
                            activeNarrative?.id ?? null,
                          );
                          setActiveNarrative(null);
                        }}
                        className="px-3 py-2 rounded-xl bg-black text-white text-sm inline-flex items-center gap-2"
                      >
                        <Plus size={14} />
                        Add to watchlist
                      </button>
                    </div>
                  );
                })}
                {narrativeTokens.length === 0 && (
                  <p className="text-sm text-gray-500 py-8 text-center">
                    No tokens available for this narrative.
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
