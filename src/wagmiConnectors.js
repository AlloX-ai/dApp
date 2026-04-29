import { createConfig, fallback, http } from "wagmi";
import {
  mainnet,
  opBNB,
  bsc,
  base,
} from "wagmi/chains";
import {
  metaMask,
  coinbaseWallet,
  walletConnect,
  injected,
} from "wagmi/connectors";
import { getWagmiConnectorV2 } from "@binance/w3w-wagmi-connector-v2";

const binanceConnector = getWagmiConnectorV2();
const BASE_RPC_ENDPOINTS = [
  "https://mainnet.base.org",
  "https://base.publicnode.com",
  "https://base-rpc.publicnode.com",
];

export const wagmiClient = createConfig({
  chains: [
    mainnet,
    opBNB,
    bsc,
    base,
  ],
  // autoConnect: true,
  connectors: [
    walletConnect({
      projectId: "a465b6d7661ba54df9ca6c4757bce009"
    }),
    injected(),
    binanceConnector(),
    metaMask(),
    coinbaseWallet(),
  ],
  transports: {
    [bsc.id]: http(),
    [mainnet.id]: http(),
    [opBNB.id]: http(),
    [base.id]: fallback(BASE_RPC_ENDPOINTS.map((url) => http(url))),
  },
});
