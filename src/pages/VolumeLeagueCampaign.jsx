import { useState } from "react";
import {
  Gem,
  TrendingUp,
  Users,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Crown,
  Medal,
  Award,
  Info,
  X,
  Lock,
  BarChart2,
  Wallet,
  PieChart,
  FileText,
  HelpCircle,
  BookOpen,
  Plus,
  Check,
} from "lucide-react";
import { Link } from "react-router";

const TIERS = [
  {
    label: "Diamond",
    ranks: "Top 10",
    rankRange: [1, 10],
    volThreshold: 100_000,
    bonus: 1_000,
    slots: 10,
    budgetPerWeek: 10_000,
    color: "from-cyan-400 to-blue-500",
    bg: "bg-cyan-50",
    border: "border-cyan-300",
    text: "text-cyan-800",
    badge: "bg-cyan-100 text-cyan-700",
    iconColor: "text-cyan-600",
  },
  {
    label: "Gold",
    ranks: "Rank 11–30",
    rankRange: [11, 30],
    volThreshold: 50_000,
    bonus: 500,
    slots: 20,
    budgetPerWeek: 10_000,
    color: "from-yellow-400 to-amber-500",
    bg: "bg-yellow-50",
    border: "border-yellow-300",
    text: "text-yellow-800",
    badge: "bg-yellow-100 text-yellow-700",
    iconColor: "text-yellow-600",
  },
  {
    label: "Silver",
    ranks: "Rank 31–70",
    rankRange: [31, 70],
    volThreshold: 25_000,
    bonus: 150,
    slots: 40,
    budgetPerWeek: 6_000,
    color: "from-gray-400 to-gray-500",
    bg: "bg-gray-50",
    border: "border-gray-200",
    text: "text-gray-700",
    badge: "bg-gray-200 text-gray-700",
    iconColor: "text-gray-500",
  },
  {
    label: "Bronze",
    ranks: "Rank 71–150",
    rankRange: [71, 150],
    volThreshold: 5_000,
    bonus: 50,
    slots: 80,
    budgetPerWeek: 4_000,
    color: "from-amber-700 to-amber-600",
    bg: "bg-amber-50",
    border: "border-amber-200",
    text: "text-amber-800",
    badge: "bg-amber-100 text-amber-700",
    iconColor: "text-amber-600",
  },
];
const WEEKS = [
  { week: 1, dateRange: "Jun 15 – Jun 21", status: "live" },
  { week: 2, dateRange: "Jun 22 – Jun 28", status: "upcoming" },
  { week: 3, dateRange: "Jun 29 – Jul 5", status: "upcoming" },
  { week: 4, dateRange: "Jul 6 – Jul 12", status: "upcoming" },
  { week: 5, dateRange: "Jul 13 – Jul 15", status: "upcoming" },
];

const faqs = [
  { q: "Who qualifies for the base pool?", a: "Every user who trades any amount that week earns a share of the $70K weekly base pool. There is no minimum volume to participate in the base pool, if you trade, you earn." },
  { q: "How is my base pool share calculated?", a: "Your share is proportional to your √(volume) relative to all participants. For example, if your √(volume) is 100 and the sum of all √(volume) across all users is 10,000, you receive 1% of the $70K base pool = $700. This square-root weighting means large traders don't dominate smaller ones." },
  { q: "How do tier bonuses work?", a: "The top 150 ranked users each week are assigned a tier by rank position: top 10 = Diamond, 11–30 = Gold, 31–70 = Silver, 71–150 = Bronze. Each tier has a volume threshold you must hit to unlock your one-time bonus for that week." },
  { q: "What are the tier volume thresholds?", a: "Diamond (top 10): $100K | Gold (rank 11–30): $50K | Silver (rank 31–70): $25K | Bronze (rank 71–150): $5K. If you are ranked in the top 150 but haven't hit your tier's threshold, your bonus shows as locked on the leaderboard." },
  { q: "What happens to locked bonuses?", a: "Locked bonuses are not paid out." },
  { q: "Can I earn a tier bonus multiple times per week?", a: "No. The tier bonus is a one-time reward per user per week. Exceeding your tier threshold multiple times does not multiply the bonus." },
  { q: "How are rankings determined?", a: "Users are ranked weekly by √(volume) from highest to lowest. Rankings and pool shares reset every Monday at 00:00 UTC." },
  { q: "What is the total prize pool?", a: "The total campaign prize is $500K across 5 weeks ($100K/week). Each week: $70K base pool (distributed to all traders) + $30K tier bonus budget (Diamond $10K, Gold $10K, Silver $6K, Bronze $4K)." },
  { q: "Can I participate with multiple wallets?", a: "No. Each user may only participate with one verified Binance Wallet. Using multiple wallets will result in permanent disqualification from all tiers and forfeiture of base pool earnings." },
];
function getTierByRank(rank) {
  return (
    TIERS.find((t) => rank >= t.rankRange[0] && rank <= t.rankRange[1]) ?? null
  );
}

function fmt(n) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n}`;
}

function sqrtShare(vol) {
  return Math.sqrt(vol);
}

// Generate mock leaderboard
function generateLeaderboard(weekSeed) {
  const effectiveWeekSeed = ((weekSeed - 1) % 5) + 1;
  const rows = Array.from({ length: 25 }, (_, i) => {
    const rank = i + 1;
    const vol = Math.max(
      2_000,
      420_000 - rank * 15_000 + effectiveWeekSeed * 900 + (i % 4) * 3_000,
    );
    const tier = getTierByRank(rank);
    const unlocked = tier ? vol >= tier.volThreshold : false;
    const portfolios = Math.max(1, 20 - i + (weekSeed % 3));
    return { rank, vol, tier, unlocked, portfolios, sqrtVol: sqrtShare(vol) };
  });
  const totalSqrt = rows.reduce((s, r) => s + r.sqrtVol, 0);
  return rows.map((r) => ({
    ...r,
    baseShare: (r.sqrtVol / totalSqrt) * 70_000,
  }));
}

function PositionIcon({ rank }) {
  if (rank === 1) return <Crown size={16} className="text-yellow-500" />;
  if (rank === 2) return <Medal size={16} className="text-gray-400" />;
  if (rank === 3) return <Award size={16} className="text-amber-600" />;
  return <span className="text-gray-500 text-sm font-semibold">{rank}</span>;
}

function FAQItem({ q, a }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-gray-200/60 rounded-2xl overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50 transition-colors"
      >
        <span className="font-semibold text-gray-900 pr-4 text-sm">{q}</span>
        <svg
          width="16"
          height="16"
          viewBox="0 0 20 20"
          fill="none"
          className={`flex-shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
        >
          <path
            d="M5 7.5L10 12.5L15 7.5"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
      {open && (
        <div className="px-4 pb-4 text-gray-700 text-sm leading-relaxed border-t border-gray-100 pt-3">
          {a}
        </div>
      )}
    </div>
  );
}

export function VolumeLeagueCampaign() {
  const [selectedWeek, setSelectedWeek] = useState(0);
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [showFAQModal, setShowFAQModal] = useState(false);
  const [showBonusModal, setShowBonusModal] = useState(false);
  const showWeekNotStartedPlaceholder = selectedWeek >= 1;
  const selectedWeekStatus = WEEKS[selectedWeek].status;

  const leaderboard = generateLeaderboard(selectedWeek + 1);

  console.log(leaderboard, "lb");

  // Mock current user
  const currentUser = {
    rank: 47,
    address: "0x7a8c...4f2e",
    portfolios: 8,
    totalVolume: 34_200,
    thisWeekVol: 28_500,
    tier: getTierByRank(47), // Silver
    unlocked: true,
    sqrtVol: sqrtShare(28_500),
  };
  const totalSqrt =
    leaderboard.reduce((s, r) => s + r.sqrtVol, 0) + currentUser.sqrtVol;
  const currentUserBaseShare = (currentUser.sqrtVol / totalSqrt) * 70_000;
  const currentUserBonusAmt =
    currentUser.tier && currentUser.unlocked ? currentUser.tier.bonus : 0;
  const currentUserWeeklyRewardUsd = currentUserBaseShare + currentUserBonusAmt;
  currentUser.estimatedGems = Math.floor(currentUserWeeklyRewardUsd / 5);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-3xl font-bold text-gray-900">Volume League</h2>
            <button onClick={() => setShowInfoModal(true)}>
              <Info size={17} className="text-gray-600" />
            </button>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="glass-card px-4 py-2 bg-gradient-to-r from-blue-500/20 to-indigo-600/20 border-blue-400/40">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-blue-600" />
                <div>
                  <div className="text-xs text-gray-500">Total Prize Pool</div>
                  <div className="font-bold text-gray-900">$500,000</div>
                </div>
              </div>
            </div>
            <div className="glass-card px-4 py-2">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-gray-500" />
                <div>
                  <div className="text-xs text-gray-500">Weekly Pool</div>
                  <div className="font-bold text-gray-900">$100K / week</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Your Position */}
      <div className="glass-card p-6 bg-gradient-to-br from-cyan-50/60 to-blue-50/60 border-cyan-200/50">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 mb-4">
          <div className="flex items-center gap-2 ">
            <div className="w-8 h-8 bg-cyan-600 rounded-lg flex items-center justify-center">
              <TrendingUp size={16} className="text-white" />
            </div>
            <h3 className="font-bold text-gray-900">Your Position</h3>
            <span
              className={` inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold ${currentUser.tier.badge}`}
            >
              <div
                className={`w-1.5 h-1.5 rounded-full bg-gradient-to-br ${currentUser.tier.color}`}
              />
              {currentUser.tier.label} Tier
            </span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowBonusModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
            >
              <Award className="w-4 h-4" />
              Bonuses
            </button>
            <button
              onClick={() => setShowTermsModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
            >
              <FileText className="w-4 h-4" />
              Terms
            </button>
            <button
              onClick={() => setShowFAQModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
            >
              <BookOpen className="w-3.5 h-3.5" />
              FAQs
            </button>
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-white/70 rounded-xl p-3 text-center">
            <div className="flex items-center justify-center mb-1">
              <Crown size={14} className="text-yellow-500" />
            </div>
            <div className="text-2xl font-bold text-gray-900">
              #{currentUser.rank}
            </div>
            <div className="text-xs text-gray-500 mt-0.5">Rank</div>
          </div>
          <div className="bg-white/70 rounded-xl p-3 text-center">
            <div className="flex items-center justify-center mb-1">
              <PieChart size={14} className="text-blue-500" />
            </div>
            <div className="text-2xl font-bold text-gray-900">
              {currentUser.portfolios}
            </div>
            <div className="text-xs text-gray-500 mt-0.5">
              Portfolios Created
            </div>
          </div>
          <div className="bg-white/70 rounded-xl p-3 text-center">
            <div className="flex items-center justify-center mb-1">
              <Wallet size={14} className="text-green-500" />
            </div>
            <div className="text-2xl font-bold text-gray-900">
              {fmt(currentUser.totalVolume)}
            </div>
            <div className="text-xs text-gray-500 mt-0.5">Total Volume</div>
          </div>
          <div className="bg-white/70 rounded-xl p-3 text-center">
            <div className="flex items-center justify-center mb-1">
              <BarChart2 size={14} className="text-cyan-500" />
            </div>
            <div className="text-2xl font-bold text-gray-900">
              {fmt(currentUser.thisWeekVol)}
            </div>
            <div className="text-xs text-gray-500 mt-0.5">
              This Week's Volume
            </div>
          </div>
        </div>

        <div className="mt-4 flex flex-col md:flex-row gap-2 items-center justify-center p-3 bg-white/60 rounded-xl">
          
          <Link
            to={"/"}
            className="btn-primary  flex items-center justify-center gap-2 text-sm"
          >
            <Plus size={16} />
            Create Portfolio
          </Link>
        </div>
        <p className="text-xs text-gray-400 mt-2">
          * Rank and estimated gems update daily. Final distribution confirmed
          after each week closes.
        </p>
      </div>

          <div className="grid sm:grid-cols-2 gap-3">
          {/* This week's earnings */}
          <div className="glass-card p-5 border-blue-200/50 bg-gradient-to-br from-blue-50/40 to-indigo-50/40">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 bg-blue-100 rounded-lg flex items-center justify-center">
                <Calendar size={14} className="text-blue-600" />
              </div>
              <span className="font-bold text-gray-900 text-sm">This Week's Earnings</span>
            </div>
            <div className="space-y-3">
              <div>
                <div className="text-xs text-gray-500 mb-0.5">Base Pool Share</div>
                <div className="text-2xl font-bold text-gray-900">${currentUserBaseShare.toFixed(0)}</div>
                <div className="text-xs text-gray-400 mt-0.5">√{currentUser.thisWeekVol.toFixed(0)} = {currentUser.sqrtVol.toFixed(1)} weight</div>
              </div>
              <div className={`flex items-center justify-between p-2.5 rounded-xl border ${currentUser.unlocked ? "bg-green-50 border-green-200/60" : "bg-gray-50 border-gray-200/60"}`}>
                <div>
                  <div className="text-xs text-gray-500 mb-0.5">Tier Bonus</div>
                  <div className="font-bold text-gray-900">${currentUser.tier?.bonus.toLocaleString()}</div>
                  {!currentUser.unlocked && currentUser.tier && (
                    <div className="text-xs text-gray-400 mt-0.5">Need {fmt(currentUser.tier.volThreshold - currentUser.thisWeekVol)} more</div>
                  )}
                </div>
                <span className={`flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-lg ${currentUser.unlocked ? "bg-green-100 text-green-700" : "bg-gray-200 text-gray-500"}`}>
                  {currentUser.unlocked ? <Check size={12} /> : <Lock size={12} />}
                  {currentUser.unlocked ? "Unlocked" : "Locked"}
                </span>
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-gray-200/60">
                <span className="text-xs font-semibold text-gray-600">Week Total</span>
                <span className="font-bold text-gray-900">
                  ${(currentUserBaseShare + (currentUser.unlocked ? (currentUser.tier?.bonus ?? 0) : 0)).toFixed(0)}
                  {!currentUser.unlocked && <span className="text-xs text-gray-400 font-normal"> (bonus locked)</span>}
                </span>
              </div>
            </div>
          </div>

          {/* Total campaign earnings */}
          <div className="glass-card p-5 border-purple-200/50 bg-gradient-to-br from-purple-50/40 to-pink-50/40">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 bg-purple-100 rounded-lg flex items-center justify-center">
                <Gem size={14} className="text-purple-600" />
              </div>
              <span className="font-bold text-gray-900 text-sm">Total Campaign Earnings</span>
            </div>
            <div className="space-y-3">
              <div>
                <div className="text-xs text-gray-500 mb-0.5">Accumulated so far</div>
                <div className="text-2xl font-bold text-gray-900">$0</div>
                <div className="text-xs text-gray-400 mt-0.5">Across {WEEKS.length} weeks · resets weekly</div>
              </div>
              <div className="space-y-1.5">
                {WEEKS.map((w, i) => (
                  <div key={w.week} className="flex items-center gap-2">
                    <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${i < selectedWeek ? "bg-green-400" : i === selectedWeek ? "bg-blue-400" : "bg-gray-200"}`} />
                    <span className="text-xs text-gray-500 flex-1">Wk {w.week} · {w.dateRange}</span>
                    <span className="text-xs font-semibold text-gray-400">—</span>
                  </div>
                ))}
              </div>
            </div>
            <p className="text-xs text-gray-400 mt-3">Earnings confirmed after each week closes.</p>
          </div>
        </div>


      {/* Weekly Leaderboard */}
      <div className="glass-card p-6">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <Calendar size={18} className="text-gray-600" />
            <h3 className="font-bold text-gray-900">Weekly Leaderboard</h3>
          </div>
          <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1">
            <button
              onClick={() => setSelectedWeek((w) => Math.max(0, w - 1))}
              disabled={selectedWeek === 0}
              className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-white disabled:opacity-30 transition-all"
            >
              <ChevronLeft size={16} />
            </button>
            <div className="md:hidden min-w-[72px] px-3 py-1.5 text-center text-xs font-semibold text-gray-700">
              Wk {WEEKS[selectedWeek].week}
            </div>
            <div className="hidden md:flex items-center gap-1">
              {WEEKS.map((w, i) => (
                <button
                  key={w.week}
                  onClick={() => setSelectedWeek(i)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${selectedWeek === i ? "bg-black text-white" : "text-gray-600 hover:bg-white"}`}
                >
                  Wk {w.week}
                </button>
              ))}
            </div>
            <button
              onClick={() =>
                setSelectedWeek((w) => Math.min(WEEKS.length - 1, w + 1))
              }
              disabled={selectedWeek === WEEKS.length - 1}
              className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-white disabled:opacity-30 transition-all"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>

        <div className="text-xs text-gray-500 mb-4 flex items-center gap-1.5">
          <Calendar size={12} /> {WEEKS[selectedWeek].dateRange}
          <span
            className={`ml-1 px-2 py-0.5 rounded-full capitalize ${
              selectedWeekStatus === "live"
                ? "bg-green-100 text-green-700"
                : "bg-gray-100 text-gray-500"
            }`}
          >
            {selectedWeekStatus}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-2.5 px-2 text-gray-500 font-semibold text-xs">
                  #
                </th>
                <th className="text-left py-2.5 px-2 text-gray-500 font-semibold text-xs">
                  Wallet
                </th>
                <th className="text-left py-2.5 px-2 text-gray-500 font-semibold text-xs">
                  Portfolios
                </th>
                <th className="text-left py-2.5 px-2 text-gray-500 font-semibold text-xs">
                  Volume
                </th>
                <th className="text-left py-2.5 px-2 text-gray-500 font-semibold text-xs">
                  Tier
                </th>
                <th className="text-left py-2.5 px-2 text-gray-500 font-semibold text-xs">
                  Base Share
                </th>
                <th className="text-left py-2.5 px-2 text-gray-500 font-semibold text-xs">
                  Bonus
                </th>
                <th className="text-left py-2.5 px-2 text-gray-500 font-semibold text-xs">
                  Total
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {leaderboard.map((row) => {
                const bonusAmt = row.tier && row.unlocked ? row.tier.bonus : 0;
                const total = row.baseShare + bonusAmt;
                const needed =
                  row.tier && !row.unlocked
                    ? row.tier.volThreshold - row.vol
                    : 0;
                return (
                  <tr
                    key={row.rank}
                    className="hover:bg-white/60 transition-colors"
                  >
                    <td className="py-2.5 px-2">
                      <div className="flex items-center justify-center w-5">
                        <PositionIcon rank={row.rank} />
                      </div>
                    </td>
                    <td className="py-2.5 px-2 font-mono text-xs text-gray-700">
                      0x{((row.rank * 0xd3ad) >>> 0).toString(16).slice(0, 4)}
                      ...{((row.rank * 0xbeef) >>> 0).toString(16).slice(0, 4)}
                    </td>
                    <td className="py-2.5 px-2 text-gray-700 font-medium">
                      {row.portfolios}
                    </td>
                    <td className="py-2.5 px-2 font-semibold text-gray-900">
                      {fmt(row.vol)}
                    </td>
                    <td className="py-2.5 px-2">
                      {row.tier ? (
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-bold ${row.tier.badge}`}
                        >
                          <div
                            className={`w-1.5 h-1.5 rounded-full bg-gradient-to-br ${row.tier.color}`}
                          />
                          {row.tier.label}
                        </span>
                      ) : (
                        <span className="text-gray-400 text-xs">—</span>
                      )}
                    </td>
                    <td className="py-2.5 px-2 text-blue-700 font-semibold text-xs">
                      ${row.baseShare.toFixed(0)}
                    </td>
                    <td className="py-2.5 px-2">
                      {row.tier ? (
                        <div className="relative group/tip inline-flex items-center gap-1">
                          <span
                            className={`inline-flex items-center gap-1 text-xs font-bold ${row.unlocked ? "text-green-600" : "text-gray-400"}`}
                          >
                            {row.unlocked ? (
                              <Check size={12} />
                            ) : (
                              <Lock size={12} />
                            )}
                            ${row.tier.bonus.toLocaleString()}
                          </span>
                          {/* Tooltip for locked bonus */}
                          {!row.unlocked && (
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover/tip:flex z-30 pointer-events-none">
                              <div className="bg-gray-900 text-white text-xs rounded-lg px-3 py-2 whitespace-nowrap shadow-xl">
                                <div className="font-semibold mb-0.5">
                                  Bonus locked 🔒
                                </div>
                                <div className="text-gray-300">
                                  Need{" "}
                                  <span className="text-white font-bold">
                                    {fmt(needed)}
                                  </span>{" "}
                                  more to unlock
                                </div>
                                <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900" />
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-400 text-xs">—</span>
                      )}
                    </td>
                    <td className="py-2.5 px-2">
                      <span
                        className={`text-xs font-bold ${row.unlocked && row.tier ? "text-gray-900" : "text-gray-400"}`}
                      >
                        ${total.toFixed(0)}
                        {row.tier && !row.unlocked && (
                          <span className="text-gray-300 font-normal">
                            {" "}
                            (+${row.tier.bonus} locked)
                          </span>
                        )}
                      </span>
                    </td>
                  </tr>
                );
              })}

              {/* Current user row */}
              {(() => {
                const userBonusAmt =
                  currentUser.tier && currentUser.unlocked
                    ? currentUser.tier.bonus
                    : 0;
                const userTotal = currentUserBaseShare + userBonusAmt;
                const userNeeded =
                  currentUser.tier && !currentUser.unlocked
                    ? currentUser.tier.volThreshold - currentUser.thisWeekVol
                    : 0;
                return (
                  <tr className="bg-blue-50/80 border-t-2 border-blue-300">
                    <td className="py-2.5 px-2">
                      <span className="text-blue-700 text-xs font-bold">
                        {currentUser.rank}
                      </span>
                    </td>
                    <td className="py-2.5 px-2 font-mono text-xs text-blue-700 font-semibold">
                      {currentUser.address} (you)
                    </td>
                    <td className="py-2.5 px-2 text-gray-700 font-medium">
                      {currentUser.portfolios}
                    </td>
                    <td className="py-2.5 px-2 font-semibold text-gray-900">
                      {fmt(currentUser.thisWeekVol)}
                    </td>
                    <td className="py-2.5 px-2">
                      {currentUser.tier && (
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-bold ${currentUser.tier.badge}`}
                        >
                          <div
                            className={`w-1.5 h-1.5 rounded-full bg-gradient-to-br ${currentUser.tier.color}`}
                          />
                          {currentUser.tier.label}
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-2 text-blue-700 font-semibold text-xs">
                      ${currentUserBaseShare.toFixed(0)}
                    </td>
                    <td className="py-2.5 px-2">
                      <div className="relative group/tip inline-flex items-center gap-1">
                        <span
                          className={`inline-flex items-center gap-1 text-xs font-bold ${currentUser.unlocked ? "text-green-600" : "text-gray-400"}`}
                        >
                          {currentUser.unlocked ? (
                            <Check size={12} />
                          ) : (
                            <Lock size={12} />
                          )}
                          ${currentUser.tier?.bonus.toLocaleString()}
                        </span>
                        {!currentUser.unlocked && userNeeded > 0 && (
                          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover/tip:flex z-30 pointer-events-none">
                            <div className="bg-gray-900 text-white text-xs rounded-lg px-3 py-2 whitespace-nowrap shadow-xl">
                              <div className="font-semibold mb-0.5">
                                Bonus locked 🔒
                              </div>
                              <div className="text-gray-300">
                                Need{" "}
                                <span className="text-white font-bold">
                                  {fmt(userNeeded)}
                                </span>{" "}
                                more to unlock
                              </div>
                              <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900" />
                            </div>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="py-2.5 px-2">
                      <span
                        className={`text-xs font-bold ${currentUser.unlocked ? "text-gray-900" : "text-gray-400"}`}
                      >
                        ${userTotal.toFixed(0)}
                        {currentUser.tier && !currentUser.unlocked && (
                          <span className="text-gray-300 font-normal">
                            {" "}
                            (+${currentUser.tier.bonus} locked)
                          </span>
                        )}
                      </span>
                    </td>
                  </tr>
                );
              })()}
            </tbody>
          </table>
        </div>
      </div>

      {showBonusModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[82vh] overflow-hidden flex flex-col">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold">Extra Bonuses</h3>
              </div>
              <button
                onClick={() => setShowBonusModal(false)}
                className="w-9 h-9 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center transition-colors"
              >
                <X size={18} />
              </button>
            </div>
            <div className="overflow-y-auto p-6 space-y-5">
              {/* Pool budget overview */}

              {/* Tier breakdown cards */}
              <div className="space-y-3">
                {TIERS.map((tier) => (
                  <div
                    key={tier.label}
                    className={`rounded-2xl p-4 ${tier.bg} border ${tier.border}`}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold mb-1 ${tier.badge}`}
                        >
                          <div
                            className={`w-2 h-2 rounded-full bg-gradient-to-br ${tier.color}`}
                          />
                          {tier.label}
                        </div>
                        <div className={`text-sm font-semibold ${tier.text}`}>
                          {tier.ranks}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-gray-900">
                          ${tier.bonus.toLocaleString()}
                        </div>
                        <div className="text-xs text-gray-500">
                          one-time bonus
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2 pt-3 border-t border-gray-200/60">
                      <div>
                        <div className="text-xs text-gray-500 mb-0.5">
                          Slots
                        </div>
                        <div className="font-semibold text-gray-900 text-sm">
                          {tier.slots}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500 mb-0.5">
                          Volume to unlock
                        </div>
                        <div className="font-semibold text-gray-900 text-sm">
                          {fmt(tier.volThreshold)}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500 mb-0.5">
                          Weekly budget
                        </div>
                        <div className="font-semibold text-gray-900 text-sm">
                          ${tier.budgetPerWeek.toLocaleString()}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── FAQ Modal ── */}
      {showFAQModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold">
                  Frequently Asked Questions
                </h3>
                <p className="text-sm text-gray-500 mt-0.5">Volume League</p>
              </div>
              <button
                onClick={() => setShowFAQModal(false)}
                className="w-9 h-9 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center transition-colors"
              >
                <X size={18} />
              </button>
            </div>
            <div className="overflow-y-auto p-6 space-y-2">
              {faqs.map((faq, i) => (
                <FAQItem key={i} q={faq.q} a={faq.a} />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Terms Modal ── */}
      {showTermsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold">Terms & Conditions</h3>
                <p className="text-sm text-gray-500 mt-0.5">Volume League</p>
              </div>
              <button
                onClick={() => setShowTermsModal(false)}
                className="w-9 h-9 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center transition-colors"
              >
                <X size={18} />
              </button>
            </div>
            <div className="overflow-y-auto p-6 space-y-6">
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Users size={16} className="text-gray-600" />
                  <h4 className="font-bold text-gray-900">Eligibility</h4>
                </div>
                <p className="text-sm text-gray-700 leading-relaxed">
                  All users participating in any active AlloX campaign are
                  eligible for Volume League. This includes participants from
                  the Binance Wallet Campaign, Prove Your Portfolio, Prime
                  Picks, and the Quick Portfolio Builder.
                </p>
              </div>
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <BarChart2 size={16} className="text-gray-600" />
                  <h4 className="font-bold text-gray-900">Base Pool Rules</h4>
                </div>
                <ul className="space-y-2 text-sm text-gray-700">
                  {[
                    "Every user who trades any amount in a given week earns a share of the $70K weekly base pool",
                    "Share is calculated as: √(your volume) ÷ Σ√(all users' volumes) × $70,000",
                    "Rankings and pool shares reset every week at 00:00 UTC on Monday",
                    "Volume from Prime Picks, Quick Portfolio Builder, and Binance Wallet Campaign tasks all count",
                  ].map((item, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-gray-400 mt-1.5 flex-shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Award size={16} className="text-gray-600" />
                  <h4 className="font-bold text-gray-900">Tier Bonus Rules</h4>
                </div>
                <ul className="space-y-2 text-sm text-gray-700">
                  {[
                    "Top 150 users by √(volume) rank each week are assigned a tier: top 10 = Diamond, 11–30 = Gold, 31–70 = Silver, 71–150 = Bronze",
                    "Each tier has a volume threshold that must be hit to unlock the bonus: Diamond $100K, Gold $50K, Silver $25K, Bronze $5K",

                    "Bonus amounts are fixed: Diamond $1,000 · Gold $500 · Silver $150 · Bronze $50",
                  ].map((item, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-gray-400 mt-1.5 flex-shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Lock size={16} className="text-gray-600" />
                  <h4 className="font-bold text-gray-900">General Terms</h4>
                </div>
                <ul className="space-y-2.5 text-sm text-gray-700">
                  {[
                    "Full rewards require total campaign volume to reach $100M. If not met, the reward pool scales proportionally",
                    "Using multiple wallets, wash trading, or any volume manipulation results in permanent disqualification",
                    "AlloX reserves the right to adjust pool sizes, tier thresholds, or campaign duration with reasonable notice",
                    "All rewards are subject to cliff and vesting linearly at ALLOX TGE",
                    "AlloX's decisions on eligibility, disqualification, and distribution are final",
                    "Participants from jurisdictions where participation is prohibited by law are not eligible",
                  ].map((item, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <div className="w-5 h-5 rounded-full border-2 border-gray-300 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <div className="w-1.5 h-1.5 rounded-full bg-gray-400" />
                      </div>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── How It Works Modal ── */}
      {showInfoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full p-6 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-xl font-bold">How Volume League Works</h3>
              <button
                onClick={() => setShowInfoModal(false)}
                className="w-8 h-8 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center transition-colors"
              >
                <X size={16} />
              </button>
            </div>
            <div className="space-y-3 text-sm text-gray-700">
              {[
                {
                  step: 1,
                  text: "Connect your Binance Wallet and generate volume on BNB Chain through AlloX, via Prime Picks, Quick Portfolio Builder, or the Binance Wallet Campaign tasks.",
                },
                {
                  step: 2,
                  text: "Your weekly volume is tracked and assigned to a tier: Bronze ($5K+), Silver ($25K+), Gold ($50K+), or Diamond ($100K+).",
                },
                {
                  step: 3,
                  text: "At the end of each week, gems are distributed among all users in each tier. The higher the tier, the larger the weekly gem pool.",
                },
              ].map(({ step, text }) => (
                <div
                  key={step}
                  className="flex items-start gap-3 bg-gray-50 rounded-xl p-3"
                >
                  <div className="w-6 h-6 bg-black rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-white text-xs font-bold">{step}</span>
                  </div>
                  <p>{text}</p>
                </div>
              ))}
            </div>
            <button
              onClick={() => setShowInfoModal(false)}
              className="w-full mt-5 bg-black text-white font-semibold py-3 rounded-xl hover:bg-gray-800 transition-colors"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
