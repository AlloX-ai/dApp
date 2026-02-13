import { useRef, useEffect, useState, useCallback } from "react";
import { Send, Loader2, Wallet, Gift, X } from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import { ChatBubble } from "../components/ChatBubble";
import {
  addCurrentMessage,
  setIsThinking,
  setMessage,
  setCurrentMessages,
  setViewingHistorySessionId,
} from "../redux/slices/chatSlice";
import { setWalletModal } from "../redux/slices/walletSlice";
import {
  setPointsBalance,
  INITIAL_CLAIM_POINTS,
} from "../redux/slices/pointsSlice";
import { apiCall } from "../utils/api";
import { useAuth } from "../hooks/useAuth";

export function ChatPage() {
  const dispatch = useDispatch();
  const { message, currentMessages, isThinking, viewingHistorySessionId } =
    useSelector((state) => state.chat);
  const isReadOnly = !!viewingHistorySessionId;
  const isConnected = useSelector((state) => state.wallet.isConnected);
  const pointsBalance = useSelector((state) => state.points?.balance);
  const {
    token,
    user,
    setUser,
    authenticate,
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
  const [claiming, setClaiming] = useState(false);
  const [claimError, setClaimError] = useState(null);
  const [claimSuccess, setClaimSuccess] = useState(false);
  const [claimedPoints, setClaimedPoints] = useState(0);
  const [displayedTextById, setDisplayedTextById] = useState({});
  const [typingMessageId, setTypingMessageId] = useState(null);

  useEffect(() => {
    const aiMessages = currentMessages.filter(
      (msg) => msg.type === "ai" && typeof msg.content === "string",
    );

    if (aiMessages.length === 0) return;

    setDisplayedTextById((prev) => {
      const next = { ...prev };
      aiMessages.forEach((msg) => {
        if (next[msg.id] === undefined) {
          next[msg.id] = msg.content;
          completedMessageIdsRef.current.add(msg.id);
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

  const setWalletModalOpen = (nextValue) => {
    dispatch(setWalletModal(nextValue));
  };

  const needsToClaimPoints =
    isConnected && (pointsBalance == null || pointsBalance === 0);
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
            points: u.points ?? 0,
            claimed: u.claimed ?? true,
            claimedAt: u.claimedAt,
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
      const hasEnoughPoints = pointsBalance != null;
      if (!hasEnoughPoints) {
        dispatch(
          addCurrentMessage({
            id: Date.now() + 1,
            type: "ai",
            content: `You do not have enough points to send a message. You have ${pointsBalance ?? 0} points.`,
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
      } catch (error) {
        if (error?.status === 401) {
          logout();
        }
        dispatch(
          addCurrentMessage({
            id: Date.now() + 1,
            type: "ai",
            content:
              error?.message ||
              "Sorry, something went wrong while reaching the server.",
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
    const headerRow = rows[0];
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

    while (i < lines.length) {
      const line = lines[i];
      const trimmed = line.trim();

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
        bulletItems.push(renderInlineBold(content));
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
                    disabled={isReadOnly}
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
            className="py-8 px-6 max-w-[1000px] mx-auto w-full space-y-6 chat-padding"
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
                    Claim your 5K Free Points
                  </p>
                  <p className="text-xs text-gray-600">
                    Sign to claim and start chatting
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
          <div className="relative">
            <input
              type="text"
              value={message}
              onChange={(e) =>
                !isReadOnly && dispatch(setMessage(e.target.value))
              }
              onKeyDown={handleInputKeyDown}
              placeholder={
                isReadOnly
                  ? "This conversation is read-only"
                  : "Type your intent..."
              }
              disabled={isReadOnly}
              className="w-full px-6 py-4 pr-28 bg-white/60 backdrop-blur-sm border border-gray-200/50 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-black/10 focus:bg-white/80 transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
            />
            {!isReadOnly && (
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-2">
                {message ? (
                  <button
                    onClick={handleSendMessage}
                    className="p-3 bg-black rounded-xl hover:bg-gray-800 hover:shadow-lg transition-all duration-200"
                  >
                    <Send size={18} className="text-white" />
                  </button>
                ) : (
                  <button
                    type="button"
                    className="p-3 bg-gray-200 rounded-xl cursor-not-allowed"
                  >
                    <Send size={18} className="text-gray-700" />
                  </button>
                )}
              </div>
            )}
          </div>
          <p className="text-xs hidden md:block text-center text-gray-500 mt-3">
            AlloX can make mistakes. Always verify transactions before
            confirming.
          </p>
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
              You claimed your {claimedPoints.toLocaleString()} Season 1
              credits.
            </p>
            <p className="text-sm text-gray-500">Start chatting to use them.</p>
          </div>
        </div>
      )}

      {showWelcomeGiftModal && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          onClick={() => !claiming && setShowWelcomeGiftModal(false)}
        >
          <div
            className="glass-card max-w-sm w-full p-8 relative animate-fade-in flex flex-col items-center text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => !claiming && setShowWelcomeGiftModal(false)}
              className="absolute top-4 right-4 p-1 rounded-lg hover:bg-black/5 text-gray-500"
              aria-label="Close"
            >
              <X size={20} />
            </button>
            <img
              src="https://cdn.allox.ai/allox/AlloX-desktop.svg"
              alt=""
              className="h-8 mb-4 self-start"
            />
            <div className="flex items-center gap-2 mb-2">
              <h3 className="text-xl font-bold">AlloX Welcome Gift</h3>
              <Gift className="w-5 h-5 text-amber-500" />
            </div>
            <p className="text-sm text-gray-600 mb-4">
              Exclusive Web3 Community Benefit.
            </p>
            <div className="flex items-center justify-center gap-2 mb-1">
              <span className="text-4xl font-bold">
                {INITIAL_CLAIM_POINTS.toLocaleString()}
              </span>
              <span className="w-6 h-6 rounded-full bg-amber-100 flex items-center justify-center">
                <span className="text-amber-600 text-xs font-bold">◆</span>
              </span>
            </div>
            <p className="text-sm text-gray-500 mb-6">New User Gift</p>
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
