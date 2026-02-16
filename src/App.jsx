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
import { TradingPage } from "./pages/TradingPage";
import { StakingPage } from "./pages/StakingPage";
import { HistoryPage } from "./pages/HistoryPage";
import { BetaAccessPage } from "./pages/BetaAccessPage";
import { wagmiClient } from "./wagmiConnectors";
import {
  connect,
  disconnect,
  getAccount,
  watchAccount,
  watchConnections,
} from "@wagmi/core";
import {
  setAddress,
  setChainId,
  setIsConnected,
  setWalletModal,
  setWalletType,
} from "./redux/slices/walletSlice";
import { resetPoints, setPointsBalance } from "./redux/slices/pointsSlice";
import { useAuth } from "./hooks/useAuth";
import { Toaster, toast } from "sonner";
import { setRateLimit } from "./redux/slices/chatSlice";

function LaunchAppLayout() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const wasConnectedRef = useRef(false);
  const prevAddressRef = useRef(undefined);
  const authTriggeredRef = useRef(false);
  const { connector } = getAccount(wagmiClient);
  const { address, isConnected, walletModal } = useSelector(
    (state) => state.wallet,
  );
  const { token, user, ensureAuthenticated } = useAuth();

  const handleDisconnect = async () => {
    await disconnect(wagmiClient, {
      connector,
    });
    dispatch(setAddress(null));
    dispatch(setChainId(null));
    dispatch(setIsConnected(false));
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
  }, [user?.season1?.points, dispatch]);

  useEffect(() => {
    const limit = user?.season1?.rateLimit?.messagesRemaining;

    if (limit != null && typeof limit === "number") {
      dispatch(setRateLimit(user?.season1?.rateLimit));
    }
  }, [user?.season1?.rateLimit, dispatch]);

  useEffect(() => {
    if (wasConnectedRef.current && !isConnected) {
      localStorage.removeItem("authToken");
      localStorage.removeItem("authUser");
      navigate("/login", { replace: true });
    }
    wasConnectedRef.current = isConnected;
  }, [isConnected, navigate]);

  useEffect(() => {
    const prevAddress = prevAddressRef.current;
    if (prevAddress != null && address != null && prevAddress !== address) {
      localStorage.removeItem("authToken");
      localStorage.removeItem("authUser");
      dispatch(resetPoints());
      handleDisconnect();
    }
    prevAddressRef.current = address;
  }, [address, dispatch, navigate]);

  const setWalletModalOpen = (nextValue) => {
    dispatch(setWalletModal(nextValue));
  };

  const allConnectors = wagmiClient.connectors;

  const handleWalletConnect = async (option) => {
    // For Binance Wallet, use WalletConnect with BSC chain
    // if (option.connectorName === "Binance Wallet") {
    //   const connector = connectors.find((c) => c.name === "Binance Wallet");
    //   if (connector) connect({ connector, chainId: option.chainId });
    //   return;
    // }
    // Default: match by name
    const connector = allConnectors.find((c) =>
      c.name.toLowerCase().includes(option.name.toLowerCase()),
    );
    console.log("connector", connector);
    if (connector && connector.name !== "WalletConnect") {
      connect(wagmiClient, { connector: connector })
        .then(() => {
          window.WALLET_TYPE = option.walletType;
          dispatch(setWalletType(option.walletType));
          dispatch(setIsConnected(true));
          dispatch(setWalletModal(false));

          if (option.connectorName === "Binance Wallet") {
            setTimeout(() => {
              console.log(getAccount(wagmiClient));
              getAccount(wagmiClient);
            }, 2000);
          }
        })
        .catch((err) => {
          console.error("Wallet connection error:", err);
          toast.error("Failed to connect wallet. Please try again.");
        });
    } else if (connector && connector.name === "WalletConnect") {
      // Fallback to WalletConnect if specific connector not found
      const wcConnector = allConnectors.find((c) => c.name === "WalletConnect");
      if (wcConnector) {
        // setWalletModal(false);

        // setWalletModalOpen(false);
        connect(wagmiClient, { connector: wcConnector })
          .then(() => {
            window.WALLET_TYPE = "walletconnect";
            dispatch(setWalletType("walletconnect"));
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

      <div className="w-full flex-1 pt-20 flex overflow-hidden">
        <LaunchSidebar />
        <main className="w-full flex flex-col overflow-hidden">
          <Outlet />
        </main>
      </div>

      <WalletModal
        isOpen={walletModal}
        onClose={() => setWalletModalOpen(false)}
        onConnect={handleWalletConnect}
      />
    </div>
  );
}

function BetaAccessLayout() {
  const dispatch = useDispatch();
  const { walletModal } = useSelector((state) => state.wallet);
  const allConnectors = wagmiClient.connectors;

  const setWalletModalOpen = (nextValue) => {
    dispatch(setWalletModal(nextValue));
  };

  const handleWalletConnect = async (option) => {
    const connector = allConnectors.find((c) =>
      c.name.toLowerCase().includes(option.name.toLowerCase()),
    );

    if (connector && connector.name !== "WalletConnect") {
      connect(wagmiClient, { connector: connector })
        .then(() => {
          window.WALLET_TYPE = option.walletType;
          dispatch(setWalletType(option.walletType));
          dispatch(setIsConnected(true));
          dispatch(setWalletModal(false));
        })
        .catch((err) => {
          console.error("Wallet connection error:", err);
          toast.error("Failed to connect wallet. Please try again.");
        });
    } else if (connector && connector.name === "WalletConnect") {
      const wcConnector = allConnectors.find((c) => c.name === "WalletConnect");
      if (wcConnector) {
        connect(wagmiClient, { connector: wcConnector })
          .then(() => {
            window.WALLET_TYPE = "walletconnect";
            dispatch(setWalletType("walletconnect"));
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

  // Watch account changes with cleanup
  useEffect(() => {
    const unwatch = watchAccount(wagmiClient, (account) => {
      console.log(
        "👀 WalletSync - Account changed:",
        account.status,
        account.address,
      );

      switch (account.status) {
        case "connected":
          if (account.address && account.chainId) {
            console.log("✅ Wallet connected:", account.address);
            dispatch(setAddress(account.address));
            dispatch(setChainId(account.chainId));
            dispatch(setIsConnected(true));
            dispatch(setWalletModal(false));
          }
          break;

        case "reconnecting":
          console.log("🔄 Wallet reconnecting... (blocking transactions)");
          dispatch(setIsConnected(false)); // Block transactions during reconnect
          break;

        case "connecting":
          console.log("🔌 Wallet connecting...");
          dispatch(setIsConnected(false)); // Block transactions while connecting
          break;

        case "disconnected":
          console.log("⚠️ Wallet disconnected - clearing Redux state");
          dispatch(setAddress(null));
          dispatch(setIsConnected(false));
          window.WALLET_TYPE = null;
          break;

        default:
          console.log("⚠️ Wallet disconnected - clearing Redux state");
          dispatch(setAddress(null));
          dispatch(setIsConnected(false));
          window.WALLET_TYPE = null;
          break;
      }
    });

    // Cleanup watcher on unmount
    return () => unwatch();
  }, [dispatch]);

  // Watch connections to track active connections
  useEffect(() => {
    const unwatch = watchConnections(wagmiClient, {
      onChange(connections) {
        console.log(
          "🔗 Connections changed:",
          connections.length,
          "active connection(s)",
        );

        if (connections.length === 0) {
          console.log("⚠️ No active connections - clearing state");
          dispatch(setAddress(null));
          dispatch(setIsConnected(false));
          window.WALLET_TYPE = null;
        } else {
          // Get the active connection
          const activeConnection = connections[0];

          console.log("✅ Active connection:", activeConnection.connector.name);
          dispatch(setAddress(activeConnection.accounts[0]));
          dispatch(setChainId(activeConnection.chainId));
          dispatch(setIsConnected(true));
          dispatch(setWalletModal(false));
          // Set wallet type based on connector
          if (activeConnection.connector.type === "binanceWallet") {
            window.WALLET_TYPE = "binance";
            dispatch(setWalletType("binance"));
          } else {
            window.WALLET_TYPE = activeConnection.connector.type;
            dispatch(setWalletType(activeConnection.connector.type));
          }
        }
      },
    });

    // Cleanup watcher on unmount
    return () => unwatch();
  }, [dispatch]);

  // Handle window.ethereum events for account/chain changes (backwards compatibility)
  useEffect(() => {
    if (!window.ethereum) return;

    const handleAccountsChanged = (accounts) => {
      console.log("🔄 window.ethereum - Account changed:", accounts[0]);
      if (!accounts[0]) {
        dispatch(setAddress(null));
        dispatch(setIsConnected(false));
      }
    };

    const handleChainChanged = (chainHex) => {
      const newChainId = parseInt(chainHex, 16);
      console.log("🔄 window.ethereum - Chain changed:", newChainId);
      dispatch(setChainId(newChainId));
    };

    window.ethereum.on("accountsChanged", handleAccountsChanged);
    window.ethereum.on("chainChanged", handleChainChanged);

    return () => {
      window.ethereum.removeListener("accountsChanged", handleAccountsChanged);
      window.ethereum.removeListener("chainChanged", handleChainChanged);
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
          <Route path="/trending" element={<TradingPage />} />
          <Route path="/staking" element={<StakingPage />} />
          <Route path="/history" element={<HistoryPage />} />
        </Route>
      </Routes>
    </>
  );
}

export default App;
