import { BlockchainClientInterface, FeeEstimate } from "./types";
import { SATS_PER_BTC } from "./constants";
import BigNumber from "bignumber.js";

export const getFeeEstimates = async (
  client: BlockchainClientInterface
): Promise<FeeEstimate> => {
  return client.getFeeEstimate();
};

export const calculateFee = (vsize: number, feeRate: number): BigNumber => {
  return new BigNumber(vsize)
    .multipliedBy(feeRate)
    .dividedBy(SATS_PER_BTC)
    .integerValue(BigNumber.ROUND_CEIL);
};
