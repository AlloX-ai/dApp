import { Info } from "lucide-react";
import {
  BINANCE_CAMPAIGN_CHECKIN_NOTICE,
  BINANCE_CAMPAIGN_CHECKIN_NOTICE_DETAIL,
} from "../utils/binanceCampaign";

export function BinanceCampaignCheckinNotice({
  progress = null,
  compact = false,
  className = "",
}) {
  const completed = progress?.completed;
  const required = progress?.requiredCheckIns;
  const showProgress =
    progress != null &&
    Number.isFinite(completed) &&
    Number.isFinite(required);

  return (
    <div
      className={`rounded-xl border border-orange-200/80 bg-orange-50/80 text-orange-950 ${compact ? "px-3 py-2.5" : "px-4 py-3"} ${className}`}
    >
      <div className="flex items-start gap-2.5">
        <Info
          size={compact ? 16 : 18}
          className="shrink-0 mt-0.5 text-orange-700"
        />
        <div className="min-w-0 space-y-1">
          <p className={`${compact ? "text-xs" : "text-sm"} leading-relaxed`}>
            {BINANCE_CAMPAIGN_CHECKIN_NOTICE}
          </p>
          <p
            className={`${compact ? "text-[11px]" : "text-xs"} text-orange-800/90`}
          >
            {BINANCE_CAMPAIGN_CHECKIN_NOTICE_DETAIL}
          </p>
          {showProgress && (
            <p
              className={`${compact ? "text-[11px]" : "text-xs"} font-semibold text-orange-900 pt-0.5`}
            >
              Campaign check-ins: {completed}/{required}
              {progress.qualified ? " · Qualified" : ""}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
