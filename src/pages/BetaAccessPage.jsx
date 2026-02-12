import { useEffect } from "react";
import { useNavigate } from "react-router";
import { BetaAccessModal } from "../components/BetaAccessModal";

const BETA_ACCESS_KEY = "allox_beta_access";

export function BetaAccessPage() {
  const navigate = useNavigate();

  useEffect(() => {
    const hasAccess = localStorage.getItem(BETA_ACCESS_KEY) === "true";
    if (hasAccess) {
      navigate("/", { replace: true });
    }
  }, [navigate]);

  const handleUnlock = () => {
    localStorage.setItem(BETA_ACCESS_KEY, "true");
    navigate("/", { replace: true });
  };

  return <BetaAccessModal variant="page" onUnlock={handleUnlock} />;
}
