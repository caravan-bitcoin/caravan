"use strict";

function _typeof(obj) { "@babel/helpers - typeof"; return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (obj) { return typeof obj; } : function (obj) { return obj && "function" == typeof Symbol && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }, _typeof(obj); }
require("core-js/modules/es7.symbol.async-iterator");
require("core-js/modules/es6.symbol");
require("core-js/modules/es6.object.define-property");
require("core-js/modules/web.dom.iterable");
require("core-js/modules/es6.array.iterator");
require("core-js/modules/es6.object.to-string");
require("core-js/modules/es6.string.iterator");
require("core-js/modules/es6.weak-map");
var _bcur = require("./bcur");
var vendorEncodeUR = _interopRequireWildcard(require("./vendor/bcur/encodeUR"));
var vendorDecodeUR = _interopRequireWildcard(require("./vendor/bcur/decodeUR"));
function _getRequireWildcardCache(nodeInterop) { if (typeof WeakMap !== "function") return null; var cacheBabelInterop = new WeakMap(); var cacheNodeInterop = new WeakMap(); return (_getRequireWildcardCache = function _getRequireWildcardCache(nodeInterop) { return nodeInterop ? cacheNodeInterop : cacheBabelInterop; })(nodeInterop); }
function _interopRequireWildcard(obj, nodeInterop) { if (!nodeInterop && obj && obj.__esModule) { return obj; } if (obj === null || _typeof(obj) !== "object" && typeof obj !== "function") { return { "default": obj }; } var cache = _getRequireWildcardCache(nodeInterop); if (cache && cache.has(obj)) { return cache.get(obj); } var newObj = {}; var hasPropertyDescriptor = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var key in obj) { if (key !== "default" && Object.prototype.hasOwnProperty.call(obj, key)) { var desc = hasPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : null; if (desc && (desc.get || desc.set)) { Object.defineProperty(newObj, key, desc); } else { newObj[key] = obj[key]; } } } newObj["default"] = obj; if (cache) { cache.set(obj, newObj); } return newObj; }
describe("BCUREncoder", function () {
  describe("parts", function () {
    afterEach(function () {
      jest.clearAllMocks();
    });
    it("it returns encoded UR parts", function () {
      var parts = ["a", "b"];
      var encodeMock = jest.spyOn(vendorEncodeUR, "encodeUR").mockReturnValue(parts);
      var encoder = new _bcur.BCUREncoder("deadbeef", 250);
      expect(encoder.parts()).toEqual(parts);
      expect(encodeMock).toHaveBeenCalledWith("deadbeef", 250);
    });
  });
});
describe("BCURDecoder", function () {
  var decodeMock, decoder;
  beforeEach(function () {
    decoder = new _bcur.BCURDecoder();
  });
  describe("reset", function () {
    it("resets the summary when in a success state", function () {
      decoder.summary.success = true;
      decoder.summary.current = 5;
      decoder.summary.length = 5;
      decoder.summary.workloads = ["a", "b", "c", "d", "e"];
      decoder.summary.result = "deadbeef";
      decoder.reset();
      expect(decoder.summary.success).toEqual(false);
      expect(decoder.summary.current).toEqual(0);
      expect(decoder.summary.length).toEqual(0);
      expect(decoder.summary.workloads).toEqual([]);
      expect(decoder.summary.result).toEqual("");
      expect(decoder.error).toBeNull();
    });
    it("resets the summary when in an error state", function () {
      decoder.error = {
        message: "some message"
      };
      decoder.reset();
      expect(decoder.summary.success).toEqual(false);
      expect(decoder.summary.current).toEqual(0);
      expect(decoder.summary.length).toEqual(0);
      expect(decoder.summary.workloads).toEqual([]);
      expect(decoder.summary.result).toEqual("");
      expect(decoder.error).toBeNull();
    });
  });
  describe("receivePart", function () {
    beforeEach(function () {
      decodeMock = jest.spyOn(vendorDecodeUR, "smartDecodeUR");
    });
    afterEach(function () {
      jest.resetAllMocks();
    });
    it("delegates to smartDecodeUR", function () {
      decoder.summary.workloads = ["a", "b"];
      var part = "c";
      var summary = "summary";
      decodeMock.mockReturnValue(summary);
      decoder.receivePart(part);
      expect(decodeMock).toHaveBeenCalledWith(["a", "b", "c"]);
      expect(decoder.summary).toEqual(summary);
    });
    it("handles errors when decoding", function () {
      decoder.summary.workloads = ["a", "b"];
      var part = "c";
      var error = new Error("some message");
      decodeMock.mockImplementation(function () {
        throw error;
      });
      decoder.receivePart(part);
      expect(decodeMock).toHaveBeenCalledWith(["a", "b", "c"]);
      expect(decoder.error).toEqual(error);
      expect(decoder.isComplete()).toEqual(true);
      expect(decoder.isSuccess()).toEqual(false);
      expect(decoder.errorMessage()).toEqual("some message");
    });
  });
  describe("progress", function () {
    it("returns the current progress", function () {
      decoder.summary.length = 5;
      decoder.summary.current = 3;
      expect(decoder.progress()).toEqual({
        totalParts: 5,
        partsReceived: 3
      });
    });
  });
  describe("isComplete", function () {
    it("is false if the  summary is not successful and there is no error", function () {
      expect(decoder.isComplete()).toEqual(false);
    });
    it("is true if the summary is successful", function () {
      decoder.summary.success = true;
      expect(decoder.isComplete()).toEqual(true);
    });
    it("is true if there is an error", function () {
      decoder.error = {
        message: "some message"
      };
      expect(decoder.isComplete()).toEqual(true);
    });
  });
  describe("isSuccess", function () {
    it("is false if the  summary is not successful", function () {
      expect(decoder.isSuccess()).toEqual(false);
    });
    it("is true if the  summary is successful", function () {
      decoder.summary.success = true;
      expect(decoder.isSuccess()).toEqual(true);
    });
  });
  describe("data", function () {
    it("returns null if not successful", function () {
      expect(decoder.data()).toBeNull();
    });
    it("returns the summary result if successful", function () {
      decoder.summary.success = true;
      decoder.summary.result = "deadbeef";
      expect(decoder.data()).toEqual("deadbeef");
    });
  });
  describe("errorMessage", function () {
    it("returns null if no error", function () {
      expect(decoder.errorMessage()).toBeNull();
    });
    it("returns the error message if there is an error", function () {
      decoder.error = {
        message: "some message"
      };
      expect(decoder.errorMessage()).toEqual("some message");
    });
  });
});