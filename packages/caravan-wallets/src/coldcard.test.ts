import { Network, TEST_FIXTURES, ROOT_FINGERPRINT } from "@caravan/bitcoin";

import {
  ColdcardExportPublicKey,
  ColdcardExportExtendedPublicKey,
  ColdcardSignMultisigTransaction,
  ColdcardMultisigWalletConfig,
} from "./coldcard";
import { coldcardFixtures } from "./fixtures/coldcard.fixtures";
import { INFO, PENDING, ACTIVE, ERROR } from "./interaction";

const { multisigs, transactions } = TEST_FIXTURES;

const { nodes } = TEST_FIXTURES.keys.open_source;

describe("ColdcardExportPublicKey", () => {
  function interactionBuilder({ bip32Path = "", network = "" }) {
    return new ColdcardExportPublicKey({
      bip32Path,
      network,
    });
  }

  describe("constructor", () => {
    it("fails with invalid network", () => {
      expect(() => interactionBuilder({ network: "foo" })).toThrow(
        /Unknown network/i,
      );
    });
    it("unknown chroot unsupported", () => {
      const interaction = interactionBuilder({
        network: Network.TESTNET,
        bip32Path: "m/44'/0",
      });
      expect(interaction.isSupported()).toBe(false);
      expect(
        interaction.hasMessagesFor({
          state: PENDING,
          level: ERROR,
          code: "coldcard.bip32_path.unknown_chroot_error",
        }),
      ).toBe(true);
    });
    it("invalid bip32Path unsupported", () => {
      const interaction = interactionBuilder({
        network: Network.TESTNET,
        bip32Path: "m/45'/1/01",
      });
      expect(interaction.isSupported()).toBe(false);
      expect(
        interaction.hasMessagesFor({
          state: PENDING,
          level: ERROR,
          code: "coldcard.bip32_path.path_error",
        }),
      ).toBe(true);
    });
    it("hardened after unhardened unsupported", () => {
      const interaction = interactionBuilder({
        network: Network.TESTNET,
        bip32Path: "m/45'/1/1'",
      });
      expect(interaction.isSupported()).toBe(false);
      expect(
        interaction.hasMessagesFor({
          state: PENDING,
          level: ERROR,
          code: "coldcard.bip32_path.no_hardened_relative_path_error",
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
      expect(() => interaction.parse(notJSON)).toThrow(/Unable to parse JSON/i);
      expect(() => interaction.parse(definitelyNotJSON)).toThrow(
        /Not valid JSON/i,
      );
      expect(() => interaction.parse({})).toThrow(/Empty JSON file/i);
      expect(() =>
        interaction.parse({
          xpubJSONFile: coldcardFixtures.invalidColdcardXpubJSON,
        }),
      ).toThrow(/Missing required params/i);
    });

    it("missing xpub", () => {
      const interaction = interactionBuilder({
        network: Network.MAINNET,
        bip32Path: "m/45'/0/0",
      });
      const missingXpub = { ...coldcardFixtures.validColdcardXpubJSON };
      Reflect.deleteProperty(missingXpub, "p2sh");
      expect(() => interaction.parse(missingXpub)).toThrow(
        /Missing required params/i,
      );
    });
    it("missing bip32path", () => {
      const interaction = interactionBuilder({
        network: Network.TESTNET,
        bip32Path: "m/45'/1/0",
      });
      const missingb32 = { ...coldcardFixtures.validColdcardXpubJSON };
      Reflect.deleteProperty(missingb32, "p2sh_deriv");
      expect(() => interaction.parse(missingb32)).toThrow(
        /Missing required params/i,
      );
    });
    it("xfp in file and computed xfp don't match", () => {
      const interaction = interactionBuilder({
        network: Network.TESTNET,
        bip32Path: "m/45'/1/0",
      });
      const reallyMissingXFP = { ...coldcardFixtures.validColdcardXpubJSON };
      //set to a valid depth>1 xpub
      reallyMissingXFP.xfp = "12341234";
      expect(() => interaction.parse(reallyMissingXFP)).toThrow(
        /Computed fingerprint does not match/i,
      );
    });
    it("missing xfp but passes bc depth is 1", () => {
      const bip32Path = "m/45'";
      const interaction = interactionBuilder({
        network: Network.TESTNET,
        bip32Path,
      });
      const missingXFP = { ...coldcardFixtures.validColdcardXpubJSON };
      Reflect.deleteProperty(missingXFP, "xfp");
      expect(interaction.isSupported()).toEqual(true);
      const result = interaction.parse(missingXFP);
      expect(result).toEqual({
        rootFingerprint: ROOT_FINGERPRINT,
        publicKey: nodes[bip32Path].pub,
        bip32Path,
      });
    });
    it("no xfp and depth>1 xpub", () => {
      const interaction = interactionBuilder({
        network: Network.TESTNET,
        bip32Path: "m/45'/1/0",
      });
      const reallyMissingXFP = { ...coldcardFixtures.validColdcardXpubJSON };
      Reflect.deleteProperty(reallyMissingXFP, "xfp");
      //set to a valid depth>1 xpub
      reallyMissingXFP.p2sh = nodes["m/45'/0'/0'"].tpub;
      expect(() => interaction.parse(reallyMissingXFP)).toThrow(/No xfp/i);
    });
    it("xfp and depth>1 xpub", () => {
      const bip32Path = "m/48'/1'/0'/1'/0/0";
      const interaction = interactionBuilder({
        network: Network.TESTNET,
        bip32Path,
      });
      const deeperXPUB = { ...coldcardFixtures.validColdcardXpubJSON };
      deeperXPUB.p2sh = coldcardFixtures.validColdcardXpubJSON.p2wsh_p2sh;
      expect(interaction.isSupported()).toEqual(true);
      const result = interaction.parse(deeperXPUB);
      expect(result).toEqual({
        publicKey: nodes[bip32Path].pub,
        bip32Path,
        rootFingerprint: nodes[bip32Path].rootFingerprint,
      });
    });
    it("success for valid JSON via Network.TESTNET", () => {
      const bip32Path = "m/45'";
      const interaction = interactionBuilder({
        network: Network.TESTNET,
        bip32Path,
      });
      expect(interaction.isSupported()).toEqual(true);
      const result = interaction.parse(
        coldcardFixtures.validColdcardXpubNewFirmwareJSON,
      );
      expect(result).toEqual({
        rootFingerprint: ROOT_FINGERPRINT,
        publicKey: nodes[bip32Path].pub,
        bip32Path,
      });
    });
    it("success for valid JSON via Network.MAINNET", () => {
      const bip32Path = "m/45'";
      const interaction = interactionBuilder({
        network: Network.MAINNET,
        bip32Path,
      });
      expect(interaction.isSupported()).toEqual(true);
      const result = interaction.parse(
        coldcardFixtures.validColdcardXpubMainnetJSON,
      );
      expect(result).toEqual({
        rootFingerprint: ROOT_FINGERPRINT,
        publicKey: nodes[bip32Path].pub,
        bip32Path,
      });
    });
    it("derive down to depth 2 unhardened", () => {
      let b32Path = "m/45'/0";
      const interaction = interactionBuilder({
        network: Network.TESTNET,
        bip32Path: b32Path,
      });
      expect(interaction.isSupported()).toEqual(true);
      const result = interaction.parse(coldcardFixtures.validColdcardXpubJSON);
      expect(result.rootFingerprint).toEqual(ROOT_FINGERPRINT);
      expect(result.publicKey).toEqual(nodes["m/45'/0"].pub);
    });
    it("derive down to depth 3 unhardened", () => {
      let b32Path = "m/45'/1/0";
      const interaction = interactionBuilder({
        network: Network.TESTNET,
        bip32Path: b32Path,
      });
      expect(interaction.isSupported()).toEqual(true);
      const result = interaction.parse(coldcardFixtures.validColdcardXpubJSON);
      expect(result.rootFingerprint).toEqual(ROOT_FINGERPRINT);
      expect(result.publicKey).toEqual(nodes["m/45'/1/0"].pub);
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
        code: "coldcard.upload_key",
        text: "Upload the JSON file",
      }),
    ).toBe(true);
  });
  it("has a message about selecting 0 for account ", () => {
    expect(
      interactionBuilder({
        network: Network.TESTNET,
        bip32Path: "m/45'",
      }).hasMessagesFor({
        state: PENDING,
        level: INFO,
        code: "coldcard.select_account",
        text: "Enter 0 for account",
      }),
    ).toBe(true);
  });
  it("has a message about exporting xpub", () => {
    expect(
      interactionBuilder({
        network: Network.TESTNET,
        bip32Path: "m/45'",
      }).hasMessagesFor({
        state: PENDING,
        level: INFO,
        code: "coldcard.export_xpub",
        text: "Settings > Multisig Wallets > Export XPUB",
      }),
    ).toBe(true);
  });
});

describe("ColdcardExportExtendedPublicKey", () => {
  function interactionBuilder({ bip32Path = "", network = "" }) {
    return new ColdcardExportExtendedPublicKey({
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

    it("unknown chroot unsupported", () => {
      const interaction = interactionBuilder({
        network: Network.TESTNET,
        bip32Path: "m/44'/0",
      });
      expect(interaction.isSupported()).toBe(false);
      expect(
        interaction.hasMessagesFor({
          state: PENDING,
          level: ERROR,
          code: "coldcard.bip32_path.unknown_chroot_error",
        }),
      ).toBe(true);
    });
    it("invalid bip32Path unsupported", () => {
      const interaction = interactionBuilder({
        network: Network.TESTNET,
        bip32Path: "m/45'/1/01",
      });
      expect(interaction.isSupported()).toBe(false);
      expect(
        interaction.hasMessagesFor({
          state: PENDING,
          level: ERROR,
          code: "coldcard.bip32_path.path_error",
        }),
      ).toBe(true);
    });
    it("hardened after unhardened unsupported", () => {
      const interaction = interactionBuilder({
        network: Network.TESTNET,
        bip32Path: "m/45'/1/1'",
      });
      expect(interaction.isSupported()).toBe(false);
      expect(
        interaction.hasMessagesFor({
          state: PENDING,
          level: ERROR,
          code: "coldcard.bip32_path.no_hardened_relative_path_error",
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
      expect(() => interaction.parse(notJSON)).toThrow(/Unable to parse JSON/i);
      expect(() => interaction.parse(definitelyNotJSON)).toThrow(
        /Not valid JSON/i,
      );
      expect(() => interaction.parse({})).toThrow(/Empty JSON file/i);
    });

    it("missing xpub", () => {
      const interaction = interactionBuilder({
        network: Network.MAINNET,
        bip32Path: "m/45'/0/0",
      });
      const missingXpub = { ...coldcardFixtures.validColdcardXpubJSON };
      Reflect.deleteProperty(missingXpub, "p2sh");
      expect(() => interaction.parse(missingXpub)).toThrow(
        /Missing required params/i,
      );
    });
    it("missing bip32path", () => {
      const interaction = interactionBuilder({
        network: Network.TESTNET,
        bip32Path: "m/45'/1/0",
      });
      const missingb32 = { ...coldcardFixtures.validColdcardXpubJSON };
      Reflect.deleteProperty(missingb32, "p2sh_deriv");
      expect(() => interaction.parse(missingb32)).toThrow(
        /Missing required params/i,
      );
    });
    it("xfp in file and computed xfp don't match", () => {
      const interaction = interactionBuilder({
        network: Network.TESTNET,
        bip32Path: "m/45'/1/0",
      });
      const reallyMissingXFP = { ...coldcardFixtures.validColdcardXpubJSON };
      //set to a valid depth>1 xpub
      reallyMissingXFP.xfp = "12341234";
      expect(() => interaction.parse(reallyMissingXFP)).toThrow(
        /Computed fingerprint does not match/i,
      );
    });
    it("missing xfp but passes", () => {
      const bip32Path = "m/45'";
      const interaction = interactionBuilder({
        network: Network.TESTNET,
        bip32Path,
      });
      const missingXFP = { ...coldcardFixtures.validColdcardXpubJSON };
      Reflect.deleteProperty(missingXFP, "xfp");
      expect(interaction.isSupported()).toEqual(true);
      const result = interaction.parse(missingXFP);
      expect(result).toEqual({
        rootFingerprint: ROOT_FINGERPRINT,
        xpub: nodes[bip32Path].tpub,
        bip32Path,
      });
    });
    it("no xfp and depth>1 xpub", () => {
      const interaction = interactionBuilder({
        network: Network.TESTNET,
        bip32Path: "m/45'/1/0",
      });
      const reallyMissingXFP = { ...coldcardFixtures.validColdcardXpubJSON };
      Reflect.deleteProperty(reallyMissingXFP, "xfp");
      //set to a valid depth>1 xpub
      reallyMissingXFP.p2sh =
        "tpubDD7afgqjwFtnyu3YuReivwoGuJNyXNjFw5y9m4QDchpGzjgGuWhQUbBXafi73zqoUos7rCgLS24ebaj3d94UhuJQJfBUCN6FHB7bmp79J2J";
      expect(() => interaction.parse(reallyMissingXFP)).toThrow(/No xfp/i);
    });

    it("xfp and depth>1 xpub", () => {
      const bip32Path = "m/48'/1'/0'/1'/0/0";
      const interaction = interactionBuilder({
        network: Network.TESTNET,
        bip32Path,
      });
      const deeperXPUB = { ...coldcardFixtures.validColdcardXpubJSON };
      //set to a valid depth>1 xpub
      deeperXPUB.p2sh = coldcardFixtures.validColdcardXpubJSON.p2wsh_p2sh;
      expect(interaction.isSupported()).toEqual(true);
      const result = interaction.parse(deeperXPUB);

      expect(result).toEqual({
        xpub: nodes[bip32Path].tpub,
        bip32Path,
        rootFingerprint: nodes[bip32Path].rootFingerprint,
      });
    });
    it("derive down to depth 2 unhardened", () => {
      let bip32Path = "m/45'/0";
      const interaction = interactionBuilder({
        network: Network.TESTNET,
        bip32Path,
      });
      const result = interaction.parse(coldcardFixtures.validColdcardXpubJSON);
      expect(result.rootFingerprint).toEqual(ROOT_FINGERPRINT);
      expect(result.xpub).toEqual(nodes[bip32Path].tpub);
    });
    it("derive down to depth 3 unhardened", () => {
      let bip32Path = "m/45'/1/0";
      const interaction = interactionBuilder({
        network: Network.TESTNET,
        bip32Path,
      });
      const result = interaction.parse(coldcardFixtures.validColdcardXpubJSON);
      expect(result.rootFingerprint).toEqual(ROOT_FINGERPRINT);
      expect(result.xpub).toEqual(nodes[bip32Path].tpub);
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
        code: "coldcard.upload_key",
        text: "Upload the JSON file",
      }),
    ).toBe(true);
  });
  it("has a message about selecting 0 for account ", () => {
    expect(
      interactionBuilder({
        network: Network.TESTNET,
        bip32Path: "m/45'",
      }).hasMessagesFor({
        state: PENDING,
        level: INFO,
        code: "coldcard.select_account",
        text: "Enter 0 for account",
      }),
    ).toBe(true);
  });
  it("has a message about exporting xpub", () => {
    expect(
      interactionBuilder({
        network: Network.TESTNET,
        bip32Path: "m/45'",
      }).hasMessagesFor({
        state: PENDING,
        level: INFO,
        code: "coldcard.export_xpub",
        text: "Settings > Multisig Wallets > Export XPUB",
      }),
    ).toBe(true);
  });
});

describe("ColdcardSignMultisigTransaction", () => {
  function interactionBuilder({
    network = "",
    inputs = [],
    outputs = [],
    bip32Paths = [],
    psbt = "",
  }) {
    return new ColdcardSignMultisigTransaction({
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
    it("return psbt if there is one", () => {
      const interaction = interactionBuilder({
        network: Network.TESTNET,
        psbt: multisigs[0].psbt,
      });
      const result = interaction.request();
      expect(result).toEqual(multisigs[0].psbt);
    });

    it("construct psbt if there is not one", () => {
      const interaction = interactionBuilder({
        network: transactions[0].network,
        inputs: transactions[0].inputs,
        outputs: transactions[0].outputs,
        bip32Paths: transactions[0].bip32Paths,
      });
      const result = interaction.request().data.toBase64();
      expect(result).toEqual(transactions[0].psbt);
    });
  });

  describe("parse", () => {
    it("return multi input, single signature set", () => {
      const interaction = interactionBuilder({
        psbt: multisigs[0].psbtPartiallySigned,
      });
      const result = interaction.parse(multisigs[0].psbtPartiallySigned);
      const signatureSet = {};
      signatureSet[multisigs[0].publicKey] = multisigs[0].transaction.signature;
      expect(result).toEqual(signatureSet);
      expect(Object.keys(result).length).toEqual(1);
    });
    // it("return multi input, double signature set", () => {
    //   const interaction = interactionBuilder({psbt:coldcardFixtures.multiInputB64PSBT_fullySigned.unsigned});
    //   const result = interaction.parse(coldcardFixtures.multiInputB64PSBT_fullySigned.unsigned);
    //   expect(result).toEqual(coldcardFixtures.multiInputB64PSBT_fullySigned.signatureResponse);
    //   expect(Object.keys(result).length).toEqual(2);
    // });
    it("psbt has no signatures", () => {
      const interaction = interactionBuilder({ psbt: multisigs[0].psbt });
      expect(() => interaction.parse(multisigs[0].psbt)).toThrow(
        /No signatures found/i,
      );
    });
  });

  it("has a message about wallet config", () => {
    expect(
      interactionBuilder({
        network: Network.TESTNET,
        psbt: multisigs[0].psbt,
      }).hasMessagesFor({
        state: PENDING,
        level: INFO,
        code: "coldcard.install_multisig_config",
        text: "has the multisig wallet installed",
      }),
    ).toBe(true);
  });
  it("has a message about downloading psbt", () => {
    expect(
      interactionBuilder({
        network: Network.TESTNET,
        psbt: multisigs[0].psbt,
      }).hasMessagesFor({
        state: PENDING,
        level: INFO,
        code: "coldcard.download_psbt",
        text: "Download and save this PSBT",
      }),
    ).toBe(true);
  });
  it("has a message about transferring psbt", () => {
    expect(
      interactionBuilder({
        network: Network.TESTNET,
        psbt: multisigs[0].psbt,
      }).hasMessagesFor({
        state: PENDING,
        level: INFO,
        code: "coldcard.transfer_psbt",
        text: "Transfer the PSBT",
      }),
    ).toBe(true);
  });
  it("has a message about transferring psbt", () => {
    expect(
      interactionBuilder({
        network: Network.TESTNET,
        psbt: multisigs[0].psbt,
      }).hasMessagesFor({
        state: ACTIVE,
        level: INFO,
        code: "coldcard.transfer_psbt",
        text: "Transfer the PSBT",
      }),
    ).toBe(true);
  });
  it("has a message about ready to sign", () => {
    expect(
      interactionBuilder({
        network: Network.TESTNET,
        psbt: multisigs[0].psbt,
      }).hasMessagesFor({
        state: ACTIVE,
        level: INFO,
        code: "coldcard.select_psbt",
        text: "Choose 'Ready To Sign'",
      }),
    ).toBe(true);
  });
  it("has a message about verify tx", () => {
    expect(
      interactionBuilder({
        network: Network.TESTNET,
        psbt: multisigs[0].psbt,
      }).hasMessagesFor({
        state: ACTIVE,
        level: INFO,
        code: "coldcard.sign_psbt",
        text: "Verify the transaction",
      }),
    ).toBe(true);
  });
  it("has a message about upload PSBT", () => {
    expect(
      interactionBuilder({
        network: Network.TESTNET,
        psbt: multisigs[0].psbt,
      }).hasMessagesFor({
        state: ACTIVE,
        level: INFO,
        code: "coldcard.upload_signed_psbt",
        text: "Upload the signed PSBT",
      }),
    ).toBe(true);
  });
});

describe("ColdcardMultisigWalletConfig", () => {
  let jsonConfigCopy: any = {};

  beforeEach(() => {
    // runs before each test in this block
    jsonConfigCopy = JSON.parse(
      JSON.stringify(coldcardFixtures.jsonConfigUUID),
    );
  });

  function interactionBuilder(incomingConfig) {
    return new ColdcardMultisigWalletConfig(incomingConfig);
  }

  it("can adapt unchained config to coldcard config with uuid", () => {
    const interaction = interactionBuilder({
      jsonConfig: coldcardFixtures.jsonConfigUUID,
    });
    const output = interaction.adapt();
    expect(output).toEqual(coldcardFixtures.coldcardConfigUUID);
  });

  it("can adapt caravan config to coldcard config with name", () => {
    const jsonConfigName = { ...jsonConfigCopy };
    Reflect.deleteProperty(jsonConfigName, "uuid");
    const interaction = interactionBuilder({ jsonConfig: jsonConfigName });
    const output = interaction.adapt();
    expect(output).toEqual(coldcardFixtures.coldcardConfigName);
  });

  it("fails when send in nothing or non json", () => {
    const notJSON = "test";
    const definitelyNotJSON = 77;
    const jsonConfigBad = { test: 0 };
    expect(() => interactionBuilder({ jsonConfig: notJSON })).toThrow(
      /Unable to parse JSON/i,
    );
    expect(() => interactionBuilder({ jsonConfig: definitelyNotJSON })).toThrow(
      /Not valid JSON/i,
    );
    expect(() => interactionBuilder({ jsonConfig: {} })).toThrow(
      /Configuration file needs/i,
    );
    expect(() => interactionBuilder({ jsonConfig: jsonConfigBad })).toThrow(
      /Configuration file needs/i,
    );
  });

  it("jsonConfig without extendedPublicKeys", () => {
    const jsonMissingKeys = { ...jsonConfigCopy };
    Reflect.deleteProperty(jsonMissingKeys, "extendedPublicKeys");
    expect(() => interactionBuilder({ jsonConfig: jsonMissingKeys })).toThrow(
      "Configuration file needs extendedPublicKeys.",
    );
  });

  it("jsonConfig with missing xfp", () => {
    const jsonMissingXFP = { ...jsonConfigCopy };
    Reflect.deleteProperty(jsonMissingXFP.extendedPublicKeys[0], "xfp");
    expect(() => interactionBuilder({ jsonConfig: jsonMissingXFP })).toThrow(
      "ExtendedPublicKeys missing at least one xfp.",
    );
  });

  it("jsonConfig with xfp as Unknown", () => {
    const jsonUnknownXFP = { ...jsonConfigCopy };
    jsonUnknownXFP.extendedPublicKeys[0].xfp = "Unknown";
    expect(() => interactionBuilder({ jsonConfig: jsonUnknownXFP })).toThrow(
      "ExtendedPublicKeys missing at least one xfp.",
    );
  });

  it("jsonConfig with xfp not length 8", () => {
    const jsonMissingMultipleXFP = { ...jsonConfigCopy };
    jsonMissingMultipleXFP.extendedPublicKeys[1].xfp = "1234";
    expect(() =>
      interactionBuilder({ jsonConfig: jsonMissingMultipleXFP }),
    ).toThrow("XFP not length 8");
  });

  it("jsonConfig with xfp not string", () => {
    const jsonMissingMultipleXFP = { ...jsonConfigCopy };
    jsonMissingMultipleXFP.extendedPublicKeys[0].xfp = 1234;
    expect(() =>
      interactionBuilder({ jsonConfig: jsonMissingMultipleXFP }),
    ).toThrow("XFP not a string");
  });

  it("jsonConfig with xfp invalid hex", () => {
    const jsonMissingMultipleXFP = { ...jsonConfigCopy };
    jsonMissingMultipleXFP.extendedPublicKeys[0].xfp = "1234567z";
    expect(() =>
      interactionBuilder({ jsonConfig: jsonMissingMultipleXFP }),
    ).toThrow("XFP is invalid hex");
  });

  it("jsonConfig with missing uuid && name", () => {
    const jsonMissingUUIDandName = { ...jsonConfigCopy };
    Reflect.deleteProperty(jsonMissingUUIDandName, "uuid");
    Reflect.deleteProperty(jsonMissingUUIDandName, "name");
    expect(() =>
      interactionBuilder({ jsonConfig: jsonMissingUUIDandName }),
    ).toThrow("Configuration file needs a UUID or a name.");
  });

  it("jsonConfig with missing quorum.requiredSigners", () => {
    const jsonMissingQuorumRequired = { ...jsonConfigCopy };
    Reflect.deleteProperty(jsonMissingQuorumRequired.quorum, "requiredSigners");
    expect(() =>
      interactionBuilder({ jsonConfig: jsonMissingQuorumRequired }),
    ).toThrow(
      "Configuration file needs quorum.requiredSigners and quorum.totalSigners.",
    );
  });

  it("jsonConfig with missing quorum.totalSigners", () => {
    const jsonMissingQuorumTotal = { ...jsonConfigCopy };
    Reflect.deleteProperty(jsonMissingQuorumTotal.quorum, "totalSigners");
    expect(() =>
      interactionBuilder({ jsonConfig: jsonMissingQuorumTotal }),
    ).toThrow(
      "Configuration file needs quorum.requiredSigners and quorum.totalSigners.",
    );
  });

  it("jsonConfig with missing addressType", () => {
    const jsonMissingAddressType = { ...jsonConfigCopy };
    Reflect.deleteProperty(jsonMissingAddressType, "addressType");
    expect(() =>
      interactionBuilder({ jsonConfig: jsonMissingAddressType }),
    ).toThrow("Configuration file needs addressType.");
  });
});
