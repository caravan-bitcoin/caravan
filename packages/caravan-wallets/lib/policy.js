"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.validateMultisigPolicyTemplate = exports.validateMultisigPolicyScriptType = exports.validateMultisigPolicyKeys = exports.getTotalSignerCountFromTemplate = exports.getPolicyTemplateFromWalletConfig = exports.getKeyOriginsFromWalletConfig = exports.braidDetailsToWalletConfig = exports.MultisigWalletPolicy = exports.KeyOrigin = void 0;
require("core-js/modules/es6.regexp.match");
require("core-js/modules/es6.string.starts-with");
require("core-js/modules/es6.array.some");
require("core-js/modules/es6.regexp.to-string");
require("core-js/modules/es6.date.to-string");
require("core-js/modules/web.dom.iterable");
require("core-js/modules/es6.array.iterator");
require("core-js/modules/es6.object.to-string");
require("core-js/modules/es6.array.sort");
require("core-js/modules/es6.string.trim");
require("core-js/modules/es6.function.name");
require("core-js/modules/es6.array.map");
require("core-js/modules/es6.number.constructor");
require("core-js/modules/es7.symbol.async-iterator");
require("core-js/modules/es6.symbol");
require("core-js/modules/es6.object.define-property");
var _unchainedBitcoin = require("unchained-bitcoin");
var _ledgerBitcoin = require("ledger-bitcoin");
function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }
function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, _toPropertyKey(descriptor.key), descriptor); } }
function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); Object.defineProperty(Constructor, "prototype", { writable: false }); return Constructor; }
function _typeof(obj) { "@babel/helpers - typeof"; return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (obj) { return typeof obj; } : function (obj) { return obj && "function" == typeof Symbol && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }, _typeof(obj); }
function _defineProperty(obj, key, value) { key = _toPropertyKey(key); if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }
function _toPropertyKey(arg) { var key = _toPrimitive(arg, "string"); return _typeof(key) === "symbol" ? key : String(key); }
function _toPrimitive(input, hint) { if (_typeof(input) !== "object" || input === null) return input; var prim = input[Symbol.toPrimitive]; if (prim !== undefined) { var res = prim.call(input, hint || "default"); if (_typeof(res) !== "object") return res; throw new TypeError("@@toPrimitive must return a primitive value."); } return (hint === "string" ? String : Number)(input); }
var KeyOrigin = /*#__PURE__*/function () {
  function KeyOrigin(_ref) {
    var xfp = _ref.xfp,
      bip32Path = _ref.bip32Path,
      xpub = _ref.xpub,
      network = _ref.network;
    _classCallCheck(this, KeyOrigin);
    _defineProperty(this, "xfp", void 0);
    _defineProperty(this, "bip32Path", void 0);
    _defineProperty(this, "xpub", void 0);
    // throws an error if not valid
    (0, _unchainedBitcoin.validateRootFingerprint)(xfp);
    this.xfp = xfp;

    // returns error string or empty string if valid
    var pathError = (0, _unchainedBitcoin.validateBIP32Path)(bip32Path);
    if (pathError) throw new Error(pathError);
    this.bip32Path = bip32Path;

    // returns error string or empty string if valid
    var xpubError = (0, _unchainedBitcoin.validateExtendedPublicKey)(xpub, network);
    if (xpubError) throw new Error(xpubError);
    this.xpub = xpub;
  }

  /**
   * Returns a key origin information in descriptor format
   * @returns {string} policy template string
   */
  _createClass(KeyOrigin, [{
    key: "toString",
    value: function toString() {
      var path = this.bip32Path;
      if (this.bip32Path[0] === "m") {
        path = this.bip32Path.slice(1);
      }
      return "[".concat(this.xfp).concat(path, "]").concat(this.xpub);
    }

    // TODO: Needs a way to turn a serialized key origin to instance of class
  }]);
  return KeyOrigin;
}();
exports.KeyOrigin = KeyOrigin;
/**
 * Takes a wallet config and translates it into a wallet policy template string
 * @param {MultisigWalletConfig} walletConfig - multisig wallet configuration object
 * @returns {string} valid policy template string
 */
var getPolicyTemplateFromWalletConfig = function getPolicyTemplateFromWalletConfig(walletConfig) {
  var scriptType;
  var requiredSigners = Number(walletConfig.quorum.requiredSigners);
  var nested = false;
  switch (walletConfig.addressType) {
    case _unchainedBitcoin.P2SH:
      scriptType = "sh";
      break;
    case _unchainedBitcoin.P2WSH:
      scriptType = "wsh";
      break;
    case "P2TR":
      scriptType = "tr";
      break;
    case _unchainedBitcoin.P2SH_P2WSH:
      scriptType = "wsh";
      nested = true;
      break;
    default:
      throw new Error("Unknown address type: ".concat(walletConfig.addressType));
  }
  var signersString = walletConfig.extendedPublicKeys.map(function (_, index) {
    return "@".concat(index, "/**");
  }).join(",");
  var policy = "".concat(scriptType, "(sortedmulti(").concat(requiredSigners, ",").concat(signersString, "))");
  if (nested) return "sh(".concat(policy, ")");
  return policy;
};
exports.getPolicyTemplateFromWalletConfig = getPolicyTemplateFromWalletConfig;
var getKeyOriginsFromWalletConfig = function getKeyOriginsFromWalletConfig(walletConfig) {
  return walletConfig.extendedPublicKeys.map(function (key) {
    var xpub = _unchainedBitcoin.ExtendedPublicKey.fromBase58(key.xpub);
    xpub.setNetwork(walletConfig.network);
    return new KeyOrigin({
      xfp: key.xfp,
      xpub: xpub.toBase58(),
      // makes sure to support case where derivation is "unknown" and we want to mask it
      bip32Path: (0, _unchainedBitcoin.getMaskedDerivation)(key),
      network: walletConfig.network
    });
  });
};
exports.getKeyOriginsFromWalletConfig = getKeyOriginsFromWalletConfig;
var MultisigWalletPolicy = /*#__PURE__*/function () {
  function MultisigWalletPolicy(_ref2) {
    var name = _ref2.name,
      template = _ref2.template,
      keyOrigins = _ref2.keyOrigins;
    _classCallCheck(this, MultisigWalletPolicy);
    _defineProperty(this, "name", void 0);
    _defineProperty(this, "template", void 0);
    _defineProperty(this, "keyOrigins", void 0);
    // this is an unstated restriction from ledger
    // if we don't check it here then registration will fail
    // with an opaque error about invalid input data
    // TODO: should this be left as full length and only
    // abbreviated when translating to a ledger policy?
    if (name.length > 64) {
      console.warn("Wallet policy name too long. (".concat(name.length, ") greater than max of 64 chars."));
      this.name = "".concat(name.slice(0, 61), "...").trim();
    } else {
      this.name = name;
    }
    this.name = this.name.trim();
    validateMultisigPolicyTemplate(template);
    this.template = template;
    var totalSignerCount = getTotalSignerCountFromTemplate(template);
    if (totalSignerCount !== keyOrigins.length) {
      throw new Error("Expected ".concat(totalSignerCount, " key origins but ").concat(keyOrigins.length, " were passed"));
    }

    // sort key origins consistently no matter the order they are passed into the constructor
    // so that the preimage for registrations is not malleable
    this.keyOrigins = keyOrigins.sort(function (a, b) {
      return a.xpub.localeCompare(b.xpub);
    });
  }
  _createClass(MultisigWalletPolicy, [{
    key: "toJSON",
    value: function toJSON() {
      return JSON.stringify({
        name: this.name,
        template: this.template,
        keyOrigins: this.keyOrigins
      });
    }
  }, {
    key: "toLedgerPolicy",
    value: function toLedgerPolicy() {
      return new _ledgerBitcoin.WalletPolicy(this.name, this.template, this.keys);
    }
  }, {
    key: "keys",
    get: function get() {
      return this.keyOrigins.map(function (ko) {
        return ko.toString();
      });
    }
  }], [{
    key: "FromWalletConfig",
    value: function FromWalletConfig(config) {
      var template = getPolicyTemplateFromWalletConfig(config);
      var keyOrigins = getKeyOriginsFromWalletConfig(config);
      // prefer uuid to name because it's less likely to change
      var name = config.uuid || config.name;
      if (!name) throw new Error("Policy template requires a name");
      return new this({
        name: name,
        template: template,
        keyOrigins: keyOrigins
      });
    }
  }]);
  return MultisigWalletPolicy;
}();
exports.MultisigWalletPolicy = MultisigWalletPolicy;
var validateMultisigPolicyScriptType = function validateMultisigPolicyScriptType(template) {
  var acceptedScripts = ["sh", "wsh"];
  var hasMatch = acceptedScripts.some(function (script) {
    return template.startsWith(script);
  });
  if (!hasMatch) throw new Error("Invalid script type in template ".concat(template, ". Only script types ").concat(acceptedScripts.join(", "), " accepted"));
};
exports.validateMultisigPolicyScriptType = validateMultisigPolicyScriptType;
var validateMultisigPolicyKeys = function validateMultisigPolicyKeys(template) {
  var requiredSigners = Number(template.match(/\d+/)[0]);
  if (!requiredSigners) throw new Error("Expected to find a required number of signers from the quorum");
  var count = getTotalSignerCountFromTemplate(template);
  if (!count || count < requiredSigners) {
    throw new Error("Required signers in policy ".concat(template, " is ") + "".concat(requiredSigners, " but found only ").concat(count, " total keys"));
  }
};
exports.validateMultisigPolicyKeys = validateMultisigPolicyKeys;
var getTotalSignerCountFromTemplate = function getTotalSignerCountFromTemplate(template) {
  return template.match(/@\d+\/\*\*/g).length;
};
exports.getTotalSignerCountFromTemplate = getTotalSignerCountFromTemplate;
var validateMultisigPolicyTemplate = function validateMultisigPolicyTemplate(template) {
  validateMultisigPolicyScriptType(template);
  validateMultisigPolicyKeys(template);
};

// Mostly useful for dealing with test fixtures and objects from caravan
exports.validateMultisigPolicyTemplate = validateMultisigPolicyTemplate;
var braidDetailsToWalletConfig = function braidDetailsToWalletConfig(braidDetails) {
  return {
    network: braidDetails.network,
    extendedPublicKeys: braidDetails.extendedPublicKeys.map(function (key) {
      return {
        xpub: key.base58String,
        bip32Path: key.path,
        xfp: key.rootFingerprint
      };
    }),
    quorum: {
      requiredSigners: braidDetails.requiredSigners,
      totalSigners: braidDetails.extendedPublicKeys.length
    },
    name: "".concat(braidDetails.requiredSigners, "-of-").concat(braidDetails.extendedPublicKeys.length, " ").concat(braidDetails.addressType, " ").concat(braidDetails.network, " wallet"),
    addressType: braidDetails.addressType
  };
};
exports.braidDetailsToWalletConfig = braidDetailsToWalletConfig;