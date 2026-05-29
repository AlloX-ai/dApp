import {
  createSolanaClient,
  getInfuraRpcUrls,
} from "@metamask/connect-solana";
import { getPersistedWalletType } from "./walletPersistence";

/** Same Infura project as EVM RPC in wagmiConnectors.js */
const INFURA_API_KEY = "7698640038364a678705d3fdd84704f4";

const PREFERRED_CHAIN_STORAGE_KEY = "walletPreferredChainId";
const SOLANA_MAINNET_CHAIN_ID = 101;

let initPromise;

/**
 * Registers MetaMask with the Wallet Standard registry for Solana.
 * Safe to call multiple times; createSolanaClient uses a singleton session.
 */
export function initMetaMaskSolana() {
  if (!initPromise) {
    initPromise = createSolanaClient({
      dapp: {
        name: "Allox",
        url:
          typeof window !== "undefined"
            ? window.location.origin
            : "https://allox.ai",
      },
      api: {
        supportedNetworks: getInfuraRpcUrls({
          infuraApiKey: INFURA_API_KEY,
          networks: ["mainnet"],
        }),
      },
    }).catch((err) => {
      initPromise = null;
      throw err;
    });
  }
  return initPromise;
}

/** Non-blocking: helps WalletProvider autoConnect for returning MetaMask Solana users. */
export function warmupMetaMaskSolanaIfSession() {
  if (typeof window === "undefined") return;
  const persisted = getPersistedWalletType();
  const preferred = localStorage.getItem(PREFERRED_CHAIN_STORAGE_KEY);
  if (
    persisted !== "solana" &&
    preferred !== String(SOLANA_MAINNET_CHAIN_ID)
  ) {
    return;
  }
  initMetaMaskSolana().catch((err) => {
    console.warn("MetaMask Solana warmup:", err);
  });
}

function matchSolanaWallet(wallets, searchName) {
  return wallets.find((w) =>
    w.adapter?.name?.toLowerCase?.().includes(searchName),
  );
}

/**
 * Resolve a Solana wallet adapter after optional MetaMask Connect init.
 * `getWallets` must return the latest list (e.g. from a ref) because discovery
 * updates asynchronously after registerWallet.
 */
export async function resolveSolanaWalletForConnect(getWallets, searchName) {
  if (searchName === "metamask") {
    await initMetaMaskSolana();
  }

  let wallet = matchSolanaWallet(getWallets(), searchName);
  if (wallet || searchName === "phantom") {
    return wallet ?? null;
  }

  for (let i = 0; i < 40 && !wallet; i += 1) {
    await new Promise((resolve) => setTimeout(resolve, 50));
    wallet = matchSolanaWallet(getWallets(), searchName);
  }
  return wallet ?? null;
}
