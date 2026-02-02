import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  selectedStaking: null,
  stakingAmount: "",
  stakedPools: [],
};

const stakingSlice = createSlice({
  name: "staking",
  initialState,
  reducers: {
    setSelectedStaking: (state, action) => {
      state.selectedStaking = action.payload;
    },
    setStakingAmount: (state, action) => {
      state.stakingAmount = action.payload;
    },
    setStakedPools: (state, action) => {
      state.stakedPools = action.payload;
    },
    addStakedPool: (state, action) => {
      state.stakedPools.push(action.payload);
    },
  },
});

export const {
  setSelectedStaking,
  setStakingAmount,
  setStakedPools,
  addStakedPool,
} = stakingSlice.actions;

export default stakingSlice.reducer;
