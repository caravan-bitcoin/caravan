import {
  RbfTransaction,
  prepareRbfTransaction,
  prepareCancelTransaction,
} from "./rbf";
import { PsbtV2 } from "@caravan/psbt";
import { RBF_FIXTURES } from "./rbf.fixtures";
import BigNumber from "bignumber.js";

describe("RbfTransaction", () => {
  describe("Constructor", () => {
    it("should initialize correctly with valid options", () => {
      const fixture = RBF_FIXTURES[0];
      const rbfTx = new RbfTransaction(fixture);
      expect(rbfTx).toBeInstanceOf(RbfTransaction);
      expect(rbfTx.targetFeeRate).toBe(fixture.targetFeeRate);
    });

    it("should throw an error if the transaction is not signaling RBF", () => {
      const invalidFixture = {
        ...RBF_FIXTURES[0],
        psbt: "cHNidP8BAHUCAAAAASaBcTce3/KF6Tet7qSze3gADAVmy7OtZGQXE8pCFxv2AAAAAAD+////AtPf9QUAAAAAGXapFNDFmQPFusKGh2DpD9UhpGZap2UgiKwA4fUFAAAAABepFDVF5uM7gyxHBQ8k0+65PJwDlIvHh7MuEwAAAQD9pQEBAAAAAAECiaPHHqtNIOA3G7ukzGmPopXJRjr6Ljl/hTPMti+VZ+UBAAAAFxYAFL4Y0VKpsBIDna89p95PUzSe7LmF/////4b4qkOnHf8USIk6UwpyN+9rRgi7st0tAXHmOuxqSJC0AQAAABcWABT+Pp7xp0XpdNkCxDVZQ6vLNL1TU/////8CAMLrCwAAAAAZdqkUhc/xCX/Z4Ai7NK9wnGIZeziXikiIrHL++E4sAAAAF6kUM5cluiHv1irHU6m80GfWx6ajnQWHAkcwRAIgJxK+IuAnDzlPVoMR3HyppolwuAJf3TskAinwf4pfOiQCIAGLONfc0xTnNMkna9b7QPZzMlvEuqFEyADS8vAtsnZcASED0uFWdJQbrUqZY3LLh+GFbTZSYG2YVi/jnF6efkE/IQUCSDBFAiEA0SuFLYXc2WHS9fSrZgZU327tzHlMDDPOXMMJ/7X85Y0CIGczio4OFyXBl/saiK9Z9R5E5CVbIBZ8hoQDHAXR8lkqASECI7cr7vCWXRC+B3jv7NYfysb3mk6haTkzgHNEZPhPKrMAAAAAAAAA",
      };
      expect(() => new RbfTransaction(invalidFixture)).toThrow(
        "This transaction is not signaling RBF.",
      );
    });
  });

  describe("Getters", () => {
    let rbfTx: RbfTransaction;

    beforeEach(() => {
      rbfTx = new RbfTransaction(RBF_FIXTURES[0]);
    });

    it("should return the correct target fee rate", () => {
      expect(rbfTx.targetFeeRate).toBe(RBF_FIXTURES[0].targetFeeRate);
    });

    it("should calculate the total input value correctly", () => {
      expect(rbfTx.totalInputValue).toBe("1000000");
    });

    it("should calculate the total output value correctly", () => {
      expect(rbfTx.totalOutputValue).toBe("999000");
    });

    it("should calculate the current fee correctly", () => {
      expect(rbfTx.currentFee).toBe("1000");
    });

    it("should calculate the required fee correctly", () => {
      expect(rbfTx.requiredFee).toBe("3000");
    });

    it("should calculate the fee increase correctly", () => {
      expect(rbfTx.feeIncrease).toBe("2000");
    });
  });

  describe("prepareAccelerated", () => {
    it("should create a valid accelerated transaction", () => {
      const fixture = RBF_FIXTURES[0];
      const rbfTx = new RbfTransaction(fixture);
      const acceleratedTx = rbfTx.prepareAccelerated();

      expect(acceleratedTx).toBeInstanceOf(RbfTransaction);
      expect(acceleratedTx.psbt.PSBT_GLOBAL_OUTPUT_COUNT).toBe(
        fixture.expectedOutputCount,
      );
      expect(acceleratedTx.feeIncrease).toBe(
        fixture.expectedFeeIncrease.toString(),
      );
      expect(acceleratedTx.currentFee).toBe(
        fixture.expectedTotalFee.toString(),
      );
    });

    it("should adjust outputs correctly when subtracting fee from a specific output", () => {
      const fixture = RBF_FIXTURES[0];
      const rbfTx = new RbfTransaction(fixture);
      const acceleratedTx = rbfTx.prepareAccelerated();

      const feeOutputAmount = new BigNumber(
        acceleratedTx.psbt.PSBT_OUT_AMOUNT[fixture.feeOutputIndex!].toString(),
      );
      const expectedAmount = new BigNumber(500000).minus(
        fixture.expectedFeeIncrease,
      );
      expect(feeOutputAmount.isEqualTo(expectedAmount)).toBe(true);
    });

    it("should add additional inputs if needed", () => {
      const fixture = RBF_FIXTURES[1];
      const rbfTx = new RbfTransaction(fixture);
      const acceleratedTx = rbfTx.prepareAccelerated();

      expect(acceleratedTx.psbt.PSBT_GLOBAL_INPUT_COUNT).toBe(2);
      expect(acceleratedTx.totalInputValue).toBe("1100000");
    });

    it("should throw an error if the new fee is not higher than the current fee", () => {
      const invalidFixture = { ...RBF_FIXTURES[0], targetFeeRate: 1 };
      const rbfTx = new RbfTransaction(invalidFixture);
      expect(() => rbfTx.prepareAccelerated()).toThrow(
        "New fee must be higher than the current fee",
      );
    });
  });
  describe("prepareAccelerated", () => {
    it("should create a valid accelerated transaction", () => {
      const fixture = RBF_FIXTURES[0];
      const rbfTx = new RbfTransaction(fixture);
      const acceleratedTx = rbfTx.prepareAccelerated();
      const currentFee = new BigNumber(rbfTx.currentFee);
      const feeIncrease = new BigNumber(rbfTx.currentFee);

      expect(acceleratedTx).toBeInstanceOf(PsbtV2);
      expect(acceleratedTx.psbt.PSBT_GLOBAL_OUTPUT_COUNT).toBe(
        fixture.expectedOutputCount,
      );
      expect(rbfTx.feeIncrease.toString()).toBe(
        fixture.expectedFeeIncrease.toString(),
      );
      expect(currentFee.plus(feeIncrease).toString()).toBe(
        fixture.expectedTotalFee.toString(),
      );
    });

    it("should adjust outputs correctly when subtracting fee from a specific output", () => {
      const fixture = RBF_FIXTURES[0];
      const rbfTx = new RbfTransaction(fixture);
      const acceleratedTx = rbfTx.prepareAccelerated();

      const feeOutputAmount = new BigNumber(
        acceleratedTx.psbt.PSBT_OUT_AMOUNT[fixture.feeOutputIndex!].toString(),
      );
      const expectedAmount = new BigNumber(500000).minus(
        fixture.expectedFeeIncrease,
      );
      expect(feeOutputAmount.isEqualTo(expectedAmount)).toBe(true);
    });

    it("should add additional inputs if needed", () => {
      const fixture = RBF_FIXTURES[1];
      const rbfTx = new RbfTransaction(fixture);
      const acceleratedTx = rbfTx.prepareAccelerated();

      expect(acceleratedTx.psbt.PSBT_GLOBAL_INPUT_COUNT).toBe(2);
      expect(rbfTx.totalInputValue.toString()).toBe("1100000");
    });

    it("should throw an error if the new fee is not higher than the current fee", () => {
      const invalidFixture = { ...RBF_FIXTURES[0], targetFeeRate: 1 };
      const rbfTx = new RbfTransaction(invalidFixture);
      expect(() => rbfTx.prepareAccelerated()).toThrow(
        "New fee must be higher than the current fee",
      );
    });
  });

  describe("prepareCanceled", () => {
    it("should create a valid cancellation transaction", () => {
      const fixture = RBF_FIXTURES[2];
      const rbfTx = new RbfTransaction(fixture);
      const currentFee = new BigNumber(rbfTx.currentFee);
      const feeIncrease = new BigNumber(rbfTx.currentFee);

      const canceledTx = rbfTx.prepareCanceled(
        fixture.cancelDestinationAddress!,
      );

      expect(canceledTx).toBeInstanceOf(PsbtV2);
      expect(canceledTx.psbt.PSBT_GLOBAL_OUTPUT_COUNT).toBe(
        fixture.expectedOutputCount,
      );
      expect(rbfTx.feeIncrease.toString()).toBe(
        fixture.expectedFeeIncrease.toString(),
      );
      expect(currentFee.plus(feeIncrease).toString()).toBe(
        fixture.expectedTotalFee.toString(),
      );
    });

    it("should create a single output to the specified address", () => {
      const fixture = RBF_FIXTURES[2];
      const rbfTx = new RbfTransaction(fixture);
      const canceledTx = rbfTx.prepareCanceled(
        fixture.cancelDestinationAddress!,
      );

      expect(canceledTx.psbt.PSBT_GLOBAL_OUTPUT_COUNT).toBe(1);
      expect(canceledTx.psbt.PSBT_OUT_SCRIPT[0]).toBeDefined();
    });
  });

  describe("prepareRbfTransaction", () => {
    it("should prepare an accelerated RBF transaction", () => {
      const fixture = RBF_FIXTURES[0];
      const acceleratedTx = prepareRbfTransaction(fixture);

      expect(acceleratedTx).toBeInstanceOf(PsbtV2);
      expect(acceleratedTx.psbt.PSBT_GLOBAL_OUTPUT_COUNT).toBe(
        fixture.expectedOutputCount,
      );
    });
  });

  describe("prepareCancelTransaction", () => {
    it("should prepare a cancellation RBF transaction", () => {
      const fixture = RBF_FIXTURES[2];
      const canceledTx = prepareCancelTransaction(
        {
          ...fixture,
          psbt: fixture.psbt,
          network: fixture.network,
          targetFeeRate: fixture.targetFeeRate,
        },
        fixture.cancelDestinationAddress!,
      );

      expect(canceledTx).toBeInstanceOf(PsbtV2);
      expect(canceledTx.psbt.PSBT_GLOBAL_OUTPUT_COUNT).toBe(
        fixture.expectedOutputCount,
      );
    });
  });
});
