export const BSC_CHAIN_ID = 56;
export const MIN_BNB_GAS_BUFFER = 0.0005;

export const WITHDRAW_TOKENS = [
  {
    symbol: "BNB",
    address: null,
    decimals: 18,
    logo: "https://cdn.allox.ai/allox/networks/bnbIcon.svg",
    minGasBuffer: MIN_BNB_GAS_BUFFER,
  },
  {
    symbol: "USDT",
    address: "0x55d398326f99059fF775485246999027B3197955",
    decimals: 18,
    logo: "https://cdn.allox.ai/allox/tokens/usdt.svg",
    minGasBuffer: 0,
  },
  {
    symbol: "USDC",
    address: "0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d",
    decimals: 18,
    logo: "https://cdn.allox.ai/allox/tokens/usdc.svg",
    minGasBuffer: 0,
  },
];
