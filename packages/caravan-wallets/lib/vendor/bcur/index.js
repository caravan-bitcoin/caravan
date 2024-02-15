"use strict";

require("core-js/modules/es6.object.define-property");
Object.defineProperty(exports, "__esModule", {
  value: true
});
Object.defineProperty(exports, "decodeUR", {
  enumerable: true,
  get: function get() {
    return _decodeUR.decodeUR;
  }
});
Object.defineProperty(exports, "encodeUR", {
  enumerable: true,
  get: function get() {
    return _encodeUR.encodeUR;
  }
});
Object.defineProperty(exports, "extractSingleWorkload", {
  enumerable: true,
  get: function get() {
    return _decodeUR.extractSingleWorkload;
  }
});
Object.defineProperty(exports, "smartDecodeUR", {
  enumerable: true,
  get: function get() {
    return _decodeUR.smartDecodeUR;
  }
});
var _encodeUR = require("./encodeUR");
var _decodeUR = require("./decodeUR");