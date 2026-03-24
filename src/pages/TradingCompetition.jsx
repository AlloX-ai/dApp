import {
  Trophy,
  Gem,
  TrendingUp,
  Wallet,
  BarChart3,
  User,
  Crown,
  Medal,
  Award,
  FileText,
  X,
} from "lucide-react";
import { useState } from "react";

export function TradingCompetitionPage() {
  const [showTermsModal, setShowTermsModal] = useState(false);

  // Static leaderboard data (positions 1-100)
  const leaderboardData = Array.from({ length: 100 }, (_, i) => {
    const position = i + 1;

    // Calculate rewards based on position - Top 10 all different
    let gemReward = 0;
    if (position === 1) gemReward = 10000;
    else if (position === 2) gemReward = 7500;
    else if (position === 3) gemReward = 5000;
    else if (position === 4) gemReward = 4000;
    else if (position === 5) gemReward = 3500;
    else if (position === 6) gemReward = 3000;
    else if (position === 7) gemReward = 2500;
    else if (position === 8) gemReward = 2000;
    else if (position === 9) gemReward = 1500;
    else if (position === 10) gemReward = 1250;
    else if (position <= 25) gemReward = 1000;
    else if (position <= 50) gemReward = 500;
    else if (position <= 100) gemReward = 250;

    // Static data with decreasing values
    const portfoliosCreated = Math.max(
      1,
      100 - position + Math.floor(position / 10),
    );
    const totalValue = 150000 - position * 1200 + (position % 7) * 100;

    return {
      position,
      address: `0x${(position * 123456).toString(16).substring(0, 4)}...${(position * 789).toString(16).substring(0, 4)}`,
      portfoliosCreated,
      totalValue,
      gemReward,
    };
  });

  // Mock current user (outside top 100 for demo purposes)
  const currentUserPosition = 150;
  const currentUserData = {
    position: currentUserPosition,
    address: "0x7a8c...4f2e", // Your wallet
    portfoliosCreated: 3,
    totalValue: 5420,
    gemReward: 0, // No reward outside top 100
  };

  const isUserInTopHundred = currentUserPosition <= 100;

  return (
    <div className="">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 mb-2">
            Trading Competition
          </h2>
          <p className="text-gray-600">
            Create on-chain portfolios on BNB Chain and compete for rewards
          </p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-600 rounded-xl shadow-lg">
          <Trophy size={18} className="text-white" />
          <span className="text-white text-sm font-bold">100,000 💎 Pool</span>
        </div>
      </div>

      {/* Total Reward Pool Card */}
      <div className="glass-card p-8 text-center">
        <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl mb-4 shadow-xl">
          <Gem className="w-10 h-10 text-white" />
        </div>
        <h3 className="text-2xl font-bold text-gray-900 mb-2">
          100,000 Gems Reward Pool
        </h3>
        <p className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-amber-500 to-orange-600 mb-4">
          $500,000 USD
        </p>
        <div className="max-w-2xl mx-auto space-y-4">
          <div className="flex items-start gap-3 text-left">
            <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 mt-0.5">
              <BarChart3 className="w-4 h-4 text-blue-600" />
            </div>
            <p className="text-gray-600 text-sm">
              <strong className="text-gray-900">How it works:</strong> Create
              on-chain portfolios on BNB Chain. Rankings are based on the total
              USD value of all portfolios you create during the competition
              period.
            </p>
          </div>
          <div className="flex items-start gap-3 text-left">
            <div className="w-6 h-6 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0 mt-0.5">
              <TrendingUp className="w-4 h-4 text-purple-600" />
            </div>
            <p className="text-gray-600 text-sm">
              <strong className="text-gray-900">Top 100 winners:</strong> The
              top 100 participants with the highest total portfolio value will
              share the 100,000 Gems reward pool.
            </p>
          </div>
        </div>
      </div>

      {/* Leaderboard */}
      <div className="glass-card p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Trophy className="w-6 h-6 text-amber-500" />
            Top 100 Leaderboard
          </h3>
          <button
            onClick={() => setShowTermsModal(true)}
            className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            <FileText className="w-4 h-4" />
            Terms of Campaign
          </button>
        </div>

        {/* Table Header */}
        <div className="overflow-x-auto">
          <div className="min-w-[600px]">
            <div className="grid grid-cols-[80px_1fr_140px_140px_140px] gap-4 px-4 py-3 bg-gray-50/60 rounded-lg mb-2">
              <div className="text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Rank
              </div>
              <div className="text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Wallet Address
              </div>
              <div className="text-xs font-semibold text-gray-600 uppercase tracking-wider text-right">
                Portfolios
              </div>
              <div className="text-xs font-semibold text-gray-600 uppercase tracking-wider text-right">
                Total Value
              </div>
              <div className="text-xs font-semibold text-gray-600 uppercase tracking-wider text-right">
                Reward
              </div>
            </div>

            {/* Leaderboard Rows - Scrollable */}
            <div className="space-y-1 max-h-[600px] overflow-y-auto pr-2">
              {leaderboardData.map((entry) => {
                // const isTopThree = entry.position <= 3;
                const isCurrentUser =
                  entry.address === currentUserData.address &&
                  isUserInTopHundred;
                const bgColor = isCurrentUser
                  ? "bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-500"
                  : entry.position === 1
                    ? "bg-gradient-to-r from-amber-50 to-yellow-50"
                    : entry.position === 2
                      ? "bg-gradient-to-r from-gray-50 to-slate-50"
                      : entry.position === 3
                        ? "bg-gradient-to-r from-orange-50 to-amber-50"
                        : "bg-white/40";

                return (
                  <div
                    key={entry.position}
                    className={`grid grid-cols-[80px_1fr_140px_140px_140px] gap-4 px-4 py-3 ${bgColor} backdrop-blur-sm border border-white/60 rounded-lg hover:shadow-md transition-all ${isCurrentUser ? "ring-2 ring-blue-400" : ""}`}
                  >
                    {/* Rank */}
                    <div className="flex items-center gap-2">
                      {entry.position === 1 ? (
                        <div className="w-8 h-8 rounded-full flex items-center justify-center bg-gradient-to-br from-amber-400 to-yellow-500 shadow-lg">
                          <Crown className="w-5 h-5 text-white" />
                        </div>
                      ) : entry.position === 2 ? (
                        <div className="w-8 h-8 rounded-full flex items-center justify-center bg-gradient-to-br from-gray-300 to-slate-400 shadow-lg">
                          <Medal className="w-5 h-5 text-white" />
                        </div>
                      ) : entry.position === 3 ? (
                        <div className="w-8 h-8 rounded-full flex items-center justify-center bg-gradient-to-br from-orange-400 to-amber-500 shadow-lg">
                          <Award className="w-5 h-5 text-white" />
                        </div>
                      ) : (
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center ${isCurrentUser ? "bg-blue-500" : "bg-gray-100"}`}
                        >
                          <span
                            className={`text-sm font-bold ${isCurrentUser ? "text-white" : "text-gray-700"}`}
                          >
                            {entry.position}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Wallet Address */}
                    <div className="flex items-center">
                      <div className="flex items-center gap-2">
                        <Wallet className="w-4 h-4 text-gray-400" />
                        <span className="font-mono text-sm text-gray-700">
                          {entry.address}
                        </span>
                        {isCurrentUser && (
                          <span className="text-xs font-bold text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full">
                            YOU
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Portfolios Created */}
                    <div className="flex items-center justify-end">
                      <span className="text-sm font-semibold text-gray-900">
                        {entry.portfoliosCreated}
                      </span>
                    </div>

                    {/* Total Value */}
                    <div className="flex items-center justify-end">
                      <span className="text-sm font-bold text-gray-900">
                        ${entry.totalValue.toLocaleString()}
                      </span>
                    </div>

                    {/* Reward */}
                    <div className="flex items-center justify-end">
                      <div className="flex items-center gap-1.5">
                        <Gem className="w-4 h-4 text-purple-600" />
                        <span className="text-sm font-bold text-gray-900">
                          {entry.gemReward.toLocaleString()}
                        </span>
                        <span className="text-xs text-gray-600">
                          (${(entry.gemReward * 5).toLocaleString()})
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Current User Position Indicator (if not in top 100) */}
        {!isUserInTopHundred && (
          <div className="mt-6 pt-6 border-t border-gray-200">
            <div className="flex items-center gap-2 mb-3">
              <User className="w-5 h-5 text-blue-600" />
              <h4 className="text-sm font-bold text-gray-900">Your Position</h4>
            </div>
            <div className="grid grid-cols-[80px_1fr_140px_140px_140px] gap-4 px-4 py-3 bg-gradient-to-r from-blue-50 to-indigo-50 backdrop-blur-sm border-2 border-blue-500 rounded-lg shadow-md">
              {/* Rank */}
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center">
                  <span className="text-sm font-bold text-white">
                    {currentUserData.position}
                  </span>
                </div>
              </div>

              {/* Wallet Address */}
              <div className="flex items-center">
                <div className="flex items-center gap-2">
                  <Wallet className="w-4 h-4 text-gray-400" />
                  <span className="font-mono text-sm text-gray-700">
                    {currentUserData.address}
                  </span>
                  <span className="text-xs font-bold text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full">
                    YOU
                  </span>
                </div>
              </div>

              {/* Portfolios Created */}
              <div className="flex items-center justify-end">
                <span className="text-sm font-semibold text-gray-900">
                  {currentUserData.portfoliosCreated}
                </span>
              </div>

              {/* Total Value */}
              <div className="flex items-center justify-end">
                <span className="text-sm font-bold text-gray-900">
                  ${currentUserData.totalValue.toLocaleString()}
                </span>
              </div>

              {/* Reward */}
              <div className="flex items-center justify-end">
                <div className="flex flex-col items-end">
                  <span className="text-xs text-gray-500 mb-0.5">
                    No reward
                  </span>
                  <span className="text-xs text-gray-600 italic">
                    (Top 100 only)
                  </span>
                </div>
              </div>
            </div>
            <p className="text-xs text-gray-600 mt-3 text-center">
              Keep trading! You need to reach the top 100 to earn rewards.
            </p>
          </div>
        )}
      </div>

      {/* Reward Tiers Info */}
      <div className="glass-card p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4">
          Reward Distribution
        </h3>
        <div className="grid md:grid-cols-4 gap-4">
          <div className="bg-gradient-to-br from-amber-50 to-yellow-50 border border-amber-200 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <Crown className="w-5 h-5 text-amber-600" />
              <span className="font-bold text-gray-900">Top 3</span>
            </div>
            <p className="text-xl font-bold text-amber-600 mb-1">
              10,000 - 5,000 💎
            </p>
            <p className="text-xs text-gray-600">$50,000 - $25,000 USD</p>
          </div>

          <div className="bg-gradient-to-br from-purple-50 to-indigo-50 border border-purple-200 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <Trophy className="w-5 h-5 text-purple-600" />
              <span className="font-bold text-gray-900">Rank 4-10</span>
            </div>
            <p className="text-xl font-bold text-purple-600 mb-1">
              4,000 - 1,250 💎
            </p>
            <p className="text-xs text-gray-600">$20,000 - $6,250 USD</p>
          </div>

          <div className="bg-gradient-to-br from-blue-50 to-cyan-50 border border-blue-200 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <Medal className="w-5 h-5 text-blue-600" />
              <span className="font-bold text-gray-900">Rank 11-50</span>
            </div>
            <p className="text-xl font-bold text-blue-600 mb-1">
              1,000 - 500 💎
            </p>
            <p className="text-xs text-gray-600">$5,000 - $2,500 USD</p>
          </div>

          <div className="bg-gradient-to-br from-gray-50 to-slate-50 border border-gray-200 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <Award className="w-5 h-5 text-gray-600" />
              <span className="font-bold text-gray-900">Rank 51-100</span>
            </div>
            <p className="text-xl font-bold text-gray-600 mb-1">250 💎</p>
            <p className="text-xs text-gray-600">$1,250 USD</p>
          </div>
        </div>
      </div>

      {/* Terms and Conditions Modal */}
      {showTermsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowTermsModal(false)}
          />

          {/* Modal */}
          <div className="relative bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[80vh] overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-amber-50 to-orange-50">
              <div className="flex items-center gap-3">
                <FileText className="w-6 h-6 text-amber-600" />
                <h3 className="text-2xl font-bold text-gray-900">
                  Trading Competition Terms
                </h3>
              </div>
              <button
                className="text-gray-500 hover:text-gray-700 transition-colors"
                onClick={() => setShowTermsModal(false)}
              >
                <X size={24} />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto max-h-[60vh] space-y-6">
              {/* Introduction */}
              <div>
                <p className="text-sm text-gray-700 leading-relaxed">
                  By participating in the AlloX Trading Competition, you
                  acknowledge and agree to be bound by these terms and
                  conditions. Please read them carefully before creating
                  portfolios.
                </p>
              </div>

              {/* Eligibility */}
              <div>
                <h4 className="text-lg font-bold text-gray-900 mb-2 flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-amber-500" />
                  Eligibility
                </h4>
                <ul className="space-y-2 text-sm text-gray-700 ml-4">
                  <li className="flex gap-2">
                    <span className="text-amber-500 font-bold">•</span>
                    <span>
                      Participants must have a valid wallet connected to BNB
                      Chain
                    </span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-amber-500 font-bold">•</span>
                    <span>
                      Must be 18 years or older (or legal age in your
                      jurisdiction)
                    </span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-amber-500 font-bold">•</span>
                    <span>
                      Residents of restricted jurisdictions may be prohibited
                      from participating
                    </span>
                  </li>
                </ul>
              </div>

              {/* Competition Rules */}
              <div>
                <h4 className="text-lg font-bold text-gray-900 mb-2 flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-purple-500" />
                  Competition Rules
                </h4>
                <ul className="space-y-2 text-sm text-gray-700 ml-4">
                  <li className="flex gap-2">
                    <span className="text-purple-500 font-bold">•</span>
                    <span>
                      Rankings based on total USD value of all on-chain
                      portfolios created during the competition period
                    </span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-purple-500 font-bold">•</span>
                    <span>
                      Only portfolios created on BNB Chain count toward your
                      ranking
                    </span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-purple-500 font-bold">•</span>
                    <span>
                      Top 100 participants share the 100,000 Gems ($500,000 USD)
                      reward pool
                    </span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-purple-500 font-bold">•</span>
                    <span>
                      Leaderboard updates in real-time but final rankings
                      determined at campaign end
                    </span>
                  </li>
                </ul>
              </div>

              {/* Prohibited Activities */}
              <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                <h4 className="text-lg font-bold text-red-900 mb-2 flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-red-500" />
                  Prohibited Activities & Disqualification
                </h4>
                <p className="text-sm text-red-800 mb-3 font-semibold">
                  The following activities are strictly prohibited and will
                  result in immediate disqualification:
                </p>
                <ul className="space-y-2 text-sm text-red-900 ml-4">
                  <li className="flex gap-2">
                    <span className="text-red-500 font-bold">✕</span>
                    <span>
                      <strong>Wash Trading:</strong> Creating fake transactions
                      or circular trading to inflate portfolio value
                    </span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-red-500 font-bold">✕</span>
                    <span>
                      <strong>Multiple Accounts:</strong> Using multiple wallets
                      or accounts to manipulate rankings
                    </span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-red-500 font-bold">✕</span>
                    <span>
                      <strong>Bot Usage:</strong> Employing automated systems to
                      create portfolios or execute trades
                    </span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-red-500 font-bold">✕</span>
                    <span>
                      <strong>Market Manipulation:</strong> Attempting to
                      manipulate token prices to inflate portfolio values
                    </span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-red-500 font-bold">✕</span>
                    <span>
                      <strong>Exploits:</strong> Exploiting bugs, glitches, or
                      vulnerabilities in the platform
                    </span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-red-500 font-bold">✕</span>
                    <span>
                      <strong>Collusion:</strong> Coordinating with other
                      participants to gain unfair advantage
                    </span>
                  </li>
                </ul>
              </div>

              {/* Reward Distribution */}
              <div>
                <h4 className="text-lg font-bold text-gray-900 mb-2 flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-blue-500" />
                  Reward Distribution
                </h4>
                <ul className="space-y-2 text-sm text-gray-700 ml-4">
                  <li className="flex gap-2">
                    <span className="text-blue-500 font-bold">•</span>
                    <span>Rewards distributed in Gems (1 Gem = $5 USD)</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-blue-500 font-bold">•</span>
                    <span>
                      Gems credited to winning wallets within 7 days of campaign
                      end
                    </span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-blue-500 font-bold">•</span>
                    <span>
                      Participants must maintain wallet access to claim rewards
                    </span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-blue-500 font-bold">•</span>
                    <span>
                      Unclaimed rewards after 30 days will be forfeited
                    </span>
                  </li>
                </ul>
              </div>

              {/* Organizer Rights */}
              <div>
                <h4 className="text-lg font-bold text-gray-900 mb-2 flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-gray-500" />
                  Organizer Rights
                </h4>
                <ul className="space-y-2 text-sm text-gray-700 ml-4">
                  <li className="flex gap-2">
                    <span className="text-gray-500 font-bold">•</span>
                    <span>
                      AlloX reserves the right to disqualify participants
                      violating these terms
                    </span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-gray-500 font-bold">•</span>
                    <span>
                      Campaign rules, rewards, and duration may be modified with
                      notice
                    </span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-gray-500 font-bold">•</span>
                    <span>
                      Suspicious activity will be investigated and may result in
                      disqualification
                    </span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-gray-500 font-bold">•</span>
                    <span>
                      Final decisions on rankings and eligibility are at AlloX's
                      sole discretion
                    </span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-gray-500 font-bold">•</span>
                    <span>
                      Campaign may be canceled or suspended at any time for
                      legitimate reasons
                    </span>
                  </li>
                </ul>
              </div>

              {/* Disclaimer */}
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                <p className="text-xs text-gray-600 leading-relaxed">
                  <strong>Disclaimer:</strong> Participation in this competition
                  involves financial risk. Past performance does not guarantee
                  future results. AlloX is not responsible for losses incurred
                  through portfolio creation or trading activities. Participants
                  are solely responsible for their own investment decisions and
                  tax obligations.
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-gray-200 bg-gray-50">
              <button
                className="w-full px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-600 text-white font-bold rounded-xl shadow-lg hover:shadow-xl transition-all"
                onClick={() => setShowTermsModal(false)}
              >
                I Understand & Accept
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
