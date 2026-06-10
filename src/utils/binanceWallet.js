import {
  BINANCE_DEFAULT_CHAIN_ID,
  BINANCE_INJECTED_CONNECTOR_ID,
} from "../constants/binanceWallet";

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

export { BINANCE_DEFAULT_CHAIN_ID };
