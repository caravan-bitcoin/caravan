"use strict";

require("core-js/modules/es7.object.get-own-property-descriptors");
require("core-js/modules/es6.array.filter");
require("core-js/modules/es6.function.name");
require("core-js/modules/es6.string.iterator");
require("core-js/modules/es6.array.from");
require("core-js/modules/es6.reflect.construct");
require("core-js/modules/es6.object.set-prototype-of");
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.Braid = void 0;
exports.braidAddressType = braidAddressType;
exports.braidConfig = braidConfig;
exports.braidExtendedPublicKeys = braidExtendedPublicKeys;
exports.braidIndex = braidIndex;
exports.braidNetwork = braidNetwork;
exports.braidRequiredSigners = braidRequiredSigners;
exports.deriveMultisigByIndex = deriveMultisigByIndex;
exports.deriveMultisigByPath = deriveMultisigByPath;
exports.generateBip32DerivationByIndex = generateBip32DerivationByIndex;
exports.generateBip32DerivationByPath = generateBip32DerivationByPath;
exports.generateBraid = generateBraid;
exports.generatePublicKeysAtIndex = generatePublicKeysAtIndex;
exports.generatePublicKeysAtPath = generatePublicKeysAtPath;
exports.validateBip32PathForBraid = validateBip32PathForBraid;
require("core-js/modules/es6.number.constructor");
require("core-js/modules/es7.symbol.async-iterator");
require("core-js/modules/es6.symbol");
require("core-js/modules/es6.array.sort");
require("core-js/modules/es6.array.slice");
require("core-js/modules/es6.regexp.to-string");
require("core-js/modules/es6.string.starts-with");
require("core-js/modules/es7.object.values");
require("core-js/modules/es7.array.includes");
require("core-js/modules/es6.string.includes");
require("core-js/modules/web.dom.iterable");
require("core-js/modules/es6.array.iterator");
require("core-js/modules/es6.object.to-string");
require("core-js/modules/es6.object.keys");
var _bufio = require("bufio");
var _assert = _interopRequireDefault(require("assert"));
var _paths = require("./paths");
var _networks = require("./networks");
var _multisig = require("./multisig");
var _keys = require("./keys");
function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }
function _typeof(obj) { "@babel/helpers - typeof"; return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (obj) { return typeof obj; } : function (obj) { return obj && "function" == typeof Symbol && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }, _typeof(obj); }
function ownKeys(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); enumerableOnly && (symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; })), keys.push.apply(keys, symbols); } return keys; }
function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = null != arguments[i] ? arguments[i] : {}; i % 2 ? ownKeys(Object(source), !0).forEach(function (key) { _defineProperty(target, key, source[key]); }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)) : ownKeys(Object(source)).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } return target; }
function _toConsumableArray(arr) { return _arrayWithoutHoles(arr) || _iterableToArray(arr) || _unsupportedIterableToArray(arr) || _nonIterableSpread(); }
function _nonIterableSpread() { throw new TypeError("Invalid attempt to spread non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }
function _unsupportedIterableToArray(o, minLen) { if (!o) return; if (typeof o === "string") return _arrayLikeToArray(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return Array.from(o); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen); }
function _iterableToArray(iter) { if (typeof Symbol !== "undefined" && iter[Symbol.iterator] != null || iter["@@iterator"] != null) return Array.from(iter); }
function _arrayWithoutHoles(arr) { if (Array.isArray(arr)) return _arrayLikeToArray(arr); }
function _arrayLikeToArray(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) { arr2[i] = arr[i]; } return arr2; }
function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }
function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, _toPropertyKey(descriptor.key), descriptor); } }
function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); Object.defineProperty(Constructor, "prototype", { writable: false }); return Constructor; }
function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function"); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, writable: true, configurable: true } }); Object.defineProperty(subClass, "prototype", { writable: false }); if (superClass) _setPrototypeOf(subClass, superClass); }
function _setPrototypeOf(o, p) { _setPrototypeOf = Object.setPrototypeOf ? Object.setPrototypeOf.bind() : function _setPrototypeOf(o, p) { o.__proto__ = p; return o; }; return _setPrototypeOf(o, p); }
function _createSuper(Derived) { var hasNativeReflectConstruct = _isNativeReflectConstruct(); return function _createSuperInternal() { var Super = _getPrototypeOf(Derived), result; if (hasNativeReflectConstruct) { var NewTarget = _getPrototypeOf(this).constructor; result = Reflect.construct(Super, arguments, NewTarget); } else { result = Super.apply(this, arguments); } return _possibleConstructorReturn(this, result); }; }
function _possibleConstructorReturn(self, call) { if (call && (_typeof(call) === "object" || typeof call === "function")) { return call; } else if (call !== void 0) { throw new TypeError("Derived constructors may only return object or undefined"); } return _assertThisInitialized(self); }
function _assertThisInitialized(self) { if (self === void 0) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return self; }
function _isNativeReflectConstruct() { if (typeof Reflect === "undefined" || !Reflect.construct) return false; if (Reflect.construct.sham) return false; if (typeof Proxy === "function") return true; try { Boolean.prototype.valueOf.call(Reflect.construct(Boolean, [], function () {})); return true; } catch (e) { return false; } }
function _getPrototypeOf(o) { _getPrototypeOf = Object.setPrototypeOf ? Object.getPrototypeOf.bind() : function _getPrototypeOf(o) { return o.__proto__ || Object.getPrototypeOf(o); }; return _getPrototypeOf(o); }
function _defineProperty(obj, key, value) { key = _toPropertyKey(key); if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }
function _toPropertyKey(arg) { var key = _toPrimitive(arg, "string"); return _typeof(key) === "symbol" ? key : String(key); }
function _toPrimitive(input, hint) { if (_typeof(input) !== "object" || input === null) return input; var prim = input[Symbol.toPrimitive]; if (prim !== undefined) { var res = prim.call(input, hint || "default"); if (_typeof(res) !== "object") return res; throw new TypeError("@@toPrimitive must return a primitive value."); } return (hint === "string" ? String : Number)(input); } /**
                                                                                                                                                                                                                                                                                                                                                                                               * This module provides functions for braids, which is how we define
                                                                                                                                                                                                                                                                                                                                                                                               * a group of xpubs with some additional multisig information to define
                                                                                                                                                                                                                                                                                                                                                                                               * a multisig setup. Sometimes, the word `wallet` is used here, but we
                                                                                                                                                                                                                                                                                                                                                                                               * view the traditional use of the word 'wallet' as a collection of Braids.
                                                                                                                                                                                                                                                                                                                                                                                               */
// In building the information objects that PSBTs want, one must include information
// about the root fingerprint for the device. If that information is unknown, just fill
// it in with zeros.
var FAKE_ROOT_FINGERPRINT = "00000000";

/**
 * Struct object for encoding and decoding braids.
 */
var Braid = /*#__PURE__*/function (_Struct) {
  _inherits(Braid, _Struct);
  var _super = _createSuper(Braid);
  function Braid(options) {
    var _this;
    _classCallCheck(this, Braid);
    _this = _super.call(this);
    _defineProperty(_assertThisInitialized(_this), "addressType", void 0);
    _defineProperty(_assertThisInitialized(_this), "network", void 0);
    _defineProperty(_assertThisInitialized(_this), "extendedPublicKeys", void 0);
    _defineProperty(_assertThisInitialized(_this), "requiredSigners", void 0);
    _defineProperty(_assertThisInitialized(_this), "index", void 0);
    _defineProperty(_assertThisInitialized(_this), "sequence", void 0);
    if (!options || !Object.keys(options).length) {
      return _possibleConstructorReturn(_this, _assertThisInitialized(_this));
    }
    (0, _assert.default)(Object.values(_multisig.MULTISIG_ADDRESS_TYPES).includes(options.addressType), "Expected addressType to be one of:  ".concat(Object.values(_multisig.MULTISIG_ADDRESS_TYPES), ". You sent ").concat(options.addressType));
    _this.addressType = options.addressType;
    (0, _assert.default)(Object.values(_networks.Network).includes(options.network), "Expected network to be one of:  ".concat(Object.values(_networks.Network), "."));
    _this.network = options.network;
    options.extendedPublicKeys.forEach(function (xpub) {
      var xpubValidationError = (0, _keys.validateExtendedPublicKey)(typeof xpub === "string" ? xpub : xpub.base58String, _this.network);
      (0, _assert.default)(!xpubValidationError.length, xpubValidationError);
    });
    _this.extendedPublicKeys = options.extendedPublicKeys;
    (0, _assert.default)(typeof options.requiredSigners === "number");
    (0, _assert.default)(options.requiredSigners <= _this.extendedPublicKeys.length, "Can't have more requiredSigners than there are keys.");
    _this.requiredSigners = options.requiredSigners;

    // index is a technically a bip32path, but it's also just an
    // unhardened index (single number) - if we think of the bip32path as a
    // filepath, then this is a directory that historically/typically tells you
    // deposit (0) or change (1) braid, but could be any unhardened index.
    var pathError = (0, _paths.validateBIP32Index)(options.index, {
      mode: "unhardened"
    });
    (0, _assert.default)(!pathError.length, pathError);
    _this.index = options.index;
    _this.sequence = (0, _paths.bip32PathToSequence)(_this.index);
    return _this;
  }
  _createClass(Braid, [{
    key: "toJSON",
    value: function toJSON() {
      return braidConfig(this);
    }
  }], [{
    key: "fromData",
    value: function fromData(data) {
      return new this(data);
    }
  }, {
    key: "fromJSON",
    value: function fromJSON(string) {
      return new this(JSON.parse(string));
    }
  }]);
  return Braid;
}(_bufio.Struct);
exports.Braid = Braid;
function braidConfig(braid) {
  return JSON.stringify({
    network: braid.network,
    addressType: braid.addressType,
    extendedPublicKeys: braid.extendedPublicKeys,
    requiredSigners: braid.requiredSigners,
    index: braid.index
  });
}

/**
 * Returns the braid's network
 */
function braidNetwork(braid) {
  return braid.network;
}

/**
 * Returns the braid's addressType
 */
function braidAddressType(braid) {
  return braid.addressType;
}

/**
 * Returns the braid's extendedPublicKeys
 */
function braidExtendedPublicKeys(braid) {
  return braid.extendedPublicKeys;
}

/**
 * Returns the braid's requiredSigners
 */
function braidRequiredSigners(braid) {
  return braid.requiredSigners;
}

/**
 * Returns the braid's index
 */
function braidIndex(braid) {
  return braid.index;
}

/**
 * Validate that a requested path is derivable from a particular braid
 * e.g. it's both a valid bip32path *and* its first index is the same as the index
 */
function validateBip32PathForBraid(braid, path) {
  var pathError = (0, _paths.validateBIP32Path)(path);
  (0, _assert.default)(!pathError.length, pathError);

  // The function bip32PathToSequence blindly slices the first index after splitting on '/',
  // so make sure the slash is there. E.g. a path of "0/0" would validate in the above function,
  // but fail to do what we expect here unless we prepend '/' as '/0/0'.
  var pathToCheck = path.startsWith("m/") || path.startsWith("/") ? path : "/" + path;
  var pathSequence = (0, _paths.bip32PathToSequence)(pathToCheck);
  (0, _assert.default)(pathSequence[0].toString() === braid.index, "Cannot derive paths outside of the braid's index: ".concat(braid.index));
}

/**
 * Returns an object with a braid's pubkeys + bip32derivation info
 * at a particular path (respects the index)
 */
function derivePublicKeyObjectsAtPath(braid, path) {
  validateBip32PathForBraid(braid, path);
  var dataRichPubKeyObjects = {};
  var actualPathSuffix = path.startsWith("m/") ? path.slice(2) : path;
  braidExtendedPublicKeys(braid).forEach(function (xpub) {
    var completePath = xpub.path + "/" + actualPathSuffix;
    // Provide ability to work whether this was called with plain xpub strings or with xpub structs
    var pubkey = (0, _keys.deriveChildPublicKey)(typeof xpub === "string" ? xpub : xpub.base58String, path, braidNetwork(braid));
    // It's ok if this is faked - but at least one of them should be correct otherwise
    // signing won't work. On Coldcard, this must match what was included in the multisig
    // wallet config file.
    var rootFingerprint = (0, _keys.extendedPublicKeyRootFingerprint)(xpub);
    var masterFingerprint = rootFingerprint ? rootFingerprint : FAKE_ROOT_FINGERPRINT;
    dataRichPubKeyObjects[pubkey] = {
      masterFingerprint: Buffer.from(masterFingerprint, "hex"),
      path: completePath,
      pubkey: Buffer.from(pubkey, "hex")
    };
  });
  return dataRichPubKeyObjects;
}

/**
 * Returns the braid's pubkeys at particular path (respects the index)
 */
function generatePublicKeysAtPath(braid, path) {
  return Object.keys(derivePublicKeyObjectsAtPath(braid, path)).sort(); // BIP67
}

/**
 * Returns the braid's pubkeys at particular index under the index
 */
function generatePublicKeysAtIndex(braid, index) {
  var pathToDerive = braidIndex(braid);
  pathToDerive += "/" + index.toString();
  return generatePublicKeysAtPath(braid, pathToDerive);
}

/**
 * Returns the braid's bip32PathDerivation (array of bip32 infos)
 * @param {Braid} braid the braid to interrogate
 * @param {string} path what suffix to generate bip32PathDerivation at
 * @returns {Object[]} array of getBip32Derivation objects
 */
function generateBip32DerivationByPath(braid, path) {
  return Object.values(derivePublicKeyObjectsAtPath(braid, path));
}

/**
 * Returns the braid's bip32PathDerivation at a particular index (array of bip32 info)
 */
function generateBip32DerivationByIndex(braid, index) {
  var pathToDerive = braidIndex(braid); // deposit or change
  pathToDerive += "/" + index.toString();
  return generateBip32DerivationByPath(braid, pathToDerive);
}

/**
 * Returns a braid-aware Multisig object at particular path (respects index)
 */
function deriveMultisigByPath(braid, path) {
  var pubkeys = generatePublicKeysAtPath(braid, path);
  var bip32Derivation = generateBip32DerivationByPath(braid, path);
  return generateBraidAwareMultisigFromPublicKeys(braid, pubkeys, bip32Derivation);
}

/**
 * Returns a braid-aware Multisig object at particular index
 */
function deriveMultisigByIndex(braid, index) {
  var pathToDerive = braidIndex(braid);
  pathToDerive += "/" + index.toString();
  return deriveMultisigByPath(braid, pathToDerive);
}

/**
 * Returns a braid-aware Multisig object from a set of public keys
 */
function generateBraidAwareMultisigFromPublicKeys(braid, pubkeys, bip32Derivation) {
  var braidAwareMultisig = {};
  var multisig = _multisig.generateMultisigFromPublicKeys.apply(void 0, [braidNetwork(braid), braidAddressType(braid), braidRequiredSigners(braid)].concat(_toConsumableArray(pubkeys)));
  braidAwareMultisig = _objectSpread(_objectSpread({}, multisig), {}, {
    braidDetails: braidConfig(braid),
    bip32Derivation: bip32Derivation
  });
  return braidAwareMultisig;
}

/**
 * Generate a braid from its parts
 */
function generateBraid(network, addressType, extendedPublicKeys, requiredSigners, index) {
  return new Braid({
    network: network,
    addressType: addressType,
    extendedPublicKeys: extendedPublicKeys,
    requiredSigners: requiredSigners,
    index: index
  });
}