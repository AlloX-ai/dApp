/** Daily free pool (resets on window). */
export function getDailyMessagesRemaining(rateLimit) {
  if (!rateLimit) return null;
  const v =
    rateLimit.messagesRemaining ??
    rateLimit.messages_remaining;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

/** Purchased / bonus messages (lifetime; consumed before daily). */
export function getBonusMessages(rateLimit) {
  if (!rateLimit) return null;
  const v = rateLimit.bonusMessages ?? rateLimit.bonus_messages;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

/** Total sendable messages when API exposes daily and/or bonus counts. */
export function getTotalMessagesRemaining(rateLimit) {
  if (!rateLimit) return null;
  const directRemaining =
    // rateLimit.remaining ??
    rateLimit.totalRemaining ??
    rateLimit.total_remaining;
  const directN =
    typeof directRemaining === "number"
      ? directRemaining
      : Number(directRemaining);
  // Some APIs already return full remaining total.
  if (Number.isFinite(directN)) return directN;

  const daily = getDailyMessagesRemaining(rateLimit);
  const bonus = getBonusMessages(rateLimit);
  if (daily == null && bonus == null) return null;
  return (daily ?? 0) + (bonus ?? 0);
}
