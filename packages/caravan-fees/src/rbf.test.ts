import { PsbtV2 } from "@caravan/psbt";
import BigNumber from "bignumber.js";
import { RbfTransaction } from "./rbf";
import { TransactionState } from "./types";
import { RBF_FIXTURES, getRbfOptions, createSamplePsbt } from "./rbf.fixtures";

describe("RbfTransaction", () => {
  RBF_FIXTURES.forEach((fixture, index) => {
    describe(fixture.case, () => {
      let rbfTx: RbfTransaction;

      beforeEach(() => {
        const options = getRbfOptions(index);
        rbfTx = new RbfTransaction(options);
      });

      test("should initialize with correct properties", () => {
        expect(rbfTx).toBeDefined();
        expect(rbfTx.targetFeeRate).toBe(fixture.targetFeeRate);
        expect(rbfTx.state).toBe(TransactionState.INITIALIZED);
      });

      test("should analyze the transaction successfully", () => {
        const canRbf = rbfTx.analyze();
        expect(canRbf).toBe(true);
        expect(rbfTx.state).toBe(TransactionState.ANALYZED);
      });

      test("should prepare an accelerated transaction", () => {
        rbfTx.analyze();
        const prepared = rbfTx.prepareAccelerated();
        expect(prepared).toBe(true);
        expect(rbfTx.state).toBe(TransactionState.FINALIZED);

        const finalizedPsbt = rbfTx.getFinalizedPsbt();
        expect(finalizedPsbt).toBeInstanceOf(PsbtV2);
        expect(finalizedPsbt?.PSBT_GLOBAL_INPUT_COUNT).toBe(
          fixture.expectedInputCount,
        );
        expect(finalizedPsbt?.PSBT_GLOBAL_OUTPUT_COUNT).toBe(
          fixture.expectedOutputCount,
        );
      });

      test("should calculate the correct fee increase", () => {
        rbfTx.analyze();
        const feeIncrease = rbfTx.calculateFeeIncrease();
        expect(feeIncrease.toNumber()).toBeGreaterThanOrEqual(
          fixture.expectedFeeIncrease,
        );
      });

      test("should return correct transaction info", () => {
        rbfTx.analyze();
        rbfTx.prepareAccelerated();
        const info = rbfTx.getTransactionInfo();
        expect(info.state).toBe(TransactionState.FINALIZED);
        expect(info.canAccelerate).toBe(true);
        expect(info.canCancel).toBe(true);
        expect(Number(info.feeIncrease)).toBeGreaterThanOrEqual(
          fixture.expectedFeeIncrease,
        );
        expect(Number(info.newFee)).toBeGreaterThan(Number(info.originalFee));
      });

      test("should calculate cost to accelerate", () => {
        rbfTx.analyze();
        const cost = rbfTx.costToAccelerate();
        expect(Number(cost)).toBeGreaterThanOrEqual(
          fixture.expectedFeeIncrease,
        );
      });

      test("should calculate cost to cancel", () => {
        rbfTx.analyze();
        const destinationAddress = "tb1qw508d6qejxtdg4y5r3zarvary0c5xw7kxpjzsx";
        const cost = rbfTx.costToCancel(destinationAddress);
        expect(Number(cost)).toBeGreaterThanOrEqual(
          fixture.expectedFeeIncrease,
        );
      });

      test("should get absolute fees", () => {
        const absFees = rbfTx.getAbsFees();
        expect(Number(absFees)).toBeGreaterThan(0);
      });

      test("should handle custom fee rate", () => {
        const customFeeRate = fixture.targetFeeRate * 2;
        const absFees = rbfTx.getAbsFees(customFeeRate);
        expect(Number(absFees)).toBeGreaterThan(Number(rbfTx.getAbsFees()));
      });

      test("should update target fee rate", () => {
        const newFeeRate = fixture.targetFeeRate * 2;
        rbfTx.targetFeeRate = newFeeRate;
        expect(rbfTx.targetFeeRate).toBe(newFeeRate);
        expect(rbfTx.state).toBe(TransactionState.INITIALIZED);
      });

      test("should prepare a canceled transaction", () => {
        rbfTx.analyze();
        const destinationAddress = "tb1qw508d6qejxtdg4y5r3zarvary0c5xw7kxpjzsx";
        const prepared = rbfTx.prepareCanceled(destinationAddress);
        expect(prepared).toBe(true);
        expect(rbfTx.state).toBe(TransactionState.FINALIZED);

        const finalizedPsbt = rbfTx.getFinalizedPsbt();
        expect(finalizedPsbt).toBeInstanceOf(PsbtV2);
        expect(finalizedPsbt?.PSBT_GLOBAL_OUTPUT_COUNT).toBe(1);
      });

      test("should handle additional UTXOs correctly", () => {
        rbfTx.analyze();
        rbfTx.prepareAccelerated();
        const selectedUtxos = rbfTx.getSelectedAdditionalUtxos;
        expect(selectedUtxos.length).toBeLessThanOrEqual(
          fixture.additionalUtxos.length,
        );
      });
    });
  });

  describe("Error handling and edge cases", () => {
    test("should throw error for non-RBF transaction", () => {
      const nonRbfPsbt = new PsbtV2();
      nonRbfPsbt.addInput({
        previousTxId: Buffer.from(
          "1234567890123456789012345678901234567890123456789012345678901234",
          "hex",
        ),
        outputIndex: 0,
        sequence: 0xffffffff, // Non-RBF sequence
      });
      nonRbfPsbt.addOutput({
        script: Buffer.from(
          "0014000102030405060708090a0b0c0d0e0f10111213",
          "hex",
        ),
        amount: 100000,
      });

      const options = {
        ...getRbfOptions(0),
        psbt: nonRbfPsbt,
      };

      expect(() => new RbfTransaction(options)).toThrow(
        "This transaction is not signaling RBF.",
      );
    });

    test("should handle insufficient funds for acceleration", () => {
      const psbt = createSamplePsbt(1, 1);
      const options = {
        ...getRbfOptions(0),
        psbt,
        targetFeeRate: 1000000, // Extremely high fee rate
      };

      const rbfTx = new RbfTransaction(options);
      rbfTx.analyze();
      expect(rbfTx.canAccelerate).toBe(false);
      expect(() => rbfTx.prepareAccelerated()).toThrow();
    });

    test("should handle dust outputs", () => {
      const psbt = createSamplePsbt(1, 2);
      const options = {
        ...getRbfOptions(0),
        psbt,
        dustThreshold: 1000000, // Very high dust threshold
      };

      const rbfTx = new RbfTransaction(options);
      rbfTx.analyze();
      expect(() => rbfTx.prepareAccelerated()).toThrow();
    });

    test("should handle transactions with no change output", () => {
      const psbt = createSamplePsbt(1, 1);
      const options = {
        ...getRbfOptions(0),
        psbt,
        changeOutputIndices: [],
      };

      const rbfTx = new RbfTransaction(options);
      rbfTx.analyze();
      const prepared = rbfTx.prepareAccelerated();
      expect(prepared).toBe(true);
    });

    test("should throw error when accessing finalized PSBT before finalization", () => {
      const rbfTx = new RbfTransaction(getRbfOptions(0));
      expect(() => rbfTx.getFinalizedPsbt()).toThrow();
    });

    test("should throw error when preparing acceleration before analysis", () => {
      const rbfTx = new RbfTransaction(getRbfOptions(0));
      expect(() => rbfTx.prepareAccelerated()).toThrow();
    });

    test("should throw error when preparing cancellation before analysis", () => {
      const rbfTx = new RbfTransaction(getRbfOptions(0));
      const destinationAddress = "tb1qw508d6qejxtdg4y5r3zarvary0c5xw7kxpjzsx";
      expect(() => rbfTx.prepareCanceled(destinationAddress)).toThrow();
    });
  });

  describe("State transitions", () => {
    let rbfTx: RbfTransaction;

    beforeEach(() => {
      rbfTx = new RbfTransaction(getRbfOptions(0));
    });

    test("should transition through states correctly for acceleration", () => {
      expect(rbfTx.state).toBe(TransactionState.INITIALIZED);
      rbfTx.analyze();
      expect(rbfTx.state).toBe(TransactionState.ANALYZED);
      rbfTx.prepareAccelerated();
      expect(rbfTx.state).toBe(TransactionState.FINALIZED);
    });

    test("should transition through states correctly for cancellation", () => {
      expect(rbfTx.state).toBe(TransactionState.INITIALIZED);
      rbfTx.analyze();
      expect(rbfTx.state).toBe(TransactionState.ANALYZED);
      rbfTx.prepareCanceled("tb1qw508d6qejxtdg4y5r3zarvary0c5xw7kxpjzsx");
      expect(rbfTx.state).toBe(TransactionState.FINALIZED);
    });

    test("should reset state when updating target fee rate", () => {
      rbfTx.analyze();
      expect(rbfTx.state).toBe(TransactionState.ANALYZED);
      rbfTx.targetFeeRate = 20;
      expect(rbfTx.state).toBe(TransactionState.INITIALIZED);
    });
  });

  describe("Fee calculations", () => {
    let rbfTx: RbfTransaction;

    beforeEach(() => {
      rbfTx = new RbfTransaction(getRbfOptions(0));
      rbfTx.analyze();
    });

    test("should calculate correct original fee", () => {
      const originalFee = new BigNumber(rbfTx.originalFee);
      expect(originalFee.isGreaterThan(0)).toBe(true);
    });

    test("should calculate correct new fee after acceleration", () => {
      rbfTx.prepareAccelerated();
      const newFee = new BigNumber(rbfTx.newFee);
      expect(newFee.isGreaterThan(rbfTx.originalFee)).toBe(true);
    });

    test("should calculate correct fee increase", () => {
      const feeIncrease = rbfTx.calculateFeeIncrease();
      expect(feeIncrease.isGreaterThan(0)).toBe(true);
    });

    test("should calculate correct absolute fees", () => {
      const absFees = new BigNumber(rbfTx.getAbsFees());
      const estimatedSize = rbfTx.vSizeofOrignalTx;
      const expectedFees = new BigNumber(rbfTx.targetFeeRate).multipliedBy(
        estimatedSize,
      );
      expect(absFees.isEqualTo(expectedFees)).toBe(true);
    });
  });
});
