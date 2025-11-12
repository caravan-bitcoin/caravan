import {
  BtcTxInputTemplate,
  BtcTxOutputTemplate,
} from "../btcTransactionComponents";

import {
  validInputTemplateFixtures,
  invalidInputTemplateFixtures,
  validOutputTemplateFixtures,
  invalidOutputTemplateFixtures,
  utxoFixture,
  bip32DerivationFixtures,
  multisigUtxoFixtures,
} from "./btcTransactionComponents.fixtures";

describe("BtcTxInputTemplate", () => {
  describe("Valid Inputs", () => {
    test.each(validInputTemplateFixtures)("$case", ({ data, expected }) => {
      const input = new BtcTxInputTemplate(data);
      expect(input.txid).toBe(expected.txid);
      expect(input.vout).toBe(expected.vout);
      expect(input.amountSats).toBe(expected.amountSats);
      expect(input.amountBTC).toBe(expected.amountBTC);
      expect(input.isValid()).toBe(expected.isValid);
      if (expected.isRBFEnabled !== undefined) {
        expect(input.isRBFEnabled()).toBe(expected.isRBFEnabled);
      }
    });
  });

  describe("Invalid Inputs", () => {
    test.each(invalidInputTemplateFixtures)("$case", ({ data, expected }) => {
      if (expected.error) {
        const temp = new BtcTxInputTemplate(data);
        expect(() => {
          temp.sequence = data.sequence!;
        }).toThrow(expected.error);
      } else {
        const input = new BtcTxInputTemplate(data);
        expect(input.isValid()).toBe(expected.isValid);
      }
    });
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

  describe("setSequence", () => {
    it("should set sequence number", () => {
      const input = new BtcTxInputTemplate(validInputTemplateFixtures[0].data);
      input.sequence = 0xfffffffd;
      expect(input.sequence).toBe(0xfffffffd);
      expect(input.isRBFEnabled()).toBe(true);
    });

    it("should throw error when setting invalid sequence number", () => {
      const input = new BtcTxInputTemplate(validInputTemplateFixtures[0].data);
      expect(() => {
        input.sequence = 0x100000000; // Greater than 32-bit unsigned integer
      }).toThrow("Invalid sequence number");
    });
  });

  describe("setWitnessUtxo", () => {
    it("should set witness UTXO", () => {
      const input = new BtcTxInputTemplate(validInputTemplateFixtures[0].data);
      const witnessUtxo = {
        script: Buffer.from("dummy_script"),
        value: 123456,
      };
      input.witnessUtxo = witnessUtxo;
      expect(input.witnessUtxo).toEqual(witnessUtxo);
    });
  });

  describe("setNonWitnessUtxo", () => {
    it("should set non-witness UTXO", () => {
      const input = new BtcTxInputTemplate(validInputTemplateFixtures[0].data);
      const nonWitnessUtxo = Buffer.from(utxoFixture.prevTxHex!, "hex");
      input.nonWitnessUtxo = nonWitnessUtxo;
      expect(input.nonWitnessUtxo).toEqual(nonWitnessUtxo);
    });

    it("should throw error when setting invalid non-witness UTXO", () => {
      const input = new BtcTxInputTemplate(validInputTemplateFixtures[0].data);
      const invalidNonWitnessUtxo = Buffer.from("invalid_utxo");
      expect(() => {
        input.nonWitnessUtxo = invalidNonWitnessUtxo;
      }).toThrow("Invalid non-witness UTXO");
    });
  });

  describe("hasRequiredFieldsforPSBT", () => {
    it("should return true when all required fields are present", () => {
      const input = BtcTxInputTemplate.fromUTXO(utxoFixture);
      expect(input.hasRequiredFieldsforPSBT()).toBe(true);
    });

    it("should return false when required fields are missing", () => {
      const input = new BtcTxInputTemplate(validInputTemplateFixtures[0].data);
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

  describe("BtcTxInputTemplate - Multisig Extensions", () => {
    describe("setRedeemScript", () => {
      it("should set redeem script", () => {
        const input = new BtcTxInputTemplate(
          validInputTemplateFixtures[0].data,
        );
        const redeemScript = Buffer.from(
          "5221023b66728c8bd8175973e4004860b9cc57fa882be226e5693b498e421948eb2471f",
          "hex",
        );

        input.redeemScript = redeemScript;
        expect(input.redeemScript).toEqual(redeemScript);
      });

      it("should handle undefined redeem script", () => {
        const input = new BtcTxInputTemplate(
          validInputTemplateFixtures[0].data,
        );
        expect(input.redeemScript).toBeUndefined();
      });
    });

    describe("setWitnessScript", () => {
      it("should set witness script", () => {
        const input = new BtcTxInputTemplate(
          validInputTemplateFixtures[0].data,
        );
        const witnessScript = Buffer.from(
          "5221023b66728c8bd8175973e4004860b9cc57fa882be226e5693b498e421948eb2471f",
          "hex",
        );

        input.witnessScript = witnessScript;
        expect(input.witnessScript).toEqual(witnessScript);
      });

      it("should handle undefined witness script", () => {
        const input = new BtcTxInputTemplate(
          validInputTemplateFixtures[0].data,
        );
        expect(input.witnessScript).toBeUndefined();
      });
    });

    describe("setBip32Derivations", () => {
      it("should set BIP32 derivations", () => {
        const input = new BtcTxInputTemplate(
          validInputTemplateFixtures[0].data,
        );

        input.bip32Derivations = bip32DerivationFixtures;
        expect(input.bip32Derivations).toEqual(bip32DerivationFixtures);
      });

      it("should handle empty BIP32 derivations", () => {
        const input = new BtcTxInputTemplate(
          validInputTemplateFixtures[0].data,
        );

        input.bip32Derivations = [];
        expect(input.bip32Derivations).toEqual([]);
      });

      it("should create defensive copy of derivations", () => {
        const input = new BtcTxInputTemplate(
          validInputTemplateFixtures[0].data,
        );
        const originalDerivations = [...bip32DerivationFixtures];

        input.bip32Derivations = originalDerivations;
        originalDerivations.push({
          pubkey: Buffer.from("newkey", "hex"),
          masterFingerprint: Buffer.from("newfingerprint", "hex"),
          path: "m/44'/0'/0'/0/0",
        });

        expect(input.bip32Derivations).toEqual(bip32DerivationFixtures);
      });
    });

    describe("fromUTXO with multisig fields", () => {
      it("should create input template from P2SH multisig UTXO", () => {
        const utxo = multisigUtxoFixtures[0];
        const input = BtcTxInputTemplate.fromUTXO(utxo);

        expect(input.txid).toBe(utxo.txid);
        expect(input.vout).toBe(utxo.vout);
        expect(input.amountSats).toBe(utxo.value);
        expect(input.redeemScript).toEqual(utxo.redeemScript);
        expect(input.witnessScript).toBeUndefined();
        expect(input.bip32Derivations).toEqual(utxo.bip32Derivations);
      });

      it("should create input template from P2WSH multisig UTXO", () => {
        const utxo = multisigUtxoFixtures[1];
        const input = BtcTxInputTemplate.fromUTXO(utxo);

        expect(input.txid).toBe(utxo.txid);
        expect(input.vout).toBe(utxo.vout);
        expect(input.amountSats).toBe(utxo.value);
        expect(input.redeemScript).toBeUndefined();
        expect(input.witnessScript).toEqual(utxo.witnessScript);
        expect(input.bip32Derivations).toEqual(utxo.bip32Derivations);
        expect(input.witnessUtxo).toEqual(utxo.witnessUtxo);
      });

      it("should create input template from P2SH-P2WSH multisig UTXO", () => {
        const utxo = multisigUtxoFixtures[2];
        const input = BtcTxInputTemplate.fromUTXO(utxo);

        expect(input.txid).toBe(utxo.txid);
        expect(input.vout).toBe(utxo.vout);
        expect(input.amountSats).toBe(utxo.value);
        expect(input.redeemScript).toEqual(utxo.redeemScript);
        expect(input.witnessScript).toEqual(utxo.witnessScript);
        expect(input.bip32Derivations).toEqual(utxo.bip32Derivations);
        expect(input.witnessUtxo).toEqual(utxo.witnessUtxo);
      });
    });

    describe("toUTXO with multisig fields", () => {
      it("should convert input template with multisig data back to UTXO", () => {
        const originalUtxo = multisigUtxoFixtures[0];
        const input = BtcTxInputTemplate.fromUTXO(originalUtxo);
        const convertedUtxo = input.toUTXO();

        expect(convertedUtxo).toEqual(originalUtxo);
      });

      it("should handle undefined multisig fields in toUTXO conversion", () => {
        const input = new BtcTxInputTemplate(
          validInputTemplateFixtures[0].data,
        );
        const convertedUtxo = input.toUTXO();

        expect(convertedUtxo.redeemScript).toBeUndefined();
        expect(convertedUtxo.witnessScript).toBeUndefined();
        expect(convertedUtxo.bip32Derivations).toEqual([]);
      });
    });

    describe("Multisig validation scenarios", () => {
      it("should pass validation with complete multisig data", () => {
        const input = BtcTxInputTemplate.fromUTXO(multisigUtxoFixtures[0]);
        expect(input.isValid()).toBe(true);
        expect(input.hasRequiredFieldsforPSBT()).toBe(true);
      });

      it("should pass validation with partial multisig data", () => {
        const input = new BtcTxInputTemplate(
          validInputTemplateFixtures[0].data,
        );
        const witnessUtxo = {
          script: Buffer.from("dummy_script"),
          value: 123456,
        };
        input.witnessUtxo = witnessUtxo;
        input.redeemScript = Buffer.from("redeem_script", "hex");

        expect(input.isValid()).toBe(true);
        expect(input.hasRequiredFieldsforPSBT()).toBe(true);
      });
    });

    describe("Edge cases", () => {
      it("should handle UTXO with only bip32Derivations", () => {
        const input = new BtcTxInputTemplate(
          validInputTemplateFixtures[0].data,
        );
        input.bip32Derivations = bip32DerivationFixtures;

        expect(input.bip32Derivations).toEqual(bip32DerivationFixtures);
        expect(input.redeemScript).toBeUndefined();
        expect(input.witnessScript).toBeUndefined();
      });

      it("should handle UTXO with only scripts (no derivations)", () => {
        const input = new BtcTxInputTemplate(
          validInputTemplateFixtures[0].data,
        );
        const redeemScript = Buffer.from("redeem_script", "hex");
        const witnessScript = Buffer.from("witness_script", "hex");

        input.redeemScript = redeemScript;
        input.witnessScript = witnessScript;

        expect(input.redeemScript).toEqual(redeemScript);
        expect(input.witnessScript).toEqual(witnessScript);
        expect(input.bip32Derivations).toEqual([]);
      });
    });
  });
});

describe("BtcTxOutputTemplate", () => {
  describe("Valid Outputs", () => {
    test.each(validOutputTemplateFixtures)("$case", ({ data, expected }) => {
      const output = new BtcTxOutputTemplate(data);
      expect(output.address).toBe(expected.address);
      expect(output.amountSats).toBe(expected.amountSats);
      expect(output.amountBTC).toBe(expected.amountBTC);
      expect(output.isMalleable).toBe(expected.isMalleable);
      expect(output.isValid()).toBe(expected.isValid);
    });
  });

  describe("Invalid Outputs", () => {
    test.each(invalidOutputTemplateFixtures)("$case", ({ data, expected }) => {
      if (expected.error) {
        expect(() => new BtcTxOutputTemplate(data)).toThrow(expected.error);
      } else {
        const output = new BtcTxOutputTemplate(data);
        expect(() => {
          output.lock();
        }).toThrow();
      }
    });
  });

  describe("Amount Manipulation", () => {
    let output: BtcTxOutputTemplate;

    beforeEach(() => {
      output = new BtcTxOutputTemplate(validOutputTemplateFixtures[0].data);
    });

    it("should set amount", () => {
      output.setAmount("200000");
      expect(output.amountSats).toBe("200000");
    });

    it("should add amount", () => {
      output.addAmount("50000");
      expect(output.amountSats).toBe("100000");
    });

    it("should subtract amount", () => {
      output.subtractAmount("25000");
      expect(output.amountSats).toBe("25000");
    });

    it("should throw error when subtracting more than available", () => {
      expect(() => {
        output.subtractAmount("75000");
      }).toThrow("Cannot subtract more than the current amount");
    });
  });

  describe("Locked Output", () => {
    it("should not allow modifications to locked output", () => {
      const lockedOutput = new BtcTxOutputTemplate(
        validOutputTemplateFixtures[1].data,
      );
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

  describe("Lock", () => {
    it("should lock an output", () => {
      const output = new BtcTxOutputTemplate(
        validOutputTemplateFixtures[0].data,
      );
      output.lock();
      expect(output.isMalleable).toBe(false);
    });

    it("should not throw error when locking an already locked output", () => {
      const output = new BtcTxOutputTemplate(
        validOutputTemplateFixtures[1].data,
      );
      expect(() => {
        output.lock();
      }).not.toThrow();
      expect(output.isMalleable).toBe(false);
    });
  });

  describe("isValid", () => {
    it("should return true for valid output", () => {
      const output = new BtcTxOutputTemplate(
        validOutputTemplateFixtures[0].data,
      );
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
