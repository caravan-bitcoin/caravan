import { UTXO } from "../types";

export const validInputTemplateFixtures = [
  {
    case: "Valid input with positive amount",
    data: {
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
    case: "Valid input with RBF signaling",
    data: {
      txid: "abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890",
      vout: 1,
      amountSats: "200000",
      sequence: 0xfffffffd,
    },
    expected: {
      txid: "abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890",
      vout: 1,
      amountSats: "200000",
      amountBTC: "0.002",
      isValid: true,
      isRBFEnabled: undefined,
    },
  },
];

export const invalidInputTemplateFixtures = [
  {
    case: "Invalid input with negative amount",
    data: {
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
  {
    case: "Invalid input with invalid sequence number",
    data: {
      txid: "1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
      vout: 0,
      amountSats: "100000",
      sequence: 0x100000000, // Greater than 32-bit unsigned integer
    },
    expected: {
      error: "Invalid sequence number",
    },
  },
];

export const validOutputTemplateFixtures = [
  {
    case: "Valid output with positive amount",
    data: {
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
    case: "Valid locked output",
    data: {
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

export const invalidOutputTemplateFixtures = [
  {
    case: "Invalid output with zero amount",
    data: {
      address: "1BvBMSEYstWetqTFn5Au4m4GFg7xJaNVN2",
      amountSats: "0",
    },
    expected: {
      address: "1BvBMSEYstWetqTFn5Au4m4GFg7xJaNVN2",
      amountSats: "0",
      amountBTC: "0",
      isMalleable: true,
      isValid: false,
    },
  },
  {
    case: "Invalid locked output with zero amount",
    data: {
      address: "3J98t1WpEZ73CNmQviecrnyiWrnqRhWNLy",
      amountSats: "0",
      locked: true,
    },
    expected: {
      error: "Locked outputs must have an amount specified.",
    },
  },
];

export const utxoFixture: UTXO = {
  // https://mempool.space/tx/cb79eea71fc4818d28c8ef6a9cad382ed9355304c23da1ae4759aeec0c66cbd4
  txid: "cb79eea71fc4818d28c8ef6a9cad382ed9355304c23da1ae4759aeec0c66cbd4",
  vout: 2,
  value: "55526782",
  sequence: 4294967293,
  redeemScript: undefined,
  witnessScript: undefined,
  bip32Derivations: [],
  prevTxHex:
    "010000000001011bbfa7552a378e64e4b91a662f5ba6d77a5554a8bca4ffbd98a5e15e51fc4adc1100000000fdffffff035e1d6c00000000001600143e6cf1cff5518b17cae550d7d9c987c6b727501d36648400000000001600147253a62e6e83e9f7483278cf971119987a466f477e454f0300000000220020806e446bb267eb1eaf1eaede0f88b5c7fe4b237783c1c580437e8efc89bfc9630400483045022100964708f47b59b19f5356e32bed0463299d18b71c29e77f7a0e5a28ad5b55d9bf02201696b00ec63dd6961e75ac18745631d07307163d514110c167a29dc4994eb78d01483045022100d94e052dd94c56acfb598484d9a7e4c8686f1933f5442216598e4c7a08d281a202205bf78ae3dbd302572645416b406c1a399b7998e28dc1cb5e6ff4b9264b8bab1b0169522103b66728c8bd8175973e4004860b9cc57fa882be226e5693b498e421948eb2471f2103b802448e6ac06d47a4767f16898bae89b8ac52318b7bb9d8d0113c6f5f70b8c12103295030f31a4f98b3bd6d8cba6cab11b3a188611098115d32c9115687aa8799ae53aee1210d00",
  witnessUtxo: {
    script: Buffer.from(
      "0020806e446bb267eb1eaf1eaede0f88b5c7fe4b237783c1c580437e8efc89bfc963",
      "hex",
    ),
    value: 55526782,
  },
};

export const multisigUtxoFixtures: UTXO[] = [
  {
    // P2SH multisig UTXO
    txid: "abc123def456abc123def456abc123def456abc123def456abc123def456abc123",
    vout: 0,
    value: "1000000",
    sequence: 4294967293,
    prevTxHex:
      "010000000001011bbfa7552a378e64e4b91a662f5ba6d77a5554a8bca4ffbd98a5e15e51fc4adc1100000000fdffffff035e1d6c00000000001600143e6cf1cff5518b17cae550d7d9c987c6b727501d36648400000000001600147253a62e6e83e9f7483278cf971119987a466f477e454f0300000000220020806e446bb267eb1eaf1eaede0f88b5c7fe4b237783c1c580437e8efc89bfc9630400483045022100964708f47b59b19f5356e32bed0463299d18b71c29e77f7a0e5a28ad5b55d9bf02201696b00ec63dd6961e75ac18745631d07307163d514110c167a29dc4994eb78d01483045022100d94e052dd94c56acfb598484d9a7e4c8686f1933f5442216598e4c7a08d281a202205bf78ae3dbd302572645416b406c1a399b7998e28dc1cb5e6ff4b9264b8bab1b0169522103b66728c8bd8175973e4004860b9cc57fa882be226e5693b498e421948eb2471f2103b802448e6ac06d47a4767f16898bae89b8ac52318b7bb9d8d0113c6f5f70b8c12103295030f31a4f98b3bd6d8cba6cab11b3a188611098115d32c9115687aa8799ae53aee1210d00",
    redeemScript: Buffer.from(
      "5221023b66728c8bd8175973e4004860b9cc57fa882be226e5693b498e421948eb2471f21023b802448e6ac06d47a4767f16898bae89b8ac52318b7bb9d8d0113c6f5f70b8c121032950352ae",
      "hex",
    ),
    bip32Derivations: [
      {
        pubkey: Buffer.from(
          "023b66728c8bd8175973e4004860b9cc57fa882be226e5693b498e421948eb2471f",
          "hex",
        ),
        masterFingerprint: Buffer.from("12345678", "hex"),
        path: "m/45'/1'/0'/0/0",
      },
      {
        pubkey: Buffer.from(
          "023b802448e6ac06d47a4767f16898bae89b8ac52318b7bb9d8d0113c6f5f70b8c1",
          "hex",
        ),
        masterFingerprint: Buffer.from("87654321", "hex"),
        path: "m/45'/1'/0'/0/0",
      },
    ],
  },
  {
    // P2WSH multisig UTXO
    txid: "def456abc123def456abc123def456abc123def456abc123def456abc123def456",
    vout: 1,
    value: "2000000",
    sequence: 4294967293,
    witnessUtxo: {
      script: Buffer.from(
        "0020806e446bb267eb1eaf1eaede0f88b5c7fe4b237783c1c580437e8efc89bfc963",
        "hex",
      ),
      value: 2000000,
    },
    witnessScript: Buffer.from(
      "5221023b66728c8bd8175973e4004860b9cc57fa882be226e5693b498e421948eb2471f21023b802448e6ac06d47a4767f16898bae89b8ac52318b7bb9d8d0113c6f5f70b8c121032950352ae",
      "hex",
    ),
    bip32Derivations: [
      {
        pubkey: Buffer.from(
          "023b66728c8bd8175973e4004860b9cc57fa882be226e5693b498e421948eb2471f",
          "hex",
        ),
        masterFingerprint: Buffer.from("abcdef01", "hex"),
        path: "m/84'/1'/0'/0/5",
      },
      {
        pubkey: Buffer.from(
          "023b802448e6ac06d47a4767f16898bae89b8ac52318b7bb9d8d0113c6f5f70b8c1",
          "hex",
        ),
        masterFingerprint: Buffer.from("01fedcba", "hex"),
        path: "m/84'/1'/0'/0/5",
      },
      {
        pubkey: Buffer.from("032950352ae", "hex"),
        masterFingerprint: Buffer.from("deadbeef", "hex"),
        path: "m/84'/1'/0'/0/5",
      },
    ],
  },
  {
    // P2SH-P2WSH multisig UTXO (has both redeem and witness scripts)
    txid: "fedcba098765fedcba098765fedcba098765fedcba098765fedcba098765fedcba",
    vout: 0,
    value: "5000000",
    sequence: 4294967293,
    prevTxHex:
      "010000000001011bbfa7552a378e64e4b91a662f5ba6d77a5554a8bca4ffbd98a5e15e51fc4adc1100000000fdffffff035e1d6c00000000001600143e6cf1cff5518b17cae550d7d9c987c6b727501d36648400000000001600147253a62e6e83e9f7483278cf971119987a466f477e454f0300000000220020806e446bb267eb1eaf1eaede0f88b5c7fe4b237783c1c580437e8efc89bfc9630400483045022100964708f47b59b19f5356e32bed0463299d18b71c29e77f7a0e5a28ad5b55d9bf02201696b00ec63dd6961e75ac18745631d07307163d514110c167a29dc4994eb78d01483045022100d94e052dd94c56acfb598484d9a7e4c8686f1933f5442216598e4c7a08d281a202205bf78ae3dbd302572645416b406c1a399b7998e28dc1cb5e6ff4b9264b8bab1b0169522103b66728c8bd8175973e4004860b9cc57fa882be226e5693b498e421948eb2471f2103b802448e6ac06d47a4767f16898bae89b8ac52318b7bb9d8d0113c6f5f70b8c12103295030f31a4f98b3bd6d8cba6cab11b3a188611098115d32c9115687aa8799ae53aee1210d00",
    witnessUtxo: {
      script: Buffer.from(
        "a914b7fcafc7f3b6fc3d4c5d6d4c5d6d4c5d6d4c5d6d87",
        "hex",
      ),
      value: 5000000,
    },
    redeemScript: Buffer.from(
      "0020806e446bb267eb1eaf1eaede0f88b5c7fe4b237783c1c580437e8efc89bfc963",
      "hex",
    ),
    witnessScript: Buffer.from(
      "5221023b66728c8bd8175973e4004860b9cc57fa882be226e5693b498e421948eb2471f21023b802448e6ac06d47a4767f16898bae89b8ac52318b7bb9d8d0113c6f5f70b8c121032950352ae",
      "hex",
    ),
    bip32Derivations: [
      {
        pubkey: Buffer.from(
          "023b66728c8bd8175973e4004860b9cc57fa882be226e5693b498e421948eb2471f",
          "hex",
        ),
        masterFingerprint: Buffer.from("11111111", "hex"),
        path: "m/48'/1'/0'/2'/0/0",
      },
    ],
  },
];

export const bip32DerivationFixtures = [
  {
    pubkey: Buffer.from(
      "023b66728c8bd8175973e4004860b9cc57fa882be226e5693b498e421948eb2471f",
      "hex",
    ),
    masterFingerprint: Buffer.from("12345678", "hex"),
    path: "m/45'/1'/0'/0/0",
  },
  {
    pubkey: Buffer.from(
      "023b802448e6ac06d47a4767f16898bae89b8ac52318b7bb9d8d0113c6f5f70b8c1",
      "hex",
    ),
    masterFingerprint: Buffer.from("87654321", "hex"),
    path: "m/45'/1'/0'/0/0",
  },
];
