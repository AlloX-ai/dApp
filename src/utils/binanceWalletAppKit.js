import {
  ApiController,
  ChainController,
  RouterController,
} from "@reown/appkit-controllers";
import { connect } from "@wagmi/core";
import { BINANCE_DEFAULT_CHAIN_ID, BINANCE_WC_EXPLORER_ID } from "../constants/binanceWallet";
import { wagmiClient } from "../wagmiConnectors";
import {
  getBinanceInjectedConnector,
  isBinanceInAppBrowser,
} from "./binanceWallet";
import { ensureReownAppKitConfigured } from "./initReownAppKit";
import { markBinanceWalletSession } from "./walletPersistence";
import { getWalletConnectConnector } from "./wagmiWalletConnect";

/**
 * Resolve Binance from Reown explorer (same as Metaverse WalletModal).
 */
export async function resolveBinanceWalletForAppKit() {
  try {
    await ApiController.searchWallet({ search: "Binance" });
    const fromSearch =
      ApiController.state.search?.find(
        (w) => w.id === BINANCE_WC_EXPLORER_ID,
      ) ||
      ApiController.state.search?.find((w) =>
        (w.name || "").toLowerCase().includes("binance"),
      );
    if (fromSearch) return fromSearch;

    const chains = ChainController.getRequestedCaipNetworkIds().join(",");
    const { data } = await ApiController.fetchWallets({
      page: 1,
      entries: 20,
      include: [BINANCE_WC_EXPLORER_ID],
      chains,
    });
    return data?.find((w) => w.id === BINANCE_WC_EXPLORER_ID) ?? data?.[0];
  } catch {
    return null;
  }
}

/**
 * AppKit routes wallets with `rdns` / `injected` to "Not Detected" on desktop.
 * WC QR view needs explorer links only.
 */
function walletForWalletConnectView(wallet) {
  if (!wallet) return null;
  const { rdns: _rdns, injected: _injected, ...rest } = wallet;
  return { ...rest, supports_wc: true };
}

/**
 * Metaverse WalletModal pattern: patch modal.open once, then fire-and-forget connect().
 */
export async function connectBinanceViaWalletConnect({
  chainId = BINANCE_DEFAULT_CHAIN_ID,
  onWalletType,
} = {}) {
  markBinanceWalletSession();
  onWalletType?.("binance");
  ensureReownAppKitConfigured();

  if (isBinanceInAppBrowser()) {
    const binanceInjected = getBinanceInjectedConnector(wagmiClient.connectors);
    if (!binanceInjected) {
      throw new Error("Binance Web3 Wallet is not available in this browser.");
    }
    return connect(wagmiClient, {
      connector: binanceInjected,
      chainId,
    });
  }

  const wcConnector = getWalletConnectConnector();
  if (!wcConnector) {
    throw new Error("WalletConnect connector not found.");
  }

  try {
    const binanceWallet = await resolveBinanceWalletForAppKit();
    const provider = await wcConnector.getProvider();
    const wcWallet = walletForWalletConnectView(binanceWallet);
    if (wcWallet && typeof provider?.modal?.open === "function") {
      const originalOpen = provider.modal.open.bind(provider.modal);
      provider.modal.open = async (openParams) => {
        provider.modal.open = originalOpen;
        await originalOpen(openParams);
        queueMicrotask(() => {
          RouterController.reset("ConnectingWalletConnect", {
            wallet: wcWallet,
          });
        });
      };
    }
  } catch {
    /* default WC modal */
  }

  connect(wagmiClient, { connector: wcConnector, chainId }).catch((err) => {
    console.warn("Binance WalletConnect connect rejected:", err?.message);
  });

  return Promise.resolve();
}

/** @deprecated use connectBinanceViaWalletConnect */
export async function primeBinanceWalletConnectModal(wcConnector) {
  const binanceWallet = await resolveBinanceWalletForAppKit();
  const provider = await wcConnector.getProvider();
  const wcWallet = walletForWalletConnectView(binanceWallet);
  if (!wcWallet || typeof provider?.modal?.open !== "function") return;

  const originalOpen = provider.modal.open.bind(provider.modal);
  provider.modal.open = async (openParams) => {
    provider.modal.open = originalOpen;
    await originalOpen(openParams);
    queueMicrotask(() => {
      RouterController.reset("ConnectingWalletConnect", { wallet: wcWallet });
    });
  };
}
