import { HelpCircle, X } from "lucide-react";
import { motion } from "motion/react";

const JOURNEY_INFO = [
    {
        question: "Which blockchain would you like to build on?",
        answer:
            "BNB Chain is the only option with on-chain execution, which means real swaps with real tokens and real value. Ethereum, Base, and Solana currently run as paper trading only, so they simulate portfolio performance without sending live transactions.",
    },
    {
        question: "What type of portfolio interests you?",
        answer:
            "Diversified combines multiple narratives in one basket (DeFi, Layer 2, Privacy, Infrastructure, SocialFi, Payments, AI, Gaming, DePIN, and Memecoins). If you choose a single narrative, token selection focuses more heavily on that theme.",
    },
    {
        question: "How much would you like to invest?",
        answer:
            "Your total amount is split across the suggested tokens, usually in equal USD allocations at the start. A higher investment can improve practical execution because very small swaps may have fewer routing options.",
    },
    {
        question: "What's your risk tolerance?",
        answer:
            "Risk controls token profile: Conservative leans toward larger, more established assets; Balanced mixes large and mid caps; Aggressive adds more volatile opportunities with higher upside and higher drawdown risk.",
    },
    {
        question: "What does the preview table mean?",
        answer:
            "Allocation shows how much USD is planned per token, Quantity is estimated token amount at current pricing, and Price is the reference market price used to build the proposal.",
    },
    {
        question: "What does the quote table mean before execution?",
        answer:
            "You'll receive is the estimated token output, Value compares quote quality to the target allocation, Impact reflects estimated price impact, and Slippage is the allowed execution tolerance for that swap.",
    },
    {
        question: "What happens during execution and failures?",
        answer:
            "Swaps are executed token by token. If a transaction fails or is cancelled, you can retry that token or skip it and continue with the remaining portfolio so one issue does not block the full journey.",
    },
];

export default function ChatMoreInfoModal({
    isOpen,
    onClose,
}: {
    isOpen: boolean;
    onClose: () => void;
}) {
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
                <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
                    <div>
                        <h3 className="text-2xl font-bold">Quick Portfolio Guide</h3>
                        <p className="text-sm text-gray-600 mt-1">
                            Understand each step before you generate and execute
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-10 h-10 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center transition-colors"
                    >
                        <X size={20} className="text-gray-600" />
                    </button>
                </div>

                <div className="p-6 overflow-y-auto max-h-[calc(80vh-88px)]">
                    <div className="space-y-4">
                        {JOURNEY_INFO.map((item) => (
                            <div key={item.question} className="border-b border-gray-200 p-4">
                                <div className="flex items-start gap-2 mb-2">
                                    <HelpCircle size={18} className="text-blue-600 mt-0.5" />
                                    <h4 className="font-semibold text-gray-900">{item.question}</h4>
                                </div>
                                <div className="bg-gradient-to-br from-gray-50/80 to-gray-100/80 rounded-xl p-4 border border-gray-200/50 ml-4">
                                    <p className="text-sm text-gray-700 leading-relaxed">
                                        {item.answer}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </motion.div>
        </div>
    );
}
