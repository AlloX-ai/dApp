import { X } from "lucide-react";
import { Link } from "react-router";

interface PortfolioTutorialModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function PortfolioTutorialModal({ isOpen, onClose }: PortfolioTutorialModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-white/90 backdrop-blur-xl rounded-2xl shadow-2xl max-w-lg w-full border border-white/20">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200/50">
          <div>
            <h3 className="text-2xl font-bold text-gray-900">How to Build Your Portfolio</h3>
            <p className="text-sm text-gray-600 mt-1">Complete in 3 simple steps</p>
          </div>
          <button
            className="text-gray-500 hover:text-gray-700 transition-colors"
            onClick={onClose}
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Step 1 */}
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0 shadow-lg">
              <span className="text-white font-bold text-lg">1</span>
            </div>
            <div className="flex-1">
              <h4 className="font-bold text-gray-900 mb-1">Build Your Portfolio</h4>
              <p className="text-gray-600 text-sm leading-relaxed">
                Choose your blockchain, portfolio type (Gaming, Metaverse, RWA, etc.), investment amount ($100-$1000), and risk tolerance level.
              </p>
            </div>
          </div>

          {/* Step 2 */}
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center flex-shrink-0 shadow-lg">
              <span className="text-white font-bold text-lg">2</span>
            </div>
            <div className="flex-1">
              <h4 className="font-bold text-gray-900 mb-1">Choose Payment Token</h4>
              <p className="text-gray-600 text-sm leading-relaxed">
                Select which token to use for funding your portfolio: BNB, USDT, or USDC from your connected wallet.
              </p>
            </div>
          </div>

          {/* Step 3 */}
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center flex-shrink-0 shadow-lg">
              <span className="text-white font-bold text-lg">3</span>
            </div>
            <div className="flex-1">
              <h4 className="font-bold text-gray-900 mb-1">Confirm & Execute</h4>
              <p className="text-gray-600 text-sm leading-relaxed">
                Review your AI-generated portfolio allocation, approve the transactions in your wallet, and your diversified portfolio is created on-chain.
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-center p-6 border-t border-gray-200/50 bg-gray-50/50">
          <Link
            to={"/"}
className="px-8 py-3 rounded-xl font-semibold bg-black text-white hover:bg-black/80 transition-all "
          >
            Build My Portfolio
          </Link>
        </div>
      </div>
    </div>
  );
}
