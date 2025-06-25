import { Network } from "@caravan/bitcoin";
import { UR } from "@ngraveio/bc-ur";
import { URRegistryDecoder } from "@keystonehq/bc-ur-registry";
import { BCURDecoder2 } from "../decoder";

import { vi, beforeEach, describe, it, expect } from 'vitest';

// Mock implementation for decoder instance
const mockDecoderInstance = {
  receivePart: vi.fn(),
  isComplete: vi.fn().mockReturnValue(false),
  resultUR: vi.fn(),
  getProgress: vi.fn().mockReturnValue(0)
};

// Mock implementation of URRegistryDecoder class
vi.mock("@keystonehq/bc-ur-registry", () => ({
  URRegistryDecoder: vi.fn().mockImplementation(() => mockDecoderInstance)
}));

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
      mockDecoderInstance.receivePart.mockImplementation(() => undefined);
      
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
      
      decoder.receivePart(urText);
      expect(decoder.getProgress()).toBe("Processing QR parts: 50%");
    });

    it("should update progress when complete", () => {
      const urText = "UR:CRYPTO-ACCOUNT/TEST";
      mockDecoderInstance.isComplete.mockReturnValue(true);
      mockDecoderInstance.getProgress.mockReturnValue(1);
      
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
        type: "crypto-account"
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
        type: "crypto-hdkey"
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
      mockDecoderInstance.receivePart.mockImplementation(() => undefined);
      mockDecoderInstance.getProgress.mockReturnValue(0.5);
      decoder.receivePart("UR:CRYPTO-ACCOUNT/TEST");
      
      decoder.reset();
      
      expect(decoder.getProgress()).toBe("Idle");
      expect(decoder.getError()).toBeNull();
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
