import { Network } from "@caravan/bitcoin";
import { PsbtV2 } from "@caravan/psbt";
import { TransactionAnalyzerOptions, UTXO } from "./types";

export function createMockPsbt(
  inputs: number,
  outputs: number,
  isRBF: boolean,
): PsbtV2 {
  const psbt = new PsbtV2();
  for (let i = 0; i < inputs; i++) {
    const input = {
      previousTxId: Buffer.from("0".repeat(64), "hex"),
      outputIndex: i,
      sequence: isRBF ? 0xfffffffd : 0xffffffff,
    };
    psbt.addInput(input);

    // Add witness UTXO data
    const witnessUtxo = {
      script: Buffer.from(
        "76a914000000000000000000000000000000000000000088ac",
        "hex",
      ), // P2PKH script
      value: 200000, // 0.002 BTC
    };
    psbt.PSBT_IN_WITNESS_UTXO[i] = Buffer.concat([
      Buffer.from(witnessUtxo.value.toString(16).padStart(16, "0"), "hex"),
      Buffer.from([witnessUtxo.script.length]),
      witnessUtxo.script,
    ]).toString("hex");

    // Add non-witness UTXO data (a dummy transaction)
    const dummyTx = {
      version: 1,
      inputs: [
        {
          hash: Buffer.alloc(32),
          index: 0,
          script: Buffer.alloc(0),
          sequence: 0xffffffff,
        },
      ],
      outputs: [{ value: 200000, script: witnessUtxo.script }],
      locktime: 0,
    };
    psbt.PSBT_IN_NON_WITNESS_UTXO[i] = Buffer.from(
      JSON.stringify(dummyTx),
      "utf8",
    ).toString("hex");
  }

  for (let i = 0; i < outputs; i++) {
    psbt.addOutput({
      script: Buffer.from(
        "76a914000000000000000000000000000000000000000088ac",
        "hex",
      ),
      amount: 100000,
    });
  }
  return psbt;
}
// Mock UTXOs
const mockUTXOs: UTXO[] = [
  { txid: "1".repeat(64), vout: 0, value: 50000, script: Buffer.from("") },
  { txid: "2".repeat(64), vout: 1, value: 75000, script: Buffer.from("") },
];

// Mock fixtures
export const mockFixtures = {
  rbfEnabled: {
    psbt: createMockPsbt(2, 2, true),
    network: Network.TESTNET,
    targetFeeRate: 5,
    additionalUtxos: mockUTXOs,
    spendableOutputs: [{ index: 0, amount: 90000 }],
    changeOutputs: [{ index: 1, amount: 10000 }],
    requiredSigners: 2,
    totalSigners: 3,
  } as TransactionAnalyzerOptions,

  rbfDisabled: {
    psbt: createMockPsbt(2, 2, false),
    network: Network.TESTNET,
    targetFeeRate: 5,
    additionalUtxos: [],
    spendableOutputs: [{ index: 0, amount: 90000 }],
    changeOutputs: [{ index: 1, amount: 10000 }],
    requiredSigners: 2,
    totalSigners: 3,
  } as TransactionAnalyzerOptions,

  cpfpPossible: {
    psbt: createMockPsbt(1, 2, false),
    network: Network.TESTNET,
    targetFeeRate: 5,
    additionalUtxos: [],
    spendableOutputs: [{ index: 0, amount: 90000 }],
    changeOutputs: [],
    requiredSigners: 2,
    totalSigners: 3,
  } as TransactionAnalyzerOptions,

  neitherPossible: {
    psbt: createMockPsbt(1, 1, false),
    network: Network.TESTNET,
    targetFeeRate: 5,
    additionalUtxos: [],
    spendableOutputs: [],
    changeOutputs: [],
    requiredSigners: 2,
    totalSigners: 3,
  } as TransactionAnalyzerOptions,
};
