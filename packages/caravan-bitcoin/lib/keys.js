"use strict";

require("core-js/modules/es6.string.iterator");
require("core-js/modules/es6.weak-map");
require("core-js/modules/es6.reflect.get");
require("core-js/modules/es6.reflect.construct");
require("core-js/modules/es6.object.set-prototype-of");
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.ExtendedPublicKey = exports.EXTENDED_PUBLIC_KEY_VERSIONS = void 0;
exports.compressPublicKey = compressPublicKey;
exports.convertExtendedPublicKey = convertExtendedPublicKey;
exports.deriveChildExtendedPublicKey = deriveChildExtendedPublicKey;
exports.deriveChildPublicKey = deriveChildPublicKey;
exports.deriveExtendedPublicKey = deriveExtendedPublicKey;
exports.extendedPublicKeyRootFingerprint = extendedPublicKeyRootFingerprint;
exports.fingerprintToFixedLengthHex = fingerprintToFixedLengthHex;
exports.getFingerprintFromPublicKey = getFingerprintFromPublicKey;
exports.getMaskedDerivation = getMaskedDerivation;
exports.isKeyCompressed = isKeyCompressed;
exports.validateExtendedPublicKey = validateExtendedPublicKey;
exports.validateExtendedPublicKeyForNetwork = validateExtendedPublicKeyForNetwork;
exports.validatePrefix = validatePrefix;
exports.validatePublicKey = validatePublicKey;
exports.validateRootFingerprint = validateRootFingerprint;
require("core-js/modules/es6.number.constructor");
require("core-js/modules/es7.symbol.async-iterator");
require("core-js/modules/es6.symbol");
require("core-js/modules/es6.string.repeat");
require("core-js/modules/es6.regexp.to-string");
require("core-js/modules/es6.array.slice");
require("core-js/modules/es7.array.includes");
require("core-js/modules/es6.string.includes");
require("core-js/modules/es6.regexp.split");
require("core-js/modules/web.dom.iterable");
require("core-js/modules/es6.array.iterator");
require("core-js/modules/es6.object.to-string");
require("core-js/modules/es6.object.keys");
var _bitcoinjsLib = require("bitcoinjs-lib");
var bip32 = _interopRequireWildcard(require("bip32"));
var _bs58check = _interopRequireDefault(require("bs58check"));
var _bufio = require("bufio");
var _assert = _interopRequireDefault(require("assert"));
var _utils = require("./utils");
var _paths = require("./paths");
var _networks = require("./networks");
var _p2sh_p2wsh = require("./p2sh_p2wsh");
var _p2wsh = require("./p2wsh");
function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }
function _getRequireWildcardCache(nodeInterop) { if (typeof WeakMap !== "function") return null; var cacheBabelInterop = new WeakMap(); var cacheNodeInterop = new WeakMap(); return (_getRequireWildcardCache = function _getRequireWildcardCache(nodeInterop) { return nodeInterop ? cacheNodeInterop : cacheBabelInterop; })(nodeInterop); }
function _interopRequireWildcard(obj, nodeInterop) { if (!nodeInterop && obj && obj.__esModule) { return obj; } if (obj === null || _typeof(obj) !== "object" && typeof obj !== "function") { return { default: obj }; } var cache = _getRequireWildcardCache(nodeInterop); if (cache && cache.has(obj)) { return cache.get(obj); } var newObj = {}; var hasPropertyDescriptor = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var key in obj) { if (key !== "default" && Object.prototype.hasOwnProperty.call(obj, key)) { var desc = hasPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : null; if (desc && (desc.get || desc.set)) { Object.defineProperty(newObj, key, desc); } else { newObj[key] = obj[key]; } } } newObj.default = obj; if (cache) { cache.set(obj, newObj); } return newObj; }
function _typeof(obj) { "@babel/helpers - typeof"; return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (obj) { return typeof obj; } : function (obj) { return obj && "function" == typeof Symbol && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }, _typeof(obj); }
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
function _defineProperty(obj, key, value) { key = _toPropertyKey(key); if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }
function _toPropertyKey(arg) { var key = _toPrimitive(arg, "string"); return _typeof(key) === "symbol" ? key : String(key); }
function _toPrimitive(input, hint) { if (_typeof(input) !== "object" || input === null) return input; var prim = input[Symbol.toPrimitive]; if (prim !== undefined) { var res = prim.call(input, hint || "default"); if (_typeof(res) !== "object") return res; throw new TypeError("@@toPrimitive must return a primitive value."); } return (hint === "string" ? String : Number)(input); } /* eslint-disable accessor-pairs */ /**
                                                                                                                                                                                                                                                                                                                                                                                                                                   * This module provides functions for validating & deriving public
                                                                                                                                                                                                                                                                                                                                                                                                                                   * keys and extended public keys.
                                                                                                                                                                                                                                                                                                                                                                                                                                   *
                                                                                                                                                                                                                                                                                                                                                                                                                                   * @module keys
                                                                                                                                                                                                                                                                                                                                                                                                                                   */
var EXTENDED_PUBLIC_KEY_VERSIONS = {
  xpub: "0488b21e",
  ypub: "049d7cb2",
  zpub: "04b24746",
  Ypub: "0295b43f",
  Zpub: "02aa7ed3",
  tpub: "043587cf",
  upub: "044a5262",
  vpub: "045f1cf6",
  Upub: "024289ef",
  Vpub: "02575483"
};

/**
 * Validate whether or not a string is a valid extended public key prefix
 * @param {string} prefix string to be tested
 * @returns {null} returns null if valid
 * @throws Error with message indicating the invalid prefix.
 */
exports.EXTENDED_PUBLIC_KEY_VERSIONS = EXTENDED_PUBLIC_KEY_VERSIONS;
function validatePrefix(prefix) {
  if (!EXTENDED_PUBLIC_KEY_VERSIONS[prefix]) {
    throw new Error("Invalid prefix \"".concat(prefix, "\" for extended public key."));
  }
  return null;
}

/**
 * checks length, is string, and valid hex
 * @param {string} rootFingerprint - fingerprint to validate
 * @return {void}
 */
function validateRootFingerprint(rootFingerprint) {
  (0, _assert.default)(typeof rootFingerprint === "string", "Root fingerprint must be a string.");
  (0, _assert.default)(rootFingerprint.length === 8, "Expected hex value of length 8");
  var rootXfpError = (0, _utils.validateHex)(rootFingerprint);
  (0, _assert.default)(!rootXfpError.length, "Root fingerprint must be valid hex");
}

/**
 * Struct object for encoding and decoding extended public keys.
 * base58 encoded serialization of the following information:
 * [ version ][ depth ][ parent fingerprint ][ key index ][ chain code ][ pubkey ]
 * @param {string} options.bip32Path e.g. m/45'/0'/0
 * @param {string} options.pubkey pubkey found at bip32Path
 * @param {string} options.chaincode chaincode corresponding to pubkey and path
 * @param {string} options.parentFingerprint - fingerprint of parent public key
 * @param {string} [options.network = mainnet] - mainnet or testnet
 * @param {string} [options.rootFingerprint] - the root fingerprint of the device, e.g. 'ca2ab33f'
 * @example
 * import { ExtendedPublicKey } from "unchained-bitcoin"
 * const xpub = ExtendedPublicKey.fromBase58("xpub6CCHViYn5VzKSmKD9cK9LBDPz9wBLV7owXJcNDioETNvhqhVtj3ABnVUERN9aV1RGTX9YpyPHnC4Ekzjnr7TZthsJRBiXA4QCeXNHEwxLab")
 * console.log(xpub.encode()) // returns raw Buffer of xpub encoded as per BIP32
 * console.log(xpub.toBase58()) // returns base58 check encoded xpub
 */
var ExtendedPublicKey = /*#__PURE__*/function (_Struct) {
  _inherits(ExtendedPublicKey, _Struct);
  var _super = _createSuper(ExtendedPublicKey);
  function ExtendedPublicKey(options) {
    var _this;
    _classCallCheck(this, ExtendedPublicKey);
    _this = _super.call(this);
    _defineProperty(_assertThisInitialized(_this), "path", void 0);
    _defineProperty(_assertThisInitialized(_this), "sequence", void 0);
    _defineProperty(_assertThisInitialized(_this), "index", void 0);
    _defineProperty(_assertThisInitialized(_this), "depth", void 0);
    _defineProperty(_assertThisInitialized(_this), "chaincode", void 0);
    _defineProperty(_assertThisInitialized(_this), "pubkey", void 0);
    _defineProperty(_assertThisInitialized(_this), "parentFingerprint", void 0);
    _defineProperty(_assertThisInitialized(_this), "network", void 0);
    _defineProperty(_assertThisInitialized(_this), "version", void 0);
    _defineProperty(_assertThisInitialized(_this), "rootFingerprint", void 0);
    _defineProperty(_assertThisInitialized(_this), "base58String", void 0);
    if (!options || !Object.keys(options).length) {
      return _possibleConstructorReturn(_this, _assertThisInitialized(_this));
    }
    if (options.path) {
      var pathError = (0, _paths.validateBIP32Path)(options.path);
      (0, _assert.default)(!pathError.length, pathError);
      _this.path = options.path;
      _this.sequence = (0, _paths.bip32PathToSequence)(_this.path);
      _this.index = _this.sequence[_this.sequence.length - 1];
      _this.depth = _this.path.split("/").length - 1;
    } else {
      (0, _assert.default)(options.depth !== undefined && options.index !== undefined && options.depth >= 0 && options.index >= 0, "Either an absolute bip32 path or index and depth are required to create ExtendedPublicKey");
      _this.depth = options.depth;
      _this.index = options.index;
    }
    (0, _assert.default)(options.pubkey, "pubkey required to create ExtendedPublicKey");
    var pubKeyError = validatePublicKey(options.pubkey);
    (0, _assert.default)(!pubKeyError.length, pubKeyError);
    _this.pubkey = isKeyCompressed(options.pubkey) ? options.pubkey : compressPublicKey(options.pubkey);
    (0, _assert.default)(options.chaincode && options.chaincode.length === 64, "xpub derivation requires 32-byte chaincode");
    var chaincodeError = (0, _utils.validateHex)(options.chaincode);
    (0, _assert.default)(!chaincodeError.length, chaincodeError);
    _this.chaincode = options.chaincode;
    (0, _assert.default)(typeof options.parentFingerprint === "number");
    _this.parentFingerprint = options.parentFingerprint;
    if (options.network) {
      (0, _assert.default)([_networks.Network.MAINNET, _networks.Network.TESTNET].includes(options.network), "Expected network to be one of ".concat(_networks.Network.MAINNET, " or ").concat(_networks.Network.TESTNET, "."));
      _this.network = options.network;
    } else {
      _this.network = _networks.Network.MAINNET;
    }
    _this.version = _this.network === _networks.Network.MAINNET ? EXTENDED_PUBLIC_KEY_VERSIONS.xpub : EXTENDED_PUBLIC_KEY_VERSIONS.tpub;
    if (options.rootFingerprint) {
      validateRootFingerprint(options.rootFingerprint);
      _this.rootFingerprint = options.rootFingerprint;
    }
    _this.base58String = _this.toBase58();
    return _this;
  }

  /**
   * A Buffer Writer used to encode an xpub. This is called
   * by the `encode` and `toBase58` methods
   * @param {BufferWriter} bw bufio.BufferWriter
   * @returns {void} doesn't have a return, only updates given buffer writer
   */
  _createClass(ExtendedPublicKey, [{
    key: "write",
    value: function write(bw) {
      bw.writeString(this.version, "hex");
      bw.writeU8(this.depth);
      bw.writeU32BE(this.parentFingerprint);
      bw.writeU32BE(this.index);
      bw.writeString(this.chaincode, "hex");
      bw.writeString(this.pubkey, "hex");
    }
    /**
     * Given a network string, will update the network and matching
     * version magic bytes used for generating xpub
     * @param {string} network - one of "mainnet" or "testnet"
     * @returns {void}
     */
  }, {
    key: "setNetwork",
    value: function setNetwork(network) {
      (0, _assert.default)([_networks.Network.MAINNET, _networks.Network.TESTNET, _networks.Network.REGTEST].includes(network), "Expected network to be one of ".concat(_networks.Network.MAINNET, ", ").concat(_networks.Network.TESTNET, ", or ").concat(_networks.Network.REGTEST, "."));
      this.network = network;
      this.version = this.network === _networks.Network.MAINNET ? EXTENDED_PUBLIC_KEY_VERSIONS.xpub : EXTENDED_PUBLIC_KEY_VERSIONS.tpub;
    }
    /**
     * @param {string} bip32Path set this xpub's path
     * @returns {void}
     */
  }, {
    key: "setBip32Path",
    value: function setBip32Path(bip32Path) {
      var pathError = (0, _paths.validateBIP32Path)(bip32Path);
      (0, _assert.default)(!pathError.length, pathError);
      this.path = bip32Path;
    }
    /**
     * @param {string} rootFingerprint fingerprint of pubkey at m/
     * @returns {void}
     */
  }, {
    key: "setRootFingerprint",
    value: function setRootFingerprint(rootFingerprint) {
      validateRootFingerprint(rootFingerprint);
      this.rootFingerprint = rootFingerprint;
    }
  }, {
    key: "encode",
    value: function encode(extra) {
      return _get(_getPrototypeOf(ExtendedPublicKey.prototype), "encode", this).call(this, extra);
    }
    /**
     * Return the base58 encoded xpub, adding the
     * @returns {string} base58check encoded xpub, prefixed by network
     */
  }, {
    key: "toBase58",
    value: function toBase58() {
      return _bs58check.default.encode(this.encode());
    }
    /**
     * Return a new Extended Public Key class given
     * an xpub string
     * @param {string} data base58 check encoded xpub
     * @returns {ExtendedPublicKey} new ExtendedPublicKey instance
     */
  }, {
    key: "addBase58String",
    /**
     * Sometimes we hop back and forth between a "Rich ExtendedPublicKey"
     * (a Struct with a couple extra parameters set) and the minimal
     * Struct - let's keep the actual string of the Struct around
     * for easy usage in other functions
     * @returns {void}
     */
    value: function addBase58String() {
      this.base58String = this.toBase58();
    }
    /**
     * Used by the decoder to convert a raw xpub Buffer into
     * an ExtendedPublicKey class
     * @param {BufferReader} br - A bufio.BufferReader
     * @returns {ExtendedPublicKey} new instance of Extended Public Key
     */
  }, {
    key: "read",
    value: function read(br) {
      this.version = br.readString(4, "hex");
      this.depth = br.readU8();
      this.parentFingerprint = br.readU32BE();
      this.index = br.readU32BE();
      this.chaincode = br.readString(32, "hex");
      this.pubkey = br.readString(33, "hex");
      this.base58String = this.toBase58();
      return this;
    }
  }], [{
    key: "fromBase58",
    value: function fromBase58(data) {
      return ExtendedPublicKey.decode(_bs58check.default.decode(data));
    }
  }, {
    key: "decode",
    value: function decode(data, extra) {
      return _get(_getPrototypeOf(ExtendedPublicKey), "decode", this).call(this, data, extra);
    }
  }]);
  return ExtendedPublicKey;
}(_bufio.Struct);
/**
 * Convert an extended public key between formats
 * @param {string} extendedPublicKey - the extended public key to convert
 * @param {string} targetPrefix - the target format to convert to
 * @example
 * import {convertExtendedPublicKey} from "unchained-bitcoin";
 * const tpub = convertExtendedPublicKey("xpub6CCH...", "tpub");
 * console.log(tpub.extendedPublicKey, tpub.message)
 * // tpubDCZv...
 * @returns {(string|Record<string, unknown>)} converted extended public key or error object
 * with the failed key and error message
 */
exports.ExtendedPublicKey = ExtendedPublicKey;
function convertExtendedPublicKey(extendedPublicKey, targetPrefix) {
  try {
    var sourcePrefix = extendedPublicKey.slice(0, 4);
    validatePrefix(targetPrefix);
    validatePrefix(sourcePrefix);
    var decodedExtendedPublicKey = _bs58check.default.decode(extendedPublicKey.trim());
    var extendedPublicKeyNoPrefix = decodedExtendedPublicKey.slice(4);
    var extendedPublicKeyNewPrefix = Buffer.concat([Buffer.from(EXTENDED_PUBLIC_KEY_VERSIONS[targetPrefix], "hex"), extendedPublicKeyNoPrefix]);
    return _bs58check.default.encode(extendedPublicKeyNewPrefix);
  } catch (err) {
    var e = err;
    throw new Error("Unable to convert extended public key: " + e.message);
  }
}

/**
 * Check to see if an extended public key is of the correct prefix for the network
 * this can be used in conjunction with convertExtendedPublicKey to attempt to automatically convert
 * @param {string} extendedPublicKey - the extended public key to check
 * @param {string} network - the bitcoin network
 * @example
 * import {validateExtendedPublicKeyForNetwork} from "unchained-bitcoin";
 * console.log(validateExtendedPublicKeyForNetwork('xpub...', MAINNET)) // empty
 * console.log(validateExtendedPublicKeyForNetwork('tpub...', MAINNET)) // "Extended public key must begin with ...."
 * @returns {string} a validation message or empty if valid
 */
function validateExtendedPublicKeyForNetwork(extendedPublicKey, network) {
  var requiredPrefix = "'xpub'";
  var requiresTpub = network === _networks.Network.TESTNET || network === _networks.Network.REGTEST;
  if (requiresTpub) {
    requiredPrefix += " or 'tpub'";
  }
  var prefix = extendedPublicKey.slice(0, 4);
  if (network === _networks.Network.MAINNET && prefix !== "xpub" || requiresTpub && prefix !== "tpub") {
    return "Extended public key must begin with ".concat(requiredPrefix, ".");
  }
  return "";
}

/**
 * Validate the given extended public key.
 *
 * - Must start with the appropriate (network-dependent) prefix.
 * - Must be a valid BIP32 extended public key
 *
 * @param {string} xpubString - base58 encoded extended public key (`xpub...`)
 * @param {module:networks.Networks} network  - bitcoin network
 * @returns {string} empty if valid or corresponding validation message if not
 * @example
 * import {validateExtendedPublicKey} from "unchained-bitcoin";
 * console.log(validateExtendedPublicKey("", MAINNET)); // "Extended public key cannot be blank."
 * console.log(validateExtendedPublicKey("foo", MAINNET)); // "Extended public key must begin with ..."
 * console.log(validateExtendedPublicKey("xpub123", MAINNET)); // "Extended public key is too short."
 * console.log(validateExtendedPublicKey("tpub123...", MAINNET)); // "Extended public key must begin with ...."
 * console.log(validateExtendedPublicKey("xpub123%%!~~...", MAINNET)); // "Invalid extended public key"
 * console.log(validateExtendedPublicKey("xpub123...", MAINNET)); // ""
 */
function validateExtendedPublicKey(xpubString, network) {
  if (xpubString === null || xpubString === undefined || xpubString === "") {
    return "Extended public key cannot be blank.";
  }
  if (xpubString.length < 4) {
    return "Invalid extended public key. Value ".concat(xpubString, " is too short");
  }
  var prefixError = validateExtendedPublicKeyForNetwork(xpubString, network);
  if (prefixError) return prefixError;
  if (xpubString.length < 111) {
    return "Extended public key is too short.";
  }
  try {
    ExtendedPublicKey.fromBase58(xpubString);
  } catch (e) {
    return "Invalid extended public key.";
  }
  return "";
}

/**
 * Validate the given public key.
 *
 * - Must be valid hex.
 * - Must be a valid BIP32 public key.
 *
 * @param {string} pubkeyHex - (compressed) public key in hex
 * @param {string} [addressType] - one of P2SH, P2SH-P2WSH, P2WSH
 * @returns {string} empty if valid or corresponding validation message if not
 * @example
 * import {validatePublicKey} from "unchained-bitcoin";
 * console.log(validatePublicKey("")); // "Public key cannot be blank."
 * console.log(validatePublicKey("zzzz")); // "Invalid hex..."
 * console.log(validatePublicKey("deadbeef")); // "Invalid public key."
 * console.log(validatePublicKey("03b32dc780fba98db25b4b72cf2b69da228f5e10ca6aa8f46eabe7f9fe22c994ee")); // ""
 * console.log(validatePublicKey("04a17f3ad2ecde2fff2abd1b9ca77f35d5449a3b50a8b2dc9a0b5432d6596afd01ee884006f7e7191f430c7881626b95ae1bcacf9b54d7073519673edaea71ee53")); // ""
 * console.log(validatePublicKey("04a17f3ad2ecde2fff2abd1b9ca77f35d5449a3b50a8b2dc9a0b5432d6596afd01ee884006f7e7191f430c7881626b95ae1bcacf9b54d7073519673edaea71ee53", "P2SH")); // ""
 * console.log(validatePublicKey("04a17f3ad2ecde2fff2abd1b9ca77f35d5449a3b50a8b2dc9a0b5432d6596afd01ee884006f7e7191f430c7881626b95ae1bcacf9b54d7073519673edaea71ee53", "P2WSH")); // "P2WSH does not support uncompressed public keys."
 */
function validatePublicKey(pubkeyHex, addressType) {
  if (pubkeyHex === null || pubkeyHex === undefined || pubkeyHex === "") {
    return "Public key cannot be blank.";
  }
  var error = (0, _utils.validateHex)(pubkeyHex);
  if (error !== "") {
    return error;
  }
  try {
    _bitcoinjsLib.ECPair.fromPublicKey(Buffer.from(pubkeyHex, "hex"));
  } catch (e) {
    return "Invalid public key.";
  }
  if (!isKeyCompressed(pubkeyHex) && addressType && [_p2sh_p2wsh.P2SH_P2WSH, _p2wsh.P2WSH].includes(addressType)) {
    return "".concat(addressType, " does not support uncompressed public keys.");
  }
  return "";
}

/**
 * Compresses the given public key.
 *
 * @param {string} publicKey - (uncompressed) public key in hex
 * @returns {string} compressed public key in hex
 * @example
 * import {compressPublicKey} from "unchained-bitcoin";
 * console.log(compressPublicKey("04b32dc780fba98db25b4b72cf2b69da228f5e10ca6aa8f46eabe7f9fe22c994ee6e43c09d025c2ad322382347ec0f69b4e78d8e23c8ff9aa0dd0cb93665ae83d5"));
 * // "03b32dc780fba98db25b4b72cf2b69da228f5e10ca6aa8f46eabe7f9fe22c994ee"
 */
function compressPublicKey(publicKey) {
  // validate Public Key Length
  // validate Public Key Structure
  var pubkeyBuffer = Buffer.from(publicKey, "hex");
  // eslint-disable-next-line no-bitwise
  var prefix = (pubkeyBuffer[64] & 1) !== 0 ? 0x03 : 0x02;
  var prefixBuffer = Buffer.alloc(1);
  prefixBuffer[0] = prefix;
  return Buffer.concat([prefixBuffer, pubkeyBuffer.slice(1, 1 + 32)]).toString("hex");
}

/**
 * Return the public key at the given BIP32 path below the given
 * extended public key.
 *
 * @param {string} extendedPublicKey - base58 encoded extended public key (`xpub...`)
 * @param {string} bip32Path - BIP32 derivation path string (with or without initial `m/`)
 * @param {module:networks.Networks} network - bitcoin network
 * @returns {string} (compressed) child public key in hex
 * @example
 * import {deriveChildPublicKey, MAINNET} from "unchained-bitcoin";
 * const xpub = "xpub6CCHViYn5VzKSmKD9cK9LBDPz9wBLV7owXJcNDioETNvhqhVtj3ABnVUERN9aV1RGTX9YpyPHnC4Ekzjnr7TZthsJRBiXA4QCeXNHEwxLab";
 * console.log(deriveChildPublicKey(xpub, "m/0/0", MAINNET));
 * // "021a0b6eb37bd9d2767a364601e41635a11c1dbbbb601efab8406281e210336ace"
 * console.log(deriveChildPublicKey(xpub, "0/0", MAINNET)); // w/o leading `m/`
 * // "021a0b6eb37bd9d2767a364601e41635a11c1dbbbb601efab8406281e210336ace"
 *
 */
function deriveChildPublicKey(extendedPublicKey, bip32Path, network) {
  if (bip32Path.slice(0, 2) === "m/") {
    return deriveChildPublicKey(extendedPublicKey, bip32Path.slice(2), network);
  }
  var node = bip32.fromBase58(extendedPublicKey, (0, _networks.networkData)(network));
  var child = node.derivePath(bip32Path);
  return (0, _utils.toHexString)(child.publicKey);
}

/**
 * Return the extended public key at the given BIP32 path below the
 * given extended public key.
 *
 * @param {string} extendedPublicKey - base58 encoded extended public key (`xpub...`)
 * @param {string} bip32Path - BIP32 derivation path string (with or without initial `m/`)
 * @param {module:networks.Networks} network - bitcoin network
 * @returns {string} child extended public key in base58
 * @example
 * import {deriveChildExtendedPublicKey, MAINNET} from "unchained-bitcoin";
 * const xpub = "xpub6CCHViYn5VzKSmKD9cK9LBDPz9wBLV7owXJcNDioETNvhqhVtj3ABnVUERN9aV1RGTX9YpyPHnC4Ekzjnr7TZthsJRBiXA4QCeXNHEwxLab";
 * console.log(deriveChildExtendedPublicKey(xpub, "m/0/0", MAINNET));
 * // "xpub6GYTTMaaN8bSEhicdKq7ji9H7B2SL4un33obThv9aekop4J7L7B3snYMnJUuwXJiUmsbSVSyZydbqLC97JMWnj3R4MHz6JNunMJhjEBKovS"
 * console.log(deriveChildExtendedPublicKey(xpub, "0/0", MAINNET)); // without initial `m/`
 * // "xpub6GYTTMaaN8bSEhicdKq7ji9H7B2SL4un33obThv9aekop4J7L7B3snYMnJUuwXJiUmsbSVSyZydbqLC97JMWnj3R4MHz6JNunMJhjEBKovS"

 */
function deriveChildExtendedPublicKey(extendedPublicKey, bip32Path, network) {
  if (bip32Path.slice(0, 2) === "m/") {
    return deriveChildExtendedPublicKey(extendedPublicKey, bip32Path.slice(2), network);
  }
  var node = bip32.fromBase58(extendedPublicKey, (0, _networks.networkData)(network));
  var child = node.derivePath(bip32Path);
  return child.toBase58();
}

/**
 * Check if a given pubkey is compressed or not by checking its length
 * and the possible prefixes
 * @param {string | Buffer} _pubkey pubkey to check
 * @returns {boolean} true if compressed, otherwise false
 * @example
 * import {isKeyCompressed} from "unchained-bitcoin"
 * const uncompressed = "0487cb4929c287665fbda011b1afbebb0e691a5ee11ee9a561fcd6adba266afe03f7c55f784242305cfd8252076d038b0f3c92836754308d06b097d11e37bc0907"
 * const compressed = "0387cb4929c287665fbda011b1afbebb0e691a5ee11ee9a561fcd6adba266afe03"
 * console.log(isKeyCompressed(uncompressed)) // false
 * console.log(isKeyCompressed(compressed)) // true
 */
function isKeyCompressed(_pubkey) {
  var pubkey = _pubkey;
  if (!Buffer.isBuffer(_pubkey)) pubkey = Buffer.from(_pubkey, "hex");
  return pubkey.length === 33 && (pubkey[0] === 2 || pubkey[0] === 3);
}

/**
 * Get fingerprint for a given pubkey. This is useful for generating xpubs
 * which need the fingerprint of the parent pubkey. If not a compressed key
 * then this function will attempt to compress it.
 * @param {string} _pubkey - pubkey to derive fingerprint from
 * @returns {number} fingerprint
 * @example
 * import {getFingerprintFromPublicKey} from "unchained-bitcoin"
 * const pubkey = "03b32dc780fba98db25b4b72cf2b69da228f5e10ca6aa8f46eabe7f9fe22c994ee"
 * console.log(getFingerprintFromPublicKey(pubkey)) // 724365675
 *
 * const uncompressedPubkey = "04dccdc7fc599ed379c415fc2bb398b1217f0142af23692359057094ce306cd3930e6634c71788b9ed283219ca2fea102aaf137cd74e025cce97b94478a02029cf"
 * console.log(getFingerprintFromPublicKey(uncompressedPubkey)) // 247110101
 */
function getFingerprintFromPublicKey(_pubkey) {
  var pubkey = _pubkey;
  if (!isKeyCompressed(_pubkey)) {
    pubkey = compressPublicKey(_pubkey);
  }
  var pubkeyBuffer = Buffer.from(pubkey, "hex");
  var hash = (0, _utils.hash160)(pubkeyBuffer);
  return (hash[0] << 24 | hash[1] << 16 | hash[2] << 8 | hash[3]) >>> 0;
}

/**
 * Take a fingerprint and return a zero-padded, hex-formatted string
 * that is exactly eight characters long.
 *
 * @param {number} xfp the fingerprint
 * @returns {string} zero-padded, fixed-length hex xfp
 *
 * @example
 * import {fingerprintToFixedLengthHex} from "unchained-bitcoin"
 * const pubkeyFingerprint = 724365675
 * console.log(fingerprintToFixedLengthHex(pubkeyFingerprint)) // 2b2cf16b
 *
 * const uncompressedPubkeyFingerprint = 247110101
 * console.log(fingerprintToFixedLengthHex(uncompressedPubkeyFingerprint)) // 0eba99d5
 */
function fingerprintToFixedLengthHex(xfp) {
  return (xfp + 0x100000000).toString(16).substr(-8);
}

/**
 * Returns the root fingerprint of the extendedPublicKey
 */
function extendedPublicKeyRootFingerprint(extendedPublicKey) {
  return extendedPublicKey.rootFingerprint ? extendedPublicKey.rootFingerprint : null;
}

/**
 * Derive base58 encoded xpub given known information about
 * BIP32 Wallet Node.
 */
function deriveExtendedPublicKey(bip32Path, pubkey, chaincode, parentFingerprint) {
  var network = arguments.length > 4 && arguments[4] !== undefined ? arguments[4] : _networks.Network.MAINNET;
  var xpub = new ExtendedPublicKey({
    path: bip32Path,
    pubkey: pubkey,
    chaincode: chaincode,
    parentFingerprint: parentFingerprint,
    network: network
  });
  return xpub.toBase58();
}
function getMaskedDerivation(_ref) {
  var xpub = _ref.xpub,
    bip32Path = _ref.bip32Path;
  var toMask = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : "unknown";
  var unknownBip32 = bip32Path.toLowerCase().includes(toMask);
  var depth = ExtendedPublicKey.fromBase58(xpub).depth || 0;
  return unknownBip32 ? "m".concat("/0".repeat(depth)) : bip32Path;
}