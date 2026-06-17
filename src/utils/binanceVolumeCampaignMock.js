import { normalizeBinanceVolumePayload } from "./binanceVolumeCampaignApi";

export const BINANCE_VOLUME_MOCK_SCENARIOS = {
  partial: {
    label: "In progress ($750)",
    description: "2 milestones done, working toward $1,000",
    totalVolume: 750,
    found: true,
  },
  early: {
    label: "Just started ($45)",
    description: "First milestone in progress",
    totalVolume: 45,
    found: true,
  },
  zero: {
    label: "No volume yet",
    description: "Wallet enrolled, no trades yet",
    totalVolume: 0,
    found: true,
  },
  complete: {
    label: "All complete ($6,200)",
    description: "Every milestone unlocked",
    totalVolume: 6200,
    found: true,
  },
  notfound: {
    label: "Wallet not found",
    description: "Shows the not-found error state",
    found: false,
  },
};

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export function resolveMockScenarioKey(walletAddress, override) {
  const key = (override ?? "").trim().toLowerCase();
  if (key && key !== "1" && key !== "true" && BINANCE_VOLUME_MOCK_SCENARIOS[key]) {
    return key;
  }

  const last = walletAddress.slice(-1).toLowerCase();
  if (last === "0") return "notfound";
  if (last === "1") return "zero";
  if (last === "2") return "early";
  if (last === "3") return "partial";
  if (last === "4" || last === "5") return "complete";
  return "partial";
}

export function shouldUseBinanceVolumeMock(searchParams) {
  if (searchParams?.get("live") === "1") return false;
  const mock = searchParams?.get("mock");
  if (mock === "0" || mock === "false") return false;
  if (mock) return true;
  if (import.meta.env.VITE_BINANCE_VOLUME_MOCK === "true") return true;
  return import.meta.env.DEV;
}

export async function fetchBinanceVolumeStatusMock(walletAddress, scenarioKey) {
  await delay(700);

  const scenario =
    BINANCE_VOLUME_MOCK_SCENARIOS[scenarioKey] ??
    BINANCE_VOLUME_MOCK_SCENARIOS.partial;

  if (scenario.found === false) {
    return normalizeBinanceVolumePayload(
      { found: false, wallet: walletAddress },
      walletAddress,
    );
  }

  return normalizeBinanceVolumePayload(
    {
      found: true,
      wallet: walletAddress,
      totalVolume: scenario.totalVolume,
      totalRewardsEarned: undefined,
    },
    walletAddress,
  );
}
