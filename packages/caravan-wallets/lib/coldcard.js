"use strict";

require("core-js/modules/es6.reflect.get");
require("core-js/modules/es6.object.create");
require("core-js/modules/es6.reflect.construct");
require("core-js/modules/es6.function.bind");
require("core-js/modules/es6.object.set-prototype-of");
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.ColdcardSignMultisigTransaction = exports.ColdcardMultisigWalletConfig = exports.ColdcardInteraction = exports.ColdcardExportPublicKey = exports.ColdcardExportExtendedPublicKey = exports.COLDCARD_WALLET_CONFIG_VERSION = exports.COLDCARD_BASE_BIP32_PATHS = exports.COLDCARD = void 0;
require("core-js/modules/es6.array.map");
require("core-js/modules/es6.array.is-array");
require("core-js/modules/es6.function.name");
require("core-js/modules/es7.array.includes");
require("core-js/modules/es6.string.includes");
require("core-js/modules/es6.string.starts-with");
require("core-js/modules/es7.object.entries");
require("core-js/modules/es6.array.find");
require("core-js/modules/web.dom.iterable");
require("core-js/modules/es6.array.iterator");
require("core-js/modules/es6.object.to-string");
require("core-js/modules/es6.object.keys");
require("core-js/modules/es6.regexp.replace");
require("core-js/modules/es6.number.constructor");
require("core-js/modules/es7.symbol.async-iterator");
require("core-js/modules/es6.symbol");
require("core-js/modules/es6.object.define-property");
var _unchainedBitcoin = require("unchained-bitcoin");
var _interaction = require("./interaction");
function _get() { if (typeof Reflect !== "undefined" && Reflect.get) { _get = Reflect.get.bind(); } else { _get = function _get(target, property, receiver) { var base = _superPropBase(target, property); if (!base) return; var desc = Object.getOwnPropertyDescriptor(base, property); if (desc.get) { return desc.get.call(arguments.length < 3 ? target : receiver); } return desc.value; }; } return _get.apply(this, arguments); }
function _superPropBase(object, property) { while (!Object.prototype.hasOwnProperty.call(object, property)) { object = _getPrototypeOf(object); if (object === null) break; } return object; }
function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, _toPropertyKey(descriptor.key), descriptor); } }
function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); Object.defineProperty(Constructor, "prototype", { writable: false }); return Constructor; }
function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }
function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function"); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, writable: true, configurable: true } }); Object.defineProperty(subClass, "prototype", { writable: false }); if (superClass) _setPrototypeOf(subClass, superClass); }
function _setPrototypeOf(o, p) { _setPrototypeOf = Object.setPrototypeOf ? Object.setPrototypeOf.bind() : function _setPrototypeOf(o, p) { o.__proto__ = p; return o; }; return _setPrototypeOf(o, p); }
function _createSuper(Derived) { var hasNativeReflectConstruct = _isNativeReflectConstruct(); return function _createSuperInternal() { var Super = _getPrototypeOf(Derived), result; if (hasNativeReflectConstruct) { var NewTarget = _getPrototypeOf(this).constructor; result = Reflect.construct(Super, arguments, NewTarget); } else { result = Super.apply(this, arguments); } return _possibleConstructorReturn(this, result); }; }
function _possibleConstructorReturn(self, call) { if (call && (_typeof(call) === "object" || typeof call === "function")) { return call; } else if (call !== void 0) { throw new TypeError("Derived constructors may only return object or undefined"); } return _assertThisInitialized(self); }
function _assertThisInitialized(self) { if (self === void 0) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return self; }
function _isNativeReflectConstruct() { if (typeof Reflect === "undefined" || !Reflect.construct) return false; if (Reflect.construct.sham) return false; if (typeof Proxy === "function") return true; try { Boolean.prototype.valueOf.call(Reflect.construct(Boolean, [], function () {})); return true; } catch (e) { return false; } }
function _getPrototypeOf(o) { _getPrototypeOf = Object.setPrototypeOf ? Object.getPrototypeOf.bind() : function _getPrototypeOf(o) { return o.__proto__ || Object.getPrototypeOf(o); }; return _getPrototypeOf(o); }
function _typeof(obj) { "@babel/helpers - typeof"; return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (obj) { return typeof obj; } : function (obj) { return obj && "function" == typeof Symbol && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }, _typeof(obj); }
function _defineProperty(obj, key, value) { key = _toPropertyKey(key); if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }
function _toPropertyKey(arg) { var key = _toPrimitive(arg, "string"); return _typeof(key) === "symbol" ? key : String(key); }
function _toPrimitive(input, hint) { if (_typeof(input) !== "object" || input === null) return input; var prim = input[Symbol.toPrimitive]; if (prim !== undefined) { var res = prim.call(input, hint || "default"); if (_typeof(res) !== "object") return res; throw new TypeError("@@toPrimitive must return a primitive value."); } return (hint === "string" ? String : Number)(input); } /**
                                                                                                                                                                                                                                                                                                                                                                                               * Provides classes for interacting with a Coldcard via TXT/JSON/PSBT files
                                                                                                                                                                                                                                                                                                                                                                                               *
                                                                                                                                                                                                                                                                                                                                                                                               * The following API classes are implemented:
                                                                                                                                                                                                                                                                                                                                                                                               *
                                                                                                                                                                                                                                                                                                                                                                                               * * ColdcardExportPublicKey
                                                                                                                                                                                                                                                                                                                                                                                               * * ColdcardExportExtendedPublicKey
                                                                                                                                                                                                                                                                                                                                                                                               * * ColdcardSignMultisigTransaction
                                                                                                                                                                                                                                                                                                                                                                                               * * ColdcardMultisigWalletConfig
                                                                                                                                                                                                                                                                                                                                                                                               */
var COLDCARD = "coldcard";
// Our constants use 'P2SH-P2WSH', their file uses 'P2SH_P2WSH' :\
exports.COLDCARD = COLDCARD;
var COLDCARD_BASE_BIP32_PATHS = {
  "m/45'": _unchainedBitcoin.P2SH,
  "m/48'/0'/0'/1'": _unchainedBitcoin.P2SH_P2WSH.replace("-", "_"),
  "m/48'/0'/0'/2'": _unchainedBitcoin.P2WSH,
  "m/48'/1'/0'/1'": _unchainedBitcoin.P2SH_P2WSH.replace("-", "_"),
  "m/48'/1'/0'/2'": _unchainedBitcoin.P2WSH
};
exports.COLDCARD_BASE_BIP32_PATHS = COLDCARD_BASE_BIP32_PATHS;
var COLDCARD_BASE_CHROOTS = Object.keys(COLDCARD_BASE_BIP32_PATHS);
var COLDCARD_WALLET_CONFIG_VERSION = "1.0.0";

/**
 * Base class for interactions with Coldcard
 */
exports.COLDCARD_WALLET_CONFIG_VERSION = COLDCARD_WALLET_CONFIG_VERSION;
var ColdcardInteraction = /*#__PURE__*/function (_IndirectKeystoreInte) {
  _inherits(ColdcardInteraction, _IndirectKeystoreInte);
  var _super = _createSuper(ColdcardInteraction);
  function ColdcardInteraction() {
    _classCallCheck(this, ColdcardInteraction);
    return _super.apply(this, arguments);
  }
  return _createClass(ColdcardInteraction);
}(_interaction.IndirectKeystoreInteraction);
/**
 * Base class for JSON Multisig file-based interactions with Coldcard
 * This class handles the file that comes from the `Export XPUB` menu item.
 */
exports.ColdcardInteraction = ColdcardInteraction;
var ColdcardMultisigSettingsFileParser = /*#__PURE__*/function (_ColdcardInteraction) {
  _inherits(ColdcardMultisigSettingsFileParser, _ColdcardInteraction);
  var _super2 = _createSuper(ColdcardMultisigSettingsFileParser);
  function ColdcardMultisigSettingsFileParser(_ref) {
    var _this;
    var network = _ref.network,
      bip32Path = _ref.bip32Path;
    _classCallCheck(this, ColdcardMultisigSettingsFileParser);
    _this = _super2.call(this);
    _defineProperty(_assertThisInitialized(_this), "network", void 0);
    _defineProperty(_assertThisInitialized(_this), "bip32Path", void 0);
    _defineProperty(_assertThisInitialized(_this), "bip32ValidationErrorMessage", void 0);
    _defineProperty(_assertThisInitialized(_this), "bip32ValidationError", void 0);
    if ([_unchainedBitcoin.Network.MAINNET, _unchainedBitcoin.Network.TESTNET].find(function (net) {
      return net === network;
    })) {
      _this.network = network;
    } else {
      throw new Error("Unknown network.");
    }
    _this.bip32Path = bip32Path;
    _this.bip32ValidationErrorMessage = {};
    _this.bip32ValidationError = _this.validateColdcardBip32Path(bip32Path);
    return _this;
  }
  _createClass(ColdcardMultisigSettingsFileParser, [{
    key: "isSupported",
    value: function isSupported() {
      return !this.bip32ValidationError.length;
    }

    // TODO make these messages more robust
    //   (e.g use `menuchoices` as an array of `menuchoicemessages`)
  }, {
    key: "messages",
    value: function messages() {
      var messages = _get(_getPrototypeOf(ColdcardMultisigSettingsFileParser.prototype), "messages", this).call(this);
      if (Object.entries(this.bip32ValidationErrorMessage).length) {
        messages.push({
          state: _interaction.PENDING,
          level: _interaction.ERROR,
          code: this.bip32ValidationErrorMessage.code,
          text: this.bip32ValidationErrorMessage.text
        });
      }
      messages.push({
        state: _interaction.PENDING,
        level: _interaction.INFO,
        code: "coldcard.export_xpub",
        text: "Go to Settings > Multisig Wallets > Export XPUB"
      });
      messages.push({
        state: _interaction.PENDING,
        level: _interaction.INFO,
        code: "coldcard.select_account",
        text: "Enter 0 for account"
      });
      messages.push({
        state: _interaction.PENDING,
        level: _interaction.INFO,
        code: "coldcard.upload_key",
        text: "Upload the JSON file from your Coldcard."
      });
      return messages;
    }
  }, {
    key: "chrootForBIP32Path",
    value: function chrootForBIP32Path(bip32Path) {
      for (var i = 0; i < COLDCARD_BASE_CHROOTS.length; i++) {
        var chroot = COLDCARD_BASE_CHROOTS[i];
        if (bip32Path.startsWith(chroot)) {
          return chroot;
        }
      }
      return null;
    }

    /**
     * This validates three things for an incoming Coldcard bip32Path
     *
     * 1. Is the bip32path valid syntactically?
     * 2. Does the bip32path start with one of the known Coldcard chroots?
     * 3. Are there any hardened indices in the relative path below the chroot?
     */
  }, {
    key: "validateColdcardBip32Path",
    value: function validateColdcardBip32Path(bip32Path) {
      var bip32PathError = (0, _unchainedBitcoin.validateBIP32Path)(bip32Path);
      if (bip32PathError.length) {
        this.bip32ValidationErrorMessage = {
          text: bip32PathError,
          code: "coldcard.bip32_path.path_error"
        };
        return bip32PathError;
      }
      var coldcardChroot = this.chrootForBIP32Path(bip32Path);
      if (coldcardChroot) {
        if (coldcardChroot === bip32Path) {
          // asking for known base path, no deeper derivation
          return "";
        }
        var relativePath = (0, _unchainedBitcoin.getRelativeBIP32Path)(coldcardChroot, bip32Path);
        var relativePathError = (0, _unchainedBitcoin.validateBIP32Path)(relativePath, {
          mode: "unhardened"
        });
        if (relativePathError) {
          this.bip32ValidationErrorMessage = {
            text: relativePathError,
            code: "coldcard.bip32_path.no_hardened_relative_path_error"
          };
          return relativePathError;
        }
        return "";
      }
      var unknownColdcardParentBip32PathError = "The bip32Path must begin with one of the known Coldcard paths: ".concat(COLDCARD_BASE_CHROOTS);
      this.bip32ValidationErrorMessage = {
        text: unknownColdcardParentBip32PathError,
        code: "coldcard.bip32_path.unknown_chroot_error"
      };
      return unknownColdcardParentBip32PathError;
    }

    /**
     * Parse the Coldcard JSON file and do some basic error checking
     * add a field for rootFingerprint (it can sometimes be calculated
     * if not explicitly included)
     *
     */
  }, {
    key: "parse",
    value: function parse(file) {
      //In the case of keys (json), the file will look like:
      //
      //{
      //   "p2sh_deriv": "m/45'",
      //   "p2sh": "tpubDA4nUAdTmY...MmtZaVFEU5MtMfj7H",
      //   "p2wsh_p2sh_deriv": "m/48'/1'/0'/1'",          // originally they had this backwards
      //   "p2wsh_p2sh": "Upub5THcs...Qh27gWiL2wDoVwaW",  // originally they had this backwards
      //   "p2sh_p2wsh_deriv": "m/48'/1'/0'/1'",          // now it's right
      //   "p2sh_p2wsh": "Upub5THcs...Qh27gWiL2wDoVwaW",  // now it's right
      //   "p2wsh_deriv": "m/48'/1'/0'/2'",
      //   "p2wsh": "Vpub5n7tBWyvv...2hTzyeSKtZ5PQ1MRN",
      //   "xfp": "12abcdef"
      // }
      //
      // For now, we will derive unhardened from `p2sh_deriv`
      // FIXME: assume we will gain the ability to ask Coldcard for an arbitrary path
      //   (or at least a p2sh hardened path deeper than m/45')

      var data;
      if (_typeof(file) === "object") {
        data = file;
      } else if (typeof file === "string") {
        try {
          data = JSON.parse(file);
        } catch (error) {
          throw new Error("Unable to parse JSON.");
        }
      } else {
        throw new Error("Not valid JSON.");
      }
      if (Object.keys(data).length === 0) {
        throw new Error("Empty JSON file.");
      }

      // Coldcard changed the format of keys in the exported file to match
      // the convention of p2sh-p2wsh instead of what they had before
      // which was p2wsh-p2sh ... so one of these sets needs to be
      // in the file.
      if (!data.p2sh_deriv || !data.p2sh || !data.p2wsh_deriv || !data.p2wsh || (!data.p2wsh_p2sh_deriv || !data.p2wsh_p2sh) && (!data.p2sh_p2wsh_deriv || !data.p2sh_p2wsh)) {
        throw new Error("Missing required params. Was this file exported from a Coldcard?  If you are using firmware version 4.1.0 please upgrade to 4.1.1 or later.");
      }
      var xpubClass = _unchainedBitcoin.ExtendedPublicKey.fromBase58(data.p2sh);
      if (!data.xfp && xpubClass.depth !== 1) {
        throw new Error("No xfp in JSON file.");
      }

      // We can only find the fingerprint in the xpub if the depth is one
      // because the xpub includes its parent's fingerprint.
      var xfpFromWithinXpub = xpubClass.depth === 1 ? xpubClass.parentFingerprint && (0, _unchainedBitcoin.fingerprintToFixedLengthHex)(xpubClass.parentFingerprint) : null;

      // Sanity check if you send in a depth one xpub, we should get the same fingerprint
      if (xfpFromWithinXpub && data.xfp && xfpFromWithinXpub !== data.xfp.toLowerCase()) {
        throw new Error("Computed fingerprint does not match the one in the file.");
      }
      var rootFingerprint = data.xfp ? data.xfp : xfpFromWithinXpub;
      data.rootFingerprint = rootFingerprint.toLowerCase();
      return data;
    }

    /**
     * This method will take the result from the Coldcard JSON and:
     *
     * 1. determine which t/U/V/x/Y/Zpub to use
     * 2. derive deeper if necessary (and able) using functionality
     *    from unchained-bitcoin
     *
     */
  }, {
    key: "deriveDeeperXpubIfNecessary",
    value: function deriveDeeperXpubIfNecessary(result) {
      var knownColdcardChroot = this.chrootForBIP32Path(this.bip32Path);
      var relativePath = knownColdcardChroot && (0, _unchainedBitcoin.getRelativeBIP32Path)(knownColdcardChroot, this.bip32Path);
      var addressType = "";
      if (knownColdcardChroot !== null) {
        addressType = COLDCARD_BASE_BIP32_PATHS[knownColdcardChroot];
      }
      // result could have p2wsh_p2sh or p2sh_p2wsh based on firmware version. Blah!
      if (addressType.includes("_") && !result[addressType.toLowerCase()]) {
        // Firmware < v3.2.0
        addressType = "p2wsh_p2sh";
      }
      var prefix = this.network === _unchainedBitcoin.Network.TESTNET ? "tpub" : "xpub";
      // If the addressType is segwit, the imported key will not be in the xpub/tpub format,
      // so convert it.
      var baseXpub = addressType.toLowerCase().includes("w") ? (0, _unchainedBitcoin.convertExtendedPublicKey)(result[addressType.toLowerCase()], prefix) : result[addressType.toLowerCase()];
      return relativePath && relativePath.length ? (0, _unchainedBitcoin.deriveChildExtendedPublicKey)(baseXpub, relativePath, this.network) : baseXpub;
    }
  }]);
  return ColdcardMultisigSettingsFileParser;
}(ColdcardInteraction);
/**
 * Reads a public key and (optionally) derives deeper from data in an
 * exported JSON file uploaded from the Coldcard.
 *
 * @example
 * const interaction = new ColdcardExportPublicKey();
 * const reader = new FileReader(); // application dependent
 * const jsonFile = reader.readAsText('ccxp-0F056943.json'); // application dependent
 * const {publicKey, rootFingerprint, bip32Path} = interaction.parse(jsonFile);
 * console.log(publicKey);
 * // "026942..."
 * console.log(rootFingerprint);
 * // "0f056943"
 * console.log(bip32Path);
 * // "m/45'/0/0"
 */
var ColdcardExportPublicKey = /*#__PURE__*/function (_ColdcardMultisigSett) {
  _inherits(ColdcardExportPublicKey, _ColdcardMultisigSett);
  var _super3 = _createSuper(ColdcardExportPublicKey);
  function ColdcardExportPublicKey(_ref2) {
    var network = _ref2.network,
      bip32Path = _ref2.bip32Path;
    _classCallCheck(this, ColdcardExportPublicKey);
    return _super3.call(this, {
      network: network,
      bip32Path: bip32Path
    });
  }
  _createClass(ColdcardExportPublicKey, [{
    key: "messages",
    value: function messages() {
      return _get(_getPrototypeOf(ColdcardExportPublicKey.prototype), "messages", this).call(this);
    }
  }, {
    key: "parse",
    value: function parse(xpubJSONFile) {
      var result = _get(_getPrototypeOf(ColdcardExportPublicKey.prototype), "parse", this).call(this, xpubJSONFile);
      var xpub = this.deriveDeeperXpubIfNecessary(result);
      return {
        publicKey: _unchainedBitcoin.ExtendedPublicKey.fromBase58(xpub).pubkey,
        rootFingerprint: result.rootFingerprint,
        bip32Path: this.bip32Path
      };
    }
  }]);
  return ColdcardExportPublicKey;
}(ColdcardMultisigSettingsFileParser);
/**
 * Reads an extended public key and (optionally) derives deeper from data in an
 * exported JSON file uploaded from the Coldcard.
 *
 * @example
 * const interaction = new ColdcardExportExtendedPublicKey({network: Network.MAINNET, bip32Path: 'm/45'/0/0'});
 * const reader = new FileReader(); // application dependent
 * const jsonFile = reader.readAsText('ccxp-0F056943.json'); // application dependent
 * const {xpub, rootFingerprint, bip32Path} = interaction.parse(jsonFile);
 * console.log(xpub);
 * // "xpub..."
 * console.log(rootFingerprint);
 * // "0f056943"
 * console.log(bip32Path);
 * // "m/45'/0/0"
 */
exports.ColdcardExportPublicKey = ColdcardExportPublicKey;
var ColdcardExportExtendedPublicKey = /*#__PURE__*/function (_ColdcardMultisigSett2) {
  _inherits(ColdcardExportExtendedPublicKey, _ColdcardMultisigSett2);
  var _super4 = _createSuper(ColdcardExportExtendedPublicKey);
  function ColdcardExportExtendedPublicKey(_ref3) {
    var network = _ref3.network,
      bip32Path = _ref3.bip32Path;
    _classCallCheck(this, ColdcardExportExtendedPublicKey);
    return _super4.call(this, {
      network: network,
      bip32Path: bip32Path
    });
  }
  _createClass(ColdcardExportExtendedPublicKey, [{
    key: "messages",
    value: function messages() {
      return _get(_getPrototypeOf(ColdcardExportExtendedPublicKey.prototype), "messages", this).call(this);
    }
  }, {
    key: "parse",
    value: function parse(xpubJSONFile) {
      var result = _get(_getPrototypeOf(ColdcardExportExtendedPublicKey.prototype), "parse", this).call(this, xpubJSONFile);
      var xpub = this.deriveDeeperXpubIfNecessary(result);
      return {
        xpub: xpub,
        rootFingerprint: result.rootFingerprint,
        bip32Path: this.bip32Path
      };
    }
  }]);
  return ColdcardExportExtendedPublicKey;
}(ColdcardMultisigSettingsFileParser);
/**
 * Returns signature request data via a PSBT for a Coldcard to sign and
 * accepts a PSBT for parsing signatures from a Coldcard device
 *
 * @example
 * const interaction = new ColdcardSignMultisigTransaction({network, inputs, outputs, bip32paths, psbt});
 * console.log(interaction.request());
 * // "cHNidP8BA..."
 *
 * // Parse signatures from a signed PSBT
 * const signatures = interaction.parse(psbt);
 * console.log(signatures);
 * // {'029e866...': ['3045...01', ...]}
 *
 */
exports.ColdcardExportExtendedPublicKey = ColdcardExportExtendedPublicKey;
var ColdcardSignMultisigTransaction = /*#__PURE__*/function (_ColdcardInteraction2) {
  _inherits(ColdcardSignMultisigTransaction, _ColdcardInteraction2);
  var _super5 = _createSuper(ColdcardSignMultisigTransaction);
  function ColdcardSignMultisigTransaction(_ref4) {
    var _this2;
    var network = _ref4.network,
      inputs = _ref4.inputs,
      outputs = _ref4.outputs,
      bip32Paths = _ref4.bip32Paths,
      psbt = _ref4.psbt;
    _classCallCheck(this, ColdcardSignMultisigTransaction);
    _this2 = _super5.call(this);
    _defineProperty(_assertThisInitialized(_this2), "network", void 0);
    _defineProperty(_assertThisInitialized(_this2), "psbt", void 0);
    _defineProperty(_assertThisInitialized(_this2), "inputs", void 0);
    _defineProperty(_assertThisInitialized(_this2), "outputs", void 0);
    _defineProperty(_assertThisInitialized(_this2), "bip32Paths", void 0);
    _this2.network = network;
    _this2.inputs = inputs;
    _this2.outputs = outputs;
    _this2.bip32Paths = bip32Paths;
    if (psbt) {
      _this2.psbt = psbt;
    } else {
      try {
        _this2.psbt = (0, _unchainedBitcoin.unsignedMultisigPSBT)(network, inputs, outputs);
      } catch (e) {
        throw new Error("Unable to build the PSBT from the provided parameters.");
      }
    }
    return _this2;
  }
  _createClass(ColdcardSignMultisigTransaction, [{
    key: "messages",
    value: function messages() {
      var messages = _get(_getPrototypeOf(ColdcardSignMultisigTransaction.prototype), "messages", this).call(this);
      messages.push({
        state: _interaction.PENDING,
        level: _interaction.INFO,
        code: "coldcard.install_multisig_config",
        text: "Ensure your Coldcard has the multisig wallet installed."
      });
      messages.push({
        state: _interaction.PENDING,
        level: _interaction.INFO,
        code: "coldcard.download_psbt",
        text: "Download and save this PSBT file to your SD card."
      });
      messages.push({
        state: _interaction.PENDING,
        level: _interaction.INFO,
        code: "coldcard.transfer_psbt",
        text: "Transfer the PSBT file to your Coldcard."
      });
      messages.push({
        state: _interaction.ACTIVE,
        level: _interaction.INFO,
        code: "coldcard.transfer_psbt",
        text: "Transfer the PSBT file to your Coldcard."
      });
      messages.push({
        state: _interaction.ACTIVE,
        level: _interaction.INFO,
        code: "coldcard.select_psbt",
        text: "Choose 'Ready To Sign' and select the PSBT."
      });
      messages.push({
        state: _interaction.ACTIVE,
        level: _interaction.INFO,
        code: "coldcard.sign_psbt",
        text: "Verify the transaction details and sign."
      });
      messages.push({
        state: _interaction.ACTIVE,
        level: _interaction.INFO,
        code: "coldcard.upload_signed_psbt",
        text: "Upload the signed PSBT below."
      });
      return messages;
    }

    /**
     * Request for the PSBT data that needs to be signed.
     *
     * NOTE: the application may be expecting the PSBT in some format
     * other than the direct Object.
     *
     * E.g. PSBT in Base64 is interaction().request().toBase64()
     */
  }, {
    key: "request",
    value: function request() {
      return this.psbt;
    }

    /**
     * This calls a function in unchained-bitcoin which parses
     * PSBT files for sigantures and then returns an object with the format
     * {
     *   pubkey1 : [sig1, sig2, ...],
     *   pubkey2 : [sig1, sig2, ...]
     * }
     * This format may change in the future or there may be additional options for return type.
     */
  }, {
    key: "parse",
    value: function parse(psbtObject) {
      var signatures = (0, _unchainedBitcoin.parseSignaturesFromPSBT)(psbtObject);
      if (!signatures || Object.keys(signatures).length === 0) {
        throw new Error("No signatures found in the PSBT. Did you upload the right one?");
      }
      return signatures;
    }
  }]);
  return ColdcardSignMultisigTransaction;
}(ColdcardInteraction);
/**
 * Returns a valid multisig wallet config text file to send over to a Coldcard
 *
 * NOTE: technically only the root xfp of the signing device is required to be
 * correct, but we recommend only setting up the multisig wallet on the Coldcard
 * with complete xfp information. Here we actually turn this recommendation into a
 * requirement so as to minimize the number of wallet-config installations.
 *
 * This will likely move to its own generic class soon, and we'll only leave
 * the specifics of `adapt()` behind.
 *
 * This is an example Coldcard config file from
 * https://coldcardwallet.com/docs/multisig
 *
 * # Coldcard Multisig setup file (exported from 4369050F)
 * #
 * Name: MeMyself
 * Policy: 2 of 4
 * Derivation: m/45'
 * Format: P2WSH
 *
 * D0CFA66B: tpubD9429UXFGCTKJ9NdiNK4rC5...DdP9
 * 8E697B74: tpubD97nVL37v5tWyMf9ofh5rzn...XgSc
 * BE26B07B: tpubD9ArfXowvGHnuECKdGXVKDM...FxPa
 * 4369050F: tpubD8NXmKsmWp3a3DXhbihAYbY...9C8n
 *
 */
exports.ColdcardSignMultisigTransaction = ColdcardSignMultisigTransaction;
var ColdcardMultisigWalletConfig = /*#__PURE__*/function () {
  function ColdcardMultisigWalletConfig(_ref5) {
    var jsonConfig = _ref5.jsonConfig;
    _classCallCheck(this, ColdcardMultisigWalletConfig);
    _defineProperty(this, "jsonConfig", void 0);
    _defineProperty(this, "name", void 0);
    _defineProperty(this, "requiredSigners", void 0);
    _defineProperty(this, "totalSigners", void 0);
    _defineProperty(this, "addressType", void 0);
    _defineProperty(this, "extendedPublicKeys", void 0);
    if (_typeof(jsonConfig) === "object") {
      this.jsonConfig = jsonConfig;
    } else if (typeof jsonConfig === "string") {
      try {
        this.jsonConfig = JSON.parse(jsonConfig);
      } catch (error) {
        throw new Error("Unable to parse JSON.");
      }
    } else {
      throw new Error("Not valid JSON.");
    }
    if (this.jsonConfig.uuid || this.jsonConfig.name) {
      this.name = this.jsonConfig.uuid || this.jsonConfig.name;
    } else {
      throw new Error("Configuration file needs a UUID or a name.");
    }
    if (this.jsonConfig.quorum.requiredSigners && this.jsonConfig.quorum.totalSigners) {
      this.requiredSigners = this.jsonConfig.quorum.requiredSigners;
      this.totalSigners = this.jsonConfig.quorum.totalSigners;
    } else {
      throw new Error("Configuration file needs quorum.requiredSigners and quorum.totalSigners.");
    }
    if (this.jsonConfig.addressType) {
      this.addressType = jsonConfig.addressType;
    } else {
      throw new Error("Configuration file needs addressType.");
    }
    if (this.jsonConfig.extendedPublicKeys && this.jsonConfig.extendedPublicKeys.every(function (xpub) {
      // For each xpub, check that xfp exists, the length is 8, type is string, and valid hex
      if (!xpub.xfp || xpub.xfp === "Unknown") {
        throw new Error("ExtendedPublicKeys missing at least one xfp.");
      }
      if (typeof xpub.xfp !== "string") {
        throw new Error("XFP not a string");
      }
      if (xpub.xfp.length !== 8) {
        throw new Error("XFP not length 8");
      }
      if (isNaN(Number("0x".concat(xpub.xfp)))) {
        throw new Error("XFP is invalid hex");
      }
      return true;
    })) {
      this.extendedPublicKeys = this.jsonConfig.extendedPublicKeys;
    } else {
      throw new Error("Configuration file needs extendedPublicKeys.");
    }
  }

  /**
   * Output to be written to a text file and uploaded to Coldcard.
   */
  _createClass(ColdcardMultisigWalletConfig, [{
    key: "adapt",
    value: function adapt() {
      var output = "# Coldcard Multisig setup file (exported from unchained-wallets)\n# https://github.com/unchained-capital/unchained-wallets\n# v".concat(COLDCARD_WALLET_CONFIG_VERSION, "\n#\nName: ").concat(this.name, "\nPolicy: ").concat(this.requiredSigners, " of ").concat(this.totalSigners, "\nFormat: ").concat(this.addressType, "\n\n");
      // We need to loop over xpubs and output `Derivation: bip32path` and `xfp: xpub` for each
      var xpubs = this.extendedPublicKeys.map(function (xpub) {
        // Mask the derivation to the appropriate depth if it is not known
        var derivation = (0, _unchainedBitcoin.getMaskedDerivation)(xpub);
        return "Derivation: ".concat(derivation, "\n").concat(xpub.xfp, ": ").concat(xpub.xpub);
      });
      output += xpubs.join("\n");
      output += "\n";
      return output;
    }
  }]);
  return ColdcardMultisigWalletConfig;
}();
exports.ColdcardMultisigWalletConfig = ColdcardMultisigWalletConfig;