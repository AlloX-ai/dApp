import {
  Users,
  Activity,
  Gem,
  Zap,
  Info,
  TrendingUp,
  Clock,
  Trophy,
  Wallet,
  ArrowRightLeft,
  Check,
  ChevronLeft,
  ChevronRight,
  HelpCircle,
} from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { WODCampaignDetailsModal } from "../components/WODCampaignDetailsModal";
import { WODCampaignFAQModal } from "../components/WODCampaignFAQModal";
import { WODSwapModal } from "../components/WODSwapModal";

export function WODCampaignPage() {
  const [showDetails, setShowDetails] = useState(false);
  const [showFAQ, setShowFAQ] = useState(false);
  const [showSwap, setShowSwap] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [timeLeft, setTimeLeft] = useState({
    days: 1,
    hours: 2,
    minutes: 3,
    seconds: 45,
  });

  // Countdown timer for snapshot
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        let { days, hours, minutes, seconds } = prev;

        if (seconds > 0) {
          seconds--;
        } else {
          seconds = 59;
          if (minutes > 0) {
            minutes--;
          } else {
            minutes = 59;
            if (hours > 0) {
              hours--;
            } else {
              hours = 23;
              if (days > 0) {
                days--;
              }
            }
          }
        }

        return { days, hours, minutes, seconds };
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const itemsPerPage = 10;

  // Mock user data - connected wallet
  const userData = {
    wallet: "0x742d...35a3",
    amount: 450,
    tier: "Explorer",
    earlyBonus: 1.2,
    holdingDays: 5,
    multiplier: "1.0x",
    weight: 450 * 1.2 * 1.0, // amount × earlyBonus × holdingMultiplier
    estimatedShare: "0.054%", // example share of tier pool
    estimatedGems: "34",
    estimatedUSD: "$170",
  };

  // Total campaign stats
  const campaignStats = {
    totalVolume: 125000, // Total $ in campaign
    totalWeight: 150000, // Sum of all user weights
    tierDistribution: {
      starter: {
        pool: 1000,
        percentage: 10,
        volume: 25000,
        weight: 30000,
      },
      explorer: {
        pool: 3000,
        percentage: 30,
        volume: 50000,
        weight: 60000,
      },
      elite: {
        pool: 6000,
        percentage: 60,
        volume: 50000,
        weight: 60000,
      },
    },
  };

  // Mock leaderboard data with ranks - generate 100 users
  const generateLeaderboard = () => {
    const leaderboard = [];

    for (let i = 1; i <= 100; i++) {
      const amount = Math.floor(Math.random() * 900) + 50; // $50-$950
      const tier =
        amount < 100 ? "Starter" : amount < 500 ? "Explorer" : "Elite";
      const holdingDays = Math.floor(Math.random() * 30);
      const earlyBonus = i <= 20 ? 1.2 : 1.0;

      let holdingMultiplier = 1.0;
      let multiplier = "1.0x";
      if (holdingDays >= 30) {
        multiplier = "2.0x";
        holdingMultiplier = 2.0;
      } else if (holdingDays >= 15) {
        multiplier = "1.5x";
        holdingMultiplier = 1.5;
      } else if (holdingDays >= 7) {
        multiplier = "1.25x";
        holdingMultiplier = 1.25;
      } else if (holdingDays >= 1) {
        multiplier = "1.0x";
        holdingMultiplier = 1.0;
      } else {
        multiplier = "Pending";
        holdingMultiplier = 0;
      }

      // Calculate user weight
      const weight = amount * earlyBonus * holdingMultiplier;

      // Calculate tier pool and share
      const tierPools = {
        Starter: 1000,
        Explorer: 3000,
        Elite: 6000,
      };
      const tierWeights = {
        Starter: 30000,
        Explorer: 60000,
        Elite: 60000,
      };

      const tierPool = tierPools[tier];
      const tierWeight = tierWeights[tier];
      const share = (weight / tierWeight) * 100;

      // Calculate estimated gems based on share of tier pool
      const estimatedGems = Math.floor((weight / tierWeight) * tierPool);

      leaderboard.push({
        rank: i,
        wallet: `0x${Math.random().toString(16).substr(2, 4)}...${Math.random().toString(16).substr(2, 4)}`,
        amount,
        holdingDays,
        multiplier,
        weight: Math.round(weight),
        share: share.toFixed(3) + "%",
        estimatedGems:
          multiplier === "Pending" ? "Pending" : `${estimatedGems}`,
        estimatedUSD: multiplier === "Pending" ? "—" : `$${estimatedGems * 5}`,
        tier,
      });
    }

    return leaderboard;
  };

  const leaderboard = useMemo(() => {
    return generateLeaderboard();
  }, []);

  const totalPages = useMemo(() => {
    return Math.ceil(leaderboard.length / itemsPerPage);
  }, [leaderboard, itemsPerPage]);

  const paginatedLeaderboard = useMemo(() => {
    return leaderboard.slice(
      (currentPage - 1) * itemsPerPage,
      currentPage * itemsPerPage,
    );
  }, [leaderboard, currentPage, itemsPerPage]);

  const getTierColor = (tier: string) => {
    switch (tier) {
      case "Starter":
        return "text-gray-700 bg-gray-100";
      case "Explorer":
        return "text-green-700 bg-green-100";
      case "Elite":
        return "text-purple-700 bg-purple-100";
      default:
        return "text-gray-700 bg-gray-100";
    }
  };

  const getRankStyle = (rank: number) => {
    if (rank === 1)
      return "bg-gradient-to-br from-yellow-400 to-yellow-600 text-white";
    if (rank === 2)
      return "bg-gradient-to-br from-gray-300 to-gray-500 text-white";
    if (rank === 3)
      return "bg-gradient-to-br from-orange-400 to-orange-600 text-white";
    return "bg-gray-100 text-gray-700";
  };

  return (
    <>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-3xl font-bold text-gray-900 mb-2">WOD HODL</h2>
            <p className="text-gray-600 mb-4 max-w-3xl">
              Buy and hold WOD tokens to earn rewards. Your rewards are based on
              your participation, holding duration, and overall campaign
              activity. The longer you hold, the higher your share!
            </p>
          </div>

          <button
            onClick={() => setShowFAQ(true)}
            className="glass-card px-3 py-2 hover:bg-gray-50 transition-colors flex items-center gap-2 text-xs whitespace-nowrap"
          >
            <HelpCircle size={14} className="text-indigo-600" />
            <span className="font-medium">Campaign FAQ</span>
          </button>
        </div>

        {/* Campaign Status & Quick Stats */}

        {/* Two Column Layout */}
        <div className="grid lg:grid-cols-[1fr_1.2fr] gap-6 items-start">
          {/* Left Column - User Stats */}
          <div className="glass-card p-5 bg-gradient-to-br from-purple-50/50 to-indigo-50/50">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Wallet className="w-5 h-5 text-purple-600" />
                <h3 className="text-lg font-bold text-gray-900">
                  Your Position
                </h3>
              </div>
              <span
                className={`px-2.5 py-1 rounded-full text-xs font-semibold ${getTierColor(userData.tier)}`}
              >
                {userData.tier}
              </span>
            </div>

            {/* Wallet Address */}
            <div className="mb-4 p-3 bg-white/60 rounded-xl">
              <div className="text-xs text-gray-600 mb-1">Wallet Address</div>
              <div className="font-mono text-sm font-semibold text-gray-900">
                {userData.wallet}
              </div>
            </div>

            {/* Stats Grid - Simplified */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="p-3 bg-white/60 rounded-xl">
                <div className="text-xs text-gray-600 mb-1">Total Amount</div>
                <div className="font-bold text-xl text-gray-900">
                  ${userData.amount}
                </div>
              </div>
              <div className="p-3 bg-white/60 rounded-xl">
                <div className="text-xs text-gray-600 mb-1">
                  Holding Duration
                </div>
                <div className="font-bold text-xl text-gray-900">
                  {userData.holdingDays}d
                </div>
              </div>
              <div className="p-3 bg-white/60 rounded-xl">
                <div className="text-xs text-gray-600 mb-1">Early Bonus</div>
                <div
                  className={`font-bold text-xl ${userData.earlyBonus > 1 ? "text-yellow-600" : "text-gray-600"}`}
                >
                  ×{userData.earlyBonus}
                </div>
              </div>
              <div className="p-3 bg-white/60 rounded-xl">
                <div className="text-xs text-gray-600 mb-1">
                  Hold Multiplier
                </div>
                <div
                  className={`font-bold text-xl ${
                    userData.multiplier === "Pending"
                      ? "text-red-600"
                      : userData.multiplier === "1.0x"
                        ? "text-gray-600"
                        : userData.multiplier === "1.25x"
                          ? "text-blue-600"
                          : userData.multiplier === "1.5x"
                            ? "text-green-600"
                            : "text-purple-600"
                  }`}
                >
                  {userData.multiplier}
                </div>
              </div>
            </div>

            {/* Estimated Rewards - Highlighted */}
            <div className="p-4 bg-white/80 rounded-xl border-2 border-purple-200 mb-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs text-gray-600 mb-1">
                    Estimated Rewards
                  </div>
                  <div className="flex items-center gap-2">
                    <Gem className="w-5 h-5 text-purple-600" />
                    <span className="font-bold text-2xl text-gray-900">
                      {userData.estimatedGems}
                    </span>
                    <div className="text-xs text-gray-600 mt-1">
                      {userData.estimatedUSD}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Get WOD Button */}
            <button
              onClick={() => setShowSwap(true)}
              className="w-full py-2.5 px-4 bg-black text-white rounded-xl font-semibold hover:shadow-lg transition-all flex items-center justify-center gap-2"
            >
              <ArrowRightLeft size={18} />
              Get WOD
            </button>
          </div>

          {/* Right Column - Merged: How It Works & Reward Tiers */}
          <div className="glass-card p-6 bg-gradient-to-br from-blue-50/50 to-indigo-50/50 h-full">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-900">
                Campaign Guide
              </h3>
              <button
                onClick={() => setShowDetails(true)}
                className="text-sm text-blue-600 hover:text-blue-700 font-semibold"
              >
                Details →
              </button>
            </div>

            {/* How It Works */}
            <div className="mb-6">
              <h4 className="font-bold text-gray-900 mb-3 text-sm">
                How It Works
              </h4>
              <div className="flex items-center justify-between gap-2">
                <div className="flex-1 text-center">
                  <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center mx-auto mb-1.5 text-sm font-bold">
                    1
                  </div>
                  <div className="font-semibold text-xs text-gray-900 mb-0.5">
                    Buy $WOD
                  </div>
                  <div className="text-[10px] text-gray-600">$50+ required</div>
                </div>
                <div className="flex-1 text-center">
                  <div className="w-8 h-8 rounded-full bg-green-600 text-white flex items-center justify-center mx-auto mb-1.5 text-sm font-bold">
                    2
                  </div>
                  <div className="font-semibold text-xs text-gray-900 mb-0.5">
                    Hold Tokens
                  </div>
                  <div className="text-[10px] text-gray-600">
                    Until snapshot
                  </div>
                </div>
                <div className="flex-1 text-center">
                  <div className="w-8 h-8 rounded-full bg-purple-600 text-white flex items-center justify-center mx-auto mb-1.5 text-sm font-bold">
                    3
                  </div>
                  <div className="font-semibold text-xs text-gray-900 mb-0.5">
                    Earn Multipliers
                  </div>
                  <div className="text-[10px] text-gray-600">Up to 2.0x</div>
                </div>
                <div className="flex-1 text-center">
                  <div className="w-8 h-8 rounded-full bg-yellow-600 text-white flex items-center justify-center mx-auto mb-1.5 text-sm font-bold">
                    4
                  </div>
                  <div className="font-semibold text-xs text-gray-900 mb-0.5">
                    Get Gems
                  </div>
                  <div className="text-[10px] text-gray-600">Rewards</div>
                </div>
              </div>
            </div>

            {/* Reward Tiers */}
            <div>
              <h4 className="font-bold text-gray-900 mb-3 text-sm">
                Pool Distribution
              </h4>
              <div className="space-y-2">
                <div className="p-3 bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg border border-gray-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div>
                        <div className="font-bold text-sm text-gray-700">
                          Starter
                        </div>
                        <div className="text-xs text-gray-600">$50 - $99</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-bold text-gray-900">
                        10% Pool
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="text-xs text-gray-600">1,000</div>
                        <Gem className="w-4 h-4 text-purple-600" />
                      </div>
                    </div>
                  </div>
                </div>
                <div className="p-3 bg-gradient-to-br from-green-50 to-emerald-100 rounded-lg border border-green-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div>
                        <div className="font-bold text-sm text-green-700">
                          Explorer
                        </div>
                        <div className="text-xs text-gray-600">$100 - $499</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-bold text-gray-900">
                        30% Pool
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="text-xs text-gray-600">3,000</div>
                        <Gem className="w-4 h-4 text-purple-600" />
                      </div>
                    </div>
                  </div>
                </div>
                <div className="p-3 bg-gradient-to-br from-purple-50 to-pink-100 rounded-lg border border-purple-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div>
                        <div className="font-bold text-sm text-purple-700">
                          Elite
                        </div>
                        <div className="text-xs text-gray-600">$500+</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-bold text-gray-900">
                        60% Pool
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="text-xs text-gray-600">6,000</div>
                        <Gem className="w-4 h-4 text-purple-600" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bonus Highlights */}
        <div className="grid md:grid-cols-3 gap-4">
          <div className="glass-card p-4 bg-gradient-to-br from-yellow-50 to-orange-50 border border-yellow-200">
            <div className="flex items-center gap-2 mb-2">
              <Zap className="w-5 h-5 text-yellow-600" />
              <span className="font-bold text-gray-900">Early Boost</span>
            </div>
            <div className="text-sm text-gray-700">
              <span className="font-bold text-yellow-600">+20% Gems</span> for
              first 48 hours
            </div>
          </div>
          <div className="glass-card p-4 bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-5 h-5 text-blue-600" />
              <span className="font-bold text-gray-900">Hold Multiplier</span>
            </div>
            <div className="text-sm text-gray-700">
              Up to <span className="font-bold text-blue-600">2.0x</span> for
              30+ days
            </div>
          </div>
          <div className="glass-card p-4 bg-gradient-to-br from-purple-50 to-pink-50 border border-purple-200">
            <div className="flex items-center gap-2 mb-2">
              <Trophy className="w-5 h-5 text-purple-600" />
              <span className="font-bold text-gray-900">Jackpots</span>
            </div>
            <div className="text-sm text-gray-700">
              Random winners get{" "}
              <span className="font-bold text-purple-600">50-100 Gems</span>
            </div>
          </div>
        </div>

        {/* Leaderboard Table */}
        <div className="glass-card p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Trophy className="w-5 h-5 text-yellow-600" />
              <h3 className="text-xl font-bold">Leaderboard</h3>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-red-500 to-orange-500 rounded-lg">
              <Clock className="w-4 h-4 text-white" />
              <span className="text-xs font-mono font-semibold text-white">
                Snapshot in {timeLeft.days}d {timeLeft.hours}h{" "}
                {timeLeft.minutes}m
              </span>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-center py-3 px-4 text-xs font-semibold text-gray-600 uppercase">
                    Rank
                  </th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">
                    Wallet
                  </th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">
                    Amount
                  </th>
                  <th className="text-center py-3 px-4 text-xs font-semibold text-gray-600 uppercase">
                    Holding (Days)
                  </th>
                  <th className="text-center py-3 px-4 text-xs font-semibold text-gray-600 uppercase">
                    Multiplier
                  </th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">
                    Est. Rewards
                  </th>
                </tr>
              </thead>
              <tbody>
                {paginatedLeaderboard.map((holding) => (
                  <tr key={holding.wallet} className="border-b border-gray-100">
                    <td className="py-3 px-4 text-center">
                      <div
                        className={`w-8 h-8 rounded-lg ${getRankStyle(holding.rank)} flex items-center justify-center font-bold text-sm mx-auto`}
                      >
                        {holding.rank}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div>
                        <span className="font-mono text-sm text-gray-900 block">
                          {holding.wallet}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs font-semibold ${getTierColor(holding.tier)} inline-block mt-1`}
                        >
                          {holding.tier}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-semibold text-sm text-gray-900">
                        ${holding.amount}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="font-semibold text-sm text-gray-900">
                        {holding.holdingDays}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`font-bold text-sm ${
                          holding.multiplier === "Pending"
                            ? "text-red-600"
                            : holding.multiplier === "1.0x"
                              ? "text-gray-600"
                              : holding.multiplier === "1.25x"
                                ? "text-blue-600"
                                : holding.multiplier === "1.5x"
                                  ? "text-green-600"
                                  : "text-purple-600"
                        }`}
                      >
                        {holding.multiplier}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1">
                        <Gem size={14} className="text-purple-600" />
                        <span className="font-bold text-sm text-gray-900">
                          {holding.estimatedGems}
                        </span>
                        <span className="text-xs text-gray-600">
                          ({holding.estimatedUSD})
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-4 p-3 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
            <div className="text-xs text-gray-700 text-center">
              Rewards are estimates based on current holdings. Final rewards
              calculated at snapshot.
              <span
                onClick={() => setShowDetails(true)}
                className="text-blue-600 font-semibold ml-1 hover:underline cursor-pointer"
              >
                Learn more
              </span>
            </div>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-center gap-2 mt-4">
            <button
              onClick={() => setCurrentPage(currentPage - 1)}
              disabled={currentPage === 1}
              className={`p-2 rounded-lg ${currentPage === 1 ? "text-gray-400 cursor-not-allowed" : "text-gray-600 hover:bg-gray-100"}`}
            >
              <ChevronLeft size={18} />
            </button>

            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
              // Show first page, last page, current page, and pages around current
              const showPage =
                page === 1 ||
                page === totalPages ||
                (page >= currentPage - 1 && page <= currentPage + 1);

              // Show ellipsis
              const showEllipsisBefore =
                page === currentPage - 2 && currentPage > 3;
              const showEllipsisAfter =
                page === currentPage + 2 && currentPage < totalPages - 2;

              if (showEllipsisBefore || showEllipsisAfter) {
                return (
                  <span key={page} className="px-2 text-gray-400">
                    ...
                  </span>
                );
              }

              if (!showPage) return null;

              return (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`min-w-[36px] h-9 rounded-lg font-semibold text-sm ${
                    currentPage === page
                      ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white"
                      : "text-gray-600 hover:bg-gray-100"
                  }`}
                >
                  {page}
                </button>
              );
            })}

            <button
              onClick={() => setCurrentPage(currentPage + 1)}
              disabled={currentPage === totalPages}
              className={`p-2 rounded-lg ${currentPage === totalPages ? "text-gray-400 cursor-not-allowed" : "text-gray-600 hover:bg-gray-100"}`}
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* Details Modal */}
      {showDetails && (
        <WODCampaignDetailsModal onClose={() => setShowDetails(false)} />
      )}
      {/* FAQ Modal */}
      {showFAQ && <WODCampaignFAQModal onClose={() => setShowFAQ(false)} />}
      {/* Swap Modal */}
      {showSwap && <WODSwapModal onClose={() => setShowSwap(false)} />}
    </>
  );
}
