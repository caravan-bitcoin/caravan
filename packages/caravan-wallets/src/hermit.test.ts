// @vitest-environment jsdom
import { PENDING, INFO } from "./interaction";
import {
  HermitExportExtendedPublicKey,
  HermitSignMultisigTransaction,
} from "./hermit";

function itHasACommandMessage(interaction, command) {
  const message = interaction.messageFor({
    state: PENDING,
    level: INFO,
    code: "hermit.command",
  });
  it("has a command message with the correct command", () => {
    expect(message).not.toBeNull();
    expect(message.command).toEqual(command);
  });
}

describe("HermitExportExtendedPublicKey", () => {
  const bip32Path = "m/45'/0'/0'";
  const interaction = new HermitExportExtendedPublicKey({ bip32Path });
  const xfp = "12345678";
  const descriptorPath = bip32Path.slice(1);
  const xpub = "xpub123";

  itHasACommandMessage(interaction, `display-xpub ${bip32Path}`);

  const toHex = (text) => Buffer.from(text, "utf8").toString("hex");

  describe("parse", () => {
    it("throws an error when no descriptor is returned", () => {
      expect(() => {
        interaction.parse(null);
      }).toThrow(/no descriptor/i);
      expect(() => {
        interaction.parse("");
      }).toThrow(/no descriptor/i);
    });

    it("throws an error when a non-hex descriptor is returned", () => {
      expect(() => {
        interaction.parse("zzz");
      }).toThrow(/invalid descriptor/i);
    });

    it("throws an error when the descriptor has an invalid XFP", () => {
      expect(() => {
        interaction.parse(toHex(`[${descriptorPath}]${xpub}`));
      }).toThrow(/invalid descriptor/i);
      expect(() => {
        interaction.parse(toHex(`[1234567 ${descriptorPath}]${xpub}`));
      }).toThrow(/invalid descriptor/i);
      expect(() => {
        interaction.parse(toHex(`[1234567${descriptorPath}]${xpub}`));
      }).toThrow(/invalid descriptor/i);
    });

    it("throws an error when the descriptor has an invalid BIP32 path", () => {
      expect(() => {
        interaction.parse(toHex(`[${xfp}]${xpub}`));
      }).toThrow(/invalid descriptor/i);
      expect(() => {
        interaction.parse(toHex(`[${xfp}]/${xpub}`));
      }).toThrow(/invalid descriptor/i);
      expect(() => {
        interaction.parse(toHex(`[${xfp}]/'${xpub}`));
      }).toThrow(/invalid descriptor/i);
      expect(() => {
        interaction.parse(toHex(`[${xfp}]/'1${xpub}`));
      }).toThrow(/invalid descriptor/i);
      expect(() => {
        interaction.parse(toHex(`[${xfp}]/1'/${xpub}`));
      }).toThrow(/invalid descriptor/i);
      expect(() => {
        interaction.parse(toHex(`[${xfp}]/1'/'${xpub}`));
      }).toThrow(/invalid descriptor/i);
      expect(() => {
        interaction.parse(toHex(`[${xfp}]/a'/'${xpub}`));
      }).toThrow(/invalid descriptor/i);
    });

    it("throws an error when the descriptor has an invalid xpub", () => {
      expect(() => {
        interaction.parse(toHex(`[${xfp}${descriptorPath}]`));
      }).toThrow(/invalid descriptor/i);
      expect(() => {
        interaction.parse(toHex(`[${xfp}${descriptorPath}] ${xpub}`));
      }).toThrow(/invalid descriptor/i);
      expect(() => {
        interaction.parse(toHex(`[${xfp}${descriptorPath}]_hello`));
      }).toThrow(/invalid descriptor/i);
    });

    it("successfully parses a well-formed descriptor", () => {
      const descriptor = toHex(`[${xfp}${descriptorPath}]${xpub}`);
      expect(interaction.parse(descriptor)).toEqual({
        rootFingerprint: xfp,
        bip32Path,
        xpub,
      });
    });
  });
});

describe("HermitSignMultisigTransaction", () => {
  const unsignedPSBTBase64 = "q83vEjRWeJA=";

  const signedPSBTHex = "abcdef1234567890deadbeef";
  const signedPSBTBase64 = "q83vEjRWeJDerb7v";

  const interaction = new HermitSignMultisigTransaction({
    psbt: unsignedPSBTBase64,
  });

  itHasACommandMessage(interaction, "sign");

  describe("request", () => {
    it("converts the unsigned PSBT from base64 to hex and UR encodes the parts", () => {
      const parts = interaction.request();
      expect(parts.length > 0);
    });
  });

  describe("parse", () => {
    it("throws an error when no signed PSBT is returned", () => {
      expect(() => {
        interaction.parse(null);
      }).toThrow(/no signature/i);

      expect(() => {
        interaction.parse("");
      }).toThrow(/no signature/i);
    });

    it("converts the PSBT from hex to base64", () => {
      expect(interaction.parse(signedPSBTHex)).toEqual(signedPSBTBase64);
    });
  });
});
