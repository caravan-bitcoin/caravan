import {
  RbfTransaction,
  prepareRbfTransaction,
  prepareCancelTransaction,
} from "../src/rbf";
import { PsbtV2 } from "@caravan/psbt";
import BigNumber from "bignumber.js";
import {
  mockNetwork,
  mockFeeRate,
  mockPsbt,
  mockOptions,
  mockDestinationAddress,
} from "./rbf.fixtures";

describe("RbfTransaction", () => {
  let rbfTx: RbfTransaction;

  beforeEach(() => {
    rbfTx = new RbfTransaction(mockPsbt, mockFeeRate, mockOptions, mockNetwork);
  });

  describe("constructor", () => {
    it("should initialize with a PsbtV2 instance", () => {
      expect(rbfTx).toBeInstanceOf(RbfTransaction);
    });

    it("should initialize with a hex string", () => {
      const rbfTxFromHex = new RbfTransaction(
        mockPsbt.serialize("hex"),
        mockFeeRate,
        mockOptions,
        mockNetwork,
      );
      expect(rbfTxFromHex).toBeInstanceOf(RbfTransaction);
    });

    it("should throw an error for non-RBF transactions", () => {
      const nonRbfPsbt = new PsbtV2();

      // Add an input to the PSBT
      nonRbfPsbt.addInput({
        previousTxId: Buffer.alloc(32, 0), // A dummy transaction hash
        outputIndex: 0,
        sequence: 0xffffffff, // Non-RBF sequence
      });

      // Set the sequence to a non-RBF value using setInputSequence
      nonRbfPsbt.setInputSequence(0, 0xffffffff);

      expect(
        () =>
          new RbfTransaction(nonRbfPsbt, mockFeeRate, mockOptions, mockNetwork),
      ).toThrow("This transaction is not signaling RBF.");
    });
  });

  describe("prepareAccelerated", () => {
    it("should return a new PsbtV2 instance", () => {
      const result = rbfTx.prepareAccelerated();
      expect(result).toBeInstanceOf(PsbtV2);
    });

    it("should increase the fee rate", () => {
      const originalFee = rbfTx["calculateCurrentFee"]();
      const result = rbfTx.prepareAccelerated();
      const newFee = result.PSBT_IN_WITNESS_UTXO.reduce(
        (sum, utxo) => sum.plus(utxo ? new BigNumber(utxo.split(",")[0]) : 0),
        new BigNumber(0),
      ).minus(
        result.PSBT_OUT_AMOUNT.reduce(
          (sum, amount) => sum.plus(new BigNumber(amount.toString())),
          new BigNumber(0),
        ),
      );
      expect(newFee.isGreaterThan(originalFee)).toBe(true);
    });

    it("should update sequence numbers", () => {
      const result = rbfTx.prepareAccelerated();
      expect(result.PSBT_IN_SEQUENCE.every((seq) => seq === 0xfffffffd)).toBe(
        true,
      );
    });

    it("should subtract fee from specified output when option is set", () => {
      const optionsWithSubtract = { ...mockOptions, subtractFeeFromOutput: 0 };
      const rbfTxWithSubtract = new RbfTransaction(
        mockPsbt,
        mockFeeRate,
        optionsWithSubtract,
        mockNetwork,
      );
      const result = rbfTxWithSubtract.prepareAccelerated();
      const newAmount = new BigNumber(result.PSBT_OUT_AMOUNT[0].toString());
      const originalAmount = new BigNumber(
        mockPsbt.PSBT_OUT_AMOUNT[0].toString(),
      );
      expect(newAmount.isLessThan(originalAmount)).toBe(true);
    });

    it("should add additional inputs if needed", () => {
      const highFeeRate = { satoshisPerByte: 1000 };
      const rbfTxHighFee = new RbfTransaction(
        mockPsbt,
        highFeeRate,
        mockOptions,
        mockNetwork,
      );
      const result = rbfTxHighFee.prepareAccelerated();
      expect(result.PSBT_GLOBAL_INPUT_COUNT).toBeGreaterThan(
        mockPsbt.PSBT_GLOBAL_INPUT_COUNT,
      );
    });

    it("should throw an error if new fee is not higher than current fee", () => {
      const lowFeeRate = { satoshisPerByte: 1 };
      const rbfTxLowFee = new RbfTransaction(
        mockPsbt,
        lowFeeRate,
        mockOptions,
        mockNetwork,
      );
      expect(() => rbfTxLowFee.prepareAccelerated()).toThrow(
        "New fee must be higher than the current fee",
      );
    });
  });

  describe("prepareCanceled", () => {
    it("should return a new PsbtV2 instance", () => {
      const result = rbfTx.prepareCanceled(mockDestinationAddress);
      expect(result).toBeInstanceOf(PsbtV2);
    });

    it("should create a single output to the destination address", () => {
      const result = rbfTx.prepareCanceled(mockDestinationAddress);
      expect(result.PSBT_GLOBAL_OUTPUT_COUNT).toBe(1);
      expect(result.PSBT_OUT_SCRIPT[0]).toEqual(
        expect.stringContaining(mockDestinationAddress),
      );
    });

    it("should set the output amount to the input amount minus the new fee", () => {
      const result = rbfTx.prepareCanceled(mockDestinationAddress);
      const inputAmount = rbfTx["calculateTotalInputValue"]();
      const outputAmount = new BigNumber(result.PSBT_OUT_AMOUNT[0].toString());
      const fee = inputAmount.minus(outputAmount);
      expect(fee.isGreaterThan(rbfTx["calculateCurrentFee"]())).toBe(true);
    });
  });

  describe("estimateVsize", () => {
    it("should return a number", () => {
      const vsize = rbfTx["estimateVsize"]();
      expect(typeof vsize).toBe("number");
    });

    it("should estimate different vsizes for different input types", () => {
      const p2shPsbt = new PsbtV2();
      p2shPsbt.addInput({
        previousTxId: "0".repeat(64),
        outputIndex: 0,
        redeemScript: Buffer.alloc(20),
      });
      p2shPsbt.addOutput({ script: Buffer.alloc(25), amount: 10000 });

      const p2wshPsbt = new PsbtV2();
      p2wshPsbt.addInput({
        previousTxId: "0".repeat(64),
        outputIndex: 0,
        witnessScript: Buffer.alloc(20),
      });
      p2wshPsbt.addOutput({ script: Buffer.alloc(25), amount: 10000 });

      const rbfTxP2sh = new RbfTransaction(
        p2shPsbt,
        mockFeeRate,
        mockOptions,
        mockNetwork,
      );
      const rbfTxP2wsh = new RbfTransaction(
        p2wshPsbt,
        mockFeeRate,
        mockOptions,
        mockNetwork,
      );

      const vsizeP2sh = rbfTxP2sh["estimateVsize"]();
      const vsizeP2wsh = rbfTxP2wsh["estimateVsize"]();

      expect(vsizeP2sh).not.toEqual(vsizeP2wsh);
    });
  });
});

describe("prepareRbfTransaction", () => {
  it("should return a PsbtV2 instance", () => {
    const result = prepareRbfTransaction(
      mockPsbt,
      mockFeeRate,
      mockOptions,
      mockNetwork,
    );
    expect(result).toBeInstanceOf(PsbtV2);
  });
});

describe("prepareCancelTransaction", () => {
  it("should return a PsbtV2 instance", () => {
    const result = prepareCancelTransaction(
      mockPsbt,
      mockFeeRate,
      mockDestinationAddress,
      mockOptions,
      mockNetwork,
    );
    expect(result).toBeInstanceOf(PsbtV2);
  });
});
