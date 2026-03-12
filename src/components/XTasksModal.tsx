import {
  X as XIcon,
  ThumbsUp,
  Repeat2,
  LogOut,
  Star,
  Clock,
  Sparkles,
  ExternalLink,
  Coins,
  Loader2,
  Info,
  Send,
} from "lucide-react";
import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useSocial } from "../hooks/useSocial";
import { toast } from "sonner";
import { useApiLimiter } from "../hooks/useApiLimiter";
const TELEGRAM_CHANNEL_URL = "https://t.me/alloxai";
const TELEGRAM_ANNOUNCEMENTS_URL = "https://t.me/alloxdotai";

// Custom X (Twitter) Logo Component
function XLogo({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={className}
      fill="currentColor"
    >
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

interface Task {
  id: string;
  title: string;
  description: string;
  dateAdded: string;
  points: number;
  tweetUrl: string;
  actions: Array<{
    action: "like" | "retweet" | "comment";
    points: number;
    completed: boolean;
    verifiedAt: string | null;
  }>;
}

interface PromoTask {
  type: string;
  description: string;
  points: number;
  completedToday: boolean;
  timesCompleted: number;
  daily: boolean;
}

interface XTasksModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTasksViewed: () => void;
}

export function XTasksModal({
  isOpen,
  onClose,
  onTasksViewed,
}: XTasksModalProps) {
  const {
    twitterStatus,
    telegramStatus,
    tasks,
    promoTask,
    followTask,
    socialPoints,
    loading,
    error,
    requirementError,
    fetchTwitterStatus,
    fetchTelegramStatus,
    linkTwitter,
    linkTelegram,
    unlinkTwitter,
    fetchTasks,
    verifyTaskAction,
    postPromoTweet,
    verifyPromoTweet,
    fetchSocialPoints,
    verifyFollowTask,
    verifyTelegramJoin,
    verifyTelegramAnnouncements,
    clearError,
    markAllAsSeen,
    telegramPoints,
  } = useSocial();

  const { checkLimit, remaining, resetTime, isLimited } = useApiLimiter();

  const [currentTab, setCurrentTab] = useState<"available" | "completed">(
    "available",
  );
  const [telegramVerifyState, setTelegramVerifyState] = useState<
    "idle" | "loading" | "success" | "error"
  >("idle");
  const [telegramAnnouncementsVerifyState, setTelegramAnnouncementsVerifyState] = useState<
    "idle" | "loading" | "success" | "error"
  >("idle");
  const [showDisconnectModal, setShowDisconnectModal] = useState(false);
  const [disconnectTime, setDisconnectTime] = useState<number | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<string>("");
  const [promoVerifyState, setPromoVerifyState] = useState<
    "idle" | "success" | "error"
  >("idle");
  const [promoPosted, setPromoPosted] = useState(false);
  const [promoTimerEndTime, setPromoTimerEndTime] = useState<number | null>(
    null,
  );
  const [promoTimerRemaining, setPromoTimerRemaining] = useState<string>("");


  const [followVerifyState, setFollowVerifyState] = useState<
    "idle" | "success" | "error"
  >("idle");
  const [followPosted, setFollowPosted] = useState(false);
  const [followTimerEndTime, setFollowTimerEndTime] = useState<number | null>(
    null,
  );
  const [followTimerRemaining, setFollowTimerRemaining] = useState<string>("");
  const [dummyScore, setDummyScore] = useState<number>(0);

  // 15‑second cooldown used after any action/verify call
  const [actionCooldownEndTime, setActionCooldownEndTime] = useState<number | null>(
    null,
  );
  const [actionCooldownRemaining, setActionCooldownRemaining] = useState<string>("");

  const [actionStates, setActionStates] = useState<{
    [key: string]: {
      like: "idle" | "loading" | "success" | "error";
      retweet: "idle" | "loading" | "success" | "error";
    };
  }>({});
  const lastErrorRef = useRef<string | null>(null);
  const hasFetchedStatusRef = useRef(false);
  const hasFetchedTasksRef = useRef(false);
  const hasViewedTasksRef = useRef(false);

  const [secondsLeft, setSecondsLeft] = useState(0);


  useEffect(() => {
    if (!resetTime) return;

    const interval = setInterval(() => {
      const remaining = Math.max(0, Math.ceil((resetTime - Date.now()) / 1000));
      setSecondsLeft(remaining);
    }, 1000);

    return () => clearInterval(interval);
  }, [resetTime]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;

    return `${m}:${s.toString().padStart(2, "0")}`;
  };
  // initialize action states when tasks load
  useEffect(() => {
    const states: any = {};
    tasks.forEach((t: any) => {
      const likeCompleted = t.actions?.find(
        (a: any) => a.action === "like",
      )?.completed;
      const retweetCompleted = t.actions?.find(
        (a: any) => a.action === "retweet",
      )?.completed;
      states[t.id] = {
        like: likeCompleted ? "success" : "idle",
        retweet: retweetCompleted ? "success" : "idle",
      };
    });
    setActionStates(states);
  }, [tasks]);

  // Fetch status once per open cycle
  useEffect(() => {
    if (!isOpen) {
      hasFetchedStatusRef.current = false;
      return;
    }

    if (!hasFetchedStatusRef.current) {
      fetchTwitterStatus();
      fetchTelegramStatus({ suppressError: true }).catch(() => {});
      hasFetchedStatusRef.current = true;
    }
  }, [isOpen, fetchTwitterStatus, fetchTelegramStatus]);

  // Fetch tasks once per open cycle when account is linked
  useEffect(() => {
    if (!isOpen) {
      hasFetchedTasksRef.current = false;
      return;
    }

    if (twitterStatus.linked && !hasFetchedTasksRef.current) {
      fetchTasks();
      hasFetchedTasksRef.current = true;
    }
  }, [isOpen, twitterStatus.linked, fetchTasks]);

  // Mark tasks as viewed once per open cycle
  useEffect(() => {
    if (!isOpen) {
      hasViewedTasksRef.current = false;
      return;
    }

    if (!hasViewedTasksRef.current) {
      onTasksViewed();
      hasViewedTasksRef.current = true;
    }
  }, [isOpen, onTasksViewed]);

  // Show error toast when error occurs
  useEffect(() => {
    if (error && error !== lastErrorRef.current) {
      lastErrorRef.current = error;
      toast.error(error);
      clearError();
    }
  }, [error, clearError]);

  // Clear promoPosted when modal closes
  useEffect(() => {
    if (!isOpen) {
      setPromoPosted(false);
      markAllAsSeen();
    }
  }, [isOpen, markAllAsSeen]);

  // Timer effect for disconnect countdown
  useEffect(() => {
    if (disconnectTime) {
      const interval = setInterval(() => {
        const now = Date.now();
        const remaining = disconnectTime - now;

        if (remaining <= 0) {
          setDisconnectTime(null);
          setTimeRemaining("");
          clearInterval(interval);
        } else {
          const hours = Math.floor(remaining / (1000 * 60 * 60));
          const minutes = Math.floor(
            (remaining % (1000 * 60 * 60)) / (1000 * 60),
          );
          const seconds = Math.floor((remaining % (1000 * 60)) / 1000);
          setTimeRemaining(
            `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`,
          );
        }
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [disconnectTime]);

  // Handle URL params for cooldown
  useEffect(() => {
    if (!twitterStatus.cooldown.allowed && twitterStatus.cooldown.relinkAt) {
      const relinkTime = new Date(twitterStatus.cooldown.relinkAt).getTime();
      setDisconnectTime(relinkTime);
    } else {
      setDisconnectTime(null);
    }
  }, [twitterStatus.cooldown]);

  // Restore promo timer from localStorage on mount
  useEffect(() => {
    if (isOpen) {
      const savedEndTime = localStorage.getItem("promoTimerEndTime");
      if (savedEndTime) {
        const endTime = parseInt(savedEndTime);
        if (endTime > Date.now()) {
          setPromoTimerEndTime(endTime);
          setPromoPosted(true);
        } else {
          localStorage.removeItem("promoTimerEndTime");
        }
      }

      // also restore action cooldown timer
      const savedActionEnd = localStorage.getItem("actionCooldownEndTime");
      if (savedActionEnd) {
        const endTime = parseInt(savedActionEnd);
        if (endTime > Date.now()) {
          setActionCooldownEndTime(endTime);
        } else {
          localStorage.removeItem("actionCooldownEndTime");
        }
      }
    }
  }, [isOpen]);

  // Timer effect for promo verification countdown
  useEffect(() => {
    if (promoTimerEndTime) {
      const interval = setInterval(() => {
        const now = Date.now();
        const remaining = promoTimerEndTime - now;

        if (remaining <= 0) {
          setPromoTimerEndTime(null);
          setPromoTimerRemaining("");
          localStorage.removeItem("promoTimerEndTime");
          clearInterval(interval);
        } else {
          const seconds = Math.ceil(remaining / 1000);
          setPromoTimerRemaining(`${seconds}s`);
        }
      }, 100);

      return () => clearInterval(interval);
    }
  }, [promoTimerEndTime]);

  // Timer effect for short action cooldown
  useEffect(() => {
    if (actionCooldownEndTime) {
      const interval = setInterval(() => {
        const now = Date.now();
        const remaining = actionCooldownEndTime - now;

        if (remaining <= 0) {
          setActionCooldownEndTime(null);
          setActionCooldownRemaining("");
          localStorage.removeItem("actionCooldownEndTime");
          clearInterval(interval);
        } else {
          const seconds = Math.ceil(remaining / 1000);
          setActionCooldownRemaining(`${seconds}s`);
        }
      }, 100);

      return () => clearInterval(interval);
    }
  }, [actionCooldownEndTime]);

  // Clear timer when promo task is completed
  useEffect(() => {
    if (promoTask.completedToday) {
      setPromoTimerEndTime(null);
      setPromoTimerRemaining("");
      localStorage.removeItem("promoTimerEndTime");
    }
  }, [promoTask.completedToday]);

  const handleConnect = async () => {
    try {
      await linkTwitter();
    } catch (err) {
      // Error is handled in the hook
    }
  };

  const handleDisconnectClick = () => {
    setShowDisconnectModal(true);
  };

  const handleTelegramConnect = () => {
    try {
      linkTelegram();
    } catch (err: any) {
      toast.error(err?.message || "Failed to start Telegram linking");
    }
  };

  const handleTelegramJoin = () => {
    window.open(TELEGRAM_CHANNEL_URL, "_blank", "noopener,noreferrer");
  };

  const handleTelegramJoinAnnouncements = () => {
    window.open(TELEGRAM_ANNOUNCEMENTS_URL, "_blank", "noopener,noreferrer");
  };

  const handleTelegramVerifyJoin = async () => {
    if (!telegramStatus.linked) {
      toast.error("Connect Telegram first");
      return;
    }

    setTelegramVerifyState("loading");

    try {
      await verifyTelegramJoin();
      setTelegramVerifyState("success");
      toast.success("Telegram join verified. 1000 points awarded.");
      setDummyScore((prev) => prev + 1000);
      await fetchSocialPoints();
    } catch (err: any) {
      const message = err?.message || "Unable to verify Telegram join";
      toast.error(message);
      setTelegramVerifyState("error");
      setTimeout(() => {
        setTelegramVerifyState("idle");
      }, 2000);
    }
  };

    const handleTelegramVerifyAnnouncements = async () => {
      if (!telegramStatus.linked) {
        toast.error("Connect Telegram first");
        return;
      }

      setTelegramAnnouncementsVerifyState("loading");

      try {
        await verifyTelegramAnnouncements();
        setTelegramAnnouncementsVerifyState("success");
        toast.success("Telegram announcements join verified. 1000 points awarded.");
        setDummyScore((prev) => prev + 1000);
        await fetchSocialPoints();
      } catch (err: any) {
        const message = err?.message || "Unable to verify Telegram announcements join";
        toast.error(message);
        setTelegramAnnouncementsVerifyState("error");
        setTimeout(() => {
          setTelegramAnnouncementsVerifyState("idle");
        }, 2000);
      }
    };

  const handleConfirmDisconnect = async () => {
    try {
      await unlinkTwitter();
      setShowDisconnectModal(false);
    } catch (err) {
      // Error is handled in the hook
    }
  };

  const handleCancelDisconnect = () => {
    setShowDisconnectModal(false);
  };

  const handlePromoPost = () => {
    // Use one of the random tweet variants

  

    const tweetVariants = [
      "Just discovered @alloxdotai — AI-powered crypto portfolios! 🚀\n\nCheck it out: https://allox.ai",
      "Excited about @alloxdotai's AI-driven portfolio management! The future of DeFi is here 🧠💎\n\nhttps://allox.ai",
      "@alloxdotai is revolutionizing how we invest in crypto. Smart portfolios powered by AI! 🤖📈\n\nJoin the movement: https://allox.ai",
      "Finally found a platform that makes crypto investing intelligent. Thanks @alloxdotai! 🧠🚀\n\nhttps://allox.ai #DeFi #AI",
      "@alloxdotai combines AI and DeFi perfectly. My portfolios have never been smarter! 💡📊\n\nCheck it: https://allox.ai",
    ];

    const randomTweet =
      tweetVariants[Math.floor(Math.random() * tweetVariants.length)];
    postPromoTweet(randomTweet);

    // Start 60-second timer
    const endTime = Date.now() + 60000;
    setPromoTimerEndTime(endTime);
    localStorage.setItem("promoTimerEndTime", endTime.toString());
    setPromoPosted(true);
  };

  // start a short cooldown and persist it
  const startActionCooldown = () => {
    const end = Date.now() + 10000; // 15 seconds
    setActionCooldownEndTime(end);
    localStorage.setItem("actionCooldownEndTime", end.toString());
  };

  const handlePromoVerify = async () => {
    startActionCooldown();

    if (!checkLimit()) {
      toast.error(
        "You have reached your limit. Please wait until you can perform this action again.",
      );
      return;
    }
    try {
      setPromoVerifyState("idle");
      await verifyPromoTweet();
      await fetchSocialPoints(); // Refresh points after successful verification
      setPromoVerifyState("success");
      // Clear timer and localStorage on successful verification
      setPromoTimerEndTime(null);
      setPromoTimerRemaining("");
      localStorage.removeItem("promoTimerEndTime");
    } catch (err) {
      setPromoVerifyState("error");
      setTimeout(() => {
        setPromoVerifyState("idle");
      }, 2000);
    }
  };

    const handleFollowVerify = async () => {
    startActionCooldown();

    if (!checkLimit()) {
      toast.error(
        "You have reached your limit. Please wait until you can perform this action again.",
      );
      return;
    }
    try {
      setFollowVerifyState("idle");
      await verifyFollowTask();
      setFollowVerifyState("success");
      await fetchSocialPoints(); // Refresh points after successful verification
      // Clear timer and localStorage on successful verification
      setFollowTimerEndTime(null);
      setFollowTimerRemaining("");
      localStorage.removeItem("followTimerEndTime");
    } catch (err) {
      setFollowVerifyState("error");
      setTimeout(() => {
        setFollowVerifyState("idle");
      }, 2000);
    }
  };

  const handleAction = useCallback(async (taskId: string, action: "like" | "retweet") => {
    startActionCooldown();

    if (!checkLimit()) {
      toast.error(
        "You have reached your limit. Please wait until you can perform this action again.",
      );
      return;
    }
    try {
      // Set loading state before doing anything else
      setActionStates((prev) => ({
        ...prev,
        [taskId]: {
          ...prev[taskId],
          [action]: "loading",
        },
      }));

      // Small delay before verification (allows user to open tweet)
      setTimeout(async () => {
        try {
          await verifyTaskAction(taskId, action);
          setActionStates((prev) => ({
            ...prev,
            [taskId]: {
              ...prev[taskId],
              [action]: "success",
            },
          }));
        } catch (err) {
          setActionStates((prev) => ({
            ...prev,
            [taskId]: {
              ...prev[taskId],
              [action]: "error",
            },
          }));
          // Reset to idle after 2 seconds
          setTimeout(() => {
            setActionStates((prev) => ({
              ...prev,
              [taskId]: {
                ...prev[taskId],
                [action]: "idle",
              },
            }));
          }, 2000);
        }
      }, 1000);
    } catch (err) {
      // Error handled in hook
    }
  }, [verifyTaskAction, checkLimit]);

  const getActionButtonClass = (
    state: "idle" | "loading" | "success" | "error" | "limited",
    isCompleted: boolean,
  ) => {
    if (isCompleted) {
      return "bg-green-500 text-white cursor-not-allowed";
    }
    if (state === "loading") {
      return "bg-gray-500 text-white cursor-wait";
    }
    if (state === "limited") {
      return "bg-gray-500 text-white cursor-wait ";
    }
    if (state === "success") {
      return "bg-green-500 text-white";
    }
    if (state === "error") {
      return "bg-red-500 text-white";
    }
    return "bg-black text-white hover:bg-gray-800";
  };

  const availableTasks = tasks.filter((task: any) => {
    const likeAction = task.actions.find((a: any) => a.action === "like");
    const retweetAction = task.actions.find((a: any) => a.action === "retweet");
    return !(likeAction?.completed && retweetAction?.completed);
  });

  const completedTasks = tasks.filter((task: any) => {
    const likeAction = task.actions.find((a: any) => a.action === "like");
    const retweetAction = task.actions.find((a: any) => a.action === "retweet");
    return likeAction?.completed && retweetAction?.completed;
  });

  const isFollowCompleted = Boolean(
    followTask?.completed || followTask?.completedToday,
  );
  const isPromoCompleted = Boolean(promoTask?.completedToday);
  const hasFollowTask = Boolean(followTask && Object.keys(followTask).length > 0);
  const telegramJoinTask = telegramStatus?.joinTask || {
    completed: false,
    points: 1000,
    completedAt: null,
  };
  const telegramAnnouncementsTask = telegramStatus?.announcementsTask || {
    completed: false,
    points: 1000,
    completedAt: null,
  };

  const isCompletedTaskExpired = (
    completed?: boolean,
    completedAt?: string | null,
  ) => {
    if (!completed || !completedAt) return false;
    const completedTime = new Date(completedAt).getTime();
    if (Number.isNaN(completedTime)) return false;
    return Date.now() - completedTime > 24 * 60 * 60 * 1000;
  };

  const telegramJoinExpired = isCompletedTaskExpired(
    telegramJoinTask.completed,
    telegramJoinTask.completedAt,
  );
  const telegramAnnouncementsExpired = isCompletedTaskExpired(
    telegramAnnouncementsTask.completed,
    telegramAnnouncementsTask.completedAt,
  );

  const telegramJoinAvailableForTab =
    !telegramJoinTask.completed && !telegramJoinExpired;
  const telegramJoinCompletedForTab =
    Boolean(telegramJoinTask.completed) && !telegramJoinExpired;

  const telegramAnnouncementsAvailableForTab =
    !telegramAnnouncementsTask.completed && !telegramAnnouncementsExpired;
  const telegramAnnouncementsCompletedForTab =
    Boolean(telegramAnnouncementsTask.completed) && !telegramAnnouncementsExpired;

  const telegramAvailableCount = telegramStatus.linked
    ? (telegramJoinAvailableForTab ? 1 : 0) +
      (telegramAnnouncementsAvailableForTab ? 1 : 0)
    : 0;
  const telegramCompletedCount = telegramStatus.linked
    ? (telegramJoinCompletedForTab ? 1 : 0) +
      (telegramAnnouncementsCompletedForTab ? 1 : 0)
    : 0;

  const availableExtraCount =
    (twitterStatus.linked && hasFollowTask && !isFollowCompleted ? 1 : 0) +
    (twitterStatus.linked && !isPromoCompleted ? 1 : 0) +
    telegramAvailableCount;
  const completedExtraCount =
    (twitterStatus.linked && hasFollowTask && isFollowCompleted ? 1 : 0) +
    (twitterStatus.linked && isPromoCompleted ? 1 : 0) +
    telegramCompletedCount;
  const currentTabTelegramCount =
    currentTab === "available" ? telegramAvailableCount : telegramCompletedCount;

  const totalStarsToday = socialPoints + telegramPoints;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white/90 backdrop-blur-xl rounded-3xl shadow-2xl w-full max-w-4xl h-[90vh] overflow-hidden border border-white/60"
      >
        {/* Header */}
        <div className="p-6 border-b border-gray-200 bg-white/60">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-black rounded-2xl flex items-center justify-center">
                <XLogo className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">Social Rewards</h2>
                <p className="text-sm text-gray-600">
                  Complete tasks to earn points
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-10 h-10 rounded-xl bg-gray-200 hover:bg-gray-300 flex items-center justify-center transition-colors"
            >
              <XIcon className="w-5 h-5 text-gray-700" />
            </button>
          </div>

          {/* User Info / Connection Status */}
          <div className="grid gap-3 md:grid-cols-2">
            <div className="flex items-center justify-between bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-200/50 rounded-2xl p-4">
              {twitterStatus.linked ? (
                <>
                  {/* Left side - Points */}
                  <div className="flex items-center gap-2 px-3 py-1 bg-white rounded-lg">
                    <Coins className="size-4 text-amber-500" />

                    <span className="text-sm font-bold">
                      {totalStarsToday + dummyScore} points
                    </span>
                  </div>

                  {/* Right side - Username and Disconnect */}
                  <div className="flex flex-col items-end gap-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-lg">
                        @{twitterStatus.username}
                      </span>
                    </div>
                    <button
                      onClick={handleDisconnectClick}
                      disabled={loading.unlink}
                      className="text-xs text-red-400 hover:text-red-700 underline font-medium transition-colors disabled:opacity-50"
                    >
                      {loading.unlink ? "Disconnecting..." : "Disconnect"}
                    </button>
                  </div>
                </>
              ) : (
                <>
                  {/* Left side - Not connected */}
                  <div className="flex items-center gap-2">
                    <XLogo className="w-5 h-5" />
                    <span className="text-xs sm:text-base font-semibold text-gray-600">Not Connected</span>
                    {/* Requirements Tooltip */}
                    <div className="group relative">
                      <Info className="w-4 h-4 text-gray-500 cursor-help" />
                      <div className="absolute left-0 top-full mt-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 w-fit">
                        <p className="font-semibold mb-1">Requirements:</p>
                        <ul className="space-y-0.5">
                          <li>- Account should be more than 6 months old</li>
                          <li>- Account should have 50 or more followers</li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  {/* Right side - Connect button or timer */}
                  {!twitterStatus.cooldown.allowed ? (
                    <div className="group relative">
                      <div className="flex items-center gap-2 px-4 py-2 bg-gray-300 text-gray-600 rounded-xl text-sm font-medium cursor-not-allowed">
                        <Clock className="w-4 h-4" />
                        {timeRemaining || "24:00:00"}
                      </div>
                      <div className="absolute right-0 top-full mt-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                        You can connect again after the timer ends
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={handleConnect}
                      disabled={loading.auth}
                      className="flex items-center gap-2 px-4 py-2 bg-black hover:bg-gray-800 text-white rounded-xl transition-colors text-sm font-medium disabled:opacity-50"
                    >
                      <XLogo className="w-4 h-4" />
                      {loading.auth ? "Connecting..." : "Connect"}
                    </button>
                  )}
                </>
              )}
            </div>

            <div className="flex items-center justify-between bg-gradient-to-br from-sky-50 to-cyan-50 border border-sky-200/50 rounded-2xl p-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-sky-500 rounded-lg flex items-center justify-center">
                  <Send className="w-4 h-4 text-white" />
                </div>
                <div>
                  <p className="text-xs text-gray-500 font-medium uppercase">Telegram</p>
                  <p className="text-xs sm:text-base font-semibold text-gray-700">
                    {telegramStatus.linked
                      ? `@${telegramStatus.username || "telegram_user"}`
                      : "Not Connected"}
                  </p>
                </div>
              </div>

              {!telegramStatus.linked ? (
                <button
                  onClick={handleTelegramConnect}
                  disabled={loading.telegramAuth}
                  className="flex items-center gap-2 px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl transition-colors text-sm font-medium disabled:opacity-50"
                >
                  <Send className="w-4 h-4" />
                  {loading.telegramAuth ? "Connecting..." : "Connect"}
                </button>
              ) : (
                <div className="px-3 py-1 bg-white rounded-lg text-sm font-semibold text-sky-700">
                  Connected
                </div>
              )}
            </div>
          </div>

        </div>

        

        {!(twitterStatus.linked || telegramStatus.linked) || (twitterStatus.linked && loading.tasks) ? (
          <div className="flex gap-2 mb-6 px-6 mt-4">
            <button
              disabled
              className="flex-1 px-6 py-3 rounded-xl font-semibold bg-black text-white cursor-not-allowed text-xs md:text-base"
            >
              Available (-)
            </button>
            <button
              disabled
              className="flex-1 px-6 py-3 rounded-xl font-semibold bg-gray-200 text-gray-700 cursor-not-allowed text-xs md:text-base"
            >
              Completed (-)
            </button>
          </div>
        ) : (
          <>
            <div className="flex gap-2 mb-6 px-6 mt-4">
              <button
                onClick={() => setCurrentTab("available")}
                className={`flex-1 px-6 py-3 rounded-xl font-semibold text-xs md:text-base transition-all ${
                  currentTab === "available"
                    ? "bg-black text-white"
                    : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                }`}
              >
                Available ({availableTasks.length + availableExtraCount})
              </button>
              <button
                onClick={() => setCurrentTab("completed")}
                className={`flex-1 px-6 py-3 rounded-xl font-semibold text-xs md:text-base transition-all ${
                  currentTab === "completed"
                    ? "bg-black text-white"
                    : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                }`}
              >
                Completed ({completedTasks.length + completedExtraCount})
              </button>
            </div>
            <div
              className={`mb-4 p-3 rounded-xl border mx-6 ${
                isLimited
                  ? "bg-red-50 border-red-200"
                  : "bg-blue-50 border-blue-200"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock
                    className={`w-4 h-4 ${isLimited ? "text-red-600" : "text-blue-600"}`}
                  />
                  <span
                    className={`text-sm font-medium ${isLimited ? "text-red-700" : "text-blue-700"}`}
                  >
                    {isLimited
                      ? `Task limit reached. Reset in ${formatTime(secondsLeft)}`
                      : `You can check ${remaining} more tasks in the next 15 minutes`}
                  </span>
                </div>
                <span
                  className={`text-xs font-semibold px-2 py-1 rounded-lg ${
                    isLimited
                      ? "bg-red-200 text-red-700"
                      : "bg-blue-200 text-blue-700"
                  }`}
                >
                  {remaining}/5
                </span>
              </div>
            </div>
          </>
        )}
        {/* Content */}
          {!(twitterStatus.linked || telegramStatus.linked)  ? (
            <>
              <div className="p-6 overflow-y-auto max-h-[calc(80vh-270px)]">
                <div className="space-y-4">
                  {requirementError && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-red-50 border-2 border-red-200 rounded-2xl p-6"
                    >
                      <h3 className="text-lg font-bold text-red-900 mb-2">X Connection Failed</h3>
                      <p className="text-red-700">{requirementError}</p>
                    </motion.div>
                  )}

                  {telegramStatus.linked && (
                    <>
                      <div className="rounded-2xl border border-sky-200/60 bg-gradient-to-r from-sky-50 to-cyan-50 p-4">
                        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                          <div>
                            <h3 className="text-sm font-bold text-sky-900">Join Allox Group</h3>
                            <p className="text-sm text-sky-800">
                              Join the Allox Telegram group and verify to earn {telegramJoinTask.points} points.
                            </p>
                          </div>
                          <div className="flex gap-2">
                            {!telegramJoinTask.completed && (
                              <button
                                onClick={handleTelegramJoin}
                                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-sky-200 text-sky-700 text-sm font-semibold hover:bg-sky-100 transition-colors"
                              >
                                <ExternalLink className="w-4 h-4" />
                                Join
                              </button>
                            )}
                            <button
                              onClick={handleTelegramVerifyJoin}
                              disabled={telegramJoinTask.completed || loading.telegramVerify || telegramVerifyState === "loading"}
                              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${
                                telegramJoinTask.completed || telegramVerifyState === "success"
                                  ? "bg-green-500 text-white"
                                  : telegramVerifyState === "error"
                                    ? "bg-red-500 text-white"
                                    : telegramVerifyState === "loading" || loading.telegramVerify
                                      ? "bg-gray-400 text-white cursor-wait"
                                      : "bg-sky-600 hover:bg-sky-700 text-white"
                              }`}
                            >
                              {telegramVerifyState === "loading" || loading.telegramVerify ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Send className="w-4 h-4" />
                              )}
                              {telegramJoinTask.completed || telegramVerifyState === "success" ? "Verified" : telegramVerifyState === "error" ? "Failed" : "Verify"}
                            </button>
                          </div>
                        </div>
                      </div>

                      <div className="rounded-2xl border border-sky-200/60 bg-gradient-to-r from-sky-50 to-cyan-50 p-4">
                        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                          <div>
                            <h3 className="text-sm font-bold text-sky-900">Join Allox Announcements</h3>
                            <p className="text-sm text-sky-800">
                              Join the announcements channel and verify to earn {telegramAnnouncementsTask.points} points.
                            </p>
                          </div>
                          <div className="flex gap-2">
                            {!telegramAnnouncementsTask.completed && (
                              <button
                                onClick={handleTelegramJoinAnnouncements}
                                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-sky-200 text-sky-700 text-sm font-semibold hover:bg-sky-100 transition-colors"
                              >
                                <ExternalLink className="w-4 h-4" />
                                Join
                              </button>
                            )}
                            <button
                              onClick={handleTelegramVerifyAnnouncements}
                              disabled={telegramAnnouncementsTask.completed || loading.telegramAnnVerify || telegramAnnouncementsVerifyState === "loading"}
                              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${
                                telegramAnnouncementsTask.completed || telegramAnnouncementsVerifyState === "success"
                                  ? "bg-green-500 text-white"
                                  : telegramAnnouncementsVerifyState === "error"
                                    ? "bg-red-500 text-white"
                                    : telegramAnnouncementsVerifyState === "loading" || loading.telegramAnnVerify
                                      ? "bg-gray-400 text-white cursor-wait"
                                      : "bg-sky-600 hover:bg-sky-700 text-white"
                              }`}
                            >
                              {telegramAnnouncementsVerifyState === "loading" || loading.telegramAnnVerify ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Send className="w-4 h-4" />
                              )}
                              {telegramAnnouncementsTask.completed || telegramAnnouncementsVerifyState === "success" ? "Verified" : telegramAnnouncementsVerifyState === "error" ? "Failed" : "Verify"}
                            </button>
                          </div>
                        </div>
                      </div>
                    </>
                  )}

                  {!telegramStatus.linked && (
                    <div className="rounded-2xl border border-sky-200/60 bg-gradient-to-r from-sky-50 to-cyan-50 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <h3 className="text-sm font-bold text-sky-900">Connect Telegram to get rewards</h3>
                          <p className="text-sm text-sky-800">Link Telegram to unlock 2 Telegram reward tasks.</p>
                        </div>
                        <button
                          onClick={handleTelegramConnect}
                          disabled={loading.telegramAuth}
                          className="flex items-center gap-2 px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl transition-colors text-sm font-medium disabled:opacity-50"
                        >
                          <Send className="w-4 h-4" />
                          {loading.telegramAuth ? "Connecting..." : "Connect"}
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="rounded-2xl border border-indigo-200/60 bg-gradient-to-r from-indigo-50 to-purple-50 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <h3 className="text-sm font-bold text-indigo-900">Connect X to get rewards</h3>
                        <p className="text-sm text-indigo-800">Link your X account to unlock X task rewards.</p>
                      </div>
                      <button
                        onClick={handleConnect}
                        disabled={loading.auth || !twitterStatus.cooldown.allowed}
                        className="flex items-center gap-2 px-4 py-2 bg-black hover:bg-gray-800 text-white rounded-xl transition-colors text-sm font-medium disabled:opacity-50"
                      >
                        <XLogo className="w-4 h-4" />
                        {loading.auth ? "Connecting..." : "Connect "}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </>
          ) : loading.tasks ? (
            <div className="flex justify-center items-center p-6">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            </div>
          ) : (
            <>
              {/* Tabs */}

              {/* Tasks List */}
        <div className="p-6 overflow-y-auto max-h-[calc(80vh-340px)] sm:max-h-[calc(80vh-270px)]">
              <div className="space-y-4">
                {!telegramStatus.linked && (
                  <div className="rounded-2xl border border-sky-200/60 bg-gradient-to-r from-sky-50 to-cyan-50 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <h3 className="text-sm font-bold text-sky-900">Connect Telegram to get rewards</h3>
                        <p className="text-sm text-sky-800">Link Telegram to unlock Channel and Announcements tasks.</p>
                      </div>
                      <button
                        onClick={handleTelegramConnect}
                        disabled={loading.telegramAuth}
                        className="flex items-center gap-2 px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl transition-colors text-sm font-medium disabled:opacity-50"
                      >
                        <Send className="w-4 h-4" />
                        {loading.telegramAuth ? "Connecting..." : "Connect"}
                      </button>
                    </div>
                  </div>
                )}

                {telegramStatus.linked && (currentTab === "available"
                  ? telegramJoinAvailableForTab
                  : telegramJoinCompletedForTab) && (
                  <>
                    <div className="rounded-2xl border border-sky-200/60 bg-gradient-to-r from-sky-50 to-cyan-50 p-4">
                      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                        <div>
                          <h3 className="text-sm font-bold text-sky-900">Join Allox Group</h3>
                          <p className="text-sm text-sky-800">
                            Join the Allox Telegram group and verify to earn {telegramJoinTask.points} points.
                          </p>
                        </div>
                        <div className="flex gap-2">
                          {!telegramJoinCompletedForTab && (
                            <button
                              onClick={handleTelegramJoin}
                              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-sky-200 text-sky-700 text-sm font-semibold hover:bg-sky-100 transition-colors"
                            >
                              <ExternalLink className="w-4 h-4" />
                              Join
                            </button>
                          )}
                          <button
                            onClick={handleTelegramVerifyJoin}
                            disabled={telegramJoinCompletedForTab || loading.telegramVerify || telegramVerifyState === "loading"}
                            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${
                              telegramJoinCompletedForTab || telegramVerifyState === "success"
                                ? "bg-green-500 text-white"
                                : telegramVerifyState === "error"
                                  ? "bg-red-500 text-white"
                                  : telegramVerifyState === "loading" || loading.telegramVerify
                                    ? "bg-gray-400 text-white cursor-wait"
                                    : "bg-sky-600 hover:bg-sky-700 text-white"
                            }`}
                          >
                            {telegramVerifyState === "loading" || loading.telegramVerify ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Send className="w-4 h-4" />
                            )}
                            {telegramJoinCompletedForTab || telegramVerifyState === "success" ? "Verified" : telegramVerifyState === "error" ? "Failed" : "Verify"}
                          </button>
                        </div>
                      </div>
                    </div>
                  </>
                )}

                {telegramStatus.linked && (currentTab === "available"
                  ? telegramAnnouncementsAvailableForTab
                  : telegramAnnouncementsCompletedForTab) && (
                  <>
                    <div className="rounded-2xl border border-sky-200/60 bg-gradient-to-r from-sky-50 to-cyan-50 p-4">
                      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                        <div>
                          <h3 className="text-sm font-bold text-sky-900">Join Allox Announcements</h3>
                          <p className="text-sm text-sky-800">
                            Join the announcements channel and verify to earn {telegramAnnouncementsTask.points} points.
                          </p>
                        </div>
                        <div className="flex gap-2">
                          {!telegramAnnouncementsCompletedForTab && (
                            <button
                              onClick={handleTelegramJoinAnnouncements}
                              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-sky-200 text-sky-700 text-sm font-semibold hover:bg-sky-100 transition-colors"
                            >
                              <ExternalLink className="w-4 h-4" />
                              Join
                            </button>
                          )}
                          <button
                            onClick={handleTelegramVerifyAnnouncements}
                            disabled={telegramAnnouncementsCompletedForTab || loading.telegramAnnVerify || telegramAnnouncementsVerifyState === "loading"}
                            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${
                              telegramAnnouncementsCompletedForTab || telegramAnnouncementsVerifyState === "success"
                                ? "bg-green-500 text-white"
                                : telegramAnnouncementsVerifyState === "error"
                                  ? "bg-red-500 text-white"
                                  : telegramAnnouncementsVerifyState === "loading" || loading.telegramAnnVerify
                                    ? "bg-gray-400 text-white cursor-wait"
                                    : "bg-sky-600 hover:bg-sky-700 text-white"
                            }`}
                          >
                            {telegramAnnouncementsVerifyState === "loading" || loading.telegramAnnVerify ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Send className="w-4 h-4" />
                            )}
                            {telegramAnnouncementsCompletedForTab || telegramAnnouncementsVerifyState === "success" ? "Verified" : telegramAnnouncementsVerifyState === "error" ? "Failed" : "Verify"}
                          </button>
                        </div>
                      </div>
                    </div>
                  </>
                )}

                {!twitterStatus.linked && currentTab === "available" && (
                  <div className="rounded-2xl border border-indigo-200/60 bg-gradient-to-r from-indigo-50 to-purple-50 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <h3 className="text-sm font-bold text-indigo-900">Connect X to get rewards</h3>
                        <p className="text-sm text-indigo-800">Link your X account to unlock X task rewards.</p>
                      </div>
                      <button
                        onClick={handleConnect}
                        disabled={loading.auth || !twitterStatus.cooldown.allowed}
                        className="flex items-center gap-2 px-4 py-2 bg-black hover:bg-gray-800 text-white rounded-xl transition-colors text-sm font-medium disabled:opacity-50"
                      >
                        <XLogo className="w-4 h-4" />
                        {loading.auth ? "Connecting..." : "Connect"}
                      </button>
                    </div>
                  </div>
                )}

                {twitterStatus.linked && currentTab === "available" && hasFollowTask && !isFollowCompleted && (
            
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="relative bg-gradient-to-br from-purple-500 via-indigo-500 to-blue-500 rounded-2xl p-[2px] shadow-xl hover:shadow-2xl transition-all"
                  >
                 
                    <div className="absolute inset-0 bg-gradient-to-br from-purple-400 via-indigo-400 to-blue-400 rounded-2xl blur-xl opacity-50"></div>

                    <div className="relative bg-white/95 backdrop-blur-xl rounded-2xl p-6">
                      <div className="flex items-start gap-4">
                        <div className="relative w-12 h-12 bg-gradient-to-br from-purple-600 to-indigo-600 rounded-xl hidden md:flex items-center justify-center flex-shrink-0 shadow-lg">
                          <Sparkles className="w-6 h-6 text-white" />
                          <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/30 to-transparent rounded-xl animate-pulse"></div>
                        </div>

                        <div className="flex-1">
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <div className="inline-flex items-center gap-1 px-2 py-1 bg-gradient-to-r from-yellow-400 to-orange-400 rounded-lg mb-2">
                                <Star className="w-3 h-3 text-white fill-white" />
                                <span className="text-xs font-bold text-white">
                                  FOLLOW US
                                </span>
                              </div>

                              <h3 className="text-lg font-bold mb-1 bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
                                {followTask.title}
                              </h3>
                              <p className="text-sm text-gray-600 mb-2">
                                {followTask.description}
                              </p>

                              <div className="flex items-center gap-4 text-xs text-gray-500 mb-3">
                              
                                <div className="flex items-center gap-1 font-bold text-transparent bg-gradient-to-r from-yellow-500 to-orange-500 bg-clip-text">
                                  <Coins className="w-4 h-4 fill-yellow-500 text-yellow-500" />
                                  {followTask.points} points
                                </div>
                              </div>

                             
                            </div>
                          </div>

                          {/* Action Buttons */}
                          {!isFollowCompleted && (
                            <div className="flex gap-3">
                              <a
                                href={"https://x.com/alloxdotai"}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-xl font-semibold transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                <ExternalLink className="w-4 h-4" />
                                Follow
                              </a>
                              <div className="group relative">
                                <button
                                  onClick={handleFollowVerify}
                                  disabled={isLimited ||
                                    actionCooldownEndTime !== null
                                  }
                                  className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold transition-all shadow-md ${
                                    isLimited 
                                      ? "bg-gray-400 text-white cursor-not-allowed"
                                      : followVerifyState === "success"
                                        ? "bg-green-500 text-white"
                                        : followVerifyState === "error"
                                          ? "bg-red-500 text-white"
                                          : isFollowCompleted
                                            ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                                            : "bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white hover:shadow-lg"
                                  }`}
                                >
                                  <>
                                      <svg
                                        className="w-4 h-4"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                        stroke="currentColor"
                                      >
                                        <path
                                          strokeLinecap="round"
                                          strokeLinejoin="round"
                                          strokeWidth={2}
                                          d="M5 13l4 4L19 7"
                                        />
                                      </svg>
                                      {followVerifyState === "success"
                                        ? "Verified"
                                        : followVerifyState === "error"
                                          ? "Failed"
                                          : "Verify"}
                                    </>
                                </button>
                                {followTimerEndTime !== null && (
                                  <div className="absolute bottom-full right-0 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                                    You can verify after the timer ends
                                  </div>
                                )}
                              </div>
                            </div>
                          )}

                          {isFollowCompleted && (
                            <div className="flex items-center gap-2 text-green-600 font-semibold text-sm">
                              <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                                <svg
                                  className="w-3 h-3 text-white"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  stroke="currentColor"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={3}
                                    d="M5 13l4 4L19 7"
                                  />
                                </svg>
                              </div>
                              Completed
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}

                {twitterStatus.linked && currentTab === "completed" && hasFollowTask && isFollowCompleted && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="relative bg-gradient-to-br from-black-500 via-black-500 to-black-500 rounded-2xl p-[2px] shadow-xl"
                  >
                    <div className="relative bg-white/95 backdrop-blur-xl rounded-2xl p-6">
                      <div className="flex items-start gap-4">
                          <div className="w-12 h-12 bg-black rounded-xl flex items-center justify-center flex-shrink-0 hidden md:flex">
                            <img
                              src={"https://cdn.allox.ai/allox/alloxWhite.svg"}
                              alt=""
                              className="h-10 flex"
                            />
                          </div>

                        <div className="flex-1">
                          <div className="inline-flex items-center gap-1 px-2 py-1 bg-gradient-to-r from-green-400 to-teal-400 rounded-lg mb-2">
                            <Star className="w-3 h-3 text-white fill-white" />
                            <span className="text-xs font-bold text-white">
                              FOLLOW US
                            </span>
                          </div>
                           <div className="flex items-center gap-1 font-bold text-transparent bg-gradient-to-r from-yellow-500 to-orange-500 bg-clip-text text-xs">
                                  <Coins className="w-4 h-4 fill-yellow-500 text-yellow-500" />
                                  1000 points
                                </div>
                          <h3 className="text-lg font-bold mb-1 bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                            {followTask.title}
                          </h3>
                          <p className="text-sm text-gray-600 mb-2">
                            {followTask.description}
                          </p>

                          <div className="flex items-center gap-2 text-green-600 font-semibold text-sm mt-4">
                            <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                              <svg
                                className="w-3 h-3 text-white"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={3}
                                  d="M5 13l4 4L19 7"
                                />
                              </svg>
                            </div>
                            Completed
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
                {twitterStatus.linked && currentTab === "available" && !promoTask.completedToday && (
            
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="relative bg-gradient-to-br from-purple-500 via-indigo-500 to-blue-500 rounded-2xl p-[2px] shadow-xl hover:shadow-2xl transition-all"
                  >
                 
                    <div className="absolute inset-0 bg-gradient-to-br from-purple-400 via-indigo-400 to-blue-400 rounded-2xl blur-xl opacity-50"></div>

                    <div className="relative bg-white/95 backdrop-blur-xl rounded-2xl p-6">
                      <div className="flex items-start gap-4">
                        <div className="relative w-12 h-12 bg-gradient-to-br from-purple-600 to-indigo-600 rounded-xl hidden md:flex items-center justify-center flex-shrink-0 shadow-lg">
                          <Sparkles className="w-6 h-6 text-white" />
                          <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/30 to-transparent rounded-xl animate-pulse"></div>
                        </div>

                        <div className="flex-1">
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <div className="inline-flex items-center gap-1 px-2 py-1 bg-gradient-to-r from-yellow-400 to-orange-400 rounded-lg mb-2">
                                <Star className="w-3 h-3 text-white fill-white" />
                                <span className="text-xs font-bold text-white">
                                  DAILY PROMO
                                </span>
                              </div>

                              <h3 className="text-lg font-bold mb-1 bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
                                {promoTask.title}
                              </h3>
                              <p className="text-sm text-gray-600 mb-2">
                                {promoTask.description}
                              </p>

                              <div className="flex items-center gap-4 text-xs text-gray-500 mb-3">
                                <span className="flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  Resets Daily
                                </span>
                                <div className="flex items-center gap-1 font-bold text-transparent bg-gradient-to-r from-yellow-500 to-orange-500 bg-clip-text">
                                  <Coins className="w-4 h-4 fill-yellow-500 text-yellow-500" />
                                  {promoTask.points} points
                                </div>
                              </div>

                              <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 mb-4 text-sm text-gray-700 italic">
                                "Help me earn points by tweeting about
                                @alloxdotai!" (must mention @alloxdotai)
                              </div>
                            </div>
                          </div>

                          {/* Action Buttons */}
                          {!promoTask.completedToday && (
                            <div className="flex gap-3">
                              <button
                                onClick={handlePromoPost}
                                disabled={promoTimerEndTime !== null}
                                className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-xl font-semibold transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                <ExternalLink className="w-4 h-4" />
                                Post
                              </button>
                              <div className="group relative">
                                <button
                                  onClick={handlePromoVerify}
                                  disabled={
                                    promoTask.completedToday ||
                                    !promoPosted ||
                                    promoTimerEndTime !== null ||
                                    promoVerifyState === "success" ||
                                    isLimited ||
                                    actionCooldownEndTime !== null
                                  }
                                  className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold transition-all shadow-md ${
                                    !promoPosted || promoTimerEndTime !== null || isLimited 
                                      ? "bg-gray-400 text-white cursor-not-allowed"
                                      : promoVerifyState === "success"
                                        ? "bg-green-500 text-white"
                                        : promoVerifyState === "error"
                                          ? "bg-red-500 text-white"
                                          : promoTask.completedToday
                                            ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                                            : "bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white hover:shadow-lg"
                                  }`}
                                >
                                  {promoTimerEndTime !== null ? (
                                    <>
                                      <Clock className="w-4 h-4" />
                                      {promoTimerRemaining}
                                    </>
                                  ) : (
                                    <>
                                      <svg
                                        className="w-4 h-4"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                        stroke="currentColor"
                                      >
                                        <path
                                          strokeLinecap="round"
                                          strokeLinejoin="round"
                                          strokeWidth={2}
                                          d="M5 13l4 4L19 7"
                                        />
                                      </svg>
                                      {promoVerifyState === "success"
                                        ? "Verified"
                                        : promoVerifyState === "error"
                                          ? "Failed"
                                          : "Verify"}
                                    </>
                                  )}
                                </button>
                                {promoTimerEndTime !== null && (
                                  <div className="absolute bottom-full right-0 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                                    You can verify after the timer ends
                                  </div>
                                )}
                              </div>
                            </div>
                          )}

                          {promoTask.completedToday && (
                            <div className="flex items-center gap-2 text-green-600 font-semibold text-sm">
                              <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                                <svg
                                  className="w-3 h-3 text-white"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  stroke="currentColor"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={3}
                                    d="M5 13l4 4L19 7"
                                  />
                                </svg>
                              </div>
                              Completed - Check back tomorrow!
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}

                {twitterStatus.linked && currentTab === "completed" && isPromoCompleted && (
                  /* Premium Daily Promo Task - Completed View */
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="relative bg-gradient-to-br from-green-500 via-emerald-500 to-teal-500 rounded-2xl p-[2px] shadow-xl"
                  >
                    <div className="relative bg-white/95 backdrop-blur-xl rounded-2xl p-6">
                      <div className="flex items-start gap-4">
                        {/* Premium Icon */}
                        <div className="relative w-12 h-12 bg-gradient-to-br from-green-600 to-emerald-600 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg">
                          <Sparkles className="w-6 h-6 text-white" />
                        </div>

                        {/* Content */}
                        <div className="flex-1">
                          <div className="inline-flex items-center gap-1 px-2 py-1 bg-gradient-to-r from-yellow-400 to-orange-400 rounded-lg mb-2">
                            <Star className="w-3 h-3 text-white fill-white" />
                            <span className="text-xs font-bold text-white">
                              DAILY PROMO
                            </span>
                          </div>
                          <div className="flex items-center gap-1 font-bold text-transparent bg-gradient-to-r from-yellow-500 to-orange-500 bg-clip-text text-xs">
                                  <Coins className="w-4 h-4 fill-yellow-500 text-yellow-500" />
                                  500 points
                                </div>
                          <h3 className="text-lg font-bold mb-1 bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                            {promoTask.title}
                          </h3>
                          <p className="text-sm text-gray-600 mb-2">
                            {promoTask.description}
                          </p>

                          <div className="flex items-center gap-2 text-green-600 font-semibold text-sm mt-4">
                            <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                              <svg
                                className="w-3 h-3 text-white"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={3}
                                  d="M5 13l4 4L19 7"
                                />
                              </svg>
                            </div>
                            Completed - Check back tomorrow!
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}

                {twitterStatus.linked &&
                (currentTab === "available" ? availableTasks : completedTasks).length +
                  currentTabTelegramCount === 0 &&
                ((currentTab === "available" && isFollowCompleted && isPromoCompleted) ||
                  (currentTab === "completed" && !isFollowCompleted && !isPromoCompleted)) ? (
                  <div className="text-center py-12 text-gray-500">
                    {currentTab === "available"
                      ? "No available tasks at the moment"
                      : "No completed tasks yet"}
                  </div>
                ) : (
                  twitterStatus.linked &&
                  (currentTab === "available"
                    ? availableTasks
                    : completedTasks
                  ).map((task: any) => {
                    const taskState = actionStates[task.id] || {
                      like: "idle",
                      retweet: "idle",
                    };

                    return (
                      <div
                        key={task.id}
                        className="relative bg-white/60 backdrop-blur-xl border border-white/60 rounded-2xl p-6 hover:shadow-lg transition-all"
                      >
                        <a
                          href={task.tweetUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-start gap-4"
                        >
                          {/* Icon */}
                          <div className="w-12 h-12 bg-black rounded-xl flex items-center justify-center flex-shrink-0 hidden md:flex">
                            <img
                              src={"https://cdn.allox.ai/allox/alloxWhite.svg"}
                              alt=""
                              className="h-10 flex"
                            />
                          </div>

                          {/* Content */}
                          <div className="flex-1">
                            <div className="flex items-start justify-between mb-2">
                              <div>
                                {/* <h3 className="text-lg font-bold mb-1">{task.title}</h3> */}
                                <p className="text-sm text-gray-600 mb-2">
                                  {task.tweetText.length > 100
                                    ? task.tweetText.substring(0, 100) + "..."
                                    : task.tweetText}
                                </p>
                                <div className="flex items-center gap-4 text-xs text-gray-500">
                                  <span>
                                    Added:{" "}
                                    {new Date(
                                      task.dateAdded,
                                    ).toLocaleDateString()}
                                  </span>
                                  <div className="flex items-center gap-1 font-semibold text-yellow-600">
                                    <Coins className="w-3 h-3 fill-yellow-500 text-yellow-500" />
                                    {task.actions[0].points +
                                      task.actions[1].points}{" "}
                                    points
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Action Buttons */}
                            {currentTab === "available" && (
                              <div className="flex gap-3 mt-4">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    e.preventDefault();
                                    handleAction(task.id, "like");
                                  }}
                                  disabled={
                                    task.actions?.find(
                                      (a: any) => a.action === "like",
                                    )?.completed ||
                                    taskState.like === "loading" ||
                                    isLimited ||
                                    actionCooldownEndTime !== null
                                  }
                                  className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all ${
                                    (isLimited || actionCooldownEndTime !== null) &&
                                    getActionButtonClass("limited", false)
                                  } ${getActionButtonClass(
                                    taskState.like,
                                    task.actions?.find(
                                      (a: any) => a.action === "like",
                                    )?.completed,
                                  )}`}
                                >
                                  <ThumbsUp className="w-4 h-4" />
                                  {taskState.like === "loading" ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                  ) : task.liked ? (
                                    "Liked"
                                  ) : taskState.like === "error" ? (
                                    "Failed"
                                  ) : (
                                    "Like"
                                  )}
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    e.preventDefault();
                                    handleAction(task.id, "retweet");
                                  }}
                                  disabled={
                                    task.actions?.find(
                                      (a: any) => a.action === "retweet",
                                    )?.completed ||
                                    taskState.retweet === "loading" ||
                                    isLimited ||
                                    actionCooldownEndTime !== null
                                  }
                                  className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all ${
                                    (isLimited || actionCooldownEndTime !== null) &&
                                    getActionButtonClass("limited", false)
                                  } ${getActionButtonClass(
                                    taskState.retweet,
                                    task.actions?.find(
                                      (a: any) => a.action === "retweet",
                                    )?.completed,
                                  )}`}
                                >
                                  <Repeat2 className="w-4 h-4" />
                                  {taskState.retweet === "loading" ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                  ) : task.actions?.find(
                                      (a: any) => a.action === "retweet",
                                    )?.completed ? (
                                    "Reposted"
                                  ) : taskState.retweet === "error" ? (
                                    "Failed"
                                  ) : (
                                    "Repost"
                                  )}
                                </button>
                              </div>
                            )}

                            {currentTab === "completed" && (
                              <div className="flex items-center gap-2 text-green-600 font-semibold text-sm mt-4">
                                <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                                  <svg
                                    className="w-3 h-3 text-white"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={3}
                                      d="M5 13l4 4L19 7"
                                    />
                                  </svg>
                                </div>
                                Completed
                              </div>
                            )}
                          </div>
                        </a>

                        {currentTab === "available" && actionCooldownEndTime !== null && (
                          <div className="pointer-events-none absolute bottom-3 right-3 inline-flex items-center gap-1 rounded-lg bg-gray-900/90 px-2 py-1 text-xs font-semibold text-white">
                            <Clock className="h-3.5 w-3.5" />
                            {actionCooldownRemaining}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
              </div>
            </>
          )}
      
      </motion.div>

      {/* Disconnect Confirmation Modal */}
      <AnimatePresence>
        {showDisconnectModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 flex items-center justify-center bg-black/30 backdrop-blur-sm z-10"
            onClick={handleCancelDisconnect}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl p-6 max-w-md mx-4 shadow-2xl"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
                  <LogOut className="w-6 h-6 text-red-600" />
                </div>
                <div>
                  <h3 className="text-xl font-bold">Disconnect X Account?</h3>
                </div>
              </div>

              <p className="text-gray-600 mb-6 leading-relaxed">
                If you disconnect, you won't be able to connect again for 24
                hours. Are you sure you want to continue?
              </p>

              <div className="flex gap-3">
                <button
                  onClick={handleCancelDisconnect}
                  className="flex-1 px-4 py-3 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-xl font-semibold transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmDisconnect}
                  className="flex-1 px-4 py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl font-semibold transition-colors"
                >
                  Disconnect
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
