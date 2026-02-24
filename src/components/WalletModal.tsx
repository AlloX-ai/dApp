import { X } from "lucide-react";

interface WalletModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConnect: (wallet: Object) => void;
}

export function WalletModal({ isOpen, onClose, onConnect }: WalletModalProps) {
  if (!isOpen) return null;

  const wallets = [
    {
      name: "MetaMask",
      icon: "https://cdn.allox.ai/allox/wallets/metamaskConnect.svg",
      type: "top",
      walletType: "metamask",
    },
    {
      name: "MetaMask (Solana)",
      icon: "https://cdn.allox.ai/allox/wallets/metamaskConnect.svg",
      type: "top",
      walletType: "solana",
      isSolana: true,
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
      name: "WalletConnect",
      icon: "https://cdn.allox.ai/allox/wallets/walletConnect.svg",
      type: "more",
      walletType: "walletconnect",
    },
  ];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      ></div>

      {/* Modal */}
      <div className="relative glass-card p-8 w-full max-w-md animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold">Connect Wallet</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-black/5 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Wallet Options */}
        <div className="space-y-3">
          {wallets.map((wallet) => (
            <button
              key={wallet.name}
              onClick={() => {
                onConnect(wallet);
                // onClose();
              }}
              className="w-full flex items-center gap-2 p-3 bg-white/60 backdrop-blur-sm border border-gray-200/50 rounded-2xl hover:bg-white/80 hover:border-gray-300 transition-all group"
            >
              <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-2xl border border-gray-200/50 group-hover:scale-110 transition-transform">
                <img src={wallet.icon} alt="" className="h-8 w-8" />
              </div>
              <span className="font-medium">{wallet.name}</span>
            </button>
          ))}
        </div>

        {/* Footer */}
        <p className="text-xs text-center text-gray-500 mt-6">
          By connecting, you agree to our{" "}
          <a
            href="https://allox.ai/terms"
            target="_blank"
            rel="noreferrer"
            className="font-bold underline"
          >
            Terms of Service
          </a>
          {" "}and{" "}
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
