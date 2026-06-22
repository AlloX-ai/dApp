import { createSlice } from "@reduxjs/toolkit";


const initialState = {
    competition: null,
    leaderboard: [],
    userData: null,
}

const volumeSlice = createSlice({
    name: "volume",
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
        resetVolumeState: () => initialState,
    },
});

export const {
    setCompetition,
    setLeaderboard,
    setUserData,
    resetVolumeState,
} = volumeSlice.actions;

export default volumeSlice.reducer;