"use strict";

require("core-js/modules/es6.object.define-property");
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.encodeSegwitAddress = exports.encodeBc32Data = exports.decodeSegwitAddress = exports.decodeBc32Data = exports.Bech32Version = void 0;
require("core-js/modules/es6.regexp.to-string");
require("core-js/modules/es6.date.to-string");
require("core-js/modules/es6.object.to-string");
require("core-js/modules/es6.typed.uint8-array");
var _bech = _interopRequireDefault(require("./bech32"));
function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }
var Bech32Version = {
  Origin: 1,
  bis: 2
};
exports.Bech32Version = Bech32Version;
var convertBits = function convertBits(data, fromBits, toBits, pad) {
  var acc = 0;
  var bits = 0;
  var ret = [];
  var maxv = (1 << toBits) - 1;
  for (var p = 0; p < data.length; ++p) {
    var value = data[p];
    if (value < 0 || value >> fromBits !== 0) {
      return null;
    }
    acc = acc << fromBits | value;
    bits += fromBits;
    while (bits >= toBits) {
      bits -= toBits;
      ret.push(acc >> bits & maxv);
    }
  }
  if (pad) {
    if (bits > 0) {
      ret.push(acc << toBits - bits & maxv);
    }
  } else if (bits >= fromBits || acc << toBits - bits & maxv) {
    return null;
  }
  return ret;
};
var decodeSegwitAddress = function decodeSegwitAddress(hrp, addr) {
  var dec = _bech["default"].decode(addr);
  if (dec === null || dec.hrp !== hrp || dec.data.length < 1 || dec.data[0] > 16) {
    return null;
  }
  var res = convertBits(Uint8Array.from(dec.data.slice(1)), 5, 8, false);
  if (res === null || res.length < 2 || res.length > 40) {
    return null;
  }
  if (dec.data[0] === 0 && res.length !== 20 && res.length !== 32) {
    return null;
  }
  return {
    version: dec.data[0],
    program: res
  };
};
exports.decodeSegwitAddress = decodeSegwitAddress;
var encodeSegwitAddress = function encodeSegwitAddress(hrp, version, program) {
  var u82u5 = convertBits(program, 8, 5, true);
  if (!u82u5) {
    return null;
  }
  var ret = _bech["default"].encode(hrp, [version].concat(u82u5), Bech32Version.Origin);
  if (decodeSegwitAddress(hrp, ret) === null) {
    return null;
  }
  return ret;
};
exports.encodeSegwitAddress = encodeSegwitAddress;
var encodeBc32Data = function encodeBc32Data(hex) {
  var data = Buffer.from(hex, 'hex');
  var u82u5 = convertBits(data, 8, 5, true);
  if (!u82u5) {
    throw new Error('invalid input');
  } else {
    return _bech["default"].encode(undefined, u82u5, Bech32Version.bis);
  }
};
exports.encodeBc32Data = encodeBc32Data;
var decodeBc32Data = function decodeBc32Data(data) {
  var result = _bech["default"].decode(data);
  if (result) {
    var res = convertBits(Buffer.from(result.data), 5, 8, false);
    if (res) return Buffer.from(res).toString('hex');
    return null;
  } else {
    return null;
  }
};
exports.decodeBc32Data = decodeBc32Data;