import { createConfig, fallback, http } from "wagmi";
import { mainnet, opBNB, bsc, base } from "wagmi/chains";
import {
  metaMask,
  coinbaseWallet,
  walletConnect,
  injected,
} from "wagmi/connectors";
import { getWagmiConnectorV2 } from "@binance/w3w-wagmi-connector-v2";

const binanceConnector = getWagmiConnectorV2();
const BSC_RPC_ENDPOINTS = [
  "https://bsc-dataseed.binance.org",
  "https://bsc-dataseed1.bnbchain.org",
  "https://bsc-rpc.publicnode.com",
  "https://binance.llamarpc.com",
];
const OPBNB_RPC_ENDPOINTS = [
  "https://opbnb-mainnet-rpc.bnbchain.org",
  "https://opbnb-rpc.publicnode.com",
];
const BASE_RPC_ENDPOINTS = [
  "https://mainnet.base.org",
  "https://base.publicnode.com",
  "https://base-rpc.publicnode.com",
];

const ETHEREUM_RPC_ENDPOINTS = [
  "https://mainnet.infura.io/v3/7698640038364a678705d3fdd84704f4",
];
export const wagmiClient = createConfig({
  chains: [mainnet, opBNB, bsc, base],
  // autoConnect: true,
  connectors: [
    walletConnect({
      projectId: "a465b6d7661ba54df9ca6c4757bce009",
    }),
    injected(),
    binanceConnector(),
    metaMask(),
    coinbaseWallet(),
  ],
  transports: {
    [bsc.id]: fallback(BSC_RPC_ENDPOINTS.map((url) => http(url))),
    [mainnet.id]: fallback(ETHEREUM_RPC_ENDPOINTS.map((url) => http(url))),
    [opBNB.id]: fallback(OPBNB_RPC_ENDPOINTS.map((url) => http(url))),
    [base.id]: fallback(BASE_RPC_ENDPOINTS.map((url) => http(url))),
  },
});
