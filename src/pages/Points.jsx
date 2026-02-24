import {
  Gift,
  MessageSquare,
  PieChart,
  TrendingUp,
  Clock,
  ArrowRight,
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
  const pointsWays = [
    {
      id: 1,
      name: "Welcome Bonus",
      points: "5,000",
      description: "One-time bonus for new users",
      icon: Gift,
      customIcon: null,
      comingSoon: false,
    },
    {
      id: 2,
      name: "Create Portfolio",
      points: "250",
      description: "Earn for each portfolio you create",
      icon: PieChart,
      customIcon: null,
      comingSoon: false,
    },
    {
      id: 3,
      name: "Chat Message",
      points: "25",
      description: "Earn for each message with AI",
      icon: MessageSquare,
      customIcon: null,
      comingSoon: false,
    },
    {
      id: 4,
      name: "Daily Bonus",
      points: "5,000",
      description: "Log in daily to earn points",
      icon: Clock,
      customIcon: null,
      comingSoon: false,
    },
    {
      id: 5,
      name: "X Tasks",
      points: "200",
      description: "Complete social media tasks",
      icon: null,
      customIcon: XLogo,
      comingSoon: true,
    },
    {
      id: 6,
      name: "Staking",
      points: "500",
      description: "Earn points by staking tokens",
      icon: TrendingUp,
      customIcon: null,
      comingSoon: true,
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
    document.title = "Points";
  }, []);

  return (
    <div className="space-y-6 flex-1 px-6 py-8 portfolio-wrapper ms-auto w-full overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold mb-2">Points</h2>
          <p className="text-gray-600 text-sm">
            Points unlock exclusive rewards and benefits.
          </p>
        </div>
      </div>

      {/* Info Banner */}
      <div className="glass-card p-6 bg-gradient-to-br from-indigo-50 to-purple-50 border-indigo-200/50">
        <div className="flex items-start gap-4">
          <div className="flex-1">
            <h3 className="text-lg font-bold mb-1">How to Earn Points</h3>
            <p className="text-sm text-gray-700">
              Points are earned through various activities on AlloX. The more
              you engage with the platform, the more points you accumulate.
            </p>
          </div>
        </div>
      </div>

      {/* Points Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {pointsWays.map((way) => {
          const Icon = way.icon;
          const CustomIcon = way.customIcon;
          const isWelcomeGift = way.id <= 4;
          return (
            <div
              key={way.id}
              className={`glass-card p-6 relative overflow-hidden transition-all duration-200 hover:shadow-lg ${
                way.comingSoon ? "opacity-75" : ""
              }
               ${isWelcomeGift && " cursor-pointer"}`}
              onClick={() => {
                handleClick(way.id);
              }}
            >
              {/* Coming Soon Badge */}
              {way.comingSoon && (
                <div className="absolute top-3 right-3 px-2 py-1 bg-gray-900 text-white text-xs font-bold rounded-lg">
                  Coming Soon
                </div>
              )}

              {/* Icon */}
              <div className="mb-4">
                <div className="w-12 h-12 bg-black rounded-2xl flex items-center justify-center mb-4">
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

              {/* Points Display */}
              <div className="pt-4 border-t border-gray-200">
                <div className="flex items-baseline gap-1 justify-between">
                  <div className="flex gap-1 items-baseline">
                    <span className="text-3xl font-bold">{way.points}</span>
                    <span className="text-sm text-gray-600 font-medium">
                      points
                    </span>
                  </div>
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

      {/* Bottom Info */}
      <div className="glass-card p-6">
        <h3 className="text-xl font-bold mb-4">System Details</h3>
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-black text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">
              1
            </div>
            <div>
              <div className="font-medium mb-1">Earn Points</div>
              <p className="text-sm text-gray-600">
                Complete activities like creating portfolios, chatting with AI,
                and more
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-black text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">
              2
            </div>
            <div>
              <div className="font-medium mb-1">Track Progress</div>
              <p className="text-sm text-gray-600">
                Monitor your points balance
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-black text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">
              3
            </div>
            <div>
              <div className="font-medium mb-1">Unlock Rewards</div>
              <p className="text-sm text-gray-600">
                Use points to unlock exclusive rewards and benefits
              </p>
            </div>
          </div>
        </div>
      </div>

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
    </div>
  );
}
