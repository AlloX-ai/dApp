const API_URL = "https://api.allox.ai";
const WS_URL = "wss://api.allox.ai/ws";

// Dispatched whenever api.js updates the auth token (e.g. after refresh).
// useAuth listens to this so React state stays in sync with the live token.
export const AUTH_TOKEN_CHANGED_EVENT = "auth:tokenChanged";

const AUTH_REFRESH_ENDPOINT = "/auth/refresh";

const getAuthToken = () => {
  try {
    return localStorage.getItem("authToken");
  } catch {
    return null;
  }
};

const persistAuthToken = (token) => {
  try {
    if (token == null) {
      localStorage.removeItem("authToken");
    } else {
      localStorage.setItem("authToken", token);
    }
  } catch (e) {
    console.error(e);
  }
  try {
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent(AUTH_TOKEN_CHANGED_EVENT, { detail: { token } }),
      );
    }
  } catch (e) {
    console.error(e);
  }
};

const getAuthHeaders = () => {
  const token = getAuthToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
};

// Dedupe: if multiple in-flight requests get 401 at the same time,
// only one /auth/refresh call should fire; the rest await the same promise.
let refreshPromise = null;

export const refreshAuthToken = async () => {
  if (refreshPromise) return refreshPromise;
  const current = getAuthToken();
  if (!current) return null;

  refreshPromise = (async () => {
    try {
      const res = await fetch(`${API_URL}${AUTH_REFRESH_ENDPOINT}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${current}`,
        },
      });
      if (!res.ok) {
        // Refresh token is also dead — clear so the caller's 401 handler
        // (logout) can surface the sign-in flow.
        persistAuthToken(null);
        return null;
      }
      let data = {};
      try {
        data = await res.json();
      } catch {
        data = {};
      }
      const next = data?.token;
      if (!next) {
        persistAuthToken(null);
        return null;
      }
      persistAuthToken(next);
      return next;
    } catch (e) {
      console.error("Auth token refresh failed:", e);
      return null;
    }
  })();

  try {
    return await refreshPromise;
  } finally {
    refreshPromise = null;
  }
};

const isExpiredTokenPayload = (payload) => {
  if (!payload || typeof payload !== "object") return false;
  const candidates = [
    payload.error,
    payload.message,
    payload?.data?.error,
    payload?.data?.message,
  ];
  const combined = candidates
    .filter((v) => typeof v === "string")
    .join(" ")
    .toLowerCase();
  return (
    combined.includes("token expired") ||
    combined.includes("jwt expired") ||
    combined.includes("please authenticate again")
  );
};

// Guard: never recurse into refresh while hitting auth endpoints themselves.
const isAuthEndpoint = (endpoint) =>
  typeof endpoint === "string" && /^\/auth\//.test(endpoint);

// Decode a JWT's `exp` claim (seconds since epoch) without verification.
// Used only to decide whether we should proactively refresh — never for trust.
const decodeJwtExp = (token) => {
  if (!token || typeof token !== "string") return null;
  if (typeof atob !== "function") return null;
  const parts = token.split(".");
  if (parts.length < 2) return null;
  try {
    const raw = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = raw.padEnd(Math.ceil(raw.length / 4) * 4, "=");
    const payload = JSON.parse(atob(padded));
    const exp = Number(payload?.exp);
    return Number.isFinite(exp) ? exp : null;
  } catch {
    return null;
  }
};

// If the current token will expire within this window, refresh before firing
// the next request so we don't waste a roundtrip on a guaranteed 401.
const PROACTIVE_REFRESH_WINDOW_SECONDS = 30;

const maybeProactiveRefresh = async (endpoint) => {
  if (isAuthEndpoint(endpoint)) return;
  const token = getAuthToken();
  if (!token) return;
  const exp = decodeJwtExp(token);
  if (exp == null) return;
  const nowSec = Math.floor(Date.now() / 1000);
  if (exp - nowSec > PROACTIVE_REFRESH_WINDOW_SECONDS) return;
  await refreshAuthToken();
};

export const apiCall = async (endpoint, options = {}, apiType) => {
  const { returnRawResponse = false, ...fetchOptions } = options;

  // Proactively swap the token before expiry so 7-day sessions renew silently.
  await maybeProactiveRefresh(endpoint);

  const doFetch = () =>
    fetch(`${API_URL}${endpoint}`, {
      ...fetchOptions,
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeaders(),
        ...fetchOptions.headers,
      },
    });

  let response = await doFetch();

  if (
    response.status === 401 &&
    !isAuthEndpoint(endpoint) &&
    getAuthToken()
  ) {
    let shouldRetry = false;
    try {
      const preview = response.clone();
      let payload = {};
      try {
        payload = await preview.json();
      } catch {
        payload = {};
      }
      if (isExpiredTokenPayload(payload)) {
        const newToken = await refreshAuthToken();
        shouldRetry = !!newToken;
      }
    } catch (e) {
      console.error("Auth refresh check failed:", e);
    }
    if (shouldRetry) {
      response = await doFetch();
    }
  }

  if (returnRawResponse) {
    if (!response.ok) {
      throw {
        status: response.status,
        message: `Request failed (${response.status})`,
        data: null,
      };
    }
    return response;
  }

  let data = {};
  try {
    data = await response.json();
  } catch (error) {
    data = {};
    console.log(error);
  }

  if (!response.ok) {
    throw {
      status: response.status,
      message: data.error || data.message || "Request failed",
      data,
    };
  }

  return data;
};

export const getApiUrl = () => API_URL;
export const getWsUrl = () => WS_URL;
