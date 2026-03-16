import { Flame, Trophy, Lock, Calendar, Info } from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { useSelector } from "react-redux";
import { season1_winners } from "../constants/addresses";

export function Season1() {
  const [showTooltip, setShowTooltip] = useState(false);

  const { address } = useSelector((state) => state.wallet);

  const winner = useMemo(() => {
    return season1_winners.find((item) => {
      return item.address.toLowerCase() === address?.toLowerCase();
    });
  }, [address]);

  const seasons = [
    {
      number: 1,
      status: "Ended",
      reward: "$5,000",
      timeline: "Feb 23 - Mar 9",
      active: false,
    },
    {
      number: 2,
      status: "Active",
      reward: "$8,000",
      timeline: "Mar 10 - Mar 31",
      active: true,
    },
    {
      number: 3,
      status: "Upcoming",
      reward: "$12,000",
      timeline: "TBA",
      active: false,
    },
  ];

  const tiers = [
    {
      name: "Tier 1",
      users: "First 1,000 users",
      winners: "40 winners",
      reward: "100 USDT each",
      total: "$4,000",
    },
    {
      name: "Tier 2",
      users: "Next 10,000 users",
      winners: "50 winners",
      reward: "50 USDT each",
      total: "$2,500",
    },
    {
      name: "Tier 3",
      users: "Next 25,000 users",
      winners: "300 winners",
      reward: "5 USDT each",
      total: "$1,500",
    },
  ];

  useEffect(() => {
    window.scrollTo(0, 0);
    document.title = "Spring Series";
  }, []);

  return (
    <div className="flex-1 px-6 py-8 portfolio-wrapper ms-auto w-full overflow-y-auto space-y-6">
      <div className="flex flex-col sm:flex-row items-center justify-between">
        <h2 className="text-xl md:text-3xl font-bold">
          Spring Series Campaign
        </h2>
        <div className="flex items-center gap-2 px-4 py-2 bg-black rounded-xl">
          <Trophy size={18} className="text-white" />
          <span className="text-white text-sm font-bold">$25,000 Total</span>
        </div>
      </div>

      {/* Seasons Overview */}
      <div className="grid md:grid-cols-3 gap-4">
        {seasons.map((season) => (
          <div
            key={season.number}
            className={`p-5 ${season.active ? "glass-card" : "glass-card-disabled"} ${
              season.active ? "ring-2 ring-black" : ""
            }`}
          >
            <div className={season.active ? "opacity-100" : "opacity-60"}>
              <div className="flex items-center relative justify-between mb-3">
                <div
                  className={`px-3 py-1 rounded-lg text-xs font-bold ${
                    season.active
                      ? "bg-black text-white"
                      : "bg-gray-200 text-gray-600"
                  }`}
                >
                  Season {season.number}
                </div>
                {season.active ? (
                  <div className="relative">
                    <button
                      onMouseEnter={() => setShowTooltip(true)}
                      onMouseLeave={() => setShowTooltip(false)}
                      className="w-5 h-5 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center transition-colors"
                    >
                      <Info className="w-3 h-3 text-gray-600" />
                    </button>
                  </div>
                ) : (
                  <Lock size={18} className="text-gray-400" />
                )}
                {showTooltip && season.active && (
                  <div className="absolute right-0 top-full mt-2 w-80 p-4 bg-white rounded-xl shadow-lg border border-gray-200 z-50">
                    <div className="space-y-2 text-sm text-gray-700">
                      <p>
                        Winners will be randomly selected from each tier after
                        the season ends. Selection will take place within 7
                        days.
                      </p>
                      <p className="pt-2 border-t border-gray-200">
                        Rewards will be displayed in each season tab once
                        finalized.
                      </p>
                    </div>
                  </div>
                )}
              </div>
              <div className="text-2xl font-bold mb-2">{season.reward}</div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Calendar size={14} />
                {season.timeline}
              </div>
            </div>

            <div className="mt-3 pt-3 border-t relative border-gray-200 flex justify-between gap-2 items-center">
              <div className="flex flex-col">
                <div className="text-xs text-gray-600">Status</div>
                <div
                  className={`text-sm font-medium ${
                    season.active ? "text-green-600" : "text-gray-500"
                  }`}
                >
                  {season.status}
                </div>
              </div>
              {season.number === 1 && (
                <div
                  className={` ${
                    winner
                      ? "absolute right-0 top-3 bg-linear-to-r from-green-50 to-emerald-100 rounded-xl py-1 px-2 border-2 border-emerald-200"
                      : ""
                  } flex flex-col `}
                >
                  <div className="text-xs text-gray-600">Rewards</div>
                  <div
                    className={`text-sm font-medium ${
                      winner ? "text-green-600" : "text-gray-500"
                    }`}
                  >
                    ${winner ? winner.reward : 0}
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* How to Participate */}
      <div className="glass-card p-6">
        <h3 className="text-xl font-bold mb-4">How to Participate</h3>
        <div className="grid md:grid-cols-3 gap-4">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-black text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">
              1
            </div>
            <div>
              <div className="font-medium mb-1">Connect Wallet</div>
              <p className="text-sm text-gray-600">Link your wallet to AlloX</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-black text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">
              2
            </div>
            <div>
              <div className="font-medium mb-1">Claim Welcome Bonus</div>
              <p className="text-sm text-gray-600">Get your starting rewards</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-black text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">
              3
            </div>
            <div>
              <div className="font-medium mb-1">You're In!</div>
              <p className="text-sm text-gray-600">Automatically entered</p>
            </div>
          </div>
        </div>
      </div>

      {/* Season 1 Prize Distribution */}
      <div className="glass-card p-6">
        <h3 className="text-xl font-bold mb-4">Season 2 Prize Distribution</h3>
        <div className="space-y-4">
          {tiers.map((tier, index) => (
            <div
              key={tier.name}
              className="flex items-center justify-between p-4 bg-white/60 rounded-xl border border-gray-200/50"
            >
              <div className="flex items-center gap-4 flex-1">
                <div className="w-12 h-12 bg-black text-white rounded-xl flex items-center justify-center font-bold">
                  {index + 1}
                </div>
                <div className="flex-1">
                  <div className="font-bold mb-1">{tier.users}</div>
                  <div className="text-sm text-gray-600">
                    {tier.winners} selected • {tier.reward}
                  </div>
                </div>
              </div>
              <div className="text-right hidden sm:block">
                <div className="text-sm text-gray-600">Total Pool</div>
                <div className="text-xl font-bold">{tier.total}</div>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">Total USDT distributed</div>
            <div className="text-2xl font-bold">$8,000</div>
          </div>
        </div>
      </div>
    </div>
  );
}
