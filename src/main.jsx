import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router";

// Wagmi + Wallet
import { WagmiProvider } from "wagmi";
import { wagmiClient } from "./wagmiConnectors.js";

// Redux
import { Provider } from "react-redux";
import { store } from "./redux/store";

//React Query
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { createSyncStoragePersister } from "@tanstack/query-sync-storage-persister";

// Solana: MetaMask (Wallet Standard) + wallet adapter
import { initializeWhenDetected } from "@solflare-wallet/metamask-wallet-standard";
import { WalletProvider as SolanaWalletProvider } from "@solana/wallet-adapter-react";

import "./index.css";
import App from "./App.jsx";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      cacheTime: 5 * 60 * 1000,
      refetchOnWindowFocus: false,
      refetchInterval: false,
    },
  },
});
const persister = createSyncStoragePersister({
  storage: window.localStorage,
});

initializeWhenDetected();

// Empty array: WalletProvider discovers Wallet Standard wallets (e.g. MetaMask) via useStandardWalletAdapters
createRoot(document.getElementById("root")).render(
  <StrictMode>
    <Provider store={store}>
      <BrowserRouter>
        <PersistQueryClientProvider
          client={queryClient}
          persistOptions={{ persister }}
        >
          <WagmiProvider config={wagmiClient}>
            <SolanaWalletProvider wallets={[]} autoConnect>
              <App />
            </SolanaWalletProvider>
          </WagmiProvider>
        </PersistQueryClientProvider>
      </BrowserRouter>
    </Provider>
  </StrictMode>,
);
