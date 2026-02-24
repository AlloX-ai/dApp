import { useState } from "react";
import { Check, Loader2, Gift } from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import { setWalletModal } from "../redux/slices/walletSlice";
import { shortAddress } from "../hooks/shortAddress";

interface BetaAccessModalProps {
  isOpen?: boolean;
  onUnlock: () => void | Promise<void>;
  onClose?: () => void;
  variant?: "modal" | "page";
  onWalletConnect?: (wallet: { name: string; icon: string; walletType: string }) => void;
  isSigning?: boolean;
}

const WALLET_OPTIONS = [

  {
    name: "MetaMask",
    icon: "https://cdn.allox.ai/allox/wallets/metamaskConnect.svg",
    type: "top",
    walletType: "metamask",
  },
  {
    name: "OKX Wallet",
    icon: "https://cdn.allox.ai/allox/wallets/okxConnect.svg",
    type: "top",
    walletType: "okx",
  },
  {
    name: "Trust Wallet",
    icon: "https://cdn.allox.ai/allox/wallets/trustWalletLogo.svg",
    type: "top",
    walletType: "trust",
  },
  {
    name: "Phantom",
    icon: "https://cdn.allox.ai/allox/wallets/phantom.svg",
    type: "top",
    walletType: "phantom",
    isPhantom: true,
  },
  {
    name: "WalletConnect",
    icon: "https://cdn.allox.ai/allox/wallets/walletConnect.svg",
    type: "more",
    walletType: "walletconnect",
  },
];

export function BetaAccessModal({
  isOpen = true,
  onUnlock,
  onClose,
  variant = "modal",
  onWalletConnect,
  isSigning = false,
}: BetaAccessModalProps) {
  const dispatch = useDispatch();
  const { address, isConnected } = useSelector((state: any) => state.wallet);

  const handleWalletOptionClick = (wallet: (typeof WALLET_OPTIONS)[0]) => {
    if (onWalletConnect) {
      onWalletConnect(wallet);
    } else {
      dispatch(setWalletModal(true));
    }
  };

  if (!isOpen) return null;

  const containerClass =
    variant === "page"
      ? "min-h-screen bg-pattern flex flex-col items-center justify-center p-6"
      : "fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex flex-col items-center justify-center p-6";

  return (
    <div className={containerClass} onClick={onClose}>
      <img
        src={"https://cdn.allox.ai/allox/AlloX-desktop.svg"}
        alt=""
        className="h-10 my-4"
      />
      <div className="mb-4 w-full max-w-md rounded-2xl bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 p-4 ">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 bg-white/20 backdrop-blur-xl rounded-2xl flex items-center justify-center flex-shrink-0">
            <Gift size={20} className="text-white" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-white mb-1">
              Welcome Bonus
            </p>
            <p className="text-xs text-white">
              Claim your 5,000 Free Points
            </p>
          </div>

        </div>
      </div>
      <div
        className="glass-card max-w-md w-full p-4 sm:p-8 relative animate-fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold mb-3">Log in to AlloX</h2>
        </div>

        <div className="mb-0 sm:mb-8">
          {isSigning ? (
            <div className="flex flex-col items-center justify-center py-12 gap-4">
              <Loader2 className="w-14 h-14 animate-spin text-gray-400" />
              <p className="text-sm font-medium text-gray-600">
                Please sign the message in your wallet
              </p>

            </div>
          ) : !isConnected ? (
            <div className="space-y-3">
              {WALLET_OPTIONS.map((wallet) => (
                <button
                  key={wallet.name}
                  type="button"
                  onClick={() => handleWalletOptionClick(wallet)}
                  className="w-full flex items-center gap-4 p-4 bg-white/60 border border-gray-200/50 rounded-2xl hover:bg-white/80 hover:border-gray-300 transition-all text-left"
                >
                  <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center border border-gray-200/50 overflow-hidden">
                    <img
                      src={wallet.icon}
                      alt=""
                      className="h-8 w-8 object-contain"
                    />
                  </div>
                  <span className="font-medium">{wallet.name}</span>
                </button>
              ))}
            </div>
          ) : (
            <div className="bg-green-50/50 border border-green-200/50 rounded-2xl p-5 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gradient-to-br from-green-600 to-cyan-600 rounded-full flex items-center justify-center">
                  <Check size={22} className="text-white" />
                </div>
                <div>
                  <div className="font-medium text-sm mb-1">Wallet Connected</div>
                  <div className="text-xs text-gray-600">
                    {shortAddress(address)}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {isConnected && !isSigning && (
          <button
            onClick={onUnlock}
            className="w-full py-4 rounded-2xl font-medium text-base transition-all duration-200 bg-black text-white hover:bg-gray-800 hover:shadow-lg flex items-center justify-center gap-2"
          >
            Sign to continue
          </button>
        )}
      </div>
    </div>
  );
}
