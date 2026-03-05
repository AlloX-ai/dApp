import { X as XIcon, ThumbsUp, Repeat2, LogOut, Star, Clock } from "lucide-react";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";

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
  liked: boolean;
  reposted: boolean;
  completed: boolean;
}

interface XTasksModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTasksViewed: () => void;
}

export function XTasksModal({ isOpen, onClose, onTasksViewed }: XTasksModalProps) {
  const [isConnected, setIsConnected] = useState(false);
  const [xUsername, setXUsername] = useState("");
  const [currentTab, setCurrentTab] = useState<"available" | "completed">("available");
  const [showDisconnectModal, setShowDisconnectModal] = useState(false);
  const [disconnectTime, setDisconnectTime] = useState<number | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<string>("");
  const [tasksCheckedCount, setTasksCheckedCount] = useState(0);
  const [taskLimitResetTime, setTaskLimitResetTime] = useState<number | null>(null);
  const [taskLimitTimeRemaining, setTaskLimitTimeRemaining] = useState<string>("");
  const [tasks, setTasks] = useState<Task[]>([
    {
      id: "1",
      title: "Follow AlloX on X",
      description: "Follow our official account to stay updated with the latest news",
      dateAdded: "2024-03-01",
      points: 200,
      liked: false,
      reposted: false,
      completed: false,
    },
    {
      id: "2",
      title: "Repost AlloX Launch Announcement",
      description: "Help us spread the word about our platform launch",
      dateAdded: "2024-03-01",
      points: 150,
      liked: false,
      reposted: false,
      completed: false,
    },
    {
      id: "3",
      title: "Share Your Portfolio Strategy",
      description: "Tweet about your favorite investment narrative on AlloX",
      dateAdded: "2024-03-02",
      points: 300,
      liked: false,
      reposted: false,
      completed: false,
    },
    {
      id: "4",
      title: "Like AlloX's Latest Update",
      description: "Show some love to our latest feature announcement",
      dateAdded: "2024-03-02",
      points: 100,
      liked: false,
      reposted: false,
      completed: false,
    },
  ]);

  const [actionStates, setActionStates] = useState<{
    [key: string]: { like: "idle" | "success" | "error"; repost: "idle" | "success" | "error" };
  }>({});

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
          const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
          const seconds = Math.floor((remaining % (1000 * 60)) / 1000);
          setTimeRemaining(`${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
        }
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [disconnectTime]);

  // Timer effect for task limit countdown
  useEffect(() => {
    if (taskLimitResetTime) {
      const interval = setInterval(() => {
        const now = Date.now();
        const remaining = taskLimitResetTime - now;
        
        if (remaining <= 0) {
          setTaskLimitResetTime(null);
          setTaskLimitTimeRemaining("");
          setTasksCheckedCount(0);
          clearInterval(interval);
        } else {
          const minutes = Math.floor(remaining / (1000 * 60));
          const seconds = Math.floor((remaining % (1000 * 60)) / 1000);
          setTaskLimitTimeRemaining(`${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
        }
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [taskLimitResetTime]);

  const handleConnect = () => {
    // Simulate X connection
    const mockUsername = "@user" + Math.floor(Math.random() * 10000);
    setXUsername(mockUsername);
    setIsConnected(true);
    onTasksViewed(); // Mark tasks as viewed when connected
  };

  const handleDisconnectClick = () => {
    setShowDisconnectModal(true);
  };

  const handleConfirmDisconnect = () => {
    setIsConnected(false);
    setXUsername("");
    setShowDisconnectModal(false);
    // Set disconnect time to 24 hours from now
    setDisconnectTime(Date.now() + 24 * 60 * 60 * 1000);
  };

  const handleCancelDisconnect = () => {
    setShowDisconnectModal(false);
  };

  const handleAction = (taskId: string, action: "like" | "repost") => {
    // Check if we've hit the task limit
    if (tasksCheckedCount >= 5) {
      return;
    }

    // Simulate API call
    const success = Math.random() > 0.2; // 80% success rate

    setActionStates((prev) => ({
      ...prev,
      [taskId]: {
        ...prev[taskId],
        [action]: success ? "success" : "error",
      },
    }));

    if (success) {
      // Increment task check counter
      const newCount = tasksCheckedCount + 1;
      setTasksCheckedCount(newCount);

      // If this is the 5th check, start the 15-minute timer
      if (newCount === 5) {
        setTaskLimitResetTime(Date.now() + 15 * 60 * 1000);
      }

      setTasks((prev) =>
        prev.map((task) => {
          if (task.id === taskId) {
            const updated = {
              ...task,
              [action === "like" ? "liked" : "reposted"]: true,
            };
            // Mark as completed if both actions are done
            if (
              (action === "like" && updated.liked && updated.reposted) ||
              (action === "repost" && updated.reposted && updated.liked)
            ) {
              updated.completed = true;
            }
            return updated;
          }
          return task;
        })
      );
    } else {
      // Reset to idle after 2 seconds for errors
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
  };

  const getActionButtonClass = (state: "idle" | "success" | "error", isDisabled: boolean, isLimitReached: boolean) => {
    if (isDisabled || isLimitReached) {
      return "bg-gray-300 text-gray-500 cursor-not-allowed";
    }
    if (state === "success") {
      return "bg-green-500 text-white";
    }
    if (state === "error") {
      return "bg-red-500 text-white";
    }
    return "bg-black text-white hover:bg-gray-800";
  };

  const isTaskLimitReached = tasksCheckedCount >= 5;

  const availableTasks = tasks.filter((task) => !task.completed);
  const completedTasks = tasks.filter((task) => task.completed);
  const totalStarsToday = completedTasks.reduce((sum, task) => sum + task.points, 0);

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
                <h2 className="text-2xl font-bold">X Social Rewards</h2>
                <p className="text-sm text-gray-600">Complete tasks to earn points</p>
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
            {isConnected ? (
              <>
                {/* Left side - Points */}
                <div className="flex items-center gap-2 px-3 py-1 bg-white rounded-lg">
                  <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                  <span className="text-sm font-bold">{totalStarsToday} points today</span>
                </div>

                {/* Right side - Username and Disconnect */}
                <div className="flex flex-col items-end gap-1">
                  <div className="flex items-center gap-2">
                    <XLogo className="w-5 h-5" />
                    <span className="font-semibold">{xUsername}</span>
                  </div>
                  <button
                    onClick={handleDisconnectClick}
                    className="text-sm text-red-600 hover:text-red-700 underline font-medium transition-colors"
                  >
                    Disconnect
                  </button>
                </div>
              </>
            ) : (
              <>
                {/* Left side - Not connected */}
                <div className="flex items-center gap-2">
                  <XLogo className="w-5 h-5" />
                  <span className="font-semibold text-gray-600">Not Connected</span>
                </div>

                {/* Right side - Connect button or timer */}
                {disconnectTime ? (
                  <div className="group relative">
                    <div className="flex items-center gap-2 px-4 py-2 bg-gray-300 text-gray-600 rounded-xl text-sm font-medium cursor-not-allowed">
                      <Clock className="w-4 h-4" />
                      {timeRemaining}
                    </div>
                    <div className="absolute right-0 top-full mt-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                      You can connect after the timer has ended
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={handleConnect}
                    className="flex items-center gap-2 px-4 py-2 bg-black hover:bg-gray-800 text-white rounded-xl transition-colors text-sm font-medium"
                  >
                    <XLogo className="w-4 h-4" />
                    Connect
                  </button>
                )}
              </>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(80vh-190px)]">
          {!isConnected ? (
            <>
              {/* Tabs (same layout as connected) */}
              <div className="flex gap-2 mb-6">
                <button
                  disabled
                  className="flex-1 px-6 py-3 rounded-xl font-semibold bg-black text-white cursor-not-allowed"
                >
                  Available (-)
                </button>
                <button
                  disabled
                  className="flex-1 px-6 py-3 rounded-xl font-semibold bg-gray-200 text-gray-700 cursor-not-allowed"
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
              {/* Task Limit Notice */}
              <div className={`mb-4 p-3 rounded-xl border ${
                isTaskLimitReached 
                  ? 'bg-red-50 border-red-200' 
                  : 'bg-blue-50 border-blue-200'
              }`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock className={`w-4 h-4 ${isTaskLimitReached ? 'text-red-600' : 'text-blue-600'}`} />
                    <span className={`text-sm font-medium ${isTaskLimitReached ? 'text-red-700' : 'text-blue-700'}`}>
                      {isTaskLimitReached 
                        ? `Task limit reached. Reset in ${taskLimitTimeRemaining}` 
                        : `You can check ${5 - tasksCheckedCount} more task${5 - tasksCheckedCount !== 1 ? 's' : ''} in the next 15 minutes`
                      }
                    </span>
                  </div>
                  <span className={`text-xs font-semibold px-2 py-1 rounded-lg ${
                    isTaskLimitReached 
                      ? 'bg-red-200 text-red-700' 
                      : 'bg-blue-200 text-blue-700'
                  }`}>
                    {tasksCheckedCount}/5
                  </span>
                </div>
              </div>

              {/* Tabs */}
              <div className="flex gap-2 mb-6">
                <button
                  onClick={() => setCurrentTab("available")}
                  className={`flex-1 px-6 py-3 rounded-xl font-semibold transition-all ${
                    currentTab === "available"
                      ? "bg-black text-white"
                      : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                  }`}
                >
                  Available ({availableTasks.length})
                </button>
                <button
                  onClick={() => setCurrentTab("completed")}
                  className={`flex-1 px-6 py-3 rounded-xl font-semibold transition-all ${
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
                {(currentTab === "available" ? availableTasks : completedTasks).length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    {currentTab === "available"
                      ? "No available tasks at the moment"
                      : "No completed tasks yet"}
                  </div>
                ) : (
                  (currentTab === "available" ? availableTasks : completedTasks).map((task) => {
                    const taskState = actionStates[task.id] || { like: "idle", repost: "idle" };

                    return (
                      <div
                        key={task.id}
                        className="bg-white/60 backdrop-blur-xl border border-white/60 rounded-2xl p-6 hover:shadow-lg transition-all"
                      >
                        <div className="flex items-start gap-4">
                          {/* Icon */}
                          <div className="w-12 h-12 bg-black rounded-xl flex items-center justify-center flex-shrink-0">
                            <XLogo className="w-6 h-6 text-white" />
                          </div>

                          {/* Content */}
                          <div className="flex-1">
                            <div className="flex items-start justify-between mb-2">
                              <div>
                                <h3 className="text-lg font-bold mb-1">{task.title}</h3>
                                <p className="text-sm text-gray-600 mb-2">{task.description}</p>
                                <div className="flex items-center gap-4 text-xs text-gray-500">
                                  <span>Added: {new Date(task.dateAdded).toLocaleDateString()}</span>
                                  <div className="flex items-center gap-1 font-semibold text-yellow-600">
                                    <Star className="w-3 h-3 fill-yellow-500 text-yellow-500" />
                                    {task.points} points
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Action Buttons */}
                            {!task.completed && (
                              <div className="flex gap-3 mt-4">
                                <button
                                  onClick={() => handleAction(task.id, "like")}
                                  disabled={task.liked || isTaskLimitReached}
                                  className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all ${getActionButtonClass(
                                    taskState.like,
                                    task.liked,
                                    isTaskLimitReached
                                  )}`}
                                >
                                  <ThumbsUp className="w-4 h-4" />
                                  {task.liked ? "Liked" : taskState.like === "error" ? "Failed" : "Like"}
                                </button>
                                <button
                                  onClick={() => handleAction(task.id, "repost")}
                                  disabled={task.reposted || isTaskLimitReached}
                                  className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all ${getActionButtonClass(
                                    taskState.repost,
                                    task.reposted,
                                    isTaskLimitReached
                                  )}`}
                                >
                                  <Repeat2 className="w-4 h-4" />
                                  {task.reposted
                                    ? "Reposted"
                                    : taskState.repost === "error"
                                    ? "Failed"
                                    : "Repost"}
                                </button>
                              </div>
                            )}

                            {task.completed && (
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
                        </div>
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
                If you disconnect, you won't be able to connect again for 24 hours. Are you sure you want to continue?
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
