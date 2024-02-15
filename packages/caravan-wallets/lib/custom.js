"use strict";

require("core-js/modules/es6.reflect.get");
require("core-js/modules/es6.object.create");
require("core-js/modules/es6.reflect.construct");
require("core-js/modules/es6.function.bind");
require("core-js/modules/es6.object.set-prototype-of");
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.CustomSignMultisigTransaction = exports.CustomInteraction = exports.CustomExportExtendedPublicKey = exports.CUSTOM = void 0;
require("core-js/modules/web.dom.iterable");
require("core-js/modules/es6.array.iterator");
require("core-js/modules/es6.object.to-string");
require("core-js/modules/es6.object.keys");
require("core-js/modules/es6.string.starts-with");
require("core-js/modules/es6.regexp.split");
require("core-js/modules/es6.array.for-each");
require("core-js/modules/es6.array.find");
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
                                                                                                                                                                                                                                                                                                                                                                                               * Provides classes for interacting via text-based copy/paste XPUBs and
                                                                                                                                                                                                                                                                                                                                                                                               * download/sign generic PSBT files using a custom "device'
                                                                                                                                                                                                                                                                                                                                                                                               *
                                                                                                                                                                                                                                                                                                                                                                                               * The following API classes are implemented:
                                                                                                                                                                                                                                                                                                                                                                                               *
                                                                                                                                                                                                                                                                                                                                                                                               * * CustomExportExtendedPublicKey
                                                                                                                                                                                                                                                                                                                                                                                               * * CustomSignMultisigTransaction
                                                                                                                                                                                                                                                                                                                                                                                               */
var CUSTOM = "custom";

/**
 * Base class for interactions with Custom "devices"
 */
exports.CUSTOM = CUSTOM;
var CustomInteraction = /*#__PURE__*/function (_IndirectKeystoreInte) {
  _inherits(CustomInteraction, _IndirectKeystoreInte);
  var _super = _createSuper(CustomInteraction);
  function CustomInteraction() {
    _classCallCheck(this, CustomInteraction);
    return _super.apply(this, arguments);
  }
  return _createClass(CustomInteraction);
}(_interaction.IndirectKeystoreInteraction);
/**
 * Base class for text-based (or clipboard pasted) ExtendedPublicKey
 * This class handles parsing/validating the xpub and relevant
 * derivation properties. If no root fingerprint is provided, one will
 * be deterministically assigned.
 *
 * @example
 * const interaction = new CustomExportExtendedPublicKey({network: Network.MAINNET, bip32Path: "m/45'/0'/0'"});
 * const {xpub, rootFingerprint, bip32Path} = interaction.parse({xpub: xpub..., rootFingerprint: 0f056943});
 * console.log(xpub);
 * // "xpub..."
 * console.log(rootFingerprint);
 * // "0f056943"
 * console.log(bip32Path);
 * // "m/45'/0'/0'"
 * ** OR **
 * * const {xpub, rootFingerprint, bip32Path} = interaction.parse({xpub: xpub...});
 * console.log(xpub);
 * // "xpub..."
 * console.log(rootFingerprint);
 * // "096aed5e"
 * console.log(bip32Path);
 * // "m/45'/0'/0'"
 */
exports.CustomInteraction = CustomInteraction;
var CustomExportExtendedPublicKey = /*#__PURE__*/function (_CustomInteraction) {
  _inherits(CustomExportExtendedPublicKey, _CustomInteraction);
  var _super2 = _createSuper(CustomExportExtendedPublicKey);
  function CustomExportExtendedPublicKey(_ref) {
    var _this;
    var network = _ref.network,
      bip32Path = _ref.bip32Path;
    _classCallCheck(this, CustomExportExtendedPublicKey);
    _this = _super2.call(this);
    _defineProperty(_assertThisInitialized(_this), "network", void 0);
    _defineProperty(_assertThisInitialized(_this), "bip32Path", void 0);
    _defineProperty(_assertThisInitialized(_this), "validationErrorMessages", void 0);
    if ([_unchainedBitcoin.Network.MAINNET, _unchainedBitcoin.Network.TESTNET].find(function (net) {
      return net === network;
    })) {
      _this.network = network;
    } else {
      throw new Error("Unknown network.");
    }
    _this.validationErrorMessages = [];
    _this.bip32Path = bip32Path;
    var bip32PathError = (0, _unchainedBitcoin.validateBIP32Path)(bip32Path);
    if (bip32PathError.length) {
      _this.validationErrorMessages.push({
        code: "custom.bip32_path.path_error",
        text: bip32PathError
      });
    }
    return _this;
  }
  _createClass(CustomExportExtendedPublicKey, [{
    key: "isSupported",
    value: function isSupported() {
      return this.validationErrorMessages.length === 0;
    }
  }, {
    key: "messages",
    value: function messages() {
      var messages = _get(_getPrototypeOf(CustomExportExtendedPublicKey.prototype), "messages", this).call(this);
      if (this.validationErrorMessages.length) {
        this.validationErrorMessages.forEach(function (e) {
          messages.push({
            state: _interaction.PENDING,
            level: _interaction.ERROR,
            code: e.code,
            text: e.text
          });
        });
      }
      messages.push({
        state: _interaction.PENDING,
        level: _interaction.INFO,
        code: "custom.import_xpub",
        text: "Type or paste the extended public key here."
      });
      return messages;
    }

    /**
     * Parse the provided JSON and do some basic error checking
     */
  }, {
    key: "parse",
    value: function parse(data) {
      // build ExtendedPublicKey struct (validation happens in constructor)
      var xpubClass;
      var rootFingerprint;
      try {
        xpubClass = _unchainedBitcoin.ExtendedPublicKey.fromBase58(data.xpub);
      } catch (e) {
        throw new Error("Not a valid ExtendedPublicKey.");
      }
      try {
        if (data.rootFingerprint === "" || !data.rootFingerprint) {
          var pkLen = xpubClass.pubkey.length;
          // If no fingerprint is provided, we will assign one deterministically
          rootFingerprint = xpubClass.pubkey.substring(pkLen - 8);
        } else {
          (0, _unchainedBitcoin.validateRootFingerprint)(data.rootFingerprint);
          rootFingerprint = data.rootFingerprint;
        }
      } catch (e) {
        throw new Error("Root fingerprint validation error: ".concat(e.message.toLowerCase(), "."));
      }
      var numSlashes = this.bip32Path.split("/").length;
      var bipDepth = this.bip32Path.startsWith("m/") ? numSlashes - 1 : numSlashes;
      if (xpubClass.depth !== bipDepth) {
        throw new Error("Depth of ExtendedPublicKey (".concat(xpubClass.depth, ") does not match depth of BIP32 path (").concat(bipDepth, ")."));
      }
      return {
        xpub: xpubClass.base58String,
        rootFingerprint: rootFingerprint,
        bip32Path: this.bip32Path
      };
    }
  }]);
  return CustomExportExtendedPublicKey;
}(CustomInteraction);
/**
 * Returns signature request data via a PSBT for a Custom "device" to sign and
 * accepts a PSBT for parsing signatures from a Custom "device"
 *
 * @example
 * const interaction = new CustomSignMultisigTransaction({network, inputs, outputs, bip32paths, psbt});
 * console.log(interaction.request());
 * // "cHNidP8BA..."
 *
 * // Parse signatures from a signed PSBT
 * const signatures = interaction.parse(psbt);
 * console.log(signatures);
 * // {'029e866...': ['3045...01', ...]}
 *
 */
exports.CustomExportExtendedPublicKey = CustomExportExtendedPublicKey;
var CustomSignMultisigTransaction = /*#__PURE__*/function (_CustomInteraction2) {
  _inherits(CustomSignMultisigTransaction, _CustomInteraction2);
  var _super3 = _createSuper(CustomSignMultisigTransaction);
  function CustomSignMultisigTransaction(_ref2) {
    var _this2;
    var network = _ref2.network,
      inputs = _ref2.inputs,
      outputs = _ref2.outputs,
      bip32Paths = _ref2.bip32Paths,
      psbt = _ref2.psbt;
    _classCallCheck(this, CustomSignMultisigTransaction);
    _this2 = _super3.call(this);
    _defineProperty(_assertThisInitialized(_this2), "network", void 0);
    _defineProperty(_assertThisInitialized(_this2), "inputs", void 0);
    _defineProperty(_assertThisInitialized(_this2), "outputs", void 0);
    _defineProperty(_assertThisInitialized(_this2), "bip32Paths", void 0);
    _defineProperty(_assertThisInitialized(_this2), "psbt", void 0);
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
  _createClass(CustomSignMultisigTransaction, [{
    key: "messages",
    value: function messages() {
      var messages = _get(_getPrototypeOf(CustomSignMultisigTransaction.prototype), "messages", this).call(this);
      messages.push({
        state: _interaction.PENDING,
        level: _interaction.INFO,
        code: "custom.download_psbt",
        text: "Download and save this PSBT file."
      });
      messages.push({
        state: _interaction.PENDING,
        level: _interaction.INFO,
        code: "custom.sign_psbt",
        text: "Add your signature to the PSBT."
      });
      messages.push({
        state: _interaction.ACTIVE,
        level: _interaction.INFO,
        code: "custom.sign_psbt",
        text: "Verify the transaction details and sign."
      });
      messages.push({
        state: _interaction.ACTIVE,
        level: _interaction.INFO,
        code: "custom.upload_signed_psbt",
        text: "Upload the signed PSBT."
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
  return CustomSignMultisigTransaction;
}(CustomInteraction);
exports.CustomSignMultisigTransaction = CustomSignMultisigTransaction;