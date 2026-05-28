import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { PrivyFundModal } from "./PrivyFundModal";
import { PrivyWithdrawModal } from "./PrivyWithdrawModal";

export function PrivyFundHubModal({ open, onClose, walletChainId, coinbase }) {
  const [activeTab, setActiveTab] = useState("add");

  useEffect(() => {
    if (open) setActiveTab("add");
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[310] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-xl max-w-xl w-full max-h-[100dvh] overflow-y-auto border border-gray-200/80"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">Fund wallet</h2>
          <button
            type="button"
            className="p-2 rounded-full hover:bg-gray-100 text-gray-600"
            onClick={onClose}
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        <div className="px-5 py-4 space-y-4">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab("add")}
              className={`px-3 py-1.5 rounded-full text-sm ${activeTab === "add" ? "bg-black text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}
            >
              Add funds
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("withdraw")}
              className={`px-3 py-1.5 rounded-full text-sm ${activeTab === "withdraw" ? "bg-black text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}
            >
              Withdraw funds
            </button>
          </div>

          {activeTab === "add" ? (
            <PrivyFundModal
              open
              embedded
              showJourneyTabs={false}
              walletChainId={walletChainId}
              coinbase={coinbase}
              onClose={onClose}
            />
          ) : (
            <PrivyWithdrawModal
              open
              embedded
              showJourneyTabs={false}
              onClose={onClose}
            />
          )}
        </div>
      </div>
    </div>
  );
}
