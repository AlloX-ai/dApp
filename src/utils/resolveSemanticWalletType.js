import { getPersistedWalletType } from "./walletPersistence";

/**
 * Resolve Redux walletType from wagmi connector (Metaverse semantic type logic).
 */
export function resolveSemanticWalletType(connector, persistedType = null) {
  const persisted = persistedType ?? getPersistedWalletType();
  if (!connector) return persisted || "evm";

  const c = connector;
  if (c.id === "wallet.binance.com") {
    return "binance";
  }

  if (c.name === "WalletConnect") {
    if (typeof window !== "undefined" && window.WALLET_TYPE === "binance") {
      return "binance";
    }
    if (persisted === "binance") return "binance";
    if (persisted) return persisted;
    return "walletconnect";
  }

  const name = c.name?.toLowerCase?.() ?? "";
  if (name.includes("metamask")) return "metamask";
  if (name.includes("coinbase")) return "coinbase";
  if (name.includes("phantom")) return "solana";

  return persisted || c.type || "evm";
}
