import { useState } from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";
import { Check, Lock, Gift, X } from "lucide-react";

const DEFAULT_REWARDS = [500, 1000, 1500, 2000, 2500, 4000, 5000].map(
  (points, i) => ({
    day: i + 1,
    points,
    claimed: false,
    current: i === 0,
    locked: i > 0,
  })
);

function formatTimeUntil(seconds) {
  if (seconds == null || seconds < 0) return "";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export function CheckinModal({
  open,
  onClose,
  status,
  claim,
  fetchStatus,
  loading,
}) {
  const [claiming, setClaiming] = useState(false);
  const rewards = status?.rewards ?? DEFAULT_REWARDS;
  const canCheckIn = status?.canCheckIn === true;
  const secondsUntilReset = status?.secondsUntilReset ?? 0;
  const totalPointsEarned = status?.totalPointsEarned ?? 0;
  const lifetimeCheckIns = status?.lifetimeCheckIns ?? 0;

  const handleClaim = async () => {
    const currentReward = rewards.find((r) => r.current && !r.claimed);
    if (!currentReward || !canCheckIn) return;
    setClaiming(true);
    try {
      await claim();
      toast.success(`Day ${currentReward.day} claimed! +${currentReward.points} points.`);
      await fetchStatus();
    } catch (err) {
      const msg =
        err?.message ||
        err?.data?.message ||
        (typeof err?.data?.error === "string" ? err.data.error : "Claim failed");
      toast.error(msg);
    } finally {
      setClaiming(false);
    }
  };

  if (!open) return null;

  const modalContent = (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="checkin-modal-title"
    >
      {/* Backdrop - covers header, sidebar, chat input, everything */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-md"
        onClick={onClose}
      />

      {/* Popup content */}
      <div
        className="relative z-10 glass-card w-full max-w-md p-6 animate-in fade-in-0 zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2
            id="checkin-modal-title"
            className="flex items-center gap-2 text-lg font-semibold text-neutral-900"
          >
            <Gift className="size-5 text-amber-500" />
            Daily Check-in
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-black/5 transition-colors text-neutral-500 hover:text-neutral-700"
            aria-label="Close"
          >
            <X className="size-5" />
          </button>
        </div>

        <p className="text-sm text-neutral-600 mb-4">
          Claim your daily reward. Consecutive days earn more points (Day 1–7: 500 → 5,000).
        </p>

        <div className="space-y-4">
          {(lifetimeCheckIns > 0 || totalPointsEarned > 0) && (
            <div className="flex gap-4 text-sm text-neutral-600">
              {lifetimeCheckIns > 0 && (
                <span>Check-ins: {lifetimeCheckIns}</span>
              )}
              {totalPointsEarned > 0 && (
                <span>Total points: {totalPointsEarned.toLocaleString()}</span>
              )}
            </div>
          )}

          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
            {rewards.map((reward) => {
              const isClaimed = reward.claimed;
              const isCurrent = reward.current && !reward.claimed;
              const isLocked = reward.locked;

              return (
                <button
                  key={reward.day}
                  type="button"
                  onClick={isCurrent ? handleClaim : undefined}
                  disabled={!isCurrent || claiming || loading}
                  className={`
                    relative flex flex-col items-center justify-center rounded-xl border-2 p-3 min-h-[72px] transition-all
                    ${isClaimed
                      ? "border-emerald-200 bg-emerald-50/80 text-emerald-700 cursor-default"
                      : isCurrent
                        ? "border-purple-500 bg-purple-50 text-purple-700 hover:bg-purple-100 hover:border-purple-600 hover:shadow-md cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                        : isLocked
                          ? "border-neutral-200 bg-neutral-50 text-neutral-400 cursor-not-allowed"
                          : "border-neutral-200 bg-neutral-50 text-neutral-500 cursor-default"
                    }
                  `}
                >
                  <span className="text-xs font-medium text-neutral-500 mb-0.5">
                    Day {reward.day}
                  </span>
                  <span className="font-bold text-sm tabular-nums">
                    {reward.points.toLocaleString()}
                  </span>
                  <span className="text-[10px] text-neutral-400">pts</span>
                  {isClaimed && (
                    <span className="absolute top-1.5 right-1.5 text-emerald-600">
                      <Check className="size-3.5" strokeWidth={2.5} />
                    </span>
                  )}
                  {isLocked && !isClaimed && (
                    <span className="absolute top-1.5 right-1.5 text-neutral-400">
                      <Lock className="size-3.5" />
                    </span>
                  )}
                  {isCurrent && (
                    <span className="mt-1 text-[10px] font-semibold text-purple-600">
                      {claiming || loading ? "Claiming…" : "Claim"}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {secondsUntilReset > 0 && (
            <p className="text-center text-xs text-neutral-500">
              Resets in {formatTimeUntil(secondsUntilReset)}
            </p>
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
