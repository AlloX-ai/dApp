import {
  BINANCE_DEFAULT_CHAIN_ID,
  BINANCE_INJECTED_CONNECTOR_ID,
} from "../constants/binanceWallet";
import { resolveWalletProvider } from "./resolveWalletProvider";

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

/** True when the active session is Binance Web3 / MPC (injected or WC handoff). */
export function isBinanceWalletConnection({ connector, walletType } = {}) {
  return (
    resolveWalletProvider({ connector, walletType }) === "binance_wallet"
  );
}

export { BINANCE_DEFAULT_CHAIN_ID };
