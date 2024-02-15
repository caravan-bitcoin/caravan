"use strict";

require("core-js/modules/es6.object.define-property");
require("core-js/modules/es6.string.iterator");
require("core-js/modules/es6.array.from");
require("core-js/modules/es6.function.name");
require("core-js/modules/es7.symbol.async-iterator");
require("core-js/modules/es6.symbol");
require("core-js/modules/es6.array.is-array");
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.smartDecodeUR = exports.extractSingleWorkload = exports.decodeUR = void 0;
require("core-js/modules/es6.array.filter");
require("core-js/modules/es6.array.index-of");
require("core-js/modules/es6.array.for-each");
require("core-js/modules/es6.array.fill");
require("core-js/modules/es6.regexp.to-string");
require("core-js/modules/es6.date.to-string");
require("core-js/modules/es6.object.to-string");
require("core-js/modules/es6.regexp.split");
var _utils = require("./utils");
var _miniCbor = require("./miniCbor");
var _bech = require("../bech32");
function _slicedToArray(arr, i) { return _arrayWithHoles(arr) || _iterableToArrayLimit(arr, i) || _unsupportedIterableToArray(arr, i) || _nonIterableRest(); }
function _nonIterableRest() { throw new TypeError("Invalid attempt to destructure non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }
function _unsupportedIterableToArray(o, minLen) { if (!o) return; if (typeof o === "string") return _arrayLikeToArray(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return Array.from(o); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen); }
function _arrayLikeToArray(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) arr2[i] = arr[i]; return arr2; }
function _iterableToArrayLimit(arr, i) { var _i = null == arr ? null : "undefined" != typeof Symbol && arr[Symbol.iterator] || arr["@@iterator"]; if (null != _i) { var _s, _e, _x, _r, _arr = [], _n = !0, _d = !1; try { if (_x = (_i = _i.call(arr)).next, 0 === i) { if (Object(_i) !== _i) return; _n = !1; } else for (; !(_n = (_s = _x.call(_i)).done) && (_arr.push(_s.value), _arr.length !== i); _n = !0); } catch (err) { _d = !0, _e = err; } finally { try { if (!_n && null != _i["return"] && (_r = _i["return"](), Object(_r) !== _r)) return; } finally { if (_d) throw _e; } } return _arr; } }
function _arrayWithHoles(arr) { if (Array.isArray(arr)) return arr; }
var checkAndGetSequence = function checkAndGetSequence(sequence) {
  var pieces = sequence.toUpperCase().split('OF');
  if (pieces.length !== 2) throw new Error("invalid sequence: ".concat(sequence));
  var _pieces = _slicedToArray(pieces, 2),
    index = _pieces[0],
    total = _pieces[1];
  return [+index, +total];
};
var checkDigest = function checkDigest(digest, payload) {
  var decoded = (0, _bech.decodeBc32Data)(payload);
  if (!decoded) throw new Error("can not decode payload: ".concat(payload));
  if ((0, _bech.decodeBc32Data)(digest) !== (0, _utils.sha256Hash)(Buffer.from(decoded, 'hex')).toString('hex')) {
    throw new Error("invalid digest: \n digest:".concat(digest, " \n payload:").concat(payload));
  }
};
var checkURHeader = function checkURHeader(UR) {
  var type = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 'bytes';
  if (UR.toUpperCase() !== "ur:".concat(type).toUpperCase()) throw new Error("invalid UR header: ".concat(UR));
};
var dealWithSingleWorkload = function dealWithSingleWorkload(workload) {
  var type = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 'bytes';
  var pieces = workload.split('/');
  switch (pieces.length) {
    case 2:
      {
        //UR:Type/[Fragment]
        checkURHeader(pieces[0], type);
        return pieces[1];
      }
    case 3:
      {
        //UR:Type/[Digest]/[Fragment] when Sequencing is omitted, Digest MAY be omitted;
        //should check digest
        checkURHeader(pieces[0], type);
        var digest = pieces[1];
        var fragment = pieces[2];
        checkDigest(digest, fragment);
        return fragment;
      }
    case 4:
      {
        //UR:Type/[Sequencing]/[Digest]/[Fragment]
        //should check sequencing and digest
        checkURHeader(pieces[0], type);
        checkAndGetSequence(pieces[1]);
        var _digest = pieces[2];
        var _fragment = pieces[3];
        checkDigest(_digest, _fragment);
        return _fragment;
      }
    default:
      throw new Error("invalid workload pieces length: expect 2 / 3 / 4 bug got ".concat(pieces.length));
  }
};
var dealWithMultipleWorkloads = function dealWithMultipleWorkloads(workloads) {
  var type = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 'bytes';
  var length = workloads.length;
  var fragments = new Array(length).fill('');
  var digest = '';
  workloads.forEach(function (workload) {
    var pieces = workload.split('/');
    checkURHeader(pieces[0], type);
    var _checkAndGetSequence = checkAndGetSequence(pieces[1]),
      _checkAndGetSequence2 = _slicedToArray(_checkAndGetSequence, 2),
      index = _checkAndGetSequence2[0],
      total = _checkAndGetSequence2[1];
    if (total !== length) throw new Error("invalid workload: ".concat(workload, ", total ").concat(total, " not equal workloads length ").concat(length));
    if (digest && digest !== pieces[2]) throw new Error("invalid workload: ".concat(workload, ", checksum changed ").concat(digest, ", ").concat(pieces[2]));
    digest = pieces[2];
    if (fragments[index - 1]) throw new Error("invalid workload: ".concat(workload, ", index ").concat(index, " has already been set"));
    fragments[index - 1] = pieces[3];
  });
  var payload = fragments.join('');
  checkDigest(digest, payload);
  return payload;
};
var getBC32Payload = function getBC32Payload(workloads) {
  var type = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 'bytes';
  try {
    var length = workloads.length;
    if (length === 1) {
      return dealWithSingleWorkload(workloads[0], type);
    } else {
      return dealWithMultipleWorkloads(workloads, type);
    }
  } catch (e) {
    throw new Error("invalid workloads: ".concat(workloads, "\n ").concat(e));
  }
};
var decodeUR = function decodeUR(workloads) {
  var type = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 'bytes';
  var bc32Payload = getBC32Payload(workloads, type);
  var cborPayload = (0, _bech.decodeBc32Data)(bc32Payload);
  if (!cborPayload) {
    throw new Error('invalid data');
  }
  return (0, _miniCbor.decodeSimpleCBOR)(cborPayload);
};
exports.decodeUR = decodeUR;
var onlyUniq = function onlyUniq(value, index, self) {
  return self.indexOf(value) === index;
};
var smartDecodeUR = function smartDecodeUR(workloads) {
  if (workloads.length > 0) {
    var _extractSingleWorkloa = extractSingleWorkload(workloads[0]),
      _extractSingleWorkloa2 = _slicedToArray(_extractSingleWorkloa, 2),
      index = _extractSingleWorkloa2[0],
      total = _extractSingleWorkloa2[1];
    if (workloads.length === total) {
      return {
        success: true,
        current: workloads.length,
        length: total,
        workloads: [],
        result: decodeUR(workloads)
      };
    } else {
      return {
        success: false,
        current: workloads.length,
        length: total,
        workloads: workloads.filter(onlyUniq),
        result: ''
      };
    }
  } else {
    return {
      success: false,
      current: 0,
      length: 0,
      workloads: [],
      result: ''
    };
  }
};
exports.smartDecodeUR = smartDecodeUR;
var extractSingleWorkload = function extractSingleWorkload(workload) {
  var pieces = workload.toUpperCase().split('/');
  switch (pieces.length) {
    case 2: //UR:Type/[Fragment]
    case 3:
      {
        //UR:Type/[Digest]/[Fragment] when Sequencing is omitted, Digest MAY be omitted;
        return [1, 1];
      }
    case 4:
      {
        //UR:Type/[Sequencing]/[Digest]/[Fragment]
        return checkAndGetSequence(pieces[1]);
      }
    default:
      throw new Error("invalid workload pieces length: expect 2 / 3 / 4 bug got ".concat(pieces.length));
  }
};
exports.extractSingleWorkload = extractSingleWorkload;