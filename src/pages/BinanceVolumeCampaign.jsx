import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router";
import { useSelector } from "react-redux";
import {
  Search,
  Wallet,
  CheckCircle2,
  Clock,
  Circle,
  Loader2,
  AlertCircle,
  TrendingUp,
  Gift,
  Target,
} from "lucide-react";
import getFormattedNumber from "../hooks/get-formatted-number";
import { shortAddress } from "../hooks/shortAddress";
import {
  fetchBinanceVolumeStatus,
  isValidEvmAddress,
} from "../utils/binanceVolumeCampaignApi";
import {
  BINANCE_VOLUME_MOCK_SCENARIOS,
  resolveMockScenarioKey,
  shouldUseBinanceVolumeMock,
} from "../utils/binanceVolumeCampaignMock";

function formatUsd(value) {
  return `$${getFormattedNumber(value, value >= 1000 ? 0 : 2)}`;
}

function MilestoneStatusIcon({ status }) {
  if (status === "completed") {
    return (
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
        <CheckCircle2 className="h-5 w-5" />
      </div>
    );
  }
  if (status === "in_progress") {
    return (
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 text-amber-600 animate-pulse">
        <Clock className="h-5 w-5" />
      </div>
    );
  }
  return (
    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-gray-400">
      <Circle className="h-5 w-5" />
    </div>
  );
}

function ProgressBar({ value, className = "" }) {
  const pct = Math.min(100, Math.max(0, value));
  return (
    <div
      className={`h-2 w-full overflow-hidden rounded-full bg-gray-200/80 ${className}`}
    >
      <div
        className="h-full rounded-full bg-gradient-to-r from-amber-400 to-orange-500 transition-all duration-700 ease-out"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

function MilestoneCard({ milestone }) {
  const statusLabel =
    milestone.status === "completed"
      ? "Completed"
      : milestone.status === "in_progress"
        ? "In progress"
        : "Not started";

  return (
    <div
      className={`glass-card p-5 transition-all duration-300 ${
        milestone.completed
          ? "ring-1 ring-emerald-200/80"
          : milestone.status === "in_progress"
            ? "ring-1 ring-amber-200/80"
            : ""
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <MilestoneStatusIcon status={milestone.status} />
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
              {statusLabel}
            </p>
            <h3 className="text-lg font-bold text-gray-900">
              {milestone.label} volume
            </h3>
          </div>
        </div>
        <div className="rounded-xl bg-amber-50 px-3 py-1.5 text-right">
          <p className="text-[10px] uppercase tracking-wide text-amber-700/80">
            Reward
          </p>
          <p className="text-sm font-bold text-amber-800">
            {formatUsd(milestone.rewardUsd)}
          </p>
        </div>
      </div>

      {!milestone.completed && (
        <div className="space-y-2">
          <div className="flex justify-between text-xs text-gray-600">
            <span>Progress</span>
            <span>{Math.round(milestone.progressPct)}%</span>
          </div>
          <ProgressBar value={milestone.progressPct} />
          <p className="text-xs text-gray-500">
            {milestone.remainingUsd > 0 ? (
              <>
                <span className="font-medium text-gray-700">
                  {formatUsd(milestone.remainingUsd)}
                </span>{" "}
                remaining to unlock
              </>
            ) : (
              "Almost there — keep trading!"
            )}
          </p>
        </div>
      )}

      {/* {milestone.completed && (
        <p className="text-sm font-medium text-emerald-700">
          Milestone reached — reward eligible
        </p>
      )} */}
    </div>
  );
}

const DEMO_WALLET = "0x1234567890123456789012345678901234567893";

export function BinanceVolumeCampaignPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const useMock = shouldUseBinanceVolumeMock(searchParams);
  const connectedAddress = useSelector((state) => state.wallet.address);
  const [walletInput, setWalletInput] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [hasSearched, setHasSearched] = useState(false);

  const activeMockScenario = resolveMockScenarioKey(
    walletInput || DEMO_WALLET,
    searchParams.get("mock"),
  );

  const setMockScenario = (scenario) => {
    const next = new URLSearchParams(searchParams);
    next.set("mock", scenario);
    setSearchParams(next, { replace: true });
  };

  const handleUseConnected = useCallback(() => {
    if (connectedAddress) setWalletInput(connectedAddress);
  }, [connectedAddress]);

  useEffect(() => {
    const fromUrl =
      searchParams.get("wallet") ?? searchParams.get("address") ?? "";
    if (fromUrl && isValidEvmAddress(fromUrl)) {
      setWalletInput(fromUrl);
    }
  }, [searchParams]);

  const runVerification = useCallback(
    async (addressOverride) => {
      const address = (addressOverride ?? walletInput).trim();
      setError(null);
      setHasSearched(true);

      if (!isValidEvmAddress(address)) {
        setResult(null);
        setError(
          "Enter a valid Binance wallet address (0x followed by 40 hex characters).",
        );
        return;
      }

      setLoading(true);
      try {
        const data = await fetchBinanceVolumeStatus(address, {
          useMock,
          mockScenario: searchParams.get("mock"),
        });
        if (data.found === false) {
          setResult(null);
          setError(
            "This wallet was not found in the campaign. Trade on AlloX with your Binance Wallet to participate.",
          );
          return;
        }
        setResult(data);
      } catch (err) {
        setResult(null);
        if (err?.status === 404) {
          setError(
            "Wallet not found in the campaign system. Confirm you used Binance Wallet on AlloX.",
          );
        } else {
          setError(
            err?.message ||
              "Unable to verify this wallet right now. Please try again shortly.",
          );
        }
      } finally {
        setLoading(false);
      }
    },
    [walletInput, useMock, searchParams],
  );

  const handleSubmit = (e) => {
    e.preventDefault();
    runVerification();
  };

  const summary = useMemo(() => {
    if (!result) return null;
    return {
      volume: formatUsd(result.totalVolumeUsd),
      milestones: `${result.completedCount}/${result.totalMilestones}`,
      rewards: formatUsd(result.totalRewardsEarned),
      progress: Math.round(result.overallProgressPct),
    };
  }, [result]);

  return (
    <div className="space-y-6 flex-1 px-4 sm:px-6 py-8 portfolio-wrapper ms-auto w-full overflow-y-auto">
      <div className="mx-auto max-w-3xl space-y-6">
        <header className="space-y-2 text-center sm:text-left">
          {/* <div className="inline-flex items-center gap-2 rounded-full border border-amber-200/60 bg-amber-50/80 px-3 py-1 text-xs font-semibold text-amber-800">
            <img
              src="https://cdn.allox.ai/allox/wallets/binanceWallet.svg"
              alt=""
              className="h-4 w-4"
            />
            Binance Wallet × AlloX
          </div> */}
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
            Binance Wallet Campaign Verification
          </h1>
          <p className="text-gray-600 text-sm sm:text-base">
            Check trading volume milestones and reward eligibility for your
            Binance Wallet address.
          </p>
        </header>

        {useMock && (
          <div className="rounded-2xl border border-amber-300/60 bg-amber-50/90 p-4 space-y-3">
            <p className="text-sm font-semibold text-amber-900">
              Demo mode — mock data (no API)
            </p>
            <p className="text-xs text-amber-800/90">
              Sample responses are enabled. Choose a scenario, click Fill demo
              wallet, then Verify. Add{" "}
              <code className="rounded bg-white/70 px-1">?live=1</code> to call
              the real API when it is ready.
            </p>
            <div className="flex flex-wrap gap-2">
              {Object.entries(BINANCE_VOLUME_MOCK_SCENARIOS).map(([key, cfg]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setMockScenario(key)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                    activeMockScenario === key
                      ? "bg-amber-600 text-white shadow-sm"
                      : "bg-white/80 text-amber-900 hover:bg-white"
                  }`}
                >
                  {cfg.label}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setWalletInput(DEMO_WALLET)}
              className="text-xs font-medium text-amber-800 underline-offset-2 hover:underline"
            >
              Fill demo wallet ({shortAddress(DEMO_WALLET)})
            </button>
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className="glass-card p-5 sm:p-6 space-y-4"
        >
          <label
            htmlFor="binance-wallet-input"
            className="block text-sm font-semibold text-gray-900"
          >
            Binance wallet address
          </label>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Wallet className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
              <input
                id="binance-wallet-input"
                type="text"
                value={walletInput}
                onChange={(e) => setWalletInput(e.target.value)}
                placeholder="0x…"
                autoComplete="off"
                spellCheck={false}
                className="w-full rounded-xl border border-white/80 bg-white/70 py-3 pl-11 pr-4 text-sm text-gray-900 shadow-inner backdrop-blur-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-400/50"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 px-6 py-3 text-sm font-semibold text-white shadow-md transition hover:from-amber-600 hover:to-orange-600 disabled:opacity-60"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Verifying…
                </>
              ) : (
                <>
                  <Search className="h-4 w-4" />
                  Verify
                </>
              )}
            </button>
          </div>

          {connectedAddress && (
            <button
              type="button"
              onClick={handleUseConnected}
              className="text-xs font-medium text-amber-700 hover:text-amber-800 underline-offset-2 hover:underline"
            >
              Use connected wallet ({shortAddress(connectedAddress)})
            </button>
          )}
        </form>

        {error && (
          <div
            role="alert"
            className="flex gap-3 rounded-2xl border border-red-200/80 bg-red-50/90 p-4 text-sm text-red-800"
          >
            <AlertCircle className="h-5 w-5 shrink-0" />
            <p>{error}</p>
          </div>
        )}

        {loading && (
          <div className="glass-card flex flex-col items-center justify-center gap-3 p-12 text-gray-600">
            <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
            <p className="text-sm font-medium">Checking volume milestones…</p>
          </div>
        )}

        {!loading && result && summary && (
          <>
            <div className="glass-card p-5 sm:p-6 space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <Target className="h-5 w-5 text-amber-600" />
                  Summary
                </h2>
                <span className="text-xs font-mono text-gray-500 bg-white/60 px-2 py-1 rounded-lg">
                  {shortAddress(result.wallet)}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="rounded-xl bg-white/60 p-3 backdrop-blur-sm">
                  <p className="text-[10px] uppercase tracking-wide text-gray-500 mb-1 flex items-center gap-1">
                    <TrendingUp className="h-3 w-3" />
                    Total volume
                  </p>
                  <p className="text-lg font-bold text-gray-900">
                    {summary.volume}
                  </p>
                </div>
                <div className="rounded-xl bg-white/60 p-3 backdrop-blur-sm">
                  <p className="text-[10px] uppercase tracking-wide text-gray-500 mb-1">
                    Milestones
                  </p>
                  <p className="text-lg font-bold text-gray-900">
                    {summary.milestones}
                  </p>
                </div>
                <div className="rounded-xl bg-white/60 p-3 backdrop-blur-sm">
                  <p className="text-[10px] uppercase tracking-wide text-gray-500 mb-1">
                    Overall progress
                  </p>
                  <p className="text-lg font-bold text-gray-900">
                    {summary.progress}%
                  </p>
                </div>
                <div className="rounded-xl bg-white/60 p-3 backdrop-blur-sm col-span-2 sm:col-span-1">
                  <p className="text-[10px] uppercase tracking-wide text-gray-500 mb-1 flex items-center gap-1">
                    <Gift className="h-3 w-3" />
                    Rewards earned
                  </p>
                  <p className="text-lg font-bold text-emerald-700">
                    {summary.rewards}
                  </p>
                </div>
              </div>

              <div>
                <div className="mb-2 flex justify-between text-xs text-gray-600">
                  <span>Campaign completion</span>
                  <span>
                    {result.completedCount} of {result.totalMilestones}{" "}
                    milestones
                  </span>
                </div>
                <ProgressBar
                  value={result.overallProgressPct}
                  className="h-3"
                />
              </div>
            </div>

            <div className="space-y-3">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500 px-1">
                Volume milestones
              </h2>
              <div className="grid gap-4 sm:grid-cols-2">
                {result.milestones.map((milestone) => (
                  <MilestoneCard key={milestone.id} milestone={milestone} />
                ))}
              </div>
            </div>
          </>
        )}

        {!loading && !result && hasSearched && !error && null}

        {!hasSearched && !loading && (
          <p className="text-center text-xs text-gray-500 px-4">
            Enter your Binance Wallet address to see milestone status. This page
            is not listed in navigation — share the link with campaign
            participants.
          </p>
        )}
      </div>
    </div>
  );
}
