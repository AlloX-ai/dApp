import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft, Loader2, X } from "lucide-react";
import { motion } from "motion/react";
import { apiCall } from "../utils/api";
import getFormattedNumber from "../hooks/get-formatted-number";
import { SellPortfolioPanel } from "./SellPortfolioPanel";

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

const normalizePosition = (pos, idx) => {
  const symbol = pos?.symbol ?? pos?.name ?? `Asset ${idx + 1}`;
  const name = pos?.name && pos.name !== symbol ? pos.name : "";
  const tokenAmount = pos?.tokenAmount ?? pos?.token_amount ?? null;
  const entryPriceUsd = pos?.entryPriceUsd ?? pos?.entry_price_usd ?? null;
  const currentValueUsd =
    pos?.currentValueUsd ?? pos?.current_value_usd ?? null;
  const currentPriceUsd =
    pos?.currentPriceUsd ??
    pos?.current_price_usd ??
    (currentValueUsd != null && tokenAmount
      ? Number(currentValueUsd) / Number(tokenAmount)
      : entryPriceUsd);

  return {
    id: pos?.id || pos?.tokenId || `${symbol}-${idx}`,
    symbol: String(symbol),
    name,
    logo: pos?.logo || null,
    tokenAmount,
    entryPriceUsd,
    currentValueUsd,
    currentPriceUsd,
  };
};

export function PortfolioDetailModal({
  portfolio,
  onClose,
  onViewAnalytics,
  onSellComplete,
  getChainInfo,
  isOnChainExecutionMode,
  isPortfolioClosed,
  refreshKey = 0,
  initialSellMode = null,
}) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [positions, setPositions] = useState([]);
  const [totalValue, setTotalValue] = useState(0);
  const [view, setView] = useState("details");
  const [sellTarget, setSellTarget] = useState(null);
  const [dataRefreshKey, setDataRefreshKey] = useState(0);

  const portfolioTitle = portfolio?.name || "Portfolio";

  const buildSellTarget = useCallback(
    (type, symbol) => ({
      type,
      portfolioId: portfolio?.id,
      chain: portfolio?.chain,
      ...(symbol ? { symbol: String(symbol) } : {}),
      title:
        type === "token"
          ? `${symbol} in ${portfolioTitle}`
          : portfolioTitle,
    }),
    [portfolio?.id, portfolio?.chain, portfolioTitle],
  );

  const loadPortfolio = useCallback(async () => {
    if (!portfolio?.id) return;
    setLoading(true);
    setError("");
    try {
      const response = await apiCall(`/portfolio/${portfolio.id}`);
      const rawPositions = Array.isArray(response?.portfolio?.positions)
        ? response.portfolio.positions
        : [];
      const active = rawPositions
        .filter((pos) => !isPositionClosed(pos))
        .map(normalizePosition);

      setPositions(active);
      setTotalValue(
        Number(
          response?.portfolio?.totalCurrentValue ??
            portfolio.totalCurrentValue ??
            0,
        ),
      );
    } catch (err) {
      setError(err?.message || "Unable to load portfolio details.");
    } finally {
      setLoading(false);
    }
  }, [portfolio?.id, portfolio?.totalCurrentValue]);

  useEffect(() => {
    if (!portfolio?.id) return;
    setView("details");
    setSellTarget(null);
    loadPortfolio();
  }, [portfolio?.id, refreshKey, dataRefreshKey, loadPortfolio]);

  useEffect(() => {
    if (!portfolio?.id || !initialSellMode) return;
    if (initialSellMode === "portfolio") {
      setSellTarget(buildSellTarget("portfolio"));
      setView("sell");
      return;
    }
    if (initialSellMode?.type === "token" && initialSellMode.symbol) {
      setSellTarget(
        buildSellTarget("token", initialSellMode.symbol),
      );
      setView("sell");
    }
  }, [portfolio?.id, initialSellMode, buildSellTarget]);

  const chainInfo = useMemo(
    () => getChainInfo?.(portfolio?.chain) ?? null,
    [getChainInfo, portfolio?.chain],
  );

  const canSell =
    isOnChainExecutionMode?.(portfolio?.executionMode) &&
    !isPortfolioClosed?.(portfolio);

  const startSell = useCallback(
    (type, symbol) => {
      setSellTarget(buildSellTarget(type, symbol));
      setView("sell");
    },
    [buildSellTarget],
  );

  const handleSellBack = useCallback(() => {
    setView("details");
    setSellTarget(null);
  }, []);

  const handleSellComplete = useCallback(
    async (portfolioId) => {
      await onSellComplete?.(portfolioId);
      setView("details");
      setSellTarget(null);
      setDataRefreshKey((key) => key + 1);
    },
    [onSellComplete],
  );

  if (!portfolio) return null;

  const chainLabel = chainInfo?.label || portfolio?.chain || "—";
  const isSellView = view === "sell" && sellTarget;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.97, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.97, y: 8 }}
        transition={{ duration: 0.18 }}
        className="w-full max-w-lg bg-white border border-gray-200 rounded-3xl shadow-2xl overflow-hidden"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="px-6 pt-6 pb-4 border-b border-gray-100">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              {isSellView ? (
                <>
                  <button
                    type="button"
                    onClick={handleSellBack}
                    className="inline-flex items-center gap-1 text-xs font-medium text-gray-500 hover:text-gray-800 mb-2"
                  >
                    <ArrowLeft size={14} />
                    Back to portfolio
                  </button>
                  <h3 className="text-xl font-bold text-gray-900">
                    {sellTarget.type === "token"
                      ? `Sell ${sellTarget.symbol}`
                      : "Sell Portfolio"}
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">{portfolioTitle}</p>
                </>
              ) : (
                <>
                  <h3 className="text-2xl font-bold text-gray-900 truncate">
                    {portfolioTitle}
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">
                    {loading
                      ? "Loading..."
                      : `${positions.length} token${positions.length === 1 ? "" : "s"} · ${chainLabel}`}
                  </p>
                  {onViewAnalytics ? (
                    <button
                      type="button"
                      onClick={onViewAnalytics}
                      className="text-xs text-blue-600 hover:text-blue-700 font-medium mt-1"
                    >
                      View full analytics
                    </button>
                  ) : null}
                </>
              )}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="h-9 w-9 rounded-full border border-gray-200 flex items-center justify-center text-gray-500 hover:text-black shrink-0"
              aria-label="Close"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {isSellView ? (
          <div className="px-6 py-4 max-h-[65vh] overflow-y-auto">
            <SellPortfolioPanel
              key={`${sellTarget.portfolioId}-${sellTarget.symbol || "all"}`}
              target={sellTarget}
              onComplete={handleSellComplete}
              onRequestClose={handleSellBack}
              onBack={handleSellBack}
              compact
            />
          </div>
        ) : (
          <>
            <div className="px-6 py-4 max-h-[50vh] overflow-y-auto">
              {loading ? (
                <div className="flex items-center justify-center gap-2 py-12 text-sm text-gray-500">
                  <Loader2 size={18} className="animate-spin" />
                  Loading positions...
                </div>
              ) : error ? (
                <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                  {error}
                </div>
              ) : positions.length === 0 ? (
                <div className="text-sm text-gray-500 text-center py-10">
                  No active positions in this portfolio.
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {positions.map((pos) => {
                    const initials = pos.symbol.slice(0, 2).toUpperCase();
                    const amountLabel =
                      pos.tokenAmount != null
                        ? getFormattedNumber(pos.tokenAmount, 4)
                        : "—";
                    const priceLabel =
                      pos.currentPriceUsd != null
                        ? `$${getFormattedNumber(pos.currentPriceUsd, pos.currentPriceUsd >= 100 ? 0 : 2)}`
                        : "—";

                    return (
                      <div
                        key={pos.id}
                        className="flex items-center gap-3 py-4 first:pt-0 last:pb-0"
                      >
                        {pos.logo ? (
                          <img
                            src={pos.logo}
                            alt=""
                            className="h-11 w-11 rounded-full border border-gray-200 bg-white object-cover shrink-0"
                          />
                        ) : (
                          <div className="h-11 w-11 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center text-xs font-bold text-gray-500 shrink-0">
                            {initials}
                          </div>
                        )}

                        <div className="min-w-0 flex-1">
                          <div className="font-semibold text-gray-900 leading-tight">
                            {pos.symbol}
                          </div>
                          {pos.name ? (
                            <div className="text-xs text-gray-500 truncate">
                              {pos.name}
                            </div>
                          ) : null}
                        </div>

                        <div className="text-right shrink-0">
                          <div className="font-semibold text-gray-900 tabular-nums">
                            {pos.currentValueUsd != null
                              ? `$${Number(pos.currentValueUsd).toFixed(2)}`
                              : "—"}
                          </div>
                          <div className="text-xs text-gray-500 tabular-nums">
                            {amountLabel} @ {priceLabel}
                          </div>
                        </div>

                        {canSell ? (
                          <button
                            type="button"
                            onClick={() => startSell("token", pos.symbol)}
                            className="ml-1 px-2.5 py-1.5 text-xs font-semibold rounded-lg border border-red-200 text-red-600 hover:bg-red-50 shrink-0"
                          >
                            Sell
                          </button>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/60">
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm font-medium text-gray-600">
                  Total Value
                </span>
                <span className="text-lg font-bold text-gray-900 tabular-nums">
                  ${getFormattedNumber(totalValue, 2)}
                </span>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 px-4 py-3 rounded-xl border border-gray-200 bg-white text-sm font-semibold text-gray-800 hover:bg-gray-50"
                >
                  Close
                </button>
                {canSell && positions.length > 0 ? (
                  <button
                    type="button"
                    onClick={() => startSell("portfolio")}
                    className="flex-1 px-4 py-3 rounded-xl bg-red-500 text-white text-sm font-semibold hover:bg-red-600"
                  >
                    Sell Portfolio
                  </button>
                ) : null}
              </div>
            </div>
          </>
        )}
      </motion.div>
    </div>
  );
}
