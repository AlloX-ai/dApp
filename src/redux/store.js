import { configureStore } from "@reduxjs/toolkit";
import walletReducer from "./slices/walletSlice";
import userReducer from "./slices/userSlice";
import chatReducer from "./slices/chatSlice";
import stakingReducer from "./slices/stakingSlice";
import pointsReducer from "./slices/pointsSlice";
import checkinReducer from "./slices/checkinSlice";
import socialReducer from "./slices/socialSlice";
import chatbotReducer from "./slices/chatbotSlice";
import tradingReducer from "./slices/tradingSlice";

export const store = configureStore({
  reducer: {
    wallet: walletReducer,
    user: userReducer,
    chat: chatReducer,
    staking: stakingReducer,
    points: pointsReducer,
    checkin: checkinReducer,
    social: socialReducer,
    chatbot: chatbotReducer,
    trading: tradingReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({ serializableCheck: false }),
});
