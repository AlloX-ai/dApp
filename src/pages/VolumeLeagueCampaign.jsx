import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
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
  AlertCircle,
} from "lucide-react";
import { Link } from "react-router";
import { useVolume } from "../hooks/useVolume";

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
  {
    q: "Who qualifies for the Reward share  pool?",
    a: "Every user who trades any amount that week earns a share of the $70K weekly reward share pool. There is no minimum volume to participate in the reward share pool, if you trade, you earn.",
  },
  {
    q: "How is my reward share pool share calculated?",
    a: "Your share is proportional to your √(volume) relative to all participants. For example, if your √(volume) is 100 and the sum of all √(volume) across all users is 10,000, you receive 1% of the $70K reward share pool = $700. This square-root weighting means large traders don't dominate smaller ones.",
  },
  {
    q: "How do tier bonuses work?",
    a: "The top 150 ranked users each week are assigned a tier by rank position: top 10 = Diamond, 11–30 = Gold, 31–70 = Silver, 71–150 = Bronze. Each tier has a volume threshold you must hit to unlock your one-time bonus for that week.",
  },
  {
    q: "What are the tier volume thresholds?",
    a: "Diamond (top 10): $100K | Gold (rank 11–30): $50K | Silver (rank 31–70): $25K | Bronze (rank 71–150): $5K. If you are ranked in the top 150 but haven't hit your tier's threshold, your bonus shows as locked on the leaderboard.",
  },
  {
    q: "What happens to locked bonuses?",
    a: "Locked bonuses are not paid out.",
  },
  {
    q: "Can I earn a tier bonus multiple times per week?",
    a: "No. The tier bonus is a one-time reward per user per week. Exceeding your tier threshold multiple times does not multiply the bonus.",
  },
  {
    q: "How are rankings determined?",
    a: "Users are ranked weekly by √(volume) from highest to lowest. Rankings and pool shares reset every Monday at 00:00 UTC.",
  },
  {
    q: "What is the total prize pool?",
    a: "The total campaign prize is $500K across 5 weeks ($100K/week). Each week: $70K reward share pool (distributed to all traders) + $30K tier bonus budget (Diamond $10K, Gold $10K, Silver $6K, Bronze $4K).",
  },
  {
    q: "Can I participate with multiple wallets?",
    a: "No. Each user may only participate with one verified Binance Wallet. Using multiple wallets will result in permanent disqualification from all tiers and forfeiture of reward share pool earnings.",
  },
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

    const [showTutorialModal, setShowTutorialModal] = useState(false);
  const [selectedWeek, setSelectedWeek] = useState(0);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [showFAQModal, setShowFAQModal] = useState(false);
  const [showBonusModal, setShowBonusModal] = useState(false);
  const [positionWeek, setPositionWeek] = useState(0);
  const [portfolios, setPortfolios] = useState([]);
  const [portfolioSlide, setPortfolioSlide] = useState(0);
  const [selectedPortfolio, setSelectedPortfolio] = useState(null);

  
  const portfolioIdRef = { current: 1 };
  const walletAddress = useSelector((state) => state.wallet.address);
  const { fetchCompetition, fetchLeaderboard, fetchUserCompetitionData } =
    useVolume();
  const showWeekNotStartedPlaceholder = selectedWeek >= 1;
  const selectedWeekStatus = WEEKS[selectedWeek].status;

  const MOCK_TOKENS_POOL = [
    { symbol: "BNB", name: "Binance Coin", price: 312 },
    { symbol: "ETH", name: "Ethereum", price: 3410 },
    { symbol: "BTC", name: "Bitcoin", price: 67200 },
    { symbol: "CAKE", name: "PancakeSwap", price: 2.14 },
    { symbol: "ASTER", name: "Aster", price: 0.38 },
    { symbol: "LINK", name: "Chainlink", price: 14.2 },
    { symbol: "UNI", name: "Uniswap", price: 7.8 },
  ];
  const handleCreatePortfolio = () => {
    const shuffled = [...MOCK_TOKENS_POOL]
      .sort(() => Math.random() - 0.5)
      .slice(0, 3);
    const totalAlloc = 100;
    const splits = [50, 30, 20];
    const budget = 500 + Math.random() * 1500;
    const newPortfolio = {
      id: Date.now(),
      name: `Portfolio #${portfolios.length + 1}`,
      tokens: shuffled.map((t, i) => ({
        symbol: t.symbol,
        name: t.name,
        allocation: splits[i],
        price: t.price,
        amount: (budget * splits[i]) / 100 / t.price,
      })),
    };
    setPortfolios((prev) => [...prev, newPortfolio]);
    setPortfolioSlide(0);
  };

  const handleSellPortfolio = (id) => {
    setPortfolios((prev) => {
      const next = prev.filter((p) => p.id !== id);
      setPortfolioSlide((s) => Math.max(0, Math.min(s, next.length - 1)));
      return next;
    });
    setSelectedPortfolio(null);
  };

  const leaderboard = generateLeaderboard(selectedWeek + 1);

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
  useEffect(() => {
    const loadVolumeCampaignData = async () => {
      try {
        const campaignResult = await fetchCompetition();
        console.log(
          "[VolumeLeagueCampaign] /campaigns/volume-league",
          campaignResult,
        );

        const leaderboardResult = await fetchLeaderboard({
          week: selectedWeek + 1,
          limit: 10,
        });
        console.log(
          "[VolumeLeagueCampaign] /campaigns/volume-league/leaderboard",
          leaderboardResult,
        );

        if (walletAddress) {
          const userResult = await fetchUserCompetitionData({
            address: walletAddress,
          });
          console.log(
            "[VolumeLeagueCampaign] /campaigns/volume-league/?address=...",
            userResult,
          );
        } else {
          console.log(
            "[VolumeLeagueCampaign] skipped /campaigns/volume-league/?address=... because no wallet is connected yet",
          );
        }
      } catch (fetchError) {
        console.error(
          "[VolumeLeagueCampaign] failed to load volume campaign data",
          fetchError,
        );
      }
    };

    loadVolumeCampaignData();
  }, [
    fetchCompetition,
    fetchLeaderboard,
    fetchUserCompetitionData,
    selectedWeek,
    walletAddress,
  ]);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-3">
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-4">
                <h2 className="text-xl md:text-3xl  font-bold text-gray-900">
                  Volume League
                </h2>
                <span className=" text-gray-600 text-md font-bold rounded-full  tracking-wider">
                  ($500,000 Reward)
                </span>
              </div>
              <p className="text-gray-500 mt-1 text-sm">
                Generate volume, climb tier brackets, and earn weekly guaranteed
                rewards
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Your Position */}
      <div className="glass-card p-5">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 sm:mb-0">
          <h3 className="font-bold text-gray-900 mb-5">
            2 Simple Steps To Earn
          </h3>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowTutorialModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
            >
              <HelpCircle className="w-3.5 h-3.5" />
              Guide
            </button>
            <button
              onClick={() => setShowFAQModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
            >
              <BookOpen className="w-3.5 h-3.5" />
              FAQs
            </button>
            <button
              onClick={() => setShowTermsModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
            >
              <FileText className="w-4 h-4" />
              Terms
            </button>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch gap-0">
          {/* Step 1 — Create a Portfolio */}
          <div className="flex-1 relative bg-blue-50 border border-blue-200/60 rounded-2xl p-4 sm:rounded-r-none sm:border-r-0">
            <div className="flex items-center gap-2 mb-2">
              <div className="px-2 py-1 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-white text-xs font-bold">Step 1</span>
              </div>
              <span className="font-bold text-gray-900 text-sm">
                {" "}
                Create a Portfolio
              </span>
            </div>
            <p className="text-xs text-gray-500 leading-relaxed ">
              Select tokens and build different portfolios with any amount.
            </p>
          </div>

          {/* Connector → */}
          <div className="hidden sm:flex items-center justify-center w-8 bg-gray-50 border-y border-gray-200/60 z-10">
            <div className="w-4 h-4 border-t-2 border-r-2 border-gray-900 rotate-45 -ml-2" />
          </div>
          <div className="flex sm:hidden items-center justify-center h-6">
            <div className="w-4 h-4 border-b-2 border-r-2 border-gray-900 rotate-45 -mt-2" />
          </div>

          {/* Step 2 — Generate Volume */}
          <div className="flex-1 relative bg-blue-50 border border-blue-200/60 rounded-2xl p-4 sm:rounded-none sm:border-x-0">
            <div className="flex items-center gap-2 mb-2">
              <div className="px-2 py-1 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-white text-xs font-bold">Step 2</span>
              </div>
              <span className="font-bold text-gray-900 text-sm">
                Generate Volume
              </span>
            </div>
            <p className="text-xs text-gray-500 leading-relaxed ">
              Every buy/sell counts to your weekly volume. A $500 minimum volume
              required.
            </p>
            {/* Progress bar */}
          </div>

          {/* Connector → */}
          <div className="flex items-center justify-center w-8 bg-gray-50 border-y border-gray-200/60 z-10 w-full sm:w-fit py-2 px-2">
            <div className="flex flex-col gap-1">
              <div className="w-4 h-0.5 bg-gray-900 rounded-full" />
              <div className="w-4 h-0.5 bg-gray-900 rounded-full" />
            </div>
          </div>

          {/* Step 3 — Guaranteed Rewards */}
          <div className="flex-1 relative bg-green-50 border border-green-200/60 rounded-2xl p-4 sm:rounded-l-none sm:border-l-0">
            <div className="flex items-center gap-2 mb-2">
              <div className="px-2 py-1 bg-green-600 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-white text-xs font-bold">Rewards</span>
              </div>
              <span className="font-bold text-gray-900 text-sm">
                Guaranteed Rewards + Bonus
              </span>
            </div>
            <p className="text-xs text-gray-500 leading-relaxed ">
              Every participant earns a reward share each week, plus an extra
              bonus.
            </p>
          </div>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        {/* My Position */}
        <div className="glass-card p-5 border-blue-200/50 bg-gradient-to-br from-blue-50/40 to-indigo-50/40 sm:h-[375px]">
          <div className="flex items-center justify-between gap-2 mb-4">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 bg-blue-100 rounded-lg flex items-center justify-center">
                <TrendingUp size={14} className="text-blue-600" />
              </div>
              <span className="font-bold text-gray-900 text-sm">
                My Position
              </span>
            <span className="hidden sm:flex px-2.5 py-1 bg-green-100 text-green-700 text-[10px] font-bold rounded-full uppercase tracking-wider">
              Guaranteed Rewards
            </span>
            </div>
            <div className="flex items-center gap-2">
              {currentUser.tier && (
                <span
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-bold ${currentUser.tier.badge}`}
                >
                  <div
                    className={`w-1.5 h-1.5 rounded-full bg-gradient-to-br ${currentUser.tier.color}`}
                  />
                  {currentUser.tier.label}
                </span>
              )}
              <select
                value={positionWeek}
                onChange={(e) => setPositionWeek(Number(e.target.value))}
                className="text-xs font-semibold text-gray-700 bg-white border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-300 cursor-pointer"
              >
                {WEEKS.map((w, i) => (
                  <option key={i} value={i}>
                    Wk {w.week}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Stats — Rank, Volume, Portfolios */}
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-white/70 rounded-xl p-2.5 text-center">
              <Crown size={13} className="text-yellow-500 mx-auto mb-1" />
              <div className="font-bold text-gray-900 text-lg">
                #{currentUser.rank}
              </div>
              <div className="text-[10px] text-gray-500">Reward Share</div>
            </div>
            <div className="bg-white/70 rounded-xl p-2.5 text-center">
              <Wallet size={13} className="text-green-500 mx-auto mb-1" />
              <div className="font-bold text-gray-900 text-lg">
                {fmt(currentUser.totalVolume)}
              </div>
              <div className="text-[10px] text-gray-500">Extra Bonus</div>
            </div>
            <div className="bg-white/70 rounded-xl p-2.5 text-center">
              <PieChart size={13} className="text-blue-500 mx-auto mb-1" />
              <div className="font-bold text-gray-900 text-lg">
                {portfolios.length}
              </div>
              <div className="text-[10px] text-gray-500">Volume</div>
            </div>
          </div>

          {/* Create Portfolio — big upload-style when empty, small when portfolios exist */}
          {portfolios.length === 0 ? (
            <button
              onClick={handleCreatePortfolio}
              className="w-full group flex flex-col items-center justify-center gap-2 py-8 rounded-2xl border-2 border-dashed border-blue-300 bg-blue-50/50 hover:bg-blue-600 hover:border-blue-600 transition-all duration-200 sm:h-[205px]"
            >
              <div className="w-10 h-10 rounded-full bg-blue-100 group-hover:bg-blue-500 flex items-center justify-center transition-colors">
                <Plus
                  size={20}
                  className="text-blue-600 group-hover:text-white transition-colors"
                />
              </div>
              <div className="text-center">
                <div className="font-bold text-gray-900 group-hover:text-white text-sm transition-colors">
                  Create Portfolio
                </div>
                <div className="text-xs text-gray-400 group-hover:text-blue-100 transition-colors mt-0.5">
                  Select tokens · every trade counts as volume
                </div>
              </div>
            </button>
          ) : (
            <>
              <button
                onClick={handleCreatePortfolio}
                className="w-full group flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 border-dashed border-blue-300 bg-blue-50/50 hover:bg-blue-600 hover:border-blue-600 transition-all duration-200 mb-3"
              >
                <Plus
                  size={14}
                  className="text-blue-600 group-hover:text-white transition-colors"
                />
                <span className="text-sm font-semibold text-gray-800 group-hover:text-white transition-colors">
                  Create Portfolio
                </span>
              </button>

              {/* Portfolio horizontal list / slider */}
              <div>
                <div className="flex items-center justify-between mb-2 h-6">
                  <span className="text-xs font-semibold text-gray-500">
                    My Portfolios
                  </span>
                  {portfolios.length > 3 && (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() =>
                          setPortfolioSlide((s) => Math.max(0, s - 1))
                        }
                        disabled={portfolioSlide === 0}
                        className="w-6 h-6 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center disabled:opacity-30 transition-all"
                      >
                        <svg
                          width="10"
                          height="10"
                          viewBox="0 0 20 20"
                          fill="none"
                        >
                          <path
                            d="M13 5l-5 5 5 5"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                          />
                        </svg>
                      </button>
                      <span className="text-[10px] text-gray-400">
                        {portfolioSlide + 1}–
                        {Math.min(portfolioSlide + 3, portfolios.length)} of{" "}
                        {portfolios.length}
                      </span>
                      <button
                        onClick={() =>
                          setPortfolioSlide((s) =>
                            Math.min(portfolios.length - 3, s + 1),
                          )
                        }
                        disabled={portfolioSlide >= portfolios.length - 3}
                        className="w-6 h-6 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center disabled:opacity-30 transition-all"
                      >
                        <svg
                          width="10"
                          height="10"
                          viewBox="0 0 20 20"
                          fill="none"
                        >
                          <path
                            d="M7 5l5 5-5 5"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                          />
                        </svg>
                      </button>
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {portfolios
                    .slice(portfolioSlide, portfolioSlide + 3)
                    .map((p) => {
                      const total = p.tokens.reduce(
                        (s, t) => s + t.price * t.amount,
                        0,
                      );
                      return (
                        <button
                          key={p.id}
                          onClick={() => setSelectedPortfolio(p)}
                          className="flex flex-col items-center p-3 bg-white/70 hover:bg-white border border-gray-200/60 hover:border-blue-300 rounded-xl transition-all group"
                        >
                          <div className="w-9 h-9 bg-blue-100 group-hover:bg-blue-200 rounded-xl flex items-center justify-center mb-2 transition-colors">
                            <PieChart size={15} className="text-blue-600" />
                          </div>
                          <div className="text-[10px] font-bold text-gray-900 text-center leading-tight">
                            {p.name}
                          </div>
                          <div className="text-[10px] text-gray-400 mt-0.5">
                            {p.tokens.map((t) => t.symbol).join("·")}
                          </div>
                          <div className="text-xs font-bold text-gray-900 mt-1.5">
                            ${total.toFixed(0)}
                          </div>
                        </button>
                      );
                    })}
                </div>
              </div>
            </>
          )}
        </div>

        {/* My Earnings — Tier Bonus info */}
        <div className="glass-card p-5 border-amber-200/50 bg-gradient-to-br from-amber-50/30 to-orange-50/30 sm:h-[375px]">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-7 h-7 bg-amber-100 rounded-lg flex items-center justify-center">
              <Award size={14} className="text-amber-600" />
            </div>
            <span className="font-bold text-gray-900 text-sm">
              Reward Tiers
            </span>
            <span className="px-2.5 py-1 bg-green-100 text-green-700 text-[10px] font-bold rounded-full uppercase tracking-wider">
              Extra Bonus
            </span>
          </div>
          <p className="text-xs text-gray-400 mb-4 pl-9">
            Rank in the top 150 and hit the volume threshold to unlock your tier
            bonus this week.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:h-[265px]">
            {TIERS.map((tier) => {
              const isUserTier = currentUser.tier?.label === tier.label;
              return (
                <div
                  key={tier.label}
                  className={`rounded-2xl p-3 border ${isUserTier ? `${tier.bg} ${tier.border} border-2` : "bg-white/60 border-gray-200/60"}`}
                >
                  <div
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-bold mb-2 ${tier.badge}`}
                  >
                    <div
                      className={`w-1.5 h-1.5 rounded-full bg-gradient-to-br ${tier.color}`}
                    />
                    {tier.label}
                  </div>
                  <div className="text-xs text-gray-500 mb-2 leading-relaxed">
                    {tier.ranks} · {fmt(tier.volThreshold)}+ volume required
                  </div>
                  <div className="font-bold text-gray-900">
                    ${tier.bonus.toLocaleString()}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Weekly Leaderboard */}
      <div className="glass-card p-6">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2">
                <Calendar size={18} className="text-gray-600" />
                <h3 className="font-bold text-gray-900">Weekly Leaderboard</h3>
              </div>
              <span className="px-2.5 py-1 bg-green-100 text-green-700 text-[12px] font-bold rounded-full  tracking-wider">
                $100K/Week
              </span>
            </div>
            <p className="text-xs text-gray-400 mb-4">
              The more volume you generate, the larger your reward share
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {WEEKS.map((w, i) => (
              <button
                key={w.week}
                onClick={() => setSelectedWeek(i)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border ${
                  selectedWeek === i
                    ? "bg-black text-white border-black"
                    : "text-gray-600 border-gray-200 hover:border-gray-400 hover:text-gray-900 bg-white"
                }`}
              >
                Week {w.week}
                <span className="ml-1.5 opacity-60">
                  {w.dateRange.split("–")[0].trim()}
                </span>
              </button>
            ))}
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
                  Reward Share
                </th>
                <th className="text-left py-2.5 px-2 text-gray-500 font-semibold text-xs">
                  Tier Bonus
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
                                  Bonus locked
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
                        className={`text-xs font-bold ${row.unlocked && row.tier ? "text-gray-900" : "text-gray-900"}`}
                      >
                        ${total.toFixed(0)}
                        {row.tier && !row.unlocked && (
                          <span className="text-black-500 font-normal"> </span>
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
                  <h4 className="font-bold text-gray-900">
                    Reward Share Pool Rules
                  </h4>
                </div>
                <ul className="space-y-2 text-sm text-gray-700">
                  {[
                    "Every user who trades a minimum of $500 in a given week earns a share of the $70K weekly reward share pool",
                    "Reward share is calculated as: √(your volume) ÷ Σ√(all users' volumes) × $70,000",
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


      {selectedPortfolio && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl max-w-sm w-full overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-gray-900">{selectedPortfolio.name}</h3>
                <p className="text-xs text-gray-400 mt-0.5">{selectedPortfolio.tokens.length} tokens · BNB Chain</p>
              </div>
              <button onClick={() => setSelectedPortfolio(null)} className="w-8 h-8 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center transition-colors">
                <X size={16} />
              </button>
            </div>

            <div className="px-6 py-4 space-y-2">
              {/* Token rows */}
              {selectedPortfolio.tokens.map(token => {
                const value = token.price * token.amount;
                return (
                  <div key={token.symbol} className="flex items-center justify-between py-2.5 border-b border-gray-100 last:border-0">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-xs font-bold text-gray-600">
                        {token.symbol.slice(0, 2)}
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-gray-900">{token.symbol}</div>
                        <div className="text-xs text-gray-400">{token.name}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-bold text-gray-900">${value.toFixed(2)}</div>
                      <div className="text-xs text-gray-400">{token.amount.toFixed(4)} @ ${token.price.toLocaleString()}</div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Total */}
            <div className="px-6 pb-2">
              <div className="flex items-center justify-between py-3 border-t-2 border-gray-100">
                <span className="font-bold text-gray-700 text-sm">Total Value</span>
                <span className="font-bold text-gray-900 text-lg">
                  ${selectedPortfolio.tokens.reduce((s, t) => s + t.price * t.amount, 0).toFixed(2)}
                </span>
              </div>
            </div>

            <div className="px-6 pb-6 grid grid-cols-2 gap-2">
              <button
                onClick={() => setSelectedPortfolio(null)}
                className="py-2.5 rounded-xl border border-gray-200 text-gray-700 font-semibold text-sm hover:bg-gray-50 transition-colors"
              >
                Close
              </button>
              <button
                onClick={() => handleSellPortfolio(selectedPortfolio.id)}
                className="py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white font-semibold text-sm transition-colors"
              >
                Sell Portfolio
              </button>
            </div>
          </div>
        </div>
      )}

          {showTutorialModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full max-h-[85vh] overflow-hidden flex flex-col">
            <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold">How Rewards Work</h3>
                <p className="text-xs text-gray-400 mt-0.5">Volume League · Weekly Distribution</p>
              </div>
              <button onClick={() => setShowTutorialModal(false)} className="w-9 h-9 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center transition-colors">
                <X size={17} />
              </button>
            </div>

            <div className="overflow-y-auto px-6 py-5 space-y-5">

              {/* Minimum threshold */}
             

              {/* 2 steps */}
              <div>
                <div className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">2 Simple Steps</div>
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="w-14 h-7 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-white text-[10px] font-bold">Step 1</span>
                    </div>
                    <div>
                      <div className="font-semibold text-gray-900 text-sm">Create a Portfolio</div>
                      <div className="text-xs text-gray-500 mt-0.5">Select tokens and build an on-chain portfolio. Every buy or sell transaction generates volume automatically.</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-14 h-7 bg-green-600 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-white text-[10px] font-bold">Step 2</span>
                    </div>
                    <div>
                      <div className="font-semibold text-gray-900 text-sm">Generate Volume</div>
                      <div className="text-xs text-gray-500 mt-0.5">Trade more to increase your volume. The more you generate, the larger your share of the $70K weekly base pool.</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* How the base pool works */}
              <div>
                <div className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">Weekly Reward Distribution</div>
                <ul className="space-y-2.5">
                  {[
                    { icon: <Check size={13} className="text-green-600 flex-shrink-0 mt-0.5" />, text: "Every week, $70,000 is split among all participants who hit the $500 minimum volume." },
                    { icon: <Check size={13} className="text-green-600 flex-shrink-0 mt-0.5" />, text: "Your share is calculated using √(your volume) ÷ √(total volume). This means everyone earns, not just the biggest traders." },
                    { icon: <Check size={13} className="text-green-600 flex-shrink-0 mt-0.5" />, text: "Rankings reset every week. Your earnings are confirmed after each week closes." },
                    { icon: <Check size={13} className="text-green-600 flex-shrink-0 mt-0.5" />, text: "Minimum to qualify: You need at least $500 in weekly volume to receive a reward share. Any trade counts, buy or sell." },
                  ].map((item, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                      {item.icon}
                      <span>{item.text}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Bonuses */}
              <div>
                <div className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">Extra Tier Bonuses</div>
                <ul className="space-y-2">
                  {[
                    "The top 150 users by volume each week are assigned a tier: Diamond (top 10), Gold (11–30), Silver (31–70), Bronze (71–150).",
                    "Each tier has a one-time bonus on top of your base share, but only if you hit the tier's volume threshold.",
                    "Locked bonuses roll into the following week's pool, so unclaimed rewards stay in the game.",
                  ].map((text, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                      <div className="w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0 mt-1.5" />
                      {text}
                    </li>
                  ))}
                </ul>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  {TIERS.map(t => (
                    <div key={t.label} className={`rounded-xl p-2.5 border ${t.bg} ${t.border}`}>
                      <div className={`text-xs font-bold ${t.text} mb-0.5`}>{t.label}</div>
                      <div className="text-xs text-gray-500">{t.ranks} · {fmt(t.volThreshold)}+</div>
                      <div className="font-bold text-gray-900 text-sm mt-1">${t.bonus.toLocaleString()}</div>
                    </div>
                  ))}
                </div>
              </div>

            </div>

            <div className="px-6 pb-5 pt-2">
              <button onClick={() => setShowTutorialModal(false)} className="w-full bg-black text-white font-semibold py-3 rounded-xl hover:bg-gray-800 transition-colors text-sm">
                Got it
              </button>
            </div>
          </div>
        </div>
      )}



      {/* ── How It Works Modal ── */}
    </div>
  );
}
