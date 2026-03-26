import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  message: "",
  currentMessages: [],
  slippage: "0.5",
  isRecording: false,
  completedActions: [],
  isThinking: false,
  chatSessions: [],
  viewingHistorySessionId: null,
  rateLimit: { remaining: null, resetAt: null, allowed: null, limit: null },
  chatStatus: { activity: null, points: null, claimed: null },
  backendResetRequestId: 0,
};

const chatSlice = createSlice({
  name: "chat",
  initialState,
  reducers: {
    setMessage: (state, action) => {
      state.message = action.payload;
    },
    setCurrentMessages: (state, action) => {
      state.currentMessages = action.payload;
    },
    addCurrentMessage: (state, action) => {
      state.currentMessages.push(action.payload);
    },
    addCurrentMessages: (state, action) => {
      state.currentMessages.push(...action.payload);
    },
    setSlippage: (state, action) => {
      state.slippage = action.payload;
    },
    setIsRecording: (state, action) => {
      state.isRecording = action.payload;
    },
    setCompletedActions: (state, action) => {
      state.completedActions = action.payload;
    },
    prependCompletedAction: (state, action) => {
      state.completedActions.unshift(action.payload);
    },
    setIsThinking: (state, action) => {
      state.isThinking = action.payload;
    },
    setChatSessions: (state, action) => {
      state.chatSessions = action.payload;
    },
    setChatSessionTitle: (state, action) => {
      const { id, title } = action.payload;
      const session = state.chatSessions.find((s) => s.id === id);
      if (session) session.title = title;
    },
    setViewingHistorySessionId: (state, action) => {
      state.viewingHistorySessionId = action.payload;
    },
    setRateLimit: (state, action) => {
      state.rateLimit = action.payload
        ? { ...state.rateLimit, ...action.payload }
        : { remaining: null, resetAt: null, allowed: null, limit: null };
    },
    setChatStatus: (state, action) => {
      const payload = action.payload;
      if (payload?.rateLimit) state.rateLimit = { ...state.rateLimit, ...payload.rateLimit };
      if (payload?.activity != null) state.chatStatus.activity = payload.activity;
      if (payload?.points != null) state.chatStatus.points = payload.points;
      if (payload?.claimed != null) state.chatStatus.claimed = payload.claimed;
    },
    requestBackendChatReset: (state) => {
      state.backendResetRequestId = (state.backendResetRequestId || 0) + 1;
    },
  },
});

export const {
  setMessage,
  setCurrentMessages,
  addCurrentMessage,
  addCurrentMessages,
  setSlippage,
  setIsRecording,
  setCompletedActions,
  prependCompletedAction,
  setIsThinking,
  setChatSessions,
  setChatSessionTitle,
  setViewingHistorySessionId,
  setRateLimit,
  setChatStatus,
  requestBackendChatReset,
} = chatSlice.actions;

export default chatSlice.reducer;
