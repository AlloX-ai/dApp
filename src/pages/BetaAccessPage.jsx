import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { useDispatch, useSelector } from "react-redux";
import { usePrivy } from "@privy-io/react-auth";
import { BetaAccessModal } from "../components/BetaAccessModal";
import { useAuth, completePrivyAuth } from "../hooks/useAuth";
import {
  setAddress,
  setIsConnected,
  setSessionSource,
  setWalletType,
} from "../redux/slices/walletSlice";
import { toast } from "sonner";

export function BetaAccessPage({ onWalletConnect }) {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const isConnected = useSelector((state) => state.wallet.isConnected);
  const { login, authenticated, getAccessToken, ready: privyReady } =
    usePrivy();
  const { isAuthenticated, authenticate } = useAuth();
  const [isSigning, setIsSigning] = useState(false);
  const [isPrivyVerifying, setIsPrivyVerifying] = useState(false);
  const authTriggeredRef = useRef(false);
  const privyVerifyAttemptedRef = useRef(false);

  useEffect(() => {
    if (isAuthenticated) {
      navigate("/", { replace: true });
    }
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    if (!authenticated) {
      privyVerifyAttemptedRef.current = false;
    }
  }, [authenticated]);

  useEffect(() => {
    if (!authenticated || isAuthenticated) return;
    if (privyVerifyAttemptedRef.current) return;
    privyVerifyAttemptedRef.current = true;
    setIsPrivyVerifying(true);
    getAccessToken()
      .then((t) => completePrivyAuth(t))
      .then((data) => {
        const u = data.user;
        if (u?.address) {
          dispatch(setAddress(u.address));
          dispatch(setIsConnected(true));
          dispatch(setWalletType(u.walletType || "privy"));
          dispatch(setSessionSource("privy"));
        }
        navigate("/", { replace: true });
      })
      .catch((err) => {
        console.error("Privy verify:", err);
        privyVerifyAttemptedRef.current = false;
        toast.error(
          err?.message || "Sign-in failed. Please try again.",
        );
      })
      .finally(() => setIsPrivyVerifying(false));
  }, [authenticated, isAuthenticated, getAccessToken, navigate, dispatch]);

  useEffect(() => {
    if (!isConnected || isAuthenticated || authTriggeredRef.current) return;
    authTriggeredRef.current = true;
    setIsSigning(true);
    authenticate()
      .then(() => navigate("/", { replace: true }))
      .catch((err) => {
        console.error("Auth error:", err);
        authTriggeredRef.current = false;
      })
      .finally(() => setIsSigning(false));
  }, [isConnected, isAuthenticated, authenticate, navigate]);

  const handleRetrySign = async () => {
    if (!isConnected) return;
    setIsSigning(true);
    try {
      await authenticate();
      navigate("/", { replace: true });
    } catch (err) {
      toast.error(err?.message || "Failed to sign. Please try again.");
    } finally {
      setIsSigning(false);
    }
  };

  const handlePrivySignIn = () => {
    login();
  };

  if (isAuthenticated) {
    return null;
  }

  return (
    <BetaAccessModal
      variant="page"
      onUnlock={handleRetrySign}
      onWalletConnect={onWalletConnect}
      isSigning={isSigning || isPrivyVerifying}
      signingMessage={
        isPrivyVerifying ? "Completing sign-in…" : undefined
      }
      onPrivySignIn={handlePrivySignIn}
      privyReady={privyReady}
    />
  );
}
