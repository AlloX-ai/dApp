import { useState } from "react";
import { X, MessageCircle, ChevronDown, SendHorizontal } from "lucide-react";

interface MessageLimitModalProps {
  isOpen: boolean;
  onClose: () => void;
  messagesRemaining: number;
}

export function MessageLimitModal({ isOpen, onClose, messagesRemaining }: MessageLimitModalProps) {
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [selectedBundle, setSelectedBundle] = useState<number | null>(null);
  const [selectedChain, setSelectedChain] = useState("BNB Chain");
  const [selectedToken, setSelectedToken] = useState("USDT");
  const [isChainDropdownOpen, setIsChainDropdownOpen] = useState(false);
  const [isTokenDropdownOpen, setIsTokenDropdownOpen] = useState(false);

  const bundles = [
    { messages: 50, price: 0.10 },
    { messages: 100, price: 0.20 },
    { messages: 200, price: 0.40 },
    { messages: 500, price: 1.00 },
    { messages: 1000, price: 2.00 },
  ];

  const chains = [
    {
      name: "BNB Chain",
      icon: "https://cdn.allox.ai/allox/networks/bnb.svg",
    },
    {
      name: "Ethereum",
      icon: "https://cdn.allox.ai/allox/networks/eth.svg",
    },
    {
      name: "Base",
      icon: "https://cdn.allox.ai/allox/networks/base.svg",
    },
  ];
  const tokens = [
    {
      name: "USDT",
      icon: "https://cdn.allox.ai/allox/networks/usdt.svg",
    },
    {
      name: "USDC",
      icon: "https://cdn.allox.ai/allox/networks/usdc.svg",
    },
  ];

  if (!isOpen) return null;

  const handlePurchase = () => {
    // Handle purchase logic here
    console.log("Purchasing:", {
      bundle: selectedBundle,
      chain: selectedChain,
      token: selectedToken,
    });
    setShowPurchaseModal(false);
    onClose();
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl h-fit ">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <h3 className="text-2xl font-bold text-gray-900">Messages</h3>
            <button
              className="text-gray-500 hover:text-gray-700 transition-colors"
              onClick={onClose}
            >
              <X size={24} />
            </button>
          </div>
          <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl p-3 mx-6 mt-2 border-2 border-indigo-200 text-sm hover:shadow-md transition-shadow">
            <span className="w-full">
              <b>Daily limit:</b> You have {messagesRemaining} messages
              remaining today. The limit resets every 24 hours.
            </span>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            {/* Message packages */}
            <div>
              <h4 className="font-bold text-gray-900 mb-4">Message packages</h4>
                <div className="grid grid-cols-2 gap-3">
                  {bundles.slice(0, 4).map((bundle, index) => (
                    <button
                      key={index}
                      onClick={() => setSelectedBundle(index)}
                      className={`flex items-center justify-between p-3 rounded-xl transition-all ${
                        selectedBundle === index
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <SendHorizontal className="w-4 h-4" />
                        <span className="font-bold text-base">
                          {bundle.messages.toLocaleString()}
                        </span>
                      </div>
                      <div className={`px-3 py-1 rounded-lg font-bold text-sm ${
                        selectedBundle === index
                          ? 'bg-white/20 text-white'
                          : 'bg-gray-200 text-gray-900'
                      }`}>
                        ${bundle.price.toFixed(2)}
                      </div>
                    </button>
                  ))}
                  
                  {/* 1000 package spanning full width */}
                  <button
                    onClick={() => setSelectedBundle(4)}
                    className={`col-span-2 flex items-center justify-between p-3 rounded-xl transition-all ${
                      selectedBundle === 4
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <SendHorizontal className="w-4 h-4" />
                      <span className="font-bold text-base">
                        {bundles[4].messages.toLocaleString()}
                      </span>
                    </div>
                    <div className={`px-3 py-1 rounded-lg font-bold text-sm ${
                      selectedBundle === 4
                        ? 'bg-white/20 text-white'
                        : 'bg-gray-200 text-gray-900'
                    }`}>
                      ${bundles[4].price.toFixed(2)}
                    </div>
                  </button>
                </div>
            </div>

            {/* Payment Method */}
            <div className="space-y-4">
              <h4 className="font-bold text-gray-900">Payment Method</h4>
              <div className="flex items-start gap-4">
                {/* Chain Selection */}
                <div className="w-50">
                  <label className="text-sm font-medium text-gray-700 mb-2 block">
                    Select Chain
                  </label>
                  <div className="relative">
                    <button
                      onClick={() =>
                        setIsChainDropdownOpen(!isChainDropdownOpen)
                      }
                      className="w-full flex items-center justify-between px-4 py-3 bg-white border border-gray-200 rounded-xl hover:border-blue-500 transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <img
                          src={
                            chains.find((chain) => chain.name === selectedChain)
                              ?.icon
                          }
                          alt={selectedChain}
                          className="w-5 h-5"
                        />
                        <span className="font-medium text-xs sm:text-base text-gray-900">
                          {selectedChain}
                        </span>
                      </div>
                      <ChevronDown
                        size={18}
                        className={`transition-transform ${isChainDropdownOpen ? "rotate-180" : ""}`}
                      />
                    </button>

                    {isChainDropdownOpen && (
                      <>
                        <div
                          className="fixed inset-0 z-10"
                          onClick={() => setIsChainDropdownOpen(false)}
                        />
                        <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-xl shadow-xl z-20 overflow-hidden">
                          {chains.map((chain) => (
                            <button
                              key={chain.name}
                              onClick={() => {
                                setSelectedChain(chain.name);
                                setIsChainDropdownOpen(false);
                              }}
                              className={`w-full flex items-center gap-3 text-left px-4 py-3 text-xs sm:text-base hover:bg-gray-50 transition-colors ${
                                selectedChain === chain.name
                                  ? "bg-blue-50 font-semibold text-blue-600"
                                  : "text-gray-700"
                              }`}
                            >
                              <img
                                src={chain.icon}
                                alt={chain.name}
                                className="w-5 h-5"
                              />
                              {chain.name}
                            </button>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Token Selection */}
                <div className="w-50">
                  <label className="text-sm font-medium text-gray-700 mb-2 block">
                    Select Token
                  </label>
                  <div className="relative">
                    <button
                      onClick={() =>
                        setIsTokenDropdownOpen(!isTokenDropdownOpen)
                      }
                      className="w-full flex items-center justify-between px-4 py-3 bg-white border border-gray-200 rounded-xl hover:border-blue-500 transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <img
                          src={
                            tokens.find((token) => token.name === selectedToken)
                              ?.icon
                          }
                          alt={selectedToken}
                          className="w-5 h-5"
                        />
                        <span className="font-medium text-xs sm:text-base text-gray-900">
                          {selectedToken}
                        </span>
                      </div>
                      <ChevronDown
                        size={18}
                        className={`transition-transform ${isTokenDropdownOpen ? "rotate-180" : ""}`}
                      />
                    </button>

                    {isTokenDropdownOpen && (
                      <>
                        <div
                          className="fixed inset-0 z-10"
                          onClick={() => setIsTokenDropdownOpen(false)}
                        />
                        <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-xl shadow-xl z-20 overflow-hidden">
                          {tokens.map((token) => (
                            <button
                              key={token.name}
                              onClick={() => {
                                setSelectedToken(token.name);
                                setIsTokenDropdownOpen(false);
                              }}
                              className={`w-full flex items-center gap-3 text-xs sm:text-base text-left px-4 py-3 hover:bg-gray-50 transition-colors ${
                                selectedToken === token.name
                                  ? "bg-blue-50 font-semibold text-blue-600"
                                  : "text-gray-700"
                              }`}
                            >
                              <img
                                src={token.icon}
                                alt={token.name}
                                className="w-5 h-5"
                              />
                              {token.name}
                            </button>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Buy Button */}
            <button
              onClick={handlePurchase}
              disabled={selectedBundle === null}
              className={`w-full py-4 px-6 rounded-xl font-bold text-white transition-all ${
                selectedBundle === null
                  ? "bg-gray-300 cursor-not-allowed"
                  : "bg-black hover:bg-black/80"
              }`}
            >
              Buy
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
