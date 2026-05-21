import { getRelativeBip32Sequence } from "@caravan/bip32";
import {
  BitcoinNetwork,
  MultisigAddressType,
  ExtendedPublicKey,
  getPsbtVersionNumber,
  PsbtV2,
  bip32PathToSequence,
  bip32SequenceToPath,
} from "@caravan/bitcoin";
import { HDKey } from "@scure/bip32";
import { mnemonicToSeedSync } from "@scure/bip39";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore — bitcoinjs-message has no ambient types
import * as bitcoinMessage from "bitcoinjs-message";
import { IJade, IJadeInterface, JadeTransport } from "jadets";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { mock, MockProxy } from "vitest-mock-extended";

import {
  JadeInteraction,
  JadeGetMetadata,
  JadeExportPublicKey,
  JadeExportExtendedPublicKey,
  JadeRegisterWalletPolicy,
  JadeConfirmMultisigAddress,
  JadeSignMultisigTransaction,
  JadeSignMessage,
  JadeDependencies,
  variantFromAddressType,
  fingerprintFromHex,
  walletConfigToJadeDescriptor,
  getSignatureArray,
} from "./jade";
import {
  MessageSigningError,
  verifyMessageSignature,
} from "./messages";
import { MultisigWalletConfig } from "./types";

const BIP39_PHRASE =
  "merge alley lucky axis penalty manage latin gasp virus captain wheel deal chase fragile chapter boss zero dirt stadium tooth physical valve kid plunge";

// Mock modules
vi.mock("@caravan/bitcoin", () => ({
  ExtendedPublicKey: {
    fromBase58: vi.fn(),
  },
  getPsbtVersionNumber: vi.fn(),
  PsbtV2: vi.fn(),
  bip32PathToSequence: vi.fn(),
  bip32SequenceToPath: vi.fn(),
  P2SH: "P2SH",
  P2WSH: "P2WSH",
  P2SH_P2WSH: "P2SH_P2WSH",
}));

vi.mock("@caravan/bip32", () => ({
  getRelativeBip32Sequence: vi.fn(),
}));

vi.mock("crypto", () => ({
  randomBytes: vi.fn(() => Buffer.from("abcd1234", "hex")),
}));

vi.mock("jadets", () => {
  const MockJade = vi.fn();
  const MockJadeInterface = vi.fn();
  const MockSerialTransport = vi.fn();

  return {
    Jade: MockJade,
    JadeInterface: MockJadeInterface,
    SerialTransport: MockSerialTransport,
    base64ToBytes: vi.fn(() => new Uint8Array([1, 2, 3])),
    bytesToBase64: vi.fn(() => "base64string"),
  };
});

describe("Jade", () => {
  let mockJade: MockProxy<IJade>;
  let mockJadeInterface: MockProxy<IJadeInterface>;
  let mockTransport: MockProxy<JadeTransport>;
  let dependencies: JadeDependencies;

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock global fetch
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ status: "success" }),
    });

    // Create type-safe mocks
    mockJade = mock<IJade>();
    mockJadeInterface = mock<IJadeInterface>();
    mockTransport = mock<JadeTransport>();

    // Set up default mock behaviors
    mockJade.connect.mockResolvedValue();
    mockJade.disconnect.mockResolvedValue();
    mockJade.authUser.mockResolvedValue(true);
    mockJade.getVersionInfo.mockResolvedValue({
      JADE_VERSION: "1.0.0",
      BOARD_TYPE: "jade_v1",
    });
    mockJade.getXpub.mockResolvedValue("xpub_test");
    mockJade.getMasterFingerPrint.mockResolvedValue("12345678");
    mockJade.getMultiSigName.mockResolvedValue("name");
    mockJade.registerMultisig.mockResolvedValue(true);
    mockJade.getReceiveAddress.mockResolvedValue("bc1qtest");
    mockJade.signPSBT.mockResolvedValue(new Uint8Array([1, 2, 3]));
    mockJade.signMessage.mockResolvedValue(Buffer.from("signature_base64"));

    // Dependencies to inject
    dependencies = {
      jade: mockJade,
      jadeInterface: mockJadeInterface,
      transport: mockTransport,
    };

    // Set up mocked module functions
    (bip32PathToSequence as any).mockImplementation((path: string) =>
      path
        .split("/")
        .filter((p) => p && p !== "m")
        .map((p) => parseInt(p.replace("'", ""), 10))
    );
    (bip32SequenceToPath as any).mockImplementation((seq: number[]) =>
      seq.join("/")
    );
    (getRelativeBip32Sequence as any).mockReturnValue([0, 1]);
    (ExtendedPublicKey.fromBase58 as any).mockReturnValue({
      pubkey: "pubkey_hex",
    });
    (getPsbtVersionNumber as any).mockReturnValue(2);
    (PsbtV2 as any).mockImplementation(() => ({
      PSBT_GLOBAL_INPUT_COUNT: 1,
      PSBT_IN_BIP32_DERIVATION: [
        [{ key: "0xpubkey_hex", value: "12345678/0/0" }],
      ],
      PSBT_IN_PARTIAL_SIG: [[{ key: "0xpubkey_hex", value: "signature_hex" }]],
    }));
  });

  describe("JadeInteraction", () => {
    describe("withDevice", () => {
      it("connects, authenticates, runs function, and disconnects", async () => {
        const interaction = new JadeInteraction(
          "mainnet" as BitcoinNetwork,
          dependencies
        );
        const testResult = "success";
        const result = await interaction.withDevice(async () => testResult);

        expect(result).toBe(testResult);
        expect(mockJade.connect).toHaveBeenCalledTimes(1);
        expect(mockJade.authUser).toHaveBeenCalledTimes(1);
        expect(mockJade.authUser).toHaveBeenCalledWith(
          "mainnet",
          expect.any(Function)
        );
        expect(mockJade.disconnect).toHaveBeenCalledTimes(1);
      });

      it("maps regtest to localtest", async () => {
        const interaction = new JadeInteraction(
          "regtest" as BitcoinNetwork,
          dependencies
        );
        await interaction.withDevice(async () => "ok");

        expect(mockJade.authUser).toHaveBeenCalledWith(
          "localtest",
          expect.any(Function)
        );
      });

      it("handles auth failure", async () => {
        mockJade.authUser.mockResolvedValueOnce(false);
        const interaction = new JadeInteraction(
          "mainnet" as BitcoinNetwork,
          dependencies
        );

        await expect(
          interaction.withDevice(async () => "test")
        ).rejects.toThrow("Failed to unlock Jade device");
      });

      it("disconnects even if operation fails", async () => {
        const interaction = new JadeInteraction(
          "mainnet" as BitcoinNetwork,
          dependencies
        );
        const testError = new Error("Operation failed");

        await expect(
          interaction.withDevice(async () => {
            throw testError;
          })
        ).rejects.toThrow(testError.message);

        expect(mockJade.disconnect).toHaveBeenCalledTimes(1);
      });

      it("handles HTTP request failures in authUser", async () => {
        const interaction = new JadeInteraction(
          "mainnet" as BitcoinNetwork,
          dependencies
        );
        await interaction.withDevice(async () => "test");

        // Get the httpRequestFn that was passed to authUser
        const authUserCall = mockJade.authUser.mock.calls[0];
        const httpRequestFn = authUserCall[1];

        // Mock fetch to fail for the auth request
        (global.fetch as any).mockResolvedValueOnce({
          ok: false,
          json: async () => ({ error: "HTTP error" }),
        });

        await expect(
          httpRequestFn!({
            urls: ["http://test.com"],
            method: "POST",
            accept: "json",
            data: { data: "" },
          })
        ).rejects.toThrow("HTTP request failed in authUser");
      });

      describe("messages", () => {
        it("returns correct status messages", () => {
          const interaction = new JadeInteraction(
            "mainnet" as BitcoinNetwork,
            dependencies
          );
          const messages = interaction.messages();

          expect(messages).toContainEqual({
            state: "pending",
            level: "info",
            text: "Please connect your Jade device.",
            code: "device.setup",
          });
          expect(messages).toContainEqual({
            state: "active",
            level: "info",
            text: "Communicating with Jade...",
            code: "device.active",
          });
        });
      });
    });

    describe("JadeGetMetadata", () => {
      it("returns device info from jade.getVersionInfo", async () => {
        const versionInfo = {
          JADE_VERSION: "2.0.1",
          BOARD_TYPE: "jade_v2",
        };
        mockJade.getVersionInfo.mockResolvedValueOnce(versionInfo);

        const interaction = new JadeGetMetadata(
          "mainnet" as BitcoinNetwork,
          dependencies
        );
        const result = await interaction.run();

        expect(result).toEqual({
          spec: `Jade v${versionInfo.JADE_VERSION}`,
          version: {
            major: "2",
            minor: "0",
            patch: "1",
            string: "2.0.1",
          },
          model: versionInfo.BOARD_TYPE,
        });
        expect(mockJade.getVersionInfo).toHaveBeenCalledTimes(1);
      });

      it("handles missing version", async () => {
        mockJade.getVersionInfo.mockResolvedValueOnce({
          BOARD_TYPE: "jade_v1",
        });

        const interaction = new JadeGetMetadata(
          "mainnet" as BitcoinNetwork,
          dependencies
        );
        const result = await interaction.run();

        expect(result.version.string).toBe("");
        expect(result.model).toBe("jade_v1");
      });
    });

    describe("JadeExportPublicKey", () => {
      const mockXpub = "xpub_test_value";
      const mockFingerprint = "abcd1234";

      beforeEach(() => {
        mockJade.getXpub.mockResolvedValue(mockXpub);
        mockJade.getMasterFingerPrint.mockResolvedValue(mockFingerprint);
        (ExtendedPublicKey.fromBase58 as any).mockReturnValue({
          pubkey: "extracted_pubkey",
        });
      });

      it("exports public key from jade.getXpub", async () => {
        const interaction = new JadeExportPublicKey({
          bip32Path: "m/44'/0'/0'",
          includeXFP: false,
          dependencies,
        });

        const result = await interaction.run();

        expect(result).toBe("extracted_pubkey");
        expect(mockJade.getXpub).toHaveBeenCalledWith("mainnet", [44, 0, 0]);
        expect(ExtendedPublicKey.fromBase58).toHaveBeenCalledWith(mockXpub);
      });

      it("includes fingerprint when requested", async () => {
        const interaction = new JadeExportPublicKey({
          bip32Path: "m/44'/0'/0'",
          includeXFP: true,
          dependencies,
        });

        const result = await interaction.run();

        expect(result).toEqual({
          publicKey: "extracted_pubkey",
          rootFingerprint: mockFingerprint,
        });
        expect(mockJade.getMasterFingerPrint).toHaveBeenCalledWith("mainnet");
      });
    });

    describe("JadeExportExtendedPublicKey", () => {
      const mockXpub = "xpub_extended_test";
      const mockFingerprint = "deadbeef";

      beforeEach(() => {
        mockJade.getXpub.mockResolvedValue(mockXpub);
        mockJade.getMasterFingerPrint.mockResolvedValue(mockFingerprint);
      });

      it("exports xpub from jade.getXpub", async () => {
        const interaction = new JadeExportExtendedPublicKey({
          bip32Path: "m/44'/0'/0'",
          includeXFP: false,
          dependencies,
        });

        const result = await interaction.run();
        expect(result).toBe(mockXpub);
      });

      it("includes fingerprint when requested", async () => {
        const interaction = new JadeExportExtendedPublicKey({
          bip32Path: "m/44'/0'/0'",
          includeXFP: true,
          dependencies,
        });

        const result = await interaction.run();
        expect(result).toEqual({
          xpub: mockXpub,
          rootFingerprint: mockFingerprint,
        });
      });
    });

    describe("JadeRegisterWalletPolicy", () => {
      const walletConfig: MultisigWalletConfig = {
        network: "mainnet" as BitcoinNetwork,
        addressType: "P2WSH" as MultisigAddressType,
        quorum: { requiredSigners: 2, totalSigners: 3 },
        extendedPublicKeys: [
          {
            xfp: "12345678",
            bip32Path: "m/48'/0'/0'/2'",
            xpub: "xpub1...",
          },
        ],
      };

      it("registers new policy when not found", async () => {
        // eslint-disable-next-line no-undefined
        mockJade.getMultiSigName.mockResolvedValueOnce(undefined);

        const interaction = new JadeRegisterWalletPolicy({
          walletConfig,
          dependencies,
        });
        await interaction.run();

        expect(mockJade.getMultiSigName).toHaveBeenCalledTimes(1);
        expect(mockJade.registerMultisig).toHaveBeenCalledWith(
          "mainnet",
          "jadeabcd1234",
          expect.objectContaining({
            variant: "wsh(multi(k))",
            sorted: true,
            threshold: 2,
          })
        );
      });

      it("skips registration if already exists", async () => {
        const existingName = "existing_policy";
        mockJade.getMultiSigName.mockResolvedValueOnce(existingName);

        const interaction = new JadeRegisterWalletPolicy({
          walletConfig,
          dependencies,
        });
        await interaction.run();

        expect(mockJade.registerMultisig).not.toHaveBeenCalled();
      });
    });

    describe("JadeConfirmMultisigAddress", () => {
      const walletConfig: MultisigWalletConfig = {
        network: "mainnet" as BitcoinNetwork,
        addressType: "P2WSH" as MultisigAddressType,
        quorum: { requiredSigners: 2, totalSigners: 3 },
        extendedPublicKeys: [
          {
            xfp: "12345678",
            bip32Path: "m/48'/0'/0'/2'",
            xpub: "xpub1...",
          },
        ],
      };

      it("confirms address for existing multisig", async () => {
        const existingName = "existing_multisig";
        const expectedAddress = "bc1q_test_address";
        mockJade.getMultiSigName.mockResolvedValueOnce(existingName);
        mockJade.getReceiveAddress.mockResolvedValueOnce(expectedAddress);

        const interaction = new JadeConfirmMultisigAddress({
          bip32Path: "m/48'/0'/0'/2'/0/0",
          walletConfig,
          dependencies,
        });

        const result = await interaction.run();

        expect(result).toBe(expectedAddress);
        expect(mockJade.getReceiveAddress).toHaveBeenCalledWith(
          "mainnet",
          expect.objectContaining({
            multisigName: existingName,
            paths: expect.any(Array),
          })
        );
      });

      it("registers then confirms if not found", async () => {
        const expectedAddress = "bc1q_new_address";
        // eslint-disable-next-line no-undefined
        mockJade.getMultiSigName.mockResolvedValueOnce(undefined);
        mockJade.getReceiveAddress.mockResolvedValueOnce(expectedAddress);

        const interaction = new JadeConfirmMultisigAddress({
          bip32Path: "m/48'/0'/0'/2'/0/0",
          walletConfig,
          dependencies,
        });

        const result = await interaction.run();

        expect(result).toBe(expectedAddress);
        expect(mockJade.registerMultisig).toHaveBeenCalled();
        expect(mockJade.getReceiveAddress).toHaveBeenCalled();
      });
    });

    describe("JadeSignMultisigTransaction", () => {
      const walletConfig: MultisigWalletConfig = {
        network: "mainnet" as BitcoinNetwork,
        addressType: "P2WSH" as MultisigAddressType,
        quorum: { requiredSigners: 2, totalSigners: 3 },
        extendedPublicKeys: [],
      };

      it("signs PSBT and returns signed bytes", async () => {
        const signedBytes = new Uint8Array([4, 5, 6]);
        mockJade.signPSBT.mockResolvedValueOnce(signedBytes);

        const interaction = new JadeSignMultisigTransaction({
          walletConfig,
          psbt: "base64psbt",
          returnSignatureArray: false,
          dependencies,
        });

        const result = await interaction.run();

        expect(result).toBe(signedBytes);
        expect(mockJade.signPSBT).toHaveBeenCalledWith(
          "mainnet",
          expect.any(Uint8Array)
        );
      });
    });

    describe("JadeSignMessage", () => {
      const DUMMY_PUBKEY = `02${"00".repeat(32)}`;

      it("rejects raw sig of wrong length with MalformedResponse", async () => {
        mockJade.signMessage.mockResolvedValueOnce(Buffer.alloc(32));
        const interaction = new JadeSignMessage({
          bip32Path: "m/44'/0'/0'",
          message: "hello",
          expectedPubkey: DUMMY_PUBKEY,
          dependencies,
        });
        await expect(interaction.run()).rejects.toThrowError(
          MessageSigningError
        );
      });

      it("wraps SDK rejection-shaped errors as DeviceRejected", async () => {
        mockJade.signMessage.mockRejectedValueOnce(
          new Error("Action rejected by user")
        );
        const interaction = new JadeSignMessage({
          bip32Path: "m/44'/0'/0'",
          message: "hello",
          expectedPubkey: DUMMY_PUBKEY,
          dependencies,
        });
        try {
          await interaction.run();
          throw new Error("expected throw");
        } catch (err) {
          expect(err).toBeInstanceOf(MessageSigningError);
          expect((err as MessageSigningError).kind).toBe("DeviceRejected");
          expect((err as MessageSigningError).keystore).toBe("jade");
        }
      });

      it("wraps unrelated SDK errors as TransportError", async () => {
        mockJade.signMessage.mockRejectedValueOnce(
          new Error("BLE connection dropped")
        );
        const interaction = new JadeSignMessage({
          bip32Path: "m/44'/0'/0'",
          message: "hello",
          expectedPubkey: DUMMY_PUBKEY,
          dependencies,
        });
        try {
          await interaction.run();
          throw new Error("expected throw");
        } catch (err) {
          expect(err).toBeInstanceOf(MessageSigningError);
          expect((err as MessageSigningError).kind).toBe("TransportError");
        }
      });

      it("rejects a sig that does not recover to expectedPubkey under either v", async () => {
        const path = "m/44'/0'/0'";
        const seed = mnemonicToSeedSync(BIP39_PHRASE);
        const signingNode = HDKey.fromMasterSeed(seed).derive(path);
        const wrongNode = HDKey.fromMasterSeed(seed).derive("m/44'/0'/1'");
        const priv = Buffer.from(signingNode.privateKey as Uint8Array);
        const wrongPub = Buffer.from(wrongNode.publicKey as Uint8Array);
        const message = "Hello, Jade!";

        const bip137 = bitcoinMessage.sign(message, priv, true, {
          segwitType: "p2wpkh",
        });
        const rawSig = bip137.subarray(1);

        mockJade.signMessage.mockResolvedValueOnce(rawSig);

        const interaction = new JadeSignMessage({
          bip32Path: path,
          message,
          // sign with `signingNode` but claim `wrongNode` was the signer;
          // neither v candidate should recover to wrongPub.
          expectedPubkey: wrongPub.toString("hex"),
          dependencies,
        });

        await expect(interaction.run()).rejects.toThrowError(
          MessageSigningError
        );
      });

      it("signs and returns Entry with a canonical sig that verifies against expectedPubkey", async () => {
        const path = "m/44'/0'/0'";
        const seed = mnemonicToSeedSync(BIP39_PHRASE);
        const node = HDKey.fromMasterSeed(seed).derive(path);
        const priv = Buffer.from(node.privateKey as Uint8Array);
        const pub = Buffer.from(node.publicKey as Uint8Array);
        const expectedPubkey = pub.toString("hex");
        const message = "Hello, Jade!";

        // Synthesize a Jade-style raw EC sig (r||s, no header byte) by
        // signing via bitcoinjs-message and stripping the BIP-137 header.
        // This is the wire-equivalent of what Jade's firmware emits over
        // the sign_message RPC.
        const bip137 = bitcoinMessage.sign(message, priv, true, {
          segwitType: "p2wpkh",
        });
        const rawSig = bip137.subarray(1);

        mockJade.signMessage.mockResolvedValueOnce(rawSig);

        const interaction = new JadeSignMessage({
          bip32Path: path,
          message,
          expectedPubkey,
          dependencies,
        });

        const entry = await interaction.run();

        expect(entry.bip32Path).toBe(path);
        expect(entry.expectedPubkey).toBe(expectedPubkey);
        expect(typeof entry.signature).toBe("string");
        expect(
          verifyMessageSignature({
            message,
            signature: entry.signature,
            expectedPubkey: entry.expectedPubkey,
          }),
        ).toBe(true);
        expect(mockJade.signMessage).toHaveBeenCalledWith([44, 0, 0], message);
      });
    });

    describe("Helper functions", () => {
      describe("variantFromAddressType", () => {
        it("maps address types correctly", () => {
          expect(variantFromAddressType("P2SH" as MultisigAddressType)).toBe(
            "sh(multi(k))"
          );
          expect(variantFromAddressType("P2WSH" as MultisigAddressType)).toBe(
            "wsh(multi(k))"
          );
          expect(
            variantFromAddressType("P2SH_P2WSH" as MultisigAddressType)
          ).toBe("sh(wsh(multi(k)))");
        });

        it("throws for unsupported address type", () => {
          expect(() =>
            variantFromAddressType("INVALID" as MultisigAddressType)
          ).toThrow("Unsupported addressType INVALID");
        });
      });

      describe("fingerprintFromHex", () => {
        it("converts hex string to Uint8Array", () => {
          const result = fingerprintFromHex("12345678");
          expect(result).toBeInstanceOf(Uint8Array);
          expect(Array.from(result)).toEqual([18, 52, 86, 120]);
        });
      });

      describe("walletConfigToJadeDescriptor", () => {
        it("creates proper descriptor from wallet config", () => {
          const config: MultisigWalletConfig = {
            network: "mainnet" as BitcoinNetwork,
            addressType: "P2WSH" as MultisigAddressType,
            quorum: { requiredSigners: 2, totalSigners: 3 },
            extendedPublicKeys: [
              {
                xfp: "12345678",
                bip32Path: "m/48'/0'/0'/2'",
                xpub: "xpub1...",
              },
            ],
          };

          const result = walletConfigToJadeDescriptor(config);

          expect(result).toEqual({
            variant: "wsh(multi(k))",
            sorted: true,
            threshold: 2,
            signers: expect.arrayContaining([
              expect.objectContaining({
                xpub: "xpub1...",
                fingerprint: expect.any(Uint8Array),
                path: [],
              }),
            ]),
          });
        });
      });

      describe("getSignatureArray", () => {
        it("extracts signatures for matching fingerprint", () => {
          const mockPsbt = {
            PSBT_GLOBAL_INPUT_COUNT: 1,
            PSBT_IN_BIP32_DERIVATION: [
              [{ key: "0xabc123", value: "12345678/0/0" }],
            ],
            PSBT_IN_PARTIAL_SIG: [[{ key: "0xabc123", value: "sig_value" }]],
          } as unknown as PsbtV2;

          const result = getSignatureArray("12345678", mockPsbt);
          expect(result).toEqual(["sig_value"]);
        });

        it("throws when derivations is not an array", () => {
          const mockPsbt = {
            PSBT_GLOBAL_INPUT_COUNT: 1,
            PSBT_IN_BIP32_DERIVATION: [null],
            PSBT_IN_PARTIAL_SIG: [[]],
          } as unknown as PsbtV2;

          expect(() => getSignatureArray("12345678", mockPsbt)).toThrow(
            "bip32 derivations expected to be an array"
          );
        });
      });
    });
  });
});
