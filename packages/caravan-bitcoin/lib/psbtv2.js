"use strict";

function _typeof(obj) { "@babel/helpers - typeof"; return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (obj) { return typeof obj; } : function (obj) { return obj && "function" == typeof Symbol && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }, _typeof(obj); }
require("core-js/modules/es6.reflect.construct");
require("core-js/modules/es6.object.set-prototype-of");
require("core-js/modules/es6.number.constructor");
require("core-js/modules/es7.symbol.async-iterator");
require("core-js/modules/es6.symbol");
require("core-js/modules/es6.array.from");
require("core-js/modules/es6.function.name");
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.PsbtV2Maps = exports.PsbtV2 = void 0;
exports.getPsbtVersionNumber = getPsbtVersionNumber;
require("core-js/modules/es6.array.find");
require("core-js/modules/es7.array.includes");
require("core-js/modules/es6.string.includes");
require("core-js/modules/es6.array.filter");
require("core-js/modules/es6.string.iterator");
require("core-js/modules/es6.map");
require("core-js/modules/es6.array.slice");
require("core-js/modules/es6.regexp.match");
require("core-js/modules/es6.regexp.to-string");
require("core-js/modules/es6.string.starts-with");
require("core-js/modules/web.dom.iterable");
require("core-js/modules/es6.array.iterator");
require("core-js/modules/es6.object.to-string");
require("core-js/modules/es6.array.map");
var _bufio = require("bufio");
var _bitcoinjsLib = require("bitcoinjs-lib");
var _utils = require("./utils");
var _paths = require("./paths");
var _psbt = require("./psbt");
function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function"); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, writable: true, configurable: true } }); Object.defineProperty(subClass, "prototype", { writable: false }); if (superClass) _setPrototypeOf(subClass, superClass); }
function _setPrototypeOf(o, p) { _setPrototypeOf = Object.setPrototypeOf ? Object.setPrototypeOf.bind() : function _setPrototypeOf(o, p) { o.__proto__ = p; return o; }; return _setPrototypeOf(o, p); }
function _createSuper(Derived) { var hasNativeReflectConstruct = _isNativeReflectConstruct(); return function _createSuperInternal() { var Super = _getPrototypeOf(Derived), result; if (hasNativeReflectConstruct) { var NewTarget = _getPrototypeOf(this).constructor; result = Reflect.construct(Super, arguments, NewTarget); } else { result = Super.apply(this, arguments); } return _possibleConstructorReturn(this, result); }; }
function _possibleConstructorReturn(self, call) { if (call && (_typeof(call) === "object" || typeof call === "function")) { return call; } else if (call !== void 0) { throw new TypeError("Derived constructors may only return object or undefined"); } return _assertThisInitialized(self); }
function _assertThisInitialized(self) { if (self === void 0) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return self; }
function _isNativeReflectConstruct() { if (typeof Reflect === "undefined" || !Reflect.construct) return false; if (Reflect.construct.sham) return false; if (typeof Proxy === "function") return true; try { Boolean.prototype.valueOf.call(Reflect.construct(Boolean, [], function () {})); return true; } catch (e) { return false; } }
function _getPrototypeOf(o) { _getPrototypeOf = Object.setPrototypeOf ? Object.getPrototypeOf.bind() : function _getPrototypeOf(o) { return o.__proto__ || Object.getPrototypeOf(o); }; return _getPrototypeOf(o); }
function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }
function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, _toPropertyKey(descriptor.key), descriptor); } }
function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); Object.defineProperty(Constructor, "prototype", { writable: false }); return Constructor; }
function _defineProperty(obj, key, value) { key = _toPropertyKey(key); if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }
function _toPropertyKey(arg) { var key = _toPrimitive(arg, "string"); return _typeof(key) === "symbol" ? key : String(key); }
function _toPrimitive(input, hint) { if (_typeof(input) !== "object" || input === null) return input; var prim = input[Symbol.toPrimitive]; if (prim !== undefined) { var res = prim.call(input, hint || "default"); if (_typeof(res) !== "object") return res; throw new TypeError("@@toPrimitive must return a primitive value."); } return (hint === "string" ? String : Number)(input); }
function _slicedToArray(arr, i) { return _arrayWithHoles(arr) || _iterableToArrayLimit(arr, i) || _unsupportedIterableToArray(arr, i) || _nonIterableRest(); }
function _nonIterableRest() { throw new TypeError("Invalid attempt to destructure non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }
function _iterableToArrayLimit(arr, i) { var _i = null == arr ? null : "undefined" != typeof Symbol && arr[Symbol.iterator] || arr["@@iterator"]; if (null != _i) { var _s, _e, _x, _r, _arr = [], _n = !0, _d = !1; try { if (_x = (_i = _i.call(arr)).next, 0 === i) { if (Object(_i) !== _i) return; _n = !1; } else for (; !(_n = (_s = _x.call(_i)).done) && (_arr.push(_s.value), _arr.length !== i); _n = !0) { ; } } catch (err) { _d = !0, _e = err; } finally { try { if (!_n && null != _i.return && (_r = _i.return(), Object(_r) !== _r)) return; } finally { if (_d) throw _e; } } return _arr; } }
function _arrayWithHoles(arr) { if (Array.isArray(arr)) return arr; }
function _createForOfIteratorHelper(o, allowArrayLike) { var it = typeof Symbol !== "undefined" && o[Symbol.iterator] || o["@@iterator"]; if (!it) { if (Array.isArray(o) || (it = _unsupportedIterableToArray(o)) || allowArrayLike && o && typeof o.length === "number") { if (it) o = it; var i = 0; var F = function F() {}; return { s: F, n: function n() { if (i >= o.length) return { done: true }; return { done: false, value: o[i++] }; }, e: function e(_e2) { throw _e2; }, f: F }; } throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); } var normalCompletion = true, didErr = false, err; return { s: function s() { it = it.call(o); }, n: function n() { var step = it.next(); normalCompletion = step.done; return step; }, e: function e(_e3) { didErr = true; err = _e3; }, f: function f() { try { if (!normalCompletion && it.return != null) it.return(); } finally { if (didErr) throw err; } } }; }
function _unsupportedIterableToArray(o, minLen) { if (!o) return; if (typeof o === "string") return _arrayLikeToArray(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return Array.from(o); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen); }
function _arrayLikeToArray(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) { arr2[i] = arr[i]; } return arr2; } /**
                                                                                                                                                                                         * The PsbtV2 class is intended to represent an easily modifiable and
                                                                                                                                                                                         * serializable psbt of version 2 conforming to BIP0174. Getters exist for all
                                                                                                                                                                                         * BIP-defined keytypes. Very few setters and modifier methods exist. As they
                                                                                                                                                                                         * are added, they should enforce implied and documented rules and limitations.
                                                                                                                                                                                         *
                                                                                                                                                                                         * Defining BIPs:
                                                                                                                                                                                         * https://github.com/bitcoin/bips/blob/master/bip-0174.mediawiki
                                                                                                                                                                                         * https://github.com/bitcoin/bips/blob/master/bip-0370.mediawiki
                                                                                                                                                                                         */
/*
Global Types
*/
// Hex encoded string containing <keytype><keydata>. A string is needed for
// Map.get() since it matches by identity. Most commonly, a Key only contains a
// keytype byte, however, some with keydata can allow for multiple unique keys
// of the same type.
// Values can be of various different types or formats. Here we leave them as
// Buffers so that getters can decide how they should be formatted.
// These keytypes are hex bytes, but here they are used as string enums to
// assist in Map lookups. See type Key above for more info.
// eslint-disable-next-line no-shadow
var KeyType; // Provided to friendly-format the PSBT_GLOBAL_TX_MODIFIABLE bitmask from
// PsbtV2.PSBT_GLOBAL_TX_MODIFIABLE which returns PsbtGlobalTxModifiableBits[].
// eslint-disable-next-line no-shadow
(function (KeyType) {
  KeyType["PSBT_GLOBAL_XPUB"] = "01";
  KeyType["PSBT_GLOBAL_TX_VERSION"] = "02";
  KeyType["PSBT_GLOBAL_FALLBACK_LOCKTIME"] = "03";
  KeyType["PSBT_GLOBAL_INPUT_COUNT"] = "04";
  KeyType["PSBT_GLOBAL_OUTPUT_COUNT"] = "05";
  KeyType["PSBT_GLOBAL_TX_MODIFIABLE"] = "06";
  KeyType["PSBT_GLOBAL_VERSION"] = "fb";
  KeyType["PSBT_GLOBAL_PROPRIETARY"] = "fc";
  KeyType["PSBT_IN_NON_WITNESS_UTXO"] = "00";
  KeyType["PSBT_IN_WITNESS_UTXO"] = "01";
  KeyType["PSBT_IN_PARTIAL_SIG"] = "02";
  KeyType["PSBT_IN_SIGHASH_TYPE"] = "03";
  KeyType["PSBT_IN_REDEEM_SCRIPT"] = "04";
  KeyType["PSBT_IN_WITNESS_SCRIPT"] = "05";
  KeyType["PSBT_IN_BIP32_DERIVATION"] = "06";
  KeyType["PSBT_IN_FINAL_SCRIPTSIG"] = "07";
  KeyType["PSBT_IN_FINAL_SCRIPTWITNESS"] = "08";
  KeyType["PSBT_IN_POR_COMMITMENT"] = "09";
  KeyType["PSBT_IN_RIPEMD160"] = "0a";
  KeyType["PSBT_IN_SHA256"] = "0b";
  KeyType["PSBT_IN_HASH160"] = "0c";
  KeyType["PSBT_IN_HASH256"] = "0d";
  KeyType["PSBT_IN_PREVIOUS_TXID"] = "0e";
  KeyType["PSBT_IN_OUTPUT_INDEX"] = "0f";
  KeyType["PSBT_IN_SEQUENCE"] = "10";
  KeyType["PSBT_IN_REQUIRED_TIME_LOCKTIME"] = "11";
  KeyType["PSBT_IN_REQUIRED_HEIGHT_LOCKTIME"] = "12";
  KeyType["PSBT_IN_TAP_KEY_SIG"] = "13";
  KeyType["PSBT_IN_TAP_SCRIPT_SIG"] = "14";
  KeyType["PSBT_IN_TAP_LEAF_SCRIPT"] = "15";
  KeyType["PSBT_IN_TAP_BIP32_DERIVATION"] = "16";
  KeyType["PSBT_IN_TAP_INTERNAL_KEY"] = "17";
  KeyType["PSBT_IN_TAP_MERKLE_ROOT"] = "18";
  KeyType["PSBT_IN_PROPRIETARY"] = "fc";
  KeyType["PSBT_OUT_REDEEM_SCRIPT"] = "00";
  KeyType["PSBT_OUT_WITNESS_SCRIPT"] = "01";
  KeyType["PSBT_OUT_BIP32_DERIVATION"] = "02";
  KeyType["PSBT_OUT_AMOUNT"] = "03";
  KeyType["PSBT_OUT_SCRIPT"] = "04";
  KeyType["PSBT_OUT_TAP_INTERNAL_KEY"] = "05";
  KeyType["PSBT_OUT_TAP_TREE"] = "06";
  KeyType["PSBT_OUT_TAP_BIP32_DERIVATION"] = "07";
  KeyType["PSBT_OUT_PROPRIETARY"] = "fc";
})(KeyType || (KeyType = {}));
var PsbtGlobalTxModifiableBits; // 0b00000100
// eslint-disable-next-line no-shadow
(function (PsbtGlobalTxModifiableBits) {
  PsbtGlobalTxModifiableBits["INPUTS"] = "INPUTS";
  PsbtGlobalTxModifiableBits["OUTPUTS"] = "OUTPUTS";
  PsbtGlobalTxModifiableBits["SIGHASH_SINGLE"] = "SIGHASH_SINGLE";
})(PsbtGlobalTxModifiableBits || (PsbtGlobalTxModifiableBits = {}));
var SighashType;
/*
Global Constants
 */
(function (SighashType) {
  SighashType[SighashType["SIGHASH_ALL"] = 1] = "SIGHASH_ALL";
  SighashType[SighashType["SIGHASH_NONE"] = 2] = "SIGHASH_NONE";
  SighashType[SighashType["SIGHASH_SINGLE"] = 3] = "SIGHASH_SINGLE";
  SighashType[SighashType["SIGHASH_ANYONECANPAY"] = 128] = "SIGHASH_ANYONECANPAY";
})(SighashType || (SighashType = {}));
var PSBT_MAP_SEPARATOR = Buffer.from([0x00]);
var BIP_32_NODE_REGEX = /(\/[0-9]+'?)/gi;
var BIP_32_HARDENING_OFFSET = 0x80000000;

/*
Helper Functions
*/

// Ensure base64 and hex strings are a buffer. No-op if already a buffer.
function bufferize(psbt) {
  if (Buffer.isBuffer(psbt)) {
    return psbt;
  }
  if (typeof psbt === "string") {
    if ((0, _utils.validateHex)(psbt) === "") {
      return Buffer.from(psbt, "hex");
    }
    if ((0, _utils.validBase64)(psbt)) {
      return Buffer.from(psbt, "base64");
    }
  }
  throw Error("Input cannot be bufferized.");
}

// Some keytypes have keydata which allows for multiple unique keys of the same
// keytype. Getters which return values from these keys should search and return
// values from all keys of that keytype. This function matches on the first byte
// of each key string (hex encoded) and returns all values associated with those
// keys as an array of string (hex encoded) values.
function getNonUniqueKeyTypeValues(maps, keytype) {
  if (Array.isArray(maps)) {
    // It's a set of input or output maps, so recursively check each map and set
    // values.
    var _values = maps.map(function (map) {
      return (
        // TODO: Figure out a better way to type this
        getNonUniqueKeyTypeValues(map, keytype)
      );
    });
    return _values;
  }
  var map = maps; // Not an array
  var values = [];
  var _iterator = _createForOfIteratorHelper(map.entries()),
    _step;
  try {
    for (_iterator.s(); !(_step = _iterator.n()).done;) {
      var _step$value = _slicedToArray(_step.value, 2),
        key = _step$value[0],
        value = _step$value[1];
      if (key.startsWith(keytype)) {
        values.push({
          key: key,
          value: (value === null || value === void 0 ? void 0 : value.toString("hex")) || null
        });
      }
    }
  } catch (err) {
    _iterator.e(err);
  } finally {
    _iterator.f();
  }
  return values;
}

// A getter helper for optional keytypes which returns lists of values as hex
// strings.
function getOptionalMappedBytesAsHex(maps, keytype) {
  return maps.map(function (map) {
    var _map$get$toString, _map$get;
    return (_map$get$toString = (_map$get = map.get(keytype)) === null || _map$get === void 0 ? void 0 : _map$get.toString("hex")) !== null && _map$get$toString !== void 0 ? _map$get$toString : null;
  });
}

// A getter helper for optional keytypes which returns lists of values as
// numbers.
function getOptionalMappedBytesAsUInt(maps, keytype) {
  return maps.map(function (map) {
    var _map$get$readUInt32LE, _map$get2;
    return (_map$get$readUInt32LE = (_map$get2 = map.get(keytype)) === null || _map$get2 === void 0 ? void 0 : _map$get2.readUInt32LE(0)) !== null && _map$get$readUInt32LE !== void 0 ? _map$get$readUInt32LE : null;
  });
}

// Accepts a BIP0032 path as a string and returns a Buffer containing uint32
// values for each path node.
function parseDerivationPathNodesToBytes(path) {
  var _path$match;
  var validationMessage = (0, _paths.validateBIP32Path)(path);
  if (validationMessage !== "") {
    throw Error(validationMessage);
  }
  var bw = new _bufio.BufferWriter();
  var _iterator2 = _createForOfIteratorHelper((_path$match = path.match(BIP_32_NODE_REGEX)) !== null && _path$match !== void 0 ? _path$match : []),
    _step2;
  try {
    for (_iterator2.s(); !(_step2 = _iterator2.n()).done;) {
      var node = _step2.value;
      // Skip slash and parse int
      var num = parseInt(node.slice(1), 10);
      if (node.indexOf("'") > -1) {
        // Hardened node needs hardening
        num += BIP_32_HARDENING_OFFSET;
      }
      bw.writeU32(num);
    }
  } catch (err) {
    _iterator2.e(err);
  } finally {
    _iterator2.f();
  }
  return bw.render();
}

// Takes a BufferReader and a Map then reads keypairs until it gets to a map
// separator (keyLen 0x00 byte);
function readAndSetKeyPairs(map, br) {
  var nextByte = br.readBytes(1);
  if (nextByte.equals(PSBT_MAP_SEPARATOR)) {
    return;
  }
  var keyLen = nextByte.readUInt8(0);
  var key = br.readBytes(keyLen);
  var value = br.readVarBytes();
  map.set(key.toString("hex"), value);
  readAndSetKeyPairs(map, br);
}

// Serializes a Map containing keypairs, includes keylen, and writes to the
// BufferWriter.
function serializeMap(map, bw) {
  map.forEach(function (value, key) {
    // Add <keylen><keytype><keydata>
    var keyBuf = Buffer.from(key, "hex");
    var keyLen = keyBuf.length;
    bw.writeVarint(keyLen);
    bw.writeString(key, "hex");

    // Add <valuelen><valuedata>
    bw.writeVarint(value.length);
    bw.writeBytes(value);
  });
  bw.writeBytes(PSBT_MAP_SEPARATOR);
}

// This is provided for utility to allow for mapping, map copying, and
// serialization operations for psbts. This does almost no validation, so do not
// rely on it for ensuring a valid psbt.
var PsbtV2Maps = /*#__PURE__*/function () {
  // These maps directly correspond to the maps defined in BIP0174

  function PsbtV2Maps(psbt) {
    var _this$globalMap$get$r, _this$globalMap$get, _this$globalMap$get$r2, _this$globalMap$get2;
    _classCallCheck(this, PsbtV2Maps);
    _defineProperty(this, "globalMap", new Map());
    _defineProperty(this, "inputMaps", []);
    _defineProperty(this, "outputMaps", []);
    if (!psbt) {
      return;
    }
    var buf = bufferize(psbt);
    var br = new _bufio.BufferReader(buf);
    if (!br.readBytes(_psbt.PSBT_MAGIC_BYTES.length, true).equals(_psbt.PSBT_MAGIC_BYTES)) {
      throw Error("PsbtV2 magic bytes are incorrect.");
    }
    // Build globalMap
    readAndSetKeyPairs(this.globalMap, br);
    if (
    // Assuming that psbt being passed in is a valid psbtv2
    !this.globalMap.has(KeyType.PSBT_GLOBAL_VERSION) || !this.globalMap.has(KeyType.PSBT_GLOBAL_TX_VERSION) || !this.globalMap.has(KeyType.PSBT_GLOBAL_INPUT_COUNT) || !this.globalMap.has(KeyType.PSBT_GLOBAL_OUTPUT_COUNT) || this.globalMap.has("00") // PsbtV2 must exclude key 0x00
    ) {
      throw Error("Provided PsbtV2 not valid. Missing required global keys.");
    }

    // Build inputMaps
    var inputCount = (_this$globalMap$get$r = (_this$globalMap$get = this.globalMap.get(KeyType.PSBT_GLOBAL_INPUT_COUNT)) === null || _this$globalMap$get === void 0 ? void 0 : _this$globalMap$get.readUInt8(0)) !== null && _this$globalMap$get$r !== void 0 ? _this$globalMap$get$r : 0;
    for (var i = 0; i < inputCount; i++) {
      var map = new Map();
      readAndSetKeyPairs(map, br);
      this.inputMaps.push(map);
    }

    // Build outputMaps
    var outputCount = (_this$globalMap$get$r2 = (_this$globalMap$get2 = this.globalMap.get(KeyType.PSBT_GLOBAL_OUTPUT_COUNT)) === null || _this$globalMap$get2 === void 0 ? void 0 : _this$globalMap$get2.readUInt8(0)) !== null && _this$globalMap$get$r2 !== void 0 ? _this$globalMap$get$r2 : 0;
    for (var _i2 = 0; _i2 < outputCount; _i2++) {
      var _map = new Map();
      readAndSetKeyPairs(_map, br);
      this.outputMaps.push(_map);
    }
  }

  // Return the current state of the psbt as a string in the specified format.
  _createClass(PsbtV2Maps, [{
    key: "serialize",
    value: function serialize() {
      var format = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : "base64";
      // Build hex string from maps
      var bw = new _bufio.BufferWriter();
      bw.writeBytes(_psbt.PSBT_MAGIC_BYTES);
      serializeMap(this.globalMap, bw);
      var _iterator3 = _createForOfIteratorHelper(this.inputMaps),
        _step3;
      try {
        for (_iterator3.s(); !(_step3 = _iterator3.n()).done;) {
          var map = _step3.value;
          serializeMap(map, bw);
        }
      } catch (err) {
        _iterator3.e(err);
      } finally {
        _iterator3.f();
      }
      var _iterator4 = _createForOfIteratorHelper(this.outputMaps),
        _step4;
      try {
        for (_iterator4.s(); !(_step4 = _iterator4.n()).done;) {
          var _map2 = _step4.value;
          serializeMap(_map2, bw);
        }
      } catch (err) {
        _iterator4.e(err);
      } finally {
        _iterator4.f();
      }
      return bw.render().toString(format);
    } // NOTE: This set of copy methods is made available to
    // achieve parity with the PSBT api required by ledger-bitcoin
    // for creating merklized PSBTs. HOWEVER, it is not recommended
    // to use this when avoidable as copying maps bypasses the validation
    // defined in the constructor, so it could create a psbtv2 in an invalid psbt status.
    // PsbtV2.serialize is preferable whenever possible.
  }, {
    key: "copy",
    value: function copy(to) {
      this.copyMap(this.globalMap, to.globalMap);
      this.copyMaps(this.inputMaps, to.inputMaps);
      this.copyMaps(this.outputMaps, to.outputMaps);
    }
  }, {
    key: "copyMaps",
    value: function copyMaps(from, to) {
      var _this = this;
      from.forEach(function (m, index) {
        var to_index = new Map();
        _this.copyMap(m, to_index);
        to[index] = to_index;
      });
    } // eslint-disable-next-line class-methods-use-this
  }, {
    key: "copyMap",
    value: function copyMap(from, to) {
      from.forEach(function (v, k) {
        return to.set(k, Buffer.from(v));
      });
    }
  }]);
  return PsbtV2Maps;
}();
exports.PsbtV2Maps = PsbtV2Maps;
var PsbtV2 = /*#__PURE__*/function (_PsbtV2Maps) {
  _inherits(PsbtV2, _PsbtV2Maps);
  var _super = _createSuper(PsbtV2);
  function PsbtV2(psbt) {
    var _this2;
    _classCallCheck(this, PsbtV2);
    _this2 = _super.call(this, psbt);
    if (!psbt) {
      _this2.create();
    }
    _this2.validate();
    return _this2;
  }

  /**
   * Globals Getters/Setters
   */
  _createClass(PsbtV2, [{
    key: "create",
    /**
     * Creator/Constructor Methods
     */
    // This method ensures that global fields have initial values required by a
    // PsbtV2 Creator. It is called by the constructor if constructed without a
    // psbt.
    value: function create() {
      this.PSBT_GLOBAL_VERSION = 2;
      this.PSBT_GLOBAL_TX_VERSION = 2;
      this.PSBT_GLOBAL_INPUT_COUNT = 0;
      this.PSBT_GLOBAL_OUTPUT_COUNT = 0;
      this.PSBT_GLOBAL_FALLBACK_LOCKTIME = 0;
    } // This method should check initial construction of any valid PsbtV2. It is
    // called when a psbt is passed to the constructor or when a new psbt is being
    // created. If constructed with a psbt, this method acts outside of the
    // Creator role to validate the current state of the psbt.
  }, {
    key: "validate",
    value: function validate() {
      if (this.PSBT_GLOBAL_VERSION < 2) {
        throw Error("PsbtV2 has a version field set less than 2");
      }
      if (this.PSBT_GLOBAL_TX_VERSION < 2) {
        throw Error("PsbtV2 has a tx version field set less than 2");
      }
      var _iterator5 = _createForOfIteratorHelper(this.PSBT_IN_PREVIOUS_TXID),
        _step5;
      try {
        for (_iterator5.s(); !(_step5 = _iterator5.n()).done;) {
          var prevInTxid = _step5.value;
          if (!prevInTxid) {
            throw Error("PsbtV2 input is missing PSBT_IN_PREVIOUS_TXID");
          }
        }
      } catch (err) {
        _iterator5.e(err);
      } finally {
        _iterator5.f();
      }
      var _iterator6 = _createForOfIteratorHelper(this.PSBT_IN_OUTPUT_INDEX),
        _step6;
      try {
        for (_iterator6.s(); !(_step6 = _iterator6.n()).done;) {
          var prevInVOut = _step6.value;
          if (prevInVOut === undefined) {
            throw Error("PsbtV2 input is missing PSBT_IN_OUTPUT_INDEX");
          }
        }
      } catch (err) {
        _iterator6.e(err);
      } finally {
        _iterator6.f();
      }
      var _iterator7 = _createForOfIteratorHelper(this.PSBT_OUT_AMOUNT),
        _step7;
      try {
        for (_iterator7.s(); !(_step7 = _iterator7.n()).done;) {
          var amount = _step7.value;
          if (!amount) {
            throw Error("PsbtV2 input is missing PSBT_OUT_AMOUNT");
          }
        }
      } catch (err) {
        _iterator7.e(err);
      } finally {
        _iterator7.f();
      }
      var _iterator8 = _createForOfIteratorHelper(this.PSBT_OUT_SCRIPT),
        _step8;
      try {
        for (_iterator8.s(); !(_step8 = _iterator8.n()).done;) {
          var script = _step8.value;
          if (!script) {
            throw Error("PsbtV2 input is missing PSBT_OUT_SCRIPT");
          }
        }
      } catch (err) {
        _iterator8.e(err);
      } finally {
        _iterator8.f();
      }
      var _iterator9 = _createForOfIteratorHelper(this.PSBT_IN_REQUIRED_TIME_LOCKTIME),
        _step9;
      try {
        for (_iterator9.s(); !(_step9 = _iterator9.n()).done;) {
          var locktime = _step9.value;
          if (locktime && locktime < 500000000) {
            throw Error("PsbtV2 input time locktime is less than 500000000.");
          }
        }
      } catch (err) {
        _iterator9.e(err);
      } finally {
        _iterator9.f();
      }
      var _iterator10 = _createForOfIteratorHelper(this.PSBT_IN_REQUIRED_HEIGHT_LOCKTIME),
        _step10;
      try {
        for (_iterator10.s(); !(_step10 = _iterator10.n()).done;) {
          var _locktime = _step10.value;
          if (_locktime && _locktime >= 500000000) {
            throw Error("PsbtV2 input hight locktime is gte 500000000.");
          }
        }
      } catch (err) {
        _iterator10.e(err);
      } finally {
        _iterator10.f();
      }
    } // This method is provided for compatibility issues and probably shouldn't be
    // used since a PsbtV2 with PSBT_GLOBAL_TX_VERSION = 1 is BIP0370
    // non-compliant. No guarantees can be made here that a serialized PsbtV2
    // which used this method will be compatible with outside consumers.
    //
    // One may wish to instance this class from a partially signed
    // PSBTv0 with a txn version 1 by using the static PsbtV2.FromV0. This method
    // provides a way to override validation logic for the txn version and roles
    // lifecycle defined for PsbtV2.
  }, {
    key: "dangerouslySetGlobalTxVersion1",
    value: function dangerouslySetGlobalTxVersion1() {
      console.warn("Dangerously setting PsbtV2.PSBT_GLOBAL_TX_VERSION to 1!");
      var bw = new _bufio.BufferWriter();
      bw.writeI32(1);
      this.globalMap.set(KeyType.PSBT_GLOBAL_TX_VERSION, bw.render());
    } // Is this a Creator/Constructor role action, or something else. BIPs don't
    // define it well.
  }, {
    key: "addGlobalXpub",
    value: function addGlobalXpub(xpub, fingerprint, path) {
      var bw = new _bufio.BufferWriter();
      bw.writeBytes(Buffer.from(KeyType.PSBT_GLOBAL_XPUB, "hex"));
      bw.writeBytes(xpub);
      var key = bw.render().toString("hex");
      bw.writeBytes(fingerprint);
      var pathBytes = parseDerivationPathNodesToBytes(path);
      bw.writeBytes(pathBytes);
      var value = bw.render();
      this.globalMap.set(key, value);
    }
  }, {
    key: "addInput",
    value: function addInput(_ref) {
      var previousTxId = _ref.previousTxId,
        outputIndex = _ref.outputIndex,
        sequence = _ref.sequence,
        nonWitnessUtxo = _ref.nonWitnessUtxo,
        witnessUtxo = _ref.witnessUtxo,
        redeemScript = _ref.redeemScript,
        witnessScript = _ref.witnessScript,
        bip32Derivation = _ref.bip32Derivation;
      // TODO: This must accept and add appropriate locktime fields. There is
      // significant validation concerning this step detailed in the BIP0370
      // Constructor role:
      // https://github.com/bitcoin/bips/blob/master/bip-0370.mediawiki#constructor
      if (!this.isModifiable([PsbtGlobalTxModifiableBits.INPUTS])) {
        throw Error("PsbtV2.PSBT_GLOBAL_TX_MODIFIABLE inputs cannot be modified.");
      }
      var map = new Map();
      var bw = new _bufio.BufferWriter();
      var prevTxIdBuf = bufferize(previousTxId);
      bw.writeBytes(prevTxIdBuf);
      map.set(KeyType.PSBT_IN_PREVIOUS_TXID, bw.render());
      bw.writeI32(outputIndex);
      map.set(KeyType.PSBT_IN_OUTPUT_INDEX, bw.render());
      if (sequence) {
        bw.writeI32(sequence);
        map.set(KeyType.PSBT_IN_SEQUENCE, bw.render());
      }
      if (nonWitnessUtxo) {
        bw.writeBytes(nonWitnessUtxo);
        map.set(KeyType.PSBT_IN_NON_WITNESS_UTXO, bw.render());
      }
      if (witnessUtxo) {
        bw.writeI64(witnessUtxo.amount);
        bw.writeU8(witnessUtxo.script.length);
        bw.writeBytes(witnessUtxo.script);
        map.set(KeyType.PSBT_IN_WITNESS_UTXO, bw.render());
      }
      if (redeemScript) {
        bw.writeBytes(redeemScript);
        map.set(KeyType.PSBT_IN_REDEEM_SCRIPT, bw.render());
      }
      if (witnessScript) {
        bw.writeBytes(witnessScript);
        map.set(KeyType.PSBT_IN_WITNESS_SCRIPT, bw.render());
      }
      if (bip32Derivation) {
        var _iterator11 = _createForOfIteratorHelper(bip32Derivation),
          _step11;
        try {
          for (_iterator11.s(); !(_step11 = _iterator11.n()).done;) {
            var bip32 = _step11.value;
            bw.writeString(KeyType.PSBT_IN_BIP32_DERIVATION, "hex");
            bw.writeBytes(bip32.pubkey);
            var key = bw.render().toString("hex");
            bw.writeBytes(bip32.masterFingerprint);
            bw.writeBytes(parseDerivationPathNodesToBytes(bip32.path));
            map.set(key, bw.render());
          }
        } catch (err) {
          _iterator11.e(err);
        } finally {
          _iterator11.f();
        }
      }
      this.PSBT_GLOBAL_INPUT_COUNT = this.inputMaps.push(map);
    }
  }, {
    key: "addOutput",
    value: function addOutput(_ref2) {
      var amount = _ref2.amount,
        script = _ref2.script,
        redeemScript = _ref2.redeemScript,
        witnessScript = _ref2.witnessScript,
        bip32Derivation = _ref2.bip32Derivation;
      if (!this.isModifiable([PsbtGlobalTxModifiableBits.OUTPUTS])) {
        throw Error("PsbtV2.PSBT_GLOBAL_TX_MODIFIABLE outputs cannot be modified.");
      }
      var map = new Map();
      var bw = new _bufio.BufferWriter();
      bw.writeI64(amount);
      map.set(KeyType.PSBT_OUT_AMOUNT, bw.render());
      bw.writeBytes(script);
      map.set(KeyType.PSBT_OUT_SCRIPT, bw.render());
      if (redeemScript) {
        bw.writeBytes(redeemScript);
        map.set(KeyType.PSBT_OUT_REDEEM_SCRIPT, bw.render());
      }
      if (witnessScript) {
        bw.writeBytes(witnessScript);
        map.set(KeyType.PSBT_OUT_WITNESS_SCRIPT, bw.render());
      }
      if (bip32Derivation) {
        var _iterator12 = _createForOfIteratorHelper(bip32Derivation),
          _step12;
        try {
          for (_iterator12.s(); !(_step12 = _iterator12.n()).done;) {
            var bip32 = _step12.value;
            bw.writeString(KeyType.PSBT_OUT_BIP32_DERIVATION, "hex");
            bw.writeBytes(bip32.pubkey);
            var key = bw.render().toString("hex");
            bw.writeBytes(bip32.masterFingerprint);
            bw.writeBytes(parseDerivationPathNodesToBytes(bip32.path));
            map.set(key, bw.render());
          }
        } catch (err) {
          _iterator12.e(err);
        } finally {
          _iterator12.f();
        }
      }
      this.outputMaps.push(map);
      this.PSBT_GLOBAL_OUTPUT_COUNT = this.outputMaps.length;
    }
    /**
     * Updater/Signer Methods
     */
    // Removes an input-map from inputMaps
  }, {
    key: "deleteInput",
    value: function deleteInput(index) {
      if (!this.isModifiable([PsbtGlobalTxModifiableBits.INPUTS])) {
        throw Error("PsbtV2.PSBT_GLOBAL_TX_MODIFIABLE inputs cannot be modified.");
      }
      var newInputs = this.inputMaps.filter(function (_, i) {
        return i !== index;
      });
      this.inputMaps = newInputs;
      this.PSBT_GLOBAL_INPUT_COUNT = this.inputMaps.length;
    } // Removes an output-map from outputMaps
  }, {
    key: "deleteOutput",
    value: function deleteOutput(index) {
      if (!this.isModifiable([PsbtGlobalTxModifiableBits.OUTPUTS])) {
        throw Error("PsbtV2.PSBT_GLOBAL_TX_MODIFIABLE outputs cannot be modified.");
        // Alternatively, an output could be removed, but depending on the sighash
        // flags for each signature, it might prompt removing all sigs.
      }

      var newOutputs = this.outputMaps.filter(function (_, i) {
        return i !== index;
      });
      if (this.isModifiable([PsbtGlobalTxModifiableBits.SIGHASH_SINGLE])) {
        // SIGHASH_SINGLE ties the input to the output, so remove input sig since
        // it is no longer valid.
        this.removePartialSig(index);
      }
      this.outputMaps = newOutputs;
      this.PSBT_GLOBAL_OUTPUT_COUNT = this.outputMaps.length;
    } // Checks that provided flags are present in PSBT_GLOBAL_TX_MODIFIABLE.
  }, {
    key: "isModifiable",
    value: function isModifiable(flags) {
      var _iterator13 = _createForOfIteratorHelper(flags),
        _step13;
      try {
        for (_iterator13.s(); !(_step13 = _iterator13.n()).done;) {
          var flag = _step13.value;
          if (!this.PSBT_GLOBAL_TX_MODIFIABLE.includes(flag)) {
            return false;
          }
        }
      } catch (err) {
        _iterator13.e(err);
      } finally {
        _iterator13.f();
      }
      return true;
    } // The Signer, when it creates a signature, must add the partial sig keypair
    // to the psbt for the input which it is signing. In the case that a
    // particular signer does not, this method can be used to add a signature to
    // the psbt. This method assumes the Signer did the validation outlined in
    // BIP0174 before creating a signature.
    // https://github.com/bitcoin/bips/blob/master/bip-0174.mediawiki#signer
  }, {
    key: "addPartialSig",
    value: function addPartialSig(inputIndex, pubkey, sig) {
      if (!this.inputMaps[inputIndex]) {
        throw Error("PsbtV2 has no input at ".concat(inputIndex));
      }
      if (!pubkey || !sig) {
        throw Error("PsbtV2.addPartialSig() missing argument ".concat(!pubkey && "pubkey" || !sig && "sig"));
      }
      var key = "".concat(KeyType.PSBT_IN_PARTIAL_SIG).concat(pubkey.toString("hex"));
      if (this.inputMaps[inputIndex].has(key)) {
        throw Error("PsbtV2 already has a signature for this input with this pubkey");
      }
      var modBackup = this.PSBT_GLOBAL_TX_MODIFIABLE;
      try {
        this.inputMaps[inputIndex].set(key, sig);
        this.handleSighashType(sig);
      } catch (err) {
        console.error(err);
        // To remain atomic, attempt to reset everything to the way it was.
        this.inputMaps[inputIndex].delete(key);
        this.PSBT_GLOBAL_TX_MODIFIABLE = modBackup;
      }
    } // Removes all sigs for an input unless a pubkey is specified.
  }, {
    key: "removePartialSig",
    value: function removePartialSig(inputIndex, pubkey) {
      var input = this.inputMaps[inputIndex];
      if (!input) {
        throw Error("PsbtV2 has no input at ".concat(inputIndex));
      }
      if (pubkey) {
        // Pubkey has been provided to remove a specific sig on the input.
        var key = "".concat(KeyType.PSBT_IN_PARTIAL_SIG).concat(pubkey.toString("hex"));
        var sig = this.PSBT_IN_PARTIAL_SIG[inputIndex].find(function (el) {
          return el.key === key;
        });
        if (!sig) {
          throw Error("PsbtV2 input has no signature from pubkey ".concat(pubkey.toString("hex")));
        }
        input.delete(key);
      } else {
        // Remove all sigs on an input.
        var sigs = this.PSBT_IN_PARTIAL_SIG[inputIndex];
        var _iterator14 = _createForOfIteratorHelper(sigs),
          _step14;
        try {
          for (_iterator14.s(); !(_step14 = _iterator14.n()).done;) {
            var _sig = _step14.value;
            input.delete(_sig.key);
          }
        } catch (err) {
          _iterator14.e(err);
        } finally {
          _iterator14.f();
        }
      }
    } // Used to ensure the PSBT is in the proper state when adding a partial sig
    // keypair.
    // https://github.com/bitcoin/bips/blob/master/bip-0370.mediawiki#signer
  }, {
    key: "handleSighashType",
    value: function handleSighashType(sig) {
      var br = new _bufio.BufferReader(sig.slice(-1));
      var sighashVal = br.readU8();
      var modifiable = this.PSBT_GLOBAL_TX_MODIFIABLE;
      if (!(sighashVal & SighashType.SIGHASH_ANYONECANPAY)) {
        modifiable = modifiable.filter(function (val) {
          return val !== PsbtGlobalTxModifiableBits.INPUTS;
        });
      } else {
        // Unset SIGHASH_ANYONECANPAY bit for simpler comparisons
        sighashVal ^= SighashType.SIGHASH_ANYONECANPAY;
      }

      // Can't use bitwise the whole way because SIGHASH_SINGLE is a 3.
      if (sighashVal !== SighashType.SIGHASH_NONE) {
        modifiable = modifiable.filter(function (val) {
          return val !== PsbtGlobalTxModifiableBits.OUTPUTS;
        });
      }
      if (sighashVal === SighashType.SIGHASH_SINGLE && !modifiable.includes(PsbtGlobalTxModifiableBits.SIGHASH_SINGLE)) {
        modifiable.push(PsbtGlobalTxModifiableBits.SIGHASH_SINGLE);
      }
      this.PSBT_GLOBAL_TX_MODIFIABLE = modifiable;
    } // Attempt to return a PsbtV2 by converting from a PsbtV0 string or Buffer
  }, {
    key: "PSBT_GLOBAL_XPUB",
    get: function get() {
      return getNonUniqueKeyTypeValues(this.globalMap, KeyType.PSBT_GLOBAL_XPUB);
    }
  }, {
    key: "PSBT_GLOBAL_TX_VERSION",
    get: function get() {
      var val = this.globalMap.get(KeyType.PSBT_GLOBAL_TX_VERSION);
      if (val === undefined) {
        throw Error("PSBT_GLOBAL_TX_VERSION not set");
      }
      return val.readInt32LE(0);
    },
    set: function set(version) {
      if (version < 2) {
        // It's unfortunate this setter has to throw, but a PsbtV2 is invalid with
        // a txn version < 2. The Creator role is responsible for setting this
        // value and BIP0370 specifies that it cannot be less than 2.
        // https://github.com/bitcoin/bips/blob/master/bip-0370.mediawiki#cite_note-3
        throw Error("PsbtV2 cannot have a global tx version less than 2. Version ".concat(version, " specified."));
      }
      var bw = new _bufio.BufferWriter();
      bw.writeI32(version);
      this.globalMap.set(KeyType.PSBT_GLOBAL_TX_VERSION, bw.render());
    }
  }, {
    key: "PSBT_GLOBAL_FALLBACK_LOCKTIME",
    get: function get() {
      var _this$globalMap$get$r3, _this$globalMap$get3;
      return (_this$globalMap$get$r3 = (_this$globalMap$get3 = this.globalMap.get(KeyType.PSBT_GLOBAL_FALLBACK_LOCKTIME)) === null || _this$globalMap$get3 === void 0 ? void 0 : _this$globalMap$get3.readUInt32LE(0)) !== null && _this$globalMap$get$r3 !== void 0 ? _this$globalMap$get$r3 : null;
    },
    set: function set(locktime) {
      if (locktime === null) {
        this.globalMap.delete(KeyType.PSBT_GLOBAL_FALLBACK_LOCKTIME);
      } else {
        var bw = new _bufio.BufferWriter();
        bw.writeI32(locktime);
        this.globalMap.set(KeyType.PSBT_GLOBAL_FALLBACK_LOCKTIME, bw.render());
      }
    }
  }, {
    key: "PSBT_GLOBAL_INPUT_COUNT",
    get: function get() {
      var val = this.globalMap.get(KeyType.PSBT_GLOBAL_INPUT_COUNT);
      if (val === undefined) {
        throw Error("PSBT_GLOBAL_INPUT_COUNT not set");
      }
      return val.readUInt8(0);
    },
    set: function set(count) {
      var bw = new _bufio.BufferWriter();
      bw.writeU8(count);
      this.globalMap.set(KeyType.PSBT_GLOBAL_INPUT_COUNT, bw.render());
    }
  }, {
    key: "PSBT_GLOBAL_OUTPUT_COUNT",
    get: function get() {
      var val = this.globalMap.get(KeyType.PSBT_GLOBAL_OUTPUT_COUNT);
      if (val === undefined) {
        throw Error("PSBT_GLOBAL_OUTPUT_COUNT not set");
      }
      return val.readUInt8(0);
    },
    set: function set(count) {
      var bw = new _bufio.BufferWriter();
      bw.writeU8(count);
      this.globalMap.set(KeyType.PSBT_GLOBAL_OUTPUT_COUNT, bw.render());
    }
  }, {
    key: "PSBT_GLOBAL_TX_MODIFIABLE",
    get: function get() {
      var _this$globalMap$get4;
      var val = ((_this$globalMap$get4 = this.globalMap.get(KeyType.PSBT_GLOBAL_TX_MODIFIABLE)) === null || _this$globalMap$get4 === void 0 ? void 0 : _this$globalMap$get4.readUInt8(0)) || 0;
      var modifiable = [];
      if (val & 1) {
        modifiable.push(PsbtGlobalTxModifiableBits.INPUTS);
      }
      if (val & 2) {
        modifiable.push(PsbtGlobalTxModifiableBits.OUTPUTS);
      }
      if (val & 4) {
        modifiable.push(PsbtGlobalTxModifiableBits.SIGHASH_SINGLE);
      }
      return modifiable;
    },
    set: function set(modifiable) {
      var val = 0;
      if (modifiable.includes(PsbtGlobalTxModifiableBits.INPUTS)) {
        val |= 1;
      }
      if (modifiable.includes(PsbtGlobalTxModifiableBits.OUTPUTS)) {
        val |= 2;
      }
      if (modifiable.includes(PsbtGlobalTxModifiableBits.SIGHASH_SINGLE)) {
        val |= 4;
      }
      var br = new _bufio.BufferWriter();
      br.writeU8(val);
      this.globalMap.set(KeyType.PSBT_GLOBAL_TX_MODIFIABLE, br.render());
    }
  }, {
    key: "PSBT_GLOBAL_VERSION",
    get: function get() {
      var _this$globalMap$get5;
      var version = (_this$globalMap$get5 = this.globalMap.get(KeyType.PSBT_GLOBAL_VERSION)) === null || _this$globalMap$get5 === void 0 ? void 0 : _this$globalMap$get5.readUInt32LE(0);
      if (version === undefined) {
        // This should never happen.
        console.warn("PSBT_GLOBAL_VERSION key is missing! Setting to version 2.");
        this.PSBT_GLOBAL_VERSION = 2;
      }
      return version !== null && version !== void 0 ? version : 2;
    },
    set: function set(version) {
      var workingVersion = version;
      if (workingVersion < 2) {
        console.warn("PsbtV2 cannot have a global version less than 2. Version ".concat(workingVersion, " specified. Setting to version 2."));
        workingVersion = 2;
      }
      var bw = new _bufio.BufferWriter();
      bw.writeU32(workingVersion);
      this.globalMap.set(KeyType.PSBT_GLOBAL_VERSION, bw.render());
    }
  }, {
    key: "PSBT_GLOBAL_PROPRIETARY",
    get: function get() {
      return getNonUniqueKeyTypeValues(this.globalMap, KeyType.PSBT_GLOBAL_PROPRIETARY);
    }
    /**
     * Input Getters/Setters
     */
  }, {
    key: "PSBT_IN_NON_WITNESS_UTXO",
    get: function get() {
      return getOptionalMappedBytesAsHex(this.inputMaps, KeyType.PSBT_IN_NON_WITNESS_UTXO);
    }
  }, {
    key: "PSBT_IN_WITNESS_UTXO",
    get: function get() {
      return getOptionalMappedBytesAsHex(this.inputMaps, KeyType.PSBT_IN_WITNESS_UTXO);
    }
  }, {
    key: "PSBT_IN_PARTIAL_SIG",
    get: function get() {
      return getNonUniqueKeyTypeValues(this.inputMaps, KeyType.PSBT_IN_PARTIAL_SIG);
    }
  }, {
    key: "PSBT_IN_SIGHASH_TYPE",
    get: function get() {
      return getOptionalMappedBytesAsUInt(this.inputMaps, KeyType.PSBT_IN_SIGHASH_TYPE);
    }
  }, {
    key: "PSBT_IN_REDEEM_SCRIPT",
    get: function get() {
      return getOptionalMappedBytesAsHex(this.inputMaps, KeyType.PSBT_IN_REDEEM_SCRIPT);
    }
  }, {
    key: "PSBT_IN_WITNESS_SCRIPT",
    get: function get() {
      return getOptionalMappedBytesAsHex(this.inputMaps, KeyType.PSBT_IN_WITNESS_SCRIPT);
    }
  }, {
    key: "PSBT_IN_BIP32_DERIVATION",
    get: function get() {
      return getNonUniqueKeyTypeValues(this.inputMaps, KeyType.PSBT_IN_BIP32_DERIVATION);
    }
  }, {
    key: "PSBT_IN_FINAL_SCRIPTSIG",
    get: function get() {
      return getOptionalMappedBytesAsHex(this.inputMaps, KeyType.PSBT_IN_FINAL_SCRIPTSIG);
    }
  }, {
    key: "PSBT_IN_FINAL_SCRIPTWITNESS",
    get: function get() {
      return getOptionalMappedBytesAsHex(this.inputMaps, KeyType.PSBT_IN_FINAL_SCRIPTWITNESS);
    }
  }, {
    key: "PSBT_IN_POR_COMMITMENT",
    get: function get() {
      return getOptionalMappedBytesAsHex(this.inputMaps, KeyType.PSBT_IN_POR_COMMITMENT);
    }
  }, {
    key: "PSBT_IN_RIPEMD160",
    get: function get() {
      return getNonUniqueKeyTypeValues(this.inputMaps, KeyType.PSBT_IN_RIPEMD160);
    }
  }, {
    key: "PSBT_IN_SHA256",
    get: function get() {
      return getNonUniqueKeyTypeValues(this.inputMaps, KeyType.PSBT_IN_SHA256);
    }
  }, {
    key: "PSBT_IN_HASH160",
    get: function get() {
      return getNonUniqueKeyTypeValues(this.inputMaps, KeyType.PSBT_IN_HASH160);
    }
  }, {
    key: "PSBT_IN_HASH256",
    get: function get() {
      return getNonUniqueKeyTypeValues(this.inputMaps, KeyType.PSBT_IN_HASH256);
    }
  }, {
    key: "PSBT_IN_PREVIOUS_TXID",
    get: function get() {
      var indices = [];
      var _iterator15 = _createForOfIteratorHelper(this.inputMaps),
        _step15;
      try {
        for (_iterator15.s(); !(_step15 = _iterator15.n()).done;) {
          var map = _step15.value;
          var value = map.get(KeyType.PSBT_IN_PREVIOUS_TXID);
          if (!value) {
            throw Error("PSBT_IN_PREVIOUS_TXID not set for an input");
          }
          indices.push(value.toString("hex"));
        }
      } catch (err) {
        _iterator15.e(err);
      } finally {
        _iterator15.f();
      }
      return indices;
    }
  }, {
    key: "PSBT_IN_OUTPUT_INDEX",
    get: function get() {
      var indices = [];
      var _iterator16 = _createForOfIteratorHelper(this.inputMaps),
        _step16;
      try {
        for (_iterator16.s(); !(_step16 = _iterator16.n()).done;) {
          var map = _step16.value;
          var value = map.get(KeyType.PSBT_IN_OUTPUT_INDEX);
          if (!value) {
            throw Error("PSBT_IN_OUTPUT_INDEX not set for an input");
          }
          indices.push(value.readUInt32LE(0));
        }
      } catch (err) {
        _iterator16.e(err);
      } finally {
        _iterator16.f();
      }
      return indices;
    }
  }, {
    key: "PSBT_IN_SEQUENCE",
    get: function get() {
      return getOptionalMappedBytesAsUInt(this.inputMaps, KeyType.PSBT_IN_SEQUENCE);
    }
  }, {
    key: "PSBT_IN_REQUIRED_TIME_LOCKTIME",
    get: function get() {
      return getOptionalMappedBytesAsUInt(this.inputMaps, KeyType.PSBT_IN_REQUIRED_TIME_LOCKTIME);
    }
  }, {
    key: "PSBT_IN_REQUIRED_HEIGHT_LOCKTIME",
    get: function get() {
      return getOptionalMappedBytesAsUInt(this.inputMaps, KeyType.PSBT_IN_REQUIRED_HEIGHT_LOCKTIME);
    }
  }, {
    key: "PSBT_IN_TAP_KEY_SIG",
    get: function get() {
      return getOptionalMappedBytesAsHex(this.inputMaps, KeyType.PSBT_IN_TAP_KEY_SIG);
    }
  }, {
    key: "PSBT_IN_TAP_SCRIPT_SIG",
    get: function get() {
      return getNonUniqueKeyTypeValues(this.inputMaps, KeyType.PSBT_IN_TAP_SCRIPT_SIG);
    }
  }, {
    key: "PSBT_IN_TAP_LEAF_SCRIPT",
    get: function get() {
      return getNonUniqueKeyTypeValues(this.inputMaps, KeyType.PSBT_IN_TAP_LEAF_SCRIPT);
    }
  }, {
    key: "PSBT_IN_TAP_BIP32_DERIVATION",
    get: function get() {
      return getNonUniqueKeyTypeValues(this.inputMaps, KeyType.PSBT_IN_TAP_BIP32_DERIVATION);
    }
  }, {
    key: "PSBT_IN_TAP_INTERNAL_KEY",
    get: function get() {
      return getOptionalMappedBytesAsHex(this.inputMaps, KeyType.PSBT_IN_TAP_INTERNAL_KEY);
    }
  }, {
    key: "PSBT_IN_TAP_MERKLE_ROOT",
    get: function get() {
      return getOptionalMappedBytesAsHex(this.inputMaps, KeyType.PSBT_IN_TAP_MERKLE_ROOT);
    }
  }, {
    key: "PSBT_IN_PROPRIETARY",
    get: function get() {
      return getNonUniqueKeyTypeValues(this.inputMaps, KeyType.PSBT_IN_PROPRIETARY);
    }
    /**
     * Output Getters/Setters
     */
  }, {
    key: "PSBT_OUT_REDEEM_SCRIPT",
    get: function get() {
      return getOptionalMappedBytesAsHex(this.outputMaps, KeyType.PSBT_OUT_REDEEM_SCRIPT);
    }
  }, {
    key: "PSBT_OUT_WITNESS_SCRIPT",
    get: function get() {
      return getOptionalMappedBytesAsHex(this.outputMaps, KeyType.PSBT_OUT_WITNESS_SCRIPT);
    }
  }, {
    key: "PSBT_OUT_BIP32_DERIVATION",
    get: function get() {
      return getNonUniqueKeyTypeValues(this.outputMaps, KeyType.PSBT_OUT_BIP32_DERIVATION);
    }
  }, {
    key: "PSBT_OUT_AMOUNT",
    get: function get() {
      var indices = [];
      var _iterator17 = _createForOfIteratorHelper(this.outputMaps),
        _step17;
      try {
        for (_iterator17.s(); !(_step17 = _iterator17.n()).done;) {
          var map = _step17.value;
          var value = map.get(KeyType.PSBT_OUT_AMOUNT);
          if (!value) {
            throw Error("PSBT_OUT_AMOUNT not set for an output");
          }
          var br = new _bufio.BufferReader(value);
          indices.push(br.readBigI64(value));
        }
      } catch (err) {
        _iterator17.e(err);
      } finally {
        _iterator17.f();
      }
      return indices;
    }
  }, {
    key: "PSBT_OUT_SCRIPT",
    get: function get() {
      var indices = [];
      var _iterator18 = _createForOfIteratorHelper(this.outputMaps),
        _step18;
      try {
        for (_iterator18.s(); !(_step18 = _iterator18.n()).done;) {
          var map = _step18.value;
          var value = map.get(KeyType.PSBT_OUT_SCRIPT);
          if (!value) {
            // This should never happen, but it can't be gracefully handled.
            throw Error("PSBT_OUT_SCRIPT not set for an output");
          }
          indices.push(value.toString("hex"));
        }
      } catch (err) {
        _iterator18.e(err);
      } finally {
        _iterator18.f();
      }
      return indices;
    }
  }, {
    key: "PSBT_OUT_TAP_INTERNAL_KEY",
    get: function get() {
      return getOptionalMappedBytesAsHex(this.outputMaps, KeyType.PSBT_OUT_TAP_INTERNAL_KEY);
    }
  }, {
    key: "PSBT_OUT_TAP_TREE",
    get: function get() {
      return getOptionalMappedBytesAsHex(this.outputMaps, KeyType.PSBT_OUT_TAP_TREE);
    }
  }, {
    key: "PSBT_OUT_TAP_BIP32_DERIVATION",
    get: function get() {
      return getNonUniqueKeyTypeValues(this.outputMaps, KeyType.PSBT_OUT_TAP_BIP32_DERIVATION);
    }
  }, {
    key: "PSBT_OUT_PROPRIETARY",
    get: function get() {
      return getNonUniqueKeyTypeValues(this.outputMaps, KeyType.PSBT_OUT_PROPRIETARY);
    }
    /**
     * Other Getters/Setters
     */
  }, {
    key: "nLockTime",
    get: function get() {
      // From BIP0370: The nLockTime field of a transaction is determined by
      // inspecting the PSBT_GLOBAL_FALLBACK_LOCKTIME and each input's
      // PSBT_IN_REQUIRED_TIME_LOCKTIME and PSBT_IN_REQUIRED_HEIGHT_LOCKTIME
      // fields.
      //
      // First collect total locks
      var inputCount = this.PSBT_GLOBAL_INPUT_COUNT;
      var heightLocks = this.PSBT_IN_REQUIRED_HEIGHT_LOCKTIME;
      var timeLocks = this.PSBT_IN_REQUIRED_TIME_LOCKTIME;
      var heights = [];
      var times = [];
      for (var i = 0; i < this.PSBT_GLOBAL_INPUT_COUNT; i++) {
        if (heightLocks[i] !== null) {
          heights.push(heightLocks[i]);
        }
        if (timeLocks[i] !== null) {
          times.push(timeLocks[i]);
        }
      }

      // From BIP0370: If none of the inputs have a PSBT_IN_REQUIRED_TIME_LOCKTIME
      // and *(or) PSBT_IN_REQUIRED_HEIGHT_LOCKTIME, then
      // PSBT_GLOBAL_FALLBACK_LOCKTIME must be used. If
      // PSBT_GLOBAL_FALLBACK_LOCKTIME is not provided, then it is assumed to be
      // 0.
      if (heights.length === 0 && times.length === 0) {
        return this.PSBT_GLOBAL_FALLBACK_LOCKTIME || 0;
      }

      // From BIP0370: If one or more inputs have a PSBT_IN_REQUIRED_TIME_LOCKTIME
      // or PSBT_IN_REQUIRED_HEIGHT_LOCKTIME, then the field chosen is the one
      // which is supported by all of the inputs. This can be determined by
      // looking at all of the inputs which specify a locktime in either of those
      // fields, and choosing the field which is present in all of those inputs.
      // Inputs not specifying a lock time field can take both types of lock
      // times, as can those that specify both. The lock time chosen is then the
      // maximum value of the chosen type of lock time.
      //
      // If a PSBT has both types of locktimes possible because one or more inputs
      // specify both PSBT_IN_REQUIRED_TIME_LOCKTIME and
      // PSBT_IN_REQUIRED_HEIGHT_LOCKTIME, then locktime determined by looking at
      // the PSBT_IN_REQUIRED_HEIGHT_LOCKTIME fields of the inputs must be chosen.
      if (heights.length === inputCount || heights.length > times.length) {
        return Math.max.apply(Math, heights);
      }
      if (times.length > heights.length) {
        return Math.max.apply(Math, times);
      }
      return null;
    }
  }], [{
    key: "FromV0",
    value: function FromV0(psbt) {
      var _psbtv0GlobalMap$glob;
      var allowTxnVersion1 = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : false;
      var psbtv0Buf = bufferize(psbt);
      var psbtv0 = _bitcoinjsLib.Psbt.fromBuffer(psbtv0Buf);
      var psbtv0GlobalMap = psbtv0.data.globalMap;

      // Creator Role
      var psbtv2 = new PsbtV2();
      // Set it fully modifiable so that we can add the v0 inputs and outputs.
      psbtv2.PSBT_GLOBAL_TX_MODIFIABLE = [PsbtGlobalTxModifiableBits.INPUTS, PsbtGlobalTxModifiableBits.OUTPUTS];
      var txVersion = psbtv0.data.getTransaction().readInt32LE(0);
      if (txVersion === 1 && allowTxnVersion1) {
        psbtv2.dangerouslySetGlobalTxVersion1();
      } else {
        psbtv2.PSBT_GLOBAL_TX_VERSION = psbtv0.data.getTransaction().readInt32LE(0);
      }

      // Is this also a Creator role step? Unknown.
      var _iterator19 = _createForOfIteratorHelper((_psbtv0GlobalMap$glob = psbtv0GlobalMap.globalXpub) !== null && _psbtv0GlobalMap$glob !== void 0 ? _psbtv0GlobalMap$glob : []),
        _step19;
      try {
        for (_iterator19.s(); !(_step19 = _iterator19.n()).done;) {
          var globalXpub = _step19.value;
          psbtv2.addGlobalXpub(globalXpub.extendedPubkey, globalXpub.masterFingerprint, globalXpub.path);
        }

        // Constructor Role
      } catch (err) {
        _iterator19.e(err);
      } finally {
        _iterator19.f();
      }
      var txInputs = [];
      var _iterator20 = _createForOfIteratorHelper(psbtv0.txInputs.entries()),
        _step20;
      try {
        for (_iterator20.s(); !(_step20 = _iterator20.n()).done;) {
          var _step20$value = _slicedToArray(_step20.value, 2),
            index = _step20$value[0],
            txInput = _step20$value[1];
          txInputs[index] = txInput;
        }
      } catch (err) {
        _iterator20.e(err);
      } finally {
        _iterator20.f();
      }
      var _iterator21 = _createForOfIteratorHelper(psbtv0.data.inputs.entries()),
        _step21;
      try {
        for (_iterator21.s(); !(_step21 = _iterator21.n()).done;) {
          var _step21$value = _slicedToArray(_step21.value, 2),
            _index = _step21$value[0],
            input = _step21$value[1];
          var _txInput = txInputs[_index];
          psbtv2.addInput({
            previousTxId: _txInput.hash,
            outputIndex: _txInput.index,
            sequence: _txInput.sequence,
            nonWitnessUtxo: input.nonWitnessUtxo,
            witnessUtxo: input.witnessUtxo && {
              amount: input.witnessUtxo.value,
              script: input.witnessUtxo.script
            },
            redeemScript: input.redeemScript,
            witnessScript: input.witnessScript,
            bip32Derivation: input.bip32Derivation
          });
        }
      } catch (err) {
        _iterator21.e(err);
      } finally {
        _iterator21.f();
      }
      var txOutputs = [];
      var _iterator22 = _createForOfIteratorHelper(psbtv0.txOutputs.entries()),
        _step22;
      try {
        for (_iterator22.s(); !(_step22 = _iterator22.n()).done;) {
          var _step22$value = _slicedToArray(_step22.value, 2),
            _index2 = _step22$value[0],
            txOutput = _step22$value[1];
          txOutputs[_index2] = txOutput;
        }
      } catch (err) {
        _iterator22.e(err);
      } finally {
        _iterator22.f();
      }
      var _iterator23 = _createForOfIteratorHelper(psbtv0.data.outputs.entries()),
        _step23;
      try {
        for (_iterator23.s(); !(_step23 = _iterator23.n()).done;) {
          var _step23$value = _slicedToArray(_step23.value, 2),
            _index3 = _step23$value[0],
            output = _step23$value[1];
          var _txOutput = txOutputs[_index3];
          psbtv2.addOutput({
            amount: _txOutput.value,
            script: _txOutput.script,
            redeemScript: output.redeemScript,
            witnessScript: output.witnessScript,
            bip32Derivation: output.bip32Derivation
          });
        }

        // Finally, add partialSigs to inputs. This has to be performed last since
        // it may change PSBT_GLOBAL_TX_MODIFIABLE preventing inputs or outputs from
        // being added.
      } catch (err) {
        _iterator23.e(err);
      } finally {
        _iterator23.f();
      }
      var _iterator24 = _createForOfIteratorHelper(psbtv0.data.inputs.entries()),
        _step24;
      try {
        for (_iterator24.s(); !(_step24 = _iterator24.n()).done;) {
          var _step24$value = _slicedToArray(_step24.value, 2),
            _index4 = _step24$value[0],
            _input = _step24$value[1];
          var _iterator25 = _createForOfIteratorHelper(_input.partialSig || []),
            _step25;
          try {
            for (_iterator25.s(); !(_step25 = _iterator25.n()).done;) {
              var sig = _step25.value;
              psbtv2.addPartialSig(_index4, sig.pubkey, sig.signature);
            }
          } catch (err) {
            _iterator25.e(err);
          } finally {
            _iterator25.f();
          }
        }
      } catch (err) {
        _iterator24.e(err);
      } finally {
        _iterator24.f();
      }
      return psbtv2;
    }
  }]);
  return PsbtV2;
}(PsbtV2Maps);
/**
 * Attempts to extract the version number as uint32LE from raw psbt regardless
 * of psbt validity.
 * @param {string | Buffer} psbt - hex, base64 or buffer of psbt
 * @returns {number} version number
 */
exports.PsbtV2 = PsbtV2;
function getPsbtVersionNumber(psbt) {
  var _map$get3;
  var map = new Map();
  var buf = bufferize(psbt);
  var br = new _bufio.BufferReader(buf.slice(_psbt.PSBT_MAGIC_BYTES.length));
  readAndSetKeyPairs(map, br);
  return ((_map$get3 = map.get(KeyType.PSBT_GLOBAL_VERSION)) === null || _map$get3 === void 0 ? void 0 : _map$get3.readUInt32LE(0)) || 0;
}