import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { useSelector } from "react-redux";
import { BetaAccessModal } from "../components/BetaAccessModal";
import { useAuth } from "../hooks/useAuth";
import { toast } from "sonner";

export function BetaAccessPage({ onWalletConnect }) {
  const navigate = useNavigate();
  const isConnected = useSelector((state) => state.wallet.isConnected);
  const { isAuthenticated, authenticate } = useAuth();
  const [isSigning, setIsSigning] = useState(false);
  const authTriggeredRef = useRef(false);

  useEffect(() => {
    if (isAuthenticated) {
      navigate("/", { replace: true });
    }
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    if (!isConnected || isAuthenticated || authTriggeredRef.current) return;
    authTriggeredRef.current = true;
    setIsSigning(true);
    authenticate()
      .then(() => navigate("/", { replace: true }))
      .catch((err) => {
        console.error("Auth error:", err);
        // toast.error(err?.message || "Failed to sign. Please try again.");
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

  if (isAuthenticated) {
    return null;
  }

  return (
    <BetaAccessModal
      variant="page"
      onUnlock={handleRetrySign}
      onWalletConnect={onWalletConnect}
      isSigning={isSigning}
    />
  );
}
