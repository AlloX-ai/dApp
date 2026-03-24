import { useState } from "react";
import { Trophy, Flame } from "lucide-react";
import { TradingCompetitionPage } from "./TradingCompetition";
import { Season1 } from "./Season1";

export function CampaignsPage() {
  const [activeTab, setActiveTab] = useState("trading");

  return (
    <div className="space-y-6 flex-1 px-6 py-8 portfolio-wrapper ms-auto w-full overflow-y-auto">
      {/* Tab Switcher */}
      <div className="flex gap-2 p-1 bg-white/40 backdrop-blur-xl border border-white/60 rounded-2xl shadow-lg w-fit">
        <button
          onClick={() => setActiveTab("trading")}
          className={`flex items-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all ${
            activeTab === "trading"
              ? "bg-white text-gray-900 shadow-md"
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          <Trophy className="w-5 h-5" />
          Trading Competition
        </button>
        <button
          onClick={() => setActiveTab("season1")}
          className={`flex items-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all ${
            activeTab === "season1"
              ? "bg-white text-gray-900 shadow-md"
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          <Flame className="w-5 h-5 text-orange-500" />
          Season 1 Campaign
        </button>
      </div>

      {/* Content */}
      {activeTab === "trading" ? <TradingCompetitionPage /> : <Season1 />}
    </div>
  );
}
