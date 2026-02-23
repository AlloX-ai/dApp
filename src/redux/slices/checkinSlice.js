import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  status: null,
  optimisticPoints: 0,
};

const checkinSlice = createSlice({
  name: "checkin",
  initialState,
  reducers: {
    setCheckinStatus: (state, action) => {
      state.status = action.payload;
      state.optimisticPoints = 0;
    },
    addOptimisticCheckinPoints: (state, action) => {
      state.optimisticPoints = (state.optimisticPoints ?? 0) + action.payload;
    },
    clearCheckin: (state) => {
      state.status = null;
      state.optimisticPoints = 0;
    },
  },
});

export const {
  setCheckinStatus,
  addOptimisticCheckinPoints,
  clearCheckin,
} = checkinSlice.actions;
export default checkinSlice.reducer;
