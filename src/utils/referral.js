const REF_STORAGE_KEY = "allox_ref";
const REF_COOKIE_NAME = "allox_ref";
/** 30-day attribution window */
const REF_COOKIE_MAX_AGE_SEC = 30 * 24 * 60 * 60;

export function buildShareUrl(referralLink) {
  if (!referralLink) return "";
  const query = referralLink.startsWith("?")
    ? referralLink
    : `?r=${referralLink}`;
  return `${window.location.origin}/${query}`;
}

export function getStoredReferralCode() {
  try {
    const fromStorage = localStorage.getItem(REF_STORAGE_KEY);
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
