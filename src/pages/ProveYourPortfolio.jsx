import {
  Trophy,
  Gem,
  Clock,
  Share2,
  Download,
  CheckCircle2,
  Lock,
  Unlock,
  TrendingUp,
  Wallet,
  Timer,
  Users,
  Award,
  Sparkles,
  ChevronRight,
  ExternalLink,
  X as XIcon,
  PlusCircle,
  Heart,
} from "lucide-react";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";

export function ProveYourPortfolioCampaign() {
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [leaderboardOptIn, setLeaderboardOptIn] = useState(true);
  const [isWalletConnected, setIsWalletConnected] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState({
    days: 3,
    hours: 14,
    minutes: 27,
    seconds: 45,
  });

  // Mock user data
  const userStats = {
    topPerformer: { gain: "+127.5%", period: "This week" },
    portfolioSnapshot: {
      totalValue: "$24,680",
      chains: 3,
      topChain: "BNB Chain",
    },
    diamondHands: { position: "ETH", heldDays: 94, gain: "+215%" },
    newPortfolio: {
      amount: "$500",
      tokens: ["ETH", "BNB", "SOL", "AVAX", "MATIC"],
    },
  };

  // Milestone tiers with user progress
  const milestoneTiers = [
    { tier: 1, action: "Share your card on X", reward: 50, completed: true },
    {
      tier: 2,
      action: "Get 10 likes on your post",
      reward: 150,
      completed: false,
      progress: 7,
      total: 10,
    },
    {
      tier: 3,
      action: "Share 3 different card types",
      reward: 400,
      completed: false,
      progress: 1,
      total: 3,
    },
    {
      tier: 4,
      action: "Top 10 sharers this week",
      reward: 0,
      completed: false,
    },
  ];

  // Badges
  const badges = [
    {
      id: "1",
      name: "First $10K",
      description: "Reached $10K portfolio value",
      unlocked: true,
      icon: "💰",
    },
    {
      id: "2",
      name: "10x Token",
      description: "Achieved 10x on any token",
      unlocked: true,
      icon: "🚀",
    },
    {
      id: "3",
      name: "30-Day Streak",
      description: "Active for 30 consecutive days",
      unlocked: false,
      icon: "🔥",
    },
    {
      id: "4",
      name: "Diamond Hands",
      description: "Held winner 90+ days",
      unlocked: true,
      icon: "💎",
    },
    {
      id: "5",
      name: "Portfolio Master",
      description: "Created 10+ portfolios",
      unlocked: false,
      icon: "🎯",
    },
    {
      id: "6",
      name: "Early Adopter",
      description: "Joined in first month",
      unlocked: true,
      icon: "⭐",
    },
  ];

  // Leaderboard data
  const leaderboardData = [
    {
      rank: 1,
      username: "CryptoWhale",
      shares: 47,
      likes: 150,
      gemsEarned: 850,
    },
    {
      rank: 2,
      username: "0x7a8c...4f2e",
      shares: 39,
      likes: 120,
      gemsEarned: 650,
    },
    {
      rank: 3,
      username: "DiamondTrader",
      shares: 35,
      likes: 100,
      gemsEarned: 600,
    },
    { rank: 4, username: "DeFiMaster", shares: 28, likes: 80, gemsEarned: 450 },
    {
      rank: 5,
      username: "0x9b3f...1a2c",
      shares: 24,
      likes: 60,
      gemsEarned: 400,
    },
  ];

  // Top traders from last week
  const topTraders = [
    {
      username: "AlphaTrader",
      stat: "Best gain",
      statValue: "+342%",
      cardImage: "",
    },
    {
      username: "PortfolioKing",
      stat: "Highest volume",
      statValue: "$156K",
      cardImage: "",
    },
    {
      username: "DiamondHODLer",
      stat: "Longest hold",
      statValue: "127 days",
      cardImage: "",
    },
  ];

  // Countdown timer effect
  useEffect(() => {
    const interval = setInterval(() => {
      setTimeRemaining((prev) => {
        let { days, hours, minutes, seconds } = prev;

        if (seconds > 0) {
          seconds--;
        } else if (minutes > 0) {
          minutes--;
          seconds = 59;
        } else if (hours > 0) {
          hours--;
          minutes = 59;
          seconds = 59;
        } else if (days > 0) {
          days--;
          hours = 23;
          minutes = 59;
          seconds = 59;
        }

        return { days, hours, minutes, seconds };
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const handleShareOnX = () => {
    const text = encodeURIComponent(
      `Just proved my portfolio on @AlloX! 🚀\n\nCheck out my ${selectedCategory === "top-performer" ? "Top Performer" : selectedCategory === "portfolio-snapshot" ? "Portfolio Snapshot" : "Diamond Hands"} card.\n\n#ProveYourPortfolio #AlloX`,
    );
    window.open(`https://twitter.com/intent/tweet?text=${text}`, "_blank");
  };

  const handleDownloadCard = () => {
    // In production, this would generate and download the actual card
    alert(
      "Card downloaded! (In production, this would download the generated card image)",
    );
  };

  const handleShareBadge = (badgeId) => {
    const badge = badges.find((b) => b.id === badgeId);
    if (!badge) return;

    const text = encodeURIComponent(
      `Just unlocked "${badge.name}" ${badge.icon} on @AlloX!\n\n${badge.description}\n\n#AlloX`,
    );
    window.open(`https://twitter.com/intent/tweet?text=${text}`, "_blank");
  };

  return (
    <div className="space-y-4">
      {/* Campaign Hero */}
      <div className="glass-card p-8 bg-gradient-to-br from-purple-500/10 via-blue-500/10 to-indigo-500/10 border-purple-500/30">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="flex-1">
            {/* <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-6 h-6 text-purple-600" />
              <span className="text-sm font-bold text-purple-600 uppercase tracking-wider">
                Weekly Campaign
              </span>
            </div> */}
            <h1 className="text-4xl font-bold text-gray-900 mb-3">
              Prove Your Portfolio
            </h1>
            <p className="text-gray-700 mb-4 max-w-2xl">
              Generate and share your custom card, compete for the leaderboard,
              and earn rewards.
            </p>
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-amber-50 border border-amber-200 rounded-lg">
              <Lock className="w-4 h-4 text-amber-600" />
              <span className="text-sm font-semibold text-amber-900">
                On-chain portfolios only
              </span>
            </div>
          </div>

          <div className="flex flex-col items-end gap-4">
            {/* Prize Pool */}
            <div className="glass-card px-4 py-2 bg-gradient-to-r from-amber-500/20 to-orange-600/20 border-amber-500/40">
            <div className="flex items-center gap-2">
              <div>
                <div className="text-xs text-gray-600 font-medium">
                  Total Prize Pool
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-gray-900 font-bold">$500,000</span>
                  <div className="flex items-center text-amber-600">
                    ( <Gem className="w-5 h-5 text-amber-600 pr-1" />
                    <div className="font-bold  text-xs sm:text-base text-amber-600">
                      100,000
                    </div>
                    )
                  </div>
                </div>
              </div>
            </div>
          </div>

            {/* Countdown Timer */}
            <div className="glass-card px-6 py-3 min-w-[280px]">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="w-4 h-4 text-gray-600" />
                <span className="text-xs font-semibold text-gray-600 uppercase">
                  Ends Sunday 23:59 UTC
                </span>
              </div>
              <div className="flex items-center gap-2 justify-center">
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-900">
                    {timeRemaining.days}
                  </div>
                  <div className="text-[10px] text-gray-600 uppercase">
                    Days
                  </div>
                </div>
                <div className="text-xl text-gray-400">:</div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-900">
                    {String(timeRemaining.hours).padStart(2, "0")}
                  </div>
                  <div className="text-[10px] text-gray-600 uppercase">
                    Hours
                  </div>
                </div>
                <div className="text-xl text-gray-400">:</div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-900">
                    {String(timeRemaining.minutes).padStart(2, "0")}
                  </div>
                  <div className="text-[10px] text-gray-600 uppercase">Min</div>
                </div>
                <div className="text-xl text-gray-400">:</div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-900">
                    {String(timeRemaining.seconds).padStart(2, "0")}
                  </div>
                  <div className="text-[10px] text-gray-600 uppercase">Sec</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Card Generator Section */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Left: Category Selector */}
        <div>
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            Choose Your Card Type
          </h2>
          <div className="space-y-3">
            {/* Top Performer */}
            <motion.button
              onClick={() => setSelectedCategory("top-performer")}
              className={`w-full text-left p-5 rounded-xl border-2 transition-all ${
                selectedCategory === "top-performer"
                  ? "border-purple-500 bg-gradient-to-br from-purple-50 to-indigo-50 shadow-lg"
                  : "border-gray-200 bg-white/40 hover:border-gray-300 hover:shadow-md"
              }`}
              whileTap={{ scale: 0.98 }}
            >
              <div className="flex items-start gap-4">
                <div
                  className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                    selectedCategory === "top-performer"
                      ? "bg-purple-500"
                      : "bg-gray-100"
                  }`}
                >
                  <TrendingUp
                    className={`w-6 h-6 ${selectedCategory === "top-performer" ? "text-white" : "text-gray-600"}`}
                  />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="font-bold text-gray-900">Top Performer</h3>
                    {selectedCategory === "top-performer" && (
                      <CheckCircle2 className="w-5 h-5 text-purple-600" />
                    )}
                  </div>
                  <p className="text-sm text-gray-600">
                    Show off your best % gain this week
                  </p>
                  {selectedCategory === "top-performer" && (
                    <div className="mt-3 pt-3 border-t border-purple-200">
                      <div className="text-xs text-gray-600 mb-1">
                        Your stat:
                      </div>
                      <div className="text-lg font-bold text-purple-600">
                        {userStats.topPerformer.gain}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </motion.button>

            {/* Portfolio Snapshot */}
            <motion.button
              onClick={() => setSelectedCategory("portfolio-snapshot")}
              className={`w-full text-left p-5 rounded-xl border-2 transition-all ${
                selectedCategory === "portfolio-snapshot"
                  ? "border-blue-500 bg-gradient-to-br from-blue-50 to-cyan-50 shadow-lg"
                  : "border-gray-200 bg-white/40 hover:border-gray-300 hover:shadow-md"
              }`}
              whileTap={{ scale: 0.98 }}
            >
              <div className="flex items-start gap-4">
                <div
                  className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                    selectedCategory === "portfolio-snapshot"
                      ? "bg-blue-500"
                      : "bg-gray-100"
                  }`}
                >
                  <Wallet
                    className={`w-6 h-6 ${selectedCategory === "portfolio-snapshot" ? "text-white" : "text-gray-600"}`}
                  />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="font-bold text-gray-900">
                      Portfolio Snapshot
                    </h3>
                    {selectedCategory === "portfolio-snapshot" && (
                      <CheckCircle2 className="w-5 h-5 text-blue-600" />
                    )}
                  </div>
                  <p className="text-sm text-gray-600">Total value</p>
                  {selectedCategory === "portfolio-snapshot" && (
                    <div className="mt-3 pt-3 border-t border-blue-200">
                      <div className="text-xs text-gray-600 mb-1">
                        Your portfolio:
                      </div>
                      <div className="text-lg font-bold text-blue-600">
                        {userStats.portfolioSnapshot.totalValue}
                      </div>
                      <div className="text-xs text-gray-600 mt-1">
                        {userStats.portfolioSnapshot.chains} chains · Top:{" "}
                        {userStats.portfolioSnapshot.topChain}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </motion.button>

            {/* Diamond Hands */}
            <motion.button
              onClick={() => setSelectedCategory("diamond-hands")}
              className={`w-full text-left p-5 rounded-xl border-2 transition-all ${
                selectedCategory === "diamond-hands"
                  ? "border-amber-500 bg-gradient-to-br from-amber-50 to-yellow-50 shadow-lg"
                  : "border-gray-200 bg-white/40 hover:border-gray-300 hover:shadow-md"
              }`}
              whileTap={{ scale: 0.98 }}
            >
              <div className="flex items-start gap-4">
                <div
                  className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                    selectedCategory === "diamond-hands"
                      ? "bg-amber-500"
                      : "bg-gray-100"
                  }`}
                >
                  <Gem
                    className={`w-6 h-6 ${selectedCategory === "diamond-hands" ? "text-white" : "text-gray-600"}`}
                  />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="font-bold text-gray-900">Diamond Hands</h3>
                    {selectedCategory === "diamond-hands" && (
                      <CheckCircle2 className="w-5 h-5 text-amber-600" />
                    )}
                  </div>
                  <p className="text-sm text-gray-600">
                    Longest held winning position
                  </p>
                  {selectedCategory === "diamond-hands" && (
                    <div className="mt-3 pt-3 border-t border-amber-200">
                      <div className="text-xs text-gray-600 mb-1">
                        Your best hold:
                      </div>
                      <div className="text-lg font-bold text-amber-600">
                        {userStats.diamondHands.position} ·{" "}
                        {userStats.diamondHands.heldDays} days
                      </div>
                      <div className="text-xs text-gray-600 mt-1">
                        {userStats.diamondHands.gain} gain
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </motion.button>

            {/* New Portfolio */}
            <motion.button
              onClick={() => setSelectedCategory("new-portfolio")}
              className={`w-full text-left p-5 rounded-xl border-2 transition-all ${
                selectedCategory === "new-portfolio"
                  ? "border-green-500 bg-gradient-to-br from-green-50 to-emerald-50 shadow-lg"
                  : "border-gray-200 bg-white/40 hover:border-gray-300 hover:shadow-md"
              }`}
              whileTap={{ scale: 0.98 }}
            >
              <div className="flex items-start gap-4">
                <div
                  className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                    selectedCategory === "new-portfolio"
                      ? "bg-green-500"
                      : "bg-gray-100"
                  }`}
                >
                  <PlusCircle
                    className={`w-6 h-6 ${selectedCategory === "new-portfolio" ? "text-white" : "text-gray-600"}`}
                  />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="font-bold text-gray-900">New Portfolio</h3>
                    {selectedCategory === "new-portfolio" && (
                      <CheckCircle2 className="w-5 h-5 text-green-600" />
                    )}
                  </div>
                  <p className="text-sm text-gray-600">
                    Start with a new portfolio
                  </p>
                  {selectedCategory === "new-portfolio" && (
                    <div className="mt-3 pt-3 border-t border-green-200">
                      <div className="text-xs text-gray-600 mb-1">
                        Your new portfolio:
                      </div>
                      <div className="text-lg font-bold text-green-600">
                        {userStats.newPortfolio.amount}
                      </div>
                      <div className="text-xs text-gray-600 mt-1">
                        Tokens: {userStats.newPortfolio.tokens.join(", ")}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </motion.button>
          </div>
        </div>

        {/* Right: Card Preview */}
        <div>
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            Your Card Preview
          </h2>
          <AnimatePresence mode="wait">
            {!isWalletConnected ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="aspect-square w-full max-w-[500px] mx-auto glass-card rounded-2xl flex flex-col items-center justify-center p-8"
              >
                <div className="text-center">
                  <Wallet className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                  <h3 className="font-bold text-gray-900 text-lg mb-2">
                    Connect Wallet to View Card
                  </h3>
                  <p className="text-gray-600 text-sm mb-6">
                    Connect your wallet to generate your personalized portfolio
                    card
                  </p>
                  <button
                    onClick={() => setIsWalletConnected(true)}
                    className="btn-primary py-3 px-6"
                  >
                    Connect Wallet
                  </button>
                </div>
              </motion.div>
            ) : selectedCategory ? (
              <motion.div
                key={selectedCategory}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2 }}
              >
                {/* Card Preview - Square Format */}
                <div
                  className={`aspect-square w-full max-w-[500px] mx-auto rounded-2xl p-8 relative overflow-hidden shadow-2xl mb-4 ${
                    selectedCategory === "top-performer"
                      ? "bg-gradient-to-br from-purple-900 via-indigo-900 to-violet-900"
                      : selectedCategory === "portfolio-snapshot"
                        ? "bg-gradient-to-br from-blue-900 via-cyan-900 to-teal-900"
                        : selectedCategory === "diamond-hands"
                          ? "bg-gradient-to-br from-amber-900 via-orange-900 to-yellow-900"
                          : "bg-gradient-to-br from-green-900 via-emerald-900 to-lime-900"
                  }`}
                >
                  {/* Background Pattern */}
                  <div className="absolute inset-0 opacity-10">
                    <div
                      className={`absolute top-0 right-0 w-96 h-96 rounded-full blur-3xl ${
                        selectedCategory === "top-performer"
                          ? "bg-purple-500"
                          : selectedCategory === "portfolio-snapshot"
                            ? "bg-blue-500"
                            : selectedCategory === "diamond-hands"
                              ? "bg-amber-500"
                              : "bg-green-500"
                      }`}
                    ></div>
                    <div
                      className={`absolute bottom-0 left-0 w-96 h-96 rounded-full blur-3xl ${
                        selectedCategory === "top-performer"
                          ? "bg-indigo-500"
                          : selectedCategory === "portfolio-snapshot"
                            ? "bg-cyan-500"
                            : selectedCategory === "diamond-hands"
                              ? "bg-orange-500"
                              : "bg-emerald-500"
                      }`}
                    ></div>
                  </div>

                  {/* Grid Pattern Overlay */}
                  <div
                    className="absolute inset-0 opacity-5"
                    style={{
                      backgroundImage:
                        "linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)",
                      backgroundSize: "30px 30px",
                    }}
                  ></div>

                  {/* Content */}
                  <div className="relative h-full flex flex-col justify-between">
                    {/* Header */}
                    <div className="flex items-start justify-between">
                      <div className="text-white font-bold text-2xl">AlloX</div>
                      <div className="px-3 py-1.5 bg-white/10 backdrop-blur-md rounded-full text-white text-xs font-bold border border-white/20">
                        {selectedCategory === "top-performer"
                          ? "Top Performer"
                          : selectedCategory === "portfolio-snapshot"
                            ? "Portfolio Snapshot"
                            : selectedCategory === "diamond-hands"
                              ? "Diamond Hands"
                              : "New Portfolio"}
                      </div>
                    </div>

                    {/* Main Content - Centered */}
                    <div className="flex flex-col items-center justify-center text-center">
                      <div className="text-white/70 text-sm mb-3 uppercase tracking-widest font-semibold">
                        {selectedCategory === "top-performer"
                          ? "This Week's Gain"
                          : selectedCategory === "portfolio-snapshot"
                            ? "Total Portfolio Value"
                            : selectedCategory === "diamond-hands"
                              ? "Longest Winning Hold"
                              : "Investment Amount"}
                      </div>
                      <div className="text-7xl font-bold text-white mb-3 tracking-tight">
                        {selectedCategory === "top-performer"
                          ? userStats.topPerformer.gain
                          : selectedCategory === "portfolio-snapshot"
                            ? userStats.portfolioSnapshot.totalValue
                            : selectedCategory === "diamond-hands"
                              ? `${userStats.diamondHands.heldDays} days`
                              : userStats.newPortfolio.amount}
                      </div>
                      <div className="text-white/60 text-base">
                        {selectedCategory === "top-performer" &&
                          userStats.topPerformer.period}
                        {selectedCategory === "portfolio-snapshot" &&
                          "On-chain Portfolio"}
                        {selectedCategory === "diamond-hands" &&
                          `${userStats.diamondHands.position} · ${userStats.diamondHands.gain} gain`}
                        {selectedCategory === "new-portfolio" &&
                          userStats.newPortfolio.tokens.join(" · ")}
                      </div>
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-white/60 text-sm font-semibold">
                          #ProveYourPortfolio
                        </span>
                      </div>
                      <div className="text-white/60 text-sm font-mono">
                        0x7a8c...4f2e
                      </div>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 max-w-[500px] mx-auto">
                  <button
                    onClick={handleShareOnX}
                    className="flex-1 btn-primary py-3 flex items-center justify-center gap-2"
                  >
                    <Share2 className="w-4 h-4" />
                    Share on X
                  </button>
                  <button
                    onClick={handleDownloadCard}
                    className="px-6 py-3 bg-white/60 backdrop-blur-sm border border-gray-200 rounded-xl text-gray-700 font-semibold hover:bg-white/80 transition-all flex items-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    Download
                  </button>
                </div>
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="aspect-square w-full max-w-[500px] mx-auto glass-card rounded-2xl flex items-center justify-center"
              >
                <div className="text-center text-gray-500">
                  <Sparkles className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                  <p className="font-semibold">Select a card type to preview</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Milestone Reward Tiers */}
      <div className="glass-card p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900">Milestone Rewards</h2>
          <div className="text-sm text-gray-600">
            Complete tiers to maximize your earnings
          </div>
        </div>

        <div className="grid md:grid-cols-4 gap-4">
          {milestoneTiers.map((tier) => (
            <div
              key={tier.tier}
              className={`p-5 rounded-xl border-2 transition-all ${
                tier.completed
                  ? "border-green-500 bg-gradient-to-br from-green-50 to-emerald-50"
                  : tier.progress !== undefined
                    ? "border-blue-500 bg-gradient-to-br from-blue-50 to-cyan-50"
                    : "border-gray-200 bg-white/40"
              }`}
            >
              {/* Tier Badge */}
              <div className="flex items-center justify-between mb-3">
                <div
                  className={`px-2 py-1 rounded-lg text-xs font-bold ${
                    tier.completed
                      ? "bg-green-500 text-white"
                      : tier.progress !== undefined
                        ? "bg-blue-500 text-white"
                        : "bg-gray-200 text-gray-700"
                  }`}
                >
                  Tier {tier.tier}
                </div>
                {tier.completed && (
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                )}
              </div>

              {/* Action */}
              <p className="text-sm text-gray-700 mb-3 min-h-[40px]">
                {tier.action}
              </p>

              {/* Progress */}
              {tier.progress !== undefined && tier.total && (
                <div className="mb-3">
                  <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                    <span>Progress</span>
                    <span className="font-bold">
                      {tier.progress}/{tier.total}
                    </span>
                  </div>
                  <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-gradient-to-r from-blue-500 to-cyan-500"
                      initial={{ width: 0 }}
                      animate={{
                        width: `${(tier.progress / tier.total) * 100}%`,
                      }}
                      transition={{ duration: 0.5 }}
                    />
                  </div>
                </div>
              )}

              {/* Reward */}
              <div className="flex items-center gap-1.5">
                <Gem
                  className={`w-4 h-4 ${tier.completed ? "text-green-600" : "text-purple-600"}`}
                />
                <span className="font-bold text-gray-900">
                  {tier.tier === 4
                    ? "Special Perk + Spotlight"
                    : `+${tier.reward} gems`}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Leaderboard Teaser + Milestone Unlocks */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Leaderboard Teaser */}
        <div className="glass-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Trophy className="w-6 h-6 text-amber-600" />
              Top Sharers This Week
            </h2>
            <button className="text-sm font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1">
              View Full
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Opt-in Toggle */}

          {/* Top 5 */}
          <div className="space-y-2">
            {leaderboardData.map((entry) => (
              <div
                key={entry.rank}
                className={`p-3 rounded-lg ${
                  entry.rank === 1
                    ? "bg-gradient-to-r from-amber-50 to-yellow-50 border-2 border-amber-200"
                    : entry.rank === 2
                      ? "bg-gradient-to-r from-gray-50 to-slate-50 border border-gray-200"
                      : entry.rank === 3
                        ? "bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-200"
                        : "bg-white/40 border border-gray-100"
                }`}
              >
                <div className="flex items-center gap-3">
                  {/* Rank */}
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                      entry.rank === 1
                        ? "bg-amber-500 text-white"
                        : entry.rank === 2
                          ? "bg-gray-400 text-white"
                          : entry.rank === 3
                            ? "bg-orange-500 text-white"
                            : "bg-gray-100 text-gray-700"
                    }`}
                  >
                    {entry.rank}
                  </div>

                  {/* Username */}
                  <div className="flex-1">
                    <div className="font-semibold text-gray-900 text-sm">
                      {entry.username}
                    </div>
                    <div className="text-xs text-gray-600 flex items-center gap-2">
                      <span>{entry.shares} shares</span>
                      <span className="text-gray-400">·</span>
                      <span className="flex items-center gap-1">
                        <Heart className="w-3 h-3" />
                        {entry.likes}
                      </span>
                    </div>
                  </div>

                  {/* Gems */}
                  <div className="flex items-center gap-1 px-2 py-1 bg-white/60 rounded-lg">
                    <Gem className="w-3 h-3 text-purple-600" />
                    <span className="text-sm font-bold text-gray-900">
                      {entry.gemsEarned}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Milestone Unlocks */}
        <div className="glass-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Award className="w-6 h-6 text-purple-600" />
              Achievement Badges
            </h2>
            <div className="text-sm text-gray-600">
              {badges.filter((b) => b.unlocked).length}/{badges.length} unlocked
            </div>
          </div>

          {/* Horizontal Scroll */}
          <div className="overflow-x-auto -mx-6 px-6">
            <div className="flex gap-3 pb-2">
              {badges.map((badge) => (
                <div
                  key={badge.id}
                  className={`flex-shrink-0 w-[160px] p-4 rounded-xl border-2 transition-all ${
                    badge.unlocked
                      ? "border-purple-500 bg-gradient-to-br from-purple-50 to-indigo-50"
                      : "border-gray-200 bg-gray-50 opacity-60"
                  }`}
                >
                  <div className="text-center">
                    <div className="text-3xl mb-2">{badge.icon}</div>
                    <div className="font-bold text-sm text-gray-900 mb-1">
                      {badge.name}
                    </div>
                    <div className="text-xs text-gray-600 mb-3">
                      {badge.description}
                    </div>

                    {badge.unlocked ? (
                      <button
                        onClick={() => handleShareBadge(badge.id)}
                        className="w-full py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1"
                      >
                        <Share2 className="w-3 h-3" />
                        Share
                      </button>
                    ) : (
                      <div className="w-full py-1.5 bg-gray-200 text-gray-500 text-xs font-semibold rounded-lg flex items-center justify-center gap-1">
                        <Lock className="w-3 h-3" />
                        Locked
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Top Trader Spotlight */}
    </div>
  );
}
