import {
  Connection,
  PublicKey,
  SystemProgram,
  Transaction,
} from "@solana/web3.js";
import {
  TOKEN_PROGRAM_ID,
  createAssociatedTokenAccountInstruction,
  createTransferInstruction,
  getAssociatedTokenAddressSync,
} from "@solana/spl-token";
import {
  getAccount,
  getPublicClient,
  waitForTransactionReceipt,
} from "@wagmi/core";
import {
  encodeFunctionData,
  formatEther,
  formatUnits,
  parseAbi,
  type Address,
} from "viem";
import { apiCall } from "./api";
import { wagmiClient } from "../wagmiConnectors";
import { SOLANA_PAYMENT_WALLET } from "../constants/addresses";
import {
  BUY_MESSAGES_ABI,
  buy_messages_base_address,
  buy_messages_bnb_address,
  buy_messages_eth_address,
} from "../constants/contracts";

const erc20Abi = parseAbi([
  "function approve(address spender, uint256 amount) returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function decimals() view returns (uint8)",
]);

export type MessageChainKey = "ethereum" | "bnb" | "base" | "solana";

export type MessagePackage = {
  id: number;
  messages: number;
  priceUSD?: number;
  /** Optional Solana pricing from API (no on-chain contract). */
  solana?: {
    nativeLamports?: string;
    spl?: Record<
      string,
      { mint: string; amount: string }
    >;
  };
};

/** API may send `native: { symbol, decimals }`, EVM `USDT: { address }`, or Solana SPL `USDT: { mint, decimals }`. */
export type ChainTokenMeta =
  | string
  | {
      symbol?: string;
      decimals?: number;
      /** EVM token contract */
      address?: string;
      /** Solana SPL mint (base58) */
      mint?: string;
    };

export type MessagesChains = Partial<
  Record<
    MessageChainKey,
    {
      contract?: string;
      tokens?: Record<string, ChainTokenMeta>;
      paymentWallet?: string;
      /** e.g. per-package Solana amounts if not on each package */
      packagePricing?: Record<
        string,
        {
          nativeLamports?: string;
          spl?: Record<string, { mint: string; amount: string }>;
        }
      >;
    }
  >
>;

export type MessagesPackagesResponse = {
  packages: MessagePackage[];
  chains?: MessagesChains;
};

const CHAIN_KEY_TO_WAGMI_ID: Record<Exclude<MessageChainKey, "solana">, number> =
  {
    ethereum: 1,
    bnb: 56,
    base: 8453,
  };

/** Aligns with NetworkSelector numeric IDs (EVM + Solana mainnet). */
export function getEvmChainNumericIdForMessageChainKey(
  key: Exclude<MessageChainKey, "solana">,
): number {
  return CHAIN_KEY_TO_WAGMI_ID[key];
}

export function messageChainKeyFromWalletChainId(
  chainId: number | null | undefined,
): MessageChainKey | null {
  if (chainId == null) return null;
  const map: Record<number, MessageChainKey> = {
    1: "ethereum",
    56: "bnb",
    8453: "base",
    101: "solana",
  };
  return map[chainId] ?? null;
}

const FALLBACK_EVM_CONTRACT: Record<Exclude<MessageChainKey, "solana">, string> =
  {
    ethereum: buy_messages_eth_address,
    bnb: buy_messages_bnb_address,
    base: buy_messages_base_address,
  };

const CHAIN_ICONS: Record<MessageChainKey, string> = {
  ethereum: "https://cdn.allox.ai/allox/networks/eth.svg",
  bnb: "https://cdn.allox.ai/allox/networks/bnbIcon.svg",
  base: "https://cdn.allox.ai/allox/networks/base.svg",
  solana: "https://cdn.allox.ai/allox/networks/solana.svg",
};

const CHAIN_LABELS: Record<MessageChainKey, string> = {
  ethereum: "Ethereum",
  bnb: "BNB Chain",
  base: "Base",
  solana: "Solana",
};

export function getChainLabel(key: MessageChainKey): string {
  return CHAIN_LABELS[key] ?? key;
}

export function getChainIcon(key: MessageChainKey): string {
  return CHAIN_ICONS[key];
}

export function listChainKeysFromPayload(
  chains: MessagesChains | undefined,
): MessageChainKey[] {
  const preferred: MessageChainKey[] = ["bnb", "ethereum", "base", "solana"];
  if (!chains || Object.keys(chains).length === 0) return preferred;
  const keys = Object.keys(chains);
  const set = new Set<MessageChainKey>();
  for (const k of keys) {
    const lower = k.toLowerCase();
    if (lower === "solana") set.add("solana");
    else if (preferred.includes(k as MessageChainKey)) {
      set.add(k as MessageChainKey);
    }
  }
  return preferred.filter((k) => set.has(k));
}

export function resolveEvmContract(
  chainKey: Exclude<MessageChainKey, "solana">,
  chains: MessagesChains | undefined,
): Address {
  const fromApi = chains?.[chainKey]?.contract;
  if (fromApi && /^0x[a-fA-F0-9]{40}$/.test(fromApi)) {
    return fromApi as Address;
  }
  return FALLBACK_EVM_CONTRACT[chainKey] as Address;
}

/**
 * API may send `chains.solana` or `chains.Solana` (or other casings).
 */
export function chainsSolanaBlock(
  chains: MessagesChains | undefined,
): MessagesChains["solana"] | undefined {
  if (!chains) return undefined;
  const c = chains as Record<string, unknown>;
  return (
    chains.solana ??
    (c.Solana as MessagesChains["solana"] | undefined) ??
    (c.SOLANA as MessagesChains["solana"] | undefined)
  );
}

export function resolveSolanaPaymentWallet(
  chains: MessagesChains | undefined,
): string {
  const w = chainsSolanaBlock(chains)?.paymentWallet || SOLANA_PAYMENT_WALLET;
  return typeof w === "string" ? w.trim() : "";
}

export async function fetchMessagePackages(): Promise<MessagesPackagesResponse> {
  const raw = (await apiCall("/messages/packages")) as Record<string, unknown>;
  if (raw && Array.isArray(raw.packages)) {
    return raw as unknown as MessagesPackagesResponse;
  }
  const inner = raw?.data as Record<string, unknown> | undefined;
  if (inner && Array.isArray(inner.packages)) {
    return inner as unknown as MessagesPackagesResponse;
  }
  return raw as unknown as MessagesPackagesResponse;
}

export async function postMessagePurchase(body: {
  txHash: string;
  chain: MessageChainKey;
  packageId: number;
  token: string;
}) {
  return apiCall("/messages/purchase", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function nativeSymbolForChain(
  chainKey: Exclude<MessageChainKey, "solana">,
): string {
  if (chainKey === "bnb") return "BNB";
  return "ETH";
}

export type TokenOption = {
  symbol: string;
  /** EVM native coin */
  type: "native" | "erc20" | "sol" | "spl";
};

function entrySymbol(key: string, meta: ChainTokenMeta | undefined): string {
  if (meta && typeof meta === "object" && meta.symbol) {
    return String(meta.symbol).toUpperCase();
  }
  return key.toUpperCase();
}

export function tokenOptionsForChain(
  chainKey: MessageChainKey,
  chains: MessagesChains | undefined,
): TokenOption[] {
  if (chainKey === "solana") {
    const t = (chainsSolanaBlock(chains)?.tokens ?? {}) as Record<
      string,
      ChainTokenMeta
    >;
    const nativeMeta = t.native;
    let nativeSym = "SOL";
    if (nativeMeta && typeof nativeMeta === "object" && nativeMeta.symbol) {
      nativeSym = String(nativeMeta.symbol).toUpperCase();
    }
    return [
      { symbol: nativeSym, type: "sol" },
      { symbol: "SPL", type: "spl" },
    ];
  }

  const t = (chains?.[chainKey]?.tokens ?? {}) as Record<string, ChainTokenMeta>;
  const nativeMeta = t.native;
  let nativeSym = nativeSymbolForChain(chainKey);
  if (nativeMeta && typeof nativeMeta === "object" && nativeMeta.symbol) {
    nativeSym = String(nativeMeta.symbol).toUpperCase();
  }

  const opts: TokenOption[] = [{ symbol: nativeSym, type: "native" }];

  for (const key of Object.keys(t)) {
    if (key.toLowerCase() === "native") continue;
    const sym = entrySymbol(key, t[key]);
    if (sym === nativeSym) continue;
    opts.push({ symbol: sym, type: "erc20" });
  }
  return opts;
}

/** Native SOL symbol shown in the UI (from API or default). */
export function solanaNativeSymbolFromChains(
  chains: MessagesChains | undefined,
): string {
  const t = chainsSolanaBlock(chains)?.tokens?.native;
  if (t && typeof t === "object" && t.symbol) {
    return String(t.symbol).toUpperCase();
  }
  return "SOL";
}

type SolanaPackagePricingRow = {
  nativeLamports?: string | number;
  spl?: Record<string, { mint?: string; amount?: string | number }>;
};

/** Per-package Solana amounts on `chains` (several API spellings). */
function solanaPackagePricingRaw(
  sol: MessagesChains["solana"] | undefined,
): unknown {
  if (!sol) return undefined;
  const s = sol as Record<string, unknown>;
  return (
    s.packagePricing ??
    s.packages ??
    s.pricing ??
    s.package_prices ??
    s.packagePrices
  );
}

function matchPackagePricingRow(
  pkg: MessagePackage,
  row: unknown,
): SolanaPackagePricingRow | undefined {
  if (!row || typeof row !== "object" || Array.isArray(row)) return undefined;
  const r = row as Record<string, unknown>;
  const packageId = r.packageId ?? r.package_id ?? r.packageID;
  if (packageId != null && Number(packageId) === Number(pkg.id)) {
    return row as SolanaPackagePricingRow;
  }
  const msgs = r.messages ?? r.messageCount ?? r.message_count;
  if (msgs != null && Number(msgs) === Number(pkg.messages)) {
    return row as SolanaPackagePricingRow;
  }
  const id = r.id;
  if (id != null && Number(id) === Number(pkg.id)) {
    return row as SolanaPackagePricingRow;
  }
  return undefined;
}

function getSolanaPackagePricingRow(
  pkg: MessagePackage,
  chains: MessagesChains | undefined,
): SolanaPackagePricingRow | undefined {
  const sol = chainsSolanaBlock(chains);
  const raw = solanaPackagePricingRaw(sol);
  if (raw == null) return undefined;

  if (Array.isArray(raw)) {
    for (const row of raw) {
      const m = matchPackagePricingRow(pkg, row);
      if (m) return m;
    }
    return undefined;
  }

  if (typeof raw === "object" && !Array.isArray(raw)) {
    const pp = raw as Record<string, unknown>;
    const tryKeys = [
      String(pkg.id),
      String(Number(pkg.id)),
      String(pkg.messages),
      String(Number(pkg.messages)),
      `package_${pkg.id}`,
      `package-${pkg.id}`,
      `pkg_${pkg.id}`,
      `id_${pkg.id}`,
    ];
    for (const k of tryKeys) {
      const row = pp[k];
      if (row && typeof row === "object" && !Array.isArray(row)) {
        return row as SolanaPackagePricingRow;
      }
    }
    for (const row of Object.values(pp)) {
      const m = matchPackagePricingRow(pkg, row);
      if (m) return m;
    }
  }
  return undefined;
}

/** Package-level Solana block (`pkg.solana` or API aliases). */
function solanaFromPackage(
  pkg: MessagePackage,
): MessagePackage["solana"] | undefined {
  if (pkg.solana != null && typeof pkg.solana === "object") {
    return pkg.solana;
  }
  const p = pkg as Record<string, unknown>;
  const alt = p.solanaPricing ?? p.Solana ?? p.solanaPrice;
  if (alt != null && typeof alt === "object") {
    return alt as MessagePackage["solana"];
  }
  return undefined;
}

/** API may use `nativeLamports`, numeric lamports, or `native` / `native.lamports`. */
function pickNativeLamports(
  sol: MessagePackage["solana"] | undefined,
): string | undefined {
  if (!sol) return undefined;
  const a = sol.nativeLamports;
  if (typeof a === "string" && a.trim() !== "") return a.trim();
  if (typeof a === "number" && Number.isFinite(a)) {
    return String(Math.trunc(a));
  }
  const loose = sol as Record<string, unknown>;
  const n = loose.native;
  if (typeof n === "string" && n.trim() !== "") return n.trim();
  if (typeof n === "number" && Number.isFinite(n)) {
    return String(Math.trunc(n));
  }
  if (n && typeof n === "object") {
    const lam = (n as { lamports?: unknown }).lamports;
    if (typeof lam === "string" && lam.trim() !== "") return lam.trim();
    if (typeof lam === "number" && Number.isFinite(lam)) {
      return String(Math.trunc(lam));
    }
  }
  return undefined;
}

function splRowAmount(
  row: { amount?: unknown; value?: unknown; raw?: unknown } | undefined,
): string | undefined {
  if (!row || typeof row !== "object") return undefined;
  const r = row as Record<string, unknown>;
  const a = r.amount ?? r.value ?? r.rawAmount ?? r.raw;
  if (a == null || a === "") return undefined;
  if (typeof a === "bigint") return a.toString();
  if (typeof a === "number" && Number.isFinite(a)) {
    return String(Math.trunc(a));
  }
  if (typeof a === "string" && a.trim() !== "") return a.trim();
  return undefined;
}

function splRowMint(row: unknown): string | undefined {
  if (!row || typeof row !== "object") return undefined;
  const r = row as Record<string, unknown>;
  const m = r.mint ?? r.address ?? r.tokenMint;
  if (typeof m === "string" && m.length >= 32) return m;
  return undefined;
}

/**
 * Live API often omits `packagePricing` / per-package `solana`; we derive token
 * amounts from `priceUSD` once a SOL/USD rate is cached (see prefetchSolUsdPrice).
 */
let solUsdPriceCache: number | null = null;
let solUsdFetchInFlight: Promise<number | null> | null = null;

/** Used when CoinGecko is unreachable (e.g. CORS) so list-USD → SOL math still runs. */
const FALLBACK_SOL_USD = 150;

export function getCachedSolUsdPrice(): number | null {
  return solUsdPriceCache;
}

/** Fetches SOL/USD (CoinGecko) for deriving lamports from list price. Safe to call often; deduped. */
export async function prefetchSolUsdPrice(): Promise<number | null> {
  if (solUsdPriceCache != null && solUsdPriceCache > 0) {
    return solUsdPriceCache;
  }
  if (solUsdFetchInFlight) return solUsdFetchInFlight;
  solUsdFetchInFlight = (async () => {
    try {
      const r = await fetch(
        "https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd",
      );
      if (!r.ok) return null;
      const j = (await r.json()) as { solana?: { usd?: number } };
      const v = j?.solana?.usd;
      if (typeof v === "number" && Number.isFinite(v) && v > 0) {
        solUsdPriceCache = v;
        return v;
      }
    } catch {
      /* ignore */
    }
    return null;
  })();
  await solUsdFetchInFlight;
  solUsdFetchInFlight = null;
  if (solUsdPriceCache != null && solUsdPriceCache > 0) {
    return solUsdPriceCache;
  }
  solUsdPriceCache = FALLBACK_SOL_USD;
  return solUsdPriceCache;
}

function stableDecimals(meta: ChainTokenMeta | undefined): number {
  if (meta && typeof meta === "object" && typeof meta.decimals === "number") {
    return meta.decimals;
  }
  return 6;
}

/**
 * When the backend only sends `priceUSD` + `chains.solana.tokens` mints (no
 * packagePricing), derive raw lamports / SPL amounts so purchases match list price.
 */
function trySynthesizeSolanaPricingFromListUsd(
  pkg: MessagePackage,
  chains: MessagesChains | undefined,
): MessagePackage["solana"] | undefined {
  const usd = pkg.priceUSD;
  if (usd == null || !Number.isFinite(Number(usd)) || Number(usd) <= 0) {
    return undefined;
  }
  const sol = chainsSolanaBlock(chains);
  if (!sol?.tokens) return undefined;
  const solUsd = solUsdPriceCache;
  if (solUsd == null || !(solUsd > 0)) return undefined;

  const tokens = sol.tokens as Record<string, ChainTokenMeta>;
  const price = Number(usd);

  const lamports = Math.max(1, Math.round((price / solUsd) * 1e9));
  const nativeLamports = String(lamports);

  const spl: Record<string, { mint: string; amount: string }> = {};
  for (const sym of ["SPL", "USDC", "USDT"] as const) {
    const meta = tokens[sym];
    if (!meta || typeof meta !== "object") continue;
    const mint = meta.mint ?? meta.address;
    if (typeof mint !== "string" || mint.length < 32) continue;
    const dec = stableDecimals(meta);
    const raw = Math.max(1, Math.round(price * 10 ** dec));
    spl[sym] = { mint, amount: String(raw) };
  }

  return {
    nativeLamports,
    spl,
  };
}

function mergeSolanaPricing(
  pkg: MessagePackage,
  chains: MessagesChains | undefined,
): MessagePackage["solana"] | undefined {
  const fromPkg = solanaFromPackage(pkg);
  const fromChain = getSolanaPackagePricingRow(pkg, chains);
  if (fromChain || fromPkg) {
    const nativeLamports =
      pickNativeLamports(fromChain as MessagePackage["solana"]) ??
      pickNativeLamports(fromPkg);
    const spl = {
      ...(fromPkg?.spl ?? {}),
      ...(fromChain?.spl ?? {}),
    } as NonNullable<MessagePackage["solana"]>["spl"];
    return {
      ...(fromPkg ?? {}),
      ...(fromChain ?? {}),
      nativeLamports,
      spl,
    };
  }
  return trySynthesizeSolanaPricingFromListUsd(pkg, chains) ?? undefined;
}

export async function readErc20Decimals(
  chainKey: Exclude<MessageChainKey, "solana">,
  tokenAddress: Address,
): Promise<number> {
  const chainId = CHAIN_KEY_TO_WAGMI_ID[chainKey];
  const client = getPublicClient(wagmiClient, { chainId });
  if (!client) throw new Error("Network unavailable");
  return Number(
    await client.readContract({
      address: tokenAddress,
      abi: erc20Abi,
      functionName: "decimals",
    }),
  );
}

export async function readEvmPackagePricing(
  chainKey: Exclude<MessageChainKey, "solana">,
  packageId: number,
  chains: MessagesChains | undefined,
): Promise<{
  nativePrice: bigint;
  tokens: Address[];
  prices: bigint[];
}> {
  const chainId = CHAIN_KEY_TO_WAGMI_ID[chainKey];
  const address = resolveEvmContract(chainKey, chains);
  const client = getPublicClient(wagmiClient, { chainId });
  if (!client) throw new Error("Network unavailable");
  const res = await client.readContract({
    address,
    abi: BUY_MESSAGES_ABI,
    functionName: "getPackagePricing",
    args: [BigInt(packageId)],
  });
  const [nativePrice, tokens, prices] = res as [
    bigint,
    Address[],
    bigint[],
  ];
  return { nativePrice, tokens, prices };
}

function resolveErc20ContractAddress(
  selectedSymbol: string,
  tokenMap: Record<string, ChainTokenMeta> | undefined,
): string | undefined {
  if (!tokenMap) return undefined;
  const sym = selectedSymbol.toUpperCase();
  for (const [key, val] of Object.entries(tokenMap)) {
    if (key.toLowerCase() === "native") continue;
    const entrySym = entrySymbol(key, val);
    if (entrySym !== sym) continue;
    if (typeof val === "string" && /^0x[a-fA-F0-9]{40}$/.test(val)) return val;
    if (val && typeof val === "object" && val.address && /^0x[a-fA-F0-9]{40}$/.test(val.address)) {
      return val.address;
    }
  }
  const legacy = tokenMap[sym] ?? tokenMap[selectedSymbol];
  if (typeof legacy === "string" && /^0x[a-fA-F0-9]{40}$/.test(legacy)) {
    return legacy;
  }
  return undefined;
}

export function findErc20PriceForToken(
  selectedSymbol: string,
  tokenMap: Record<string, ChainTokenMeta> | undefined,
  pricingTokens: Address[],
  pricingPrices: bigint[],
): { address: Address; amount: bigint } | null {
  const addrStr = resolveErc20ContractAddress(selectedSymbol, tokenMap);
  if (!addrStr) return null;
  const want = addrStr.toLowerCase();
  for (let i = 0; i < pricingTokens.length; i++) {
    if (String(pricingTokens[i]).toLowerCase() === want) {
      return { address: pricingTokens[i], amount: pricingPrices[i] };
    }
  }
  return null;
}

export function formatEvmPriceLabel(args: {
  chainKey: Exclude<MessageChainKey, "solana">;
  tokenSymbol: string;
  tokenType: "native" | "erc20";
  nativePrice: bigint;
  erc20?: { amount: bigint; decimals: number } | null;
}): string {
  if (args.tokenType === "native") {
    return `${formatEther(args.nativePrice)} ${args.tokenSymbol}`;
  }
  if (args.erc20) {
    return `${formatUnits(args.erc20.amount, args.erc20.decimals)} ${args.tokenSymbol}`;
  }
  return "—";
}

/**
 * Same pattern as {@link formatEvmPriceLabel}: native = fixed decimals + symbol,
 * SPL = token amount + symbol (like ERC-20).
 */
export function formatSolanaPriceLabel(args: {
  tokenSymbol: string;
  tokenType: "sol" | "spl";
  nativeLamports?: bigint;
  spl?: { amount: bigint; decimals: number } | null;
}): string {
  if (args.tokenType === "sol" && args.nativeLamports != null && args.nativeLamports > 0n) {
    return `${formatUnits(args.nativeLamports, 9)} ${args.tokenSymbol}`;
  }
  if (args.tokenType === "spl" && args.spl != null) {
    return `${formatUnits(args.spl.amount, args.spl.decimals)} ${args.tokenSymbol}`;
  }
  return "—";
}

/**
 * Price line for the messages modal: SOL and SPL token amounts only (no USD).
 * Returns "—" when the API does not include lamports / SPL amounts for this package.
 */
export function formatSolanaChainPriceLabel(
  pkg: MessagePackage,
  chains: MessagesChains | undefined,
  tok: TokenOption | undefined,
): string {
  if (!tok) return "—";
  const nativeSym = solanaNativeSymbolFromChains(chains);
  
  if (tok.type === "sol") {
    const plan = getSolanaPurchaseAmounts(pkg, chains, tok.symbol);
   
    if (plan?.kind === "native") {
      return formatSolanaPriceLabel({
        tokenType: "sol",
        tokenSymbol: nativeSym,
        nativeLamports: plan.lamports,
      });
    }
  }
  if (tok.type === "spl") {
    const plan = getSolanaPurchaseAmounts(pkg, chains, "SPL");
    if (plan?.kind === "spl") {
      const dec = getSolanaSplDisplayDecimals("SPL", chains);
      return formatSolanaPriceLabel({
        tokenType: "spl",
        tokenSymbol: "SPL",
        spl: { amount: plan.amount, decimals: dec },
      });
    }
  }
  return "—";
}

/** Privy embedded (or linked) EVM wallet: raw tx + optional chain switch. */
export type PurchasePrivyEvmSigner = {
  walletAddress: Address;
  sendTransaction: (input: {
    to: Address;
    data: `0x${string}`;
    value?: bigint;
    chainId: number;
  }) => Promise<{ hash: `0x${string}` }>;
  switchChain?: (chainId: number) => Promise<void>;
};

export async function purchaseEvmPackage(args: {
  chainKey: Exclude<MessageChainKey, "solana">;
  packageId: number;
  chains: MessagesChains | undefined;
  tokenSymbol: string;
  tokenType: "native" | "erc20";
  /** Wagmi / injected wallet (omit when `privy` is set). */
  writeContractAsync?: (
    params: Record<string, unknown>,
  ) => Promise<`0x${string}`>;
  switchChainAsync?: (args: { chainId: number }) => Promise<unknown>;
  currentChainId?: number | null;
  /** Privy embedded EVM flows use encoded calldata + useSendTransaction. */
  privy?: PurchasePrivyEvmSigner;
}): Promise<{ txHash: `0x${string}` }> {
  const chainId = CHAIN_KEY_TO_WAGMI_ID[args.chainKey];
  const contractAddress = resolveEvmContract(args.chainKey, args.chains);
  const usePrivy = Boolean(args.privy);

  if (!usePrivy && !args.writeContractAsync) {
    throw new Error("Missing wallet signer (connect wallet or use Privy).");
  }

  if (args.currentChainId != null && args.currentChainId !== chainId) {
    if (args.privy?.switchChain) {
      await args.privy.switchChain(chainId);
    } else if (args.switchChainAsync) {
      await args.switchChainAsync({ chainId });
    } else {
      throw new Error(
        "Wrong network for this purchase. Switch chain in your wallet and try again.",
      );
    }
  }

  const { nativePrice, tokens, prices } = await readEvmPackagePricing(
    args.chainKey,
    args.packageId,
    args.chains,
  );

  if (args.tokenType === "native") {
    if (usePrivy && args.privy) {
      const data = encodeFunctionData({
        abi: BUY_MESSAGES_ABI,
        functionName: "buyWithNative",
        args: [BigInt(args.packageId)],
      });
      const { hash } = await args.privy.sendTransaction({
        to: contractAddress,
        data,
        value: nativePrice,
        chainId,
      });
      await waitForTransactionReceipt(wagmiClient, { hash });
      return { txHash: hash };
    }
    const txHash = await args.writeContractAsync!({
      address: contractAddress,
      abi: BUY_MESSAGES_ABI,
      functionName: "buyWithNative",
      args: [BigInt(args.packageId)],
      chainId,
      value: nativePrice,
    });
    await waitForTransactionReceipt(wagmiClient, { hash: txHash });
    return { txHash };
  }

  const tokenMap = args.chains?.[args.chainKey]?.tokens ?? {};
  const match = findErc20PriceForToken(
    args.tokenSymbol,
    tokenMap,
    tokens,
    prices,
  );
  if (!match) {
    throw new Error(`No on-chain price for ${args.tokenSymbol} on this package.`);
  }

  const client = getPublicClient(wagmiClient, { chainId });
  if (!client) throw new Error("Network unavailable");

  const walletAddress = usePrivy
    ? args.privy!.walletAddress
    : getAccount(wagmiClient).address;
  if (!walletAddress) throw new Error("Wallet not connected");

  const decimals = await client.readContract({
    address: match.address,
    abi: erc20Abi,
    functionName: "decimals",
  });

  const allowance = await client.readContract({
    address: match.address,
    abi: erc20Abi,
    functionName: "allowance",
    args: [walletAddress, contractAddress],
  });

  if (allowance < match.amount) {
    if (usePrivy && args.privy) {
      const approveData = encodeFunctionData({
        abi: erc20Abi,
        functionName: "approve",
        args: [contractAddress, match.amount],
      });
      const { hash: approveHash } = await args.privy.sendTransaction({
        to: match.address,
        data: approveData,
        chainId,
      });
      await waitForTransactionReceipt(wagmiClient, { hash: approveHash });
    } else {
      const approveHash = await args.writeContractAsync!({
        address: match.address,
        abi: erc20Abi,
        functionName: "approve",
        args: [contractAddress, match.amount],
        chainId,
      });
      await waitForTransactionReceipt(wagmiClient, { hash: approveHash });
    }
  }

  if (usePrivy && args.privy) {
    const buyData = encodeFunctionData({
      abi: BUY_MESSAGES_ABI,
      functionName: "buyWithToken",
      args: [match.address, BigInt(args.packageId)],
    });
    const { hash } = await args.privy.sendTransaction({
      to: contractAddress,
      data: buyData,
      chainId,
    });
    await waitForTransactionReceipt(wagmiClient, { hash });
    return { txHash: hash };
  }

  const txHash = await args.writeContractAsync!({
    address: contractAddress,
    abi: BUY_MESSAGES_ABI,
    functionName: "buyWithToken",
    args: [match.address, BigInt(args.packageId)],
    chainId,
  });
  await waitForTransactionReceipt(wagmiClient, { hash: txHash });
  return { txHash };
}

function parseLamports(s: string | number | undefined): bigint | null {
  if (s == null || s === "") return null;
  if (typeof s === "number" && Number.isFinite(s)) {
    try {
      return BigInt(Math.trunc(s));
    } catch {
      return null;
    }
  }
  try {
    return BigInt(String(s).trim());
  } catch {
    return null;
  }
}

/** SPL mint from `GET /messages/packages` → `chains.solana.tokens.SPL` / `USDC.mint` / `address`. */
function getSplMintFromChainTokens(
  symbol: string,
  chains: MessagesChains | undefined,
): string | undefined {
  const t = chainsSolanaBlock(chains)?.tokens as
    | Record<string, ChainTokenMeta>
    | undefined;
  if (!t) return undefined;
  const sym = symbol.toUpperCase();
  const lower = sym.toLowerCase();
  const meta =
    t[sym] ??
    t[symbol] ??
    t[lower] ??
    Object.entries(t).find(
      ([k, v]) =>
        k.toLowerCase() !== "native" &&
        typeof v === "object" &&
        v &&
        (k.toUpperCase() === sym ||
          String(v.symbol ?? k).toUpperCase() === sym),
    )?.[1];
  if (!meta || typeof meta !== "object") return undefined;
  const m = meta.mint ?? meta.address;
  if (typeof m === "string" && m.length >= 32) return m;
  return undefined;
}

/** Map UI token `SPL` to package/chain pricing (API may still use USDC/USDT keys). */
function resolveSplPaymentRow(
  merged: MessagePackage["solana"],
  chains: MessagesChains | undefined,
): { mint: string; amount: string } | null {
  const spl = merged?.spl;
  if (!spl || typeof spl !== "object") return null;

  const tryOrder = ["SPL", "spl", "USDC", "usdc", "USDT", "usdt"] as const;
  for (const key of tryOrder) {
    const row = spl[key] as { mint?: string; amount?: unknown } | undefined;
    const amount = splRowAmount(row);
    if (amount == null) continue;
    const mint =
      splRowMint(row) ??
      getSplMintFromChainTokens(key, chains) ??
      getSplMintFromChainTokens("SPL", chains);
    if (mint) return { mint, amount };
  }
  for (const [key, row] of Object.entries(spl)) {
    if (key.toLowerCase() === "native") continue;
    const amount = splRowAmount(
      row as { amount?: unknown; value?: unknown; raw?: unknown },
    );
    if (amount == null) continue;
    const mint =
      splRowMint(row) ??
      getSplMintFromChainTokens(key, chains) ??
      getSplMintFromChainTokens("SPL", chains);
    if (mint) return { mint, amount };
  }
  return null;
}

export function getSolanaSplDisplayDecimals(
  symbol: string,
  chains: MessagesChains | undefined,
): number {
  const sym = symbol.toUpperCase();
  const t = chainsSolanaBlock(chains)?.tokens as
    | Record<string, ChainTokenMeta>
    | undefined;
  if (!t) return sym === "SPL" ? 6 : sym === "USDT" || sym === "USDC" ? 6 : 9;

  if (sym === "SPL") {
    const direct = t.SPL ?? t.spl;
    if (direct && typeof direct === "object" && typeof direct.decimals === "number") {
      return direct.decimals;
    }
    for (const k of ["USDC", "USDT"] as const) {
      const m = t[k];
      if (m && typeof m === "object" && typeof m.decimals === "number") {
        return m.decimals;
      }
    }
    return 6;
  }

  const meta =
    t[sym] ??
    t[symbol] ??
    Object.entries(t).find(
      ([k, v]) =>
        k.toLowerCase() !== "native" &&
        typeof v === "object" &&
        v &&
        String((v as { symbol?: string }).symbol ?? k).toUpperCase() === sym,
    )?.[1];
  if (meta && typeof meta === "object" && typeof meta.decimals === "number") {
    return meta.decimals;
  }
  if (sym === "USDT" || sym === "USDC") return 6;
  return 9;
}

export function getSolanaPurchaseAmounts(
  pkg: MessagePackage,
  chains: MessagesChains | undefined,
  tokenSymbol: string,
): { kind: "native"; lamports: bigint } | {
  kind: "spl";
  mint: PublicKey;
  amount: bigint;
} | null {
  const merged = mergeSolanaPricing(pkg, chains);
  const sym = tokenSymbol.toUpperCase();
  const nativeSym = solanaNativeSymbolFromChains(chains);
  if (sym === nativeSym || sym === "SOL") {
    const lamports = parseLamports(
      merged?.nativeLamports ?? pickNativeLamports(merged),
    );
    if (lamports != null && lamports > 0n) return { kind: "native", lamports };
    return null;
  }
  if (sym === "SPL") {
    const resolved = resolveSplPaymentRow(merged, chains);
    if (!resolved?.mint || !resolved.amount) return null;
    try {
      return {
        kind: "spl",
        mint: new PublicKey(resolved.mint),
        amount: BigInt(resolved.amount),
      };
    } catch {
      return null;
    }
  }
  const row =
    merged?.spl?.[sym] ??
    merged?.spl?.[tokenSymbol] ??
    merged?.spl?.[sym.toLowerCase()] ??
    merged?.spl?.[tokenSymbol.toLowerCase()];
  const amountStr = splRowAmount(
    row as { amount?: unknown; value?: unknown; raw?: unknown },
  );
  const mintStr =
    splRowMint(row) ?? getSplMintFromChainTokens(sym, chains);
  if (!mintStr || amountStr == null) return null;
  try {
    return {
      kind: "spl",
      mint: new PublicKey(mintStr),
      amount: BigInt(amountStr),
    };
  } catch {
    return null;
  }
}

/** Phantom / Backpack-style injection (not Wallet Standard / adapter). */
export function hasInjectedSolanaProvider(): boolean {
  if (typeof window === "undefined") return false;
  const w = window as Window & {
    phantom?: { solana?: { signAndSendTransaction?: unknown } };
    solana?: { signAndSendTransaction?: unknown };
  };
  const p = w.phantom?.solana ?? w.solana;
  return typeof p?.signAndSendTransaction === "function";
}

export async function purchaseSolanaPackage(args: {
  pkg: MessagePackage;
  chains: MessagesChains | undefined;
  tokenSymbol: string;
  fromPubkey: string;
  /** MetaMask Solana & other Wallet Standard adapters (preferred when set). */
  sendTransaction?: (
    tx: Transaction,
    connection: Connection,
  ) => Promise<string>;
}): Promise<{ txHash: string }> {
  const paymentWallet = resolveSolanaPaymentWallet(args.chains);
  if (!paymentWallet) {
    throw new Error("Solana payment wallet is not configured.");
  }

  const connection = new Connection(
    "https://api.mainnet-beta.solana.com",
    "confirmed",
  );
  const fromPubkey = new PublicKey(args.fromPubkey);
  const toPubkey = new PublicKey(paymentWallet);

  const plan = getSolanaPurchaseAmounts(
    args.pkg,
    args.chains,
    args.tokenSymbol,
  );
  if (!plan) {
    throw new Error(
      "Missing Solana price for this package. Refresh or pick another token.",
    );
  }

  const { blockhash } = await connection.getLatestBlockhash();

  const tx = new Transaction({
    feePayer: fromPubkey,
    recentBlockhash: blockhash,
  });

  if (plan.kind === "native") {
    tx.add(
      SystemProgram.transfer({
        fromPubkey,
        toPubkey,
        lamports: plan.lamports,
      }),
    );
  } else {
    const sourceAta = getAssociatedTokenAddressSync(
      plan.mint,
      fromPubkey,
      false,
    );
    const destAta = getAssociatedTokenAddressSync(plan.mint, toPubkey, false);

    const destInfo = await connection.getAccountInfo(destAta);
    if (!destInfo) {
      tx.add(
        createAssociatedTokenAccountInstruction(
          fromPubkey,
          destAta,
          toPubkey,
          plan.mint,
        ),
      );
    }

    tx.add(
      createTransferInstruction(
        sourceAta,
        destAta,
        fromPubkey,
        plan.amount,
        [],
        TOKEN_PROGRAM_ID,
      ),
    );
  }

  if (args.sendTransaction) {
    const sig = await args.sendTransaction(tx, connection);
    if (!sig) throw new Error("Missing transaction signature");
    return { txHash: sig };
  }

  const provider =
    typeof window !== "undefined"
      ? (
          window as Window & {
            phantom?: { solana?: { signAndSendTransaction?: unknown } };
            solana?: { signAndSendTransaction?: unknown };
          }
        ).phantom?.solana ?? (window as Window & { solana?: { signAndSendTransaction?: unknown } }).solana
      : null;
  if (!provider?.signAndSendTransaction) {
    throw new Error("Connect a Solana wallet that supports signAndSendTransaction.");
  }

  const signed = await provider.signAndSendTransaction(tx);
  const sig =
    typeof signed === "string"
      ? signed
      : (signed as { signature?: string })?.signature;
  if (!sig) throw new Error("Missing transaction signature");
  return { txHash: sig };
}
