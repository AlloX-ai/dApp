import {
  Gem,
  Clock,
  Share2,
  CheckCircle2,
  Wallet,
  Sparkles,
  PlusCircle,
  ChevronDown,
  ChevronUp,
  Lock,
  Download,
  Link2,
  Send,
  X as XIcon,
  Info,
  FileText,
  Award,
  AlertCircle,
} from "lucide-react";
import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import Countdown from "react-countdown";
import { motion, AnimatePresence } from "motion/react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router";
import { useAuth } from "../hooks/useAuth";
import { setWalletModal } from "../redux/slices/walletSlice";
import { apiCall } from "../utils/api";
import { toast } from "../utils/toast";

import topPerformerBg from "../assets/provePortfolio/v2/topPerformer.webp";
import portfolioSnapshotBg from "../assets/provePortfolio/v2/portfoliosnapshot.webp";
import newPortfolioBg from "../assets/provePortfolio/v2/newportfolio.webp";

const CARD_BACKGROUND_BY_TYPE = {
  "positive-performer": topPerformerBg,
  "portfolio-snapshot": portfolioSnapshotBg,
  "new-portfolio": newPortfolioBg,
};

const TWITTER_SHARE_TEXT = encodeURIComponent(
  "Just proved my portfolio on @alloxdotai 🚀\n\n#ProveYourPortfolio #AlloX",
);
const TWITTER_SHARE_URL = `https://twitter.com/intent/tweet?text=${TWITTER_SHARE_TEXT}`;

const formatCountdownHms = ({
  days = 0,
  hours = 0,
  minutes = 0,
  seconds = 0,
}) => {
  const hoursWithDays = Number(days || 0) * 24 + Number(hours || 0);
  return `${String(hoursWithDays).padStart(2, "0")}:${String(
    Number(minutes || 0),
  ).padStart(2, "0")}:${String(Number(seconds || 0)).padStart(2, "0")}`;
};

const REWARD_TIERS = [
  { amount: 100, maxReward: 10, task1: 4, task2: 6 },
  { amount: 500, maxReward: 50, task1: 20, task2: 30 },
  { amount: 1000, maxReward: 100, task1: 40, task2: 60 },
  { amount: 2500, maxReward: 250, task1: 100, task2: 150 },
];

function getRewardTier(amount) {
  let tier = REWARD_TIERS[0];
  for (const t of REWARD_TIERS) {
    if (amount >= t.amount) tier = t;
  }
  return tier;
}

const extractCompetitionCandidates = (payload) => {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload.competitions)) return payload.competitions;
  if (Array.isArray(payload.data)) return payload.data;
  return [payload];
};

const resolveCompetitionId = (payload) => {
  const candidates = extractCompetitionCandidates(payload);
  const proveCompetition =
    candidates.find((item) => {
      const haystack = [
        item?.slug,
        item?.key,
        item?.type,
        item?.name,
        item?.campaign,
        item?.title,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes("prove") && haystack.includes("portfolio");
    }) ?? candidates[0];

  return proveCompetition?.id ?? proveCompetition?._id ?? null;
};

function isUtcCalendarToday(iso) {
  if (!iso || typeof iso !== "string") return false;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return false;
  const now = new Date();
  return (
    d.getUTCFullYear() === now.getUTCFullYear() &&
    d.getUTCMonth() === now.getUTCMonth() &&
    d.getUTCDate() === now.getUTCDate()
  );
}

function entryIsPortfolioUtcToday(entry) {
  if (!entry) return false;
  if (entry.createdAtIso && isUtcCalendarToday(entry.createdAtIso)) return true;
  return typeof entry.date === "string" && entry.date.startsWith("Today");
}

function entryHasProveTaskSubmission(entry) {
  return !!(entry?.task1Slot?.submitted || entry?.task2Slot?.submitted);
}

function formatPortfolioListDate(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const now = new Date();
  const isToday =
    d.getUTCFullYear() === now.getUTCFullYear() &&
    d.getUTCMonth() === now.getUTCMonth() &&
    d.getUTCDate() === now.getUTCDate();
  const month = d.toLocaleString("en-US", { month: "short", timeZone: "UTC" });
  const day = d.getUTCDate();
  if (isToday) return `Today, ${month} ${day}`;
  return `${month} ${day}`;
}

function normalizeTaskSlot(raw) {
  if (!raw || typeof raw !== "object") {
    return {
      submitted: false,
      eligible: false,
      status: undefined,
      tweetUrl: undefined,
      gemReward: undefined,
      rejectionReason: undefined,
    };
  }
  return {
    submitted: !!raw.submitted,
    eligible: raw.eligible !== false,
    status: raw.status,
    tweetUrl: raw.tweetUrl,
    gemReward: raw.gemReward,
    rejectionReason: raw.rejectionReason,
  };
}

function normalizePortfolioPositions(portfolio) {
  const raw = portfolio?.positions;
  if (!Array.isArray(raw)) return [];
  return raw
    .map((p) => ({
      symbol: p?.symbol ? String(p.symbol).toUpperCase() : "",
      name: p?.name ? String(p.name) : "",
      logo: typeof p?.logo === "string" && p.logo ? p.logo : null,
    }))
    .filter((p) => p.symbol);
}

function mapApiPortfolioToEntry(portfolio) {
  if (!portfolio || typeof portfolio !== "object") return null;

  const id = portfolio.portfolioId ?? portfolio.id;
  if (!id) return null;

  const rewards = portfolio.rewards || {};
  const task1Usd = Number(rewards.task1Usd ?? 0);
  const task2Usd = Number(rewards.task2Usd ?? 0);
  const fallbackTier = getRewardTier(
    Number(portfolio.totalInvestment ?? portfolio.investmentTier ?? 0),
  );
  const resolvedTask1Usd = task1Usd || fallbackTier.task1;
  const resolvedTask2Usd = task2Usd || fallbackTier.task2;
  const maxReward = resolvedTask1Usd + resolvedTask2Usd;

  const task1Slot = normalizeTaskSlot(portfolio.task1);
  const task2Slot = normalizeTaskSlot(portfolio.task2);
  const createdAtIso =
    typeof portfolio.createdAt === "string" && portfolio.createdAt
      ? portfolio.createdAt
      : typeof portfolio.updatedAt === "string" && portfolio.updatedAt
        ? portfolio.updatedAt
        : null;

  let earnedUsd = 0;
  if (task1Slot.submitted && task1Slot.status === "APPROVED") {
    earnedUsd += resolvedTask1Usd;
  }
  if (task2Slot.submitted && task2Slot.status === "APPROVED") {
    earnedUsd += resolvedTask2Usd;
  }

  const amountInvested = Number(
    portfolio.totalInvestment ?? portfolio.investmentTier ?? 0,
  );
  const performerUnlocked =
    task2Slot.eligible ||
    (task2Slot.submitted && task2Slot.status !== "REJECTED");

  const positions = normalizePortfolioPositions(portfolio);
  const tokens = positions.map((p) => p.symbol);

  return {
    id: String(id),
    portfolioId: String(id),
    createdAtIso,
    date: formatPortfolioListDate(portfolio.createdAt),
    portfolioName: portfolio.name || "Portfolio",
    theme: portfolio.chain || "",
    cardType: performerUnlocked ? "positive-performer" : "new-portfolio",
    amountInvested,
    positions,
    tokens,
    task1Slot,
    task2Slot,
    task1Completed: task1Slot.submitted,
    task2Completed: task2Slot.submitted,
    task1Link: task1Slot.tweetUrl,
    task2Link: task2Slot.tweetUrl,
    totalEarned: earnedUsd,
    maxReward,
    rewards: {
      task1Usd: resolvedTask1Usd,
      task2Usd: resolvedTask2Usd,
    },
    growth: performerUnlocked
      ? Number(portfolio.growthPercent ?? portfolio.pnlPercent ?? 5)
      : undefined,
  };
}

function mapSubmitProveError(error) {
  const status = error?.status;
  const msg = String(error?.message || "").toLowerCase();
  const dataMsg = String(
    error?.data?.message || error?.data?.error || "",
  ).toLowerCase();
  const combined = `${msg} ${dataMsg}`;

  if (
    status === 403 ||
    combined.includes("x account") ||
    combined.includes("twitter")
  ) {
    return "Link your X account to submit.";
  }
  if (status === 404) {
    return "Portfolio not found.";
  }
  if (status === 409 || combined.includes("already")) {
    if (combined.includes("tweet")) {
      return "This tweet was already submitted.";
    }
    return "This task or tweet was already submitted.";
  }
  if (status === 400) {
    return (
      error?.message ||
      "Submission was rejected. Check your portfolio and tweet link."
    );
  }
  return error?.message || "Unable to submit. Please try again.";
}

/** Same chip list as `CardPreview` (positions from API or `tokens` fallback). */
function getPositionChipsForEntry(entry) {
  if (!entry) return [];
  if (Array.isArray(entry.positions) && entry.positions.length > 0) {
    return entry.positions;
  }
  return (entry.tokens || []).map((sym) => ({
    symbol: String(sym),
    name: String(sym),
    logo: null,
  }));
}

function getCardExportFields(entry) {
  if (!entry) return null;

  const isPerformer = entry.cardType === "positive-performer";
  const isSnapshot = entry.cardType === "portfolio-snapshot";
  const backgroundImage =
    CARD_BACKGROUND_BY_TYPE[entry.cardType] ?? newPortfolioBg;

  const symbols =
    Array.isArray(entry.tokens) && entry.tokens.length > 0
      ? entry.tokens
      : Array.isArray(entry.positions)
        ? entry.positions.map((p) => p.symbol).filter(Boolean)
        : [];
  const tokenLine = symbols.length ? symbols.join(" · ") : "";

  const metricValue = isPerformer
    ? `+${Number(entry.growth ?? 0).toFixed(1)}%`
    : isSnapshot && entry.snapshotValueUsd != null
      ? `$${Number(entry.snapshotValueUsd).toLocaleString()}`
      : `$${entry.amountInvested.toLocaleString()}`;

  const investedLabel = `$${Number(entry.amountInvested).toLocaleString()} invested`;

  const detail = isPerformer
    ? [entry.portfolioName, investedLabel].filter(Boolean).join(" · ")
    : isSnapshot
      ? [entry.portfolioName, entry.theme].filter(Boolean).join(" · ") ||
        "On-chain portfolio"
      : [entry.portfolioName, entry.theme].filter(Boolean).join(" · ") ||
        entry.portfolioName ||
        "On-chain portfolio";

  return {
    backgroundImage,
    metricValue,
    detail,
    tokenLine,
    positions: getPositionChipsForEntry(entry),
  };
}

function roundRectPath(ctx, x, y, w, h, r) {
  const rad = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rad, y);
  ctx.lineTo(x + w - rad, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + rad);
  ctx.lineTo(x + w, y + h - rad);
  ctx.quadraticCurveTo(x + w, y + h, x + w - rad, y + h);
  ctx.lineTo(x + rad, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - rad);
  ctx.lineTo(x, y + rad);
  ctx.quadraticCurveTo(x, y, x + rad, y);
  ctx.closePath();
}

function loadLogoImage(url) {
  if (!url) return Promise.resolve(null);
  return new Promise((resolve) => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => resolve(image);
    image.onerror = () => resolve(null);
    image.src = url;
  });
}

async function drawExportTokenChips(ctx, chips, canvasSize) {
  const maxChips = 10;
  const slice = chips.slice(0, maxChips);
  const extra = chips.length > maxChips ? chips.length - maxChips : 0;
  const chipH = 40;
  const logoR = 15;
  const gap = 8;
  const baseY = 1100;
  const padX = 10;

  ctx.font = "600 19px Inter, Arial, sans-serif";
  ctx.textBaseline = "middle";

  const logoImages = await Promise.all(slice.map((p) => loadLogoImage(p.logo)));

  const chipWidths = slice.map((pos, i) => {
    const tw = ctx.measureText(pos.symbol).width;
    const hasImg = logoImages[i] != null;
    const logoW = hasImg ? logoR * 2 + 6 : logoR * 2 + 4;
    return padX * 2 + logoW + tw;
  });
  let totalW = chipWidths.reduce((a, b) => a + b, 0) + (slice.length - 1) * gap;
  if (extra > 0) {
    ctx.font = "600 17px Inter, Arial, sans-serif";
    totalW += gap + ctx.measureText(`+${extra}`).width + 20;
  }

  let x = canvasSize / 2 - totalW / 2;

  for (let i = 0; i < slice.length; i += 1) {
    const pos = slice[i];
    const w = chipWidths[i];
    const cy = baseY;

    ctx.save();
    roundRectPath(ctx, x, cy - chipH / 2, w, chipH, chipH / 2);
    ctx.fillStyle = "rgba(0,0,0,0.42)";
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.18)";
    ctx.lineWidth = 2;
    ctx.stroke();

    const lx = x + padX + logoR;

    const img = logoImages[i];
    if (img && img.width > 0) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(lx, cy, logoR, 0, Math.PI * 2);
      ctx.clip();
      ctx.drawImage(img, lx - logoR, cy - logoR, logoR * 2, logoR * 2);
      ctx.restore();
      ctx.strokeStyle = "rgba(255,255,255,0.25)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(lx, cy, logoR, 0, Math.PI * 2);
      ctx.stroke();
    } else {
      ctx.fillStyle = "rgba(255,255,255,0.28)";
      ctx.beginPath();
      ctx.arc(lx, cy, logoR, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 15px Inter, Arial, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(String(pos.symbol).slice(0, 2), lx, cy);
    }

    ctx.textAlign = "left";
    ctx.font = "600 19px Inter, Arial, sans-serif";
    ctx.fillStyle = "#ffffff";
    ctx.fillText(pos.symbol, lx + logoR + 8, cy);

    ctx.restore();
    x += w + gap;
  }

  if (extra > 0) {
    ctx.font = "600 17px Inter, Arial, sans-serif";
    ctx.fillStyle = "rgba(255,255,255,0.78)";
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillText(`+${extra}`, x + 6, baseY);
  }
}

async function exportPortfolioCardPng(
  { backgroundImage, metricValue, tokenLine, positions = [] },
  filename,
) {
  if (!backgroundImage || !filename) return;
  const canvas = document.createElement("canvas");
  const exportSize = 1200;
  canvas.width = exportSize;
  canvas.height = exportSize;

  const context = canvas.getContext("2d");
  if (!context) return;

  const img = await new Promise((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = backgroundImage;
  });

  const radius = 48;
  context.save();
  context.beginPath();
  context.moveTo(radius, 0);
  context.lineTo(exportSize - radius, 0);
  context.quadraticCurveTo(exportSize, 0, exportSize, radius);
  context.lineTo(exportSize, exportSize - radius);
  context.quadraticCurveTo(
    exportSize,
    exportSize,
    exportSize - radius,
    exportSize,
  );
  context.lineTo(radius, exportSize);
  context.quadraticCurveTo(0, exportSize, 0, exportSize - radius);
  context.lineTo(0, radius);
  context.quadraticCurveTo(0, 0, radius, 0);
  context.closePath();
  context.clip();

  context.drawImage(img, 0, 0, exportSize, exportSize);

  context.textAlign = "center";
  context.fillStyle = "#ffffff";
  context.font = "800 86px Inter, Arial, sans-serif";
  context.fillText(metricValue, 600, 1050);

  const chips = Array.isArray(positions) ? positions : [];
  if (chips.length > 0) {
    await drawExportTokenChips(context, chips, exportSize);
  } else if (tokenLine) {
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillStyle = "rgba(255,255,255,0.78)";
    context.font = "600 22px Inter, Arial, sans-serif";
    const maxChars = 56;
    const line =
      tokenLine.length > maxChars
        ? `${tokenLine.slice(0, maxChars - 1)}…`
        : tokenLine;
    context.fillText(line, 600, 1100);
  }

  context.restore();

  await new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error("Could not create image blob."));
        return;
      }
      const pngUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = pngUrl;
      link.download = filename;
      link.click();
      URL.revokeObjectURL(pngUrl);
      resolve();
    }, "image/png");
  });
}

function MoreDetailsModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        onClick={(e) => e.stopPropagation()}
        className="glass-card p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-gray-900">Campaign Details</h3>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-all"
          >
            <XIcon className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        <div className="space-y-6">
          {/* How it Works */}
          <div>
            <h4 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
              <Award className="w-4 h-4 text-purple-600" />
              How It Works
            </h4>
            <ul className="space-y-2 text-sm text-gray-700">
              <li className="flex gap-2">
                <span className="text-purple-600 font-bold">•</span>
                <span>
                  Users can create{" "}
                  <strong>one on-chain portfolio per day</strong> with a minimum
                  investment of <strong>$100</strong>.
                </span>
              </li>
              <li className="flex gap-2">
                <span className="text-purple-600 font-bold">•</span>
                <span>
                  <strong>Task 1:</strong> Share your new portfolio card on X
                  (Twitter) and submit the link to earn guaranteed rewards.
                </span>
              </li>
              <li className="flex gap-2">
                <span className="text-purple-600 font-bold">•</span>
                <span>
                  <strong>Task 2:</strong> If your portfolio grows by{" "}
                  <strong>5% or more</strong>, this task activates. Share your
                  positive performer card on X and submit the link to earn
                  additional rewards.
                </span>
              </li>
              <li className="flex gap-2">
                <span className="text-purple-600 font-bold">•</span>
                <span>
                  <strong>Important:</strong> If you sell your portfolio, you
                  will no longer be able to use it in the campaign.
                </span>
              </li>
            </ul>
          </div>

          {/* Verification Process */}
          <div>
            <h4 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-600" />
              Verification Process
            </h4>
            <ul className="space-y-2 text-sm text-gray-700">
              <li className="flex gap-2">
                <span className="text-amber-600 font-bold">•</span>
                <span>
                  When you submit a link for any task, it enters a{" "}
                  <strong>verification process</strong>.
                </span>
              </li>
              <li className="flex gap-2">
                <span className="text-amber-600 font-bold">•</span>
                <span>
                  Upon submission,{" "}
                  <strong>rewards are allocated to your account</strong>, but
                  they must be <strong>verified and approved</strong> by our
                  team before being finalized.
                </span>
              </li>
              <li className="flex gap-2">
                <span className="text-amber-600 font-bold">•</span>
                <span>
                  Our team will review your submission to ensure it meets
                  campaign requirements.
                </span>
              </li>
              <li className="flex gap-2">
                <span className="text-amber-600 font-bold">•</span>
                <span>
                  Once verified and approved, the rewards are{" "}
                  <strong>confirmed and finalized</strong> in your account.
                </span>
              </li>
              <li className="flex gap-2">
                <span className="text-amber-600 font-bold">•</span>
                <span>
                  You can track the status of each task: Pending, In
                  Verification, Approved, or Rejected.
                </span>
              </li>
            </ul>
          </div>

          {/* Terms & Conditions */}
          <div>
            <h4 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
              <FileText className="w-4 h-4 text-gray-600" />
              Terms & Conditions
            </h4>
            <ul className="space-y-2 text-xs text-gray-600">
              <li className="flex gap-2">
                <span className="text-gray-400 font-bold">•</span>
                <span>
                  AlloX reserves the right to modify, suspend, or terminate the
                  campaign at any time without prior notice.
                </span>
              </li>
              <li className="flex gap-2">
                <span className="text-gray-400 font-bold">•</span>
                <span>
                  Submissions that violate campaign rules, contain fraudulent
                  activity, or use automated bots will be disqualified.
                </span>
              </li>
              <li className="flex gap-2">
                <span className="text-gray-400 font-bold">•</span>
                <span>
                  Rewards are subject to verification and approval by our team.
                  Incomplete or invalid submissions will not be rewarded.
                </span>
              </li>
              <li className="flex gap-2">
                <span className="text-gray-400 font-bold">•</span>
                <span>
                  By participating, you agree to comply with all campaign rules
                  and AlloX's terms of service.
                </span>
              </li>
              <li className="flex gap-2">
                <span className="text-gray-400 font-bold">•</span>
                <span>
                  AlloX is not responsible for technical issues, network errors,
                  or user errors that may affect participation.
                </span>
              </li>
            </ul>
          </div>
        </div>

        <button onClick={onClose} className="btn-primary w-full mt-6">
          Got it
        </button>
      </motion.div>
    </div>
  );
}

/* ── Inline link submission field (Prove API task slots) ── */
function LinkField({
  taskNum,
  label,
  hint,
  rewardUsd,
  slot,
  ineligibleCopy,
  onSubmit,
  twitterLinked,
  onLinkX,
  twitterLinkLoading = false,
  hasRelinkCooldown = false,
  relinkCountdownTarget = null,
}) {
  const [open, setOpen] = useState(false);
  const [val, setVal] = useState("");

  const submitted = !!slot?.submitted;
  const eligible = slot?.eligible !== false;
  const status = slot?.status;
  const savedLink = slot?.tweetUrl;
  const gemReward = slot?.gemReward;
  const rejectionReason = slot?.rejectionReason;

  const isApproved = submitted && status === "APPROVED";
  const isPending = submitted && status === "PENDING";
  const isRejected = submitted && status === "REJECTED";
  const needsXLink =
    twitterLinked != null && twitterLinked === false && eligible && !submitted;
  const canSubmitNew = !submitted && eligible && !needsXLink;
  const locked = !submitted && !eligible;

  const submit = () => {
    const trimmed = val.trim();
    if (!trimmed) return;
    onSubmit(trimmed);
    setVal("");
    setOpen(false);
  };

  const borderTone = isRejected
    ? "border-red-200 bg-red-50/40"
    : isApproved
      ? "border-green-200 bg-green-50/50"
      : isPending
        ? "border-amber-200 bg-amber-50/40"
        : locked
          ? "border-gray-200 bg-gray-50/50"
          : "border-gray-200 bg-white/40";

  return (
    <div className={`rounded-xl border transition-colors ${borderTone}`}>
      <div className="flex flex-col lg:flex-row items-center justify-between gap-3 px-4 py-3">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div
            className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold ${
              isApproved
                ? "bg-green-500 text-white"
                : isPending
                  ? "bg-amber-400 text-white"
                  : isRejected
                    ? "bg-red-500 text-white"
                    : "bg-gray-100 text-gray-500"
            }`}
          >
            {isApproved ? (
              <CheckCircle2 className="w-4 h-4" />
            ) : isPending ? (
              <Clock className="w-4 h-4" />
            ) : isRejected ? (
              <AlertCircle className="w-4 h-4" />
            ) : (
              taskNum
            )}
          </div>
          <div className="min-w-0">
            <div className="text-sm font-semibold text-gray-800">{label}</div>
            {submitted && savedLink ? (
              <a
                href={savedLink}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-blue-500 hover:underline truncate block max-w-[220px]"
              >
                {savedLink}
              </a>
            ) : locked ? (
              <div className="text-xs text-gray-500">{ineligibleCopy}</div>
            ) : needsXLink ? (
              <div className="text-xs text-amber-800">
                Link your X account to submit tweet links for this campaign.
              </div>
            ) : (
              <div className="text-xs text-gray-400">{hint}</div>
            )}
            {isPending && (
              <span className="mt-1 inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-800">
                In review
              </span>
            )}
            {isApproved && gemReward != null && (
              <div className="mt-1 text-xs font-semibold text-emerald-700">
                +{gemReward} gems
              </div>
            )}
            {isRejected && rejectionReason && (
              <div className="mt-1 text-xs text-red-600">{rejectionReason}</div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-white border border-gray-100 shadow-sm">
            <Gem className="w-3 h-3 text-purple-500" />
            <span className="text-xs font-bold text-gray-800">
              ${rewardUsd}
            </span>
          </div>
          {needsXLink && onLinkX && (
            <button
              type="button"
              onClick={onLinkX}
              disabled={twitterLinkLoading || hasRelinkCooldown}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-amber-600 text-white hover:bg-amber-700 disabled:opacity-60"
            >
              <Link2 className="w-3 h-3" />
              {hasRelinkCooldown ? (
                <span className="inline-flex items-center gap-1">
                  Cooldown{" "}
                  {relinkCountdownTarget != null ? (
                    <Countdown
                      date={relinkCountdownTarget}
                      renderer={(args) =>
                        args.completed ? "00:00:00" : formatCountdownHms(args)
                      }
                    />
                  ) : null}
                </span>
              ) : twitterLinkLoading ? (
                "Opening…"
              ) : (
                "Link X"
              )}
            </button>
          )}
          {canSubmitNew && (
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                open
                  ? "bg-gray-200 text-gray-700"
                  : "bg-gray-900 text-white hover:bg-gray-700"
              }`}
            >
              <Link2 className="w-3 h-3" />
              {open ? "Cancel" : "Submit link"}
            </button>
          )}
          {locked && (
            <span className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">
              Locked
            </span>
          )}
        </div>
      </div>

      <AnimatePresence initial={false}>
        {open && canSubmitNew && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-3 flex gap-2">
              <div className="flex-1 flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-lg focus-within:border-purple-400 transition-colors">
                <Link2 className="w-3.5 h-3.5 text-gray-300 flex-shrink-0" />
                <input
                  type="url"
                  value={val}
                  onChange={(e) => setVal(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && submit()}
                  placeholder="https://x.com/yourname/status/…"
                  className="flex-1 text-sm bg-transparent outline-none text-gray-800 placeholder-gray-300 min-w-0"
                  autoFocus
                />
                {val && (
                  <button type="button" onClick={() => setVal("")}>
                    <XIcon className="w-3.5 h-3.5 text-gray-300 hover:text-gray-500" />
                  </button>
                )}
              </div>
              <button
                type="button"
                onClick={submit}
                disabled={!val.trim()}
                className="flex items-center gap-1.5 px-4 py-2 bg-purple-600 disabled:opacity-30 text-white text-xs font-semibold rounded-lg hover:bg-purple-700 transition-all"
              >
                <Send className="w-3 h-3" />
                Submit
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function TaskColumnGlyph({ slot }) {
  const submitted = !!slot?.submitted;
  const status = slot?.status;
  if (!submitted) {
    return (
      <div className="w-5 h-5 rounded-full border-2 border-gray-300 mx-auto mb-0.5" />
    );
  }
  if (status === "APPROVED") {
    return <CheckCircle2 className="w-5 h-5 text-green-500 mx-auto mb-0.5" />;
  }
  if (status === "REJECTED") {
    return <AlertCircle className="w-5 h-5 text-red-500 mx-auto mb-0.5" />;
  }
  if (status === "PENDING") {
    return <Clock className="w-5 h-5 text-amber-500 mx-auto mb-0.5" />;
  }
  return <CheckCircle2 className="w-5 h-5 text-gray-400 mx-auto mb-0.5" />;
}

function PortfolioRow({
  entry,
  isSelected,
  onSelect,
  onTaskSubmit,
  twitterLinked,
  onLinkX,
  twitterLinkLoading,
  hasRelinkCooldown,
  relinkCountdownTarget,
}) {
  const [expanded, setExpanded] = useState(isSelected);
  const task1Usd =
    entry.rewards?.task1Usd ?? getRewardTier(entry.amountInvested).task1;
  const task2Usd =
    entry.rewards?.task2Usd ?? getRewardTier(entry.amountInvested).task2;
  const task1Slot = entry.task1Slot || normalizeTaskSlot(null);
  const task2Slot = entry.task2Slot || normalizeTaskSlot(null);
  const task2Unlocked = task2Slot.eligible || task2Slot.submitted;

  useEffect(() => {
    if (isSelected) setExpanded(true);
  }, [isSelected]);

  return (
    <motion.div
      layout
      onClick={onSelect}
      className={`rounded-2xl border transition-all cursor-pointer ${
        isSelected
          ? "border-purple-400 bg-purple-50/40 shadow-md"
          : "border-gray-300 bg-white/30 hover:bg-white/50 hover:border-gray-400"
      }`}
    >
      {/* Summary row */}
      <div className="flex items-center gap-4 px-4 py-3.5">
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-gray-900 text-sm">
            Total Invested: ${entry.amountInvested.toLocaleString()}
          </div>
          <div className="text-xs text-gray-500 mt-0.5">{entry.date}</div>
        </div>

        <div className="flex items-center gap-3 flex-shrink-0">
          <div className="text-center">
            <TaskColumnGlyph slot={task1Slot} />
            <div className="text-[10px] text-gray-600">Task 1</div>
            <div className="text-[10px] font-semibold text-[#101828]">
              ${task1Usd}
            </div>
          </div>

          <div className="text-center">
            <TaskColumnGlyph slot={task2Slot} />
            <div className="text-[10px] text-gray-600">Task 2</div>
            <div className="text-[10px] font-semibold text-[#101828]">
              ${task2Usd}
            </div>
          </div>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setExpanded((v) => !v);
            }}
            className="w-6 h-6 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-all ml-2"
          >
            {expanded ? (
              <ChevronUp className="w-3.5 h-3.5 text-gray-400" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
            )}
          </button>
        </div>
      </div>

      {/* Expanded tasks */}
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div
              className="px-4 pb-4 space-y-3 border-t border-gray-100/80 pt-3"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="px-3 py-2 bg-blue-50/50 border border-blue-100 rounded-lg">
                <p className="text-xs text-gray-700">
                  Share on X with a card generated and submit the link.
                  Submissions are reviewed by the team; gems credit after
                  approval.
                </p>
              </div>

              <div className="space-y-2">
                <LinkField
                  taskNum={1}
                  label="Share your new portfolio card"
                  hint="Post your new portfolio card on X and submit the link"
                  rewardUsd={task1Usd}
                  slot={task1Slot}
                  ineligibleCopy="Portfolio must have at least $100 invested"
                  onSubmit={(link) => onTaskSubmit(1, link)}
                  twitterLinked={twitterLinked}
                  onLinkX={onLinkX}
                  twitterLinkLoading={twitterLinkLoading}
                  hasRelinkCooldown={hasRelinkCooldown}
                  relinkCountdownTarget={relinkCountdownTarget}
                />

                {task2Unlocked ? (
                  <LinkField
                    taskNum={2}
                    label="Share your positive performer portfolio"
                    hint="Your portfolio hit +5% — post it on X and submit the link"
                    rewardUsd={task2Usd}
                    slot={task2Slot}
                    ineligibleCopy="Your portfolio needs to hit +5% to unlock"
                    onSubmit={(link) => onTaskSubmit(2, link)}
                    twitterLinked={twitterLinked}
                    onLinkX={onLinkX}
                    twitterLinkLoading={twitterLinkLoading}
                    hasRelinkCooldown={hasRelinkCooldown}
                    relinkCountdownTarget={relinkCountdownTarget}
                  />
                ) : (
                  <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50/40 px-4 py-3 flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                      <Lock className="w-3 h-3 text-gray-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-gray-400">
                        Share your positive performer portfolio
                      </div>
                      <div className="text-xs text-gray-400 mt-0.5">
                        Your portfolio needs to hit +5% to unlock
                      </div>
                    </div>
                    <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-white border border-gray-100">
                      <Gem className="w-3 h-3 text-gray-300" />
                      <span className="text-xs font-bold text-gray-300">
                        ${task2Usd}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function CardPreview({
  entry,
  twitterStatus,
  onLinkX,
  twitterLinkLoading,
  hasRelinkCooldown,
  relinkCountdownTarget,
}) {
  const [busyAction, setBusyAction] = useState(null);

  const xGateActive = twitterStatus != null && twitterStatus.linked === false;

  if (!entry) {
    return (
      <div className="aspect-square w-full rounded-2xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center text-center p-8 bg-gray-50/40">
        <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
          <Sparkles className="w-7 h-7 text-gray-300" />
        </div>
        <p className="text-sm font-semibold text-gray-400 mb-1">
          No card to preview
        </p>
        <p className="text-xs text-gray-300">
          Create a portfolio to generate your card
        </p>
      </div>
    );
  }

  const exportCardImage = async (filename) => {
    const fields = getCardExportFields(entry);
    if (!fields) return;
    await exportPortfolioCardPng(fields, filename);
  };

  const handleDownloadCard = async () => {
    if (xGateActive) {
      toast.error("Link your X account to download your campaign card.");
      return;
    }
    setBusyAction("save");
    try {
      await exportCardImage(`allox-${entry.cardType}-${entry.id}-card.png`);
    } catch {
      toast.error("Could not download the card. Please try again.");
    } finally {
      setBusyAction(null);
    }
  };

  const handleShareOnX = async () => {
    if (xGateActive) {
      toast.error("Link your X account to share.");
      return;
    }
    setBusyAction("share");
    try {
      await exportCardImage(`allox-${entry.cardType}-${entry.id}-card.png`);
      window.open(TWITTER_SHARE_URL, "_blank", "noopener");
    } catch {
      toast.error("Could not prepare your card for sharing. Please try again.");
    } finally {
      setBusyAction(null);
    }
  };

  const fields = getCardExportFields(entry);
  const { backgroundImage, metricValue, tokenLine } = fields;

  const isPerformer = entry.cardType === "positive-performer";
  const isSnapshot = entry.cardType === "portfolio-snapshot";

  const cardAlt = isPerformer
    ? "Positive performer card"
    : isSnapshot
      ? "Portfolio snapshot card"
      : "New portfolio card";

  const positionChips = getPositionChipsForEntry(entry);

  return (
    <motion.div
      key={entry.id}
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.2 }}
    >
      <div className="aspect-square w-full max-w-[380px] mx-auto rounded-2xl p-6 relative overflow-hidden shadow-2xl">
        <img
          src={backgroundImage}
          alt={cardAlt}
          className="absolute inset-0 w-full h-full rounded-2xl"
        />

        <div className="relative z-10 h-full min-h-[200px] flex flex-col justify-end pb-4 pt-14 px-1">
          <div className="text-center relative top-7.5 ">
            <div className="text-4xl font-extrabold text-white leading-none drop-shadow-sm">
              {metricValue}
            </div>
            {/* <div className="text-white/75 text-[11px] uppercase tracking-wider mt-1.5 line-clamp-2">
              {detail}
            </div> */}
            {positionChips.length > 0 ? (
              <div className="flex flex-wrap justify-center gap-1 max-w-[300px] mx-auto">
                {positionChips.slice(0, 10).map((pos) => (
                  <div
                    key={pos.symbol}
                    className="flex items-center gap-0.5 rounded-full bg-black/40 pl-0.5 pr-1.5 py-0.5 border border-white/15 shadow-sm"
                    title={pos.name || pos.symbol}
                  >
                    {pos.logo ? (
                      <img
                        src={pos.logo}
                        alt=""
                        className="w-5 h-5 rounded-full object-cover shrink-0 ring-1 ring-white/20"
                      />
                    ) : (
                      <span className="w-5 h-5 rounded-full bg-white/25 text-[8px] font-bold text-white flex items-center justify-center shrink-0">
                        {String(pos.symbol).slice(0, 2)}
                      </span>
                    )}
                    <span className="text-[9px] font-semibold text-white tracking-tight">
                      {pos.symbol}
                    </span>
                  </div>
                ))}
                {positionChips.length > 10 && (
                  <span className="text-[9px] font-semibold text-white/70 self-center px-1">
                    +{positionChips.length - 10}
                  </span>
                )}
              </div>
            ) : tokenLine ? (
              <div className="text-white/70 text-[10px] font-medium mt-1.5 line-clamp-2 tracking-wide">
                {tokenLine}
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <div className="flex gap-2.5 max-w-[380px] mx-auto mt-3">
        <button
          type="button"
          onClick={handleShareOnX}
          disabled={busyAction !== null || xGateActive}
          className="flex-1 btn-primary py-3 flex items-center justify-center gap-2 text-sm disabled:opacity-60 disabled:cursor-not-allowed"
        >
          <Share2 className="w-4 h-4" />
          {busyAction === "share" ? "Preparing…" : "Share on X"}
        </button>
        <button
          type="button"
          onClick={handleDownloadCard}
          disabled={busyAction !== null || xGateActive}
          className="flex-1 px-5 py-3 bg-white/60 backdrop-blur-sm border border-gray-200 rounded-xl text-gray-700 font-semibold hover:bg-white/80 transition-all flex items-center justify-center gap-2 text-sm disabled:opacity-60 disabled:cursor-not-allowed"
        >
          <Download className="w-4 h-4" />
          {busyAction === "save" ? "Saving…" : "Save"}
        </button>
      </div>

      {twitterStatus != null && (
        <div className="max-w-[380px] mx-auto mt-3">
          {twitterStatus.linked ? (
            <div className="text-xs text-green-700 bg-green-50 border border-green-200 rounded-xl px-3 py-2">
              X linked
              {twitterStatus.username ? ` as @${twitterStatus.username}` : ""}.
            </div>
          ) : (
            <div className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 flex items-center justify-between gap-3">
              <span>
                {hasRelinkCooldown && relinkCountdownTarget != null ? (
                  <>
                    Re-link available in{" "}
                    <Countdown
                      date={relinkCountdownTarget}
                      renderer={(args) =>
                        args.completed ? "00:00:00" : formatCountdownHms(args)
                      }
                    />
                  </>
                ) : (
                  "Link X to submit tweet links and use Share / Save on your card."
                )}
              </span>
              {onLinkX && (
                <button
                  type="button"
                  onClick={onLinkX}
                  disabled={twitterLinkLoading || hasRelinkCooldown}
                  className="shrink-0 font-semibold text-amber-950 disabled:opacity-50"
                >
                  {hasRelinkCooldown ? "Cooldown" : "Link X"}
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
}

export function ProvePortfolio() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { isConnected: isWalletConnected } = useSelector(
    (state) => state.wallet,
  );
  const { token, ensureAuthenticated } = useAuth();

  const [competitionId, setCompetitionId] = useState(null);
  const [rewardStructure, setRewardStructure] = useState(null);
  const [myStats, setMyStats] = useState(null);
  const [todayEntry, setTodayEntry] = useState(null);
  const [submissionEntries, setSubmissionEntries] = useState([]);
  const [submissionsPagination, setSubmissionsPagination] = useState({
    page: 1,
    pages: 1,
    total: 0,
  });
  const [selectedId, setSelectedId] = useState(null);
  const [resetCountdownSec, setResetCountdownSec] = useState(null);
  const [loadingCompetition, setLoadingCompetition] = useState(false);
  const [loadingCampaignData, setLoadingCampaignData] = useState(false);
  const [showMoreDetails, setShowMoreDetails] = useState(false);
  const [showTierRules, setShowTierRules] = useState(false);
  const tierRulesRef = useRef(null);
  const [twitterStatus, setTwitterStatus] = useState(null);
  const [twitterLinkLoading, setTwitterLinkLoading] = useState(false);

  const fetchTwitterStatus = useCallback(async () => {
    const data = await apiCall("/twitter/status");
    setTwitterStatus(data);
    return data;
  }, []);

  const startTwitterLinkFlow = useCallback(async () => {
    setTwitterLinkLoading(true);
    try {
      await ensureAuthenticated();
      let payload;
      try {
        payload = await apiCall("/twitter/auth-url");
      } catch {
        payload = await apiCall("/twitter/auth");
      }
      const authUrl = payload?.authUrl || payload?.url;
      if (!authUrl) {
        throw new Error("Twitter link flow is unavailable right now.");
      }
      window.location.href = authUrl;
    } catch (error) {
      const errorMessage = String(error?.message || "");
      const isRelinkCooldown =
        errorMessage.toUpperCase().includes("RELINK_COOLDOWN") ||
        errorMessage.toLowerCase().includes("relink cooldown");

      if (isRelinkCooldown) {
        await fetchTwitterStatus().catch(() => {});
        return;
      }

      toast.error(error?.message || "Unable to start Twitter linking.");
    } finally {
      setTwitterLinkLoading(false);
    }
  }, [ensureAuthenticated, fetchTwitterStatus]);

  const relinkCountdownTarget = useMemo(() => {
    const cooldown = twitterStatus?.cooldown;
    const relinkAt = cooldown?.relinkAt;
    if (!cooldown || cooldown.allowed || !relinkAt) return null;
    const timestamp = new Date(relinkAt).getTime();
    if (!Number.isFinite(timestamp) || timestamp <= Date.now()) return null;
    return timestamp;
  }, [twitterStatus]);
  const hasRelinkCooldown = Boolean(relinkCountdownTarget);

  const twitterLinked = twitterStatus?.linked;

  const rewardTableRows = useMemo(() => {
    const b = rewardStructure?.brackets;
    if (Array.isArray(b) && b.length > 0) {
      return b.map((row) => ({
        key: String(row.minInvestmentUsd),
        amount: row.minInvestmentUsd,
        task1: row.task1Usd,
        task2: row.task2Usd,
        maxReward: row.totalUsd ?? (row.task1Usd ?? 0) + (row.task2Usd ?? 0),
      }));
    }
    return REWARD_TIERS.map((tier) => ({
      key: String(tier.amount),
      amount: tier.amount,
      task1: tier.task1,
      task2: tier.task2,
      maxReward: tier.maxReward,
    }));
  }, [rewardStructure]);

  /**
   * `/today-portfolio` can return a newly built portfolio even after the user
   * already submitted a task on a different portfolio the same UTC day. Only
   * the portfolio that already has submissions (or no conflict) is the daily
   * campaign row.
   */
  const effectiveTodayEntry = useMemo(() => {
    if (!todayEntry) return null;
    const anotherTodayAlreadySubmitted = submissionEntries.some(
      (e) =>
        e.id !== todayEntry.id &&
        entryIsPortfolioUtcToday(e) &&
        entryHasProveTaskSubmission(e),
    );
    if (anotherTodayAlreadySubmitted) return null;
    return todayEntry;
  }, [todayEntry, submissionEntries]);

  const pastSubmissions = useMemo(() => {
    if (!effectiveTodayEntry) return submissionEntries;
    return submissionEntries.filter((e) => e.id !== effectiveTodayEntry.id);
  }, [submissionEntries, effectiveTodayEntry]);

  /** No daily row (or it was suppressed), but a task was submitted on a portfolio dated today (UTC). */
  const dailyProveSlotConsumedToday = useMemo(() => {
    if (effectiveTodayEntry) return false;
    return submissionEntries.some((entry) => {
      if (!entryHasProveTaskSubmission(entry)) return false;
      if (entry.createdAtIso && isUtcCalendarToday(entry.createdAtIso)) {
        return true;
      }
      return typeof entry.date === "string" && entry.date.startsWith("Today");
    });
  }, [effectiveTodayEntry, submissionEntries]);

  const selectedEntry = useMemo(() => {
    if (!selectedId) return null;
    if (effectiveTodayEntry && effectiveTodayEntry.id === selectedId) {
      return effectiveTodayEntry;
    }
    return submissionEntries.find((e) => e.id === selectedId) ?? null;
  }, [selectedId, effectiveTodayEntry, submissionEntries]);

  const countdownParts = useMemo(() => {
    if (resetCountdownSec == null || resetCountdownSec <= 0) {
      return { hours: 0, minutes: 0, seconds: 0, active: false };
    }
    const h = Math.floor(resetCountdownSec / 3600);
    const m = Math.floor((resetCountdownSec % 3600) / 60);
    const s = resetCountdownSec % 60;
    return { hours: h, minutes: m, seconds: s, active: true };
  }, [resetCountdownSec]);

  const totalPoolUsd =
    myStats?.totalPoolUsd ?? rewardStructure?.totalPoolUsd ?? 50000;
  const totalPoolGems =
    myStats?.totalPoolGems ?? rewardStructure?.totalPoolGems ?? 10000;
  const totalEarnedUsd = Number(myStats?.totalEarnedUsd ?? 0);
  const gemsPending = Number(myStats?.gemsPending ?? 0);

  const goToPortfolio = useCallback(() => {
    navigate("/", {
      state: { chatSuggestion: "Build Quick Portfolio" },
    });
  }, [navigate]);

  const loadCompetition = useCallback(async () => {
    setLoadingCompetition(true);
    try {
      const payload = await apiCall("/competition/active");
      const cid = resolveCompetitionId(payload);
      if (!cid) throw new Error("No active prove campaign found.");
      setCompetitionId(cid);
      return cid;
    } catch (e) {
      toast.error(e?.message || "Unable to load campaign.");
      throw e;
    } finally {
      setLoadingCompetition(false);
    }
  }, []);

  const fetchRewardStructure = useCallback(async (cid) => {
    if (!cid) return;
    try {
      const data = await apiCall(`/prove/${cid}/reward-structure`);
      setRewardStructure(data);
    } catch (e) {
      console.error(e);
    }
  }, []);

  const fetchTodayPortfolio = useCallback(async (cid) => {
    const data = await apiCall(`/prove/${cid}/today-portfolio`);
    const sec =
      typeof data?.nextResetInSeconds === "number"
        ? data.nextResetInSeconds
        : null;
    setResetCountdownSec(sec);
    setTodayEntry(
      data?.portfolio ? mapApiPortfolioToEntry(data.portfolio) : null,
    );
    return data;
  }, []);

  const fetchSubmissions = useCallback(
    async (cid, page = 1, append = false) => {
      const data = await apiCall(
        `/prove/${cid}/my-submissions?page=${page}&limit=20`,
      );
      const rows = (data.submissions || [])
        .map(mapApiPortfolioToEntry)
        .filter(Boolean);
      setSubmissionEntries((prev) => (append ? [...prev, ...rows] : rows));
      setSubmissionsPagination({
        page: data.pagination?.page ?? page,
        pages: Math.max(1, data.pagination?.pages ?? 1),
        total: data.pagination?.total ?? rows.length,
      });
    },
    [],
  );

  const fetchMyStats = useCallback(async (cid) => {
    const data = await apiCall(`/prove/${cid}/my-stats`);
    setMyStats(data);
    return data;
  }, []);

  const refreshCampaignData = useCallback(
    async (cid) => {
      if (!cid || !token) return;
      setLoadingCampaignData(true);
      try {
        await Promise.all([
          fetchTodayPortfolio(cid),
          fetchSubmissions(cid, 1, false),
          fetchMyStats(cid),
          fetchTwitterStatus(),
        ]);
      } catch (e) {
        toast.error(e?.message || "Could not load prove portfolio data.");
      } finally {
        setLoadingCampaignData(false);
      }
    },
    [
      token,
      fetchMyStats,
      fetchSubmissions,
      fetchTodayPortfolio,
      fetchTwitterStatus,
    ],
  );

  useEffect(() => {
    loadCompetition().catch(() => {});
  }, [loadCompetition]);

  useEffect(() => {
    if (!competitionId) return;
    fetchRewardStructure(competitionId);
  }, [competitionId, fetchRewardStructure]);

  useEffect(() => {
    if (!competitionId || !token) return;
    refreshCampaignData(competitionId);
  }, [competitionId, token, refreshCampaignData]);

  useEffect(() => {
    if (!competitionId || !token) return undefined;
    const refreshToday = () => {
      fetchTodayPortfolio(competitionId).catch(() => {});
    };
    const onVis = () => {
      if (document.visibilityState === "visible") refreshToday();
    };
    window.addEventListener("focus", refreshToday);
    document.addEventListener("visibilitychange", onVis);
    return () => {
      window.removeEventListener("focus", refreshToday);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [competitionId, token, fetchTodayPortfolio]);

  useEffect(() => {
    const t = setInterval(() => {
      setResetCountdownSec((prev) => {
        if (prev == null) return prev;
        if (prev <= 0) return 0;
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (resetCountdownSec !== 0) return;
    if (!competitionId || !token) return;
    refreshCampaignData(competitionId);
  }, [resetCountdownSec, competitionId, token, refreshCampaignData]);

  useEffect(() => {
    if (selectedId != null) return;
    const first = effectiveTodayEntry ?? submissionEntries[0];
    if (first) setSelectedId(first.id);
  }, [effectiveTodayEntry, submissionEntries, selectedId]);

  /** API `today` row was suppressed; move selection off the stray portfolio id. */
  useEffect(() => {
    if (effectiveTodayEntry != null) return;
    if (!todayEntry) return;
    if (selectedId !== todayEntry.id) return;
    const fallback =
      submissionEntries.find(
        (e) => entryIsPortfolioUtcToday(e) && entryHasProveTaskSubmission(e),
      ) ?? submissionEntries[0];
    if (fallback) setSelectedId(fallback.id);
  }, [effectiveTodayEntry, todayEntry, selectedId, submissionEntries]);

  useEffect(() => {
    if (!showTierRules) return;

    const handleOutsideClick = (event) => {
      if (!tierRulesRef.current?.contains(event.target)) {
        setShowTierRules(false);
      }
    };

    document.addEventListener("pointerdown", handleOutsideClick);
    return () => {
      document.removeEventListener("pointerdown", handleOutsideClick);
    };
  }, [showTierRules]);

  const handleTaskSubmit = useCallback(
    async (portfolioId, taskNumber, tweetUrl) => {
      if (!competitionId) return;
      try {
        await ensureAuthenticated();
      } catch {
        toast.error("Please sign in to submit.");
        return;
      }
      const strayNewDailyPortfolio =
        todayEntry &&
        String(portfolioId) === String(todayEntry.portfolioId) &&
        submissionEntries.some(
          (e) =>
            e.id !== todayEntry.id &&
            entryIsPortfolioUtcToday(e) &&
            entryHasProveTaskSubmission(e),
        );
      if (strayNewDailyPortfolio) {
        toast.error(
          "Today's prove campaign is already tied to another portfolio you submitted. Use that entry under Your Submissions.",
        );
        return;
      }
      try {
        await apiCall(`/prove/${competitionId}/submit`, {
          method: "POST",
          body: JSON.stringify({ portfolioId, taskNumber, tweetUrl }),
        });
        toast.success("Submitted — pending review.");
        await Promise.all([
          fetchTodayPortfolio(competitionId),
          fetchMyStats(competitionId),
          fetchSubmissions(competitionId, 1, false),
        ]);
      } catch (e) {
        toast.error(mapSubmitProveError(e));
        if (e?.status === 403) {
          setTwitterStatus((prev) => ({ ...prev, linked: false }));
          fetchTwitterStatus().catch(() => {});
        }
      }
    },
    [
      competitionId,
      ensureAuthenticated,
      fetchMyStats,
      fetchSubmissions,
      fetchTodayPortfolio,
      fetchTwitterStatus,
      todayEntry,
      submissionEntries,
    ],
  );

  const loadMoreSubmissions = useCallback(async () => {
    const next = submissionsPagination.page + 1;
    if (!competitionId || !token || next > submissionsPagination.pages) {
      return;
    }
    try {
      await fetchSubmissions(competitionId, next, true);
    } catch (e) {
      toast.error(e?.message || "Could not load more submissions.");
    }
  }, [
    competitionId,
    token,
    fetchSubmissions,
    submissionsPagination.page,
    submissionsPagination.pages,
  ]);

  const hasListRows =
    Boolean(effectiveTodayEntry) || pastSubmissions.length > 0;

  return (
    <div className="space-y-4">
      {/* Hero */}
      <div className="glass-card p-8 bg-gradient-to-br from-purple-500/10 via-indigo-500/5 to-blue-500/10 border-purple-300/30">
        <div className="flex flex-col md:flex-row items-start justify-between gap-6">
          <div className="flex-1">
            <h1 className="text-4xl font-bold text-gray-900 mb-2">
              Prove Your Portfolio
            </h1>
            <p className="text-gray-600 max-w-2xl text-sm leading-relaxed mb-6">
              Create portfolios, share your cards on X, and earn rewards. One
              portfolio per day with two tasks per portfolio.
            </p>

            <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-0.5">
              Your Total Earned
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-lg font-bold text-gray-900 tabular-nums">
                $
                {totalEarnedUsd.toLocaleString("en-US", {
                  maximumFractionDigits: 2,
                })}
              </span>
              {gemsPending > 0 && (
                <span className="text-xs text-amber-700">
                  {gemsPending} gems in review
                </span>
              )}
            </div>
            {token && myStats && (
              <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-gray-500">
                <span>Pending: {myStats.pending ?? 0}</span>
                <span>·</span>
                <span>Approved: {myStats.approved ?? 0}</span>
                <span>·</span>
                <span>Rejected: {myStats.rejected ?? 0}</span>
              </div>
            )}
            {loadingCompetition && (
              <p className="text-xs text-gray-400 mt-2">Loading campaign…</p>
            )}
          </div>

          <div className="flex flex-col gap-3 h-full items-center my-auto">
            <div className="glass-card px-4 py-3 bg-gradient-to-br from-amber-400/15 to-orange-400/10 border-amber-300/40 min-w-[180px]">
              <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-0.5">
                Total Pool
              </div>
              <div className="flex items-center ">
                <span className="text-xl font-bold text-gray-600 tabular-nums">
                  $
                  {Number(totalPoolUsd).toLocaleString("en-US", {
                    maximumFractionDigits: 0,
                  })}
                </span>
                (
                <Gem className="w-4 h-4 text-purple-600" />
                <span className="text-base font-bold text-gray-600 tabular-nums me-1">
                  {Number(totalPoolGems).toLocaleString("en-US", {
                    maximumFractionDigits: 0,
                  })}
                </span>
                )
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* How It Works & Reward Structure */}
      <div className="flex flex-col lg:flex-row items-start lg:items-stretch gap-6">
        {/* How It Works */}
        <div className="glass-card p-6 w-full lg:w-1/2">
          <div className="flex justify-between mb-4">
            <div className="flex items-center gap-2 ">
              <h2 className="text-lg font-bold text-gray-900">How It Works</h2>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 hidden lg:flex bg-green-100 text-green-700 text-[10px] font-bold rounded-full uppercase tracking-wider">
                Guaranteed Rewards
              </span>

              <button
                type="button"
                onClick={() => setShowMoreDetails(true)}
                className="glass-card px-3 py-2 hover:bg-gray-50 transition-colors flex items-center gap-2 text-xs whitespace-nowrap"
              >
                <Info size={14} className="text-blue-600" />
                <span className="font-medium">View Details</span>
              </button>
            </div>
          </div>
          <div className="space-y-4">
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
                <span className="text-sm font-bold text-purple-600">1</span>
              </div>
              <div>
                <div className="font-semibold text-gray-900 text-sm">
                  Create one on-chain portfolio per day
                </div>
                <div className="text-xs text-gray-500 mt-0.5">
                  Minimum $100 investment. Your new portfolio card will be
                  generated automatically.
                </div>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
                <span className="text-sm font-bold text-purple-600">2</span>
              </div>
              <div>
                <div className="font-semibold text-gray-900 text-sm">
                  Task 1: Share your new portfolio card
                </div>
                <div className="text-xs text-gray-500 mt-0.5">
                  Post the card on X and submit the link for guaranteed rewards.
                </div>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
                <span className="text-sm font-bold text-purple-600">3</span>
              </div>
              <div>
                <div className="font-semibold text-gray-900 text-sm">
                  Task 2: Share performance card
                </div>
                <div className="text-xs text-gray-500 mt-0.5">
                  If your portfolio performs +5% or more, Task 2 activates.
                  Note: Selling disables this task.
                </div>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
                <span className="text-sm font-bold text-purple-600">4</span>
              </div>
              <div>
                <div className="font-semibold text-gray-900 text-sm">
                  Verification process
                </div>
                <div className="text-xs text-gray-500 mt-0.5">
                  Each submitted task is verified by our team. Track status:
                  Pending, Approved, or Rejected.
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Reward Structure */}
        <div className="glass-card p-6 w-full lg:w-1/2">
          <div className="flex items-center justify-between gap-2 mb-4">
            <h2 className="text-lg font-bold text-gray-900">
              Reward Structure
            </h2>
            <div ref={tierRulesRef} className="group relative">
              <button
                type="button"
                onClick={() => setShowTierRules((v) => !v)}
                className="flex items-center justify-center"
                aria-label="Show tier rules"
                aria-expanded={showTierRules}
              >
                <Info className="w-4 h-4 text-gray-400 cursor-help" />
              </button>

              <div className="hidden lg:group-hover:block absolute right-0 top-6 z-10 w-72 p-3 bg-gray-900 text-white text-xs rounded-lg shadow-xl">
                <div className="font-semibold mb-1">Tier Rules:</div>
                <ul className="space-y-1 list-disc list-inside">
                  <li>Minimum portfolio amount: $100</li>
                  <li>Portfolios under $100 won&apos;t be shown</li>
                  <li>
                    Amounts within a range get the same rewards (e.g., $100-$499
                    all earn $10 total)
                  </li>
                  <li>Same applies to all tier ranges</li>
                </ul>
              </div>

              {showTierRules && (
                <div className="lg:hidden absolute right-0 top-6 z-10 w-72 p-3 bg-gray-900 text-white text-xs rounded-lg shadow-xl">
                  <div className="font-semibold mb-1">Tier Rules:</div>
                  <ul className="space-y-1 list-disc list-inside">
                    <li>Minimum portfolio amount: $100</li>
                    <li>Portfolios under $100 won&apos;t be shown</li>
                    <li>
                      Amounts within a range get the same rewards (e.g.,
                      $100-$499 all earn $10 total)
                    </li>
                    <li>Same applies to all tier ranges</li>
                  </ul>
                </div>
              )}
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left text-xs font-bold text-gray-500 uppercase tracking-wider pb-0 lg:pb-3 pr-0 lg:pr-3">
                    Investment
                  </th>
                  <th className="text-right text-xs font-bold text-gray-500 uppercase tracking-wider pb-0 lg:pb-3 px-0 lg:px-3">
                    Task 1<br />
                  </th>
                  <th className="text-right text-xs font-bold text-gray-500 uppercase tracking-wider pb-0 lg:pb-3 px-0 lg:px-3">
                    Task 2<br />
                  </th>
                  <th className="text-right text-xs font-bold text-gray-500 uppercase tracking-wider pb-0 lg:pb-3 pl-0 lg:pl-3">
                    Rewards
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {rewardTableRows.map((tier) => (
                  <tr key={tier.key}>
                    <td className="py-3 text-sm font-semibold text-gray-900 pr-3">
                      ${Number(tier.amount).toLocaleString()}
                    </td>
                    <td className="py-3 text-right text-sm font-semibold text-gray-900 px-3">
                      ${Number(tier.task1).toLocaleString()}
                    </td>
                    <td className="py-3 text-right text-sm font-semibold text-gray-900 px-3">
                      ${Number(tier.task2).toLocaleString()}
                    </td>
                    <td className="py-3 text-right text-sm font-bold text-gray-900 pl-3">
                      ${Number(tier.maxReward).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {!isWalletConnected ? (
        <div className="glass-card p-12 flex flex-col items-center justify-center text-center">
          <Wallet className="w-12 h-12 text-gray-300 mb-4" />
          <h3 className="font-bold text-gray-900 text-lg mb-2">
            Connect your wallet to participate
          </h3>
          <p className="text-sm text-gray-500 mb-6 max-w-sm">
            Your portfolios and task progress will appear here once connected.
          </p>
          <button
            type="button"
            onClick={() => dispatch(setWalletModal(true))}
            className="btn-primary px-8 py-3"
          >
            Connect Wallet
          </button>
        </div>
      ) : !token ? (
        <div className="glass-card p-12 flex flex-col items-center justify-center text-center">
          <Wallet className="w-12 h-12 text-gray-300 mb-4" />
          <h3 className="font-bold text-gray-900 text-lg mb-2">
            Sign in to load your portfolios
          </h3>
          <p className="text-sm text-gray-500 mb-6 max-w-sm">
            Verify your wallet to see today&apos;s portfolio, submissions, and
            rewards.
          </p>
          <button
            type="button"
            onClick={() => {
              ensureAuthenticated().catch(() => {
                toast.error("Please complete wallet sign-in.");
              });
            }}
            className="btn-primary px-8 py-3"
          >
            Sign in
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-0  lg:gap-4 items-start">
          <div className="glass-card flex flex-col col-span-2 h-full">
            <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-gray-100 flex-shrink-0">
              <h2 className="text-lg font-bold text-gray-900">
                Your Portfolios
              </h2>
              <button
                type="button"
                onClick={() => {
                  goToPortfolio();
                }}
                className="btn-primary px-6 py-3 flex items-center gap-2"
              >
                <PlusCircle className="w-4 h-4" />
                <span className="hidden lg:flex">Create Your Portfolio</span>
              </button>
            </div>

            {loadingCampaignData && !hasListRows ? (
              <div className="flex flex-col items-center justify-center p-12 text-sm text-gray-500">
                Loading your campaign data…
              </div>
            ) : !hasListRows ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-10">
                <div className="w-16 h-12 rounded-2xl bg-gradient-to-br from-purple-100 to-indigo-100 flex items-center justify-center mb-4">
                  <PlusCircle className="w-8 h-8 text-purple-400" />
                </div>
                <h3 className="font-bold text-gray-800 text-base mb-1">
                  No qualifying portfolio today
                </h3>
                <p className="text-sm text-gray-400 mb-6 max-w-xs">
                  Create an on-chain portfolio ($100+) to appear here. Past
                  submissions show below once you start.
                </p>
              </div>
            ) : (
              <>
                <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4 scrollbar-thin scrollbar-thumb-gray-200 scrollbar-track-transparent max-h-[400px]">
                  {twitterStatus != null && !twitterStatus.linked && (
                    <div className="rounded-xl border border-amber-200 bg-amber-50/90 px-3 py-2.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                      <p className="text-xs text-amber-900">
                        Link your X account to submit tweet links for this
                        campaign.
                      </p>
                      <button
                        type="button"
                        onClick={startTwitterLinkFlow}
                        disabled={twitterLinkLoading || hasRelinkCooldown}
                        className="shrink-0 px-3 py-1.5 rounded-lg bg-amber-900 text-white text-xs font-semibold disabled:opacity-60"
                      >
                        {hasRelinkCooldown ? "Cooldown" : "Link X"}
                      </button>
                    </div>
                  )}
                  <div>
                    <div className="mb-2 px-1">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider">
                          Daily Portfolio
                        </h3>
                        {countdownParts.active ? (
                          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 border border-amber-200 rounded-lg">
                            <Clock className="w-3 h-3 text-amber-600" />
                            <span className="text-xs font-semibold text-amber-700 tabular-nums">
                              Next in{" "}
                              {String(countdownParts.hours).padStart(2, "0")}:
                              {String(countdownParts.minutes).padStart(2, "0")}:
                              {String(countdownParts.seconds).padStart(2, "0")}
                            </span>
                          </div>
                        ) : dailyProveSlotConsumedToday ? (
                          <span className="text-xs font-semibold text-amber-800 px-2.5 py-1 bg-amber-50 border border-amber-200 rounded-lg">
                            Daily entry complete
                          </span>
                        ) : (
                          <span className="text-xs font-semibold text-green-600 px-2.5 py-1 bg-green-50 border border-green-200 rounded-lg">
                            Ready to create!
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-gray-500">
                        Your most recent qualifying on-chain portfolio from
                        today (UTC). One portfolio per day for this campaign
                        after your first task submission.
                      </p>
                    </div>
                    {effectiveTodayEntry ? (
                      <PortfolioRow
                        key={effectiveTodayEntry.id}
                        entry={effectiveTodayEntry}
                        isSelected={selectedId === effectiveTodayEntry.id}
                        onSelect={() => setSelectedId(effectiveTodayEntry.id)}
                        onTaskSubmit={(task, link) =>
                          handleTaskSubmit(
                            effectiveTodayEntry.portfolioId,
                            task,
                            link,
                          )
                        }
                        twitterLinked={twitterLinked}
                        onLinkX={startTwitterLinkFlow}
                        twitterLinkLoading={twitterLinkLoading}
                        hasRelinkCooldown={hasRelinkCooldown}
                        relinkCountdownTarget={relinkCountdownTarget}
                      />
                    ) : dailyProveSlotConsumedToday ? (
                      <div className="rounded-2xl border border-amber-100 bg-amber-50/50 px-4 py-5 text-left space-y-2">
                        <p className="text-sm font-semibold text-amber-950">
                          Today&apos;s prove portfolio is already set
                        </p>
                        <p className="text-xs text-amber-900/90 leading-relaxed">
                          After you submit at least one task, only that
                          portfolio counts for this day. If you build another
                          portfolio, it will not show in Daily Portfolio until
                          the next day. Open{" "}
                          <span className="font-semibold">
                            Your Submissions
                          </span>{" "}
                          below to keep working on tasks or review your card.
                        </p>
                      </div>
                    ) : (
                      <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50/50 px-4 py-6 text-center text-sm text-gray-500">
                        No portfolio for this campaign day yet. Create one
                        before UTC midnight.
                      </div>
                    )}
                  </div>

                  {pastSubmissions.length > 0 && (
                    <div>
                      <div className="flex items-center justify-between mb-2 px-1">
                        <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider">
                          Your Submissions
                        </h3>
                        <span className="text-xs text-gray-400">
                          {submissionsPagination.total} submission
                          {submissionsPagination.total !== 1 ? "s" : ""}
                        </span>
                      </div>
                      <div className="space-y-2">
                        {pastSubmissions.map((entry) => (
                          <PortfolioRow
                            key={entry.id}
                            entry={entry}
                            isSelected={selectedId === entry.id}
                            onSelect={() => setSelectedId(entry.id)}
                            onTaskSubmit={(task, link) =>
                              handleTaskSubmit(entry.portfolioId, task, link)
                            }
                            twitterLinked={twitterLinked}
                            onLinkX={startTwitterLinkFlow}
                            twitterLinkLoading={twitterLinkLoading}
                            hasRelinkCooldown={hasRelinkCooldown}
                            relinkCountdownTarget={relinkCountdownTarget}
                          />
                        ))}
                      </div>
                      {submissionsPagination.page <
                        submissionsPagination.pages && (
                        <button
                          type="button"
                          onClick={loadMoreSubmissions}
                          className="mt-3 w-full py-2 text-sm font-semibold text-purple-700 border border-purple-200 rounded-xl hover:bg-purple-50/60"
                        >
                          Load more
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          <div className="lg:sticky lg:top-6 mt-4 lg:mt-0">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-900">
                Card Generator
              </h2>
              {selectedEntry && (
                <span
                  className={`text-xs font-semibold px-2 py-1 rounded-full ${
                    selectedEntry.cardType === "positive-performer"
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-purple-100 text-purple-700"
                  }`}
                >
                  {selectedEntry.cardType === "positive-performer"
                    ? "Positive Performer"
                    : "New Portfolio"}
                </span>
              )}
            </div>
            <CardPreview
              entry={selectedEntry}
              twitterStatus={twitterStatus}
              onLinkX={startTwitterLinkFlow}
              twitterLinkLoading={twitterLinkLoading}
              hasRelinkCooldown={hasRelinkCooldown}
              relinkCountdownTarget={relinkCountdownTarget}
            />
          </div>
        </div>
      )}

      <AnimatePresence>
        {showMoreDetails && (
          <MoreDetailsModal
            isOpen={showMoreDetails}
            onClose={() => setShowMoreDetails(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
