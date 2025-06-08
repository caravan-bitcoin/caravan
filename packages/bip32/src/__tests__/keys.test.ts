import { ExtendedPublicKey, Network, TEST_FIXTURES } from "@caravan/bitcoin";
import { Bip32Derivation } from "bip174/src/lib/interfaces";
import { Mock } from "vitest";

import {
  getBlindedXpub,
  getMaskedKeyOrigin,
  getRandomChildXpub,
  isValidChildPubKey,
  setXpubNetwork,
} from "../keys";
import * as mockPaths from "../paths";
import { KeyOrigin } from "../types";

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

const depthTestCases = [
  { path: "m/45'", expected: "m/0" },
  { path: "m/45'/0", expected: "m/0/0" },
  { path: "m/45'/0'/0'", expected: "m/0/0/0" }
];

describe("getMaskedKeyOrigin", () => {
  it("should return the masked origin", () => {
    const masked = getMaskedKeyOrigin(globalOrigin.xpub);
    expect(masked).toEqual({
      xpub: globalOrigin.xpub,
      bip32Path: "m/0/0/0/0",
      rootFingerprint: "86bd941f",
    });
  });

  it.each(depthTestCases)("should handle testnet xpub with depth $path -> $expected", ({ path, expected }) => {
    const nodes = TEST_FIXTURES.keys.open_source.nodes;
    const depthNode = nodes[path];
    const parentFingerprint = ExtendedPublicKey.fromBase58(depthNode.tpub).parentFingerprint?.toString(16);
    const masked = getMaskedKeyOrigin(depthNode.tpub);
    
    expect(masked).toEqual({
      xpub: depthNode.tpub,
      bip32Path: expected,
      rootFingerprint: parentFingerprint
    });
  });

  it.each(depthTestCases)("should handle mainnet xpub with depth $path -> $expected", ({ path, expected }) => {
    const nodes = TEST_FIXTURES.keys.open_source.nodes;
    const depthNode = nodes[path];
    const parentFingerprint = ExtendedPublicKey.fromBase58(depthNode.xpub).parentFingerprint?.toString(16);
    const masked = getMaskedKeyOrigin(depthNode.xpub);
    
    expect(masked).toEqual({
      xpub: depthNode.xpub,
      bip32Path: expected,
      rootFingerprint: parentFingerprint
    });
  });

  it("should throw an error for an invalid xpub", () => {
    const invalidXpub = "invalid-xpub-str";
    expect(() => getMaskedKeyOrigin(invalidXpub)).toThrow();
  })
});

describe("isValidChildPubKey", () => {
  it("should return true for a valid child pubkey", () => {
    expect(
      isValidChildPubKey(testChildDerivation, globalOrigin, Network.REGTEST),
    ).toBe(true);
  });

  it("should return true for valid masked key", () => {
    const derivation = {
      ...testChildDerivation,
      path: "m/45/0/0/0/0/0",
    };
    expect(isValidChildPubKey(derivation, globalOrigin, Network.REGTEST)).toBe(
      true,
    );
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
    expect(
      isValidChildPubKey(testChildDerivation, otherGlobal, Network.REGTEST),
    ).toBe(false);
  });
});

describe("setXpubNetwork", () => {
  let xpub, tpub: string;
  beforeEach(() => {
    const node = TEST_FIXTURES.keys.open_source.nodes["m/45'/0'/0'/0"];
    xpub = node.xpub;
    tpub = node.tpub;
  });

  it("should correctly convert", () => {
    expect(setXpubNetwork(xpub, Network.TESTNET)).toBe(tpub);
    expect(setXpubNetwork(tpub, Network.MAINNET)).toBe(xpub);
    expect(setXpubNetwork(xpub, Network.REGTEST)).toBe(tpub);
  });

  it("should not change anything if no network specified", () => {
    expect(setXpubNetwork(xpub)).toBe(xpub);
    expect(setXpubNetwork(tpub)).toBe(tpub);
  });
});

vi.mock("../paths", async () => {
  const actual = await vi.importActual("../paths");
  return {
    __esModule: true,
    ...actual,
    secureSecretPath: vi.fn(),
  };
});

describe("getRandomChildXpub", () => {
  let parentPath, childPath, parent, child, depth;
  beforeEach(() => {
    depth = 2;
    const nodes = TEST_FIXTURES.keys.open_source.nodes;
    parentPath = "m/45'/0'/0'";
    parent = nodes[parentPath];
    // depth below the parent path
    childPath = "m/45'/0'/0'/0/0";
    child = nodes["m/45'/0'/0'/0/0"];
    (mockPaths.secureSecretPath as Mock).mockReturnValue("m/0/0");
  });

  afterAll(vi.restoreAllMocks);
  it("should return a random child xpub", async () => {
    const keyOrigin = {
      xpub: parent.xpub,
      bip32Path: parentPath,
      rootFingerprint: parent.rootFingerprint,
    };
    const actual = await getRandomChildXpub(keyOrigin, depth);
    expect(actual).toEqual({
      xpub: child.xpub,
      bip32Path: childPath,
      rootFingerprint: child.rootFingerprint,
    });
    expect(mockPaths.secureSecretPath).toHaveBeenCalledWith(depth);
  });
  it("should handle mixed hardened/non-hardened paths", async () => {
    const mixedOrigin: KeyOrigin = {
      xpub: parent.xpub,
      bip32Path: "m/44'/0/0",
      rootFingerprint: parent.rootFingerprint,
    };
    (mockPaths.secureSecretPath as Mock).mockReturnValue("m/0/0");
    const result = await getRandomChildXpub(mixedOrigin, 2);
    expect(result).toEqual({
      bip32Path: "m/44'/0/0/0/0",
      xpub: "xpub6FjSpitFpSJB9BpSVwp3eJzhpaQFLbLefD1f3qaGRmok2Z2FDeSNsy5CL9TLwM3HpcV2kAyTNf2W1uUXs1jbeXGWjdWnsaqnUQ9PyWAYVhQ",
      rootFingerprint: parent.rootFingerprint
    })
  });
});

// Very similar to the above test, but only works on an xpub
describe("getBlindedXpub", () => {
  let parentPath, parent, child;
  beforeEach(() => {
    const nodes = TEST_FIXTURES.keys.open_source.nodes;
    parentPath = "m/45'/0'/0'";
    parent = nodes[parentPath];
    // depth below the parent path
    child = nodes["m/45'/0'/0'/0/0"];
    (mockPaths.secureSecretPath as Mock).mockReturnValue("m/0/0");
  });

  afterAll(vi.restoreAllMocks);
  it("should return a random child key origin", async () => {
    const actual = await getBlindedXpub(parent.xpub);
    expect(actual.xpub).toEqual(child.xpub);
    expect(actual.bip32Path).toEqual("*/0/0");
  });
});
