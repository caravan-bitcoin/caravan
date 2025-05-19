import { TEST_FIXTURES, ROOT_FINGERPRINT, Network } from "@caravan/bitcoin";
import { BraidDetails, braidDetailsToWalletConfig } from "@caravan/multisig";

import { PENDING, ACTIVE, INFO, WARNING, ERROR } from "./interaction";
import {
  LedgerGetMetadata,
  LedgerExportPublicKey,
  LedgerExportExtendedPublicKey,
  LedgerSignMultisigTransaction,
  LedgerSignMessage,
  LedgerRegisterWalletPolicy,
  LedgerConfirmMultisigAddress,
  LedgerV2SignMultisigTransaction,
  LedgerSignatures,
} from "./ledger";

function itHasStandardMessages(interactionBuilder) {
  it("has a message about ensuring your device is plugged in", () => {
    expect(
      interactionBuilder().hasMessagesFor({
        state: PENDING,
        level: INFO,
        code: "device.setup",
        text: "plug in and unlock",
      })
    ).toBe(true);
  });

  it("has a message about communicating with your device", () => {
    expect(
      interactionBuilder().hasMessagesFor({
        state: ACTIVE,
        level: INFO,
        code: "device.active",
        text: "Communicating",
      })
    ).toBe(true);
  });
}

function itHasDashboardMessages(interactionBuilder) {
  itHasStandardMessages(interactionBuilder);

  it("has messages about being in the dashboard, not an app", () => {
    expect(
      interactionBuilder().hasMessagesFor({
        state: ACTIVE,
        level: INFO,
        code: "ledger.app.dashboard",
        text: "NOT the Bitcoin app",
      })
    ).toBe(true);
    expect(
      interactionBuilder().hasMessagesFor({
        state: PENDING,
        level: INFO,
        code: "ledger.app.dashboard",
        text: "NOT the Bitcoin app",
      })
    ).toBe(true);
  });
}

function itHasAppMessages(interactionBuilder) {
  itHasStandardMessages(interactionBuilder);

  it("has messages about being in the Bitcoin app", () => {
    expect(
      interactionBuilder().hasMessagesFor({
        state: ACTIVE,
        level: INFO,
        code: "ledger.app.bitcoin",
        text: "opened the Bitcoin app",
      })
    ).toBe(true);
    expect(
      interactionBuilder().hasMessagesFor({
        state: PENDING,
        level: INFO,
        code: "ledger.app.bitcoin",
        text: "open the Bitcoin app",
      })
    ).toBe(true);
  });
}

describe("ledger", () => {
  describe("LedgerGetMetadata", () => {
    function interactionBuilder() {
      return new LedgerGetMetadata();
    }

    itHasDashboardMessages(interactionBuilder);

    describe("parseMetadata", () => {
      it("successfully parses metadata", () => {
        const response = [
          49, 16, 0, 3, 5, 49, 46, 52, 46, 50, 4, 166, 0, 0, 0, 4, 49, 46, 54,
          0, 32, 52, 200, 225, 237, 153, 74, 68, 110, 247, 12, 155, 37, 109,
          138, 110, 1, 235, 148, 154, 186, 75, 24, 185, 249, 163, 155, 127, 56,
          120, 37, 49, 3, 144, 0,
        ];
        const metadata = interactionBuilder().parseMetadata(response);
        expect(metadata).toBeTruthy();
        expect(metadata.spec).toEqual("Nano S v1.4.2 (MCU v1.6)");
        expect(metadata.model).toEqual("Nano S");
        expect(metadata.version).toBeTruthy();
        expect(metadata.version.major).toEqual("1");
        expect(metadata.version.minor).toEqual("4");
        expect(metadata.version.patch).toEqual("2");
        expect(metadata.version.string).toEqual("1.4.2");
        expect(metadata.mcuVersion).toBeTruthy();
        expect(metadata.mcuVersion.major).toEqual("1");
        expect(metadata.mcuVersion.minor).toEqual("6");
        expect(metadata.mcuVersion.string).toEqual("1.6");
      });

      it("throws and logs an error when metadata can't be parsed", () => {
        console.error = vi.fn();
        expect(() => {
          interactionBuilder().parseMetadata([]);
        }).toThrow(/unable to parse/i);
        expect(console.error).toHaveBeenCalled();
      });
    });
  });

  describe("LedgerExportPublicKey", () => {
    function interactionBuilder(bip32Path?: string) {
      return new LedgerExportPublicKey({
        bip32Path: bip32Path || "m/45'/0'/0'/0/0",
      });
    }

    itHasAppMessages(interactionBuilder);

    it("constructor adds error message on invalid bip32path", () => {
      expect(
        interactionBuilder("m/foo").hasMessagesFor({
          state: PENDING,
          level: ERROR,
          code: "ledger.bip32_path.path_error",
        })
      ).toBe(true);
    });

    describe("parsePublicKey", () => {
      it("throws an error when no public key is found", () => {
        expect(() => {
          interactionBuilder().parsePublicKey();
        }).toThrow(/no public key/);
      });

      it("throws and logs an error when the public key can't be compressed", () => {
        console.error = vi.fn();
        expect(() => {
          interactionBuilder().parsePublicKey();
        }).toThrow(/received no public key/i);
        // TODO: this is broken in @caravan/bitcoin
        // the underlying function call should fail when not
        // given a valid hex string, instead it's just converting
        // to an empty string which can still convert
        // expect(() => {
        //   interactionBuilder().parsePublicKey("foobar");
        // }).toThrow(/unable to compress/i);
        // expect(() => {
        //   interactionBuilder().parsePublicKey("");
        // }).toThrow(/unable to compress/i);
        expect(() => {
          // @ts-expect-error for a test
          interactionBuilder().parsePublicKey(1);
        }).toThrow(/unable to compress/i);
        expect(console.error).toHaveBeenCalled();
      });

      it("extracts and compresses the public key", () => {
        expect(
          interactionBuilder().parsePublicKey(
            "0429b3e0919adc41a316aad4f41444d9bf3a9b639550f2aa735676ffff25ba3898d6881e81d2e0163348ff07b3a9a3968401572aa79c79e7edb522f41addc8e6ce"
          )
        ).toEqual(
          "0229b3e0919adc41a316aad4f41444d9bf3a9b639550f2aa735676ffff25ba3898"
        );
      });
    });
  });

  describe("LedgerSignMultisigTransaction", () => {
    TEST_FIXTURES.transactions.forEach((fixture) => {
      describe(`for a transaction which ${fixture.description}`, () => {
        function interactionBuilder() {
          return new LedgerSignMultisigTransaction(fixture);
        }

        itHasAppMessages(interactionBuilder);

        it("has a message about delays during signing", () => {
          const interaction = interactionBuilder();
          const message = interaction.messageFor({
            state: ACTIVE,
            level: WARNING,
            code: "ledger.sign.delay",
          });
          expect(message).not.toBe(null);
          expect(message?.preProcessingTime).toEqual(
            interaction.preProcessingTime()
          );
          expect(message?.postProcessingTime).toEqual(
            interaction.postProcessingTime()
          );
        });

        if (fixture.segwit) {
          describe("a message about approving the transaction", () => {
            it("for version <1.6.0", () => {
              const interaction = interactionBuilder();
              const message = interaction.messageFor({
                state: ACTIVE,
                level: INFO,
                version: "<1.6.0",
                code: "ledger.sign",
              });
              expect(message).not.toBe(null);
            });

            it("for version >=1.6.0", () => {
              const interaction = interactionBuilder();
              const message = interaction.messageFor({
                state: ACTIVE,
                level: INFO,
                version: ">=1.6.0",
                code: "ledger.sign",
              });
              expect(message).not.toBe(null);
              expect(message?.messages).not.toBeUndefined();
              expect(message?.messages?.length).toEqual(5);
            });
          });
        } else {
          describe("a message about approving the transaction", () => {
            it("for version <1.6.0", () => {
              const interaction = interactionBuilder();
              const message = interaction.messageFor({
                state: ACTIVE,
                level: INFO,
                version: "<1.6.0",
                code: "ledger.sign",
              });
              expect(message).not.toBe(null);
              expect(message?.messages).not.toBeUndefined();
              expect(message?.messages?.length).toEqual(2);
            });

            it("for version >=1.6.0", () => {
              const interaction = interactionBuilder();
              const message = interaction.messageFor({
                state: ACTIVE,
                level: INFO,
                version: ">=1.6.0",
                code: "ledger.sign",
              });
              expect(message).not.toBe(null);
              expect(message?.messages).not.toBeUndefined();
              expect(message?.messages?.length).toEqual(7);
            });
          });
        }

        it("checks signatures include proper SIGHASH byte", () => {
          // Signature format:
          //   first byte signifies DER encoding           (0x30)
          //   second byte is length of signature in bytes (0x03)
          // The string length is however long the signature is minus these two starting bytes
          // plain signature without SIGHASH (foobar is 3 bytes, string length = 6, which is 3 bytes)
          expect(interactionBuilder().parseSignature(["3003foobar"])).toEqual([
            "3003foobar01",
          ]);
          // signature actually ends in 0x01 (foob01 is 3 bytes, string length = 6, which is 3 bytes)
          expect(interactionBuilder().parseSignature(["3003foob01"])).toEqual([
            "3003foob0101",
          ]);
          // signature with sighash already included (foobar is 3 bytes, string length = 8, which is 4 bytes) ...
          // we expect this to chop off the 01 and add it back
          expect(interactionBuilder().parseSignature(["3003foobar01"])).toEqual(
            ["3003foobar01"]
          );
        });
      });
    });

    const tx = TEST_FIXTURES.transactions[0];
    const keyDetails = {
      xfp: ROOT_FINGERPRINT,
      path: "m/45'/1'/100'",
    };
    function psbtInteractionBuilder() {
      return new LedgerSignMultisigTransaction({
        network: tx.network,
        inputs: [],
        outputs: [],
        bip32Paths: [],
        psbt: tx.psbt,
        keyDetails,
      });
    }

    itHasAppMessages(psbtInteractionBuilder);
  });

  describe("LedgerExportExtendedPublicKey", () => {
    function interactionBuilder(bip32Path) {
      return new LedgerExportExtendedPublicKey({
        bip32Path: bip32Path || "m/45'/0'/0'/0/0",
        network: Network.TESTNET,
        includeXFP: true,
      });
    }

    itHasAppMessages(interactionBuilder);
  });

  describe("LedgerSignMessage", () => {
    function interactionBuilder(
      bip32Path = "m/48'/1'/0'/2'/0/0",
      message = "hello world"
    ) {
      return new LedgerSignMessage({
        bip32Path,
        message,
      });
    }

    itHasAppMessages(interactionBuilder);

    it("constructor adds error message on invalid bip32path", () => {
      expect(
        interactionBuilder("m/foo").hasMessagesFor({
          state: PENDING,
          level: ERROR,
          code: "ledger.bip32_path.path_error",
        })
      ).toBe(true);
    });
  });

  function getMockedApp() {
    const mockApp = {
      registerWallet: vi.fn(),
      getWalletAddress: vi.fn(),
      signPsbt: vi.fn(),
      getMasterFingerprint: vi.fn(),
    };

    const mockWithApp = vi.fn().mockImplementation((callback) => {
      return callback(mockApp);
    });
    return [mockApp, mockWithApp];
  }

  function addInteractionMocks(interaction, mockWithApp) {
    vi
      .spyOn(interaction, "isAppSupported")
      .mockReturnValue(Promise.resolve(true));
    vi.spyOn(interaction, "withApp").mockImplementation(mockWithApp);
    vi
      .spyOn(interaction, "withTransport")
      .mockImplementation(() => Promise.resolve(vi.fn));
  }

  describe("LedgerRegisterWalletPolicy", () => {
    let mockApp, mockWithApp;

    beforeEach(() => {
      const [app, withApp] = getMockedApp();
      mockWithApp = withApp;
      mockApp = app;
    });

    afterEach(() => {
      vi.resetAllMocks();
    });

    function interactionBuilder(
      policyHmac?: string,
      verify?: boolean,
      walletConfig = braidDetailsToWalletConfig(
        (<unknown>TEST_FIXTURES.braids[0]) as BraidDetails
      )
    ) {
      const interaction = new LedgerRegisterWalletPolicy({
        ...walletConfig,
        policyHmac,
        verify,
      });
      addInteractionMocks(interaction, mockWithApp);
      return interaction;
    }

    it("returns existing policyHmac if exists and not verifying", async () => {
      const interaction = interactionBuilder("deadbeef", false);
      expect(await interaction.run()).toEqual("deadbeef");
    });

    it("registers braid/wallet with ledger app", async () => {
      const interaction = interactionBuilder();
      const expectedHmac = Buffer.from("deadbeef");
      mockApp.registerWallet.mockReturnValue(
        Promise.resolve([Buffer.from("id"), expectedHmac])
      );
      const result = await interaction.run();
      expect(mockApp.registerWallet).toBeCalledWith(
        interaction.walletPolicy.toLedgerPolicy()
      );
      expect(result).toEqual(expectedHmac.toString("hex"));
    });

    it("verifies against a registration mismatch", async () => {
      console.error = vi.fn();
      const interaction = interactionBuilder("beef", true);
      const expectedHmac = Buffer.from("deadbeef");
      mockApp.registerWallet.mockReturnValue(
        Promise.resolve([Buffer.from("id"), expectedHmac])
      );
      const result = await interaction.run();
      // returns the correct registration value but console errors
      // that there was a mismatch
      expect(console.error).toHaveBeenCalled();
      expect(result).toEqual(expectedHmac.toString("hex"));
    });
  });

  describe("LedgerConfirmMultisigAddress", () => {
    let mockApp, mockWithApp;

    beforeEach(() => {
      const [app, withApp] = getMockedApp();
      mockWithApp = withApp;
      mockApp = app;

      const expectedHmac = Buffer.from("deadbeef");
      mockApp.registerWallet.mockReturnValue(
        Promise.resolve([Buffer.from("id"), expectedHmac])
      );
    });

    afterEach(() => {
      vi.resetAllMocks();
    });

    function interactionBuilder(
      policyHmac?: string,
      expected?: string,
      walletConfig = braidDetailsToWalletConfig(
        (<unknown>TEST_FIXTURES.multisigs[0].braidDetails) as BraidDetails
      ),
      bip32Path = TEST_FIXTURES.multisigs[0].bip32Path
    ) {
      const interaction = new LedgerConfirmMultisigAddress({
        policyHmac,
        expected,
        bip32Path,
        ...walletConfig,
      });
      addInteractionMocks(interaction, mockWithApp);
      return interaction;
    }

    it("registers policy if none passed in and calls address method", async () => {
      const interaction = interactionBuilder();
      const expectedAddress = "payme";
      mockApp.getWalletAddress.mockReturnValue(
        Promise.resolve(expectedAddress)
      );
      const address = await interaction.run();
      expect(mockApp.registerWallet).toHaveBeenCalled();
      expect(mockApp.getWalletAddress).toHaveBeenCalledWith(
        interaction.walletPolicy.toLedgerPolicy(),
        Buffer.from(interaction.POLICY_HMAC, "hex"),
        interaction.braidIndex,
        interaction.addressIndex,
        interaction.display
      );
      expect(address).toEqual(expectedAddress);
    });
  });

  describe("LedgerV2SignMultisigTransaction", () => {
    let expectedSigs: LedgerSignatures[], mockApp, mockWithApp;

    beforeEach(() => {
      const [app, withApp] = getMockedApp();
      mockWithApp = withApp;
      mockApp = app;
      expectedSigs = [
        [
          0,
          {
            pubkey: Buffer.from(fixture.publicKeys[0], "hex"),
            signature: Buffer.from(fixture.signature[0], "hex"),
          },
        ],
      ];
      mockApp.signPsbt.mockReturnValue(Promise.resolve(expectedSigs));
    });

    afterEach(() => {
      vi.resetAllMocks();
    });

    const fixture = TEST_FIXTURES.transactions[0];
    function interactionBuilder(
      policyHmac = fixture.policyHmac,
      walletConfig = braidDetailsToWalletConfig(fixture.braidDetails),
      psbt = fixture.psbt,
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      progressCallback = () => {}
    ) {
      let interaction;
      const options = {
        policyHmac,
        psbt,
        progressCallback,
        ...walletConfig,
      };
      interaction = new LedgerV2SignMultisigTransaction({
        ...options,
        returnSignatureArray: true,
      });
      addInteractionMocks(interaction, mockWithApp);
      return interaction;
    }

    it("signs psbt", async () => {
      const interaction = interactionBuilder();
      const sigs = await interaction.run();
      expect(sigs).toStrictEqual([fixture.signature[0]]);
      // confirming that the psbt used is version 2
      expect(interaction.psbt.PSBT_GLOBAL_VERSION).toBe(2);
      expect(mockApp.signPsbt).toHaveBeenCalledWith(
        interaction.psbt,
        interaction.walletPolicy.toLedgerPolicy(),
        interaction.policyHmac,
        interaction.progressCallback
      );
    });
  });
});
