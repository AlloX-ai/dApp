import { useCallback, useState } from "react";
import { useSelector } from "react-redux";
import { useAccount, useSignMessage } from "wagmi";
import bs58 from "bs58";
import { apiCall } from "../utils/api";

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

export const useAuth = () => {
  const { address: evmAddress } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const walletAddress = useSelector((state) => state.wallet.address);
  const walletType = useSelector((state) => state.wallet.walletType);
 const isConnected = useSelector((state) => state.wallet.isConnected);
  const address =
    walletType === "phantom" ? walletAddress : (walletAddress ?? evmAddress);
  const [token, setToken] = useState(() => localStorage.getItem("authToken"));
  const [user, setUserState] = useState(loadStoredUser);

  const setUser = useCallback((nextUser) => {
    setUserState(nextUser);
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
  }, []);

  const authenticate = useCallback(async () => {
    if (!address) {
      throw new Error("Wallet not connected");
    }

    const nonceRes = await apiCall(`/auth/nonce/${address}`);
    const message = nonceRes.message;

    if (!message) {
      throw new Error("Missing nonce message");
    }

    let signature;

    if (walletType === "phantom") {
      const provider = window.phantom?.solana;
      if (!provider) throw new Error("Phantom not connected");
      const encodedMessage = new TextEncoder().encode(message);
      const signed = await provider.signMessage(encodedMessage, "utf8");
      const rawSig = signed?.signature ?? signed;
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

    localStorage.setItem("authToken", verifyRes.token);
    setToken(verifyRes.token);
    if (verifyRes.user) {
      setUser(verifyRes.user);
    }

    return { token: verifyRes.token, user: verifyRes.user };
  }, [address, walletType, signMessageAsync, setUser]);

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
    const res = await authenticate();
    return res?.token ?? token;
  }, [token, address, authenticate]);

  const logout = useCallback(() => {
    localStorage.removeItem("authToken");
    localStorage.removeItem(AUTH_USER_KEY);
    
    setToken(null);
    setUserState(null);
  }, []);

  return {
    token,
    user,
    setUser,
    authenticate,
    ensureAuthenticated,
    claimSeason1,
    logout,
    isAuthenticated: !!token,
  };
};
