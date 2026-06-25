import { useState, useEffect } from "react";
import Slider from "react-slick";
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

const sliderSettings = {
  dots: true,
  infinite: true,
  speed: 420,
  slidesToShow: 1,
  slidesToScroll: 1,
  autoplay: true,
  autoplaySpeed: 3000,
  arrows: false,
  pauseOnHover: true,
  dotsClass: "slick-dots stats-banner-dots",
};

function StatSlide({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center justify-center gap-2.5 px-6 py-2.5">
      <div
        className="flex items-center justify-center w-6 h-6 rounded-full flex-shrink-0"
        style={{
          background: "linear-gradient(135deg, #20b264 0%, #0f7a44 100%)",
        }}
      >
        <Icon size={14} className="text-white" strokeWidth={2.5} />
      </div>
      <span
        className="text-sm font-semibold whitespace-nowrap"
        style={{ color: "#0f7a44" }}
      >
        {label}: <span style={{ color: "#0f7a44" }}>{value}</span>
      </span>
    </div>
  );
}

export function StatsBanner({ className = "" }) {
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
        /* hide banner on failure */
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  if (!stats?.length) return null;

  return (
    <div
      className={`flex justify-center stats-banner mx-auto mb-6 sm:mb-0 sm:fixed sm:top-25 sm:left-1/2 sm:-translate-x-1/2 sm:z-20 ${className}`}
    >
      <style>{`
        .stats-banner .stats-banner-slider {
          width: 280px;
        }
        .stats-banner .stats-banner-slider .slick-list {
          border-radius: 9999px;
          background: linear-gradient(135deg, rgba(32,178,100,0.12) 0%, rgba(16,140,80,0.08) 100%);
          border: 1px solid rgba(32,178,100,0.3);
          box-shadow: 0 4px 20px rgba(32,178,100,0.1);
          backdrop-filter: blur(4px);
        }
        .stats-banner .stats-banner-slider .slick-track {
          display: flex;
          align-items: center;
        }
        .stats-banner .stats-banner-slider .slick-slide {
          height: auto;
        }
        .stats-banner .stats-banner-slider .slick-slide > div {
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .stats-banner .stats-banner-dots {
          position: static;
          margin: 8px 0 0;
          line-height: 0;
        }
        .stats-banner .stats-banner-dots li {
          margin: 0 3px;
          width: 6px;
          height: 6px;
        }
        .stats-banner .stats-banner-dots li button {
          width: 6px;
          height: 6px;
          padding: 0;
        }
        .stats-banner .stats-banner-dots li button:before {
          content: "";
          width: 6px;
          height: 6px;
          border-radius: 9999px;
          background: rgba(32, 178, 100, 0.35);
          opacity: 1;
          top: 0;
          left: 0;
        }
        .stats-banner .stats-banner-dots li.slick-active button:before {
          background: #0f7a44;
        }
      `}</style>
      <Slider {...sliderSettings} className="stats-banner-slider">
        {stats.map((stat) => (
          <div key={stat.label}>
            <StatSlide {...stat} />
          </div>
        ))}
      </Slider>
    </div>
  );
}
