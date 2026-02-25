import { useRef, useEffect, useState, useCallback } from "react";
import { Send, Loader2, Wallet, Gift, Clock, X, RefreshCw } from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import { ChatBubble } from "../components/ChatBubble";
import {
  addCurrentMessage,
  setIsThinking,
  setMessage,
  setCurrentMessages,
  setViewingHistorySessionId,
  setRateLimit,
  setChatStatus,
} from "../redux/slices/chatSlice";
import { setWalletModal } from "../redux/slices/walletSlice";
import {
  setPointsBalance,
  INITIAL_CLAIM_POINTS,
} from "../redux/slices/pointsSlice";
import { apiCall } from "../utils/api";
import { useAuth } from "../hooks/useAuth";

function formatResetAt(resetAt) {
  if (resetAt == null || resetAt === "") return "";
  // Support ISO date strings (e.g. "2026-02-26T13:51:45.654Z") and timestamps
  const date =
    typeof resetAt === "number"
      ? new Date(resetAt)
      : new Date(String(resetAt).trim());
  if (Number.isNaN(date.getTime())) return "";
  const now = Date.now();
  const ms = date.getTime() - now;
  if (ms <= 0) return "soon";
  const mins = Math.round(ms / 60000);
  if (mins < 60) return `in ${mins} min`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `in ${hours} h`;
  const timeStr = date.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
  const today = new Date();
  const sameDay = (a, b) =>
    a.getDate() === b.getDate() &&
    a.getMonth() === b.getMonth() &&
    a.getFullYear() === b.getFullYear();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  if (sameDay(date, today)) return `at ${timeStr}`;
  if (sameDay(date, tomorrow)) return `tomorrow at ${timeStr}`;
  const dateStr = date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
  return `${dateStr} at ${timeStr}`;
}

export function ChatPage() {
  const dispatch = useDispatch();
  const {
    message,
    currentMessages,
    isThinking,
    viewingHistorySessionId,
    rateLimit,
    chatStatus,
  } = useSelector((state) => state.chat);
  const isReadOnly = !!viewingHistorySessionId;
  const isConnected = useSelector((state) => state.wallet.isConnected);
  const pointsBalance = useSelector((state) => state.points?.balance);
  const messagesRemaining = rateLimit?.remaining;
  const resetAt = rateLimit?.resetAt;
  const canRefresh = chatStatus?.activity?.canRefresh === true;
  const {
    user: authUser,
    setUser,
    ensureAuthenticated,
    claimSeason1,
    logout,
  } = useAuth();

  const speechBoxRef = useRef(null);
  const typingTimerRef = useRef(null);
  const typingMessageRef = useRef(null);
  const completedMessageIdsRef = useRef(new Set());
  const [showWalletPrompt, setShowWalletPrompt] = useState(false);
  const [showWelcomeGiftModal, setShowWelcomeGiftModal] = useState(false);
  const [userDismissedClaimModal, setUserDismissedClaimModal] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [claimError, setClaimError] = useState(null);
  const [claimSuccess, setClaimSuccess] = useState(false);
  const [claimedPoints, setClaimedPoints] = useState(0);
  const [displayedTextById, setDisplayedTextById] = useState({});
  const [typingMessageId, setTypingMessageId] = useState(null);
  const [onchainBlocked, setOnchainBlocked] = useState(null);
  const [refreshOnchainLoading, setRefreshOnchainLoading] = useState(false);
  const [refreshOnchainMessage, setRefreshOnchainMessage] = useState(null);
  const [statusLoading, setStatusLoading] = useState(false);

  useEffect(() => {
    const aiMessages = currentMessages.filter(
      (msg) => msg.type === "ai" && typeof msg.content === "string",
    );

    if (aiMessages.length === 0) return;

    const lastAiMessage = aiMessages[aiMessages.length - 1];

    setDisplayedTextById((prev) => {
      const next = { ...prev };
      aiMessages.forEach((msg) => {
        if (next[msg.id] === undefined) {
          if (msg.id === lastAiMessage.id) {
            next[msg.id] = "";
          } else {
            next[msg.id] = msg.content;
            completedMessageIdsRef.current.add(msg.id);
          }
        }
      });
      return next;
    });
  }, [currentMessages]);

  useEffect(() => {
    return () => {
      if (typingTimerRef.current) {
        clearInterval(typingTimerRef.current);
        typingTimerRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    window.scrollTo(0, 0);
    document.title = "AlloX AI Agent";
  }, []);

  const fetchChatStatus = useCallback(async () => {
    const token = localStorage.getItem("authToken");
    if (!token) return;
    try {
      const status = await apiCall("/chat/status");
      if (status?.rateLimit) {
        dispatch(setRateLimit(status.rateLimit));
      }
      dispatch(
        setChatStatus({
          rateLimit: status?.rateLimit,
          activity: status?.activity ?? null,
          points: status?.points,
          claimed: status?.claimed,
        }),
      );
      if (typeof status?.points === "number") {
        dispatch(setPointsBalance(status.points));
      }
      if (status?.claimed != null) {
        try {
          const stored = JSON.parse(localStorage.getItem("authUser") || "{}");
          setUser({
            ...stored,
            season1: { ...(stored?.season1 ?? {}), claimed: status.claimed },
          });
        } catch (_) {}
      }
    } catch (e) {
      if (e?.status !== 401) console.warn("Chat status fetch failed:", e);
    }
  }, [dispatch, setUser]);

  useEffect(() => {
    fetchChatStatus();
  }, [fetchChatStatus]);

  const handleRefreshLimit = useCallback(async () => {
    if (statusLoading || !canRefresh) return;
    setStatusLoading(true);
    try {
      await fetchChatStatus();
    } finally {
      setStatusLoading(false);
    }
  }, [statusLoading, canRefresh, fetchChatStatus]);

  const setWalletModalOpen = (nextValue) => {
    dispatch(setWalletModal(nextValue));
  };

  const hasAlreadyClaimed = authUser?.season1?.claimed === true;
  const needsToClaimPoints =
    isConnected &&
    !hasAlreadyClaimed &&
    (pointsBalance == null || pointsBalance === 0);
  const handleClaimPoints = async () => {
    setClaimError(null);
    setClaiming(true);
    try {
      // const authRes = await authenticate();
      // const authUser = authRes?.user ?? user;
      // if (authUser?.season1?.claimed) {
      //   setShowWelcomeGiftModal(false);
      //   setClaiming(false);
      //   return;
      // }
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
        setClaimedPoints(u.points ?? 0);
        setClaimSuccess(true);
        setShowWelcomeGiftModal(false);
        setTimeout(() => {
          setClaimSuccess(false);
          setClaimedPoints(0);
        }, 4000);
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

  const scrollToBottom = () => {
    const scrollable = speechBoxRef.current;
    if (scrollable) {
      speechBoxRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "end",
        inline: "nearest",
      });
    }
  };

  const handleRefreshOnchain = useCallback(async () => {
    if (refreshOnchainLoading) return;
    setRefreshOnchainLoading(true);
    setRefreshOnchainMessage(null);
    try {
      const data = await apiCall("/season1/refresh", { method: "POST" });
      const txs = data?.transactions ?? 0;
      const required = data?.required ?? data?.requiredTransactions ?? 1;
      const balance = data?.balance ?? 0;
      const requiredBalance = data?.requiredBalance ?? 5;
      const txsOk = txs >= required;
      const balanceOk = balance >= requiredBalance;
      if (txsOk && balanceOk) {
        setOnchainBlocked(null);
        setRefreshOnchainMessage(null);
      } else {
        const parts = [];
        if (!txsOk) {
          parts.push(
            "Make a transaction on any supported chain (Ethereum, Base, BNB, Solana).",
          );
        }
        if (!balanceOk) {
          parts.push(
            `Have at least $${requiredBalance} on any supported chain (current: $${Number(balance).toFixed(2)}).`,
          );
        }
        setRefreshOnchainMessage(parts.join(" Then tap Refresh again. "));
      }
    } catch (err) {
      const msg =
        err?.data?.message ||
        err?.message ||
        "Refresh failed. Try again or make a transaction on a supported chain.";
      setRefreshOnchainMessage(msg);
    } finally {
      setRefreshOnchainLoading(false);
    }
  }, [refreshOnchainLoading]);

  const buildBotMessage = useCallback((data) => {
    return {
      id: Date.now() + 1,
      type: "ai",
      content: data?.message || "Thanks. What would you like to do next?",
      options: Array.isArray(data?.options) ? data.options : [],
      data,
      timestamp: new Date(),
    };
  }, []);

  const handleSendMessage = () => {
    if (isReadOnly || !message.trim()) return;
    sendChatMessage(message);
    dispatch(setMessage(""));
  };

  const handleStartNewChat = () => {
    dispatch(setViewingHistorySessionId(null));
    dispatch(setCurrentMessages([]));
  };

  const handleInputKeyDown = (event) => {
    if (event.key !== "Enter") return;
    event.preventDefault();
    handleSendMessage();
  };

  const sendChatMessage = useCallback(
    async (text) => {
      const trimmed = text.trim();
      if (!trimmed) return;
      if (isReadOnly) return;

      if (!isConnected) {
        setShowWalletPrompt(true);
        return;
      }
      // const hasEnoughPoints = pointsBalance != null;
      // if (!hasEnoughPoints) {
      //   dispatch(
      //     addCurrentMessage({
      //       id: Date.now() + 1,
      //       type: "ai",
      //       content: `You do not have enough points to send a message. You have ${pointsBalance ?? 0} points.`,
      //       timestamp: new Date(),
      //     }),
      //   );
      //   return;
      // }
      if (messagesRemaining !== null && messagesRemaining <= 0) {
        dispatch(
          addCurrentMessage({
            id: Date.now() + 1,
            type: "ai",
            content:
              "You have no messages remaining in your current limit. Try again later.",
            timestamp: new Date(),
          }),
        );
        return;
      }

      // dispatch(deductPoints(POINTS_DEDUCT_PER_MESSAGE));

      const userMsg = {
        id: Date.now(),
        type: "user",
        content: trimmed,
        timestamp: new Date(),
      };

      dispatch(addCurrentMessage(userMsg));
      dispatch(setIsThinking(true));

      try {
        await ensureAuthenticated();
        const response = await apiCall("/chat/message", {
          method: "POST",
          body: JSON.stringify({ message: trimmed }),
        });
        dispatch(addCurrentMessage(buildBotMessage(response)));

        if (response.points?.total != null) {
          dispatch(setPointsBalance(response.points.total));
        }
        if (response.rateLimit) {
          dispatch(setRateLimit(response.rateLimit));
        }

        // Keep authUser in localStorage in sync with points and rate limit from chat API
        if (response.points || response.rateLimit) {
          const nextUser = {
            ...(authUser ?? {}),
            season1: {
              ...(authUser?.season1 ?? {}),
              ...(response.points?.total != null && {
                points: response.points.total,
              }),
              ...(response.points?.earned != null && {
                lastEarned: response.points.earned,
              }),
              ...(response.points?.breakdown && {
                pointsBreakdown: response.points.breakdown,
              }),
              ...(response.rateLimit && { rateLimit: response.rateLimit }),
            },
          };
          setUser(nextUser);
        }
      } catch (error) {
        if (error?.status === 401) {
          logout();
        }
        const errCode = error?.data?.error;
        const errMessage =
          error?.data?.message ||
          error?.message ||
          "Sorry, something went wrong while reaching the server.";

        if (errCode === "CLAIM_REQUIRED") {
          dispatch(
            addCurrentMessage({
              id: Date.now() + 1,
              type: "ai",
              content: errMessage,
              timestamp: new Date(),
            }),
          );
          setShowWelcomeGiftModal(true);
          return;
        }

        if (error?.status === 403 && errCode === "NO_ONCHAIN_ACTIVITY") {
          const data = error?.data ?? {};
          setOnchainBlocked({
            message: errMessage,
            canRefresh: data.canRefresh === true,
            transactions: data.transactions ?? 0,
            required: data.required ?? data.requiredTransactions ?? 1,
            supportedChains: data.supportedChains ?? [],
            balance: data.balance ?? 0,
            requiredBalance: data.requiredBalance ?? 5,
          });
          setRefreshOnchainMessage(null);
          dispatch(
            addCurrentMessage({
              id: Date.now() + 1,
              type: "ai",
              content: errMessage,
              timestamp: new Date(),
            }),
          );
          return;
        }

        dispatch(
          addCurrentMessage({
            id: Date.now() + 1,
            type: "ai",
            content: errMessage,
            timestamp: new Date(),
          }),
        );
      } finally {
        dispatch(setIsThinking(false));
      }
    },
    [
      isReadOnly,
      isConnected,
      pointsBalance,
      messagesRemaining,
      dispatch,
      ensureAuthenticated,
      buildBotMessage,
      logout,
    ],
  );

  const handleSuggestionClick = (suggestion) => {
    sendChatMessage(suggestion);
  };

  const handleOptionClick = useCallback(
    (option) => {
      const message = option?.value ?? option?.label ?? option?.action;
      if (!message) return;
      sendChatMessage(String(message));
    },
    [sendChatMessage],
  );

  // Open claim popup only when user has not already claimed and needs to claim
  useEffect(() => {
    if (needsToClaimPoints && !userDismissedClaimModal) {
      setShowWelcomeGiftModal(true);
    } else if (hasAlreadyClaimed) {
      setShowWelcomeGiftModal(false);
    }
  }, [needsToClaimPoints, userDismissedClaimModal, hasAlreadyClaimed]);

  useEffect(() => {
    scrollToBottom(); // Scroll to the bottom when messages update
  }, [currentMessages, isThinking, typingMessageId]);

  useEffect(() => {
    if (isConnected && showWalletPrompt) {
      setShowWalletPrompt(false);
    }
  }, [isConnected, showWalletPrompt]);

  useEffect(() => {
    const lastAiMessage = [...currentMessages]
      .reverse()
      .find((msg) => msg.type === "ai" && typeof msg.content === "string");

    if (!lastAiMessage) return;
    if (typingMessageRef.current === lastAiMessage.id) return;
    if (completedMessageIdsRef.current.has(lastAiMessage.id)) return;

    if (typingTimerRef.current) {
      clearInterval(typingTimerRef.current);
      typingTimerRef.current = null;
    }

    const batches = createTextBatches(lastAiMessage.content);
    let index = 0;
    typingMessageRef.current = lastAiMessage.id;
    setTypingMessageId(lastAiMessage.id);
    setDisplayedTextById((prev) => ({ ...prev, [lastAiMessage.id]: "" }));

    typingTimerRef.current = setInterval(() => {
      index += 1;
      setDisplayedTextById((prev) => ({
        ...prev,
        [lastAiMessage.id]: batches.slice(0, index).join(""),
      }));
      if (index >= batches.length) {
        clearInterval(typingTimerRef.current);
        typingTimerRef.current = null;
        typingMessageRef.current = null;
        completedMessageIdsRef.current.add(lastAiMessage.id);
        setTypingMessageId(null);
        setDisplayedTextById((prev) => ({
          ...prev,
          [lastAiMessage.id]: lastAiMessage.content,
        }));
      }
    }, 120);

    return () => {
      if (typingTimerRef.current) {
        clearInterval(typingTimerRef.current);
        typingTimerRef.current = null;
      }
    };
  }, [currentMessages]);

  const createTextBatches = (text) => {
    const tokens = text.split(/(\s+)/);
    const batches = [];
    let current = "";

    tokens.forEach((token) => {
      if (current.length >= 80 || current.split(/\s+/).length >= 2) {
        batches.push(current);
        current = "";
      }
      current += token;
    });

    if (current) {
      batches.push(current);
    }

    return batches.length > 0 ? batches : [text];
  };

  const renderTokens = (tokens) => {
    if (!Array.isArray(tokens) || tokens.length === 0) return null;
    return (
      <div className="mt-3 space-y-2">
        {tokens.map((token, index) => {
          const label = token.symbol || token.name || `Token ${index + 1}`;
          const change =
            token.change24h ?? token.change ?? token.performance ?? null;
          return (
            <div
              key={`${label}-${index}`}
              className="flex items-center justify-between bg-white/40 rounded-xl p-3"
            >
              <span className="font-medium text-sm">{label}</span>
              {change !== null && (
                <span
                  className={`text-sm font-medium ${
                    Number(change) >= 0 ? "text-green-600" : "text-red-500"
                  }`}
                >
                  {Number(change) >= 0 ? "+" : ""}
                  {change}%
                </span>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  // Parse token list line. Supports:
  // - Pipe format: "1. **LINK** (Chainlink): $8.84 USD | MC: $6.26B | Vol: $535M (DeFi)"
  // - Comma format: "1. **LINK** (Chainlink, Ethereum): $9.11 USD, Market Cap: $6.45B, 24h Vol: $567M" with optional "24h Change: +1.5%"
  const parseTokenListLine = (line) => {
    // Pipe format (MC:, Vol:, optional narrative at end)
    let match = line.match(
      /^(\d+)\.\s+\*\*([A-Z0-9]+)\*\*\s*\(([^)]+)\):\s*\$?([\d,.]+)\s*(?:USD)?\s*\|\s*MC:\s*\$?([\d.]+[BMK]?)\s*\|\s*Vol:\s*\$?([\d.]+[BMK]?)(?:\s*\([^)]*\))?\s*$/i,
    );
    if (match) {
      return {
        rank: match[1],
        ticker: match[2],
        nameChain: match[3],
        price: match[4],
        marketCap: match[5],
        vol24h: match[6],
        change24h: match[7],
      };
    }
    // Comma format (Market Cap:, 24h Vol:, optional 24h Change)
    match = line.match(
      /^(\d+)\.\s+\*\*([A-Z0-9]+)\*\*\s*\(([^)]+)\):\s*\$?([\d,.]+)\s*(?:USD)?[,]?\s*Market Cap:\s*\$?([\d.]+[BMK]?)[,]?\s*24h Vol:\s*\$?([\d.]+[BMK]?)(?:[,]?\s*(?:24h )?Change:\s*([+-]?[\d.]+)%?)?/i,
    );
    if (match) {
      return {
        rank: match[1],
        ticker: match[2],
        nameChain: match[3],
        price: match[4],
        marketCap: match[5],
        vol24h: match[6],
        change24h: match[7] != null ? parseFloat(match[7]) : null,
      };
    }
    return null;
  };

  // Parse token comparison bullet: "- **RENDER** (Render): $1.47 USD | MC: $765M | Vol: $43M | Change: +13.15%"
  const parseTokenCompareLine = (line) => {
    const trimmed = line.trim().replace(/^[-•]\s*/, "");
    const match = trimmed.match(
      /^\*\*([A-Z0-9]+)\*\*\s*\(([^)]+)\):\s*\$?([\d,.]+)\s*USD\s*\|\s*MC:\s*\$?([\d.]+[BMK]?)\s*\|\s*Vol:\s*\$?([\d.]+[BMK]?)\s*\|\s*Change:\s*([+-][\d.]+)%\s*$/i,
    );
    if (!match) return null;
    return {
      ticker: match[1],
      name: match[2].trim(),
      price: match[3],
      marketCap: match[4],
      vol: match[5],
      change: match[6],
    };
  };

  // Parse "core narratives" bullet: "- **AI**: Decentralized AI (RENDER; +152% 7d/+134% 24h—top performer)."
  const parseCoreNarrativeLine = (line) => {
    const trimmed = line.trim().replace(/^[-•]\s*/, "");
    const match = trimmed.match(/^\*\*([^*]+)\*\*:\s*(.+)$/);
    if (!match) return null;
    const name = match[1].trim();
    const description = match[2].trim();
    const pct7d = description.match(/([+-][\d.]+%)\s*7d/)?.[1] ?? null;
    const pct24h = description.match(/([+-][\d.]+%)\s*24h/)?.[1] ?? null;
    return { name, description, pct7d, pct24h };
  };

  // Parse narrative performance line: "- **AI** (192 tokens): +133.86% | MC: $5.91B | Vol: $953M | MEDIUM"
  const parseNarrativeListLine = (line) => {
    const trimmed = line.trim().replace(/^[-•]\s*/, "");
    const match = trimmed.match(
      /^\*\*([^*]+)\*\*\s*\(([^)]+)\):\s*([+-][\d.]+%)\s*\|\s*MC:\s*\$?([\d.]+[BMK]?)\s*\|\s*Vol:\s*\$?([\d.]+[BMK]?)\s*\|\s*(.+)$/i,
    );
    if (!match) return null;
    return {
      name: match[1].trim(),
      description: match[2].trim(),
      changePct: match[3],
      marketCap: match[4],
      vol: match[5],
      risk: match[6].trim(),
    };
  };

  const parseMarkdownTable = (tableLines) => {
    const rows = tableLines
      .map((line) =>
        line
          .split("|")
          .map((cell) => cell.trim())
          .filter((_, i, arr) => i > 0 && i < arr.length - 1),
      )
      .filter((cells) => cells.some((c) => c.length > 0));
    const isSeparator = (cells) => cells.every((c) => /^[-:\s]+$/.test(c));

    const separatorIndex = rows.findIndex(isSeparator);
    const bodyRows =
      separatorIndex >= 0 ? rows.slice(separatorIndex + 1) : rows.slice(1);
    const headers = separatorIndex >= 0 ? rows[0] : null;
    return { headers, bodyRows };
  };

  const renderFormattedMessage = (text) => {
    if (typeof text !== "string") return text;

    const lines = text.split("\n");
    const blocks = [];
    let bulletItems = [];
    let i = 0;

    const pushBullets = () => {
      if (bulletItems.length === 0) return;
      blocks.push(
        <ul
          key={`list-${blocks.length}`}
          className="list-disc pl-5 space-y-1 text-sm"
        >
          {bulletItems.map((item, index) => (
            <li key={`item-${index}`}>{item}</li>
          ))}
        </ul>,
      );
      bulletItems = [];
    };

    const renderInlineBold = (line) => {
      const parts = line.split("**");
      if (parts.length === 1) return line;
      return parts.map((part, index) =>
        index % 2 === 1 ? <strong key={index}>{part}</strong> : part,
      );
    };

    // Split content by ±X% (optional " 7d" or " 24h") and render green (+) / red (-); text parts get renderInlineBold
    // Handles: "+152% 7d", "+134% 24h", "-2% 7d", "+65% 7d" (core narratives format) and plain "+12.5%"
    const renderWithPercentageColors = (content) => {
      const percentageRegex = /([+-][\d.]+%(?:\s*(?:7d|24h))?)/g;
      const parts = content.split(percentageRegex);
      if (parts.length === 1) return renderInlineBold(content);
      return parts.map((part, index) => {
        if (index % 2 === 1) {
          const isPositive = part.startsWith("+");
          return (
            <span
              key={index}
              className={
                isPositive
                  ? "text-green-600 font-medium"
                  : "text-red-600 font-medium"
              }
            >
              {part}
            </span>
          );
        }
        return renderInlineBold(part);
      });
    };

    // Render bullet content; color "Change: ±X%" green/red when it appears (with or without "| " prefix, or as full line "**Change**: ±X%")
    const renderBulletContent = (content) => {
      // Narrative line: "**AI** (192 tokens): +152.78% | MC: ..." or "**Gaming**" (no stats)
      const narrativeMatch = content.match(
        /^(\*\*[^*]+\*\*(?:\s*\([^)]*\))?):\s*([+-][\d.]+%)(.*)$/,
      );
      if (narrativeMatch) {
        const [, labelPart, pct, rest] = narrativeMatch;
        const isPositive = pct.startsWith("+");
        return (
          <>
            {renderInlineBold(labelPart)}:{" "}
            <span
              className={
                isPositive
                  ? "text-green-600 font-semibold"
                  : "text-red-600 font-semibold"
              }
            >
              {pct}
            </span>
            {rest ? renderInlineBold(rest) : null}
          </>
        );
      }
      // Full line: "**Change**: -0.3%" or "**24h Change**: +0.45%"
      let changeMatch = content.match(
        /^\*\*((?:24h |7d )?Change)\*\*:\s*([+-]?[\d.]+)%/,
      );
      if (changeMatch) {
        const value = parseFloat(changeMatch[2]);
        const isPositive = value >= 0;
        return (
          <>
            <strong>{changeMatch[1]}</strong>:{" "}
            <span
              className={
                isPositive
                  ? "text-green-600 font-medium"
                  : "text-red-600 font-medium"
              }
            >
              {changeMatch[2]}%
            </span>
          </>
        );
      }
      // Inline: "... | 24h Vol: $279M | Change: -0.3%" anywhere in the line
      changeMatch = content.match(
        /\|\s*((?:24h |7d )?Change):\s*([+-]?[\d.]+)%/,
      );
      if (changeMatch) {
        const prefix = content.slice(0, content.indexOf(changeMatch[0]));
        const label = changeMatch[1];
        const valueStr = changeMatch[2];
        const value = parseFloat(valueStr);
        const isPositive = value >= 0;
        return (
          <>
            {renderInlineBold(prefix)}
            {" | "}
            {label}:{" "}
            <span
              className={
                isPositive
                  ? "text-green-600 font-medium"
                  : "text-red-600 font-medium"
              }
            >
              {valueStr}%
            </span>
          </>
        );
      }
      return renderWithPercentageColors(content);
    };

    while (i < lines.length) {
      const line = lines[i];
      const trimmed = line.trim();
      // Token list block: consecutive lines matching "N. **TICKER** (Name): $X USD | MC: $Y | Vol: $Z" or comma format
      const tokenEntries = [];
      let j = i;
      while (j < lines.length) {
        const parsed = parseTokenListLine(lines[j].trim());
        if (parsed) {
          tokenEntries.push(parsed);
          j++;
        } else break;
      }
      if (tokenEntries.length > 0) {
        pushBullets();
        const hasChange = tokenEntries.some((e) => e.change24h != null);
        const gridCols = hasChange
          ? "grid-cols-[auto_1fr_auto_auto_auto_auto]"
          : "grid-cols-[auto_1fr_auto_auto_auto]";
        blocks.push(
          <div
            key={`token-list-${blocks.length}`}
            className="my-4 rounded-xl border border-gray-200 bg-white/80 shadow-sm overflow-hidden"
          >
            <div
              className={`grid ${gridCols} gap-x-4 gap-y-0 px-4 py-2.5 border-b border-gray-200 bg-gray-50/80 text-xs font-semibold text-gray-600 uppercase tracking-wide items-center`}
            >
              <span className="w-6">#</span>
              <span>Token</span>
              <span className="text-right">Price</span>
              <span className="text-right">MC</span>
              <span className="text-right">24h Vol</span>
              {hasChange && <span className="text-right">24h %</span>}
            </div>
            {tokenEntries.map((entry, idx) => (
              <div
                key={idx}
                className={`grid ${gridCols} gap-x-4 gap-y-0 px-4 py-2.5 items-center text-sm border-b border-gray-100 last:border-0 hover:bg-gray-50/50`}
              >
                <span className="w-6 font-semibold text-gray-500">
                  {entry.rank}.
                </span>
                <div className="min-w-0">
                  <span className="font-bold text-gray-900">
                    {entry.ticker}
                  </span>
                  <span className="text-gray-500 text-xs ml-1">
                    ({entry.nameChain})
                  </span>
                </div>
                <span className="text-right font-medium text-gray-900">
                  ${entry.price} USD
                </span>
                <span className="text-right font-medium text-gray-800">
                  {entry.marketCap}
                </span>
                <span className="text-right font-medium text-gray-800">
                  {entry.vol24h}
                </span>
                {hasChange && (
                  <span
                    className={`text-right font-medium ${
                      entry.change24h != null
                        ? Number(entry.change24h) >= 0
                          ? "text-green-600"
                          : "text-red-600"
                        : "text-gray-400"
                    }`}
                  >
                    {entry.change24h != null
                      ? `${Number(entry.change24h) >= 0 ? "+" : ""}${entry.change24h}%`
                      : "—"}
                  </span>
                )}
              </div>
            ))}
          </div>,
        );
        i = j;
        continue;
      }

      // Narrative performance block: consecutive bullet lines "- **AI** (192 tokens): +133.86% | MC: $5.91B | Vol: $953M | MEDIUM"
      const narrativeEntries = [];
      let jNarr = i;
      while (jNarr < lines.length) {
        const t = lines[jNarr].trim();
        if (!t.startsWith("- ") && !t.startsWith("• ")) break;
        const parsed = parseNarrativeListLine(lines[jNarr]);
        if (!parsed) break;
        narrativeEntries.push(parsed);
        jNarr++;
      }
      if (narrativeEntries.length > 0) {
        pushBullets();
        blocks.push(
          <div
            key={`narrative-table-${blocks.length}`}
            className="my-4 rounded-xl border border-gray-200 bg-white/80 shadow-sm overflow-hidden"
          >
            <div className="overflow-x-auto">
              <table className="w-full min-w-[480px] text-sm">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50/80">
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">
                      Narrative
                    </th>
                    <th className="px-4 py-3 text-right font-semibold text-gray-700">
                      7d %
                    </th>
                    <th className="px-4 py-3 text-right font-semibold text-gray-700">
                      MC
                    </th>
                    <th className="px-4 py-3 text-right font-semibold text-gray-700">
                      Vol
                    </th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">
                      Risk
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {narrativeEntries.map((entry, idx) => (
                    <tr
                      key={idx}
                      className="border-b border-gray-100 last:border-0 hover:bg-gray-50/50"
                    >
                      <td className="px-4 py-2.5">
                        <span className="font-bold text-gray-900">
                          {entry.name}
                        </span>
                        <span className="text-gray-500 text-xs ml-1">
                          ({entry.description})
                        </span>
                      </td>
                      <td
                        className={`text-right font-semibold ${
                          entry.changePct.startsWith("+")
                            ? "text-green-600"
                            : "text-red-600"
                        }`}
                      >
                        {entry.changePct}
                      </td>
                      <td className="text-right font-medium text-gray-800">
                        ${entry.marketCap}
                      </td>
                      <td className="text-right font-medium text-gray-800">
                        ${entry.vol}
                      </td>
                      <td className="px-4 py-2.5 font-medium text-gray-700">
                        {entry.risk.replace(/_/g, " ")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>,
        );
        i = jNarr;
        continue;
      }

      // Token comparison block: "- **RENDER** (Render): $1.47 USD | MC: $765M | Vol: $43M | Change: +13.15%" + optional "  (description)"
      const tokenCompareEntries = [];
      let jCompare = i;
      while (jCompare < lines.length) {
        const t = lines[jCompare].trim();
        if (!t.startsWith("- ") && !t.startsWith("• ")) break;
        const parsed = parseTokenCompareLine(lines[jCompare]);
        if (!parsed) break;
        const entry = { ...parsed, description: null };
        jCompare++;
        const descLine =
          jCompare < lines.length
            ? lines[jCompare].match(/^\s*\(([^)]+)\)\.?\s*$/)
            : null;
        if (descLine) {
          entry.description = descLine[1].trim();
          jCompare++;
        }
        tokenCompareEntries.push(entry);
      }
      if (tokenCompareEntries.length > 0) {
        pushBullets();
        blocks.push(
          <div
            key={`token-compare-table-${blocks.length}`}
            className="my-4 rounded-xl border border-gray-200 bg-white/80 shadow-sm overflow-hidden"
          >
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-sm">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50/80">
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">
                      Token
                    </th>
                    <th className="px-4 py-3 text-right font-semibold text-gray-700">
                      Price
                    </th>
                    <th className="px-4 py-3 text-right font-semibold text-gray-700">
                      MC
                    </th>
                    <th className="px-4 py-3 text-right font-semibold text-gray-700">
                      Vol
                    </th>
                    <th className="px-4 py-3 text-right font-semibold text-gray-700">
                      Change
                    </th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">
                      Description
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {tokenCompareEntries.map((entry, idx) => (
                    <tr
                      key={idx}
                      className="border-b border-gray-100 last:border-0 hover:bg-gray-50/50"
                    >
                      <td className="px-4 py-2.5">
                        <span className="font-bold text-gray-900">
                          {entry.ticker}
                        </span>
                        <span className="text-gray-500 text-xs ml-1">
                          ({entry.name})
                        </span>
                      </td>
                      <td className="text-right font-medium text-gray-900">
                        ${entry.price} USD
                      </td>
                      <td className="text-right font-medium text-gray-800">
                        ${entry.marketCap}
                      </td>
                      <td className="text-right font-medium text-gray-800">
                        {entry.vol}
                      </td>
                      <td
                        className={`text-right font-semibold ${
                          entry.change.startsWith("+")
                            ? "text-green-600"
                            : "text-red-600"
                        }`}
                      >
                        {entry.change}%
                      </td>
                      <td className="px-4 py-2.5 text-gray-600 text-xs">
                        {entry.description ?? "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>,
        );
        i = jCompare;
        continue;
      }

      // Core narratives block: "- **AI**: Decentralized AI (RENDER; +152% 7d/+134% 24h—top performer)."
      const coreNarrativeEntries = [];
      let jCore = i;
      while (jCore < lines.length) {
        const t = lines[jCore].trim();
        if (!t.startsWith("- ") && !t.startsWith("• ")) break;
        const parsed = parseCoreNarrativeLine(lines[jCore]);
        if (!parsed) break;
        coreNarrativeEntries.push(parsed);
        jCore++;
      }
      if (coreNarrativeEntries.length > 0) {
        pushBullets();
        blocks.push(
          <div
            key={`core-narrative-table-${blocks.length}`}
            className="my-4 rounded-xl border border-gray-200 bg-white/80 shadow-sm overflow-hidden"
          >
            <div className="overflow-x-auto">
              <table className="w-full min-w-[520px] text-sm">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50/80">
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">
                      Narrative
                    </th>
                    <th className="px-4 py-3 text-right font-semibold text-gray-700 w-20">
                      7d
                    </th>
                    <th className="px-4 py-3 text-right font-semibold text-gray-700 w-20">
                      24h
                    </th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">
                      Description
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {coreNarrativeEntries.map((entry, idx) => (
                    <tr
                      key={idx}
                      className="border-b border-gray-100 last:border-0 hover:bg-gray-50/50"
                    >
                      <td className="px-4 py-2.5 font-bold text-gray-900 align-top">
                        {entry.name}
                      </td>
                      <td className="px-4 py-2.5 text-right align-top">
                        {entry.pct7d != null ? (
                          <span
                            className={
                              entry.pct7d.startsWith("+")
                                ? "text-green-600 font-semibold"
                                : "text-red-600 font-semibold"
                            }
                          >
                            {entry.pct7d}
                          </span>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-right align-top">
                        {entry.pct24h != null ? (
                          <span
                            className={
                              entry.pct24h.startsWith("+")
                                ? "text-green-600 font-semibold"
                                : "text-red-600 font-semibold"
                            }
                          >
                            {entry.pct24h}
                          </span>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-gray-700 align-top">
                        {renderWithPercentageColors(entry.description)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>,
        );
        i = jCore;
        continue;
      }

      if (trimmed.startsWith("|") && trimmed.endsWith("|")) {
        const tableLines = [line];
        i += 1;
        while (i < lines.length && lines[i].trim().includes("|")) {
          tableLines.push(lines[i]);
          i += 1;
        }
        const { headers, bodyRows } = parseMarkdownTable(tableLines);
        if (headers?.length && bodyRows.length) {
          blocks.push(
            <div
              key={`table-${blocks.length}`}
              className="my-4 overflow-x-auto rounded-xl border border-gray-200 bg-white/80 shadow-sm"
            >
              <table className="w-full min-w-[400px] text-sm">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50/80">
                    {headers.map((h, hi) => (
                      <th
                        key={hi}
                        className="px-4 py-3 text-left font-semibold text-gray-700"
                      >
                        {renderInlineBold(h)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {bodyRows.map((row, ri) => (
                    <tr
                      key={ri}
                      className="border-b border-gray-100 last:border-0 hover:bg-gray-50/50"
                    >
                      {row.map((cell, ci) => (
                        <td key={ci} className="px-4 py-2.5 text-gray-800">
                          {renderInlineBold(cell)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>,
          );
        }
        continue;
      }

      const isBullet = trimmed.startsWith("- ") || trimmed.startsWith("• ");
      if (isBullet) {
        const content = trimmed.replace(/^[-•]\s*/, "");
        bulletItems.push(renderBulletContent(content));
        i += 1;
        continue;
      }

      pushBullets();
      if (trimmed === "") {
        blocks.push(<div key={`spacer-${blocks.length}`} className="h-2" />);
        i += 1;
        continue;
      }

      if (
        trimmed.startsWith("**") &&
        trimmed.endsWith("**") &&
        trimmed.length > 4
      ) {
        blocks.push(
          <p
            key={`heading-${blocks.length}`}
            className="text-sm font-semibold text-gray-900 mt-3 first:mt-0"
          >
            {renderInlineBold(trimmed)}
          </p>,
        );
      } else {
        blocks.push(
          <p key={`line-${blocks.length}`} className="text-sm">
            {renderInlineBold(line)}
          </p>,
        );
      }
      i += 1;
    }

    pushBullets();
    return <div className="space-y-2">{blocks}</div>;
  };

  return (
    <div className="flex-1 flex flex-col">
      <div className="flex-1 flex flex-col overflow-y-auto">
        {currentMessages.length === 0 && (
          <div className="h-full flex items-center justify-center px-6">
            <div className="text-center max-w-2xl">
              <h2 className="text-3xl font-bold mb-4">Hello, I'm AlloX</h2>

              <p className="text-gray-600 mb-8">
                I can help you discover, execute, and manage your portfolio.
              </p>

              <div className="flex flex-wrap gap-2 justify-center mb-8">
                {[
                  "Build a Portfolio",
                  "Explain narratives",
                  "Trending Tokens",
                  "How should I invest $100?",
                  "Start guided chat",
                ].map((suggestion) => (
                  <button
                    key={suggestion}
                    onClick={() => handleSuggestionClick(suggestion)}
                    disabled={isReadOnly || messagesRemaining === 0}
                    className="px-4 py-2 bg-white shadow border border-white text-sm font-medium hover:bg-white/90 hover:shadow-lg hover:border hover:border-gray-200/50 transition-all duration-200 rounded-full disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:bg-white"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {currentMessages.length > 0 && (
          <div
            className={`py-8 px-6 max-w-[1000px] mx-auto w-full space-y-6 ${isReadOnly ? "chat-padding-readonly" : "chat-padding"}`}
            ref={speechBoxRef}
          >
            {currentMessages.map((msg, index) => {
              const isUser =
                msg.type === "user" ||
                msg.type === "human" ||
                msg.role === "user";
              return (
                <ChatBubble
                  key={(isUser ? "user" : "ai") + index}
                  type={isUser ? "user" : "ai"}
                >
                  {typeof msg.content === "string" ? (
                    <div>
                      {renderFormattedMessage(
                        msg.type === "ai"
                          ? msg.id === typingMessageId
                            ? (displayedTextById[msg.id] ?? "")
                            : completedMessageIdsRef.current.has(msg.id)
                              ? msg.content
                              : (displayedTextById[msg.id] ?? "")
                          : msg.content,
                      )}
                      {msg.type === "ai" &&
                        completedMessageIdsRef.current.has(msg.id) &&
                        msg.options?.length > 0 && (
                          <div className="mt-3 flex flex-wrap gap-2">
                            {msg.options.map((option, index) => (
                              <button
                                key={`${option.action}-${option.value}-${index}`}
                                onClick={() => handleOptionClick(option)}
                                disabled={isReadOnly}
                                className="px-3 py-2 bg-white/80 border border-gray-200 rounded-xl text-xs font-medium hover:bg-white hover:border-gray-300 hover:shadow-md transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
                              >
                                {option.label || option.value || option.action}
                              </button>
                            ))}
                          </div>
                        )}
                      {msg.type === "ai" && msg.data?.portfolioId && (
                        <div className="mt-3 bg-green-50 border border-green-200 rounded-xl p-3 text-sm text-green-700">
                          ✅ Portfolio created: {msg.data.portfolioId}
                        </div>
                      )}
                      {msg.type === "ai" && renderTokens(msg.data?.tokens)}
                    </div>
                  ) : (
                    msg.content
                  )}
                </ChatBubble>
              );
            })}

            {isThinking && (
              <ChatBubble type="ai">
                <div className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-sm text-gray-600">
                    AlloX is thinking...
                  </span>
                </div>
              </ChatBubble>
            )}
          </div>
        )}
      </div>

      <div className="shrink-0 fixed left-0 w-full z-4 bottom-0 border-t border-gray-200/50 bg-pattern/95 backdrop-blur-lg">
        <div className="px-6 py-6 max-w-[1000px] mx-auto w-full">
          {isReadOnly && (
            <div className="mb-4 glass-card p-4 border border-gray-200/50 bg-gray-50/50 flex items-center justify-between gap-4">
              <p className="text-sm text-gray-600">
                Viewing past conversation. You can’t send new messages here.
              </p>
              <button
                type="button"
                onClick={handleStartNewChat}
                className="btn-primary text-sm px-4 py-2 whitespace-nowrap"
              >
                Start new chat
              </button>
            </div>
          )}
          {showWalletPrompt && !isConnected && (
            <div className="mb-4 glass-card p-4 border border-blue-200/50 bg-blue-50/30">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <Wallet size={20} className="text-blue-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900 mb-1">
                    Connect wallet
                  </p>
                  <p className="text-xs text-gray-600">Required for AlloX</p>
                </div>

                <button
                  onClick={() => setWalletModalOpen(true)}
                  className="btn-primary text-sm px-4 py-2 whitespace-nowrap"
                >
                  Continue
                </button>
              </div>
            </div>
          )}
          {needsToClaimPoints && !isReadOnly && (
            <div className="mb-4 glass-card p-4 border border-amber-200/50 bg-amber-50/30">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <Gift size={20} className="text-amber-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900 mb-1">
                    Welcome Bonus
                  </p>
                  <p className="text-xs text-gray-600">
                    Claim your 5,000 Free Points
                  </p>
                </div>

                <button
                  onClick={() => setShowWelcomeGiftModal(true)}
                  className="btn-primary text-sm px-4 py-2 whitespace-nowrap"
                >
                  Claim
                </button>
              </div>
            </div>
          )}

          {onchainBlocked && !isReadOnly && (
            <div className="mb-4 glass-card p-4 border border-orange-200/50 bg-orange-50/30">
              <p className="text-sm text-gray-800 mb-3">
                {onchainBlocked.message}
              </p>
              {(onchainBlocked.balance != null ||
                onchainBlocked.requiredBalance != null) && (
                <p className="text-sm text-gray-700 mb-2">
                  Balance on supported chains: $
                  {Number(onchainBlocked.balance ?? 0).toFixed(2)} / $
                  {onchainBlocked.requiredBalance ?? 5} required.
                </p>
              )}
              {refreshOnchainMessage && (
                <p className="text-sm text-amber-800 mb-3">
                  {refreshOnchainMessage}
                </p>
              )}
              <button
                type="button"
                onClick={handleRefreshOnchain}
                disabled={refreshOnchainLoading}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl font-medium bg-gray-900 text-white hover:bg-gray-800 disabled:opacity-70 text-sm"
              >
                {refreshOnchainLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Refreshing...
                  </>
                ) : (
                  <>
                    <RefreshCw size={16} />
                    Refresh your on-chain activity
                  </>
                )}
              </button>
            </div>
          )}

          {messagesRemaining === 0 && !isReadOnly && (
            <div className="mb-4 glass-card p-4 border border-amber-200/50 bg-amber-50/30">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <Clock size={20} className="text-amber-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900 mb-1">
                    No messages left in your current limit
                  </p>
                  <p className="text-xs text-gray-600">
                    {resetAt
                      ? `Resets ${formatResetAt(resetAt)}.`
                      : "Try again later."}
                  </p>
                </div>
                {canRefresh && (
                  <button
                    type="button"
                    onClick={handleRefreshLimit}
                    disabled={statusLoading}
                    className="btn-primary text-sm px-4 py-2 whitespace-nowrap"
                  >
                    {statusLoading ? "Checking…" : "Refresh limit"}
                  </button>
                )}
              </div>
            </div>
          )}

          <>
            <div className="relative">
              <input
                type="text"
                value={message}
                onChange={(e) =>
                  !isReadOnly &&
                  (messagesRemaining == null || messagesRemaining > 0) &&
                  dispatch(setMessage(e.target.value))
                }
                onKeyDown={handleInputKeyDown}
                placeholder={
                  isReadOnly
                    ? "This conversation is read-only"
                    : messagesRemaining === 0
                      ? "Message limit reached"
                      : "Type your intent..."
                }
                disabled={
                  isReadOnly ||
                  (messagesRemaining !== null && messagesRemaining <= 0)
                }
                className="w-full px-6 py-4 pr-28 bg-white/60 backdrop-blur-sm border border-gray-200/50 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-black/10 focus:bg-white/80 transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
              />
              {!isReadOnly && (
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-2">
                  {message &&
                  (messagesRemaining == null || messagesRemaining > 0) ? (
                    <button
                      onClick={handleSendMessage}
                      className="p-3 bg-black rounded-xl hover:bg-gray-800 hover:shadow-lg transition-all duration-200"
                    >
                      <Send size={18} className="text-white" />
                    </button>
                  ) : (
                    <div
                      type="button"
                      className="p-3 bg-gray-200 rounded-xl cursor-not-allowed"
                    >
                      <Send size={18} className="text-gray-700" />
                    </div>
                  )}
                </div>
              )}
            </div>
            <p className="text-xs hidden md:block text-center text-gray-500 mt-3">
              {
                // messagesRemaining === 0 ? (
                //   <span className="text-amber-600 font-medium">
                //     No messages left in your current limit.
                //     {resetAt
                //       ? ` Resets ${formatResetAt(resetAt)}.`
                //       : " Try again later."}
                //     {canRefresh && (
                //       <>
                //         {" "}
                //         <button
                //           type="button"
                //           onClick={handleRefreshLimit}
                //           disabled={statusLoading}
                //           className="underline font-medium hover:no-underline disabled:opacity-60"
                //         >
                //           {statusLoading ? "Checking…" : "Refresh limit"}
                //         </button>
                //       </>
                //     )}
                //   </span>
                // ) :
                "AlloX can make mistakes. Always verify transactions before confirming."
              }
            </p>
          </>
        </div>
      </div>

      {claimSuccess && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="glass-card max-w-sm w-full p-8 text-center animate-in zoom-in-95 duration-300">
            <div className="text-5xl mb-4">🎉</div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">
              Congratulations!
            </h3>
            <p className="text-gray-600 mb-1">
              You claimed your Season 1 points.
            </p>
            {/* <p className="text-sm text-gray-500">Start chatting to use them.</p> */}
          </div>
        </div>
      )}

      {showWelcomeGiftModal && (
        <div
          className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          onClick={() => {
            if (!claiming) {
              setShowWelcomeGiftModal(false);
              setUserDismissedClaimModal(true);
            }
          }}
        >
          <div
            className="glass-card max-w-sm w-full p-8 relative animate-fade-in flex flex-col items-center text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => {
                if (!claiming) {
                  setShowWelcomeGiftModal(false);
                  setUserDismissedClaimModal(true);
                }
              }}
              className="absolute top-4 right-4 p-1 rounded-lg hover:bg-black/5 text-gray-500"
              aria-label="Close"
            >
              <X size={20} />
            </button>

            <div className="flex items-center gap-2 mb-2">
              <h3 className="text-xl font-bold">Welcome Bonus</h3>
              {/* <Gift className="w-5 h-5 text-amber-500" /> */}
            </div>
            <p className="text-sm text-gray-600 mb-6">
              Exclusive Web3 Community Benefit.
            </p>
            <div className="flex items-center justify-center gap-2 mb-1">
              <span className="text-4xl font-bold">
                {INITIAL_CLAIM_POINTS.toLocaleString()}
              </span>
              {/* <span className="w-6 h-6 rounded-full bg-amber-100 flex items-center justify-center">
                <span className="text-amber-600 text-xs font-bold">◆</span>
              </span> */}
            </div>
            <p className="text-sm text-gray-500 mb-8">Points</p>
            {claimError && (
              <p className="text-sm text-red-600 mb-2">{claimError}</p>
            )}
            <button
              onClick={handleClaimPoints}
              disabled={claiming}
              className="w-full py-4 rounded-2xl font-medium bg-gray-900 text-white hover:bg-gray-800 disabled:opacity-70 flex items-center justify-center gap-2"
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
