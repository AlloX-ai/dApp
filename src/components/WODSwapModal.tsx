import { X, ArrowDown, Check, ChevronDown } from "lucide-react";
import { useState } from "react";

interface WODSwapModalProps {
  onClose: () => void;
}

export function WODSwapModal({ onClose }: WODSwapModalProps) {
  const [fromToken, setFromToken] = useState<"USDT" | "USDC" | "BNB">("USDT");
  const [amount, setAmount] = useState("");
  const [showSuccess, setShowSuccess] = useState(false);
    const [selectedToken, setSelectedToken] = useState("USDT");

    const [isTokenDropdownOpen, setIsTokenDropdownOpen] = useState(false);
  

  // Mock exchange rates (how much WOD you get per 1 unit of fromToken)
  const exchangeRates = {
    USDT: 125.5, // 1 USDT = 125.5 WOD
    USDC: 125.3, // 1 USDC = 125.3 WOD
    BNB: 75840.0, // 1 BNB = 75,840 WOD (assuming BNB ~ $605)
  };


   const tokens = [
    {
      name: "USDT",
      icon: "https://cdn.allox.ai/allox/networks/usdt.svg",
    },
    {
      name: "USDC",
      icon: "https://cdn.allox.ai/allox/networks/usdc.svg",
    },
    {
      name: "BNB",
      icon: "https://cdn.allox.ai/allox/networks/bnb.svg",
    },
  ];

  const calculateWOD = () => {
    const inputAmount = parseFloat(amount);
    if (isNaN(inputAmount) || inputAmount <= 0) return "0";
    const wodAmount = inputAmount * exchangeRates[fromToken];
    return wodAmount.toLocaleString(undefined, { maximumFractionDigits: 2 });
  };

  const getTokenUSDValue = () => {
    const inputAmount = parseFloat(amount);
    if (isNaN(inputAmount) || inputAmount <= 0) return "0";

    if (fromToken === "BNB") {
      return (inputAmount * 605).toFixed(2); // Mock BNB price
    }
    return inputAmount.toFixed(2);
  };

  const handleConfirm = () => {
    // Show success message
    setShowSuccess(true);

    // Close modal after 2 seconds
    setTimeout(() => {
      onClose();
    }, 2000);
  };

  if (showSuccess) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 border border-gray-200">
          <div className="text-center">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center mx-auto mb-4">
              <Check size={40} className="text-white" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">
              Swap Successful!
            </h3>
            <p className="text-gray-600 mb-4">
              Your transaction has been submitted. You will receive{" "}
              <span className="font-bold text-purple-600">
                {calculateWOD()} $WOD
              </span>{" "}
              shortly.
            </p>
            <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
              <div className="text-xs text-gray-600 mb-1">Transaction Hash</div>
              <div className="font-mono text-sm text-blue-600">
                0x7a3f...8d2c
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md border border-gray-200">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">Swap to WOD</h2>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-xl bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* From Token */}
          <div>
            <div className="text-sm text-gray-600 mb-2">From</div>
            <div className="glass-card p-4 bg-gradient-to-br from-gray-50 to-gray-100">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  {/* <select
                    value={fromToken}
                    onChange={(e) =>
                      setFromToken(e.target.value as "USDT" | "USDC" | "BNB")
                    }
                    className="bg-white border border-gray-300 rounded-lg px-3 py-2 font-semibold text-gray-900 cursor-pointer hover:border-gray-400 transition-colors"
                  >
                    <option className="flex items-center gap-1" value="USDT">
                      <img
                        src="https://cdn.allox.ai/allox/networks/usdt.svg"
                        alt=""
                      />
                      USDT
                    </option>
                    <option className="flex items-center gap-1" value="USDC">
                      <img
                        src="https://cdn.allox.ai/allox/networks/usdc.svg"
                        alt=""
                      />
                      USDC
                    </option>
                    <option className="flex items-center gap-1" value="BNB">
                      B
                      <img
                        src="https://cdn.allox.ai/allox/networks/bnb.svg"
                        alt=""
                      />
                      NB
                    </option>
                  </select> */}
                                 
                                    <div className="relative">
                                      <button
                                        onClick={() =>
                                          setIsTokenDropdownOpen(!isTokenDropdownOpen)
                                        }
                                        className="w-full flex items-center justify-between px-4 py-3 bg-white border border-gray-200 rounded-xl hover:border-blue-500 transition-all"
                                      >
                                        <div className="flex items-center gap-3">
                                          <img
                                            src={
                                              tokens.find((token) => token.name === selectedToken)
                                                ?.icon
                                            }
                                            alt={selectedToken}
                                            className="w-5 h-5"
                                          />
                                          <span className="font-medium text-xs sm:text-base text-gray-900">
                                            {selectedToken}
                                          </span>
                                        </div>
                                        <ChevronDown
                                          size={18}
                                          className={`transition-transform ${isTokenDropdownOpen ? "rotate-180" : ""}`}
                                        />
                                      </button>
                  
                                      {isTokenDropdownOpen && (
                                        <>
                                          <div
                                            className="fixed inset-0 z-10"
                                            onClick={() => setIsTokenDropdownOpen(false)}
                                          />
                                          <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-xl shadow-xl z-20 overflow-hidden">
                                            {tokens.map((token) => (
                                              <button
                                                key={token.name}
                                                onClick={() => {
                                                  setSelectedToken(token.name);
                                                  setFromToken(token.name as "USDT" | "USDC" | "BNB");
                                                  setIsTokenDropdownOpen(false);
                                                }}
                                                className={`w-full flex items-center gap-3 text-xs sm:text-base text-left px-4 py-3 hover:bg-gray-50 transition-colors ${
                                                  selectedToken === token.name
                                                    ? "bg-blue-50 font-semibold text-blue-600"
                                                    : "text-gray-700"
                                                }`}
                                              >
                                                <img
                                                  src={token.icon}
                                                  alt={token.name}
                                                  className="w-5 h-5"
                                                />
                                                {token.name}
                                              </button>
                                            ))}
                                          </div>
                                        </>
                                      )}
                                    </div>
                </div>
                <div className="text-xs text-gray-600">
                  Balance: {fromToken === "BNB" ? "2.45" : "1,250.00"}
                </div>
              </div>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full bg-transparent text-3xl font-bold text-gray-900 outline-none placeholder:text-gray-400"
                step="any"
              />
              <div className="text-sm text-gray-600 mt-2">
                ≈ ${getTokenUSDValue()} USD
              </div>
            </div>
          </div>

          {/* Arrow */}
          <div className="flex justify-center">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
              <ArrowDown className="w-5 h-5 text-white" />
            </div>
          </div>

          {/* To Token */}
          <div>
            <div className="text-sm text-gray-600 mb-2">To (estimated)</div>
            <div className="glass-card p-4 bg-gradient-to-br from-purple-50 to-indigo-50 border-2 border-purple-200">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="px-3 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg font-semibold">
                    $WOD
                  </div>
                </div>
                <div className="text-xs text-gray-600">Balance: 0.00</div>
              </div>
              <div className="text-3xl font-bold text-purple-600">
                {calculateWOD()}
              </div>
              <div className="text-sm text-gray-600 mt-2">
                ≈ ${getTokenUSDValue()} USD
              </div>
            </div>
          </div>

          {/* Exchange Rate Info */}
          <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Exchange Rate</span>
              <span className="font-semibold text-gray-900">
                1 {fromToken} = {exchangeRates[fromToken].toLocaleString()} $WOD
              </span>
            </div>
          </div>

          {/* Slippage Warning */}
          <div className="p-3 bg-yellow-50 rounded-lg border border-yellow-200">
            <div className="text-xs text-gray-700">
              Price may vary by ±0.5% due to slippage. The actual amount
              received may differ slightly.
            </div>
          </div>

          {/* Confirm Button */}
          <button
            onClick={handleConfirm}
            disabled={!amount || parseFloat(amount) <= 0}
            className="w-full py-4 px-6 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-bold text-lg hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-none"
          >
            {!amount || parseFloat(amount) <= 0
              ? "Enter Amount"
              : "Confirm Swap"}
          </button>
        </div>
      </div>
    </div>
  );
}
