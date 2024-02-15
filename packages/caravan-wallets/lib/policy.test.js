"use strict";

function _typeof(obj) { "@babel/helpers - typeof"; return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (obj) { return typeof obj; } : function (obj) { return obj && "function" == typeof Symbol && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }, _typeof(obj); }
require("core-js/modules/es6.array.is-array");
require("core-js/modules/es6.string.iterator");
require("core-js/modules/es6.array.from");
require("core-js/modules/es6.object.define-properties");
require("core-js/modules/es7.object.get-own-property-descriptors");
require("core-js/modules/es6.array.for-each");
require("core-js/modules/es6.array.filter");
require("core-js/modules/es6.object.keys");
require("core-js/modules/es6.object.define-property");
require("core-js/modules/es6.number.constructor");
require("core-js/modules/es7.symbol.async-iterator");
require("core-js/modules/es6.symbol");
require("core-js/modules/es6.function.name");
require("core-js/modules/es6.regexp.to-string");
require("core-js/modules/es6.date.to-string");
require("core-js/modules/es7.array.includes");
require("core-js/modules/es6.string.includes");
require("core-js/modules/web.dom.iterable");
require("core-js/modules/es6.array.iterator");
require("core-js/modules/es6.object.to-string");
require("core-js/modules/es6.array.map");
var _unchainedBitcoin = require("unchained-bitcoin");
var _policy = require("./policy");
var _fixtures = require("./fixtures");
function _createForOfIteratorHelper(o, allowArrayLike) { var it = typeof Symbol !== "undefined" && o[Symbol.iterator] || o["@@iterator"]; if (!it) { if (Array.isArray(o) || (it = _unsupportedIterableToArray(o)) || allowArrayLike && o && typeof o.length === "number") { if (it) o = it; var i = 0; var F = function F() {}; return { s: F, n: function n() { if (i >= o.length) return { done: true }; return { done: false, value: o[i++] }; }, e: function e(_e) { throw _e; }, f: F }; } throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); } var normalCompletion = true, didErr = false, err; return { s: function s() { it = it.call(o); }, n: function n() { var step = it.next(); normalCompletion = step.done; return step; }, e: function e(_e2) { didErr = true; err = _e2; }, f: function f() { try { if (!normalCompletion && it["return"] != null) it["return"](); } finally { if (didErr) throw err; } } }; }
function _unsupportedIterableToArray(o, minLen) { if (!o) return; if (typeof o === "string") return _arrayLikeToArray(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return Array.from(o); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen); }
function _arrayLikeToArray(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) arr2[i] = arr[i]; return arr2; }
function ownKeys(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); enumerableOnly && (symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; })), keys.push.apply(keys, symbols); } return keys; }
function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = null != arguments[i] ? arguments[i] : {}; i % 2 ? ownKeys(Object(source), !0).forEach(function (key) { _defineProperty(target, key, source[key]); }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)) : ownKeys(Object(source)).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } return target; }
function _defineProperty(obj, key, value) { key = _toPropertyKey(key); if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }
function _toPropertyKey(arg) { var key = _toPrimitive(arg, "string"); return _typeof(key) === "symbol" ? key : String(key); }
function _toPrimitive(input, hint) { if (_typeof(input) !== "object" || input === null) return input; var prim = input[Symbol.toPrimitive]; if (prim !== undefined) { var res = prim.call(input, hint || "default"); if (_typeof(res) !== "object") return res; throw new TypeError("@@toPrimitive must return a primitive value."); } return (hint === "string" ? String : Number)(input); } /**
                                                                                                                                                                                                                                                                                                                                                                                               * @jest-environment jsdom
                                                                                                                                                                                                                                                                                                                                                                                               */
describe("validateMultisigPolicyTemplate", function () {
  it("throws error if script type is not supported", function () {
    var templates = ["pkh(@0/**)", "tr(@0/**)", "wpkh(@0/**)", "foobar(@0/**)", "(@0/**)"];
    var _loop = function _loop() {
      var template = _templates[_i];
      expect(function () {
        return (0, _policy.validateMultisigPolicyTemplate)(template);
      }).toThrowError();
    };
    for (var _i = 0, _templates = templates; _i < _templates.length; _i++) {
      _loop();
    }
  });
  it("throws if required signers is invalid", function () {
    var templates = ["wsh(3,@0/**,@1/**)",
    // not enough signers
    "sh(@0/**)",
    // no required signers indicated
    "wsh()",
    // no keys or required signers
    "sh(2,@0,@1/**)" // policy is missing derivation wildcard
    ];
    var _loop2 = function _loop2() {
      var template = _templates2[_i2];
      expect(function () {
        return (0, _policy.validateMultisigPolicyTemplate)(template);
      }).toThrowError();
    };
    for (var _i2 = 0, _templates2 = templates; _i2 < _templates2.length; _i2++) {
      _loop2();
    }
  });
  it("does not throw if templates are valid", function () {
    var templates = ["wsh(2,@0/**,@1/**)", "sh(2,@0/**,@1/**)", "sh(2,@0/**,@1/**,@2/**)"];
    var _loop3 = function _loop3() {
      var template = _templates3[_i3];
      expect(function () {
        return (0, _policy.validateMultisigPolicyTemplate)(template);
      }).not.toThrowError();
    };
    for (var _i3 = 0, _templates3 = templates; _i3 < _templates3.length; _i3++) {
      _loop3();
    }
  });
});
describe("MultisigWalletPolicy", function () {
  var cases = _unchainedBitcoin.TEST_FIXTURES.multisigs.map(function (multisig) {
    return _objectSpread(_objectSpread({}, multisig.braidDetails), {}, {
      name: multisig.description,
      extendedPublicKeys: multisig.braidDetails.extendedPublicKeys.map(function (key) {
        return {
          xpub: key.base58String,
          bip32Path: key.path,
          xfp: key.rootFingerprint
        };
      }),
      quorum: {
        requiredSigners: multisig.braidDetails.requiredSigners
      }
    });
  });
  var testCase;
  beforeEach(function () {
    testCase = cases[0];
  });
  it("can return a wallet policy", function () {
    expect(function () {
      return _fixtures.POLICY_FIXTURE.policy.toLedgerPolicy();
    }).not.toThrow();
  });
  test.each(cases)("can convert to a policy from wallet config $case.name", function (vect) {
    expect(function () {
      return _policy.MultisigWalletPolicy.FromWalletConfig(vect);
    }).not.toThrow();
  });
  test.each(cases)("can return serialized list of key origins $case.name", function (vect) {
    var policy = _policy.MultisigWalletPolicy.FromWalletConfig(vect);
    expect(policy.keys).toHaveLength(vect.extendedPublicKeys.length);
    var _iterator = _createForOfIteratorHelper(vect.extendedPublicKeys),
      _step;
    try {
      for (_iterator.s(); !(_step = _iterator.n()).done;) {
        var key = _step.value;
        var ko = new _policy.KeyOrigin(_objectSpread(_objectSpread({}, key), {}, {
          network: vect.network
        }));
        expect(policy.keys.includes(ko.toString())).toBeTruthy();
      }
    } catch (err) {
      _iterator.e(err);
    } finally {
      _iterator.f();
    }
  });
  it("trims wallet name with trailing space", function () {
    testCase.name += " ";
    var policy = _policy.MultisigWalletPolicy.FromWalletConfig(testCase);
    expect(policy.name).toEqual(testCase.name?.trim());
  });
  it("prefers uuid over name when generating from wallet config", function () {
    testCase.uuid = "123uuid";
    var policy = _policy.MultisigWalletPolicy.FromWalletConfig(testCase);
    expect(policy.name).toEqual(testCase.uuid);
  });
  it("always returns the same policy", function () {
    var original = _objectSpread({}, testCase);
    var reversed = _objectSpread(_objectSpread({}, testCase), {}, {
      extendedPublicKeys: [testCase.extendedPublicKeys[1], testCase.extendedPublicKeys[0]]
    });
    expect(_policy.MultisigWalletPolicy.FromWalletConfig(original).keys).toEqual(_policy.MultisigWalletPolicy.FromWalletConfig(reversed).keys);
  });
});
describe("KeyOrigin", function () {
  it("correctly serializes key origin in descriptor format", function () {
    var options = {
      xfp: "76223a6e",
      bip32Path: "m/48'/1'/0'/2'",
      xpub: "tpubDE7NQymr4AFtewpAsWtnreyq9ghkzQBXpCZjWLFVRAvnbf7vya2eMTvT2fPapNqL8SuVvLQdbUbMfWLVDCZKnsEBqp6UK93QEzL8Ck23AwF",
      network: _unchainedBitcoin.Network.TESTNET
    };
    expect(new _policy.KeyOrigin(options).toString()).toEqual("[76223a6e/48'/1'/0'/2']tpubDE7NQymr4AFtewpAsWtnreyq9ghkzQBXpCZjWLFVRAvnbf7vya2eMTvT2fPapNqL8SuVvLQdbUbMfWLVDCZKnsEBqp6UK93QEzL8Ck23AwF");
  });
});
describe("getPolicyTemplateFromWalletConfig", function () {
  it("converts braids to valid policies", function () {
    var _iterator2 = _createForOfIteratorHelper(_unchainedBitcoin.TEST_FIXTURES.multisigs),
      _step2;
    try {
      for (_iterator2.s(); !(_step2 = _iterator2.n()).done;) {
        var multisig = _step2.value;
        var walletConfig = (0, _policy.braidDetailsToWalletConfig)(multisig.braidDetails);
        var template = (0, _policy.getPolicyTemplateFromWalletConfig)(walletConfig);
        (0, _policy.validateMultisigPolicyTemplate)(template);
      }
    } catch (err) {
      _iterator2.e(err);
    } finally {
      _iterator2.f();
    }
  });
});