import { CPFPTransaction } from "./cpfp";
import { test } from "@jest/globals";
import { PsbtV2 } from "@caravan/psbt";
import { Network } from "@caravan/bitcoin";
import BigNumber from "bignumber.js";
import { CPFP_FIXTURES } from "./cpfp.fixtures";

describe("CPFPTransaction", () => {
  const firstFixture = CPFP_FIXTURES[0];

  test("CPFP transaction with multiple parent outputs and additional UTXOs", () => {
    const {
      parentPsbt,
      network,
      targetFeeRate,
      spendableOutputs,
      destinationAddress,
      requiredSigners,
      totalSigners,
      additionalUtxos,
      expectedChildInputCount,
      expectedChildOutputCount,
      expectedFeeIncrease,
    } = firstFixture;

    const cpfpTx = new CPFPTransaction({
      parentPsbt,
      network: network as Network,
      targetFeeRate,
      spendableOutputs,
      destinationAddress,
      requiredSigners,
      totalSigners,
      additionalUtxos,
    });

    const childPsbt = cpfpTx.prepareCPFP();

    // Check that the child PSBT is valid
    expect(childPsbt).toBeInstanceOf(PsbtV2);

    // Check input and output counts
    expect(childPsbt.PSBT_GLOBAL_INPUT_COUNT).toBe(expectedChildInputCount);
    expect(childPsbt.PSBT_GLOBAL_OUTPUT_COUNT).toBe(expectedChildOutputCount);

    // Check that the fee increase is as expected
    const feeIncrease = new BigNumber(cpfpTx.childFee)
      .plus(cpfpTx.parentFee)
      .minus(cpfpTx.parentFee);
    expect(feeIncrease.isGreaterThanOrEqualTo(expectedFeeIncrease)).toBe(true);

    // Check that the target fee rate is achieved
    const estimatedFee = new BigNumber(cpfpTx.estimatedRequiredFee);
    expect(estimatedFee.isGreaterThanOrEqualTo(targetFeeRate)).toBe(true);
  });
  test("Throws error when parent PSBT has no inputs", () => {
    const invalidParentPsbt = new PsbtV2();
    expect(() => {
      new CPFPTransaction({
        parentPsbt: invalidParentPsbt,
        network: Network.TESTNET,
        targetFeeRate: 20,
        spendableOutputs: [0],
        destinationAddress: "tb1q6kn73d8cmmv8smgz5qks068r6zhjm9spncgsyv",
        requiredSigners: 2,
        totalSigners: 3,
      });
    }).toThrow("Parent PSBT has no inputs.");
  });

  test("Throws error when parent PSBT has no outputs", () => {
    const invalidParentPsbt = new PsbtV2();
    invalidParentPsbt.addInput({
      previousTxId: Buffer.alloc(32, 0),
      outputIndex: 0,
    });
    expect(() => {
      new CPFPTransaction({
        parentPsbt: invalidParentPsbt,
        network: Network.TESTNET,
        targetFeeRate: 20,
        spendableOutputs: [0],
        destinationAddress: "tb1q6kn73d8cmmv8smgz5qks068r6zhjm9spncgsyv",
        requiredSigners: 2,
        totalSigners: 3,
      });
    }).toThrow("Parent PSBT has no outputs.");
  });

  test("Throws error when no spendable outputs are provided", () => {
    const {
      parentPsbt,
      network,
      targetFeeRate,
      spendableOutputs,
      destinationAddress,
      requiredSigners,
      totalSigners,
      additionalUtxos,
    } = CPFP_FIXTURES[2];

    expect(() => {
      new CPFPTransaction({
        parentPsbt,
        network: network as Network,
        targetFeeRate,
        spendableOutputs,
        destinationAddress,
        requiredSigners,
        totalSigners,
        additionalUtxos,
      });
    }).toThrow("No spendable outputs provided.");
  });

  test("Allows setting and getting target fee rate", () => {
    const cpfpTx = new CPFPTransaction({
      parentPsbt: CPFP_FIXTURES[0].parentPsbt,
      network: Network.TESTNET,
      targetFeeRate: 20,
      spendableOutputs: [1],
      destinationAddress:
        "tb1qhjtyry0qwm5l6v5v7y27hc6m60vm0d8exlr3cswdrxsgaygqvd2q5zsl0n",
      requiredSigners: 2,
      totalSigners: 3,
    });

    expect(cpfpTx.targetFeeRate).toBe(20);

    cpfpTx.targetFeeRate = 30;
    expect(cpfpTx.targetFeeRate).toBe(30);
  });

  test("Calculates correct absolute fees", () => {
    const cpfpTx = new CPFPTransaction({
      parentPsbt: CPFP_FIXTURES[0].parentPsbt,
      network: Network.TESTNET,
      targetFeeRate: 20,
      spendableOutputs: [1],
      destinationAddress: "tb1q6kn73d8cmmv8smgz5qks068r6zhjm9spncgsyv",
      requiredSigners: 2,
      totalSigners: 3,
    });

    const absFees = cpfpTx.getAbsFees();
    expect(new BigNumber(absFees).isGreaterThan(0)).toBe(true);

    const customFeeRate = 50;
    const customAbsFees = cpfpTx.getAbsFees(customFeeRate);
    expect(new BigNumber(customAbsFees).isGreaterThan(absFees)).toBe(true);
  });

  test("Handles additional UTXOs correctly", () => {
    const cpfpTx = new CPFPTransaction({
      parentPsbt: CPFP_FIXTURES[0].parentPsbt,
      network: Network.TESTNET,
      targetFeeRate: 30,
      spendableOutputs: [1],
      destinationAddress:
        "tb1qhjtyry0qwm5l6v5v7y27hc6m60vm0d8exlr3cswdrxsgaygqvd2q5zsl0n",
      requiredSigners: 2,
      totalSigners: 3,
      additionalUtxos: CPFP_FIXTURES[0].additionalUtxos,
    });

    const childPsbt = cpfpTx.prepareCPFP();
    expect(childPsbt.PSBT_GLOBAL_INPUT_COUNT).toBe(2); // 1 from parent + 1 additional
  });

  test("Throws error when insufficient funds for CPFP", () => {
    const cpfpTx = new CPFPTransaction({
      parentPsbt: CPFP_FIXTURES[1].parentPsbt,
      network: Network.TESTNET,
      targetFeeRate: 1000, // Unrealistically high fee rate
      spendableOutputs: [1],
      destinationAddress:
        "tb1qhjtyry0qwm5l6v5v7y27hc6m60vm0d8exlr3cswdrxsgaygqvd2q5zsl0n",
      requiredSigners: 2,
      totalSigners: 3,
    });

    expect(() => {
      cpfpTx.prepareCPFP();
    }).toThrow("Insufficient funds in additional UTXOs to cover CPFP fee");
  });
});
