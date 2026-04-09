import { apiCall } from "./api";
import { setChatStatus, setRateLimit } from "../redux/slices/chatSlice";
import { setPointsBalance } from "../redux/slices/pointsSlice";
import { store } from "../redux/store";
import { getBonusMessages } from "./rateLimitMessages";

const AUTH_USER_KEY = "authUser";

/** Backend may use camelCase or snake_case — normalize before merging into Redux. */
function normalizeRateLimitPayload(rl) {
  if (!rl || typeof rl !== "object") return rl;
  const next = { ...rl };
  if (next.bonusMessages == null && typeof next.bonus_messages === "number") {
    next.bonusMessages = next.bonus_messages;
  }
  if (next.remaining == null && typeof next.messages_remaining === "number") {
    next.remaining = next.messages_remaining;
  }
  if (next.remaining == null && typeof next.messagesRemaining === "number") {
    next.remaining = next.messagesRemaining;
  }
  return next;
}

function mergeAuthUserSeason1RateLimit(setUser, rateLimitPartial) {
  if (typeof setUser !== "function" || !rateLimitPartial) return;
  try {
    const stored = JSON.parse(localStorage.getItem(AUTH_USER_KEY) || "{}");
    setUser({
      ...stored,
      season1: {
        ...(stored.season1 ?? {}),
        rateLimit: {
          ...(stored.season1?.rateLimit ?? {}),
          ...rateLimitPartial,
        },
      },
    });
  } catch (e) {
    console.error(e);
  }
}

/**
 * Apply rate limits from POST /messages/purchase, nested API envelopes, or GET /auth/me-style user blobs.
 * Updates Redux and persisted auth user so Header and App stay aligned.
 */
export function applyRateLimitFromServerPayload(dispatch, setUser, payload) {
  if (!payload || typeof payload !== "object") return;
  const raw =
    payload.rateLimit ??
    payload.data?.rateLimit ??
    payload.user?.season1?.rateLimit;
  if (!raw || typeof raw !== "object") return;
  const rl = normalizeRateLimitPayload(raw);
  dispatch(setRateLimit(rl));
  mergeAuthUserSeason1RateLimit(setUser, rl);
}

/**
 * Immediately bump purchased (bonus) message count in Redux + authUser so the Header
 * updates before GET /chat/status or purchase JSON catches up.
 */
export function applyOptimisticPurchasedMessages(dispatch, setUser, packageMessageCount) {
  const n = Number(packageMessageCount);
  if (!Number.isFinite(n) || n <= 0) return;
  const rl = store.getState().chat?.rateLimit;
  const prev = getBonusMessages(rl) ?? 0;
  const next = { bonusMessages: prev + n };
  dispatch(setRateLimit(next));
  mergeAuthUserSeason1RateLimit(setUser, next);
}

/**
 * GET /chat/status and mirror ChatPage — updates rate limit, points, chat status, optional user.claimed.
 */
export async function fetchChatStatus(dispatch, { setUser } = {}) {
  const token = localStorage.getItem("authToken");
  if (!token) return;
  try {
    const status = await apiCall("/chat/status");
    const statusRl = status?.rateLimit
      ? normalizeRateLimitPayload(status.rateLimit)
      : null;
    if (statusRl) {
      dispatch(setRateLimit(statusRl));
      mergeAuthUserSeason1RateLimit(setUser, statusRl);
    }
    dispatch(
      setChatStatus({
        rateLimit: statusRl,
        activity: status?.activity ?? null,
        points: status?.points,
        claimed: status?.claimed,
      }),
    );
    if (typeof status?.points === "number") {
      dispatch(setPointsBalance(status.points));
    }
    if (status?.claimed != null && typeof setUser === "function") {
      try {
        const stored = JSON.parse(localStorage.getItem(AUTH_USER_KEY) || "{}");
        setUser({
          ...stored,
          season1: { ...(stored?.season1 ?? {}), claimed: status.claimed },
        });
      } catch (e) {
        console.error(e);
      }
    }
  } catch (e) {
    if (e?.status !== 401) console.warn("Chat status fetch failed:", e);
  }
}

/**
 * After message purchase, refresh counts immediately and once more after a short delay
 * so the UI updates even if the first GET /chat/status runs before the backend finishes indexing.
 */
export async function refreshRateLimitAfterMessagePurchase(dispatch, setUser) {
  await fetchChatStatus(dispatch, { setUser });
  window.setTimeout(() => {
    void fetchChatStatus(dispatch, { setUser });
  }, 800);
}
