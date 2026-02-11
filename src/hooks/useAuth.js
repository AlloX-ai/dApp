import { useCallback, useState } from "react";
import { useAccount, useSignMessage } from "wagmi";
import { apiCall } from "../utils/api";

export const useAuth = () => {
  const { address } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const [token, setToken] = useState(() =>
    localStorage.getItem("authToken"),
  );

  const authenticate = useCallback(async () => {
    if (!address) {
      throw new Error("Wallet not connected");
    }

    const nonceRes = await apiCall(`/auth/nonce/${address}`);
    const message = nonceRes.message;

    if (!message) {
      throw new Error("Missing nonce message");
    }

    const signature = await signMessageAsync({ message });
    const verifyRes = await apiCall("/auth/verify", {
      method: "POST",
      body: JSON.stringify({ address, signature }),
    });

    if (!verifyRes.token) {
      throw new Error("Missing auth token");
    }

    localStorage.setItem("authToken", verifyRes.token);
    setToken(verifyRes.token);
    return verifyRes.token;
  }, [address, signMessageAsync]);

  const logout = useCallback(() => {
    localStorage.removeItem("authToken");
    setToken(null);
  }, []);

  return { token, authenticate, logout, isAuthenticated: !!token };
};
