import {
  getTopologyScore,
  addressReuseFactor,
  addressTypeFactor,
  utxoSpreadFactor,
  utxoSetLengthScore,
  utxoValueDispersionFactor,
  getWalletPrivacyScore,
  getMeanTopologyScore,
} from "./privacy";
import { BlockchainClient, Transaction } from "@caravan/clients";
import { AddressUtxos } from "./types";
import { MultisigAddressType, Network } from "@caravan/bitcoin";

describe("Privacy Score Metrics", () => {
  let mockClient: BlockchainClient;
  let mockTransactionsAddressNotReused: Transaction[] = [
    {
      vin: [
        {
          prevTxId: "abcd",
          vout: 0,
          sequence: 0,
        },
      ],
      vout: [{ scriptPubkeyHex: "", scriptPubkeyAddress: "1234", value: 0 }],
      txid: "",
      size: 0,
      weight: 0,
      fee: 0,
      isSend: false,
      amount: 0,
      blocktime: 0,
    },
  ];
  let mockTransactionsAddressReused: Transaction[] = [
    {
      vin: [
        {
          prevTxId: "abcd",
          vout: 0,
          sequence: 0,
        },
      ],
      vout: [{ scriptPubkeyHex: "", scriptPubkeyAddress: "1234", value: 0 }],
      txid: "",
      size: 0,
      weight: 0,
      fee: 0,
      isSend: false,
      amount: 0,
      blocktime: 0,
    },
    {
      vin: [
        {
          prevTxId: "abcd",
          vout: 0,
          sequence: 0,
        },
      ],
      vout: [{ scriptPubkeyHex: "", scriptPubkeyAddress: "1234", value: 0 }],
      txid: "",
      size: 0,
      weight: 0,
      fee: 0,
      isSend: false,
      amount: 0,
      blocktime: 0,
    },
  ];

  it("Perfect Spend Transaction without reused address for calculating transaction topology score", async () => {
    mockClient = {
      getAddressStatus: jest.fn(),
      getAddressTransactions: jest
        .fn()
        .mockResolvedValue(mockTransactionsAddressNotReused),
    } as unknown as BlockchainClient;
    const transaction: Transaction = {
      vin: [
        {
          prevTxId: "input1",
          vout: 0,
          sequence: 0,
        },
      ], // 1 Input
      vout: [{ scriptPubkeyHex: "", scriptPubkeyAddress: "", value: 0 }], // 1 Output
      txid: "123",
      size: 0,
      weight: 0,
      fee: 0,
      isSend: false,
      amount: 0,
      blocktime: 0,
    };
    const score: number = +(
      await getTopologyScore(transaction, mockClient)
    ).toFixed(3);
    expect(score).toBe(0.75);
  });

  it("Perfect Spend Transaction with reused address for calculating transaction topology score", async () => {
    mockClient = {
      getAddressStatus: jest.fn(),
      getAddressTransactions: jest
        .fn()
        .mockResolvedValue(mockTransactionsAddressReused),
    } as unknown as BlockchainClient;
    const transaction: Transaction = {
      vin: [
        {
          prevTxId: "input1",
          vout: 0,
          sequence: 0,
        },
      ], // 1 Input
      vout: [{ scriptPubkeyHex: "", scriptPubkeyAddress: "", value: 0 }], // 1 Output
      txid: "123",
      size: 0,
      weight: 0,
      fee: 0,
      isSend: false,
      amount: 0,
      blocktime: 0,
    };
    const score: number = +(
      await getTopologyScore(transaction, mockClient)
    ).toFixed(3);
    expect(score).toBe(0.5);
  });

  it("Calculating mean transaction topology score for multiple trnasactions", async () => {
    mockClient = {
      getAddressStatus: jest.fn(),
      getAddressTransactions: jest
        .fn()
        .mockResolvedValue(mockTransactionsAddressNotReused),
    } as unknown as BlockchainClient;
    const transactions: Transaction[] = [
      {
        // Perfect Spend (No Reused Address) - 0.75
        vin: [
          {
            prevTxId: "input1",
            vout: 0,
            sequence: 0,
          },
        ], // 1 Input
        vout: [{ scriptPubkeyHex: "", scriptPubkeyAddress: "", value: 0 }], // 1 Output
        txid: "123",
        size: 0,
        weight: 0,
        fee: 0,
        isSend: false,
        amount: 0,
        blocktime: 0,
      },
      {
        // Simple Spend (No Reused Address) - 0.66
        vin: [
          {
            prevTxId: "input1",
            vout: 0,
            sequence: 0,
          },
        ], // 1 Input
        vout: [
          { scriptPubkeyHex: "", scriptPubkeyAddress: "", value: 0 },
          { scriptPubkeyHex: "", scriptPubkeyAddress: "", value: 0 },
        ], // 2 Outputs
        txid: "123",
        size: 0,
        weight: 0,
        fee: 0,
        isSend: false,
        amount: 0,
        blocktime: 0,
      },
    ];
    const score: number = +(
      await getMeanTopologyScore(transactions, mockClient)
    ).toFixed(3);
    expect(score).toBe(0.708);
  });

  it("Address Reuse Factor accounts for Unspent coins that are on reused address with respect to total amount in wallet", async () => {
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

    // No address was reused
    mockClient = {
      getAddressStatus: jest.fn(),
      getAddressTransactions: jest
        .fn()
        .mockResolvedValue(mockTransactionsAddressNotReused),
    } as unknown as BlockchainClient;
    const factor: number = +(
      await addressReuseFactor(utxos, mockClient)
    ).toFixed(3);
    expect(factor).toBe(0);

    // All addresses were reused
    mockClient = {
      getAddressStatus: jest.fn(),
      getAddressTransactions: jest
        .fn()
        .mockResolvedValue(mockTransactionsAddressReused),
    } as unknown as BlockchainClient;
    const factor2: number = +(
      await addressReuseFactor(utxos, mockClient)
    ).toFixed(3);
    expect(factor2).toBe(1);
  });

  it("P2PKH wallet address type being checked for all transactions", () => {
    const transactions: Transaction[] = [
      {
        vin: [
          {
            prevTxId: "input1",
            vout: 0,
            sequence: 0,
          },
        ],
        vout: [{ scriptPubkeyHex: "", scriptPubkeyAddress: "1234", value: 0 }], // Address starting with 1
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

  it("UTXOs spread factor across multiple addresses (assess for how similar the amount values are for each UTXO)", () => {
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
    // Value 1 and 2 is so close to each other so the scoring is bad.
    const factor: number = +utxoSpreadFactor(utxos).toFixed(3);
    expect(factor).toBe(0.333);

    const utxos2 = {
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
          value: 200,
          status: { confirmed: true, block_time: 0 },
        },
      ],
    };
    // Value 1 and 200 is so far from each other so the scoring is good.
    const factor2: number = +utxoSpreadFactor(utxos2).toFixed(3);
    expect(factor2).toBe(0.99);
  });

  it("Gives a score on the basis of number of UTXOs present in the wallet", () => {
    const utxos = {
      address1: [
        {
          txid: "tx1",
          vout: 0,
          value: 1,
          status: { confirmed: true, block_time: 0 },
        },
      ], // 1 UTXO only for address1
      address2: [
        {
          txid: "tx2",
          vout: 0,
          value: 2,
          status: { confirmed: true, block_time: 0 },
        },
        {
          txid: "tx3",
          vout: 0,
          value: 2,
          status: { confirmed: true, block_time: 0 },
        },
        {
          txid: "tx4",
          vout: 0,
          value: 2,
          status: { confirmed: true, block_time: 0 },
        },
        {
          txid: "tx5",
          vout: 0,
          value: 2,
          status: { confirmed: true, block_time: 0 },
        },
        {
          txid: "tx6",
          vout: 0,
          value: 2,
          status: { confirmed: true, block_time: 0 },
        },
        {
          txid: "tx7",
          vout: 0,
          value: 2,
          status: { confirmed: true, block_time: 0 },
        },
      ], // 6 UTXOs for address 2
    };
    // 7 UTXOs in total - which will give 0.75 as score
    const score: number = +utxoSetLengthScore(utxos).toFixed(3);
    expect(score).toBe(0.75);
  });

  it("UTXO value dispersion accounts for number of coins in the wallet and how dispersed they are in amount values", () => {
    const utxos = {
      address1: [
        {
          txid: "tx1",
          vout: 0,
          value: 1,
          status: { confirmed: true, block_time: 0 },
        },
      ], // 1 UTXO only for address1
      address2: [
        {
          txid: "tx2",
          vout: 0,
          value: 0.02,
          status: { confirmed: true, block_time: 0 },
        },
        {
          txid: "tx3",
          vout: 0,
          value: 0.2,
          status: { confirmed: true, block_time: 0 },
        },
        {
          txid: "tx4",
          vout: 0,
          value: 2,
          status: { confirmed: true, block_time: 0 },
        },
        {
          txid: "tx5",
          vout: 0,
          value: 20,
          status: { confirmed: true, block_time: 0 },
        },
        {
          txid: "tx6",
          vout: 0,
          value: 200,
          status: { confirmed: true, block_time: 0 },
        },
        {
          txid: "tx7",
          vout: 0,
          value: 2000,
          status: { confirmed: true, block_time: 0 },
        },
      ], // 6 UTXOs for address 2
    };
    const factor: number = +utxoValueDispersionFactor(utxos).toFixed(3);
    expect(factor).toBe(0.112);
  });

  it("Overall Privacy Score taking into consideration all parameters for UTXO and Transaction History", async () => {
    const transactions: Transaction[] = [
      {
        vin: [
          {
            prevTxId: "input1",
            vout: 0,
            sequence: 0,
          },
        ],
        vout: [{ scriptPubkeyHex: "", scriptPubkeyAddress: "1234", value: 0 }],
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
      await getWalletPrivacyScore(
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
