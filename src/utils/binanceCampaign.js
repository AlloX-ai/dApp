/**
 * Binance Campaign — simplified quick portfolio flow (BNB Chain only).
 *
 * POST /campaigns/binance/portfolio/generate
 *   Body: { totalInvestment: number, sourceToken?: "USDT"|"USDC"|"BNB" }
 *   Response: { chain, sourceToken, totalInvestment, perTokenAllocationUsd, picked[], quote }
 *   `quote` is a full /execution/quote response — passed through to on-chain execution.
 */

export const BINANCE_CAMPAIGN_CHAIN = "BSC";

export const BINANCE_CAMPAIGN_SOURCE = "binance_campaign";

export const BINANCE_CAMPAIGN_GENERATE_PATH =
  "/campaigns/binance/portfolio/generate";

export const BINANCE_CAMPAIGN_SOURCE_TOKENS = ["USDT", "USDC", "BNB"];

/** Reward tiers — min portfolio volume (USD) per Binance campaign lucky draw */
export const BINANCE_CAMPAIGN_AMOUNT_TIERS = [
  { amountUsd: 20, tier: 1 },
  { amountUsd: 100, tier: 2 },
  { amountUsd: 500, tier: 3 },
  { amountUsd: 1000, tier: 4 },
  { amountUsd: 5000, tier: 5 },
];

export const BINANCE_CAMPAIGN_MIN_AMOUNT_USD = 5;

/** Tokens eligible for Prime Picks / Binance campaign portfolios */
export const PRIME_PICKS_INCLUDED_TOKENS = [
  { symbol: "BNB", iconColor: "bg-yellow-400", logo: 'https://cdn.allox.ai/allox/tokens/bnbToken.png' },
  { symbol: "CAKE", iconColor: "bg-teal-400", logo: 'https://cdn.allox.ai/allox/tokens/cakeToken.png' },
  { symbol: "BTCB", iconColor: "bg-orange-400", logo: 'https://cdn.allox.ai/allox/tokens/bitcoinToken.svg' },
  { symbol: "ETH", iconColor: "bg-blue-500", logo: 'https://cdn.allox.ai/allox/tokens/ethToken.png' },
  { symbol: "LINK", iconColor: "bg-blue-700", logo: 'https://cdn.allox.ai/allox/tokens/linkToken.png' },
  { symbol: "UNI", iconColor: "bg-pink-400", logo: 'https://cdn.allox.ai/allox/tokens/uniToken.png' },
  { symbol: "ASTER", iconColor: "bg-purple-500", logo: 'https://cdn.allox.ai/allox/tokens/asterToken.png' },
];

export const PRIME_PICKS_PORTFOLIO_SIZE = 3;

export const BINANCE_RISK_OPTIONS = [
  {
    value: "CONSERVATIVE",
    title: "High Cap",
    subtitle: "Lower risk",
    base: "bg-green-50 border-green-200 text-green-800 hover:border-green-300",
    selected: "bg-green-100 border-green-400 ring-2 ring-green-300/60",
  },
  {
    value: "BALANCED",
    title: "Mid Cap",
    subtitle: "Medium risk",
    base: "bg-blue-50 border-blue-200 text-blue-800 hover:border-blue-300",
    selected: "bg-blue-100 border-blue-400 ring-2 ring-blue-300/60",
  },
  {
    value: "AGGRESSIVE",
    title: "Low Cap",
    subtitle: "Higher risk",
    base: "bg-orange-50 border-orange-200 text-orange-800 hover:border-orange-300",
    selected: "bg-orange-100 border-orange-400 ring-2 ring-orange-300/60",
  },
];

export function buildBinanceGeneratePayload({
  amountUsd,
  sourceToken = "USDT",
}) {
  return {
    totalInvestment: Number(amountUsd),
    sourceToken,
  };
}

export function formatBinancePercent(value) {
  if (value == null || value === "") return "—";
  const num = Number(value);
  if (Number.isFinite(num)) return `${num}%`;
  const str = String(value).trim();
  return str.endsWith("%") ? str : `${str}%`;
}

export function formatBinanceReceiveAmount(value) {
  if (value == null || value === "") return "—";
  const num = Number(value);
  if (!Number.isFinite(num)) return String(value);
  if (num === 0) return "0";
  if (num >= 1) {
    return `~${num.toLocaleString(undefined, { maximumFractionDigits: 4 })}`;
  }
  return `~${num.toLocaleString(undefined, { maximumSignificantDigits: 4 })}`;
}

export function parseBinanceGenerateResponse(response) {
  const data = response?.data ?? response ?? {};
  const picked = Array.isArray(data.picked) ? data.picked : [];
  const quote = data.quote ?? null;
  const perTokenAllocationUsd = data.perTokenAllocationUsd ?? null;
  const quotePositions = Array.isArray(quote?.positions) ? quote.positions : [];
  const quoteBySymbol = quotePositions.reduce((acc, pos) => {
    const sym = String(pos?.symbol || "").toUpperCase();
    if (sym) acc[sym] = pos;
    return acc;
  }, {});

  const basket = picked
    .map((p, idx) => {
      const symbol = String(p?.symbol || "").toUpperCase();
      if (!symbol) return null;
      const quotePos = quoteBySymbol[symbol];
      const swapQuote = quotePos?.quote ?? {};
      return {
        id: p?.contractAddress || `${symbol}-${idx}`,
        symbol,
        name: p?.name || null,
        logo: p?.logo || null,
        contractAddress: p?.contractAddress || null,
        marketCap: p?.marketCap ?? null,
        allocationUsd:
          quotePos?.allocationUsd ?? perTokenAllocationUsd ?? null,
        toTokenAmount: swapQuote.toTokenAmount ?? null,
        priceImpact: swapQuote.priceImpact ?? null,
        route: swapQuote.route ?? null,
        fee: swapQuote.fee ?? null,
        executionOrderId: quotePos?.executionOrderId ?? null,
        quoteError: quotePos?.error ?? null,
      };
    })
    .filter(Boolean);

  return {
    basket,
    quote,
    meta: {
      chain: data.chain || BINANCE_CAMPAIGN_CHAIN,
      sourceToken: data.sourceToken || "USDT",
      totalInvestment: data.totalInvestment ?? null,
      perTokenAllocationUsd,
    },
  };
}

export function buildBinanceExecutionFromGenerate({ meta, basket, quote }) {
  if (!meta || !quote) return null;
  return {
    chain: meta.chain,
    sourceToken: meta.sourceToken,
    positions: basket.map((p) => ({
      symbol: p.symbol,
      contractAddress: p.contractAddress,
      allocationUsd: p.allocationUsd ?? meta.perTokenAllocationUsd,
    })),
    portfolioData: {
      chain: meta.chain,
      sourceToken: meta.sourceToken,
      totalInvestment: meta.totalInvestment,
      source: BINANCE_CAMPAIGN_SOURCE,
    },
    quote,
  };
}

export const BINANCE_BOOSTER_ADDR_STORAGE_KEY = "binance_booster_addr";
export const BINANCE_BOOSTER_ADDR_PARAM = "binanceBoosterVerAddr";
export const BINANCE_WALLET_ADDRESS_HELP_URL =
  "https://www.binance.com/en/support/faq/detail/ebfa9f504ec548968bf0c1ed591a3eaa";

export function getBinanceBoosterAddrFromLocation(search = "", hash = "") {
  const searchParams = new URLSearchParams(search || "");
  const fromSearch = searchParams.get(BINANCE_BOOSTER_ADDR_PARAM)?.trim();
  if (fromSearch) return fromSearch.toLowerCase();

  const normalizedHash = String(hash || "").replace(/^#/, "");
  const hashQueryIndex = normalizedHash.indexOf("?");
  if (hashQueryIndex >= 0) {
    const hashQuery = normalizedHash.slice(hashQueryIndex + 1);
    const hashParams = new URLSearchParams(hashQuery);
    const fromHash = hashParams.get(BINANCE_BOOSTER_ADDR_PARAM)?.trim();
    if (fromHash) return fromHash.toLowerCase();
  }

  return null;
}

/** Persist campaign keyless wallet from URL (search or hash query). */
export function persistBinanceBoosterAddrFromLocation(search, hash) {
  const raw = getBinanceBoosterAddrFromLocation(search, hash);
  if (!raw) return;
  try {
    localStorage.setItem(BINANCE_BOOSTER_ADDR_STORAGE_KEY, raw);
  } catch {
    /* ignore */
  }
}

export function getStoredBinanceBoosterAddr() {
  try {
    return localStorage.getItem(BINANCE_BOOSTER_ADDR_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function isCampaignBinanceEndpoint(endpoint) {
  return (
    typeof endpoint === "string" && /^\/campaigns\/binance(?:\/|$)/.test(endpoint)
  );
}

/** Structured error from any `/campaigns/binance/*` error response. */
export function parseCampaignBinanceError(errOrData) {
  if (!errOrData) return null;

  const preset = errOrData?.campaignError;
  if (preset && typeof preset === "object") {
    return preset;
  }

  const data = errOrData?.data ?? errOrData;
  const error = data?.error;
  if (!error || typeof error !== "object" || (!error.message && !error.code)) {
    return null;
  }

  const retryAfterSeconds = Number(error.retryAfterSeconds);
  return {
    code: error.code ?? null,
    message: error.message ?? "Something went wrong. Please try again.",
    eta: error.eta ?? null,
    retryAfterSeconds: Number.isFinite(retryAfterSeconds)
      ? retryAfterSeconds
      : null,
    requestId: error.requestId ?? null,
    timestamp: error.timestamp ?? null,
  };
}

const CAMPAIGN_BINANCE_RETRY_MAX_ATTEMPTS = 20;

/**
 * Call a `/campaigns/binance/*` endpoint; show structured errors via `onCampaignError`
 * and auto-retry when `error.retryAfterSeconds` is present.
 */
export async function campaignBinanceApiCall(
  apiCallFn,
  endpoint,
  options = {},
  { onCampaignError } = {},
) {
  for (let attempt = 0; attempt < CAMPAIGN_BINANCE_RETRY_MAX_ATTEMPTS; attempt++) {
    try {
      const result = await apiCallFn(endpoint, options);
      onCampaignError?.(null, { isRetrying: false });
      return result;
    } catch (err) {
      const campaignError = parseCampaignBinanceError(err);
      if (!campaignError) throw err;

      const retrySec = campaignError.retryAfterSeconds;
      const canRetry =
        retrySec != null &&
        retrySec > 0 &&
        attempt < CAMPAIGN_BINANCE_RETRY_MAX_ATTEMPTS - 1;

      onCampaignError?.(campaignError, {
        isRetrying: canRetry,
        retryInSeconds: canRetry ? retrySec : null,
      });

      if (!canRetry) {
        throw {
          ...err,
          campaignError,
          message: campaignError.message,
        };
      }

      await new Promise((resolve) => setTimeout(resolve, retrySec * 1000));
    }
  }

  throw new Error("Campaign request failed after multiple retries.");
}

export function getBinanceMissingSelections(form) {
  const missing = [];
  const amount = form?.amountUsd != null ? Number(form.amountUsd) : null;
  if (amount == null || Number.isNaN(amount)) {
    missing.push("investment amount");
  } else if (amount < BINANCE_CAMPAIGN_MIN_AMOUNT_USD) {
    missing.push(
      `investment of at least $${BINANCE_CAMPAIGN_MIN_AMOUNT_USD}`,
    );
  }
  return missing;
}
