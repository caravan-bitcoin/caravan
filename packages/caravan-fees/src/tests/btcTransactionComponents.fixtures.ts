import { UTXO } from "../types";

export const inputTemplateFixtures = [
  {
    test: {
      txid: "1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
      vout: 0,
      amountSats: "100000",
    },
    expected: {
      txid: "1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
      vout: 0,
      amountSats: "100000",
      amountBTC: "0.001",
      isValid: true,
    },
  },
  {
    test: {
      txid: "abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890",
      vout: 1,
      amountSats: "-100000",
    },
    expected: {
      txid: "abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890",
      vout: 1,
      amountSats: "-100000",
      amountBTC: "-0.001",
      isValid: false,
    },
  },
];

export const outputTemplateFixtures = [
  {
    test: {
      address: "1BvBMSEYstWetqTFn5Au4m4GFg7xJaNVN2",
      amountSats: "50000",
    },
    expected: {
      address: "1BvBMSEYstWetqTFn5Au4m4GFg7xJaNVN2",
      amountSats: "50000",
      amountBTC: "0.0005",
      isMalleable: true,
      isValid: true,
    },
  },
  {
    test: {
      address: "3J98t1WpEZ73CNmQviecrnyiWrnqRhWNLy",
      amountSats: "100000",
      locked: true,
    },
    expected: {
      address: "3J98t1WpEZ73CNmQviecrnyiWrnqRhWNLy",
      amountSats: "100000",
      amountBTC: "0.001",
      isMalleable: false,
      isValid: true,
    },
  },
];

export const utxoFixture: UTXO = {
  txid: "1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
  vout: 0,
  value: "200000",
  prevTxHex:
    "0200000001010000000000000000000000000000000000000000000000000000000000000000ffffffff04016d0101ffffffff0100f2052a010000002321031b84c5567b126440995d3ed5aaba0565d71e1834604819ff9c17f5e9d5dd078fac00000000",
  witnessUtxo: {
    script: Buffer.from("0014751e76e8199196d454941c45d1b3a323f1433bd6", "hex"),
    value: 200000,
  },
};
