import { Network } from "@caravan/bitcoin";
import { BCURDecoder2 } from "./bcur2";
import { CryptoHDKey, CryptoAccount } from "@keystonehq/bc-ur-registry";
import { URProcessor } from "./vendor/bcur2/process";

// Mock the vendor URProcessor
jest.mock("./vendor/bcur2/process");

describe("BCURDecoder2", () => {
  let decoder: BCURDecoder2;

  let mockProcessorInstance: {
    handlePart: jest.Mock;
    isComplete: jest.Mock;
    getResult: jest.Mock;
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (URProcessor as jest.Mock).mockClear();
    
    // Set up mock processor instance
    mockProcessorInstance = {
      handlePart: jest.fn(),
      isComplete: jest.fn(),
      getResult: jest.fn()
    };
    
    // Set up mock implementation
    (URProcessor as jest.Mock).mockImplementation(() => mockProcessorInstance);
    
    // Create decoder after mock is set up
    decoder = new BCURDecoder2();
  });

  describe("constructor", () => {
    it("should create instance with default network", () => {
      expect(URProcessor).toHaveBeenCalledWith(Network.MAINNET);
    });

    it("should create instance with specified network", () => {
      decoder = new BCURDecoder2(Network.TESTNET);
      expect(URProcessor).toHaveBeenCalledWith(Network.TESTNET);
    });
  });

  describe("reset", () => {
    it("should reset decoder state", () => {
      decoder.reset();
      expect(URProcessor).toHaveBeenCalledTimes(2); // Once in constructor, once in reset
      expect(decoder.getProgress()).toBe("Idle");
      expect(decoder.getError()).toBeNull();
    });
  });

  describe("receivePart", () => {
    beforeEach(() => {
      mockProcessorInstance.handlePart.mockReset();
      mockProcessorInstance.isComplete.mockReset();
      mockProcessorInstance.getResult.mockReset();
    });

    it("should process valid UR part", () => {
      // Mock handlePart to return a progress object
      mockProcessorInstance.handlePart.mockReturnValue({ progress: 0.5 });
      mockProcessorInstance.isComplete.mockReturnValue(false);
      mockProcessorInstance.getResult.mockReturnValue(null);

      // Use a valid UR QR part with proper CBOR encoding for crypto account
      const validUrPart = "UR:CRYPTO-ACCOUNT/1-2/LPADAXCRAONNTKYEAELFPRZTSGFNYTEEETBDPKIAEMDYNOEADUOFXGTEESSPKRPPKRKLOGHTEECVDIMEHPMGERFHHLDPKYNDESGEYLRFKQ";
      
      decoder.receivePart(validUrPart);
      
      expect(mockProcessorInstance.handlePart).toHaveBeenCalledWith(validUrPart);
      expect(decoder.getProgress()).toBe("Processing QR parts: 50%");
      expect(decoder.getError()).toBeNull();
    });

    it("should handle completion", () => {
      const validFinalPart = "UR:CRYPTO-ACCOUNT/2-2/LPAOAXCRAONNTKYEAELFPRZTSGFNYTEEETBDPKIAEMDYNOEADUOFXGTEESSPKRPPKRKLOGHTEECVDIMEHPMGERFHHLDPKYNDESKSFLWM";
      
      mockProcessorInstance.handlePart.mockReturnValue({ progress: 1.0 });
      mockProcessorInstance.isComplete.mockReturnValue(true);
      mockProcessorInstance.getResult.mockReturnValue({
        type: "crypto-account",
        data: {
          masterFingerprint: "f57ec65d",
          xpub: "tpubDDQubdBx9cbwQtdcRTisKF7wVCwHgHewhU7wh77VzCi62Q9q81qyQeLoZjKWZ62FnQbWU8k7CuKo2A21pAWaFtPGDHP9WuhtAx4smcCxqn1",
          path: "m/45'/1'/100'"
        }
      });

      decoder.receivePart(validFinalPart);
      
      expect(decoder.getProgress()).toBe("Complete");
      expect(decoder.getError()).toBeNull();
    });

    it("should handle invalid UR format", () => {
      decoder.receivePart("INVALID-FORMAT");
      
      expect(decoder.getError()).toBe("Invalid QR format: Must start with UR:");
      expect(mockProcessorInstance.handlePart).not.toHaveBeenCalled();
    });

    it("should handle processing errors", () => {
      mockProcessorInstance.handlePart.mockImplementation(() => {
        throw new Error("Processing failed");
      });

      decoder.receivePart("UR:CRYPTO-ACCOUNT/PART");
      
      expect(decoder.getError()).toBe("Processing failed");
    });
  });

  describe("getDecodedData", () => {
    beforeEach(() => {
      mockProcessorInstance.isComplete.mockReset();
      mockProcessorInstance.getResult.mockReset();
    });

    it("should return null when not complete", () => {
      mockProcessorInstance.isComplete.mockReturnValue(false);
      
      const result = decoder.getDecodedData();
      
      expect(result).toBeNull();
      expect(mockProcessorInstance.getResult).not.toHaveBeenCalled();
    });

    it("should decode crypto-account data", () => {
      mockProcessorInstance.isComplete.mockReturnValue(true);
      mockProcessorInstance.getResult.mockReturnValue({
        type: "crypto-account",
        xpub: "xpub...",
        xfp: "A1B2C3D4",
        path: "m/84'/0'/0'"
      });

      const result = decoder.getDecodedData();
      
      expect(result).toEqual({
        type: "crypto-account",
        xpub: "xpub...",
        xfp: "A1B2C3D4",
        path: "m/84'/0'/0'"
      });
    });

    it("should decode crypto-hdkey data", () => {
      mockProcessorInstance.isComplete.mockReturnValue(true);
      mockProcessorInstance.getResult.mockReturnValue({
        type: "crypto-hdkey",
        xpub: "xpub...",
        xfp: "A1B2C3D4",
        path: "m/84'/0'/0'"
      });

      const result = decoder.getDecodedData();
      
      expect(result).toEqual({
        type: "crypto-hdkey",
        xpub: "xpub...",
        xfp: "A1B2C3D4",
        path: "m/84'/0'/0'"
      });
    });

    it("should handle decoding errors", () => {
      mockProcessorInstance.isComplete.mockReturnValue(true);
      mockProcessorInstance.getResult.mockImplementation(() => {
        throw new Error("Decoding failed");
      });

      const result = decoder.getDecodedData();
      
      expect(result).toBeNull();
      expect(decoder.getError()).toBe("Decoding failed");
    });
  });

  describe("status methods", () => {
    beforeEach(() => {
      mockProcessorInstance.isComplete.mockReset();
    });

    describe("isComplete", () => {
      it("should return true when processor is complete", () => {
        mockProcessorInstance.isComplete.mockReturnValue(true);
        expect(decoder.isComplete()).toBe(true);
      });

      it("should return true when there is an error", () => {
        mockProcessorInstance.isComplete.mockReturnValue(false);
        decoder.receivePart("INVALID");  // This creates an error
        expect(decoder.isComplete()).toBe(true);
      });

      it("should return false when not complete and no error", () => {
        mockProcessorInstance.isComplete.mockReturnValue(false);
        expect(decoder.isComplete()).toBe(false);
      });
    });

    describe("getProgress", () => {
      it("should return current progress string", () => {
        const mockProgress = "Processing QR parts: 75%";
        decoder["progress"] = mockProgress;
        expect(decoder.getProgress()).toBe(mockProgress);
      });
    });

    describe("getError", () => {
      it("should return null when no error", () => {
        expect(decoder.getError()).toBeNull();
      });

      it("should return error message when error exists", () => {
        const errorMessage = "Test error";
        decoder["error"] = errorMessage;
        expect(decoder.getError()).toBe(errorMessage);
      });
    });
  });
});
