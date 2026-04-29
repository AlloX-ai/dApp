import { useCallback, useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useAccount, useSignMessage } from "wagmi";
import { useWallet } from "@solana/wallet-adapter-react";
import bs58 from "bs58";
import {
  apiCall,
  AUTH_TOKEN_CHANGED_EVENT,
  getApiUrl,
  refreshAuthToken,
} from "../utils/api";
import { setWalletType } from "../redux/slices/walletSlice";
import { runPrivyLogoutBridge } from "../auth/privyLogoutBridge";
import { toast } from "../utils/toast";

// Simple in-module singleton so all `useAuth` hook instances
// share the same `user` and `token` state instead of each
// component keeping its own copy.
let globalAuthState = {
  token: typeof window !== "undefined"
    ? localStorage.getItem("authToken")
    : null,
  user: null,
};

// Persisted auth-provider marker. The backend returns `authProvider: "privy"`
// at the top level of `/auth/privy-verify`, but `/auth/me` does NOT echo it
// back. On a hard reload we hydrate `user` from `/auth/me` and would lose
// the Privy signal entirely — which silently breaks gates like the "Add
// funds" button in the header. We stash the provider in localStorage at
// login time and stitch it back onto the user object whenever the response
// is missing it. Cleared on logout so a subsequent wallet login can't
// inherit a stale "privy" marker.
const AUTH_PROVIDER_STORAGE_KEY = "authProvider";

const readStoredAuthProvider = () => {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(AUTH_PROVIDER_STORAGE_KEY);
  } catch {
    return null;
  }
};

const writeStoredAuthProvider = (provider) => {
  if (typeof window === "undefined") return;
  try {
    if (provider) {
      localStorage.setItem(AUTH_PROVIDER_STORAGE_KEY, provider);
    } else {
      localStorage.removeItem(AUTH_PROVIDER_STORAGE_KEY);
    }
  } catch (e) {
    console.error(e);
  }
};

const withPersistedAuthProvider = (candidateUser) => {
  if (!candidateUser || typeof candidateUser !== "object") return candidateUser;
  if (candidateUser.authProvider) return candidateUser;
  const stored = readStoredAuthProvider();
  if (!stored) return candidateUser;
  return { ...candidateUser, authProvider: stored };
};

const subscribers = new Set();
let meFetchInFlight = null;
let lastMeFetchAt = 0;
const ME_FETCH_COOLDOWN_MS = 5000;

// Fires at most once per app load: refreshes a potentially-near-expiry JWT
// before the user hits the first 401. Subsequent refreshes are handled
// reactively inside api.js on 401 or proactively via `maybeProactiveRefresh`.
let initialRefreshAttempted = false;

// Global auth in-flight dedup — shared across all hook instances and React render cycles.
// Prevents double sign requests when React effects re-run due to walletType/address settling.
let globalAuthInFlight = null;
let globalAuthInFlightAddress = null;

const notifySubscribers = () => {
  for (const cb of subscribers) {
    try {
      cb(globalAuthState);
    } catch (e) {
      console.error(e);
    }
  }
};

const dispatchTokenChanged = (nextToken) => {
  if (typeof window === "undefined") return;
  try {
    window.dispatchEvent(
      new CustomEvent(AUTH_TOKEN_CHANGED_EVENT, {
        detail: { token: nextToken },
      }),
    );
  } catch (e) {
    console.error(e);
  }
};

const setGlobalToken = (nextToken) => {
  const prev = globalAuthState.token;
  globalAuthState = { ...globalAuthState, token: nextToken };
  if (nextToken != null) {
    try {
      localStorage.setItem("authToken", nextToken);
    } catch (e) {
      console.error(e);
    }
  } else {
    try {
      localStorage.removeItem("authToken");
    } catch (e) {
      console.error(e);
    }
  }
  notifySubscribers();
  if (prev !== nextToken) {
    dispatchTokenChanged(nextToken);
  }
};

const setGlobalUser = (nextUser) => {
  const resolvedUser =
    typeof nextUser === "function" ? nextUser(globalAuthState.user) : nextUser;
  globalAuthState = { ...globalAuthState, user: resolvedUser };
  notifySubscribers();
};

// Keep React state in sync whenever api.js silently refreshes (or clears) the
// JWT. Without this listener, components call useAuth() and keep reading the
// stale token that was captured at mount — so after a 7-day expiry + refresh
// the UI would still show the old token in state even though localStorage was
// updated. When the refresh fails (token cleared to null), also drop `user`
// so gates like `isAuthenticated` flip to logged-out immediately.
if (typeof window !== "undefined") {
  window.addEventListener(AUTH_TOKEN_CHANGED_EVENT, (event) => {
    const nextToken = event?.detail?.token ?? null;
    if (globalAuthState.token === nextToken) return;
    globalAuthState = { ...globalAuthState, token: nextToken };
    if (nextToken == null) {
      globalAuthState = { ...globalAuthState, user: null };
      lastMeFetchAt = 0;
    }
    notifySubscribers();
  });
}

/**
 * Exchange Privy access token for app JWT + user (same contract as wallet /auth/verify).
 * Does not send Bearer — this endpoint uses privyToken only.
 */
export async function completePrivyAuth(privyToken) {
  if (!privyToken) {
    throw new Error("Missing Privy token");
  }
  const res = await fetch(`${getApiUrl()}/auth/privy-verify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ privyToken }),
  });
  let data = {};
  try {
    data = await res.json();
  } catch {
    data = {};
  }
  if (!res.ok) {
    throw {
      status: res.status,
      message: data.error || data.message || "Privy verification failed",
      data,
    };
  }
  if (!data.token) {
    throw new Error("Missing auth token");
  }
  setGlobalToken(data.token);
  const resolvedProvider =
    data.authProvider != null
      ? data.authProvider
      : data.user?.authProvider != null
        ? data.user.authProvider
        : "privy";
  // Persist so reloads (which hydrate from `/auth/me`, an endpoint that
  // strips `authProvider`) can still identify the session as Privy.
  writeStoredAuthProvider(resolvedProvider);
  const nextUser = data.user
    ? {
        ...data.user,
        authProvider: resolvedProvider,
      }
    : null;
  if (nextUser) {
    setGlobalUser(nextUser);
  }
  return data;
}

export const useAuth = () => {
  const dispatch = useDispatch();
  const { address: evmAddress } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const { signMessage: signMessageSolana } = useWallet();
  const walletAddress = useSelector((state) => state.wallet.address);
  const walletType = useSelector((state) => state.wallet.walletType);

  const address =
    walletType === "solana" ? walletAddress : (walletAddress ?? evmAddress);
  const [state, setState] = useState(globalAuthState);

  useEffect(() => {
    subscribers.add(setState);
    return () => {
      subscribers.delete(setState);
    };
  }, []);

  const { token, user } = state;

  const refreshUser = useCallback(async () => {
    const t = token || localStorage.getItem("authToken");
    if (!t) return null;
    const now = Date.now();
    if (
      globalAuthState.user &&
      now - lastMeFetchAt < ME_FETCH_COOLDOWN_MS
    ) {
      return globalAuthState.user;
    }
    if (meFetchInFlight) return meFetchInFlight;
    meFetchInFlight = apiCall("/auth/me")
      .then((me) => {
        lastMeFetchAt = Date.now();
        if (me && typeof me === "object") {
          // `/auth/me` drops `authProvider`; re-attach from localStorage so
          // downstream gates (e.g. header "Add funds") survive a reload.
          setGlobalUser(withPersistedAuthProvider(me));
        }
        return me;
      })
      .finally(() => {
        meFetchInFlight = null;
      });
    return meFetchInFlight;
  }, [token]);

  useEffect(() => {
    if (!token || user) return;
    refreshUser().catch(() => {});
  }, [token, user, refreshUser]);

  // On first mount with an existing token, kick the proactive refresh so a
  // session that's been idle past (or near) the 7-day window is renewed
  // before the user's next interaction hits a 401. Guarded by a module-level
  // flag so it never fires again after the refresh response swaps the token.
  useEffect(() => {
    if (!token || initialRefreshAttempted) return;
    initialRefreshAttempted = true;
    refreshAuthToken().catch((e) =>
      console.error("Initial token refresh failed:", e),
    );
  }, [token]);

  const setUser = useCallback((nextUser) => {
    setGlobalUser(nextUser);
  }, []);

  const refreshToken = useCallback(async () => {
    return refreshAuthToken();
  }, []);

  const authenticate = useCallback(async () => {
    if (!address) {
      throw new Error("Wallet not connected");
    }

    const toastId = "wallet-auth-details";

    try {
      toast.loading("Preparing wallet verification...", { id: toastId });
      const nonceRes = await apiCall(`/auth/nonce/${address}`);
      const message = nonceRes.message;
      const rawWalletType = nonceRes.walletType ?? walletType;
      const walletTypeFromApi =
        rawWalletType === "phantom" || rawWalletType === "solana"
          ? "solana"
          : rawWalletType || "evm";

      if (!message) {
        throw new Error("Missing nonce message");
      }

      let signature;

      const SIGN_TIMEOUT_MS = 5 * 60 * 1000;
      const signTimeout = (promise) =>
        Promise.race([
          promise,
          new Promise((_, reject) =>
            setTimeout(
              () =>
                reject(
                  new Error(
                    "Sign request timed out. Open your wallet app and try again.",
                  ),
                ),
              SIGN_TIMEOUT_MS,
            ),
          ),
        ]);

      toast.loading(
        walletTypeFromApi === "solana"
          ? "Please approve the signature in your Solana wallet."
          : "Please approve the signature in your wallet app.",
        { id: toastId },
      );

      if (walletTypeFromApi === "solana") {
        if (!signMessageSolana) throw new Error("Solana wallet not connected");
        const encodedMessage = new TextEncoder().encode(message);
        const rawSig = await signTimeout(signMessageSolana(encodedMessage));
        signature =
          typeof rawSig === "string"
            ? rawSig
            : bs58.encode(new Uint8Array(rawSig));
      } else {
        signature = await signTimeout(signMessageAsync({ message }));
      }

      toast.loading("Signature received. Verifying with AlloX...", {
        id: toastId,
      });

      const verifyRes = await apiCall("/auth/verify", {
        method: "POST",
        body: JSON.stringify({ address, signature }),
      });

      if (!verifyRes.token) {
        throw new Error("Missing auth token");
      }

      // Always persist user with walletType and address so session restore and guards work after navigate
      setGlobalToken(verifyRes.token);
      // Wallet-based login — clear any stale Privy marker a previous session
      // might have left behind in localStorage.
      writeStoredAuthProvider(null);
      if (verifyRes.user) {
        setUser({
          ...verifyRes.user,
          walletType: walletTypeFromApi,
          address: verifyRes.user.address ?? address,
        });
      } else {
        setUser({ walletType: walletTypeFromApi, address });
      }

      if (walletTypeFromApi) {
        dispatch(setWalletType(walletTypeFromApi));
      }

      toast.success("Wallet connected and verified.", { id: toastId });
      return { token: verifyRes.token, user: verifyRes.user };
    } catch (error) {
      const message =
        error?.message || error?.data?.error || "Wallet verification failed";
      toast.error(message, { id: toastId });
      throw error;
    }
  }, [address, walletType, signMessageAsync, signMessageSolana, setUser, dispatch]);

  const claimSeason1 = useCallback(async () => {
    const t = token || localStorage.getItem("authToken");
    if (!t) {
      throw new Error("Not authenticated");
    }
    return apiCall("/season1/claim", { method: "POST" });
  }, [token]);

  const ensureAuthenticated = useCallback(async () => {
    // Read globalAuthState.token directly (not the React closure `token`) so we
    // see the token immediately after it is saved — before React re-renders.
    // This prevents the race window where a second call arrives after
    // authenticate() resolves but before the React state update propagates,
    // causing a duplicate sign request (visible on mobile with Binance/MetaMask).
    const currentToken = globalAuthState.token || localStorage.getItem("authToken");
    if (currentToken) {
      if (currentToken !== globalAuthState.token) setGlobalToken(currentToken);
      return currentToken;
    }
    if (!address) throw new Error("Wallet not connected");
    // Reuse in-flight promise for the same address to prevent double sign
    if (globalAuthInFlight && globalAuthInFlightAddress === address) {
      return globalAuthInFlight;
    }
    globalAuthInFlightAddress = address;
    globalAuthInFlight = authenticate()
      .then((res) => res?.token ?? globalAuthState.token)
      .finally(() => {
        globalAuthInFlight = null;
        globalAuthInFlightAddress = null;
      });
    return globalAuthInFlight;
  }, [address, authenticate]);

  const logout = useCallback(async () => {
    await runPrivyLogoutBridge();
    setGlobalToken(null);
    setGlobalUser(null);
    // Clear so the next (possibly wallet-based) login doesn't inherit the
    // previous Privy session's provider marker.
    writeStoredAuthProvider(null);
    initialRefreshAttempted = false;
    try {
      localStorage.removeItem("chatCount");
      localStorage.removeItem("chatDate");
    } catch (e) {
      console.error(e);
    }
  }, []);

  // Resilient to state/localStorage race after navigate: treat as authenticated if token is in state or localStorage
  const isAuthenticated =
    !!token || (typeof localStorage !== "undefined" && !!localStorage.getItem("authToken"));

  return {
    token,
    user,
    setUser,
    authenticate,
    ensureAuthenticated,
    claimSeason1,
    refreshUser,
    refreshToken,
    logout,
    isAuthenticated,
  };
};