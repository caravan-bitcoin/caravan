import { Network, TEST_FIXTURES } from "@caravan/bitcoin";
import { Bip32Derivation } from "bip174/src/lib/interfaces";

import {
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

jest.mock("../paths", () => {
  return {
    __esModule: true,
    ...jest.requireActual("../paths"),
    secureSecretPath: jest.fn(),
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
    console.log(mockPaths);
    (mockPaths.secureSecretPath as jest.Mock).mockReturnValue("m/0/0");
  });

  afterAll(jest.restoreAllMocks);
  it("should return a random child xpub", () => {
    const keyOrigin = {
      xpub: parent.xpub,
      bip32Path: parentPath,
      rootFingerprint: parent.fingerprint,
    };
    const actual = getRandomChildXpub(keyOrigin, depth);
    expect(actual).toEqual({
      xpub: child.xpub,
      bip32Path: childPath,
      rootFingerprint: child.fingerprint,
    });
    expect(mockPaths.secureSecretPath).toHaveBeenCalledWith(depth);
  });
});
