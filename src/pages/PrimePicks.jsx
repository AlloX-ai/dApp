import { useState, useEffect } from "react";
import { X, TrendingUp } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

export function PrimePicks() {
  const [selectedBundle, setSelectedBundle] = useState(null);

  const bundles = [
    {
      id: "top-tier",
      name: "Top-Tier",
      tokens: [
        { symbol: "BTC", name: "Bitcoin", percentage: 50, icon: "₿" },
        { symbol: "ETH", name: "Ethereum", percentage: 50, icon: "Ξ" },
      ],
      performanceYTD: 19.87,
    },
    {
      id: "power-players",
      name: "Power Players",
      tokens: [
        { symbol: "DOGE", name: "Dogecoin", percentage: 25, icon: "Ð" },
        { symbol: "XRP", name: "Ripple", percentage: 25, icon: "X" },
        { symbol: "ADA", name: "Cardano", percentage: 25, icon: "₳" },
        { symbol: "BNB", name: "Binance Coin", percentage: 25, icon: "B" },
      ],
      performanceYTD: 23.06,
    },
    {
      id: "dex-titans",
      name: "DEX Titans",
      tokens: [
        { symbol: "UNI", name: "Uniswap", percentage: 50, icon: "🦄" },
        { symbol: "CAKE", name: "PancakeSwap", percentage: 50, icon: "🥞" },
      ],
      performanceYTD: 4.34,
    },
  ];

  useEffect(() => {
    window.scrollTo(0, 0);
    document.title = "Prime Picks";
  }, []);

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
            onClick={() => setSelectedBundle(bundle)}
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
                    <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center text-sm font-bold">
                      {token.icon}
                    </div>
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
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 mb-0"
            />

            {/* Modal */}
            <motion.div
              layoutId={selectedBundle.id}
              className="fixed inset-4 md:inset-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-full md:max-w-2xl z-50"
            >
              <div className="glass-card p-8 h-full overflow-y-auto">
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
                    onClick={() => setSelectedBundle(null)}
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
                      className={`text-2xl font-bold ${
                        selectedBundle.performanceYTD > 0
                          ? "text-green-600"
                          : "text-red-600"
                      }`}
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
                        <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center text-lg font-bold">
                          {token.icon}
                        </div>
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
                <button className="w-full bg-black text-white font-semibold py-4 rounded-xl hover:bg-gray-800 transition-colors">
                  Invest in {selectedBundle.name}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
