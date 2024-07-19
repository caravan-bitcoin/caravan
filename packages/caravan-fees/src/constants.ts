import BigNumber from "bignumber.js";

export const DEFAULT_RBF_SEQUENCE = 0xfffffffd;
export const MIN_FEE_RATE = 1;
export const MAX_FEE_RATE = 5000;
export const DEFAULT_FEE_INCREASE_THRESHOLD = 1.1;
export const MIN_DUST_AMOUNT = new BigNumber(546);
export const SATS_PER_BTC = new BigNumber(100000000);
