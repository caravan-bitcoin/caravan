"use strict";

require("core-js/modules/es6.object.define-property");
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.encodeUR = void 0;
require("core-js/modules/es6.regexp.constructor");
require("core-js/modules/es6.regexp.match");
require("core-js/modules/es6.regexp.to-string");
require("core-js/modules/es6.date.to-string");
require("core-js/modules/es6.object.to-string");
require("core-js/modules/es6.array.map");
var _miniCbor = require("./miniCbor");
var _bech = require("../bech32");
var _utils = require("./utils");
var composeUR = function composeUR(payload) {
  var type = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 'bytes';
  return "ur:".concat(type, "/").concat(payload);
};
var composeDigest = function composeDigest(payload, digest) {
  return "".concat(digest, "/").concat(payload);
};
var composeSequencing = function composeSequencing(payload, index, total) {
  return "".concat(index + 1, "of").concat(total, "/").concat(payload);
};
var composeHeadersToFragments = function composeHeadersToFragments(fragments, digest) {
  var type = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 'bytes';
  if (fragments.length === 1) {
    return [composeUR(fragments[0])];
  } else {
    return fragments.map(function (f, index) {
      return (0, _utils.compose3)(function (payload) {
        return composeUR(payload, type);
      }, function (payload) {
        return composeSequencing(payload, index, fragments.length);
      }, function (payload) {
        return composeDigest(payload, digest);
      })(f);
    });
  }
};
var encodeUR = function encodeUR(payload) {
  var fragmentCapacity = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 200;
  var cborPayload = (0, _miniCbor.encodeSimpleCBOR)(payload);
  var bc32Payload = (0, _bech.encodeBc32Data)(cborPayload);
  var digest = (0, _utils.sha256Hash)(Buffer.from(cborPayload, 'hex')).toString('hex');
  var bc32Digest = (0, _bech.encodeBc32Data)(digest);
  var fragments = bc32Payload.match(new RegExp('.{1,' + fragmentCapacity + '}', 'g'));
  if (!fragments) {
    throw new Error('Unexpected error when encoding');
  }
  return composeHeadersToFragments(fragments, bc32Digest, 'bytes').map(function (str) {
    return str.toUpperCase();
  });
};
exports.encodeUR = encodeUR;