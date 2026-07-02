import { useEffect } from "react";
import { AlertTriangle, Check, Loader2 } from "lucide-react";
import { useSellPortfolio } from "../hooks/useSellPortfolio";

export function SellPortfolioPanel({
  target,
  tokenLogos: tokenLogosProp,
  onComplete,
  onRequestClose,
  onBack,
  compact = false,
}) {
  const {
    sellTarget,
    sellSlippage,
    setSellSlippage,
    isSellQuoteLoading,
    sellQuote,
    sellQuoteError,
    sellRequiredSlippage,
    isSellExecuting,
    sellExecutionError,
    sellExecutionLogs,
    sellProgress,
    orderStatusMap,
    retryPrompt,
    sellQuoteOrders,
    sellFailedQuotes,
    sellOutputToken,
    sellEstimatedOutTotal,
    highPriceImpactOrders,
    openSellTarget,
    quoteSell,
    confirmSell,
    closeSellModal,
    handleRetryDecision,
  } = useSellPortfolio({
    onComplete,
    onRequestClose,
  });

  useEffect(() => {
    if (target?.portfolioId) {
      openSellTarget(target);
    }
  }, [target, openSellTarget]);

  const displayTarget = sellTarget || target;
  if (!displayTarget) return null;

  const paddingClass = compact ? "space-y-3" : "space-y-4";
  const tokenLogoMap = {
    ...(displayTarget?.tokenLogos || {}),
    ...(tokenLogosProp || {}),
  };
  const getOrderLogo = (order) => {
    const symbol = String(order?.symbol || "").trim().toUpperCase();
    return order?.logo || tokenLogoMap[symbol] || null;
  };

  return (
    <div className={paddingClass}>
      <div className="flex flex-wrap items-end gap-3 bg-gray-50 border border-gray-200 rounded-2xl p-3">
        <label className="text-sm text-gray-700">
          Slippage %
          <input
            type="number"
            min="0.1"
            step="0.1"
            value={sellSlippage}
            onChange={(event) => setSellSlippage(event.target.value)}
            disabled={isSellExecuting}
            className="mt-1 w-28 px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none"
          />
        </label>
        <button
          type="button"
          onClick={() => quoteSell(displayTarget)}
          disabled={isSellQuoteLoading || isSellExecuting}
          className="px-3 py-2 rounded-xl border border-gray-200 text-sm hover:bg-gray-50 disabled:opacity-60"
        >
          {isSellQuoteLoading ? "Refreshing..." : "Refresh quote"}
        </button>
      </div>

      {sellQuoteError ? (
        <div className="text-sm text-red-600">{sellQuoteError}</div>
      ) : null}

      {sellQuote ? (
        <div className="space-y-3">
          <div className="bg-gray-50 border border-gray-200 rounded-2xl p-3 text-sm">
            <div className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">
              Quote summary
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <div>
                <span className="text-gray-500">Quoted:</span>{" "}
                <span className="font-semibold">
                  {sellQuote?.summary?.quoted ?? sellQuoteOrders.length}
                </span>
              </div>
              <div>
                <span className="text-gray-500">Failed:</span>{" "}
                <span className="font-semibold">
                  {sellQuote?.summary?.failed ?? sellFailedQuotes.length}
                </span>
              </div>
              <div>
                <span className="text-gray-500">Est. {sellOutputToken}:</span>{" "}
                <span className="font-semibold">
                  {sellEstimatedOutTotal.toFixed(4)}
                </span>
              </div>
            </div>
          </div>

          {highPriceImpactOrders.length > 0 ? (
            <div className="text-xs text-amber-800 bg-amber-50 border border-amber-300 rounded-xl p-3">
              {highPriceImpactOrders.length} route
              {highPriceImpactOrders.length > 1 ? "s" : ""} have high price
              impact (5%+).
            </div>
          ) : null}

          {sellQuoteOrders.length > 0 ? (
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {sellQuoteOrders.map((order) => {
                const priceImpact = Number(order.priceImpact || 0);
                const isHighImpact = priceImpact >= 5;
                const orderStatus = orderStatusMap[order.executionOrderId];
                const logo = getOrderLogo(order);
                return (
                  <div
                    key={order.executionOrderId}
                    className={`border rounded-xl p-3 text-sm ${
                      orderStatus === "confirmed"
                        ? "bg-emerald-50 border-emerald-300"
                        : orderStatus === "failed"
                          ? "bg-red-50 border-red-200"
                          : isHighImpact
                            ? "bg-amber-50 border-amber-300"
                            : "bg-white border-gray-200"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="font-semibold flex items-center gap-2 min-w-0">
                        {logo ? (
                          <img
                            src={logo}
                            alt=""
                            className="h-6 w-6 rounded-full border border-gray-200 bg-white object-cover shrink-0"
                            loading="lazy"
                          />
                        ) : (
                          <div className="h-6 w-6 rounded-full border border-gray-200 bg-gray-100 shrink-0" />
                        )}
                        <span className="truncate">{order.symbol}</span>
                        {isHighImpact && orderStatus !== "confirmed" ? (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-200 text-amber-900 uppercase">
                            High impact
                          </span>
                        ) : null}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-gray-700 text-xs">
                          ~
                          {Number(
                            order.estimatedToTokenOut ??
                              order.estimatedUsdtOut ??
                              0,
                          ).toFixed(4)}{" "}
                          {sellOutputToken}
                        </span>
                        {orderStatus === "executing" && (
                          <Loader2
                            size={14}
                            className="animate-spin text-blue-500"
                          />
                        )}
                        {orderStatus === "confirmed" && (
                          <Check size={14} className="text-emerald-600" />
                        )}
                        {orderStatus === "failed" && (
                          <AlertTriangle size={14} className="text-red-500" />
                        )}
                      </div>
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      Impact: {priceImpact.toFixed(2)}%
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-sm text-amber-700">
              No executable orders returned.
            </div>
          )}

          {sellFailedQuotes.length > 0 ? (
            <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-xl p-3">
              Failed:{" "}
              {sellFailedQuotes
                .map((item) => `${item.symbol}: ${item.error}`)
                .join(" | ")}
            </div>
          ) : null}
        </div>
      ) : (
        <div className="text-sm text-gray-600 py-4 text-center">
          {isSellQuoteLoading ? (
            <span className="inline-flex items-center gap-2">
              <Loader2 size={16} className="animate-spin" />
              Loading quote...
            </span>
          ) : (
            "Quote not loaded yet."
          )}
        </div>
      )}

      {sellRequiredSlippage != null ? (
        <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-xl p-3">
          Higher slippage required: {sellRequiredSlippage}%
        </div>
      ) : null}
      {sellExecutionError ? (
        <div className="text-sm text-red-600">{sellExecutionError}</div>
      ) : null}
      {isSellExecuting && sellProgress.label ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2">
          <div className="flex items-center gap-2 text-xs text-emerald-800 font-medium">
            <Loader2 size={13} className="animate-spin shrink-0" />
            <span>{sellProgress.label}</span>
          </div>
          {sellProgress.total > 0 ? (
            <div className="mt-2 h-1.5 rounded-full bg-emerald-100 overflow-hidden">
              <div
                className="h-full bg-emerald-500 transition-all"
                style={{
                  width: `${Math.max(
                    8,
                    Math.min(
                      100,
                      Math.round(
                        (sellProgress.current / sellProgress.total) * 100,
                      ),
                    ),
                  )}%`,
                }}
              />
            </div>
          ) : null}
        </div>
      ) : null}
      {sellExecutionLogs.length > 0 ? (
        <div className="bg-black text-green-300 rounded-xl p-3 text-xs space-y-1 max-h-28 overflow-y-auto">
          {sellExecutionLogs.map((line, idx) => (
            <div key={`${line}-${idx}`}>{line}</div>
          ))}
        </div>
      ) : null}

      {retryPrompt && (
        <div className="bg-amber-50 border border-amber-300 rounded-xl p-3">
          <div className="text-sm text-amber-800 font-semibold mb-1 flex items-center gap-1">
            <AlertTriangle size={14} />
            {retryPrompt.symbol} failed ({retryPrompt.attempt}/
            {retryPrompt.maxAttempts})
          </div>
          <div className="flex gap-2 mt-2">
            <button
              type="button"
              onClick={() => handleRetryDecision(true)}
              className="px-3 py-1.5 text-xs rounded-xl bg-amber-600 text-white font-semibold"
            >
              Retry
            </button>
            <button
              type="button"
              onClick={() => handleRetryDecision(false)}
              className="px-3 py-1.5 text-xs rounded-xl border border-gray-200"
            >
              Skip
            </button>
          </div>
        </div>
      )}

      <div className="flex gap-3 pt-1">
        <button
          type="button"
          onClick={() => {
            if (isSellExecuting) return;
            closeSellModal();
            onBack?.();
          }}
          disabled={isSellExecuting}
          className="flex-1 px-4 py-3 rounded-xl border border-gray-200 bg-white text-sm font-semibold text-gray-800 hover:bg-gray-50 disabled:opacity-50"
        >
          {onBack ? "Back" : "Cancel"}
        </button>
        <button
          type="button"
          onClick={confirmSell}
          disabled={
            isSellExecuting ||
            isSellQuoteLoading ||
            sellQuoteOrders.length === 0
          }
          className="flex-1 px-4 py-3 rounded-xl bg-red-500 text-white text-sm font-semibold hover:bg-red-600 disabled:opacity-60"
        >
          {isSellExecuting ? "Selling..." : "Confirm Sell"}
        </button>
      </div>
    </div>
  );
}
