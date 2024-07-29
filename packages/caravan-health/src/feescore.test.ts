import {
  feesScore,
  feesToAmountRatio,
  relativeFeesScore,
  wasteMetric,
} from "./feescore";
import { BlockchainClient } from "@caravan/clients";
import { Transaction, FeeRatePercentile } from "@caravan/clients";

describe("Fees Score Functions", () => {
  let mockClient: BlockchainClient;

  beforeEach(() => {
    mockClient = {
      getAddressStatus: jest.fn(),
      getAddressTransactions: jest.fn().mockResolvedValue([{ txid: "tx1" }]),
    } as unknown as BlockchainClient;
  });

  describe("relativeFeesScore", () => {
    it("Relative fees score for transaction", () => {
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
  });

  describe("feesToAmountRatio", () => {
    it("Fees to amount ratio for transaction", async () => {
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
  });

  describe("wasteMetric Function", () => {
    it("should calculate the correct waste metric value", () => {
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
      const L = 30;

      const result = wasteMetric(transaction, amount, L);

      const expectedWeight = transaction.weight;
      const feeRate = transaction.fee / transaction.weight;
      const costOfTx = Math.abs(amount - transaction.amount);
      const expectedWasteMetric = expectedWeight * (feeRate - L) + costOfTx;

      expect(result).toBe(expectedWasteMetric);
    });
  });
});
function getFeeRateForTransaction(transaction: Transaction) {
  throw new Error("Function not implemented.");
}
