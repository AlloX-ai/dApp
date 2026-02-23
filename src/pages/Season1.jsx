import { Flame, Trophy, Lock, Calendar, Info } from "lucide-react";
import { useState, useEffect } from "react";

export function Season1() {
  const [showTooltip, setShowTooltip] = useState(false);

  const seasons = [
    {
      number: 1,
      status: "Active",
      reward: "$5,000",
      timeline: "Feb 23 - Mar 9",
      active: true,
    },
    {
      number: 2,
      status: "Coming Soon",
      reward: "$8,000",
      timeline: "TBA",
      active: false,
    },
    {
      number: 3,
      status: "Coming Soon",
      reward: "$12,000",
      timeline: "TBA",
      active: false,
    },
  ];

  const tiers = [
    {
      name: "Tier 1",
      users: "First 500 users",
      winners: "25 winners",
      reward: "100 USDT each",
      total: "$2,500",
    },
    {
      name: "Tier 2",
      users: "Next 5,000 users",
      winners: "30 winners",
      reward: "50 USDT each",
      total: "$1,500",
    },
    {
      name: "Tier 3",
      users: "Next 10,000 users",
      winners: "200 winners",
      reward: "5 USDT each",
      total: "$1,000",
    },
  ];

  useEffect(() => {
    window.scrollTo(0, 0);
    document.title = "Season 1";
  }, []);

  return (
    <div className="flex-1 px-6 py-8 portfolio-wrapper ms-auto w-full overflow-y-auto space-y-6">
      <div className="flex flex-col sm:flex-row items-center justify-between">
        <h2 className="text-xl md:text-3xl font-bold">Season 1 Campaign</h2>
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
            className={`glass-card p-5 ${
              season.active ? "ring-2 ring-black" : "opacity-60"
            }`}
          >
            <div className="flex items-center justify-between mb-3">
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
                  {showTooltip && (
                    <div className="absolute left-0 top-full mt-2 w-80 p-4 bg-white rounded-xl shadow-lg border border-gray-200 z-50">
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
              ) : (
                <Lock size={18} className="text-gray-400" />
              )}
            </div>
            <div className="text-2xl font-bold mb-2">{season.reward}</div>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Calendar size={14} />
              {season.timeline}
            </div>
            <div className="mt-3 pt-3 border-t border-gray-200">
              <div className="text-xs text-gray-600">Status</div>
              <div
                className={`text-sm font-medium ${
                  season.active ? "text-green-600" : "text-gray-500"
                }`}
              >
                {season.active ? season.status : "Upcoming"}
              </div>
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
        <h3 className="text-xl font-bold mb-4">Season 1 Prize Distribution</h3>
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
            <div className="text-2xl font-bold">$5,000</div>
          </div>
        </div>
      </div>
    </div>
  );
}
