import { useCallback, useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import { apiCall } from "../utils/api";
import {
  setTwitterStatus,
  setSocialPoints,
  setTelegramStatus,
  setTasks,
  updateTaskAction,
  setPromoTask,
  setFollowTask,
  setTaskStats,
  setLoading,
  setError,
  setRequirementError,
  clearError,
  setSeenPosts,
  setNewCount,
  setTelegramPoints,
} from "../redux/slices/socialSlice";
import { toast } from "sonner";

const TELEGRAM_BOT_ID = "8677110292";
const TELEGRAM_APP_ORIGIN = "https://app.allox.ai/rewards/";
const TELEGRAM_CALLBACK_BASE = "https://api.allox.ai/telegram/callback";

let telegramAuthInFlight = null;
let lastProcessedTelegramAuthHash = null;

const normalizeTelegramStatus = (payload) => ({
  linked: Boolean(payload?.linked),
  username: payload?.username ?? null,
  firstName: payload?.firstName ?? null,
  photoUrl: payload?.photoUrl ?? null,
  linkedAt: payload?.linkedAt ?? null,
  joinTask: {
    completed: Boolean(payload?.joinTask?.completed),
    points: payload?.joinTask?.points ?? 1000,
    completedAt: payload?.joinTask?.completedAt ?? null,
  },
  announcementsTask: {
    completed: Boolean(payload?.announcementsTask?.completed),
    points: payload?.announcementsTask?.points ?? 1000,
    completedAt: payload?.announcementsTask?.completedAt ?? null,
  },
});

export function useSocial() {
  const dispatch = useDispatch();
  const {
    twitterStatus,
    tasks,
    socialPoints,
    telegramPoints,
    promoTask,
    followTask,
    telegramStatus,
    taskStats,
    loading,
    error,
    requirementError,
    seenPosts,
    newCount,
  } = useSelector((state) => state.social);

  // Fetch Twitter status on mount
  const fetchTwitterStatus = useCallback(async () => {
    try {
      dispatch(setLoading({ key: "status", value: true }));
      dispatch(clearError());

      const data = await apiCall("/twitter/status");
      dispatch(setTwitterStatus(data));
      dispatch(setFollowTask(data.followTask));
    } catch (err) {
      dispatch(setError(err.message || "Failed to fetch Twitter status"));
    } finally {
      dispatch(setLoading({ key: "status", value: false }));
    }
  }, [dispatch]);
  // Fetch Twitter status on mount
  const fetchSocialPoints = useCallback(async () => {
    try {
      dispatch(setLoading({ key: "status", value: true }));
      dispatch(clearError());

      const data = await apiCall("/twitter/points");
      dispatch(setSocialPoints(data.totalPoints));
    } catch (err) {
      dispatch(setError(err.message || "Failed to fetch total points"));
    } finally {
      dispatch(setLoading({ key: "status", value: false }));
    }
  }, [dispatch]);

  const fetchAllPoints = useCallback(async () => {
    try {
      dispatch(setLoading({ key: "status", value: true }));
      dispatch(clearError());

      const data = await apiCall("/auth/me");

      dispatch(
        setTelegramPoints(data?.season1?.pointsBreakdown?.fromTelegram ?? 0),
      );
    } catch (err) {
      dispatch(setError(err.message || "Failed to fetch total points"));
    } finally {
      dispatch(setLoading({ key: "status", value: false }));
    }
  }, [dispatch]);

  // Link Twitter account
  const linkTwitter = useCallback(async () => {
    try {
      dispatch(setLoading({ key: "auth", value: true }));
      dispatch(clearError());

      const data = await apiCall("/twitter/auth");
      // Redirect to auth URL
      window.location.href = data.authUrl;
    } catch (err) {
      dispatch(setError(err.message || "Failed to initiate Twitter auth"));
      dispatch(setLoading({ key: "auth", value: false }));
    }
  }, [dispatch]);

  const linkTelegram = useCallback((jwtToken) => {
    const token = jwtToken || localStorage.getItem("authToken");

    if (!token) {
      throw new Error("Connect your wallet first to link Telegram");
    }

    const callbackUrl = encodeURIComponent(
      `${TELEGRAM_CALLBACK_BASE}?state=${token}`,
    );
    const oauthUrl = `https://oauth.telegram.org/auth?bot_id=${TELEGRAM_BOT_ID}&origin=${encodeURIComponent(TELEGRAM_APP_ORIGIN)}&request_access=write&return_to=${callbackUrl}`;
    window.location.href = oauthUrl;
  }, []);

  const applyTelegramStatus = useCallback(
    (statusPayload) => {
      const normalizedStatus = normalizeTelegramStatus(statusPayload);
      dispatch(setTelegramStatus(normalizedStatus));
      return normalizedStatus;
    },
    [dispatch],
  );

  const fetchTelegramStatus = useCallback(
    async ({ suppressError = false } = {}) => {
      try {
        const statusResult = await apiCall("/telegram/status");
        applyTelegramStatus(statusResult);
        return statusResult;
      } catch (err) {
        if (!suppressError) {
          dispatch(setError(err.message || "Failed to fetch Telegram status"));
        }
        throw err;
      }
    },
    [applyTelegramStatus, dispatch],
  );

  const processTelegramAuthFromHash = useCallback(async () => {
    const hash = window.location.hash || "";

    if (!hash.includes("tgAuthResult=")) return null;

    if (hash === lastProcessedTelegramAuthHash) return null;

    if (telegramAuthInFlight) {
      return telegramAuthInFlight;
    }

    const runner = async () => {
      try {
        dispatch(setLoading({ key: "telegramAuth", value: true }));
        dispatch(clearError());

        // If Telegram is already linked on backend, skip /telegram/link entirely.
        try {
          const statusResult = await fetchTelegramStatus({
            suppressError: true,
          });
          const isLinked = Boolean(statusResult?.linked);

          if (isLinked) {
            window.history.replaceState(
              {},
              document.title,
              window.location.pathname + window.location.search,
            );
            lastProcessedTelegramAuthHash = hash;
            return statusResult;
          }
        } catch (statusErr) {
          // Continue to /telegram/link when status isn't available/not linked.
        }

        const base64 = hash.split("tgAuthResult=")[1]?.split("&")[0];
        if (!base64) {
          throw new Error("Missing Telegram auth result");
        }

        const normalized = base64.replace(/-/g, "+").replace(/_/g, "/");
        const padded = normalized.padEnd(
          normalized.length + ((4 - (normalized.length % 4)) % 4),
          "=",
        );
        const authData = JSON.parse(atob(padded));

        const result = await apiCall("/telegram/link", {
          method: "POST",
          body: JSON.stringify(authData),
        });

        // After successful link, always fetch canonical status payload.
        const statusResult = await fetchTelegramStatus({ suppressError: true });
        const normalizedStatus = normalizeTelegramStatus(statusResult);

        toast.success(
          `Telegram linked${normalizedStatus.username ? `: @${normalizedStatus.username}` : ""}`,
        );

        window.history.replaceState(
          {},
          document.title,
          window.location.pathname + window.location.search,
        );
        lastProcessedTelegramAuthHash = hash;

        return { linkResult: result, statusResult };
      } catch (err) {
        dispatch(setError(err.message || "Failed to link Telegram"));
        throw err;
      } finally {
        dispatch(setLoading({ key: "telegramAuth", value: false }));
      }
    };

    telegramAuthInFlight = runner();

    try {
      return await telegramAuthInFlight;
    } finally {
      telegramAuthInFlight = null;
    }
  }, [dispatch, fetchTelegramStatus]);

  const verifyTelegramJoin = useCallback(async () => {
    try {
      dispatch(setLoading({ key: "telegramVerify", value: true }));
      dispatch(clearError());

      const data = await apiCall("/telegram/verify-join", {
        method: "POST",
      });

      const completedAt = data?.completedAt ?? new Date().toISOString();
      dispatch(
        setTelegramStatus({
          joinTask: {
            completed: true,
            points: telegramStatus?.joinTask?.points ?? 1000,
            completedAt,
          },
        }),
      );

      if (typeof data.totalPoints === "number") {
        dispatch(setTaskStats({ totalPointsEarned: data.totalPoints }));
      }

      return data;
    } catch (err) {
      throw err.message;
    } finally {
      dispatch(setLoading({ key: "telegramVerify", value: false }));
    }
  }, [dispatch, telegramStatus?.joinTask?.points]);

  const verifyTelegramAnnouncements = useCallback(async () => {
    try {
      dispatch(setLoading({ key: "telegramAnnVerify", value: true }));
      dispatch(clearError());

      const data = await apiCall("/telegram/verify-announcements", {
        method: "POST",
      });

      const completedAt = data?.completedAt ?? new Date().toISOString();
      dispatch(
        setTelegramStatus({
          announcementsTask: {
            completed: true,
            points: telegramStatus?.announcementsTask?.points ?? 1000,
            completedAt,
          },
        }),
      );

      if (typeof data.totalPoints === "number") {
        dispatch(setTaskStats({ totalPointsEarned: data.totalPoints }));
      }

      return data;
    } catch (err) {
      throw err.message;
    } finally {
      dispatch(setLoading({ key: "telegramAnnVerify", value: false }));
    }
  }, [dispatch, telegramStatus?.announcementsTask?.points]);

  // Unlink Twitter account
  const unlinkTwitter = useCallback(async () => {
    try {
      dispatch(setLoading({ key: "unlink", value: true }));
      dispatch(clearError());

      const data = await apiCall("/twitter/unlink", { method: "POST" });

      // Update status to unlinked
      dispatch(
        setTwitterStatus({
          linked: false,
          username: null,
          displayName: null,
          profileImageUrl: null,
          followersCount: null,
          linkedAt: null,
          cooldown: {
            allowed: false,
            hoursLeft: 24,
            relinkAt: data.relinkAt,
          },
          promoTask: {
            completed: false,
            points: 500,
            completedAt: null,
          },
        }),
      );

      return data;
    } catch (err) {
      dispatch(setError(err.message || "Failed to unlink Twitter account"));
      throw err;
    } finally {
      dispatch(setLoading({ key: "unlink", value: false }));
    }
  }, [dispatch]);

  // Fetch daily tasks
  const fetchTasks = useCallback(async () => {
    try {
      dispatch(setLoading({ key: "tasks", value: true }));
      dispatch(clearError());

      const data = await apiCall("/twitter/tasks");
      // normalize tasks: convert tweetCreatedAt to dateAdded and keep tweetUrl etc.
      const normalized = data.tasks.map((t) => ({
        ...t,
        dateAdded: t.tweetCreatedAt || t.dateAdded || null,
      }));
      dispatch(setTasks(normalized));
      dispatch(setPromoTask(data.promoTask));
      dispatch(
        setTaskStats({
          totalPointsAvailable: data.totalPointsAvailable,
          totalPointsEarned: data.totalPointsEarned,
          taskCount: data.taskCount,
        }),
      );
    } catch (err) {
      dispatch(setError(err.message || "Failed to fetch tasks"));
    } finally {
      dispatch(setLoading({ key: "tasks", value: false }));
    }
  }, [dispatch]);

  // Load seen posts from localStorage
  const loadSeenPosts = useCallback(() => {
    const stored = JSON.parse(localStorage.getItem("seenPosts")) || [];
    dispatch(setSeenPosts(stored));
    // Calculate new count
    const newTasksCount = tasks.filter(
      (task) => !stored.includes(task.id),
    ).length;
    dispatch(setNewCount(newTasksCount));
  }, [dispatch, tasks]);

  // Mark all tasks as seen
  const markAllAsSeen = useCallback(() => {
    const allIds = tasks.map((task) => task.id);
    dispatch(setSeenPosts(allIds));
    localStorage.setItem("seenPosts", JSON.stringify(allIds));
    dispatch(setNewCount(0));
  }, [dispatch, tasks]);

  // Verify task action
  const verifyTaskAction = useCallback(
    async (taskId, action) => {
      try {
        dispatch(setLoading({ key: "verify", value: true }));
        dispatch(clearError());

        const data = await apiCall(`/twitter/verify/${taskId}/${action}`, {
          method: "POST",
        });

        // Update task action status
        dispatch(
          updateTaskAction({
            taskId,
            action,
            completed: true,
            verifiedAt: new Date().toISOString(),
          }),
        );

        // If bonusDetected is present, update the other action as completed too
        if (data.bonusDetected) {
          const bonusActions = Object.keys(data.bonusDetected).filter(
            (k) => data.bonusDetected[k],
          );
          bonusActions.forEach((bonusAction) => {
            // update state only if not already completed
            dispatch(
              updateTaskAction({
                taskId,
                action: bonusAction,
                completed: true,
                verifiedAt: new Date().toISOString(),
              }),
            );
          });
        }

        // Update task stats
        dispatch(
          setTaskStats({
            totalPointsEarned: data.totalPoints,
          }),
        );

        return data;
      } catch (err) {
        let errorMessage = "Failed to verify action";

        if (err.status === 400) {
          if (err.data?.error === "ALREADY_COMPLETED") {
            errorMessage = "Already completed";
          } else if (err.data?.error === "NOT_FOUND") {
            errorMessage = "Could not verify. Try again in a moment.";
          }
        } else if (err.status === 401) {
          errorMessage = "Token expired. Please re-link your X account.";
        } else if (err.status === 403) {
          errorMessage = "Account not linked. Please link your X account.";
        } else if (err.status === 429) {
          errorMessage = "Too many attempts. Wait a moment.";
        }

        dispatch(setError(errorMessage));
        throw err;
      } finally {
        dispatch(setLoading({ key: "verify", value: false }));
      }
    },
    [dispatch, tasks],
  );

  // Post promo tweet
  const postPromoTweet = useCallback((tweetText) => {
    const encodedText = encodeURIComponent(tweetText);
    window.open(`https://x.com/intent/tweet`, "_blank");
  }, []);

  // Verify promo tweet
  const verifyPromoTweet = useCallback(async () => {
    try {
      dispatch(setLoading({ key: "promoVerify", value: true }));
      dispatch(clearError());

      const data = await apiCall("/twitter/verify-promo", {
        method: "POST",
      });

      // Update promo task
      dispatch(
        setPromoTask({
          completedToday: true,
          timesCompleted: promoTask.timesCompleted + 1,
        }),
      );

      // Update task stats
      dispatch(
        setTaskStats({
          totalPointsEarned: data.totalPoints,
        }),
      );

      return data;
    } catch (err) {
      let errorMessage = "Failed to verify promo tweet";

      if (err.status === 400) {
        if (err.data?.error === "ALREADY_COMPLETED") {
          errorMessage = "Already completed";
        } else if (err.data?.error === "NOT_FOUND") {
          errorMessage = "Tweet not found. Make sure you mentioned @alloxdotai";
        }
      } else if (err.status === 401) {
        errorMessage = "Token expired. Please re-link your X account.";
      }

      dispatch(setError(errorMessage));
      throw err;
    } finally {
      dispatch(setLoading({ key: "promoVerify", value: false }));
    }
  }, [dispatch, promoTask.timesCompleted]);

  // Verify follow task
  const verifyFollowTask = useCallback(async () => {
    try {
      dispatch(setLoading({ key: "followVerify", value: true }));
      dispatch(clearError());

      const data = await apiCall("/twitter/verify-follow", {
        method: "POST",
      });

      // Update follow task using API payload when available.
      if (data.followTask) {
        dispatch(setFollowTask(data.followTask));
      } else {
        dispatch(
          setFollowTask({
            ...followTask,
            completedToday: true,
            timesCompleted: (followTask?.timesCompleted || 0) + 1,
          }),
        );
      }

      // Keep points in sync without refetching tasks.
      if (typeof data.totalPoints === "number") {
        dispatch(
          setTaskStats({
            totalPointsEarned: data.totalPoints,
          }),
        );
      }

      return data;
    } catch (err) {
      let errorMessage = "Failed to verify follow task";

      if (err.status === 400) {
        if (err.data?.error === "ALREADY_COMPLETED") {
          errorMessage = "Already completed";
        } else if (err.data?.error === "NOT_FOUND") {
          errorMessage = "Could not verify follow task. Try again in a moment.";
        }
      } else if (err.status === 401) {
        errorMessage = "Token expired. Please re-link your X account.";
      } else if (err.status === 403) {
        errorMessage = "Account not linked. Please link your X account.";
      } else if (err.status === 429) {
        errorMessage = "Too many attempts. Wait a moment.";
      }

      dispatch(setError(errorMessage));
      throw err;
    } finally {
      dispatch(setLoading({ key: "followVerify", value: false }));
    }
  }, [dispatch, followTask]);

  // Handle URL parameters for auth callback
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);

    if (params.get("success") === "true") {
      const username = params.get("username");
      // Show success message
      toast.success(`Linked to @${username}!`);
      // Refresh status
      fetchTwitterStatus();
      // Clear URL parameters
      window.history.replaceState({}, document.title, window.location.pathname);
    }

    if (params.get("error")) {
      const error = params.get("error");
      const message = params.get("message");

      let errorMessage = "Something went wrong. Please try again.";

      switch (error) {
        case "denied":
          errorMessage = "Authorization cancelled";
          break;
        case "requirements":
          errorMessage = message || "Account does not meet requirements";
          break;
        case "already_linked_other":
          errorMessage = "This X account is already linked to another wallet";
          break;
      }

      if (error && message) {
        toast.error(message);
      }
      dispatch(setRequirementError(message));
      dispatch(setError(errorMessage));
      // Clear URL parameters
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [dispatch, fetchTwitterStatus]);

  useEffect(() => {
    processTelegramAuthFromHash().catch(() => {});
  }, [processTelegramAuthFromHash]);

  return {
    // State
    twitterStatus,
    tasks,
    socialPoints,
    telegramPoints,
    promoTask,
    followTask,
    telegramStatus,
    taskStats,
    loading,
    error,
    requirementError,
    seenPosts,
    newCount,
    // Actions
    fetchTwitterStatus,
    fetchSocialPoints,
    fetchAllPoints,
    linkTwitter,
    linkTelegram,
    fetchTelegramStatus,
    applyTelegramStatus,
    unlinkTwitter,
    fetchTasks,
    loadSeenPosts,
    markAllAsSeen,
    verifyTaskAction,
    postPromoTweet,
    verifyPromoTweet,
    verifyFollowTask,
    processTelegramAuthFromHash,
    verifyTelegramJoin,
    verifyTelegramAnnouncements,
    clearError,
  };
}
