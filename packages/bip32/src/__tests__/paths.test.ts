import { Bip32Derivation } from "bip174/src/lib/interfaces";

import {
  combineBip32Paths,
  getRelativeBip32Sequence,
  getUnmaskedPath,
  secureSecretPath,
} from "../paths";
import { KeyOrigin } from "../types";

vi.mock("../utils", () => ({
  secureRandomInt: vi.fn(() => 42)
}));

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
  it("should throw for paths with negative indices", () => {
    expect(() => combineBip32Paths("m/0/-5", "m/0/0")).toThrow();
    expect(() => combineBip32Paths("m/0", "m/-1")).toThrow();
    expect(() => combineBip32Paths("m/-1","/m/-1")).toThrow();
  });

  it("should throw for non-numeric path components", () => {
    expect(() => combineBip32Paths("m/abc","m/0")).toThrow();
    expect(() => combineBip32Paths("m/0", "m/abc")).toThrow();
    expect(() => combineBip32Paths("m/abc", "m/abc")).toThrow();
  });
});

describe("secureSecretPath", () => {
  it("should return a path of the desired depth", async () => {
    const depth = 4;
    const securePath = secureSecretPath(depth);
    expect(securePath.split("/").length).toBe(depth + 1);
  });

  it("should return a secure path", async () => {
    const expectedPath = "m/42/42/42/42";
    const securePath = secureSecretPath();
    expect(securePath).toBe(expectedPath);
  });

  it("should throw an error for invalid depth", async () => {
    let failures = 0;
    try {
      await secureSecretPath(32);
    } catch (e: unknown) {
      failures += 1;
    }
    try {
      await secureSecretPath(0);
    } catch (e: unknown) {
      failures += 1;
    }
    expect(failures).toBe(2);
  });

  it("should handle maximum allowed depth", () => {
    // secureSecretPath function itself throws an error if depth is 32 or greater.
    // Therefore, 31 is the maximum depth it will accept.
    const maxDepth = 31;
    const path = secureSecretPath(maxDepth);
    expect(path.split("/").length).toBe(maxDepth + 1);
  });
  
});

describe("getRelativeBip32Sequence", () => {
  it("should return the relative BIP32 sequence for a child key", () => {
    const parentPath = "m/45'/0'/0'";
    const childPath = "m/45'/0'/0'/0/0";
    const relativeSequence = getRelativeBip32Sequence(parentPath, childPath);
    expect(relativeSequence).toEqual([0, 0]);
  });

  it("should throw an error if the child key is longer than the parent key", () => {
    const childPath = "m/45'/0'/0'";
    const parentPath = "m/45'/0'/0'/0/0/0";
    expect(() => getRelativeBip32Sequence(parentPath, childPath)).toThrow();
  });
});
