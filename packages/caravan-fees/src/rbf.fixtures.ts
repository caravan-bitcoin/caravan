import { PsbtV2 } from "@caravan/psbt";
import { Network } from "@caravan/bitcoin";
import { RbfTransactionOptions } from "./types";

export function createSamplePsbt(inputs: number, outputs: number): PsbtV2 {
  const psbt = new PsbtV2();
  psbt.PSBT_GLOBAL_TX_VERSION = 2;
  psbt.PSBT_GLOBAL_FALLBACK_LOCKTIME = 0;

  let totalInput = 0;
  for (let i = 0; i < inputs; i++) {
    const txid = Buffer.from(
      `c1aa256e214b96a1822f93de42bff3b5f3ff8d0519306e3515d7515a5e805b${i.toString(16).padStart(2, "0")}`,
      "hex",
    );
    const inputAmount = 200000000 + i * 50000000; // 2 BTC + 0.5 BTC per additional input
    totalInput += inputAmount;
    psbt.addInput({
      previousTxId: txid,
      outputIndex: 0,
      witnessUtxo: {
        script: Buffer.from(
          "0014000102030405060708090a0b0c0d0e0f10111213",
          "hex",
        ),
        amount: inputAmount,
      },
    });
    psbt.setInputSequence(i, 0xfffffffd); // RBF signaling
  }

  let totalOutput = 0;
  for (let i = 0; i < outputs; i++) {
    const outputAmount = 50000000 * (i + 1); // 0.5 BTC, 1 BTC, 1.5 BTC, etc.
    totalOutput += outputAmount;
    psbt.addOutput({
      script: Buffer.from(
        `0014b0a3af144208412693ca7d166852b52db0aef0${i.toString(16).padStart(2, "0")}`,
        "hex",
      ),
      amount: outputAmount,
    });
  }

  // Ensure input is greater than output by adding a change output if necessary
  if (totalInput <= totalOutput) {
    const changeAmount = totalInput - totalOutput - 10000; // 10000 sats for fee
    psbt.addOutput({
      script: Buffer.from(
        "0014b0a3af144208412693ca7d166852b52db0aef0ff",
        "hex",
      ),
      amount: changeAmount,
    });
  }

  return psbt;
}

export const RBF_FIXTURES = [
  {
    case: "Simple RBF transaction with one input and two outputs",
    psbt: createSamplePsbt(1, 2),
    network: Network.TESTNET,
    targetFeeRate: 5,
    dustThreshold: 546,
    requiredSigners: 2,
    totalSigners: 3,
    changeOutputIndices: [2],
    incrementalRelayFee: 1,
    additionalUtxos: [
      {
        txid: "1234567890123456789012345678901234567890123456789012345678901234",
        vout: 0,
        value: 100000,
        script: Buffer.from(
          "0014000102030405060708090a0b0c0d0e0f10111213",
          "hex",
        ),
      },
    ],
    expectedInputCount: 2,
    expectedOutputCount: 3,
    expectedFeeIncrease: 135,
  },
  {
    case: "RBF transaction with multiple inputs and outputs",
    psbt: createSamplePsbt(3, 4),
    network: Network.TESTNET,
    targetFeeRate: 10,
    dustThreshold: 546,
    requiredSigners: 2,
    totalSigners: 3,
    changeOutputIndices: [4],
    incrementalRelayFee: 1,
    additionalUtxos: [
      {
        txid: "1234567890123456789012345678901234567890123456789012345678901234",
        vout: 0,
        value: 100000,
        script: Buffer.from(
          "0014000102030405060708090a0b0c0d0e0f10111213",
          "hex",
        ),
      },
    ],
    expectedInputCount: 4,
    expectedOutputCount: 5,
    expectedFeeIncrease: 2000,
  },
  {
    case: "RBF transaction with additional UTXOs",
    psbt: createSamplePsbt(2, 3),
    network: Network.TESTNET,
    targetFeeRate: 15,
    dustThreshold: 546,
    requiredSigners: 2,
    totalSigners: 3,
    changeOutputIndices: [3],
    incrementalRelayFee: 1,
    additionalUtxos: [
      {
        txid: "1234567890123456789012345678901234567890123456789012345678901234",
        vout: 0,
        value: 50000000, // 0.5 BTC
        script: Buffer.from(
          "0014000102030405060708090a0b0c0d0e0f10111213",
          "hex",
        ),
      },
    ],
    expectedInputCount: 3, // 2 original + 1 additional
    expectedOutputCount: 4, // 3 original + 1 change
    expectedFeeIncrease: 3000,
  },
  {
    case: "RBF transaction with high fee rate",
    psbt: createSamplePsbt(1, 1),
    network: Network.TESTNET,
    targetFeeRate: 50,
    dustThreshold: 546,
    requiredSigners: 2,
    totalSigners: 3,
    changeOutputIndices: [1],
    incrementalRelayFee: 1,
    additionalUtxos: [],
    expectedInputCount: 1,
    expectedOutputCount: 2, //2 outputs including change
    expectedFeeIncrease: 10000,
  },
];

export function getRbfOptions(index: number): RbfTransactionOptions {
  const fixture = RBF_FIXTURES[index];
  return {
    psbt: fixture.psbt,
    network: fixture.network,
    targetFeeRate: fixture.targetFeeRate,
    dustThreshold: fixture.dustThreshold,
    requiredSigners: fixture.requiredSigners,
    totalSigners: fixture.totalSigners,
    changeOutputIndices: fixture.changeOutputIndices,
    incrementalRelayFee: fixture.incrementalRelayFee,
    additionalUtxos: fixture.additionalUtxos,
  };
}
