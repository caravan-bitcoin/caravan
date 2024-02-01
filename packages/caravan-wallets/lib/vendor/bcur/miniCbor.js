"use strict";

require("core-js/modules/es6.object.define-property");
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.encodeSimpleCBOR = exports.decodeSimpleCBOR = exports.composeHeader = void 0;
require("core-js/modules/es6.regexp.to-string");
require("core-js/modules/es6.date.to-string");
require("core-js/modules/es6.object.to-string");
/*
    this an simple cbor implementation which is just using
    on BCR-05
*/
var composeHeader = function composeHeader(length) {
  var header;
  if (length > 0 && length <= 23) {
    header = Buffer.from([0x40 + length]);
  } else if (length >= 24 && length <= 255) {
    var headerLength = Buffer.alloc(1);
    headerLength.writeUInt8(length, 0);
    header = Buffer.concat([Buffer.from([0x58]), headerLength]);
  } else if (length >= 256 && length <= 65535) {
    var _headerLength = Buffer.alloc(2);
    _headerLength.writeUInt16BE(length, 0);
    header = Buffer.concat([Buffer.from([0x59]), _headerLength]);
  } else if (length >= 65536 && length <= Math.pow(2, 32) - 1) {
    var _headerLength2 = Buffer.alloc(4);
    _headerLength2.writeUInt32BE(length, 0);
    header = Buffer.concat([Buffer.from([0x60]), _headerLength2]);
  } else {
    throw new Error('length exceeded');
  }
  return header;
};
exports.composeHeader = composeHeader;
var encodeSimpleCBOR = function encodeSimpleCBOR(data) {
  var bufferData = Buffer.from(data, 'hex');
  if (bufferData.length <= 0 || bufferData.length >= Math.pow(2, 32)) {
    throw new Error('data is too large');
  }
  var header = composeHeader(bufferData.length);
  var endcoded = Buffer.concat([header, bufferData]);
  return endcoded.toString('hex');
};
exports.encodeSimpleCBOR = encodeSimpleCBOR;
var decodeSimpleCBOR = function decodeSimpleCBOR(data) {
  var dataBuffer = Buffer.from(data, 'hex');
  if (dataBuffer.length <= 0) {
    throw new Error('invalid input');
  }
  var header = dataBuffer[0];
  if (header < 0x58) {
    var dataLength = header - 0x40;
    return dataBuffer.slice(1, 1 + dataLength).toString('hex');
  } else if (header == 0x58) {
    var _dataLength = dataBuffer.slice(1, 2).readUInt8(0);
    return dataBuffer.slice(2, 2 + _dataLength).toString('hex');
  } else if (header == 0x59) {
    var _dataLength2 = dataBuffer.slice(1, 3).readUInt16BE(0);
    return dataBuffer.slice(3, 3 + _dataLength2).toString('hex');
  } else if (header == 0x60) {
    var _dataLength3 = dataBuffer.slice(1, 5).readUInt32BE(0);
    return dataBuffer.slice(5, 5 + _dataLength3).toString('hex');
  } else {
    throw new Error('invalid input');
  }
};
exports.decodeSimpleCBOR = decodeSimpleCBOR;