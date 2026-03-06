import {
  Gift,
  MessageSquare,
  PieChart,
  TrendingUp,
  Clock,
  ArrowRight,
  Gem,
  Coins,
  Users,
  Sparkles,
  HelpCircle,
  Check,
  ChevronRight,
  Loader2,
  X,
  Info,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { useDispatch, useSelector } from "react-redux";
import { useAuth } from "../hooks/useAuth";
import {
  setPointsBalance,
  INITIAL_CLAIM_POINTS,
} from "../redux/slices/pointsSlice";
import { openCheckinModal } from "../redux/slices/walletSlice";
import { XTasksModal } from "../components/XTasksModal";
import { motion, AnimatePresence } from "motion/react";
import FAQModal from "../components/FaqModal";
import getFormattedNumber from "../hooks/get-formatted-number";
// Custom X (Twitter) Logo Component
function XLogo({ className }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={className}
      fill="currentColor"
    >
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

export function PointsPage() {
  const [showXTasksModal, setShowXTasksModal] = useState(false);
  const [showFAQModal, setShowFAQModal] = useState(false);

  const [newTasksCount, setNewTasksCount] = useState(4);
  const [expandedFaq, setExpandedFaq] = useState(null);
  const [showTooltip, setShowTooltip] = useState(false);
  const [showWelcomeGiftModal, setShowWelcomeGiftModal] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [claimError, setClaimError] = useState(null);

  const handleXTasksClick = () => {
    setShowXTasksModal(true);
  };

  const handleTasksViewed = () => {
    setNewTasksCount(0); // Reset count when tasks are viewed
  };

  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { user, setUser, claimSeason1 } = useAuth();
  const hasClaimedWelcomeBonus = user?.season1?.claimed === true;
  const userPointsBreakdown = user?.season1?.pointsBreakdown || {};
  const rateLimit =
    user?.season1?.rateLimit?.remaining ??
    user?.season1?.rateLimit?.messagesRemaining;

  const checkinStatus = useSelector((state) => state.checkin?.status);
  const lastClaimed = useMemo(() => {
    for (let i = checkinStatus?.rewards?.length - 1; i >= 0; i--) {
      if (checkinStatus.rewards[i].claimed === true) {
        if (i === checkinStatus.rewards.length - 1) {
          return checkinStatus.rewards[0];
        } else {
          return checkinStatus.rewards[i];
        }
      }
    }
    return checkinStatus?.rewards[0];
  }, [checkinStatus]);

  const earnWays = [
    {
      id: 1,
      name: "Welcome Bonus",
      points: "5,000",
      gems: "0",
      description: "One-time bonus for new users",
      icon: Gift,
      customIcon: null,
      comingSoon: false,
      isClickable: true,
      userPoints: "5,000",
    },
    {
      id: 2,
      name: "Create Portfolio",
      points: "250",
      gems: "0",
      description: "Earn for each portfolio you create",
      icon: PieChart,
      customIcon: null,
      comingSoon: false,
      isClickable: true,
      userPoints:
        getFormattedNumber(
          userPointsBreakdown.fromPortfolios ||
            userPointsBreakdown.portfolios ||
            0,
          0,
        ) || 0,
    },
    {
      id: 3,
      name: "Chat Message",
      points: "25",
      gems: "0",
      description: "Earn for each message with AI",
      icon: MessageSquare,
      customIcon: null,
      comingSoon: false,
      isClickable: true,
      userPoints:
        getFormattedNumber(
          userPointsBreakdown.fromMessages || userPointsBreakdown.messages || 0,
          0,
        ) || 0,
    },
    {
      id: 4,
      name: "Daily Bonus",
      points: getFormattedNumber(lastClaimed?.points || 0, 0),
      description: "Log in daily to earn points",
      icon: Clock,
      customIcon: null,
      comingSoon: false,
      isClickable: true,
      userPoints:
        getFormattedNumber(checkinStatus?.totalPointsEarned || 0, 0) || 0,
    },
    // {
    //   id: 5,
    //   name: "Referrals",
    //   points: "2,500",
    //   gems: "10",
    //   description: "Invite friends and earn from their activity",
    //   icon: Users,
    //   customIcon: null,
    //   comingSoon: false,
    //   isClickable: true,
    // },
    {
      id: 5,
      name: "Staking",
      points: "500",
      gems: "0",
      description: "Earn points by staking tokens",
      icon: TrendingUp,
      customIcon: null,
      comingSoon: true,
      isClickable: false,
    },
    {
      id: 6,
      name: "Social Tasks",
      points: "200",
      description: "Complete social media tasks",
      icon: null,
      customIcon: XLogo,
      comingSoon: false,
      isClickable: true,
    },
  ];
  const handleClaimPoints = async () => {
    setClaimError(null);
    setClaiming(true);
    try {
      const claimData = await claimSeason1();
      if (claimData?.success && claimData?.user) {
        const u = claimData.user;
        const updatedUser = {
          address: u.address,
          season1: {
            points: u.season1 ? u.season1.points : (u.points ?? 0),
            claimed: u.season1 ? u.season1.claimed : (u.claimed ?? true),
            claimedAt: u.season1 ? u.season1.claimedAt : u.claimedAt,
            ...(u.snapshot && { snapshot: u.snapshot }),
          },
        };
        setUser(updatedUser);
        dispatch(setPointsBalance(u.points ?? 0));
        setShowWelcomeGiftModal(false);
      } else {
        setClaimError(claimData?.message || "Claim failed. Please try again.");
      }
    } catch (err) {
      setClaimError(
        err?.message || "Failed to sign or claim. Please try again.",
      );
    } finally {
      setClaiming(false);
    }
  };

  const handleClick = (id) => {
    if (id === 1 && !hasClaimedWelcomeBonus) {
      setShowWelcomeGiftModal(true);
    } else if (id === 4) {
      dispatch(openCheckinModal());
    } else if (id === 5) {
      // navigate("/referrals", { replace: true });
    } else if (id === 7) {
      navigate("/referrals", { replace: true });
    } else if (id > 1 && id <= 3) {
      navigate("/", { replace: true });
    } else if (id === 6) {
      handleXTasksClick();
    }
  };

  useEffect(() => {
    window.scrollTo(0, 0);
    document.title = "Rewards";
  }, []);

  return (
    <div className="space-y-6 flex-1 px-6 py-8 portfolio-wrapper ms-auto w-full overflow-y-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-3">
        <div>
          <h2 className="text-3xl font-bold mb-2">Rewards</h2>
          <p className="text-gray-600 text-sm">
            Earn Points and Gems by engaging with AlloX. Unlock exclusive
            benefits at token launch.
          </p>
        </div>
        <button
          onClick={() => setShowFAQModal(true)}
          className="bg-white rounded-full px-3 py-2 hover:bg-gray-50 transition-colors flex items-center gap-2 text-xs whitespace-nowrap hover:bg-gray-200 transition-colors"
        >
          <HelpCircle size={14} className="text-blue-600" />
          <span className="font-medium">FAQs</span>
        </button>
      </div>
      {/* Two-Column Info: Points and Gems */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* Points Section */}
        <div className="glass-card p-6 bg-gradient-to-br from-blue-50 to-cyan-50 border-blue-200/50">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center">
              <Coins className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-bold">Points</h3>
              <div className="text-sm text-blue-600 font-medium">
                Standard Rewards
              </div>
            </div>
          </div>
          <p className="text-sm text-gray-700 mb-3">
            Points are the foundational reward currency on AlloX. Earn them
            through daily activities like creating portfolios, chatting with AI,
            and completing tasks.
          </p>
          <div className="bg-white/60 border border-blue-200 rounded-lg p-3">
            <div className="font-semibold text-sm mb-2 text-blue-900">
              How to Earn:
            </div>
            <ul className="space-y-1 text-xs text-gray-700">
              <li>• Welcome bonus and daily activities</li>
              <li>• Creating portfolios and AI interactions</li>
              <li>• Social media tasks and engagement</li>
              <li>• Referral program participation</li>
            </ul>
          </div>
        </div>

        {/* Gems Section */}
        <div className="glass-card p-6 bg-gradient-to-br from-purple-50 to-pink-50 border-purple-200/50">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-gradient-to-br from-purple-600 to-pink-600 rounded-2xl flex items-center justify-center">
              <Gem className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-bold">Gems</h3>
              <div className="text-sm text-purple-600 font-medium">
                Premium Rewards
              </div>
            </div>
          </div>
          <p className="text-sm text-gray-700 mb-3">
            Gems are the <strong>highest value rewards</strong> on AlloX. They
            offer a superior conversion ratio at token launch and unlock
            exclusive early-bird allocations.
          </p>
          <div className="bg-white/60 border border-purple-200 rounded-lg p-3">
            <div className="font-semibold text-sm mb-2 text-purple-900">
              How to Earn:
            </div>
            <ul className="space-y-1 text-xs text-gray-700">
              <li>• Referral program</li>
              <li>• Staking activities</li>
              <li>• Special campaigns and events</li>
              <li>• Network referral bonuses</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Earning Opportunities Grid */}
      <div>
        <h3 className="text-xl font-bold mb-4">Earning Opportunities</h3>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {earnWays.map((way) => {
            const Icon = way.icon;
            const CustomIcon = way.customIcon;
            const isWelcomeGift = way.id <= 4 || way.comingSoon === false;
            const isXTasks = way.id === 6;
            const hasGems = parseInt(way.gems) > 0;

            return (
              <div
                key={way.id}
                onClick={() => {
                  if (isXTasks) {
                    handleXTasksClick();
                  } else {
                    handleClick(way.id);
                  }
                }}
                className={`glass-card p-6 relative overflow-hidden transition-all duration-200 hover:shadow-lg ${
                  way.comingSoon ? "opacity-75" : ""
                } ${way.isClickable ? "cursor-pointer" : ""}`}
              >
                {/* Coming Soon Badge */}
                {way.comingSoon && (
                  <div className="absolute top-3 right-3 px-2 py-1 bg-gray-900 text-white text-xs font-bold rounded-lg">
                    Coming Soon
                  </div>
                )}

                {/* Notification Badge for X Tasks */}
                {/* {isXTasks && newTasksCount > 0 && (
                  <div className="absolute top-3 right-3 w-6 h-6 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                    {newTasksCount}
                  </div>
                )} */}

                {/* Arrow indicator for clickable items */}
                {/* {way.isClickable &&
                  !way.comingSoon &&
                  !(isXTasks && newTasksCount > 0) && (
                    <div className="absolute top-3 right-3 w-8 h-8 bg-black rounded-full flex items-center justify-center">
                      <ArrowRight className="w-4 h-4 text-white" />
                    </div>
                  )} */}
                <div className="flex items-center gap-2">
                  <div>
                    {/* Icon */}
                    <div className="mb-4">
                      <div
                        className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-4 ${"bg-black"}`}
                      >
                        {CustomIcon ? (
                          <CustomIcon className="w-5 h-5 text-white" />
                        ) : Icon ? (
                          <Icon className="w-5 h-5 text-white" />
                        ) : null}
                      </div>
                    </div>

                    {/* Content */}
                    <div className="mb-4">
                      <h3 className="text-lg font-bold mb-1">{way.name}</h3>
                      <p className="text-sm text-gray-600">{way.description}</p>
                    </div>
                  </div>
                  <div className="flex gap-2 mb-auto ml-auto">
                    {hasGems && (
                      <div className="flex mb-auto ml-auto items-center gap-1.5 px-2 py-1 bg-purple-100 border border-purple-200 rounded-lg w-fit">
                        <Gem size={14} className="text-purple-600" />
                        <span className="text-xs font-bold text-purple-700">
                          Gems
                        </span>
                      </div>
                    )}
                    {!way.comingSoon && (
                      <div className="bg-blue-100 border border-blue-200 px-2 py-1 rounded-lg ml-auto mb-auto">
                        <div className="flex gap-1 items-baseline">
                          <span className="text-xs font-bold text-blue-700">
                            {way.points}
                          </span>
                          <span className="text-xs font-bold text-blue-700">
                            Points
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                {/* Rewards Display */}
                <div className="pt-4 border-t border-gray-200">
                  <div className="flex items-baseline gap-1 justify-between">
                    {hasGems ? (
                      <div className="flex gap-3">
                        <div className="flex gap-1 items-baseline">
                          <span className="text-3xl font-bold">
                            {/* {way.points} */}0
                          </span>
                          <span className="text-sm text-gray-600 font-medium">
                            points
                          </span>
                        </div>{" "}
                        <div className="flex gap-1 items-baseline">
                          <span className="text-3xl font-bold">
                            {/* {way.gems} */}0
                          </span>
                          <span className="text-sm text-gray-600 font-medium">
                            gems
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="flex gap-1 items-baseline">
                        <span className="text-3xl font-bold">
                          {way.userPoints ?? 0}
                        </span>
                        <span className="text-sm text-gray-600 font-medium">
                          points
                        </span>
                      </div>
                    )}

                    {isWelcomeGift && (
                      <div
                        className={`relative w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                          (way.id === 1 && hasClaimedWelcomeBonus) ||
                          (way.id === 4 &&
                            checkinStatus?.canCheckIn === false) ||
                          (way.id === 2 && rateLimit < 3) ||
                          (way.id === 3 && rateLimit === 0)
                            ? "bg-green-500"
                            : (way.id === 2 && rateLimit >= 3) ||
                                (way.id === 3 && rateLimit > 0)
                              ? "bg-orange-500"
                              : "bg-black hover:bg-gray-800"
                        }`}
                      >
                        {way.id === 1 && hasClaimedWelcomeBonus ? (
                          <Check className="w-4 h-4 text-white" />
                        ) : way.id === 1 ? (
                          <ArrowRight className="w-4 h-4 text-white" />
                        ) : (way.id === 4 &&
                            checkinStatus?.canCheckIn === false) ||
                          (way.id === 2 && rateLimit < 3) ||
                          (way.id === 3 && rateLimit === 0) ? (
                          <Check className="w-4 h-4 text-white" />
                        ) : (
                          <ArrowRight className="w-4 h-4 text-white" />
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div
        onClick={() => {
          handleClick(7);
        }}
        className="relative overflow-hidden rounded-2xl h-[90px] bg-gradient-to-r from-purple-500 via-pink-500 to-purple-600 border-2 border-purple-400 cursor-pointer hover:shadow-2xl transition-all duration-300 group"
      >
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 group-hover:scale-110 transition-transform duration-500"></div>

        <div className="relative z-10 h-full flex items-center justify-between px-6 md:px-8">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-white/20 backdrop-blur-xl rounded-xl flex items-center justify-center flex-shrink-0">
              <Gem size={24} className="text-white" />
            </div>
            <div>
              <h3 className="text-xl md:text-2xl font-bold text-white">
                Earn 5% Lifetime Rewards
              </h3>
              <p className="text-white/80 text-sm hidden md:block">
                Invite friends, unlock Gems, and earn lifetime rewards from
                their activity.
              </p>
            </div>
          </div>

          <button className="flex items-center gap-2 px-6 py-3 bg-white hover:bg-white/95 text-purple-600 rounded-xl font-bold shadow-lg transition-all flex-shrink-0">
            <span className="hidden sm:inline">Coming Soon</span>
            <ChevronRight
              size={20}
              className="group-hover:translate-x-1 transition-transform"
            />
          </button>
        </div>
      </div>
      {/* X Tasks Modal */}
      <XTasksModal
        isOpen={showXTasksModal}
        onClose={() => setShowXTasksModal(false)}
        onTasksViewed={handleTasksViewed}
      />

      {/* FAQ Modal */}
      <FAQModal isOpen={showFAQModal} onClose={() => setShowFAQModal(false)} />
      {/* Welcome Bonus Claim Modal */}
      {showWelcomeGiftModal && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          onClick={() => {
            if (!claiming) setShowWelcomeGiftModal(false);
          }}
        >
          <div
            className="glass-card max-w-sm w-full p-8 relative animate-fade-in flex flex-col items-center text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => {
                if (!claiming) setShowWelcomeGiftModal(false);
              }}
              className="absolute top-4 right-4 p-1 rounded-lg hover:bg-black/5 text-gray-500"
              aria-label="Close"
            >
              <X size={20} />
            </button>

            <div className="flex items-center gap-2 mb-2">
              <h3 className="text-xl font-bold">Welcome Bonus</h3>
            </div>
            <p className="text-sm text-gray-600 mb-6">
              Exclusive Web3 Community Benefit.
            </p>
            <div className="flex items-center justify-center gap-2 mb-1">
              <span className="text-4xl font-bold">
                {INITIAL_CLAIM_POINTS.toLocaleString()}
              </span>
            </div>
            <p className="text-sm text-gray-500 mb-8">Points</p>
            {!isConnected && (
              <p className="text-sm text-amber-600 mb-4">
                Connect your wallet to claim.
              </p>
            )}
            {claimError && (
              <p className="text-sm text-red-600 mb-2">{claimError}</p>
            )}
            <button
              onClick={handleClaimPoints}
              disabled={claiming || !isConnected}
              className="w-full py-4 rounded-2xl font-medium bg-gray-900 text-white hover:bg-gray-800 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {claiming ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Claiming...
                </>
              ) : (
                "Claim"
              )}
            </button>
          </div>
        </div>
      )}

      <XTasksModal
        isOpen={showXTasksModal}
        onClose={() => setShowXTasksModal(false)}
        onTasksViewed={handleTasksViewed}
      />
    </div>
  );
}
