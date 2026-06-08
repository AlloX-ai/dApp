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
                className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden"
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
                        <div>
                            <h3 className="font-bold text-gray-900 mb-2">What is a qualifying referral?</h3>
                            <p className="text-sm text-gray-700 mb-3">
                                A qualifying referral occurs when someone uses your referral link and creates a portfolio with a <strong>minimum investment of $100</strong>.
                            </p>
                            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                                <p className="text-sm font-semibold text-gray-900 mb-2">Requirements:</p>
                                <ul className="space-y-1 text-sm text-gray-700">
                                    <li>• Portfolio investment ≥ $100</li>
                                    <li>• Valid wallet address</li>
                                    <li>• Passed anti-fraud validation</li>
                                    <li>• Used within 30-day cookie window</li>
                                </ul>
                            </div>
                        </div>

                        {/* FAQ 2 */}
                        <div>
                            <h3 className="font-bold text-gray-900 mb-2">How do the three tracks work together?</h3>
                            <p className="text-sm text-gray-700 mb-3">
                                All three tracks are <strong>independent and stackable</strong> — you earn from all of them simultaneously.
                            </p>
                            <div className="space-y-2 text-sm text-gray-700">
                                <p><strong>Track 1:</strong> Earn $5-$100 instantly when each direct referral creates a portfolio</p>
                                <p><strong>Track 2:</strong> Earn 5% of whatever your referrals earn from their own referrals — lifetime</p>
                                <p><strong>Track 3:</strong> One-time bonuses at 10, 50, 150, and 250 total referrals</p>
                            </div>
                        </div>

                        {/* FAQ 3 */}
                        <div>
                            <h3 className="font-bold text-gray-900 mb-2">How does Level 2 Passive Earnings work?</h3>
                            <p className="text-sm text-gray-700 mb-3">
                                When someone you referred goes on to refer their own users, you earn <strong>5% of whatever that person earns</strong> from their referrals. This happens automatically and continues for as long as they keep referring — hence lifetime.
                            </p>
                            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                                <p className="text-sm font-semibold text-gray-900 mb-2">Example:</p>
                                <div className="space-y-1.5 text-sm text-gray-700">
                                    <p>1. You refer Alice → she creates a $500 portfolio → you earn $25 (Track 1)</p>
                                    <p>2. Alice refers Bob → Bob creates a $100 portfolio → Alice earns $5 → you earn $0.25 (5% of $5)</p>
                                    <p>3. If Alice refers 100 users at Tier 1, she earns $500 → you earn $25 passively</p>
                                </div>
                            </div>
                        </div>

                        {/* FAQ 4 */}
                        <div>
                            <h3 className="font-bold text-gray-900 mb-2">How do milestone bonuses work?</h3>
                            <p className="text-sm text-gray-700 mb-3">
                                As your total successful direct referrals grow, you unlock one-time bonuses at four key milestones. Each milestone is independent — triggered once when you first cross that threshold.
                            </p>
                            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 space-y-1.5 text-sm text-gray-700">
                                <p>• 10 referrals → $30 bonus</p>
                                <p>• 50 referrals → $150 bonus</p>
                                <p>• 150 referrals → $300 bonus</p>
                                <p>• 250 referrals → $600 bonus</p>
                            </div>
                        </div>

                        {/* FAQ 5 */}
                        <div>
                            <h3 className="font-bold text-gray-900 mb-2">When do I receive my rewards?</h3>
                            <p className="text-sm text-gray-700 mb-3">
                                Earnings are <strong>credited instantly</strong> to your dashboard when a referral creates a qualifying portfolio. You can track everything in real-time.
                            </p>
                            <ul className="space-y-1.5 text-sm text-gray-700">
                                <li>• Real-time notifications when someone registers with your link</li>
                                <li>• Instant credit when they create a qualifying portfolio</li>
                                <li>• Monitor all three reward tracks separately in your dashboard</li>
                                <li>• Milestone bonuses trigger automatically when you cross thresholds</li>
                            </ul>
                        </div>

                        {/* FAQ 6 */}
                        <div>
                            <h3 className="font-bold text-gray-900 mb-2">Are there any limits or restrictions?</h3>
                            <p className="text-sm text-gray-700 mb-3">
                                No caps, no limits, no time restrictions! Our referral program is designed to reward you fairly.
                            </p>
                            <div className="grid grid-cols-2 gap-3 text-sm">
                                <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                                    <p className="font-semibold text-gray-900 mb-2">Allowed:</p>
                                    <ul className="space-y-1 text-gray-700">
                                        <li>• Unlimited referrals</li>
                                        <li>• Unlimited duration</li>
                                        <li>• Share anywhere</li>
                                    </ul>
                                </div>
                                <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                                    <p className="font-semibold text-gray-900 mb-2">Not Allowed:</p>
                                    <ul className="space-y-1 text-gray-700">
                                        <li>• Self-referrals</li>
                                        <li>• Fake accounts</li>
                                        <li>• Spam/misleading</li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </div>

                </div>
            </motion.div>
        </div>
    );
}
