import { useState, useEffect, useMemo } from "react";
import { X, TrendingUp, ChevronRight, ArrowLeft } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

const PRESET_AMOUNTS = [20, 50, 100, 500];

export function PrimePicks() {
  const [selectedBundle, setSelectedBundle] = useState(null);
  const [step, setStep] = useState("detail");
  const [selectedAmount, setSelectedAmount] = useState(null);
  const [customAmount, setCustomAmount] = useState("");
  const [isCustom, setIsCustom] = useState(false);

  const handleClose = () => {
    setSelectedBundle(null);
    setStep("detail");
    setSelectedAmount(null);
    setCustomAmount("");
    setIsCustom(false);
  };

  const handleSelectBundle = (bundle) => {
    setSelectedBundle(bundle);
    setStep("detail");
    setSelectedAmount(null);
    setCustomAmount("");
    setIsCustom(false);
  };

  const effectiveAmount = isCustom
    ? parseFloat(customAmount) || 0
    : selectedAmount;

  const bundles = [
    {
      id: "top-tier",
      name: "Top-Tier",
      tokens: [
        {
          symbol: "BTC",
          name: "Bitcoin",
          percentage: 50,
          icon: "₿",
          logo: "https://cdn.allox.ai/allox/tokens/bitcoinToken.svg",
        },
        {
          symbol: "ETH",
          name: "Ethereum",
          percentage: 50,
          icon: "Ξ",
          logo: "https://cdn.allox.ai/allox/tokens/ethToken.png",
        },
      ],
      performanceYTD: 19.87,
    },
    {
      id: "power-players",
      name: "Power Players",
      tokens: [
        {
          symbol: "DOGE",
          name: "Dogecoin",
          percentage: 25,
          icon: "Ð",
          logo: "https://cdn.allox.ai/allox/tokens/doge.svg",
        },
        {
          symbol: "XRP",
          name: "Ripple",
          percentage: 25,
          icon: "X",
          logo: "https://cdn.allox.ai/allox/tokens/xrpToken.png",
        },
        {
          symbol: "ADA",
          name: "Cardano",
          percentage: 25,
          icon: "₳",
          logo: "https://cdn.allox.ai/allox/tokens/adaToken.png",
        },
        {
          symbol: "BNB",
          name: "Binance Coin",
          percentage: 25,
          icon: "B",
          logo: "https://cdn.allox.ai/allox/tokens/bnbToken.png",
        },
      ],
      performanceYTD: 23.06,
    },
    {
      id: "dex-titans",
      name: "DEX Titans",
      tokens: [
        {
          symbol: "UNI",
          name: "Uniswap",
          percentage: 50,
          icon: "🦄",
          logo: "https://cdn.allox.ai/allox/tokens/uniToken.png",
        },
        {
          symbol: "CAKE",
          name: "PancakeSwap",
          percentage: 50,
          icon: "🥞",
          logo: "https://cdn.allox.ai/allox/tokens/cakeToken.png",
        },
      ],
      performanceYTD: 4.34,
    },
  ];

  return (
    <div className="space-y-6 flex-1 px-6 py-8 portfolio-wrapper ms-auto w-full overflow-y-auto">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold">Prime Picks</h2>
          <p className="text-gray-600 mt-2">Curated bundles on BNB Chain</p>
        </div>
      </div>

      {/* Bundles Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {bundles.map((bundle) => (
          <motion.div
            key={bundle.id}
            layoutId={bundle.id}
            onClick={() => handleSelectBundle(bundle)}
            className="glass-card p-6 cursor-pointer hover:bg-white/80 hover:shadow-lg transition-all duration-200"
          >
            {/* Bundle Header */}
            <div className="flex items-start justify-between mb-4">
              <h3 className="text-xl font-bold">{bundle.name}</h3>
              <div className="px-2 py-1 bg-yellow-100 text-yellow-700 text-xs font-medium rounded-lg">
                BNB Chain
              </div>
            </div>

            {/* Tokens */}
            <div className="space-y-3 mb-4">
              {bundle.tokens.map((token) => (
                <div
                  key={token.symbol}
                  className="flex items-center justify-between"
                >
                  <div className="flex items-center gap-2">
                    <img
                      src={token.logo}
                      alt={token.symbol}
                      className="w-8 h-8"
                    />
                    <div>
                      <div className="font-medium text-sm">{token.symbol}</div>
                      {token.name && (
                        <div className="text-xs text-gray-600">
                          {token.name}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="text-sm font-medium text-gray-700">
                    {token.percentage}%
                  </div>
                </div>
              ))}
            </div>

            {/* Performance */}
            <div className="pt-4 border-t border-gray-200/50">
              <div className="flex items-center justify-between">
                <div className="text-xs text-gray-600">YTD Performance</div>
                <div
                  className={`flex items-center gap-1 text-sm font-bold ${
                    bundle.performanceYTD > 0
                      ? "text-green-600"
                      : "text-red-600"
                  }`}
                >
                  <TrendingUp size={14} />
                  {bundle.performanceYTD > 0 ? "+" : ""}
                  {bundle.performanceYTD}%
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Detail Modal */}
      <AnimatePresence>
        {selectedBundle && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedBundle(null)}
              className="h-full fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
            />

            {/* Modal */}
            <motion.div
              layoutId={selectedBundle.id}
              className="fixed inset-4 md:inset-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-full md:max-w-2xl z-50"
            >
              <div className="glass-card p-8 h-full overflow-y-auto">
                <AnimatePresence mode="wait">
                  {step === "detail" ? (
                    <motion.div
                      key="detail"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.18 }}
                    >
                      {/* Header */}
                      <div className="flex items-start justify-between mb-6">
                        <div>
                          <h2 className="text-2xl font-bold mb-2">
                            {selectedBundle.name}
                          </h2>
                          <div className="px-3 py-1 bg-yellow-100 text-yellow-700 text-xs font-medium rounded-lg inline-block">
                            BNB Chain
                          </div>
                        </div>
                        <button
                          onClick={handleClose}
                          className="p-2 hover:bg-black/5 rounded-lg transition-colors"
                        >
                          <X size={20} />
                        </button>
                      </div>

                      {/* Performance Stats */}
                      <div className="grid grid-cols-2 gap-4 mb-6">
                        <div className="glass-card p-4">
                          <div className="text-xs text-gray-600 mb-1">
                            YTD Performance
                          </div>
                          <div
                            className={`text-2xl font-bold ${selectedBundle.performanceYTD > 0 ? "text-green-600" : "text-red-600"}`}
                          >
                            {selectedBundle.performanceYTD > 0 ? "+" : ""}
                            {selectedBundle.performanceYTD}%
                          </div>
                        </div>
                        <div className="glass-card p-4">
                          <div className="text-xs text-gray-600 mb-1">
                            Number of Assets
                          </div>
                          <div className="text-2xl font-bold">
                            {selectedBundle.tokens.length}
                          </div>
                        </div>
                      </div>

                      {/* Token Breakdown */}
                      <div className="space-y-4 mb-6">
                        <h3 className="text-lg font-bold">Token Breakdown</h3>
                        {selectedBundle.tokens.map((token) => (
                          <div
                            key={token.symbol}
                            className="flex items-center justify-between p-4 bg-white/50 rounded-xl"
                          >
                            <div className="flex items-center gap-3">
                              <img
                                src={token.logo}
                                alt={token.symbol}
                                className="w-8 h-8"
                              />
                              <div>
                                <div className="font-bold">{token.symbol}</div>
                                {token.name && (
                                  <div className="text-sm text-gray-600">
                                    {token.name}
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="text-lg font-bold text-gray-700">
                              {token.percentage}%
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Action Button */}
                      <button
                        onClick={() => setStep("invest")}
                        className="w-full bg-black text-white font-semibold py-4 rounded-xl hover:bg-gray-800 transition-colors flex items-center justify-center gap-2"
                      >
                        Invest in {selectedBundle.name}
                        <ChevronRight size={18} />
                      </button>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="invest"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      transition={{ duration: 0.18 }}
                    >
                      {/* Header */}
                      <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => setStep("detail")}
                            className="p-2 hover:bg-black/5 rounded-lg transition-colors"
                          >
                            <ArrowLeft size={20} />
                          </button>
                          <div>
                            <h2 className="text-2xl font-bold">
                              Choose Amount
                            </h2>
                            <p className="text-sm text-gray-600">
                              {selectedBundle.name}
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={handleClose}
                          className="p-2 hover:bg-black/5 rounded-lg transition-colors"
                        >
                          <X size={20} />
                        </button>
                      </div>

                      {/* Preset amounts */}
                      <div className="grid grid-cols-2 gap-3 mb-4">
                        {PRESET_AMOUNTS.map((amount) => (
                          <button
                            key={amount}
                            onClick={() => {
                              setSelectedAmount(amount);
                              setIsCustom(false);
                              setCustomAmount("");
                            }}
                            className={`py-4 rounded-xl border-2 font-bold text-lg transition-all ${
                              !isCustom && selectedAmount === amount
                                ? "border-black bg-black text-white"
                                : "border-gray-200 bg-white/60 text-gray-900 hover:border-gray-400"
                            }`}
                          >
                            ${amount}
                          </button>
                        ))}
                      </div>

                      {/* Custom amount */}
                      <button
                        onClick={() => {
                          setIsCustom(true);
                          setSelectedAmount(null);
                        }}
                        className={`w-full py-3 rounded-xl border-2 font-semibold transition-all mb-2 ${
                          isCustom
                            ? "border-black bg-black text-white"
                            : "border-gray-200 bg-white/60 text-gray-700 hover:border-gray-400"
                        }`}
                      >
                        Custom Amount
                      </button>

                      <AnimatePresence>
                        {/* {isCustom && ( */}
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.15 }}
                          className="overflow-hidden"
                        >
                          <div className="relative mt-3 mb-2">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-bold">
                              $
                            </span>
                            <input
                              type="number"
                              min="1"
                              placeholder="Enter amount"
                              value={customAmount}
                              onChange={(e) => {
                                setCustomAmount(e.target.value);
                                setIsCustom(true);
                                setSelectedAmount(null);
                              }}
                              className="w-full pl-8 pr-4 py-4 border-2 border-gray-200 rounded-xl focus:border-black focus:outline-none focus-visible:outline-none text-lg font-semibold bg-white/80"
                              autoFocus
                            />
                          </div>
                        </motion.div>
                        {/* )} */}
                      </AnimatePresence>

                      {/* Token split preview */}
                      {/* {effectiveAmount > 0 && ( */}
                      <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mt-4 p-4 bg-gray-50 rounded-xl space-y-2"
                      >
                        <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide mb-3">
                          Allocation Preview
                        </p>
                        {selectedBundle.tokens.map((token) => (
                          <div
                            key={token.symbol}
                            className="flex items-center justify-between text-sm"
                          >
                            <div className="flex items-center gap-2">
                              <img
                                src={token.logo}
                                alt={token.symbol}
                                className="w-5 h-5"
                              />
                              <span className="font-medium">
                                {token.symbol}
                              </span>
                              <span className="text-gray-400">
                                {token.percentage}%
                              </span>
                            </div>
                            <span className="font-bold">
                              $
                              {(
                                (effectiveAmount * token.percentage) /
                                100
                              ).toFixed(2)}
                            </span>
                          </div>
                        ))}
                      </motion.div>
                      {/* )} */}

                      {/* Confirm button */}
                      <button
                        disabled={!effectiveAmount || effectiveAmount <= 0}
                        className="w-full mt-6 bg-black text-white font-semibold py-4 rounded-xl hover:bg-gray-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        {effectiveAmount > 0 ? `Confirm` : "Select an Amount"}
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
