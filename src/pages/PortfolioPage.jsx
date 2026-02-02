import { Wallet } from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import { setWalletModal } from "../redux/slices/walletSlice";

export function PortfolioPage() {
  const dispatch = useDispatch();
  const isConnected = useSelector((state) => state.wallet.isConnected);

  const portfolio = {
    totalBalance: 12847.32,
    pnl24h: 324.18,
    pnlPercent: 2.59,
    tokens: [
      {
        symbol: "ETH",
        name: "Ethereum",
        amount: "2.45 ETH",
        value: 4289.5,
        change: 5.2,
        color: "from-blue-400 to-blue-600",
      },
      {
        symbol: "USDC",
        name: "USD Coin",
        amount: "5,240 USDC",
        value: 5240.0,
        change: 0.0,
        color: "from-green-400 to-green-600",
      },
      {
        symbol: "AERO",
        name: "Aerodrome",
        amount: "1,200 AERO",
        value: 1848.0,
        change: 12.4,
        color: "from-purple-400 to-purple-600",
      },
      {
        symbol: "VIRTUAL",
        name: "Virtual Protocol",
        amount: "850 VIRTUAL",
        value: 1469.82,
        change: -3.1,
        color: "from-red-400 to-red-600",
      },
    ],
  };

  return (
    <div className="flex-1 px-6 py-8 max-w-[1200px] mx-auto w-full overflow-y-auto">
      <h2 className="text-3xl font-bold mb-6">Portfolio</h2>

      {isConnected ? (
        <>
          <div className="glass-card p-8 mb-6 transition-all duration-200 hover:shadow-lg">
            <div className="text-sm text-gray-500 mb-2">Total Balance</div>
            <div className="text-5xl font-bold mb-3">
              ${portfolio.totalBalance.toLocaleString()}
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

          <h3 className="text-xl font-bold mb-4">Assets</h3>
          <div className="grid md:grid-cols-2 gap-4">
            {portfolio.tokens.map((token) => (
              <div
                key={token.symbol}
                className="glass-card p-6 transition-all duration-200 hover:bg-white/80 hover:shadow-lg hover:border hover:border-gray-200/50 cursor-pointer"
              >
                <div className="flex items-center gap-4 mb-4">
                  <div
                    className={`w-14 h-14 rounded-full bg-gradient-to-br ${token.color}`}
                  ></div>
                  <div className="flex-1">
                    <div className="font-bold text-lg">{token.symbol}</div>
                    <div className="text-sm text-gray-500">{token.name}</div>
                  </div>
                </div>
                <div className="flex justify-between items-end">
                  <div>
                    <div className="text-sm text-gray-500 mb-1">Amount</div>
                    <div className="font-medium">{token.amount}</div>
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
