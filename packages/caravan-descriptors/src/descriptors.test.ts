import { Network } from '@caravan/bitcoin';
import {
  KeyOrigin,
  MultisigWalletConfig,
  decodeDescriptors,
  encodeDescriptors,
  getChecksum,
  getWalletFromDescriptor,
} from "./descriptors";

const external =
  "sh(sortedmulti(2,[f57ec65d/45'/0'/100']xpub6CCHViYn5VzPfSR7baop9FtGcbm3UnqHwa54Z2eNvJnRFCJCdo9HtCYoLJKZCoATMLUowDDA1BMGfQGauY3fDYU3HyMzX4NDkoLYCSkLpbH/0/*,[efa5d916/45'/0'/100']xpub6Ca5CwTgRASgkXbXE5TeddTP9mPCbYHreCpmGt9dhz9y6femstHGCoFESHHKKRcm414xMKnuLjP9LDS7TwaJC9n5gxua6XB1rwPcC6hqDub/0/*))#uxj9xxul";
const internal =
  "sh(sortedmulti(2,[f57ec65d/45'/0'/100']xpub6CCHViYn5VzPfSR7baop9FtGcbm3UnqHwa54Z2eNvJnRFCJCdo9HtCYoLJKZCoATMLUowDDA1BMGfQGauY3fDYU3HyMzX4NDkoLYCSkLpbH/1/*,[efa5d916/45'/0'/100']xpub6Ca5CwTgRASgkXbXE5TeddTP9mPCbYHreCpmGt9dhz9y6femstHGCoFESHHKKRcm414xMKnuLjP9LDS7TwaJC9n5gxua6XB1rwPcC6hqDub/1/*))#3hxf9z66";

const expectedKeys = [
  {
    xfp: "f57ec65d",
    bip32Path: "m/45'/0'/100'",
    xpub: "xpub6CCHViYn5VzPfSR7baop9FtGcbm3UnqHwa54Z2eNvJnRFCJCdo9HtCYoLJKZCoATMLUowDDA1BMGfQGauY3fDYU3HyMzX4NDkoLYCSkLpbH",
  },
  {
    xfp: "efa5d916",
    bip32Path: "m/45'/0'/100'",
    xpub: "xpub6Ca5CwTgRASgkXbXE5TeddTP9mPCbYHreCpmGt9dhz9y6femstHGCoFESHHKKRcm414xMKnuLjP9LDS7TwaJC9n5gxua6XB1rwPcC6hqDub",
  },
];

const testConfig = (config: MultisigWalletConfig) => {
  expect(config.addressType).toEqual("P2SH");
  expect(config.requiredSigners).toEqual(2);
  const derivation1: KeyOrigin = config.keyOrigins[0];
  const derivation2: KeyOrigin = config.keyOrigins[1];
  expect(derivation1).toStrictEqual(expectedKeys[0]);
  expect(derivation2).toStrictEqual(expectedKeys[1]);
};

describe("decodeDescriptors", () => {
  it("works", async () => {
    const config = await decodeDescriptors(internal, external);
    testConfig(config);
  });

  it("should throw if called with inconsistent network", async () => {
    const testInternal =
      "sh(sortedmulti(2,[611d202e/45'/1'/11'/3]tpubDEcXYgwH59QbtaS1q7CNskaL23oXnePHiU5zQuVDTDbSfM2xx5WYKaqgpfKnjAzgrHymmA7rZYmgtLKpugFq4dWJEC6HPpeUrMjFprLx8fW/1/*,[3e191e15/0/0/0/0]tpubDEeGXbhQg9q8ch8RvufnqvK4FPTRxidayvdb4Z24eyGUBSHsEBhQ8jaGZ4acKUzfP3FgVChNEPB47KzMHJbaL2WzvQqijrFTbSUqoHvXuoE/1/*,[96cf6667/45'/1'/12'/2]tpubDEX9s9A6av9oHR89T9VArgrt4zg3zBGndMm6Q2LEaBiEF153K2yF2yewHWmfNicEUdBXzmaP7VBZvT5D3GG1m5cYy36qfsA9RQS1uYw3MGi/1/*))#j8hgkfxv";
    const testExternal =
      "sh(sortedmulti(2,[611d202e/45'/1'/11'/3]tpubDEcXYgwH59QbtaS1q7CNskaL23oXnePHiU5zQuVDTDbSfM2xx5WYKaqgpfKnjAzgrHymmA7rZYmgtLKpugFq4dWJEC6HPpeUrMjFprLx8fW/0/*,[3e191e15/0/0/0/0]tpubDEeGXbhQg9q8ch8RvufnqvK4FPTRxidayvdb4Z24eyGUBSHsEBhQ8jaGZ4acKUzfP3FgVChNEPB47KzMHJbaL2WzvQqijrFTbSUqoHvXuoE/0/*,[96cf6667/45'/1'/12'/2]tpubDEX9s9A6av9oHR89T9VArgrt4zg3zBGndMm6Q2LEaBiEF153K2yF2yewHWmfNicEUdBXzmaP7VBZvT5D3GG1m5cYy36qfsA9RQS1uYw3MGi/0/*))#medls6ae";

    // Jest's "expect...toThrowError" doesn't work for some reason here
    let passed = false;
    try {
      await decodeDescriptors(testInternal, testExternal, Network.MAINNET);
    } catch (e: any) {
      if (e instanceof Error) {
        passed = true;
        expect(e.message).toMatch("xpubs do not match expected network");
      }
    }
    expect(passed).toBeTruthy();
    passed = false;
    try {
      await decodeDescriptors(internal, external, Network.TESTNET);
    } catch (e: any) {
      if (e instanceof Error) {
        passed = true;
        expect(e.message).toMatch("xpubs do not match expected network");
      }
    }
    expect(passed).toBeTruthy();
  });
});

describe("encodeDescriptors", () => {
  it("should convert a config to descriptors", async () => {
    const config = {
      addressType: "P2SH",
      keyOrigins: expectedKeys,
      requiredSigners: 2,
      network: "mainnet",
    } as MultisigWalletConfig;
    const actual = await encodeDescriptors(config);
    expect(actual.receive).toEqual(external);
    expect(actual.change).toEqual(internal);
  });
});

describe("getWalletFromDescriptor", () => {
  it("should convert a receive descriptor to a wallet", async () => {
    const config = await getWalletFromDescriptor(external);
    testConfig(config);
  });
  it("should convert a change descriptor to a wallet", async () => {
    const config = await getWalletFromDescriptor(internal);
    testConfig(config);
  });
  it("should fail if passed with inconsistent network", async () => {
    let passed = false;
    try {
      await getWalletFromDescriptor(internal, Network.TESTNET);
    } catch (e: any) {
      if (e instanceof Error) {
        passed = true;
        expect(e.message).toMatch("xpubs do not match expected network");
      }
    }
    expect(passed).toBeTruthy();
  });
});

describe("getChecksum", () => {
  it("should return correct checksum", async () => {
    const internalChecksum = await getChecksum(internal);
    expect(internalChecksum).toEqual("3hxf9z66");
    const externalChecksum = await getChecksum(external);
    expect(externalChecksum).toEqual("uxj9xxul");
  });

  it("should throw if invalid or missing checksum", async () => {
    let passed = false;
    const invalids = [
      internal.split("#")[0],
      internal.concat("asdf"),
      internal.split("#")[0].concat("#123"),
      internal.split("#")[0].concat("#1234abcd"),
    ];
    for (const test of invalids) {
      try {
        await getChecksum(test);
      } catch (e: any) {
        if (e instanceof Error) {
          passed = true;
        }
      }
      expect(passed).toBeTruthy();
    }
  });
});
