import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router";

// Wagmi + Wallet
import { WagmiProvider } from "wagmi";
import { wagmiClient } from "./wagmiConnectors.js";

// Redux
import { Provider } from "react-redux";
import { store } from "./redux/store";

import "./index.css";
import App from "./App.jsx";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <Provider store={store}>
      <BrowserRouter>
        <WagmiProvider config={wagmiClient}>
          <App />
        </WagmiProvider>
      </BrowserRouter>
    </Provider>
  </StrictMode>,
);
