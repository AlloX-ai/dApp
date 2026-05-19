/** WalletConnect Explorer id for Binance Web3 Wallet (Metaverse integration). */
export const BINANCE_WC_EXPLORER_ID =
  "8a0ee50d1f22f6651afcae7eb4253e52a3310b90b0f0bad28ada4ebe5d7ae0b8";

export const BINANCE_INJECTED_CONNECTOR_ID = "wallet.binance.com";

/** Default chain for Binance flows (BNB Chain). */
export const BINANCE_DEFAULT_CHAIN_ID = 56;

/** Minimal wallet payload when explorer API is unavailable. */
export const BINANCE_WC_FALLBACK_WALLET = {
  id: BINANCE_WC_EXPLORER_ID,
  name: "Binance Web3 Wallet",
  image_id: BINANCE_WC_EXPLORER_ID,
  image_url: "https://cdn.allox.ai/allox/wallets/binanceWallet.svg",
};
