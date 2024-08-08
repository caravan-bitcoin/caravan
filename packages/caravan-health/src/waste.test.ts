import { feesToAmountRatio, relativeFeesScore, wasteMetric } from "./waste";
import { Transaction, FeeRatePercentile } from "@caravan/clients";

describe("Waste metrics that accounts for nature of fees spending for a wallet", () => {
  it("Relative fees score for transaction with respect to international fiat payment charges", () => {
    const transactions: Transaction[] = [
      {
        vin: [],
        vout: [],
        txid: "tx1",
        size: 0,
        weight: 1,
        fee: 1,
        isSend: true,
        amount: 0,
        blocktime: 1234,
      },
    ];
    const feeRatePercentileHistory: FeeRatePercentile[] = [
      {
        avgHeight: 0,
        timestamp: 1234,
        avgFee_0: 0,
        avgFee_10: 0,
        avgFee_25: 0.5,
        avgFee_50: 1,
        avgFee_75: 0,
        avgFee_90: 0,
        avgFee_100: 0,
      },
    ];
    const score: number = +relativeFeesScore(
      transactions,
      feeRatePercentileHistory,
    ).toFixed(3);
    expect(score).toBe(0.5);
  });

  it("Fees paid for total amount spent as ratio for a transaction", async () => {
    const transaction: Transaction[] = [
      {
        vin: [],
        vout: [],
        txid: "tx1",
        size: 0,
        weight: 0,
        fee: 1,
        isSend: true,
        amount: 10,
        blocktime: 0,
      },
    ];
    const ratio: number = +feesToAmountRatio(transaction).toFixed(3);
    expect(ratio).toBe(0.1);
  });

  it("waste score metric that determines the cost of keeping or spending the UTXO at given point of time", () => {
    const transaction: Transaction = {
      vin: [],
      vout: [],
      txid: "tx1",
      size: 1000,
      weight: 500,
      fee: 2,
      isSend: true,
      amount: 50,
      blocktime: 1234,
    };

    const amount = 30;
    // Reference on estimatedLongTermFeeRate : https://bitcoincore.reviews/17331#l-164
    const estimatedLongTermFeeRate = 30;

    const result = wasteMetric(
      transaction,
      amount,
      estimatedLongTermFeeRate,
    );

    const expectedWeight = transaction.weight;
    const feeRate = transaction.fee / transaction.weight;
    const costOfTx = Math.abs(amount - transaction.amount);
    const expectedWasteMetric =
      expectedWeight * (feeRate - estimatedLongTermFeeRate) + costOfTx;

    expect(result).toBe(expectedWasteMetric);
  });
});
