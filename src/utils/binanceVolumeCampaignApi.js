import { apiCall } from "./api";
import {
  BINANCE_VOLUME_CAMPAIGN_API_PATH,
  BINANCE_VOLUME_MILESTONES,
} from "../constants/binanceVolumeCampaign";

const EVM_ADDRESS_RE = /^0x[a-fA-F0-9]{40}$/;

export function isValidEvmAddress(value) {
  return typeof value === "string" && EVM_ADDRESS_RE.test(value.trim());
}

function toNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function pickMilestoneCompleted(raw, milestone) {
  if (raw == null || typeof raw !== "object") return null;
  const keys = [
    milestone.id,
    `milestone_${milestone.threshold}`,
    `volume_${milestone.threshold}`,
    `usd_${milestone.threshold}`,
    String(milestone.threshold),
  ];
  for (const key of keys) {
    if (key in raw) return Boolean(raw[key]);
  }
  return null;
}

function normalizeMilestones(totalVolume, rawMilestones) {
  return BINANCE_VOLUME_MILESTONES.map((milestone, index) => {
    const fromApi = Array.isArray(rawMilestones)
      ? rawMilestones.find(
          (row) =>
            toNumber(row?.threshold ?? row?.volume ?? row?.amount) ===
            milestone.threshold,
        )
      : pickMilestoneCompleted(rawMilestones, milestone) != null
        ? { completed: pickMilestoneCompleted(rawMilestones, milestone) }
        : null;

    const completedExplicit =
      fromApi?.completed ??
      fromApi?.isCompleted ??
      fromApi?.done ??
      fromApi?.achieved;
    const completed =
      completedExplicit != null
        ? Boolean(completedExplicit)
        : totalVolume >= milestone.threshold;

    const prevThreshold =
      index > 0 ? BINANCE_VOLUME_MILESTONES[index - 1].threshold : 0;
    const remaining = Math.max(0, milestone.threshold - totalVolume);
    const span = milestone.threshold - prevThreshold;
    const progressInTier = completed
      ? 100
      : Math.min(
          100,
          Math.max(
            0,
            span > 0
              ? ((totalVolume - prevThreshold) / span) * 100
              : (totalVolume / milestone.threshold) * 100,
          ),
        );

    const rewardUsd = toNumber(
      fromApi?.rewardUsd ?? fromApi?.reward ?? fromApi?.rewardAmount,
      milestone.rewardUsd,
    );

    const isNextIncomplete =
      !completed &&
      BINANCE_VOLUME_MILESTONES.slice(0, index).every(
        (m) => totalVolume >= m.threshold,
      );

    let status = "pending";
    if (completed) status = "completed";
    else if (isNextIncomplete && totalVolume > prevThreshold) status = "in_progress";
    else if (isNextIncomplete) status = "in_progress";

    return {
      ...milestone,
      completed,
      status,
      remainingUsd: completed ? 0 : remaining,
      progressPct: completed ? 100 : progressInTier,
      rewardUsd,
    };
  });
}

export function normalizeBinanceVolumePayload(payload, walletAddress) {
  const root = payload?.data ?? payload ?? {};
  const totalVolume = toNumber(
    root.totalVolume ??
      root.volumeUsd ??
      root.tradingVolume ??
      root.volume ??
      root.totalUsdVolume,
  );

  const rawMilestones =
    root.milestones ?? root.volumeMilestones ?? root.tasks ?? root;

  const milestones = normalizeMilestones(totalVolume, rawMilestones);
  const completedCount = milestones.filter((m) => m.completed).length;
  const totalRewardsEarned = toNumber(
    root.totalRewardsEarned ??
      root.rewardsEarned ??
      root.totalRewardUsd ??
      milestones
        .filter((m) => m.completed)
        .reduce((sum, m) => sum + m.rewardUsd, 0),
  );

  const maxThreshold =
    BINANCE_VOLUME_MILESTONES[BINANCE_VOLUME_MILESTONES.length - 1].threshold;
  const overallProgressPct = Math.min(
    100,
    maxThreshold > 0 ? (totalVolume / maxThreshold) * 100 : 0,
  );

  return {
    wallet: root.wallet ?? root.walletAddress ?? root.address ?? walletAddress,
    totalVolumeUsd: totalVolume,
    milestones,
    completedCount,
    totalMilestones: BINANCE_VOLUME_MILESTONES.length,
    totalRewardsEarned,
    overallProgressPct,
    found: root.found !== false,
  };
}

export async function fetchBinanceVolumeStatus(walletAddress, options = {}) {
  const wallet = walletAddress.trim();
  if (!isValidEvmAddress(wallet)) {
    throw {
      status: 400,
      message: "Enter a valid EVM wallet address (0x…).",
      data: null,
    };
  }

  if (options.useMock) {
    const { fetchBinanceVolumeStatusMock, resolveMockScenarioKey } =
      await import("./binanceVolumeCampaignMock");
    const scenarioKey = resolveMockScenarioKey(wallet, options.mockScenario);
    return fetchBinanceVolumeStatusMock(wallet, scenarioKey);
  }

  const encoded = encodeURIComponent(wallet);
  const payload = await apiCall(
    `${BINANCE_VOLUME_CAMPAIGN_API_PATH}?wallet=${encoded}`,
  );
  return normalizeBinanceVolumePayload(payload, wallet);
}
