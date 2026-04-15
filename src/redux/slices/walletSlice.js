import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  address: undefined,
  chainId: null,
  walletModal: false,
  checkinModal: false,
  walletId: "connect",
  walletType: "",
  isConnected: false,
  /** "wallet" | "privy" | null — avoids wagmi zero-connection sync wiping a Privy-only session */
  sessionSource: null,
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
    setCheckinModal: (state, action) => {
      state.checkinModal = action.payload;
    },
    openCheckinModal: (state) => {
      state.checkinModal = true;
    },
    closeCheckinModal: (state) => {
      state.checkinModal = false;
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
    setSessionSource: (state, action) => {
      state.sessionSource = action.payload;
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
  setCheckinModal,
  openCheckinModal,
  closeCheckinModal,
  setWalletId,
  setWalletType,
  setIsConnected,
  setSessionSource,
} = walletSlice.actions;
export default walletSlice.reducer;
