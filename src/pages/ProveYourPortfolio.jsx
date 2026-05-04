import {
  Trophy,
  Gem,
  Clock,
  Share2,
  Download,
  CheckCircle2,
  Lock,
  TrendingUp,
  Wallet,
  Award,
  Sparkles,
  ExternalLink,
  PlusCircle,
  HandCoins,
  Rocket,
  Flame,
  Target,
  Star,
  Link as LinkIcon,
} from "lucide-react";
import { useState, useEffect, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import Countdown from "react-countdown";
import { useDispatch, useSelector } from "react-redux";
import { useAuth } from "../hooks/useAuth";
import { setWalletModal } from "../redux/slices/walletSlice";
import { apiCall } from "../utils/api";
import { toast } from "../utils/toast";

import topPerformerBg from "../assets/provePortfolio/v2/topPerformer.webp";
import portfolioSnapshotBg from "../assets/provePortfolio/v2/portfoliosnapshot.webp";
import newPortfolioBg from "../assets/provePortfolio/v2/newportfolio.webp";

const PROVE_YOUR_PORTFOLIO_END_DATE = new Date("2026-05-31T23:59:59Z");
const TWITTER_SHARE_TEXT = encodeURIComponent(
  "Just proved my portfolio on @alloxdotai 🚀\n\n#ProveYourPortfolio #AlloX",
);
const TWITTER_SHARE_URL = `https://twitter.com/intent/tweet?text=${TWITTER_SHARE_TEXT}`;

const CARD_DEFINITIONS = [
  {
    key: "top-performer",
    apiType: "TOP_PERFORMER",
    statKey: "topPerformer",
    label: "Top Performer",
    description: "Show off your best % gain this week",
    metricLabel: "This Week's Gain",
    backgroundImage: topPerformerBg,
    Icon: TrendingUp,
    selectedClasses:
      "border-purple-500 bg-gradient-to-br from-purple-50 to-indigo-50 shadow-lg",
    idleClasses:
      "border-gray-200 bg-white/40 hover:border-gray-300 hover:shadow-md",
    accentClasses: "bg-purple-500 text-purple-600 border-purple-200",
  },
  {
    key: "portfolio-snapshot",
    apiType: "SNAPSHOT",
    statKey: "snapshot",
    label: "Portfolio Snapshot",
    description: "Share your on-chain portfolio value",
    metricLabel: "Total Portfolio Value",
    backgroundImage: portfolioSnapshotBg,
    Icon: Wallet,
    selectedClasses:
      "border-blue-500 bg-gradient-to-br from-blue-50 to-cyan-50 shadow-lg",
    idleClasses:
      "border-gray-200 bg-white/40 hover:border-gray-300 hover:shadow-md",
    accentClasses: "bg-blue-500 text-blue-600 border-blue-200",
  },
  {
    key: "new-portfolio",
    apiType: "NEW_PORTFOLIO",
    statKey: "newPortfolio",
    label: "New Portfolio",
    description: "Share a newly created portfolio",
    metricLabel: "New Portfolio Value",
    backgroundImage: newPortfolioBg,
    Icon: PlusCircle,
    selectedClasses:
      "border-green-500 bg-gradient-to-br from-green-50 to-emerald-50 shadow-lg",
    idleClasses:
      "border-gray-200 bg-white/40 hover:border-gray-300 hover:shadow-md",
    accentClasses: "bg-green-500 text-green-600 border-green-200",
  },
];

const BADGE_ICONS = {
  first_10k: HandCoins,
  "10x_token": Rocket,
  "30_day_streak": Flame,
  diamond_hands: Gem,
  portfolio_master: Target,
  early_adopter: Star,
};

const CARD_TYPE_TO_KEY = {
  TOP_PERFORMER: "top-performer",
  SNAPSHOT: "portfolio-snapshot",
  NEW_PORTFOLIO: "new-portfolio",
};

const humanizeReason = (reason) => {
  if (!reason) return "Unavailable for this campaign window";
  return String(reason)
    .toLowerCase()
    .split("_")
    .join(" ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
};

const formatPercent = (value) => {
  const numeric = Number(value ?? 0);
  if (!Number.isFinite(numeric)) return "--";
  const fixed = numeric.toFixed(1);
  return `${numeric >= 0 ? "+" : ""}${fixed}%`;
};

const formatUsd = (value) => {
  const numeric = Number(value ?? 0);
  if (!Number.isFinite(numeric)) return "$0";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: numeric >= 1000 ? 0 : 2,
  }).format(numeric);
};

const formatGems = (value) => {
  const numeric = Number(value ?? 0);
  if (!Number.isFinite(numeric)) return "0";
  return numeric % 1 === 0 ? String(numeric) : numeric.toFixed(1);
};

const formatCountdownHms = ({
  days = 0,
  hours = 0,
  minutes = 0,
  seconds = 0,
}) => {
  const hoursWithDays = Number(days || 0) * 24 + Number(hours || 0);
  return `${String(hoursWithDays).padStart(2, "0")}:${String(
    Number(minutes || 0),
  ).padStart(2, "0")}:${String(Number(seconds || 0)).padStart(2, "0")}`;
};

const buildCardMetric = (definition, stat) => {
  if (!stat?.available) {
    return {
      available: false,
      reason: humanizeReason(stat?.reason),
      metricValue: "Locked",
      detail: humanizeReason(stat?.reason),
    };
  }

  if (definition.apiType === "TOP_PERFORMER") {
    const detail = [stat.symbol, stat.chain].filter(Boolean).join(" · ");
    return {
      available: true,
      metricValue: formatPercent(stat.pnlPercent),
      detail: detail || `${stat.ageDays ?? 0}d position age`,
      reason: "",
    };
  }

  if (definition.apiType === "SNAPSHOT") {
    const detailParts = [];
    if (stat.chainCount != null) detailParts.push(`${stat.chainCount} chains`);
    if (stat.topChain) detailParts.push(`Top: ${stat.topChain}`);
    return {
      available: true,
      metricValue: formatUsd(stat.totalValueUsd),
      detail: detailParts.join(" · ") || "On-chain portfolio",
      reason: "",
    };
  }

  const amountCandidate =
    stat.investmentUsd ??
    stat.totalValueUsd ??
    stat.amountUsd ??
    stat.initialValueUsd ??
    stat.portfolioValueUsd ??
    stat.valueUsd;
  const detailParts = [];
  if (stat.chain) detailParts.push(stat.chain);
  if (stat.tokenCount != null) detailParts.push(`${stat.tokenCount} tokens`);

  return {
    available: true,
    metricValue:
      amountCandidate != null ? formatUsd(amountCandidate) : "New Portfolio",
    detail: detailParts.join(" · ") || "Created during this campaign",
    reason: "",
  };
};

const extractCompetitionCandidates = (payload) => {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload.competitions)) return payload.competitions;
  if (Array.isArray(payload.data)) return payload.data;
  return [payload];
};

const resolveCompetitionId = (payload) => {
  const candidates = extractCompetitionCandidates(payload);
  const proveCompetition =
    candidates.find((item) => {
      const haystack = [
        item?.slug,
        item?.key,
        item?.type,
        item?.name,
        item?.campaign,
        item?.title,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes("prove") && haystack.includes("portfolio");
    }) ?? candidates[0];

  return proveCompetition?.id ?? proveCompetition?._id ?? null;
};

const mapShareErrorMessage = (error) => {
  const message = String(error?.message || "").toLowerCase();

  if (error?.status === 403 || message.includes("link your x account")) {
    return "Link X to participate.";
  }
  if (
    message.includes("missing required hashtag") ||
    Array.isArray(error?.data?.missingHashtags)
  ) {
    return "Add #ProveYourPortfolio #AlloX to your tweet.";
  }
  if (message.includes("must include the card image")) {
    return "Don't forget to attach your card image.";
  }
  if (message.includes("tweet must be original")) {
    return "Post fresh - no retweets or quote-tweets.";
  }
  if (message.includes("not posted during the campaign window")) {
    return "Tweet must be from this week's campaign.";
  }
  if (message.includes("not found in your recent timeline")) {
    return "Try again in a moment, or repost on X.";
  }
  if (message.includes("already shared this card type")) {
    return "Already claimed for this card type.";
  }
  if (
    error?.status === 502 ||
    message.includes("could not read your x timeline")
  ) {
    return "Try again in a moment.";
  }
  if (error?.status === 409) {
    return "This share is already being processed. Refreshing your progress.";
  }
  if (!error?.status) {
    return "Network error. Please retry verification.";
  }
  return error?.message || "Unable to verify your X post.";
};

export function ProveYourPortfolioCampaign() {
  const dispatch = useDispatch();
  const { isConnected: isWalletConnected } = useSelector(
    (state) => state.wallet,
  );
  const { token, isAuthenticated, ensureAuthenticated } = useAuth();
  const [competitionId, setCompetitionId] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [tweetUrl, setTweetUrl] = useState("");
  const [showVerifyInput, setShowVerifyInput] = useState(false);
  const [shareFlowCardType, setShareFlowCardType] = useState(null);
  const [shareFeedback, setShareFeedback] = useState(null);
  const [optimisticGems, setOptimisticGems] = useState(0);
  const [twitterStatus, setTwitterStatus] = useState(null);
  const [cardStats, setCardStats] = useState(null);
  const [progressData, setProgressData] = useState(null);
  const [badgesData, setBadgesData] = useState(null);
  const [participantsData, setParticipantsData] = useState(null);
  const [loading, setLoading] = useState({
    competition: false,
    protected: false,
    participants: false,
    share: false,
    twitterLink: false,
  });
  const [pageError, setPageError] = useState("");

  const loadCompetition = useCallback(async () => {
    setLoading((prev) => ({ ...prev, competition: true }));
    try {
      const payload = await apiCall("/competition/active");
      const nextCompetitionId = resolveCompetitionId(payload);
      if (!nextCompetitionId) {
        throw new Error("No active Prove Your Portfolio competition found.");
      }
      setCompetitionId(nextCompetitionId);
      return nextCompetitionId;
    } catch (error) {
      const message =
        error?.message || "Unable to load the active prove competition.";
      setPageError(message);
      toast.error(message);
      throw error;
    } finally {
      setLoading((prev) => ({ ...prev, competition: false }));
    }
  }, []);

  const fetchParticipants = useCallback(async (cid) => {
    if (!cid) return null;
    setLoading((prev) => ({ ...prev, participants: true }));
    try {
      const data = await apiCall(`/prove/${cid}/participants?limit=50&page=1`);
      setParticipantsData(data);
      return data;
    } catch (error) {
      toast.error(error?.message || "Unable to load participants.");
      return null;
    } finally {
      setLoading((prev) => ({ ...prev, participants: false }));
    }
  }, []);

  const fetchTwitterStatus = useCallback(async () => {
    const data = await apiCall("/twitter/status");
    setTwitterStatus(data);
    return data;
  }, []);

  const fetchProtectedData = useCallback(
    async (cid) => {
      if (!cid || !token) return null;

      setLoading((prev) => ({ ...prev, protected: true }));
      setPageError("");

      try {
        const [statsRes, progressRes, badgesRes, twitterRes] =
          await Promise.all([
            apiCall(`/prove/${cid}/my-card-stats`),
            apiCall(`/prove/${cid}/my-progress`),
            apiCall("/prove/badges"),
            fetchTwitterStatus(),
          ]);

        setCardStats(statsRes);
        setProgressData(progressRes);
        setBadgesData(badgesRes);
        setTwitterStatus(twitterRes);
        return {
          statsRes,
          progressRes,
          badgesRes,
          twitterRes,
        };
      } catch (error) {
        const message =
          error?.message || "Unable to load your prove campaign data.";
        setPageError(message);
        toast.error(message);
        throw error;
      } finally {
        setLoading((prev) => ({ ...prev, protected: false }));
      }
    },
    [fetchTwitterStatus, token],
  );

  const startTwitterLinkFlow = useCallback(async () => {
    setLoading((prev) => ({ ...prev, twitterLink: true }));
    try {
      await ensureAuthenticated();
      let payload;
      try {
        payload = await apiCall("/twitter/auth-url");
      } catch {
        payload = await apiCall("/twitter/auth");
      }
      const authUrl = payload?.authUrl || payload?.url;
      if (!authUrl) {
        throw new Error("Twitter link flow is unavailable right now.");
      }
      window.location.href = authUrl;
    } catch (error) {
      const errorMessage = String(error?.message || "");
      const isRelinkCooldown =
        errorMessage.toUpperCase().includes("RELINK_COOLDOWN") ||
        errorMessage.toLowerCase().includes("relink cooldown");

      if (isRelinkCooldown) {
        await fetchTwitterStatus().catch(() => {});
        return;
      }

      toast.error(error?.message || "Unable to start Twitter linking.");
    } finally {
      setLoading((prev) => ({ ...prev, twitterLink: false }));
    }
  }, [ensureAuthenticated, fetchTwitterStatus]);

  const cardConfigs = useMemo(() => {
    const statsByKey = cardStats?.stats || {};

    return CARD_DEFINITIONS.map((definition) => {
      const stat = statsByKey[definition.statKey];
      const metric = buildCardMetric(definition, stat);
      return {
        ...definition,
        ...metric,
      };
    });
  }, [cardStats]);

  const cardConfigMap = useMemo(
    () =>
      cardConfigs.reduce((accumulator, config) => {
        accumulator[config.key] = config;
        return accumulator;
      }, {}),
    [cardConfigs],
  );

  const activeCardConfig = selectedCategory
    ? cardConfigMap[selectedCategory] || null
    : null;

  const claimedCardTypes = useMemo(() => {
    const shares = progressData?.shares || [];
    return new Set(shares.map((share) => String(share.cardType || "")));
  }, [progressData]);

  const displayedBadges = useMemo(() => {
    const badges = badgesData?.badges || [];
    return badges.map((badge) => ({
      ...badge,
      Icon: BADGE_ICONS[badge.id] || Award,
    }));
  }, [badgesData]);

  const unlockedBadgeCount = displayedBadges.filter(
    (badge) => badge.unlocked,
  ).length;
  const totalGemsAwarded =
    Number(progressData?.gemsAwarded || 0) + Number(optimisticGems || 0);
  const relinkCountdownTarget = useMemo(() => {
    const cooldown = twitterStatus?.cooldown;
    const relinkAt = cooldown?.relinkAt;
    if (!cooldown || cooldown.allowed || !relinkAt) return null;
    const timestamp = new Date(relinkAt).getTime();
    if (!Number.isFinite(timestamp) || timestamp <= Date.now()) return null;
    return timestamp;
  }, [twitterStatus]);
  const hasRelinkCooldown = Boolean(relinkCountdownTarget);

  useEffect(() => {
    window.scrollTo(0, 0);
    document.title = "Prove Your Portfolio";
  }, []);

  useEffect(() => {
    loadCompetition()
      .then((cid) => {
        fetchParticipants(cid).catch(() => {});
      })
      .catch(() => {});
  }, [fetchParticipants, loadCompetition]);

  useEffect(() => {
    if (!competitionId || !token) return;
    fetchProtectedData(competitionId).catch(() => {});
  }, [competitionId, fetchProtectedData, token]);

  useEffect(() => {
    if (!cardConfigs.length) return;
    const selectedIsUsable =
      selectedCategory && cardConfigMap[selectedCategory];
    if (selectedIsUsable) return;
    const firstAvailable =
      cardConfigs.find((card) => card.available)?.key ?? null;
    setSelectedCategory(firstAvailable);
  }, [cardConfigMap, cardConfigs, selectedCategory]);

  const handleDownloadCard = async () => {
    if (!activeCardConfig) return;

    try {
      const canvas = document.createElement("canvas");
      const exportSize = 1200;
      canvas.width = exportSize;
      canvas.height = exportSize;

      const context = canvas.getContext("2d");
      if (!context) return;

      const backgroundImage = await new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = activeCardConfig.backgroundImage;
      });

      const radius = 48;
      context.save();
      context.beginPath();
      context.moveTo(radius, 0);
      context.lineTo(exportSize - radius, 0);
      context.quadraticCurveTo(exportSize, 0, exportSize, radius);
      context.lineTo(exportSize, exportSize - radius);
      context.quadraticCurveTo(
        exportSize,
        exportSize,
        exportSize - radius,
        exportSize,
      );
      context.lineTo(radius, exportSize);
      context.quadraticCurveTo(0, exportSize, 0, exportSize - radius);
      context.lineTo(0, radius);
      context.quadraticCurveTo(0, 0, radius, 0);
      context.closePath();
      context.clip();

      context.drawImage(backgroundImage, 0, 0, exportSize, exportSize);

      context.textAlign = "center";
      context.fillStyle = "#ffffff";
      context.font = "800 86px Inter, Arial, sans-serif";
      context.fillText(activeCardConfig.metricValue, 600, 1050);

      context.textAlign = "center";
      context.fillStyle = "#ffffffbf";
      context.font = "400 30px Inter, Arial, sans-serif";
      context.fillText(activeCardConfig.detail, 600, 1100);

      context.restore();

      canvas.toBlob((blob) => {
        if (!blob) return;
        const pngUrl = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = pngUrl;
        link.download = `allox-${selectedCategory}-card.png`;
        link.click();
        URL.revokeObjectURL(pngUrl);
      }, "image/png");
    } catch {
      toast.error("Could not download the card. Please try again.");
    }
  };

  const ensureSharePrerequisites = useCallback(async () => {
    try {
      await ensureAuthenticated();
    } catch (error) {
      if (!isWalletConnected) {
        dispatch(setWalletModal(true));
      }
      throw error;
    }

    const cid = competitionId || (await loadCompetition());
    if (!cardStats || !progressData || !badgesData) {
      await fetchProtectedData(cid);
    }

    const latestTwitterStatus =
      twitterStatus?.linked != null
        ? twitterStatus
        : await fetchTwitterStatus();

    if (!latestTwitterStatus?.linked) {
      setShowVerifyInput(true);
      throw new Error("Link X to participate.");
    }

    return cid;
  }, [
    badgesData,
    cardStats,
    competitionId,
    dispatch,
    ensureAuthenticated,
    fetchProtectedData,
    fetchTwitterStatus,
    isWalletConnected,
    loadCompetition,
    progressData,
    twitterStatus,
  ]);

  const handleShareOnX = useCallback(async () => {
    if (!activeCardConfig?.available) {
      toast.error(
        activeCardConfig?.reason || "This card is not available yet.",
      );
      return;
    }

    try {
      await ensureSharePrerequisites();
    } catch (error) {
      toast.error(error?.message || "You need to be ready before sharing.");
      return;
    }

    await handleDownloadCard();
    window.open(TWITTER_SHARE_URL, "_blank", "noopener");
    setShowVerifyInput(true);
    setShareFlowCardType(activeCardConfig.apiType);
    setShareFeedback(null);
  }, [activeCardConfig, ensureSharePrerequisites]);

  const handleSubmitLink = useCallback(
    async (linkValue) => {
      if (!activeCardConfig?.available || !competitionId) return;
      const hasStartedFlowForThisCard =
        shareFlowCardType === activeCardConfig.apiType;
      if (!hasStartedFlowForThisCard) {
        const message =
          "Click Share on X first, publish your tweet, then paste its link here.";
        setShareFeedback({ type: "error", message });
        toast.error(message);
        return;
      }

      const trimmedLink = String(linkValue || "").trim();
      if (!trimmedLink) {
        const message = "Paste your tweet URL before verifying.";
        setShareFeedback({ type: "error", message });
        toast.error(message);
        return;
      }

      if (!/^https?:\/\/(x\.com|twitter\.com)\//i.test(trimmedLink)) {
        const message = "Paste a valid X post URL.";
        setShareFeedback({ type: "error", message });
        toast.error(message);
        return;
      }

      if (claimedCardTypes.has(activeCardConfig.apiType)) {
        const message = "Already claimed for this card type.";
        setShareFeedback({ type: "error", message });
        toast.error(message);
        return;
      }

      setLoading((prev) => ({ ...prev, share: true }));
      setShareFeedback(null);

      try {
        await ensureSharePrerequisites();

        const response = await apiCall(`/prove/${competitionId}/share`, {
          method: "POST",
          body: JSON.stringify({
            cardType: activeCardConfig.apiType,
            tweetUrl: trimmedLink,
          }),
        });

        setOptimisticGems((prev) => prev + Number(response?.gemsCredited || 0));
        setShareFeedback({
          type: "success",
          message: `Verified. ${formatGems(response?.gemsCredited || 0)} gems credited.`,
          data: response,
        });
        setTweetUrl("");

        const progressPromise = apiCall(`/prove/${competitionId}/my-progress`)
          .then((data) => {
            setProgressData(data);
            return data;
          })
          .catch(() => null);

        const participantsPromise = fetchParticipants(competitionId);
        const badgePromise =
          Array.isArray(response?.newBadges) && response.newBadges.length > 0
            ? apiCall("/prove/badges")
                .then((data) => {
                  setBadgesData(data);
                  return data;
                })
                .catch(() => null)
            : Promise.resolve(null);

        await Promise.all([progressPromise, participantsPromise, badgePromise]);
        toast.success("Your X post has been verified.");
      } catch (error) {
        const message = mapShareErrorMessage(error);
        setShareFeedback({ type: "error", message });

        if (error?.status === 403) {
          setTwitterStatus((prev) => ({ ...prev, linked: false }));
          setShowVerifyInput(true);
        }

        if (error?.status === 409) {
          apiCall(`/prove/${competitionId}/my-progress`)
            .then((data) => setProgressData(data))
            .catch(() => {});
        }

        toast.error(message);
      } finally {
        setLoading((prev) => ({ ...prev, share: false }));
      }
    },
    [
      activeCardConfig,
      claimedCardTypes,
      competitionId,
      ensureSharePrerequisites,
      fetchParticipants,
      shareFlowCardType,
    ],
  );

  const renderCountdown = ({ completed, days, hours, minutes, seconds }) => {
    const values = completed
      ? { days: 0, hours: 0, minutes: 0, seconds: 0 }
      : { days, hours, minutes, seconds };

    return (
      <div className="flex items-center gap-2 justify-center">
        <div className="text-center">
          <div className="text-2xl font-bold text-gray-900">{values.days}</div>
          <div className="text-[10px] text-gray-600 uppercase">Days</div>
        </div>
        <div className="text-xl text-gray-400">:</div>
        <div className="text-center">
          <div className="text-2xl font-bold text-gray-900">
            {String(values.hours).padStart(2, "0")}
          </div>
          <div className="text-[10px] text-gray-600 uppercase">Hours</div>
        </div>
        <div className="text-xl text-gray-400">:</div>
        <div className="text-center">
          <div className="text-2xl font-bold text-gray-900">
            {String(values.minutes).padStart(2, "0")}
          </div>
          <div className="text-[10px] text-gray-600 uppercase">Min</div>
        </div>
        <div className="text-xl text-gray-400">:</div>
        <div className="text-center">
          <div className="text-2xl font-bold text-gray-900">
            {String(values.seconds).padStart(2, "0")}
          </div>
          <div className="text-[10px] text-gray-600 uppercase">Sec</div>
        </div>
      </div>
    );
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
              <Countdown
                date={PROVE_YOUR_PORTFOLIO_END_DATE}
                renderer={renderCountdown}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Card Generator Section */}
      <div className="grid lg:grid-cols-2 gap-5 xl:gap-6 items-stretch">
        {/* Left: Category Selector */}
        <div className="glass-card rounded-2xl p-4 sm:p-5 lg:min-h-[430px] h-full">
          <h2 className="text-lg font-bold text-gray-900 mb-3">
            Choose Your Card Type
          </h2>
          <div className="space-y-2.5">
            {cardConfigs.map((card) => {
              const isSelected = selectedCategory === card.key;
              const isClaimed = claimedCardTypes.has(card.apiType);
              const cardStateClasses = !card.available
                ? "border-gray-200 bg-gray-50/80 opacity-70"
                : isSelected
                  ? card.selectedClasses
                  : card.idleClasses;
              const accentBackground = card.accentClasses.split(" ")[0];
              const accentText = card.accentClasses.split(" ")[1];

              return (
                <motion.button
                  key={card.key}
                  type="button"
                  onClick={() => {
                    if (!card.available) return;
                    setSelectedCategory(card.key);
                    setShowVerifyInput(false);
                    setShareFlowCardType(null);
                    setShareFeedback(null);
                  }}
                  className={`w-full text-left p-4 rounded-xl border-2 transition-all ${cardStateClasses}`}
                  whileTap={card.available ? { scale: 0.98 } : undefined}
                  title={!card.available ? card.reason : undefined}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        isSelected && card.available
                          ? accentBackground
                          : "bg-gray-100"
                      }`}
                    >
                      <card.Icon
                        className={`w-5 h-5 ${
                          isSelected && card.available
                            ? "text-white"
                            : "text-gray-600"
                        }`}
                      />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between gap-3 mb-1">
                        <h3 className="font-bold text-gray-900">
                          {card.label}
                        </h3>
                        {!card.available ? (
                          <span className="text-[11px] font-semibold text-gray-500">
                            Unavailable
                          </span>
                        ) : isClaimed ? (
                          <span className="text-[11px] font-semibold text-green-700">
                            Already claimed
                          </span>
                        ) : isSelected ? (
                          <CheckCircle2 className={`w-5 h-5 ${accentText}`} />
                        ) : null}
                      </div>
                      <p className="text-sm text-gray-600">
                        {card.description}
                      </p>
                      {isSelected ? (
                        <div
                          className={`mt-2 pt-2 border-t ${
                            card.accentClasses.split(" ")[2] ||
                            "border-gray-200"
                          }`}
                        >
                          <div className="text-xs text-gray-600 mb-1">
                            {card.metricLabel}
                          </div>
                          <div
                            className={`text-lg font-bold ${
                              card.available ? accentText : "text-gray-500"
                            }`}
                          >
                            {card.metricValue}
                          </div>
                          <div className="text-xs text-gray-600 mt-1">
                            {card.available ? card.detail : card.reason}
                          </div>
                        </div>
                      ) : null}
                    </div>
                  </div>
                </motion.button>
              );
            })}

            <motion.div
              onClick={() => setShowVerifyInput(true)}
              role="button"
              tabIndex={0}
              className={`w-full cursor-pointer text-left p-4 rounded-xl border-2 transition-all ${
                showVerifyInput
                  ? "border-amber-500 bg-gradient-to-br from-amber-50 to-yellow-50 shadow-lg"
                  : "border-gray-200 bg-white/40 hover:border-gray-300 hover:shadow-md"
              }`}
            >
              <div className="flex items-start gap-3">
                <div
                  className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    showVerifyInput ? "bg-amber-500" : "bg-gray-100"
                  }`}
                >
                  <LinkIcon
                    className={`w-5 h-5 ${showVerifyInput ? "text-white" : "text-gray-600"}`}
                  />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="font-bold text-gray-900">Submit Link</h3>
                    {showVerifyInput && (
                      <CheckCircle2 className="w-5 h-5 text-amber-600" />
                    )}
                  </div>
                  <p className="text-sm text-gray-600">
                    Paste your X post URL after sharing your card
                  </p>
                  {showVerifyInput && (
                    <div className="mt-2 pt-2 border-t border-amber-200">
                      {!selectedCategory ? (
                        <div className="text-xs text-gray-600">
                          Choose one of the 3 portfolio cards first.
                        </div>
                      ) : !isAuthenticated ? (
                        <button
                          type="button"
                          onClick={() =>
                            ensureAuthenticated().catch((error) =>
                              toast.error(
                                error?.message || "Unable to authenticate.",
                              ),
                            )
                          }
                          className="mt-1 px-4 py-2 rounded-lg bg-black text-white text-sm font-semibold"
                        >
                          Authenticate to continue
                        </button>
                      ) : !twitterStatus?.linked ? (
                        <div className="space-y-2">
                          <div className="text-xs text-gray-600">
                            Link X to participate before verifying your post.
                          </div>

                          <button
                            type="button"
                            onClick={startTwitterLinkFlow}
                            disabled={loading.twitterLink || hasRelinkCooldown}
                            className="px-4 py-2 rounded-lg bg-black text-white text-sm font-semibold disabled:opacity-70"
                          >
                            {hasRelinkCooldown ? (
                              <>
                                Re-link available in{" "}
                                <Countdown
                                  date={relinkCountdownTarget}
                                  renderer={(args) =>
                                    args.completed
                                      ? "00:00:00"
                                      : formatCountdownHms(args)
                                  }
                                />
                              </>
                            ) : loading.twitterLink ? (
                              "Opening X link flow..."
                            ) : (
                              "Link X to participate"
                            )}
                          </button>
                        </div>
                      ) : (
                        <div className="flex flex-col gap-2">
                          {shareFlowCardType === activeCardConfig?.apiType ? (
                            <div className="text-xs text-gray-600">
                              Paste your tweet URL for{" "}
                              <span className="font-semibold">
                                {activeCardConfig?.label}
                              </span>
                              .
                            </div>
                          ) : (
                            <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1.5">
                              Click{" "}
                              <span className="font-semibold">Share on X</span>{" "}
                              first, publish your post, then paste the tweet
                              link here to verify participation.
                            </div>
                          )}
                          <div className="flex flex-col sm:flex-row items-stretch gap-2">
                            <input
                              id="linkurl"
                              type="text"
                              value={tweetUrl}
                              onChange={(e) => setTweetUrl(e.target.value)}
                              placeholder="https://x.com/yourhandle/status/..."
                              className="w-full text-sm px-4 py-2.5 rounded-xl border border-gray-200 bg-white/80 focus:outline-none focus:ring-2 focus:ring-gray-300 focus:border-transparent"
                            />
                            <button
                              type="button"
                              onClick={() => handleSubmitLink(tweetUrl)}
                              disabled={
                                loading.share ||
                                shareFlowCardType !== activeCardConfig?.apiType
                              }
                              className="px-4 py-2.5 bg-black hover:bg-gray-800 text-white text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1 disabled:opacity-60"
                            >
                              {loading.share ? "Verifying..." : "Verify"}
                            </button>
                          </div>
                          {shareFeedback?.message ? (
                            <div
                              className={`text-xs ${
                                shareFeedback.type === "success"
                                  ? "text-green-700"
                                  : "text-red-600"
                              }`}
                            >
                              {shareFeedback.message}
                            </div>
                          ) : null}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        </div>

        {/* Right: Card Preview */}
        <div className="glass-card rounded-2xl p-4 sm:p-5 lg:min-h-[430px] h-full flex flex-col">
          <h2 className="text-lg font-bold text-gray-900 mb-3">
            Your Card Preview
          </h2>
          <AnimatePresence mode="wait">
            {!isWalletConnected ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="h-full w-full max-w-[380px] mx-auto glass-card rounded-2xl flex flex-col items-center justify-center p-6"
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
                    onClick={() => dispatch(setWalletModal(true))}
                    className="btn-primary py-3 px-6"
                  >
                    Connect Wallet
                  </button>
                </div>
              </motion.div>
            ) : !isAuthenticated ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="h-full w-full max-w-[380px] mx-auto glass-card rounded-2xl flex flex-col items-center justify-center p-6"
              >
                <div className="text-center">
                  <Lock className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                  <h3 className="font-bold text-gray-900 text-lg mb-2">
                    Authenticate to load your prove data
                  </h3>
                  <p className="text-gray-600 text-sm mb-6">
                    We need your JWT session before we can load card stats,
                    badge progress, and the X sharing flow.
                  </p>
                  <button
                    type="button"
                    onClick={() =>
                      ensureAuthenticated().catch((error) =>
                        toast.error(
                          error?.message || "Unable to authenticate.",
                        ),
                      )
                    }
                    className="btn-primary py-3 px-6"
                  >
                    Authenticate
                  </button>
                </div>
              </motion.div>
            ) : activeCardConfig ? (
              <motion.div
                key={selectedCategory}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2 }}
              >
                <div className="aspect-square w-full max-w-[380px] mx-auto rounded-2xl p-6 relative overflow-hidden shadow-xl mb-3">
                  <img
                    src={activeCardConfig?.backgroundImage}
                    alt={activeCardConfig?.label}
                    className="absolute inset-0 w-full h-full"
                  />

                  <div className="relative top-3 h-full flex items-end justify-center">
                    <div className="text-center">
                      {/* <div className="text-white/85 text-[11px] mb-1 uppercase tracking-[0.2em] font-semibold">
                        {activeCardConfig?.metricLabel}
                      </div> */}
                      <div className="text-4xl font-extrabold text-white leading-tight">
                        {activeCardConfig?.metricValue}
                      </div>
                      <div className="text-white/75 text-[11px] uppercase tracking-wider">
                        {activeCardConfig?.detail}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2.5 max-w-[380px] mx-auto">
                  <button
                    type="button"
                    onClick={handleShareOnX}
                    disabled={!activeCardConfig.available || loading.share}
                    className="flex-1 w-full btn-primary py-2.5 flex items-center justify-center gap-2"
                  >
                    <Share2 className="w-4 h-4" />
                    {claimedCardTypes.has(activeCardConfig.apiType)
                      ? "Share Again"
                      : "Share on X"}
                  </button>
                  <button
                    type="button"
                    onClick={handleDownloadCard}
                    disabled={twitterStatus?.linked ? false : true}
                    className="flex-1 w-full px-5 py-2.5 bg-white/60 justify-center backdrop-blur-sm border border-gray-200 rounded-xl text-gray-700 font-semibold hover:bg-white/80 transition-all flex items-center gap-2 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    <Download className="w-4 h-4" />
                    Download
                  </button>
                </div>
                <div className="max-w-[380px] mx-auto mt-3 space-y-2">
                  {twitterStatus?.linked ? (
                    <div className="text-xs text-green-700 bg-green-50 border border-green-200 rounded-xl px-3 py-2">
                      X linked
                      {twitterStatus.username
                        ? ` as @${twitterStatus.username}`
                        : ""}
                      .
                    </div>
                  ) : (
                    <div className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 flex items-center justify-between gap-3">
                      <span>
                        {hasRelinkCooldown ? (
                          <>
                            Re-link available in{" "}
                            <Countdown
                              date={relinkCountdownTarget}
                              renderer={(args) =>
                                args.completed
                                  ? "00:00:00"
                                  : formatCountdownHms(args)
                              }
                            />
                          </>
                        ) : (
                          "Link X to participate in verification and gems rewards."
                        )}
                      </span>
                      <button
                        type="button"
                        onClick={startTwitterLinkFlow}
                        disabled={loading.twitterLink || hasRelinkCooldown}
                        className="shrink-0 font-semibold text-black"
                      >
                        {hasRelinkCooldown ? "Cooldown" : "Link X"}
                      </button>
                    </div>
                  )}
                  {claimedCardTypes.has(activeCardConfig.apiType) ? (
                    <div className="text-xs text-blue-700 bg-blue-50 border border-blue-200 rounded-xl px-3 py-2">
                      This card type has already been claimed in the campaign.
                    </div>
                  ) : null}
                </div>
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="h-full w-full max-w-[380px] mx-auto glass-card rounded-2xl flex flex-col items-center justify-center p-6"
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
          <div className="text-sm text-gray-600 text-right">
            <div>Complete tiers to maximize your earnings</div>
            <div className="font-semibold text-gray-900">
              Gems earned: {formatGems(totalGemsAwarded)}
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          {(progressData?.tiers || []).map((tier) => (
            <div
              key={tier.tierNumber}
              className={`p-5 rounded-xl border-2 transition-all ${
                tier.unlocked
                  ? "border-green-500 bg-gradient-to-br from-green-50 to-emerald-50"
                  : tier.progress !== undefined
                    ? "border-blue-500 bg-gradient-to-br from-blue-50 to-cyan-50"
                    : "border-gray-200 bg-white/40"
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <div
                  className={`px-2 py-1 rounded-lg text-xs font-bold ${
                    tier.unlocked
                      ? "bg-green-500 text-white"
                      : tier.progress !== undefined
                        ? "bg-blue-500 text-white"
                        : "bg-gray-200 text-gray-700"
                  }`}
                >
                  Tier {tier.tierNumber}
                </div>
                {tier.unlocked && (
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                )}
              </div>

              <p className="text-sm text-gray-700 mb-3 min-h-[40px]">
                {tier.label}
              </p>

              {tier.progress !== undefined && tier.threshold ? (
                <div className="mb-3">
                  <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                    <span>Progress</span>
                    <span className="font-bold">
                      {tier.progress}/{tier.threshold}
                    </span>
                  </div>
                  <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-gradient-to-r from-blue-500 to-cyan-500"
                      initial={{ width: 0 }}
                      animate={{
                        width: `${Math.min(
                          100,
                          (Number(tier.progress || 0) /
                            Number(tier.threshold || 1)) *
                            100,
                        )}%`,
                      }}
                      transition={{ duration: 0.5 }}
                    />
                  </div>
                </div>
              ) : null}

              <div className="flex items-center gap-1.5">
                <Gem
                  className={`w-4 h-4 ${tier.unlocked ? "text-green-600" : "text-purple-600"}`}
                />
                <span className="font-bold text-gray-900">
                  +{formatGems(tier.gemReward)} gems
                </span>
              </div>
            </div>
          ))}
        </div>
        {shareFeedback?.type === "success" &&
        Array.isArray(shareFeedback?.data?.newlyAwardedTiers) &&
        shareFeedback.data.newlyAwardedTiers.length > 0 ? (
          <div className="mt-4 rounded-xl border border-green-200 bg-green-50 p-4">
            <div className="font-semibold text-green-900 mb-2">
              Newly unlocked tiers
            </div>
            <div className="flex flex-wrap gap-2">
              {shareFeedback.data.newlyAwardedTiers.map((tier) => (
                <div
                  key={tier.tierNumber}
                  className="px-3 py-1.5 rounded-full bg-white text-sm text-green-800 border border-green-200"
                >
                  Tier {tier.tierNumber}: {tier.label} (+
                  {formatGems(tier.gemReward)} gems)
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>

      {pageError ? (
        <div className="glass-card p-4 text-sm text-red-600">{pageError}</div>
      ) : null}

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="glass-card p-6 min-w-0">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Trophy className="w-6 h-6 text-amber-600" />
              This Week's Participants
            </h2>
          </div>

          <div className="space-y-2">
            {(participantsData?.participants || [])
              .slice(0, 6)
              .map((entry, index) => {
                const latestTweet = entry?.tweets?.[0]?.tweetUrl;
                const displayName = entry?.twitterUsername
                  ? `@${entry.twitterUsername}`
                  : entry?.displayName || "Participant";
                return (
                  <div
                    key={`${displayName}-${index}`}
                    className="p-3 rounded-lg bg-white/40 border border-gray-100"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex-1">
                        <div className="font-semibold text-gray-900 text-sm">
                          {displayName}
                        </div>
                        <div className="text-xs text-gray-600 flex items-center gap-2">
                          <span>{entry.shareCount || 0} shares</span>
                          <span className="text-gray-400">·</span>
                          <span>
                            {(entry.cardTypesShared || []).length} card types
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 px-2 py-1 bg-white/60 rounded-lg">
                        {latestTweet ? (
                          <a
                            href={latestTweet}
                            target="_blank"
                            rel="noreferrer"
                            className="text-xs font-bold text-blue-700 hover:underline inline-flex items-center gap-1"
                          >
                            View
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        ) : (
                          <span className="text-xs font-bold text-gray-500">
                            No link
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            {!loading.participants &&
            !(participantsData?.participants || []).length ? (
              <div className="text-sm text-gray-500">No participants yet.</div>
            ) : null}
          </div>
        </div>

        <div className="glass-card p-6 min-w-0 overflow-hidden">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Award className="w-6 h-6 text-purple-600" />
              Achievement Badges
            </h2>
            <div className="text-sm text-gray-600">
              {unlockedBadgeCount}/{displayedBadges.length || 6} unlocked
            </div>
          </div>

          <div className="w-full max-w-full overflow-x-auto lg:overflow-visible">
            <div className="flex flex-nowrap lg:flex-wrap gap-3 pb-2 lg:pb-0 min-w-max lg:min-w-0 lg:w-full">
              {displayedBadges.map((badge) => (
                <div
                  key={badge.id}
                  className={`flex-shrink-0 w-[160px] lg:w-[160px] min-h-[164px] p-4 rounded-xl transition-all ${
                    badge.unlocked
                      ? "bg-gradient-to-br from-purple-50 to-indigo-50"
                      : "bg-gray-50 opacity-60"
                  }`}
                >
                  <div className="text-center flex flex-col justify-between h-full">
                    <div>
                      <div className="mb-2 flex justify-center">
                        <badge.Icon className="w-8 h-8 text-gray-900" />
                      </div>
                      <div className="font-bold text-sm text-gray-900 mb-1">
                        {badge.label}
                      </div>
                    </div>
                    {badge.unlocked ? (
                      <div className="w-full py-1.5 bg-black text-white text-xs font-semibold rounded-lg flex items-center justify-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        Unlocked
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <div className="text-xs text-gray-600">
                          {badge.current ?? 0}/{badge.total ?? 0}
                        </div>
                        <div className="h-2 rounded-full bg-gray-200 overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-purple-500 to-indigo-500"
                            style={{
                              width: `${Math.min(
                                100,
                                (Number(badge.current || 0) /
                                  Math.max(1, Number(badge.total || 1))) *
                                  100,
                              )}%`,
                            }}
                          />
                        </div>
                        <div className="w-full py-1.5 bg-gray-200 text-gray-500 text-xs font-semibold rounded-lg flex items-center justify-center gap-1">
                          <Lock className="w-3 h-3" />
                          Locked
                        </div>
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
