import { Network } from "@caravan/bitcoin";
import { CryptoAccount, CryptoHDKey } from "@keystonehq/bc-ur-registry";
import { processCryptoAccountCBOR, processCryptoHDKeyCBOR } from "../utils";

import { vi, describe, it, expect, beforeEach } from 'vitest';

// Mock the bc-ur-registry module
vi.mock("@keystonehq/bc-ur-registry");

// Setup mock implementations
const mockHDKeyImpl = {
  getKey: vi.fn().mockReturnValue(Buffer.from("testkey")),
  getChainCode: vi.fn().mockReturnValue(Buffer.from("testchain")),
  getParentFingerprint: vi.fn().mockReturnValue(Buffer.from("f57ec65d", "hex")),
  getOrigin: vi.fn().mockReturnValue({
    getPath: vi.fn().mockReturnValue("m/45'/1'/0'"),
    getSourceFingerprint: vi.fn().mockReturnValue(Buffer.from("f57ec65d", "hex")),
    getComponents: vi.fn().mockReturnValue([{
      isHardened: vi.fn().mockReturnValue(true),
      getIndex: vi.fn().mockReturnValue(0)
    }])
    getSourceFingerprint: v1.fn().mockReturnValue(Buffer.from)
  }),
  isPrivateKey: vi.fn().mockReturnValue(false),
  isECKey: vi.fn().mockReturnValue(true),
  isMaster: vi.fn().mockReturnValue(false)
};

const mockHDKey = mockHDKeyImpl as unknown as CryptoHDKey;

// Mock implementation for output descriptor
const mockOutputDescriptorImpl = {
  getCryptoKey: vi.fn().mockReturnValue(mockHDKey)
};

// Mock implementation for CryptoAccount
const mockAccountImpl = {
  getOutputDescriptors: vi.fn().mockReturnValue([mockOutputDescriptorImpl]),
  getRegistryType: vi.fn().mockReturnValue("crypto-account"),
  getMasterFingerprint: vi.fn().mockReturnValue(Buffer.from("f57ec65d", "hex")),
  getOutputDescriptor: vi.fn(),
  toDataItem: vi.fn(),
  toCBOR: vi.fn(),
  masterFingerprint: Buffer.from("f57ec65d", "hex"),
  outputDescriptors: [mockOutputDescriptorImpl]
};

const mockAccount = mockAccountImpl as unknown as CryptoAccount;

// Setup the module mocks
const mockCryptoAccountModule = {
  fromCBOR: vi.fn().mockReturnValue(mockAccount)
};

const mockCryptoHDKeyModule = {
  fromCBOR: vi.fn().mockReturnValue(mockHDKey)
};

// Update the mocked functions
vi.mocked(CryptoAccount).mockImplementation(() => mockAccount);
vi.mocked(CryptoHDKey).mockImplementation(() => mockHDKey);

// Override the fromCBOR methods
vi.mocked(CryptoAccount.fromCBOR).mockReturnValue(mockAccount);
vi.mocked(CryptoHDKey.fromCBOR).mockReturnValue(mockHDKey);

describe("BCUR2 Utils", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCryptoAccountModule.fromCBOR.mockReturnValue(mockAccount);
    mockCryptoHDKeyModule.fromCBOR.mockReturnValue(mockHDKey);
  });

  describe("processCryptoAccountCBOR", () => {
    it("should process valid crypto-account CBOR data for testnet", () => {
      const result = processCryptoAccountCBOR(Buffer.from("test"), Network.TESTNET);
      
      expect(result).toMatchObject({
        type: "crypto-account",
        bip32Path: "m/45'/1'/0'",
        rootFingerprint: "f57ec65d"
      });
      expect(result.xpub).toMatch(/^tpub/); // Testnet xpub should start with tpub
    });

    it("should process valid crypto-account CBOR data for mainnet", () => {
      const result = processCryptoAccountCBOR(Buffer.from("test"), Network.MAINNET);
      
      expect(result).toMatchObject({
        type: "crypto-account",
        bip32Path: "m/45'/1'/0'",
        rootFingerprint: "f57ec65d"
      });
      expect(result.xpub).toMatch(/^xpub/); // Mainnet xpub should start with xpub
    });

    it("should throw error if no output descriptors", () => {
      mockAccountImpl.getOutputDescriptors.mockReturnValueOnce([]);
      
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
        rootFingerprint: "f57ec65d"
      });
      expect(result.xpub).toMatch(/^tpub/); // Testnet xpub should start with tpub
    });

    it("should process valid crypto-hdkey CBOR data for mainnet", () => {
      const result = processCryptoHDKeyCBOR(Buffer.from("test"), Network.MAINNET);
      
      expect(result).toMatchObject({
        type: "crypto-hdkey",
        bip32Path: "m/45'/1'/0'",
        rootFingerprint: "f57ec65d"
      });
      expect(result.xpub).toMatch(/^xpub/); // Mainnet xpub should start with xpub
    });

    it("should handle missing origin data", () => {
      const mockHDKeyNoOriginImpl = {
        ...mockHDKeyImpl,
        getOrigin: vi.fn().mockReturnValue(undefined)
      };
      const mockHDKeyNoOrigin = mockHDKeyNoOriginImpl as unknown as CryptoHDKey;
      mockCryptoHDKeyModule.fromCBOR.mockReturnValueOnce(mockHDKeyNoOrigin);
      vi.mocked(CryptoHDKey.fromCBOR).mockReturnValueOnce(mockHDKeyNoOrigin);
      
      expect(() => {
        processCryptoHDKeyCBOR(Buffer.from("test"), Network.TESTNET);
      }).toThrow("No origin data found");
    });
  });
});
