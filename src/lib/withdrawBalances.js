import { ethers } from "ethers";
import { WITHDRAW_TOKENS } from "../config/withdrawTokens";

const ERC20_ABI = ["function balanceOf(address) view returns (uint256)"];

export async function getWithdrawableBalances(provider, walletAddress) {
  const results = await Promise.all(
    WITHDRAW_TOKENS.map(async (token) => {
      if (!token.address) {
        const wei = await provider.getBalance(walletAddress);
        return [token.symbol, ethers.utils.formatEther(wei)];
      }
      const contract = new ethers.Contract(token.address, ERC20_ABI, provider);
      const raw = await contract.balanceOf(walletAddress);
      return [token.symbol, ethers.utils.formatUnits(raw, token.decimals)];
    }),
  );
  return Object.fromEntries(results);
}
