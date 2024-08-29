import { BtcTransactionTemplate } from "../btcTransactionTemplate";
import {
  BtcTxInputTemplate,
  BtcTxOutputTemplate,
} from "../btcTransactionComponents";
import { Network } from "@caravan/bitcoin";
import { TxOutputType } from "../types";
import { fixtures } from "./btcTransactionTemplate.fixtures";
import BigNumber from "bignumber.js";

describe("BtcTransactionTemplate", () => {
  fixtures.forEach((fixture) => {
    describe(fixture.name, () => {
      let txTemplate: BtcTransactionTemplate;

      beforeEach(() => {
        txTemplate = new BtcTransactionTemplate({
          inputs: fixture.test.inputs.map(
            (input) => new BtcTxInputTemplate(input),
          ),
          outputs: fixture.test.outputs.map(
            (output) => new BtcTxOutputTemplate(output),
          ),
          network: fixture.test.network,
          targetFeeRate: fixture.test.targetFeeRate,
          scriptType: fixture.test.scriptType,
          requiredSigners: fixture.test.requiredSigners,
          totalSigners: fixture.test.totalSigners,
        });
      });

      test("should correctly calculate total input amount", () => {
        const expectedInputAmount = fixture.test.inputs.reduce(
          (sum, input) => sum.plus(input.amountSats),
          new BigNumber(0),
        );
        expect(txTemplate.getTotalInputAmount()).toBe(
          expectedInputAmount.toString(),
        );
      });

      test("should correctly calculate total output amount", () => {
        const expectedOutputAmount = fixture.test.outputs.reduce(
          (sum, output) => sum.plus(output.amountSats),
          new BigNumber(0),
        );
        expect(txTemplate.getTotalOutputAmount()).toBe(
          expectedOutputAmount.toString(),
        );
      });

      test("should correctly estimate transaction vsize", () => {
        expect(txTemplate.estimatedVsize).toBe(fixture.expected.vsize);
      });

      test("should correctly calculate transaction fee", () => {
        expect(txTemplate.currentFee).toBe(fixture.expected.fee);
      });

      test("should correctly calculate fee rate", () => {
        expect(parseFloat(txTemplate.estimatedFeeRate)).toBeCloseTo(
          parseFloat(fixture.expected.feeRate),
          1,
        );
      });

      test("should validate transaction correctly", () => {
        expect(txTemplate.validate()).toBe(true);
      });

      test("should detect if fees are paid correctly", () => {
        const paidFees = new BigNumber(txTemplate.currentFee);
        const requiredFees = new BigNumber(txTemplate.targetFeesToPay);
        expect(txTemplate.areFeesPaid()).toBe(paidFees.gte(requiredFees));
      });

      test("should adjust change output correctly", () => {
        const changeOutputs = txTemplate.outputs.filter(
          (output) => output.type === TxOutputType.CHANGE,
        );
        const originalChangeOutput = changeOutputs[0];

        txTemplate.adjustChangeOutput();

        const changeOutputs2 = txTemplate.outputs.filter(
          (output) => output.type === TxOutputType.CHANGE,
        );
        const newChangeOutput = changeOutputs2[0];

        if (originalChangeOutput) {
          expect(newChangeOutput).toBeDefined();
          expect(
            new BigNumber(newChangeOutput.amountSats).gte(
              originalChangeOutput.amountSats,
            ),
          ).toBe(true);
        } else {
          expect(newChangeOutput).toBeUndefined();
        }
      });

      test("should create valid PSBT", () => {
        const psbt = txTemplate.toPsbt();
        expect(psbt).toBeTruthy();
        expect(() => txTemplate.toPsbt()).not.toThrow();
      });
    });
  });
});

describe("BtcTxInputTemplate", () => {
  test("should create valid input", () => {
    const input = new BtcTxInputTemplate({
      txid: "781e5527d1af148125f6f1c29177cd2168246d84210dd223019811286b2f4718",
      vout: 5,
      amountSats: "22181635",
    });
    expect(input.isValid()).toBe(true);
  });

  test("should detect invalid input", () => {
    const input = new BtcTxInputTemplate({
      txid: "",
      vout: -1,
      amountSats: "0",
    });
    expect(input.isValid()).toBe(false);
  });

  test("should correctly convert between satoshis and BTC", () => {
    const input = new BtcTxInputTemplate({
      txid: "781e5527d1af148125f6f1c29177cd2168246d84210dd223019811286b2f4718",
      vout: 5,
      amountSats: "22181635",
    });
    expect(input.amountBTC).toBe("0.22181635");
  });
});

describe("BtcTxOutputTemplate", () => {
  test("should create valid output", () => {
    const output = new BtcTxOutputTemplate({
      address: "bc1q64f362fb18f21471175ab685ec1a76008647e4e0",
      amountSats: "134560",
      type: TxOutputType.EXTERNAL,
    });
    expect(output.isValid()).toBe(true);
  });

  test("should detect invalid output", () => {
    expect(() => {
      new BtcTxOutputTemplate({
        address: "",
        amountSats: "0",
        type: TxOutputType.EXTERNAL,
      }).isValid();
    }).toThrow();
  });

  test("should correctly handle malleable outputs", () => {
    const output = new BtcTxOutputTemplate({
      address: "bc1q64f362fb18f21471175ab685ec1a76008647e4e0",
      amountSats: "134560",
      type: TxOutputType.CHANGE,
    });
    expect(output.isMalleable).toBe(true);
    output.lock();
    expect(output.isMalleable).toBe(false);
    expect(() => output.setAmount("200000")).toThrow();
  });

  test("should correctly add and subtract amounts", () => {
    const output = new BtcTxOutputTemplate({
      address: "bc1q64f362fb18f21471175ab685ec1a76008647e4e0",
      amountSats: "134560",
      type: TxOutputType.CHANGE,
    });
    output.addAmount("10000");
    expect(output.amountSats).toBe("144560");
    output.subtractAmount("20000");
    expect(output.amountSats).toBe("124560");
  });

  describe("needsChangeOutput", () => {
    test("should correctly determine if change output is needed", () => {
      const txTemplate = new BtcTransactionTemplate({
        inputs: [
          new BtcTxInputTemplate({
            txid: "1234",
            vout: 0,
            amountSats: "100000",
          }),
        ],
        outputs: [
          new BtcTxOutputTemplate({
            address: "1234",
            amountSats: "90000",
            type: TxOutputType.EXTERNAL,
          }),
        ],
        network: Network.MAINNET,
        targetFeeRate: 1,
        scriptType: "P2WSH",
        requiredSigners: 1,
        totalSigners: 1,
        dustThreshold: "546",
      });

      txTemplate.outputs[0].lock();

      expect(txTemplate.needsChangeOutput).toBe(true);

      txTemplate.addOutput(
        new BtcTxOutputTemplate({
          address: "5678",
          amountSats: "9000",
          type: TxOutputType.CHANGE,
        }),
      );
      expect(txTemplate.needsChangeOutput).toBe(false);
    });
  });

  describe("addInput and addOutput", () => {
    test("should correctly add input and output", () => {
      const txTemplate = new BtcTransactionTemplate({
        inputs: [],
        outputs: [],
        network: Network.MAINNET,
        targetFeeRate: 1,
        scriptType: "p2pkh",
        requiredSigners: 1,
        totalSigners: 1,
      });

      const input = new BtcTxInputTemplate({
        txid: "1234",
        vout: 0,
        amountSats: "100000",
      });
      txTemplate.addInput(input);
      expect(txTemplate.inputs.length).toBe(1);
      expect(txTemplate.inputs[0]).toBe(input);

      const output = new BtcTxOutputTemplate({
        address: "1234",
        amountSats: "100000",
        type: TxOutputType.EXTERNAL,
      });
      txTemplate.addOutput(output);
      expect(txTemplate.outputs.length).toBe(1);
      expect(txTemplate.outputs[0]).toBe(output);
    });
  });

  describe("removeOutput", () => {
    test("should correctly remove output", () => {
      const txTemplate = new BtcTransactionTemplate({
        inputs: [
          new BtcTxInputTemplate({
            txid: "1234",
            vout: 0,
            amountSats: "100000",
          }),
        ],
        outputs: [
          new BtcTxOutputTemplate({
            address: "1234",
            amountSats: "50000",
            type: TxOutputType.EXTERNAL,
          }),
          new BtcTxOutputTemplate({
            address: "5678",
            amountSats: "50000",
            type: TxOutputType.EXTERNAL,
          }),
        ],
        network: Network.MAINNET,
        targetFeeRate: 1,
        scriptType: "p2pkh",
        requiredSigners: 1,
        totalSigners: 1,
      });

      expect(txTemplate.outputs.length).toBe(2);
      txTemplate.removeOutput(0);
      expect(txTemplate.outputs.length).toBe(1);
      expect(txTemplate.outputs[0].address).toBe("5678");
    });
  });
});
