import {
  scoreForTxTopology,
  addressReuseFactor,
  addressTypeFactor,
  utxoSpreadFactor,
  utxoSetLengthScore,
  utxoValueWeightageFactor,
  privacyScore,
} from "./privacy";
import { BlockchainClient, Transaction } from "@caravan/clients";
import { AddressUtxos } from "./types";
import { MultisigAddressType, Network } from "@caravan/bitcoin";

describe("Privacy Score Functions", () => {
  let mockClient: BlockchainClient;

  beforeEach(() => {
    mockClient = {
      getAddressStatus: jest.fn(),
      getAddressTransactions: jest.fn().mockResolvedValue([{ txid: "tx1" }]),
    } as unknown as BlockchainClient;
  });

  describe("privacyScoreByTxTopology", () => {
    it("CoinJoin with reused address", async () => {
      const transaction: Transaction = {
        vin: [
          {
            txid: "input1",
            vout: 0,
            sequence: 0,
          },
          {
            txid: "input2",
            vout: 0,
            sequence: 0,
          },
        ], // 2 inputs
        vout: [
          { scriptPubkeyHex: "", scriptPubkeyAddress: "", value: 0 },
          { scriptPubkeyHex: "", scriptPubkeyAddress: "", value: 0 },
          { scriptPubkeyHex: "", scriptPubkeyAddress: "", value: 0 },
        ], // 3 Outputs
        txid: "",
        size: 0,
        weight: 0,
        fee: 0,
        isSend: false,
        amount: 0,
        blocktime: 0,
      };
      const score: number = +(
        await scoreForTxTopology(transaction, mockClient)
      ).toFixed(3);
      expect(score).toBe(0.818);
    });
  });

  describe("addressReuseFactor", () => {
    it("UTXOs having same addresses", async () => {
      const utxos: AddressUtxos = {
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
        address2: [
          {
            txid: "tx3",
            vout: 0,
            value: 3,
            status: { confirmed: true, block_time: 0 },
          },
        ],
      };
      const factor: number = +(
        await addressReuseFactor(utxos, mockClient)
      ).toFixed(3);
      expect(factor).toBe(0);
    });
  });

  describe("addressTypeFactor", () => {
    it("P2PKH address", () => {
      const transactions = [
        {
          vin: [
            {
              txid: "input1",
              vout: 0,
              witness: [],
              sequence: 0,
            },
          ],
          vout: [
            { scriptPubkeyHex: "", scriptPubkeyAddress: "1234", value: 0 },
          ],
          txid: "",
          size: 0,
          weight: 0,
          fee: 0,
          isSend: false,
          amount: 0,
          blocktime: 0,
        },
      ];
      const walletAddressType: MultisigAddressType = "P2PKH";
      const network: Network = Network["MAINNET"];
      const factor: number = +addressTypeFactor(
        transactions,
        walletAddressType,
        network,
      ).toFixed(3);
      expect(factor).toBe(1);
    });
  });

  describe("utxoSpreadFactor", () => {
    it("UTXOs spread across multiple addresses", () => {
      const utxos = {
        address1: [
          {
            txid: "tx1",
            vout: 0,
            value: 1,
            status: { confirmed: true, block_time: 0 },
          },
        ],
        address2: [
          {
            txid: "tx2",
            vout: 0,
            value: 2,
            status: { confirmed: true, block_time: 0 },
          },
        ],
      };
      const factor: number = +utxoSpreadFactor(utxos).toFixed(3);
      expect(factor).toBe(0.333);
    });
  });

  describe("utxoSetLengthScore", () => {
    it("UTXO set length", () => {
      const utxos = {
        address1: [
          {
            txid: "tx1",
            vout: 0,
            value: 1,
            status: { confirmed: true, block_time: 0 },
          },
        ],
        address2: [
          {
            txid: "tx2",
            vout: 0,
            value: 2,
            status: { confirmed: true, block_time: 0 },
          },
        ],
      };
      const score: number = +utxoSetLengthScore(utxos).toFixed(3);
      expect(score).toBe(1);
    });
  });

  describe("utxoValueWeightageFactor", () => {
    it("UTXO value weightage", () => {
      const utxos = {
        address1: [
          {
            txid: "tx1",
            vout: 0,
            value: 1,
            status: { confirmed: true, block_time: 0 },
          },
        ],
        address2: [
          {
            txid: "tx2",
            vout: 0,
            value: 2,
            status: { confirmed: true, block_time: 0 },
          },
        ],
      };
      const factor: number = +utxoValueWeightageFactor(utxos).toFixed(3);
      expect(factor).toBe(0.05);
    });
  });

  describe("privacyScore", () => {
    it("Privacy score", async () => {
      const transactions = [
        {
          vin: [
            {
              txid: "input1",
              vout: 0,
              witness: [],
              sequence: 0,
            },
          ],
          vout: [
            { scriptPubkeyHex: "", scriptPubkeyAddress: "1234", value: 0 },
          ],
          txid: "",
          size: 0,
          weight: 0,
          fee: 0,
          isSend: false,
          amount: 0,
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
        ],
        address2: [
          {
            txid: "tx2",
            vout: 0,
            value: 2,
            status: { confirmed: true, block_time: 0 },
          },
        ],
      };
      const walletAddressType: MultisigAddressType = "P2PKH";
      const network: Network = Network["MAINNET"];
      const score: number = +(
        await privacyScore(
          transactions,
          utxos,
          walletAddressType,
          mockClient,
          network,
        )
      ).toFixed(3);
      expect(score).toBe(0.005);
    });
  });
});
