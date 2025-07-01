import { calculateInputWeight, MultisigAddressType } from "@caravan/bitcoin";

import { getOutputSize } from "../../caravan-bitcoin/src/outputs";

/***
 * https://murch.one/posts/waste-metric/
 */
export interface WasteCalculationParams {
  // values of selected coins to spend
  coinAmounts: number[];
  // the config of the wallet
  config: {
    requiredSigners: number;
    totalSigners: number;
    scriptType: MultisigAddressType;
  };
  // Fee rate we're aiming for in this transaction
  effectiveFeeRate: number;
  /**
   * The long-term fee rate estimate which the wallet might need to pay
   * to redeem remaining UTXOs.
   * Reference : https://bitcoincore.reviews/17331#l-164
   * It is the upper bound for spending the UTXO in the future.
   */
  estimatedLongTermFeeRate: number;
  /**
   * Whether the transaction will have a change output.
   * Change has to be spent at a later date adn so creates waste
   */
  hasChange: boolean;
  /**
   * The amount of satoshis wanted to be spent in the transaction.
   * The exact amount of value the wallet wants to send to the recipient(s),
   * not including fees and not including change.
   */
  spendAmount: number;
}

/**
 * @description From https://bitcoin.stackexchange.com/questions/113622/what-does-waste-metric-mean-in-the-context-of-coin-selection
 * See also https://github.com/bitcoin/bitcoin/pull/22009 which implements the waste metric in Bitcoin Core.
 * and https://github.com/bitcoin/bitcoin/blob/ae024137bda9fe189f4e7ccf26dbaffd44cbbeb6/src/wallet/coinselection.cpp#L827-L853
 *
 * The waste metric provides a heuristic per which a wallet's automated coin selection can achieve feerate sensitive coin selection.
 *
 * waste metric formula: waste = weight×(feerate-longtermfeerate)+change+excess
 *
 * - weight: total weight of the input set
 * - feerate: the transaction's target feerate
 * - L: the long-term feerate estimate which the wallet might need to pay to redeem remaining UTXOs
 * - changeCost: the cost of creating and spending a change output
 * - excess: the amount by which we exceed our selection target when creating a changeless transaction, mutually exclusive with cost of change
 */
export const calculateWasteMetric = ({
  coinAmounts,
  config,
  effectiveFeeRate,
  estimatedLongTermFeeRate,
  hasChange,
  spendAmount,
}: WasteCalculationParams) => {
  const { scriptType, requiredSigners, totalSigners } = config;
  let waste = 0;

  // how much it costs to spend a coin of this script type
  const inputCost =
    calculateInputWeight(scriptType, requiredSigners, totalSigners) *
    effectiveFeeRate;

  const inputSetWeight =
    calculateInputWeight(scriptType, requiredSigners, totalSigners) *
    coinAmounts.length;

  waste += inputSetWeight * (effectiveFeeRate - estimatedLongTermFeeRate);

  // change cost and excess are mutually exclusive
  if (hasChange) {
    // the cost of creating change at current fee rate and spending a change output at
    // long term fee rate
    const changeCost =
      getOutputSize(scriptType) * effectiveFeeRate +
      inputCost * estimatedLongTermFeeRate;
    waste += changeCost;
  } else {
    // When we are not making change (GetChange(…) == 0), consider the excess we are throwing away to fees
    // total value of the coins selected
    const selectedEffectiveValue = coinAmounts.reduce(
      (acc, value) => acc + value,
      0,
    );
    const excess = selectedEffectiveValue - spendAmount;
    waste += excess;
  }

  // waste = weight * (feerate-longtermfeerate) + change + excess
  return waste;
};
