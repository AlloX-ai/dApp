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
} from "lucide-react";

const TIERS = [
  {
    label: "Bronze",
    minVolume: 5_000,
    color: "from-amber-700 to-amber-600",
    bg: "bg-amber-50",
    border: "border-amber-200",
    text: "text-amber-800",
    badge: "bg-amber-100 text-amber-700",
    weeklyGems: 50,
    description: "Minimum $5K weekly volume",
  },
  {
    label: "Silver",
    minVolume: 25_000,
    color: "from-gray-400 to-gray-500",
    bg: "bg-gray-50",
    border: "border-gray-300",
    text: "text-gray-700",
    badge: "bg-gray-200 text-gray-700",
    weeklyGems: 200,
    description: "Minimum $25K weekly volume",
  },
  {
    label: "Gold",
    minVolume: 50_000,
    color: "from-yellow-400 to-amber-500",
    bg: "bg-yellow-50",
    border: "border-yellow-300",
    text: "text-yellow-800",
    badge: "bg-yellow-100 text-yellow-700",
    weeklyGems: 500,
    description: "Minimum $50K weekly volume",
  },
  {
    label: "Diamond",
    minVolume: 100_000,
    color: "from-cyan-400 to-blue-500",
    bg: "bg-cyan-50",
    border: "border-cyan-300",
    text: "text-cyan-800",
    badge: "bg-cyan-100 text-cyan-700",
    weeklyGems: 1_500,
    description: "Minimum $100K weekly volume",
  },
];

const WEEKS = [
  { week: 1, dateRange: "Jun 15 – Jun 21", status: "upcoming" },
  { week: 2, dateRange: "Jun 22 – Jun 28", status: "upcoming" },
  { week: 3, dateRange: "Jun 29 – Jul 5", status: "upcoming" },
  { week: 4, dateRange: "Jul 6 – Jul 12", status: "upcoming" },
  { week: 5, dateRange: "Jul 13 – Jul 15", status: "upcoming" },
];

const faqs = [
  {
    q: "Who can participate in Volume League?",
    a: "Any user who generates volume on BNB Chain via AlloX — through the Binance Wallet Campaign tasks, Prime Picks bundles, or the Quick Portfolio Builder. Your wallet must be connected via Binance Wallet.",
  },
  {
    q: "How are tiers determined each week?",
    a: "Your tier is based on your cumulative portfolio volume for that specific week: Bronze requires $5K+, Silver $25K+, Gold $50K+, and Diamond $100K+. You start fresh each week — hitting a higher tier one week doesn't lock you into it the next.",
  },
  {
    q: "How are gems distributed within each tier?",
    a: "Gems are split equally among all users who qualify for that tier during the week. The more users in a tier, the smaller the individual share — so qualifying for a higher tier means a larger personal reward.",
  },
  {
    q: "What happens if total campaign volume doesn't reach $100M?",
    a: "Full rewards require the campaign to collectively reach $100M in total volume. If this threshold isn't met by July 15, the reward pool is scaled proportionally. For example, $50M in total volume would result in 50% of the advertised gem rewards being distributed.",
  },
  {
    q: "When will I receive my gems?",
    a: "Gems earned each week are tracked and accumulated. They are distributed after the campaign ends on July 15, 2026, and vest linearly over 6 months starting at ALLOX TGE. Unclaimed gems after 12 months post-TGE are forfeited.",
  },
  {
    q: "Does volume from multiple products stack?",
    a: "Yes. Volume generated through Binance Wallet Campaign tasks, Prime Picks, and the Quick Portfolio Builder all count toward your weekly total on BNB Chain.",
  },
  {
    q: "Can I participate with multiple wallets?",
    a: "No. Each user may only participate with one verified Binance Wallet. Using multiple wallets will result in disqualification from all tiers.",
  },
  {
    q: "Is there a minimum to participate?",
    a: "You must generate at least $5,000 in portfolio volume in a given week to qualify for the lowest tier (Bronze). Volume below this threshold does not earn gems for that week.",
  },
];

function generateLeaderboard(weekSeed) {
  return Array.from({ length: 20 }, (_, i) => {
    const pos = i + 1;
    const volume = Math.max(
      5_000,
      320_000 - pos * 14_000 + weekSeed * 1_100 + (i % 3) * 2_000,
    );
    const portfolios = Math.max(1, 18 - i + (weekSeed % 3));
    const tier =
      volume >= 100_000
        ? TIERS[3]
        : volume >= 50_000
          ? TIERS[2]
          : volume >= 25_000
            ? TIERS[1]
            : TIERS[0];
    return {
      pos,
      address: `0x${((pos + weekSeed) * 0xd3ad).toString(16).padStart(4, "0").slice(0, 4)}...${(pos * 0xbeef + weekSeed).toString(16).padStart(4, "0").slice(0, 4)}`,
      volume,
      portfolios,
      tier,
      gems: tier.weeklyGems,
    };
  });
}

function fmt(n) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n}`;
}

function PositionIcon({ pos }) {
  if (pos === 1) return <Crown size={16} className="text-yellow-500" />;
  if (pos === 2) return <Medal size={16} className="text-gray-400" />;
  if (pos === 3) return <Award size={16} className="text-amber-600" />;
  return <span className="text-gray-500 text-sm font-semibold">{pos}</span>;
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

  const leaderboard = generateLeaderboard(selectedWeek + 1);

  const currentUser = {
    rank: 47,
    address: "0x7a8c...4f2e",
    portfoliosCreated: 8,
    totalVolume: 34_200,
    thisWeekVolume: 12_800,
    tier: TIERS[1],
    estimatedGems: TIERS[1].weeklyGems,
  };

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
          <p className="text-gray-500 mt-1 text-sm">
            Jun 15 – Jul 15, 2026 · Weekly Gem distributions · BNB Chain
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="glass-card px-4 py-2 bg-gradient-to-r from-cyan-500/20 to-blue-600/20 border-cyan-400/40">
            <div className="flex items-center gap-2">
              <Gem className="w-5 h-5 text-cyan-600" />
              <div>
                <div className="text-xs text-gray-500">Weekly Prize Pool</div>
                <div className="font-bold text-gray-900">Up to 2,250 Gems</div>
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
              {currentUser.portfoliosCreated}
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
              {fmt(currentUser.thisWeekVolume)}
            </div>
            <div className="text-xs text-gray-500 mt-0.5">This Week</div>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between p-3 bg-white/60 rounded-xl border border-cyan-200/40">
          <span className="text-sm font-medium text-gray-700">
            Estimated gems this week:
          </span>
          <div className="flex items-center gap-1.5">
            <Gem size={14} className="text-purple-600" />
            <span className="font-bold text-purple-700">
              {currentUser.estimatedGems.toLocaleString()} Gems
            </span>
          </div>
        </div>
        <p className="text-xs text-gray-400 mt-2">
          * Rank and estimated gems update daily. Final distribution confirmed
          after each week closes.
        </p>
      </div>

      {/* Tier Cards */}
      <div>
        <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
          <BarChart2 size={18} className="text-gray-600" />
          Volume Tiers
        </h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {TIERS.map((tier) => (
            <div
              key={tier.label}
              className={`glass-card p-4 ${tier.bg} ${tier.border} border ${currentUser.tier.label === tier.label ? "ring-2 ring-cyan-400 ring-offset-1" : ""}`}
            >
              {currentUser.tier.label === tier.label && (
                <div className="text-xs font-bold text-cyan-600 mb-1">
                  ← Your Tier
                </div>
              )}
              <div
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold mb-3 ${tier.badge}`}
              >
                <div
                  className={`w-2 h-2 rounded-full bg-gradient-to-br ${tier.color}`}
                />
                {tier.label}
              </div>
              <div className={`text-xs mb-2 ${tier.text}`}>
                {tier.description}
              </div>
              <div className="flex items-center gap-1 mt-auto">
                <Gem size={14} className="text-purple-600" />
                <span className="font-bold text-gray-900">
                  {tier.weeklyGems.toLocaleString()}
                </span>
                <span className="text-xs text-gray-500">gems/week</span>
              </div>
            </div>
          ))}
        </div>
        <p className="text-xs text-gray-500 mt-2">
          * Gems split equally among all users in each tier per week.
        </p>
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
            {WEEKS.map((w, i) => (
              <button
                key={w.week}
                onClick={() => setSelectedWeek(i)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${selectedWeek === i ? "bg-black text-white" : "text-gray-600 hover:bg-white"}`}
              >
                Wk {w.week}
              </button>
            ))}
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
          <Calendar size={12} />
          {WEEKS[selectedWeek].dateRange}
          <span className="ml-1 px-2 py-0.5 bg-gray-100 text-gray-500 rounded-full">
            Upcoming
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-2.5 px-3 text-gray-500 font-semibold">
                  #
                </th>
                <th className="text-left py-2.5 px-3 text-gray-500 font-semibold">
                  Wallet
                </th>
                <th className="text-left py-2.5 px-3 text-gray-500 font-semibold">
                  Portfolios
                </th>
                <th className="text-left py-2.5 px-3 text-gray-500 font-semibold">
                  Volume
                </th>
                <th className="text-left py-2.5 px-3 text-gray-500 font-semibold">
                  Tier
                </th>
                <th className="text-left py-2.5 px-3 text-gray-500 font-semibold">
                  Gems (est.)
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {leaderboard.map((row) => (
                <tr
                  key={row.pos}
                  className="hover:bg-white/60 transition-colors"
                >
                  <td className="py-3 px-3 w-10">
                    <div className="flex items-center justify-center w-6">
                      <PositionIcon pos={row.pos} />
                    </div>
                  </td>
                  <td className="py-3 px-3 font-mono text-xs text-gray-700">
                    {row.address}
                  </td>
                  <td className="py-3 px-3 text-gray-700 font-medium">
                    {row.portfolios}
                  </td>
                  <td className="py-3 px-3 font-semibold text-gray-900">
                    {fmt(row.volume)}
                  </td>
                  <td className="py-3 px-3">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-bold ${row.tier.badge}`}
                    >
                      <div
                        className={`w-1.5 h-1.5 rounded-full bg-gradient-to-br ${row.tier.color}`}
                      />
                      {row.tier.label}
                    </span>
                  </td>
                  <td className="py-3 px-3">
                    <div className="flex items-center gap-1">
                      <Gem size={12} className="text-purple-500" />
                      <span className="font-bold text-purple-700">
                        {row.gems.toLocaleString()}
                      </span>
                    </div>
                  </td>
                </tr>
              ))}

              {/* Current user row */}
              <tr className="bg-cyan-50/80 border-t-2 border-cyan-300">
                <td className="py-3 px-3">
                  <div className="flex items-center justify-center w-6">
                    <span className="text-cyan-700 text-sm font-bold">
                      {currentUser.rank}
                    </span>
                  </div>
                </td>
                <td className="py-3 px-3 font-mono text-xs text-cyan-700 font-semibold">
                  {currentUser.address} (you)
                </td>
                <td className="py-3 px-3 text-gray-700 font-medium">
                  {currentUser.portfoliosCreated}
                </td>
                <td className="py-3 px-3 font-semibold text-gray-900">
                  {fmt(currentUser.thisWeekVolume)}
                </td>
                <td className="py-3 px-3">
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-bold ${currentUser.tier.badge}`}
                  >
                    <div
                      className={`w-1.5 h-1.5 rounded-full bg-gradient-to-br ${currentUser.tier.color}`}
                    />
                    {currentUser.tier.label}
                  </span>
                </td>
                <td className="py-3 px-3">
                  <div className="flex items-center gap-1">
                    <Gem size={12} className="text-purple-500" />
                    <span className="font-bold text-purple-700">
                      {currentUser.estimatedGems.toLocaleString()}
                    </span>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="text-xs text-gray-400 mt-3 italic">
          Estimated gem rewards. Final amounts confirmed after each week closes
          and total volume is verified.
        </p>
      </div>

      {/* ── FAQ Modal ── */}
      {showFAQModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold">
                  Frequently Asked Questions
                </h3>
                <p className="text-sm text-gray-500 mt-0.5">
                  Volume League · BNB Chain
                </p>
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
                <p className="text-sm text-gray-500 mt-0.5">
                  Volume League · BNB Chain
                </p>
              </div>
              <button
                onClick={() => setShowTermsModal(false)}
                className="w-9 h-9 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center transition-colors"
              >
                <X size={18} />
              </button>
            </div>
            <div className="overflow-y-auto p-6 space-y-6">
              {/* Eligibility */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Users size={16} className="text-gray-600" />
                  <h4 className="font-bold text-gray-900">Eligibility</h4>
                </div>
                <p className="text-sm text-gray-700 mb-3 leading-relaxed">
                  All users participating in any active AlloX campaign are
                  eligible to join Volume League. This includes participants
                  from the Binance Wallet Campaign, The Allocation Race, Spring
                  Series, WOD HODL, Prove Your Portfolio, Prime Picks, and the
                  Quick Portfolio Builder.
                </p>
                <p className="text-xs text-gray-500">
                  Volume is tracked on BNB Chain. Wallets must be connected via
                  Binance Wallet. Only one wallet per user is permitted.
                </p>
              </div>

              {/* Vesting */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Lock size={16} className="text-gray-600" />
                  <h4 className="font-bold text-gray-900">Vesting Schedule</h4>
                </div>
                <ul className="space-y-2 text-sm text-gray-700">
                  {[
                    "All rewards vest linearly over 6 months starting at ALLOX TGE",
                    "Weekly gem distributions accumulate and are locked until the campaign ends on July 15, 2026",
                    "Vesting begins at TGE regardless of when during the campaign the gems were earned",
                    "Unclaimed gems after 12 months post-TGE are permanently forfeited",
                    "Early TGE does not accelerate vesting — the 6-month schedule remains fixed from the TGE date",
                  ].map((item, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-gray-400 mt-1.5 flex-shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              {/* General Terms */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <FileText size={16} className="text-gray-600" />
                  <h4 className="font-bold text-gray-900">General Terms</h4>
                </div>
                <ul className="space-y-2.5 text-sm text-gray-700">
                  {[
                    "Participants must generate a minimum of $5,000 in portfolio volume in a given week to qualify for any tier reward",
                    "Each tier's gem pool is split equally among all qualifying users in that tier for that week — the more users qualify, the smaller each individual share",
                    "Volume resets to zero at the start of each week; your tier must be re-qualified every week",
                    "Volume from all eligible AlloX products (Prime Picks, Quick Portfolio Builder, Binance Wallet Campaign tasks) is aggregated toward the weekly total",
                    "Using multiple wallets or engaging in wash trading, bot activity, or any form of volume manipulation will result in permanent disqualification from all AlloX campaigns",
                    "AlloX reserves the right to adjust tier thresholds, reward amounts, or campaign duration at any time with reasonable notice",
                    "If the $100M minimum campaign volume threshold is not reached, the reward pool will be scaled proportionally to the actual volume achieved",
                    "AlloX's decision on reward eligibility, disqualification, and distribution is final",
                    "Binance Wallet's standard Terms and Conditions apply in addition to these rules",
                    "Participants from jurisdictions where participation is prohibited by applicable law are not eligible",
                    "AlloX is not responsible for network outages, wallet connectivity issues, or on-chain delays that may affect volume tracking during the campaign period",
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
                  text: "Connect your Binance Wallet and generate volume on BNB Chain through AlloX — via Prime Picks, Quick Portfolio Builder, or the Binance Wallet Campaign tasks.",
                },
                {
                  step: 2,
                  text: "Your weekly volume is tracked and assigned to a tier: Bronze ($5K+), Silver ($25K+), Gold ($50K+), or Diamond ($100K+).",
                },
                {
                  step: 3,
                  text: "At the end of each week, gems are distributed equally among all users in each tier. The higher the tier, the larger the weekly gem pool.",
                },
                {
                  step: 4,
                  text: "Gems accumulate across all 5 weeks and vest linearly over 6 months starting at ALLOX TGE.",
                },
                {
                  step: 5,
                  text: "If total campaign volume doesn't reach $100M, the reward pool scales down proportionally.",
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
