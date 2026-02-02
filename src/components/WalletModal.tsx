import { X } from 'lucide-react';

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
    icon: "https://cdn.worldofdypians.com/wod/metamaskConnect.svg",
    type: "top",
    walletType: "metamask",
  },
  {
    name: "Binance Wallet",
    icon: "https://cdn.worldofdypians.com/wod/binanceWalletUpdated.svg",
    type: "top",
    connectorName: "Binance Wallet",
    chainId: 56, // BSC chainId
    walletType: "binance",
  },
  {
    name: "OKX Wallet",
    icon: "https://cdn.worldofdypians.com/wod/okxConnect.svg",
    type: "top",
    walletType: "okx",
  },
  {
    name: "Trust Wallet",
    icon: "https://cdn.worldofdypians.com/wod/trustWalletLogo.svg",
    type: "top",
    walletType: "trust",
  },
  //   {
  //   name: "Gate wallet",
  //   icon: "https://cdn.worldofdypians.com/wod/gateBuyWod.svg",
  //   type: "more",
  //   walletType: "gate",
  // },
  // {
  //   name: "Coinbase",
  //   icon: "https://cdn.worldofdypians.com/wod/coinbaseConnect.svg",
  //   type: "more",
  //   walletType: "coinbase",
  // },
  // {
  //   name: "Coin98",
  //   icon: "https://cdn.worldofdypians.com/wod/coin98Connect.svg",
  //   type: "more",
  //   walletType: "coin98",
  // },
  // {
  //   name: "SafePal",
  //   icon: "https://cdn.worldofdypians.com/wod/safepalConnect.svg",
  //   type: "more",
  //   walletType: "safepal",
  // },
  {
    name: "WalletConnect",
    icon: "https://cdn.worldofdypians.com/wod/walletConnect.svg",
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
                <img src={ wallet.icon} alt='' className='h-8 w-8'/>
              </div>
              <span className="font-medium">{wallet.name}</span>
            </button>
          ))}
        </div>

        {/* Footer */}
        <p className="text-xs text-center text-gray-500 mt-6">
          By connecting, you agree to our Terms of Service and Privacy Policy
        </p>
      </div>
    </div>
  );
}
