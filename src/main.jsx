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

//Privy
import { PrivyProvider } from "@privy-io/react-auth";

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

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <Provider store={store}>
      <BrowserRouter>
        <PersistQueryClientProvider
          client={queryClient}
          persistOptions={{ persister }}
        >
          <WagmiProvider config={wagmiClient}>
            <PrivyProvider
              appId="cmniv3xps000i0cjvdfj9ys06"
              config={{
                loginMethods: ["email", "google", "apple", "wallet"],
                appearance: { theme: "dark" },
                embeddedWallets: {
                  createOnLogin: "users-without-wallets", // auto-create for email/Google/Apple
                },
              }}
            >
              <App />
            </PrivyProvider>
          </WagmiProvider>
        </PersistQueryClientProvider>
      </BrowserRouter>
    </Provider>
  </StrictMode>,
);
