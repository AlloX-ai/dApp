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

/** Binance Wallet campaign — daily check-in qualification (any 14 days in 30-day window). */
export const BINANCE_CAMPAIGN_REQUIRED_CHECKINS = 14;
export const BINANCE_CAMPAIGN_PERIOD_DAYS = 30;

export const BINANCE_CAMPAIGN_CHECKIN_NOTICE =
  "For the Binance Wallet campaign, complete 14 daily check-ins within the 30-day campaign period to qualify for rewards.";

export const BINANCE_CAMPAIGN_CHECKIN_NOTICE_DETAIL =
  "The 14 check-ins do not need to be consecutive.";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function toUtcDateKey(value) {
  if (value == null || value === "") return null;
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value.trim())) {
    return value.trim();
  }
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString().slice(0, 10);
}

function addUtcDays(dateKey, days) {
  const date = new Date(`${dateKey}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) return null;
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function resolveCampaignWindow({
  campaignStartAt,
  campaignEndAt,
  periodDays = BINANCE_CAMPAIGN_PERIOD_DAYS,
} = {}) {
  const endKey =
    toUtcDateKey(campaignEndAt) ?? toUtcDateKey(new Date().toISOString());
  const startKey =
    toUtcDateKey(campaignStartAt) ??
    (endKey ? addUtcDays(endKey, -(periodDays - 1)) : null);
  if (!startKey || !endKey) {
    return { startKey: null, endKey: null };
  }
  return { startKey, endKey };
}

function normalizeCheckinHistoryEntries(history) {
  const items = Array.isArray(history)
    ? history
    : history?.checkIns ??
      history?.history ??
      history?.items ??
      history?.entries ??
      [];
  if (!Array.isArray(items)) return [];
  return items;
}

/**
 * Count unique daily check-ins within the campaign window.
 * Days do not need to be consecutive.
 */
export function countCampaignCheckinsInWindow(
  history,
  {
    campaignStartAt,
    campaignEndAt,
    periodDays = BINANCE_CAMPAIGN_PERIOD_DAYS,
  } = {},
) {
  const { startKey, endKey } = resolveCampaignWindow({
    campaignStartAt,
    campaignEndAt,
    periodDays,
  });
  if (!startKey || !endKey) return 0;

  const uniqueDays = new Set();
  for (const item of normalizeCheckinHistoryEntries(history)) {
    const dayKey =
      toUtcDateKey(item?.date) ??
      toUtcDateKey(item?.checkInDate) ??
      toUtcDateKey(item?.checkedInAt) ??
      toUtcDateKey(item?.timestamp) ??
      toUtcDateKey(item?.createdAt);
    if (!dayKey) continue;
    if (dayKey >= startKey && dayKey <= endKey) {
      uniqueDays.add(dayKey);
    }
  }
  return uniqueDays.size;
}

export function isBinanceCampaignCheckinQualified(
  completed,
  required = BINANCE_CAMPAIGN_REQUIRED_CHECKINS,
) {
  return Number(completed) >= Number(required);
}

/**
 * Normalize Binance campaign check-in progress from `/checkin/status` (or history fallback).
 */
export function parseBinanceCampaignCheckinProgress({
  checkinStatus,
  checkinHistory,
} = {}) {
  const campaign =
    checkinStatus?.binanceCampaign ??
    checkinStatus?.binanceWalletCampaign ??
    checkinStatus?.campaign ??
    null;

  const requiredCheckIns = Number(
    campaign?.requiredCheckIns ??
      campaign?.requiredDays ??
      checkinStatus?.binanceCampaignRequiredCheckIns ??
      BINANCE_CAMPAIGN_REQUIRED_CHECKINS,
  );

  const periodDays = Number(
    campaign?.periodDays ??
      campaign?.campaignPeriodDays ??
      checkinStatus?.binanceCampaignPeriodDays ??
      BINANCE_CAMPAIGN_PERIOD_DAYS,
  );

  const campaignStartAt =
    campaign?.campaignStartAt ??
    campaign?.startAt ??
    campaign?.startsAt ??
    checkinStatus?.binanceCampaignStartAt ??
    null;

  const campaignEndAt =
    campaign?.campaignEndAt ??
    campaign?.endAt ??
    campaign?.endsAt ??
    checkinStatus?.binanceCampaignEndAt ??
    null;

  const completedFromApi = Number(
    campaign?.checkInsCompleted ??
      campaign?.completedCheckIns ??
      campaign?.checkInsInPeriod ??
      campaign?.totalCheckIns ??
      checkinStatus?.binanceCampaignCheckInsCompleted,
  );

  const completed = Number.isFinite(completedFromApi)
    ? completedFromApi
    : countCampaignCheckinsInWindow(checkinHistory, {
        campaignStartAt,
        campaignEndAt,
        periodDays,
      });

  const qualified =
    campaign?.qualified === true ||
    campaign?.isQualified === true ||
    isBinanceCampaignCheckinQualified(completed, requiredCheckIns);

  const { startKey, endKey } = resolveCampaignWindow({
    campaignStartAt,
    campaignEndAt,
    periodDays,
  });

  let daysRemainingInPeriod = null;
  if (endKey) {
    const todayKey = toUtcDateKey(new Date().toISOString());
    const endMs = new Date(`${endKey}T00:00:00.000Z`).getTime();
    const todayMs = new Date(`${todayKey}T00:00:00.000Z`).getTime();
    daysRemainingInPeriod = Math.max(
      0,
      Math.floor((endMs - todayMs) / MS_PER_DAY) + 1,
    );
  }

  return {
    completed,
    requiredCheckIns,
    periodDays,
    qualified,
    campaignStartAt: startKey,
    campaignEndAt: endKey,
    daysRemainingInPeriod,
    checkInsRemaining: Math.max(0, requiredCheckIns - completed),
  };
}

export const BINANCE_BOOSTER_ADDR_STORAGE_KEY = "binance_booster_addr";
export const BINANCE_BOOSTER_ADDR_PARAM = "binanceBoosterVerAddr";
export const BINANCE_WALLET_ADDRESS_HELP_URL =
  "https://www.binance.com/en/support/faq/detail/ebfa9f504ec548968bf0c1ed591a3eaa";

/** Persist campaign keyless wallet from `?binanceBoosterVerAddr=` (any page load). */
export function persistBinanceBoosterAddrFromSearch(search) {
  const params = new URLSearchParams(search || "");
  const raw = params.get(BINANCE_BOOSTER_ADDR_PARAM)?.trim();
  if (!raw) return;
  try {
    localStorage.setItem(BINANCE_BOOSTER_ADDR_STORAGE_KEY, raw.toLowerCase());
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
