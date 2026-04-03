import { X, Target, Clock, Zap, Trophy, Gift, Calculator, Shield, AlertCircle, Gem, DollarSign } from "lucide-react";
import { useState } from "react";

interface WODCampaignDetailsModalProps {
  onClose: () => void;
}

export function WODCampaignDetailsModal({ onClose }: WODCampaignDetailsModalProps) {
  const [activeTab, setActiveTab] = useState<"rules" | "tiers" | "examples">("rules");
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);

  const tiers = [
    {
      name: "Starter",
      color: "gray",
      gradient: "from-gray-400 to-gray-600",
      bgColor: "bg-gray-50",
      textColor: "text-gray-700",
      borderColor: "border-gray-200",
      buy: "$50 – $99",
      poolPercent: "10%",
      poolGems: "1,000 💎",
      icon: "⚪"
    },
    {
      name: "Explorer",
      color: "green",
      gradient: "from-green-500 to-emerald-600",
      bgColor: "bg-green-50",
      textColor: "text-green-700",
      borderColor: "border-green-200",
      buy: "$100 – $499",
      poolPercent: "30%",
      poolGems: "3,000 💎",
      icon: "🟢"
    },
    {
      name: "Elite",
      color: "purple",
      gradient: "from-purple-500 to-pink-600",
      bgColor: "bg-purple-50",
      textColor: "text-purple-700",
      borderColor: "border-purple-200",
      buy: "$500+",
      poolPercent: "60%",
      poolGems: "6,000 💎",
      icon: "🟣"
    }
  ];

  const holdingMultipliers = [
    { time: "<3 days", multiplier: "No reward", color: "text-red-600" },
    { time: "3–6 days", multiplier: "1.0x", color: "text-gray-700" },
    { time: "7–13 days", multiplier: "1.25x", color: "text-blue-600" },
    { time: "14–29 days", multiplier: "1.5x", color: "text-green-600" },
    { time: "30+ days", multiplier: "2.0x", color: "text-purple-600" }
  ];

  const leaderboardBonus = [
    { rank: "Top 1-10", bonus: "+20 Gems", color: "text-yellow-600" },
    { rank: "11-50", bonus: "+10 Gems", color: "text-gray-600" },
    { rank: "51-200", bonus: "+5 Gems", color: "text-orange-600" }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto border border-gray-200">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between z-10">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Campaign Details</h2>
            <p className="text-sm text-gray-600 mt-1">Everything you need to know about the $WOD campaign</p>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-xl bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Core Rules */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Shield className="w-5 h-5 text-blue-600" />
              <h3 className="text-lg font-bold">Core Rules</h3>
            </div>
            <p className="text-sm text-gray-600 mb-3">
              Essential requirements to participate and qualify for rewards in this campaign.
            </p>
            <div className="grid md:grid-cols-2 gap-3">
              <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">✓</div>
                <div>
                  <div className="font-semibold text-sm text-gray-900">Net Buys Only</div>
                  <div className="text-xs text-gray-600">Only net buys of WOD count</div>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">✓</div>
                <div>
                  <div className="font-semibold text-sm text-gray-900">Hold Until Snapshot</div>
                  <div className="text-xs text-gray-600">Must maintain holdings until campaign end</div>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">✓</div>
                <div>
                  <div className="font-semibold text-sm text-gray-900">Post-Campaign Distribution</div>
                  <div className="text-xs text-gray-600">Rewards sent after snapshot validation</div>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">✓</div>
                <div>
                  <div className="font-semibold text-sm text-gray-900">One Tier Per Wallet</div>
                  <div className="text-xs text-gray-600">Qualify for highest tier reached only</div>
                </div>
              </div>
            </div>
          </div>

          {/* Tier Structure */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Target className="w-5 h-5 text-purple-600" />
              <h3 className="text-lg font-bold">Tier Structure</h3>
            </div>
            <p className="text-sm text-gray-600 mb-3">
              Different reward tiers based on your investment amount. Higher tiers offer better returns and ROI.
            </p>
            <div className="grid md:grid-cols-3 gap-4">
              {tiers.map((tier) => (
                <div
                  key={tier.name}
                  className={`p-4 border-2 ${tier.borderColor} ${tier.bgColor}/30 rounded-xl`}
                >
                  <div className="flex items-center gap-2 mb-3">
                    
                    <div>
                      <div className={`font-bold text-lg ${tier.textColor}`}>{tier.name}</div>
                      <div className="text-xs text-gray-600">{tier.buy}</div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Pool Allocation</span>
                      <span className="font-bold text-gray-900">{tier.poolPercent}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Pool Gems</span>
                      <span className="font-bold text-gray-900">{tier.poolGems}</span>
                    </div>
                    <div className="pt-2 border-t border-gray-200 text-xs text-gray-600">
                      Your share depends on your weight vs. total tier weight
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            {/* Pool Distribution Info */}
            <div className="mt-4 p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
              <div className="text-sm text-gray-700 mb-2">
                <span className="font-bold">How Pool Distribution Works:</span>
              </div>
              <div className="text-xs text-gray-600 space-y-1">
                <div>• Total campaign pool: <span className="font-semibold">10,000 💎</span></div>
                <div>• Your weight = <span className="font-semibold">Amount × Early Bonus × Holding Multiplier</span></div>
                <div>• Your reward = <span className="font-semibold">(Your Weight / Total Tier Weight) × Tier Pool</span></div>
              </div>
            </div>
          </div>

          {/* Holding Multiplier */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-5 h-5 text-blue-600" />
              <h3 className="text-lg font-bold">Holding Multiplier</h3>
            </div>
            <p className="text-sm text-gray-600 mb-3">
              The longer you hold your $WOD tokens, the higher your reward multiplier. You must hold for at least 3 days to qualify.
            </p>
            <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-3">
              {holdingMultipliers.map((item) => (
                <div key={item.time} className="p-4 bg-gray-50 rounded-xl text-center">
                  <div className="text-xs text-gray-600 mb-2">{item.time}</div>
                  <div className={`text-lg font-bold ${item.color}`}>{item.multiplier}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Bonus Features */}
          <div className="grid md:grid-cols-2 gap-6">
            {/* Early Participation Boost */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Zap className="w-5 h-5 text-yellow-600" />
                <h3 className="text-lg font-bold">Early Participation Boost</h3>
              </div>
              <p className="text-sm text-gray-600 mb-3">
                Get extra rewards for joining early! Participate within the first 48 hours for a 20% bonus on your final Gem rewards.
              </p>
              <div className="p-4 bg-gradient-to-br from-yellow-50 to-orange-50 rounded-xl border-2 border-yellow-200">
                <div className="text-center mb-3">
                  <div className="text-3xl font-bold text-yellow-600">+20%</div>
                  <div className="text-sm text-gray-600">Bonus Gems</div>
                </div>
                <div className="space-y-2 text-xs text-gray-700">
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-yellow-600"></div>
                    <span>First 48 hours only</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-yellow-600"></div>
                    <span>Must hold until snapshot</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-yellow-600"></div>
                    <span>One per wallet</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Leaderboard Bonus */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Trophy className="w-5 h-5 text-amber-600" />
                <h3 className="text-lg font-bold">Leaderboard Bonus</h3>
              </div>
              <p className="text-sm text-gray-600 mb-3">
                Compete to be a top holder! The highest wallet balances earn extra Gem bonuses on top of their tier rewards.
              </p>
              <div className="space-y-2">
                {leaderboardBonus.map((item) => (
                  <div key={item.rank} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="font-semibold text-sm text-gray-900">{item.rank}</span>
                    <div className="flex items-center gap-1">
                      <Gem size={14} className="text-purple-600" />
                      <span className={`font-bold text-sm ${item.color}`}>{item.bonus}</span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-3 text-xs text-gray-600">
                Based on total WOD bought + held
              </div>
            </div>
          </div>

          {/* Jackpot Layer */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Gift className="w-5 h-5 text-purple-600" />
              <h3 className="text-lg font-bold">Jackpot Layer</h3>
            </div>
            <p className="text-sm text-gray-600 mb-3">
              Lucky random winners selected from all participants receive massive bonus rewards, regardless of their tier.
            </p>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="p-5 bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl border border-purple-200 text-center">
                <div className="text-sm text-gray-600 mb-2">5 Winners</div>
                <div className="flex items-center justify-center gap-2 mb-1">
                  <Gem size={20} className="text-purple-600" />
                  <span className="text-2xl font-bold text-gray-900">100</span>
                </div>
                <div className="text-sm text-gray-600">$500 each</div>
              </div>
              <div className="p-5 bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl border border-purple-200 text-center">
                <div className="text-sm text-gray-600 mb-2">20 Winners</div>
                <div className="flex items-center justify-center gap-2 mb-1">
                  <Gem size={20} className="text-purple-600" />
                  <span className="text-2xl font-bold text-gray-900">50</span>
                </div>
                <div className="text-sm text-gray-600">$250 each</div>
              </div>
            </div>
            
          </div>

          {/* Example Calculation */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Calculator className="w-5 h-5 text-green-600" />
              <h3 className="text-lg font-bold">Example Calculation</h3>
            </div>
            <p className="text-sm text-gray-600 mb-3">
              See how the dynamic pool distribution works with a realistic scenario showing weight calculation and pool share.
            </p>
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-5 border border-green-200">
              <div className="space-y-3">
                <div className="text-sm font-bold text-gray-900 mb-2">Scenario: Explorer Tier User</div>
                
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-700">Investment Amount</span>
                  <span className="font-bold text-gray-900">$450</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-700">Early Bonus (first 48h)</span>
                  <span className="font-bold text-yellow-600">× 1.2</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-700">Holding Duration (7 days)</span>
                  <span className="font-bold text-blue-600">× 1.25</span>
                </div>
                
                <div className="pt-2 border-t border-green-300">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-700 font-semibold">User Weight</span>
                    <span className="font-bold text-gray-900">450 × 1.2 × 1.25 = 675</span>
                  </div>
                </div>
                
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-700">Explorer Tier Pool</span>
                  <span className="font-bold text-gray-900">3,000 💎</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-700">Total Explorer Weight</span>
                  <span className="font-bold text-gray-900">60,000</span>
                </div>
                
                <div className="pt-3 border-t-2 border-green-400">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-gray-900">Your Reward</span>
                    <div className="flex items-center gap-2">
                      <Gem size={18} className="text-green-600" />
                      <span className="text-xl font-bold text-green-600">~34 Gems</span>
                      <span className="text-sm text-gray-600">($170)</span>
                    </div>
                  </div>
                  <div className="text-xs text-gray-600 text-right mt-1">
                    (675 / 60,000) × 3,000 = 33.75 💎
                  </div>
                </div>
              </div>
            </div>
            <div className="mt-3 text-xs text-gray-600 text-center">
              Formula: (Your Weight / Total Tier Weight) × Tier Pool
            </div>
          </div>

          {/* FAQ Section */}
          
        </div>
      </div>
    </div>
  );
}