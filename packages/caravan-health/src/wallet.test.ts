import { WalletMetrics } from "./wallet";
import { AddressUtxos, FeeRatePercentile, Transaction } from "./types";

const transactions: Transaction[] = [
  // transactions[0] is a perfect spend transaction
  {
    txid: "txid1",
    vin: [
      {
        prevTxId: "prevTxId1",
        vout: 0,
        sequence: 0,
      },
    ],
    vout: [
      {
        scriptPubkeyHex: "scriptPubkeyHex1",
        scriptPubkeyAddress: "scriptPubkeyAddress1",
        value: 0.1,
      },
    ],
    size: 1,
    weight: 1,
    fee: 1,
    isSend: true,
    amount: 1,
    block_time: 1234,
  },
  // transactions[1] is a coin join transaction
  {
    txid: "txid2",
    vin: [
      {
        prevTxId: "txid1",
        vout: 0,
        sequence: 0,
      },
      {
        prevTxId: "prevTxId2",
        vout: 0,
        sequence: 0,
      },
    ],
    vout: [
      {
        scriptPubkeyHex: "scriptPubkeyHex2",
        scriptPubkeyAddress: "scriptPubkeyAddress2",
        value: 0.2,
      },
      {
        scriptPubkeyHex: "scriptPubkeyHex3",
        scriptPubkeyAddress: "scriptPubkeyAddress1",
        value: 0.2,
      },
    ],
    size: 0,
    weight: 0,
    fee: 0,
    isSend: true,
    amount: 0,
    block_time: 0,
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

describe("Wallet Metrics", () => {
  const walletMetrics = new WalletMetrics(transactions, utxos);
  describe("UTXO Mass Factor", () => {
    it("should return 1 for UTXO set length = 4", () => {
      expect(Object.values(walletMetrics.utxos)[0].length).toBe(4)
      expect(walletMetrics.utxoMassFactor()).toBe(1);
    });
  });

  describe("Fee Rate For Transaction", () => {
    it("should return 1 for fee = 1 and weight = 1", () => {
      expect(walletMetrics.getFeeRateForTransaction(transactions[0])).toBe(1);
    });
  });

  describe("Fee Rate Percentile Score", () => {
    it("should return 0.5 for 50th percentile", () => {
      const feeRatePercentileHistory: FeeRatePercentile[] = [
        {
          avgHeight: 1234,
          timestamp: 1234,
          avgFee_0: 0.001,
          avgFee_10: 0.01,
          avgFee_25: 0.1,
          avgFee_50: 1,
          avgFee_75: 1.1,
          avgFee_90: 1.2,
          avgFee_100: 1.3,
        },
      ];
      expect(
        walletMetrics.getFeeRatePercentileScore(
          1234,
          1,
          feeRatePercentileHistory,
        ),
      ).toBe(0.5);
    });
  });

  describe("Closest Percentile", () => {
    it("should return 50 for 0.5 at 1229 timestamp", () => {
      const feeRatePercentileHistory: FeeRatePercentile[] = [
        {
          avgHeight: 1234,
          timestamp: 1234,
          avgFee_0: 0.001,
          avgFee_10: 0.01,
          avgFee_25: 0.1,
          avgFee_50: 1,
          avgFee_75: 1.1,
          avgFee_90: 1.2,
          avgFee_100: 1.3,
        },
        {
          avgHeight: 1230,
          timestamp: 1234,
          avgFee_0: 0.002,
          avgFee_10: 0.02,
          avgFee_25: 0.2,
          avgFee_50: 1,
          avgFee_75: 1.2,
          avgFee_90: 1.4,
          avgFee_100: 1.8,
        },
      ];
      expect(
        walletMetrics.getClosestPercentile(1229, 0.5, feeRatePercentileHistory),
      ).toBe(50);
    });
  });

  describe("Address Reuse Map", () => {
    it("should return a map of all the used or unused addresses", () => {
      const addressUsageMap = walletMetrics.constructAddressUsageMap();

      const expectedMap = new Map<string, number>();
      expectedMap.set("scriptPubkeyAddress1", 2);
      expectedMap.set("scriptPubkeyAddress2", 1);

      expect(addressUsageMap).toEqual(expectedMap);
    });
  });

  describe("is Address Reused", () => {
    it("should return true for reused address", () => {
      expect(walletMetrics.isReusedAddress("scriptPubkeyAddress1")).toBe(true);
    });

    it("should return false for unused address", () => {
      expect(walletMetrics.isReusedAddress("scriptPubkeyAddress2")).toBe(false);
    });
  });
});
