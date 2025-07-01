import { Network } from "@caravan/bitcoin";
import { UR } from "@ngraveio/bc-ur";

import { BCURDecoder2 } from "../decoder";


// Mock implementation for decoder instance
const mockDecoderInstance = {
  receivePart: vi.fn(),
  isComplete: vi.fn().mockReturnValue(false),
  resultUR: vi.fn(),
  getProgress: vi.fn().mockReturnValue(0)
};

// Mock the bc-ur-registry module
vi.mock("@keystonehq/bc-ur-registry", () => {
  // Valid compressed public key for testing
  const testKey = Buffer.from('0279BE667EF9DCBBAC55A06295CE870B07029BFCDB2DCE28D959F2815B16F81798', 'hex');
  const testChain = Buffer.from('000102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f', 'hex');

  // Create HDKey mock class
  class MockCryptoHDKey {
    getKey() { return testKey; }

    getChainCode() { return testChain; }

    getParentFingerprint() { return Buffer.from('F57EC65D', 'hex'); }

    getOrigin() {
      return {
        getPath: () => "m/45'/1'/0'",
        getSourceFingerprint: () => Buffer.from('F57EC65D', 'hex'),
        getComponents: () => [{
          isHardened: () => true,
          getIndex: () => 0
        }]
      };
    }
  }

  // Create mock implementations
  const mockHDKey = new MockCryptoHDKey();
  const mockOutputDescriptor = {
    getCryptoKey: vi.fn().mockReturnValue(mockHDKey)
  };

  const mockAccount = {
    getOutputDescriptors: vi.fn().mockReturnValue([mockOutputDescriptor]),
    masterFingerprint: Buffer.from('F57EC65D', 'hex'),
    outputDescriptors: [mockOutputDescriptor]
  };

  // Create proper constructor functions for instanceof checks
  const MockCryptoHDKeyConstructor = function MockCryptoHDKeyConstructor() {
    return new MockCryptoHDKey();
  } as any;
  MockCryptoHDKeyConstructor.fromCBOR = vi.fn().mockReturnValue(mockHDKey);
  MockCryptoHDKeyConstructor.prototype = MockCryptoHDKey.prototype;
  
  // Make the mockHDKey an instance of the constructor
  Reflect.setPrototypeOf(mockHDKey, MockCryptoHDKeyConstructor.prototype);

  return {
    URRegistryDecoder: vi.fn().mockImplementation(() => mockDecoderInstance),
    CryptoAccount: {
      fromCBOR: vi.fn().mockReturnValue(mockAccount)
    },
    CryptoHDKey: MockCryptoHDKeyConstructor
  };
});

describe("BCURDecoder2", () => {
  let decoder: BCURDecoder2;

  beforeEach(() => {
    vi.clearAllMocks();
    mockDecoderInstance.isComplete.mockReturnValue(false);
    mockDecoderInstance.getProgress.mockReturnValue(0);
    decoder = new BCURDecoder2();
  });

  describe("receivePart", () => {
    it("should process valid UR text", () => {
      const urText = "UR:CRYPTO-ACCOUNT/TEST";
      decoder.receivePart(urText);
      expect(mockDecoderInstance.receivePart).toHaveBeenCalledWith(urText);
      expect(decoder.getError()).toBeNull();
    });

    it("should set error for invalid UR text", () => {
      const invalidText = "NOT-A-UR-CODE";
      decoder.receivePart(invalidText);
      expect(mockDecoderInstance.receivePart).not.toHaveBeenCalled();
      expect(decoder.getError()).toBe("Invalid QR format: Must start with UR:");
    });

    it("should handle decoder errors", () => {
      const urText = "UR:CRYPTO-ACCOUNT/TEST";
      mockDecoderInstance.receivePart.mockImplementation(() => {
        throw new Error("Decoder error");
      });

      decoder.receivePart(urText);
      expect(decoder.getError()).toContain("Decoder error");
    });

    it("should update progress when not complete", () => {
      const urText = "UR:CRYPTO-ACCOUNT/TEST";
      mockDecoderInstance.isComplete.mockReturnValue(false);
      mockDecoderInstance.getProgress.mockReturnValue(0.5);
      mockDecoderInstance.receivePart.mockImplementation(() => null);
      
      decoder.receivePart(urText);
      expect(decoder.getProgress()).toBe("Processing QR parts: 50%");
    });

    it("should update progress when complete", () => {
      const urText = "UR:CRYPTO-ACCOUNT/TEST";
      mockDecoderInstance.isComplete.mockReturnValue(true);
      mockDecoderInstance.getProgress.mockReturnValue(1);
      mockDecoderInstance.receivePart.mockImplementation(() => null);
      
      decoder.receivePart(urText);
      expect(decoder.getProgress()).toBe("Complete");
    });
  });

  describe("getDecodedData", () => {
    it("should return null if decoder is not complete", () => {
      mockDecoderInstance.isComplete.mockReturnValue(false);
      const result = decoder.getDecodedData(Network.TESTNET);
      expect(result).toBeNull();
    });

    it("should process crypto-account data", () => {
      mockDecoderInstance.isComplete.mockReturnValue(true);
      const mockUR = {
        type: "crypto-account",
        cbor: Buffer.from([1, 2, 3, 4])
      } as unknown as UR;
      mockDecoderInstance.resultUR.mockReturnValue(mockUR);

      const result = decoder.getDecodedData(Network.TESTNET);
      expect(result).toMatchObject({
        type: "crypto-account",
        xpub: expect.any(String),
        rootFingerprint: expect.any(String),
        bip32Path: expect.any(String)
      });
    });

    it("should process crypto-hdkey data", () => {
      mockDecoderInstance.isComplete.mockReturnValue(true);
      const mockUR = {
        type: "crypto-hdkey",
        cbor: Buffer.from([1, 2, 3, 4])
      } as unknown as UR;
      mockDecoderInstance.resultUR.mockReturnValue(mockUR);

      const result = decoder.getDecodedData(Network.TESTNET);
      expect(result).toMatchObject({
        type: "crypto-hdkey",
        xpub: expect.any(String),
        rootFingerprint: expect.any(String),
        bip32Path: expect.any(String)
      });
    });

    it("should handle unsupported UR types", () => {
      mockDecoderInstance.isComplete.mockReturnValue(true);
      const mockUR = {
        type: "unsupported-type",
        cbor: Buffer.from([1, 2, 3, 4])
      } as unknown as UR;
      mockDecoderInstance.resultUR.mockReturnValue(mockUR);

      decoder.getDecodedData(Network.TESTNET);
      expect(decoder.getError()).toBe("Unsupported UR type: unsupported-type");
    });

    it("should handle decoder errors", () => {
      mockDecoderInstance.isComplete.mockReturnValue(true);
      mockDecoderInstance.resultUR.mockImplementation(() => {
        throw new Error("Decoder error");
      });

      const result = decoder.getDecodedData(Network.TESTNET);
      expect(result).toBeNull();
      expect(decoder.getError()).toContain("Decoder error");
    });
  });

  describe("reset", () => {
    it("should reset decoder state", () => {
      decoder.receivePart("INVALID");
      expect(decoder.getError()).not.toBeNull();
      
      decoder.reset();
      expect(decoder.getError()).toBeNull();
      expect(decoder.getProgress()).toBe("Idle");
      expect(decoder.isComplete()).toBe(false);
    });
  });

  describe("isComplete", () => {
    it("should return true when decoder is complete", () => {
      mockDecoderInstance.isComplete.mockReturnValue(true);
      expect(decoder.isComplete()).toBe(true);
    });

    it("should return true when there is an error", () => {
      decoder.receivePart("NOT-A-UR-CODE");
      expect(decoder.isComplete()).toBe(true);
    });

    it("should return false when not complete and no error", () => {
      mockDecoderInstance.isComplete.mockReturnValue(false);
      expect(decoder.isComplete()).toBe(false);
    });
  });
});
