import { createSlice } from "@reduxjs/toolkit";

const initialState = {
    user: {},
    tasks: [],
    cooldown: 0,
    cooldownHours: 0,
    promoPost: {},
}