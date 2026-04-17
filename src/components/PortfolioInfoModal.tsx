// Portfolio Info Modal Component
import { motion } from "motion/react";
import { HelpCircle,  X as CloseIcon, Coins,Gem  } from "lucide-react";

export function PortfolioInfoModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  if (!isOpen) return null;

  const tierData = [
    { tier: 'Bronze', volume: '< $10K', gems: '0.30' },
    { tier: 'Silver', volume: '≥ $10K', gems: '0.36' },
    { tier: 'Gold', volume: '≥ $50K', gems: '0.42' },
    { tier: 'Platinum', volume: '≥ $250K', gems: '0.50' },
    { tier: 'Diamond', volume: '≥ $1M', gems: '0.60' },
    { tier: 'Mythic', volume: '≥ $5M', gems: '0.80' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ duration: 0.2 }}
        className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[75vh] overflow-hidden"
      >
        {/* Modal Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-5 py-3.5 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold">Create Portfolio Rewards</h3>
            <p className="text-xs text-gray-600 mt-0.5">Earn points and gems</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center transition-colors"
          >
            <CloseIcon size={16} className="text-gray-600" />
          </button>
        </div>

        {/* Modal Content - Scrollable */}
        <div className="p-5 overflow-y-auto max-h-[calc(75vh-72px)] space-y-4">
          {/* How Points Are Earned */}
          <div className="glass-card p-4 bg-gradient-to-br from-blue-50 to-cyan-50 border-blue-200/50">
            <div className="flex items-center gap-2.5 mb-2">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <Coins size={16} className="text-white" />
              </div>
              <h4 className="font-bold">Points</h4>
            </div>
            <p className="text-xs text-gray-700">
              Earn <strong>250 points</strong> for creating on-chain portfolios.
            </p>
          </div>

          {/* How Gems Are Earned */}
          <div className="glass-card p-4 bg-gradient-to-br from-purple-50 to-pink-50 border-purple-200/50">
            <div className="flex items-center gap-2.5 mb-2">
              <div className="w-8 h-8 bg-gradient-to-br from-purple-600 to-pink-600 rounded-lg flex items-center justify-center">
                <Gem size={16} className="text-white" />
              </div>
              <h4 className="font-bold">Gems</h4>
            </div>
            <div className="space-y-2 text-xs text-gray-700">
              <div className="flex items-start gap-1.5">
                <span className="text-purple-600 mt-0.5">•</span>
                <p>
                  <strong>Campaigns only:</strong> Earn gems for on-chain portfolios from campaigns
                </p>
              </div>
              <div className="flex items-start gap-1.5">
                <span className="text-purple-600 mt-0.5">•</span>
                <p>
                  <strong>Volume rewards:</strong> Earn gems based on lifetime trading volume
                </p>
              </div>
            </div>
          </div>

          {/* Tier Table */}
          <div>
            <h4 className="font-bold mb-2 text-sm">Volume-Based Gem Rewards</h4>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-gray-900 text-white">
                    <th className="px-3 py-2 text-left rounded-tl-lg">Tier</th>
                    <th className="px-3 py-2 text-left">Volume</th>
                    <th className="px-3 py-2 text-left rounded-tr-lg">Gems/$1K</th>
                  </tr>
                </thead>
                <tbody>
                  {tierData.map((row, index) => (
                    <tr
                      key={row.tier}
                      className={`${
                        index % 2 === 0 ? 'bg-gray-50' : 'bg-white'
                      } border-b border-gray-200 last:border-0`}
                    >
                      <td className="px-3 py-2 font-semibold text-gray-900">{row.tier}</td>
                      <td className="px-3 py-2 text-gray-700">{row.volume}</td>
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-1">
                          <Gem size={12} className="text-purple-600" />
                          <span className="font-semibold text-purple-700">{row.gems}</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-[10px] text-gray-600 mt-2 italic">
              * Lifetime volume is cumulative across all portfolio transactions
            </p>
          </div>

          {/* Example */}
          
        </div>
      </motion.div>
    </div>
  );
}
