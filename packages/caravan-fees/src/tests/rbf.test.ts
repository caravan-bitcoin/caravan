import {
  createCancelRbfTransaction,
  createAcceleratedRbfTransaction,
} from "../rbf";
import {
  rbfTransactionFixture,
  rbfReplacementFixture,
  fullRbfTransactionFixture,
} from "./rbf.fixtures";
import { PsbtV2 } from "@caravan/psbt";
import BigNumber from "bignumber.js";
import { TransactionAnalyzer } from "../transactionAnalyzer";
import {
  calculateTotalInputValue,
  calculateTotalOutputValue,
  estimatePSBTvsize,
} from "../utils";

describe("RBF Transaction Functions", () => {
  describe("createCancelRbfTransaction", () => {
    const fixture = rbfTransactionFixture[0];

    it("should create a valid cancel RBF transaction", () => {
      const cancelPsbt = createCancelRbfTransaction({
        originalTx: fixture.test.txHex,
        availableInputs: fixture.test.availableUtxos,
        cancelAddress: "bc1q7y50e8culkenu3tnn66ly6gq9m43y8ymk70k8z",
        network: fixture.test.network,
        dustThreshold: fixture.test.dustThreshold,
        scriptType: fixture.test.scriptType,
        requiredSigners: fixture.test.requiredSigners,
        totalSigners: fixture.test.totalSigners,
        targetFeeRate: fixture.test.targetFeeRate,
        absoluteFee: fixture.expected.fee,
        fullRBF: false,
        strict: false,
      });

      const psbt = new PsbtV2(cancelPsbt);

      // Step 1: Verify transaction analysis
      const txAnalyzer = new TransactionAnalyzer({
        txHex: fixture.test.txHex,
        network: fixture.test.network,
        targetFeeRate: fixture.test.targetFeeRate,
        absoluteFee: fixture.expected.fee,
        availableUtxos: fixture.test.availableUtxos,
        requiredSigners: fixture.test.requiredSigners,
        totalSigners: fixture.test.totalSigners,
        addressType: fixture.test.scriptType,
      });
      const analysis = txAnalyzer.analyze();

      // Step 2: Verify RBF possibility
      expect(analysis.canRBF).toBe(true);

      // Step 3: Verify new transaction template
      expect(psbt.PSBT_GLOBAL_INPUT_COUNT).toBe(fixture.expected.inputCount);
      expect(psbt.PSBT_GLOBAL_OUTPUT_COUNT).toBe(1);

      // Step 4: Verify cancellation output
      expect(psbt.PSBT_OUT_SCRIPT[0]).toContain(
        "0014f128fc9f1cfdb33e45739eb5f269002eeb121c9b", //"0014f128fc9f1cfdb33e45739eb5f269002eeb121c9b" is the scriptPubKey for The address "bc1q7y50e8culkenu3tnn66ly6gq9m43y8ymk70k8z"
      );

      // Step 5 & 6: Verify inputs
      expect(psbt.PSBT_IN_PREVIOUS_TXID).toContain(fixture.test.inputs[0].txid);
      expect(psbt.PSBT_IN_OUTPUT_INDEX).toContain(fixture.test.inputs[0].vout);

      // Step 7: Verify cancellation output amount
      const totalInputAmount = calculateTotalInputValue(psbt);
      const totalOutputAmount = calculateTotalOutputValue(psbt);
      const fee = totalInputAmount.minus(totalOutputAmount);

      // Step 8: Verify RBF requirements
      expect(
        fee.gte(fixture.expected.fee) && fee.lte(fixture.expected.fee + 500),
      ).toBe(true);
      const feeRate = fee.dividedBy(estimatePSBTvsize(psbt));
      expect(feeRate.toNumber()).toBeGreaterThanOrEqual(
        fixture.test.targetFeeRate,
      );
    });
  });

  describe("createAcceleratedRbfTransaction", () => {
    const fixture = rbfReplacementFixture[0];

    it("should create a valid accelerated RBF transaction", () => {
      const acceleratedPsbt = createAcceleratedRbfTransaction({
        originalTx: fixture.test.originalTxHex,
        availableInputs: fixture.test.availableUtxos,
        network: fixture.test.network,
        dustThreshold: fixture.test.dustThreshold,
        scriptType: fixture.test.scriptType,
        requiredSigners: fixture.test.requiredSigners,
        totalSigners: fixture.test.totalSigners,
        targetFeeRate: fixture.test.targetFeeRate,
        absoluteFee: fixture.expected.fee,
        changeAddress: "bc1q7y50e8culkenu3tnn66ly6gq9m43y8ymk70k8z",
        changeIndex: undefined,
      });

      const psbt = new PsbtV2(acceleratedPsbt);
      console.log("psbt2", acceleratedPsbt, psbt);
      // Step 1: Verify transaction analysis
      const txAnalyzer = new TransactionAnalyzer({
        txHex: fixture.test.originalTxHex,
        network: fixture.test.network,
        targetFeeRate: fixture.test.targetFeeRate,
        absoluteFee: fixture.expected.fee,
        availableUtxos: fixture.test.availableUtxos,
        requiredSigners: fixture.test.requiredSigners,
        totalSigners: fixture.test.totalSigners,
        addressType: fixture.test.scriptType,
      });
      const analysis = txAnalyzer.analyze();

      // Step 2: Verify RBF possibility
      expect(analysis.canRBF).toBe(true);

      // Step 3: Verify new transaction template
      expect(psbt.PSBT_GLOBAL_INPUT_COUNT).toBe(fixture.expected.inputCount);
      expect(psbt.PSBT_GLOBAL_OUTPUT_COUNT).toBe(fixture.expected.outputCount);

      // Step 4: Verify non-change outputs preservation
      for (let i = 1; i < txAnalyzer.outputs.length; i++) {
        if (!txAnalyzer.outputs[i].isMalleable) {
          expect(psbt.PSBT_OUT_AMOUNT[i].toString()).toBe(
            txAnalyzer.outputs[i].amountSats,
          );
        }
      }

      // Step 5 & 6: Verify inputs
      expect(psbt.PSBT_IN_PREVIOUS_TXID).toContain(fixture.test.inputs[0].txid);
      expect(psbt.PSBT_IN_OUTPUT_INDEX).toContain(fixture.test.inputs[0].vout);

      // Step 7: Verify change output
      expect(psbt.PSBT_OUT_SCRIPT[0]).toContain(
        "00142dc1c9f7da43cc0205a2f2c94bd337799ac0a0c9",
      );
      const changeAmount = new BigNumber(psbt.PSBT_OUT_AMOUNT[0].toString());
      expect(changeAmount.isGreaterThan(fixture.test.dustThreshold)).toBe(true);

      // Step 8: Verify RBF requirements
      const totalInputAmount = calculateTotalInputValue(psbt);
      const totalOutputAmount = calculateTotalOutputValue(psbt);
      const fee = totalInputAmount.minus(totalOutputAmount);
      console.log(
        "fees",
        totalInputAmount.toString(),
        totalOutputAmount.toString(),
        fee.toString(),
        fixture.expected.fee,
      );
      expect(
        fee.gte(fixture.expected.fee) && fee.lte(fixture.expected.fee + 500),
      ).toBe(true);
      console.log(
        "PSBT info",
        totalInputAmount.toString(),
        totalOutputAmount.toString(),
        fee.toString(),
      );

      // Step 9: Verify transaction validity
      const feeRate = fee.dividedBy(estimatePSBTvsize(psbt));
      expect(feeRate.isGreaterThanOrEqualTo(fixture.test.targetFeeRate)).toBe(
        true,
      );
    });

    it("should throw an error when inputs are insufficient for fees", () => {
      const lowValueInputs = [
        {
          ...fixture.test.availableUtxos[0],
          value: "100",
        },
      ];

      expect(() => {
        createAcceleratedRbfTransaction({
          originalTx: fixture.test.originalTxHex,
          availableInputs: lowValueInputs,
          network: fixture.test.network,
          dustThreshold: fixture.test.dustThreshold,
          scriptType: fixture.test.scriptType,
          requiredSigners: fixture.test.requiredSigners,
          totalSigners: fixture.test.totalSigners,
          targetFeeRate: fixture.test.targetFeeRate,
          absoluteFee: fixture.expected.fee,
          changeIndex: 0,
          changeAddress: "bc1q7y50e8culkenu3tnn66ly6gq9m43y8ymk70k8z",
        });
      }).toThrow(
        "Failed to create a valid accelerated RBF transaction. Ensure all inputs and outputs are valid and fee requirements are met.",
      );
    });

    it("should create a transaction with exact target fee rate", () => {
      const acceleratedPsbt = createAcceleratedRbfTransaction({
        originalTx: fixture.test.originalTxHex,
        availableInputs: fixture.test.availableUtxos,
        network: fixture.test.network,
        dustThreshold: fixture.test.dustThreshold,
        scriptType: fixture.test.scriptType,
        requiredSigners: fixture.test.requiredSigners,
        totalSigners: fixture.test.totalSigners,
        targetFeeRate: fixture.test.targetFeeRate,
        absoluteFee: fixture.expected.fee,
        changeIndex: 0,
        changeAddress: "bc1q7y50e8culkenu3tnn66ly6gq9m43y8ymk70k8z",
      });

      const psbt = new PsbtV2(acceleratedPsbt);

      const totalInputAmount = calculateTotalInputValue(psbt);
      const totalOutputAmount = calculateTotalOutputValue(psbt);
      const fee = totalInputAmount.minus(totalOutputAmount);

      expect(
        fee.gte(fixture.expected.fee) && fee.lte(fixture.expected.fee + 500),
      ).toBe(true);

      const feeRate = fee.dividedBy(estimatePSBTvsize(psbt));
      expect(feeRate.isGreaterThanOrEqualTo(fixture.test.targetFeeRate)).toBe(
        true,
      );
    });
  });

  describe("Full RBF Transaction", () => {
    const fixture = fullRbfTransactionFixture[0];

    it("should create a valid full RBF transaction", () => {
      const fullRbfPsbt = createAcceleratedRbfTransaction({
        originalTx: fixture.test.txHex,
        availableInputs: fixture.test.availableUtxos,
        network: fixture.test.network,
        dustThreshold: fixture.test.dustThreshold,
        scriptType: fixture.test.scriptType,
        requiredSigners: fixture.test.requiredSigners,
        totalSigners: fixture.test.totalSigners,
        targetFeeRate: fixture.test.targetFeeRate,
        absoluteFee: fixture.expected.fee,
        changeIndex: undefined,
        changeAddress: "bc1q7y50e8culkenu3tnn66ly6gq9m43y8ymk70k8z",
        fullRBF: true, // Enable full RBF
      });

      const psbt = new PsbtV2(fullRbfPsbt);

      // Verify that the transaction is valid even though original didn't signal RBF
      expect(psbt.PSBT_GLOBAL_INPUT_COUNT).toBeGreaterThanOrEqual(
        fixture.expected.inputCount,
      );
      expect(psbt.PSBT_GLOBAL_OUTPUT_COUNT).toBe(fixture.expected.outputCount);

      // Verify that at least one input is from the original transaction
      expect(psbt.PSBT_IN_PREVIOUS_TXID).toContain(fixture.test.inputs[0].txid);

      // Verify fee calculations
      const totalInputAmount = calculateTotalInputValue(psbt);
      const totalOutputAmount = calculateTotalOutputValue(psbt);
      const fee = totalInputAmount.minus(totalOutputAmount);

      // Check if the new fee is higher than the original
      expect(
        fee.gte(fixture.expected.fee) && fee.lte(fixture.expected.fee + 500),
      ).toBe(true);

      // Verify the fee rate is at least the target fee rate
      const feeRate = fee.dividedBy(estimatePSBTvsize(psbt));
      expect(feeRate.toNumber()).toBeGreaterThanOrEqual(
        fixture.test.targetFeeRate,
      );
    });

    it("should throw an error when full RBF is not enabled for non-RBF transaction", () => {
      expect(() => {
        createAcceleratedRbfTransaction({
          originalTx: fixture.test.txHex,
          availableInputs: fixture.test.availableUtxos,
          network: fixture.test.network,
          dustThreshold: fixture.test.dustThreshold,
          scriptType: fixture.test.scriptType,
          requiredSigners: fixture.test.requiredSigners,
          totalSigners: fixture.test.totalSigners,
          targetFeeRate: fixture.test.targetFeeRate,
          absoluteFee: fixture.expected.fee,
          changeIndex: 0,
          changeAddress: "bc1q7y50e8culkenu3tnn66ly6gq9m43y8ymk70k8z",
          fullRBF: false, // Disable full RBF
        });
      }).toThrow("RBF is not possible for this transaction");
    });
  });

  describe("Edge Cases", () => {
    const fixture = rbfTransactionFixture[0];

    it("should handle dust threshold correctly", () => {
      const highDustThreshold = "100000"; // Unrealistically high dust threshold

      const cancelPsbt = createCancelRbfTransaction({
        originalTx: fixture.test.txHex,
        availableInputs: fixture.test.availableUtxos,
        cancelAddress: "bc1q7y50e8culkenu3tnn66ly6gq9m43y8ymk70k8z",
        network: fixture.test.network,
        dustThreshold: highDustThreshold,
        scriptType: fixture.test.scriptType,
        requiredSigners: fixture.test.requiredSigners,
        totalSigners: fixture.test.totalSigners,
        targetFeeRate: fixture.test.targetFeeRate,
        absoluteFee: fixture.expected.fee,
        fullRBF: false,
      });

      const psbt = new PsbtV2(cancelPsbt);

      // Ensure that even with high dust threshold, we still have an output
      expect(psbt.PSBT_GLOBAL_OUTPUT_COUNT).toBe(1);

      const outputAmount = new BigNumber(psbt.PSBT_OUT_AMOUNT[0].toString());
      expect(outputAmount.isGreaterThan(highDustThreshold)).toBe(true);
    });

    it("should handle very high fee rates", () => {
      const highFeeRate = 100; // 1000 sat/vbyte

      const acceleratedPsbt = createAcceleratedRbfTransaction({
        originalTx: fixture.test.txHex,
        availableInputs: fixture.test.availableUtxos,
        network: fixture.test.network,
        dustThreshold: fixture.test.dustThreshold,
        scriptType: fixture.test.scriptType,
        requiredSigners: fixture.test.requiredSigners,
        totalSigners: fixture.test.totalSigners,
        targetFeeRate: highFeeRate,
        absoluteFee: new BigNumber(fixture.expected.fee).times(100).toString(), // High absolute fee
        changeIndex: 0,
        changeAddress: "bc1q7y50e8culkenu3tnn66ly6gq9m43y8ymk70k8z",
      });

      const psbt = new PsbtV2(acceleratedPsbt);

      const totalInputAmount = calculateTotalInputValue(psbt);
      const totalOutputAmount = calculateTotalOutputValue(psbt);
      const fee = totalInputAmount.minus(totalOutputAmount);
      expect(
        fee.gte(fixture.expected.fee) && fee.lte(fixture.expected.fee + 500),
      ).toBe(true);
      const feeRate = fee.dividedBy(estimatePSBTvsize(psbt));
      expect(feeRate.isGreaterThanOrEqualTo(fixture.test.targetFeeRate)).toBe(
        true,
      );
    });

    it("should throw an error when all inputs are below dust threshold", () => {
      const lowValueInputs = fixture.test.availableUtxos.map((utxo) => ({
        ...utxo,
        value: "100", // Below dust threshold
      }));

      expect(() => {
        createCancelRbfTransaction({
          originalTx: fixture.test.txHex,
          availableInputs: lowValueInputs,
          cancelAddress: "bc1q7y50e8culkenu3tnn66ly6gq9m43y8ymk70k8z",
          network: fixture.test.network,
          dustThreshold: fixture.test.dustThreshold,
          scriptType: fixture.test.scriptType,
          requiredSigners: fixture.test.requiredSigners,
          totalSigners: fixture.test.totalSigners,
          targetFeeRate: fixture.test.targetFeeRate,
          absoluteFee: fixture.expected.fee,
          fullRBF: false,
        });
      }).toThrow(
        "Failed to create a valid cancel RBF transaction. Ensure all inputs and outputs are valid and fee requirements are met.",
      );
    });

    it("should handle transactions with maximum number of inputs", () => {
      const maxInputs = Array(10000).fill(fixture.test.availableUtxos[0]);

      const cancelPsbt = createCancelRbfTransaction({
        originalTx: fixture.test.txHex,
        availableInputs: maxInputs,
        cancelAddress: "bc1q7y50e8culkenu3tnn66ly6gq9m43y8ymk70k8z",
        network: fixture.test.network,
        dustThreshold: fixture.test.dustThreshold,
        scriptType: fixture.test.scriptType,
        requiredSigners: fixture.test.requiredSigners,
        totalSigners: fixture.test.totalSigners,
        targetFeeRate: fixture.test.targetFeeRate,
        absoluteFee: fixture.expected.fee,
      });

      const psbt = new PsbtV2(cancelPsbt);

      expect(psbt.PSBT_GLOBAL_INPUT_COUNT).toBeLessThanOrEqual(10000);
      expect(psbt.PSBT_GLOBAL_OUTPUT_COUNT).toBe(1);
    });
  });
});
