import { feesScore, feesToAmountRatio, relativeFeesScore } from "./feescore";
import { BlockchainClient } from "@caravan/clients";
import { Transaction } from "@caravan/clients";

describe("Fees Score Functions", () => {
  let mockClient: BlockchainClient;

  beforeEach(() => {
    mockClient = {
      getAddressStatus: jest.fn(),
      getAddressTransactions: jest.fn().mockResolvedValue([{ txid: "tx1" }]),
      getFeeRatePercentileForTransaction: jest.fn().mockResolvedValue(10),
    } as unknown as BlockchainClient;
  });

  describe("relativeFeesScore", () => {
    it("Relative fees score for transaction", async () => {
      const transactions: Transaction[] = [
        {
          vin: [],
          vout: [],
          txid: "tx1",
          size: 0,
          weight: 0,
          fee: 0,
          isSend: true,
          amount: 0,
          blocktime: 0,
        },
      ];
      const score: number = +(
        await relativeFeesScore(transactions, mockClient)
      ).toFixed(3);
      expect(score).toBe(0.9);
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

  describe("feesScore", () => {
    it("Fees score for transaction", async () => {
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
      const utxos = {
        address1: [
          {
            txid: "tx1",
            vout: 0,
            value: 1,
            status: { confirmed: true, block_time: 0 },
          },
          {
            txid: "tx2",
            vout: 0,
            value: 2,
            status: { confirmed: true, block_time: 0 },
          },
        ],
      };
      const score: number = +(
        await feesScore(transaction, utxos, mockClient)
      ).toFixed(3);
      expect(score).toBe(0.65);
    });
  });
});
