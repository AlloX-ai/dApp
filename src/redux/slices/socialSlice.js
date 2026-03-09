import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  // Twitter/X account status
  twitterStatus: {
    socialPoints: 0,
    linked: false,
    username: null,
    displayName: null,
    profileImageUrl: null,
    followersCount: null,
    linkedAt: null,
    cooldown: {
      allowed: true,
      hoursLeft: null,
      relinkAt: null,
    },
    promoTask: {
      completed: false,
      points: 500,
      completedAt: null,
    },
  },

  // Daily tasks
  tasks: [],
  promoTask: {
    type: "promo",
    description: "Tweet about AlloX (mention @alloxdotai)",
    points: 500,
    completedToday: false,
    timesCompleted: 0,
    daily: true,
  },
  followTask: {},

  // Task statistics
  taskStats: {
    totalPointsAvailable: 0,
    totalPointsEarned: 0,
    taskCount: 0,
  },

  // Seen posts tracking
  seenPosts: [],
  newCount: 0,

  // UI state
  loading: {
    status: false,
    auth: false,
    tasks: false,
    verify: false,
    unlink: false,
    promoVerify: false,
  },

  error: null,
  requirementError: null, 
};

const socialSlice = createSlice({
  name: "social",
  initialState,
  reducers: {
    // Set Twitter status
    setTwitterStatus: (state, action) => {
      state.twitterStatus = { ...state.twitterStatus, ...action.payload };
    },

    // Set tasks
    setTasks: (state, action) => {
      state.tasks = action.payload;
    },
    setSocialPoints: (state, action) => {
      state.socialPoints = action.payload;
    },

    // Update task action status
    updateTaskAction: (state, action) => {
      const { taskId, action: taskAction, completed, verifiedAt } = action.payload;
      const task = state.tasks.find(t => t.id === taskId);
      if (task) {
        const actionItem = task.actions.find(a => a.action === taskAction);
        if (actionItem) {
          actionItem.completed = completed;
          actionItem.verifiedAt = verifiedAt;
        }
      }
    },

    // Set promo task
    setPromoTask: (state, action) => {
      state.promoTask = { ...state.promoTask, ...action.payload };
    },
    // Set promo task
    setFollowTask: (state, action) => {
      state.followTask = { ...action.payload };
    },

    // Set task stats
    setTaskStats: (state, action) => {
      state.taskStats = { ...state.taskStats, ...action.payload };
    },

    // Loading states
    setLoading: (state, action) => {
      const { key, value } = action.payload;
      state.loading[key] = value;
    },

    // Seen posts tracking
    setSeenPosts: (state, action) => {
      state.seenPosts = action.payload;
    },

    setNewCount: (state, action) => {
      state.newCount = action.payload;
    },

    // Error handling
    setError: (state, action) => {
      state.error = action.payload;
    },
    setRequirementError: (state, action) => {
      state.requirementError = action.payload;
    },

    clearError: (state) => {
      state.error = null;
    },

    // Reset state
    resetSocialState: (state) => {
      Object.assign(state, initialState);
    },
  },
});

export const {
  setTwitterStatus,
  setSocialPoints,
  setTasks,
  updateTaskAction,
  setPromoTask,
  setFollowTask,
  setTaskStats,
  setLoading,
  setError,
  setRequirementError,
  clearError,
  resetSocialState,
  setSeenPosts,
  setNewCount,
} = socialSlice.actions;

export default socialSlice.reducer;