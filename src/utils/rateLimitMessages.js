/** Daily free pool (resets on window). */
export function getDailyMessagesRemaining(rateLimit) {
  if (!rateLimit) return null;
  const v = rateLimit.remaining ?? rateLimit.messagesRemaining;
  return typeof v === "number" ? v : null;
}

/** Purchased / bonus messages (lifetime; consumed before daily). */
export function getBonusMessages(rateLimit) {
  if (!rateLimit || typeof rateLimit.bonusMessages !== "number") return null;
  return rateLimit.bonusMessages;
}

/** Total sendable messages when API exposes daily and/or bonus counts. */
export function getTotalMessagesRemaining(rateLimit) {
  const daily = getDailyMessagesRemaining(rateLimit);
  const bonus = getBonusMessages(rateLimit);
  if (daily == null && bonus == null) return null;
  return (daily ?? 0) + (bonus ?? 0);
}
