/** Redux `walletType` survives reloads (WalletConnect / Binance handoff, etc.). */
export const WALLET_TYPE_STORAGE_KEY = "alloxWalletType";

export function persistWalletType(walletType) {
  if (typeof window === "undefined") return;
  try {
    if (walletType) {
      localStorage.setItem(WALLET_TYPE_STORAGE_KEY, walletType);
    } else {
      localStorage.removeItem(WALLET_TYPE_STORAGE_KEY);
    }
  } catch {
    /* noop */
  }
}

export function getPersistedWalletType() {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(WALLET_TYPE_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function clearPersistedWalletType() {
  persistWalletType("");
}

import { resolveSemanticWalletType } from "./resolveSemanticWalletType";

/** @deprecated use resolveSemanticWalletType */
export function resolveWalletTypeFromConnection(connector, persistedType) {
  if (persistedType === "solana" || persistedType === "privy") {
    return persistedType;
  }
  return resolveSemanticWalletType(connector, persistedType);
}

export function isWalletConnectHandoffType(walletType) {
  return (
    walletType === "walletconnect" ||
    walletType === "binance" ||
    walletType === "okx" ||
    walletType === "trust" ||
    walletType === "gate"
  );
}
