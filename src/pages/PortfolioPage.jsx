import { useState } from "react";
import { ChevronDown, Wallet } from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import OutsideClickHandler from "react-outside-click-handler";
import { setWalletModal } from "../redux/slices/walletSlice";
import aero from "../assets/tokens/aero.svg";
import arb from "../assets/tokens/arb.svg";
import lido from "../assets/tokens/lido.svg";
import prime from "../assets/tokens/prime.svg";
import virtual from "../assets/tokens/virtual.svg";

export function PortfolioPage() {
  const dispatch = useDispatch();
  const isConnected = useSelector((state) => state.wallet.isConnected);
  const [chainFilter, setChainFilter] = useState("base");
  const [isChainFilterOpen, setIsChainFilterOpen] = useState(false);

  const chainOptions = [
    { value: "all", label: "All Chains", icon: "🌐" },
    { value: "ethereum", label: "Ethereum", icon: "💎" },
    { value: "bnb", label: "BNB Chain", icon: "🟡" },
    { value: "opbnb", label: "opBNB", icon: "🟠" },
    { value: "base", label: "Base", icon: "🔵" },
  ];
  const selectedChain =
    chainOptions.find((option) => option.value === chainFilter) ??
    chainOptions[0];

  const portfolio = {
    pnl24h: 324.18,
    pnlPercent: 2.59,
    tokens: [
      {
        symbol: "AERO",
        name: "Aerodrome",
        amount: 1200,
        chain: "base",
        value: 1848.0,
        change: 12.4,
        color: "from-purple-400 to-purple-600",
        icon: aero,
      },
      {
        symbol: "VIRTUAL",
        name: "Virtual Protocol",
        amount: 850,
        chain: "base",
        value: 1469.82,
        change: -3.1,
        color: "from-red-400 to-red-600",
        icon: virtual,
      },
      {
        symbol: "DAI",
        name: "Dai",
        amount: 80,
        chain: "base",
        value: 0.1,
        change: 10,
        color: "from-orange-400 to-orange-600",
      },
    ],
  };
  const tokensWithBalance = portfolio.tokens.filter(
    (token) => token.amount > 0,
  );
  const filteredTokens =
    chainFilter === "all"
      ? tokensWithBalance
      : tokensWithBalance.filter((token) => token.chain === chainFilter);
  const totalBalance = tokensWithBalance.reduce(
    (sum, token) => sum + token.value,
    0,
  );
  const formatAmount = (amount) =>
    `${new Intl.NumberFormat("en-US", {
      maximumFractionDigits: 6,
    }).format(amount)} `;

  return (
    <div className="flex-1 px-6 py-8 max-w-[1200px] mx-auto w-full overflow-y-auto">
      <h2 className="text-3xl font-bold mb-6">Portfolio</h2>

      {isConnected ? (
        <>
          <div className="bg-white p-8 mb-6 transition-all duration-200">
            <div className="text-sm text-gray-500 mb-2">Total Balance</div>
            <div className="text-5xl font-bold mb-3">
              $
              {totalBalance.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </div>
            <div
              className={`text-lg ${
                portfolio.pnl24h >= 0 ? "text-green-600" : "text-red-600"
              }`}
            >
              {portfolio.pnl24h >= 0 ? "+" : ""}
              {portfolio.pnlPercent}% (${portfolio.pnl24h.toFixed(2)}) 24h
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
            <h3 className="text-xl font-bold">Assets</h3>
            {/* <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">Chain</span>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsChainFilterOpen((prev) => !prev)}
                  className="glass-card px-4 py-2.5 flex items-center gap-3 hover:bg-white/80 transition-colors"
                >
                  <span className="text-lg">{selectedChain.icon}</span>
                  <span className="font-medium text-sm">
                    {selectedChain.label}
                  </span>
                  <ChevronDown
                    size={16}
                    className={`transition-transform ${
                      isChainFilterOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>
                {isChainFilterOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-10"
                      onClick={() => setIsChainFilterOpen(false)}
                    ></div>
                    <div className="absolute top-full right-0 mt-2 bg-white border border-gray-200 rounded-xl p-2 min-w-[200px] z-20 animate-fade-in">
                      <OutsideClickHandler
                        onOutsideClick={() => setIsChainFilterOpen(false)}
                      >
                        {chainOptions.map((option) => (
                          <button
                            key={option.value}
                            type="button"
                            onClick={() => {
                              setChainFilter(option.value);
                              setIsChainFilterOpen(false);
                            }}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm transition-colors ${
                              selectedChain.value === option.value
                                ? "bg-black text-white font-medium"
                                : "hover:bg-black/5"
                            }`}
                          >
                            <span className="text-lg">{option.icon}</span>
                            <span>{option.label}</span>
                          </button>
                        ))}
                      </OutsideClickHandler>
                    </div>
                  </>
                )}
              </div>
            </div> */}
          </div>
          {filteredTokens.length === 0 ? (
            <div className="glass-card p-8 text-center text-gray-500">
              No assets found for this chain.
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-4">
              {filteredTokens.map((token) => (
                <div
                  key={`${token.chain}-${token.symbol}`}
                  className="glass-card p-6 transition-all duration-200 hover:bg-white/80 hover:shadow-lg hover:border hover:border-gray-200/50 cursor-pointer"
                >
                  <div className="flex items-center gap-4 mb-4">
                    
                    <img src={token.icon ?? prime} alt='' className="w-14 h-14" />
                    <div className="flex-1">
                      <div className="font-bold text-lg">{token.symbol}</div>
                      <div className="text-sm text-gray-500">{token.name}</div>
                    </div>
                    <span className="text-xs uppercase tracking-wide text-gray-500 bg-white/70 border border-gray-200/60 px-2 py-1 rounded-full">
                      {token.chain}
                    </span>
                  </div>
                  <div className="flex justify-between items-end">
                    <div>
                      <div className="text-sm text-gray-500 mb-1">Amount</div>
                      <div className="font-medium">
                        {formatAmount(token.amount)}
                        {token.symbol}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xl font-bold">
                        ${token.value.toFixed(2)}
                      </div>
                      <div
                        className={`text-sm ${
                          token.change >= 0 ? "text-green-600" : "text-red-600"
                        }`}
                      >
                        {token.change >= 0 ? "+" : ""}
                        {token.change}%
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      ) : (
        <div className="glass-card p-12 text-center">
          <div className="w-20 h-20 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <Wallet size={40} className="text-gray-400" />
          </div>
          <h3 className="text-xl font-bold mb-3">Connect Your Wallet</h3>
          <p className="text-gray-600 mb-6">
            Connect your wallet to view your portfolio
          </p>
          <button
            onClick={() => dispatch(setWalletModal(true))}
            className="btn-primary text-lg px-8 py-4 transition-all duration-200 hover:shadow-xl"
          >
            <Wallet size={20} className="mr-2" />
            Connect Wallet
          </button>
        </div>
      )}
    </div>
  );
}
