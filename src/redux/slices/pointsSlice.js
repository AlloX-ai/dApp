import { createSlice } from "@reduxjs/toolkit";

const INITIAL_CLAIM_AMOUNT = 5_000;
const POINTS_PER_MESSAGE = 250;

const initialState = {
  balance: null,
  initialClaimAmount: INITIAL_CLAIM_AMOUNT,
};

const pointsSlice = createSlice({
  name: "points",
  initialState,
  reducers: {
    setPointsBalance: (state, action) => {
      state.balance = action.payload;
    },
    addPoints: (state, action) => {
      state.balance = (state.balance ?? 0) + action.payload;
    },
    resetPoints: (state) => {
      state.balance = null;
    },
  },
});

export const { setPointsBalance, deductPoints, resetPoints } = pointsSlice.actions;
export const INITIAL_CLAIM_POINTS = INITIAL_CLAIM_AMOUNT;
export default pointsSlice.reducer;
