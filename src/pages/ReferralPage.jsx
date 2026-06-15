import { useState, useEffect, useMemo, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  Copy,
  Check,
  Users,
  Gem,
  Calendar,
  Info,
  X,
  Coins,
  Sparkles,
  Download,
  CheckCircle2,
  Zap,
  TrendingUp,
  Star,
  HelpCircle,
  Trophy,
  DollarSign,
  Target,
  Award,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import FAQReferralModal from "../components/FaqReferralModal";
import { apiCall } from "../utils/api";
import { useAuth } from "../hooks/useAuth";
import { setWalletModal } from "../redux/slices/walletSlice";

const REF_LIST_LIMIT = 20;

const asNumber = (value) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

const money = (value) =>
  `$${asNumber(value).toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;

const STAKING_POOLS = [
  { id: "ETH60", name: "ETH Pool", lockDays: 60 },
  { id: "ETH30", name: "ETH Pool", lockDays: 30 },
  { id: "BTC90", name: "BTC Pool", lockDays: 90 },
  { id: "USDT30", name: "USDT Pool", lockDays: 30 },
];

export function ReferralsPage() {
  const dispatch = useDispatch();
  const isConnected = useSelector((state) => state.wallet.isConnected);
  const { isAuthenticated, ensureAuthenticated } = useAuth();
  const [activating, setActivating] = useState(false);
  const [isActivated, setIsActivated] = useState(false);
  const [copied, setCopied] = useState(false);
  const [selectedPool, setSelectedPool] = useState("");
  const [dateFilter, setDateFilter] = useState("30d");
  const [showBenefitsModal, setShowBenefitsModal] = useState(false);
  const [showTiersModal, setShowTiersModal] = useState(false);
  const [showPoolLinkModal, setShowPoolLinkModal] = useState(false);
  const [selectedUserDetails, setSelectedUserDetails] = useState(null);
  const [faqModalOpen, setFaqModalOpen] = useState(false);
  const [dashboard, setDashboard] = useState(null);
  const [dashboardLoading, setDashboardLoading] = useState(false);
  const [dashboardError, setDashboardError] = useState("");
  const [registrations, setRegistrations] = useState([]);
  const [completedActions, setCompletedActions] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [newCode, setNewCode] = useState("");
  const [codeError, setCodeError] = useState("");
  const [submittingCode, setSubmittingCode] = useState(false);
  const [claimCode, setClaimCode] = useState("");
  const [claimError, setClaimError] = useState("");
  const [claiming, setClaiming] = useState(false);
  const [listPage, setListPage] = useState(1);
  const [listPagination, setListPagination] = useState({
    page: 1,
    pages: 1,
    total: 0,
  });

  const referralCode = dashboard?.referralCode ?? null;
  const baseReferralLink =
    dashboard?.referralLink ??
    (referralCode ? `https://lorenadev.dyp.finance/?ref=${referralCode}` : "");

  const breakdown = dashboard?.stats?.breakdown ?? {};
  const totalGems = asNumber(dashboard?.stats?.totalGemsEarned);
  const directGems = asNumber(breakdown.track1?.gems);
  const networkGems = asNumber(breakdown.track2?.gems);
  const milestoneGems = asNumber(breakdown.milestone?.gems);
  const totalPoints = asNumber(dashboard?.stats?.totalEarnedUsd);
  const directUsd = asNumber(breakdown.track1?.usd);
  const networkUsd = asNumber(breakdown.track2?.usd);
  const milestoneUsd = asNumber(breakdown.milestone?.usd);
  const level2Percent = asNumber(dashboard?.level2PercentOfTrack1) || 5;
  const minInvestmentUsd = asNumber(dashboard?.minInvestmentUsd) || 100;
  const rewardTiers = dashboard?.rewardTiers ?? [];
  const milestones = dashboard?.milestones ?? {};
  const nextMilestone = milestones?.next;
  const directEarnings = directUsd;
  const networkEarnings = networkUsd;
  const milestoneEarnings = milestoneUsd;
  const totalEarnings =
    asNumber(dashboard?.stats?.totalEarnedUsd) ||
    directEarnings + networkEarnings + milestoneEarnings;
  const totalReferrals =
    asNumber(dashboard?.stats?.totalCount) || asNumber(listPagination.total);

  const milestoneProgress = useMemo(() => {
    if (!nextMilestone) return 100;
    const total = asNumber(nextMilestone.count);
    const left = asNumber(nextMilestone.referralsToNext);
    if (total <= 0) return 100;
    return Math.max(0, Math.min(100, ((total - left) / total) * 100));
  }, [nextMilestone]);

  const mapRefereesToUi = useCallback(
    (referees) => {
      const list = Array.isArray(referees) ? referees : [];
      const regs = list.map((r, index) => ({
        id: `${r.display}-${index}`,
        wallet: r.display,
        registeredDate: r.joinedAt ? new Date(r.joinedAt) : new Date(),
        hasActivatedReferral: !!r.activated,
      }));
      const actions = list
        .filter(
          (r) =>
            r.activated &&
            (asNumber(r.gemsEarnedFromThisReferee) > 0 ||
              asNumber(r.usdEarnedFromThisReferee) > 0),
        )
        .map((r, index) => ({
          id: `direct-${r.display}-${index}`,
          wallet: r.display,
          type: "direct",
          pool: "First qualifying portfolio",
          lockPeriod: `≥ ${money(minInvestmentUsd)}`,
          gemsEarned: asNumber(r.gemsEarnedFromThisReferee),
          pointsEarned: asNumber(r.usdEarnedFromThisReferee),
          timestamp: r.activatedAt
            ? new Date(r.activatedAt)
            : r.joinedAt
              ? new Date(r.joinedAt)
              : new Date(),
        }));
      return { regs, actions };
    },
    [minInvestmentUsd],
  );

  const loadReferralData = useCallback(async () => {
    if (!isAuthenticated) {
      setDashboardError("Connect your wallet to view your referral dashboard.");
      return;
    }
    setDashboardLoading(true);
    setDashboardError("");
    try {
      const [me, listData, boardData] = await Promise.all([
        apiCall("/referral/me"),
        apiCall(`/referral/list?page=${listPage}&limit=${REF_LIST_LIMIT}`),
        apiCall("/referral/leaderboard?limit=50"),
      ]);
      setDashboard(me);
      const { regs, actions } = mapRefereesToUi(listData?.referees);
      setRegistrations(regs);
      setCompletedActions(actions);
      if (listData?.pagination) setListPagination(listData.pagination);
      setLeaderboard(
        Array.isArray(boardData?.leaderboard) ? boardData.leaderboard : [],
      );
      if (me?.referralCode) setIsActivated(true);
    } catch (e) {
      setDashboardError(e?.message || "Failed to load referral data.");
    } finally {
      setDashboardLoading(false);
    }
  }, [isAuthenticated, listPage, mapRefereesToUi]);

  const reloadListPage = async (page) => {
    try {
      const listData = await apiCall(
        `/referral/list?page=${page}&limit=${REF_LIST_LIMIT}`,
      );
      const { regs, actions } = mapRefereesToUi(listData?.referees);
      setRegistrations(regs);
      setCompletedActions(actions);
      if (listData?.pagination) setListPagination(listData.pagination);
      setListPage(page);
    } catch (e) {
      setDashboardError(e?.message || "Failed to load referral activity page.");
    }
  };

  const handleCopy = (text) => {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.style.position = "fixed";
    textArea.style.left = "-999999px";
    textArea.style.top = "-999999px";
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();

    try {
      document.execCommand("copy");
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }

    document.body.removeChild(textArea);
  };

  const handlePrimaryAction = async () => {
    if (!isConnected) {
      dispatch(setWalletModal(true));
      return;
    }
    setActivating(true);
    try {
      if (!isAuthenticated) {
        await ensureAuthenticated();
      }
      setIsActivated(true);
    } catch {
      // Wallet modal / toast from auth flow surfaces errors.
    } finally {
      setActivating(false);
    }
  };

  const shareOnX = () => {
    if (!baseReferralLink) return;
    const text = encodeURIComponent(
      `Join me on AlloX — earn when you create your first qualifying portfolio: ${baseReferralLink}`,
    );
    window.open(
      `https://x.com/intent/tweet?text=${text}`,
      "_blank",
      "noopener",
    );
  };

  const submitReferralCode = async (event) => {
    event.preventDefault();
    const code = newCode.trim().toLowerCase();
    if (!code) return;
    setSubmittingCode(true);
    setCodeError("");
    try {
      await apiCall("/referral/code", {
        method: "POST",
        body: JSON.stringify({ code }),
      });
      setNewCode("");
      await loadReferralData();
    } catch (e) {
      setCodeError(e?.message || "Could not save referral code.");
    } finally {
      setSubmittingCode(false);
    }
  };

  const submitClaim = async (event) => {
    event.preventDefault();
    const code = claimCode.trim().toLowerCase();
    if (!code) return;
    setClaiming(true);
    setClaimError("");
    try {
      await apiCall("/referral/claim", {
        method: "POST",
        body: JSON.stringify({ code }),
      });
      setClaimCode("");
      await loadReferralData();
    } catch (e) {
      setClaimError(e?.message || "Could not claim referral code.");
    } finally {
      setClaiming(false);
    }
  };

  const formatTimeAgo = (date) => {
    const seconds = Math.floor((Date.now() - date.getTime()) / 1000);

    if (seconds < 60) return "just now";
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  const getFilteredData = (data) => {
    const now = Date.now();
    let timeLimit = 0;

    if (dateFilter === "24h") timeLimit = now - 24 * 60 * 60 * 1000;
    else if (dateFilter === "7d") timeLimit = now - 7 * 24 * 60 * 60 * 1000;
    else if (dateFilter === "30d") timeLimit = now - 30 * 24 * 60 * 60 * 1000;
    else if (dateFilter === "60d") timeLimit = now - 60 * 24 * 60 * 60 * 1000;
    else if (dateFilter === "90d") timeLimit = now - 90 * 24 * 60 * 60 * 1000;
    else if (dateFilter === "365d") timeLimit = now - 365 * 24 * 60 * 60 * 1000;

    return data.filter((item) => {
      const itemDate = item.registeredDate || item.timestamp;
      if (!itemDate) return true;
      return itemDate.getTime() >= timeLimit;
    });
  };

  const filteredRegistrations = getFilteredData(registrations);
  const filteredActions = getFilteredData(completedActions);

  const getPoolSpecificLink = () => {
    if (!selectedPool || !referralCode) return baseReferralLink;
    const pool = STAKING_POOLS.find((p) => p.id === selectedPool);
    if (!pool) return baseReferralLink;
    return `https://allox.ai/stake?pool=${pool.id}&ref=${referralCode}`;
  };

  const handleDownloadCSV = () => {
    // Prepare CSV data
    const csvRows = [];

    // Headers
    csvRows.push("Type,Wallet,Details,Gems Earned,Points Earned,Date");

    // Add registrations
    filteredRegistrations.forEach((reg) => {
      const date = reg.registeredDate.toLocaleString();
      csvRows.push(`Registration,${reg.wallet},-,-,-,${date}`);
    });

    // Add completed actions
    filteredActions.forEach((action) => {
      const date = action.timestamp.toLocaleString();
      const details =
        action.type === "direct"
          ? `${action.pool} - ${action.lockPeriod}`
          : "Network - 5% earnings";
      csvRows.push(
        `${action.type === "direct" ? "Direct" : "Network"},${action.wallet},${details},${action.gemsEarned},${action.pointsEarned},${date}`,
      );
    });

    // Create CSV content
    const csvContent = csvRows.join("\n");

    // Create blob and download
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);

    link.setAttribute("href", url);
    link.setAttribute("download", `allox-referrals-${dateFilter}.csv`);
    link.style.visibility = "hidden";

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleActionClick = (wallet) => {
    // Calculate user earnings
    const userActions = completedActions.filter(
      (action) => action.wallet === wallet,
    );
    const directActions = userActions.filter((a) => a.type === "direct");
    const networkActions = userActions.filter((a) => a.type === "network");

    const userEarnings = {
      wallet,
      totalGems: userActions.reduce((sum, a) => sum + a.gemsEarned, 0),
      totalPoints: userActions.reduce((sum, a) => sum + a.pointsEarned, 0),
      directGems: directActions.reduce((sum, a) => sum + a.gemsEarned, 0),
      directPoints: directActions.reduce((sum, a) => sum + a.pointsEarned, 0),
      networkGems: networkActions.reduce((sum, a) => sum + a.gemsEarned, 0),
      networkPoints: networkActions.reduce((sum, a) => sum + a.pointsEarned, 0),
      actions: userActions,
    };

    setSelectedUserDetails(userEarnings);
  };

  useEffect(() => {
    window.scrollTo(0, 0);
    document.title = "Referrals";
  }, []);

  // Bootstrap activation state from API so existing referrers skip landing.
  useEffect(() => {
    if (!isAuthenticated) return;
    let cancelled = false;
    (async () => {
      try {
        const me = await apiCall("/referral/me");
        if (cancelled) return;
        setDashboard(me);
        if (me?.referralCode) setIsActivated(true);
      } catch {
        // Dashboard errors are shown by full loader once the user activates.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated && isActivated) {
      loadReferralData();
    }
  }, [isAuthenticated, isActivated, loadReferralData]);

  return (
    <div className="space-y-6 flex-1 px-6 py-8 portfolio-wrapper ms-auto w-full overflow-y-auto">
      {!isActivated ? (
        // Landing Page - Before Activation
        <>
          {/* Header with buttons in top right */}
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-purple-600 via-indigo-600 to-blue-600 p-8 md:p-12 text-white">
            {/* Decorative elements */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-32 -mt-32"></div>
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -ml-32 -mb-32"></div>

            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-4">
                <div className="px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full text-xs font-semibold flex items-center gap-1.5">
                  <Star size={14} className="text-yellow-300" />
                  Referral Program
                </div>
              </div>
              <div className="flex flex-col md:flex-row w-full gap-3">
                <div className="flex flex-col w-full">
                  <h1 className="text-4xl md:text-5xl font-bold mb-4 leading-tight">
                    Earn Up to $100
                    <br />
                    Per Referral
                  </h1>

                  <p className="text-lg text-white/90 mb-6 max-w-2xl">
                    Get paid when your referrals create portfolios. Three
                    independent reward tracks: per-referral bonuses, passive
                    network earnings, and milestone rewards.
                  </p>
                  <button
                    type="button"
                    onClick={handlePrimaryAction}
                    disabled={activating}
                    className="bg-white w-fit text-black px-8 py-3 rounded-xl font-semibold hover:bg-gray-200 transition-colors mb-2 disabled:opacity-60"
                  >
                    {activating
                      ? "Activating..."
                      : !isConnected
                        ? "Connect wallet"
                        : "Activate"}
                  </button>
                </div>
                {/* Stats Grid */}
                <div className="grid grid-cols-1 gap-4 mb-6 w-70 items-center">
                  <div className="bg-white/10 h-fit backdrop-blur-sm rounded-xl p-4 border border-white/20">
                    <div className="flex items-center justify-center gap-2 mb-1">
                      <DollarSign size={16} className="text-yellow-300" />
                      <div className="text-2xl font-bold">$100</div>
                    </div>
                    <div className="text-xs flex justify-center text-white/80">
                      Max Per Referral
                    </div>
                  </div>
                  <div className="bg-white/10 h-fit backdrop-blur-sm rounded-xl p-4 border border-white/20">
                    <div className="flex items-center justify-center gap-2 mb-1">
                      <TrendingUp size={16} className="text-green-300" />
                      <div className="text-2xl font-bold">5%</div>
                    </div>
                    <div className="text-xs text-white/80 flex justify-center">
                      Lifetime Earnings
                    </div>
                  </div>
                  <div className="bg-white/10 h-fit backdrop-blur-sm rounded-xl p-4 border border-white/20">
                    <div className="flex items-center justify-center gap-2 mb-1">
                      <Trophy size={16} className="text-orange-300" />
                      <div className="text-2xl font-bold">$600</div>
                    </div>
                    <div className="text-xs text-white/80 flex justify-center">
                      Milestone Bonus
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-3xl font-bold mb-2">Three Reward Tracks</h2>
              <p className="text-gray-600 text-sm">
                Independent and stackable earning opportunities
              </p>
            </div>

            {/* Info Buttons - Top Right */}
            <div className="flex gap-2">
              <button
                onClick={() => setShowTiersModal(true)}
                className="glass-card px-3 py-2 hover:bg-gray-50 transition-colors flex items-center gap-2 text-xs whitespace-nowrap"
              >
                <Award size={14} className="text-gray-700" />
                <span className="font-medium text-gray-700">View Details</span>
              </button>
              <button
                onClick={() => setFaqModalOpen(true)}
                className="glass-card px-3 py-2 hover:bg-gray-50 transition-colors flex items-center gap-2 text-xs whitespace-nowrap"
              >
                <HelpCircle size={14} className="text-gray-700" />
                <span className="font-medium text-gray-700">FAQs</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Track 1: Per Referral Reward */}
            <div className="glass-card p-6 border-2 border-green-200 bg-gradient-to-br from-green-50/50 to-emerald-50/50">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center">
                  <DollarSign size={24} className="text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-lg">Track 1</h3>
                  <p className="text-xs text-gray-600">Per Referral Reward</p>
                </div>
              </div>
              <p className="text-sm text-gray-700 mb-4">
                Earn <strong>$5 to $100</strong> every time a direct referral
                creates a qualifying portfolio.
              </p>
              <div className="bg-white/60 rounded-lg p-3 space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-gray-600">$100-$499</span>
                  <span className="font-bold text-green-700">$5</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-600">$500-$999</span>
                  <span className="font-bold text-green-700">$25</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-600">$1K-$2.4K</span>
                  <span className="font-bold text-green-700">$50</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-600">$2.5K+</span>
                  <span className="font-bold text-green-700">$100</span>
                </div>
              </div>
            </div>

            {/* Track 2: Level 2 Passive Earnings */}
            <div className="glass-card p-6 border-2 border-blue-200 bg-gradient-to-br from-blue-50/50 to-indigo-50/50">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center">
                  <Sparkles size={24} className="text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-lg">Track 2</h3>
                  <p className="text-xs text-gray-600">Level 2 Passive</p>
                </div>
              </div>
              <p className="text-sm text-gray-700 mb-4">
                Earn <strong>5% of whatever your direct referrals earn</strong>{" "}
                from their own referrals. Automatic, lifetime earnings.
              </p>
              <div className="bg-white/60 rounded-lg p-3 space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-gray-600">They earn $5</span>
                  <span className="font-bold text-blue-700">You get $0.25</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-600">They earn $25</span>
                  <span className="font-bold text-blue-700">You get $1.25</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-600">They earn $50</span>
                  <span className="font-bold text-blue-700">You get $2.50</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-600">They earn $100</span>
                  <span className="font-bold text-blue-700">You get $5.00</span>
                </div>
              </div>
            </div>

            {/* Track 3: Milestone Bonuses */}
            <div className="glass-card p-6 border-2 border-purple-200 bg-gradient-to-br from-purple-50/50 to-pink-50/50">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-600 rounded-2xl flex items-center justify-center">
                  <Trophy size={24} className="text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-lg">Track 3</h3>
                  <p className="text-xs text-gray-600">Milestone Bonuses</p>
                </div>
              </div>
              <p className="text-sm text-gray-700 mb-4">
                Unlock <strong>one-time bonuses</strong> as your total direct
                referrals grow. Each milestone triggers independently.
              </p>
              <div className="bg-white/60 rounded-lg p-3 space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-gray-600">10 referrals</span>
                  <span className="font-bold text-purple-700">$30</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-600">50 referrals</span>
                  <span className="font-bold text-purple-700">$150</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-600">150 referrals</span>
                  <span className="font-bold text-purple-700">$300</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-600">250 referrals</span>
                  <span className="font-bold text-purple-700">$600</span>
                </div>
              </div>
            </div>
          </div>

          {/* Benefits Table */}
          {/* <div className="glass-card p-8 overflow-x-auto border-2 border-indigo-200 bg-gradient-to-br from-indigo-50/50 to-purple-50/50"> */}
          {/* Column Headers */}
          {/* <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="col-span-1"></div> */}

          {/* Direct Referral Header */}
          {/* <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl p-4 shadow-lg">
                <div className="flex items-center justify-center gap-2">
                  <Users size={24} className="text-white" />
                  <h3 className="text-lg font-bold text-white">
                    Direct Referral
                  </h3>
                </div>
                <p className="text-center text-white/90 text-sm">
                  Your direct invites
                </p>
              </div> */}

          {/* Network Referral Header */}
          {/* <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl p-4 shadow-lg">
                <div className="flex items-center justify-center gap-2">
                  <Sparkles size={24} className="text-white" />
                  <h3 className="text-lg font-bold text-white">
                    Network Referral
                  </h3>
                </div>
                <p className="text-center text-white/90 text-sm">
                  Your referrals' invites
                </p>
              </div>
            </div> */}

          {/* Benefits Rows */}
          {/* <div className="space-y-1"> */}
          {/* Benefit 1 */}
          {/* <div className="grid grid-cols-3 gap-4 items-center bg-white/60 rounded-xl p-3 hover:shadow-md transition-shadow">
                <div className="col-span-1 font-medium text-sm text-gray-800">
                  Earn Gems from staking
                </div>
                <div className="flex justify-center">
                  <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                    <Check
                      className="text-green-600"
                      size={20}
                      strokeWidth={3}
                    />
                  </div>
                </div>
                <div className="flex justify-center">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <Check
                      className="text-blue-600"
                      size={20}
                      strokeWidth={3}
                    />
                  </div>
                </div>
              </div> */}

          {/* Benefit 2 */}
          {/* <div className="grid grid-cols-3 gap-4 items-center bg-white/60 rounded-xl p-3 hover:shadow-md transition-shadow">
                <div className="col-span-1 font-medium text-sm text-gray-800">
                  30-day referral tracking
                </div>
                <div className="flex justify-center">
                  <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                    <Check
                      className="text-green-600"
                      size={20}
                      strokeWidth={3}
                    />
                  </div>
                </div>
                <div className="flex justify-center">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <Check
                      className="text-blue-600"
                      size={20}
                      strokeWidth={3}
                    />
                  </div>
                </div>
              </div> */}

          {/* Benefit 3 */}
          {/* <div className="grid grid-cols-3 gap-4 items-center bg-white/60 rounded-xl p-3 hover:shadow-md transition-shadow">
                <div className="col-span-1 font-medium text-sm text-gray-800">
                  Verified wallet rewards
                </div>
                <div className="flex justify-center">
                  <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                    <Check
                      className="text-green-600"
                      size={20}
                      strokeWidth={3}
                    />
                  </div>
                </div>
                <div className="flex justify-center">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <Check
                      className="text-blue-600"
                      size={20}
                      strokeWidth={3}
                    />
                  </div>
                </div>
              </div> */}

          {/* Benefit 4 */}
          {/* <div className="grid grid-cols-3 gap-4 items-center bg-white/60 rounded-xl p-3 hover:shadow-md transition-shadow">
                <div className="col-span-1 font-medium text-sm text-gray-800">
                  Referral dashboard tracking
                </div>
                <div className="flex justify-center">
                  <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                    <Check
                      className="text-green-600"
                      size={20}
                      strokeWidth={3}
                    />
                  </div>
                </div>
                <div className="flex justify-center">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <Check
                      className="text-blue-600"
                      size={20}
                      strokeWidth={3}
                    />
                  </div>
                </div>
              </div> */}

          {/* Benefit 5 */}
          {/* <div className="grid grid-cols-3 gap-4 items-center bg-white/60 rounded-xl p-3 hover:shadow-md transition-shadow">
                <div className="col-span-1 font-medium text-sm text-gray-800">
                  Unlimited earning duration
                </div>
                <div className="flex justify-center">
                  <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                    <Check
                      className="text-green-600"
                      size={20}
                      strokeWidth={3}
                    />
                  </div>
                </div>
                <div className="flex justify-center">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <Check
                      className="text-blue-600"
                      size={20}
                      strokeWidth={3}
                    />
                  </div>
                </div>
              </div> */}

          {/* Benefit 6 - Highlight difference */}
          {/* <div className="grid grid-cols-3 gap-4 items-center bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl p-3 border-2 border-indigo-200 hover:shadow-md transition-shadow">
                <div className="col-span-1">
                  <div className="font-semibold text-sm text-gray-900">
                    Earn from referral network
                  </div>
                  <div className="text-xs text-indigo-600 mt-1 font-medium">
                    Network Exclusive
                  </div>
                </div>
                <div className="flex justify-center">
                  <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                    <X className="text-gray-400" size={20} strokeWidth={3} />
                  </div>
                </div>
                <div className="flex justify-center">
                  <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center shadow-lg">
                    <Check className="text-white" size={20} strokeWidth={3} />
                  </div>
                </div>
              </div> */}

          {/* Benefit 7 - Highlight difference */}
          {/* <div className="grid grid-cols-3 gap-4 items-center bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl p-3 border-2 border-indigo-200 hover:shadow-md transition-shadow">
                <div className="col-span-1">
                  <div className="font-semibold text-sm text-gray-900">
                    5% network earnings share
                  </div>
                  <div className="text-xs text-indigo-600 mt-1 font-medium">
                    Passive Income
                  </div>
                </div>
                <div className="flex justify-center">
                  <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                    <X className="text-gray-400" size={20} strokeWidth={3} />
                  </div>
                </div>
                <div className="flex justify-center">
                  <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center shadow-lg">
                    <Check className="text-white" size={20} strokeWidth={3} />
                  </div>
                </div>
              </div>
            </div>
          </div> */}
        </>
      ) : (
        // Dashboard - After Activation
        <>
          {/* Header with buttons in top right */}
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between">
            <div>
              <h2 className="text-3xl font-bold mb-2">Referral Dashboard</h2>
              <p className="text-gray-600 text-sm">
                Track your referrals and earnings
                {dashboard?.referredBy ? " · You joined via a referral" : ""}
              </p>
              {dashboardError && (
                <p className="text-xs text-red-600 mt-1">{dashboardError}</p>
              )}
            </div>

            {/* Info Buttons - Top Right */}
            <div className="flex gap-2">
              <button
                onClick={() => setShowBenefitsModal(true)}
                className="bg-white rounded-full hover:bg-gray-200 transition-colors px-3 py-2  transition-colors flex items-center gap-2 text-xs whitespace-nowrap"
              >
                <Info size={14} className="text-blue-600" />
                <span className="font-medium">Program Benefits</span>
              </button>
              <button
                onClick={() => setShowTiersModal(true)}
                className="bg-white rounded-full hover:bg-gray-200 transition-colors px-3 py-2  transition-colors flex items-center gap-2 text-xs whitespace-nowrap"
              >
                <Gem size={14} className="text-purple-600" />
                <span className="font-medium">How Rewards Work</span>
              </button>
              <button
                onClick={() => setFaqModalOpen(true)}
                className="bg-white rounded-full hover:bg-gray-200 transition-colors px-3 py-2 transition-colors flex items-center gap-2 text-xs whitespace-nowrap"
              >
                <HelpCircle size={14} className="text-purple-600" />
                <span className="font-medium">FAQs</span>
              </button>
            </div>
          </div>

          {dashboardLoading && (
            <p className="text-sm text-gray-500">Loading referral data...</p>
          )}

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="glass-card p-5">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl flex items-center justify-center">
                  <DollarSign size={18} className="text-white" />
                </div>
                <div>
                  <div className="text-xs text-gray-600">Total Earned</div>
                  <div className="text-2xl font-bold">${totalEarnings}</div>
                </div>
              </div>
            </div>

            <div className="glass-card p-5">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
                  <Target size={18} className="text-green-600" />
                </div>
                <div>
                  <div className="text-xs text-gray-600">Track 1 & 2</div>
                  <div className="text-2xl font-bold">
                    ${directEarnings + networkEarnings}
                  </div>
                </div>
              </div>
            </div>

            <div className="glass-card p-5">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
                  <Trophy size={18} className="text-purple-600" />
                </div>
                <div>
                  <div className="text-xs text-gray-600">Milestones</div>
                  <div className="text-2xl font-bold">${milestoneEarnings}</div>
                </div>
              </div>
            </div>

            <div className="glass-card p-5">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                  <Users size={18} className="text-blue-600" />
                </div>
                <div>
                  <div className="text-xs text-gray-600">Referrals</div>
                  <div className="text-2xl font-bold">{totalReferrals}</div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row justify-between gap-4">
            <div className="glass-card p-5 w-full">
              <h3 className="font-bold text-sm mb-4">Earnings Breakdown</h3>
              <div className="grid gap-3">
                <div className="flex items-center justify-between px-3 py-2 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center gap-2">
                    <DollarSign size={14} className="text-green-600" />
                    <span className="text-xs font-medium text-green-800">
                      Track 1: Direct
                    </span>
                  </div>
                  <span className="text-sm font-bold text-green-900">
                    ${directEarnings}
                  </span>
                </div>
                <div className="flex items-center justify-between px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Sparkles size={14} className="text-blue-600" />
                    <span className="text-xs font-medium text-blue-800">
                      Track 2: Network
                    </span>
                  </div>
                  <span className="text-sm font-bold text-blue-900">
                    ${networkEarnings}
                  </span>
                </div>
                <div className="flex items-center justify-between px-3 py-2 bg-purple-50 border border-purple-200 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Trophy size={14} className="text-purple-600" />
                    <span className="text-xs font-medium text-purple-800">
                      Track 3: Milestones
                    </span>
                  </div>
                  <span className="text-sm font-bold text-purple-900">
                    ${milestoneEarnings}
                  </span>
                </div>
              </div>
            </div>

            {/* Referral Link Section */}
            <div className="glass-card p-5 w-full">
              <h3 className="font-bold text-sm mb-3">Your Referral Link</h3>
              {referralCode ? (
                <>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={baseReferralLink}
                      readOnly
                      className="flex-1 px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-xs font-mono"
                    />
                    <button
                      onClick={() => handleCopy(baseReferralLink)}
                      className="px-4 py-2 bg-black text-white rounded-lg font-semibold hover:bg-gray-800 transition-colors flex items-center gap-2 whitespace-nowrap text-xs"
                    >
                      {copied ? <Check size={14} /> : <Copy size={14} />}
                      {copied ? "Copied" : "Copy"}
                    </button>
                  </div>
                  <p className="text-xs text-gray-600 my-2">
                    Share this link with your network. When someone creates a
                    portfolio with $100+ investment, you earn instantly.
                  </p>
                </>
              ) : (
                <>
                  <p className="text-xs text-gray-600 my-2">
                    Create your referral code to generate a shareable invite
                    link.
                  </p>
                  <form onSubmit={submitReferralCode} className="space-y-2">
                    <input
                      value={newCode}
                      onChange={(e) => setNewCode(e.target.value)}
                      placeholder="Set your referral code"
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs"
                    />
                    {codeError && (
                      <p className="text-xs text-red-600">{codeError}</p>
                    )}
                    <button
                      type="submit"
                      disabled={submittingCode || !newCode.trim()}
                      className="px-4 py-2 bg-black text-white rounded-lg text-xs font-semibold disabled:opacity-50"
                    >
                      {submittingCode ? "Saving..." : "Create code"}
                    </button>
                  </form>
                </>
              )}
            </div>
          </div>

          {/* {!dashboard?.referredBy && (
            <form
              onSubmit={submitClaim}
              className="glass-card p-5 flex flex-col sm:flex-row gap-2 items-end"
            >
              <div className="flex-1 w-full">
                <label className="text-xs font-semibold block mb-1">
                  Have a referral code?
                </label>
                <input
                  value={claimCode}
                  onChange={(e) => setClaimCode(e.target.value)}
                  placeholder="Enter code if you missed ?ref="
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs"
                />
                {claimError && (
                  <p className="text-xs text-red-600 mt-1">{claimError}</p>
                )}
              </div>
              <button
                type="submit"
                disabled={claiming || !claimCode.trim()}
                className="px-4 py-2 bg-black text-white rounded-lg text-xs font-semibold disabled:opacity-50"
              >
                {claiming ? "Claiming..." : "Claim"}
              </button>
            </form>
          )} */}

          {/* Date Filter */}
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-lg">Activity</h3>
            <div className="flex items-center gap-2">
              <Calendar size={14} className="text-gray-400" />
              <select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-black/10"
              >
                <option value="24h">Last 24 Hours</option>
                <option value="7d">Last 7 Days</option>
                <option value="30d">Last 30 Days</option>
                <option value="60d">Last 60 Days</option>
                <option value="90d">Last 90 Days</option>
                <option value="365d">Last Year</option>
              </select>
              <button
                onClick={handleDownloadCSV}
                className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
                title="Download as CSV"
              >
                <Download size={16} className="text-gray-600" />
              </button>
            </div>
          </div>

          {/* Two Tables Side by Side */}
          <div className="grid grid-cols-1 lg:grid-cols-[3fr_7fr] max-h-[350px] gap-4">
            {/* Left Table: Registrations */}
            <div className="glass-card p-5">
              <h3 className="font-bold text-sm mb-4">Registrations</h3>

              <div className="overflow-auto max-h-[500px]">
                {filteredRegistrations.length > 0 ? (
                  <div className="space-y-2">
                    {filteredRegistrations.map((reg) => (
                      <div
                        key={reg.id}
                        className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-gray-50 transition-colors group"
                      >
                        <div className="flex items-center gap-2">
                          <div className="relative group/icon">
                            {reg.hasActivatedReferral ? (
                              <CheckCircle2
                                size={16}
                                className="text-blue-600"
                              />
                            ) : (
                              <div className="w-4 h-4 rounded-full border-2 border-gray-300"></div>
                            )}
                            {/* Tooltip */}
                            {reg.hasActivatedReferral && (
                              <div className="absolute left-6 top-1/2 -translate-y-1/2 whitespace-nowrap bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover/icon:opacity-100 transition-opacity pointer-events-none z-10">
                                User activated referral
                              </div>
                            )}
                          </div>
                          <span className="font-mono text-xs">
                            {reg.wallet}
                          </span>
                        </div>
                        <span className="text-xs text-gray-500">
                          {formatTimeAgo(reg.registeredDate)}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 text-gray-500">
                    <Users size={32} className="mx-auto mb-2 opacity-20" />
                    <p className="text-xs">No registrations yet.</p>
                  </div>
                )}
              </div>
            </div>

            {/* Right Table: Completed Actions */}
            <div className="glass-card p-5">
              <h3 className="font-bold text-sm mb-4">Completed Actions</h3>

              <div className="overflow-auto max-h-[450px]">
                {filteredActions.length > 0 ? (
                  <div className="space-y-2">
                    {filteredActions.map((action) => (
                      <motion.div
                        key={action.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        onClick={() => handleActionClick(action.wallet)}
                        className={`p-3 rounded-lg border transition-colors cursor-pointer ${
                          action.type === "network"
                            ? "bg-blue-50 border-blue-200 hover:bg-blue-100"
                            : "bg-white border-gray-200 hover:bg-gray-50"
                        }`}
                      >
                        <div className="flex items-start justify-between mb-2 relative">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 mb-1">
                              <span className="font-mono text-xs font-semibold truncate">
                                {action.wallet}
                              </span>
                              <span
                                className={`text-xs px-1.5 py-0.5 rounded-full font-medium flex-shrink-0 ${
                                  action.type === "network"
                                    ? "bg-blue-200 text-blue-800"
                                    : "bg-green-200 text-green-800"
                                }`}
                              >
                                {action.type === "network"
                                  ? "Network"
                                  : "Direct"}
                              </span>
                            </div>

                            {action.type === "direct" ? (
                              <div className="text-xs text-gray-600">
                                {action.pool} · {action.lockPeriod}
                                <span className="block text-gray-500 mt-0.5">
                                  One-time reward per referee
                                </span>
                              </div>
                            ) : (
                              <div className="text-xs text-blue-700">
                                {level2Percent}% passive payout
                              </div>
                            )}
                          </div>

                          <div className="flex flex-col gap-1 ml-2 mt-2 absolute right-0">
                            <div className="flex items-center gap-1 px-2 py-0.5 bg-purple-100 border border-purple-200 rounded">
                              <Gem size={10} className="text-purple-600" />
                              <span className="text-xs font-bold text-purple-700">
                                +{action.gemsEarned}
                              </span>
                            </div>
                            <div className="flex items-center gap-1 px-2 py-0.5 bg-blue-100 border border-blue-200 rounded">
                              <Coins size={10} className="text-blue-600" />
                              <span className="text-xs font-bold text-blue-700">
                                +{action.pointsEarned}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="text-xs text-gray-500">
                          {formatTimeAgo(action.timestamp)}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 text-gray-500">
                    <Gem size={32} className="mx-auto mb-2 opacity-20" />
                    <p className="text-xs">No completed actions yet.</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* API: list pagination */}
          {(listPagination.pages || 1) > 1 && (
            <div className="flex items-center justify-end gap-2 text-xs">
              <span className="text-gray-500">
                Page {listPagination.page || listPage} / {listPagination.pages}
              </span>
              <button
                type="button"
                className="px-2 py-1 border rounded disabled:opacity-40"
                disabled={listPage <= 1}
                onClick={() => reloadListPage(listPage - 1)}
              >
                Prev
              </button>
              <button
                type="button"
                className="px-2 py-1 border rounded disabled:opacity-40"
                disabled={listPage >= (listPagination.pages || 1)}
                onClick={() => reloadListPage(listPage + 1)}
              >
                Next
              </button>
            </div>
          )}

          {/* API: public leaderboard */}
          {leaderboard.length > 0 && (
            <div className="glass-card p-5">
              <h3 className="font-bold text-sm mb-4">Top referrers</h3>
              <div className="space-y-2 max-h-[280px] overflow-auto">
                {leaderboard.map((entry) => (
                  <div
                    key={`${entry.rank}-${entry.display}`}
                    className="flex items-center justify-between py-2 px-3 rounded-lg border border-gray-100"
                  >
                    <div>
                      <span className="text-xs font-semibold">
                        #{entry.rank} {entry.display}
                      </span>
                      <div className="text-xs text-gray-500">
                        {asNumber(entry.activeReferrals)} active /{" "}
                        {asNumber(entry.totalReferrals)} total
                      </div>
                    </div>
                    <div className="text-right text-xs">
                      <div className="font-bold">
                        {asNumber(entry.gemsEarned)} gems
                      </div>
                      <div className="text-gray-500">{entry.tier}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Benefits Modal */}
      <AnimatePresence>
        {showBenefitsModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-auto"
            >
              <div className="sticky top-0 bg-white border-b border-gray-200 p-5 flex items-center justify-between">
                <h2 className="text-xl font-bold">Program Benefits</h2>
                <button
                  onClick={() => setShowBenefitsModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="p-5">
                <div className="grid grid-cols-3 gap-4 mb-6">
                  <div className="flex items-center justify-center">
                    <div className="flex items-center justify-center gap-2">
                      <h3 className="text-lg font-bold text-black">Benefits</h3>
                    </div>
                  </div>

                  {/* Direct Referral Header */}
                  <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl p-4 shadow-lg">
                    <div className="flex items-center justify-center gap-2">
                      <Users size={24} className="text-white" />
                      <h3 className="text-base font-bold text-white">
                        Direct Referral
                      </h3>
                    </div>
                    <p className="text-center text-white/90 text-xs">
                      Your direct invites
                    </p>
                  </div>

                  {/* Network Referral Header */}
                  <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl p-4 shadow-lg">
                    <div className="flex items-center justify-center gap-2">
                      <Sparkles size={24} className="text-white" />
                      <h3 className="text-base font-bold text-white">
                        Network Referral
                      </h3>
                    </div>
                    <p className="text-center text-white/90 text-xs">
                      Your referrals' invites
                    </p>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <div className="space-y-1">
                    {/* Benefit 1 */}
                    <div className="grid grid-cols-3 gap-4 items-center bg-white/60 rounded-xl p-3 transition-shadow">
                      <div className="col-span-1 font-medium text-sm text-gray-800">
                        Earn Gems from staking
                      </div>
                      <div className="flex justify-center">
                        <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                          <Check
                            className="text-green-600"
                            size={20}
                            strokeWidth={3}
                          />
                        </div>
                      </div>
                      <div className="flex justify-center">
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                          <Check
                            className="text-blue-600"
                            size={20}
                            strokeWidth={3}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Benefit 2 */}
                    <div className="grid grid-cols-3 gap-4 items-center bg-white/60 rounded-xl p-3 transition-shadow">
                      <div className="col-span-1 font-medium text-sm text-gray-800">
                        30-day referral tracking
                      </div>
                      <div className="flex justify-center">
                        <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                          <Check
                            className="text-green-600"
                            size={20}
                            strokeWidth={3}
                          />
                        </div>
                      </div>
                      <div className="flex justify-center">
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                          <Check
                            className="text-blue-600"
                            size={20}
                            strokeWidth={3}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Benefit 3 */}
                    <div className="grid grid-cols-3 gap-4 items-center bg-white/60 rounded-xl p-3 transition-shadow">
                      <div className="col-span-1 font-medium text-sm text-gray-800">
                        Verified wallet rewards
                      </div>
                      <div className="flex justify-center">
                        <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                          <Check
                            className="text-green-600"
                            size={20}
                            strokeWidth={3}
                          />
                        </div>
                      </div>
                      <div className="flex justify-center">
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                          <Check
                            className="text-blue-600"
                            size={20}
                            strokeWidth={3}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Benefit 4 */}
                    <div className="grid grid-cols-3 gap-4 items-center bg-white/60 rounded-xl p-3 transition-shadow">
                      <div className="col-span-1 font-medium text-sm text-gray-800">
                        Referral dashboard tracking
                      </div>
                      <div className="flex justify-center">
                        <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                          <Check
                            className="text-green-600"
                            size={20}
                            strokeWidth={3}
                          />
                        </div>
                      </div>
                      <div className="flex justify-center">
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                          <Check
                            className="text-blue-600"
                            size={20}
                            strokeWidth={3}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Benefit 5 */}
                    <div className="grid grid-cols-3 gap-4 items-center bg-white/60 rounded-xl p-3 transition-shadow">
                      <div className="col-span-1 font-medium text-sm text-gray-800">
                        Unlimited earning duration
                      </div>
                      <div className="flex justify-center">
                        <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                          <Check
                            className="text-green-600"
                            size={20}
                            strokeWidth={3}
                          />
                        </div>
                      </div>
                      <div className="flex justify-center">
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                          <Check
                            className="text-blue-600"
                            size={20}
                            strokeWidth={3}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Benefit 6 - Highlight difference */}
                    <div className="grid grid-cols-3 gap-4 items-center bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl p-3 border-2 border-indigo-200 transition-shadow">
                      <div className="col-span-1">
                        <div className="font-semibold text-sm text-gray-900">
                          Earn from referral network
                        </div>
                        <div className="text-xs text-indigo-600 mt-1 font-medium">
                          Network Exclusive
                        </div>
                      </div>
                      <div className="flex justify-center">
                        <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                          <X
                            className="text-gray-400"
                            size={20}
                            strokeWidth={3}
                          />
                        </div>
                      </div>
                      <div className="flex justify-center">
                        <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center shadow-lg">
                          <Check
                            className="text-white"
                            size={20}
                            strokeWidth={3}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Benefit 7 - Highlight difference */}
                    <div className="grid grid-cols-3 gap-4 items-center bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl p-3 border-2 border-indigo-200 transition-shadow">
                      <div className="col-span-1">
                        <div className="font-semibold text-sm text-gray-900">
                          5% network earnings share
                        </div>
                        <div className="text-xs text-indigo-600 mt-1 font-medium">
                          Passive Income
                        </div>
                      </div>
                      <div className="flex justify-center">
                        <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                          <X
                            className="text-gray-400"
                            size={20}
                            strokeWidth={3}
                          />
                        </div>
                      </div>
                      <div className="flex justify-center">
                        <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center shadow-lg">
                          <Check
                            className="text-white"
                            size={20}
                            strokeWidth={3}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Tiers Modal */}
      <AnimatePresence>
        {showTiersModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-auto"
            >
              <div className="sticky top-0 bg-white border-b border-gray-200 p-5 flex items-center justify-between">
                <div className="flex gap-2 flex-col">
                  <h2 className="text-xl font-bold">Three Reward Tracks</h2>
                  <p className="text-gray-600 text-sm mb-4">
                    Independent and stackable earning opportunities
                  </p>
                </div>
                <button
                  onClick={() => setShowTiersModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="p-5">
                <div className="border border-gray-200 rounded-xl p-5 bg-gray-50">
                  <div className="flex items-start gap-3 mb-3">
                    <div className="w-10 h-10 bg-gray-900 rounded-lg flex items-center justify-center flex-shrink-0">
                      <DollarSign size={20} className="text-white" />
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900">
                        Track 1: Per Referral Reward
                      </h3>
                      <p className="text-sm text-gray-600 mt-1">
                        Earn $5 to $100 every time a direct referral creates a
                        qualifying portfolio (min $100 invested)
                      </p>
                    </div>
                  </div>
                  <div className="bg-white rounded-lg p-4 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">
                        $100 – $499 portfolio
                      </span>
                      <span className="font-bold text-gray-900">$5</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">
                        $500 – $999 portfolio
                      </span>
                      <span className="font-bold text-gray-900">$25</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">
                        $1,000 – $2,499 portfolio
                      </span>
                      <span className="font-bold text-gray-900">$50</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">$2,500+ portfolio</span>
                      <span className="font-bold text-gray-900">$100</span>
                    </div>
                  </div>
                </div>

                {/* Track 2 */}
                <div className="border border-gray-200 rounded-xl p-5 bg-gray-50">
                  <div className="flex items-start gap-3 mb-3">
                    <div className="w-10 h-10 bg-gray-900 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Sparkles size={20} className="text-white" />
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900">
                        Track 2: Level 2 Passive Earnings
                      </h3>
                      <p className="text-sm text-gray-600 mt-1">
                        Earn 5% of whatever your direct referrals earn from
                        their own referrals — automatic, lifetime
                      </p>
                    </div>
                  </div>
                  <div className="bg-white rounded-lg p-4 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">They earn $5</span>
                      <span className="font-bold text-gray-900">
                        You get $0.25
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">They earn $25</span>
                      <span className="font-bold text-gray-900">
                        You get $1.25
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">They earn $50</span>
                      <span className="font-bold text-gray-900">
                        You get $2.50
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">They earn $100</span>
                      <span className="font-bold text-gray-900">
                        You get $5.00
                      </span>
                    </div>
                  </div>
                </div>

                {/* Track 3 */}
                <div className="border border-gray-200 rounded-xl p-5 bg-gray-50">
                  <div className="flex items-start gap-3 mb-3">
                    <div className="w-10 h-10 bg-gray-900 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Trophy size={20} className="text-white" />
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900">
                        Track 3: Milestone Bonuses
                      </h3>
                      <p className="text-sm text-gray-600 mt-1">
                        One-time bonuses as your total direct referrals grow
                      </p>
                    </div>
                  </div>
                  <div className="bg-white rounded-lg p-4 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">10 referrals</span>
                      <span className="font-bold text-gray-900">$30 bonus</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">50 referrals</span>
                      <span className="font-bold text-gray-900">
                        $150 bonus
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">150 referrals</span>
                      <span className="font-bold text-gray-900">
                        $300 bonus
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">250 referrals</span>
                      <span className="font-bold text-gray-900">
                        $600 bonus
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Pool Link Modal */}
      <AnimatePresence>
        {showPoolLinkModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl max-w-2xl w-full"
            >
              <div className="border-b border-gray-200 p-5 flex items-center justify-between">
                <h2 className="text-xl font-bold">Create Pool-Specific Link</h2>
                <button
                  onClick={() => setShowPoolLinkModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="p-5">
                <p className="text-sm text-gray-600 mb-4">
                  Route your invitees directly to a specific staking pool for
                  higher conversion.
                </p>

                <div className="mb-4">
                  <label className="block text-sm font-medium mb-2">
                    Step 1: Choose a Staking Pool
                  </label>
                  <select
                    value={selectedPool}
                    onChange={(e) => setSelectedPool(e.target.value)}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-lg bg-white text-sm focus:outline-none focus:ring-2 focus:ring-black/10"
                  >
                    <option value="">Select a pool...</option>
                    {STAKING_POOLS.map((pool) => (
                      <option key={pool.id} value={pool.id}>
                        {pool.name} - {pool.lockDays} days
                      </option>
                    ))}
                  </select>
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium mb-2">
                    Step 2: Copy Pool-Specific Link
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={getPoolSpecificLink()}
                      readOnly
                      className="flex-1 px-3 py-2.5 border border-gray-200 rounded-lg bg-gray-50 text-xs font-mono"
                    />
                    <button
                      onClick={() => handleCopy(getPoolSpecificLink())}
                      className="px-4 py-2.5 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors"
                    >
                      <Copy size={16} />
                    </button>
                  </div>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
                  <div className="text-sm font-medium text-blue-900 mb-1.5">
                    💡 How it works
                  </div>
                  <div className="text-xs text-blue-700 space-y-1">
                    <div>
                      • Your invitee lands directly on the selected staking pool
                    </div>
                    <div>
                      • They must complete their first valid stake to activate
                      rewards
                    </div>
                    <div>
                      • You earn Gems and Points based on their staking tier
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* User Details Modal */}
      <AnimatePresence>
        {selectedUserDetails && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
            onClick={() => setSelectedUserDetails(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-auto"
            >
              <div className="sticky top-0 bg-white border-b border-gray-200 p-5 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold">User Earnings</h2>
                  <p className="text-xs text-gray-600 font-mono mt-1">
                    {selectedUserDetails.wallet}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedUserDetails(null)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="p-5 space-y-4">
                {/* Summary */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="glass-card p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Gem size={16} className="text-purple-600" />
                      <div className="text-xs text-gray-600">Total Gems</div>
                    </div>
                    <div className="text-2xl font-bold">
                      {selectedUserDetails.totalGems}
                    </div>
                  </div>
                  <div className="glass-card p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Coins size={16} className="text-blue-600" />
                      <div className="text-xs text-gray-600">Total Points</div>
                    </div>
                    <div className="text-2xl font-bold">
                      {selectedUserDetails.totalPoints.toLocaleString()}
                    </div>
                  </div>
                </div>

                {/* Breakdown */}
                <div className="glass-card p-4">
                  <h3 className="font-bold text-sm mb-3">Earnings Breakdown</h3>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between p-2 bg-green-50 border border-green-200 rounded-lg">
                      <div className="flex items-center gap-2">
                        <Users size={14} className="text-green-600" />
                        <span className="text-xs font-medium">
                          Direct Referrals
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1">
                          <Gem size={12} className="text-purple-600" />
                          <span className="text-sm font-bold">
                            {selectedUserDetails.directGems}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Coins size={12} className="text-blue-600" />
                          <span className="text-sm font-bold">
                            {selectedUserDetails.directPoints}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between p-2 bg-blue-50 border border-blue-200 rounded-lg">
                      <div className="flex items-center gap-2">
                        <Sparkles size={14} className="text-blue-600" />
                        <span className="text-xs font-medium">
                          Network Referrals
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1">
                          <Gem size={12} className="text-purple-600" />
                          <span className="text-sm font-bold">
                            {selectedUserDetails.networkGems}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Coins size={12} className="text-blue-600" />
                          <span className="text-sm font-bold">
                            {selectedUserDetails.networkPoints}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Activity History */}
                <div className="glass-card p-4">
                  <h3 className="font-bold text-sm mb-3">Activity History</h3>
                  <div className="space-y-2 max-h-[300px] overflow-auto">
                    {selectedUserDetails.actions.map((action) => (
                      <div
                        key={action.id}
                        className={`p-3 rounded-lg border ${
                          action.type === "network"
                            ? "bg-blue-50 border-blue-200"
                            : "bg-white border-gray-200"
                        }`}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span
                                className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                                  action.type === "network"
                                    ? "bg-blue-200 text-blue-800"
                                    : "bg-green-200 text-green-800"
                                }`}
                              >
                                {action.type === "network"
                                  ? "Network"
                                  : "Direct"}
                              </span>
                              <span className="text-xs text-gray-500">
                                {formatTimeAgo(action.timestamp)}
                              </span>
                            </div>
                            {action.type === "direct" ? (
                              <div className="text-xs text-gray-600">
                                {action.pool} · {action.lockPeriod}
                                <span className="block text-gray-500 mt-0.5">
                                  One-time reward per referee
                                </span>
                              </div>
                            ) : (
                              <div className="text-xs text-blue-700">
                                {level2Percent}% passive payout
                              </div>
                            )}
                          </div>
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-1 px-2 py-0.5 bg-purple-100 border border-purple-200 rounded">
                              <Gem size={10} className="text-purple-600" />
                              <span className="text-xs font-bold text-purple-700">
                                +{action.gemsEarned}
                              </span>
                            </div>
                            <div className="flex items-center gap-1 px-2 py-0.5 bg-blue-100 border border-blue-200 rounded">
                              <Coins size={10} className="text-blue-600" />
                              <span className="text-xs font-bold text-blue-700">
                                +{action.pointsEarned}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      <FAQReferralModal
        isOpen={faqModalOpen}
        onClose={() => setFaqModalOpen(false)}
      />
    </div>
  );
}
