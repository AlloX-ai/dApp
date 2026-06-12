import { apiCall } from "./api";

export const BUNDLE_CHAIN = "BSC";
export const BUNDLE_SOURCE = "prime_picks";
export const BUNDLE_MIN_AMOUNT_USD = 5;
export const BUNDLE_SOURCE_TOKENS = ["USDT", "USDC", "BNB"];

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
