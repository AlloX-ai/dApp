import { createConfig, createStorage, fallback, http } from "wagmi";
import { mainnet, opBNB, bsc, base } from "wagmi/chains";
import {
  metaMask,
  coinbaseWallet,
  walletConnect,
  injected,
} from "wagmi/connectors";
import { BINANCE_INJECTED_CONNECTOR_ID } from "./constants/binanceWallet";

const BASE_RPC_ENDPOINTS = [
  "https://mainnet.base.org",
  "https://base.publicnode.com",
  "https://base-rpc.publicnode.com",
];

const ETHEREUM_RPC_ENDPOINTS = [
  "https://mainnet.infura.io/v3/7698640038364a678705d3fdd84704f4",
];

export const WALLET_CONNECT_PROJECT_ID = "74cdef10fa7dbea4822525c23a70114c";

export const WALLET_CONNECT_METADATA = {
  name: "Allox",
  description: "Allox AI",
  url:
    typeof window !== "undefined"
      ? window.location.origin
      : "https://allox.ai",
  icons:
    typeof window !== "undefined"
      ? [`${window.location.origin}/favicon.ico`]
      : ["https://allox.ai/favicon.ico"],
};

export const wagmiClient = createConfig({
  chains: [mainnet, opBNB, bsc, base],
  storage:
    typeof window !== "undefined"
      ? createStorage({ storage: window.localStorage })
      : undefined,
  connectors: [
    walletConnect({
      projectId: WALLET_CONNECT_PROJECT_ID,
      metadata: WALLET_CONNECT_METADATA,
      showQrModal: true,
      // Relay logs at pino level 50 (error) spam the console during pairing/handoff.
      logger: "silent",
      disableProviderPing: true,
      customStoragePrefix: "allox-wc",
    }),
    injected(),
    injected({
      target: () => {
        if (
          typeof window !== "undefined" &&
          typeof window.binancew3w?.ethereum !== "undefined"
        ) {
          return {
            id: BINANCE_INJECTED_CONNECTOR_ID,
            name: "Binance Web3 Wallet",
            provider: window.binancew3w.ethereum,
          };
        }
        return undefined;
      },
    }),
    metaMask({
      dapp: {
        name: "Allox",
        url:
          typeof window !== "undefined"
            ? window.location.origin
            : "https://allox.ai",
      },
    }),
    coinbaseWallet(),
  ],
  transports: {
    [bsc.id]: fallback(BSC_RPC_ENDPOINTS.map((url) => http(url))),
    [mainnet.id]: fallback(ETHEREUM_RPC_ENDPOINTS.map((url) => http(url))),
    [opBNB.id]: fallback(OPBNB_RPC_ENDPOINTS.map((url) => http(url))),
    [base.id]: fallback(BASE_RPC_ENDPOINTS.map((url) => http(url))),
  },
});
