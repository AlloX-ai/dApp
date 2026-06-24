import { X } from "lucide-react";
import { SellPortfolioPanel } from "./SellPortfolioPanel";

export function SellPortfolioModal({ isOpen, onClose, target, onComplete }) {
  if (!isOpen || !target) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl bg-white border border-gray-200 rounded-3xl p-6 md:p-7 max-h-[85vh] overflow-y-auto shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <h3 className="text-2xl font-bold">
              {target.type === "token" ? "Sell Token" : "Sell Portfolio"}
            </h3>
            <p className="text-sm text-gray-600">{target.title}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="h-8 w-8 rounded-full border border-gray-200 flex items-center justify-center text-gray-500 hover:text-black"
          >
            <X size={16} />
          </button>
        </div>

        <SellPortfolioPanel
          key={`${target.portfolioId}-${target.symbol || "all"}`}
          target={target}
          onComplete={onComplete}
          onRequestClose={onClose}
          onBack={onClose}
        />
      </div>
    </div>
  );
}
