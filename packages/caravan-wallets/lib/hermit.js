"use strict";

require("core-js/modules/es6.reflect.get");
require("core-js/modules/es6.object.create");
require("core-js/modules/es6.reflect.construct");
require("core-js/modules/es6.function.bind");
require("core-js/modules/es6.object.set-prototype-of");
require("core-js/modules/es6.object.define-properties");
require("core-js/modules/es7.object.get-own-property-descriptors");
require("core-js/modules/es6.array.for-each");
require("core-js/modules/es6.array.filter");
require("core-js/modules/es6.object.keys");
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.HermitSignMultisigTransaction = exports.HermitInteraction = exports.HermitExportExtendedPublicKey = exports.HERMIT = void 0;
require("core-js/modules/web.dom.iterable");
require("core-js/modules/es6.array.iterator");
require("core-js/modules/es7.object.values");
require("core-js/modules/es6.regexp.match");
require("core-js/modules/es6.regexp.to-string");
require("core-js/modules/es6.date.to-string");
require("core-js/modules/es6.object.to-string");
require("core-js/modules/es6.regexp.constructor");
require("core-js/modules/es6.number.constructor");
require("core-js/modules/es7.symbol.async-iterator");
require("core-js/modules/es6.symbol");
require("core-js/modules/es6.object.define-property");
var _unchainedBitcoin = require("unchained-bitcoin");
var _interaction = require("./interaction");
var _bcur = require("./bcur");
function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }
function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, _toPropertyKey(descriptor.key), descriptor); } }
function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); Object.defineProperty(Constructor, "prototype", { writable: false }); return Constructor; }
function _get() { if (typeof Reflect !== "undefined" && Reflect.get) { _get = Reflect.get.bind(); } else { _get = function _get(target, property, receiver) { var base = _superPropBase(target, property); if (!base) return; var desc = Object.getOwnPropertyDescriptor(base, property); if (desc.get) { return desc.get.call(arguments.length < 3 ? target : receiver); } return desc.value; }; } return _get.apply(this, arguments); }
function _superPropBase(object, property) { while (!Object.prototype.hasOwnProperty.call(object, property)) { object = _getPrototypeOf(object); if (object === null) break; } return object; }
function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function"); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, writable: true, configurable: true } }); Object.defineProperty(subClass, "prototype", { writable: false }); if (superClass) _setPrototypeOf(subClass, superClass); }
function _setPrototypeOf(o, p) { _setPrototypeOf = Object.setPrototypeOf ? Object.setPrototypeOf.bind() : function _setPrototypeOf(o, p) { o.__proto__ = p; return o; }; return _setPrototypeOf(o, p); }
function _createSuper(Derived) { var hasNativeReflectConstruct = _isNativeReflectConstruct(); return function _createSuperInternal() { var Super = _getPrototypeOf(Derived), result; if (hasNativeReflectConstruct) { var NewTarget = _getPrototypeOf(this).constructor; result = Reflect.construct(Super, arguments, NewTarget); } else { result = Super.apply(this, arguments); } return _possibleConstructorReturn(this, result); }; }
function _possibleConstructorReturn(self, call) { if (call && (_typeof(call) === "object" || typeof call === "function")) { return call; } else if (call !== void 0) { throw new TypeError("Derived constructors may only return object or undefined"); } return _assertThisInitialized(self); }
function _assertThisInitialized(self) { if (self === void 0) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return self; }
function _isNativeReflectConstruct() { if (typeof Reflect === "undefined" || !Reflect.construct) return false; if (Reflect.construct.sham) return false; if (typeof Proxy === "function") return true; try { Boolean.prototype.valueOf.call(Reflect.construct(Boolean, [], function () {})); return true; } catch (e) { return false; } }
function _getPrototypeOf(o) { _getPrototypeOf = Object.setPrototypeOf ? Object.getPrototypeOf.bind() : function _getPrototypeOf(o) { return o.__proto__ || Object.getPrototypeOf(o); }; return _getPrototypeOf(o); }
function ownKeys(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); enumerableOnly && (symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; })), keys.push.apply(keys, symbols); } return keys; }
function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = null != arguments[i] ? arguments[i] : {}; i % 2 ? ownKeys(Object(source), !0).forEach(function (key) { _defineProperty(target, key, source[key]); }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)) : ownKeys(Object(source)).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } return target; }
function _typeof(obj) { "@babel/helpers - typeof"; return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (obj) { return typeof obj; } : function (obj) { return obj && "function" == typeof Symbol && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }, _typeof(obj); }
function _defineProperty(obj, key, value) { key = _toPropertyKey(key); if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }
function _toPropertyKey(arg) { var key = _toPrimitive(arg, "string"); return _typeof(key) === "symbol" ? key : String(key); }
function _toPrimitive(input, hint) { if (_typeof(input) !== "object" || input === null) return input; var prim = input[Symbol.toPrimitive]; if (prim !== undefined) { var res = prim.call(input, hint || "default"); if (_typeof(res) !== "object") return res; throw new TypeError("@@toPrimitive must return a primitive value."); } return (hint === "string" ? String : Number)(input); } /**
                                                                                                                                                                                                                                                                                                                                                                                               * Provides classes for interacting with Hermit.
                                                                                                                                                                                                                                                                                                                                                                                               *
                                                                                                                                                                                                                                                                                                                                                                                               * Hermit uses the Blockchain Commons UR encoding for data IO with
                                                                                                                                                                                                                                                                                                                                                                                               * individual UR parts represented as QR codes.
                                                                                                                                                                                                                                                                                                                                                                                               *
                                                                                                                                                                                                                                                                                                                                                                                               * When receiving data from Hermit, calling applications are
                                                                                                                                                                                                                                                                                                                                                                                               * responsible for parsing UR parts from the animated sequence of QR
                                                                                                                                                                                                                                                                                                                                                                                               * codes Hermit displays.  The `BCURDecode` class is designed to make
                                                                                                                                                                                                                                                                                                                                                                                               * this easy.
                                                                                                                                                                                                                                                                                                                                                                                               *
                                                                                                                                                                                                                                                                                                                                                                                               * When sending data to Hermit, these interaction classes encode the
                                                                                                                                                                                                                                                                                                                                                                                               * data into UR parts.  Calling applications are responsible for
                                                                                                                                                                                                                                                                                                                                                                                               * displaying these UR parts as an animated QR code sequence.
                                                                                                                                                                                                                                                                                                                                                                                               *
                                                                                                                                                                                                                                                                                                                                                                                               * The following API classes are implemented:
                                                                                                                                                                                                                                                                                                                                                                                               *
                                                                                                                                                                                                                                                                                                                                                                                               * * HermitExportExtendedPublicKey
                                                                                                                                                                                                                                                                                                                                                                                               * * HermitSignMultisigTransaction
                                                                                                                                                                                                                                                                                                                                                                                               */
var HERMIT = "hermit";
exports.HERMIT = HERMIT;
function commandMessage(data) {
  return _objectSpread(_objectSpread(_objectSpread({}, {
    state: _interaction.PENDING,
    level: _interaction.INFO,
    code: "hermit.command",
    mode: "wallet"
  }), {
    text: "".concat(data.instructions, " '").concat(data.command, "'")
  }), data);
}

/**
 * Base class for interactions with Hermit.
 */
var HermitInteraction = /*#__PURE__*/function (_IndirectKeystoreInte) {
  _inherits(HermitInteraction, _IndirectKeystoreInte);
  var _super = _createSuper(HermitInteraction);
  function HermitInteraction() {
    _classCallCheck(this, HermitInteraction);
    return _super.apply(this, arguments);
  }
  _createClass(HermitInteraction, [{
    key: "messages",
    value: function messages() {
      var messages = _get(_getPrototypeOf(HermitInteraction.prototype), "messages", this).call(this);
      messages.push({
        state: _interaction.ACTIVE,
        level: _interaction.INFO,
        code: "hermit.scanning",
        text: "Scan Hermit QR code sequence now."
      });
      return messages;
    }
  }]);
  return HermitInteraction;
}(_interaction.IndirectKeystoreInteraction);
/**
 * Reads an extended public key from data returned by Hermit's
 * `display-xpub` command.
 *
 * This interaction class works in tandem with the `BCURDecoder`
 * class.  The `BCURDecoder` parses data from Hermit, this class
 * interprets it.
 *
 * @example
 * // Hermit returns a descriptor encoded as hex through BC-UR.  Some
 * // application function needs to work with the BCURDecoder class to
 * // parse this data.
 * const descriptorHex = readQRCodeSequence();
 *
 * // The interaction parses the data from Hermit
 * const interaction = new HermitExportExtendedPublicKey();
 * const {xpub, bip32Path, rootFingerprint} = interaction.parse(descriptorHex);
 *
 * console.log(xpub);
 * // "xpub..."
 *
 * console.log(bip32Path);
 * // "m/45'/0'/0'"
 *
 * console.log(rootFingerprint);
 * // "abcdefgh"
 *
 */
// FIXME -- move all this descriptor regex and extraction stuff to unchained-bitcoin
exports.HermitInteraction = HermitInteraction;
var DESCRIPTOR_REGEXP = new RegExp("^\\[([a-fA-F0-9]{8})((?:/[0-9]+'?)+)\\]([a-km-zA-NP-Z1-9]+)$");
var HermitExportExtendedPublicKey = /*#__PURE__*/function (_HermitInteraction) {
  _inherits(HermitExportExtendedPublicKey, _HermitInteraction);
  var _super2 = _createSuper(HermitExportExtendedPublicKey);
  function HermitExportExtendedPublicKey(_ref) {
    var _this;
    var bip32Path = _ref.bip32Path;
    _classCallCheck(this, HermitExportExtendedPublicKey);
    _this = _super2.call(this);
    _defineProperty(_assertThisInitialized(_this), "bip32Path", void 0);
    _this.bip32Path = bip32Path;
    return _this;
  }
  _createClass(HermitExportExtendedPublicKey, [{
    key: "messages",
    value: function messages() {
      var messages = _get(_getPrototypeOf(HermitExportExtendedPublicKey.prototype), "messages", this).call(this);
      messages.push(commandMessage({
        instructions: "Run the following Hermit command, replacing the BIP32 path if you need to:",
        command: "display-xpub ".concat(this.bip32Path)
      }));
      return messages;
    }
  }, {
    key: "parse",
    value: function parse(descriptorHex) {
      if (!descriptorHex) {
        throw new Error("No descriptor received from Hermit.");
      }
      var descriptor = Buffer.from(descriptorHex, "hex").toString("utf8");
      var result = descriptor.match(DESCRIPTOR_REGEXP);
      if (result && result.length == 4) {
        return {
          rootFingerprint: result[1],
          bip32Path: "m".concat(result[2]),
          xpub: result[3]
        };
      } else {
        throw new Error("Invalid descriptor received from Hermit.");
      }
    }
  }]);
  return HermitExportExtendedPublicKey;
}(HermitInteraction);
/**
 * Displays a signature request for Hermit's `sign` command and reads
 * the resulting signature.
 *
 * This interaction class works in tandem with the `BCURDecoder`
 * class.  The `BCURDecoder` parses data from Hermit, this class
 * interprets it.
 *
 * @example
 * const interaction = new HermitSignMultisigTransaction({psbt});
 * const urParts = interaction.request();
 * console.log(urParts);
 * // [ "ur:...", "ur:...", ... ]
 *
 * // Some application function which knows how to display an animated
 * // QR code sequence.
 * displayQRCodeSequence(urParts);
 *
 * // Hermit returns a PSBT encoded as hex through BC-UR.  Some
 * // application function needs to work with the BCURDecoder class to
 * // parse this data.
 * const signedPSBTHex = readQRCodeSequence();
 *
 * // The interaction parses the data from Hermit.
 * const signedPSBTBase64 = interaction.parse(signedPSBTHex);
 * console.log(signedPSBTBase64);
 * // "cHNidP8B..."
 *
 */
exports.HermitExportExtendedPublicKey = HermitExportExtendedPublicKey;
var HermitSignMultisigTransaction = /*#__PURE__*/function (_HermitInteraction2) {
  _inherits(HermitSignMultisigTransaction, _HermitInteraction2);
  var _super3 = _createSuper(HermitSignMultisigTransaction);
  function HermitSignMultisigTransaction(_ref2) {
    var _this2;
    var psbt = _ref2.psbt,
      _ref2$returnSignature = _ref2.returnSignatureArray,
      returnSignatureArray = _ref2$returnSignature === void 0 ? false : _ref2$returnSignature;
    _classCallCheck(this, HermitSignMultisigTransaction);
    _this2 = _super3.call(this);
    _defineProperty(_assertThisInitialized(_this2), "psbt", void 0);
    _defineProperty(_assertThisInitialized(_this2), "returnSignatureArray", void 0);
    _this2.psbt = psbt;
    _this2.workflow.unshift("request");
    _this2.returnSignatureArray = returnSignatureArray;
    return _this2;
  }
  _createClass(HermitSignMultisigTransaction, [{
    key: "messages",
    value: function messages() {
      var messages = _get(_getPrototypeOf(HermitSignMultisigTransaction.prototype), "messages", this).call(this);
      messages.push(commandMessage({
        instructions: "Run the following Hermit command to scan this signature request:",
        command: "sign"
      }));
      if (!this.psbt) {
        messages.push({
          state: _interaction.PENDING,
          level: _interaction.ERROR,
          code: "hermit.sign",
          text: "PSBT is required."
        });
      }

      // FIXME validate PSBT!

      return messages;
    }
  }, {
    key: "request",
    value: function request() {
      var unsignedPSBTHex = Buffer.from(this.psbt, "base64").toString("hex");
      var encoder = new _bcur.BCUREncoder(unsignedPSBTHex);
      return encoder.parts();
    }
  }, {
    key: "parse",
    value: function parse(signedPSBTHex) {
      try {
        if (!signedPSBTHex) {
          throw new Error();
        }
        if (this.returnSignatureArray) {
          var signatures = (0, _unchainedBitcoin.parseSignaturesFromPSBT)(signedPSBTHex);
          if (!signatures) {
            throw new Error();
          }
          return Object.values(signatures)[0];
        } else {
          return Buffer.from(signedPSBTHex, "hex").toString("base64");
        }
      } catch (err) {
        throw new Error("No signature received from Hermit.");
      }
    }
  }]);
  return HermitSignMultisigTransaction;
}(HermitInteraction);
exports.HermitSignMultisigTransaction = HermitSignMultisigTransaction;