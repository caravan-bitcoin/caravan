"use strict";

require("core-js/modules/es6.object.define-properties");
require("core-js/modules/es7.object.get-own-property-descriptors");
require("core-js/modules/es6.array.for-each");
require("core-js/modules/es6.array.filter");
require("core-js/modules/es6.object.define-property");
require("core-js/modules/es6.number.constructor");
require("core-js/modules/es7.symbol.async-iterator");
require("core-js/modules/es6.symbol");
require("core-js/modules/web.dom.iterable");
require("core-js/modules/es6.array.iterator");
require("core-js/modules/es6.object.to-string");
require("core-js/modules/es6.object.keys");
require("core-js/modules/es6.reflect.delete-property");
var _custom = require("./custom");
var _unchainedBitcoin = require("unchained-bitcoin");
var _interaction = require("./interaction");
var _custom2 = require("./fixtures/custom.fixtures");
function _typeof(obj) { "@babel/helpers - typeof"; return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (obj) { return typeof obj; } : function (obj) { return obj && "function" == typeof Symbol && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }, _typeof(obj); }
function ownKeys(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); enumerableOnly && (symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; })), keys.push.apply(keys, symbols); } return keys; }
function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = null != arguments[i] ? arguments[i] : {}; i % 2 ? ownKeys(Object(source), !0).forEach(function (key) { _defineProperty(target, key, source[key]); }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)) : ownKeys(Object(source)).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } return target; }
function _defineProperty(obj, key, value) { key = _toPropertyKey(key); if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }
function _toPropertyKey(arg) { var key = _toPrimitive(arg, "string"); return _typeof(key) === "symbol" ? key : String(key); }
function _toPrimitive(input, hint) { if (_typeof(input) !== "object" || input === null) return input; var prim = input[Symbol.toPrimitive]; if (prim !== undefined) { var res = prim.call(input, hint || "default"); if (_typeof(res) !== "object") return res; throw new TypeError("@@toPrimitive must return a primitive value."); } return (hint === "string" ? String : Number)(input); } /**
                                                                                                                                                                                                                                                                                                                                                                                               * @jest-environment jsdom
                                                                                                                                                                                                                                                                                                                                                                                               */
var multisigs = _unchainedBitcoin.TEST_FIXTURES.multisigs,
  transactions = _unchainedBitcoin.TEST_FIXTURES.transactions;
describe("CustomExportExtendedPublicKey", function () {
  function interactionBuilder(_ref) {
    var _ref$bip32Path = _ref.bip32Path,
      bip32Path = _ref$bip32Path === void 0 ? "" : _ref$bip32Path,
      _ref$network = _ref.network,
      network = _ref$network === void 0 ? "" : _ref$network;
    return new _custom.CustomExportExtendedPublicKey({
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
    it("shows invalid bip32Path unsupported", function () {
      var interaction = interactionBuilder({
        network: _unchainedBitcoin.Network.TESTNET,
        bip32Path: "m/45'/1/01"
      });
      expect(interaction.isSupported()).toBe(false);
      expect(interaction.hasMessagesFor({
        state: _interaction.PENDING,
        level: _interaction.ERROR,
        code: "custom.bip32_path.path_error"
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
      }).toThrow(/Not a valid ExtendedPublicKey/i);
      expect(function () {
        return interaction.parse(definitelyNotJSON);
      }).toThrow(/Not a valid ExtendedPublicKey/i);
      expect(function () {
        return interaction.parse({});
      }).toThrow(/Not a valid ExtendedPublicKey/i);
    });
    it("fails when missing xpub field", function () {
      var interaction = interactionBuilder({
        network: _unchainedBitcoin.Network.MAINNET,
        bip32Path: "m/45'/1'/0'"
      });
      var missingXpub = _objectSpread({}, _custom2.customFixtures.validCustomTpubJSON);
      Reflect.deleteProperty(missingXpub, "xpub");
      expect(function () {
        return interaction.parse(missingXpub);
      }).toThrow(/Not a valid ExtendedPublicKey/i);
    });
    it("computes fake rootFingerprint when initialized on testnet", function () {
      var bip32Path = "m/45'/0'/0'";
      var interaction = interactionBuilder({
        network: _unchainedBitcoin.Network.TESTNET,
        bip32Path: bip32Path
      });
      var missingXfp = _objectSpread({}, _custom2.customFixtures.validCustomXpubJSON);
      Reflect.deleteProperty(missingXfp, "rootFingerprint");
      var result = interaction.parse(missingXfp);
      expect(result).toEqual(_custom2.customFixtures.validXpubFakeRootFingerprintOutput);
    });
    it("computes fake rootFingerprint when initialized on mainnet", function () {
      var bip32Path = "m/45'/1'/0'";
      var interaction = interactionBuilder({
        network: _unchainedBitcoin.Network.TESTNET,
        bip32Path: bip32Path
      });
      var missingXfp = _objectSpread({}, _custom2.customFixtures.validCustomTpubJSON);
      Reflect.deleteProperty(missingXfp, "rootFingerprint");
      var result = interaction.parse(missingXfp);
      expect(result).toEqual(_custom2.customFixtures.validTpubFakeRootFingerprintOutput);
    });
    it("throws error on invalid rootFingerprint", function () {
      var bip32Path = "m/45'/1'/0'";
      var interaction = interactionBuilder({
        network: _unchainedBitcoin.Network.TESTNET,
        bip32Path: bip32Path
      });
      expect(function () {
        return interaction.parse({
          xpub: _custom2.customFixtures.validCustomTpubJSON.xpub,
          rootFingerprint: "zzzz"
        });
      }).toThrow(/Root fingerprint validation error/i);
    });
    it("throws error as bip32 depth does not match depth in provided xpub", function () {
      var bip32Path = "m/45'";
      var interaction = interactionBuilder({
        network: _unchainedBitcoin.Network.TESTNET,
        bip32Path: bip32Path
      });
      expect(function () {
        return interaction.parse(_custom2.customFixtures.validCustomTpubJSON);
      }).toThrow(/does not match depth of BIP32 path/i);
    });
    it("throws error as bip32 depth does not match depth in provided xpub (and bip32 missing m/ for whatever reason)", function () {
      var bip32Path = "45'/0'";
      var interaction = interactionBuilder({
        network: _unchainedBitcoin.Network.TESTNET,
        bip32Path: bip32Path
      });
      expect(function () {
        return interaction.parse(_custom2.customFixtures.validCustomTpubJSON);
      }).toThrow(/does not match depth of BIP32 path/i);
    });
  });
  it("has a message about uploading file", function () {
    expect(interactionBuilder({
      network: _unchainedBitcoin.Network.TESTNET,
      bip32Path: "m/45'"
    }).hasMessagesFor({
      state: _interaction.PENDING,
      level: _interaction.INFO,
      code: "custom.import_xpub",
      text: "Type or paste the extended public key here."
    })).toBe(true);
  });
});
describe("CustomSignMultisigTransaction", function () {
  var testMultisig = multisigs[0];
  var testTx = transactions[0];
  function interactionBuilder(_ref2) {
    var _ref2$network = _ref2.network,
      network = _ref2$network === void 0 ? "" : _ref2$network,
      _ref2$inputs = _ref2.inputs,
      inputs = _ref2$inputs === void 0 ? "" : _ref2$inputs,
      _ref2$outputs = _ref2.outputs,
      outputs = _ref2$outputs === void 0 ? "" : _ref2$outputs,
      _ref2$bip32Paths = _ref2.bip32Paths,
      bip32Paths = _ref2$bip32Paths === void 0 ? "" : _ref2$bip32Paths,
      _ref2$psbt = _ref2.psbt,
      psbt = _ref2$psbt === void 0 ? "" : _ref2$psbt;
    return new _custom.CustomSignMultisigTransaction({
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
    it("returns psbt if there is one", function () {
      var interaction = interactionBuilder({
        network: _unchainedBitcoin.Network.TESTNET,
        psbt: testMultisig.psbt
      });
      var result = interaction.request();
      expect(result).toEqual(testMultisig.psbt);
    });
    it("constructs psbt if there is not one", function () {
      var interaction = interactionBuilder({
        network: testTx.network,
        inputs: testTx.inputs,
        outputs: testTx.outputs,
        bip32Paths: testTx.bip32Paths
      });
      var result = interaction.request().data.toBase64();
      expect(result).toEqual(testTx.psbt);
    });
  });
  describe("parse", function () {
    it("returns multi input, single signature set", function () {
      var interaction = interactionBuilder({
        psbt: testMultisig.psbtPartiallySigned
      });
      var result = interaction.parse(testMultisig.psbtPartiallySigned);
      var signatureSet = {};
      signatureSet[testMultisig.publicKey] = testMultisig.transaction.signature;
      expect(result).toEqual(signatureSet);
      expect(Object.keys(result).length).toEqual(1);
    });
    it("throws error as psbt has no signatures", function () {
      var interaction = interactionBuilder({
        psbt: testMultisig.psbt
      });
      expect(function () {
        return interaction.parse(testMultisig.psbt);
      }).toThrow(/No signatures found/i);
    });
  });
  it("has a message about downloading psbt", function () {
    expect(interactionBuilder({
      network: _unchainedBitcoin.Network.TESTNET,
      psbt: testMultisig.psbt
    }).hasMessagesFor({
      state: _interaction.PENDING,
      level: _interaction.INFO,
      code: "custom.download_psbt",
      text: "Download and save this PSBT file."
    })).toBe(true);
  });
  it("has a message about signing psbt", function () {
    expect(interactionBuilder({
      network: _unchainedBitcoin.Network.TESTNET,
      psbt: testMultisig.psbt
    }).hasMessagesFor({
      state: _interaction.PENDING,
      level: _interaction.INFO,
      code: "custom.sign_psbt",
      text: "Add your signature to the PSBT."
    })).toBe(true);
  });
  it("has a message about verify tx", function () {
    expect(interactionBuilder({
      network: _unchainedBitcoin.Network.TESTNET,
      psbt: testMultisig.psbt
    }).hasMessagesFor({
      state: _interaction.ACTIVE,
      level: _interaction.INFO,
      code: "custom.sign_psbt",
      text: "Verify the transaction details and sign."
    })).toBe(true);
  });
  it("has a message about upload PSBT", function () {
    expect(interactionBuilder({
      network: _unchainedBitcoin.Network.TESTNET,
      psbt: testMultisig.psbt
    }).hasMessagesFor({
      state: _interaction.ACTIVE,
      level: _interaction.INFO,
      code: "custom.upload_signed_psbt",
      text: "Upload the signed PSBT."
    })).toBe(true);
  });
});