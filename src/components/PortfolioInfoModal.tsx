// Portfolio Info Modal Component
import { motion } from "motion/react";
import { X as CloseIcon, Coins, Gem, TrendingUp } from "lucide-react";
import {
  FALLBACK_GEM_USD_VALUE,
  FALLBACK_TIERS,
  computeGemsPer1K,
  formatTierVolumeLabel,
  getTierStyle,
} from "../utils/gemsTier";

type Tier = {
  name: string;
  ratePct: number;
  minVolume: number;
  volumeToNext?: number;
};

type GemsStatus = {
  balance?: number;
  balanceUsd?: number;
  gemUsdValue?: number;
  lifetimeOnChainVolume?: number;
  currentTier?: Tier;
  nextTier?: Tier;
  progressPct?: number;
  tiers?: Tier[];
};

const formatNumber = (value: number | undefined, digits = 2) => {
  const n = Number(value ?? 0);
  if (!Number.isFinite(n)) return "0";
  return n.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: digits,
  });
};

const formatUsd = (value: number | undefined) => {
  const n = Number(value ?? 0);
  if (!Number.isFinite(n)) return "$0.00";
  return `$${n.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

export function PortfolioInfoModal({
  isOpen,
  onClose,
  gemsStatus,
}: {
  isOpen: boolean;
  onClose: () => void;
  gemsStatus?: GemsStatus | null;
}) {
  if (!isOpen) return null;

  const gemUsdValue =
    Number(gemsStatus?.gemUsdValue) > 0
      ? Number(gemsStatus?.gemUsdValue)
      : FALLBACK_GEM_USD_VALUE;

  const tiers: Tier[] =
    Array.isArray(gemsStatus?.tiers) && gemsStatus!.tiers!.length > 0
      ? (gemsStatus!.tiers as Tier[])
      : FALLBACK_TIERS;

  const currentTierName = gemsStatus?.currentTier?.name ?? null;
  const nextTier = gemsStatus?.nextTier ?? null;
  const progressPct = Math.max(
    0,
    Math.min(100, Number(gemsStatus?.progressPct ?? 0)),
  );
  const hasLiveStatus = Boolean(gemsStatus?.currentTier);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ duration: 0.2 }}
        className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[85vh] overflow-hidden"
      >
        {/* Modal Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-5 py-3.5 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold">Create Portfolio Rewards</h3>
            <p className="text-xs text-gray-600 mt-0.5">
              Earn points and gems
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center transition-colors"
          >
            <CloseIcon size={16} className="text-gray-600" />
          </button>
        </div>

        {/* Modal Content - Scrollable */}
        <div className="p-5 overflow-y-auto max-h-[calc(85vh-72px)] space-y-4">
          {/* Current tier / progress panel (only rendered when we have status) */}
          {hasLiveStatus && (
            <div
              className={`glass-card p-4 bg-gradient-to-br ${
                getTierStyle(currentTierName).bg
              } border ${getTierStyle(currentTierName).border}`}
            >
              <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
                <div className="flex items-center gap-2.5">
                  <div
                    style={{
                      backgroundImage:
                        getTierStyle(currentTierName).backgroundImage,
                    }}
                    className="w-9 h-9 rounded-lg flex items-center justify-center shadow-sm"
                  >
                    <TrendingUp size={16} className="text-white" />
                  </div>
                  <div>
                    <div className="text-[11px] uppercase tracking-wide text-gray-500 font-semibold">
                      Your current tier
                    </div>
                    <div className="text-base font-bold text-gray-900">
                      {currentTierName}{" "}
                      <span className="text-xs font-medium text-gray-600">
                        {/* ({gemsStatus?.currentTier?.ratePct ?? 0}% rate)
                         */}
                         <div className="flex items-center gap-1.5 mt-0.5">
                    <Gem size={14} className="text-purple-600" />
                    {/* <span className="text-sm font-bold text-gray-900"> */}
                      {formatNumber(gemsStatus?.balance, 4)}{" "}
                    {/* </span> */}
                    earned
                  </div>
                      </span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[11px] uppercase tracking-wide text-gray-500 font-semibold">
                    Lifetime volume
                  </div>
                  <div className="text-sm font-bold text-gray-900">
                    {formatUsd(gemsStatus?.lifetimeOnChainVolume)}
                  </div>
                </div>
              </div>

              {/* <div className="grid grid-cols-2 gap-3 mb-3">
                <div className="bg-white/70 border border-gray-200 rounded-lg px-3 py-2">
                  <div className="text-[11px] text-gray-500 font-semibold">
                    Gem balance
                  </div>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <Gem size={14} className="text-purple-600" />
                    <span className="text-sm font-bold text-gray-900">
                      {formatNumber(gemsStatus?.balance, 4)}
                    </span>
                    <span className="text-[11px] text-gray-500">
                      ≈ {formatUsd(gemsStatus?.balanceUsd)}
                    </span>
                  </div>
                </div>
                <div className="bg-white/70 border border-gray-200 rounded-lg px-3 py-2">
                  <div className="text-[11px] text-gray-500 font-semibold">
                    Gem value
                  </div>
                  <div className="text-sm font-bold text-gray-900 mt-0.5">
                    1 Gem = {formatUsd(gemUsdValue)}
                  </div>
                </div>
              </div> */}

              {/* {nextTier ? (
                <div>
                  <div className="flex items-center justify-between text-[11px] text-gray-600 mb-1">
                    <span>
                      Progress to <strong>{nextTier.name}</strong>
                    </span>
                    <span className="font-semibold text-gray-800">
                      {progressPct.toFixed(1)}%
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-white/80 overflow-hidden border border-gray-200">
                    <div
                      className="h-full"
                      style={{
                        width: `${progressPct}%`,
                        backgroundImage:
                          getTierStyle(nextTier.name).backgroundImage,
                      }}
                    />
                  </div>
                  <div className="text-[11px] text-gray-600 mt-1">
                    {formatUsd(nextTier.volumeToNext)} more volume to unlock{" "}
                    {nextTier.name} ({nextTier.ratePct}% rate).
                  </div>
                </div>
              ) : (
                <div className="text-[11px] text-gray-600">
                  You&apos;ve reached the top tier. Keep trading to keep
                  earning at the highest rate.
                </div>
              )} */}
            </div>
          )}

          {/* How Points Are Earned */}
          <div className="glass-card p-4 bg-gradient-to-br from-blue-50 to-cyan-50 border-blue-200/50">
            <div className="flex items-center gap-2.5 mb-2">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <Coins size={16} className="text-white" />
              </div>
              <h4 className="font-bold">Points</h4>
            </div>
            <p className="text-xs text-gray-700">
              Earn <strong>250 points</strong> for creating on-chain
              portfolios.
            </p>
          </div>

          {/* How Gems Are Earned */}
          <div className="glass-card p-4 bg-gradient-to-br from-purple-50 to-pink-50 border-purple-200/50">
            <div className="flex items-center gap-2.5 mb-2">
              <div className="w-8 h-8 bg-gradient-to-br from-purple-600 to-pink-600 rounded-lg flex items-center justify-center">
                <Gem size={16} className="text-white" />
              </div>
              <h4 className="font-bold">Gems</h4>
            </div>
            <div className="space-y-2 text-xs text-gray-700">
              <div className="flex items-start gap-1.5">
                <span className="text-purple-600 mt-0.5">•</span>
                <p>
                  <strong>Campaigns only:</strong> Earn gems for on-chain
                  portfolios from campaigns
                </p>
              </div>
              <div className="flex items-start gap-1.5">
                <span className="text-purple-600 mt-0.5">•</span>
                <p>
                  <strong>Volume rewards:</strong> Earn gems based on lifetime
                  trading volume
                </p>
              </div>
            </div>
          </div>

          {/* Tier Table */}
          <div>
            <h4 className="font-bold mb-2 text-sm">
              Volume-Based Gem Rewards
            </h4>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-gray-900 text-white">
                    <th className="px-3 py-2 text-left rounded-tl-lg">Tier</th>
                    <th className="px-3 py-2 text-left">Volume</th>
                    <th className="px-3 py-2 text-left">Rate</th>
                    <th className="px-3 py-2 text-left rounded-tr-lg">
                      Gems/$1K
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {tiers.map((row, index) => {
                    const isCurrent =
                      currentTierName &&
                      row.name?.toLowerCase() ===
                        currentTierName.toLowerCase();
                    const gemsPer1K = computeGemsPer1K(
                      row.ratePct,
                      gemUsdValue,
                    );
                    const style = getTierStyle(row.name);
                    return (
                      <tr
                        key={row.name}
                        className={`${
                          isCurrent
                            ? `${style.bg} ${style.border} border-l-4`
                            : index % 2 === 0
                              ? "bg-gray-50"
                              : "bg-white"
                        } border-b border-gray-200 last:border-0`}
                      >
                        <td className="px-3 py-2 font-semibold text-gray-900">
                          <div className="flex items-center gap-1.5">
                            <span>{row.name}</span>
                            {isCurrent && (
                              <span
                                className={`text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-full border ${style.chip}`}
                              >
                                You
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-3 py-2 text-gray-700">
                          {formatTierVolumeLabel(row, index)}
                        </td>
                        <td className="px-3 py-2 text-gray-700">
                          {row.ratePct}%
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-1">
                            <Gem size={12} className="text-purple-600" />
                            <span className="font-semibold text-purple-700">
                              {gemsPer1K != null
                                ? gemsPer1K.toFixed(2)
                                : "—"}
                            </span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <p className="text-[10px] text-gray-600 mt-2 italic">
              * Lifetime volume is cumulative across all portfolio transactions
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
