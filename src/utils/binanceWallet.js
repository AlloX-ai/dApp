import {
  BINANCE_DEFAULT_CHAIN_ID,
  BINANCE_INJECTED_CONNECTOR_ID,
} from "../constants/binanceWallet";
import {
  getPersistedWalletProvider,
  getPersistedWalletType,
  hasBinanceWalletSession,
} from "./walletPersistence";

/** DApp is running inside the Binance App in-app browser. */
export function isBinanceInAppBrowser() {
  return (
    typeof window !== "undefined" &&
    typeof window.binancew3w?.ethereum !== "undefined"
  );
}

export function getBinanceInjectedConnector(connectors) {
  return (
    connectors?.find((c) => c.id === BINANCE_INJECTED_CONNECTOR_ID) ?? null
  );
}

/** Restore in-memory WC handoff marker after reload (localStorage survives). */
export function restoreBinanceSessionMarkerFromPersistence() {
  if (typeof window === "undefined") return;
  if (
    hasBinanceWalletSession() ||
    getPersistedWalletProvider() === "binance_wallet" ||
    getPersistedWalletType() === "binance"
  ) {
    window.WALLET_TYPE = "binance";
  }
}

export function isWalletConnectConnector(connector) {
  if (!connector) return false;
  const idLower = String(connector.id ?? "").toLowerCase();
  return idLower === "walletconnect";
}

function isDefinitelyNonBinanceConnector(connector) {
  if (!connector) return false;
  const idLower = String(connector.id ?? "").toLowerCase();
  const nameLower = String(connector.name ?? "").toLowerCase();
  return (
    idLower.includes("metamask") ||
    idLower.includes("coinbase") ||
    nameLower.includes("metamask") ||
    nameLower.includes("coinbase")
  );
}

/** True when the wagmi connector is Binance Web3 / MPC (injected or named). */
export function isBinanceConnectorLike(connector) {
  if (!connector) return false;

  const id = String(connector.id ?? "");
  if (id === BINANCE_INJECTED_CONNECTOR_ID) return true;

  const idLower = id.toLowerCase();
  const typeLower = String(connector.type ?? "").toLowerCase();
  const nameLower = String(connector.name ?? "").toLowerCase();

  return (
    idLower.includes("binance") ||
    typeLower.includes("binance") ||
    nameLower.includes("binance")
  );
}

/**
 * WalletConnect session opened for Binance Web3 Wallet.
 * `window.WALLET_TYPE` is lost on reload; persisted `alloxWalletType` survives.
 */
export function isWalletConnectBinanceSession(connector) {
  if (!connector || !isWalletConnectConnector(connector)) return false;

  const persistedBinance = getPersistedWalletType() === "binance";
  const windowBinance =
    typeof window !== "undefined" && window.WALLET_TYPE === "binance";

  return persistedBinance || windowBinance;
}

/**
 * True when the active wagmi connector is Binance.
 * Connector id/name is checked first; WC also uses persisted session marker.
 */
export function isBinanceConnectorActive(connector) {
  if (isBinanceConnectorLike(connector)) return true;
  if (isWalletConnectBinanceSession(connector)) return true;
  return false;
}

/**
 * True when the active session is Binance Web3 / MPC.
 * Uses connector + persisted session marker (not API walletType, which is often "evm").
 */
export function isBinanceWalletConnection({
  connector,
  walletType,
  sessionSource,
  isWalletConnected = false,
} = {}) {
  if (walletType === "solana" || walletType === "phantom") return false;
  if (walletType === "privy" || sessionSource === "privy") return false;

  if (hasBinanceWalletSession()) return true;
  if (getPersistedWalletProvider() === "binance_wallet") return true;

  const persistedBinance = getPersistedWalletType() === "binance";

  if (isBinanceConnectorActive(connector)) return true;

  // Binance in-app browser (mobile Chrome / WebView) — persisted tag survives reload.
  if (persistedBinance && isBinanceInAppBrowser()) return true;

  // WalletConnect Binance handoff — connector is generic "walletConnect" after reload.
  if (persistedBinance && isWalletConnectConnector(connector)) return true;

  // In-app browser reconnecting before wagmi restores the injected connector.
  if (
    persistedBinance &&
    isWalletConnected &&
    !connector &&
    isBinanceInAppBrowser()
  ) {
    return true;
  }

  // Redux may still be "binance" before /auth/me (we skip overwriting when persisted is binance).
  if (walletType === "binance" && !isDefinitelyNonBinanceConnector(connector)) {
    return true;
  }

  return false;
}

export { BINANCE_DEFAULT_CHAIN_ID };
