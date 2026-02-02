import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  message: "",
  currentMessages: [],
  slippage: "0.5",
  isRecording: false,
  completedActions: [],
  isThinking: false,
  chatSessions: [
    {
      id: 1,
      title: "Portfolio setup",
      date: "Today, 2:30 PM",
      messages: [],
    },
    {
      id: 2,
      title: "Swap + staking",
      date: "Yesterday, 4:15 PM",
      messages: [],
    },
    {
      id: 3,
      title: "Market watch",
      date: "Jan 20, 11:00 AM",
      messages: [],
    },
  ],
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
} = chatSlice.actions;

export default chatSlice.reducer;
