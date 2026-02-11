import { useRef, useEffect, useState, useCallback } from "react";
import { Send, Loader2, Wallet } from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import { ChatBubble } from "../components/ChatBubble";
import {
  addCurrentMessage,
  setIsThinking,
  setMessage,
} from "../redux/slices/chatSlice";
import { setWalletModal } from "../redux/slices/walletSlice";
import { apiCall } from "../utils/api";
import { useAuth } from "../hooks/useAuth";

export function ChatPage() {
  const dispatch = useDispatch();
  const { message, currentMessages, isThinking } = useSelector(
    (state) => state.chat,
  );
  const isConnected = useSelector((state) => state.wallet.isConnected);
  const { token, authenticate, logout } = useAuth();
  const speechBoxRef = useRef(null);
  const typingTimerRef = useRef(null);
  const typingMessageRef = useRef(null);
  const completedMessageIdsRef = useRef(new Set());
  const [showWalletPrompt, setShowWalletPrompt] = useState(false);
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

  const ensureAuthenticated = useCallback(async () => {
    if (token) return token;
    return authenticate();
  }, [token, authenticate]);

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
    if (!message.trim()) return;
    sendChatMessage(message);
    dispatch(setMessage(""));
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
      if (!isConnected) {
        setShowWalletPrompt(true);
        return;
      }

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
    [isConnected, dispatch, ensureAuthenticated, buildBotMessage, logout],
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

  const renderFormattedMessage = (text) => {
    if (typeof text !== "string") return text;

    const lines = text.split("\n");
    const blocks = [];
    let bulletItems = [];

    const pushBullets = () => {
      if (bulletItems.length === 0) return;
      blocks.push(
        <ul key={`list-${blocks.length}`} className="list-disc pl-5 space-y-1">
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

    lines.forEach((line) => {
      const isBullet = line.trim().startsWith("- ");
      if (isBullet) {
        const content = line.replace(/^\s*-\s*/, "");
        bulletItems.push(renderInlineBold(content));
        return;
      }

      pushBullets();
      if (line.trim() === "") {
        blocks.push(<div key={`spacer-${blocks.length}`} className="h-2" />);
        return;
      }
      blocks.push(
        <p key={`line-${blocks.length}`} className="text-sm">
          {renderInlineBold(line)}
        </p>,
      );
    });

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
                    className="px-4 py-2 bg-white shadow border border-white text-sm font-medium hover:bg-white/90 hover:shadow-lg hover:border hover:border-gray-200/50 transition-all duration-200 rounded-full"
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
            {currentMessages.map((msg) => (
              <ChatBubble key={msg.id} type={msg.type}>
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
                              className="px-3 py-2 bg-white/80 border border-gray-200 rounded-xl text-xs font-medium hover:bg-white hover:border-gray-300 hover:shadow-md transition-all duration-200"
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
            ))}

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
          <div className="relative">
            <input
              type="text"
              value={message}
              onChange={(e) => dispatch(setMessage(e.target.value))}
              onKeyDown={handleInputKeyDown}
              placeholder="Type your intent..."
              className="w-full px-6 py-4 pr-28 bg-white/60 backdrop-blur-sm border border-gray-200/50 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-black/10 focus:bg-white/80 transition-all duration-200"
            />
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-2">
              {message && (
                <button
                  onClick={handleSendMessage}
                  className="p-3 bg-black rounded-xl hover:bg-gray-800 hover:shadow-lg transition-all duration-200"
                >
                  <Send size={18} className="text-white" />
                </button>
              )}
              {!message && (
                <button
                  // onClick={handleSendMessage}
                  className="p-3 bg-gray-200 rounded-xl cursor-not-allowed"
                >
                  <Send size={18} className="text-gray-700" />
                </button>
              )}
            </div>
          </div>
          <p className="text-xs hidden md:block text-center text-gray-500 mt-3">
            AlloX can make mistakes. Always verify transactions before
            confirming.
          </p>
        </div>
      </div>
    </div>
  );
}
