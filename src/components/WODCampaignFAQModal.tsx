import { X, AlertCircle } from "lucide-react";
import { useState } from "react";

interface WODCampaignFAQModalProps {
  onClose: () => void;
}

export function WODCampaignFAQModal({ onClose }: WODCampaignFAQModalProps) {
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);

  const faqs = [
    {
      question: "When does the campaign run?",
      answer: (
        <div className="space-y-3">
          <p>The WOD HODL campaign runs for <span className="font-semibold text-gray-900">30 days</span>:</p>
          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-xs text-gray-600 mb-1">Start Date</div>
                <div className="font-bold text-gray-900">April 15, 2026</div>
              </div>
              <div>
                <div className="text-xs text-gray-600 mb-1">End Date</div>
                <div className="font-bold text-gray-900">May 15, 2026</div>
              </div>
            </div>
          </div>
          <p><span className="font-semibold">Pro Tip:</span> Join within the first 48 hours to get a permanent 20% bonus multiplier!</p>
        </div>
      )
    },
    {
      question: "When are rewards distributed?",
      answer: (
        <div className="space-y-3">
          <p>Rewards are distributed after the campaign ends</p>
          <div className="space-y-2">
            <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
              <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-sm flex-shrink-0">1</div>
              <div>
                <div className="font-semibold text-sm text-gray-900">Snapshot Taken</div>
                <div className="text-xs text-gray-600">Final holdings recorded on May 15</div>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
              <div className="w-8 h-8 rounded-full bg-green-600 text-white flex items-center justify-center font-bold text-sm flex-shrink-0">2</div>
              <div>
                <div className="font-semibold text-sm text-gray-900">Validation</div>
                <div className="text-xs text-gray-600">All holdings validated & rewards calculated</div>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-purple-50 rounded-lg">
              <div className="w-8 h-8 rounded-full bg-purple-600 text-white flex items-center justify-center font-bold text-sm flex-shrink-0">3</div>
              <div>
                <div className="font-semibold text-sm text-gray-900">Distribution</div>
                <div className="text-xs text-gray-600">Gems sent to wallets within 7 days</div>
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      question: "What is 'My Weight' and how is it calculated?",
      answer: (
        <div className="space-y-3">
          <p>Your Weight determines your share of your tier's reward pool. It's calculated using this formula:</p>
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-200">
            <div className="text-center font-mono text-sm font-bold text-gray-900">
              Weight = Amount × Early Bonus × Holding Multiplier
            </div>
          </div>
          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <div className="font-semibold text-sm text-gray-900 mb-3">Example Calculation:</div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Investment Amount</span>
                <span className="font-semibold">$450</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Early Bonus (first 48h)</span>
                <span className="font-semibold text-yellow-600">× 1.2</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Holding Multiplier (7 days)</span>
                <span className="font-semibold text-blue-600">× 1.25</span>
              </div>
              <div className="pt-2 border-t border-gray-200 flex justify-between">
                <span className="font-bold text-gray-900">Final Weight</span>
                <span className="font-bold text-green-600">675</span>
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      question: "What is 'Total Weight' in my tier?",
      answer: (
        <div className="space-y-3">
          <p>Total Weight is the <span className="font-semibold text-gray-900">sum of all participants' weights</span> in your tier (Starter, Explorer, or Elite).</p>
          <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg p-4 border border-purple-200">
            <div className="text-center font-mono text-sm font-bold text-gray-900 mb-2">
              Your Share = (Your Weight ÷ Total Tier Weight) × Tier Pool
            </div>
            <div className="text-xs text-center text-gray-600">
              Higher total weight means smaller individual shares
            </div>
          </div>
          <p className="text-xs text-gray-600">Total Weight changes as more users join or increase their holdings, which is why estimated rewards update in real-time.</p>
        </div>
      )
    },
    {
      question: "How does the Tier Pool system work?",
      answer: (
        <div className="space-y-3">
          <p>The total campaign has <span className="font-bold text-purple-600">10,000 💎</span> divided into three tier pools:</p>
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left py-2 px-3 font-semibold text-gray-900">Tier</th>
                  <th className="text-left py-2 px-3 font-semibold text-gray-900">Investment Range</th>
                  <th className="text-right py-2 px-3 font-semibold text-gray-900">Pool %</th>
                  <th className="text-right py-2 px-3 font-semibold text-gray-900">Pool Gems</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-t border-gray-100">
                  <td className="py-2 px-3 font-semibold text-gray-700">Starter</td>
                  <td className="py-2 px-3 text-gray-600">$50 - $99</td>
                  <td className="py-2 px-3 text-right font-semibold">10%</td>
                  <td className="py-2 px-3 text-right font-bold text-purple-600">1,000 💎</td>
                </tr>
                <tr className="border-t border-gray-100 bg-green-50/50">
                  <td className="py-2 px-3 font-semibold text-green-700">Explorer</td>
                  <td className="py-2 px-3 text-gray-600">$100 - $499</td>
                  <td className="py-2 px-3 text-right font-semibold">30%</td>
                  <td className="py-2 px-3 text-right font-bold text-purple-600">3,000 💎</td>
                </tr>
                <tr className="border-t border-gray-100 bg-purple-50/50">
                  <td className="py-2 px-3 font-semibold text-purple-700">Elite</td>
                  <td className="py-2 px-3 text-gray-600">$500+</td>
                  <td className="py-2 px-3 text-right font-semibold">60%</td>
                  <td className="py-2 px-3 text-right font-bold text-purple-600">6,000 💎</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="text-xs text-gray-600">Each tier's pool is distributed proportionally based on participant weights within that tier.</p>
        </div>
      )
    },
    {
      question: "What is the Early Participation Boost?",
      answer: (
        <div className="space-y-3">
          <p>Join within the <span className="font-semibold text-gray-900">first 48 hours</span> to receive a permanent <span className="font-bold text-yellow-600">20% multiplier (1.2x)</span> on your weight!</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
              <div className="text-xs text-gray-600 mb-1">Early Bird Window</div>
              <div className="font-bold text-gray-900">April 15-17</div>
              <div className="text-xs text-yellow-600 mt-2">✓ 1.2x Weight Boost</div>
            </div>
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <div className="text-xs text-gray-600 mb-1">Regular Entry</div>
              <div className="font-bold text-gray-900">After April 17</div>
              <div className="text-xs text-gray-600 mt-2">○ Standard Weight</div>
            </div>
          </div>
          <p className="text-xs text-gray-600">You must hold until the snapshot on May 15 to receive the bonus. Selling disqualifies you.</p>
        </div>
      )
    },
    {
      question: "How does the Holding Multiplier work?",
      answer: (
        <div className="space-y-3">
          <p>The longer you hold your WOD tokens, the higher your multiplier:</p>
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left py-2 px-3 font-semibold text-gray-900">Holding Duration</th>
                  <th className="text-right py-2 px-3 font-semibold text-gray-900">Multiplier</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-t border-gray-100 bg-red-50/50">
                  <td className="py-2 px-3 text-gray-600">&lt;3 days</td>
                  <td className="py-2 px-3 text-right font-bold text-red-600">No Reward</td>
                </tr>
                <tr className="border-t border-gray-100">
                  <td className="py-2 px-3 text-gray-600">3-6 days</td>
                  <td className="py-2 px-3 text-right font-bold text-gray-700">1.0x</td>
                </tr>
                <tr className="border-t border-gray-100 bg-blue-50/50">
                  <td className="py-2 px-3 text-gray-600">7-13 days</td>
                  <td className="py-2 px-3 text-right font-bold text-blue-600">1.25x</td>
                </tr>
                <tr className="border-t border-gray-100 bg-green-50/50">
                  <td className="py-2 px-3 text-gray-600">14-29 days</td>
                  <td className="py-2 px-3 text-right font-bold text-green-600">1.5x</td>
                </tr>
                <tr className="border-t border-gray-100 bg-purple-50/50">
                  <td className="py-2 px-3 text-gray-600">30+ days</td>
                  <td className="py-2 px-3 text-right font-bold text-purple-600">2.0x</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="text-xs text-gray-600">You must hold continuously until the May 15 snapshot. Selling resets your holding duration.</p>
        </div>
      )
    },
    {
      question: "What is the Leaderboard Bonus?",
      answer: (
        <div className="space-y-3">
          <p>Top holders earn <span className="font-semibold text-gray-900">extra Gem bonuses</span> on top of their tier pool share:</p>
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left py-2 px-3 font-semibold text-gray-900">Rank</th>
                  <th className="text-right py-2 px-3 font-semibold text-gray-900">Bonus</th>
                  <th className="text-right py-2 px-3 font-semibold text-gray-900">USD Value</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-t border-gray-100 bg-yellow-50/50">
                  <td className="py-2 px-3 font-semibold text-gray-900">1-10</td>
                  <td className="py-2 px-3 text-right font-bold text-yellow-600">+20 💎</td>
                  <td className="py-2 px-3 text-right text-gray-600">$100</td>
                </tr>
                <tr className="border-t border-gray-100">
                  <td className="py-2 px-3 font-semibold text-gray-900">11-50</td>
                  <td className="py-2 px-3 text-right font-bold text-gray-600">+10 💎</td>
                  <td className="py-2 px-3 text-right text-gray-600">$50</td>
                </tr>
                <tr className="border-t border-gray-100 bg-orange-50/50">
                  <td className="py-2 px-3 font-semibold text-gray-900">51-200</td>
                  <td className="py-2 px-3 text-right font-bold text-orange-600">+5 💎</td>
                  <td className="py-2 px-3 text-right text-gray-600">$25</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="text-xs text-gray-600">Based on total $WOD bought and held. This bonus is separate from your tier pool share.</p>
        </div>
      )
    },
    {
      question: "How does the Jackpot system work?",
      answer: (
        <div className="space-y-3">
          <p>Random lucky winners receive <span className="font-semibold text-gray-900">massive bonus rewards</span> regardless of tier:</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg p-4 border border-purple-200 text-center">
              <div className="text-xs text-gray-600 mb-1">5 Winners</div>
              <div className="text-2xl font-bold text-purple-600 mb-1">100 💎</div>
              <div className="text-xs text-gray-600">$500 each</div>
            </div>
            <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg p-4 border border-purple-200 text-center">
              <div className="text-xs text-gray-600 mb-1">20 Winners</div>
              <div className="text-2xl font-bold text-purple-600 mb-1">50 💎</div>
              <div className="text-xs text-gray-600">$250 each</div>
            </div>
          </div>
          <p className="text-xs text-gray-600">All qualified participants (held for 3+ days) are automatically entered. Winners selected randomly after snapshot.</p>
        </div>
      )
    },
   
    {
      question: "What tier do I qualify for if I buy multiple times?",
      answer: (
        <div className="space-y-3">
          <p>Your tier is based on your <span className="font-semibold text-gray-900">total net position</span>. You automatically move to higher tiers as you buy more:</p>
          <div className="space-y-2">
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
              <div className="w-8 h-8 rounded-full bg-gray-600 text-white flex items-center justify-center font-bold text-sm flex-shrink-0">1</div>
              <div className="flex-1">
                <div className="font-semibold text-sm text-gray-900">First Purchase: $80</div>
                <div className="text-xs text-gray-600">Tier: Starter ($50-$99)</div>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg border border-green-200">
              <div className="w-8 h-8 rounded-full bg-green-600 text-white flex items-center justify-center font-bold text-sm flex-shrink-0">2</div>
              <div className="flex-1">
                <div className="font-semibold text-sm text-gray-900">Second Purchase: +$50 (Total: $130)</div>
                <div className="text-xs text-green-600">✓ Auto-upgraded to Explorer ($100-$499)</div>
              </div>
            </div>
          </div>
          <p className="text-xs text-gray-600">You always qualify for the highest tier your total net investment reaches.</p>
        </div>
      )
    },
    {
      question: "How are my estimated rewards calculated?",
      answer: (
        <div className="space-y-3">
          <p>Your rewards are calculated based on your <span className="font-semibold text-gray-900">proportional share</span> of your tier's pool:</p>
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-4 border border-green-200">
            <div className="text-center font-mono text-xs font-bold text-gray-900 mb-3">
              Your Gems = (Your Weight ÷ Total Tier Weight) × Tier Pool
            </div>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-gray-600">Your Weight</span>
                <span className="font-semibold">675</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Total Explorer Weight</span>
                <span className="font-semibold">60,000</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Explorer Pool</span>
                <span className="font-semibold">3,000 💎</span>
              </div>
              <div className="pt-2 border-t border-green-300 flex justify-between">
                <span className="font-bold text-gray-900">Your Reward</span>
                <span className="font-bold text-green-600">~34 💎 ($170)</span>
              </div>
            </div>
          </div>
          <p className="text-xs text-gray-600">Estimates update in real-time as more users join. Final rewards calculated at snapshot on May 15.</p>
        </div>
      )
    }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto border border-gray-200">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between z-10">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Campaign FAQ</h2>
            <p className="text-sm text-gray-600 mt-1">Common questions about the WOD HODL campaign</p>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-xl bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="space-y-2">
            {faqs.map((faq, index) => (
              <div key={index} className="border border-gray-200 rounded-xl overflow-hidden">
                <button
                  onClick={() => setOpenFaqIndex(openFaqIndex === index ? null : index)}
                  className="w-full p-4 text-left flex items-center justify-between hover:bg-gray-50 transition-colors"
                >
                  <span className="font-semibold text-sm text-gray-900">{faq.question}</span>
                  <div className={`transform transition-transform ${openFaqIndex === index ? 'rotate-180' : ''}`}>
                    <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </button>
                {openFaqIndex === index && (
                  <div className="px-4 pb-4 text-sm text-gray-600 bg-gray-50">
                    {faq.answer}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}