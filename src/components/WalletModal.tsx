import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { Check, Loader2, X, ChevronLeft } from "lucide-react";
import { shortAddress } from "../hooks/shortAddress";

interface WalletModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConnect: (wallet: { name: string; icon: string; walletType: string }) => void;
  onSign?: () => void | Promise<void>;
  isSigning?: boolean;
  signingMessage?: string;
  onPrivySignIn?: () => void;
  privyReady?: boolean;
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
    name: "Gate",
    icon: "https://cdn.allox.ai/allox/wallets/gateWallet.svg",
    type: "top",
    walletType: "gate",
  },
  {
    name: "Phantom",
    icon: "https://cdn.allox.ai/allox/wallets/phantom.svg",
    type: "top",
    walletType: "phantom",
  },
  {
    name: "WalletConnect",
    icon: "https://cdn.allox.ai/allox/wallets/walletConnect.svg",
    type: "more",
    walletType: "walletconnect",
  },
];

export function WalletModal({
  isOpen,
  onClose,
  onConnect,
  onSign,
  isSigning = false,
  signingMessage = "Please sign the message in your wallet",
  onPrivySignIn,
  privyReady = true,
}: WalletModalProps) {
  const { address, isConnected } = useSelector((state: any) => state.wallet);
  const [view, setView] = useState<"list" | "metamask">("list");

  useEffect(() => {
    if (!isConnected) setView("list");
  }, [isConnected]);

  if (!isOpen) return null;

  const handleClose = () => {
    setView("list");
    onClose();
  };

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex flex-col items-center justify-center p-6"
    // onClick={handleClose}
    >
      {/* <img
        src={"https://cdn.allox.ai/allox/AlloX-desktop.svg"}
        alt=""
        className="h-10 my-4"
      /> */}
      {/* <div className="mb-4 w-full max-w-md rounded-2xl bg-gradient-to-br from-yellow-400 via-orange-500 to-amber-600 p-4">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 bg-white/20 backdrop-blur-xl rounded-2xl flex items-center justify-center flex-shrink-0">
            <Gift size={20} className="text-white" />
          </div>
          <div className="flex-1">
            <p className="text-md font-bold text-white mb-1">Welcome Bonus</p>
            <p className="text-xs text-white">Claim your 5,000 Free Points</p>
          </div>
        </div>
      </div> */}
      <div
        className="glass-card max-w-md w-full p-4 sm:p-6 relative animate-fade-in max-h-[80vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold">Log In</h2>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-black/5 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {isSigning ? (
          <div className="flex flex-col items-center justify-center py-12 gap-4">
            <Loader2 className="w-14 h-14 animate-spin text-gray-400" />
            <p className="text-sm font-medium text-gray-600">{signingMessage}</p>
          </div>
        ) : !isConnected ? (
          view === "metamask" ? (
            <div className="space-y-4">
              <div className="relative flex items-center justify-between mb-4">
                <button
                  type="button"
                  onClick={() => setView("list")}
                  className="p-2 -ml-2 hover:bg-black/5 rounded-lg transition-colors flex items-center gap-1"
                  aria-label="Back"
                >
                  <ChevronLeft size={24} />
                </button>
                <h3 className="text-lg font-bold absolute left-1/2 -translate-x-1/2">
                  Select ecosystem
                </h3>
                <div className="w-10" />
              </div>
              <div className="flex flex-col items-center pt-2 pb-2">
                <div className="w-16 h-16 rounded-2xl bg-white border border-gray-200/50 flex items-center justify-center mb-4">
                  <img
                    src={META_MASK_WALLET.icon}
                    alt="MetaMask"
                    className="h-10 w-10 object-contain"
                  />
                </div>
                <p className="text-sm text-gray-600 text-center mb-4">
                  MetaMask supports multiple network types. Please select the
                  one you&apos;d like to use.
                </p>
              </div>
              <div className="space-y-3">
                <button
                  type="button"
                  onClick={() => onConnect(META_MASK_WALLET)}
                  className="w-full flex items-center gap-3 p-4 bg-white/70 border border-gray-200/50 rounded-2xl hover:bg-white/90 hover:border-gray-300 transition-all text-left"
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
                  type="button"
                  onClick={() =>
                    onConnect({
                      ...META_MASK_WALLET,
                      name: "MetaMask (Solana)",
                      walletType: "solana",
                      isSolana: true,
                    } as any)
                  }
                  className="w-full flex items-center gap-3 p-4 bg-white/70 border border-gray-200/50 rounded-2xl hover:bg-white/90 hover:border-gray-300 transition-all text-left"
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
            </div>
          ) : (
            <div className="space-y-3">
              {onPrivySignIn && (
                <div>
                  <button
                    type="button"
                    onClick={onPrivySignIn}
                    disabled={!privyReady}
                    className="w-full py-3.5 rounded-2xl font-medium text-base transition-all duration-200 bg-gradient-to-r from-violet-600 to-indigo-600 text-white hover:from-violet-500 hover:to-indigo-500 disabled:opacity-50 disabled:pointer-events-none shadow-md"
                  >
                    Continue with email
                  </button>
                  <p className="text-xs text-center text-gray-500 mt-2">
                    A wallet will be created for you automatically
                  </p>
                  <div className="relative my-5">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t border-gray-200/80" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase tracking-wide">
                      <span className="bg-white/80 px-3 text-gray-500">
                        Or use a wallet
                      </span>
                    </div>
                  </div>
                </div>
              )}
              <p className="text-sm font-medium text-gray-600 mb-3">
                Suggested wallets
              </p>
              {WALLETS.slice(0, 2).map((wallet) => {
                const isMetaMask = wallet.walletType === "metamask";
                return (
                  <button
                    key={wallet.name}
                    type="button"
                    onClick={() => {
                      if (isMetaMask) {
                        setView("metamask");
                      } else {
                        onConnect(wallet);
                      }
                    }}
                    className="w-full flex items-center gap-4 p-2 bg-white/60 border border-gray-200/50 rounded-2xl hover:bg-white/80 hover:border-gray-300 transition-all text-left"
                  >
                    <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center border border-gray-200/50 overflow-hidden">
                      <img
                        src={wallet.icon}
                        alt=""
                        className="h-8 w-8 object-contain"
                      />
                    </div>
                    <div className="flex items-center gap-4 w-100 justify-between">
                      <span className="text-xs">{wallet.name}</span>
                      {isMetaMask && (
                        <span className="text-gray-400 text-sm">▸</span>
                      )}
                    </div>
                  </button>
                );
              })}
              <p className="text-sm font-medium text-gray-600 mb-3">
                Other wallets
              </p>
              <div className="space-y-3 grid grid-cols-2 sm:grid-cols-3 gap-2">
                {WALLETS.slice(2, 7).map((wallet) => (
                  <button
                    key={wallet.name}
                    type="button"
                    onClick={() => onConnect(wallet)}
                    className="w-full flex flex-col items-center mb-0 gap-4 p-2 bg-white/60 border border-gray-200/50 rounded-2xl hover:bg-white/80 hover:border-gray-300 transition-all text-left"
                  >
                    <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center border border-gray-200/50 overflow-hidden">
                      <img
                        src={wallet.icon}
                        alt=""
                        className="h-8 w-8 object-contain"
                      />
                    </div>
                    <span className="text-xs">{wallet.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )
        ) : (
          <div className="bg-green-50/50 border border-green-200/50 rounded-2xl p-5 flex items-center justify-between mb-4">
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

        {isConnected && !isSigning && onSign && (
          <button
            type="button"
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
