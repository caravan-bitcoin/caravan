/**
 * Tests for the @noble/curves wrapper that implements TinySecp256k1Interface
 * for bitcoinjs-lib v6.
 *
 * Test vectors sourced from:
 * - BIP340 (Schnorr signatures): https://github.com/bitcoin/bips/blob/master/bip-0340/test-vectors.csv
 * - BIP341 (Taproot): https://github.com/bitcoin/bips/blob/master/bip-0341/wallet-test-vectors.json
 * - Known secp256k1 curve properties
 */

import { describe, it, expect } from "vitest";
import { isXOnlyPoint, xOnlyPointAddTweak, ecc } from "./noble-ecc";
import { secp256k1 } from "@noble/curves/secp256k1";

// Helper to convert hex string to Uint8Array
function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

// Helper to convert Uint8Array to hex string
function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * BIP340 test vectors for isXOnlyPoint testing
 * https://github.com/bitcoin/bips/blob/master/bip-0340/test-vectors.csv
 */
const BIP340_VALID_PUBKEYS = [
  { index: 0, publicKey: "F9308A019258C31049344F85F89D5229B531C845836F99B08601F113BCE036F9", comment: "secret key = 3" },
  { index: 1, publicKey: "DFF1D77F2A671C5F36183726DB2341BE58FEAE1DA2DECED843240F7B502BA659", comment: "" },
  { index: 2, publicKey: "DD308AFEC5777E13121FA72B9CC1B7CC0139715309B086C960E18FD969774EB8", comment: "" },
  { index: 3, publicKey: "25D1DFF95105F5253C4022F628A996AD3A0D95FBF21D468A1B33F8C160D8F517", comment: "test fails if msg is reduced modulo p or n" },
  { index: 4, publicKey: "D69C3509BB99E412E68B0FE8544E72837DFA30746D8BE2AA65975F29D22DC7B9", comment: "" },
  { index: 15, publicKey: "778CAA53B4393AC467774D09497A87224BF9FAB6F6E68B23086497324D6FD117", comment: "message of size 0" },
  { index: 16, publicKey: "778CAA53B4393AC467774D09497A87224BF9FAB6F6E68B23086497324D6FD117", comment: "message of size 1" },
  { index: 17, publicKey: "778CAA53B4393AC467774D09497A87224BF9FAB6F6E68B23086497324D6FD117", comment: "message of size 17" },
  { index: 18, publicKey: "778CAA53B4393AC467774D09497A87224BF9FAB6F6E68B23086497324D6FD117", comment: "message of size 100" },
];

const BIP340_INVALID_PUBKEYS = [
  { index: 5, publicKey: "EEFDEA4CDB677750A420FEE807EACF21EB9898AE79B9768766E4FAA04A2D4A34", comment: "public key not on the curve" },
  { index: 14, publicKey: "FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEFFFFFC30", comment: "public key exceeds field size" },
];

/**
 * BIP341 wallet test vectors for xOnlyPointAddTweak testing
 * https://github.com/bitcoin/bips/blob/master/bip-0341/wallet-test-vectors.json
 */
const BIP341_TWEAK_VECTORS = [
  { vector: 1, internalPubkey: "d6889cb081036e0faefa3a35157ad71086b123b2b144b649798b494c300a961d", tweak: "b86e7be8f39bab32a6f2c0443abbc210f0edac0e2c53d501b36b64437d9c6c70", tweakedPubkey: "53a1f6e454df1aa2776a2814a721372d6258050de330b3c6d10ee8f4e0dda343" },
  { vector: 2, internalPubkey: "187791b6f712a8ea41c8ecdd0ee77fab3e85263b37e1ec18a3651926b3a6cf27", tweak: "cbd8679ba636c1110ea247542cfbd964131a6be84f873f7f3b62a777528ed001", tweakedPubkey: "147c9c57132f6e7ecddba9800bb0c4449251c92a1e60371ee77557b6620f3ea3" },
  { vector: 3, internalPubkey: "93478e9488f956df2396be2ce6c5cced75f900dfa18e7dabd2428aae78451820", tweak: "6af9e28dbf9d6aaf027696e2598a5b3d056f5fd2355a7fd5a37a0e5008132d30", tweakedPubkey: "e4d810fd50586274face62b8a807eb9719cef49c04177cc6b76a9a4251d5450e" },
  { vector: 4, internalPubkey: "ee4fe085983462a184015d1f782d6a5f8b9c2b60130aff050ce221ecf3786592", tweak: "9e0517edc8259bb3359255400b23ca9507f2a91cd1e4250ba068b4eafceba4a9", tweakedPubkey: "712447206d7a5238acc7ff53fbe94a3b64539ad291c7cdbc490b7577e4b17df5" },
  { vector: 5, internalPubkey: "f9f400803e683727b14f463836e1e78e1c64417638aa066919291a225f0e8dd8", tweak: "639f0281b7ac49e742cd25b7f188657626da1ad169209078e2761cefd91fd65e", tweakedPubkey: "77e30a5522dd9f894c3f8b8bd4c4b2cf82ca7da8a3ea6a239655c39c050ab220" },
  { vector: 6, internalPubkey: "e0dfe2300b0dd746a3f8674dfd4525623639042569d829c7f0eed9602d263e6f", tweak: "b57bfa183d28eeb6ad688ddaabb265b4a41fbf68e5fed2c72c74de70d5a786f4", tweakedPubkey: "91b64d5324723a985170e4dc5a0f84c041804f2cd12660fa5dec09fc21783605" },
  { vector: 7, internalPubkey: "55adf4e8967fbd2e29f20ac896e60c3b0f1d5b0efa9d34941b5958c7b0a0312d", tweak: "6579138e7976dc13b6a92f7bfd5a2fc7684f5ea42419d43368301470f3b74ed9", tweakedPubkey: "75169f4001aa68f15bbed28b218df1d0a62cbbcf1188c6665110c293c907b831" },
];

// secp256k1 generator point G x-coordinate
const GENERATOR_X = "79BE667EF9DCBBAC55A06295CE870B07029BFCDB2DCE28D959F2815B16F81798";

describe("noble-ecc wrapper", () => {
  describe("isXOnlyPoint - BIP340 test vectors", () => {
    it("should return true for all unique valid BIP340 public keys", () => {
      const uniqueKeys = [...new Set(BIP340_VALID_PUBKEYS.map((v) => v.publicKey))];
      for (const publicKey of uniqueKeys) {
        expect(isXOnlyPoint(hexToBytes(publicKey))).toBe(true);
      }
    });

    it.each(BIP340_VALID_PUBKEYS)(
      "BIP340 index $index: valid pubkey $publicKey",
      ({ publicKey }) => {
        expect(isXOnlyPoint(hexToBytes(publicKey))).toBe(true);
      },
    );

    it.each(BIP340_INVALID_PUBKEYS)(
      "BIP340 index $index: invalid - $comment",
      ({ publicKey }) => {
        expect(isXOnlyPoint(hexToBytes(publicKey))).toBe(false);
      },
    );
  });

  describe("isXOnlyPoint - additional tests", () => {
    it("should return true for generator point G", () => {
      expect(isXOnlyPoint(hexToBytes(GENERATOR_X))).toBe(true);
    });

    it.each([
      { length: 31, description: "too short" },
      { length: 33, description: "too long" },
      { length: 0, description: "empty" },
    ])("should return false for $description input ($length bytes)", ({ length }) => {
      expect(isXOnlyPoint(new Uint8Array(length))).toBe(false);
    });

    it("should return false for all zeros (not a valid point)", () => {
      expect(isXOnlyPoint(new Uint8Array(32))).toBe(false);
    });

    it("should return false for x = 5 (no valid y on curve)", () => {
      const xEqualsFive = hexToBytes(
        "0000000000000000000000000000000000000000000000000000000000000005",
      );
      expect(isXOnlyPoint(xEqualsFive)).toBe(false);
    });

    it.each(BIP341_TWEAK_VECTORS)(
      "BIP341 vector $vector: internal pubkey should be valid",
      ({ internalPubkey }) => {
        expect(isXOnlyPoint(hexToBytes(internalPubkey))).toBe(true);
      },
    );
  });

  describe("xOnlyPointAddTweak - BIP341 test vectors", () => {
    it.each(BIP341_TWEAK_VECTORS)(
      "BIP341 vector $vector: $internalPubkey + tweak = $tweakedPubkey",
      ({ internalPubkey, tweak, tweakedPubkey }) => {
        const result = xOnlyPointAddTweak(hexToBytes(internalPubkey), hexToBytes(tweak));

        expect(result).not.toBe(null);
        expect(bytesToHex(result!.xOnlyPubkey)).toBe(tweakedPubkey);
      },
    );
  });

  describe("xOnlyPointAddTweak - additional tests", () => {
    it.each([
      { pointLen: 31, tweakLen: 32, description: "point too short" },
      { pointLen: 33, tweakLen: 32, description: "point too long" },
      { pointLen: 32, tweakLen: 31, description: "tweak too short" },
      { pointLen: 32, tweakLen: 33, description: "tweak too long" },
    ])("should return null for $description", ({ pointLen, tweakLen }) => {
      const point = pointLen === 32 ? hexToBytes(GENERATOR_X) : new Uint8Array(pointLen);
      const tweak = new Uint8Array(tweakLen);
      if (tweakLen === 32) tweak[31] = 1;
      expect(xOnlyPointAddTweak(point, tweak)).toBe(null);
    });

    it("should return null for tweak >= curve order", () => {
      const gX = hexToBytes(GENERATOR_X);
      // secp256k1 curve order n = 0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364141
      const tweakEqualToOrder = hexToBytes(
        "FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364141",
      );
      expect(xOnlyPointAddTweak(gX, tweakEqualToOrder)).toBe(null);
    });

    it("should correctly add a zero tweak (identity operation)", () => {
      const gX = hexToBytes(GENERATOR_X);
      const result = xOnlyPointAddTweak(gX, new Uint8Array(32));

      expect(result).not.toBe(null);
      expect(bytesToHex(result!.xOnlyPubkey).toUpperCase()).toBe(GENERATOR_X);
    });

    it("should correctly compute G + 1*G = 2G", () => {
      const gX = hexToBytes(GENERATOR_X);
      const oneTweak = new Uint8Array(32);
      oneTweak[31] = 1;

      const result = xOnlyPointAddTweak(gX, oneTweak);
      expect(result).not.toBe(null);

      // Verify against @noble/curves
      const twoG = secp256k1.ProjectivePoint.BASE.multiply(2n);
      expect(bytesToHex(result!.xOnlyPubkey)).toBe(
        twoG.toAffine().x.toString(16).padStart(64, "0"),
      );
    });

    it("should return correct parity for tweaked points", () => {
      const gX = hexToBytes(GENERATOR_X);
      const oneTweak = new Uint8Array(32);
      oneTweak[31] = 1;

      const result = xOnlyPointAddTweak(gX, oneTweak);
      expect(result).not.toBe(null);

      const twoG = secp256k1.ProjectivePoint.BASE.multiply(2n);
      const expectedParity = (twoG.toAffine().y & 1n) === 0n ? 0 : 1;
      expect(result!.parity).toBe(expectedParity);
    });

    it.each([
      { point: "DFF1D77F2A671C5F36183726DB2341BE58FEAE1DA2DECED843240F7B502BA659", tweak: "0000000000000000000000000000000000000000000000000000000000000005" },
      { point: "25D1DFF95105F5253C4022F628A996AD3A0D95FBF21D468A1B33F8C160D8F517", tweak: "FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364140" },
    ])("should match @noble/curves for point $point", ({ point, tweak }) => {
      const result = xOnlyPointAddTweak(hexToBytes(point), hexToBytes(tweak));
      expect(result).not.toBe(null);

      // Verify using @noble/curves directly
      const prefixed = new Uint8Array(33);
      prefixed[0] = 0x02;
      prefixed.set(hexToBytes(point), 1);
      const P = secp256k1.ProjectivePoint.fromHex(prefixed);
      const T = secp256k1.ProjectivePoint.BASE.multiply(BigInt("0x" + tweak));
      const Q = P.add(T).toAffine();

      expect(bytesToHex(result!.xOnlyPubkey)).toBe(Q.x.toString(16).padStart(64, "0"));
      expect(result!.parity).toBe((Q.y & 1n) === 0n ? 0 : 1);
    });
  });

  describe("ecc object export", () => {
    it("should export an object with required interface methods", () => {
      expect(typeof ecc.isXOnlyPoint).toBe("function");
      expect(typeof ecc.xOnlyPointAddTweak).toBe("function");
    });

    it("should work correctly when passed to initEccLib pattern", () => {
      const gX = hexToBytes(GENERATOR_X);
      expect(ecc.isXOnlyPoint(gX)).toBe(true);

      const tweak = new Uint8Array(32);
      tweak[31] = 1;
      expect(ecc.xOnlyPointAddTweak(gX, tweak)).not.toBe(null);
    });
  });

  describe("edge cases", () => {
    it("should handle the point at infinity case gracefully", () => {
      const gX = hexToBytes(GENERATOR_X);
      // tweak = n - 1
      const tweakNMinus1 = hexToBytes(
        "FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364140",
      );

      const result = xOnlyPointAddTweak(gX, tweakNMinus1);
      // Should either return null or a valid 32-byte result
      expect(result === null || result.xOnlyPubkey.length === 32).toBe(true);
    });

    it("should handle large but valid tweak (approximately n/2)", () => {
      const gX = hexToBytes(GENERATOR_X);
      const largeTweak = hexToBytes(
        "7FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF5D576E7357A4501DDFE92F46681B20A0",
      );

      const result = xOnlyPointAddTweak(gX, largeTweak);
      expect(result).not.toBe(null);
      expect(result!.xOnlyPubkey.length).toBe(32);
    });

    it("should produce different results for different tweaks", () => {
      const gX = hexToBytes(GENERATOR_X);
      const tweak1 = new Uint8Array(32);
      tweak1[31] = 1;
      const tweak2 = new Uint8Array(32);
      tweak2[31] = 2;

      const result1 = xOnlyPointAddTweak(gX, tweak1);
      const result2 = xOnlyPointAddTweak(gX, tweak2);

      expect(result1).not.toBe(null);
      expect(result2).not.toBe(null);
      expect(bytesToHex(result1!.xOnlyPubkey)).not.toBe(bytesToHex(result2!.xOnlyPubkey));
    });

    it.each([
      { point: "79BE667EF9DCBBAC55A06295CE870B07029BFCDB2DCE28D959F2815B16F81798", name: "1*G" },
      { point: "C6047F9441ED7D6D3045406E95C07CD85C778E4B8CEF3CA7ABAC09B95C709EE5", name: "2*G" },
      { point: "F9308A019258C31049344F85F89D5229B531C845836F99B08601F113BCE036F9", name: "3*G" },
    ])("should handle $name correctly with tweak", ({ point }) => {
      const tweak = new Uint8Array(32);
      tweak[31] = 10;

      const result = xOnlyPointAddTweak(hexToBytes(point), tweak);
      expect(result).not.toBe(null);
      expect(result!.xOnlyPubkey.length).toBe(32);
    });
  });
});
