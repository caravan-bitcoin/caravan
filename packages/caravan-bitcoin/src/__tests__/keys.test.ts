import { describe, it, expect } from "vitest";
import {
  validateExtendedPublicKey,
  validatePublicKey,
  compressPublicKey,
  deriveChildPublicKey,
  deriveChildExtendedPublicKey,
  isKeyCompressed,
  getFingerprintFromPublicKey,
  deriveExtendedPublicKey,
  convertExtendedPublicKey,
  validatePrefix,
  fingerprintToFixedLengthHex,
  extendedPublicKeyRootFingerprint,
  validateExtendedPublicKeyForNetwork,
  getMaskedDerivation,
} from "../keys";

import { Network } from "../networks";
import { P2SH } from "../p2sh";
import { P2SH_P2WSH } from "../p2sh_p2wsh";
import { P2WSH } from "../p2wsh";

describe("keys", () => {
  describe("validateExtendedPublicKeyForNetwork", () => {
    const validXpub =
      "xpub6CCHViYn5VzKFqrKjAzSSqP8XXSU5fEC6ZYSncX5pvSKoRLrPDcF8cEaZkrQvvnuwRUXeKVjoGmAqvbwVkNBFLaRiqcdVhWPyuShUrbcZsv";
    const validTpub =
      "tpubDCZv1xNTnmwmXe3BBMyXekiVreY853jFeC8k9AaEAqCDYi1ZTSTLH3uQonwCTRk9jL1SFu1cLNbDY76YtcDR8n2inSMwBEAdZs37EpYS9px";

    it("returns an error message when the prefix does not match the network", () => {
      expect(validateExtendedPublicKeyForNetwork("foobar", Network.TESTNET)).toContain("must begin with");
      expect(validateExtendedPublicKeyForNetwork("tpub", Network.MAINNET)).toContain("must begin with");
      expect(validateExtendedPublicKeyForNetwork(validTpub, Network.MAINNET)).toContain("must begin with");
      expect(validateExtendedPublicKeyForNetwork(validXpub, Network.TESTNET)).toContain("must begin with");
      expect(validateExtendedPublicKeyForNetwork(validXpub, Network.REGTEST)).toContain("must begin with");
    });

    it("returns an empty string when the value is valid", () => {
      expect(validateExtendedPublicKeyForNetwork(validTpub, Network.TESTNET)).toBe("");
      expect(validateExtendedPublicKeyForNetwork(validTpub, Network.REGTEST)).toBe("");
      expect(validateExtendedPublicKeyForNetwork(validXpub, Network.MAINNET)).toBe("");
    });
  });

  describe("validateExtendedPublicKey", () => {
    const validXpub =
      "xpub6CCHViYn5VzKFqrKjAzSSqP8XXSU5fEC6ZYSncX5pvSKoRLrPDcF8cEaZkrQvvnuwRUXeKVjoGmAqvbwVkNBFLaRiqcdVhWPyuShUrbcZsv";
    const validTpub =
      "tpubDCZv1xNTnmwmXe3BBMyXekiVreY853jFeC8k9AaEAqCDYi1ZTSTLH3uQonwCTRk9jL1SFu1cLNbDY76YtcDR8n2inSMwBEAdZs37EpYS9px";

    it("returns an error message on an empty value", () => {
      expect(validateExtendedPublicKey(undefined, Network.TESTNET)).toContain("cannot be blank");
      expect(validateExtendedPublicKey("", Network.TESTNET)).toContain("cannot be blank");
      expect(validateExtendedPublicKey(null, Network.TESTNET)).toContain("cannot be blank");
    });

    it("returns an error message when the prefix does not match the network", () => {
      expect(validateExtendedPublicKey("foobar", Network.TESTNET)).toContain("must begin with");
      expect(validateExtendedPublicKey("tpub", Network.MAINNET)).toContain("must begin with");
      expect(validateExtendedPublicKey(validTpub, Network.MAINNET)).toContain("must begin with");
      expect(validateExtendedPublicKey(validXpub, Network.TESTNET)).toContain("must begin with");
    });

    it("returns an error message when the value is too short", () => {
      expect(validateExtendedPublicKey("tpub123", Network.TESTNET)).toContain("is too short");
      expect(validateExtendedPublicKey("xpub123", Network.MAINNET)).toContain("is too short");
    });

    it("returns an error message when the value is not valid", () => {
      expect(validateExtendedPublicKey(validTpub.replace("n", "p"), Network.TESTNET)).toContain("Invalid extended public key");
      expect(validateExtendedPublicKey(validXpub.replace("n", "p"), Network.MAINNET)).toContain("Invalid extended public key");
    });

    it("returns an empty string when the value is valid", () => {
      expect(validateExtendedPublicKey(validTpub, Network.TESTNET)).toBe("");
      expect(validateExtendedPublicKey(validXpub, Network.MAINNET)).toBe("");
    });
  });

  describe("validatePublicKey", () => {
    const invalidHex = "zzzz";
    const invalidPublicKey = "deadbeef";
    const compressedPublicKey =
      "03b32dc780fba98db25b4b72cf2b69da228f5e10ca6aa8f46eabe7f9fe22c994ee";
    const uncompressedPublicKey =
      "04b32dc780fba98db25b4b72cf2b69da228f5e10ca6aa8f46eabe7f9fe22c994ee6e43c09d025c2ad322382347ec0f69b4e78d8e23c8ff9aa0dd0cb93665ae83d5";

    it("returns an error message on an empty value", () => {
      expect(validatePublicKey(undefined)).toContain("cannot be blank");
      expect(validatePublicKey("")).toContain("cannot be blank");
      expect(validatePublicKey(null)).toContain("cannot be blank");
    });

    it("returns an error message on a non-hex value", () => {
      expect(validatePublicKey(invalidHex)).toContain("Invalid hex");
    });

    it("returns an error message on an invalid value", () => {
      expect(validatePublicKey(invalidPublicKey)).toContain("Invalid public key");
    });

    it("returns an empty string when the value is a valid compressed public key", () => {
      expect(validatePublicKey(compressedPublicKey)).toBe("");
    });

    it("returns an empty string when the value is a valid uncompressed public key", () => {
      expect(validatePublicKey(uncompressedPublicKey)).toBe("");
    });

    it("returns an empty string when the value is a valid compressed public key used for P2SH", () => {
      expect(validatePublicKey(compressedPublicKey, P2SH)).toBe("");
    });

    it("returns an empty string when the value is a valid compressed public key used for P2SH-P2WSH", () => {
      expect(validatePublicKey(compressedPublicKey, P2SH_P2WSH)).toBe("");
    });

    it("returns an empty string when the value is a valid compressed public key used for P2WSH", () => {
      expect(validatePublicKey(compressedPublicKey, P2WSH)).toBe("");
    });

    it("returns an empty string when the value is a valid uncompressed public key used for P2SH", () => {
      expect(validatePublicKey(uncompressedPublicKey, P2SH)).toBe("");
    });

    it("returns an error message on a valid uncompressed public key used for P2SH-P2WSH", () => {
      expect(validatePublicKey(uncompressedPublicKey, P2SH_P2WSH)).toBe(
        "P2SH-P2WSH does not support uncompressed public keys."
      );
    });

    it("returns an error message on a valid uncompressed public key used for P2WSH", () => {
      expect(validatePublicKey(uncompressedPublicKey, P2WSH)).toBe(
        "P2WSH does not support uncompressed public keys."
      );
    });
  });

  describe("compressPublicKey", () => {
    const uncompressedPublicKey =
      "04b32dc780fba98db25b4b72cf2b69da228f5e10ca6aa8f46eabe7f9fe22c994ee6e43c09d025c2ad322382347ec0f69b4e78d8e23c8ff9aa0dd0cb93665ae83d5";
    const compressedPublicKey =
      "03b32dc780fba98db25b4b72cf2b69da228f5e10ca6aa8f46eabe7f9fe22c994ee";

    it("compresses an uncompressed public key", () => {
      expect(compressPublicKey(uncompressedPublicKey)).toBe(compressedPublicKey);
    });

    it("returns the same key if it is already compressed", () => {
      expect(compressPublicKey(compressedPublicKey)).toBe(compressedPublicKey);
    });
  });

  describe("deriveChildPublicKey", () => {
    const parentExtendedPublicKey =
      "xpub6CCHViYn5VzKFqrKjAzSSqP8XXSU5fEC6ZYSncX5pvSKoRLrPDcF8cEaZkrQvvnuwRUXeKVjoGmAqvbwVkNBFLaRiqcdVhWPyuShUrbcZsv";
    const childPublicKey =
      "03b32dc780fba98db25b4b72cf2b69da228f5e10ca6aa8f46eabe7f9fe22c994ee";

    it("derives a child public key", () => {
      expect(deriveChildPublicKey(parentExtendedPublicKey, "m/0", Network.MAINNET)).toBe(childPublicKey);
    });
  });

  describe("deriveChildExtendedPublicKey", () => {
    const parentExtendedPublicKey =
      "xpub6CCHViYn5VzKFqrKjAzSSqP8XXSU5fEC6ZYSncX5pvSKoRLrPDcF8cEaZkrQvvnuwRUXeKVjoGmAqvbwVkNBFLaRiqcdVhWPyuShUrbcZsv";
    const childExtendedPublicKey =
      "xpub6FjSpitFpSJB9BpSVwp3eJzhpaQFLbLefD1f3qaGRmok2Z2FDeSNsy5CL9TLwM3HpcV2kAyTNf2W1uUXs1jbeXGWjdWnsaqnUQ9PyWAYVhQ";

    it("derives a child extended public key", () => {
      expect(deriveChildExtendedPublicKey(parentExtendedPublicKey, "m/0/0", Network.MAINNET)).toBe(childExtendedPublicKey);
    });
  });

  describe("isKeyCompressed", () => {
    const compressedPublicKey =
      "03b32dc780fba98db25b4b72cf2b69da228f5e10ca6aa8f46eabe7f9fe22c994ee";
    const uncompressedPublicKey =
      "04b32dc780fba98db25b4b72cf2b69da228f5e10ca6aa8f46eabe7f9fe22c994ee6e43c09d025c2ad322382347ec0f69b4e78d8e23c8ff9aa0dd0cb93665ae83d5";

    it("returns true for a compressed public key", () => {
      expect(isKeyCompressed(compressedPublicKey)).toBe(true);
    });

    it("returns false for an uncompressed public key", () => {
      expect(isKeyCompressed(uncompressedPublicKey)).toBe(false);
    });
  });

  describe("getFingerprintFromPublicKey", () => {
    const publicKey =
      "03b32dc780fba98db25b4b72cf2b69da228f5e10ca6aa8f46eabe7f9fe22c994ee";
    const fingerprint = 724365675;

    it("returns the fingerprint from a public key", () => {
      expect(getFingerprintFromPublicKey(publicKey)).toBe(fingerprint);
    });
  });

  describe("deriveExtendedPublicKey", () => {
    const bip32Path = "m/0";
    const pubkey = "03b32dc780fba98db25b4b72cf2b69da228f5e10ca6aa8f46eabe7f9fe22c994ee";
    const chaincode = "0000000000000000000000000000000000000000000000000000000000000000";
    const parentFingerprint = 0;

    it("derives an extended public key", () => {
      const result = deriveExtendedPublicKey(bip32Path, pubkey, chaincode, parentFingerprint, Network.MAINNET);
      expect(result).toBeDefined();
      expect(result).toMatch(/^xpub/);
    });
  });

  describe("convertExtendedPublicKey", () => {
    const xpub =
      "xpub6CCHViYn5VzKFqrKjAzSSqP8XXSU5fEC6ZYSncX5pvSKoRLrPDcF8cEaZkrQvvnuwRUXeKVjoGmAqvbwVkNBFLaRiqcdVhWPyuShUrbcZsv";
    const tpub =
      "tpubDCZv1xNTnmwmXe3BBMyXekiVreY853jFeC8k9AaEAqCDYi1ZTSTLH3uQonwCTRk9jL1SFu1cLNbDY76YtcDR8n2inSMwBEAdZs37EpYS9px";

    it("converts an extended public key from mainnet to testnet", () => {
      expect(convertExtendedPublicKey(xpub, "tpub")).toBe(tpub);
    });

    it("converts an extended public key from testnet to mainnet", () => {
      expect(convertExtendedPublicKey(tpub, "xpub")).toBe(xpub);
    });
  });

  describe("validatePrefix", () => {
    it("returns an error message when the prefix is invalid", () => {
      expect(() => validatePrefix("invalid" as any)).toThrow("Invalid prefix");
    });

    it("returns null when the prefix is valid", () => {
      expect(validatePrefix("xpub")).toBeNull();
      expect(validatePrefix("tpub")).toBeNull();
    });
  });

  describe("fingerprintToFixedLengthHex", () => {
    const fingerprint = 3000000000;
    const fixedLengthFingerprint = "b2d05e00";

    it("converts a fingerprint to fixed length hex", () => {
      expect(fingerprintToFixedLengthHex(fingerprint)).toBe(fixedLengthFingerprint);
    });
  });

  describe("extendedPublicKeyRootFingerprint", () => {
    const extendedPublicKey = {
      rootFingerprint: "b2d05e00",
    };

    it("returns the root fingerprint from an extended public key", () => {
      expect(extendedPublicKeyRootFingerprint(extendedPublicKey)).toBe("b2d05e00");
    });
  });

  describe("getMaskedDerivation", () => {
    const xpub = "xpub6CCHViYn5VzKFqrKjAzSSqP8XXSU5fEC6ZYSncX5pvSKoRLrPDcF8cEaZkrQvvnuwRUXeKVjoGmAqvbwVkNBFLaRiqcdVhWPyuShUrbcZsv";
    const bip32Path = "m/0";

    it("returns the masked derivation", () => {
      const result = getMaskedDerivation({ xpub, bip32Path });
      expect(result).toBeDefined();
      expect(result).toBe("m/0");
    });
  });
});
