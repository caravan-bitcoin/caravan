import {
  createCancelRbfTransaction,
  createAcceleratedRbfTransaction,
} from "../rbf";
import { rbfFixtures } from "./rbf.fixtures";
import { PsbtV2 } from "@caravan/psbt";
import BigNumber from "bignumber.js";
import {
  calculateTotalInputValue,
  calculateTotalOutputValue,
  estimateTransactionVsize,
} from "../utils";

describe("RBF Transaction Functions", () => {
  describe("createCancelRbfTransaction", () => {
    rbfFixtures.cancelRbf.forEach((fixture) => {
      it(fixture.case, () => {
        const cancelPsbt = createCancelRbfTransaction({
          originalTx: fixture.originalTx,
          availableInputs: fixture.availableUtxos,
          cancelAddress: fixture.cancelAddress,
          network: fixture.network,
          dustThreshold: fixture.dustThreshold,
          scriptType: fixture.scriptType,
          requiredSigners: fixture.requiredSigners,
          totalSigners: fixture.totalSigners,
          targetFeeRate: fixture.targetFeeRate,
          absoluteFee: fixture.expected.fee,
          fullRBF: false,
          strict: false,
        });

        const psbt = new PsbtV2(cancelPsbt);

        expect(psbt.PSBT_GLOBAL_INPUT_COUNT).toBe(fixture.expected.inputCount);
        expect(psbt.PSBT_GLOBAL_OUTPUT_COUNT).toBe(
          fixture.expected.outputCount,
        );

        const totalInputAmount = calculateTotalInputValue(psbt);
        const totalOutputAmount = calculateTotalOutputValue(psbt);
        const fee = totalInputAmount.minus(totalOutputAmount);
        expect(fee.toString()).toBe(fixture.expected.expectedfee);

        const feeRate = fee.dividedBy(
          estimateTransactionVsize({
            addressType: fixture.scriptType,
            numInputs: psbt.PSBT_GLOBAL_INPUT_COUNT,
            numOutputs: psbt.PSBT_GLOBAL_OUTPUT_COUNT,
            m: fixture.requiredSigners,
            n: fixture.totalSigners,
          }),
        );
        expect(feeRate.toNumber()).toBeCloseTo(fixture.expected.feeRate, 2);
      });
    });
  });

  describe("createAcceleratedRbfTransaction", () => {
    rbfFixtures.acceleratedRbf.forEach((fixture) => {
      it(fixture.case, () => {
        const acceleratedPsbt = createAcceleratedRbfTransaction({
          originalTx: fixture.originalTx,
          availableInputs: fixture.availableUtxos,
          network: fixture.network,
          dustThreshold: fixture.dustThreshold,
          scriptType: fixture.scriptType,
          requiredSigners: fixture.requiredSigners,
          totalSigners: fixture.totalSigners,
          targetFeeRate: fixture.targetFeeRate,
          absoluteFee: fixture.expected.fee,
          changeAddress: fixture.changeAddress,
        });

        const psbt = new PsbtV2(acceleratedPsbt);

        // Add your assertions here based on the fixture's expected values
        expect(psbt.PSBT_GLOBAL_INPUT_COUNT).toBe(fixture.expected.inputCount);
        expect(psbt.PSBT_GLOBAL_OUTPUT_COUNT).toBe(
          fixture.expected.outputCount,
        );

        const totalInputAmount = calculateTotalInputValue(psbt);
        const totalOutputAmount = calculateTotalOutputValue(psbt);
        const fee = totalInputAmount.minus(totalOutputAmount);
        expect(fee.toString()).toBe(fixture.expected.expectedfee);

        const feeRate = fee.dividedBy(
          estimateTransactionVsize({
            addressType: fixture.scriptType,
            numInputs: psbt.PSBT_GLOBAL_INPUT_COUNT,
            numOutputs: psbt.PSBT_GLOBAL_OUTPUT_COUNT,
            m: fixture.requiredSigners,
            n: fixture.totalSigners,
          }),
        );
        expect(feeRate.toNumber()).toBeCloseTo(fixture.expected.feeRate, 2);
      });
    });
  });

  describe("Full RBF Transaction", () => {
    rbfFixtures.fullRbf.forEach((fixture) => {
      it(fixture.case, () => {
        const fullRbfPsbt = createAcceleratedRbfTransaction({
          originalTx: fixture.originalTx,
          availableInputs: fixture.availableUtxos,
          network: fixture.network,
          dustThreshold: fixture.dustThreshold,
          scriptType: fixture.scriptType,
          requiredSigners: fixture.requiredSigners,
          totalSigners: fixture.totalSigners,
          targetFeeRate: fixture.targetFeeRate,
          absoluteFee: fixture.expected.fee,
          changeAddress: fixture.changeAddress,
          fullRBF: fixture.fullRBF,
        });

        const psbt = new PsbtV2(fullRbfPsbt);

        // Add your assertions here based on the fixture's expected values
        expect(psbt.PSBT_GLOBAL_INPUT_COUNT).toBe(fixture.expected.inputCount);
        expect(psbt.PSBT_GLOBAL_OUTPUT_COUNT).toBe(
          fixture.expected.outputCount,
        );

        const totalInputAmount = calculateTotalInputValue(psbt);
        const totalOutputAmount = calculateTotalOutputValue(psbt);
        const fee = totalInputAmount.minus(totalOutputAmount);
        expect(fee.toString()).toBe(fixture.expected.expectedFee);

        const feeRate = fee.dividedBy(
          estimateTransactionVsize({
            addressType: fixture.scriptType,
            numInputs: psbt.PSBT_GLOBAL_INPUT_COUNT,
            numOutputs: psbt.PSBT_GLOBAL_OUTPUT_COUNT,
            m: fixture.requiredSigners,
            n: fixture.totalSigners,
          }),
        );
        expect(feeRate.toNumber()).toBeCloseTo(fixture.expected.feeRate, 2);
      });
    });
  });
  describe("Invalid Cases", () => {
    rbfFixtures.invalidCases.forEach((fixture) => {
      it(fixture.case, () => {
        expect(() => {
          if (fixture.case.includes("cancel")) {
            createCancelRbfTransaction({
              originalTx: fixture.originalTx,
              availableInputs: fixture.availableUtxos,
              cancelAddress: fixture.changeAddress,
              network: fixture.network,
              dustThreshold: fixture.dustThreshold,
              scriptType: fixture.scriptType,
              requiredSigners: fixture.requiredSigners,
              totalSigners: fixture.totalSigners,
              targetFeeRate: fixture.targetFeeRate,
              absoluteFee: fixture.absoluteFee,
            });
          } else {
            createAcceleratedRbfTransaction({
              originalTx: fixture.originalTx,
              availableInputs: fixture.availableUtxos,
              network: fixture.network,
              dustThreshold: fixture.dustThreshold,
              scriptType: fixture.scriptType,
              requiredSigners: fixture.requiredSigners,
              totalSigners: fixture.totalSigners,
              targetFeeRate: fixture.targetFeeRate,
              absoluteFee: fixture.absoluteFee,
              changeAddress: fixture.changeAddress,
              changeIndex: fixture.changeIndex,
            });
          }
        }).toThrow(fixture.expectedError);
      });
    });
  });

  describe("Edge Cases", () => {
    it("should handle dust threshold correctly", () => {
      const fixture = rbfFixtures.cancelRbf[0]; // Use the first cancel RBF fixture
      const highDustThreshold = "100000"; // Unrealistically high dust threshold

      const cancelPsbt = createCancelRbfTransaction({
        originalTx: fixture.originalTx,
        availableInputs: fixture.availableUtxos,
        cancelAddress: fixture.cancelAddress,
        network: fixture.network,
        dustThreshold: highDustThreshold,
        scriptType: fixture.scriptType,
        requiredSigners: fixture.requiredSigners,
        totalSigners: fixture.totalSigners,
        targetFeeRate: fixture.targetFeeRate,
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
      const fixture = rbfFixtures.acceleratedRbf[0]; // Use the first accelerated RBF fixture
      const highFeeRate = 100; // 100 sat/vbyte

      const acceleratedPsbt = createAcceleratedRbfTransaction({
        originalTx: fixture.originalTx,
        availableInputs: fixture.availableUtxos,
        network: fixture.network,
        dustThreshold: fixture.dustThreshold,
        scriptType: fixture.scriptType,
        requiredSigners: fixture.requiredSigners,
        totalSigners: fixture.totalSigners,
        targetFeeRate: highFeeRate,
        absoluteFee: new BigNumber(fixture.expected.fee).times(10).toString(), // High absolute fee
        changeAddress: fixture.changeAddress,
      });

      const psbt = new PsbtV2(acceleratedPsbt);

      const totalInputAmount = calculateTotalInputValue(psbt);
      const totalOutputAmount = calculateTotalOutputValue(psbt);
      const fee = totalInputAmount.minus(totalOutputAmount);
      const feeRate = fee.dividedBy(
        estimateTransactionVsize({
          addressType: fixture.scriptType,
          numInputs: psbt.PSBT_GLOBAL_INPUT_COUNT,
          numOutputs: psbt.PSBT_GLOBAL_OUTPUT_COUNT,
          m: fixture.requiredSigners,
          n: fixture.totalSigners,
        }),
      );

      expect(feeRate.isGreaterThanOrEqualTo(highFeeRate)).toBe(true);
    });

    it("should handle transactions with maximum number of inputs", () => {
      const fixture = rbfFixtures.cancelRbf[0]; // Use the first cancel RBF fixture
      const maxInputs = Array(10000).fill(fixture.availableUtxos[0]);

      const cancelPsbt = createCancelRbfTransaction({
        originalTx: fixture.originalTx,
        availableInputs: maxInputs,
        cancelAddress: fixture.cancelAddress,
        network: fixture.network,
        dustThreshold: fixture.dustThreshold,
        scriptType: fixture.scriptType,
        requiredSigners: fixture.requiredSigners,
        totalSigners: fixture.totalSigners,
        targetFeeRate: fixture.targetFeeRate,
        absoluteFee: fixture.expected.fee,
      });

      const psbt = new PsbtV2(cancelPsbt);

      expect(psbt.PSBT_GLOBAL_INPUT_COUNT).toBeLessThanOrEqual(10000);
      expect(psbt.PSBT_GLOBAL_OUTPUT_COUNT).toBe(1);
    });
  });
});
