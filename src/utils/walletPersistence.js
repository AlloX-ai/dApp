import { resolveSemanticWalletType } from "./resolveSemanticWalletType";

/** Redux `walletType` survives reloads (WalletConnect / Binance handoff, etc.). */
export const WALLET_TYPE_STORAGE_KEY = "alloxWalletType";

/** Survives `/auth/verify` (API walletType is often generic "evm"). */
export const BINANCE_WALLET_SESSION_KEY = "alloxBinanceWalletSession";

/** Last verified walletProvider from POST /auth/verify. */
export const WALLET_PROVIDER_STORAGE_KEY = "alloxWalletProvider";

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

export function markBinanceWalletSession() {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(BINANCE_WALLET_SESSION_KEY, "1");
    persistWalletType("binance");
    window.WALLET_TYPE = "binance";
  } catch {
    /* noop */
  }
}

export function clearBinanceWalletSession() {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(BINANCE_WALLET_SESSION_KEY);
  } catch {
    /* noop */
  }
}

export function hasBinanceWalletSession() {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(BINANCE_WALLET_SESSION_KEY) === "1";
  } catch {
    return false;
  }
}

export function persistWalletProvider(walletProvider) {
  if (typeof window === "undefined" || !walletProvider) return;
  try {
    localStorage.setItem(WALLET_PROVIDER_STORAGE_KEY, walletProvider);
    if (walletProvider === "binance_wallet") {
      markBinanceWalletSession();
    }
  } catch {
    /* noop */
  }
}

export function getPersistedWalletProvider() {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(WALLET_PROVIDER_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function clearPersistedWalletProvider() {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(WALLET_PROVIDER_STORAGE_KEY);
  } catch {
    /* noop */
  }
}

/** Keep Binance session when wagmi reconnects after reload. */
export function resolveWalletTypeForPersistence(resolvedType) {
  if (hasBinanceWalletSession()) return "binance";
  return resolvedType;
}

export function clearPersistedWalletType() {
  persistWalletType("");
  clearBinanceWalletSession();
  clearPersistedWalletProvider();
}

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
