import { useCallback, useEffect, useMemo, useState } from "react";
import { Bell, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "../hooks/useAuth";
import { watchlistApi } from "../utils/alertsApi";

const POLL_MS = 60000;

export function WatchlistPage() {
  const { ensureAuthenticated, logout } = useAuth();
  const [watchlistItems, setWatchlistItems] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [symbolInput, setSymbolInput] = useState("");
  const [chainInput, setChainInput] = useState("");
  const [thresholdInput, setThresholdInput] = useState(5);
  const [errorMessage, setErrorMessage] = useState("");

  const loadWatchlist = useCallback(async () => {
    setLoading(true);
    setErrorMessage("");
    try {
      await ensureAuthenticated();
      const data = await watchlistApi.getWatchlist();
      const items = Array.isArray(data?.items) ? data.items : [];
      setWatchlistItems(items);
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

  const handleAdd = async () => {
    const symbol = symbolInput.trim().toUpperCase();
    if (!symbol) return;
    try {
      await ensureAuthenticated();
      await watchlistApi.addToken({
        symbol,
        chain: chainInput.trim() || undefined,
        alertThreshold: Number(thresholdInput),
      });
      setSymbolInput("");
      setChainInput("");
      setThresholdInput(5);
      await loadWatchlist();
      toast.success(`${symbol} added to watchlist`);
    } catch (error) {
      if (error?.status === 401) logout();
      toast.error(error?.message || "Unable to add token.");
    }
  };

  const handleRemove = async (symbol) => {
    try {
      await ensureAuthenticated();
      await watchlistApi.removeToken(symbol);
      setWatchlistItems((prev) => prev.filter((item) => item?.symbol !== symbol));
      toast.success(`${symbol} removed`);
    } catch (error) {
      if (error?.status === 401) logout();
      toast.error(error?.message || "Unable to remove token.");
    }
  };

  const handleThresholdChange = async (symbol, value) => {
    const next = Math.min(50, Math.max(1, Number(value || 1)));
    setWatchlistItems((prev) =>
      prev.map((item) =>
        item?.symbol === symbol ? { ...item, alertThreshold: next } : item,
      ),
    );
    try {
      await ensureAuthenticated();
      await watchlistApi.updateThreshold(symbol, next);
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

      <div className="glass-card p-4 mb-6">
        <div className="grid md:grid-cols-4 gap-3">
          <input
            value={symbolInput}
            onChange={(e) => setSymbolInput(e.target.value)}
            placeholder="Token symbol (e.g. ETH)"
            className="px-3 py-2 rounded-xl border border-gray-200"
          />
          <input
            value={chainInput}
            onChange={(e) => setChainInput(e.target.value)}
            placeholder="Chain (optional)"
            className="px-3 py-2 rounded-xl border border-gray-200"
          />
          <input
            type="number"
            min={1}
            max={50}
            value={thresholdInput}
            onChange={(e) => setThresholdInput(e.target.value)}
            className="px-3 py-2 rounded-xl border border-gray-200"
          />
          <button
            type="button"
            onClick={handleAdd}
            className="btn-primary inline-flex items-center justify-center gap-2"
          >
            <Plus size={16} />
            Add token
          </button>
        </div>
      </div>

      {loading && <div className="glass-card p-4 text-gray-600">Loading...</div>}
      {!loading && errorMessage && (
        <div className="glass-card p-4 text-red-600">{errorMessage}</div>
      )}

      {!loading && !errorMessage && (
        <div className="glass-card overflow-x-auto">
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
                const priceChange24h = Number(item?.priceChange24h || 0);
                const pnlSinceAdd = Number(item?.pnlSinceAdd || 0);
                return (
                  <tr key={`${symbol}-${item?.chain || ""}`} className="border-b border-gray-100">
                    <td className="p-3 font-semibold">{symbol}</td>
                    <td className="p-3">${Number(item?.currentPriceUsd || 0).toFixed(4)}</td>
                    <td
                      className={`p-3 ${priceChange24h >= 0 ? "text-green-600" : "text-red-600"}`}
                    >
                      {priceChange24h >= 0 ? "+" : ""}
                      {priceChange24h.toFixed(2)}%
                    </td>
                    <td className={`p-3 ${pnlSinceAdd >= 0 ? "text-green-600" : "text-red-600"}`}>
                      {pnlSinceAdd >= 0 ? "+" : ""}
                      {pnlSinceAdd.toFixed(2)}%
                    </td>
                    <td className="p-3">
                      <input
                        type="number"
                        min={1}
                        max={50}
                        value={item?.alertThreshold || 5}
                        onChange={(e) => handleThresholdChange(symbol, e.target.value)}
                        className="w-20 px-2 py-1 rounded-lg border border-gray-200"
                      />
                    </td>
                    <td className="p-3">
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
  );
}
