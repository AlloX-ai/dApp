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
import { ReferralsPage } from "./pages/ReferralPage";
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

const SOLANA_MAINNET_CHAIN_ID = 101;
const PREFERRED_CHAIN_STORAGE_KEY = "walletPreferredChainId";

async function tryRestorePhantomSession(dispatch) {
  const connections = getConnections(wagmiClient);
  const hasEVMConnection = connections.some(
    (c) => c.connector?.name !== "Phantom" && c.accounts?.length > 0,
  );
  if (hasEVMConnection) return false;

  const provider = window.phantom?.solana;
  if (!provider) return false;
  try {
    const resp = await provider.connect({ onlyIfTrusted: true });
    const walletAddress = resp.publicKey?.toString?.() ?? resp.publicKey;
    if (!walletAddress) return false;
    dispatch(setWalletType("solana"));
    dispatch(setAddress(walletAddress));
    dispatch(setIsConnected(true));
    dispatch(setWalletModal(false));
    return true;
  } catch {
    return false;
  }
}

function LaunchAppLayout() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const wasConnectedRef = useRef(false);
  const prevAddressRef = useRef(undefined);
  const prevWalletTypeRef = useRef(undefined);
  const authTriggeredRef = useRef(false);
  const { connector } = getAccount(wagmiClient);

  const { address, isConnected, walletModal, walletType, checkinModal } =
    useSelector((state) => state.wallet);
  const { token, user, ensureAuthenticated, logout } = useAuth();
  const {
    status: checkinStatus,
    claim: claimCheckin,
    fetchStatus: fetchCheckinStatus,
    addOptimisticCheckinPoints,
    loading: checkinLoading,
  } = useCheckin();

  const handleDisconnect = async () => {
    // if (walletType === "phantom") {
    try {
      if (window.phantom?.solana) {
        await window.phantom.solana.disconnect();
      }
    } catch (e) {
      console.warn("Phantom disconnect:", e);
    }
    // } else
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
    // Fully clear auth state (token + user) across the app
    logout();
    navigate("/login");
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
  // force a fresh session. But don't treat switching wallet types (e.g. Phantom → MetaMask)
  // as a mid-session switch that should wipe auth.
  useEffect(() => {
    const prevAddress = prevAddressRef.current;
    const prevWalletType = prevWalletTypeRef.current;

    if (
      prevAddress != null &&
      address != null &&
      prevAddress !== address &&
      prevWalletType === walletType
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
    // Phantom (Solana) – connect via window.phantom.solana
    if (option.isPhantom || option.walletType === "phantom") {
      const provider = window.phantom?.solana;
      if (!provider) {
        toast.error("Phantom not found. Install the Phantom extension.");
        return;
      }
      try {
        const resp = await provider.connect();
        const walletAddress = resp.publicKey.toString();
        dispatch(setWalletType("solana"));
        dispatch(setAddress(walletAddress));
        dispatch(setChainId(SOLANA_MAINNET_CHAIN_ID));
        dispatch(setIsConnected(true));
        dispatch(setWalletModal(false));
      } catch (err) {
        console.error("Phantom connection error:", err);
        toast.error("Failed to connect Phantom. Please try again.");
      }
      return;
    }

    // EVM wallets – match by name
    const connector = allConnectors.find((c) =>
      c.name.toLowerCase().includes(option.name.toLowerCase()),
    );

    if (connector && connector.name !== "WalletConnect") {
      const isBinance =
        option.walletType === "binance" || option.name === "Binance Wallet";
      connect(wagmiClient, { connector })
        .then(() => {
          dispatch(setWalletType(isBinance ? "binance" : "evm"));
          dispatch(setIsConnected(true));
          dispatch(setWalletModal(false));
          if (isBinance) {
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

  const setWalletModalOpen = (nextValue) => {
    dispatch(setWalletModal(nextValue));
  };

  const handleWalletConnect = async (option) => {
    if (option.isPhantom || option.walletType === "phantom") {
      const provider = window.phantom?.solana;
      if (!provider) {
        toast.error("Phantom not found. Install the Phantom extension.");
        return;
      }
      try {
        const resp = await provider.connect();
        const walletAddress = resp.publicKey.toString();
        window.WALLET_TYPE = "phantom";
        dispatch(setWalletType("phantom"));
        dispatch(setAddress(walletAddress));
        dispatch(setChainId(SOLANA_MAINNET_CHAIN_ID));
        dispatch(setIsConnected(true));
        dispatch(setWalletModal(false));
      } catch (err) {
        console.error("Phantom connection error:", err);
        toast.error("Failed to connect Phantom. Please try again.");
      }
      return;
    }

    const connector = allConnectors.find((c) =>
      c.name.toLowerCase().includes(option.name.toLowerCase()),
    );
    if (connector && connector.name !== "WalletConnect") {
      const isBinance =
        option.walletType === "binance" || option.name === "Binance Wallet";
      connect(wagmiClient, { connector })
        .then(() => {
          dispatch(setWalletType(isBinance ? "binance" : "evm"));
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
  const { pathname } = useLocation();

  // Eagerly restore Phantom only when NOT on login (per Phantom docs: use onlyIfTrusted for page load).
  // Skip on /login so logout doesn’t trigger reconnection and popup.
  useEffect(() => {
    if (pathname === "/login") return;
    tryRestorePhantomSession(dispatch);
  }, [dispatch, pathname]);

  // Restore Solana as default when user previously selected Solana (saved in localStorage)
  useEffect(() => {
    const { wallet } = store.getState();
    if (wallet.isConnected) return;
    const stored = localStorage.getItem(PREFERRED_CHAIN_STORAGE_KEY);
    if (stored !== String(SOLANA_MAINNET_CHAIN_ID)) return;
    dispatch(setChainId(SOLANA_MAINNET_CHAIN_ID));
  }, [dispatch]);

  // Watch account changes with cleanup (EVM only; skip when Phantom is active)
  useEffect(() => {
    let disconnectTimeoutId = null;

    const unwatch = watchAccount(wagmiClient, (account) => {
      const walletType = store.getState().wallet.walletType;
      if (walletType === "phantom") return;

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
          dispatch(setIsConnected(false));
          break;
        case "connecting":
          dispatch(setIsConnected(false));
          break;
        case "disconnected":
        default:
          if (disconnectTimeoutId) clearTimeout(disconnectTimeoutId);
          disconnectTimeoutId = setTimeout(() => {
            disconnectTimeoutId = null;
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
  // Watch connections (EVM only; don't run Phantom restore here – only on mount, so disconnect doesn't re-trigger)
  useEffect(() => {
    let clearTimeoutId = null;

    const unwatch = watchConnections(wagmiClient, {
      async onChange(connections) {
        if (connections.length === 0) {
          // Debounce: wagmi can briefly report 0 when navigating (e.g. login → app) before rehydrating
          if (clearTimeoutId) clearTimeout(clearTimeoutId);
          clearTimeoutId = setTimeout(() => {
            clearTimeoutId = null;
            dispatch(setAddress(null));
            dispatch(setIsConnected(false));
            dispatch(setWalletType(""));
            window.WALLET_TYPE = null;
          }, 400);
        } else {
          if (clearTimeoutId) {
            clearTimeout(clearTimeoutId);
            clearTimeoutId = null;
          }
          const activeConnection = connections[0];

          if (
            activeConnection.accounts[0] &&
            activeConnection.chainId &&
            activeConnection.connector.name !== "Phantom"
          ) {
            dispatch(setWalletType("evm"));
            dispatch(setAddress(activeConnection.accounts[0]));
            dispatch(setChainId(activeConnection.chainId));
            dispatch(setIsConnected(true));
            dispatch(setWalletModal(false));
            window.WALLET_TYPE = "metamask";
          }
          if (activeConnection.connector.type === "binanceWallet") {
            dispatch(setWalletType("evm"));
            dispatch(setIsConnected(true));
            dispatch(setWalletModal(false));
            window.WALLET_TYPE = "binance";
          } else if (activeConnection.connector.name === "Phantom") {
            const provider = window.phantom?.solana;

            if (!provider) return;

            if (provider) {
              try {
                const resp = await provider.connect({ onlyIfTrusted: true });

                const walletAddress =
                  resp.publicKey?.toString?.() ?? resp.publicKey;
                if (walletAddress) {
                  dispatch(setWalletType("solana"));
                  dispatch(setAddress(walletAddress));
                  dispatch(setIsConnected(true));
                  dispatch(setWalletModal(false));
                  window.WALLET_TYPE = "solana";

                  const stored = localStorage.getItem(
                    PREFERRED_CHAIN_STORAGE_KEY,
                  );
                  if (stored) {
                    dispatch(setChainId(SOLANA_MAINNET_CHAIN_ID));
                  } else {
                    dispatch(setChainId(activeConnection.chainId));
                  }
                }
              } catch (err) {
                console.error("Failed to connect Phantom:", err);
              }
              // not trusted or rejected – don't show popup
            }
          } else {
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

  // Handle EVM account/chain changes (Phantom EVM or other EVM wallets)
  useEffect(() => {
    const provider =
      (window.phantom && window.phantom.ethereum) || window.ethereum;
    if (!provider) return;

    const handleAccountsChanged = (accounts) => {
      if (store.getState().wallet.walletType === "solana") return;
      if (!accounts[0]) {
        dispatch(setAddress(null));
        dispatch(setIsConnected(false));
      }
    };

    const handleChainChanged = (chainHex) => {
      if (store.getState().wallet.walletType === "phantom") return;
      dispatch(setChainId(parseInt(chainHex, 16)));
    };

    provider.on("accountsChanged", handleAccountsChanged);
    provider.on("chainChanged", handleChainChanged);
    return () => {
      provider.removeListener("accountsChanged", handleAccountsChanged);
      provider.removeListener("chainChanged", handleChainChanged);
    };
  }, [dispatch]);

  // Phantom: listen for account disconnect
  useEffect(() => {
    const provider = window.phantom?.solana;
    if (!provider) return;

    const handlePhantomAccountChanged = (pubkey) => {
      if (pubkey) return;
      if (store.getState().wallet.walletType !== "solana") return;
      dispatch(setAddress(null));
      dispatch(setChainId(null));
      dispatch(setIsConnected(false));
      dispatch(setWalletType(""));
    };
    provider.on("accountChanged", handlePhantomAccountChanged);
    return () => provider.off?.("accountChanged", handlePhantomAccountChanged);
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
          <Route path="/rewards" element={<PointsPage />} />

          <Route path="/trending" element={<TradingPage />} />
          <Route path="/staking" element={<StakingPage />} />
          <Route path="/history" element={<HistoryPage />} />
          <Route path="/referrals" element={<ReferralsPage />} />
        </Route>
      </Routes>
    </>
  );
}

export default App;
