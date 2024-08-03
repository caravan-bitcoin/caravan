import { PsbtV2 } from "@caravan/psbt";
import BigNumber from "bignumber.js";
import { Network } from "@caravan/bitcoin";
import { TransactionAnalyzerOptions } from "./types";

// Mock PsbtV2 class
class MockPsbtV2 {
  PSBT_GLOBAL_INPUT_COUNT: number;
  PSBT_GLOBAL_OUTPUT_COUNT: number;
  PSBT_IN_WITNESS_UTXO: string[];
  PSBT_OUT_AMOUNT: bigint[];
  PSBT_IN_SEQUENCE: number[];
  PSBT_IN_REDEEM_SCRIPT: Buffer[];
  PSBT_IN_WITNESS_SCRIPT: Buffer[];
  PSBT_OUT_SCRIPT: string[];
  isRBFSignaled: boolean;

  constructor(options: any) {
    this.PSBT_GLOBAL_INPUT_COUNT = options.inputs.length;
    this.PSBT_GLOBAL_OUTPUT_COUNT = options.outputs.length;
    this.PSBT_IN_WITNESS_UTXO = options.inputs.map(
      (i: any) => `${i.value},${i.script}`,
    );
    this.PSBT_OUT_AMOUNT = options.outputs.map((o: any) => BigInt(o.value));
    this.PSBT_IN_SEQUENCE = options.inputs.map((i: any) => i.sequence);
    this.PSBT_IN_REDEEM_SCRIPT = options.inputs.map((i: any) => i.redeemScript);
    this.PSBT_IN_WITNESS_SCRIPT = options.inputs.map(
      (i: any) => i.witnessScript,
    );
    this.PSBT_OUT_SCRIPT = options.outputs.map((o: any) => o.script);
    this.isRBFSignaled = options.isRBFSignaled;
  }
}

// Fixture 1: RBF-signaled transaction with change output
const fixture1: TransactionAnalyzerOptions = {
  psbt: new MockPsbtV2({
    inputs: [{ value: 100000, script: "input_script_1", sequence: 0xfffffffd }],
    outputs: [
      { value: 50000, script: "output_script_1" },
      { value: 49000, script: "change_script_1" },
    ],
    isRBFSignaled: true,
  }) as unknown as PsbtV2,
  network: Network.TESTNET,
  targetFeeRate: 5,
  spendableOutputs: [{ index: 1, amount: new BigNumber(49000) }],
  changeOutputs: [{ index: 1, amount: new BigNumber(49000) }],
  requiredSigners: 1,
  totalSigners: 1,
};

// Fixture 2: Non-RBF transaction
const fixture2: TransactionAnalyzerOptions = {
  psbt: new MockPsbtV2({
    inputs: [{ value: 100000, script: "input_script_1", sequence: 0xffffffff }],
    outputs: [{ value: 99000, script: "output_script_1" }],
    isRBFSignaled: false,
  }) as unknown as PsbtV2,
  network: Network.TESTNET,
  targetFeeRate: 5,
  spendableOutputs: [],
  changeOutputs: [],
  requiredSigners: 1,
  totalSigners: 1,
};

// Fixture 3: Multi-input, multi-output transaction with CPFP possibility
const fixture3: TransactionAnalyzerOptions = {
  psbt: new MockPsbtV2({
    inputs: [
      { value: 100000, script: "input_script_1", sequence: 0xfffffffd },
      { value: 50000, script: "input_script_2", sequence: 0xfffffffd },
    ],
    outputs: [
      { value: 70000, script: "output_script_1" },
      { value: 50000, script: "output_script_2" },
      { value: 29000, script: "change_script_1" },
    ],
    isRBFSignaled: true,
  }) as unknown as PsbtV2,
  network: Network.TESTNET,
  targetFeeRate: 10,
  spendableOutputs: [{ index: 2, amount: new BigNumber(29000) }],
  changeOutputs: [{ index: 2, amount: new BigNumber(29000) }],
  requiredSigners: 2,
  totalSigners: 3,
};

export const fixtures = {
  fixture1,
  fixture2,
  fixture3,
};
