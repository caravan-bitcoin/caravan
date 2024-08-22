// btcTransactionTemplate.test.ts

import { BtcTransactionTemplate } from "../btcTransactionTemplate";
import { fixtures } from "../fixtures/btcTransactionTemplate.fixtures";
import { BtcTxOutputTemplate } from "../btcTransactionComponents";
import { TxOutputType } from "../types";

describe("BtcTransactionTemplate", () => {
  let txTemplate: BtcTransactionTemplate;

  beforeEach(() => {
    txTemplate = new BtcTransactionTemplate({
      inputs: [],
      outputs: [],
      targetFeeRate: fixtures.targetFeeRate,
      dustThreshold: fixtures.dustThreshold,
      network: fixtures.network,
      scriptType: fixtures.scriptType,
      requiredSigners: fixtures.requiredSigners,
      totalSigners: fixtures.totalSigners,
    });

    // Add all valid inputs and outputs
    fixtures.inputs.forEach((input) => txTemplate.addInput(input));
    fixtures.outputs.forEach((output) => txTemplate.addOutput(output));
  });

  describe("Constructor and Getters", () => {
    it("should correctly initialize with provided inputs and outputs", () => {
      expect(txTemplate.inputs).toHaveLength(2);
      expect(txTemplate.outputs).toHaveLength(2);
    });

    it("should return correct total input amount", () => {
      expect(txTemplate.getTotalInputAmount()).toBe(300000);
    });

    it("should return correct total output amount", () => {
      expect(txTemplate.getTotalOutputAmount()).toBe(200000);
    });

    it("should correctly identify malleable outputs", () => {
      expect(txTemplate.malleableOutputs).toHaveLength(1);
      expect(txTemplate.malleableOutputs[0].type).toBe(TxOutputType.CHANGE);
    });
  });

  describe("Fee Calculations", () => {
    it("should calculate correct current fee", () => {
      expect(txTemplate.currentFee).toBe(100000);
    });

    it("should calculate correct target fees to pay", () => {
      const estimatedVsize = 307;
      expect(txTemplate.targetFeesToPay).toBe(
        estimatedVsize * fixtures.targetFeeRate,
      );
    });

    it("should determine if fees are paid correctly", () => {
      expect(txTemplate.areFeesPayPaid()).toBe(true);
    });
  });

  describe("Transaction Modification", () => {
    it("should add input correctly", () => {
      const newInput = fixtures.inputs[0];
      txTemplate.addInput(newInput);
      expect(txTemplate.inputs).toHaveLength(3);
      expect(txTemplate.inputs[2]).toBe(newInput);
    });

    it("should add output correctly", () => {
      const newOutput = new BtcTxOutputTemplate({
        address:
          "tb1qrp33g0q5c5txsp9arysrx4k6zdkfs4nce4xj0gdcccefvpysxf3q0sl5k7",
        amountSats: 75000,
        type: TxOutputType.DESTINATION,
      });
      txTemplate.addOutput(newOutput);
      expect(txTemplate.outputs).toHaveLength(3);
      expect(txTemplate.outputs[2]).toBe(newOutput);
    });

    it("should remove output correctly", () => {
      txTemplate.removeOutput(0);
      expect(txTemplate.outputs).toHaveLength(1);
      expect(txTemplate.outputs[0].amountSats).toBe(150000);
    });

    it("should adjust change output correctly", () => {
      txTemplate.adjustChangeOutput();
      const changeOutput = txTemplate.outputs.find(
        (o) => o.type === TxOutputType.CHANGE,
      );
      expect(changeOutput?.amountSats).toBeLessThan(350000);
    });

    it("should remove change output if below dust threshold", () => {
      txTemplate = new BtcTransactionTemplate({
        ...fixtures,
        targetFeeRate: 1000,
        inputs: fixtures.inputs,
        outputs: fixtures.outputs,
      });
      txTemplate.adjustChangeOutput();
      expect(txTemplate.outputs).toHaveLength(1);
    });
  });

  describe("Transaction Validation", () => {
    it("should validate a correct transaction", () => {
      expect(txTemplate.validate()).toBe(true);
    });

    it("should invalidate a transaction with insufficient fee", () => {
      txTemplate = new BtcTransactionTemplate({
        ...fixtures,
        targetFeeRate: 1000,
        inputs: fixtures.inputs,
        outputs: fixtures.outputs,
      });
      expect(txTemplate.validate()).toBe(false);
    });

    it("should invalidate a transaction with dust output", () => {
      txTemplate.addOutput(fixtures.dustOutput);
      expect(txTemplate.validate()).toBe(false);
    });
  });

  describe("Transaction Conversion", () => {
    it("should convert to raw transaction correctly", () => {
      const rawTx = txTemplate.toRawTransaction();
      expect(rawTx.ins).toHaveLength(2);
      expect(rawTx.outs).toHaveLength(1);
    });

    it("should convert to PSBT correctly", () => {
      const psbt = txTemplate.toPsbt();
      expect(psbt.PSBT_GLOBAL_INPUT_COUNT).toBe(2);
      expect(psbt.PSBT_GLOBAL_OUTPUT_COUNT).toBe(1);
    });

    it("should exclude invalid inputs and outputs when converting", () => {
      txTemplate.addInput(fixtures.invalidInput);
      txTemplate.addOutput(fixtures.invalidOutput);
      const rawTx = txTemplate.toRawTransaction();
      const psbt = txTemplate.toPsbt();
      expect(rawTx.ins).toHaveLength(2);
      expect(rawTx.outs).toHaveLength(1);
      expect(psbt.PSBT_GLOBAL_INPUT_COUNT).toBe(2);
      expect(psbt.PSBT_GLOBAL_OUTPUT_COUNT).toBe(1);
    });
  });
});
