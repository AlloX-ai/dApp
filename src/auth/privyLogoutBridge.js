/** Registered from a component inside PrivyProvider so useAuth.logout can end the Privy session. */
let privyLogoutImpl = async () => {};

export function setPrivyLogoutBridge(fn) {
  privyLogoutImpl =
    typeof fn === "function" ? fn : async () => {};
}

export async function runPrivyLogoutBridge() {
  try {
    await privyLogoutImpl();
  } catch (e) {
    console.warn("Privy logout bridge:", e);
  }
}
