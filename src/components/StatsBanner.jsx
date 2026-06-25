import { useState, useEffect, useMemo } from "react";
import { Users, PieChart, ArrowUpRight, Repeat2 } from "lucide-react";
import { apiCall } from "../utils/api";
import getFormattedNumber from "../hooks/get-formatted-number";

const formatCompact = (value) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return "—";
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return getFormattedNumber(n, 0);
};

export function StatsBanner({ className = "" }) {
  const [currentStat, setCurrentStat] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [stats, setStats] = useState(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const data = await apiCall("/portfolio/stats/full");
        if (cancelled || !data) return;

        setStats([
          {
            icon: ArrowUpRight,
            label: "Positive P&L",
            value: `${Number(data?.pnl?.pnlPercent ?? 0).toFixed(1)}%`,
          },
          {
            icon: PieChart,
            label: "Portfolios Created",
            value: getFormattedNumber(data?.onChainPortfolios ?? 0, 0),
          },
          {
            icon: Users,
            label: "Total Users",
            value: getFormattedNumber(data?.totalUsers ?? 0, 0),
          },
          {
            icon: Repeat2,
            label: "Transactions",
            value: formatCompact(data?.totalTransactions ?? 0),
          },
        ]);
      } catch {
        /* keep defaults */
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const statCount = stats?.length ?? 0;

  useEffect(() => {
    if (!stats || statCount <= 1) return undefined;

    const interval = setInterval(() => {
      setIsAnimating(true);
      setTimeout(() => {
        setCurrentStat((prev) => (prev + 1) % statCount);
        setIsAnimating(false);
      }, 500);
    }, 3000);

    return () => clearInterval(interval);
  }, [stats, statCount]);

  const activeStat = useMemo(
    () => stats?.[currentStat] ?? stats?.[0],
    [stats, currentStat],
  );

  if (!stats || !activeStat) return null;

  const StatIcon = activeStat.icon;

  return (
    <div
      className={`mx-auto sm:fixed sm:top-25 sm:left-1/2 sm:-translate-x-1/2 sm:z-20 ${className}`}
    >
      <div
        className="inline-flex items-center px-5 py-2.5 rounded-full mb-6 sm:mb-0 backdrop-blur-sm shadow-lg"
        style={{
          background:
            "linear-gradient(135deg, rgba(32,178,100,0.12) 0%, rgba(16,140,80,0.08) 100%)",
          border: "1px solid rgba(32,178,100,0.3)",
          boxShadow: "0 4px 20px rgba(32,178,100,0.1)",
          width: 280,
          overflow: "hidden",
        }}
      >
        <style>{`
        @keyframes carouselIn  { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
        @keyframes carouselOut { from { transform: translateX(0);    opacity: 1; } to { transform: translateX(-100%); opacity: 0; } }
        .carousel-in  { animation: carouselIn  0.42s cubic-bezier(0.4,0,0.2,1) forwards; }
        .carousel-out { animation: carouselOut 0.42s cubic-bezier(0.4,0,0.2,1) forwards; }
      `}</style>
        <div
          className={`flex items-center gap-2.5 w-full ${isAnimating ? "carousel-out" : "carousel-in"} px-[24px] py-[0px]`}
        >
          <div
            className="flex items-center justify-center w-6 h-6 rounded-full flex-shrink-0"
            style={{
              background: "linear-gradient(135deg, #20b264 0%, #0f7a44 100%)",
            }}
          >
            <StatIcon size={14} className="text-white" strokeWidth={2.5} />
          </div>
          <span
            className="text-sm font-semibold whitespace-nowrap"
            style={{ color: "#0f7a44" }}
          >
            {activeStat.label}:{" "}
            <span style={{ color: "#0f7a44" }}>{activeStat.value}</span>
          </span>
        </div>
      </div>
    </div>
  );
}
