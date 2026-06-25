import { AlertTriangle, X } from "lucide-react";

export function BinanceBoosterWalletModal({
  isOpen,
  onClose,
  expectedAddress,
  helpUrl,
  variant = "wrong-address",
}) {
  if (!isOpen) return null;

  const isWrongAddress = variant === "wrong-address";

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/45 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl rounded-3xl border border-red-200 bg-white p-6 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-50 text-red-700">
              <AlertTriangle size={18} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900">
                {isWrongAddress
                  ? "Wrong Binance Wallet Address"
                  : "Binance MPC Wallet Required"}
              </h3>
              <p className="mt-2 text-sm leading-6 text-gray-700">
                {isWrongAddress ? (
                  <>
                    The connected wallet isn&apos;t eligible for this Binance
                     task. Please switch to the keyless wallet address{" "}
                    <span className="font-semibold break-all">
                      &quot;{expectedAddress}&quot;
                    </span>{" "}
                    in the Binance Wallet Extension.
                  </>
                ) : (
                  <>
                    You can create a portfolio, but it won&apos;t be eligible
                    for the Binance campaign rewards. Connect with Binance MPC
                    Wallet to participate.
                  </>
                )}
              </p>
              {/* {helpUrl ? (
                <a
                  href={helpUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 inline-flex text-sm font-medium text-red-700 underline underline-offset-2 hover:text-red-900"
                >
                  Can not find address?
                </a>
              ) : null} */}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-gray-200 text-gray-500 hover:text-gray-900"
            aria-label="Close Binance wallet warning"
          >
            <X size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
