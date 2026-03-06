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
} from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useSocial } from "../hooks/useSocial";
import { useSelector } from "react-redux";
import { toast } from "sonner";

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
    tasks,
    promoTask,
    taskStats,
    socialPoints,
    loading,
    error,
    fetchTwitterStatus,
    fetchSocialPoints,
    linkTwitter,
    unlinkTwitter,
    fetchTasks,
    verifyTaskAction,
    postPromoTweet,
    verifyPromoTweet,
    clearError,
    markAllAsSeen,
  } = useSocial();

  const [currentTab, setCurrentTab] = useState<"available" | "completed">(
    "available",
  );
  const [showDisconnectModal, setShowDisconnectModal] = useState(false);
  const [disconnectTime, setDisconnectTime] = useState<number | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<string>("");
  const [promoVerifyState, setPromoVerifyState] = useState<
    "idle" | "success" | "error"
  >("idle");
  const [promoPosted, setPromoPosted] = useState(false);
  const [actionStates, setActionStates] = useState<{
    [key: string]: {
      like: "idle" | "success" | "error";
      retweet: "idle" | "success" | "error";
    };
  }>({});
  const lastErrorRef = useRef<string | null>(null);

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

  // Fetch data when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchTwitterStatus();
      if (twitterStatus.linked) {
        fetchTasks();
      }
      onTasksViewed();
    }
  }, [
    isOpen,
    fetchTwitterStatus,
    fetchTasks,
    onTasksViewed,
    twitterStatus.linked,
  ]);

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
    setPromoPosted(true);
  };

  const handlePromoVerify = async () => {
    try {
      setPromoVerifyState("idle");
      await verifyPromoTweet();
      setPromoVerifyState("success");
    } catch (err) {
      setPromoVerifyState("error");
      setTimeout(() => {
        setPromoVerifyState("idle");
      }, 2000);
    }
  };

  const handleAction = async (taskId: string, action: "like" | "retweet") => {
    try {
      // Set loading state
      setActionStates((prev) => ({
        ...prev,
        [taskId]: {
          ...prev[taskId],
          [action === "like" ? "like" : "retweet"]: "idle",
        },
      }));

      // Open tweet in new tab

      // Small delay before verification
      setTimeout(async () => {
        try {
          await verifyTaskAction(taskId, action)
          fetchSocialPoints();
          setActionStates((prev) => ({
            ...prev,
            [taskId]: {
              ...prev[taskId],
              [action === "like" ? "like" : "retweet"]: "success",
            },
          }));
        } catch (err) {
          setActionStates((prev) => ({
            ...prev,
            [taskId]: {
              ...prev[taskId],
              [action === "like" ? "like" : "repost"]: "error",
            },
          }));
          // Reset to idle after 2 seconds
          setTimeout(() => {
            setActionStates((prev) => ({
              ...prev,
              [taskId]: {
                ...prev[taskId],
                [action === "like" ? "like" : "retweet"]: "idle",
              },
            }));
          }, 2000);
        }
      }, 1000);
    } catch (err) {
      // Error handled in hook
    }
  };

  const getActionButtonClass = (
    state: "idle" | "success" | "error",
    isCompleted: boolean,
  ) => {
    if (isCompleted) {
      return "bg-green-500 text-white cursor-not-allowed";
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

  const totalStarsToday = socialPoints;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white/90 backdrop-blur-xl rounded-3xl shadow-2xl w-full max-w-4xl h-[80vh] overflow-hidden border border-white/60"
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
          <div className="flex items-center justify-between bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-200/50 rounded-2xl p-4">
            {twitterStatus.linked ? (
              <>
                {/* Left side - Points */}
                <div className="flex items-center gap-2 px-3 py-1 bg-white rounded-lg">
                  <Coins className="size-4 text-amber-500" />

                  <span className="text-sm font-bold">
                    {totalStarsToday} points
                  </span>
                </div>

                {/* Right side - Username and Disconnect */}
                <div className="flex flex-col items-end gap-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">
                      @{twitterStatus.username}
                    </span>
                  </div>
                  <button
                    onClick={handleDisconnectClick}
                    disabled={loading.unlink}
                    className="text-sm text-red-600 hover:text-red-700 underline font-medium transition-colors disabled:opacity-50"
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
                  <span className="font-semibold text-gray-600">
                    Not Connected
                  </span>
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
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(80vh-190px)]">
          {!twitterStatus.linked || loading.tasks ? (
            <>
              {/* Tabs (same layout as connected) */}
              <div className="flex gap-2 mb-6">
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

              {/* Skeleton Cards */}
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="bg-white/60 backdrop-blur-xl border border-white/60 rounded-2xl p-6 animate-pulse"
                  >
                    <div className="flex items-start gap-4">
                      {/* Icon skeleton */}
                      <div className="w-12 h-12 bg-gray-300 rounded-xl flex-shrink-0"></div>

                      {/* Content skeleton */}
                      <div className="flex-1">
                        <div className="h-6 bg-gray-300 rounded-lg w-3/4 mb-2"></div>
                        <div className="h-4 bg-gray-200 rounded-lg w-full mb-2"></div>
                        <div className="flex items-center gap-4 mb-4">
                          <div className="h-3 bg-gray-200 rounded w-24"></div>
                          <div className="h-3 bg-gray-200 rounded w-20"></div>
                        </div>
                        <div className="flex gap-3">
                          <div className="h-10 bg-gray-300 rounded-xl w-24"></div>
                          <div className="h-10 bg-gray-300 rounded-xl w-28"></div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <>
              {/* Tabs */}
              <div className="flex gap-2 mb-6">
                <button
                  onClick={() => setCurrentTab("available")}
                  className={`flex-1 px-6 py-3 rounded-xl font-semibold text-xs md:text-base transition-all ${
                    currentTab === "available"
                      ? "bg-black text-white"
                      : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                  }`}
                >
                  Available ({availableTasks.length})
                </button>
                <button
                  onClick={() => setCurrentTab("completed")}
                  className={`flex-1 px-6 py-3 rounded-xl font-semibold text-xs md:text-base transition-all ${
                    currentTab === "completed"
                      ? "bg-black text-white"
                      : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                  }`}
                >
                  Completed ({completedTasks.length})
                </button>
              </div>

              {/* Tasks List */}
              <div className="space-y-4">
                {currentTab === "available" && !promoTask.completedToday && (
                  /* Premium Daily Promo Task */
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="relative bg-gradient-to-br from-purple-500 via-indigo-500 to-blue-500 rounded-2xl p-[2px] shadow-xl hover:shadow-2xl transition-all"
                  >
                    {/* Glow effect */}
                    <div className="absolute inset-0 bg-gradient-to-br from-purple-400 via-indigo-400 to-blue-400 rounded-2xl blur-xl opacity-50"></div>

                    <div className="relative bg-white/95 backdrop-blur-xl rounded-2xl p-6">
                      <div className="flex items-start gap-4">
                        {/* Premium Icon */}
                        <div className="relative w-12 h-12 bg-gradient-to-br from-purple-600 to-indigo-600 rounded-xl hidden md:flex items-center justify-center flex-shrink-0 shadow-lg">
                          <Sparkles className="w-6 h-6 text-white" />
                          {/* Shimmer effect */}
                          <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/30 to-transparent rounded-xl animate-pulse"></div>
                        </div>

                        {/* Content */}
                        <div className="flex-1">
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              {/* Daily tag */}
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

                              {/* Tweet Preview Box (sample text) */}
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
                                className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-xl font-semibold transition-all shadow-md hover:shadow-lg"
                              >
                                <ExternalLink className="w-4 h-4" />
                                Post
                              </button>
                              <button
                                onClick={handlePromoVerify}
                                disabled={
                                  promoTask.completedToday || !promoPosted
                                }
                                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold transition-all shadow-md ${
                                  promoTask.completedToday || !promoPosted
                                    ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                                    : promoVerifyState === "success"
                                      ? "bg-green-500 text-white"
                                      : promoVerifyState === "error"
                                        ? "bg-red-500 text-white"
                                        : "bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white hover:shadow-lg"
                                }`}
                              >
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
                              </button>
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

                {currentTab === "completed" && promoTask.completedToday && (
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

                {(currentTab === "available" ? availableTasks : completedTasks)
                  .length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    {currentTab === "available"
                      ? "No available tasks at the moment"
                      : "No completed tasks yet"}
                  </div>
                ) : (
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
                        className="bg-white/60 backdrop-blur-xl border border-white/60 rounded-2xl p-6 hover:shadow-lg transition-all"
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
                              src={
                                "https://cdn.allox.ai/allox/alloxWhite.svg"
                              }
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
                                    )?.completed
                                  }
                                  className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all ${getActionButtonClass(
                                    taskState.like,
                                    task.actions?.find(
                                      (a: any) => a.action === "like",
                                    )?.completed,
                                  )}`}
                                >
                                  <ThumbsUp className="w-4 h-4" />
                                  {task.liked
                                    ? "Liked"
                                    : taskState.like === "error"
                                      ? "Failed"
                                      : "Like"}
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
                                    )?.completed
                                  }
                                  className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all ${getActionButtonClass(
                                    taskState.retweet,
                                    task.actions?.find(
                                      (a: any) => a.action === "retweet",
                                    )?.completed,
                                  )}`}
                                >
                                  <Repeat2 className="w-4 h-4" />
                                  {task.actions?.find(
                                    (a: any) => a.action === "retweet",
                                  )?.completed
                                    ? "Retweeted"
                                    : taskState.retweet === "error"
                                      ? "Failed"
                                      : "Retweet"}
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
                      </div>
                    );
                  })
                )}
              </div>
            </>
          )}
        </div>
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
