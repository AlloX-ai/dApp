import { useMemo } from "react";
import { useSearchParams } from "react-router";
import {
  Trophy,
  Flame,
  Gem,
  Calendar,
  ChevronRight,
  ChevronLeft,
} from "lucide-react";
import { TradingCompetitionPage } from "./TradingCompetition";
import { Season1 } from "./Season1";
import { ImageWithFallback } from "../components/figma/ImageWithFallback";
import tcBanner from "../assets/tcBanner.png";
import springSeries from "../assets/springSeries.png";
import { ProveYourPortfolioCampaign } from "./ProveYourPortfolio";

export function CampaignsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = useMemo(() => {
    const campaignParam = searchParams.get("campaign");
    return campaignParam === "spring-series"
      ? "season1"
      : campaignParam === "allocation-race"
        ? "trading"
        : campaignParam === "prove-your-portfolio"
          ? "prove-portfolio"
          : null;
  }, [searchParams]);

  return (
    <>
      {activeTab === null ? (
        <div className="space-y-6 flex-1 px-6 py-8 portfolio-wrapper ms-auto w-full overflow-y-auto">
          <div>
            <h2 className="text-3xl font-bold text-gray-900 mb-2">Campaigns</h2>
            <p className="text-gray-600">
              Participate in exciting campaigns and earn rewards
            </p>
          </div>

          {/* Campaign Cards Grid */}
          <div className="grid xl:grid-cols-2 gap-6">
            {/* Trading Competition Card */}
            <button
              onClick={() => {
                setSearchParams({ campaign: "allocation-race" });
              }}
              className="glass-card overflow-hidden text-left hover:shadow-2xl transition-all duration-300 group relative"
            >
              {/* Banner Image */}
              <div className="relative h-48 w-full overflow-hidden">
                <ImageWithFallback
                  src={tcBanner}
                  alt="Trading Competition"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                {/* Gradient Overlay */}
                <div className="absolute inset-0 " />

                {/* Badge on Banner */}
                <div className="absolute top-4 right-4 bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-bold shadow-lg">
                  ACTIVE
                </div>

                {/* Icon on Banner */}
              </div>

              {/* Content */}
              <div className="p-8">
                {/* Title */}
                <h3 className="text-2xl font-bold text-gray-900 mb-2">
                  The Allocation Race
                </h3>
                <p className="text-gray-600 mb-6">
                  Create on-chain portfolios and compete for $500,000 reward
                  pool
                </p>

                {/* Stats */}
                <div className="flex flex-col sm:flex-row gap-2 sm:items-center justify-between mb-6">
                  <div className="bg-white/60 backdrop-blur-sm rounded-xl p-3">
                    <div className="text-xs text-gray-600 mb-1">
                      Total Rewards
                    </div>
                    <div className="font-bold text-gray-900 flex items-center gap-1">
                      $500,000 (<Gem className="w-4 h-4 text-purple-600" />
                      100,000)
                    </div>
                  </div>
                  <div className="bg-white/60 backdrop-blur-sm rounded-xl p-3">
                    <div className="text-xs text-gray-600 mb-1">Duration</div>
                    <div className="font-bold text-gray-900 flex items-center gap-1">
                      <Calendar className="w-4 h-4 text-blue-600" />
                      Apr 17 - May 29
                    </div>
                  </div>
                </div>

                {/* CTA */}
                <div className="flex items-center justify-end gap-2 ">
                  <span className="text-sm font-semibold text-amber-600 group-hover:text-amber-700">
                    View
                  </span>
                  <ChevronRight className="w-5 h-5 text-amber-600 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </button>

            <button
              onClick={() => {
                setSearchParams({ campaign: "prove-your-portfolio" });
              }}
              className="glass-card overflow-hidden text-left hover:shadow-2xl transition-all duration-300 group relative"
            >
              {/* Banner Image */}
              <div className="relative h-48 w-full overflow-hidden">
                <ImageWithFallback
                  src="https://images.unsplash.com/photo-1645414028588-cee61dc2d978?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjcnlwdG9jdXJyZW5jeSUyMHRva2VuJTIwZ29sZCUyMGNvaW5zJTIwZGlnaXRhbHxlbnwxfHx8fDE3NzUxMjU3NDF8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral"
                  alt="Prove Your Portfolio"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                {/* Gradient Overlay */}
                <div className="absolute inset-0 " />

                {/* Badge on Banner */}
                <div className="absolute top-4 right-4 bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-bold shadow-lg">
                  ACTIVE
                </div>

                {/* Icon on Banner */}
              </div>

              {/* Content */}
              <div className="p-8">
                {/* Title */}
                <h3 className="text-2xl font-bold text-gray-900 mb-2">
                  Prove Your Portfolio
                </h3>
                <p className="text-gray-600 mb-6">
                  Showcase your portfolio and earn rewards based on its
                  performance
                </p>

                {/* Stats */}
                <div className="flex flex-col sm:flex-row gap-2 sm:items-center justify-between mb-6">
                  <div className="bg-white/60 backdrop-blur-sm rounded-xl p-3">
                    <div className="text-xs text-gray-600 mb-1">
                      Total Rewards
                    </div>
                    <div className="font-bold text-gray-900 flex items-center gap-1">
                      $75,000 (<Gem className="w-4 h-4 text-purple-600" />
                      15,000)
                    </div>
                  </div>
                  <div className="bg-white/60 backdrop-blur-sm rounded-xl p-3">
                    <div className="text-xs text-gray-600 mb-1">Duration</div>
                    <div className="font-bold text-gray-900 flex items-center gap-1">
                      <Calendar className="w-4 h-4 text-blue-600" />
                      May 1 - May 31
                    </div>
                  </div>
                </div>

                {/* CTA */}
                <div className="flex items-center justify-end gap-2 ">
                  <span className="text-sm font-semibold text-amber-600 group-hover:text-amber-700">
                    View
                  </span>
                  <ChevronRight className="w-5 h-5 text-amber-600 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </button>

            {/* Season 1 Campaign Card */}
            <button
              onClick={() => {
                setSearchParams({ campaign: "spring-series" });
              }}
              className="glass-card overflow-hidden text-left hover:shadow-2xl transition-all duration-300 group relative"
            >
              {/* Banner Image */}
              <div className="relative h-48 w-full overflow-hidden">
                <ImageWithFallback
                  src={springSeries}
                  alt="Spring Series"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                {/* Gradient Overlay */}
                {/* <div className="absolute inset-0 bg-gradient-to-b from-orange-900/60 via-red-900/40 to-transparent" /> */}

                {/* Badge on Banner */}
                <div className="absolute top-4 right-4 bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-bold shadow-lg">
                  ACTIVE
                </div>

                {/* Icon on Banner */}
              </div>

              {/* Content */}
              <div className="p-8">
                {/* Title */}
                <h3 className="text-2xl font-bold text-gray-900 mb-2">
                  Spring series
                </h3>
                <p className="text-gray-600 mb-6">
                  Claim your welcome bonus each season to earn rewards from the
                  $45,000 reward pool
                </p>

                {/* Stats */}
                <div className="flex flex-col sm:flex-row gap-2 sm:items-center justify-between mb-6">
                  <div className="bg-white/60 backdrop-blur-sm rounded-xl p-3">
                    <div className="text-xs text-gray-600 mb-1">
                      Total Rewards
                    </div>
                    <div className="font-bold text-base text-gray-900 flex items-center gap-1">
                      $45,000 (<Gem className="w-4 h-4 text-purple-600" />
                      9,000)
                    </div>
                  </div>
                  <div className="bg-white/60 backdrop-blur-sm rounded-xl p-3">
                    <div className="text-xs text-gray-600 mb-1">Duration</div>
                    <div className="font-bold text-gray-900 flex items-center gap-1">
                      <Calendar className="w-4 h-4 text-blue-600" />
                      Feb 23 - Apr 30
                    </div>
                  </div>
                </div>

                {/* CTA */}
                <div className="flex items-center justify-end gap-2">
                  <span className="text-sm font-semibold text-orange-600 group-hover:text-orange-700">
                    View
                  </span>
                  <ChevronRight className="w-5 h-5 text-orange-600 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-6 flex-1 px-6 py-8 portfolio-wrapper ms-auto w-full overflow-y-auto">
          {/* Tab Switcher */}
          <button
            onClick={() => {
              setSearchParams({});
            }}
            className={`flex items-center gap-2 p-3 rounded-xl font-semibold transition-all  bg-white text-gray-900 shadow-md hover:shadow-lg`}
          >
            <ChevronLeft className="w-5 h-5" />
            Back
          </button>

          {/* Content */}
          {activeTab === "trading" ? (
            <TradingCompetitionPage />
          ) : activeTab === "prove-portfolio" ? (
            <ProveYourPortfolioCampaign />
          ) : (
            <Season1 />
          )}
        </div>
      )}
    </>
  );
}
