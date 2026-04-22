import { encodeFunctionData, parseEther, parseUnits, toHex } from "viem";
import { apiCall } from "../utils/api";
import { BSC_CHAIN_ID } from "../config/withdrawTokens";

const ERC20_ABI = [
  {
    name: "transfer",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
];

export async function withdrawAndLog({
  sendTransaction,
  walletAddress,
  token,
  toAddress,
  amount,
  priceUsd,
}) {
  if (typeof sendTransaction !== "function") {
    throw new Error("Privy sendTransaction is not available.");
  }
  let txHash = null;
  if (!token.address) {
    const tx = await sendTransaction(
      {
        to: toAddress,
        value: toHex(parseEther(amount)),
        chainId: BSC_CHAIN_ID,
      },
      walletAddress ? { address: walletAddress } : undefined,
    );
    txHash = tx?.hash || tx;
  } else {
    const amountWei = parseUnits(amount, token.decimals);
    const data = encodeFunctionData({
      abi: ERC20_ABI,
      functionName: "transfer",
      args: [toAddress, amountWei],
    });
    const tx = await sendTransaction(
      {
        to: token.address,
        data,
        value: "0x0",
        chainId: BSC_CHAIN_ID,
      },
      walletAddress ? { address: walletAddress } : undefined,
    );
    txHash = tx?.hash || tx;
  }
  if (!txHash || typeof txHash !== "string") {
    throw new Error("Transaction was submitted but no tx hash was returned.");
  }

  try {
    await apiCall("/withdraw/log", {
      method: "POST",
      body: JSON.stringify({
        txHash,
        toAddress,
        token: {
          symbol: token.symbol,
          address: token.address,
          decimals: token.decimals,
        },
        amount,
        amountUsd: Number(amount) * Number(priceUsd || 0),
        chain: "BSC",
      }),
    });
  } catch (err) {
    console.warn("Failed to log withdrawal", err);
  }

  return { txHash };
}
