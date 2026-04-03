import { useCallback, useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useAccount, useSignMessage } from "wagmi";
import { useWallet } from "@solana/wallet-adapter-react";
import bs58 from "bs58";
import { apiCall } from "../utils/api";
import { setWalletType } from "../redux/slices/walletSlice";

const AUTH_USER_KEY = "authUser";

const loadStoredUser = () => {
  try {
    const raw = localStorage.getItem(AUTH_USER_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error(e);
  }
  return null;
};

// Simple in-module singleton so all `useAuth` hook instances
// share the same `user` and `token` state instead of each
// component keeping its own copy.
let globalAuthState = {
  token: typeof window !== "undefined"
    ? localStorage.getItem("authToken")
    : null,
  user: typeof window !== "undefined" ? loadStoredUser() : null,
};

const subscribers = new Set();

const notifySubscribers = () => {
  for (const cb of subscribers) {
    try {
      cb(globalAuthState);
    } catch (e) {
      console.error(e);
    }
  }
};

const setGlobalToken = (nextToken) => {
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
};

const setGlobalUser = (nextUser) => {
  globalAuthState = { ...globalAuthState, user: nextUser };
  if (nextUser != null) {
    try {
      localStorage.setItem(AUTH_USER_KEY, JSON.stringify(nextUser));
    } catch (e) {
      console.error(e);
    }
  } else {
    try {
      localStorage.removeItem(AUTH_USER_KEY);
    } catch (e) {
      console.error(e);
    }
  }
  notifySubscribers();
};

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

  const authInFlightRef = useRef(null);

  useEffect(() => {
    authInFlightRef.current = null;
  }, [address, walletType]);

  const setUser = useCallback((nextUser) => {
    setGlobalUser(nextUser);
  }, []);

  const authenticate = useCallback(async () => {
    if (!address) {
      throw new Error("Wallet not connected");
    }

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

    if (walletTypeFromApi === "solana") {
      if (!signMessageSolana) throw new Error("Solana wallet not connected");
      const encodedMessage = new TextEncoder().encode(message);
      const rawSig = await signMessageSolana(encodedMessage);
      signature =
        typeof rawSig === "string"
          ? rawSig
          : bs58.encode(new Uint8Array(rawSig));
    } else {
      signature = await signMessageAsync({ message });
    }

    const verifyRes = await apiCall("/auth/verify", {
      method: "POST",
      body: JSON.stringify({ address, signature }),
    });

    if (!verifyRes.token) {
      throw new Error("Missing auth token");
    }

    // Always persist user with walletType and address so session restore and guards work after navigate
    setGlobalToken(verifyRes.token);
    if (verifyRes.user) {
      setUser({
        ...verifyRes.user,
        walletType: walletTypeFromApi,
        address: verifyRes.user.address ?? address,
      });
    } else {
      const stored = loadStoredUser();
      setUser(
        stored
          ? { ...stored, walletType: walletTypeFromApi, address: stored.address ?? address }
          : { walletType: walletTypeFromApi, address },
      );
    }

    if (walletTypeFromApi) {
      dispatch(setWalletType(walletTypeFromApi));
    }

    return { token: verifyRes.token, user: verifyRes.user };
  }, [address, walletType, signMessageAsync, signMessageSolana, setUser, dispatch]);

  const claimSeason1 = useCallback(async () => {
    const t = token || localStorage.getItem("authToken");
    if (!t) {
      throw new Error("Not authenticated");
    }
    return apiCall("/season1/claim", { method: "POST" });
  }, [token]);

  const ensureAuthenticated = useCallback(async () => {
    if (token) return token;
    if (!address) throw new Error("Wallet not connected");
    if (authInFlightRef.current) return authInFlightRef.current;
    const p = authenticate()
      .then((res) => res?.token ?? token)
      .finally(() => {
        authInFlightRef.current = null;
      });
    authInFlightRef.current = p;
    return p;
  }, [token, address, authenticate]);

  const logout = useCallback(() => {
    setGlobalToken(null);
    setGlobalUser(null);
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
    logout,
    isAuthenticated,
  };
};
