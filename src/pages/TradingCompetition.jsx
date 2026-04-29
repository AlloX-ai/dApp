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
  ChevronLeft,
  ChevronRight,
  Plus,
  BookOpen,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { PortfolioTutorialModal } from "../components/PortfolioTutorialModal";
import { Link } from "react-router";
import { useTrading } from "../hooks/useTrading";
import getFormattedNumber from "../hooks/get-formatted-number";
import { shortAddress } from "../hooks/shortAddress";

const getLeaderboardEntries = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.leaderboard)) return payload.leaderboard;
  if (Array.isArray(payload?.entries)) return payload.entries;
  if (Array.isArray(payload?.data)) return payload.data;
  return [];
};

const normalizeLeaderboardEntry = (entry, index) => ({
  position: entry?.position ?? entry?.rank ?? index + 1,
  address: entry?.address ?? entry?.walletAddress ?? entry?.userAddress ?? "-",
  portfoliosCreated:
    entry?.portfoliosCreated ?? entry?.portfolioCount ?? entry?.portfolios ?? 0,
  totalValue:
    entry?.totalValue ??
    entry?.totalUsdValue ??
    entry?.totalVolume ??
    entry?.volume ??
    0,
  gemReward: entry?.gemReward ?? entry?.reward ?? entry?.rewardAmount ?? 0,
});

export function TradingCompetitionPage() {
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [showTutorialModal, setShowTutorialModal] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const walletAddress = useSelector((state) => state.wallet.address);
  const {
    competition,
    leaderboard,
    userData,
    fetchActiveCompetition,
    fetchCompetition,
    fetchLeaderboard,
    fetchUserCompetitionData,
  } = useTrading();

  const rawLeaderboardEntries = getLeaderboardEntries(leaderboard);
  const normalizedLeaderboard = rawLeaderboardEntries.map(
    normalizeLeaderboardEntry,
  );
  const hasLeaderboardRecords = normalizedLeaderboard.length > 0;
  const currentUserData = userData || null;
  const userRank = currentUserData?.rank ?? null;
  const hasUserRank = typeof userRank === "number";
  const userRewardGems = currentUserData?.reward?.gems ?? 0;
  const userRewardUsd = currentUserData?.reward?.usdValue ?? userRewardGems * 5;

  // Pagination calculations
  const totalEntries =
    leaderboard?.pagination?.total ?? normalizedLeaderboard.length;
  const totalPages = Math.max(
    1,
    leaderboard?.pagination?.pages ?? Math.ceil(totalEntries / itemsPerPage),
  );
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentPageData = normalizedLeaderboard;

  const handlePreviousPage = () => {
    if (currentPage > 1) setCurrentPage(currentPage - 1);
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) setCurrentPage(currentPage + 1);
  };

  useEffect(() => {
    const loadCompetitionData = async () => {
      try {
        const activeResult = await fetchActiveCompetition();
        const activeCompetitionId = activeResult.competitionId;

        const competitionResult = await fetchCompetition(activeCompetitionId);
        console.log(
          "[TradingCompetition] /competition/:id raw response",
          competitionResult,
        );

        const leaderboardResult = await fetchLeaderboard({
          competitionId: activeCompetitionId,
          page: currentPage,
          limit: itemsPerPage,
        });
        console.log(
          "[TradingCompetition] /competition/:id/leaderboard raw response",
          leaderboardResult,
        );

        if (walletAddress) {
          const userResult = await fetchUserCompetitionData({
            competitionId: activeCompetitionId,
          });
          console.log(
            "[TradingCompetition] /competition/:id/me raw response",
            userResult,
          );
        } else {
          console.log(
            "[TradingCompetition] skipped /competition/:id/me because no wallet is connected yet",
          );
        }
      } catch (fetchError) {
        console.error(
          "[TradingCompetition] failed to load competition data",
          fetchError,
        );
      }
    };

    loadCompetitionData();
  }, [
    currentPage,
    fetchActiveCompetition,
    fetchCompetition,
    fetchLeaderboard,
    fetchUserCompetitionData,
    itemsPerPage,
    walletAddress,
  ]);

  return (
    <div className="space-y-4">
      {/* Title & Reward Pool Banner */}
      <div className="flex flex-col sm:flex-row gap-2 items-center justify-between">
        <h2 className="text-xl sm:text-3xl font-bold text-gray-900">
          The Allocation Race
        </h2>
        <div className="flex flex-col lg:flex-row items-center gap-3">
          <a
            href="https://skynet.certik.com/projects/allox"
            target="_blank"
            className="flex items-center w-full gap-2"
          >
            <div className="text-black font-medium text-xs ">Secured by</div>
            <img
              src="https://cdn.allox.ai/allox/partners/certikLarge.svg"
              className="w-18"
              alt=""
            />
          </a>
          {/* Reward Pool Badge */}
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
        </div>
      </div>

      {/* Compact Two Column Layout */}
      <div className="grid lg:grid-cols-2 gap-4">
        {/* Left: Your Position - Compact */}
        <div className="glass-card p-4">
          <div className="mb-3">
            <h3 className="text-lg font-bold text-gray-900">Your Position</h3>
          </div>

          {/* Compact Position Grid */}
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-500 rounded-xl p-3">
            <div className="space-y-2">
              {/* Rank - Prominent */}
              <div className="flex items-center justify-center pb-2 border-b border-blue-200">
                <div className="flex items-center gap-3">
                  <div>
                    <span className="text-[10px] text-gray-500 uppercase font-semibold block">
                      Your Rank
                    </span>
                    <div className="text-xl font-bold text-gray-900">
                      {hasUserRank ? `#${userRank}` : "Unranked"}
                    </div>
                  </div>
                </div>
              </div>

              {/* Portfolios */}
              <div className="flex items-center justify-between py-1.5 border-b border-blue-200">
                <span className="text-xs text-gray-600 font-semibold">
                  Portfolios Created
                </span>
                <span className="text-lg font-bold text-gray-900">
                  {currentUserData?.portfolioCount ?? 0}
                </span>
              </div>

              {/* Volume */}
              <div className="flex items-center justify-between py-1.5 border-b border-blue-200">
                <span className="text-xs text-gray-600 font-semibold">
                  Total Volume
                </span>
                <span className="text-base font-bold text-gray-900">
                  ${getFormattedNumber(currentUserData?.totalValue ?? 0, 3)}
                </span>
              </div>

              {/* Reward - Separate Row */}
              <div className="flex items-center justify-between py-1.5">
                <span className="text-xs text-gray-600 font-semibold">
                  Your Reward
                </span>
                {userRewardGems > 0 ? (
                  <div className="flex items-center gap-1">
                    <span className="text-base font-bold text-gray-900">
                      ${getFormattedNumber(userRewardUsd, 0)}
                    </span>
                    <div className="flex items-center">
                      (
                      <Gem className="w-4 h-4 text-purple-600 pr-1" />
                      <span className="text-base font-bold text-gray-600">
                        {getFormattedNumber(userRewardGems, 0)}
                      </span>
                      )
                    </div>
                  </div>
                ) : (
                  <div className="text-xs font-bold text-gray-400">
                    Top 2000 only
                  </div>
                )}
              </div>
            </div>

            {!hasUserRank && walletAddress && (
              <div className="mt-3 text-center text-xs text-gray-600">
                Create your first portfolio to join the leaderboard.
              </div>
            )}
          </div>

          {/* Create Portfolio Button - Below */}
          <Link
            to={"/"}
            className="btn-primary w-full flex items-center justify-center gap-2 text-sm mt-3"
          >
            <Plus size={16} />
            Create Portfolio
          </Link>
        </div>

        {/* Right: How it Works & Rewards - Compact */}
        <div className="glass-card p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-bold text-gray-900">How it Works</h3>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowTermsModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
              >
                <FileText className="w-4 h-4" />
                Terms
              </button>
              <button
                onClick={() => setShowTutorialModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
              >
                <BookOpen className="w-3.5 h-3.5" />
                Tutorial
              </button>
            </div>
          </div>

          {/* Compact Steps */}
          <div className="space-y-2 mb-4">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                <BarChart3 className="w-3 h-3 text-blue-600" />
              </div>
              <p className="text-xs text-gray-700">
                <strong>Create portfolios</strong> on BNB Chain or BASE
              </p>
            </div>

            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                <Trophy className="w-3 h-3 text-amber-600" />
              </div>
              <p className="text-xs text-gray-700">
                <strong>Top 2000</strong> share 100K Gems prize pool
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
                <TrendingUp className="w-3 h-3 text-purple-600" />
              </div>
              <p className="text-xs text-gray-700">
                <strong>Rankings</strong> based on total USD value of all your
                portfolio activity (buy, sell)
              </p>
            </div>
          </div>

          {/* Compact Reward Tiers */}
          <div className="border-t border-gray-200 pt-3">
            <h4 className="text-sm font-bold text-gray-900 mb-2">Rewards</h4>
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-gradient-to-br from-gray-50 to-slate-50 border border-amber-200 rounded-lg p-2">
                <div className="flex items-center gap-1 mb-1">
                  <Crown className="w-3 h-3 text-amber-600" />
                  <span className="font-bold text-xs text-gray-900">1st</span>
                </div>
                <div className="flex items-center gap-1">
                  <Gem className="w-4 h-4 text-amber-600" />
                  <p className="text-sm font-bold text-amber-600">10K</p>
                </div>
              </div>

              <div className="bg-gradient-to-br from-gray-50 to-slate-50 border border-purple-200 rounded-lg p-2">
                <div className="flex items-center gap-1 mb-1">
                  <Trophy className="w-3 h-3 text-purple-600" />
                  <span className="font-bold text-xs text-gray-900">
                    2nd-3rd
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <Gem className="w-4 h-4 text-purple-600" />
                  <p className="text-sm font-bold text-purple-600">5K-3K</p>
                </div>
              </div>

              <div className="bg-gradient-to-br from-gray-50 to-slate-50 border border-blue-200 rounded-lg p-2">
                <div className="flex items-center gap-1 mb-1">
                  <Medal className="w-3 h-3 text-blue-600" />
                  <span className="font-bold text-xs text-gray-900">
                    4th-200th
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <Gem className="w-4 h-4 text-blue-600" />
                  <p className="text-sm font-bold text-blue-600">1K-50</p>
                </div>
              </div>

              <div className="bg-gradient-to-br from-gray-50 to-slate-50 border border-gray-200 rounded-lg p-2">
                <div className="flex items-center gap-1 mb-1">
                  <Award className="w-3 h-3 text-gray-600" />
                  <span className="font-bold text-xs text-gray-900">
                    201st-2000th
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <Gem className="w-4 h-4 text-gray-600" />
                  <p className="text-sm font-bold text-gray-600">20-4</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Leaderboard with Pagination */}
      <div className="glass-card p-6">
        <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2 mb-4">
          <Trophy className="w-6 h-6 text-amber-500" />
          Leaderboard
        </h3>

        {/* Table */}
        <div className="overflow-x-auto">
          <div className={hasLeaderboardRecords && "min-w-150"}>
            {/* Table Header */}
            {hasLeaderboardRecords && (
              <div className="grid grid-cols-[80px_1fr_140px_140px_200px] gap-4 px-4 py-3 bg-gray-50/60 rounded-lg mb-2">
                <div className="text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Rank
                </div>
                <div className="text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  {/* Wallet Address */}
                  User ID
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
            )}

            {/* Table Rows */}
            <div className="space-y-1 p-1">
              {hasLeaderboardRecords ? (
                currentPageData.map((entry) => {
                  const isCurrentUser =
                    !!walletAddress &&
                    typeof entry.address === "string" &&
                    entry.address.toLowerCase() === walletAddress.toLowerCase();
                  const bgColor = isCurrentUser
                    ? "bg-gradient-to-r from-green-50 to-indigo-50 border-2 border-green-500"
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
                      className={`grid grid-cols-[80px_1fr_140px_140px_200px] gap-4 px-4 py-3 ${bgColor} backdrop-blur-sm border border-white/60 rounded-lg hover:shadow-md transition-all ${isCurrentUser ? "ring-2 ring-green-400" : entry.position >= 2 && entry.position <= 3 ? "ring-1 ring-purple-300" : entry.position >= 4 && entry.position <= 200 ? "ring-1 ring-blue-300" : entry.position >= 201 && entry.position <= 2000 ? "ring-1 ring-gray-300" : ""}`}
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
                            className={`w-8 h-8 rounded-full flex items-center justify-center  bg-gray-100`}
                          >
                            <span
                              className={`text-xs font-bold ${isCurrentUser ? "text-green-700" : entry.position >= 2 && entry.position <= 3 ? "text-purple-700" : entry.position >= 4 && entry.position <= 200 ? "text-blue-700" : entry.position >= 201 && entry.position <= 2000 ? "text-gray-700" : ""}`}
                            >
                              {entry.position}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Wallet Address */}
                      <div className="flex items-center">
                        <div className="flex items-center gap-2">
                          {/* <Wallet className="w-4 h-4 text-gray-400" /> */}
                          <span className="font-mono text-sm text-gray-700">
                            {shortAddress(entry.address)}
                          </span>
                          {isCurrentUser && (
                            <span className="text-xs font-bold text-green-600 bg-green-100 px-2 py-0.5 rounded-full">
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
                          <span className="text-sm font-bold text-gray-900">
                            ${(entry.gemReward?.gems * 5).toLocaleString()}
                          </span>

                          <span className="text-sm font-bold text-gray-600">
                            <div className="flex items-center">
                              {" "}
                              (
                              <Gem className="w-4 h-4 text-purple-600 mr-1" />
                              {entry.gemReward?.gems?.toLocaleString()})
                            </div>
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50/70 px-6 py-10 text-center">
                  <div className="text-sm font-semibold text-gray-900">
                    No leaderboard records yet
                  </div>
                  <div className="mt-2 text-sm text-gray-500">
                    Rankings will appear here once participants start creating
                    portfolios.
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Pagination Controls */}
        <div className="flex flex-col sm:flex-row items-center justify-between mt-6 pt-4 border-t border-gray-200">
          <div className="text-sm text-gray-600">
            {hasLeaderboardRecords
              ? `Showing ${startIndex + 1}-${Math.min(startIndex + currentPageData.length, totalEntries)} of ${totalEntries}`
              : "No leaderboard entries to display"}
          </div>
          {hasLeaderboardRecords && (
            <div className="flex items-center gap-2">
              <button
                onClick={handlePreviousPage}
                disabled={currentPage === 1 || !hasLeaderboardRecords}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
                  currentPage === 1 || !hasLeaderboardRecords
                    ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                    : "bg-white border border-gray-200 text-gray-700 hover:bg-gray-50"
                }`}
              >
                <ChevronLeft size={16} />
                Previous
              </button>

              <div className="flex items-center gap-1">
                <div className="sm:hidden">
                  <button
                    type="button"
                    className="w-10 h-10 rounded-lg font-semibold bg-black text-white"
                  >
                    {currentPage}
                  </button>
                </div>

                <div className="hidden sm:flex items-center gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }

                    return (
                      <button
                        key={pageNum}
                        onClick={() => setCurrentPage(pageNum)}
                        className={`w-10 h-10 rounded-lg font-semibold transition-all ${
                          currentPage === pageNum
                            ? "bg-black text-white"
                            : "bg-white border border-gray-200 text-gray-700 hover:bg-gray-50"
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>
              </div>

              <button
                onClick={handleNextPage}
                disabled={currentPage === totalPages || !hasLeaderboardRecords}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
                  currentPage === totalPages || !hasLeaderboardRecords
                    ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                    : "bg-white border border-gray-200 text-gray-700 hover:bg-gray-50"
                }`}
              >
                Next
                <ChevronRight size={16} />
              </button>
            </div>
          )}
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
                  By participating in the AlloX Allocation Race, you acknowledge
                  and agree to be bound by these terms and conditions. Please
                  read them carefully before creating portfolios.
                </p>
              </div>

              {/* Eligibility */}
              <div>
                <h4 className="text-lg font-bold text-gray-900 mb-2 flex items-center gap-2">
                  Eligibility
                </h4>
                <ul className="space-y-2 text-sm text-gray-700 ml-4">
                  <li className="flex gap-2">
                    <span className="text-amber-500 font-bold">•</span>
                    <span>
                      Participants must have a valid wallet connected to BNB
                      Chain or BASE
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
                  Competition Rules
                </h4>
                <ul className="space-y-2 text-sm text-gray-700 ml-4">
                  <li className="flex gap-2">
                    <span className="text-purple-500 font-bold">•</span>
                    <span>
                      Rankings are based on the total USD value of all
                      portfolios you create during the competition, including
                      portfolios that you buy and sell.
                    </span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-purple-500 font-bold">•</span>
                    <span>
                      Only portfolios created on BNB Chain or BASE count toward
                      your ranking
                    </span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-purple-500 font-bold">•</span>
                    <span>
                      Top 2000 participants share the 100,000 Gems ($500,000
                      USD) reward pool
                    </span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-purple-500 font-bold">•</span>
                    <span>
                      Leaderboard updates in near real-time but final rankings
                      determined at campaign end
                    </span>
                  </li>
                </ul>
              </div>

              {/* Prohibited Activities */}

              {/* Reward Distribution */}
              <div>
                <h4 className="text-lg font-bold text-gray-900 mb-2 flex items-center gap-2">
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
                      Gems credited to winning wallets at token launch event
                    </span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-blue-500 font-bold">•</span>
                    <span>
                      Participants must maintain wallet access to claim rewards
                    </span>
                  </li>
                </ul>
              </div>

              {/* Organizer Rights */}
              <div>
                <h4 className="text-lg font-bold text-gray-900 mb-2 flex items-center gap-2">
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
          </div>
        </div>
      )}

      {/* Portfolio Tutorial Modal */}
      {showTutorialModal && (
        <PortfolioTutorialModal
          isOpen={showTutorialModal}
          onClose={() => setShowTutorialModal(false)}
        />
      )}
    </div>
  );
}
