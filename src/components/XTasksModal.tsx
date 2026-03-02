import { X as XIcon, ThumbsUp, Repeat2, LogOut, Star } from "lucide-react";
import { useState } from "react";
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

  const handleConnect = () => {
    // Simulate X connection
    const mockUsername = "@user" + Math.floor(Math.random() * 10000);
    setXUsername(mockUsername);
    setIsConnected(true);
    onTasksViewed(); // Mark tasks as viewed when connected
  };

  const handleDisconnect = () => {
    setIsConnected(false);
    setXUsername("");
  };

  const handleAction = (taskId: string, action: "like" | "repost") => {
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

  const getActionButtonClass = (state: "idle" | "success" | "error", isDisabled: boolean) => {
    if (isDisabled) {
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

  const availableTasks = tasks.filter((task) => !task.completed);
  const completedTasks = tasks.filter((task) => task.completed);
  const totalStarsToday = completedTasks.reduce((sum, task) => sum + task.points, 0);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50  flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
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

          {/* Connected User Info */}
          {isConnected && (
            <div className="flex items-center justify-between bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-200/50 rounded-2xl p-4">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <XLogo className="w-5 h-5" />
                  <span className="font-semibold">{xUsername}</span>
                </div>
                <div className="flex items-center gap-2 px-3 py-1 bg-white rounded-lg">
                  <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                  <span className="text-sm font-bold">{totalStarsToday} points today</span>
                </div>
              </div>
              <button
                onClick={handleDisconnect}
                className="flex items-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-xl transition-colors text-sm font-medium"
              >
                <LogOut className="w-4 h-4" />
                Disconnect
              </button>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(80vh-180px)]">
          {!isConnected ? (
            // Connection Prompt
            <div className="text-center py-12">
              <div className="w-20 h-20 bg-black rounded-3xl flex items-center justify-center mx-auto mb-6">
                <XLogo className="w-10 h-10 text-white" />
              </div>
              <h3 className="text-2xl font-bold mb-2">Connect Your X Account</h3>
              <p className="text-gray-600 mb-8 max-w-md mx-auto">
                Connect your X (Twitter) account to start completing social tasks and earning points
              </p>
              <button
                onClick={handleConnect}
                className="px-8 py-3 bg-black hover:bg-gray-800 text-white rounded-xl font-semibold transition-colors"
              >
                Connect X Account
              </button>
            </div>
          ) : (
            <>
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
                                  disabled={task.liked}
                                  className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all ${getActionButtonClass(
                                    taskState.like,
                                    task.liked
                                  )}`}
                                >
                                  <ThumbsUp className="w-4 h-4" />
                                  {task.liked ? "Liked" : taskState.like === "error" ? "Failed" : "Like"}
                                </button>
                                <button
                                  onClick={() => handleAction(task.id, "repost")}
                                  disabled={task.reposted}
                                  className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all ${getActionButtonClass(
                                    taskState.repost,
                                    task.reposted
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
    </div>
  );
}
