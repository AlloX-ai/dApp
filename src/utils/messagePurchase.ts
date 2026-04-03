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
import { formatEther, formatUnits, parseAbi, type Address } from "viem";
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

/** API may send `native: { symbol, decimals }` or legacy `USDT: "0x..."`. */
export type ChainTokenMeta =
  | string
  | {
      symbol?: string;
      decimals?: number;
      address?: string;
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
  const keys = Object.keys(chains) as MessageChainKey[];
  const set = new Set(keys.filter((k) => preferred.includes(k)));
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

export function resolveSolanaPaymentWallet(
  chains: MessagesChains | undefined,
): string {
  const w = chains?.solana?.paymentWallet || SOLANA_PAYMENT_WALLET;
  return typeof w === "string" ? w.trim() : "";
}

export async function fetchMessagePackages(): Promise<MessagesPackagesResponse> {
  return apiCall("/messages/packages") as Promise<MessagesPackagesResponse>;
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

export type TokenOption = { symbol: string; type: "native" | "erc20" | "sol" };

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
    const t = (chains?.solana?.tokens ?? {}) as Record<string, ChainTokenMeta>;
    const nativeMeta = t.native;
    let nativeSym = "SOL";
    if (nativeMeta && typeof nativeMeta === "object" && nativeMeta.symbol) {
      nativeSym = String(nativeMeta.symbol).toUpperCase();
    }
    const out: TokenOption[] = [{ symbol: nativeSym, type: "sol" }];
    for (const key of Object.keys(t)) {
      if (key.toLowerCase() === "native") continue;
      const sym = entrySymbol(key, t[key]);
      if (sym === nativeSym) continue;
      out.push({ symbol: sym, type: "erc20" });
    }
    return out;
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

function mergeSolanaPricing(
  pkg: MessagePackage,
  chains: MessagesChains | undefined,
): MessagePackage["solana"] {
  const fromPkg = pkg.solana;
  const idKey = String(pkg.id);
  const fromChain = chains?.solana?.packagePricing?.[idKey];
  if (!fromChain && !fromPkg) return undefined;
  return {
    nativeLamports: fromChain?.nativeLamports ?? fromPkg?.nativeLamports,
    spl: { ...(fromPkg?.spl ?? {}), ...(fromChain?.spl ?? {}) },
  };
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

export async function purchaseEvmPackage(args: {
  chainKey: Exclude<MessageChainKey, "solana">;
  packageId: number;
  chains: MessagesChains | undefined;
  tokenSymbol: string;
  tokenType: "native" | "erc20";
  writeContractAsync: (params: Record<string, unknown>) => Promise<`0x${string}`>;
  switchChainAsync?: (args: { chainId: number }) => Promise<unknown>;
  currentChainId?: number | null;
}): Promise<{ txHash: `0x${string}` }> {
  const chainId = CHAIN_KEY_TO_WAGMI_ID[args.chainKey];
  const contractAddress = resolveEvmContract(args.chainKey, args.chains);

  if (
    args.currentChainId != null &&
    args.currentChainId !== chainId &&
    args.switchChainAsync
  ) {
    await args.switchChainAsync({ chainId });
  }

  const { nativePrice, tokens, prices } = await readEvmPackagePricing(
    args.chainKey,
    args.packageId,
    args.chains,
  );

  if (args.tokenType === "native") {
    const txHash = await args.writeContractAsync({
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

  const { address: walletAddress } = getAccount(wagmiClient);
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
    const approveHash = await args.writeContractAsync({
      address: match.address,
      abi: erc20Abi,
      functionName: "approve",
      args: [contractAddress, match.amount],
      chainId,
    });
    await waitForTransactionReceipt(wagmiClient, { hash: approveHash });
  }

  const txHash = await args.writeContractAsync({
    address: contractAddress,
    abi: BUY_MESSAGES_ABI,
    functionName: "buyWithToken",
    args: [match.address, BigInt(args.packageId)],
    chainId,
  });
  await waitForTransactionReceipt(wagmiClient, { hash: txHash });
  return { txHash };
}

function parseLamports(s: string | undefined): bigint | null {
  if (s == null || s === "") return null;
  try {
    return BigInt(s);
  } catch {
    return null;
  }
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
  if (sym === "SOL") {
    const lamports = parseLamports(merged?.nativeLamports);
    if (lamports != null && lamports > 0n) return { kind: "native", lamports };
    return null;
  }
  const row = merged?.spl?.[sym] ?? merged?.spl?.[tokenSymbol];
  if (!row?.mint || !row.amount) return null;
  try {
    return {
      kind: "spl",
      mint: new PublicKey(row.mint),
      amount: BigInt(row.amount),
    };
  } catch {
    return null;
  }
}

export async function purchaseSolanaPackage(args: {
  pkg: MessagePackage;
  chains: MessagesChains | undefined;
  tokenSymbol: string;
  fromPubkey: string;
}): Promise<{ txHash: string }> {
  const paymentWallet = resolveSolanaPaymentWallet(args.chains);
  if (!paymentWallet) {
    throw new Error("Solana payment wallet is not configured.");
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

  const signed = await provider.signAndSendTransaction(tx);
  const sig =
    typeof signed === "string"
      ? signed
      : (signed as { signature?: string })?.signature;
  if (!sig) throw new Error("Missing transaction signature");
  return { txHash: sig };
}
