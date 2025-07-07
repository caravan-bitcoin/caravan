import { MultisigAddressType, P2SH, P2WSH } from "@caravan/bitcoin";

import { calculateWasteMetric, WasteCalculationParams } from "./transaction";

describe("calculateWasteMetric", () => {
  const walletConfigs = [
    {
      name: "P2SH 2-of-3",
      config: {
        requiredSigners: 2,
        totalSigners: 3,
        scriptType: P2SH as MultisigAddressType,
      },
    },
    {
      name: "P2WSH 3-of-5",
      config: {
        requiredSigners: 3,
        totalSigners: 5,
        scriptType: P2WSH as MultisigAddressType,
      },
    },
  ];

  let params: WasteCalculationParams;
  const highFeeRate = 100;
  const lowFeeRate = 10;
  const coinAmount = 500000;
  const coinCount = 50;

  beforeEach(() => {
    params = {
      coinAmounts: Array(coinCount).fill(coinAmount),
      effectiveFeeRate: highFeeRate,
      estimatedLongTermFeeRate: lowFeeRate,
      hasChange: true,
      spendAmount: (coinCount + 1) * coinAmount,
      config: walletConfigs[0].config,
    };
  });

  it("is more wasteful to spend large tx w/ higher fees now than if fees are low now", () => {
    // Why is this is the case?
    // Because if fees will be lower later than it's better to wait (less waste), but if fees
    // are low now then it's better to spend now (less waste).
    expect(calculateWasteMetric(params)).toBeGreaterThan(
      calculateWasteMetric({
        ...params,
        effectiveFeeRate: lowFeeRate,
        estimatedLongTermFeeRate: highFeeRate,
      }),
    );
  });

  it("is more wasteful to spend small tx now with lower current fees than larger tx later", () => {
    // Why is this is the case?
    // Because when fees are low now but will be higher later, it's better
    // to consolidate UTXOs now than leave them around for when it will be more expensive.
    const smallTxParams = {
      ...params,
      coinAmounts: [params.spendAmount + 1000000],
      effectiveFeeRate: lowFeeRate,
      estimatedLongTermFeeRate: highFeeRate,
    };
    const largeTxParams = {
      ...smallTxParams,
      coinAmounts: Array(10).fill(coinAmount),
      spendAmount: 11 * coinAmount,
    };

    expect(calculateWasteMetric(smallTxParams)).toBeGreaterThan(
      calculateWasteMetric(largeTxParams),
    );
  });

  it("is more wasteful to spend p2sh than p2wsh", () => {
    // Why is this is the case?
    // Because p2sh is more expensive since it doesn't have the witness discount.
    const p2shParams = {
      ...params,
      config: walletConfigs[0].config,
    };
    const p2wshParams = {
      ...params,
      config: walletConfigs[1].config,
    };
    expect(calculateWasteMetric(p2shParams)).toBeGreaterThan(
      calculateWasteMetric(p2wshParams),
    );
  });

  it("is more wasteful to spend tx with change than without", () => {
    // Why is this is the case?
    // Because change has to be spent at a later date and so creates waste.
    const txWithChangeParams = {
      ...params,
      hasChange: true,
    };
    const txWithoutChangeParams = {
      ...params,
      hasChange: false,
    };
    expect(calculateWasteMetric(txWithChangeParams)).toBeGreaterThan(
      calculateWasteMetric(txWithoutChangeParams),
    );
  });

  it("is more wasteful to spend a tx with change than without", () => {
    // Why is this is the case?
    // Because change has to be spent at a later date and so creates waste.
    const tx1 = {
      ...params,
      effectiveFeeRate: lowFeeRate,
      estimatedLongTermFeeRate: lowFeeRate,
      hasChange: true,
    };

    const tx2 = {
      ...tx1,
      hasChange: false,
    };

    expect(calculateWasteMetric(tx1)).toBeGreaterThan(
      calculateWasteMetric(tx2),
    );
  });

  it("should should create negative waste when long term fee is greater than current and we have no change", () => {
    const tx = {
      ...params,
      effectiveFeeRate: lowFeeRate,
      estimatedLongTermFeeRate: highFeeRate,
      hasChange: false,
    };

    expect(calculateWasteMetric(tx)).toBeLessThan(0);
  });
});
