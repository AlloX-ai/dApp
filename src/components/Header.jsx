import { Wallet, LogOut } from "lucide-react";
import { NetworkSelector } from "./NetworkSelector";
import { shortAddress } from "../hooks/shortAddress";

export function Header({
  isConnected,
  coinbase,
  onConnectClick,
  onDisconnectClick,
}) {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 px-6 py-4 bg-pattern/95 backdrop-blur-lg border-b border-gray-200/50">
      <div className="max-w-[1600px] mx-auto flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center">
            <div className="w-4 h-4 border-2 border-white rounded-full"></div>
          </div>
          <span className="font-bold text-xl tracking-tight hidden md:inline">
            AlloX
          </span>
        </div>

        <div className="flex items-center gap-4">
          {isConnected && <NetworkSelector />}

          {isConnected ? (
            <div className="glass-card px-4 py-2.5 flex items-center gap-3 transition-all duration-200 hover:shadow-md">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full"></div>
              <div className="hidden md:flex items-center gap-2">
                <span className="text-sm font-medium flex items-center">
                  {shortAddress(coinbase)}
                </span>
                <button
                  className="w-12 h-8 bg-black rounded-xl flex items-center justify-center"
                  onClick={onDisconnectClick}
                >
                  <LogOut className="text-white" />
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={onConnectClick}
              className="btn-primary transition-all duration-200 hover:shadow-lg"
            >
              <Wallet size={18} className="md:mr-2" />
              <span className="hidden md:inline">Connect Wallet</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
