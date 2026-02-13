import { configureStore } from "@reduxjs/toolkit";
import walletReducer from "./slices/walletSlice";
import userReducer from "./slices/userSlice";
import chatReducer from "./slices/chatSlice";
import stakingReducer from "./slices/stakingSlice";
import pointsReducer from "./slices/pointsSlice";

export const store = configureStore({
  reducer: {
    wallet: walletReducer,
    user: userReducer,
    chat: chatReducer,
    staking: stakingReducer,
    points: pointsReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({ serializableCheck: false }),
});
