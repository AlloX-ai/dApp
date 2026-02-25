import { useEffect, useRef } from "react";
import {
  Navigate,
  Outlet,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from "react-router";
import { useDispatch, useSelector } from "react-redux";
import { WalletModal } from "./components/WalletModal";
import { LaunchSidebar } from "./components/LaunchSidebar";
import { Header } from "./components/Header";
import { ChatPage } from "./pages/ChatPage";
import { PortfolioPage } from "./pages/PortfolioPage";
import { Season1 } from "./pages/Season1";
import { TradingPage } from "./pages/TradingPage";
import { StakingPage } from "./pages/StakingPage";
import { HistoryPage } from "./pages/HistoryPage";
import { BetaAccessPage } from "./pages/BetaAccessPage";
import { wagmiClient } from "./wagmiConnectors";
import {
  connect,
  disconnect,
  getAccount,
  getConnections,
  watchAccount,
  watchConnections,
} from "@wagmi/core";
import {
  setAddress,
  setChainId,
  setIsConnected,
  setWalletModal,
  setWalletType,
  closeCheckinModal,
} from "./redux/slices/walletSlice";
import { resetPoints, setPointsBalance } from "./redux/slices/pointsSlice";
import { clearCheckin } from "./redux/slices/checkinSlice";
import { useAuth } from "./hooks/useAuth";
import { useCheckin } from "./hooks/useCheckin";
import { CheckinModal } from "./components/CheckinModal";

import { Toaster, toast } from "sonner";
import {
  setRateLimit,
  setCurrentMessages,
  setViewingHistorySessionId,
} from "./redux/slices/chatSlice";
import { store } from "./redux/store";
import { PointsPage } from "./pages/Points";
import { useWallet } from "@solana/wallet-adapter-react";

const SOLANA_MAINNET_CHAIN_ID = 101;
const PREFERRED_CHAIN_STORAGE_KEY = "walletPreferredChainId";
const AUTH_USER_KEY = "authUser";

function getStoredAuthUser() {
  try {
    const raw = localStorage.getItem(AUTH_USER_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error(e);
  }
  return null;
}

function LaunchAppLayout() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const wasConnectedRef = useRef(false);
  const prevAddressRef = useRef(undefined);
  const prevWalletTypeRef = useRef(undefined);
  const authTriggeredRef = useRef(false);
  const { connector } = getAccount(wagmiClient);
  const {
    wallets: solanaWallets,
    select: selectSolanaWallet,
    connect: connectSolana,
    disconnect: disconnectSolana,
    connected: solanaConnected,
    publicKey: solanaPublicKey,
  } = useWallet();

  const { address, isConnected, walletModal, walletType, checkinModal } =
    useSelector((state) => state.wallet);
  const { token, user, ensureAuthenticated } = useAuth();
  const {
    status: checkinStatus,
    claim: claimCheckin,
    fetchStatus: fetchCheckinStatus,
    addOptimisticCheckinPoints,
    loading: checkinLoading,
  } = useCheckin();

  const handleDisconnect = async () => {
    // if (walletType === "solana") {
    //   try {
    await disconnectSolana();
    // } catch (e) {
    //   console.warn("Solana wallet disconnect:", e);
    // }
    // }
    // else
    if (connector) {
      await disconnect(wagmiClient, { connector });
    }
    dispatch(setAddress(null));
    dispatch(setChainId(null));
    dispatch(setIsConnected(false));
    dispatch(setWalletType(""));
    dispatch(setViewingHistorySessionId(null));
    dispatch(setCurrentMessages([]));
    dispatch(clearCheckin());
    localStorage.removeItem("authToken");
    localStorage.removeItem("authUser");
    navigate("/login", { replace: true });
  };

  useEffect(() => {
    if (!isConnected) {
      authTriggeredRef.current = false;
      return;
    }
    if (token) return;
    if (authTriggeredRef.current) return;
    authTriggeredRef.current = true;
    ensureAuthenticated().catch(() => {
      authTriggeredRef.current = false;
    });
  }, [isConnected, token, ensureAuthenticated]);

  useEffect(() => {
    const points = user?.season1?.points;
    if (points != null && typeof points === "number") {
      dispatch(setPointsBalance(points));
    }
  }, [user?.season1, user?.season1?.points, dispatch]);

  useEffect(() => {
    if (user?.walletType && address && user?.address === address) {
      dispatch(setWalletType(user.walletType));
    }
  }, [user?.walletType, user?.address, address, dispatch]);

  useEffect(() => {
    const limit = user?.season1?.rateLimit;
    if (
      limit != null &&
      (typeof limit.remaining === "number" ||
        typeof limit.messagesRemaining === "number")
    ) {
      dispatch(setRateLimit(user?.season1?.rateLimit));
    }
  }, [
    user?.season1?.rateLimit,
    user?.season1?.rateLimit?.remaining,
    user?.season1?.rateLimit?.messagesRemaining,
    dispatch,
  ]);

  useEffect(() => {
    if (wasConnectedRef.current && !isConnected) {
      const hasAuth = !!localStorage.getItem("authToken");
      if (!hasAuth) {
        localStorage.removeItem("authToken");
        localStorage.removeItem("authUser");

        dispatch(setViewingHistorySessionId(null));
        dispatch(setCurrentMessages([]));

        navigate("/login", { replace: true });
      }
    }
    wasConnectedRef.current = isConnected;
  }, [isConnected, navigate]);

  // If the user changes account within the same wallet type (e.g. MetaMask account 1 → 2),
  // force a fresh session. Compare addresses case-insensitively to avoid false positives (EVM checksum).
  useEffect(() => {
    const prevAddress = prevAddressRef.current;
    const prevWalletType = prevWalletTypeRef.current;

    if (
      prevAddress != null &&
      address != null &&
      prevWalletType === "evm" &&
      walletType === "evm" &&
      prevAddress.toLowerCase() !== address.toLowerCase()
    ) {
      localStorage.removeItem("authToken");
      localStorage.removeItem("authUser");
      dispatch(setViewingHistorySessionId(null));
      dispatch(setCurrentMessages([]));
      dispatch(resetPoints());
      handleDisconnect();
    }

    prevAddressRef.current = address;
    prevWalletTypeRef.current = walletType;
  }, [address, walletType, dispatch, navigate]);

  const setWalletModalOpen = (nextValue) => {
    dispatch(setWalletModal(nextValue));
  };

  const allConnectors = wagmiClient.connectors;

  const handleWalletConnect = async (option) => {
    // Solana (MetaMask via Wallet Standard) – Redux is synced by WalletSync when adapter connects
    if (option.isSolana || option.walletType === "solana") {
      const metaMaskWallet = solanaWallets.find((w) =>
        w.adapter?.name?.toLowerCase?.().includes("metamask"),
      );
      if (!metaMaskWallet) {
        toast.error(
          "MetaMask with Solana support not found. Install or enable MetaMask.",
        );
        return;
      }
      try {
        selectSolanaWallet(metaMaskWallet.adapter.name);
        await metaMaskWallet.adapter.connect();
        dispatch(setWalletModal(false));
      } catch (err) {
        console.error("Solana (MetaMask) connection error:", err);
        toast.error("Failed to connect MetaMask for Solana. Please try again.");
      }
      return;
    }

    // EVM wallets – match by name
    const connector = allConnectors.find((c) =>
      c.name.toLowerCase().includes(option.name.toLowerCase()),
    );

    if (connector && connector.name !== "WalletConnect") {
      connect(wagmiClient, { connector })
        .then(() => {
          dispatch(setWalletType("evm"));
          dispatch(setIsConnected(true));
          dispatch(setWalletModal(false));
          if (option.connectorName === "Binance Wallet") {
            setTimeout(() => getAccount(wagmiClient), 2000);
          }
        })
        .catch((err) => {
          console.error("Wallet connection error:", err);
          toast.error("Failed to connect wallet. Please try again.");
        });
    } else if (connector?.name === "WalletConnect") {
      const wcConnector = allConnectors.find((c) => c.name === "WalletConnect");
      if (wcConnector) {
        connect(wagmiClient, { connector: wcConnector })
          .then(() => {
            dispatch(setWalletType("evm"));
            dispatch(setIsConnected(true));
            dispatch(setWalletModal(false));
          })
          .catch((err) => {
            console.error("WalletConnect connection error:", err);
            toast.error(
              "Failed to connect via WalletConnect. Please try again.",
            );
          });
      }
    } else {
      toast.error(
        option.name +
          " not found! Please add the browser extension or use mobile app wallet.",
      );
    }
  };

  return (
    <div className="min-h-screen bg-pattern flex flex-col main-wrapper">
      <WalletSync />
      <Header
        isConnected={isConnected}
        onConnectClick={() => setWalletModalOpen(true)}
        coinbase={address}
        onDisconnectClick={handleDisconnect}
      />

      <div className="w-full flex-1 pt-20 flex min-h-0">
        <LaunchSidebar />
        <main className="w-full flex flex-col min-h-0">
          <Outlet />
        </main>
      </div>

      <WalletModal
        isOpen={walletModal}
        onClose={() => setWalletModalOpen(false)}
        onConnect={handleWalletConnect}
      />

      <CheckinModal
        open={checkinModal}
        onClose={() => dispatch(closeCheckinModal())}
        status={checkinStatus}
        claim={claimCheckin}
        fetchStatus={fetchCheckinStatus}
        addOptimisticCheckinPoints={addOptimisticCheckinPoints}
        loading={checkinLoading}
      />
    </div>
  );
}

function BetaAccessLayout() {
  const dispatch = useDispatch();
  const { walletModal } = useSelector((state) => state.wallet);
  const allConnectors = wagmiClient.connectors;
  const {
    wallets: solanaWallets,
    select: selectSolanaWallet,
    connect: connectSolana,
  } = useWallet();

  const setWalletModalOpen = (nextValue) => {
    dispatch(setWalletModal(nextValue));
  };

  const handleWalletConnect = async (option) => {
    if (option.isSolana || option.walletType === "solana") {
      const metaMaskWallet = solanaWallets.find((w) =>
        w.adapter?.name?.toLowerCase?.().includes("metamask"),
      );
      if (!metaMaskWallet) {
        toast.error(
          "MetaMask with Solana support not found. Install or enable MetaMask.",
        );
        return;
      }
      try {
        selectSolanaWallet(metaMaskWallet.adapter.name);
        await metaMaskWallet.adapter.connect();
        dispatch(setWalletModal(false));
      } catch (err) {
        console.error("Solana (MetaMask) connection error:", err);
        toast.error("Failed to connect MetaMask for Solana. Please try again.");
      }
      return;
    }

    const connector = allConnectors.find((c) =>
      c.name.toLowerCase().includes(option.name.toLowerCase()),
    );
    if (connector && connector.name !== "WalletConnect") {
      connect(wagmiClient, { connector })
        .then(() => {
          dispatch(setWalletType("evm"));
          dispatch(setIsConnected(true));
          dispatch(setWalletModal(false));
        })
        .catch((err) => {
          console.error("Wallet connection error:", err);
          toast.error("Failed to connect wallet. Please try again.");
        });
    } else if (connector?.name === "WalletConnect") {
      const wcConnector = allConnectors.find((c) => c.name === "WalletConnect");
      if (wcConnector) {
        connect(wagmiClient, { connector: wcConnector })
          .then(() => {
            dispatch(setWalletType("evm"));
            dispatch(setIsConnected(true));
            dispatch(setWalletModal(false));
          })
          .catch((err) => {
            console.error("WalletConnect connection error:", err);
            toast.error(
              "Failed to connect via WalletConnect. Please try again.",
            );
          });
      }
    } else {
      toast.error(
        option.name +
          " not found! Please add the browser extension or use mobile app wallet.",
      );
    }
  };

  return (
    <>
      <WalletSync />
      <BetaAccessPage onWalletConnect={handleWalletConnect} />
      <WalletModal
        isOpen={walletModal}
        onClose={() => setWalletModalOpen(false)}
        onConnect={handleWalletConnect}
      />
    </>
  );
}

function WalletSync() {
  const dispatch = useDispatch();

  // Eagerly restore Phantom only when NOT on login (per Phantom docs: use onlyIfTrusted for page load).
  // Skip on /login so logout doesn’t trigger reconnection and popup.
  const { connected: solanaConnected, publicKey: solanaPublicKey } =
    useWallet();

  // Restore walletType (and address) from authUser on load so EVM watchers don't overwrite Solana session
  useEffect(() => {
    const authUser = getStoredAuthUser();
    if (!authUser?.walletType) return;
    dispatch(setWalletType(authUser.walletType));
    if (authUser.address) {
      dispatch(setAddress(authUser.address));
      dispatch(setIsConnected(true));
      if (authUser.walletType === "solana") {
        dispatch(setChainId(SOLANA_MAINNET_CHAIN_ID));
      }
    }
  }, [dispatch]);

  useEffect(() => {
    const currentWalletType = store.getState().wallet.walletType;
    if (solanaConnected && solanaPublicKey) {
      // If we are currently using EVM as the active ecosystem, don't override it
      if (currentWalletType === "evm") return;
      dispatch(setWalletType("solana"));
      dispatch(setAddress(solanaPublicKey.toBase58()));
      dispatch(setChainId(SOLANA_MAINNET_CHAIN_ID));
      dispatch(setIsConnected(true));
      dispatch(setWalletModal(false));
    } else if (currentWalletType === "solana" && !solanaConnected) {
      if (localStorage.getItem("authToken")) return;
      dispatch(setAddress(null));
      dispatch(setChainId(null));
      dispatch(setIsConnected(false));
      dispatch(setWalletType(""));
    }
  }, [solanaConnected, solanaPublicKey, dispatch]);

  // Restore Solana as default when user previously selected Solana (saved in localStorage)
  useEffect(() => {
    const { wallet } = store.getState();
    if (wallet.isConnected) return;
    const stored = localStorage.getItem(PREFERRED_CHAIN_STORAGE_KEY);
    if (stored !== String(SOLANA_MAINNET_CHAIN_ID)) return;
    dispatch(setChainId(SOLANA_MAINNET_CHAIN_ID));
  }, [dispatch]);

  // Watch account changes (EVM only; skip when stored user or Redux is Solana)
  useEffect(() => {
    let disconnectTimeoutId = null;

    const unwatch = watchAccount(wagmiClient, (account) => {
      const storedUser = getStoredAuthUser();
      const walletType = store.getState().wallet.walletType;
      if (walletType === "solana" || storedUser?.walletType === "solana")
        return;

      switch (account.status) {
        case "connected":
          if (disconnectTimeoutId) {
            clearTimeout(disconnectTimeoutId);
            disconnectTimeoutId = null;
          }
          if (account.address && account.chainId) {
            dispatch(setAddress(account.address));
            dispatch(setChainId(account.chainId));
            dispatch(setIsConnected(true));
            dispatch(setWalletModal(false));
          }
          break;
        case "reconnecting":
        case "connecting":
          if (!localStorage.getItem("authToken")) {
            dispatch(setIsConnected(false));
          }
          break;
        case "disconnected":
        default:
          if (disconnectTimeoutId) clearTimeout(disconnectTimeoutId);
          disconnectTimeoutId = setTimeout(() => {
            disconnectTimeoutId = null;
            if (localStorage.getItem("authToken")) return;
            dispatch(setAddress(null));
            dispatch(setIsConnected(false));
            dispatch(setWalletType(""));
          }, 400);
          break;
      }
    });
    return () => {
      if (disconnectTimeoutId) clearTimeout(disconnectTimeoutId);
      unwatch();
    };
  }, [dispatch]);
  // Watch connections (EVM only; Solana is synced via adapter above)
  useEffect(() => {
    let clearTimeoutId = null;

    const unwatch = watchConnections(wagmiClient, {
      onChange(connections) {
        if (connections.length === 0) {
          if (clearTimeoutId) clearTimeout(clearTimeoutId);
          clearTimeoutId = setTimeout(() => {
            clearTimeoutId = null;
            if (localStorage.getItem("authToken")) return;
            const storedUser = getStoredAuthUser();
            if (
              store.getState().wallet.walletType !== "solana" &&
              storedUser?.walletType !== "solana"
            ) {
              dispatch(setAddress(null));
              dispatch(setIsConnected(false));
              dispatch(setWalletType(""));
            }
          }, 400);
        } else {
          const storedUser = getStoredAuthUser();
          if (storedUser?.walletType === "solana") return;
          if (clearTimeoutId) {
            clearTimeout(clearTimeoutId);
            clearTimeoutId = null;
          }
          const activeConnection = connections[0];
          if (activeConnection.accounts[0] && activeConnection.chainId) {
            dispatch(setWalletType("evm"));
            dispatch(setAddress(activeConnection.accounts[0]));
            dispatch(setChainId(activeConnection.chainId));
            dispatch(setIsConnected(true));
            dispatch(setWalletModal(false));
          }
          if (activeConnection.connector.type === "binanceWallet") {
            dispatch(setWalletType("evm"));
            dispatch(setIsConnected(true));
            dispatch(setWalletModal(false));
          }
        }
      },
    });
    return () => {
      if (clearTimeoutId) clearTimeout(clearTimeoutId);
      unwatch();
    };
  }, [dispatch]);

  // Handle EVM account/chain changes
  useEffect(() => {
    const provider = window.ethereum;
    if (!provider) return;

    const handleAccountsChanged = (accounts) => {
      if (store.getState().wallet.walletType === "solana") return;
      if (!accounts[0]) {
        dispatch(setAddress(null));
        dispatch(setIsConnected(false));
      }
    };

    const handleChainChanged = (chainHex) => {
      if (store.getState().wallet.walletType === "solana") return;
      dispatch(setChainId(parseInt(chainHex, 16)));
    };

    provider.on("accountsChanged", handleAccountsChanged);
    provider.on("chainChanged", handleChainChanged);
    return () => {
      provider.removeListener("accountsChanged", handleAccountsChanged);
      provider.removeListener("chainChanged", handleChainChanged);
    };
  }, [dispatch]);

  return null;
}

function RequireAuth({ children }) {
  const location = useLocation();
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return children;
}

function App() {
  return (
    <>
      <Toaster position="top-right" richColors closeButton />
      <Routes>
        <Route path="/login" element={<BetaAccessLayout />} />
        <Route
          path="/"
          element={
            <RequireAuth>
              <LaunchAppLayout />
            </RequireAuth>
          }
        >
          <Route index element={<ChatPage />} />
          <Route path="/portfolio" element={<PortfolioPage />} />
          <Route path="/season1" element={<Season1 />} />
          <Route path="/points" element={<PointsPage />} />

          <Route path="/trending" element={<TradingPage />} />
          <Route path="/staking" element={<StakingPage />} />
          <Route path="/history" element={<HistoryPage />} />
        </Route>
      </Routes>
    </>
  );
}

export default App;
