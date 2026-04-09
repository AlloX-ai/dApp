import { useEffect, useRef, useState } from "react";
import { X, Minus, Send } from "lucide-react";
import { useChatbot, formatText } from "../hooks/useChatbot";

interface Message {
  id: string;
  type: "user" | "ai";
  content: string;
  timestamp: string;
}

export function AIChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const {
    messages,
    inputValue,
    isThinking,
    error,
    setInputValue,
    sendMessage,
  } = useChatbot();
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isOpen || isMinimized) return;
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isThinking, isOpen, isMinimized]);

  const handleSendMessage = async () => {
    await sendMessage();
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 w-14 h-14 bg-black rounded-full shadow-lg hover:shadow-xl transition-all flex items-center justify-center z-50 hover:scale-110"
      >
        {/* <MessageCircle className="w-6 h-6 text-white" /> */}
        <img src="https://cdn.allox.ai/allox/chatIcon.svg" alt="chat icon" className="h-6 w-6" />
      </button>
    );
  }

  if (isMinimized) {
    return (
      <div className="fixed bottom-6 right-6 z-50">
        <button
          onClick={() => setIsMinimized(false)}
          className="glass-card px-4 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all flex items-center gap-2"
        >
          <div className="w-8 h-8 bg-black rounded-full flex items-center justify-center">
            <img src="https://cdn.allox.ai/allox/chatIcon.svg" alt="chat icon" className="h-4 w-4" />
          </div>
          <span className="font-semibold text-gray-900">ChainGPT AI</span>
        </button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 w-80 sm:w-96 h-[500px] glass-card rounded-2xl shadow-2xl overflow-hidden flex flex-col z-50 border border-gray-200">
      {/* Header */}
      <div className="bg-black p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
           <img src="https://cdn.allox.ai/allox/chatIcon.svg" alt="chat icon" className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-bold text-white">ChainGPT AI</h3>
            <p className="text-xs text-blue-100">Ask me about anything</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setIsMinimized(true)}
            className="w-8 h-8 rounded-lg hover:bg-white/10 flex items-center justify-center transition-colors"
          >
            <Minus className="w-4 h-4 text-white" />
          </button>
          <button
            onClick={() => setIsOpen(false)}
            className="w-8 h-8 rounded-lg hover:bg-white/10 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4 text-white" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gradient-to-br from-gray-50/50 to-white/50">
        {messages.map((message: Message) => (
          <div
            key={message.id}
            className={`flex ${message.type === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${
                message.type === "user"
                  ? "bg-black text-white"
                  : "bg-white border border-gray-200 text-gray-900"
              }`}
            >
              {message.type === "ai" ? (
                <p
                  className="text-sm"
                  dangerouslySetInnerHTML={{ __html: formatText(message.content) }}
                />
              ) : (
                <p className="text-sm">{message.content}</p>
              )}
              <p
                className={`text-xs mt-1 ${message.type === "user" ? "text-blue-100" : "text-gray-500"}`}
              >
                {new Date(message.timestamp).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </div>
          </div>
        ))}

        {isThinking && (
          <div className="flex justify-start">
            <div className="bg-white border border-gray-200 rounded-2xl px-4 py-2.5">
              <div className="flex items-center gap-2">
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                  <div
                    className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                    style={{ animationDelay: "0.2s" }}
                  ></div>
                  <div
                    className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                    style={{ animationDelay: "0.4s" }}
                  ></div>
                </div>
                <span className="text-xs text-gray-500">ChainGPT is thinking...</span>
              </div>
            </div>
          </div>
        )}

       

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 bg-white border-t border-gray-200">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask me anything..."
            className="flex-1 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-black/10 focus:bg-white/80 transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
          />
          <button
            onClick={handleSendMessage}
            disabled={!inputValue.trim() || isThinking}
            className="w-10 h-10 bg-black rounded-xl flex items-center justify-center hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="w-4 h-4 text-white" />
          </button>
        </div>
      </div>
    </div>
  );
}
