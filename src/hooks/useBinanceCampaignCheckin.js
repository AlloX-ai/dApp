import { useCallback, useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { useLocation } from "react-router";
import { useConnection } from "wagmi";
import { useAuth } from "./useAuth";
import { useCheckin } from "./useCheckin";
import { parseBinanceCampaignCheckinProgress } from "../utils/binanceCampaign";
import { isBinanceWalletConnection } from "../utils/binanceWallet";

export function useBinanceCampaignCheckin({ enabled = true } = {}) {
  const { pathname } = useLocation();
  const { isAuthenticated } = useAuth();
  const { connector } = useConnection();
  const checkinStatus = useSelector((state) => state.checkin?.status);
  const walletType = useSelector((state) => state.wallet.walletType);
  const sessionSource = useSelector((state) => state.wallet.sessionSource);
  const walletAddress = useSelector((state) => state.wallet.address);
  const isConnected = useSelector((state) => state.wallet.isConnected);
  const { fetchHistory } = useCheckin();

  const [history, setHistory] = useState(null);
  const [historyLoading, setHistoryLoading] = useState(false);

  const isBinanceCampaignRoute = pathname === "/bwcampaign";
  const isBinanceWallet = useMemo(
    () =>
      isBinanceWalletConnection({
        walletType,
        sessionSource,
        connector,
        address: walletAddress,
        isWalletConnected: isConnected,
      }),
    [walletType, sessionSource, connector, walletAddress, isConnected],
  );

  const shouldTrack =
    enabled && isAuthenticated && (isBinanceCampaignRoute || isBinanceWallet);

  const loadHistory = useCallback(async () => {
    if (!shouldTrack) {
      setHistory(null);
      return;
    }
    setHistoryLoading(true);
    try {
      const data = await fetchHistory();
      setHistory(data);
    } catch {
      setHistory(null);
    } finally {
      setHistoryLoading(false);
    }
  }, [fetchHistory, shouldTrack]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory, checkinStatus?.checkedInToday]);

  const progress = useMemo(
    () =>
      shouldTrack
        ? parseBinanceCampaignCheckinProgress({
            checkinStatus,
            checkinHistory: history,
          })
        : null,
    [checkinStatus, history, shouldTrack],
  );

  return {
    shouldShowCampaignCheckin: shouldTrack,
    isBinanceCampaignRoute,
    isBinanceWallet,
    progress,
    historyLoading,
    refreshProgress: loadHistory,
  };
}
