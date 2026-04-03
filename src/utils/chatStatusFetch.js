import { apiCall } from "./api";
import { setChatStatus, setRateLimit } from "../redux/slices/chatSlice";
import { setPointsBalance } from "../redux/slices/pointsSlice";

/**
 * GET /chat/status and mirror ChatPage — updates rate limit, points, chat status, optional user.claimed.
 */
export async function fetchChatStatus(dispatch, { setUser } = {}) {
  const token = localStorage.getItem("authToken");
  if (!token) return;
  try {
    const status = await apiCall("/chat/status");
    if (status?.rateLimit) {
      dispatch(setRateLimit(status.rateLimit));
    }
    dispatch(
      setChatStatus({
        rateLimit: status?.rateLimit,
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
        const stored = JSON.parse(localStorage.getItem("authUser") || "{}");
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
