export function CampaignBinanceErrorBanner({ error, isRetrying = false }) {
  if (!error?.message) return null;

  return (
    <div
      className="rounded-xl border-2 border-amber-400 bg-amber-50 px-4 py-4 shadow-md"
      role="alert"
    >
      <p className="text-base font-bold text-amber-950">{error.message}</p>
      {error.eta && (
        <p className="mt-2 text-sm text-amber-900">
          Expected back: {error.eta}
        </p>
      )}
      {isRetrying && error.retryAfterSeconds != null && (
        <p className="mt-1.5 text-xs font-medium text-amber-800">
          Retrying automatically in {error.retryAfterSeconds} seconds…
        </p>
      )}
      {error.requestId && (
        <p className="mt-3 text-xs text-amber-800/70">
          Reference: {error.requestId}
        </p>
      )}
    </div>
  );
}
