import { createSlice } from "@reduxjs/toolkit";

const initialState = {
	competition: null,
	leaderboard: [],
	userData: null,
};

const tradingSlice = createSlice({
	name: "trading",
	initialState,
	reducers: {
		setCompetition: (state, action) => {
			state.competition = action.payload;
		},
		setLeaderboard: (state, action) => {
			state.leaderboard = action.payload;
		},
		setUserData: (state, action) => {
			state.userData = action.payload;
		},
		resetTradingState: () => initialState,
	},
});

export const {
	setCompetition,
	setLeaderboard,
	setUserData,
	resetTradingState,
} = tradingSlice.actions;

export default tradingSlice.reducer;
