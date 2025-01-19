import { BtcTransactionTemplate } from "../btcTransactionTemplate";
import {
  BtcTxInputTemplate,
  BtcTxOutputTemplate,
} from "../btcTransactionComponents";
import { Network } from "@caravan/bitcoin";
import { UTXO } from "../types";
import { fixtures, TestFixture } from "./btcTransactionTemplate.fixtures";
import BigNumber from "bignumber.js";

describe("BtcTransactionTemplate", () => {
  fixtures.forEach((fixture: TestFixture) => {
    describe(fixture.case, () => {
      let txTemplate: BtcTransactionTemplate;

      beforeEach(() => {
        txTemplate = new BtcTransactionTemplate({
          inputs: fixture.input.inputs.map((input) =>
            BtcTxInputTemplate.fromUTXO(input as unknown as UTXO),
          ),
          outputs: fixture.input.outputs.map(
            (output) => new BtcTxOutputTemplate(output),
          ),
          network: fixture.input.network,
          targetFeeRate: fixture.input.targetFeeRate,
          scriptType: fixture.input.scriptType,
          requiredSigners: fixture.input.requiredSigners,
          totalSigners: fixture.input.totalSigners,
        });
      });

      test("should correctly calculate total input amount", () => {
        const expectedInputAmount = fixture.input.inputs.reduce(
          (sum, input) => sum.plus(input.value),
          new BigNumber(0),
        );
        expect(txTemplate.totalInputAmount).toBe(
          expectedInputAmount.toString(),
        );
      });

      test("should correctly calculate total output amount", () => {
        const expectedOutputAmount = fixture.input.outputs.reduce(
          (sum, output) => sum.plus(output.amountSats),
          new BigNumber(0),
        );
        expect(txTemplate.totalOutputAmount).toBe(
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
          (output) => output.isMalleable,
        );
        const originalChangeOutput = changeOutputs[0];

        txTemplate.adjustChangeOutput();

        const changeOutputs2 = txTemplate.outputs.filter(
          (output) => output.isMalleable,
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
      locked: true,
    });
    expect(output.isValid()).toBe(true);
  });

  test("should detect invalid output", () => {
    expect(() => {
      new BtcTxOutputTemplate({
        address: "",
        amountSats: "0",
        locked: true,
      }).isValid();
    }).toThrow();
  });

  test("should correctly handle malleable outputs", () => {
    const output = new BtcTxOutputTemplate({
      address: "bc1q64f362fb18f21471175ab685ec1a76008647e4e0",
      amountSats: "134560",
      locked: false,
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
      locked: false,
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
            locked: true,
          }),
        ],
        network: Network.MAINNET,
        targetFeeRate: 1,
        scriptType: "P2WSH",
        requiredSigners: 1,
        totalSigners: 1,
        dustThreshold: "546",
      });

      expect(txTemplate.needsChangeOutput).toBe(true);

      txTemplate.addOutput(
        new BtcTxOutputTemplate({
          address: "5678",
          amountSats: "9000",
          locked: false,
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
        locked: true,
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
            locked: true,
          }),
          new BtcTxOutputTemplate({
            address: "5678",
            amountSats: "50000",
            locked: true,
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

  describe("static from Psbt", () => {
    // https://en.bitcoin.it/wiki/BIP_0174
    const fixture = {
      test: {
        psbtHex:
          "cHNidP8BAJoCAAAAAljoeiG1ba8MI76OcHBFbDNvfLqlyHV5JPVFiHuyq911AAAAAAD/////g40EJ9DsZQpoqka7CwmK6kQiwHGyyng1Kgd5WdB86h0BAAAAAP////8CcKrwCAAAAAAWABTYXCtx0AYLCcmIauuBXlCZHdoSTQDh9QUAAAAAFgAUAK6pouXw+HaliN9VRuh0LR2HAI8AAAAAAAEAuwIAAAABqtc5MQGL0l+ErkALaISL4J23BurCrBgpi6vucatlb4sAAAAASEcwRAIgWPb8fGoz4bMVSNSByCbAFb0wE1qtQs1neQ2rZtKtJDsCIEoc7SYExnNbY5PltBaR3XiwDwxZQvufdRhW+qk4FX26Af7///8CgPD6AgAAAAAXqRQPuUY0IWlrgsgzryQceMF9295JNIfQ8gonAQAAABepFCnKdPigj4GZlCgYXJe12FLkBj9hh2UAAAAiAgLath/0mhTban0CsM0fu3j8SxgxK1tOVNrk26L7/vU210gwRQIhAPYQOLMI3B2oZaNIUnRvAVdyk0IIxtJEVDk82ZvfIhd3AiAFbmdaZ1ptCgK4WxTl4pB02KJam1dgvqKBb2YZEKAG6gEBAwQBAAAAAQRHUiEClYO/Oa4KYJdHrRma3dY0+mEIVZ1sXNObTCGD8auW4H8hAtq2H/SaFNtqfQKwzR+7ePxLGDErW05U2uTbovv+9TbXUq4iBgKVg785rgpgl0etGZrd1jT6YQhVnWxc05tMIYPxq5bgfxDZDGpPAAAAgAAAAIAAAACAIgYC2rYf9JoU22p9ArDNH7t4/EsYMStbTlTa5Nui+/71NtcQ2QxqTwAAAIAAAACAAQAAgAABASAAwusLAAAAABepFLf1+vQOPUClpFmx2zU18rcvqSHohyICAjrdkE89bc9Z3bkGsN7iNSm3/7ntUOXoYVGSaGAiHw5zRzBEAiBl9FulmYtZon/+GnvtAWrx8fkNVLOqj3RQql9WolEDvQIgf3JHA60e25ZoCyhLVtT/y4j3+3Weq74IqjDym4UTg9IBAQMEAQAAAAEEIgAgjCNTFzdDtZXftKB7crqOQuN5fadOh/59nXSX47ICiQMBBUdSIQMIncEMesbbVPkTKa9hczPbOIzq0MIx9yM3nRuZAwsC3CECOt2QTz1tz1nduQaw3uI1Kbf/ue1Q5ehhUZJoYCIfDnNSriIGAjrdkE89bc9Z3bkGsN7iNSm3/7ntUOXoYVGSaGAiHw5zENkMak8AAACAAAAAgAMAAIAiBgMIncEMesbbVPkTKa9hczPbOIzq0MIx9yM3nRuZAwsC3BDZDGpPAAAAgAAAAIACAACAACICA6mkw39ZltOqJdusa1cK8GUDlEkpQkYLNUdT7Z7spYdxENkMak8AAACAAAAAgAQAAIAAIgICf2OZdX0u/1WhNq0CxoSxg4tlVuXxtrNCgqlLa1AFEJYQ2QxqTwAAAIAAAACABQAAgAA=",
        options: {
          network: Network.MAINNET,
          targetFeeRate: 10,
          dustThreshold: "546",
          scriptType: "P2WSH",
          requiredSigners: 1,
          totalSigners: 1,
        },
      },
      expected: {
        inputCount: 2,
        outputCount: 2,
        inputs: [
          {
            txid: "75ddabb27b8845f5247975c8a5ba7c6f336c4570708ebe230caf6db5217ae858",
            vout: 0,
          },
          {
            txid: "1dea7cd05979072a3578cab271c02244ea8a090bbb46aa680a65ecd027048d83",
            vout: 1,
          },
        ],
        outputs: [
          {
            address: "bc1qmpwzkuwsqc9snjvgdt4czhjsnywa5yjdgwyw6k",
            amountSats: "149990000",
          },
          {
            address: "bc1qqzh2ngh97ru8dfvgma25d6r595wcwqy0skmt5z",
            amountSats: "100000000",
          },
        ],
        totalInputAmount: "250000000",
        totalOutputAmount: "249990000",
      },
    };

    it("should correctly parse the PSBT and create a BtcTransactionTemplate", () => {
      const txTemplate = BtcTransactionTemplate.fromPsbt(
        fixture.test.psbtHex,
        fixture.test.options,
      );

      // Check input parsing
      expect(txTemplate.inputs.length).toBe(fixture.expected.inputCount);
      txTemplate.inputs.forEach((input, index) => {
        expect(input.txid).toBe(fixture.expected.inputs[index].txid);
        expect(input.vout).toBe(fixture.expected.inputs[index].vout);
      });

      // Check output parsing
      expect(txTemplate.outputs.length).toBe(fixture.expected.outputCount);
      txTemplate.outputs.forEach((output, index) => {
        expect(output.address).toBe(fixture.expected.outputs[index].address);
        expect(output.amountSats).toBe(
          fixture.expected.outputs[index].amountSats,
        );
      });

      // Check total amounts
      expect(txTemplate.totalInputAmount).toBe(
        fixture.expected.totalInputAmount,
      );
      expect(txTemplate.totalOutputAmount).toBe(
        fixture.expected.totalOutputAmount,
      );

      // Check if options are correctly set
      expect(txTemplate["_network"]).toBe(fixture.test.options.network);
      expect(txTemplate["_targetFeeRate"].toNumber()).toBe(
        fixture.test.options.targetFeeRate,
      );
      expect(txTemplate["_dustThreshold"].toString()).toBe(
        fixture.test.options.dustThreshold,
      );
      expect(txTemplate["_scriptType"]).toBe(fixture.test.options.scriptType);
      expect(txTemplate["_requiredSigners"]).toBe(
        fixture.test.options.requiredSigners,
      );
      expect(txTemplate["_totalSigners"]).toBe(
        fixture.test.options.totalSigners,
      );
    });

    it("should correctly calculate fee-related properties", () => {
      const txTemplate = BtcTransactionTemplate.fromPsbt(
        fixture.test.psbtHex,
        fixture.test.options,
      );

      expect(txTemplate.currentFee).toBe("10000");
      expect(txTemplate.targetFeesToPay).toBe("2360"); // 236 vbytes * 10 sats/vbyte
      expect(txTemplate.areFeesPaid()).toBe(true);
      expect(txTemplate.feeRateSatisfied).toBe(true);
    });

    it("should handle malleable outputs correctly", () => {
      const txTemplate = BtcTransactionTemplate.fromPsbt(
        fixture.test.psbtHex,
        fixture.test.options,
      );

      expect(txTemplate.malleableOutputs.length).toBe(0); // as we dont want to affect the already exising output amounts
      expect(txTemplate.needsChangeOutput).toBe(true);
    });

    it("should throw an error for invalid PSBT", () => {
      const invalidPsbtHex = "invalidPsbtHex";
      expect(() => {
        BtcTransactionTemplate.fromPsbt(invalidPsbtHex, fixture.test.options);
      }).toThrow();
    });

    it("should handle PSBTs with missing input information", () => {
      // Create a PSBT with missing input information
      const psbtWithMissingInputInfo =
        "cHNidP8BAEwCAAAAAALT3/UFAAAAABl2qRTQxZkDxbrChodg6Q/VIaRmWqdlIIisAOH1BQAAAAAXqRQ1RebjO4MsRwUPJNPuuTycA5SLx4ezLhMAAAAA";

      const templateIn = BtcTransactionTemplate.fromPsbt(
        psbtWithMissingInputInfo,
        fixture.test.options,
      );

      expect(templateIn.inputs.length).toBe(0);
    });
  });
});
