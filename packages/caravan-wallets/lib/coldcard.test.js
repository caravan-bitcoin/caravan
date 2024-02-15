"use strict";

function _typeof(obj) { "@babel/helpers - typeof"; return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (obj) { return typeof obj; } : function (obj) { return obj && "function" == typeof Symbol && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }, _typeof(obj); }
require("core-js/modules/es6.object.define-properties");
require("core-js/modules/es7.object.get-own-property-descriptors");
require("core-js/modules/es6.array.for-each");
require("core-js/modules/es6.array.filter");
require("core-js/modules/es6.object.define-property");
require("core-js/modules/es6.number.constructor");
require("core-js/modules/es7.symbol.async-iterator");
require("core-js/modules/es6.symbol");
require("core-js/modules/es6.object.keys");
require("core-js/modules/es6.reflect.delete-property");
require("core-js/modules/web.dom.iterable");
require("core-js/modules/es6.array.iterator");
require("core-js/modules/es6.object.to-string");
var _coldcard = require("./coldcard");
var _unchainedBitcoin = require("unchained-bitcoin");
var _interaction = require("./interaction");
var _coldcard2 = require("./fixtures/coldcard.fixtures");
function ownKeys(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); enumerableOnly && (symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; })), keys.push.apply(keys, symbols); } return keys; }
function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = null != arguments[i] ? arguments[i] : {}; i % 2 ? ownKeys(Object(source), !0).forEach(function (key) { _defineProperty(target, key, source[key]); }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)) : ownKeys(Object(source)).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } return target; }
function _defineProperty(obj, key, value) { key = _toPropertyKey(key); if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }
function _toPropertyKey(arg) { var key = _toPrimitive(arg, "string"); return _typeof(key) === "symbol" ? key : String(key); }
function _toPrimitive(input, hint) { if (_typeof(input) !== "object" || input === null) return input; var prim = input[Symbol.toPrimitive]; if (prim !== undefined) { var res = prim.call(input, hint || "default"); if (_typeof(res) !== "object") return res; throw new TypeError("@@toPrimitive must return a primitive value."); } return (hint === "string" ? String : Number)(input); } /**
                                                                                                                                                                                                                                                                                                                                                                                               * @jest-environment jsdom
                                                                                                                                                                                                                                                                                                                                                                                               */
var multisigs = _unchainedBitcoin.TEST_FIXTURES.multisigs,
  transactions = _unchainedBitcoin.TEST_FIXTURES.transactions;
var nodes = _unchainedBitcoin.TEST_FIXTURES.keys.open_source.nodes;
describe("ColdcardExportPublicKey", function () {
  function interactionBuilder(_ref) {
    var _ref$bip32Path = _ref.bip32Path,
      bip32Path = _ref$bip32Path === void 0 ? "" : _ref$bip32Path,
      _ref$network = _ref.network,
      network = _ref$network === void 0 ? "" : _ref$network;
    return new _coldcard.ColdcardExportPublicKey({
      bip32Path: bip32Path,
      network: network
    });
  }
  describe("constructor", function () {
    it("fails with invalid network", function () {
      expect(function () {
        return interactionBuilder({
          network: "foo"
        });
      }).toThrow(/Unknown network/i);
    });
    it("unknown chroot unsupported", function () {
      var interaction = interactionBuilder({
        network: _unchainedBitcoin.Network.TESTNET,
        bip32Path: "m/44'/0"
      });
      expect(interaction.isSupported()).toBe(false);
      expect(interaction.hasMessagesFor({
        state: _interaction.PENDING,
        level: _interaction.ERROR,
        code: "coldcard.bip32_path.unknown_chroot_error"
      })).toBe(true);
    });
    it("invalid bip32Path unsupported", function () {
      var interaction = interactionBuilder({
        network: _unchainedBitcoin.Network.TESTNET,
        bip32Path: "m/45'/1/01"
      });
      expect(interaction.isSupported()).toBe(false);
      expect(interaction.hasMessagesFor({
        state: _interaction.PENDING,
        level: _interaction.ERROR,
        code: "coldcard.bip32_path.path_error"
      })).toBe(true);
    });
    it("hardened after unhardened unsupported", function () {
      var interaction = interactionBuilder({
        network: _unchainedBitcoin.Network.TESTNET,
        bip32Path: "m/45'/1/1'"
      });
      expect(interaction.isSupported()).toBe(false);
      expect(interaction.hasMessagesFor({
        state: _interaction.PENDING,
        level: _interaction.ERROR,
        code: "coldcard.bip32_path.no_hardened_relative_path_error"
      })).toBe(true);
    });
  });
  describe("parse", function () {
    it("fails when sending in nothing or non json", function () {
      var notJSON = "test";
      var definitelyNotJSON = 77;
      var interaction = interactionBuilder({
        network: _unchainedBitcoin.Network.TESTNET,
        bip32Path: "m/45'/1/0"
      });
      expect(function () {
        return interaction.parse(notJSON);
      }).toThrow(/Unable to parse JSON/i);
      expect(function () {
        return interaction.parse(definitelyNotJSON);
      }).toThrow(/Not valid JSON/i);
      expect(function () {
        return interaction.parse({});
      }).toThrow(/Empty JSON file/i);
      expect(function () {
        return interaction.parse({
          xpubJSONFile: _coldcard2.coldcardFixtures.invalidColdcardXpubJSON
        });
      }).toThrow(/Missing required params/i);
    });
    it("missing xpub", function () {
      var interaction = interactionBuilder({
        network: _unchainedBitcoin.Network.MAINNET,
        bip32Path: "m/45'/0/0"
      });
      var missingXpub = _objectSpread({}, _coldcard2.coldcardFixtures.validColdcardXpubJSON);
      Reflect.deleteProperty(missingXpub, "p2sh");
      expect(function () {
        return interaction.parse(missingXpub);
      }).toThrow(/Missing required params/i);
    });
    it("missing bip32path", function () {
      var interaction = interactionBuilder({
        network: _unchainedBitcoin.Network.TESTNET,
        bip32Path: "m/45'/1/0"
      });
      var missingb32 = _objectSpread({}, _coldcard2.coldcardFixtures.validColdcardXpubJSON);
      Reflect.deleteProperty(missingb32, "p2sh_deriv");
      expect(function () {
        return interaction.parse(missingb32);
      }).toThrow(/Missing required params/i);
    });
    it("xfp in file and computed xfp don't match", function () {
      var interaction = interactionBuilder({
        network: _unchainedBitcoin.Network.TESTNET,
        bip32Path: "m/45'/1/0"
      });
      var reallyMissingXFP = _objectSpread({}, _coldcard2.coldcardFixtures.validColdcardXpubJSON);
      //set to a valid depth>1 xpub
      reallyMissingXFP.xfp = "12341234";
      expect(function () {
        return interaction.parse(reallyMissingXFP);
      }).toThrow(/Computed fingerprint does not match/i);
    });
    it("missing xfp but passes bc depth is 1", function () {
      var bip32Path = "m/45'";
      var interaction = interactionBuilder({
        network: _unchainedBitcoin.Network.TESTNET,
        bip32Path: bip32Path
      });
      var missingXFP = _objectSpread({}, _coldcard2.coldcardFixtures.validColdcardXpubJSON);
      Reflect.deleteProperty(missingXFP, "xfp");
      expect(interaction.isSupported()).toEqual(true);
      var result = interaction.parse(missingXFP);
      expect(result).toEqual({
        rootFingerprint: _unchainedBitcoin.ROOT_FINGERPRINT,
        publicKey: nodes[bip32Path].pub,
        bip32Path: bip32Path
      });
    });
    it("no xfp and depth>1 xpub", function () {
      var interaction = interactionBuilder({
        network: _unchainedBitcoin.Network.TESTNET,
        bip32Path: "m/45'/1/0"
      });
      var reallyMissingXFP = _objectSpread({}, _coldcard2.coldcardFixtures.validColdcardXpubJSON);
      Reflect.deleteProperty(reallyMissingXFP, "xfp");
      //set to a valid depth>1 xpub
      reallyMissingXFP.p2sh = nodes["m/45'/0'/0'"].tpub;
      expect(function () {
        return interaction.parse(reallyMissingXFP);
      }).toThrow(/No xfp/i);
    });
    it("xfp and depth>1 xpub", function () {
      var bip32Path = "m/48'/1'/0'/1'/0/0";
      var interaction = interactionBuilder({
        network: _unchainedBitcoin.Network.TESTNET,
        bip32Path: bip32Path
      });
      var deeperXPUB = _objectSpread({}, _coldcard2.coldcardFixtures.validColdcardXpubJSON);
      deeperXPUB.p2sh = _coldcard2.coldcardFixtures.validColdcardXpubJSON.p2wsh_p2sh;
      expect(interaction.isSupported()).toEqual(true);
      var result = interaction.parse(deeperXPUB);
      expect(result).toEqual({
        publicKey: nodes[bip32Path].pub,
        bip32Path: bip32Path,
        rootFingerprint: nodes[bip32Path].rootFingerprint
      });
    });
    it("success for valid JSON via Network.TESTNET", function () {
      var bip32Path = "m/45'";
      var interaction = interactionBuilder({
        network: _unchainedBitcoin.Network.TESTNET,
        bip32Path: bip32Path
      });
      expect(interaction.isSupported()).toEqual(true);
      var result = interaction.parse(_coldcard2.coldcardFixtures.validColdcardXpubNewFirmwareJSON);
      expect(result).toEqual({
        rootFingerprint: _unchainedBitcoin.ROOT_FINGERPRINT,
        publicKey: nodes[bip32Path].pub,
        bip32Path: bip32Path
      });
    });
    it("success for valid JSON via Network.MAINNET", function () {
      var bip32Path = "m/45'";
      var interaction = interactionBuilder({
        network: _unchainedBitcoin.Network.MAINNET,
        bip32Path: bip32Path
      });
      expect(interaction.isSupported()).toEqual(true);
      var result = interaction.parse(_coldcard2.coldcardFixtures.validColdcardXpubMainnetJSON);
      expect(result).toEqual({
        rootFingerprint: _unchainedBitcoin.ROOT_FINGERPRINT,
        publicKey: nodes[bip32Path].pub,
        bip32Path: bip32Path
      });
    });
    it("derive down to depth 2 unhardened", function () {
      var b32Path = "m/45'/0";
      var interaction = interactionBuilder({
        network: _unchainedBitcoin.Network.TESTNET,
        bip32Path: b32Path
      });
      expect(interaction.isSupported()).toEqual(true);
      var result = interaction.parse(_coldcard2.coldcardFixtures.validColdcardXpubJSON);
      expect(result.rootFingerprint).toEqual(_unchainedBitcoin.ROOT_FINGERPRINT);
      expect(result.publicKey).toEqual(nodes["m/45'/0"].pub);
    });
    it("derive down to depth 3 unhardened", function () {
      var b32Path = "m/45'/1/0";
      var interaction = interactionBuilder({
        network: _unchainedBitcoin.Network.TESTNET,
        bip32Path: b32Path
      });
      expect(interaction.isSupported()).toEqual(true);
      var result = interaction.parse(_coldcard2.coldcardFixtures.validColdcardXpubJSON);
      expect(result.rootFingerprint).toEqual(_unchainedBitcoin.ROOT_FINGERPRINT);
      expect(result.publicKey).toEqual(nodes["m/45'/1/0"].pub);
    });
  });
  it("has a message about uploading file", function () {
    expect(interactionBuilder({
      network: _unchainedBitcoin.Network.TESTNET,
      bip32Path: "m/45'"
    }).hasMessagesFor({
      state: _interaction.PENDING,
      level: _interaction.INFO,
      code: "coldcard.upload_key",
      text: "Upload the JSON file"
    })).toBe(true);
  });
  it("has a message about selecting 0 for account ", function () {
    expect(interactionBuilder({
      network: _unchainedBitcoin.Network.TESTNET,
      bip32Path: "m/45'"
    }).hasMessagesFor({
      state: _interaction.PENDING,
      level: _interaction.INFO,
      code: "coldcard.select_account",
      text: "Enter 0 for account"
    })).toBe(true);
  });
  it("has a message about exporting xpub", function () {
    expect(interactionBuilder({
      network: _unchainedBitcoin.Network.TESTNET,
      bip32Path: "m/45'"
    }).hasMessagesFor({
      state: _interaction.PENDING,
      level: _interaction.INFO,
      code: "coldcard.export_xpub",
      text: "Settings > Multisig Wallets > Export XPUB"
    })).toBe(true);
  });
});
describe("ColdcardExportExtendedPublicKey", function () {
  function interactionBuilder(_ref2) {
    var _ref2$bip32Path = _ref2.bip32Path,
      bip32Path = _ref2$bip32Path === void 0 ? "" : _ref2$bip32Path,
      _ref2$network = _ref2.network,
      network = _ref2$network === void 0 ? "" : _ref2$network;
    return new _coldcard.ColdcardExportExtendedPublicKey({
      bip32Path: bip32Path,
      network: network
    });
  }
  describe("constructor", function () {
    it("fails with invalid network", function () {
      expect(function () {
        return interactionBuilder({
          network: "foob"
        });
      }).toThrow(/Unknown network/i);
    });
    it("unknown chroot unsupported", function () {
      var interaction = interactionBuilder({
        network: _unchainedBitcoin.Network.TESTNET,
        bip32Path: "m/44'/0"
      });
      expect(interaction.isSupported()).toBe(false);
      expect(interaction.hasMessagesFor({
        state: _interaction.PENDING,
        level: _interaction.ERROR,
        code: "coldcard.bip32_path.unknown_chroot_error"
      })).toBe(true);
    });
    it("invalid bip32Path unsupported", function () {
      var interaction = interactionBuilder({
        network: _unchainedBitcoin.Network.TESTNET,
        bip32Path: "m/45'/1/01"
      });
      expect(interaction.isSupported()).toBe(false);
      expect(interaction.hasMessagesFor({
        state: _interaction.PENDING,
        level: _interaction.ERROR,
        code: "coldcard.bip32_path.path_error"
      })).toBe(true);
    });
    it("hardened after unhardened unsupported", function () {
      var interaction = interactionBuilder({
        network: _unchainedBitcoin.Network.TESTNET,
        bip32Path: "m/45'/1/1'"
      });
      expect(interaction.isSupported()).toBe(false);
      expect(interaction.hasMessagesFor({
        state: _interaction.PENDING,
        level: _interaction.ERROR,
        code: "coldcard.bip32_path.no_hardened_relative_path_error"
      })).toBe(true);
    });
  });
  describe("parse", function () {
    it("fails when sending in nothing or non json", function () {
      var notJSON = "test";
      var definitelyNotJSON = 77;
      var interaction = interactionBuilder({
        network: _unchainedBitcoin.Network.TESTNET,
        bip32Path: "m/45'/1/0"
      });
      expect(function () {
        return interaction.parse(notJSON);
      }).toThrow(/Unable to parse JSON/i);
      expect(function () {
        return interaction.parse(definitelyNotJSON);
      }).toThrow(/Not valid JSON/i);
      expect(function () {
        return interaction.parse({});
      }).toThrow(/Empty JSON file/i);
    });
    it("missing xpub", function () {
      var interaction = interactionBuilder({
        network: _unchainedBitcoin.Network.MAINNET,
        bip32Path: "m/45'/0/0"
      });
      var missingXpub = _objectSpread({}, _coldcard2.coldcardFixtures.validColdcardXpubJSON);
      Reflect.deleteProperty(missingXpub, "p2sh");
      expect(function () {
        return interaction.parse(missingXpub);
      }).toThrow(/Missing required params/i);
    });
    it("missing bip32path", function () {
      var interaction = interactionBuilder({
        network: _unchainedBitcoin.Network.TESTNET,
        bip32Path: "m/45'/1/0"
      });
      var missingb32 = _objectSpread({}, _coldcard2.coldcardFixtures.validColdcardXpubJSON);
      Reflect.deleteProperty(missingb32, "p2sh_deriv");
      expect(function () {
        return interaction.parse(missingb32);
      }).toThrow(/Missing required params/i);
    });
    it("xfp in file and computed xfp don't match", function () {
      var interaction = interactionBuilder({
        network: _unchainedBitcoin.Network.TESTNET,
        bip32Path: "m/45'/1/0"
      });
      var reallyMissingXFP = _objectSpread({}, _coldcard2.coldcardFixtures.validColdcardXpubJSON);
      //set to a valid depth>1 xpub
      reallyMissingXFP.xfp = "12341234";
      expect(function () {
        return interaction.parse(reallyMissingXFP);
      }).toThrow(/Computed fingerprint does not match/i);
    });
    it("missing xfp but passes", function () {
      var bip32Path = "m/45'";
      var interaction = interactionBuilder({
        network: _unchainedBitcoin.Network.TESTNET,
        bip32Path: bip32Path
      });
      var missingXFP = _objectSpread({}, _coldcard2.coldcardFixtures.validColdcardXpubJSON);
      Reflect.deleteProperty(missingXFP, "xfp");
      expect(interaction.isSupported()).toEqual(true);
      var result = interaction.parse(missingXFP);
      expect(result).toEqual({
        rootFingerprint: _unchainedBitcoin.ROOT_FINGERPRINT,
        xpub: nodes[bip32Path].tpub,
        bip32Path: bip32Path
      });
    });
    it("no xfp and depth>1 xpub", function () {
      var interaction = interactionBuilder({
        network: _unchainedBitcoin.Network.TESTNET,
        bip32Path: "m/45'/1/0"
      });
      var reallyMissingXFP = _objectSpread({}, _coldcard2.coldcardFixtures.validColdcardXpubJSON);
      Reflect.deleteProperty(reallyMissingXFP, "xfp");
      //set to a valid depth>1 xpub
      reallyMissingXFP.p2sh = "tpubDD7afgqjwFtnyu3YuReivwoGuJNyXNjFw5y9m4QDchpGzjgGuWhQUbBXafi73zqoUos7rCgLS24ebaj3d94UhuJQJfBUCN6FHB7bmp79J2J";
      expect(function () {
        return interaction.parse(reallyMissingXFP);
      }).toThrow(/No xfp/i);
    });
    it("xfp and depth>1 xpub", function () {
      var bip32Path = "m/48'/1'/0'/1'/0/0";
      var interaction = interactionBuilder({
        network: _unchainedBitcoin.Network.TESTNET,
        bip32Path: bip32Path
      });
      var deeperXPUB = _objectSpread({}, _coldcard2.coldcardFixtures.validColdcardXpubJSON);
      //set to a valid depth>1 xpub
      deeperXPUB.p2sh = _coldcard2.coldcardFixtures.validColdcardXpubJSON.p2wsh_p2sh;
      expect(interaction.isSupported()).toEqual(true);
      var result = interaction.parse(deeperXPUB);
      expect(result).toEqual({
        xpub: nodes[bip32Path].tpub,
        bip32Path: bip32Path,
        rootFingerprint: nodes[bip32Path].rootFingerprint
      });
    });
    it("derive down to depth 2 unhardened", function () {
      var bip32Path = "m/45'/0";
      var interaction = interactionBuilder({
        network: _unchainedBitcoin.Network.TESTNET,
        bip32Path: bip32Path
      });
      var result = interaction.parse(_coldcard2.coldcardFixtures.validColdcardXpubJSON);
      expect(result.rootFingerprint).toEqual(_unchainedBitcoin.ROOT_FINGERPRINT);
      expect(result.xpub).toEqual(nodes[bip32Path].tpub);
    });
    it("derive down to depth 3 unhardened", function () {
      var bip32Path = "m/45'/1/0";
      var interaction = interactionBuilder({
        network: _unchainedBitcoin.Network.TESTNET,
        bip32Path: bip32Path
      });
      var result = interaction.parse(_coldcard2.coldcardFixtures.validColdcardXpubJSON);
      expect(result.rootFingerprint).toEqual(_unchainedBitcoin.ROOT_FINGERPRINT);
      expect(result.xpub).toEqual(nodes[bip32Path].tpub);
    });
  });
  it("has a message about uploading file", function () {
    expect(interactionBuilder({
      network: _unchainedBitcoin.Network.TESTNET,
      bip32Path: "m/45'"
    }).hasMessagesFor({
      state: _interaction.PENDING,
      level: _interaction.INFO,
      code: "coldcard.upload_key",
      text: "Upload the JSON file"
    })).toBe(true);
  });
  it("has a message about selecting 0 for account ", function () {
    expect(interactionBuilder({
      network: _unchainedBitcoin.Network.TESTNET,
      bip32Path: "m/45'"
    }).hasMessagesFor({
      state: _interaction.PENDING,
      level: _interaction.INFO,
      code: "coldcard.select_account",
      text: "Enter 0 for account"
    })).toBe(true);
  });
  it("has a message about exporting xpub", function () {
    expect(interactionBuilder({
      network: _unchainedBitcoin.Network.TESTNET,
      bip32Path: "m/45'"
    }).hasMessagesFor({
      state: _interaction.PENDING,
      level: _interaction.INFO,
      code: "coldcard.export_xpub",
      text: "Settings > Multisig Wallets > Export XPUB"
    })).toBe(true);
  });
});
describe("ColdcardSignMultisigTransaction", function () {
  function interactionBuilder(_ref3) {
    var _ref3$network = _ref3.network,
      network = _ref3$network === void 0 ? "" : _ref3$network,
      _ref3$inputs = _ref3.inputs,
      inputs = _ref3$inputs === void 0 ? [] : _ref3$inputs,
      _ref3$outputs = _ref3.outputs,
      outputs = _ref3$outputs === void 0 ? [] : _ref3$outputs,
      _ref3$bip32Paths = _ref3.bip32Paths,
      bip32Paths = _ref3$bip32Paths === void 0 ? [] : _ref3$bip32Paths,
      _ref3$psbt = _ref3.psbt,
      psbt = _ref3$psbt === void 0 ? "" : _ref3$psbt;
    return new _coldcard.ColdcardSignMultisigTransaction({
      network: network,
      inputs: inputs,
      outputs: outputs,
      bip32Paths: bip32Paths,
      psbt: psbt
    });
  }
  describe("constructor", function () {
    it("fails when sending in no psbt", function () {
      expect(function () {
        return interactionBuilder({});
      }).toThrow(/Unable to build the PSBT/i);
    });
  });
  describe("request", function () {
    it("return psbt if there is one", function () {
      var interaction = interactionBuilder({
        network: _unchainedBitcoin.Network.TESTNET,
        psbt: multisigs[0].psbt
      });
      var result = interaction.request();
      expect(result).toEqual(multisigs[0].psbt);
    });
    it("construct psbt if there is not one", function () {
      var interaction = interactionBuilder({
        network: transactions[0].network,
        inputs: transactions[0].inputs,
        outputs: transactions[0].outputs,
        bip32Paths: transactions[0].bip32Paths
      });
      var result = interaction.request().data.toBase64();
      expect(result).toEqual(transactions[0].psbt);
    });
  });
  describe("parse", function () {
    it("return multi input, single signature set", function () {
      var interaction = interactionBuilder({
        psbt: multisigs[0].psbtPartiallySigned
      });
      var result = interaction.parse(multisigs[0].psbtPartiallySigned);
      var signatureSet = {};
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
    it("psbt has no signatures", function () {
      var interaction = interactionBuilder({
        psbt: multisigs[0].psbt
      });
      expect(function () {
        return interaction.parse(multisigs[0].psbt);
      }).toThrow(/No signatures found/i);
    });
  });
  it("has a message about wallet config", function () {
    expect(interactionBuilder({
      network: _unchainedBitcoin.Network.TESTNET,
      psbt: multisigs[0].psbt
    }).hasMessagesFor({
      state: _interaction.PENDING,
      level: _interaction.INFO,
      code: "coldcard.install_multisig_config",
      text: "has the multisig wallet installed"
    })).toBe(true);
  });
  it("has a message about downloading psbt", function () {
    expect(interactionBuilder({
      network: _unchainedBitcoin.Network.TESTNET,
      psbt: multisigs[0].psbt
    }).hasMessagesFor({
      state: _interaction.PENDING,
      level: _interaction.INFO,
      code: "coldcard.download_psbt",
      text: "Download and save this PSBT"
    })).toBe(true);
  });
  it("has a message about transferring psbt", function () {
    expect(interactionBuilder({
      network: _unchainedBitcoin.Network.TESTNET,
      psbt: multisigs[0].psbt
    }).hasMessagesFor({
      state: _interaction.PENDING,
      level: _interaction.INFO,
      code: "coldcard.transfer_psbt",
      text: "Transfer the PSBT"
    })).toBe(true);
  });
  it("has a message about transferring psbt", function () {
    expect(interactionBuilder({
      network: _unchainedBitcoin.Network.TESTNET,
      psbt: multisigs[0].psbt
    }).hasMessagesFor({
      state: _interaction.ACTIVE,
      level: _interaction.INFO,
      code: "coldcard.transfer_psbt",
      text: "Transfer the PSBT"
    })).toBe(true);
  });
  it("has a message about ready to sign", function () {
    expect(interactionBuilder({
      network: _unchainedBitcoin.Network.TESTNET,
      psbt: multisigs[0].psbt
    }).hasMessagesFor({
      state: _interaction.ACTIVE,
      level: _interaction.INFO,
      code: "coldcard.select_psbt",
      text: "Choose 'Ready To Sign'"
    })).toBe(true);
  });
  it("has a message about verify tx", function () {
    expect(interactionBuilder({
      network: _unchainedBitcoin.Network.TESTNET,
      psbt: multisigs[0].psbt
    }).hasMessagesFor({
      state: _interaction.ACTIVE,
      level: _interaction.INFO,
      code: "coldcard.sign_psbt",
      text: "Verify the transaction"
    })).toBe(true);
  });
  it("has a message about upload PSBT", function () {
    expect(interactionBuilder({
      network: _unchainedBitcoin.Network.TESTNET,
      psbt: multisigs[0].psbt
    }).hasMessagesFor({
      state: _interaction.ACTIVE,
      level: _interaction.INFO,
      code: "coldcard.upload_signed_psbt",
      text: "Upload the signed PSBT"
    })).toBe(true);
  });
});
describe("ColdcardMultisigWalletConfig", function () {
  var jsonConfigCopy = {};
  beforeEach(function () {
    // runs before each test in this block
    jsonConfigCopy = JSON.parse(JSON.stringify(_coldcard2.coldcardFixtures.jsonConfigUUID));
  });
  function interactionBuilder(incomingConfig) {
    return new _coldcard.ColdcardMultisigWalletConfig(incomingConfig);
  }
  it("can adapt unchained config to coldcard config with uuid", function () {
    var interaction = interactionBuilder({
      jsonConfig: _coldcard2.coldcardFixtures.jsonConfigUUID
    });
    var output = interaction.adapt();
    expect(output).toEqual(_coldcard2.coldcardFixtures.coldcardConfigUUID);
  });
  it("can adapt caravan config to coldcard config with name", function () {
    var jsonConfigName = _objectSpread({}, jsonConfigCopy);
    Reflect.deleteProperty(jsonConfigName, "uuid");
    var interaction = interactionBuilder({
      jsonConfig: jsonConfigName
    });
    var output = interaction.adapt();
    expect(output).toEqual(_coldcard2.coldcardFixtures.coldcardConfigName);
  });
  it("fails when send in nothing or non json", function () {
    var notJSON = "test";
    var definitelyNotJSON = 77;
    var jsonConfigBad = {
      test: 0
    };
    expect(function () {
      return interactionBuilder({
        jsonConfig: notJSON
      });
    }).toThrow(/Unable to parse JSON/i);
    expect(function () {
      return interactionBuilder({
        jsonConfig: definitelyNotJSON
      });
    }).toThrow(/Not valid JSON/i);
    expect(function () {
      return interactionBuilder({
        jsonConfig: {}
      });
    }).toThrow(/Configuration file needs/i);
    expect(function () {
      return interactionBuilder({
        jsonConfig: jsonConfigBad
      });
    }).toThrow(/Configuration file needs/i);
  });
  it("jsonConfig without extendedPublicKeys", function () {
    var jsonMissingKeys = _objectSpread({}, jsonConfigCopy);
    Reflect.deleteProperty(jsonMissingKeys, "extendedPublicKeys");
    expect(function () {
      return interactionBuilder({
        jsonConfig: jsonMissingKeys
      });
    }).toThrow("Configuration file needs extendedPublicKeys.");
  });
  it("jsonConfig with missing xfp", function () {
    var jsonMissingXFP = _objectSpread({}, jsonConfigCopy);
    Reflect.deleteProperty(jsonMissingXFP.extendedPublicKeys[0], "xfp");
    expect(function () {
      return interactionBuilder({
        jsonConfig: jsonMissingXFP
      });
    }).toThrow("ExtendedPublicKeys missing at least one xfp.");
  });
  it("jsonConfig with xfp as Unknown", function () {
    var jsonUnknownXFP = _objectSpread({}, jsonConfigCopy);
    jsonUnknownXFP.extendedPublicKeys[0].xfp = "Unknown";
    expect(function () {
      return interactionBuilder({
        jsonConfig: jsonUnknownXFP
      });
    }).toThrow("ExtendedPublicKeys missing at least one xfp.");
  });
  it("jsonConfig with xfp not length 8", function () {
    var jsonMissingMultipleXFP = _objectSpread({}, jsonConfigCopy);
    jsonMissingMultipleXFP.extendedPublicKeys[1].xfp = "1234";
    expect(function () {
      return interactionBuilder({
        jsonConfig: jsonMissingMultipleXFP
      });
    }).toThrow("XFP not length 8");
  });
  it("jsonConfig with xfp not string", function () {
    var jsonMissingMultipleXFP = _objectSpread({}, jsonConfigCopy);
    jsonMissingMultipleXFP.extendedPublicKeys[0].xfp = 1234;
    expect(function () {
      return interactionBuilder({
        jsonConfig: jsonMissingMultipleXFP
      });
    }).toThrow("XFP not a string");
  });
  it("jsonConfig with xfp invalid hex", function () {
    var jsonMissingMultipleXFP = _objectSpread({}, jsonConfigCopy);
    jsonMissingMultipleXFP.extendedPublicKeys[0].xfp = "1234567z";
    expect(function () {
      return interactionBuilder({
        jsonConfig: jsonMissingMultipleXFP
      });
    }).toThrow("XFP is invalid hex");
  });
  it("jsonConfig with missing uuid && name", function () {
    var jsonMissingUUIDandName = _objectSpread({}, jsonConfigCopy);
    Reflect.deleteProperty(jsonMissingUUIDandName, "uuid");
    Reflect.deleteProperty(jsonMissingUUIDandName, "name");
    expect(function () {
      return interactionBuilder({
        jsonConfig: jsonMissingUUIDandName
      });
    }).toThrow("Configuration file needs a UUID or a name.");
  });
  it("jsonConfig with missing quorum.requiredSigners", function () {
    var jsonMissingQuorumRequired = _objectSpread({}, jsonConfigCopy);
    Reflect.deleteProperty(jsonMissingQuorumRequired.quorum, "requiredSigners");
    expect(function () {
      return interactionBuilder({
        jsonConfig: jsonMissingQuorumRequired
      });
    }).toThrow("Configuration file needs quorum.requiredSigners and quorum.totalSigners.");
  });
  it("jsonConfig with missing quorum.totalSigners", function () {
    var jsonMissingQuorumTotal = _objectSpread({}, jsonConfigCopy);
    Reflect.deleteProperty(jsonMissingQuorumTotal.quorum, "totalSigners");
    expect(function () {
      return interactionBuilder({
        jsonConfig: jsonMissingQuorumTotal
      });
    }).toThrow("Configuration file needs quorum.requiredSigners and quorum.totalSigners.");
  });
  it("jsonConfig with missing addressType", function () {
    var jsonMissingAddressType = _objectSpread({}, jsonConfigCopy);
    Reflect.deleteProperty(jsonMissingAddressType, "addressType");
    expect(function () {
      return interactionBuilder({
        jsonConfig: jsonMissingAddressType
      });
    }).toThrow("Configuration file needs addressType.");
  });
});