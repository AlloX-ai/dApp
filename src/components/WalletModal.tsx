import { useState } from "react";
import { X, ChevronLeft } from "lucide-react";

interface WalletModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConnect: (wallet: Object) => void;
}

const META_MASK_WALLET = {
  name: "MetaMask",
  icon: "https://cdn.allox.ai/allox/wallets/metamaskConnect.svg",
  type: "top",
  walletType: "metamask",
};

const WALLETS = [
  META_MASK_WALLET,
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
    name: "WalletConnect",
    icon: "https://cdn.allox.ai/allox/wallets/walletConnect.svg",
    type: "more",
    walletType: "walletconnect",
  },
];

export function WalletModal({ isOpen, onClose, onConnect }: WalletModalProps) {
  const [view, setView] = useState<"list" | "metamask">("list");

  if (!isOpen) return null;

  const handleClose = () => {
    setView("list");
    onClose();
  };

  // Select ecosystem view (MetaMask → EVM or Solana)
  if (view === "metamask") {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        <div
          className="absolute inset-0 bg-black/40 backdrop-blur-sm"
          onClick={handleClose}
        />
        <div className="relative glass-card p-8 w-full max-w-md animate-slide-up">
          <div className="flex items-center justify-between mb-6">
            <button
              onClick={() => setView("list")}
              className="p-2 -ml-2 hover:bg-black/5 rounded-lg transition-colors flex items-center gap-1"
              aria-label="Back"
            >
              <ChevronLeft size={24} />
            </button>
            <h2 className="text-lg font-bold absolute left-1/2 -translate-x-1/2">
              Select ecosystem
            </h2>
            <button
              onClick={handleClose}
              className="p-2 hover:bg-black/5 rounded-lg transition-colors"
              aria-label="Close"
            >
              <X size={20} />
            </button>
          </div>

          <div className="flex flex-col items-center pt-4 pb-2">
            <div className="w-20 h-20 rounded-2xl bg-white border border-gray-200/50 flex items-center justify-center mb-6">
              <img
                src={META_MASK_WALLET.icon}
                alt="MetaMask"
                className="h-12 w-12 object-contain"
              />
            </div>
            <p className="text-sm text-gray-600 text-center mb-6 max-w-[280px]">
              MetaMask supports multiple network types. Please select the one
              you&apos;d like to use.
            </p>
          </div>

          <div className="space-y-3">
            <button
              onClick={() => onConnect(META_MASK_WALLET)}
              className="w-full flex items-center gap-3 p-4 bg-white/70 backdrop-blur-sm border border-gray-200/50 rounded-2xl hover:bg-white/90 hover:border-gray-300 transition-all text-left"
            >
              <img
                src="https://cdn.allox.ai/allox/networks/eth.svg"
                alt=""
                className="h-8 w-8 shrink-0"
              />
              <div className="flex-1">
                <span className="font-medium block">EVM</span>
                <span className="text-xs text-gray-500">
                  Ethereum, BNB, Base
                </span>
              </div>
            </button>
            <button
              onClick={() =>
                onConnect({
                  ...META_MASK_WALLET,
                  name: "MetaMask (Solana)",
                  walletType: "solana",
                  isSolana: true,
                })
              }
              className="w-full flex items-center gap-3 p-4 bg-white/70 backdrop-blur-sm border border-gray-200/50 rounded-2xl hover:bg-white/90 hover:border-gray-300 transition-all text-left"
            >
              <img
                src="https://cdn.allox.ai/allox/networks/solana.svg"
                alt=""
                className="h-8 w-8 shrink-0"
              />
              <div className="flex-1">
                <span className="font-medium block">Solana</span>
                <span className="text-xs text-gray-500">
                  MetaMask Solana Snap
                </span>
              </div>
            </button>
          </div>

          <p className="text-xs text-center text-gray-500 mt-6">
            By connecting, you agree to our{" "}
            <a
              href="https://allox.ai/terms"
              target="_blank"
              rel="noreferrer"
              className="font-bold underline"
            >
              Terms of Service
            </a>{" "}
            and{" "}
            <a
              href="https://allox.ai/privacy"
              target="_blank"
              rel="noreferrer"
              className="font-bold underline"
            >
              Privacy Policy
            </a>
          </p>
        </div>
      </div>
    );
  }

  // Wallet list view
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={handleClose}
      />
      <div className="relative glass-card p-8 w-full max-w-md animate-slide-up">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold">Connect Wallet</h2>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-black/5 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="space-y-3">
          {WALLETS.map((wallet) => {
            const isMetaMask = wallet.walletType === "metamask";
            return (
              <button
                key={wallet.name}
                onClick={() => {
                  if (isMetaMask) {
                    setView("metamask");
                  } else {
                    onConnect(wallet);
                  }
                }}
                className="w-full flex items-center gap-3 p-3 bg-white/60 backdrop-blur-sm border border-gray-200/50 rounded-2xl hover:bg-white/80 hover:border-gray-300 transition-all group text-left"
              >
                <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center border border-gray-200/50 group-hover:scale-105 transition-transform shrink-0">
                  <img src={wallet.icon} alt="" className="h-8 w-8" />
                </div>
                <span className="font-medium">{wallet.name}</span>
                {isMetaMask && (
                  <span className="ml-auto text-gray-400 text-sm">▸</span>
                )}
              </button>
            );
          })}
        </div>

        <p className="text-xs text-center text-gray-500 mt-6">
          By connecting, you agree to our{" "}
          <a
            href="https://allox.ai/terms"
            target="_blank"
            rel="noreferrer"
            className="font-bold underline"
          >
            Terms of Service
          </a>{" "}
          and{" "}
          <a
            href="https://allox.ai/privacy"
            target="_blank"
            rel="noreferrer"
            className="font-bold underline"
          >
            Privacy Policy
          </a>
        </p>
      </div>
    </div>
  );
}
