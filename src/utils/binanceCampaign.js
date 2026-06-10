/**
 * Binance Campaign — simplified quick portfolio flow (BNB Chain only).
 *
 * Backend contract (prepare for integration):
 *
 * POST /campaigns/binance/portfolio/preview
 *   Body: { chain: "BSC", amountUsd: number, risk: "CONSERVATIVE"|"BALANCED"|"AGGRESSIVE", source: "binance_campaign" }
 *   Response: same shape as /chat/message when returning a portfolio preview:
 *     - message (string, optional)
 *     - portfolioPreview: { chain, executionMode, positions[], totalTokens? }
 *     - previewId | campaignPreviewId (optional, echoed on execute)
 *
 * POST /campaigns/binance/portfolio/execute
 *   Body: preview payload fields + previewId (if issued) + positions (optional echo)
 *   Response: same as /chat/message for START_EXECUTION or paper portfolio
 */

export const BINANCE_CAMPAIGN_CHAIN = "BSC";

export const BINANCE_CAMPAIGN_SOURCE = "binance_campaign";

export const BINANCE_CAMPAIGN_PREVIEW_PATH =
  "/campaigns/binance/portfolio/preview";

export const BINANCE_CAMPAIGN_EXECUTE_PATH =
  "/campaigns/binance/portfolio/execute";

/** Reward tiers — min portfolio volume (USD) per Binance campaign lucky draw */
export const BINANCE_CAMPAIGN_AMOUNT_TIERS = [
  { amountUsd: 20, tier: 1 },
  { amountUsd: 100, tier: 2 },
  { amountUsd: 500, tier: 3 },
  { amountUsd: 1000, tier: 4 },
  { amountUsd: 5000, tier: 5 },
];

export const BINANCE_CAMPAIGN_MIN_AMOUNT_USD = 25;

/** Tokens eligible for Prime Picks / Binance campaign portfolios */
export const PRIME_PICKS_INCLUDED_TOKENS = [
  { symbol: "BNB", iconColor: "bg-yellow-400", logo: 'https://cdn.allox.ai/allox/tokens/bnbToken.png' },
  { symbol: "CAKE", iconColor: "bg-teal-400", logo: 'https://cdn.allox.ai/allox/tokens/cakeToken.png' },
  { symbol: "BTCB", iconColor: "bg-orange-400", logo: 'https://cdn.allox.ai/allox/tokens/bitcoinToken.svg' },
  { symbol: "ETH", iconColor: "bg-blue-500", logo: 'https://cdn.allox.ai/allox/tokens/ethToken.png' },
  { symbol: "LINK", iconColor: "bg-blue-700", logo: 'https://cdn.allox.ai/allox/tokens/linkToken.png' },
  { symbol: "UNI", iconColor: "bg-pink-400", logo: 'https://cdn.allox.ai/allox/tokens/uniToken.png' },
  { symbol: "ASTR", iconColor: "bg-purple-500", logo: 'https://cdn.allox.ai/allox/tokens/asterToken.png' },
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

export function buildBinancePreviewPayload({ amountUsd, risk = "BALANCED" }) {
  return {
    chain: BINANCE_CAMPAIGN_CHAIN,
    amountUsd: Number(amountUsd),
    risk,
    source: BINANCE_CAMPAIGN_SOURCE,
  };
}

export function buildBinanceExecutePayload({
  amountUsd,
  risk = "BALANCED",
  previewId,
  positions,
}) {
  return {
    chain: BINANCE_CAMPAIGN_CHAIN,
    amountUsd: Number(amountUsd),
    risk,
    source: BINANCE_CAMPAIGN_SOURCE,
    ...(previewId ? { previewId } : {}),
    ...(Array.isArray(positions) && positions.length > 0
      ? {
          positions: positions.map((p) => ({
            symbol: p.symbol,
            contractAddress: p.contractAddress ?? null,
            allocationUsd: p.allocationUsd ?? null,
            quantity: p.quantity ?? null,
            price: p.price ?? null,
            category: p.category ?? null,
          })),
        }
      : {}),
  };
}

export function extractCampaignPreviewId(response) {
  if (!response || typeof response !== "object") return null;
  return (
    response.previewId ??
    response.campaignPreviewId ??
    response.data?.previewId ??
    response.data?.campaignPreviewId ??
    null
  );
}

function parseTokensFromMarkdown(markdownText) {
  if (typeof markdownText !== "string") return [];
  const lines = markdownText.split("\n");
  const tokensHeaderIdx = lines.findIndex((l) =>
    /^Tokens\s*\(\d+\):/i.test(String(l || "").trim()),
  );
  if (tokensHeaderIdx < 0) return [];

  const rows = [];
  for (let i = tokensHeaderIdx + 1; i < lines.length; i += 1) {
    const line = String(lines[i] || "").trim();
    if (!line) break;
    const match = line.match(
      /^([A-Z0-9]+)\s*\(([^)]+)\):\s*\$?([\d.,]+)\s*\/\s*([\d.,]+)\s*tokens?\s+at\s+\$?([\d.,]+)/i,
    );
    if (!match) break;
    const symbol = match[1].toUpperCase();
    rows.push({
      id: symbol,
      symbol,
      category: match[2],
      allocationUsd: Number(match[3].replace(/,/g, "")),
      quantity: Number(match[4].replace(/,/g, "")),
      price: Number(match[5].replace(/,/g, "")),
      logo: null,
      contractAddress: null,
    });
  }
  return rows;
}

/**
 * Parse portfolio preview / basket from campaign or chat API responses.
 */
export function parsePortfolioBasketFromResponse(
  response,
  { chain = BINANCE_CAMPAIGN_CHAIN } = {},
) {
  const preview =
    response?.portfolioPreview ||
    response?.data?.portfolioPreview ||
    response?.portfolio_preview ||
    response?.data?.portfolio_preview;

  if (preview && typeof preview === "object" && Array.isArray(preview.positions)) {
    const basket = preview.positions
      .map((p, idx) => {
        const symbol = String(p?.symbol || p?.name || "").toUpperCase();
        if (!symbol) return null;
        return {
          id: p?.tokenId || p?.contractAddress || `${symbol}-${idx}`,
          symbol,
          logo: p?.logo || null,
          category:
            p?.category || p?.narrative || p?.riskProfile || null,
          allocationUsd:
            p?.allocationUsd ?? p?.allocation_usd ?? p?.allocation ?? null,
          quantity:
            p?.tokenAmount ?? p?.token_amount ?? p?.quantity ?? null,
          price:
            p?.entryPriceUsd ?? p?.entry_price_usd ?? p?.priceUsd ?? null,
          contractAddress: p?.contractAddress || null,
        };
      })
      .filter(Boolean);

    return {
      previewId: extractCampaignPreviewId(response),
      previewMeta: {
        chain: preview.chain || chain,
        executionMode: preview.executionMode || "ON_CHAIN",
      },
      basket,
    };
  }

  const markdownText = response?.message || response?.content || "";
  const basket = parseTokensFromMarkdown(markdownText);
  if (basket.length > 0) {
    return {
      previewId: extractCampaignPreviewId(response),
      previewMeta: {
        chain,
        executionMode: "ON_CHAIN",
      },
      basket,
    };
  }

  return { previewId: extractCampaignPreviewId(response), previewMeta: null, basket: [] };
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
