import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  address: undefined,
  chainId: null,
  walletModal: false,
  walletId: "connect",
  walletType: "",
  isConnected: false,
};

const walletSlice = createSlice({
  name: "wallet",
  initialState,
  reducers: {
    resetWallet: () => ({ ...initialState }),
    setAddress: (state, action) => {
      state.address = action.payload;
    },
    setChainId: (state, action) => {
      state.chainId = action.payload;
    },
    setWalletModal: (state, action) => {
      state.walletModal = action.payload;
    },
    openWalletModal: (state) => {
      state.walletModal = true;
    },
    closeWalletModal: (state) => {
      state.walletModal = false;
    },
    setWalletId: (state, action) => {
      state.walletId = action.payload;
    },
    setWalletType: (state, action) => {
      state.walletType = action.payload;
    },
    setIsConnected: (state, action) => {
      state.isConnected = action.payload;
    },
  },
});
export const {
  resetWallet,
  setAddress,
  setChainId,
  setWalletModal,
  openWalletModal,
  closeWalletModal,
  setWalletId,
  setWalletType,
  setIsConnected,
} = walletSlice.actions;
export default walletSlice.reducer;
