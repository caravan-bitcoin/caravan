"use strict";

require("core-js/modules/es6.function.name");
require("core-js/modules/es6.regexp.to-string");
require("core-js/modules/es6.date.to-string");
require("core-js/modules/es6.object.to-string");
require("core-js/modules/es6.string.iterator");
require("core-js/modules/es6.array.from");
require("core-js/modules/es6.array.is-array");
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.BCUREncoder = exports.BCURDecoder = void 0;
require("core-js/modules/es7.array.includes");
require("core-js/modules/es6.string.includes");
require("core-js/modules/es6.number.constructor");
require("core-js/modules/es7.symbol.async-iterator");
require("core-js/modules/es6.symbol");
require("core-js/modules/es6.object.define-property");
var _bcur = require("./vendor/bcur");
function _toConsumableArray(arr) { return _arrayWithoutHoles(arr) || _iterableToArray(arr) || _unsupportedIterableToArray(arr) || _nonIterableSpread(); }
function _nonIterableSpread() { throw new TypeError("Invalid attempt to spread non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }
function _unsupportedIterableToArray(o, minLen) { if (!o) return; if (typeof o === "string") return _arrayLikeToArray(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return Array.from(o); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen); }
function _iterableToArray(iter) { if (typeof Symbol !== "undefined" && iter[Symbol.iterator] != null || iter["@@iterator"] != null) return Array.from(iter); }
function _arrayWithoutHoles(arr) { if (Array.isArray(arr)) return _arrayLikeToArray(arr); }
function _arrayLikeToArray(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) arr2[i] = arr[i]; return arr2; }
function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }
function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, _toPropertyKey(descriptor.key), descriptor); } }
function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); Object.defineProperty(Constructor, "prototype", { writable: false }); return Constructor; }
function _typeof(obj) { "@babel/helpers - typeof"; return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (obj) { return typeof obj; } : function (obj) { return obj && "function" == typeof Symbol && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }, _typeof(obj); }
function _defineProperty(obj, key, value) { key = _toPropertyKey(key); if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }
function _toPropertyKey(arg) { var key = _toPrimitive(arg, "string"); return _typeof(key) === "symbol" ? key : String(key); }
function _toPrimitive(input, hint) { if (_typeof(input) !== "object" || input === null) return input; var prim = input[Symbol.toPrimitive]; if (prim !== undefined) { var res = prim.call(input, hint || "default"); if (_typeof(res) !== "object") return res; throw new TypeError("@@toPrimitive must return a primitive value."); } return (hint === "string" ? String : Number)(input); } /**
                                                                                                                                                                                                                                                                                                                                                                                               * Provides classes for encoding & decoding data using the Blockchain
                                                                                                                                                                                                                                                                                                                                                                                               * Commons UR (BC-UR) format.
                                                                                                                                                                                                                                                                                                                                                                                               *
                                                                                                                                                                                                                                                                                                                                                                                               * The following API classes are implemented:
                                                                                                                                                                                                                                                                                                                                                                                               *
                                                                                                                                                                                                                                                                                                                                                                                               * * BCUREncoder
                                                                                                                                                                                                                                                                                                                                                                                               * * BCURDecoder
                                                                                                                                                                                                                                                                                                                                                                                               */
/**
 * Encoder class for BC UR data.
 *
 * Encodes a hex string as a sequence of UR parts.  Each UR is a string.
 *
 * Designed for use by a calling application which will typically take
 * the resulting strings and display them as a sequence of animated QR
 * codes.
 *
 * @example
 * import {BCUREncoder} from "unchained-wallets";
 * const hexString = "deadbeef";
 * const encoder = BCUREncoder(hexString);
 * console.log(encoder.parts())
 * // [ "ur:...", "ur:...", ... ]
 *
 *
 */
var BCUREncoder = /*#__PURE__*/function () {
  /**
   * Create a new encoder.
   */
  function BCUREncoder(hexString) {
    var fragmentCapacity = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 200;
    _classCallCheck(this, BCUREncoder);
    _defineProperty(this, "hexString", void 0);
    _defineProperty(this, "fragmentCapacity", void 0);
    this.hexString = hexString;
    this.fragmentCapacity = fragmentCapacity;
  }

  /**
   * Return all UR parts.
   */
  _createClass(BCUREncoder, [{
    key: "parts",
    value: function parts() {
      return (0, _bcur.encodeUR)(this.hexString, this.fragmentCapacity);
    }
  }]);
  return BCUREncoder;
}();
/**
 * Decoder class for BC UR data.
 *
 * Decodes a hex string from a collection of UR parts.
 *
 * Designed for use by a calling application which is typically
 * in a loop parsing an animated sequence of QR codes.
 *
 * @example
 * import {BCURDecoder} from "unchained-wallets";
 * const decoder = new BCURDecoder();
 *
 * // Read data until the decoder is complete...
 * while (!decoder.isComplete()) {
 *
 *   // Progress can be fed back to the calling application for visualization in its UI
 *   console.log(decoder.progress());  // {totalParts: 10, partsReceived; 3}
 *
 *   // Application-defined function to obtain a single UR part string.
 *   const part = scanQRCode();
 *   decoder.receivePart(part);
 * }
 *
 * // Check for an error
 * if (decoder.isSuccess()) {
 *
 *   // Data can be passed back to the calling application
 *   console.log(decoder.data()); // "deadbeef"
 *
 * } else {
 *
 *   // Errors can be passed back to the calling application
 *   console.log(decoder.errorMessage());
 * }
 *
 *
 */
exports.BCUREncoder = BCUREncoder;
var BCURDecoder = /*#__PURE__*/function () {
  // TODO: type these

  function BCURDecoder() {
    _classCallCheck(this, BCURDecoder);
    _defineProperty(this, "error", void 0);
    _defineProperty(this, "summary", void 0);
    this.summary = {
      success: false,
      current: 0,
      length: 0,
      workloads: [],
      result: ""
    };
    this.error = null;
  }

  /**
   * Reset this decoder.
   *
   * Clears any error message and received parts and returns counts to zero.
   */
  _createClass(BCURDecoder, [{
    key: "reset",
    value: function reset() {
      this.summary = {
        success: false,
        current: 0,
        length: 0,
        workloads: [],
        result: ""
      };
      this.error = null;
    }

    /**
     * Receive a new UR part.
     *
     * It's OK to call this method multiple times for the same UR part.
     */
  }, {
    key: "receivePart",
    value: function receivePart(part) {
      try {
        var workloads = this.summary.workloads.includes(part) ? this.summary.workloads : [].concat(_toConsumableArray(this.summary.workloads), [part]);
        this.summary = (0, _bcur.smartDecodeUR)(workloads);
      } catch (e) {
        this.error = e;
      }
    }

    /**
     * Returns the current progress of this decoder.
     *
     * @example
     * import {BCURDecoder} from "unchained-wallets";
     * const decoder = BCURDecoder();
     * console.log(decoder.progress())
     * // { totalParts: 0, partsReceived: 0 }
     *
     * decoder.receivePart(part);
     * ...
     * decoder.receivePart(part);
     * ...
     * decoder.receivePart(part);
     * ...
     * console.log(decoder.progress())
     * // { totalParts: 10, partsReceived: 3 }
     *
     */
  }, {
    key: "progress",
    value: function progress() {
      var totalParts = this.summary.length;
      var partsReceived = this.summary.current;
      return {
        totalParts: totalParts,
        partsReceived: partsReceived
      };
    }

    /**
     * Is this decoder complete?
     *
     * Will return `true` if there was an error.
     */
  }, {
    key: "isComplete",
    value: function isComplete() {
      return this.summary.success || Boolean(this.error);
    }

    /**
     * Was this decoder successful?
     *
     * Will return `false` if completed because of an error.
     */
  }, {
    key: "isSuccess",
    value: function isSuccess() {
      return this.summary.success;
    }

    /**
     * Returns the decoded data as a hex string.
     */
  }, {
    key: "data",
    value: function data() {
      if (this.isSuccess()) {
        return this.summary.result;
      } else {
        return null;
      }
    }

    /**
     * Returns the error message.
     */
  }, {
    key: "errorMessage",
    value: function errorMessage() {
      if (this.error) {
        return this.error.message;
      } else {
        return null;
      }
    }
  }]);
  return BCURDecoder;
}();
exports.BCURDecoder = BCURDecoder;