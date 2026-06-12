import { apiCall } from "./api";

export const BUNDLE_CHAIN = "BSC";
export const BUNDLE_SOURCE = "prime_picks";
export const BUNDLE_MIN_AMOUNT_USD = 5;
export const BUNDLE_SOURCE_TOKENS = ["USDT", "USDC", "BNB"];
export const BUNDLE_DEFAULT_SLIPPAGE = 0.5;

const TOKEN_LOGO_FALLBACKS = {
  BTC: "https://cdn.allox.ai/allox/tokens/bitcoinToken.svg",
  BTCB: "https://cdn.allox.ai/allox/tokens/bitcoinToken.svg",
  ETH: "https://cdn.allox.ai/allox/tokens/ethToken.png",
  DOGE: "https://cdn.allox.ai/allox/tokens/doge.svg",
  XRP: "https://cdn.allox.ai/allox/tokens/xrpToken.png",
  ADA: "https://cdn.allox.ai/allox/tokens/adaToken.png",
  BNB: "https://cdn.allox.ai/allox/tokens/bnbToken.png",
  UNI: "https://cdn.allox.ai/allox/tokens/uniToken.png",
  CAKE: "https://cdn.allox.ai/allox/tokens/cakeToken.png",
};

const toNumber = (value) => {
  if (value == null || value === "") return null;
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
};

export const formatYtdPercent = (value) => {
  const num = toNumber(value);
  if (num == null) return null;
  const prefix = num > 0 ? "+" : "";
  return `${prefix}${num.toFixed(2)}%`;
};

const normalizeBundlePosition = (position, idx) => {
  if (!position) return null;

  const symbol = String(
    position.symbol ?? position.ticker ?? position.token ?? "",
  ).toUpperCase();
  if (!symbol) return null;

  const displaySymbol = String(
    position.displaySymbol ?? position.symbol ?? symbol,
  ).toUpperCase();
  const missing = position.missing === true;
  const hasPriceData = position.hasPriceData === true && !missing;

  return {
    symbol,
    displaySymbol,
    name: position.name ?? displaySymbol,
    weightPct:
      toNumber(
        position.weightPct ??
          position.percentage ??
          position.weight ??
          position.allocationPercent,
      ) ?? null,
    logo:
      position.logo ??
      position.logoUrl ??
      position.image ??
      position.icon ??
      TOKEN_LOGO_FALLBACKS[displaySymbol] ??
      TOKEN_LOGO_FALLBACKS[symbol] ??
      null,
    contractAddress: position.contractAddress ?? position.address ?? null,
    currentPriceUsd: toNumber(position.currentPriceUsd),
    ytdPercent: toNumber(position.ytdPercent),
    hasPriceData,
    missing,
    id: position.id ?? position.contractAddress ?? `${symbol}-${idx}`,
  };
};

export const normalizeBundle = (bundle, idx = 0) => {
  if (!bundle) return null;

  const rawPositions = Array.isArray(bundle.positions)
    ? bundle.positions
    : Array.isArray(bundle.tokens)
      ? bundle.tokens
      : Array.isArray(bundle.assets)
        ? bundle.assets
        : Array.isArray(bundle.holdings)
          ? bundle.holdings
          : [];

  const positions = rawPositions.map(normalizeBundlePosition).filter(Boolean);
  const ytdCoverage = bundle.ytdCoverage ?? null;

  return {
    id: bundle.id ?? bundle.bundleId ?? `bundle-${idx}`,
    name: bundle.name ?? bundle.title ?? `Bundle ${idx + 1}`,
    tagline: bundle.tagline ?? bundle.description ?? null,
    chain: bundle.chain ?? BUNDLE_CHAIN,
    positions,
    ytdPercent:
      toNumber(
        bundle.ytdPercent ??
          bundle.performanceYTD ??
          bundle.performanceYtd ??
          bundle.ytdPerformance ??
          bundle.performance?.ytd,
      ) ?? null,
    ytdCoverage:
      ytdCoverage &&
      typeof ytdCoverage === "object" &&
      ytdCoverage.withData != null &&
      ytdCoverage.total != null
        ? {
            withData: Number(ytdCoverage.withData) || 0,
            total: Number(ytdCoverage.total) || positions.length,
          }
        : null,
    generatedAt: bundle.generatedAt ?? null,
  };
};

export const normalizeBundlesResponse = (response) => {
  const data = response?.data ?? response ?? {};
  const rawBundles = Array.isArray(data.bundles)
    ? data.bundles
    : Array.isArray(data)
      ? data
      : [];
  return rawBundles.map(normalizeBundle).filter(Boolean);
};

export const fetchBundles = async () => {
  const response = await apiCall("/bundles");
  return normalizeBundlesResponse(response);
};

export const buildBundleQuotePayload = ({
  totalInvestment,
  sourceToken = "USDT",
}) => ({
  totalInvestment: Number(totalInvestment),
  sourceToken,
});

export const formatBundlePercent = (value) => {
  if (value == null || value === "") return "—";
  const num = Number(value);
  if (Number.isFinite(num)) return `${num}%`;
  const str = String(value).trim();
  return str.endsWith("%") ? str : `${str}%`;
};

export const formatBundleReceiveAmount = (value) => {
  if (value == null || value === "") return "—";
  const num = Number(value);
  if (!Number.isFinite(num)) return String(value);
  if (num === 0) return "0";
  if (num >= 1) {
    return `~${num.toLocaleString(undefined, { maximumFractionDigits: 4 })}`;
  }
  return `~${num.toLocaleString(undefined, { maximumSignificantDigits: 4 })}`;
};

export const mapBundleQuoteDetailsBySymbol = (quote) => {
  const bySymbol = {};

  for (const pos of Array.isArray(quote?.positions) ? quote.positions : []) {
    const sym = String(pos?.symbol || "").toUpperCase();
    if (!sym) continue;

    const swapQuote = pos?.quote ?? {};
    bySymbol[sym] = {
      symbol: sym,
      failed: false,
      allocationUsd: pos.allocationUsd ?? null,
      toTokenAmount: swapQuote.toTokenAmount ?? null,
      priceImpact: swapQuote.priceImpact ?? null,
      fee: swapQuote.fee ?? null,
      route: swapQuote.route ?? null,
      quoteError: pos?.error ?? null,
      reason: pos?.error ?? null,
      narrative: null,
    };
  }

  for (const failed of Array.isArray(quote?.failedTokens)
    ? quote.failedTokens
    : []) {
    const sym = String(failed?.symbol || "").toUpperCase();
    if (!sym) continue;

    const existing = bySymbol[sym];
    if (existing && !existing.quoteError && !existing.failed) continue;

    bySymbol[sym] = {
      symbol: sym,
      failed: true,
      allocationUsd: failed.allocationUsd ?? existing?.allocationUsd ?? null,
      toTokenAmount: null,
      priceImpact: null,
      fee: null,
      route: null,
      quoteError: failed.reason ?? "Quote failed",
      reason: failed.reason ?? null,
      narrative: failed.narrative ?? null,
    };
  }

  return bySymbol;
};

export const parseBundleQuoteSummary = (quote) => {
  const summary = quote?.summary ?? {};
  const failedTokens = Array.isArray(quote?.failedTokens)
    ? quote.failedTokens
    : [];
  const quotedPositions = Array.isArray(quote?.positions) ? quote.positions : [];
  const quotedSuccessfully =
    toNumber(summary.quotedSuccessfully) ?? quotedPositions.length;
  const failed = toNumber(summary.failed) ?? failedTokens.length;
  const totalPositions =
    toNumber(summary.totalPositions) ?? quotedSuccessfully + failed;

  return {
    totalPositions,
    quotedSuccessfully,
    failed,
    redistributed: summary.redistributed === true,
    failedTokens,
    hasFailures: failed > 0,
    allFailed: quotedSuccessfully === 0 && failed > 0,
    partialFailure: quotedSuccessfully > 0 && failed > 0,
  };
};

export const fetchBundleQuote = async (bundleId, payload) => {
  const response = await apiCall(`/bundles/${bundleId}/quote`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return parseBundleQuoteResponse(response);
};

export const parseBundleQuoteResponse = (response) => {
  const data = response?.data ?? response ?? {};
  const quote = data.quote ?? response?.quote ?? null;
  const quotePositions = Array.isArray(quote?.positions) ? quote.positions : [];

  return {
    quote,
    quoteDetailsBySymbol: mapBundleQuoteDetailsBySymbol(quote),
    quoteSummary: parseBundleQuoteSummary(quote),
    meta: {
      chain: data.chain ?? quote?.chain ?? BUNDLE_CHAIN,
      sourceToken: data.sourceToken ?? quote?.sourceToken ?? "USDT",
      totalInvestment:
        data.totalInvestment ?? quote?.totalInvestment ?? null,
      bundleId: data.bundleId ?? data.id ?? null,
    },
    positions: quotePositions
      .filter((pos) => !pos?.error)
      .map((pos) => ({
        symbol: String(pos.symbol || "").toUpperCase(),
        contractAddress: pos.contractAddress ?? null,
        allocationUsd: pos.allocationUsd ?? null,
        executionOrderId: pos.executionOrderId ?? null,
      }))
      .filter((pos) => pos.symbol),
  };
};

export const buildBundleExecutionFromQuote = ({
  bundleId,
  quote,
  meta,
}) => {
  if (!quote) return null;

  const chain = meta?.chain ?? quote?.chain ?? BUNDLE_CHAIN;
  const sourceToken = meta?.sourceToken ?? quote?.sourceToken ?? "USDT";
  const totalInvestment =
    meta?.totalInvestment ?? quote?.totalInvestment ?? null;
  const quotePositions = Array.isArray(quote.positions) ? quote.positions : [];

  const positions = quotePositions
    .filter((pos) => !pos?.error)
    .map((pos) => ({
      symbol: String(pos.symbol || "").toUpperCase(),
      contractAddress: pos.contractAddress ?? null,
      allocationUsd: pos.allocationUsd ?? null,
    }))
    .filter((pos) => pos.symbol);

  if (positions.length === 0) return null;

  return {
    chain,
    sourceToken,
    positions,
    portfolioData: {
      chain,
      sourceToken,
      totalInvestment,
      source: BUNDLE_SOURCE,
      bundleId: bundleId ?? meta?.bundleId ?? null,
    },
    quote,
  };
};
