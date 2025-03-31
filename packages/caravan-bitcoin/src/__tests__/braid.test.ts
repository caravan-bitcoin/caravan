import { describe, it, expect, beforeEach } from "vitest";
import { TEST_FIXTURES } from "../fixtures";
import {
  Braid,
  braidAddressType,
  braidIndex,
  braidConfig,
  braidExtendedPublicKeys,
  braidNetwork,
  braidRequiredSigners,
  deriveMultisigByIndex,
  deriveMultisigByPath,
  generateBip32DerivationByIndex,
  generateBip32DerivationByPath,
  generatePublicKeysAtIndex,
  generatePublicKeysAtPath,
  validateBip32PathForBraid,
} from "../braid";

const BRAIDS = TEST_FIXTURES.braids;

describe("braids", () => {
  describe("Braid", () => {
    let defaultBraid;
    beforeEach(() => {
      // runs before each test in this block
      const {
        network,
        addressType,
        extendedPublicKeys,
        requiredSigners,
        index,
      } = BRAIDS[0];
      defaultBraid = new Braid({
        network,
        addressType,
        extendedPublicKeys,
        requiredSigners,
        index,
      });
    });

    it("blank braid", () => {
      const braid = new Braid();
      expect(braidConfig(braid)).toBeDefined();
    });

    it("braid with all properties", () => {
      expect(braidAddressType(defaultBraid)).toEqual(defaultBraid.addressType);
      expect(braidIndex(defaultBraid)).toEqual(defaultBraid.index);
      expect(braidConfig(defaultBraid)).toBeDefined();
      expect(braidExtendedPublicKeys(defaultBraid)).toEqual(defaultBraid.extendedPublicKeys);
      expect(braidNetwork(defaultBraid)).toEqual(defaultBraid.network);
      expect(braidRequiredSigners(defaultBraid)).toEqual(defaultBraid.requiredSigners);
    });

    it("derives multisig by index", () => {
      const result = deriveMultisigByIndex(defaultBraid, 0);
      expect(result).toBeDefined();
      expect(result).toHaveProperty('braidDetails');
      expect(result).toHaveProperty('bip32Derivation');
      expect(result).toHaveProperty('address');
      expect(result).toHaveProperty('redeem');
      expect(result.redeem).toHaveProperty('output');
      expect(result.redeem).toHaveProperty('m');
      expect(result.redeem).toHaveProperty('n');
    });

    it("derives multisig by path", () => {
      const path = "m/0/0";
      const result = deriveMultisigByPath(defaultBraid, path);
      expect(result).toBeDefined();
      expect(result).toHaveProperty('braidDetails');
      expect(result).toHaveProperty('bip32Derivation');
      expect(result).toHaveProperty('address');
      expect(result).toHaveProperty('redeem');
      expect(result.redeem).toHaveProperty('output');
      expect(result.redeem).toHaveProperty('m');
      expect(result.redeem).toHaveProperty('n');
    });

    it("generates bip32 derivation by index", () => {
      const result = generateBip32DerivationByIndex(defaultBraid, 0);
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
      expect(result[0]).toHaveProperty('masterFingerprint');
      expect(result[0]).toHaveProperty('path');
      expect(result[0]).toHaveProperty('pubkey');
    });

    it("generates bip32 derivation by path", () => {
      const path = "m/0/0";
      const result = generateBip32DerivationByPath(defaultBraid, path);
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
      expect(result[0]).toHaveProperty('masterFingerprint');
      expect(result[0]).toHaveProperty('path');
      expect(result[0]).toHaveProperty('pubkey');
    });

    it("generates public keys at index", () => {
      const result = generatePublicKeysAtIndex(defaultBraid, 0);
      expect(result).toBeDefined();
      expect(result.length).toBeGreaterThan(0);
    });

    it("generates public keys at path", () => {
      const path = "m/0/0";
      const result = generatePublicKeysAtPath(defaultBraid, path);
      expect(result).toBeDefined();
      expect(result.length).toBeGreaterThan(0);
    });

    it("validates bip32 path", () => {
      const path = "m/0/0";
      expect(() => validateBip32PathForBraid(defaultBraid, path)).not.toThrow();
    });

    it("throws error for invalid path", () => {
      const path = "invalid/path";
      expect(() => validateBip32PathForBraid(defaultBraid, path)).toThrow();
    });
  });
});
