import { toast as sonnerToast } from "sonner";

const recentErrorToasts = new Map();
const DEFAULT_ERROR_DEDUPE_MS = 8000;
const AUTH_RATE_LIMIT_DEDUPE_MS = 45000;

const normalizeMessage = (message) =>
  String(message ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");

const isAuthRateLimitMessage = (normalizedMessage) =>
  normalizedMessage.includes("too many authentication attempts") ||
  normalizedMessage.includes("too many requests") ||
  normalizedMessage.includes("rate limit") ||
  normalizedMessage.includes("privy verification failed") ||
  normalizedMessage.includes("privy verify");

const shouldSuppressErrorToast = (key, dedupeMs) => {
  const now = Date.now();
  const lastShownAt = recentErrorToasts.get(key);
  if (typeof lastShownAt === "number" && now - lastShownAt < dedupeMs) {
    return true;
  }
  recentErrorToasts.set(key, now);

  // Keep map from growing unbounded.
  if (recentErrorToasts.size > 200) {
    for (const [k, at] of recentErrorToasts.entries()) {
      if (now - at > AUTH_RATE_LIMIT_DEDUPE_MS * 2) {
        recentErrorToasts.delete(k);
      }
    }
  }
  return false;
};

const error = (message, options = {}) => {
  const normalized = normalizeMessage(message);
  if (normalized.length > 0 && options?.dedupe !== false) {
    const dedupeMs = isAuthRateLimitMessage(normalized)
      ? AUTH_RATE_LIMIT_DEDUPE_MS
      : DEFAULT_ERROR_DEDUPE_MS;
    const key = options?.id || normalized;
    if (shouldSuppressErrorToast(key, dedupeMs)) return key;
  }
  return sonnerToast.error(message, options);
};

export const toast = {
  ...sonnerToast,
  error,
};

