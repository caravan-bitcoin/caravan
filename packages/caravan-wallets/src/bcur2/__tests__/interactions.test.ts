import { Network } from "@caravan/bitcoin";
import { mockDeep, MockProxy } from "vitest-mock-extended";

import { ExtendedPublicKeyData, BCUR2Decoder } from "../decoder";
import { BCUR2Encoder } from "../encoder";
import {
  BCUR2Interaction,
  BCUR2ExportExtendedPublicKey,
  BCUR2EncodeTransaction,
  BCUR2SignMultisigTransaction,
} from "../interactions";

// Mock parseSignaturesFromPSBT globally to prevent PSBT parsing errors
vi.mock("@caravan/bitcoin", async () => ({
  ...(await vi.importActual("@caravan/bitcoin")),
  parseSignaturesFromPSBT: vi.fn().mockReturnValue({
    "03abc123...": ["signature1", "signature2"], // Non-empty signature array
    "03def456...": [], // Empty signature array
  }),
}));

// Mock the encoder
vi.mock("../encoder", () => ({
  BCUR2Encoder: vi.fn().mockImplementation(() => ({
    encodePSBT: vi.fn().mockReturnValue(["frame1", "frame2", "frame3"]),
    estimateFragmentCount: vi.fn().mockReturnValue(3),
    data: "",
    maxFragmentLength: 100,
  })),
}));

describe("BCUR2 Interactions", () => {
  let mockDecoder: MockProxy<BCUR2Decoder>;
  let mockEncoder: MockProxy<BCUR2Encoder>;
  const mockPSBT = "cHNidP8BAHcCAAAAAe7V..."; // Base64 PSBT

  beforeEach(() => {
    mockDecoder = mockDeep<BCUR2Decoder>();
    mockEncoder = mockDeep<BCUR2Encoder>();
    vi.clearAllMocks();
  });

  describe("BCUR2Interaction (Base Class)", () => {
    it("should create with default parameters", () => {
      const interaction = new BCUR2Interaction();

      expect(interaction.getProgress()).toBeDefined();
      expect(interaction.isComplete()).toBe(false);
      expect(interaction.getError()).toBeNull();
    });

    it("should create with custom network and decoder", () => {
      const interaction = new BCUR2Interaction(Network.TESTNET, mockDecoder);

      expect(interaction).toBeDefined();
    });

    it("should have correct messages", () => {
      const interaction = new BCUR2Interaction();
      const messages = interaction.messages();

      expect(messages).toContainEqual({
        state: "active",
        level: "info",
        code: "bcur2.scanning",
        text: "Scan QR code sequence now.",
      });
    });

    it("should delegate methods to decoder", () => {
      mockDecoder.isComplete.mockReturnValue(true);
      mockDecoder.getProgress.mockReturnValue("2 of 3");
      mockDecoder.getError.mockReturnValue("Test error");

      const interaction = new BCUR2Interaction(Network.MAINNET, mockDecoder);

      expect(interaction.isComplete()).toBe(true);
      expect(interaction.getProgress()).toBe("2 of 3");
      expect(interaction.getError()).toBe("Test error");
    });

    it("should reset decoder", () => {
      const interaction = new BCUR2Interaction(Network.MAINNET, mockDecoder);
      interaction.reset();

      expect(mockDecoder.reset).toHaveBeenCalled();
    });
  });

  describe("BCUR2ExportExtendedPublicKey", () => {
    const mockExtendedKeyData: ExtendedPublicKeyData = {
      type: "xpub",
      xpub: "xpub6D2fK1fKRPCYECJPn4YfEbyyXXvFj7kU7vKAG8Aa5YsHGYGnYQd1e2yKjtKkWiGW4Lv1sGVPFwQ",
      bip32Path: "m/48'/0'/0'/2'",
      rootFingerprint: "F57EC65D",
    };

    it("should create with required parameters", () => {
      const interaction = new BCUR2ExportExtendedPublicKey({
        bip32Path: "m/48'/0'/0'/2'",
        network: Network.TESTNET,
        decoder: mockDecoder,
      });

      expect(interaction).toBeDefined();
      expect(interaction.workflow).toEqual(["request", "parse"]);
    });

    it("should return correct request data", () => {
      const bip32Path = "m/48'/0'/0'/2'";
      const interaction = new BCUR2ExportExtendedPublicKey({
        bip32Path,
        decoder: mockDecoder,
      });

      const request = interaction.request();

      expect(request).toEqual({
        instruction: `Please display your QR code for ${bip32Path}`,
        bip32Path,
      });
    });

    it("should have appropriate messages", () => {
      const bip32Path = "m/48'/0'/0'/2'";
      const interaction = new BCUR2ExportExtendedPublicKey({
        bip32Path,
        decoder: mockDecoder,
      });

      const messages = interaction.messages();

      expect(messages).toContainEqual({
        state: "pending",
        level: "info",
        code: "bcur2.display_qr",
        text: `Display the QR code for path: ${bip32Path}`,
      });

      expect(messages).toContainEqual({
        state: "pending",
        level: "info",
        code: "bcur2.scan_qr",
        text: "Scan the QR code sequence from your device",
      });
    });

    it("should parse UR data successfully when complete", () => {
      mockDecoder.isComplete.mockReturnValue(true);
      mockDecoder.getDecodedData.mockReturnValue(mockExtendedKeyData);

      const interaction = new BCUR2ExportExtendedPublicKey({
        bip32Path: "m/48'/0'/0'/2'",
        decoder: mockDecoder,
      });

      const result = interaction.parse("UR:CRYPTO-ACCOUNT/test-data");

      expect(mockDecoder.receivePart).toHaveBeenCalledWith(
        "UR:CRYPTO-ACCOUNT/test-data"
      );
      expect(result).toEqual(mockExtendedKeyData);
    });

    it("should return null when parsing incomplete data", () => {
      mockDecoder.isComplete.mockReturnValue(false);

      const interaction = new BCUR2ExportExtendedPublicKey({
        bip32Path: "m/48'/0'/0'/2'",
        decoder: mockDecoder,
      });

      const result = interaction.parse("UR:CRYPTO-ACCOUNT/partial-data");

      expect(result).toBeNull();
    });

    it("should throw error for empty UR data", () => {
      const interaction = new BCUR2ExportExtendedPublicKey({
        bip32Path: "m/48'/0'/0'/2'",
        decoder: mockDecoder,
      });

      expect(() => interaction.parse("")).toThrow("No QR code data received.");
    });

    it("should throw error when decoder fails", () => {
      mockDecoder.receivePart.mockImplementation(() => {
        throw new Error("Decoder error");
      });

      const interaction = new BCUR2ExportExtendedPublicKey({
        bip32Path: "m/48'/0'/0'/2'",
        decoder: mockDecoder,
      });

      expect(() => interaction.parse("UR:CRYPTO-ACCOUNT/bad-data")).toThrow(
        "Error parsing BCUR2 data: Decoder error"
      );
    });

    it("should get decoded data after completion", () => {
      mockDecoder.isComplete.mockReturnValue(true);
      mockDecoder.getDecodedData.mockReturnValue(mockExtendedKeyData);

      const interaction = new BCUR2ExportExtendedPublicKey({
        bip32Path: "m/48'/0'/0'/2'",
        decoder: mockDecoder,
      });

      const result = interaction.getDecodedData();

      expect(result).toEqual(mockExtendedKeyData);
    });
  });

  describe("BCUR2EncodeTransaction", () => {
    it("should create with required parameters", () => {
      const interaction = new BCUR2EncodeTransaction({
        psbt: mockPSBT,
        network: Network.TESTNET,
        decoder: mockDecoder,
      });

      expect(interaction).toBeDefined();
    });

    it("should create with custom parameters", () => {
      const customEncoderFactory = vi.fn().mockReturnValue(mockEncoder);

      const interaction = new BCUR2EncodeTransaction({
        psbt: mockPSBT,
        network: Network.MAINNET,
        maxFragmentLength: 200,
        decoder: mockDecoder,
        encoderFactory: customEncoderFactory,
      });

      expect(customEncoderFactory).toHaveBeenCalledWith(mockPSBT, 200);
      expect(interaction).toBeDefined();
    });

    it("should return correct request data", () => {
      mockEncoder.encodePSBT.mockReturnValue(["frame1", "frame2", "frame3"]);
      const customEncoderFactory = vi.fn().mockReturnValue(mockEncoder);

      const interaction = new BCUR2EncodeTransaction({
        psbt: mockPSBT,
        maxFragmentLength: 150,
        decoder: mockDecoder,
        encoderFactory: customEncoderFactory,
      });

      const request = interaction.request();

      expect(request).toEqual({
        instruction: "Scan these animated QR codes with your signing device",
        qrCodeFrames: ["frame1", "frame2", "frame3"],
        fragmentCount: 3,
        maxFragmentLength: 150,
        psbtSize: mockPSBT.length,
      });
    });

    it("should get QR code frames", () => {
      mockEncoder.encodePSBT.mockReturnValue(["frame1", "frame2"]);
      const customEncoderFactory = vi.fn().mockReturnValue(mockEncoder);

      const interaction = new BCUR2EncodeTransaction({
        psbt: mockPSBT,
        decoder: mockDecoder,
        encoderFactory: customEncoderFactory,
      });

      const frames = interaction.getQRCodeFrames();

      expect(frames).toEqual(["frame1", "frame2"]);
      expect(mockEncoder.encodePSBT).toHaveBeenCalled();
    });

    it("should estimate fragment count", () => {
      mockEncoder.estimateFragmentCount.mockReturnValue(5);
      const customEncoderFactory = vi.fn().mockReturnValue(mockEncoder);

      const interaction = new BCUR2EncodeTransaction({
        psbt: mockPSBT,
        decoder: mockDecoder,
        encoderFactory: customEncoderFactory,
      });

      const count = interaction.estimateFragmentCount();

      expect(count).toBe(5);
    });

    it("should set new PSBT", () => {
      const customEncoderFactory = vi.fn().mockReturnValue(mockEncoder);
      const newPSBT = "new-psbt-data";

      const interaction = new BCUR2EncodeTransaction({
        psbt: mockPSBT,
        decoder: mockDecoder,
        encoderFactory: customEncoderFactory,
      });

      interaction.setPSBT(newPSBT);

      expect(mockEncoder.data).toBe(newPSBT);
    });

    it("should set max fragment length", () => {
      const customEncoderFactory = vi.fn().mockReturnValue(mockEncoder);

      const interaction = new BCUR2EncodeTransaction({
        psbt: mockPSBT,
        decoder: mockDecoder,
        encoderFactory: customEncoderFactory,
      });

      interaction.setMaxFragmentLength(250);

      expect(mockEncoder.maxFragmentLength).toBe(250);
    });

    it("should have appropriate messages when not encoded", () => {
      const interaction = new BCUR2EncodeTransaction({
        psbt: mockPSBT,
        decoder: mockDecoder,
      });

      const messages = interaction.messages();

      expect(messages).toContainEqual({
        state: "pending",
        level: "info",
        code: "bcur2.encoding_transaction",
        text: "Encoding transaction into QR codes...",
      });
    });

    it("should have appropriate messages when encoded", () => {
      mockEncoder.encodePSBT.mockReturnValue(["frame1", "frame2"]);
      const customEncoderFactory = vi.fn().mockReturnValue(mockEncoder);

      const interaction = new BCUR2EncodeTransaction({
        psbt: mockPSBT,
        decoder: mockDecoder,
        encoderFactory: customEncoderFactory,
      });

      // Trigger encoding by calling request
      interaction.request();

      const messages = interaction.messages();

      expect(messages).toContainEqual({
        state: "active",
        level: "info",
        code: "bcur2.transaction_encoded",
        text: "Transaction encoded into 2 QR code frames",
      });

      expect(messages).toContainEqual({
        state: "pending",
        level: "info",
        code: "bcur2.display_animated_qr",
        text: "Display animated QR codes to your signing device",
      });
    });
  });

  describe("BCUR2SignMultisigTransaction", () => {
    const mockSignedPSBT = "cHNidP8BAHcCAAAAAe7V...signed";

    it("should create with required parameters", () => {
      const interaction = new BCUR2SignMultisigTransaction({
        psbt: mockPSBT,
        network: Network.TESTNET,
        decoder: mockDecoder,
      });

      expect(interaction).toBeDefined();
      expect(interaction.workflow).toEqual(["request", "parse"]);
    });

    it("should throw error for empty PSBT", () => {
      expect(
        () =>
          new BCUR2SignMultisigTransaction({
            psbt: "",
            decoder: mockDecoder,
          })
      ).toThrow("PSBT is required for signing");
    });

    it("should return correct request data", () => {
      mockEncoder.encodePSBT.mockReturnValue(["frame1", "frame2"]);
      const customEncoderFactory = vi.fn().mockReturnValue(mockEncoder);

      const interaction = new BCUR2SignMultisigTransaction({
        psbt: mockPSBT,
        maxFragmentLength: 120,
        decoder: mockDecoder,
        encoderFactory: customEncoderFactory,
      });

      const request = interaction.request();

      expect(request).toEqual({
        instruction:
          "Display these QR codes to your signing device, then scan the signed result",
        qrCodeFrames: ["frame1", "frame2"],
        fragmentCount: 2,
        maxFragmentLength: 120,
        psbtSize: mockPSBT.length,
      });
    });

    it("should have appropriate messages", () => {
      const interaction = new BCUR2SignMultisigTransaction({
        psbt: mockPSBT,
        decoder: mockDecoder,
      });

      const messages = interaction.messages();

      expect(messages).toContainEqual({
        state: "pending",
        level: "info",
        code: "bcur2.display_qr_for_signing",
        text: "Display the QR codes to your signing device",
      });

      expect(messages).toContainEqual({
        state: "pending",
        level: "info",
        code: "bcur2.scan_signed_psbt",
        text: "After signing, scan the signed PSBT QR codes from your device",
      });
    });

    it("should parse UR format signed PSBT", () => {
      mockDecoder.isComplete.mockReturnValue(true);
      mockDecoder.getDecodedPSBT.mockReturnValue(mockSignedPSBT);

      const interaction = new BCUR2SignMultisigTransaction({
        psbt: mockPSBT,
        decoder: mockDecoder,
      });

      const result = interaction.parse("ur:crypto-psbt/test-signed-data");

      expect(mockDecoder.reset).toHaveBeenCalled();
      expect(mockDecoder.receivePart).toHaveBeenCalledWith(
        "ur:crypto-psbt/test-signed-data"
      );
      expect(result).toEqual({
        signatures: ["signature1", "signature2"],
      });
    });

    it("should parse base64 signed PSBT", () => {
      const interaction = new BCUR2SignMultisigTransaction({
        psbt: mockPSBT,
        decoder: mockDecoder,
      });

      const result = interaction.parse(mockSignedPSBT);

      expect(result).toEqual({
        signatures: ["signature1", "signature2"],
      });
    });

    it("should throw error for incomplete UR data", () => {
      mockDecoder.isComplete.mockReturnValue(false);

      const interaction = new BCUR2SignMultisigTransaction({
        psbt: mockPSBT,
        decoder: mockDecoder,
      });

      expect(() => interaction.parse("ur:crypto-psbt/incomplete-data")).toThrow(
        "Incomplete PSBT data received - scan all QR code parts"
      );
    });

    it("should throw error when decoder fails to get PSBT", () => {
      mockDecoder.isComplete.mockReturnValue(true);
      mockDecoder.getDecodedPSBT.mockReturnValue(null);

      const interaction = new BCUR2SignMultisigTransaction({
        psbt: mockPSBT,
        decoder: mockDecoder,
      });

      expect(() => interaction.parse("ur:crypto-psbt/bad-data")).toThrow(
        "Failed to decode PSBT data"
      );
    });

    it("should get QR code frames", () => {
      mockEncoder.encodePSBT.mockReturnValue(["frame1", "frame2", "frame3"]);
      const customEncoderFactory = vi.fn().mockReturnValue(mockEncoder);

      const interaction = new BCUR2SignMultisigTransaction({
        psbt: mockPSBT,
        decoder: mockDecoder,
        encoderFactory: customEncoderFactory,
      });

      const frames = interaction.getQRCodeFrames();

      expect(frames).toEqual(["frame1", "frame2", "frame3"]);
    });
  });

  describe("Dependency Injection", () => {
    it("should use injected decoder in base class", () => {
      const customDecoder = mockDeep<BCUR2Decoder>();
      customDecoder.getProgress.mockReturnValue("Custom progress");

      const interaction = new BCUR2Interaction(Network.MAINNET, customDecoder);

      expect(interaction.getProgress()).toBe("Custom progress");
      expect(customDecoder.getProgress).toHaveBeenCalled();
    });

    it("should use injected encoder factory in EncodeTransaction", () => {
      const customEncoder = mockDeep<BCUR2Encoder>();
      customEncoder.encodePSBT.mockReturnValue(["custom1", "custom2"]);

      const customEncoderFactory = vi.fn().mockReturnValue(customEncoder);

      const interaction = new BCUR2EncodeTransaction({
        psbt: mockPSBT,
        decoder: mockDecoder,
        encoderFactory: customEncoderFactory,
      });

      const frames = interaction.getQRCodeFrames();

      expect(customEncoderFactory).toHaveBeenCalledWith(mockPSBT, 100);
      expect(frames).toEqual(["custom1", "custom2"]);
    });

    it("should use injected decoder and encoder in SignMultisigTransaction", () => {
      const customDecoder = mockDeep<BCUR2Decoder>();
      const customEncoder = mockDeep<BCUR2Encoder>();

      customDecoder.isComplete.mockReturnValue(false);
      customEncoder.encodePSBT.mockReturnValue(["sign1", "sign2"]);

      const customEncoderFactory = vi.fn().mockReturnValue(customEncoder);

      const interaction = new BCUR2SignMultisigTransaction({
        psbt: mockPSBT,
        decoder: customDecoder,
        encoderFactory: customEncoderFactory,
      });

      expect(interaction.isComplete()).toBe(false);
      expect(customDecoder.isComplete).toHaveBeenCalled();

      const frames = interaction.getQRCodeFrames();
      expect(frames).toEqual(["sign1", "sign2"]);
      expect(customEncoderFactory).toHaveBeenCalledWith(mockPSBT, 100);
    });
  });

  describe("Error Handling", () => {
    it("should handle decoder errors gracefully", () => {
      const errorDecoder = mockDeep<BCUR2Decoder>();
      errorDecoder.getError.mockReturnValue("Decoder initialization failed");

      const interaction = new BCUR2Interaction(Network.MAINNET, errorDecoder);

      expect(interaction.getError()).toBe("Decoder initialization failed");
    });

    it("should handle encoder factory errors", () => {
      const failingEncoderFactory = vi.fn().mockImplementation(() => {
        throw new Error("Encoder creation failed");
      });

      expect(
        () =>
          new BCUR2EncodeTransaction({
            psbt: mockPSBT,
            decoder: mockDecoder,
            encoderFactory: failingEncoderFactory,
          })
      ).toThrow("Encoder creation failed");
    });

    it("should handle parse errors in ExportExtendedPublicKey", () => {
      const errorDecoder = mockDeep<BCUR2Decoder>();
      errorDecoder.receivePart.mockImplementation(() => {
        throw new Error("Invalid UR data");
      });

      const interaction = new BCUR2ExportExtendedPublicKey({
        bip32Path: "m/48'/0'/0'/2'",
        decoder: errorDecoder,
      });

      expect(() => interaction.parse("ur:invalid-data")).toThrow(
        "Error parsing BCUR2 data: Invalid UR data"
      );
    });
  });

  describe("Dependency Injection Integration Tests", () => {
    describe("Custom Decoder Injection", () => {
      it("should use injected decoder in BCUR2ExportExtendedPublicKey", () => {
        const customDecoder = mockDeep<BCUR2Decoder>();
        const mockData: ExtendedPublicKeyData = {
          type: "xpub",
          xpub: "xpub6D2fK1fKRPCYECJPn4YfEbyyXXvFj7kU7vKAG8Aa5YsHGYGnYQd1e2yKjtKkWiGW4Lv1sGVPFwQ",
          bip32Path: "m/48'/0'/0'/2'",
          rootFingerprint: "F57EC65D",
        };

        customDecoder.receivePart.mockImplementation(() => {});
        customDecoder.isComplete.mockReturnValue(true);
        customDecoder.getDecodedData.mockReturnValue(mockData);

        const interaction = new BCUR2ExportExtendedPublicKey({
          bip32Path: "m/48'/0'/0'/2'",
          decoder: customDecoder,
        });

        const result = interaction.parse("ur:crypto-account/test");

        expect(customDecoder.receivePart).toHaveBeenCalledWith(
          "ur:crypto-account/test"
        );
        expect(customDecoder.getDecodedData).toHaveBeenCalledWith(
          Network.MAINNET
        );
        expect(result).toEqual(mockData);
      });

      it("should use injected decoder in BCUR2SignMultisigTransaction", () => {
        const customDecoder = mockDeep<BCUR2Decoder>();
        const mockEncoderFactory = vi.fn().mockReturnValue(mockEncoder);

        customDecoder.reset.mockImplementation(() => {});
        customDecoder.receivePart.mockImplementation(() => {});
        customDecoder.isComplete.mockReturnValue(true);
        customDecoder.getDecodedPSBT.mockReturnValue("cHNidP8BAHcCAAAAAe7V...");

        const interaction = new BCUR2SignMultisigTransaction({
          psbt: mockPSBT,
          decoder: customDecoder,
          encoderFactory: mockEncoderFactory,
        });

        const result = interaction.parse("ur:crypto-psbt/signed-data");

        expect(customDecoder.reset).toHaveBeenCalled();
        expect(customDecoder.receivePart).toHaveBeenCalledWith(
          "ur:crypto-psbt/signed-data"
        );
        expect(customDecoder.getDecodedPSBT).toHaveBeenCalled();
        expect(result).toHaveProperty("signatures");
      });
    });

    describe("Custom Encoder Factory Injection", () => {
      it("should use injected encoder factory in BCUR2EncodeTransaction", () => {
        const customEncoder = mockDeep<BCUR2Encoder>();
        const mockFrames = ["frame1", "frame2", "frame3"];
        customEncoder.encodePSBT.mockReturnValue(mockFrames);
        customEncoder.estimateFragmentCount.mockReturnValue(3);

        const encoderFactory = vi.fn().mockReturnValue(customEncoder);

        const interaction = new BCUR2EncodeTransaction({
          psbt: mockPSBT,
          encoderFactory,
        });

        const frames = interaction.getQRCodeFrames();

        expect(encoderFactory).toHaveBeenCalledWith(mockPSBT, 100);
        expect(customEncoder.encodePSBT).toHaveBeenCalled();
        expect(frames).toEqual(mockFrames);
      });

      it("should use injected encoder factory in BCUR2SignMultisigTransaction", () => {
        const customEncoder = mockDeep<BCUR2Encoder>();
        const mockFrames = ["sign-frame1", "sign-frame2"];
        customEncoder.encodePSBT.mockReturnValue(mockFrames);

        const encoderFactory = vi.fn().mockReturnValue(customEncoder);

        const interaction = new BCUR2SignMultisigTransaction({
          psbt: mockPSBT,
          encoderFactory,
        });

        const request = interaction.request();

        expect(encoderFactory).toHaveBeenCalledWith(mockPSBT, 100);
        expect(customEncoder.encodePSBT).toHaveBeenCalled();
        expect(request.qrCodeFrames).toEqual(mockFrames);
      });
    });

    describe("Network Configuration Injection", () => {
      it("should use custom network in BCUR2ExportExtendedPublicKey", () => {
        const customDecoder = mockDeep<BCUR2Decoder>();
        const mockData: ExtendedPublicKeyData = {
          type: "xpub",
          xpub: "tpubD6NzVbkrYhZ4XQGmfhYxPwB...",
          bip32Path: "m/48'/1'/0'/2'",
          rootFingerprint: "F57EC65D",
        };

        customDecoder.isComplete.mockReturnValue(true);
        customDecoder.getDecodedData.mockReturnValue(mockData);

        const interaction = new BCUR2ExportExtendedPublicKey({
          bip32Path: "m/48'/1'/0'/2'",
          network: Network.TESTNET,
          decoder: customDecoder,
        });

        interaction.parse("ur:crypto-account/testnet-data");

        expect(customDecoder.getDecodedData).toHaveBeenCalledWith(
          Network.TESTNET
        );
      });

      it("should use custom network and maxFragmentLength", () => {
        const customEncoder = mockDeep<BCUR2Encoder>();
        const encoderFactory = vi.fn().mockReturnValue(customEncoder);

        const interaction = new BCUR2EncodeTransaction({
          psbt: mockPSBT,
          network: Network.TESTNET,
          maxFragmentLength: 200,
          encoderFactory,
        });

        interaction.getQRCodeFrames();

        expect(encoderFactory).toHaveBeenCalledWith(mockPSBT, 200);
      });
    });

    describe("Error Handling with Dependency Injection", () => {
      it("should handle decoder errors gracefully", () => {
        const errorDecoder = mockDeep<BCUR2Decoder>();
        errorDecoder.receivePart.mockImplementation(() => {
          throw new Error("Decoder injection error");
        });

        const interaction = new BCUR2ExportExtendedPublicKey({
          bip32Path: "m/48'/0'/0'/2'",
          decoder: errorDecoder,
        });

        expect(() => interaction.parse("ur:crypto-account/bad-data")).toThrow(
          "Error parsing BCUR2 data: Decoder injection error"
        );
      });

      it("should handle encoder factory errors gracefully", () => {
        const failingEncoderFactory = vi.fn().mockImplementation(() => {
          throw new Error("Encoder factory injection error");
        });

        expect(() => {
          const _interaction = new BCUR2EncodeTransaction({
            psbt: mockPSBT,
            encoderFactory: failingEncoderFactory,
          });
          return _interaction;
        }).toThrow("Encoder factory injection error");
      });
    });

    describe("Factory Pattern Integration", () => {
      it("should support encoder factory with custom parameters", () => {
        const advancedEncoderFactory = (data: string, maxLength: number) => {
          const encoder = mockDeep<BCUR2Encoder>();
          encoder.encodePSBT.mockReturnValue([`${data}-${maxLength}-frame1`]);
          encoder.estimateFragmentCount.mockReturnValue(1);
          return encoder;
        };

        const interaction = new BCUR2EncodeTransaction({
          psbt: "test-psbt",
          maxFragmentLength: 150,
          encoderFactory: advancedEncoderFactory,
        });

        const frames = interaction.getQRCodeFrames();
        expect(frames).toEqual(["test-psbt-150-frame1"]);
      });

      it("should allow decoder replacement at runtime", () => {
        const decoder1 = mockDeep<BCUR2Decoder>();
        const decoder2 = mockDeep<BCUR2Decoder>();

        decoder1.isComplete.mockReturnValue(false);
        decoder2.isComplete.mockReturnValue(true);

        const interaction = new BCUR2ExportExtendedPublicKey({
          bip32Path: "m/48'/0'/0'/2'",
          decoder: decoder1,
        });

        expect(interaction.isComplete()).toBe(false);

        // Simulate runtime decoder replacement (though this would require additional API)
        // This test shows the flexibility of the dependency injection pattern
        const interaction2 = new BCUR2ExportExtendedPublicKey({
          bip32Path: "m/48'/0'/0'/2'",
          decoder: decoder2,
        });

        expect(interaction2.isComplete()).toBe(true);
      });
    });

    describe("Integration with Mock Objects", () => {
      it("should work with complex mock scenarios", () => {
        // Setup complex mock scenario
        const complexDecoder = mockDeep<BCUR2Decoder>();
        const complexEncoder = mockDeep<BCUR2Encoder>();

        // Configure decoder for successful single parse
        complexDecoder.isComplete.mockReturnValue(true);
        complexDecoder.getProgress.mockReturnValue("3 of 3");
        complexDecoder.getDecodedPSBT.mockReturnValue(mockPSBT); // Use valid mock PSBT

        // Configure encoder
        complexEncoder.encodePSBT.mockReturnValue(["part1", "part2", "part3"]);

        const encoderFactory = vi.fn().mockReturnValue(complexEncoder);

        const interaction = new BCUR2SignMultisigTransaction({
          psbt: mockPSBT,
          decoder: complexDecoder,
          encoderFactory,
        });

        // Test encoding phase
        const request = interaction.request();
        expect(request.qrCodeFrames).toHaveLength(3);
        expect(encoderFactory).toHaveBeenCalled();

        // Test successful parsing of a complete multi-part UR
        const result = interaction.parse(
          "ur:crypto-psbt/complete-multi-part-ur"
        );
        expect(complexDecoder.reset).toHaveBeenCalled();
        expect(complexDecoder.receivePart).toHaveBeenCalled();
        expect(interaction.isComplete()).toBe(true);
        expect(result).toHaveProperty("signatures");
        expect(result.signatures).toEqual(["signature1", "signature2"]);
      });
    });
  });
});
