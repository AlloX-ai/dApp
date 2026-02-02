import { useRef, useEffect } from "react";
import { Send, Mic, Loader2 } from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import { ChatBubble } from "../components/ChatBubble";
import { ActionCard } from "../components/ActionCard";
import {
  addCurrentMessage,
  addCurrentMessages,
  prependCompletedAction,
  setIsRecording,
  setIsThinking,
  setMessage,
  setSlippage,
} from "../redux/slices/chatSlice";

export function ChatPage() {
  const dispatch = useDispatch();
  const { message, currentMessages, slippage, isRecording, isThinking } =
    useSelector((state) => state.chat);

  const speechBoxRef = useRef(null);

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

  const handleSendMessage = () => {
    if (!message.trim()) return;

    handleSuggestionClick(message);
    dispatch(setMessage(""));
  };

  const handleSuggestionClick = (suggestion) => {
    const userMsg = {
      id: Date.now(),
      type: "user",
      content: suggestion,
      timestamp: new Date(),
    };

    dispatch(addCurrentMessage(userMsg));
    dispatch(setIsThinking(true));

    setTimeout(() => {
      dispatch(setIsThinking(false));
      let aiResponse;

      if (
        suggestion === "Swap Tokens" ||
        suggestion.includes("Buy") ||
        suggestion.toLowerCase().includes("swap")
      ) {
        aiResponse = {
          id: Date.now() + 1,
          type: "ai",
          content: (
            <div>
              <p className="text-sm mb-4">
                I'll help you with that swap. Here's what I found:
              </p>
              <ActionCard onConfirm={() => handleConfirmSwap()}>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="text-xs text-gray-500">From</div>
                      <div className="font-bold text-lg">100 USDC</div>
                    </div>
                    <div className="text-2xl text-gray-400">→</div>
                    <div className="text-right">
                      <div className="text-xs text-gray-500">To</div>
                      <div className="font-bold text-lg">0.057 ETH</div>
                    </div>
                  </div>

                  <div className="space-y-2 text-sm pt-3 border-t border-gray-200/50">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Current Price</span>
                      <span className="font-medium">1 ETH = $1,754.38</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Route</span>
                      <span className="font-medium">Uniswap V3</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Network Fee</span>
                      <span className="font-medium">~$1.20</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Slippage</span>
                      <div className="flex gap-2">
                        {["0.5", "1.0", "2.0"].map((s) => (
                          <button
                            key={s}
                            onClick={() => dispatch(setSlippage(s))}
                            className={`px-2 py-1 rounded-lg text-xs transition-all duration-200 ${
                              slippage === s
                                ? "bg-black text-white"
                                : "bg-gray-100 hover:bg-gray-200 hover:shadow-sm"
                            }`}
                          >
                            {s}%
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </ActionCard>
            </div>
          ),
          timestamp: new Date(),
        };
      } else if (
        suggestion === "Trending Tokens" ||
        suggestion.toLowerCase().includes("trending")
      ) {
        aiResponse = {
          id: Date.now() + 1,
          type: "ai",
          content: (
            <div>
              <p className="text-sm mb-4">
                Here are the top 5 trending tokens right now:
              </p>
              <div className="space-y-2 mb-4">
                {[
                  {
                    name: "AERO",
                    change: "+24.5%",
                    color: "from-blue-400 to-blue-600",
                  },
                  {
                    name: "VIRTUAL",
                    change: "+18.2%",
                    color: "from-purple-400 to-purple-600",
                  },
                  {
                    name: "PRIME",
                    change: "+15.8%",
                    color: "from-pink-400 to-pink-600",
                  },
                  {
                    name: "LDO",
                    change: "+12.3%",
                    color: "from-orange-400 to-orange-600",
                  },
                  {
                    name: "ARB",
                    change: "+9.7%",
                    color: "from-cyan-400 to-cyan-600",
                  },
                ].map((token) => (
                  <div
                    key={token.name}
                    className="flex items-center justify-between bg-white/40 rounded-xl p-3 transition-all duration-200 hover:bg-white/60 hover:shadow-sm hover:border hover:border-gray-200/50 cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-8 h-8 rounded-full bg-gradient-to-br ${token.color}`}
                      ></div>
                      <span className="font-medium">{token.name}</span>
                    </div>
                    <span className="text-green-600 font-medium text-sm">
                      {token.change}
                    </span>
                  </div>
                ))}
              </div>
              <p className="text-sm text-gray-600 mb-3">
                Would you like to allocate funds across these tokens?
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => handleAllocateEvenly()}
                  className="flex-1 py-2 px-4 bg-black text-white rounded-xl text-sm font-medium hover:bg-gray-800 hover:shadow-lg transition-all duration-200"
                >
                  Allocate evenly
                </button>
                <button
                  onClick={() => handleCustomAllocation()}
                  className="flex-1 py-2 px-4 bg-white/80 border border-gray-200 rounded-xl text-sm font-medium hover:bg-white hover:shadow-md hover:border-gray-300 transition-all duration-200"
                >
                  Custom allocation
                </button>
              </div>
            </div>
          ),
          timestamp: new Date(),
        };
      } else if (
        suggestion === "Build a Portfolio" ||
        suggestion.toLowerCase().includes("portfolio")
      ) {
        aiResponse = {
          id: Date.now() + 1,
          type: "ai",
          content: (
            <div>
              <p className="text-sm mb-4">
                I'll help you build a diversified portfolio. What's your budget?
              </p>
              <div className="grid grid-cols-3 gap-2 mb-4">
                {["$500", "$1,000", "$5,000"].map((budget) => (
                  <button
                    key={budget}
                    onClick={() => handleBudgetSelect(budget)}
                    className="py-2 px-4 bg-white/80 border border-gray-200 rounded-xl text-sm font-medium hover:bg-white hover:border-gray-300 hover:shadow-md transition-all duration-200"
                  >
                    {budget}
                  </button>
                ))}
              </div>
              <p className="text-sm mb-3">Risk preference:</p>
              <div className="grid grid-cols-3 gap-2">
                {["Conservative", "Moderate", "Aggressive"].map((risk) => (
                  <button
                    key={risk}
                    onClick={() => handleRiskSelect(risk)}
                    className="py-2 px-3 bg-white/80 border border-gray-200 rounded-xl text-xs font-medium hover:bg-white hover:border-gray-300 hover:shadow-md transition-all duration-200"
                  >
                    {risk}
                  </button>
                ))}
              </div>
            </div>
          ),
          timestamp: new Date(),
        };
      } else if (suggestion.toLowerCase().includes("staking")) {
        aiResponse = {
          id: Date.now() + 1,
          type: "ai",
          content: (
            <div>
              <p className="text-sm mb-4">
                Here are the best staking options available right now:
              </p>
              <div className="space-y-3">
                {[
                  {
                    name: "AERO",
                    apy: 18.5,
                    protocol: "Aerodrome",
                    color: "from-blue-400 to-blue-600",
                  },
                  {
                    name: "VIRTUAL",
                    apy: 22.3,
                    protocol: "Virtual Protocol",
                    color: "from-purple-400 to-purple-600",
                  },
                  {
                    name: "ETH",
                    apy: 4.2,
                    protocol: "Lido",
                    color: "from-cyan-400 to-cyan-600",
                  },
                ].map((token) => (
                  <div
                    key={token.name}
                    className="bg-white/40 rounded-xl p-4 transition-all duration-200 hover:bg-white/60 hover:shadow-md hover:border hover:border-gray-200/50 cursor-pointer"
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <div
                        className={`w-10 h-10 rounded-full bg-gradient-to-br ${token.color}`}
                      ></div>
                      <div className="flex-1">
                        <div className="font-bold">{token.name}</div>
                        <div className="text-xs text-gray-600">
                          {token.protocol}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold text-green-600">
                          {token.apy}%
                        </div>
                        <div className="text-xs text-gray-500">APY</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-sm text-gray-600 mt-4">
                Would you like to stake your tokens?
              </p>
            </div>
          ),
          timestamp: new Date(),
        };
      } else {
        aiResponse = {
          id: Date.now() + 1,
          type: "ai",
          content:
            "I'm here to help! I can assist you with swapping tokens, building portfolios, finding trending tokens, and discovering staking opportunities. What would you like to do?",
          timestamp: new Date(),
        };
      }

      dispatch(addCurrentMessage(aiResponse));
    }, 1200);
  };

  const handleConfirmSwap = () => {
    const confirmMsg = {
      id: Date.now(),
      type: "ai",
      content: (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center text-white text-xs">
              ✓
            </div>
            <span className="font-medium text-green-700">
              Swap submitted successfully!
            </span>
          </div>
          <p className="text-sm text-green-600">
            Transaction pending confirmation on the blockchain.
          </p>
        </div>
      ),
      timestamp: new Date(),
    };
    dispatch(addCurrentMessage(confirmMsg));

    const newAction = {
      id: Date.now(),
      type: "swap",
      title: "Swap 100 USDC to ETH",
      description: "Successfully swapped 100 USDC for 0.057 ETH via Uniswap V3",
      timestamp: new Date(),
      status: "completed",
    };
    dispatch(prependCompletedAction(newAction));
  };

  const handleAllocateEvenly = () => {
    const allocationMsg = {
      id: Date.now(),
      type: "ai",
      content: (
        <div>
          <p className="text-sm mb-4">
            Here's your even allocation across 5 trending tokens ($100 each):
          </p>
          <ActionCard onConfirm={() => handleConfirmAllocation()}>
            <div className="space-y-2 mb-3">
              {["AERO", "VIRTUAL", "PRIME", "LDO", "ARB"].map((token) => (
                <div key={token} className="flex justify-between text-sm">
                  <span className="font-medium">{token}</span>
                  <span>$100.00</span>
                </div>
              ))}
            </div>
            <div className="pt-3 border-t border-gray-200/50">
              <div className="flex justify-between font-bold">
                <span>Total</span>
                <span>$500.00</span>
              </div>
            </div>
          </ActionCard>
        </div>
      ),
      timestamp: new Date(),
    };
    dispatch(addCurrentMessage(allocationMsg));
  };

  const handleCustomAllocation = () => {
    const customMsg = {
      id: Date.now(),
      type: "ai",
      content: (
        <div>
          <p className="text-sm mb-4">
            Great! Let's create a custom allocation. Enter your budget:
          </p>
          <ActionCard onConfirm={() => handleConfirmAllocation()}>
            <div className="space-y-3">
              <input
                type="text"
                placeholder="Enter total budget (e.g., $1000)"
                className="w-full px-4 py-2 bg-white/60 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-black/10 transition-all duration-200"
              />
              {["AERO", "VIRTUAL", "PRIME", "LDO", "ARB"].map((token) => (
                <div key={token} className="flex items-center gap-3">
                  <span className="text-sm font-medium w-20">{token}</span>
                  <input
                    type="text"
                    placeholder="0%"
                    className="flex-1 px-3 py-2 bg-white/60 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-black/10 transition-all duration-200"
                  />
                </div>
              ))}
            </div>
          </ActionCard>
        </div>
      ),
      timestamp: new Date(),
    };
    dispatch(addCurrentMessage(customMsg));
  };

  const handleConfirmAllocation = () => {
    const confirmMsg = {
      id: Date.now(),
      type: "ai",
      content: (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center text-white text-xs">
              ✓
            </div>
            <span className="font-medium text-green-700">
              Portfolio built successfully!
            </span>
          </div>
          <p className="text-sm text-green-600">
            Your allocation has been executed across all tokens.
          </p>
        </div>
      ),
      timestamp: new Date(),
    };
    dispatch(addCurrentMessage(confirmMsg));

    const newAction = {
      id: Date.now(),
      type: "portfolio",
      title: "Portfolio Built Successfully",
      description: "Allocated funds across AERO, VIRTUAL, PRIME, LDO, and ARB",
      timestamp: new Date(),
      status: "completed",
    };
    dispatch(prependCompletedAction(newAction));
  };

  const handleBudgetSelect = (budget) => {
    const budgetMsg = {
      id: Date.now(),
      type: "user",
      content: budget,
      timestamp: new Date(),
    };
    dispatch(addCurrentMessage(budgetMsg));
  };

  const handleRiskSelect = (risk) => {
    const riskMsg = {
      id: Date.now(),
      type: "user",
      content: risk,
      timestamp: new Date(),
    };

    dispatch(setIsThinking(true));

    setTimeout(() => {
      dispatch(setIsThinking(false));
      const responseMsg = {
        id: Date.now() + 1,
        type: "ai",
        content: (
          <div>
            <p className="text-sm mb-4">
              Perfect! Based on your {risk.toLowerCase()} risk profile, here's a
              recommended portfolio:
            </p>
            <ActionCard onConfirm={() => handleConfirmAllocation()}>
              <div className="space-y-2 mb-3">
                <div className="flex justify-between text-sm">
                  <span className="font-medium">ETH (40%)</span>
                  <span>$200.00</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="font-medium">USDC (30%)</span>
                  <span>$150.00</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="font-medium">AERO (20%)</span>
                  <span>$100.00</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="font-medium">VIRTUAL (10%)</span>
                  <span>$50.00</span>
                </div>
              </div>
              <div className="pt-3 border-t border-gray-200/50">
                <div className="flex justify-between font-bold">
                  <span>Total</span>
                  <span>$500.00</span>
                </div>
              </div>
            </ActionCard>
          </div>
        ),
        timestamp: new Date(),
      };

      dispatch(addCurrentMessages([riskMsg, responseMsg]));
    }, 1200);
  };

  useEffect(() => {
    scrollToBottom(); // Scroll to the bottom when messages update
  }, [currentMessages, isThinking]);

  return (
    <div className="flex-1 flex flex-col">
      <div className="flex-1 flex flex-col overflow-y-auto pb-32">
        {currentMessages.length === 0 && (
          <div className="h-full flex items-center justify-center px-6">
            <div className="text-center max-w-2xl">
              <h2 className="text-3xl font-bold mb-4">Hello, I'm AlloX</h2>
              <p className="text-gray-600 mb-8">
                I can help you discover, execute, and manage crypto actions. Let
                me know how I can help you today!
              </p>

              <div className="flex flex-wrap gap-2 justify-center mb-8">
                {[
                  "Build a Portfolio",
                  "Swap Tokens",
                  "Trending Tokens",
                  "Buy $100 ETH",
                  "Best staking options",
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
                  <p className="text-sm">{msg.content}</p>
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
          <div className="relative">
            <input
              type="text"
              value={message}
              onChange={(e) => dispatch(setMessage(e.target.value))}
              onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
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
          <p className="text-xs text-center text-gray-500 mt-3">
            AlloX can make mistakes. Always verify transactions before
            confirming.
          </p>
        </div>
      </div>
    </div>
  );
}
