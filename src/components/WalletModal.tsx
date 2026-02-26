import { useSelector } from "react-redux";
import { X, Check, Loader2 } from "lucide-react";
import { shortAddress } from "../hooks/shortAddress";

interface WalletModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConnect: (wallet: { name: string; icon: string; walletType: string }) => void;
  /**
   * Optional: when provided, the modal will show a
   * “Sign to continue” button after the wallet is connected.
   */
  onSign?: () => void;
  /**
   * Optional: controls the “Please sign in your wallet” loading state.
   * Mirror of BetaAccessModal `isSigning`.
   */
  isSigning?: boolean;
}


const WALLETS = [

  {
    name: "MetaMask",
    icon: "https://cdn.allox.ai/allox/wallets/metamaskConnect.svg",
    type: "top",
    walletType: "metamask",
  },
  {
    name: "Binance Wallet",
    icon: "https://cdn.allox.ai/allox/wallets/binanceWallet.svg",
    type: "top",
    walletType: "binance",
  },
  {
    name: "OKX",
    icon: "https://cdn.allox.ai/allox/wallets/okxConnect.svg",
    type: "top",
    walletType: "okx",
  },
  {
    name: "Trust",
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

const SUGGESTED_WALLET_TYPES = ["binance", "metamask"];

function getSuggestedWallets() {
  return SUGGESTED_WALLET_TYPES
    .map((type) => WALLETS.find((w) => w.walletType === type))
    .filter(Boolean) as typeof WALLETS;
}

function getOtherWallets() {
  return WALLETS.filter((w) => !SUGGESTED_WALLET_TYPES.includes(w.walletType));
}

export function WalletModal({
  isOpen,
  onClose,
  onConnect,
  onSign,
  isSigning = false,
}: WalletModalProps) {
  const { address, isConnected } = useSelector(
    (state: any) => state.wallet,
  );

  if (!isOpen) return null;

  const handleWalletClick = (wallet: (typeof WALLETS)[number]) => {
    onConnect(wallet);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="relative glass-card p-8 w-full max-w-md animate-slide-up">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold">Connect Wallet</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-black/5 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="mb-6">
          {isSigning ? (
            <div className="flex flex-col items-center justify-center py-10 gap-4">
              <Loader2 className="w-10 h-10 animate-spin text-gray-400" />
              <p className="text-sm font-medium text-gray-700 text-center">
                Please sign the message in your wallet
              </p>
            </div>
          ) : !isConnected ? (
            <div className="space-y-5">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-3">Suggested wallets</p>
                <div className="space-y-3">
                  {getSuggestedWallets().map((wallet) => (
                    <button
                      key={wallet.name}
                      type="button"
                      onClick={() => handleWalletClick(wallet)}
                      className="w-full flex items-center gap-4 p-2 bg-white/60 border border-gray-200/50 rounded-2xl hover:bg-white/80 hover:border-gray-300 transition-all text-left"
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
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600 mb-3">Other wallets</p>
                <div className="space-y-3 grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {getOtherWallets().map((wallet) => (
                    <button
                      key={wallet.name}
                      type="button"
                      onClick={() => handleWalletClick(wallet)}
                      className="w-full flex flex-col items-center gap-2 p-2 bg-white/60 border border-gray-200/50 rounded-2xl hover:bg-white/80 hover:border-gray-300 transition-all text-left"
                    >
                      <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center border border-gray-200/50 overflow-hidden">
                        <img
                          src={wallet.icon}
                          alt=""
                          className="h-8 w-8 object-contain"
                        />
                      </div>
                      <span className="font-xs">{wallet.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-green-50/50 border border-green-200/50 rounded-2xl p-5 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gradient-to-br from-green-600 to-cyan-600 rounded-full flex items-center justify-center">
                  <Check size={22} className="text-white" />
                </div>
                <div>
                  <div className="font-medium text-sm mb-1">
                    Wallet connected
                  </div>
                  <div className="text-xs text-gray-600">
                    {shortAddress(address)}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {isConnected && !isSigning && onSign && (
          <button
            onClick={onSign}
            className="w-full py-4 rounded-2xl font-medium text-base transition-all duration-200 bg-black text-white hover:bg-gray-800 hover:shadow-lg flex items-center justify-center gap-2"
          >
            Sign to continue
          </button>
        )}

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
