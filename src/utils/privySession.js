import { store } from "../redux/store";

/** True when the app session is (or should be) Privy-backed — used to skip wagmi "no connections" clearing. */
export function isPrivySessionActive() {
  if (store.getState().wallet.sessionSource === "privy") return true;
  return store.getState().wallet.walletType === "privy";
}
