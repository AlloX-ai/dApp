import { getEmbeddedConnectedWallet } from "@privy-io/react-auth";

export function getPrivyEmbedded(wallets) {
  return getEmbeddedConnectedWallet(wallets ?? []);
}

/** Whether the embedded wallet reports being on `numericChainId` (56, 8453, 1, …). */
export function embeddedOnChainId(embedded, numericChainId) {
  if (!embedded?.chainId) return false;
  const c = embedded.chainId;
  if (c === `eip155:${numericChainId}`) return true;
  if (typeof c === "string" && c.startsWith("0x")) {
    try {
      return parseInt(c, 16) === numericChainId;
    } catch {
      return false;
    }
  }
  return Number(c) === numericChainId;
}

export async function switchPrivyEmbeddedToChain(embedded, numericChainId) {
  if (!embedded?.switchChain) {
    throw new Error("Embedded wallet cannot switch networks.");
  }
  if (embeddedOnChainId(embedded, numericChainId)) return;
  await embedded.switchChain(numericChainId);
}
