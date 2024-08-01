import { CPFPTransaction, prepareCPFPTransaction } from "./cpfp";
import { PsbtV2 } from "@caravan/psbt";
import { Network } from "@caravan/bitcoin";
import {
  parentPsbtFixture,
  additionalUtxoFixture,
  defaultOptions,
} from "./cpfp.fixtures";

describe("CPFPTransaction", () => {
  describe("constructor", () => {
    it("should initialize with valid options", () => {
      const cpfpTx = new CPFPTransaction(defaultOptions);
      expect(cpfpTx).toBeDefined();
    });

    it("should throw an error if parent PSBT has no inputs", () => {
      const invalidPsbt = new PsbtV2();
      expect(
        () =>
          new CPFPTransaction({ ...defaultOptions, parentPsbt: invalidPsbt }),
      ).toThrow("Parent PSBT has no inputs.");
    });

    it("should throw an error if no spendable outputs are provided", () => {
      expect(
        () => new CPFPTransaction({ ...defaultOptions, spendableOutputs: [] }),
      ).toThrow("No spendable outputs provided.");
    });
  });

  describe("prepareCPFP", () => {
    it("should create a valid child transaction", () => {
      const cpfpTx = new CPFPTransaction(defaultOptions);
      const childPsbt = cpfpTx.prepareCPFP();
      expect(childPsbt).toBeInstanceOf(PsbtV2);
      expect(childPsbt.PSBT_GLOBAL_INPUT_COUNT).toBe(1);
      expect(childPsbt.PSBT_GLOBAL_OUTPUT_COUNT).toBe(1);
    });

    it("should increase the fee rate", () => {
      const cpfpTx = new CPFPTransaction(defaultOptions);
      const combinedFee = cpfpTx.getCombinedFee();
      const parentFee = cpfpTx.getParentFee();
      expect(combinedFee.isGreaterThan(parentFee)).toBe(true);
    });

    it("should handle high urgency", () => {
      const highUrgencyOptions = {
        ...defaultOptions,
        urgency: "high" as const,
      };
      const cpfpTx = new CPFPTransaction(highUrgencyOptions);
      const combinedFee = cpfpTx.getCombinedFee();
      const parentFee = cpfpTx.getParentFee();
      expect(combinedFee.minus(parentFee).isGreaterThan(parentFee)).toBe(true);
    });

    it("should add additional inputs when necessary", () => {
      const lowValueParentPsbt = new PsbtV2();
      lowValueParentPsbt.addInput({
        previousTxId:
          "1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
        outputIndex: 0,
        witnessUtxo: {
          script: Buffer.from(
            "0014000000000000000000000000000000000000",
            "hex",
          ),
          amount: 10000, // 0.0001 BTC
        },
      });
      lowValueParentPsbt.addOutput({
        script: Buffer.from("0014111111111111111111111111111111111111", "hex"),
        amount: 9000, // 0.00009 BTC
      });

      const optionsWithAdditionalUtxo = {
        ...defaultOptions,
        parentPsbt: lowValueParentPsbt,
        additionalUtxos: [additionalUtxoFixture],
      };

      const cpfpTx = new CPFPTransaction(optionsWithAdditionalUtxo);
      const childPsbt = cpfpTx.prepareCPFP();
      expect(childPsbt.PSBT_GLOBAL_INPUT_COUNT).toBe(2);
    });

    it("should throw an error if resulting output would be dust", () => {
      const tinyValueParentPsbt = new PsbtV2();
      tinyValueParentPsbt.addInput({
        previousTxId:
          "1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
        outputIndex: 0,
        witnessUtxo: {
          script: Buffer.from(
            "0014000000000000000000000000000000000000",
            "hex",
          ),
          amount: 600, // 600 satoshis
        },
      });
      tinyValueParentPsbt.addOutput({
        script: Buffer.from("0014111111111111111111111111111111111111", "hex"),
        amount: 550, // 550 satoshis
      });

      const optionsWithTinyValue = {
        ...defaultOptions,
        parentPsbt: tinyValueParentPsbt,
      };

      const cpfpTx = new CPFPTransaction(optionsWithTinyValue);
      expect(() => cpfpTx.prepareCPFP()).toThrow(
        "CPFP transaction would create a dust output",
      );
    });
  });

  describe("fee calculations", () => {
    it("should correctly calculate child fee", () => {
      const cpfpTx = new CPFPTransaction(defaultOptions);
      cpfpTx.prepareCPFP();
      const childFee = cpfpTx.getChildFee();
      expect(childFee.isGreaterThan(0)).toBe(true);
    });

    it("should correctly calculate parent fee", () => {
      const cpfpTx = new CPFPTransaction(defaultOptions);
      const parentFee = cpfpTx.getParentFee();
      expect(parentFee.toNumber()).toBe(10000); // 0.001 BTC - 0.0009 BTC
    });

    it("should correctly calculate combined fee", () => {
      const cpfpTx = new CPFPTransaction(defaultOptions);
      cpfpTx.prepareCPFP();
      const combinedFee = cpfpTx.getCombinedFee();
      const childFee = cpfpTx.getChildFee();
      const parentFee = cpfpTx.getParentFee();
      expect(
        combinedFee.minus(childFee.plus(parentFee)).abs().isLessThan(1),
      ).toBe(true);
    });
  });

  describe("prepareCPFPTransaction function", () => {
    it("should return a valid PsbtV2 instance", () => {
      const childPsbt = prepareCPFPTransaction(defaultOptions);
      expect(childPsbt).toBeInstanceOf(PsbtV2);
    });

    it("should throw an error with invalid options", () => {
      const invalidOptions = { ...defaultOptions, parentPsbt: new PsbtV2() };
      expect(() => prepareCPFPTransaction(invalidOptions)).toThrow(
        "Parent PSBT has no inputs.",
      );
    });
  });

  describe("edge cases", () => {
    it("should handle maximum number of additional inputs", () => {
      const manyAdditionalUtxos = Array(10).fill(additionalUtxoFixture);
      const optionsWithManyUtxos = {
        ...defaultOptions,
        maxAdditionalInputs: 5,
        additionalUtxos: manyAdditionalUtxos,
      };

      const cpfpTx = new CPFPTransaction(optionsWithManyUtxos);
      const childPsbt = cpfpTx.prepareCPFP();
      expect(childPsbt.PSBT_GLOBAL_INPUT_COUNT).toBeLessThanOrEqual(6); // 1 parent output + 5 additional
    });

    it("should handle custom urgency multipliers", () => {
      const customUrgencyOptions = {
        ...defaultOptions,
        urgency: "high" as const,
        urgencyMultipliers: { low: 1.1, medium: 1.3, high: 1.8 },
      };

      const cpfpTx = new CPFPTransaction(customUrgencyOptions);
      const combinedFee = cpfpTx.getCombinedFee();
      const parentFee = cpfpTx.getParentFee();
      const feeIncrease = combinedFee.minus(parentFee);
      expect(feeIncrease.dividedBy(parentFee).isGreaterThan(0.7)).toBe(true);
    });

    it("should respect max child transaction size", () => {
      const manyAdditionalUtxos = Array(100).fill(additionalUtxoFixture);
      const optionsWithManyUtxos = {
        ...defaultOptions,
        maxChildTxSize: 5,
        additionalUtxos: manyAdditionalUtxos,
      };

      const cpfpTx = new CPFPTransaction(optionsWithManyUtxos);
      const childPsbt = cpfpTx.prepareCPFP();
      expect(childPsbt.PSBT_GLOBAL_INPUT_COUNT).toBeLessThanOrEqual(5);
    });
  });

  describe("different address types", () => {
    const addressTypes = ["P2SH", "P2WSH", "P2SH-P2WSH"];

    addressTypes.forEach((addressType) => {
      it(`should handle ${addressType} addresses`, () => {
        const options = { ...defaultOptions, addressType };
        const cpfpTx = new CPFPTransaction(options);
        const childPsbt = cpfpTx.prepareCPFP();
        expect(childPsbt).toBeInstanceOf(PsbtV2);
      });
    });
  });

  describe("different networks", () => {
    it("should handle testnet", () => {
      const testnetOptions = {
        ...defaultOptions,
        network: Network.TESTNET,
        destinationAddress: "tb1qw508d6qejxtdg4y5r3zarvary0c5xw7kxpjzsx",
      };
      const cpfpTx = new CPFPTransaction(testnetOptions);
      const childPsbt = cpfpTx.prepareCPFP();
      expect(childPsbt).toBeInstanceOf(PsbtV2);
    });
  });
});
