import { configureStore } from "@reduxjs/toolkit";
import walletReducer from "./slices/walletSlice";
import userReducer from "./slices/userSlice";
import chatReducer from "./slices/chatSlice";
import stakingReducer from "./slices/stakingSlice";

export const store = configureStore({
  reducer: {
    wallet: walletReducer,
    user: userReducer,
    chat: chatReducer,
    staking: stakingReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({ serializableCheck: false }),
});
