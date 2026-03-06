import {
  Gift,
  MessageSquare,
  PieChart,
  TrendingUp,
  Clock,
  ArrowRight,
  Gem,
  Coins,
  Users,
  Sparkles,
  HelpCircle,
  X as CloseIcon,
  ChevronRight,
} from "lucide-react";
import { useState } from "react";
import { XTasksModal } from "./XTasksModal";
import { motion, AnimatePresence } from "motion/react";

// Custom X (Twitter) Logo Component
function XLogo({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={className}
      fill="currentColor"
    >
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

// FAQ Modal Component
export default function FAQModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ duration: 0.2 }}
        className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full max-h-[80vh] overflow-hidden"
      >
        {/* Modal Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div>
            <h3 className="text-2xl font-bold">Frequently Asked Questions</h3>
            <p className="text-sm text-gray-600 mt-1">
              Everything you need to know about Points and Gems
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center transition-colors"
          >
            <CloseIcon size={20} className="text-gray-600" />
          </button>
        </div>

        {/* Modal Content - Scrollable */}
        <div className="p-6 overflow-y-auto max-h-[calc(80vh-88px)]">
          <div className="space-y-3">
            {/* FAQ 1 */}
            <div className="glass-card overflow-hidden">
              <button
                onClick={() => setExpandedFaq(expandedFaq === 1 ? null : 1)}
                className="w-full flex items-start justify-between p-4 hover:bg-gray-50/50 transition-colors text-left"
              >
                <div className="flex items-start gap-3 flex-1">
                  <HelpCircle
                    size={20}
                    className="text-blue-600 mt-0.5 flex-shrink-0"
                  />
                  <div>
                    <h4 className="font-semibold mb-1">
                      What's the difference between Points and Gems?
                    </h4>
                    {expandedFaq !== 1 && (
                      <p className="text-sm text-gray-600">
                        Learn about reward types...
                      </p>
                    )}
                  </div>
                </div>
                <motion.div
                  animate={{ rotate: expandedFaq === 1 ? 180 : 0 }}
                  transition={{ duration: 0.2 }}
                  className="ml-2"
                >
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <path
                      d="M5 7.5L10 12.5L15 7.5"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </motion.div>
              </button>
              <AnimatePresence>
                {expandedFaq === 1 && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <div className="px-4 pb-4 pl-[52px] text-sm text-gray-700 space-y-3">
                      <p>
                        <strong>Points</strong> are the standard reward currency
                        earned through everyday activities on AlloX. They're
                        easy to accumulate and serve as your baseline
                        participation rewards.
                      </p>
                      <p>
                        <strong>Gems</strong> are premium, high-value rewards
                        that are harder to earn but offer significantly better
                        benefits. At token launch, Gems will convert at a much
                        better ratio than Points and grant access to exclusive
                        allocations.
                      </p>
                      <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                        <div className="font-semibold text-purple-900 mb-1">
                          Key Difference:
                        </div>
                        <p className="text-sm">
                          Think of Points as your regular paycheck and Gems as
                          your investment portfolio—both valuable, but Gems
                          offer significantly higher long-term value.
                        </p>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* FAQ 2 */}
            <div className="glass-card overflow-hidden">
              <button
                onClick={() => setExpandedFaq(expandedFaq === 2 ? null : 2)}
                className="w-full flex items-start justify-between p-4 hover:bg-gray-50/50 transition-colors text-left"
              >
                <div className="flex items-start gap-3 flex-1">
                  <HelpCircle
                    size={20}
                    className="text-purple-600 mt-0.5 flex-shrink-0"
                  />
                  <div>
                    <h4 className="font-semibold mb-1">How do I earn Gems?</h4>
                    {expandedFaq !== 2 && (
                      <p className="text-sm text-gray-600">
                        Discover Gem earning strategies...
                      </p>
                    )}
                  </div>
                </div>
                <motion.div
                  animate={{ rotate: expandedFaq === 2 ? 180 : 0 }}
                  transition={{ duration: 0.2 }}
                  className="ml-2"
                >
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <path
                      d="M5 7.5L10 12.5L15 7.5"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </motion.div>
              </button>
              <AnimatePresence>
                {expandedFaq === 2 && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <div className="px-4 pb-4 pl-[52px] text-sm text-gray-700 space-y-3">
                      <p>
                        The <strong>Referral Program</strong> is currently the
                        primary way to earn Gems:
                      </p>
                      <div className="bg-gradient-to-br from-purple-50 to-pink-50 border border-purple-200 rounded-lg p-4 space-y-2">
                        <div className="flex items-start gap-2">
                          <Sparkles
                            size={16}
                            className="text-purple-600 mt-0.5 flex-shrink-0"
                          />
                          <div>
                            <div className="font-semibold text-purple-900">
                              Direct Referrals
                            </div>
                            <div className="text-sm">
                              Earn Gems when your referral completes their first
                              stake (based on stake amount)
                            </div>
                          </div>
                        </div>
                        <div className="flex items-start gap-2">
                          <Sparkles
                            size={16}
                            className="text-purple-600 mt-0.5 flex-shrink-0"
                          />
                          <div>
                            <div className="font-semibold text-purple-900">
                              Network Referrals
                            </div>
                            <div className="text-sm">
                              Earn 5% of all Gems your direct referrals earn
                              from their own referrals
                            </div>
                          </div>
                        </div>
                      </div>
                      <p>
                        Additional Gem earning opportunities will be introduced
                        through special campaigns, high-value staking pools, and
                        seasonal events. Visit the Referrals page to activate
                        your program and start earning!
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* FAQ 3 */}
            <div className="glass-card overflow-hidden">
              <button
                onClick={() => setExpandedFaq(expandedFaq === 3 ? null : 3)}
                className="w-full flex items-start justify-between p-4 hover:bg-gray-50/50 transition-colors text-left"
              >
                <div className="flex items-start gap-3 flex-1">
                  <HelpCircle
                    size={20}
                    className="text-green-600 mt-0.5 flex-shrink-0"
                  />
                  <div>
                    <h4 className="font-semibold mb-1">
                      What can I do with my Points and Gems?
                    </h4>
                    {expandedFaq !== 3 && (
                      <p className="text-sm text-gray-600">
                        Unlock exclusive benefits...
                      </p>
                    )}
                  </div>
                </div>
                <motion.div
                  animate={{ rotate: expandedFaq === 3 ? 180 : 0 }}
                  transition={{ duration: 0.2 }}
                  className="ml-2"
                >
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <path
                      d="M5 7.5L10 12.5L15 7.5"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </motion.div>
              </button>
              <AnimatePresence>
                {expandedFaq === 3 && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <div className="px-4 pb-4 pl-[52px] text-sm text-gray-700 space-y-3">
                      <p>
                        Your rewards will unlock exclusive benefits at AlloX
                        token launch:
                      </p>
                      <div className="space-y-2">
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                          <div className="flex items-center gap-2 mb-2">
                            <Coins size={16} className="text-blue-600" />
                            <span className="font-semibold text-blue-900">
                              Points Benefits:
                            </span>
                          </div>
                          <ul className="space-y-1 text-sm">
                            <li>• Convert to token allocations at launch</li>
                            <li>• Participate in seasonal campaigns</li>
                            <li>• Enter prize draws and competitions</li>
                            <li>• Access to community tier benefits</li>
                          </ul>
                        </div>
                        <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                          <div className="flex items-center gap-2 mb-2">
                            <Gem size={16} className="text-purple-600" />
                            <span className="font-semibold text-purple-900">
                              Gems Benefits (Premium):
                            </span>
                          </div>
                          <ul className="space-y-1 text-sm">
                            <li>• Superior token conversion ratio</li>
                            <li>• Exclusive early-bird allocations</li>
                            <li>• VIP tier status and perks</li>
                            <li>• Priority access to future features</li>
                          </ul>
                        </div>
                      </div>
                      {/* <p className="bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg p-3 text-center font-semibold text-sm">
                                                💎 The more you accumulate now, the more value you unlock at launch!
                                            </p> */}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* FAQ 4 */}
            <div className="glass-card overflow-hidden">
              <button
                onClick={() => setExpandedFaq(expandedFaq === 4 ? null : 4)}
                className="w-full flex items-start justify-between p-4 hover:bg-gray-50/50 transition-colors text-left"
              >
                <div className="flex items-start gap-3 flex-1">
                  <HelpCircle
                    size={20}
                    className="text-indigo-600 mt-0.5 flex-shrink-0"
                  />
                  <div>
                    <h4 className="font-semibold mb-1">
                      Do Points and Gems expire?
                    </h4>
                    {expandedFaq !== 4 && (
                      <p className="text-sm text-gray-600">
                        Learn about reward duration...
                      </p>
                    )}
                  </div>
                </div>
                <motion.div
                  animate={{ rotate: expandedFaq === 4 ? 180 : 0 }}
                  transition={{ duration: 0.2 }}
                  className="ml-2"
                >
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <path
                      d="M5 7.5L10 12.5L15 7.5"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </motion.div>
              </button>
              <AnimatePresence>
                {expandedFaq === 4 && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <div className="px-4 pb-4 pl-[52px] text-sm text-gray-700 space-y-3">
                      <p>
                        <strong>No, your rewards never expire!</strong> All
                        Points and Gems you earn are permanently saved to your
                        account.
                      </p>
                      <ul className="space-y-2 ml-4">
                        <li className="flex items-start gap-2">
                          <span className="text-green-600 mt-1">✓</span>
                          <span>Accumulate rewards at your own pace</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-green-600 mt-1">✓</span>
                          <span>No time limits or expiration dates</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-green-600 mt-1">✓</span>
                          <span>
                            All rewards remain valid through token launch
                          </span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-green-600 mt-1">✓</span>
                          <span>
                            Track your total balance in your wallet stats
                          </span>
                        </li>
                      </ul>
                      <p className="text-xs text-gray-600 italic">
                        Keep earning and building your rewards—every Point and
                        Gem counts toward your future benefits!
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
