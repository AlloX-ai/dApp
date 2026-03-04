import { useState, useMemo, useEffect } from "react";
const CONFETTI_POSITIONS = [...Array(8)].map(() => ({
  left: Math.random() * 100,
  x: (Math.random() - 0.5) * 60,
}));
import { createPortal } from "react-dom";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "sonner";
import {
  X,
  Gift,
  Check,
  Lock,
  Sparkles,
  Package,
  ChevronDown,
} from "lucide-react";

import { SOLANA_CHAIN_ID } from "../hooks/useCheckin";
import { setChainId } from "../redux/slices/walletSlice";

const PREFERRED_CHAIN_STORAGE_KEY = "walletPreferredChainId";

const CHECKIN_CHAINS = [
  {
    chainId: 1,
    chainHex: "0x1",
    name: "Ethereum",
    icon: "https://cdn.allox.ai/allox/networks/eth.svg",
    chainName: "Ethereum Mainnet",
    rpcUrls: ["https://cloudflare-eth.com"],
    blockExplorerUrls: ["https://etherscan.io"],
    nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  },
  {
    chainId: 56,
    chainHex: "0x38",
    name: "BNB Chain",
    icon: "https://cdn.allox.ai/allox/networks/bnbIcon.svg",
    chainName: "BNB Smart Chain",
    rpcUrls: ["https://bsc-dataseed.binance.org"],
    blockExplorerUrls: ["https://bscscan.com"],
    nativeCurrency: { name: "BNB", symbol: "BNB", decimals: 18 },
  },
  {
    chainId: 8453,
    chainHex: "0x2105",
    name: "Base",
    icon: "https://cdn.allox.ai/allox/networks/base.svg",
    chainName: "Base",
    rpcUrls: ["https://mainnet.base.org"],
    blockExplorerUrls: ["https://basescan.org"],
    nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  },
  {
    chainId: SOLANA_CHAIN_ID,
    chainHex: "0x65",
    name: "Solana",
    icon: "https://cdn.allox.ai/allox/networks/solana.svg",
    chainName: "Solana Mainnet",
    rpcUrls: ["https://api.mainnet-beta.solana.com"],
    blockExplorerUrls: ["https://explorer.solana.com"],
    nativeCurrency: { name: "SOL", symbol: "SOL", decimals: 9 },
  },
];
// eslint-disable-next-line no-unused-vars -- motion used as namespace in JSX (motion.div)
import { motion, AnimatePresence } from "motion/react";

const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const DEFAULT_REWARDS = [500, 1000, 1500, 2000, 2500, 4000, 5000].map(
  (points, i) => ({
    day: i + 1,
    points,
    claimed: false,
    current: i === 0,
    locked: i > 0,
  }),
);

function mapStatusToWeekDays(rewards) {
  const items = rewards ?? DEFAULT_REWARDS;
  return items.map((r) => {
    const status = r.claimed ? "claimed" : r.current ? "active" : "locked";
    return {
      day: DAY_NAMES[(r.day ?? 0) - 1] ?? `Day ${r.day}`,
      points: r.points ?? 0,
      status,
      dayNumber: r.day ?? 0,
      isCurrent: r.current === true,
    };
  });
}

export function CheckinModal({
  open,
  isOpen,
  onClose,
  status,
  claim,
  fetchStatus,
  addOptimisticCheckinPoints,
  loading,
}) {
  const dispatch = useDispatch();
  const walletType = useSelector((state) => state.wallet.walletType);
  const chainId = useSelector((state) => state.wallet.chainId);
  const isSolana = walletType === "solana";
  const isOpenState = open ?? isOpen ?? false;

  const [justClaimed, setJustClaimed] = useState(false);
  const [selectedDay, setSelectedDay] = useState(null);
  const [chainDropdownOpen, setChainDropdownOpen] = useState(false);
  const [selectedChainId, setSelectedChainId] = useState(SOLANA_CHAIN_ID);

  // Sync selected chain when modal opens or wallet changes
  useEffect(() => {
    if (isOpenState) {
      setSelectedChainId(
        isSolana
          ? SOLANA_CHAIN_ID
          : chainId && chainId !== SOLANA_CHAIN_ID
            ? chainId
            : 1,
      );
    }
  }, [isOpenState, isSolana, chainId]);

  const weekDays = useMemo(
    () => mapStatusToWeekDays(status?.rewards),
    [status?.rewards],
  );
  const totalPointsCollected = status?.totalPointsEarned ?? 0;
  const giftsCollected =
    status?.rewards.filter((items) => {
      return items.claimed === true;
    }).length ?? 0;

  const activeDay = weekDays.find((day) => day.status === "active");
  const currentDay =
    weekDays.find((day) => day.isCurrent) ??
    [...weekDays]
      .filter((day) => day.status === "claimed")
      .sort((a, b) => b.dayNumber - a.dayNumber)[0];
  const displayDay = selectedDay ?? activeDay ?? currentDay;

  const selectedChain =
    CHECKIN_CHAINS.find((c) => c.chainId === selectedChainId) ??
    CHECKIN_CHAINS[0];

  const handleChainSelect = async (chain) => {
    const wantsSolana = chain.chainId === SOLANA_CHAIN_ID;
    if (wantsSolana && !isSolana) {
      toast.error(
        "Solana requires a Solana-capable wallet (e.g. Phantom). Connect with a Solana wallet to claim on Solana.",
      );
      setChainDropdownOpen(false);
      return;
    }
    if (!wantsSolana && isSolana) {
      toast.error(
        "EVM chains require an EVM wallet (e.g. MetaMask). Connect with an EVM wallet to claim on Ethereum, BNB, or Base.",
      );
      setChainDropdownOpen(false);
      return;
    }

    if (wantsSolana) {
      try {
        localStorage.setItem(
          PREFERRED_CHAIN_STORAGE_KEY,
          String(SOLANA_CHAIN_ID),
        );
        dispatch(setChainId(SOLANA_CHAIN_ID));
        setSelectedChainId(chain.chainId);
        setChainDropdownOpen(false);
      } catch (e) {
        console.warn("Failed to persist preferred chain", e);
      }
      const provider = typeof window !== "undefined" && window.phantom?.solana;
      if (provider) {
        try {
          await provider.connect({ onlyIfTrusted: true });
        } catch (err) {
          console.error("Failed to connect Phantom:", err);
        }
      }
      return;
    }

    const provider =
      (typeof window !== "undefined" && window.phantom?.ethereum) ||
      (typeof window !== "undefined" && window.ethereum);
    if (!provider) {
      toast.error("No EVM wallet detected (e.g. MetaMask).");
      return;
    }

    try {
      await provider.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: chain.chainHex }],
      });
      try {
        await provider.request({ method: "eth_requestAccounts" });
      } catch (accountsError) {
        console.error("Failed to request EVM accounts:", accountsError);
      }
      dispatch(setChainId(chain.chainId));
      setSelectedChainId(chain.chainId);
      setChainDropdownOpen(false);
    } catch (error) {
      const code = error?.code;
      if (code === 4902) {
        try {
          await provider.request({
            method: "wallet_addEthereumChain",
            params: [
              {
                chainId: chain.chainHex,
                chainName: chain.chainName,
                rpcUrls: chain.rpcUrls,
                blockExplorerUrls: chain.blockExplorerUrls,
                nativeCurrency: chain.nativeCurrency,
              },
            ],
          });
          dispatch(setChainId(chain.chainId));
          setSelectedChainId(chain.chainId);
          setChainDropdownOpen(false);
          return;
        } catch (addError) {
          console.error("Network add error:", addError);
        }
      } else {
        console.error("Network switch error:", error);
      }
      toast.error("Failed to switch network.");
    }
  };

  const handleClaim = async () => {
    if (!activeDay || justClaimed || loading || status?.canCheckIn !== true)
      return;
    try {
      await claim(selectedChainId);
      const claimedDay = { ...activeDay, status: "claimed" };
      setSelectedDay(claimedDay);
      setJustClaimed(true);
      addOptimisticCheckinPoints?.(activeDay.points);
      await fetchStatus();
      toast.success(
        `Day ${activeDay.dayNumber} claimed! +${activeDay.points} points.`,
      );
      setTimeout(() => setJustClaimed(false), 2500);
    } catch (err) {
      if (err?.code === "WALLET_SOLANA_REQUIRED") {
        toast.error(err.message);
        // dispatch(setWalletModal(true));
      } else if (err?.code === "WALLET_EVM_REQUIRED") {
        toast.error(err.message);
        // dispatch(setWalletModal(true));
      } else {
        const msg =
          err?.message ??
          err?.data?.message ??
          (typeof err?.data?.error === "string"
            ? err.data.error
            : "Claim failed");
        toast.error(msg);
      }
      setJustClaimed(false);
    }
  };

  const handleDayClick = (day) => {
    if (day.status === "claimed" || day.status === "active") {
      setSelectedDay(day);
    }
  };

  // Show green "claimed" whenever this day is claimed; avoid flipping to black
  // when fetchStatus() updates and activeDay moves to the next day (async).
  const isClaimedView = displayDay?.status === "claimed";
  const isJustClaimed =
    justClaimed &&
    selectedDay?.status === "claimed" &&
    displayDay?.dayNumber === selectedDay?.dayNumber;

  useEffect(() => {
    if (!isOpenState) {
      setChainDropdownOpen(false);
      return;
    }
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isOpenState]);

  const modalContent = (
    <AnimatePresence>
      {isOpenState && (
        <>
          {/* Backdrop - full viewport on mobile including safe areas */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 min-h-[100dvh] bg-black/60 backdrop-blur-md z-[200]"
          />

          {/* Modal - scrollable on mobile, centered on desktop */}
          <div className="fixed inset-0 min-h-[100dvh] z-[200] p-4 pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] pl-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))] flex items-start sm:items-center justify-center overflow-y-auto overscroll-contain pointer-events-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative bg-white/95 backdrop-blur-2xl rounded-3xl shadow-2xl max-w-2xl w-full max-h-[calc(100dvh-2rem)] overflow-y-auto overflow-x-hidden border border-white/60 pointer-events-auto my-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close Button - safe area on notched devices */}
              <button
                onClick={onClose}
                className="absolute top-[max(1rem,env(safe-area-inset-top))] right-4 z-50 w-9 h-9 flex items-center justify-center rounded-full bg-white/80 hover:bg-white transition-all shadow-sm touch-manipulation"
                aria-label="Close"
              >
                <X size={18} className="text-gray-600" />
              </button>

              {/* Content */}
              <div className="relative z-10 p-4 sm:p-8">
                {/* Header */}
                <div className="text-center mb-4 sm:mb-6">
                  <h2 className="text-2xl font-bold mb-0.5">Daily Bonus</h2>
                  <p className="text-sm text-gray-600">
                    Claim your daily rewards
                  </p>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-3 sm:gap-4 mb-6 sm:mb-8">
                  <div className="glass-card p-4 border border-white/60">
                    <div className="text-sm text-gray-600 mb-1">
                      Total Points
                    </div>
                    <div className="text-2xl font-bold">
                      {totalPointsCollected.toLocaleString()}
                    </div>
                  </div>
                  <div className="glass-card p-4 border border-white/60">
                    <div className="text-sm text-gray-600 mb-1">
                      Gifts Collected
                    </div>
                    <div className="text-2xl font-bold">
                      {giftsCollected} / 7
                    </div>
                  </div>
                </div>

                {/* Main Content - Big Gift + Week Calendar */}
                <div className="grid md:grid-cols-2 gap-6">
                  {/* Left Side - Active/Selected Day Gift */}
                  <div className="flex flex-col items-center justify-center">
                    <div className="text-sm font-semibold text-gray-600 mb-3">
                      {isClaimedView
                        ? `Day ${displayDay?.dayNumber} Reward`
                        : "Today's Reward"}
                    </div>

                    {displayDay && (
                      <motion.div
                        key={displayDay.dayNumber}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="relative mb-4"
                      >
                        {/* Gift Container */}
                        <div className="relative">
                          {isJustClaimed ? (
                            // Opened Gift with Celebration
                            <motion.div
                              initial={{ scale: 1 }}
                              animate={{
                                scale: [1, 1.1, 1],
                                rotate: [0, -5, 5, 0],
                              }}
                              transition={{ duration: 0.6 }}
                              className="w-26 h-26 sm:w-32 sm:h-32 bg-gradient-to-br from-green-400 via-emerald-500 to-green-600 rounded-3xl flex items-center justify-center shadow-2xl relative overflow-hidden"
                            >
                              {/* Confetti effect */}
                              <motion.div
                                animate={{
                                  y: [-100, 100],
                                  opacity: [1, 0],
                                }}
                                transition={{ duration: 1, repeat: 2 }}
                                className="absolute inset-0"
                              >
                                {CONFETTI_POSITIONS.map((pos, i) => (
                                  <motion.div
                                    key={i}
                                    className="absolute w-2 h-2 rounded-full"
                                    style={{
                                      left: `${pos.left}%`,
                                      top: "20%",
                                      backgroundColor: [
                                        "#fbbf24",
                                        "#f59e0b",
                                        "#ec4899",
                                        "#8b5cf6",
                                        "#3b82f6",
                                      ][i % 5],
                                    }}
                                    animate={{
                                      y: [0, 80],
                                      x: [pos.x],
                                      opacity: [1, 0],
                                      rotate: [0, 360],
                                    }}
                                    transition={{
                                      duration: 0.8,
                                      delay: i * 0.1,
                                    }}
                                  />
                                ))}
                              </motion.div>

                              {/* Opened box icon */}
                              <Package
                                size={64}
                                className="text-white"
                                strokeWidth={1.5}
                              />

                              {/* Success checkmark overlay */}
                              <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ delay: 0.3 }}
                                className="absolute inset-0 flex items-center justify-center"
                              >
                                <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-lg">
                                  <Check
                                    size={32}
                                    className="text-green-600"
                                    strokeWidth={3}
                                  />
                                </div>
                              </motion.div>
                            </motion.div>
                          ) : isClaimedView ? (
                            // Previously Claimed Gift (Opened)
                            <div className="w-26 h-26 sm:w-32 sm:h-32 bg-gradient-to-br from-green-400 via-emerald-500 to-green-600 rounded-3xl flex items-center justify-center shadow-2xl relative">
                              <Package
                                size={64}
                                className="text-white"
                                strokeWidth={1.5}
                              />
                              <div className="absolute top-2 right-2 w-6 h-6 bg-white rounded-full flex items-center justify-center shadow-md">
                                <Check
                                  size={16}
                                  className="text-green-600"
                                  strokeWidth={3}
                                />
                              </div>
                            </div>
                          ) : (
                            // Active Gift (Closed)
                            <div className="w-26 h-26 sm:w-32 sm:h-32 bg-black rounded-3xl flex items-center justify-center shadow-2xl transform hover:scale-105 transition-transform">
                              <Gift
                                size={52}
                                className="text-white"
                                strokeWidth={1.5}
                              />
                            </div>
                          )}

                          {/* Sparkle Effects for Active Gift */}
                          {!isClaimedView && !isJustClaimed && (
                            <>
                              <motion.div
                                animate={{
                                  scale: [1, 1.2, 1],
                                  opacity: [0.5, 1, 0.5],
                                }}
                                transition={{ duration: 2, repeat: Infinity }}
                                className="absolute -top-2 -right-2 w-6 h-6 bg-yellow-400 rounded-full blur-sm"
                              />
                              <motion.div
                                animate={{
                                  scale: [1, 1.3, 1],
                                  opacity: [0.4, 1, 0.4],
                                }}
                                transition={{
                                  duration: 2.5,
                                  repeat: Infinity,
                                  delay: 0.5,
                                }}
                                className="absolute -bottom-2 -left-2 w-5 h-5 bg-pink-400 rounded-full blur-sm"
                              />
                            </>
                          )}
                        </div>
                      </motion.div>
                    )}

                    {displayDay && (
                      <div className="text-center sm:mb-6 mb-2">
                        <div
                          className={`text-3xl sm:text-4xl font-bold mb-1 ${
                            isClaimedView || isJustClaimed
                              ? "text-green-600"
                              : "text-black"
                          }`}
                        >
                          {isClaimedView || isJustClaimed ? "✓ " : "+"}
                          {displayDay.points}
                        </div>
                        <div className="text-sm text-gray-600">
                          {isClaimedView ? "Points Claimed" : "Points"}
                        </div>
                      </div>
                    )}

                    {/* Chain selector */}
                    <div className="w-full mb-4">
                      <label className="block text-xs font-semibold text-gray-500 mb-2">
                        Claim on
                      </label>
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => setChainDropdownOpen((o) => !o)}
                          className="w-full flex items-center justify-between gap-2 px-4 py-2.5 rounded-xl border border-gray-200 bg-white/80 hover:bg-gray-50/80 transition-colors text-sm"
                        >
                          <span className="flex items-center gap-2">
                            <img
                              src={selectedChain.icon}
                              alt=""
                              className="h-5 w-5 rounded-full"
                            />
                            <span className="font-medium text-gray-900">
                              {selectedChain.name}
                            </span>
                          </span>
                          <ChevronDown
                            size={16}
                            className={`text-gray-500 transition-transform ${chainDropdownOpen ? "rotate-180" : ""}`}
                          />
                        </button>
                        {chainDropdownOpen && (
                          <>
                            <div
                              className="fixed inset-0 z-10"
                              onClick={() => setChainDropdownOpen(false)}
                              aria-hidden="true"
                            />
                            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg py-1 z-20 max-h-48 overflow-y-auto">
                              {CHECKIN_CHAINS.filter((items) => {
                                return items.name !== selectedChain.name;
                              }).map((chain) => (
                                <button
                                  key={chain.chainId}
                                  type="button"
                                  onClick={() => handleChainSelect(chain)}
                                  className={`w-full flex items-center gap-3 px-4 py-2.5 text-left text-sm transition-colors ${
                                    selectedChainId === chain.chainId
                                      ? "bg-purple-50 text-purple-700 font-medium"
                                      : "hover:bg-gray-50 text-gray-700"
                                  }`}
                                >
                                  <img
                                    src={chain.icon}
                                    alt=""
                                    className="h-5 w-5 rounded-full"
                                  />
                                  {chain.name}
                                </button>
                              ))}
                            </div>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Claim Button or Status */}
                    {isClaimedView ? (
                      <div className="w-full px-8 py-3 rounded-xl font-semibold text-center bg-green-100 text-green-700 border-2 border-green-300">
                        <span className="flex items-center justify-center gap-2">
                          <Check size={20} />
                          Claimed
                        </span>
                      </div>
                    ) : (
                      <button
                        onClick={handleClaim}
                        disabled={isJustClaimed || !activeDay || loading}
                        className={`w-full px-8 py-3 rounded-xl font-semibold transition-all shadow-lg border-2 border-transparent ${
                          isJustClaimed || loading
                            ? "bg-green-500 text-white cursor-not-allowed"
                            : "bg-black text-white hover:shadow-xl hover:scale-105"
                        }`}
                      >
                        {loading ? (
                          <span className="flex items-center justify-center gap-2">
                            Claiming…
                          </span>
                        ) : isJustClaimed ? (
                          <span className="flex items-center justify-center gap-2">
                            <Check size={20} />
                            Claimed!
                          </span>
                        ) : (
                          "Claim Reward"
                        )}
                      </button>
                    )}
                  </div>

                  {/* Right Side - Week Overview */}
                  <div className="flex flex-col min-w-0 w-full">
                    <div className="text-sm font-semibold text-gray-600 mb-3 text-center md:text-left">
                      Week Progress
                    </div>
                    <div className="flex sm:grid flex-nowrap sm:grid-cols-1 overflow-x-auto sm:overflow-x-visible gap-2 sm:gap-3 sm:max-h-[22rem] overflow-y-auto p-1 w-full snap-x snap-mandatory scroll-smooth [-webkit-overflow-scrolling:touch]">
                      {weekDays.map((day, index) => (
                        <motion.div
                          key={day.dayNumber || index}
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.05 }}
                          onClick={() => handleDayClick(day)}
                          className={`flex items-center gap-2 sm:gap-3 p-2 sm:p-3 rounded-xl transition-all flex-shrink-0 w-[70%] min-w-[70%] sm:w-auto sm:min-w-0 snap-start ${
                            day.status === "active"
                              ? "bg-black/5 border-2 border-black cursor-pointer shadow-md"
                              : day.status === "claimed"
                                ? "bg-green-50/60 border border-green-200 cursor-pointer hover:bg-green-100/80 hover:border-green-300"
                                : "bg-gray-50/60 border border-gray-200"
                          } ${
                            selectedDay?.dayNumber === day.dayNumber &&
                            day.status === "claimed"
                              ? "ring-2 ring-green-400"
                              : ""
                          }`}
                        >
                          {/* Gift Icon */}
                          <div
                            className={`w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl flex items-center justify-center flex-shrink-0 ${
                              day.status === "active"
                                ? "bg-black"
                                : day.status === "claimed"
                                  ? "bg-green-500"
                                  : "bg-gray-300"
                            }`}
                          >
                            {day.status === "claimed" ? (
                              <Package
                                size={24}
                                className="text-white"
                                strokeWidth={2}
                              />
                            ) : day.status === "locked" ? (
                              <Lock size={20} className="text-white" />
                            ) : (
                              <Gift size={24} className="text-white" />
                            )}
                          </div>

                          {/* Day Info */}
                          <div className="flex-1 min-w-0">
                            <div
                              className={`font-semibold text-sm sm:text-base truncate ${
                                day.status === "active"
                                  ? "text-black"
                                  : day.status === "claimed"
                                    ? "text-green-700"
                                    : "text-gray-400"
                              }`}
                            >
                              Day {day.dayNumber}
                            </div>
                            <div
                              className={`text-xs sm:text-sm truncate ${
                                day.status === "locked"
                                  ? "text-gray-400"
                                  : "text-gray-600"
                              }`}
                            >
                              {day.points} points
                            </div>
                          </div>

                          {/* Status Badge */}
                          <div
                            className={`text-[10px] sm:text-xs font-semibold px-2 sm:px-3 py-0.5 sm:py-1 rounded-full flex-shrink-0 ${
                              day.status === "active"
                                ? "bg-black text-white"
                                : day.status === "claimed"
                                  ? "bg-green-600 text-white"
                                  : "bg-gray-400 text-white"
                            }`}
                          >
                            {day.status === "active"
                              ? "Available"
                              : day.status === "claimed"
                                ? "Claimed"
                                : "Locked"}
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Footer Note */}
                <div className="mt-3 sm:mt-6 text-center text-sm text-gray-500">
                  {/* <p>
                    Come back daily to claim your rewards and maintain your
                    streak! 🎁
                  </p> */}
                  {status?.secondsUntilReset != null &&
                    status.secondsUntilReset > 0 && (
                      <p className="mt-1 text-xs text-gray-400">
                        Resets in {Math.floor(status.secondsUntilReset / 3600)}h{" "}
                        {Math.floor((status.secondsUntilReset % 3600) / 60)}m
                      </p>
                    )}
                </div>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );

  return createPortal(modalContent, document.body);
}
