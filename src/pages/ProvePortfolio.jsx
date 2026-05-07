import {
  Trophy,
  Gem,
  Clock,
  Share2,
  CheckCircle2,
  TrendingUp,
  Wallet,
  Users,
  Sparkles,
  PlusCircle,
  ChevronDown,
  ChevronUp,
  DollarSign,
  Calendar,
  Lock,
  Download,
  Link2,
  Send,
  X as XIcon,
  Info,
} from "lucide-react";
import { useState, useEffect, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import Countdown from "react-countdown";
import { useDispatch, useSelector } from "react-redux";
import { useAuth } from "../hooks/useAuth";
import { setWalletModal } from "../redux/slices/walletSlice";
import { apiCall } from "../utils/api";
import { toast } from "../utils/toast";

import topPerformerBg from "../assets/provePortfolio/v2/topPerformer.webp";
import portfolioSnapshotBg from "../assets/provePortfolio/v2/portfoliosnapshot.webp";
import newPortfolioBg from "../assets/provePortfolio/v2/newportfolio.webp";

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

/* ── Inline link submission field ── */
function LinkField({
  taskNum,
  label,
  hint,
  reward,
  completed,
  savedLink,
  onSubmit,
}) {
  const [open, setOpen] = useState(false);
  const [val, setVal] = useState("");

  const submit = () => {
    const trimmed = val.trim();
    if (!trimmed) return;
    onSubmit(trimmed);
    setVal("");
    setOpen(false);
  };

  return (
    <div
      className={`rounded-xl border transition-colors ${completed ? "border-green-200 bg-green-50/50" : "border-gray-200 bg-white/40"}`}
    >
      <div className="flex items-center justify-between gap-3 px-4 py-3">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div
            className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold ${
              completed
                ? "bg-green-500 text-white"
                : "bg-gray-100 text-gray-500"
            }`}
          >
            {completed ? <CheckCircle2 className="w-4 h-4" /> : taskNum}
          </div>
          <div className="min-w-0">
            <div className="text-sm font-semibold text-gray-800">{label}</div>
            {completed && savedLink ? (
              <a
                href={savedLink}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-blue-500 hover:underline truncate block max-w-[220px]"
              >
                {savedLink}
              </a>
            ) : (
              <div className="text-xs text-gray-400">{hint}</div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-white border border-gray-100 shadow-sm">
            <Gem className="w-3 h-3 text-purple-500" />
            <span className="text-xs font-bold text-gray-800">${reward}</span>
          </div>
          {!completed && (
            <button
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
        </div>
      </div>

      <AnimatePresence initial={false}>
        {open && !completed && (
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
                  <button onClick={() => setVal("")}>
                    <XIcon className="w-3.5 h-3.5 text-gray-300 hover:text-gray-500" />
                  </button>
                )}
              </div>
              <button
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

function PortfolioRow({
  entry,
  isSelected,
  onSelect,
  onTaskSubmit,
}) {
  const [expanded, setExpanded] = useState(isSelected);
  const tier = getRewardTier(entry.amountInvested);
  const allDone = entry.task1Completed && entry.task2Completed;
  const completionPct = (entry.totalEarned / entry.maxReward) * 100;

  // keep expanded in sync when selected from outside
  useEffect(() => { if (isSelected) setExpanded(true); }, [isSelected]);

  return (
    <motion.div
      layout
      onClick={onSelect}
      className={`rounded-2xl border transition-all cursor-pointer ${
        isSelected
          ? 'border-purple-400 bg-purple-50/40 shadow-md'
          : 'border-gray-300 bg-white/30 hover:bg-white/50 hover:border-gray-400'
      }`}
    >
      {/* Summary row */}
      <div className="flex items-center gap-4 px-4 py-3.5">
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-gray-900 text-sm">Total Invested: ${entry.amountInvested.toLocaleString()}</div>
          <div className="text-xs text-gray-500 mt-0.5">{entry.date}</div>
        </div>

        <div className="flex items-center gap-3 flex-shrink-0">
          <div className="text-center">
            {entry.task1Completed ? (
              <CheckCircle2 className="w-5 h-5 text-green-500 mx-auto mb-0.5" />
            ) : (
              <div className="w-5 h-5 rounded-full border-2 border-gray-300 mx-auto mb-0.5" />
            )}
            <div className="text-[10px] text-gray-600">Task 1</div>
            <div className="text-[10px] font-semibold text-[#101828]">${tier.task1}</div>
          </div>

          <div className="text-center">
            {entry.task2Completed ? (
              <CheckCircle2 className="w-5 h-5 text-green-500 mx-auto mb-0.5" />
            ) : (
              <div className="w-5 h-5 rounded-full border-2 border-gray-300 mx-auto mb-0.5" />
            )}
            <div className="text-[10px] text-gray-600">Task 2</div>
            <div className="text-[10px] font-semibold text-[#101828]">${tier.task2}</div>
          </div>

          <button
            onClick={e => { e.stopPropagation(); setExpanded(v => !v); }}
            className="w-6 h-6 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-all ml-2"
          >
            {expanded ? <ChevronUp className="w-3.5 h-3.5 text-gray-400" /> : <ChevronDown className="w-3.5 h-3.5 text-gray-400" />}
          </button>
        </div>
      </div>

      {/* Expanded tasks */}
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-3 border-t border-gray-100/80 pt-3" onClick={e => e.stopPropagation()}>
              {/* Description */}
              <div className="px-3 py-2 bg-blue-50/50 border border-blue-100 rounded-lg">
                <p className="text-xs text-gray-700">
                  Share on X with a card generated and submit the links. The links will be checked each week.
                </p>
              </div>

              {/* Tasks */}
              <div className="space-y-2">
                <LinkField
                  taskNum={1}
                  label="Share your new portfolio card"
                  hint="Post your new portfolio card on X and submit the link"
                  reward={tier.task1}
                  completed={entry.task1Completed}
                  savedLink={entry.task1Link}
                  onSubmit={link => onTaskSubmit(1, link)}
                />

                {(entry.growth ?? 0) >= 5 ? (
                  <LinkField
                    taskNum={2}
                    label="Share your positive performer portfolio"
                    hint="Your portfolio is up +5% or more — post it on X and submit the link"
                    reward={tier.task2}
                    completed={entry.task2Completed}
                    savedLink={entry.task2Link}
                    onSubmit={link => onTaskSubmit(2, link)}
                  />
                ) : (
                  <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50/40 px-4 py-3 flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                      <Lock className="w-3 h-3 text-gray-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-gray-400">Share your positive performer portfolio</div>
                      <div className="text-xs text-gray-400 mt-0.5">Available when your portfolio reaches +5% growth or more</div>
                    </div>
                    <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-white border border-gray-100">
                      <Gem className="w-3 h-3 text-gray-300" />
                      <span className="text-xs font-bold text-gray-300">${tier.task2}</span>
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

function CardPreview({ entry }) {
  const handleShare = () => {
    if (!entry) return;
    const text =
      entry.cardType === "positive-performer"
        ? `My ${entry.portfolioName} portfolio on @AlloX is up +${entry.growth}%! 🚀\n\n#ProveYourPortfolio #AlloX`
        : `Just created ${entry.portfolioName} on @AlloX with $${entry.amountInvested}! 🚀\n\n#ProveYourPortfolio #AlloX`;
    window.open(
      `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`,
      "_blank",
    );
  };

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

  const isPerformer = entry.cardType === "positive-performer";

  return (
    <motion.div
      key={entry.id}
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.2 }}
    >
      <div
        className={`aspect-square w-full rounded-2xl p-7 relative overflow-hidden shadow-2xl ${
          isPerformer
            ? "bg-gradient-to-br from-emerald-900 via-teal-900 to-green-900"
            : "bg-gradient-to-br from-violet-900 via-indigo-900 to-blue-900"
        }`}
      >
        {/* Glow blobs */}
        <div className="absolute inset-0 opacity-25 pointer-events-none">
          <div
            className={`absolute -top-16 -right-16 w-72 h-72 rounded-full blur-3xl ${isPerformer ? "bg-emerald-400" : "bg-violet-400"}`}
          />
          <div
            className={`absolute -bottom-16 -left-16 w-72 h-72 rounded-full blur-3xl ${isPerformer ? "bg-teal-500" : "bg-indigo-500"} opacity-60`}
          />
        </div>
        {/* Grid texture */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,1) 1px, transparent 1px)",
            backgroundSize: "28px 28px",
          }}
        />

        <div className="relative h-full flex flex-col justify-between">
          {/* Top */}
          <div className="flex items-start justify-between">
            <span className="text-white font-bold text-xl tracking-tight">
              AlloX
            </span>
            <span className="px-3 py-1 bg-white/10 backdrop-blur-sm rounded-full text-white text-xs font-bold border border-white/20">
              {isPerformer ? "+10% Performer" : "New Portfolio"}
            </span>
          </div>

          {/* Center stat */}
          <div className="text-center">
            <div className="text-white/60 text-xs uppercase tracking-widest font-semibold mb-3">
              {isPerformer ? "Portfolio Growth" : "Investment Amount"}
            </div>
            <div className="text-7xl font-bold text-white tracking-tight mb-2 leading-none">
              {isPerformer
                ? `+${entry.growth}%`
                : `$${entry.amountInvested.toLocaleString()}`}
            </div>
            <div className="text-white/50 text-sm mt-2">
              {isPerformer
                ? `${entry.portfolioName} · $${entry.amountInvested.toLocaleString()} invested`
                : entry.tokens.join(" · ")}
            </div>
          </div>

          {/* Bottom */}
          <div className="flex items-center justify-between">
            <span className="text-white/40 text-xs font-semibold">
              #ProveYourPortfolio
            </span>
            <span className="text-white/40 text-xs font-mono">
              0x7a8c...4f2e
            </span>
          </div>
        </div>
      </div>

      <div className="flex gap-2 mt-3">
        <button
          onClick={handleShare}
          className="flex-1 btn-primary py-3 flex items-center justify-center gap-2 text-sm"
        >
          <Share2 className="w-4 h-4" />
          Share on X
        </button>
        <button className="px-5 py-3 bg-white/60 backdrop-blur-sm border border-gray-200 rounded-xl text-gray-700 font-semibold hover:bg-white/80 transition-all flex items-center gap-2 text-sm">
          <Download className="w-4 h-4" />
          Save
        </button>
      </div>
    </motion.div>
  );
}

export function ProvePortfolio() {
  const initialPortfolios = [];
  const demoPortfolios = [
    {
      id: "1",
      date: "Today, May 6",
      portfolioName: "Gaming Alpha",
      theme: "Gaming",
      cardType: "new-portfolio",
      amountInvested: 500,
      tokens: ["IMX", "GALA", "AXS", "SAND", "RON"],
      task1Completed: false,
      task2Completed: false,
      totalEarned: 0,
      maxReward: 50,
    },
    {
      id: "p1",
      date: "Today, May 6",
      portfolioName: "AI Narrative",
      theme: "AI & Data",
      cardType: "positive-performer",
      amountInvested: 1000,
      tokens: ["FET", "OCEAN", "AGIX", "NMR"],
      task1Completed: true,
      task2Completed: false,
      totalEarned: 40,
      maxReward: 100,
      growth: 23.4,
      task1Link: "https://x.com/user/status/999888",
    },
    {
      id: "2",
      date: "May 5",
      portfolioName: "RWA Core",
      theme: "Real World Assets",
      cardType: "new-portfolio",
      amountInvested: 1000,
      tokens: ["ONDO", "POLYX", "CFG", "RIO"],
      task1Completed: true,
      task2Completed: true,
      totalEarned: 100,
      maxReward: 100,
      task1Link: "https://x.com/user/status/111111",
      task2Link: "https://x.com/user/status/222222",
    },
    {
      id: "p2",
      date: "May 3",
      portfolioName: "Metaverse Pack",
      theme: "Metaverse",
      cardType: "positive-performer",
      amountInvested: 500,
      tokens: ["SAND", "MANA", "ENJ", "ALICE"],
      task1Completed: false,
      task2Completed: false,
      totalEarned: 0,
      maxReward: 50,
      growth: 6.2,
    },
    {
      id: "3",
      date: "May 4",
      portfolioName: "DeFi Blue Chips",
      theme: "DeFi",
      cardType: "new-portfolio",
      amountInvested: 250,
      tokens: ["UNI", "AAVE", "MKR"],
      task1Completed: false,
      task2Completed: false,
      totalEarned: 0,
      maxReward: 25,
    },
  ];

  const [portfolios, setPortfolios] = useState(initialPortfolios);
  const [selectedId, setSelectedId] = useState(
    initialPortfolios[0]?.id ?? null,
  );
  const [leaderboardOptIn, setLeaderboardOptIn] = useState(true);
  const [isWalletConnected, setIsWalletConnected] = useState(true);

  const handleTaskSubmit = (id, task, link) => {
    setPortfolios((prev) =>
      prev.map((e) => {
        if (e.id !== id) return e;
        const tier = getRewardTier(e.amountInvested);
        return task === 1
          ? {
              ...e,
              task1Completed: true,
              task1Link: link,
              totalEarned: e.totalEarned + tier.task1,
            }
          : {
              ...e,
              task2Completed: true,
              task2Link: link,
              totalEarned: e.totalEarned + tier.task2,
            };
      }),
    );
  };

  const totalUserEarned = portfolios.reduce((s, e) => s + e.totalEarned, 0);
  const completedTasks = portfolios.reduce(
    (s, e) => s + (e.task1Completed ? 1 : 0) + (e.task2Completed ? 1 : 0),
    0,
  );
  const selectedEntry = selectedId
    ? (portfolios.find((p) => p.id === selectedId) ?? null)
    : null;

  return (
    <div className="space-y-4">
      {/* Hero */}
      <div className="glass-card p-8 bg-gradient-to-br from-purple-500/10 via-indigo-500/5 to-blue-500/10 border-purple-300/30">
        <div className="flex items-start justify-between gap-6">
          <div className="flex-1">
            <h1 className="text-4xl font-bold text-gray-900 mb-2">
              Prove Your Portfolio
            </h1>
            <p className="text-gray-600 max-w-2xl text-sm leading-relaxed mb-6">
              Create portfolios, share your cards on X, and earn rewards. One
              portfolio per day with two tasks per portfolio.
            </p>

            {/* Create Portfolio Button */}
            <button
              onClick={() => {
                if (portfolios.length === 0) {
                  setPortfolios(demoPortfolios);
                  setSelectedId(demoPortfolios[0].id);
                }
              }}
              className="btn-primary px-6 py-3 flex items-center gap-2"
            >
              <PlusCircle className="w-4 h-4" />
              Create Your Portfolio
            </button>
          </div>

          {/* Stats on right */}
          <div className="flex flex-col gap-3">
            <div className="glass-card px-4 py-3 bg-gradient-to-br from-amber-400/15 to-orange-400/10 border-amber-300/40 min-w-[180px]">
              <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-0.5">
                Total Pool
              </div>
              <div className="flex items-center gap-1.5">
                <DollarSign className="w-4 h-4 text-amber-600" />
                <span className="text-lg font-bold text-gray-900 tabular-nums">
                  50,000
                </span>
              </div>
            </div>

            <div className="glass-card px-4 py-3 bg-gradient-to-br from-purple-500/8 to-indigo-500/5 border-purple-200/40 min-w-[180px]">
              <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-0.5">
                Your Total Earned
              </div>
              <div className="flex items-center gap-1.5">
                <Trophy className="w-4 h-4 text-purple-600" />
                <span className="text-lg font-bold text-gray-900 tabular-nums">
                  ${totalUserEarned}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* How It Works & Reward Structure */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* How It Works */}
        <div className="glass-card p-6">
          <div className="flex items-center gap-2 mb-4">
            <h2 className="text-lg font-bold text-gray-900">How It Works</h2>
            <div className="group relative">
              <Info className="w-4 h-4 text-gray-400 cursor-help" />
              <div className="hidden group-hover:block absolute left-0 top-6 z-10 w-64 p-3 bg-gray-900 text-white text-xs rounded-lg shadow-xl">
                <div className="font-semibold mb-1">Campaign Rules:</div>
                <ul className="space-y-1 list-disc list-inside">
                  <li>One on-chain portfolio per day</li>
                  <li>Task 1 unlocks when you create a portfolio</li>
                  <li>Task 2 unlocks at +5% performance</li>
                  <li>If you sell the portfolio, Task 2 becomes unavailable</li>
                </ul>
              </div>
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
          </div>
        </div>

        {/* Reward Structure */}
        <div className="glass-card p-6">
          <div className="flex items-center gap-2 mb-4">
            <h2 className="text-lg font-bold text-gray-900">
              Reward Structure
            </h2>
            <div className="group relative">
              <Info className="w-4 h-4 text-gray-400 cursor-help" />
              <div className="hidden group-hover:block absolute left-0 top-6 z-10 w-72 p-3 bg-gray-900 text-white text-xs rounded-lg shadow-xl">
                <div className="font-semibold mb-1">Tier Rules:</div>
                <ul className="space-y-1 list-disc list-inside">
                  <li>Minimum portfolio amount: $100</li>
                  <li>Portfolios under $100 won't be shown</li>
                  <li>
                    Amounts within a range get the same rewards (e.g., $100-$499
                    all earn $10 total)
                  </li>
                  <li>Same applies to all tier ranges</li>
                </ul>
              </div>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left text-xs font-bold text-gray-500 uppercase tracking-wider pb-3 pr-3">
                    Investment
                  </th>
                  <th className="text-right text-xs font-bold text-gray-500 uppercase tracking-wider pb-3 px-3">
                    Task 1<br />
                    (Guaranteed)
                  </th>
                  <th className="text-right text-xs font-bold text-gray-500 uppercase tracking-wider pb-3 px-3">
                    Task 2<br />
                    (Performance)
                  </th>
                  <th className="text-right text-xs font-bold text-gray-500 uppercase tracking-wider pb-3 pl-3">
                    Total
                    <br />
                    Rewards
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {REWARD_TIERS.map((tier) => (
                  <tr key={tier.amount}>
                    <td className="py-3 text-sm font-semibold text-gray-900 pr-3">
                      ${tier.amount.toLocaleString()}
                    </td>
                    <td className="py-3 text-right text-sm font-semibold text-green-600 px-3">
                      ${tier.task1}
                    </td>
                    <td className="py-3 text-right text-sm font-semibold text-blue-600 px-3">
                      ${tier.task2}
                    </td>
                    <td className="py-3 text-right text-sm font-bold text-purple-600 pl-3">
                      ${tier.maxReward}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Main two-column section */}
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
            onClick={() => setIsWalletConnected(true)}
            className="btn-primary px-8 py-3"
          >
            Connect Wallet
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-4 items-start">
          {/* Left: portfolio list */}
          <div className="glass-card flex flex-col col-span-2 h-full">
            <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-gray-100 flex-shrink-0">
              <h2 className="text-lg font-bold text-gray-900">
                Your Portfolios
              </h2>
              {portfolios.length > 0 && (
                <span className="text-xs text-gray-400">
                  {portfolios.length} portfolio
                  {portfolios.length !== 1 ? "s" : ""} this week
                </span>
              )}
            </div>

            {portfolios.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-10">
                <div className="w-16 h-12 rounded-2xl bg-gradient-to-br from-purple-100 to-indigo-100 flex items-center justify-center mb-4">
                  <PlusCircle className="w-8 h-8 text-purple-400" />
                </div>
                <h3 className="font-bold text-gray-800 text-base mb-1">
                  No portfolios yet
                </h3>
                <p className="text-sm text-gray-400 mb-6 max-w-xs">
                  Create your first portfolio to start earning rewards. Share
                  your card on X and complete both tasks each day.
                </p>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2 scrollbar-thin scrollbar-thumb-gray-200 scrollbar-track-transparent max-h-[500px]">
                {portfolios.map((entry) => (
                  <PortfolioRow
                    key={entry.id}
                    entry={entry}
                    isSelected={selectedId === entry.id}
                    onSelect={() => setSelectedId(entry.id)}
                    onTaskSubmit={(task, link) =>
                      handleTaskSubmit(entry.id, task, link)
                    }
                  />
                ))}
              </div>
            )}
          </div>

          {/* Right: card generator */}
          <div className="lg:sticky lg:top-6">
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
            <CardPreview entry={selectedEntry} />
          </div>
        </div>
      )}

      {/* Leaderboard */}
    </div>
  );
}
