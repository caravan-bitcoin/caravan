import { Network, TEST_FIXTURES } from "@caravan/bitcoin";

import {
  CustomExportExtendedPublicKey,
  CustomSignMultisigTransaction,
} from "./custom";
import { customFixtures } from "./fixtures/custom.fixtures";
import { INFO, PENDING, ACTIVE, ERROR } from "./interaction";

const { multisigs, transactions } = TEST_FIXTURES;

describe("CustomExportExtendedPublicKey", () => {
  function interactionBuilder({ bip32Path = "", network = "" }) {
    return new CustomExportExtendedPublicKey({
      bip32Path,
      network,
    });
  }

  describe("constructor", () => {
    it("fails with invalid network", () => {
      expect(() => interactionBuilder({ network: "foob" })).toThrow(
        /Unknown network/i,
      );
    });
    it("shows invalid bip32Path unsupported", () => {
      const interaction = interactionBuilder({
        network: Network.TESTNET,
        bip32Path: "m/45'/1/01",
      });
      expect(interaction.isSupported()).toBe(false);
      expect(
        interaction.hasMessagesFor({
          state: PENDING,
          level: ERROR,
          code: "custom.bip32_path.path_error",
        }),
      ).toBe(true);
    });
  });

  describe("parse", () => {
    it("fails when sending in nothing or non json", () => {
      const notJSON = "test";
      const definitelyNotJSON = 77;
      const interaction = interactionBuilder({
        network: Network.TESTNET,
        bip32Path: "m/45'/1/0",
      });
      expect(() => interaction.parse(notJSON)).toThrow(
        /Not a valid ExtendedPublicKey/i,
      );
      expect(() => interaction.parse(definitelyNotJSON)).toThrow(
        /Not a valid ExtendedPublicKey/i,
      );
      expect(() => interaction.parse({})).toThrow(
        /Not a valid ExtendedPublicKey/i,
      );
    });

    it("fails when missing xpub field", () => {
      const interaction = interactionBuilder({
        network: Network.MAINNET,
        bip32Path: "m/45'/1'/0'",
      });
      const missingXpub = {
        ...customFixtures.validCustomTpubJSON,
      };
      Reflect.deleteProperty(missingXpub, "xpub");
      expect(() => interaction.parse(missingXpub)).toThrow(
        /Not a valid ExtendedPublicKey/i,
      );
    });

    it("computes fake rootFingerprint when initialized on testnet", () => {
      const bip32Path = "m/45'/0'/0'";
      const interaction = interactionBuilder({
        network: Network.TESTNET,
        bip32Path,
      });
      const missingXfp = { ...customFixtures.validCustomXpubJSON };
      Reflect.deleteProperty(missingXfp, "rootFingerprint");
      const result = interaction.parse(missingXfp);

      expect(result).toEqual(customFixtures.validXpubFakeRootFingerprintOutput);
    });

    it("computes fake rootFingerprint when initialized on mainnet", () => {
      const bip32Path = "m/45'/1'/0'";
      const interaction = interactionBuilder({
        network: Network.TESTNET,
        bip32Path,
      });
      const missingXfp = { ...customFixtures.validCustomTpubJSON };
      Reflect.deleteProperty(missingXfp, "rootFingerprint");
      const result = interaction.parse(missingXfp);

      expect(result).toEqual(customFixtures.validTpubFakeRootFingerprintOutput);
    });

    it("throws error on invalid rootFingerprint", () => {
      const bip32Path = "m/45'/1'/0'";
      const interaction = interactionBuilder({
        network: Network.TESTNET,
        bip32Path,
      });
      expect(() =>
        interaction.parse({
          xpub: customFixtures.validCustomTpubJSON.xpub,
          rootFingerprint: "zzzz",
        }),
      ).toThrow(/Root fingerprint validation error/i);
    });

    it("throws error as bip32 depth does not match depth in provided xpub", () => {
      let bip32Path = "m/45'";
      const interaction = interactionBuilder({
        network: Network.TESTNET,
        bip32Path,
      });

      expect(() =>
        interaction.parse(customFixtures.validCustomTpubJSON),
      ).toThrow(/does not match depth of BIP32 path/i);
    });

    it("throws error as bip32 depth does not match depth in provided xpub (and bip32 missing m/ for whatever reason)", () => {
      let bip32Path = "45'/0'";
      const interaction = interactionBuilder({
        network: Network.TESTNET,
        bip32Path,
      });

      expect(() =>
        interaction.parse(customFixtures.validCustomTpubJSON),
      ).toThrow(/does not match depth of BIP32 path/i);
    });
  });

  it("has a message about uploading file", () => {
    expect(
      interactionBuilder({
        network: Network.TESTNET,
        bip32Path: "m/45'",
      }).hasMessagesFor({
        state: PENDING,
        level: INFO,
        code: "custom.import_xpub",
        text: "Type or paste the extended public key here.",
      }),
    ).toBe(true);
  });
});

describe("CustomSignMultisigTransaction", () => {
  const testMultisig = multisigs[0];
  const testTx = transactions[0];
  function interactionBuilder({
    network = "",
    inputs = "",
    outputs = "",
    bip32Paths = "",
    psbt = "",
  }) {
    return new CustomSignMultisigTransaction({
      network,
      inputs,
      outputs,
      bip32Paths,
      psbt,
    });
  }
  describe("constructor", () => {
    it("fails when sending in no psbt", () => {
      expect(() => interactionBuilder({})).toThrow(/Unable to build the PSBT/i);
    });
  });

  describe("request", () => {
    it("returns psbt if there is one", () => {
      const interaction = interactionBuilder({
        network: Network.TESTNET,
        psbt: testMultisig.psbt,
      });
      const result = interaction.request();
      expect(result).toEqual(testMultisig.psbt);
    });

    it("constructs psbt if there is not one", () => {
      const interaction = interactionBuilder({
        network: testTx.network,
        inputs: testTx.inputs,
        outputs: testTx.outputs,
        bip32Paths: testTx.bip32Paths,
      });
      const result = interaction.request().data.toBase64();
      expect(result).toEqual(testTx.psbt);
    });
  });

  describe("parse", () => {
    it("returns multi input, single signature set", () => {
      const interaction = interactionBuilder({
        psbt: testMultisig.psbtPartiallySigned,
      });
      const result = interaction.parse(testMultisig.psbtPartiallySigned);
      const signatureSet = {};
      signatureSet[testMultisig.publicKey] = testMultisig.transaction.signature;
      expect(result).toEqual(signatureSet);
      expect(Object.keys(result).length).toEqual(1);
    });
    it("throws error as psbt has no signatures", () => {
      const interaction = interactionBuilder({ psbt: testMultisig.psbt });
      expect(() => interaction.parse(testMultisig.psbt)).toThrow(
        /No signatures found/i,
      );
    });
  });

  it("has a message about downloading psbt", () => {
    expect(
      interactionBuilder({
        network: Network.TESTNET,
        psbt: testMultisig.psbt,
      }).hasMessagesFor({
        state: PENDING,
        level: INFO,
        code: "custom.download_psbt",
        text: "Download and save this PSBT file.",
      }),
    ).toBe(true);
  });
  it("has a message about signing psbt", () => {
    expect(
      interactionBuilder({
        network: Network.TESTNET,
        psbt: testMultisig.psbt,
      }).hasMessagesFor({
        state: PENDING,
        level: INFO,
        code: "custom.sign_psbt",
        text: `Add your signature to the PSBT.`,
      }),
    ).toBe(true);
  });
  it("has a message about verify tx", () => {
    expect(
      interactionBuilder({
        network: Network.TESTNET,
        psbt: testMultisig.psbt,
      }).hasMessagesFor({
        state: ACTIVE,
        level: INFO,
        code: "custom.sign_psbt",
        text: "Verify the transaction details and sign.",
      }),
    ).toBe(true);
  });
  it("has a message about upload PSBT", () => {
    expect(
      interactionBuilder({
        network: Network.TESTNET,
        psbt: testMultisig.psbt,
      }).hasMessagesFor({
        state: ACTIVE,
        level: INFO,
        code: "custom.upload_signed_psbt",
        text: "Upload the signed PSBT.",
      }),
    ).toBe(true);
  });
});
