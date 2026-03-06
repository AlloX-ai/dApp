import {

    Gem,

    Check,
    HelpCircle, X,
    X as CloseIcon,
} from "lucide-react";
import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";

// FAQ Modal Component
export default function FAQReferralModal({
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
                            Everything you need to know about Referral
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
                        <div className="glass-card overflow-hidden">
                            <button
                                onClick={() => setExpandedFaq(expandedFaq === 1 ? null : 1)}
                                className="w-full flex items-start justify-between p-4 hover:bg-gray-50/50 transition-colors text-left"
                            >
                                <div className="flex items-start gap-3 flex-1">
                                    <HelpCircle size={20} className="text-indigo-600 mt-0.5 flex-shrink-0" />
                                    <div>
                                        <h3 className="font-semibold mb-1">How do referral rewards work?</h3>
                                        {expandedFaq !== 1 && (
                                            <p className="text-sm text-gray-600">Learn how to earn Gems and Points...</p>
                                        )}
                                    </div>
                                </div>
                                <motion.div
                                    animate={{ rotate: expandedFaq === 1 ? 180 : 0 }}
                                    transition={{ duration: 0.2 }}
                                    className="ml-2"
                                >
                                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                                        <path d="M5 7.5L10 12.5L15 7.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
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
                                                When someone uses your referral link and completes their first valid staking action, you earn Gems and Points based on the tier of their stake:
                                            </p>
                                            <ul className="space-y-2 ml-4">
                                                <li className="flex items-start gap-2">
                                                    <span className="text-indigo-600 mt-1">•</span>
                                                    <span><strong>Tier A ($1-$100):</strong> 1 Gem + 250 Points</span>
                                                </li>
                                                <li className="flex items-start gap-2">
                                                    <span className="text-indigo-600 mt-1">•</span>
                                                    <span><strong>Tier B ($101-$1,000):</strong> 5 Gems + 1,250 Points</span>
                                                </li>
                                                <li className="flex items-start gap-2">
                                                    <span className="text-indigo-600 mt-1">•</span>
                                                    <span><strong>Tier C ($1,000+):</strong> 10 Gems + 2,500 Points</span>
                                                </li>
                                            </ul>
                                            <p>
                                                Plus, if your referral activates their own referral program, you'll earn 5% of all their direct referral earnings as network rewards!
                                            </p>
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
                                    <HelpCircle size={20} className="text-purple-600 mt-0.5 flex-shrink-0" />
                                    <div>
                                        <h3 className="font-semibold mb-1">What are Gems and why are they valuable?</h3>
                                        {expandedFaq !== 2 && (
                                            <p className="text-sm text-gray-600">Discover the value of Gems...</p>
                                        )}
                                    </div>
                                </div>
                                <motion.div
                                    animate={{ rotate: expandedFaq === 2 ? 180 : 0 }}
                                    transition={{ duration: 0.2 }}
                                    className="ml-2"
                                >
                                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                                        <path d="M5 7.5L10 12.5L15 7.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
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
                                                <strong>Gems are one of the highest value items in the AlloX ecosystem.</strong> They are premium rewards that will be used for exclusive benefits at token launch.
                                            </p>
                                            <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <Gem size={16} className="text-purple-600" />
                                                    <span className="font-semibold text-purple-900">Key Benefits:</span>
                                                </div>
                                                <ul className="space-y-1.5 text-sm">
                                                    <li className="flex items-start gap-2">
                                                        <span className="text-purple-600 mt-1">✦</span>
                                                        <span>Better conversion ratio than Points at token launch</span>
                                                    </li>
                                                    <li className="flex items-start gap-2">
                                                        <span className="text-purple-600 mt-1">✦</span>
                                                        <span>Access to exclusive early-bird token allocations</span>
                                                    </li>
                                                    <li className="flex items-start gap-2">
                                                        <span className="text-purple-600 mt-1">✦</span>
                                                        <span>Priority rewards tier for future campaigns</span>
                                                    </li>
                                                </ul>
                                            </div>
                                            <p>
                                                Think of Gems as your VIP pass to premium rewards. The more Gems you collect now, the more value you'll unlock when the token launches.
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
                                    <HelpCircle size={20} className="text-blue-600 mt-0.5 flex-shrink-0" />
                                    <div>
                                        <h3 className="font-semibold mb-1">How do Network Referrals work?</h3>
                                        {expandedFaq !== 3 && (
                                            <p className="text-sm text-gray-600">Make others work for you...</p>
                                        )}
                                    </div>
                                </div>
                                <motion.div
                                    animate={{ rotate: expandedFaq === 3 ? 180 : 0 }}
                                    transition={{ duration: 0.2 }}
                                    className="ml-2"
                                >
                                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                                        <path d="M5 7.5L10 12.5L15 7.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
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
                                                <strong>Network Referrals let you earn passive income from your network's growth.</strong> Here's how it works:
                                            </p>
                                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                                <div className="space-y-3">
                                                    <div className="flex gap-3">
                                                        <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0">1</div>
                                                        <div>
                                                            <div className="font-semibold mb-1">Someone joins using your link</div>
                                                            <div className="text-sm text-gray-600">They become your direct referral</div>
                                                        </div>
                                                    </div>
                                                    <div className="flex gap-3">
                                                        <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0">2</div>
                                                        <div>
                                                            <div className="font-semibold mb-1">They activate their own referral program</div>
                                                            <div className="text-sm text-gray-600">They start inviting their own network</div>
                                                        </div>
                                                    </div>
                                                    <div className="flex gap-3">
                                                        <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0">3</div>
                                                        <div>
                                                            <div className="font-semibold mb-1">You earn 5% of their earnings</div>
                                                            <div className="text-sm text-gray-600">Get 5% of all Gems and Points they earn from their direct referrals—forever!</div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                            <p className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg p-3 text-center font-semibold">
                                                💡 Your network works for you while you sleep!
                                            </p>
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
                                    <HelpCircle size={20} className="text-green-600 mt-0.5 flex-shrink-0" />
                                    <div>
                                        <h3 className="font-semibold mb-1">When do I receive my rewards?</h3>
                                        {expandedFaq !== 4 && (
                                            <p className="text-sm text-gray-600">Track your earnings in real-time...</p>
                                        )}
                                    </div>
                                </div>
                                <motion.div
                                    animate={{ rotate: expandedFaq === 4 ? 180 : 0 }}
                                    transition={{ duration: 0.2 }}
                                    className="ml-2"
                                >
                                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                                        <path d="M5 7.5L10 12.5L15 7.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
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
                                                Rewards are credited <strong>instantly</strong> once your referral completes their first valid staking action. You can track everything in your referral dashboard:
                                            </p>
                                            <ul className="space-y-2 ml-4">
                                                <li className="flex items-start gap-2">
                                                    <span className="text-green-600 mt-1">✓</span>
                                                    <span>See real-time notifications when someone registers with your link</span>
                                                </li>
                                                <li className="flex items-start gap-2">
                                                    <span className="text-green-600 mt-1">✓</span>
                                                    <span>Get instant credit when they complete their first stake</span>
                                                </li>
                                                <li className="flex items-start gap-2">
                                                    <span className="text-green-600 mt-1">✓</span>
                                                    <span>Monitor your total Gems and Points accumulation</span>
                                                </li>
                                                <li className="flex items-start gap-2">
                                                    <span className="text-green-600 mt-1">✓</span>
                                                    <span>Track both direct and network referral earnings separately</span>
                                                </li>
                                            </ul>
                                            <p>
                                                All rewards are saved to your account and will be available for redemption at token launch.
                                            </p>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        {/* FAQ 5 */}
                        <div className="glass-card overflow-hidden">
                            <button
                                onClick={() => setExpandedFaq(expandedFaq === 5 ? null : 5)}
                                className="w-full flex items-start justify-between p-4 hover:bg-gray-50/50 transition-colors text-left"
                            >
                                <div className="flex items-start gap-3 flex-1">
                                    <HelpCircle size={20} className="text-orange-600 mt-0.5 flex-shrink-0" />
                                    <div>
                                        <h3 className="font-semibold mb-1">Are there any limits or restrictions?</h3>
                                        {expandedFaq !== 5 && (
                                            <p className="text-sm text-gray-600">Learn about program terms...</p>
                                        )}
                                    </div>
                                </div>
                                <motion.div
                                    animate={{ rotate: expandedFaq === 5 ? 180 : 0 }}
                                    transition={{ duration: 0.2 }}
                                    className="ml-2"
                                >
                                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                                        <path d="M5 7.5L10 12.5L15 7.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                </motion.div>
                            </button>
                            <AnimatePresence>
                                {expandedFaq === 5 && (
                                    <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: "auto", opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        transition={{ duration: 0.2 }}
                                    >
                                        <div className="px-4 pb-4 pl-[52px] text-sm text-gray-700 space-y-3">
                                            <p>
                                                <strong>No caps, no limits, no time restrictions!</strong> Our referral program is designed to reward you fairly:
                                            </p>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                                                    <div className="font-semibold text-green-900 mb-2 flex items-center gap-2">
                                                        <Check size={16} className="text-green-600" />
                                                        <span>What's Allowed:</span>
                                                    </div>
                                                    <ul className="space-y-1 text-sm">
                                                        <li>• Unlimited number of referrals</li>
                                                        <li>• Unlimited earning duration</li>
                                                        <li>• Share on any platform</li>
                                                        <li>• Create pool-specific links</li>
                                                    </ul>
                                                </div>
                                                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                                                    <div className="font-semibold text-red-900 mb-2 flex items-center gap-2">
                                                        <X size={16} className="text-red-600" />
                                                        <span>Not Allowed:</span>
                                                    </div>
                                                    <ul className="space-y-1 text-sm">
                                                        <li>• Self-referrals (same wallet)</li>
                                                        <li>• Bot or fake accounts</li>
                                                        <li>• Spam or misleading promotions</li>
                                                        <li>• Circumventing anti-fraud systems</li>
                                                    </ul>
                                                </div>
                                            </div>
                                            <p className="text-xs text-gray-600 italic">
                                                We use advanced wallet validation and anti-fraud systems to ensure fair play. Violations may result in reward forfeiture.
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
