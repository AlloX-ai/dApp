import { useEffect } from "react";
import { useNavigate } from "react-router";
import { useSelector } from "react-redux";
import { BetaAccessModal } from "../components/BetaAccessModal";

const BETA_ACCESS_KEY = "allox_beta_access";

export function BetaAccessPage({ onWalletConnect }) {
  const navigate = useNavigate();
  const isConnected = useSelector((state) => state.wallet.isConnected);

  useEffect(() => {
    const hasAccess = localStorage.getItem(BETA_ACCESS_KEY) === "true";
    if (hasAccess) {
      navigate("/", { replace: true });
      return;
    }
    if (isConnected) {
      localStorage.setItem(BETA_ACCESS_KEY, "true");
      navigate("/", { replace: true });
    }
  }, [navigate, isConnected]);

  const handleUnlock = () => {
    localStorage.setItem(BETA_ACCESS_KEY, "true");
    navigate("/", { replace: true });
  };

  if (isConnected) {
    return null;
  }

  return (
    <BetaAccessModal
      variant="page"
      onUnlock={handleUnlock}
      onWalletConnect={onWalletConnect}
    />
  );
}
