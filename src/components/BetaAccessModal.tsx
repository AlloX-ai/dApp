import { useState } from "react";
import { Link } from "react-router";
import { Check, Wallet } from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import { setWalletModal } from "../redux/slices/walletSlice";
import { shortAddress } from "../hooks/shortAddress";

interface BetaAccessModalProps {
  isOpen?: boolean;
  onUnlock: () => void;
  onClose?: () => void;
  variant?: "modal" | "page";
}

export function BetaAccessModal({
  isOpen = true,
  onUnlock,
  onClose,
  variant = "modal",
}: BetaAccessModalProps) {
  const [betaCode, setBetaCode] = useState("");

  const dispatch = useDispatch();
  const { address, isConnected } = useSelector((state: any) => state.wallet);

  if (!isOpen) return null;

  const handleUnlock = () => {
    if (betaCode && isConnected) {
      onUnlock();
    }
  };

  const canUnlock = betaCode.trim().length > 0 && isConnected;

  const containerClass =
    variant === "page"
      ? "min-h-screen bg-pattern flex flex-col items-center justify-center p-6"
      : "fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex flex-col items-center justify-center p-6";

  return (
    <div className={containerClass} onClick={onClose}>
      <img src={'https://cdn.allox.ai/allox/AlloX-desktop.svg'} alt="" className="h-10 my-4" />
      <div
        className="glass-card max-w-md w-full p-8 relative animate-fade-in"
        onClick={(e) => e.stopPropagation()}
      >

        {/* Title */}
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold mb-3">Early Beta Access</h2>
          <p className="text-sm text-gray-600">
            Enter your beta code and connect your wallet to continue
          </p>
        </div>

        {/* Beta Code Input */}
        <div className="mb-6">
          <label className="block text-sm font-medium mb-3">Beta Code</label>
          <input
            type="text"
            value={betaCode}
            onChange={(e) => setBetaCode(e.target.value.toUpperCase())}
            placeholder="ALLOX-XXXX-XXXX"
            className="w-full px-5 py-4 bg-white/60 border border-gray-200/50 rounded-2xl text-base focus:outline-none focus:ring-2 focus:ring-black/10 focus:bg-white/80 transition-all duration-200"
          />
        </div>

        {/* Wallet Section */}
        <div className="mb-8">
          {!isConnected ? (
            <div className="bg-gray-50/50 border border-gray-200/50 rounded-2xl p-5 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gray-200/50 rounded-full flex items-center justify-center">
                  <Wallet size={22} className="text-gray-500" />
                </div>
                <div>
                  <div className="font-medium text-sm mb-1">No Wallet Connected</div>
                  <div className="text-xs text-gray-600">Required to unlock access</div>
                </div>
              </div>
              <button
                onClick={() => dispatch(setWalletModal(true))}
                className="btn-secondary text-sm px-5 py-2.5 whitespace-nowrap"
              >
                Connect
              </button>
            </div>
          ) : (
            <div className="bg-green-50/50 border border-green-200/50 rounded-2xl p-5 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gradient-to-br from-green-600 to-cyan-600 rounded-full flex items-center justify-center">
                  <Check size={22} className="text-white" />
                </div>
                <div>
                  <div className="font-medium text-sm mb-1">Wallet Connected</div>
                  <div className="text-xs text-gray-600">{shortAddress(address)}</div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Unlock Button */}
        <button
          onClick={handleUnlock}
          disabled={!canUnlock}
          className={`w-full py-4 rounded-2xl font-medium text-base transition-all duration-200 ${canUnlock
            ? "bg-black text-white hover:bg-gray-800 hover:shadow-lg"
            : "bg-gray-200 text-gray-400 cursor-not-allowed"
            }`}
        >
          Unlock Access
        </button>
      </div>

      {/* Apply for Beta Access Link */}
      <div className="mt-6 text-center">
        <Link
          to="https://lorenadev.dyp.finance/beta"
          target="_blank"
          className="text-sm text-gray-600 hover:text-black transition-colors duration-200 underline underline-offset-4"
        >
          Apply for Beta Access
        </Link>
      </div>
    </div>
  );
}
