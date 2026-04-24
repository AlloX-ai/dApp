import { CHAINS, chainIdFor, sourceTokensFor } from "./chains";

export const BSC_CHAIN_ID = chainIdFor("BSC");
export const BASE_CHAIN_ID = chainIdFor("BASE");
export const MIN_BNB_GAS_BUFFER = CHAINS.BSC.sourceTokens[0].minGasBuffer;
export const MIN_ETH_GAS_BUFFER = CHAINS.BASE.sourceTokens[0].minGasBuffer;

// Backward compatibility for legacy BSC-only imports.
export const WITHDRAW_TOKENS = sourceTokensFor("BSC");

export function getWithdrawTokens(chain = "BSC") {
  return sourceTokensFor(chain);
}
