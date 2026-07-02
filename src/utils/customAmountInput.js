export const QUICK_PRESET_AMOUNTS_USD = [5, 100, 500];

/** Parse a free-text USD amount; returns null when empty or invalid. */
export function parseCustomAmountUsd(raw) {
  const trimmed = String(raw ?? "").trim();
  if (trimmed === "") return null;
  const n = Number(trimmed);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/** Allow digits and a single optional decimal while typing. */
export function isDecimalAmountInput(raw) {
  return raw === "" || /^\d*\.?\d*$/.test(raw);
}
