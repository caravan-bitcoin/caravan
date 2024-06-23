import { satoshisToBitcoins } from "@caravan/bitcoin";

export const MIN_RBF_BUMP_FACTOR = 1.25;
export const MAX_FEE_RATE = 1000; // sat/vByte
export const MIN_FEE_RATE = 1; // sat/vByte
export const MAX_FEE_SATS = satoshisToBitcoins(2500000); // 0.025 BTC
