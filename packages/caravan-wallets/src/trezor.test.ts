import {
  ROOT_FINGERPRINT,
  TEST_FIXTURES,
  PSBT_MAGIC_B64,
  networkData,
  Network,
} from "@caravan/bitcoin";
import TrezorConnect from "@trezor/connect-web";
import { ECPair, payments } from "bitcoinjs-lib";

import { PENDING, ACTIVE, INFO, ERROR } from "./interaction";
import {
  trezorCoin,
  TrezorInteraction,
  TrezorGetMetadata,
  TrezorExportHDNode,
  TrezorExportPublicKey,
  TrezorExportExtendedPublicKey,
  TrezorSignMultisigTransaction,
  TrezorConfirmMultisigAddress,
  TrezorSignMessage,
} from "./trezor";

function itHasStandardMessages(interactionBuilder) {
  it("has a message about ensuring your device is plugged in", () => {
    expect(
      interactionBuilder().hasMessagesFor({
        state: PENDING,
        level: INFO,
        code: "device.connect",
        text: "plugged in",
      }),
    ).toBe(true);
  });

  it("has a message about the TrezorConnect popup and enabling popups", () => {
    expect(
      interactionBuilder().hasMessagesFor({
        state: ACTIVE,
        level: INFO,
        code: "trezor.connect.generic",
        text: "enabled popups",
      }),
    ).toBe(true);
  });
}

function itThrowsAnErrorOnAnUnsuccessfulRequest(interactionBuilder) {
  it("throws an error on an unsuccessful request", async () => {
    const interaction = interactionBuilder();
    interaction.connectParams = () => [
      () => ({
        success: false,
        payload: { error: "foobar" },
      }),
      {},
    ];
    try {
      await interaction.run();
    } catch (e: any) {
      expect(e.message).toMatch(/foobar/i);
    }
  });
}

describe("trezor", () => {
  describe("TrezorInteraction", () => {
    function interactionBuilder() {
      return new TrezorInteraction({ network: Network.MAINNET });
    }

    itHasStandardMessages(interactionBuilder);
    itThrowsAnErrorOnAnUnsuccessfulRequest(interactionBuilder);

    it("sets the default method to throw an error", async () => {
      try {
        await interactionBuilder().run();
      } catch (e: any) {
        expect(e.message).toMatch(/subclass of TrezorInteraction/i);
      }
    });
  });

  describe("TrezorGetMetadata", () => {
    function interactionBuilder() {
      return new TrezorGetMetadata();
    }

    itHasStandardMessages(interactionBuilder);
    itThrowsAnErrorOnAnUnsuccessfulRequest(interactionBuilder);

    it("parses metadata", () => {
      expect(
        interactionBuilder().parsePayload({
          bootloader_hash: "5112...846e9",
          bootloader_mode: null,
          device_id: "BDF9...F198",
          firmware_present: null,
          flags: 0,
          fw_major: null,
          fw_minor: null,
          fw_patch: null,
          fw_vendor: null,
          fw_vendor_keys: null,
          imported: false,
          initialized: true,
          label: "My Trezor",
          language: null,
          major_version: 1,
          minor_version: 6,
          model: "1",
          needs_backup: false,
          no_backup: null,
          passphrase_cached: false,
          passphrase_protection: false,
          patch_version: 3,
          pin_cached: true,
          pin_protection: true,
          revision: "ef8...862d7",
          unfinished_backup: null,
          vendor: "bitcointrezor.com",
        }),
      ).toEqual({
        spec: "Model 1 v.1.6.3 w/PIN",
        model: "Model 1",
        version: {
          major: 1,
          minor: 6,
          patch: 3,
          string: "1.6.3",
        },
        label: "My Trezor",
        pin: true,
        passphrase: false,
      });
    });

    it("uses TrezorConnect.getFeatures", () => {
      const interaction = interactionBuilder();
      const [method, params] = interaction.connectParams();
      expect(method).toEqual(TrezorConnect.getFeatures);
      expect(params as any).toEqual({});
    });
  });

  describe("TrezorExportHDNode", () => {
    const bip32Path = "m/45'/0'/0'/0'";

    function interactionBuilder() {
      return new TrezorExportHDNode({
        bip32Path,
        network: Network.MAINNET,
      });
    }

    itHasStandardMessages(interactionBuilder);
    itThrowsAnErrorOnAnUnsuccessfulRequest(interactionBuilder);

    it("constructor adds error message on invalid bip32path", () => {
      const interaction = new TrezorExportHDNode({
        bip32Path: "m/foo",
        network: Network.MAINNET,
      });
      expect(
        interaction.hasMessagesFor({
          state: PENDING,
          level: ERROR,
          code: "trezor.bip32_path.path_error",
        }),
      ).toBe(true);
    });

    it("adds error message on bip32path <depth3", () => {
      const interaction = new TrezorExportHDNode({
        bip32Path: "m/45",
        network: Network.MAINNET,
      });
      expect(
        interaction.hasMessagesFor({
          state: PENDING,
          level: ERROR,
          code: "trezor.bip32_path.minimum",
        }),
      ).toBe(true);
    });

    it("uses TrezorConnect.getPublicKey", () => {
      const interaction = interactionBuilder();
      const [method, params] = interaction.connectParams();
      expect(method).toEqual(TrezorConnect.getPublicKey);
      expect((params as any).path).toEqual(bip32Path);
      expect((params as any).coin).toEqual(trezorCoin(Network.MAINNET));
      expect((params as any).crossChain).toBe(true);
    });
  });

  describe("TrezorExportPublicKey", () => {
    const bip32Path = "m/45'/0'/0'/0'";

    function interactionBuilder() {
      return new TrezorExportPublicKey({
        bip32Path,
        network: Network.MAINNET,
      });
    }

    itHasStandardMessages(interactionBuilder);
    itThrowsAnErrorOnAnUnsuccessfulRequest(interactionBuilder);

    it("parses out the public key from the response payload", () => {
      expect(
        interactionBuilder().parsePayload({ publicKey: "foobar" }),
      ).toEqual("foobar");
    });

    it("uses TrezorConnect.getPublicKey", () => {
      const interaction = interactionBuilder();
      const [method, params] = interaction.connectParams();
      expect(method).toEqual(TrezorConnect.getPublicKey);
      expect((params as any).path).toEqual(bip32Path);
      expect((params as any).coin).toEqual(trezorCoin(Network.MAINNET));
      expect((params as any).crossChain).toBe(true);
    });
  });

  describe("TrezorExportExtendedPublicKey", () => {
    const bip32Path = "m/45'/0'/0'/0'";

    function interactionBuilder() {
      return new TrezorExportExtendedPublicKey({
        bip32Path,
        network: Network.MAINNET,
      });
    }

    itHasStandardMessages(interactionBuilder);
    itThrowsAnErrorOnAnUnsuccessfulRequest(interactionBuilder);

    it("parses out the extended public key from the response payload", () => {
      expect(interactionBuilder().parsePayload({ xpub: "foobar" })).toEqual(
        "foobar",
      );
    });

    it("uses TrezorConnect.getPublicKey", () => {
      const interaction = interactionBuilder();
      const [method, params] = interaction.connectParams();
      expect(method).toEqual(TrezorConnect.getPublicKey);
      expect((params as any).path).toEqual(bip32Path);
      expect((params as any).coin).toEqual(trezorCoin(Network.MAINNET));
      expect((params as any).crossChain).toBe(true);
    });
  });

  describe("TrezorSignMultisigTransaction", () => {
    TEST_FIXTURES.transactions.forEach((fixture) => {
      describe(`signing for a transaction which ${fixture.description}`, () => {
        function interactionBuilder() {
          return new TrezorSignMultisigTransaction(fixture);
        }

        itHasStandardMessages(interactionBuilder);
        itThrowsAnErrorOnAnUnsuccessfulRequest(interactionBuilder);

        it("parses out the signatures from the response payload", () => {
          // Signature format:
          //   first byte signifies DER encoding           (0x30)
          //   second byte is length of signature in bytes (0x03)
          // The string length is however long the signature is minus these two starting bytes
          // plain signature without SIGHASH (foobar is 3 bytes, string length = 6, which is 3 bytes)
          expect(
            interactionBuilder().parsePayload({ signatures: ["3003foobar"] }),
          ).toEqual(["3003foobar01"]);
          // signature actually ends in 0x01 (foob01 is 3 bytes, string length = 6, which is 3 bytes)
          expect(
            interactionBuilder().parsePayload({ signatures: ["3003foob01"] }),
          ).toEqual(["3003foob0101"]);
          // signature with sighash already included (foobar is 3 bytes, string length = 8, which is 4 bytes) ...
          // we expect this to chop off the 01 and add it back
          expect(
            interactionBuilder().parsePayload({ signatures: ["3003foobar01"] }),
          ).toEqual(["3003foobar01"]);
        });

        it("uses TrezorConnect.signTransaction", () => {
          const interaction = interactionBuilder();
          const [method, params] = interaction.connectParams();
          expect(method).toEqual(TrezorConnect.signTransaction);
          expect((params as any).coin).toEqual(trezorCoin(fixture.network));
          expect((params as any).inputs.length).toEqual(fixture.inputs.length);
          expect((params as any).outputs.length).toEqual(
            fixture.outputs.length,
          );
          // FIXME check inputs & output details
        });
      });
    });

    function psbtInteractionBuilder(
      tx,
      keyDetails,
      returnSignatureArray,
      addressType,
    ) {
      return new TrezorSignMultisigTransaction({
        network: tx.network,
        inputs: [],
        outputs: [],
        bip32Paths: [],
        psbt: tx.psbt,
        keyDetails,
        returnSignatureArray,
        addressType,
      });
    }

    it("uses TrezorConnect.signTransaction via PSBT for testnet P2SH tx", () => {
      const tx = TEST_FIXTURES.transactions[0]; // TESTNET_P2SH
      const keyDetails = {
        xfp: ROOT_FINGERPRINT,
        path: "m/45'/1'/100'",
      };
      const interaction = psbtInteractionBuilder(
        tx,
        keyDetails,
        false,
        tx.braidDetails.addressType,
      );
      const [method, params] = interaction.connectParams();
      expect(method).toEqual(TrezorConnect.signTransaction);
      expect((params as any).coin).toEqual(trezorCoin(tx.network));
      expect((params as any).inputs.length).toEqual(tx.inputs.length);
      expect((params as any).outputs.length).toEqual(tx.outputs.length);

      expect(interaction.parsePayload({ signatures: tx.signature })).toContain(
        PSBT_MAGIC_B64,
      );
    });

    it("uses TrezorConnect.signTransaction via PSBT for mainnet P2SH tx", () => {
      const tx = TEST_FIXTURES.transactions[3]; // MAINNET_P2SH
      const keyDetails = {
        xfp: ROOT_FINGERPRINT,
        path: "m/45'/0'/100'",
      };
      const interaction = psbtInteractionBuilder(
        tx,
        keyDetails,
        true,
        tx.braidDetails.addressType,
      );
      const [method, params] = interaction.connectParams();
      expect(method).toEqual(TrezorConnect.signTransaction);
      expect((params as any).coin).toEqual(trezorCoin(tx.network));
      expect((params as any).inputs.length).toEqual(tx.inputs.length);
      expect((params as any).outputs.length).toEqual(tx.outputs.length);
      expect(
        interaction.parsePayload({ signatures: ["3003foobar01"] }),
      ).toEqual(["3003foobar01"]);
    });
  });

  describe("TrezorConfirmMultisigAddress", () => {
    let TMP_FIXTURES = JSON.parse(JSON.stringify(TEST_FIXTURES));

    TMP_FIXTURES.multisigs.forEach((fixture) => {
      Reflect.deleteProperty(fixture, "publicKey");
      describe(`displaying a ${fixture.description}`, () => {
        function interactionBuilder() {
          return new TrezorConfirmMultisigAddress(fixture);
        }

        itHasStandardMessages(interactionBuilder);
        itThrowsAnErrorOnAnUnsuccessfulRequest(interactionBuilder);

        it("uses TrezorConnect.getAddress without a public key", () => {
          const interaction = interactionBuilder();
          const [method, params] = interaction.connectParams();
          expect(method).toEqual(TrezorConnect.getAddress);
          expect((params as any).path).toEqual(fixture.bip32Path);
          expect((params as any).address).toEqual(fixture.address);
          expect((params as any).showOnTrezor).toBe(true);
          expect((params as any).coin).toEqual(trezorCoin(fixture.network));
          expect((params as any).crossChain).toBe(true);
          // FIXME check multisig details
        });
      });
    });

    TEST_FIXTURES.multisigs.forEach((fixture) => {
      describe(`displaying a ${fixture.description}`, () => {
        function interactionBuilder() {
          return new TrezorConfirmMultisigAddress(fixture);
        }

        itHasStandardMessages(interactionBuilder);
        itThrowsAnErrorOnAnUnsuccessfulRequest(interactionBuilder);

        it("uses TrezorConnect.getAddress with a public key", () => {
          const interaction = interactionBuilder();
          const [method, params] = interaction.connectParams();
          expect(method).toEqual(TrezorConnect.getAddress);
          expect((params as any).bundle[0].path).toEqual(fixture.bip32Path);
          expect((params as any).bundle[0].showOnTrezor).toBe(false);
          expect((params as any).bundle[0].coin).toEqual(
            trezorCoin(fixture.network),
          );
          expect((params as any).bundle[0].crossChain).toBe(true);
          expect((params as any).bundle[1].path).toEqual(fixture.bip32Path);
          expect((params as any).bundle[1].address).toEqual(fixture.address);
          expect((params as any).bundle[1].showOnTrezor).toBe(true);
          expect((params as any).bundle[1].coin).toEqual(
            trezorCoin(fixture.network),
          );
          expect((params as any).bundle[1].crossChain).toBe(true);
          // FIXME check multisig details
        });
      });
    });

    describe(`parsePayload`, () => {
      TEST_FIXTURES.multisigs.forEach((fixture) => {
        it("passes through payload if payload address matches addresses for the public key", () => {
          function createAddress(publicKey, network) {
            const keyPair = ECPair.fromPublicKey(Buffer.from(publicKey, "hex"));
            const { address } = payments.p2pkh({
              pubkey: keyPair.publicKey,
              network: networkData(network),
            });
            return address;
          }

          const interaction = new TrezorConfirmMultisigAddress(fixture);
          const address = createAddress(fixture.publicKey, fixture.network);
          const payload = [{ address }, { address }];
          const result = interaction.parsePayload(payload);
          expect(result).toEqual(payload);
        });
        it("errors if payload has no matching address", () => {
          const interaction = new TrezorConfirmMultisigAddress(fixture);
          const payload = [
            { address: "not matching" },
            { address: "not matching" },
          ];
          expect(() => {
            interaction.parsePayload(payload);
          }).toThrow("Wrong public key specified");
        });
      });

      it("passes through payload if there's no public key", () => {
        const fixture = TEST_FIXTURES.multisigs[0];
        const fixtureCopy = { ...fixture };
        Reflect.deleteProperty(fixtureCopy, "publicKey");
        const interaction = new TrezorConfirmMultisigAddress(fixtureCopy);
        const payload = [];
        const result = interaction.parsePayload(payload);
        expect(result).toEqual(payload);
      });
    });
  });

  describe("TrezorSignMessage", () => {
    const _bip32Path = "m/45'/0'/0'/0'";

    function interactionBuilder(bip32Path = "", message = "") {
      return new TrezorSignMessage({
        network: Network.MAINNET,
        bip32Path: bip32Path || _bip32Path,
        message: message || "hello world",
      });
    }

    itHasStandardMessages(interactionBuilder);
    itThrowsAnErrorOnAnUnsuccessfulRequest(interactionBuilder);

    it("constructor adds error message on invalid bip32path", () => {
      const interaction = new TrezorSignMessage({
        bip32Path: "m/foo",
        network: Network.MAINNET,
      });
      expect(
        interaction.hasMessagesFor({
          state: PENDING,
          level: ERROR,
          code: "trezor.bip32_path.path_error",
        }),
      ).toBe(true);
    });

    it("uses TrezorConnect.signMessage", () => {
      const interaction = interactionBuilder();
      const [method, params] = interaction.connectParams();
      expect(method).toEqual(TrezorConnect.signMessage);
      expect((params as any).path).toEqual(_bip32Path);
    });
  });
});

//     describe("Test interactions.", () => {
//         describe("Test public key export interactions.", () => {

//             const interaction = new TrezorExportPublicKey({network: NETWORKS.TESTNET, bip32Path: "m/45'/1'/0'/1"});

//             it("should properly report messages for wallet state active", () => {
//                 //const actives =
//                 interaction.messagesFor({state:"active", excludeCodes: ["bip32"]});
//                 // console.log(actives); // TODO: what to test for
//             })

//             it("should properly report messages for wallet state pending", () => {
//                 //const pendings =
//                 interaction.messagesFor({state:"pending", excludeCodes: ["bip32"]});
//                 // console.log(pendings); // TODO: what to test for
//             })

//             it("should not report error for a valid state", () => {
//                 const hasError = interaction.hasMessagesFor({state:"active", level: 'error', code: "bip32"});
//                 expect(hasError).toBe(false);
//             })

//             const badInteraction = new TrezorExportPublicKey({network: NETWORKS.TESTNET, bip32Path: "m/45'/1"});
//             it("should not report error for not meeting the minimum path length for wallet state active", () => {
//                 const hasError = badInteraction.hasMessagesFor({state:"active", level: 'error', code: "trezor.bip32_path.minimum"});
//                 expect(hasError).toBe(false);
//             })

//             it("should properly report error for not meeting the minimum path length for wallet state pending", () => {
//                 const hasError = badInteraction.hasMessagesFor({state:"pending", level: 'error', code: "trezor.bip32_path.minimum"});
//                 expect(hasError).toBe(true);
//             })

//             const interactionTestPathMAINNET = new TrezorExportPublicKey({network: NETWORKS.MAINNET, bip32Path: "m/45'/1'/0'/1"});
//             it("should properly report warning for a testnet derivation path on mainnet for wallet state pending", () => {
//                 const hasWarning = interactionTestPathMAINNET.hasMessagesFor({state:"active", level: 'warning', code: "trezor.bip32_path.mismatch"});
//                 expect(hasWarning).toBe(true);
//             })

//             const interactionMainPathTESTNET = new TrezorExportPublicKey({network: NETWORKS.TESTNET, bip32Path: "m/45'/0'/0'/1"});
//             it("should properly report warning for a mainnet derivation path on testnet for wallet state pending", () => {
//                 const hasWarning = interactionMainPathTESTNET.hasMessagesFor({state:"active", level: 'warning', code: "trezor.bip32_path.mismatch"});
//                 expect(hasWarning).toBe(true);
//             })

//             const interactionTestPathTESTNET = new TrezorExportPublicKey({network: NETWORKS.TESTNET, bip32Path: "m/45'/1'/0'/1"});
//             it("should not report an error for correctly matching derivation path on testnet", () => {
//                 const hasError = interactionTestPathTESTNET.hasMessagesFor({state:"pending", level: 'error', code: "trezor.bip32_path.mismatch"});
//                 expect(hasError).toBe(false);
//             })

//             const interactionMainPathMAINNET = new TrezorExportPublicKey({network: NETWORKS.MAINNET, bip32Path: "m/45'/0'/0'/1"});
//             it("should not report an error for correctly matching derivation path on mainnet", () => {
//                 const hasError = interactionMainPathMAINNET.hasMessagesFor({state:"pending", level: 'error', code: "trezor.bip32_path.mismatch"});
//                 expect(hasError).toBe(false);
//             })

//         })
//     })
