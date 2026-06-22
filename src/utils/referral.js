const REF_STORAGE_KEY = "alloxRef";
const LEGACY_REF_STORAGE_KEY = "allox_ref";
const REF_COOKIE_NAME = "allox_ref";
/** 30-day attribution window */
const REF_COOKIE_MAX_AGE_SEC = 30 * 24 * 60 * 60;

export const REFERRER_DISPLAY_STORAGE_KEY = "allox_referrer_display";
export const REFERRER_DISPLAY_EVENT = "allox:referrerDisplay";

export function buildShareUrl(referralLink) {
  if (!referralLink) return "";
  const query = referralLink.startsWith("?")
    ? referralLink
    : `?r=${referralLink}`;
  return `${window.location.origin}${query}`;
}

export function getStoredReferralCode() {
  try {
    const fromStorage =
      localStorage.getItem(REF_STORAGE_KEY) ||
      localStorage.getItem(LEGACY_REF_STORAGE_KEY);
    if (fromStorage) return fromStorage;
  } catch {
    // ignore
  }
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(
    new RegExp(`(?:^|;\\s*)${REF_COOKIE_NAME}=([^;]*)`),
  );
  return match ? decodeURIComponent(match[1]) : null;
}

export function storeReferralCode(code) {
  const normalized = code.trim().toLowerCase();
  if (!normalized) return null;
  try {
    localStorage.setItem(REF_STORAGE_KEY, normalized);
    localStorage.removeItem(LEGACY_REF_STORAGE_KEY);
  } catch {
    // ignore
  }
  if (typeof document !== "undefined") {
    document.cookie = `${REF_COOKIE_NAME}=${encodeURIComponent(normalized)}; path=/; max-age=${REF_COOKIE_MAX_AGE_SEC}; SameSite=Lax`;
  }
  return normalized;
}

export function clearStoredReferralCode() {
  try {
    localStorage.removeItem(REF_STORAGE_KEY);
    localStorage.removeItem(LEGACY_REF_STORAGE_KEY);
  } catch {
    // ignore
  }
  if (typeof document !== "undefined") {
    document.cookie = `${REF_COOKIE_NAME}=; path=/; max-age=0; SameSite=Lax`;
  }
}

/**
 * Read ?r= (or legacy ?ref=) from the current URL and persist for auth.
 * Returns the normalized code, or null if absent.
 */
export function captureReferralFromUrl(href = window.location.href) {
  const url = new URL(href);
  const ref = url.searchParams.get("r") || url.searchParams.get("ref");
  if (!ref) return null;
  return storeReferralCode(ref);
}

function setReferrerDisplay(display) {
  if (!display || typeof window === "undefined") return;
  try {
    localStorage.setItem(REFERRER_DISPLAY_STORAGE_KEY, display);
  } catch {
    // ignore
  }
  try {
    window.dispatchEvent(
      new CustomEvent(REFERRER_DISPLAY_EVENT, { detail: { display } }),
    );
  } catch {
    // ignore
  }
}

/**
 * Capture ?r= from URL, ping /referral/track, and validate via /referral/check.
 */
export async function trackReferralLanding(apiUrl, href = window.location.href) {
  const normalizedRef = captureReferralFromUrl(href);
  if (!normalizedRef) return null;

  fetch(
    `${apiUrl}/referral/track?ref=${encodeURIComponent(normalizedRef)}`,
    { credentials: "include" },
  ).catch(() => {});

  try {
    const response = await fetch(
      `${apiUrl}/referral/check/${encodeURIComponent(normalizedRef)}`,
      { credentials: "include" },
    );
    if (!response.ok) return normalizedRef;
    const payload = await response.json();
    if (payload?.exists && payload?.referrerDisplay) {
      setReferrerDisplay(payload.referrerDisplay);
    }
  } catch {
    // optional validation — ignore failures
  }

  return normalizedRef;
}
