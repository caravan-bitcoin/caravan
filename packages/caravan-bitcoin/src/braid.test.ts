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
  generateBraid,
  generatePublicKeysAtIndex,
  generatePublicKeysAtPath,
  validateBip32PathForBraid,
} from "./braid";
import { TEST_FIXTURES } from "./fixtures";

const BRAIDS = TEST_FIXTURES.braids;
const MULTISIGS = TEST_FIXTURES.multisigs;

describe("braids", () => {
  describe("Braid", () => {
    const { pubKeySets, bip32Derivations } = BRAIDS[0];

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
      braidConfig(braid);
    });

    it("encodes and decodes a braid", () => {
      const {
        network,
        addressType,
        extendedPublicKeys,
        requiredSigners,
        index,
      } = BRAIDS[0];
      expect(braidConfig(defaultBraid)).toBe(
        JSON.stringify({
          network,
          addressType,
          extendedPublicKeys,
          requiredSigners,
          index,
        }),
      );

      expect(braidNetwork(defaultBraid)).toBe(BRAIDS[0].network);
      expect(braidAddressType(defaultBraid)).toBe(BRAIDS[0].addressType);
      expect(braidExtendedPublicKeys(defaultBraid)).toBe(
        BRAIDS[0].extendedPublicKeys,
      );
      expect(braidRequiredSigners(defaultBraid)).toBe(
        BRAIDS[0].requiredSigners,
      );
      expect(braidIndex(defaultBraid)).toBe(BRAIDS[0].index);

      expect(
        Braid.fromData({
          network,
          addressType,
          extendedPublicKeys,
          requiredSigners,
          index,
        }),
      ).toStrictEqual(defaultBraid);
    });

    it("should exercise successfully validateBip32PathForBraid", () => {
      expect(validateBip32PathForBraid(defaultBraid, "0"));
      expect(validateBip32PathForBraid(defaultBraid, "0/0"));
      expect(validateBip32PathForBraid(defaultBraid, "m/0/0"));
      expect(() => validateBip32PathForBraid(defaultBraid, "/0/0")).toThrow();
    });

    it("should exercise base58string xpub paths", () => {
      const {
        network,
        addressType,
        stringExtendedPublicKeys,
        requiredSigners,
        index,
      } = BRAIDS[0];
      const stringBraid = new Braid({
        network,
        addressType,
        extendedPublicKeys: stringExtendedPublicKeys,
        requiredSigners,
        index,
      });

      expect(generatePublicKeysAtIndex(stringBraid, 0)).toEqual(
        pubKeySets.index[0],
      );
    });

    it("should generate pubkeys at an index", () => {
      expect(generatePublicKeysAtIndex(defaultBraid, 0)).toEqual(
        pubKeySets.index[0],
      );
      expect(generatePublicKeysAtIndex(defaultBraid, 1)).toEqual(
        pubKeySets.index[1],
      );
      expect(generatePublicKeysAtIndex(defaultBraid, 48349)).toEqual(
        pubKeySets.index[48349],
      );
    });

    it("should generate pubkeys at path", () => {
      expect(generatePublicKeysAtPath(defaultBraid, "0/0")).toEqual(
        pubKeySets.path["0/0"],
      );
      expect(generatePublicKeysAtPath(defaultBraid, "m/0/0")).toEqual(
        pubKeySets.path["0/0"],
      );
    });

    it("should fail to generate pubkeys at path", () => {
      expect(() => generatePublicKeysAtPath(defaultBraid, "1/0")).toThrow(
        /Cannot derive paths outside of the braid's index/i,
      );
      expect(() =>
        generatePublicKeysAtPath(defaultBraid, "48349/0/0/0"),
      ).toThrow(/Cannot derive paths outside of the braid's index/i);
    });

    it("should generate getBip32Derivation at index", () => {
      expect(generateBip32DerivationByIndex(defaultBraid, 0)).toEqual(
        bip32Derivations.index[0],
      );
      expect(generateBip32DerivationByIndex(defaultBraid, 1)).toEqual(
        bip32Derivations.index[1],
      );
      expect(generateBip32DerivationByIndex(defaultBraid, 48349)).toEqual(
        bip32Derivations.index[48349],
      );
    });

    it("should generate getBip32Derivation at path", () => {
      expect(generateBip32DerivationByPath(defaultBraid, "0/0")).toEqual(
        bip32Derivations.path["0/0"],
      );
    });

    it("should fail to generate getBip32Derivation at path", () => {
      expect(() => generateBip32DerivationByPath(defaultBraid, "1/0")).toThrow(
        /Cannot derive paths outside of the braid's index/i,
      );
      expect(() =>
        generateBip32DerivationByPath(defaultBraid, "48349/0/0/0"),
      ).toThrow(/Cannot derive paths outside of the braid's index/i);
    });

    it("should generate braid-aware multisig at index 0", () => {
      expect(deriveMultisigByIndex(defaultBraid, 0)).toEqual(
        expect.objectContaining(MULTISIGS[0].braidAwareMultisig),
      );
    });

    it("should generate braid-aware multisig at path 0/0", () => {
      expect(deriveMultisigByPath(defaultBraid, "0/0")).toEqual(
        expect.objectContaining(MULTISIGS[0].braidAwareMultisig),
      );
    });

    it("generate a braid", () => {
      const {
        network,
        addressType,
        extendedPublicKeys,
        requiredSigners,
        index,
      } = BRAIDS[0];
      expect(
        generateBraid(
          network,
          addressType,
          extendedPublicKeys,
          requiredSigners,
          index,
        ),
      ).toStrictEqual(defaultBraid);
    });

    it("generate a braid from JSON", () => {
      const json = braidConfig(defaultBraid);
      const braid = Braid.fromJSON(json);
      expect(braidConfig(braid)).toEqual(json);
      expect(braid.toJSON()).toEqual(json);
    });
  });
});
