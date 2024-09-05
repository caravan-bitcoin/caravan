import { Bip32Derivation } from "bip174/src/lib/interfaces";

import {
  combineBip32Paths,
  getMaskedKeyOrigin,
  getUnmaskedPath,
  isValidChildPubKey,
  KeyOrigin,
} from "..";
import { Network } from "@caravan/bitcoin";

const globalOrigin: KeyOrigin = {
  xpub: "tpubDEtyXJKvCT2V3ccXBBrNPEGb8RNZjNMcGbx68CzE74zq7aKWwRz8up95PYCm7HrYRT7Sz42uFVpW1MgRzqRU7KTHsY6LgPcYMc53pqHC7uc",
  bip32Path: "m/45'/0'/0'/42",
  rootFingerprint: "9a6a2580",
};

const testChildDerivation = {
  path: "m/45'/0'/0'/42/0/0",
  pubkey: Buffer.from(
    "03dee36bc0b80de80631a4dca518caf31672c6023bf5e8416fa2c9587a8a1a26bf",
    "hex",
  ),
} as unknown as Bip32Derivation;

describe("getMaskedKeyOrigin", () => {
  it("should return the masked origin", () => {
    const masked = getMaskedKeyOrigin(globalOrigin.xpub);
    expect(masked).toEqual({
      xpub: globalOrigin.xpub,
      bip32Path: "m/0/0/0/0",
      rootFingerprint: "86bd941f",
    });
  });
});

describe("isValidChildPubKey", () => {
  it("should return true for a valid child pubkey", () => {
    expect(isValidChildPubKey(testChildDerivation, globalOrigin, Network.REGTEST)).toBe(
      true,
    );
  });

  it("should return true for valid masked key", () => {
    const derivation = {
      ...testChildDerivation,
      path: "m/45/0/0/0/0/0",
    };
    expect(isValidChildPubKey(derivation, globalOrigin, Network.REGTEST)).toBe(true);
  });

  it("should throw if child key is longer than parent", () => {
    const derivation = {
      ...testChildDerivation,
      path: "m/45'/0'/0'/",
    };
    expect(() =>
      isValidChildPubKey(derivation, globalOrigin, Network.REGTEST),
    ).toThrow();
  });

  it("should return false for an invalid child pubkey", () => {
    const otherGlobal: KeyOrigin = {
      xpub: "tpubDEtyXJKvDdEvUzbiBsHXXAqjnNvDJdQWLjyjCxSRzzHq77fKjbxFJ2uXuciR28CRk6dQzGwNw2Dby615BbykdWHDQZHCacY21JW3FCFKcme",
      bip32Path: "m/45'/0'/0'/5222010",
      rootFingerprint: "9a6a2580",
    };
    expect(isValidChildPubKey(testChildDerivation, otherGlobal, Network.REGTEST)).toBe(
      false,
    );
  });
});

describe("getUnmaskedPath", () => {
  it("should return the unmasked path", () => {
    const maskedChildDerivation = {
      ...testChildDerivation,
      path: "m/0/0/0/0/0/0",
    };
    const unmaskedPath = getUnmaskedPath(maskedChildDerivation, globalOrigin);
    expect(unmaskedPath).toBe(testChildDerivation.path);
  });
});

describe("combineBip32Paths", () => {
  const firstPath = "m/45'/0'/0'/42";
  const secondPath = "m/0/0";
  it("should combine two valid bip32 paths", () => {
    const combined = combineBip32Paths(firstPath, secondPath);
    expect(combined).toBe("m/45'/0'/0'/42/0/0");
  });

  it("should combine two valid bip32 paths with extra slashes", () => {
    const combined = combineBip32Paths(`${firstPath}/`, `${secondPath}/`);
    expect(combined).toBe("m/45'/0'/0'/42/0/0");
  });

  it("should return the second path if the first path is 'm'", () => {
    const firstPath = "m";
    const secondPath = "m/0/0/0/0";
    const combined = combineBip32Paths(firstPath, secondPath);
    expect(combined).toBe(secondPath);
  });

  it("should return the first path if the second path is 'm'", () => {
    const firstPath = "m/45'/0'/0'/42";
    const secondPath = "m";
    const combined = combineBip32Paths(firstPath, secondPath);
    expect(combined).toBe(firstPath);
  });

  it("should throw an error for an invalid bip32 path", () => {
    const firstPath = "m/45'/0'/0'/42";
    const secondPath = "invalid/path";
    expect(() => combineBip32Paths(firstPath, secondPath)).toThrow();
  });
});
