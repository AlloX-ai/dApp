import { store } from "../redux/store";

const AUTH_USER_KEY = "authUser";

/** True when the app session is (or should be) Privy-backed — used to skip wagmi "no connections" clearing. */
export function isPrivySessionActive() {
  if (store.getState().wallet.sessionSource === "privy") return true;
  try {
    const raw = localStorage.getItem(AUTH_USER_KEY);
    if (!raw) return false;
    const u = JSON.parse(raw);
    return u?.authProvider === "privy";
  } catch {
    return false;
  }
}
