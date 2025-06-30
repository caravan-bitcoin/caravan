import { Network } from "@caravan/bitcoin";
import { CryptoAccount, CryptoHDKey } from "@keystonehq/bc-ur-registry";

import { processCryptoAccountCBOR, processCryptoHDKeyCBOR } from "../utils";

// Valid compressed public key for testing
const testKey = Buffer.from(
  "0279BE667EF9DCBBAC55A06295CE870B07029BFCDB2DCE28D959F2815B16F81798",
  "hex"
);
const testChain = Buffer.from(
  "000102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f",
  "hex"
);

// Mock the bc-ur-registry module
vi.mock("@keystonehq/bc-ur-registry", () => {
  class MockComponent {
    isHardened() {
      return true;
    }

    getIndex() {
      return 0;
    }
  }

  class MockOrigin {
    getPath() {
      return "m/45'/1'/0'";
    }

    getSourceFingerprint() {
      return Buffer.from("F57EC65D", "hex");
    }

    getComponents() {
      return [new MockComponent()];
    }
  }

  class MockCryptoHDKey {
    getKey() {
      return testKey;
    }

    getChainCode() {
      return testChain;
    }

    getParentFingerprint() {
      return Buffer.from("F57EC65D", "hex");
    }

    getOrigin() {
      return new MockOrigin();
    }
  }

  // Make the mock constructor function that returns instances of MockCryptoHDKey
  const MockCryptoHDKeyConstructor = function MockCryptoHDKeyConstructor() {
    return new MockCryptoHDKey();
  } as any;
  MockCryptoHDKeyConstructor.fromCBOR = vi.fn().mockReturnValue(new MockCryptoHDKey());
  
  // Set the prototype so instanceof works
  MockCryptoHDKeyConstructor.prototype = MockCryptoHDKey.prototype;

  // Create an instance that will be returned by getCryptoKey - must be created after setting up the constructor
  const mockHDKey = new MockCryptoHDKey();
  // Set the prototype chain to make instanceof work
  Reflect.setPrototypeOf(mockHDKey, MockCryptoHDKeyConstructor.prototype);

  const mockOutputDescriptor = {
    getCryptoKey: vi.fn().mockReturnValue(mockHDKey),
  };

  const mockAccount = {
    getOutputDescriptors: vi.fn().mockReturnValue([mockOutputDescriptor]),
    masterFingerprint: Buffer.from("F57EC65D", "hex"),
    outputDescriptors: [mockOutputDescriptor],
  };

  return {
    CryptoAccount: {
      fromCBOR: vi.fn().mockReturnValue(mockAccount),
    },
    CryptoHDKey: MockCryptoHDKeyConstructor,
  };
});

vi.mock("@caravan/bitcoin", () => {
  return {
    Network: {
      TESTNET: "testnet",
      MAINNET: "mainnet",
    },
    ExtendedPublicKey: vi.fn().mockImplementation(({ network }) => ({
      toBase58: () =>
        (network === "testnet" ? "tpubMockedKey" : "xpubMockedKey"),
    })),
  };
});

describe("BCUR2 Utils", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("processCryptoAccountCBOR", () => {
    it("should process valid crypto-account CBOR data for testnet", () => {
      const result = processCryptoAccountCBOR(Buffer.from("test"), Network.TESTNET);

      expect(result).toMatchObject({
        type: "crypto-account",
        bip32Path: "m/45'/1'/0'",
        rootFingerprint: "F57EC65D"
      });
      expect(result.xpub).toMatch(/^tpub/); // Testnet xpub should start with tpub
    });

    it("should process valid crypto-account CBOR data for mainnet", () => {
      const result = processCryptoAccountCBOR(Buffer.from("test"), Network.MAINNET);

      expect(result).toMatchObject({
        type: "crypto-account",
        bip32Path: "m/45'/1'/0'",
        rootFingerprint: "F57EC65D"
      });
      expect(result.xpub).toMatch(/^xpub/); // Mainnet xpub should start with xpub
    });

    it("should throw error if no output descriptors", () => {
      const mockAccountNoDescriptors = {
        getOutputDescriptors: vi.fn().mockReturnValue([]),
        masterFingerprint: Buffer.from('F57EC65D', 'hex'),
        outputDescriptors: []
      };
      
      vi.mocked(CryptoAccount.fromCBOR).mockReturnValueOnce(mockAccountNoDescriptors as any);

      expect(() => {
        processCryptoAccountCBOR(Buffer.from("test"), Network.TESTNET);
      }).toThrow("No output descriptors found");
    });
  });

  describe("processCryptoHDKeyCBOR", () => {
    it("should process valid crypto-hdkey CBOR data for testnet", () => {
      const result = processCryptoHDKeyCBOR(Buffer.from("test"), Network.TESTNET);

      expect(result).toMatchObject({
        type: "crypto-hdkey",
        bip32Path: "m/45'/1'/0'",
        rootFingerprint: "F57EC65D",
      });
      expect(result.xpub).toMatch(/^tpub/); // Testnet xpub should start with tpub
    });

    it("should process valid crypto-hdkey CBOR data for mainnet", () => {
      const result = processCryptoHDKeyCBOR(Buffer.from("test"), Network.MAINNET);

      expect(result).toMatchObject({
        type: "crypto-hdkey",
        bip32Path: "m/45'/1'/0'",
        rootFingerprint: "F57EC65D",
      });
      expect(result.xpub).toMatch(/^xpub/); // Mainnet xpub should start with xpub
    });

    it("should handle missing origin data", () => {
      const mockHDKeyNoOrigin = {
        getKey: () => testKey,
        getChainCode: () => testChain,
        getParentFingerprint: () => Buffer.from("F57EC65D", "hex"),
        getOrigin: vi.fn().mockReturnValue(null)
      };

      vi.mocked(CryptoHDKey.fromCBOR).mockReturnValueOnce(mockHDKeyNoOrigin as any);

      const result = processCryptoHDKeyCBOR(Buffer.from("test"), Network.TESTNET);
      expect(result.type).toBe("crypto-hdkey");
      expect(result.bip32Path).toBeUndefined();
      expect(result.rootFingerprint).toBeUndefined();

      expect(result.xpub).toMatch(/^tpub/); // Should still generate xpub
    });
  });
});
