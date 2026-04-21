import { useCallback, useEffect, useRef, useState } from "react";
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
  setSessionSource,
  closeCheckinModal,
} from "./redux/slices/walletSlice";
import { useCreateWallet, usePrivy, useWallets } from "@privy-io/react-auth";
import {
  getPrivyEmbedded,
  switchPrivyEmbeddedToChain,
} from "./utils/privyWalletUtils";
import { setPrivyLogoutBridge } from "./auth/privyLogoutBridge";
import { isPrivySessionActive } from "./utils/privySession";
import { resetPoints, setPointsBalance } from "./redux/slices/pointsSlice";
import { clearCheckin } from "./redux/slices/checkinSlice";
import { useAuth } from "./hooks/useAuth";
import { completePrivyAuth } from "./hooks/useAuth";
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
import { useSocial } from "./hooks/useSocial";
import { CongratsModal } from "./components/CongratsModal";
import { AIChatWidget } from "./components/AiChatWidget";
import { CampaignsPage } from "./pages/Campaigns";
import { PrivyFundModal } from "./components/PrivyFundModal";
import { MaintenancePage } from "./pages/MaintenancePage";
import { TopPortfoliosPage } from "./pages/TopPortfoliosPage";
import { WatchlistPage } from "./pages/WatchlistPage";

const MAINTENANCE_MODE = false;

const SOLANA_MAINNET_CHAIN_ID = 101;
const PREFERRED_CHAIN_STORAGE_KEY = "walletPreferredChainId";

/** Avoid EVM (wagmi) and Solana (adapter) fighting for the same MetaMask session. */
async function disconnectAllEvmWagmi() {
  try {
    const connections = getConnections(wagmiClient);
    for (const c of connections) {
      await disconnect(wagmiClient, { connector: c.connector });
    }
  } catch (e) {
    console.warn("disconnectAllEvmWagmi:", e);
  }
}

function getStoredAuthUser() {
  return null;
}

function hasPrivyEmbeddedWallet(user) {
  if (!user) return false;
  const accounts = user.linkedAccounts ?? user.linked_accounts ?? [];
  return accounts.some(
    (a) =>
      a.type === "wallet" &&
      (a.walletClientType === "privy" || a.wallet_client_type === "privy"),
  );
}

/** After Privy login, move embedded wallet to BNB Chain (56) so check-in and on-chain flows match Redux. */
function PrivyEnsureBnbChain() {
  const { user } = useAuth();
  const { wallets, ready } = useWallets();
  const hasRun = useRef(false);

  useEffect(() => {
    if (!ready || user?.authProvider !== "privy") return;
    if (hasRun.current) return;
    const embedded = getPrivyEmbedded(wallets);
    if (!embedded) return;
    hasRun.current = true;
    let cancelled = false;
    (async () => {
      try {
        await switchPrivyEmbeddedToChain(embedded, 56);
      } catch (e) {
        if (!cancelled) console.warn("Privy default BNB chain:", e);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [ready, user?.authProvider, wallets]);

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
    disconnect: disconnectSolana,
  } = useWallet();

  const {
    address,
    isConnected,
    walletModal,
    walletType,
    checkinModal,
    chainId,
  } = useSelector((state) => state.wallet);
  const [fundModalOpen, setFundModalOpen] = useState(false);
  const { token, user, logout, ensureAuthenticated } = useAuth();
  const {
    login,
    authenticated,
    user: privyUser,
    getAccessToken,
    ready: privyReady,
  } = usePrivy();
  const { createWallet } = useCreateWallet();
  const [isPrivyVerifying, setIsPrivyVerifying] = useState(false);
  const privyVerifyAttemptedRef = useRef(false);

  useEffect(() => {
    if (user?.authProvider !== "privy" || !user?.address) return;
    dispatch(setSessionSource("privy"));
    dispatch(setAddress(user.address));
    dispatch(setIsConnected(true));
    dispatch(setWalletType(user.walletType || "privy"));
    // On-chain execution uses BNB Chain (56); keeps quick wizard / chat BSC gates in sync for Privy users
    dispatch(setChainId(56));
  }, [user?.authProvider, user?.address, user?.walletType, dispatch]);

  // Reset auth trigger only when wallet identity genuinely switches (not on initial connect).
  // Using prevAddressRef/prevWalletTypeRef to detect account/type changes vs. initial settle.
  useEffect(() => {
    const prevAddr = prevAddressRef.current;
    const prevType = prevWalletTypeRef.current;
    prevAddressRef.current = address;
    prevWalletTypeRef.current = walletType;

    // Account switch: had a real address before and it changed
    const addrSwitch = prevAddr && address && prevAddr.toLowerCase() !== address.toLowerCase();
    // Wallet type switch: had a real type before and it changed (e.g. evm → solana)
    const typeSwitch = prevType && walletType && prevType !== walletType;

    if (!address || addrSwitch || typeSwitch) {
      authTriggeredRef.current = false;
    }
  }, [address, walletType]);

  // Auto-sign: when wallet connects and no token exists, trigger sign message.
  // Skip Privy sessions — their re-auth goes through `completePrivyAuth`
  // (below). Calling `ensureAuthenticated()` here for a Privy user would
  // fall through to wagmi's `signMessageAsync`, which throws
  // "Connector not connected" because Privy doesn't register a wagmi
  // connector.
  useEffect(() => {
    if (!isConnected) {
      authTriggeredRef.current = false;
      return;
    }
    if (token) {
      dispatch(setWalletModal(false));
      return;
    }
    if (walletType === "privy" || user?.authProvider === "privy") return;
    if (authTriggeredRef.current) return;
    authTriggeredRef.current = true;
    ensureAuthenticated()
      .then(() => dispatch(setWalletModal(false)))
      .catch(() => {
        authTriggeredRef.current = false;
      });
  }, [
    isConnected,
    token,
    address,
    walletType,
    user?.authProvider,
    ensureAuthenticated,
    dispatch,
  ]);

  useEffect(() => {
    if (!authenticated) {
      privyVerifyAttemptedRef.current = false;
    }
  }, [authenticated]);

  // When the app JWT is cleared while the Privy session is still alive
  // (e.g. a 7-day refresh/`/auth/refresh` failure in api.js), reset the
  // "already attempted" guard so the re-verify effect below gets another
  // chance to call `completePrivyAuth` with a fresh Privy access token.
  // Without this, the user gets stuck logged-out until they manually
  // disconnect and reconnect Privy.
  useEffect(() => {
    if (!token && authenticated) {
      privyVerifyAttemptedRef.current = false;
    }
  }, [token, authenticated]);

  useEffect(() => {
    if (!authenticated || token) return;
    if (!privyUser) return;
    if (privyVerifyAttemptedRef.current) return;
    privyVerifyAttemptedRef.current = true;
    setIsPrivyVerifying(true);

    (async () => {
      try {
        if (!hasPrivyEmbeddedWallet(privyUser)) {
          await createWallet();
        }
        const t = await getAccessToken();
        if (!t) throw new Error("No Privy access token");
        await completePrivyAuth(t);
      } catch (err) {
        console.error("Privy verify:", err);
        privyVerifyAttemptedRef.current = false;
        toast.error(err?.message || "Sign-in failed. Please try again.");
      } finally {
        setIsPrivyVerifying(false);
      }
    })();
  }, [authenticated, token, privyUser, createWallet, getAccessToken]);
  const {
    status: checkinStatus,
    claim: claimCheckin,
    fetchStatus: fetchCheckinStatus,
    addOptimisticCheckinPoints,
    loading: checkinLoading,
  } = useCheckin();

  const { fetchSocialPoints, fetchAllPoints, loadSeenPosts } = useSocial();
  useEffect(() => {
    if (!isConnected || !authenticated) return;
    fetchSocialPoints();
    fetchAllPoints();
    loadSeenPosts();
  }, [
    isConnected,
    authenticated,
    fetchSocialPoints,
    fetchAllPoints,
    loadSeenPosts,
  ]);

  const handleDisconnect = useCallback(async () => {
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
    dispatch(setSessionSource(null));
    dispatch(setViewingHistorySessionId(null));
    dispatch(setCurrentMessages([]));
    dispatch(clearCheckin());
    // Fully clear auth state (token + user) across the app (includes Privy logout via bridge)
    await logout();
  });

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
        typeof limit.messagesRemaining === "number" ||
        typeof limit.bonusMessages === "number")
    ) {
      dispatch(setRateLimit(user?.season1?.rateLimit));
    }
  }, [
    user?.season1?.rateLimit,
    user?.season1?.rateLimit?.remaining,
    user?.season1?.rateLimit?.messagesRemaining,
    user?.season1?.rateLimit?.bonusMessages,
    dispatch,
  ]);

  useEffect(() => {
    if (wasConnectedRef.current && !isConnected) {
      const hasAuth = !!localStorage.getItem("authToken");
      if (!hasAuth) {
        localStorage.removeItem("authToken");

        dispatch(setViewingHistorySessionId(null));
        dispatch(setCurrentMessages([]));
      }
    }
    wasConnectedRef.current = isConnected;
  }, [dispatch, isConnected, navigate]);

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
      dispatch(setViewingHistorySessionId(null));
      dispatch(setCurrentMessages([]));
      dispatch(resetPoints());
      handleDisconnect();
    }

    prevAddressRef.current = address;
    prevWalletTypeRef.current = walletType;
  }, [address, walletType, dispatch, handleDisconnect]);

  const setWalletModalOpen = (nextValue) => {
    dispatch(setWalletModal(nextValue));
  };

  const allConnectors = wagmiClient.connectors;

  const handleWalletConnect = async (option) => {
    // Solana wallets (MetaMask via Wallet Standard, Phantom) – Redux is synced by WalletSync when adapter connects
    if (option.isSolana || option.walletType === "solana" || option.walletType === "phantom" || option.isPhantom) {
      const isPhantom = option.isPhantom || option.walletType === "phantom";
      const searchName = isPhantom ? "phantom" : "metamask";
      const solanaWallet = solanaWallets.find((w) =>
        w.adapter?.name?.toLowerCase?.().includes(searchName),
      );
      if (!solanaWallet) {
        toast.error(
          isPhantom
            ? "Phantom wallet not found. Install the Phantom browser extension."
            : "MetaMask with Solana support not found. Install or enable MetaMask.",
        );
        return;
      }
      try {
        await disconnectAllEvmWagmi();
        selectSolanaWallet(solanaWallet.adapter.name);
        await solanaWallet.adapter.connect();
        dispatch(setSessionSource("wallet"));
      } catch (err) {
        console.error("Solana wallet connection error:", err);
        toast.error("Failed to connect " + option.name + " for Solana. Please try again.");
      }
      return;
    }

    // EVM wallets – match by name
    try {
      await disconnectSolana();
    } catch (e) {
      console.warn("Solana disconnect before EVM:", e);
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
          dispatch(setSessionSource("wallet"));
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
            dispatch(setSessionSource("wallet"));
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
      <PrivyEnsureBnbChain />
      <Header
        isConnected={isConnected}
        onConnectClick={() => setWalletModalOpen(true)}
        coinbase={address}
        onDisconnectClick={handleDisconnect}
        onOpenFundModal={() => setFundModalOpen(true)}
      />

      <PrivyFundModal
        open={fundModalOpen}
        onClose={() => setFundModalOpen(false)}
        walletChainId={chainId}
        coinbase={address}
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
        isSigning={isPrivyVerifying}
        signingMessage="Setting up your wallet..."
        onPrivySignIn={() => login()}
        privyReady={privyReady}
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
    disconnect: disconnectSolanaAdapter,
  } = useWallet();

  const setWalletModalOpen = (nextValue) => {
    dispatch(setWalletModal(nextValue));
  };

  const handleWalletConnect = async (option) => {
    if (option.isSolana || option.walletType === "solana" || option.walletType === "phantom" || option.isPhantom) {
      const isPhantom = option.isPhantom || option.walletType === "phantom";
      const searchName = isPhantom ? "phantom" : "metamask";
      const solanaWallet = solanaWallets.find((w) =>
        w.adapter?.name?.toLowerCase?.().includes(searchName),
      );
      if (!solanaWallet) {
        toast.error(
          isPhantom
            ? "Phantom wallet not found. Install the Phantom browser extension."
            : "MetaMask with Solana support not found. Install or enable MetaMask.",
        );
        return;
      }
      try {
        await disconnectAllEvmWagmi();
        selectSolanaWallet(solanaWallet.adapter.name);
        await solanaWallet.adapter.connect();
        dispatch(setWalletModal(false));
        dispatch(setSessionSource("wallet"));
      } catch (err) {
        console.error("Solana wallet connection error:", err);
        toast.error("Failed to connect " + option.name + " for Solana. Please try again.");
      }
      return;
    }

    try {
      await disconnectSolanaAdapter();
    } catch (e) {
      console.warn("Solana disconnect before EVM:", e);
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
          dispatch(setSessionSource("wallet"));
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
            dispatch(setSessionSource("wallet"));
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
  const solanaActiveRef = useRef(false);
  const { authenticated, user: privyUser } = usePrivy();
  const { wallets: privyWallets, ready: privyWalletsReady } = useWallets();

  // Eagerly restore Phantom only when NOT on login (per Phantom docs: use onlyIfTrusted for page load).
  // Skip on /login so logout doesn’t trigger reconnection and popup.
  const { connected: solanaConnected, publicKey: solanaPublicKey } =
    useWallet();

  useEffect(() => {
    solanaActiveRef.current = !!(solanaConnected && solanaPublicKey);
  }, [solanaConnected, solanaPublicKey]);

  // Restore Privy connected wallet on reload (without relying on localStorage authUser).
  useEffect(() => {
    if (!authenticated || !privyWalletsReady) return;
    if (solanaConnected && solanaPublicKey) return;

    const embedded = getPrivyEmbedded(privyWallets);
    const connected = embedded ?? privyWallets?.[0];
    const linkedWallet = (privyUser?.linkedAccounts ?? []).find(
      (a) => a?.type === "wallet" && a?.address,
    );
    const address = connected?.address ?? linkedWallet?.address ?? null;

    if (address) {
      dispatch(setWalletType("privy"));
      dispatch(setSessionSource("privy"));
      dispatch(setAddress(address));
      dispatch(setIsConnected(true));
      const connectedChainId = Number(connected?.chainId);
      dispatch(setChainId(Number.isFinite(connectedChainId) ? connectedChainId : 56));
    }
  }, [
    authenticated,
    privyWalletsReady,
    privyWallets,
    privyUser,
    solanaConnected,
    solanaPublicKey,
    dispatch,
  ]);

  useEffect(() => {
    const currentWalletType = store.getState().wallet.walletType;
    if (solanaConnected && solanaPublicKey) {
      dispatch(setWalletType("solana"));
      dispatch(setAddress(solanaPublicKey.toBase58()));
      dispatch(setChainId(SOLANA_MAINNET_CHAIN_ID));
      dispatch(setIsConnected(true));
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
      const walletType = store.getState().wallet.walletType;
      if (walletType === "solana") return;

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
            dispatch(setSessionSource("wallet"));
          }
          break;
        case "reconnecting":
          if (!isPrivySessionActive()) dispatch(setIsConnected(false));
          break;
        case "connecting":
          if (!isPrivySessionActive() || !localStorage.getItem("authToken"))
            dispatch(setIsConnected(false));
          break;
        case "disconnected":
        default:
          if (disconnectTimeoutId) clearTimeout(disconnectTimeoutId);
          disconnectTimeoutId = setTimeout(() => {
            disconnectTimeoutId = null;
            if (isPrivySessionActive() || localStorage.getItem("authToken"))
              return;
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
      async onChange(connections) {
        if (connections.length === 0) {
          if (clearTimeoutId) clearTimeout(clearTimeoutId);
          clearTimeoutId = setTimeout(() => {
            clearTimeoutId = null;
            if (localStorage.getItem("authToken")) return;
            if (store.getState().wallet.walletType !== "solana") {
              dispatch(setAddress(null));
              dispatch(setIsConnected(false));
              dispatch(setWalletType(""));
            }
            if (isPrivySessionActive()) return;
            dispatch(setAddress(null));
            dispatch(setIsConnected(false));
            dispatch(setWalletType(""));
            window.WALLET_TYPE = null;
          }, 400);
        } else {
          if (
            solanaActiveRef.current ||
            store.getState().wallet.walletType === "solana"
          ) {
            return;
          }
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
            dispatch(setSessionSource("wallet"));
            window.WALLET_TYPE = "metamask";
          }
          if (activeConnection.connector.type === "binanceWallet") {
            dispatch(setWalletType("evm"));
            dispatch(setIsConnected(true));
            dispatch(setSessionSource("wallet"));
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
                  dispatch(setSessionSource("wallet"));
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
            dispatch(setSessionSource("wallet"));
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
        if (isPrivySessionActive()) return;
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

function PrivyLogoutBridge() {
  const { logout: privyLogout } = usePrivy();
  useEffect(() => {
    setPrivyLogoutBridge(privyLogout);
    return () => setPrivyLogoutBridge(null);
  }, [privyLogout]);
  return null;
}

function App() {
  const { address } = useSelector((state) => state.wallet);
  const { isAuthenticated } = useAuth();

  // const [showModal, setShowModal] = useState(false);
  // const lastShown = localStorage.getItem("chatDate");
  // const count = parseInt(localStorage.getItem("chatCount") || "0", 10);
  // useEffect(() => {
  //   const today = new Date().toDateString();
  //   // App only decides visibility; storage updates happen in CongratsModal after open.
  //   setShowModal(lastShown !== today && count < 3);
  // }, [lastShown, count]);
  
  // const [showModal, setShowModal] = useState(false);
  // const lastShown = localStorage.getItem("chatDate");
  // const count = parseInt(localStorage.getItem("chatCount") || "0", 10);
  // useEffect(() => {
  //   const today = new Date().toDateString();
  //   // App only decides visibility; storage updates happen in CongratsModal after open.
  //   setShowModal(lastShown !== today && count < 3);
  // }, [lastShown, count]);

  if (MAINTENANCE_MODE) {
    return (
      <>
        <Toaster position="top-right" richColors closeButton />
        <MaintenancePage />
      </>
    );
  }

  return (
    <>
      <PrivyLogoutBridge />
      <Toaster position="top-right" richColors closeButton />
      <Routes>
        <Route path="/login" element={<Navigate to="/" replace />} />
        <Route path="/" element={<LaunchAppLayout />}>
          <Route index element={<ChatPage />} />
          <Route path="/portfolio" element={<PortfolioPage />} />
          <Route path="/top-portfolios" element={<TopPortfoliosPage />} />
          <Route path="/campaigns" element={<CampaignsPage />} />
          <Route path="/watchlist" element={<WatchlistPage />} />
          <Route path="/rewards" element={<PointsPage />} />

          <Route path="/trending" element={<TradingPage />} />
          <Route path="/staking" element={<StakingPage />} />
          <Route path="/history" element={<HistoryPage />} />
          <Route path="/referrals" element={<ReferralsPage />} />
        </Route>
      </Routes>
      {/* {showModal && (
        <CongratsModal
          isOpen={showModal}
          onClose={() => {
            setShowModal(false);
          }}
          address={address}
        />
      )} */}
      {isAuthenticated && <AIChatWidget />}
    </>
  );
}

export default App;
