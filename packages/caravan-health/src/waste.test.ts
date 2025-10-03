import { AddressUtxos } from "./types";
import { WasteMetrics } from "./waste";

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
    block_time: 1234, // Blocktime of the block where the transactions were mined
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
    block_time: 1234,
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

const utxos: AddressUtxos = {
  address1: [
    {
      txid: "tx1",
      vout: 0,
      value: 0.1,
      status: {
        confirmed: true,
        block_time: 1234,
      },
    },
    {
      txid: "tx2",
      vout: 0,
      value: 0.2,
      status: {
        confirmed: true,
        block_time: 1234,
      },
    },
    {
      txid: "tx3",
      vout: 0,
      value: 0.3,
      status: {
        confirmed: true,
        block_time: 1234,
      },
    },
    {
      txid: "tx4",
      vout: 0,
      value: 0.4,
      status: {
        confirmed: true,
        block_time: 1234,
      },
    },
  ],
};

describe("Waste metric scoring", () => {
  const wasteMetric = new WasteMetrics(transactions, utxos);

  describe("Relative Fees Score (R.F.S)", () => {
    it("calculates fee score based on tx fee rate relative to percentile in the block where a set of send tx were mined", () => {
      const score: number = wasteMetric.relativeFeesScore(
        feeRatePercentileHistory,
      );
      expect(score).toBe(0.5);
    });
  });

  describe("Fees to Amount Ratio (F.A.R)", () => {
    it("Fees paid over total amount spent as ratio for a 'send' type transaction", () => {
      const ratio: number = wasteMetric.feesToAmountRatio();
      expect(ratio).toBe(0.1);
    });
  });

  describe("Dust Limits", () => {
    const config = {
      requiredSignerCount: 2, // Provide the required property m
      totalSignerCount: 3, // Provide the required property n
    };
    it("calculates the lower and upper limit of the dust amount for P2SH script type and 1.5 risk multiplier", () => {
      const uninitializedWasteMetric = new WasteMetrics();
      const { lowerLimit, upperLimit } =
        uninitializedWasteMetric.calculateDustLimits(10, "P2SH", config, 1.5);
      expect(lowerLimit).toBe(2970);
      expect(upperLimit).toBe(4455);
    });

    it("calculates the lower and upper limit of the dust amount for P2WSH script type and 1.5 risk multiplier", () => {
      const uninitializedWasteMetric = new WasteMetrics();
      const { lowerLimit, upperLimit } =
        uninitializedWasteMetric.calculateDustLimits(10, "P2WSH", config, 1.5);
      expect(lowerLimit).toBe(1045);
      expect(upperLimit).toBe(1567.5);
    });

    it("calculates the lower and upper limit of the dust amount for P2PKH script type and 1.5 risk multiplier", () => {
      const uninitializedWasteMetric = new WasteMetrics();
      const { lowerLimit, upperLimit } =
        uninitializedWasteMetric.calculateDustLimits(10, "P2PKH", config, 1.5);
      expect(lowerLimit).toBe(1315);
      expect(upperLimit).toBe(1972.5);
    });

    it("calculates the lower and upper limit of the dust amount for P2TR script type and 1.5 risk multiplier", () => {
      const uninitializedWasteMetric = new WasteMetrics();
      const { lowerLimit, upperLimit } =
        uninitializedWasteMetric.calculateDustLimits(10, "P2TR", config, 1.5);
      expect(lowerLimit).toBe(575);
      expect(upperLimit).toBe(862.5);
    });

    it("calculates the lower and upper limit of the dust amount for P2SH-P2WSH script type and 1.5 risk multiplier", () => {
      const uninitializedWasteMetric = new WasteMetrics();
      const { lowerLimit, upperLimit } =
        uninitializedWasteMetric.calculateDustLimits(
          10,
          "P2SH-P2WSH",
          config,
          1.5,
        );
      expect(lowerLimit).toBe(1385);
      expect(upperLimit).toBe(2077.5);
    });
  });

  describe("Weighted Waste Score (W.W.S)", () => {
    it("calculates the overall waste of the wallet based on the relative fees score, fees to amount ratio and the UTXO mass factor", () => {
      const score: number = wasteMetric.weightedWasteScore(
        feeRatePercentileHistory,
      );
      expect(score).toBe(0.51);
    });
  });
});
