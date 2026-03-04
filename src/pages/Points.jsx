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
  Loader2,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
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
  const [newTasksCount, setNewTasksCount] = useState(4);
  const [expandedFaq, setExpandedFaq] = useState(null);

  const handleXTasksClick = () => {
    setShowXTasksModal(true);
  };

  const handleTasksViewed = () => {
    setNewTasksCount(0);
  };

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
    },
    {
      id: 4,
      name: "Daily Bonus",
      points: "5,000",
      description: "Log in daily to earn points",
      icon: Clock,
      customIcon: null,
      comingSoon: false,
      isClickable: true,
    },
    {
      id: 5,
      name: "Referrals",
      points: "2,500",
      gems: "10",
      description: "Invite friends and earn from their activity",
      icon: Users,
      customIcon: null,
      comingSoon: false,
      isClickable: true,
    },
    {
      id: 6,
      name: "Staking",
      points: "500",
      gems: "10",
      description: "Earn points by staking tokens",
      icon: TrendingUp,
      customIcon: null,
      comingSoon: false,
      isClickable: false,
    },
    {
      id: 7,
      name: "X Tasks",
      points: "200",
      description: "Complete social media tasks",
      icon: null,
      customIcon: XLogo,
      comingSoon: true,
      isClickable: false,
    },
  ];
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { user, setUser, claimSeason1 } = useAuth();
  const hasClaimedWelcomeBonus = user?.season1?.claimed === true;
  const isConnected = useSelector((state) => state.wallet.isConnected);

  const [showWelcomeGiftModal, setShowWelcomeGiftModal] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [claimError, setClaimError] = useState(null);

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
    } else if (id > 1 && id <= 3) {
      navigate("/", { replace: true });
    }
  };

  useEffect(() => {
    window.scrollTo(0, 0);
    document.title = "Rewards";
  }, []);

  return (
    <div className="space-y-6 flex-1 px-6 py-8 portfolio-wrapper ms-auto w-full overflow-y-auto">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-bold mb-2">Rewards</h2>
        <p className="text-gray-600 text-sm">
          Earn Points and Gems by engaging with AlloX. Unlock exclusive benefits
          at token launch.
        </p>
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
              <li>• Referral program (primary source)</li>
              <li>• High-value staking activities</li>
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
            const isXTasks = way.id === 4;
            const hasGems = parseInt(way.gems) > 0;

            return (
              <div
                key={way.id}
                onClick={() => {
                  if (isXTasks) {
                    // handleXTasksClick();
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
                            {way.points}
                          </span>
                          <span className="text-sm text-gray-600 font-medium">
                            points
                          </span>
                        </div>{" "}
                        <div className="flex gap-1 items-baseline">
                          <span className="text-3xl font-bold">{way.gems}</span>
                          <span className="text-sm text-gray-600 font-medium">
                            gems
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="flex gap-1 items-baseline">
                        <span className="text-3xl font-bold">{way.points}</span>
                        <span className="text-sm text-gray-600 font-medium">
                          points
                        </span>
                      </div>
                    )}

                    {isWelcomeGift && (
                      <div
                        className={`relative w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                          way.id === 1 && hasClaimedWelcomeBonus
                            ? "bg-green-500"
                            : "bg-black hover:bg-gray-800"
                        }`}
                      >
                        {way.id === 1 && hasClaimedWelcomeBonus ? (
                          <Check className="w-4 h-4 text-white" />
                        ) : way.id === 1 ? (
                          <ArrowRight className="w-4 h-4 text-white" />
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

      {/* FAQs Section */}
      <div>
        <h3 className="text-xl font-bold mb-4">Frequently Asked Questions</h3>

        <div className="space-y-3">
          {/* FAQ 1 */}
          <div className="glass-card overflow-hidden">
            <button
              onClick={() => setExpandedFaq(expandedFaq === 1 ? null : 1)}
              className="w-full flex items-start justify-between p-4 hover:bg-gray-50/50 transition-colors text-left"
            >
              <div className="flex items-start gap-3 flex-1">
                <HelpCircle
                  size={20}
                  className="text-blue-600 mt-0.5 flex-shrink-0"
                />
                <div>
                  <h4 className="font-semibold mb-1">
                    What's the difference between Points and Gems?
                  </h4>
                  {expandedFaq !== 1 && (
                    <p className="text-sm text-gray-600">
                      Learn about reward types...
                    </p>
                  )}
                </div>
              </div>
              <motion.div
                animate={{ rotate: expandedFaq === 1 ? 180 : 0 }}
                transition={{ duration: 0.2 }}
                className="ml-2"
              >
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path
                    d="M5 7.5L10 12.5L15 7.5"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </motion.div>
            </button>
            <AnimatePresence>
              {expandedFaq === 1 && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <div className="px-4 pb-4 pl-[52px] text-sm text-gray-700 space-y-3">
                    <p>
                      <strong>Points</strong> are the standard reward currency
                      earned through everyday activities on AlloX. They're easy
                      to accumulate and serve as your baseline participation
                      rewards.
                    </p>
                    <p>
                      <strong>Gems</strong> are premium, high-value rewards that
                      are harder to earn but offer significantly better
                      benefits. At token launch, Gems will convert at a much
                      better ratio than Points and grant access to exclusive
                      allocations.
                    </p>
                    <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                      <div className="font-semibold text-purple-900 mb-1">
                        Key Difference:
                      </div>
                      <p className="text-sm">
                        Think of Points as your regular paycheck and Gems as
                        your investment portfolio—both valuable, but Gems offer
                        significantly higher long-term value.
                      </p>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* FAQ 2 */}
          <div className="glass-card overflow-hidden">
            <button
              onClick={() => setExpandedFaq(expandedFaq === 2 ? null : 2)}
              className="w-full flex items-start justify-between p-4 hover:bg-gray-50/50 transition-colors text-left"
            >
              <div className="flex items-start gap-3 flex-1">
                <HelpCircle
                  size={20}
                  className="text-purple-600 mt-0.5 flex-shrink-0"
                />
                <div>
                  <h4 className="font-semibold mb-1">How do I earn Gems?</h4>
                  {expandedFaq !== 2 && (
                    <p className="text-sm text-gray-600">
                      Discover Gem earning strategies...
                    </p>
                  )}
                </div>
              </div>
              <motion.div
                animate={{ rotate: expandedFaq === 2 ? 180 : 0 }}
                transition={{ duration: 0.2 }}
                className="ml-2"
              >
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path
                    d="M5 7.5L10 12.5L15 7.5"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </motion.div>
            </button>
            <AnimatePresence>
              {expandedFaq === 2 && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <div className="px-4 pb-4 pl-[52px] text-sm text-gray-700 space-y-3">
                    <p>
                      The <strong>Referral Program</strong> is currently the
                      primary way to earn Gems:
                    </p>
                    <div className="bg-gradient-to-br from-purple-50 to-pink-50 border border-purple-200 rounded-lg p-4 space-y-2">
                      <div className="flex items-start gap-2">
                        <Sparkles
                          size={16}
                          className="text-purple-600 mt-0.5 flex-shrink-0"
                        />
                        <div>
                          <div className="font-semibold text-purple-900">
                            Direct Referrals
                          </div>
                          <div className="text-sm">
                            Earn 1-10 Gems when your referral completes their
                            first stake (based on stake amount)
                          </div>
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <Sparkles
                          size={16}
                          className="text-purple-600 mt-0.5 flex-shrink-0"
                        />
                        <div>
                          <div className="font-semibold text-purple-900">
                            Network Referrals
                          </div>
                          <div className="text-sm">
                            Earn 5% of all Gems your direct referrals earn from
                            their own referrals
                          </div>
                        </div>
                      </div>
                    </div>
                    <p>
                      Additional Gem earning opportunities will be introduced
                      through special campaigns, high-value staking pools, and
                      seasonal events. Visit the Referrals page to activate your
                      program and start earning!
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* FAQ 3 */}
          <div className="glass-card overflow-hidden">
            <button
              onClick={() => setExpandedFaq(expandedFaq === 3 ? null : 3)}
              className="w-full flex items-start justify-between p-4 hover:bg-gray-50/50 transition-colors text-left"
            >
              <div className="flex items-start gap-3 flex-1">
                <HelpCircle
                  size={20}
                  className="text-green-600 mt-0.5 flex-shrink-0"
                />
                <div>
                  <h4 className="font-semibold mb-1">
                    What can I do with my Points and Gems?
                  </h4>
                  {expandedFaq !== 3 && (
                    <p className="text-sm text-gray-600">
                      Unlock exclusive benefits...
                    </p>
                  )}
                </div>
              </div>
              <motion.div
                animate={{ rotate: expandedFaq === 3 ? 180 : 0 }}
                transition={{ duration: 0.2 }}
                className="ml-2"
              >
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path
                    d="M5 7.5L10 12.5L15 7.5"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </motion.div>
            </button>
            <AnimatePresence>
              {expandedFaq === 3 && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <div className="px-4 pb-4 pl-[52px] text-sm text-gray-700 space-y-3">
                    <p>
                      Your rewards will unlock exclusive benefits at AlloX token
                      launch:
                    </p>
                    <div className="space-y-2">
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                        <div className="flex items-center gap-2 mb-2">
                          <Coins size={16} className="text-blue-600" />
                          <span className="font-semibold text-blue-900">
                            Points Benefits:
                          </span>
                        </div>
                        <ul className="space-y-1 text-sm">
                          <li>• Convert to token allocations at launch</li>
                          <li>• Participate in seasonal campaigns</li>
                          <li>• Enter prize draws and competitions</li>
                          <li>• Access to community tier benefits</li>
                        </ul>
                      </div>
                      <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                        <div className="flex items-center gap-2 mb-2">
                          <Gem size={16} className="text-purple-600" />
                          <span className="font-semibold text-purple-900">
                            Gems Benefits (Premium):
                          </span>
                        </div>
                        <ul className="space-y-1 text-sm">
                          <li>• Superior token conversion ratio</li>
                          <li>• Exclusive early-bird allocations</li>
                          <li>• VIP tier status and perks</li>
                          <li>• Priority access to future features</li>
                        </ul>
                      </div>
                    </div>
                    <p className="bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg p-3 text-center font-semibold text-sm">
                      💎 The more you accumulate now, the more value you unlock
                      at launch!
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* FAQ 4 */}
          <div className="glass-card overflow-hidden">
            <button
              onClick={() => setExpandedFaq(expandedFaq === 4 ? null : 4)}
              className="w-full flex items-start justify-between p-4 hover:bg-gray-50/50 transition-colors text-left"
            >
              <div className="flex items-start gap-3 flex-1">
                <HelpCircle
                  size={20}
                  className="text-indigo-600 mt-0.5 flex-shrink-0"
                />
                <div>
                  <h4 className="font-semibold mb-1">
                    Do Points and Gems expire?
                  </h4>
                  {expandedFaq !== 4 && (
                    <p className="text-sm text-gray-600">
                      Learn about reward duration...
                    </p>
                  )}
                </div>
              </div>
              <motion.div
                animate={{ rotate: expandedFaq === 4 ? 180 : 0 }}
                transition={{ duration: 0.2 }}
                className="ml-2"
              >
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path
                    d="M5 7.5L10 12.5L15 7.5"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </motion.div>
            </button>
            <AnimatePresence>
              {expandedFaq === 4 && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <div className="px-4 pb-4 pl-[52px] text-sm text-gray-700 space-y-3">
                    <p>
                      <strong>No, your rewards never expire!</strong> All Points
                      and Gems you earn are permanently saved to your account.
                    </p>
                    <ul className="space-y-2 ml-4">
                      <li className="flex items-start gap-2">
                        <span className="text-green-600 mt-1">✓</span>
                        <span>Accumulate rewards at your own pace</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-green-600 mt-1">✓</span>
                        <span>No time limits or expiration dates</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-green-600 mt-1">✓</span>
                        <span>
                          All rewards remain valid through token launch
                        </span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-green-600 mt-1">✓</span>
                        <span>
                          Track your total balance in your wallet stats
                        </span>
                      </li>
                    </ul>
                    <p className="text-xs text-gray-600 italic">
                      Keep earning and building your rewards—every Point and Gem
                      counts toward your future benefits!
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* X Tasks Modal */}
      <XTasksModal
        isOpen={showXTasksModal}
        onClose={() => setShowXTasksModal(false)}
        onTasksViewed={handleTasksViewed}
      />
    </div>
  );
}
