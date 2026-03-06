import { useCallback, useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import { apiCall } from "../utils/api";
import {
  setTwitterStatus,
  setSocialPoints,
  setTasks,
  updateTaskAction,
  setPromoTask,
  setTaskStats,
  setLoading,
  setError,
  clearError,
  setSeenPosts,
  setNewCount,
} from "../redux/slices/socialSlice";
import { toast } from "sonner";

export function useSocial() {
  const dispatch = useDispatch();
  const {
    twitterStatus,
    tasks,
    socialPoints,
    promoTask,
    taskStats,
    loading,
    error,
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

  // Unlink Twitter account
  const unlinkTwitter = useCallback(async () => {
    try {
      dispatch(setLoading({ key: "unlink", value: true }));
      dispatch(clearError());

      const data = await apiCall("/twitter/unlink", { method: "POST" });

      // Update status to unlinked
      dispatch(setTwitterStatus({
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
      }));

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
      dispatch(setTaskStats({
        totalPointsAvailable: data.totalPointsAvailable,
        totalPointsEarned: data.totalPointsEarned,
        taskCount: data.taskCount,
      }));
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
      (task) => !stored.includes(task.id)
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
  const verifyTaskAction = useCallback(async (taskId, action) => {
    try {
      dispatch(setLoading({ key: "verify", value: true }));
      dispatch(clearError());

      const data = await apiCall(`/twitter/verify/${taskId}/${action}`, {
        method: "POST",
      });

      // Update task action status
      dispatch(updateTaskAction({
        taskId,
        action,
        completed: true,
        verifiedAt: new Date().toISOString(),
      }));

      // If bonusDetected is present, update the other action as completed too
      if (data.bonusDetected) {
        const bonusActions = Object.keys(data.bonusDetected).filter(k => data.bonusDetected[k]);
        bonusActions.forEach((bonusAction) => {
          // update state only if not already completed
          dispatch(updateTaskAction({
            taskId,
            action: bonusAction,
            completed: true,
            verifiedAt: new Date().toISOString(),
          }));
        });
      }

      // Update task stats
      dispatch(setTaskStats({
        totalPointsEarned: data.totalPoints,
      }));

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
  }, [dispatch, tasks]);

  // Post promo tweet
  const postPromoTweet = useCallback((tweetText) => {
    const encodedText = encodeURIComponent(tweetText);
    window.open(`https://twitter.com/intent/tweet`, '_blank');
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
      dispatch(setPromoTask({
        completedToday: true,
        timesCompleted: promoTask.timesCompleted + 1,
      }));

      // Update task stats
      dispatch(setTaskStats({
        totalPointsEarned: data.totalPoints,
      }));

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

  // Handle URL parameters for auth callback
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);

    if (params.get('success') === 'true') {
      const username = params.get('username');
      // Show success message
      toast(`Linked to @${username}!`);
      // Refresh status
      fetchTwitterStatus();
      // Clear URL parameters
      window.history.replaceState({}, document.title, window.location.pathname);
    }

    if (params.get('error')) {
      const error = params.get('error');
      const message = params.get('message');

      let errorMessage = 'Something went wrong. Please try again.';

      switch (error) {
        case 'denied':
          errorMessage = 'Authorization cancelled';
          break;
        case 'requirements':
          errorMessage = message || 'Account does not meet requirements';
          break;
        case 'already_linked_other':
          errorMessage = 'This X account is already linked to another wallet';
          break;
      }

      dispatch(setError(errorMessage));
      // Clear URL parameters
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [dispatch, fetchTwitterStatus]);

  return {
    // State
    twitterStatus,
    tasks,
    socialPoints,
    promoTask,
    taskStats,
    loading,
    error,
    seenPosts,
    newCount,

    // Actions
    fetchTwitterStatus,
    fetchSocialPoints,
    linkTwitter,
    unlinkTwitter,
    fetchTasks,
    loadSeenPosts,
    markAllAsSeen,
    verifyTaskAction,
    postPromoTweet,
    verifyPromoTweet,
    clearError,
  };
}