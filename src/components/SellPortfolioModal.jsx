import { useEffect } from "react";
import { AlertTriangle, Check, Loader2, X } from "lucide-react";
import { useSellPortfolio } from "../hooks/useSellPortfolio";

export function SellPortfolioModal({ isOpen, onClose, target, onComplete }) {
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
    onRequestClose: onClose,
  });

  useEffect(() => {
    if (isOpen && target?.portfolioId) {
      openSellTarget(target);
    }
  }, [isOpen, target, openSellTarget]);

  const handleClose = () => {
    closeSellModal();
    onClose?.();
  };

  if (!isOpen || !target) return null;

  const displayTarget = sellTarget || target;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 backdrop-blur-sm p-4"
      onClick={handleClose}
    >
      <div
        className="w-full max-w-2xl bg-white border border-gray-200 rounded-3xl p-6 md:p-7 max-h-[85vh] overflow-y-auto shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <h3 className="text-2xl font-bold">
              {displayTarget.type === "token" ? "Sell Token" : "Sell Portfolio"}
            </h3>
            <p className="text-sm text-gray-600">{displayTarget.title}</p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            disabled={isSellExecuting}
            className="h-8 w-8 rounded-full border border-gray-200 flex items-center justify-center text-gray-500 hover:text-black disabled:opacity-50"
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex flex-wrap items-end gap-3 mb-4 bg-gray-50 border border-gray-200 rounded-2xl p-3">
          <label className="text-sm text-gray-700">
            Slippage %
            <input
              type="number"
              min="0.1"
              step="0.1"
              value={sellSlippage}
              onChange={(event) => setSellSlippage(event.target.value)}
              disabled={isSellExecuting}
              className="mt-1 w-32 px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none"
            />
          </label>
          <button
            type="button"
            onClick={() => quoteSell(displayTarget)}
            disabled={isSellQuoteLoading || isSellExecuting}
            className="px-3 py-2 rounded-xl border border-gray-200 text-sm hover:bg-gray-50 disabled:opacity-60"
          >
            {isSellQuoteLoading ? "Refreshing quote..." : "Refresh quote"}
          </button>
        </div>

        {sellQuoteError ? (
          <div className="mb-4 text-sm text-red-600">{sellQuoteError}</div>
        ) : null}

        {sellQuote ? (
          <div className="space-y-4">
            <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4">
              <div className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">
                Quote summary
              </div>
              <div className="grid md:grid-cols-3 gap-3 text-sm">
                <div>
                  <span className="text-gray-500">Positions quoted:</span>{" "}
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
                  <span className="text-gray-500">
                    Est. {sellOutputToken} out:
                  </span>{" "}
                  <span className="font-semibold">
                    {sellEstimatedOutTotal.toFixed(4)}
                  </span>
                </div>
              </div>
            </div>

            {highPriceImpactOrders.length > 0 ? (
              <div className="text-xs text-amber-800 bg-amber-50 border border-amber-300 rounded-2xl p-3">
                {highPriceImpactOrders.length} route
                {highPriceImpactOrders.length > 1 ? "s" : ""} have high price
                impact (5%+). Review before confirming.
              </div>
            ) : null}

            {sellQuoteOrders.length > 0 ? (
              <div className="space-y-2">
                {sellQuoteOrders.map((order) => {
                  const priceImpact = Number(order.priceImpact || 0);
                  const isHighImpact = priceImpact >= 5;
                  const orderStatus = orderStatusMap[order.executionOrderId];
                  return (
                    <div
                      key={order.executionOrderId}
                      className={`border rounded-xl p-3 text-sm transition-colors ${
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
                        <div className="font-semibold flex items-center gap-2">
                          {order.symbol}
                          {isHighImpact && orderStatus !== "confirmed" ? (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-200 text-amber-900 uppercase tracking-wide">
                              High impact
                            </span>
                          ) : null}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-gray-700">
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
                              size={15}
                              className="animate-spin text-blue-500 shrink-0"
                            />
                          )}
                          {orderStatus === "confirmed" && (
                            <Check
                              size={15}
                              className="text-emerald-600 shrink-0"
                            />
                          )}
                          {orderStatus === "failed" && (
                            <AlertTriangle
                              size={15}
                              className="text-red-500 shrink-0"
                            />
                          )}
                        </div>
                      </div>
                      <div className="text-xs text-gray-500 mt-1 flex items-center gap-2 flex-wrap">
                        Provider: {order.swapProvider || "N/A"} | Price impact:{" "}
                        <span
                          className={
                            isHighImpact ? "font-semibold text-amber-800" : ""
                          }
                        >
                          {priceImpact.toFixed(2)}%
                        </span>
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
                Failed quotes:{" "}
                {sellFailedQuotes
                  .map((item) => `${item.symbol}: ${item.error}`)
                  .join(" | ")}
              </div>
            ) : null}
          </div>
        ) : (
          <div className="text-sm text-gray-600">
            {isSellQuoteLoading ? "Loading quote..." : "Quote not loaded yet."}
          </div>
        )}

        {sellRequiredSlippage != null ? (
          <div className="mt-4 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-xl p-3">
            Higher slippage is required by the API. Required:{" "}
            {sellRequiredSlippage}%.
          </div>
        ) : null}
        {sellExecutionError ? (
          <div className="mt-4 text-sm text-red-600">{sellExecutionError}</div>
        ) : null}
        {isSellExecuting && sellProgress.label ? (
          <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2">
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
          <div className="mt-4 bg-black text-green-300 rounded-xl p-3 text-xs space-y-1 max-h-36 overflow-y-auto">
            {sellExecutionLogs.map((line, idx) => (
              <div key={`${line}-${idx}`}>{line}</div>
            ))}
          </div>
        ) : null}

        {retryPrompt && (
          <div className="mt-4 bg-amber-50 border border-amber-300 rounded-xl p-4">
            <div className="text-sm text-amber-800 font-semibold mb-1 flex items-center gap-1">
              <AlertTriangle size={14} className="shrink-0" />
              {retryPrompt.symbol} failed (attempt {retryPrompt.attempt}/
              {retryPrompt.maxAttempts})
            </div>
            <p className="text-xs text-amber-700 mb-3">
              Would you like to retry this order?
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => handleRetryDecision(true)}
                className="px-3 py-1.5 text-xs rounded-xl bg-amber-600 text-white hover:bg-amber-700 font-semibold"
              >
                Retry
              </button>
              <button
                type="button"
                onClick={() => handleRetryDecision(false)}
                className="px-3 py-1.5 text-xs rounded-xl border border-gray-200 hover:bg-gray-50"
              >
                Skip
              </button>
            </div>
          </div>
        )}

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={handleClose}
            disabled={isSellExecuting}
            className="px-4 py-2 rounded-xl border border-gray-200 text-sm hover:bg-gray-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={confirmSell}
            disabled={
              isSellExecuting ||
              isSellQuoteLoading ||
              sellQuoteOrders.length === 0
            }
            className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 disabled:opacity-60"
          >
            {isSellExecuting ? "Executing sell..." : "Confirm Sell"}
          </button>
        </div>
      </div>
    </div>
  );
}
