import { BINANCE_INJECTED_CONNECTOR_ID } from "../constants/binanceWallet";
import { getPersistedWalletType } from "./walletPersistence";

/** Wagmi connector id → backend /auth/verify walletProvider tag */
export const WALLET_PROVIDER_BY_CONNECTOR_ID = {
  metaMaskSDK: "metamask",
  [BINANCE_INJECTED_CONNECTOR_ID]: "binance_wallet",
  walletConnect: "walletconnect",
  coinbaseWalletSDK: "coinbase",
};

/**
 * Map connected wallet to backend `walletProvider` for POST /auth/verify.
 */
export function resolveWalletProvider({
  connector,
  walletType,
  solanaAdapterName,
  persistedWalletType = getPersistedWalletType(),
} = {}) {
  if (walletType === "solana" || walletType === "phantom") {
    const adapterName = (solanaAdapterName || "").toLowerCase();
    if (adapterName.includes("phantom")) return "phantom";
    if (adapterName.includes("metamask")) return "metamask";
    return "phantom";
  }

  if (walletType === "binance" || persistedWalletType === "binance") {
    return "binance_wallet";
  }
  if (walletType === "metamask") return "metamask";
  if (walletType === "coinbase") return "coinbase";
  if (walletType === "walletconnect") return "walletconnect";

  const id = connector?.id;
  if (id && WALLET_PROVIDER_BY_CONNECTOR_ID[id]) {
    return WALLET_PROVIDER_BY_CONNECTOR_ID[id];
  }

  if (id === "walletConnect") {
    if (typeof window !== "undefined" && window.WALLET_TYPE === "binance") {
      return "binance_wallet";
    }
    if (persistedWalletType === "binance") return "binance_wallet";
    return "walletconnect";
  }

  const name = connector?.name?.toLowerCase?.() ?? "";
  if (name.includes("metamask")) return "metamask";
  if (name.includes("binance")) return "binance_wallet";
  if (name.includes("coinbase")) return "coinbase";
  if (name.includes("walletconnect")) return "walletconnect";
  if (name.includes("phantom")) return "phantom";
  if (name.includes("okx")) return "okx";
  if (name.includes("trust")) return "trust";
  if (name.includes("rabby")) return "rabby";

  return null;
}
