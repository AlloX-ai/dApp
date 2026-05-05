export const CHAIN_IDS = {
  BSC: 56,
  ETH: 1,
  BASE: 8453,
};

export const CHAINS = {
  BSC: {
    id: "BSC",
    chainId: CHAIN_IDS.BSC,
    label: "BNB Chain",
    shortLabel: "BSC",
    logo: "https://cdn.allox.ai/allox/networks/bnbIcon.svg",
    explorer: "https://bscscan.com/tx/",
    nativeSymbol: "BNB",
    defaultSourceToken: "USDT",
    sourceTokens: [
      {
        symbol: "BNB",
        address: null,
        decimals: 18,
        isNative: true,
        minGasBuffer: 0.0005,
        logo: "https://cdn.allox.ai/allox/networks/bnbIcon.svg",
      },
      {
        symbol: "USDT",
        address: "0x55d398326f99059fF775485246999027B3197955",
        decimals: 18,
        minGasBuffer: 0,
        logo: "https://cdn.allox.ai/allox/tokens/usdt.svg",
      },
      {
        symbol: "USDC",
        address: "0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d",
        decimals: 18,
        minGasBuffer: 0,
        logo: "https://cdn.allox.ai/allox/tokens/usdc.svg",
      },
    ],
  },
  ETH: {
    id: "ETH",
    chainId: CHAIN_IDS.ETH,
    label: "Ethereum",
    shortLabel: "ETH",
    logo: "https://cdn.allox.ai/allox/networks/eth.svg",
    explorer: "https://etherscan.io/tx/",
    nativeSymbol: "ETH",
    defaultSourceToken: "USDC",
    sourceTokens: [
      {
        symbol: "ETH",
        address: null,
        decimals: 18,
        isNative: true,
        minGasBuffer: 0.0015,
        logo: "https://cdn.allox.ai/allox/networks/eth.svg",
      },
      {
        symbol: "USDC",
        address: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
        decimals: 6,
        minGasBuffer: 0,
        logo: "https://cdn.allox.ai/allox/tokens/usdc.svg",
      },
      {
        symbol: "USDT",
        address: "0xdAC17F958D2ee523a2206206994597C13D831ec7",
        decimals: 6,
        minGasBuffer: 0,
        logo: "https://cdn.allox.ai/allox/tokens/usdt.svg",
      },
    ],
  },
  BASE: {
    id: "BASE",
    chainId: CHAIN_IDS.BASE,
    label: "Base",
    shortLabel: "Base",
    logo: "https://cdn.allox.ai/allox/networks/base.svg",
    explorer: "https://basescan.org/tx/",
    nativeSymbol: "ETH",
    defaultSourceToken: "USDC",
    sourceTokens: [
      {
        symbol: "ETH",
        address: null,
        decimals: 18,
        isNative: true,
        minGasBuffer: 0.0002,
        logo: "https://cdn.allox.ai/allox/networks/eth.svg",
      },
      {
        symbol: "USDC",
        address: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
        decimals: 6,
        minGasBuffer: 0,
        logo: "https://cdn.allox.ai/allox/tokens/usdc.svg",
      },
    ],
  },
};

export const CHAIN_LIST = [CHAINS.BSC, CHAINS.ETH, CHAINS.BASE];

export const NATIVE_SYMBOLS = new Set(["BNB", "ETH"]);

export function normalizeChain(chain) {
  const key = String(chain || "BSC").toUpperCase();
  if (key === "BASE") return "BASE";
  if (key === "ETH" || key === "ETHEREUM" || key === "MAINNET") return "ETH";
  return "BSC";
}

export function chainIdFor(chain) {
  return CHAINS[normalizeChain(chain)].chainId;
}

export function sourceTokensFor(chain) {
  return CHAINS[normalizeChain(chain)].sourceTokens;
}

export function explorerLink(chain, txHash) {
  return `${CHAINS[normalizeChain(chain)].explorer}${txHash}`;
}
