import {
  BtcTxInputTemplate,
  BtcTxOutputTemplate,
} from "../btcTransactionComponents";
import {
  inputTemplateFixtures,
  outputTemplateFixtures,
  utxoFixture,
} from "./btcTransactionComponents.fixtures";

describe("BtcTxInputTemplate", () => {
  describe("constructor", () => {
    it.each(inputTemplateFixtures)(
      "should create a valid input template",
      ({ test, expected }) => {
        const input = new BtcTxInputTemplate(test);
        expect(input.txid).toBe(expected.txid);
        expect(input.vout).toBe(expected.vout);
        expect(input.amountSats).toBe(expected.amountSats);
        expect(input.amountBTC).toBe(expected.amountBTC);
        expect(input.isValid()).toBe(expected.isValid);
      },
    );
  });

  describe("fromUTXO", () => {
    it("should create an input template from a UTXO", () => {
      const input = BtcTxInputTemplate.fromUTXO(utxoFixture);
      expect(input.txid).toBe(utxoFixture.txid);
      expect(input.vout).toBe(utxoFixture.vout);
      expect(input.amountSats).toBe(utxoFixture.value);
      expect(input.nonWitnessUtxo).toEqual(
        Buffer.from(utxoFixture.prevTxHex!, "hex"),
      );
      expect(input.witnessUtxo).toEqual(utxoFixture.witnessUtxo);
    });
  });

  describe("setters and getters", () => {
    let input: BtcTxInputTemplate;

    beforeEach(() => {
      input = new BtcTxInputTemplate(inputTemplateFixtures[0].test);
    });

    it("should set and get sequence", () => {
      input.setSequence(0xfffffffd);
      expect(input.sequence).toBe(0xfffffffd);
    });

    it("should set and get nonWitnessUtxo", () => {
      const nonWitnessUtxo = Buffer.from("dummy_data");
      input.setNonWitnessUtxo(nonWitnessUtxo);
      expect(input.nonWitnessUtxo).toEqual(nonWitnessUtxo);
    });

    it("should set and get witnessUtxo", () => {
      const witnessUtxo = {
        script: Buffer.from("dummy_script"),
        value: 123456,
      };
      input.setWitnessUtxo(witnessUtxo);
      expect(input.witnessUtxo).toEqual(witnessUtxo);
    });
  });

  describe("hasRequiredFieldsforPSBT", () => {
    it("should return true when all required fields are present", () => {
      const input = BtcTxInputTemplate.fromUTXO(utxoFixture);
      expect(input.hasRequiredFieldsforPSBT()).toBe(true);
    });

    it("should return false when required fields are missing", () => {
      const input = new BtcTxInputTemplate({
        txid: "1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
        vout: 0,
      });
      expect(input.hasRequiredFieldsforPSBT()).toBe(false);
    });
  });

  describe("toUTXO", () => {
    it("should convert input template to UTXO", () => {
      const input = BtcTxInputTemplate.fromUTXO(utxoFixture);
      const convertedUTXO = input.toUTXO();
      expect(convertedUTXO).toEqual(utxoFixture);
    });
  });
});

describe("BtcTxOutputTemplate", () => {
  describe("constructor", () => {
    it.each(outputTemplateFixtures)(
      "should create a valid output template",
      ({ test, expected }) => {
        const output = new BtcTxOutputTemplate(test);
        expect(output.address).toBe(expected.address);
        expect(output.amountSats).toBe(expected.amountSats);
        expect(output.amountBTC).toBe(expected.amountBTC);
        expect(output.isMalleable).toBe(expected.isMalleable);
        expect(output.isValid()).toBe(expected.isValid);
      },
    );

    it("should throw an error when creating a locked output with zero amount", () => {
      expect(() => {
        new BtcTxOutputTemplate({
          address: "dummy",
          amountSats: "0",
          locked: true,
        });
      }).toThrow("Locked outputs must have an amount specified.");
    });
  });

  describe("amount manipulation", () => {
    let output: BtcTxOutputTemplate;

    beforeEach(() => {
      output = new BtcTxOutputTemplate({
        address: "dummy",
        amountSats: "100000",
      });
    });

    it("should set amount", () => {
      output.setAmount("200000");
      expect(output.amountSats).toBe("200000");
    });

    it("should add amount", () => {
      output.addAmount("50000");
      expect(output.amountSats).toBe("150000");
    });

    it("should subtract amount", () => {
      output.subtractAmount("50000");
      expect(output.amountSats).toBe("50000");
    });

    it("should throw error when subtracting more than available", () => {
      expect(() => {
        output.subtractAmount("150000");
      }).toThrow("Cannot subtract more than the current amount");
    });

    it("should throw error when modifying locked output", () => {
      const lockedOutput = new BtcTxOutputTemplate({
        address: "dummy",
        amountSats: "100000",
        locked: true,
      });
      expect(() => {
        lockedOutput.setAmount("200000");
      }).toThrow("Cannot modify non-malleable output");
      expect(() => {
        lockedOutput.addAmount("50000");
      }).toThrow("Cannot modify non-malleable output");
      expect(() => {
        lockedOutput.subtractAmount("50000");
      }).toThrow("Cannot modify non-malleable output");
    });
  });

  describe("lock", () => {
    it("should lock an output", () => {
      const output = new BtcTxOutputTemplate({
        address: "dummy",
        amountSats: "100000",
      });
      output.lock();
      expect(output.isMalleable).toBe(false);
    });

    it("should throw error when locking an already locked output", () => {
      const output = new BtcTxOutputTemplate({
        address: "dummy",
        amountSats: "100000",
        locked: true,
      });
      expect(() => {
        output.lock();
      }).not.toThrow();
    });
  });

  describe("isValid", () => {
    it("should return true for valid output", () => {
      const output = new BtcTxOutputTemplate({
        address: "dummy",
        amountSats: "100000",
      });
      expect(output.isValid()).toBe(true);
    });

    it("should return false for output with empty address", () => {
      const output = new BtcTxOutputTemplate({
        address: "",
        amountSats: "100000",
      });
      expect(output.isValid()).toBe(false);
    });

    it("should throw error for locked output with zero amount", () => {
      expect(() => {
        new BtcTxOutputTemplate({
          address: "dummy",
          amountSats: "0",
          locked: true,
        });
      }).toThrow("Locked outputs must have an amount specified.");
    });
  });
});
