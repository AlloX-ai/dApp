// Styling + formatting helpers for the gems tier ladder (Bronze → Mythic).
// Kept in one place so the PortfolioPage header badge, the PortfolioInfoModal,
// and the Points page "Create Portfolio" card all render consistently.

// Each tier's visual identity. The `backgroundImage` is applied as an inline
// style (instead of Tailwind gradient utilities) so the exact designer-
// specified hex stops render pixel-perfectly. The `text`/`bg`/`border`/`chip`
// utilities still drive the soft panels and current-row highlight, and the
// hover effect is handled generically via `hover:brightness-110` on the
// element rather than a separate hover gradient.
export const TIER_STYLES = {
  Bronze: {
    backgroundImage:
      "linear-gradient(120deg, #5c2a08 0%, #a85520 50%, #d4894a 100%)",
    text: "text-amber-700",
    bg: "bg-amber-50",
    border: "border-amber-200",
    chip: "bg-amber-100 text-amber-800 border-amber-200",
  },
  Silver: {
    backgroundImage:
      "linear-gradient(120deg, #222230 0%, #606078 50%, #b0b0cc 100%)",
    text: "text-slate-700",
    bg: "bg-slate-50",
    border: "border-slate-200",
    chip: "bg-slate-100 text-slate-800 border-slate-200",
  },
  Gold: {
    backgroundImage:
      "linear-gradient(120deg, #4a3000 0%, #a07010 50%, #e0b840 100%)",
    text: "text-yellow-700",
    bg: "bg-yellow-50",
    border: "border-yellow-200",
    chip: "bg-yellow-100 text-yellow-800 border-yellow-200",
  },
  Platinum: {
    backgroundImage:
      "linear-gradient(120deg, #0e2828 0%, #2a6868 50%, #70b8b8 100%)",
    text: "text-teal-700",
    bg: "bg-teal-50",
    border: "border-teal-200",
    chip: "bg-teal-100 text-teal-800 border-teal-200",
  },
  Diamond: {
    backgroundImage:
      "linear-gradient(120deg, #0a1040 0%, #2050b0 50%, #70b0f0 100%)",
    text: "text-blue-700",
    bg: "bg-blue-50",
    border: "border-blue-200",
    chip: "bg-blue-100 text-blue-800 border-blue-200",
  },
  Mythic: {
    backgroundImage:
      "linear-gradient(120deg, #2a0040 0%, #7010a0 50%, #d060e0 100%)",
    text: "text-purple-700",
    bg: "bg-purple-50",
    border: "border-purple-200",
    chip: "bg-purple-100 text-purple-800 border-purple-200",
  },
};

const normalizeTierName = (name) => {
  if (!name || typeof name !== "string") return "Bronze";
  const capitalized = name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
  return TIER_STYLES[capitalized] ? capitalized : "Bronze";
};

export const getTierStyle = (name) => TIER_STYLES[normalizeTierName(name)];

// gems/$1K = ratePct% × $1000 ÷ gemUsdValue
export const computeGemsPer1K = (ratePct, gemUsdValue) => {
  const rate = Number(ratePct);
  const value = Number(gemUsdValue);
  if (!Number.isFinite(rate) || !Number.isFinite(value) || value <= 0) {
    return null;
  }
  return (rate / 100) * 1000 / value;
};

// Fallback ladder used when the API hasn't loaded yet. Matches the server's
// "full 6-tier ladder" contract from GET /gems/tiers.
export const FALLBACK_TIERS = [
  { name: "Bronze", minVolume: 0, ratePct: 0.15 },
  { name: "Silver", minVolume: 10000, ratePct: 0.18 },
  { name: "Gold", minVolume: 50000, ratePct: 0.21 },
  { name: "Platinum", minVolume: 250000, ratePct: 0.25 },
  { name: "Diamond", minVolume: 1000000, ratePct: 0.3 },
  { name: "Mythic", minVolume: 5000000, ratePct: 0.4 },
];

export const FALLBACK_GEM_USD_VALUE = 5;

const formatUsdShort = (value) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return "$0";
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(n % 1_000_000 === 0 ? 0 : 1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(n % 1_000 === 0 ? 0 : 1)}K`;
  return `$${n.toFixed(n >= 100 ? 0 : 2)}`;
};

// Pretty-prints a tier's volume floor, e.g. `≥ $10K`, `< $10K` for Bronze.
export const formatTierVolumeLabel = (tier, index) => {
  const min = Number(tier?.minVolume ?? 0);
  if (index === 0 || min <= 0) {
    // Bronze: everything below the Silver floor.
    return "< $10K";
  }
  return `≥ ${formatUsdShort(min)}`;
};
