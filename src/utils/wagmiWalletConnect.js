import { connect } from "@wagmi/core";
import { connectBinanceViaWalletConnect } from "./binanceWalletAppKit";
import { wagmiClient } from "../wagmiConnectors";
import { ensureReownAppKitConfigured } from "./initReownAppKit";
import { persistWalletType } from "./walletPersistence";

/** DApp browser wallets that connect via the WalletConnect v2 modal. */
export const WALLET_CONNECT_UI_TYPES = new Set(["walletconnect", "binance"]);

export function usesWalletConnectModal(option) {
  return (
    WALLET_CONNECT_UI_TYPES.has(option?.walletType) ||
    option?.name?.toLowerCase?.() === "walletconnect"
  );
}

export function getWalletConnectConnector() {
  return wagmiClient.connectors.find((c) => c.name === "WalletConnect") ?? null;
}

function tagSemanticWalletType(walletType) {
  if (typeof window !== "undefined") {
    window.WALLET_TYPE = walletType;
  }
  persistWalletType(walletType);
}

/**
 * WalletConnect / Binance (Metaverse: WalletModal owns Binance; App may call this too).
 */
export function connectViaWalletConnect(option, onWalletType) {
  const resolvedType =
    option.walletType === "walletconnect" ? "walletconnect" : option.walletType;

  if (option.walletType === "binance") {
    return connectBinanceViaWalletConnect({
      chainId: option.chainId,
      onWalletType: (type) => {
        tagSemanticWalletType(type);
        onWalletType?.(type);
      },
    });
  }

  tagSemanticWalletType(resolvedType);
  ensureReownAppKitConfigured();
  onWalletType?.(resolvedType);

  const wcConnector = getWalletConnectConnector();
  if (!wcConnector) {
    return Promise.reject(new Error("WalletConnect is not configured."));
  }

  return connect(wagmiClient, { connector: wcConnector, chainId: option.chainId });
}
