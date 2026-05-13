import { createConfig, fallback, http } from "wagmi";
import { mainnet, opBNB, bsc, base } from "wagmi/chains";
import {
  metaMask,
  coinbaseWallet,
  walletConnect,
  injected,
} from "wagmi/connectors";

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
    [bsc.id]: http(),
    [mainnet.id]: fallback(ETHEREUM_RPC_ENDPOINTS.map((url) => http(url))),
    [opBNB.id]: http(),
    [base.id]: fallback(BASE_RPC_ENDPOINTS.map((url) => http(url))),
  },
});
