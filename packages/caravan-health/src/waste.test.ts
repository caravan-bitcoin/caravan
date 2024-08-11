import { WasteMetric } from "./waste";

const transactions = [
  {
    vin: [], // List of inputs
    vout: [], // List of outputs
    txid: "tx1", // Transaction ID
    size: 1, // Size of the transaction
    weight: 1, // Weight of the transaction
    fee: 1, // Fee paid in the transaction
    isSend: true, // Transaction is a send transaction
    amount: 10, // Amount spent in the transaction
    blocktime: 1234, // Blocktime of the block where the transactions were mined
  },
  {
    vin: [],
    vout: [],
    txid: "tx2",
    size: 0,
    weight: 1,
    fee: 1,
    isSend: false,
    amount: 10,
    blocktime: 1234,
  },
];

const feeRatePercentileHistory = [
  {
    avgHeight: 0, // Height of the block where the transactions were mined
    timestamp: 1234, // Blocktime of the block where the transactions were mined
    avgFee_0: 0.1, // Lowest fee rate in the block was 0.1 sat/vbyte
    avgFee_10: 0.2, // 10th percentile fee rate in the block was 0.2 sat/vbyte
    avgFee_25: 0.5, // 25th percentile fee rate in the block was 0.5 sat/vbyte
    avgFee_50: 1, // Median fee rate in the block was 1 sat/vbyte
    avgFee_75: 1.5, // 75th percentile fee rate in the block was 1.5 sat/vbyte
    avgFee_90: 2, // 90th percentile fee rate in the block was 2 sat/vbyte
    avgFee_100: 2.5, // Highest fee rate in the block was 2.5 sat/vbyte
  },
];

describe("Waste metric scoring", () => {
  const wasteMetric = new WasteMetric();

  describe("Relative Fees Score (R.F.S)", () => {
    it("calculates fee score based on tx fee rate relative to percentile in the block where a set of send tx were mined", () => {
      const score: number = wasteMetric.relativeFeesScore(
        transactions,
        feeRatePercentileHistory,
      );
      expect(score).toBe(0.5);
    });
  });

  describe("Fees to Amount Ratio (F.A.R)", () => {
    it("Fees paid over total amount spent as ratio for a 'send' type transaction", async () => {
      const ratio: number = wasteMetric.feesToAmountRatio(transactions);
      expect(ratio).toBe(0.1);
    });
  });

  describe("Spend Waste Amount (S.W.A)", () => {
    it("determines the cost of keeping or spending the UTXO at given point of time", () => {
      // Input UTXO Set : [0.1 BTC, 0.2 BTC, 0.3 BTC, 0.4 BTC]
      // Weight : 30 vbytes
      // Current Fee Rate : 10 sat/vbyte
      // Input Amount Sum : 10000 sats
      // Spend Amount : 8000 sats
      // Estimated Long Term Fee Rate : 15 sat/vbyte
      const weight = 30; // Estimated weight of the spending transaction
      const feeRate = 10; // Current Fee-Rate
      const inputAmountSum = 10000; // Sum of all inputs in the spending transaction
      const spendAmount = 8000; // Amount spent in the transaction
      const estimatedLongTermFeeRate = 15; // Estimated long term fee rate

      const wasteAmount = wasteMetric.spendWasteAmount(
        weight,
        feeRate,
        inputAmountSum,
        spendAmount,
        estimatedLongTermFeeRate,
      );
      expect(wasteAmount).toBe(1850);
      // This number is positive this means that in future if we wait for the fee rate to go down,
      // we can save 1850 sats
    });
  });
});
