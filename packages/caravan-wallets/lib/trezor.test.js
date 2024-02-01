"use strict";

function _typeof(obj) { "@babel/helpers - typeof"; return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (obj) { return typeof obj; } : function (obj) { return obj && "function" == typeof Symbol && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }, _typeof(obj); }
require("core-js/modules/es6.object.define-properties");
require("core-js/modules/es7.object.get-own-property-descriptors");
require("core-js/modules/es6.array.filter");
require("core-js/modules/web.dom.iterable");
require("core-js/modules/es6.array.iterator");
require("core-js/modules/es6.object.keys");
require("core-js/modules/es6.number.constructor");
require("core-js/modules/es6.string.iterator");
require("core-js/modules/es6.array.from");
require("core-js/modules/es6.regexp.to-string");
require("core-js/modules/es6.date.to-string");
require("core-js/modules/es6.array.is-array");
require("core-js/modules/es6.object.set-prototype-of");
require("core-js/modules/es6.function.name");
require("core-js/modules/es6.object.create");
require("core-js/modules/es7.symbol.async-iterator");
require("core-js/modules/es6.symbol");
require("core-js/modules/es6.object.define-property");
require("core-js/modules/es6.promise");
require("core-js/modules/es6.object.to-string");
require("core-js/modules/es6.reflect.delete-property");
require("core-js/modules/es6.array.for-each");
require("regenerator-runtime/runtime");
var _unchainedBitcoin = require("unchained-bitcoin");
var _interaction = require("./interaction");
var _trezor = require("./trezor");
var _bitcoinjsLib = require("bitcoinjs-lib");
var _connectWeb = _interopRequireDefault(require("@trezor/connect-web"));
function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }
function ownKeys(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); enumerableOnly && (symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; })), keys.push.apply(keys, symbols); } return keys; }
function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = null != arguments[i] ? arguments[i] : {}; i % 2 ? ownKeys(Object(source), !0).forEach(function (key) { _defineProperty(target, key, source[key]); }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)) : ownKeys(Object(source)).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } return target; }
function _defineProperty(obj, key, value) { key = _toPropertyKey(key); if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }
function _toPropertyKey(arg) { var key = _toPrimitive(arg, "string"); return _typeof(key) === "symbol" ? key : String(key); }
function _toPrimitive(input, hint) { if (_typeof(input) !== "object" || input === null) return input; var prim = input[Symbol.toPrimitive]; if (prim !== undefined) { var res = prim.call(input, hint || "default"); if (_typeof(res) !== "object") return res; throw new TypeError("@@toPrimitive must return a primitive value."); } return (hint === "string" ? String : Number)(input); }
function _slicedToArray(arr, i) { return _arrayWithHoles(arr) || _iterableToArrayLimit(arr, i) || _unsupportedIterableToArray(arr, i) || _nonIterableRest(); }
function _nonIterableRest() { throw new TypeError("Invalid attempt to destructure non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }
function _unsupportedIterableToArray(o, minLen) { if (!o) return; if (typeof o === "string") return _arrayLikeToArray(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return Array.from(o); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen); }
function _arrayLikeToArray(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) arr2[i] = arr[i]; return arr2; }
function _iterableToArrayLimit(arr, i) { var _i = null == arr ? null : "undefined" != typeof Symbol && arr[Symbol.iterator] || arr["@@iterator"]; if (null != _i) { var _s, _e, _x, _r, _arr = [], _n = !0, _d = !1; try { if (_x = (_i = _i.call(arr)).next, 0 === i) { if (Object(_i) !== _i) return; _n = !1; } else for (; !(_n = (_s = _x.call(_i)).done) && (_arr.push(_s.value), _arr.length !== i); _n = !0); } catch (err) { _d = !0, _e = err; } finally { try { if (!_n && null != _i["return"] && (_r = _i["return"](), Object(_r) !== _r)) return; } finally { if (_d) throw _e; } } return _arr; } }
function _arrayWithHoles(arr) { if (Array.isArray(arr)) return arr; }
function _regeneratorRuntime() { "use strict"; /*! regenerator-runtime -- Copyright (c) 2014-present, Facebook, Inc. -- license (MIT): https://github.com/facebook/regenerator/blob/main/LICENSE */ _regeneratorRuntime = function _regeneratorRuntime() { return exports; }; var exports = {}, Op = Object.prototype, hasOwn = Op.hasOwnProperty, defineProperty = Object.defineProperty || function (obj, key, desc) { obj[key] = desc.value; }, $Symbol = "function" == typeof Symbol ? Symbol : {}, iteratorSymbol = $Symbol.iterator || "@@iterator", asyncIteratorSymbol = $Symbol.asyncIterator || "@@asyncIterator", toStringTagSymbol = $Symbol.toStringTag || "@@toStringTag"; function define(obj, key, value) { return Object.defineProperty(obj, key, { value: value, enumerable: !0, configurable: !0, writable: !0 }), obj[key]; } try { define({}, ""); } catch (err) { define = function define(obj, key, value) { return obj[key] = value; }; } function wrap(innerFn, outerFn, self, tryLocsList) { var protoGenerator = outerFn && outerFn.prototype instanceof Generator ? outerFn : Generator, generator = Object.create(protoGenerator.prototype), context = new Context(tryLocsList || []); return defineProperty(generator, "_invoke", { value: makeInvokeMethod(innerFn, self, context) }), generator; } function tryCatch(fn, obj, arg) { try { return { type: "normal", arg: fn.call(obj, arg) }; } catch (err) { return { type: "throw", arg: err }; } } exports.wrap = wrap; var ContinueSentinel = {}; function Generator() {} function GeneratorFunction() {} function GeneratorFunctionPrototype() {} var IteratorPrototype = {}; define(IteratorPrototype, iteratorSymbol, function () { return this; }); var getProto = Object.getPrototypeOf, NativeIteratorPrototype = getProto && getProto(getProto(values([]))); NativeIteratorPrototype && NativeIteratorPrototype !== Op && hasOwn.call(NativeIteratorPrototype, iteratorSymbol) && (IteratorPrototype = NativeIteratorPrototype); var Gp = GeneratorFunctionPrototype.prototype = Generator.prototype = Object.create(IteratorPrototype); function defineIteratorMethods(prototype) { ["next", "throw", "return"].forEach(function (method) { define(prototype, method, function (arg) { return this._invoke(method, arg); }); }); } function AsyncIterator(generator, PromiseImpl) { function invoke(method, arg, resolve, reject) { var record = tryCatch(generator[method], generator, arg); if ("throw" !== record.type) { var result = record.arg, value = result.value; return value && "object" == _typeof(value) && hasOwn.call(value, "__await") ? PromiseImpl.resolve(value.__await).then(function (value) { invoke("next", value, resolve, reject); }, function (err) { invoke("throw", err, resolve, reject); }) : PromiseImpl.resolve(value).then(function (unwrapped) { result.value = unwrapped, resolve(result); }, function (error) { return invoke("throw", error, resolve, reject); }); } reject(record.arg); } var previousPromise; defineProperty(this, "_invoke", { value: function value(method, arg) { function callInvokeWithMethodAndArg() { return new PromiseImpl(function (resolve, reject) { invoke(method, arg, resolve, reject); }); } return previousPromise = previousPromise ? previousPromise.then(callInvokeWithMethodAndArg, callInvokeWithMethodAndArg) : callInvokeWithMethodAndArg(); } }); } function makeInvokeMethod(innerFn, self, context) { var state = "suspendedStart"; return function (method, arg) { if ("executing" === state) throw new Error("Generator is already running"); if ("completed" === state) { if ("throw" === method) throw arg; return doneResult(); } for (context.method = method, context.arg = arg;;) { var delegate = context.delegate; if (delegate) { var delegateResult = maybeInvokeDelegate(delegate, context); if (delegateResult) { if (delegateResult === ContinueSentinel) continue; return delegateResult; } } if ("next" === context.method) context.sent = context._sent = context.arg;else if ("throw" === context.method) { if ("suspendedStart" === state) throw state = "completed", context.arg; context.dispatchException(context.arg); } else "return" === context.method && context.abrupt("return", context.arg); state = "executing"; var record = tryCatch(innerFn, self, context); if ("normal" === record.type) { if (state = context.done ? "completed" : "suspendedYield", record.arg === ContinueSentinel) continue; return { value: record.arg, done: context.done }; } "throw" === record.type && (state = "completed", context.method = "throw", context.arg = record.arg); } }; } function maybeInvokeDelegate(delegate, context) { var methodName = context.method, method = delegate.iterator[methodName]; if (undefined === method) return context.delegate = null, "throw" === methodName && delegate.iterator["return"] && (context.method = "return", context.arg = undefined, maybeInvokeDelegate(delegate, context), "throw" === context.method) || "return" !== methodName && (context.method = "throw", context.arg = new TypeError("The iterator does not provide a '" + methodName + "' method")), ContinueSentinel; var record = tryCatch(method, delegate.iterator, context.arg); if ("throw" === record.type) return context.method = "throw", context.arg = record.arg, context.delegate = null, ContinueSentinel; var info = record.arg; return info ? info.done ? (context[delegate.resultName] = info.value, context.next = delegate.nextLoc, "return" !== context.method && (context.method = "next", context.arg = undefined), context.delegate = null, ContinueSentinel) : info : (context.method = "throw", context.arg = new TypeError("iterator result is not an object"), context.delegate = null, ContinueSentinel); } function pushTryEntry(locs) { var entry = { tryLoc: locs[0] }; 1 in locs && (entry.catchLoc = locs[1]), 2 in locs && (entry.finallyLoc = locs[2], entry.afterLoc = locs[3]), this.tryEntries.push(entry); } function resetTryEntry(entry) { var record = entry.completion || {}; record.type = "normal", delete record.arg, entry.completion = record; } function Context(tryLocsList) { this.tryEntries = [{ tryLoc: "root" }], tryLocsList.forEach(pushTryEntry, this), this.reset(!0); } function values(iterable) { if (iterable) { var iteratorMethod = iterable[iteratorSymbol]; if (iteratorMethod) return iteratorMethod.call(iterable); if ("function" == typeof iterable.next) return iterable; if (!isNaN(iterable.length)) { var i = -1, next = function next() { for (; ++i < iterable.length;) if (hasOwn.call(iterable, i)) return next.value = iterable[i], next.done = !1, next; return next.value = undefined, next.done = !0, next; }; return next.next = next; } } return { next: doneResult }; } function doneResult() { return { value: undefined, done: !0 }; } return GeneratorFunction.prototype = GeneratorFunctionPrototype, defineProperty(Gp, "constructor", { value: GeneratorFunctionPrototype, configurable: !0 }), defineProperty(GeneratorFunctionPrototype, "constructor", { value: GeneratorFunction, configurable: !0 }), GeneratorFunction.displayName = define(GeneratorFunctionPrototype, toStringTagSymbol, "GeneratorFunction"), exports.isGeneratorFunction = function (genFun) { var ctor = "function" == typeof genFun && genFun.constructor; return !!ctor && (ctor === GeneratorFunction || "GeneratorFunction" === (ctor.displayName || ctor.name)); }, exports.mark = function (genFun) { return Object.setPrototypeOf ? Object.setPrototypeOf(genFun, GeneratorFunctionPrototype) : (genFun.__proto__ = GeneratorFunctionPrototype, define(genFun, toStringTagSymbol, "GeneratorFunction")), genFun.prototype = Object.create(Gp), genFun; }, exports.awrap = function (arg) { return { __await: arg }; }, defineIteratorMethods(AsyncIterator.prototype), define(AsyncIterator.prototype, asyncIteratorSymbol, function () { return this; }), exports.AsyncIterator = AsyncIterator, exports.async = function (innerFn, outerFn, self, tryLocsList, PromiseImpl) { void 0 === PromiseImpl && (PromiseImpl = Promise); var iter = new AsyncIterator(wrap(innerFn, outerFn, self, tryLocsList), PromiseImpl); return exports.isGeneratorFunction(outerFn) ? iter : iter.next().then(function (result) { return result.done ? result.value : iter.next(); }); }, defineIteratorMethods(Gp), define(Gp, toStringTagSymbol, "Generator"), define(Gp, iteratorSymbol, function () { return this; }), define(Gp, "toString", function () { return "[object Generator]"; }), exports.keys = function (val) { var object = Object(val), keys = []; for (var key in object) keys.push(key); return keys.reverse(), function next() { for (; keys.length;) { var key = keys.pop(); if (key in object) return next.value = key, next.done = !1, next; } return next.done = !0, next; }; }, exports.values = values, Context.prototype = { constructor: Context, reset: function reset(skipTempReset) { if (this.prev = 0, this.next = 0, this.sent = this._sent = undefined, this.done = !1, this.delegate = null, this.method = "next", this.arg = undefined, this.tryEntries.forEach(resetTryEntry), !skipTempReset) for (var name in this) "t" === name.charAt(0) && hasOwn.call(this, name) && !isNaN(+name.slice(1)) && (this[name] = undefined); }, stop: function stop() { this.done = !0; var rootRecord = this.tryEntries[0].completion; if ("throw" === rootRecord.type) throw rootRecord.arg; return this.rval; }, dispatchException: function dispatchException(exception) { if (this.done) throw exception; var context = this; function handle(loc, caught) { return record.type = "throw", record.arg = exception, context.next = loc, caught && (context.method = "next", context.arg = undefined), !!caught; } for (var i = this.tryEntries.length - 1; i >= 0; --i) { var entry = this.tryEntries[i], record = entry.completion; if ("root" === entry.tryLoc) return handle("end"); if (entry.tryLoc <= this.prev) { var hasCatch = hasOwn.call(entry, "catchLoc"), hasFinally = hasOwn.call(entry, "finallyLoc"); if (hasCatch && hasFinally) { if (this.prev < entry.catchLoc) return handle(entry.catchLoc, !0); if (this.prev < entry.finallyLoc) return handle(entry.finallyLoc); } else if (hasCatch) { if (this.prev < entry.catchLoc) return handle(entry.catchLoc, !0); } else { if (!hasFinally) throw new Error("try statement without catch or finally"); if (this.prev < entry.finallyLoc) return handle(entry.finallyLoc); } } } }, abrupt: function abrupt(type, arg) { for (var i = this.tryEntries.length - 1; i >= 0; --i) { var entry = this.tryEntries[i]; if (entry.tryLoc <= this.prev && hasOwn.call(entry, "finallyLoc") && this.prev < entry.finallyLoc) { var finallyEntry = entry; break; } } finallyEntry && ("break" === type || "continue" === type) && finallyEntry.tryLoc <= arg && arg <= finallyEntry.finallyLoc && (finallyEntry = null); var record = finallyEntry ? finallyEntry.completion : {}; return record.type = type, record.arg = arg, finallyEntry ? (this.method = "next", this.next = finallyEntry.finallyLoc, ContinueSentinel) : this.complete(record); }, complete: function complete(record, afterLoc) { if ("throw" === record.type) throw record.arg; return "break" === record.type || "continue" === record.type ? this.next = record.arg : "return" === record.type ? (this.rval = this.arg = record.arg, this.method = "return", this.next = "end") : "normal" === record.type && afterLoc && (this.next = afterLoc), ContinueSentinel; }, finish: function finish(finallyLoc) { for (var i = this.tryEntries.length - 1; i >= 0; --i) { var entry = this.tryEntries[i]; if (entry.finallyLoc === finallyLoc) return this.complete(entry.completion, entry.afterLoc), resetTryEntry(entry), ContinueSentinel; } }, "catch": function _catch(tryLoc) { for (var i = this.tryEntries.length - 1; i >= 0; --i) { var entry = this.tryEntries[i]; if (entry.tryLoc === tryLoc) { var record = entry.completion; if ("throw" === record.type) { var thrown = record.arg; resetTryEntry(entry); } return thrown; } } throw new Error("illegal catch attempt"); }, delegateYield: function delegateYield(iterable, resultName, nextLoc) { return this.delegate = { iterator: values(iterable), resultName: resultName, nextLoc: nextLoc }, "next" === this.method && (this.arg = undefined), ContinueSentinel; } }, exports; }
function asyncGeneratorStep(gen, resolve, reject, _next, _throw, key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { Promise.resolve(value).then(_next, _throw); } }
function _asyncToGenerator(fn) { return function () { var self = this, args = arguments; return new Promise(function (resolve, reject) { var gen = fn.apply(self, args); function _next(value) { asyncGeneratorStep(gen, resolve, reject, _next, _throw, "next", value); } function _throw(err) { asyncGeneratorStep(gen, resolve, reject, _next, _throw, "throw", err); } _next(undefined); }); }; } /**
                                                                                                                                                                                                                                                                                                                                                                                                       * @jest-environment jsdom
                                                                                                                                                                                                                                                                                                                                                                                                       */
function itHasStandardMessages(interactionBuilder) {
  it("has a message about ensuring your device is plugged in", function () {
    expect(interactionBuilder().hasMessagesFor({
      state: _interaction.PENDING,
      level: _interaction.INFO,
      code: "device.connect",
      text: "plugged in"
    })).toBe(true);
  });
  it("has a message about the TrezorConnect popup and enabling popups", function () {
    expect(interactionBuilder().hasMessagesFor({
      state: _interaction.ACTIVE,
      level: _interaction.INFO,
      code: "trezor.connect.generic",
      text: "enabled popups"
    })).toBe(true);
  });
}
function itThrowsAnErrorOnAnUnsuccessfulRequest(interactionBuilder) {
  it("throws an error on an unsuccessful request", /*#__PURE__*/_asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee() {
    var interaction;
    return _regeneratorRuntime().wrap(function _callee$(_context) {
      while (1) switch (_context.prev = _context.next) {
        case 0:
          interaction = interactionBuilder();
          interaction.connectParams = function () {
            return [function () {
              return {
                success: false,
                payload: {
                  error: "foobar"
                }
              };
            }, {}];
          };
          _context.prev = 2;
          _context.next = 5;
          return interaction.run();
        case 5:
          _context.next = 10;
          break;
        case 7:
          _context.prev = 7;
          _context.t0 = _context["catch"](2);
          expect(_context.t0.message).toMatch(/foobar/i);
        case 10:
        case "end":
          return _context.stop();
      }
    }, _callee, null, [[2, 7]]);
  })));
}
describe("trezor", function () {
  describe("TrezorInteraction", function () {
    function interactionBuilder() {
      return new _trezor.TrezorInteraction({
        network: _unchainedBitcoin.Network.MAINNET
      });
    }
    itHasStandardMessages(interactionBuilder);
    itThrowsAnErrorOnAnUnsuccessfulRequest(interactionBuilder);
    it("sets the default method to throw an error", /*#__PURE__*/_asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee2() {
      return _regeneratorRuntime().wrap(function _callee2$(_context2) {
        while (1) switch (_context2.prev = _context2.next) {
          case 0:
            _context2.prev = 0;
            _context2.next = 3;
            return interactionBuilder().run();
          case 3:
            _context2.next = 8;
            break;
          case 5:
            _context2.prev = 5;
            _context2.t0 = _context2["catch"](0);
            expect(_context2.t0.message).toMatch(/subclass of TrezorInteraction/i);
          case 8:
          case "end":
            return _context2.stop();
        }
      }, _callee2, null, [[0, 5]]);
    })));
  });
  describe("TrezorGetMetadata", function () {
    function interactionBuilder() {
      return new _trezor.TrezorGetMetadata();
    }
    itHasStandardMessages(interactionBuilder);
    itThrowsAnErrorOnAnUnsuccessfulRequest(interactionBuilder);
    it("parses metadata", function () {
      expect(interactionBuilder().parsePayload({
        bootloader_hash: "5112...846e9",
        bootloader_mode: null,
        device_id: "BDF9...F198",
        firmware_present: null,
        flags: 0,
        fw_major: null,
        fw_minor: null,
        fw_patch: null,
        fw_vendor: null,
        fw_vendor_keys: null,
        imported: false,
        initialized: true,
        label: "My Trezor",
        language: null,
        major_version: 1,
        minor_version: 6,
        model: "1",
        needs_backup: false,
        no_backup: null,
        passphrase_cached: false,
        passphrase_protection: false,
        patch_version: 3,
        pin_cached: true,
        pin_protection: true,
        revision: "ef8...862d7",
        unfinished_backup: null,
        vendor: "bitcointrezor.com"
      })).toEqual({
        spec: "Model 1 v.1.6.3 w/PIN",
        model: "Model 1",
        version: {
          major: 1,
          minor: 6,
          patch: 3,
          string: "1.6.3"
        },
        label: "My Trezor",
        pin: true,
        passphrase: false
      });
    });
    it("uses TrezorConnect.getFeatures", function () {
      var interaction = interactionBuilder();
      var _interaction$connectP = interaction.connectParams(),
        _interaction$connectP2 = _slicedToArray(_interaction$connectP, 2),
        method = _interaction$connectP2[0],
        params = _interaction$connectP2[1];
      expect(method).toEqual(_connectWeb["default"].getFeatures);
      expect(params).toEqual({});
    });
  });
  describe("TrezorExportHDNode", function () {
    var bip32Path = "m/45'/0'/0'/0'";
    function interactionBuilder() {
      return new _trezor.TrezorExportHDNode({
        bip32Path: bip32Path,
        network: _unchainedBitcoin.Network.MAINNET
      });
    }
    itHasStandardMessages(interactionBuilder);
    itThrowsAnErrorOnAnUnsuccessfulRequest(interactionBuilder);
    it("constructor adds error message on invalid bip32path", function () {
      var interaction = new _trezor.TrezorExportHDNode({
        bip32Path: "m/foo",
        network: _unchainedBitcoin.Network.MAINNET
      });
      expect(interaction.hasMessagesFor({
        state: _interaction.PENDING,
        level: _interaction.ERROR,
        code: "trezor.bip32_path.path_error"
      })).toBe(true);
    });
    it("adds error message on bip32path <depth3", function () {
      var interaction = new _trezor.TrezorExportHDNode({
        bip32Path: "m/45",
        network: _unchainedBitcoin.Network.MAINNET
      });
      expect(interaction.hasMessagesFor({
        state: _interaction.PENDING,
        level: _interaction.ERROR,
        code: "trezor.bip32_path.minimum"
      })).toBe(true);
    });
    it("uses TrezorConnect.getPublicKey", function () {
      var interaction = interactionBuilder();
      var _interaction$connectP3 = interaction.connectParams(),
        _interaction$connectP4 = _slicedToArray(_interaction$connectP3, 2),
        method = _interaction$connectP4[0],
        params = _interaction$connectP4[1];
      expect(method).toEqual(_connectWeb["default"].getPublicKey);
      expect(params.path).toEqual(bip32Path);
      expect(params.coin).toEqual((0, _trezor.trezorCoin)(_unchainedBitcoin.Network.MAINNET));
      expect(params.crossChain).toBe(true);
    });
  });
  describe("TrezorExportPublicKey", function () {
    var bip32Path = "m/45'/0'/0'/0'";
    function interactionBuilder() {
      return new _trezor.TrezorExportPublicKey({
        bip32Path: bip32Path,
        network: _unchainedBitcoin.Network.MAINNET
      });
    }
    itHasStandardMessages(interactionBuilder);
    itThrowsAnErrorOnAnUnsuccessfulRequest(interactionBuilder);
    it("parses out the public key from the response payload", function () {
      expect(interactionBuilder().parsePayload({
        publicKey: "foobar"
      })).toEqual("foobar");
    });
    it("uses TrezorConnect.getPublicKey", function () {
      var interaction = interactionBuilder();
      var _interaction$connectP5 = interaction.connectParams(),
        _interaction$connectP6 = _slicedToArray(_interaction$connectP5, 2),
        method = _interaction$connectP6[0],
        params = _interaction$connectP6[1];
      expect(method).toEqual(_connectWeb["default"].getPublicKey);
      expect(params.path).toEqual(bip32Path);
      expect(params.coin).toEqual((0, _trezor.trezorCoin)(_unchainedBitcoin.Network.MAINNET));
      expect(params.crossChain).toBe(true);
    });
  });
  describe("TrezorExportExtendedPublicKey", function () {
    var bip32Path = "m/45'/0'/0'/0'";
    function interactionBuilder() {
      return new _trezor.TrezorExportExtendedPublicKey({
        bip32Path: bip32Path,
        network: _unchainedBitcoin.Network.MAINNET
      });
    }
    itHasStandardMessages(interactionBuilder);
    itThrowsAnErrorOnAnUnsuccessfulRequest(interactionBuilder);
    it("parses out the extended public key from the response payload", function () {
      expect(interactionBuilder().parsePayload({
        xpub: "foobar"
      })).toEqual("foobar");
    });
    it("uses TrezorConnect.getPublicKey", function () {
      var interaction = interactionBuilder();
      var _interaction$connectP7 = interaction.connectParams(),
        _interaction$connectP8 = _slicedToArray(_interaction$connectP7, 2),
        method = _interaction$connectP8[0],
        params = _interaction$connectP8[1];
      expect(method).toEqual(_connectWeb["default"].getPublicKey);
      expect(params.path).toEqual(bip32Path);
      expect(params.coin).toEqual((0, _trezor.trezorCoin)(_unchainedBitcoin.Network.MAINNET));
      expect(params.crossChain).toBe(true);
    });
  });
  describe("TrezorSignMultisigTransaction", function () {
    _unchainedBitcoin.TEST_FIXTURES.transactions.forEach(function (fixture) {
      describe("signing for a transaction which ".concat(fixture.description), function () {
        function interactionBuilder() {
          return new _trezor.TrezorSignMultisigTransaction(fixture);
        }
        itHasStandardMessages(interactionBuilder);
        itThrowsAnErrorOnAnUnsuccessfulRequest(interactionBuilder);
        it("parses out the signatures from the response payload", function () {
          // Signature format:
          //   first byte signifies DER encoding           (0x30)
          //   second byte is length of signature in bytes (0x03)
          // The string length is however long the signature is minus these two starting bytes
          // plain signature without SIGHASH (foobar is 3 bytes, string length = 6, which is 3 bytes)
          expect(interactionBuilder().parsePayload({
            signatures: ["3003foobar"]
          })).toEqual(["3003foobar01"]);
          // signature actually ends in 0x01 (foob01 is 3 bytes, string length = 6, which is 3 bytes)
          expect(interactionBuilder().parsePayload({
            signatures: ["3003foob01"]
          })).toEqual(["3003foob0101"]);
          // signature with sighash already included (foobar is 3 bytes, string length = 8, which is 4 bytes) ...
          // we expect this to chop off the 01 and add it back
          expect(interactionBuilder().parsePayload({
            signatures: ["3003foobar01"]
          })).toEqual(["3003foobar01"]);
        });
        it("uses TrezorConnect.signTransaction", function () {
          var interaction = interactionBuilder();
          var _interaction$connectP9 = interaction.connectParams(),
            _interaction$connectP10 = _slicedToArray(_interaction$connectP9, 2),
            method = _interaction$connectP10[0],
            params = _interaction$connectP10[1];
          expect(method).toEqual(_connectWeb["default"].signTransaction);
          expect(params.coin).toEqual((0, _trezor.trezorCoin)(fixture.network));
          expect(params.inputs.length).toEqual(fixture.inputs.length);
          expect(params.outputs.length).toEqual(fixture.outputs.length);
          // FIXME check inputs & output details
        });
      });
    });

    function psbtInteractionBuilder(tx, keyDetails, returnSignatureArray) {
      return new _trezor.TrezorSignMultisigTransaction({
        network: tx.network,
        inputs: [],
        outputs: [],
        bip32Paths: [],
        psbt: tx.psbt,
        keyDetails: keyDetails,
        returnSignatureArray: returnSignatureArray
      });
    }
    it("uses TrezorConnect.signTransaction via PSBT for testnet P2SH tx", function () {
      var tx = _unchainedBitcoin.TEST_FIXTURES.transactions[0]; // TESTNET_P2SH
      var keyDetails = {
        xfp: _unchainedBitcoin.ROOT_FINGERPRINT,
        path: "m/45'/1'/100'"
      };
      var interaction = psbtInteractionBuilder(tx, keyDetails, false);
      var _interaction$connectP11 = interaction.connectParams(),
        _interaction$connectP12 = _slicedToArray(_interaction$connectP11, 2),
        method = _interaction$connectP12[0],
        params = _interaction$connectP12[1];
      expect(method).toEqual(_connectWeb["default"].signTransaction);
      expect(params.coin).toEqual((0, _trezor.trezorCoin)(tx.network));
      expect(params.inputs.length).toEqual(tx.inputs.length);
      expect(params.outputs.length).toEqual(tx.outputs.length);
      expect(interaction.parsePayload({
        signatures: tx.signature
      })).toContain(_unchainedBitcoin.PSBT_MAGIC_B64);
    });
    it("uses TrezorConnect.signTransaction via PSBT for mainnet P2SH tx", function () {
      var tx = _unchainedBitcoin.TEST_FIXTURES.transactions[3]; // MAINNET_P2SH
      var keyDetails = {
        xfp: _unchainedBitcoin.ROOT_FINGERPRINT,
        path: "m/45'/0'/100'"
      };
      var interaction = psbtInteractionBuilder(tx, keyDetails, true);
      var _interaction$connectP13 = interaction.connectParams(),
        _interaction$connectP14 = _slicedToArray(_interaction$connectP13, 2),
        method = _interaction$connectP14[0],
        params = _interaction$connectP14[1];
      expect(method).toEqual(_connectWeb["default"].signTransaction);
      expect(params.coin).toEqual((0, _trezor.trezorCoin)(tx.network));
      expect(params.inputs.length).toEqual(tx.inputs.length);
      expect(params.outputs.length).toEqual(tx.outputs.length);
      expect(interaction.parsePayload({
        signatures: ["3003foobar01"]
      })).toEqual(["3003foobar01"]);
    });
  });
  describe("TrezorConfirmMultisigAddress", function () {
    var TMP_FIXTURES = JSON.parse(JSON.stringify(_unchainedBitcoin.TEST_FIXTURES));
    TMP_FIXTURES.multisigs.forEach(function (fixture) {
      Reflect.deleteProperty(fixture, "publicKey");
      describe("displaying a ".concat(fixture.description), function () {
        function interactionBuilder() {
          return new _trezor.TrezorConfirmMultisigAddress(fixture);
        }
        itHasStandardMessages(interactionBuilder);
        itThrowsAnErrorOnAnUnsuccessfulRequest(interactionBuilder);
        it("uses TrezorConnect.getAddress without a public key", function () {
          var interaction = interactionBuilder();
          var _interaction$connectP15 = interaction.connectParams(),
            _interaction$connectP16 = _slicedToArray(_interaction$connectP15, 2),
            method = _interaction$connectP16[0],
            params = _interaction$connectP16[1];
          expect(method).toEqual(_connectWeb["default"].getAddress);
          expect(params.path).toEqual(fixture.bip32Path);
          expect(params.address).toEqual(fixture.address);
          expect(params.showOnTrezor).toBe(true);
          expect(params.coin).toEqual((0, _trezor.trezorCoin)(fixture.network));
          expect(params.crossChain).toBe(true);
          // FIXME check multisig details
        });
      });
    });

    _unchainedBitcoin.TEST_FIXTURES.multisigs.forEach(function (fixture) {
      describe("displaying a ".concat(fixture.description), function () {
        function interactionBuilder() {
          return new _trezor.TrezorConfirmMultisigAddress(fixture);
        }
        itHasStandardMessages(interactionBuilder);
        itThrowsAnErrorOnAnUnsuccessfulRequest(interactionBuilder);
        it("uses TrezorConnect.getAddress with a public key", function () {
          var interaction = interactionBuilder();
          var _interaction$connectP17 = interaction.connectParams(),
            _interaction$connectP18 = _slicedToArray(_interaction$connectP17, 2),
            method = _interaction$connectP18[0],
            params = _interaction$connectP18[1];
          expect(method).toEqual(_connectWeb["default"].getAddress);
          expect(params.bundle[0].path).toEqual(fixture.bip32Path);
          expect(params.bundle[0].showOnTrezor).toBe(false);
          expect(params.bundle[0].coin).toEqual((0, _trezor.trezorCoin)(fixture.network));
          expect(params.bundle[0].crossChain).toBe(true);
          expect(params.bundle[1].path).toEqual(fixture.bip32Path);
          expect(params.bundle[1].address).toEqual(fixture.address);
          expect(params.bundle[1].showOnTrezor).toBe(true);
          expect(params.bundle[1].coin).toEqual((0, _trezor.trezorCoin)(fixture.network));
          expect(params.bundle[1].crossChain).toBe(true);
          // FIXME check multisig details
        });
      });
    });

    describe("parsePayload", function () {
      _unchainedBitcoin.TEST_FIXTURES.multisigs.forEach(function (fixture) {
        it("passes through payload if payload address matches addresses for the public key", function () {
          function createAddress(publicKey, network) {
            var keyPair = _bitcoinjsLib.ECPair.fromPublicKey(Buffer.from(publicKey, "hex"));
            var _payments$p2pkh = _bitcoinjsLib.payments.p2pkh({
                pubkey: keyPair.publicKey,
                network: (0, _unchainedBitcoin.networkData)(network)
              }),
              address = _payments$p2pkh.address;
            return address;
          }
          var interaction = new _trezor.TrezorConfirmMultisigAddress(fixture);
          var address = createAddress(fixture.publicKey, fixture.network);
          var payload = [{
            address: address
          }, {
            address: address
          }];
          var result = interaction.parsePayload(payload);
          expect(result).toEqual(payload);
        });
        it("errors if payload has no matching address", function () {
          var interaction = new _trezor.TrezorConfirmMultisigAddress(fixture);
          var payload = [{
            address: "not matching"
          }, {
            address: "not matching"
          }];
          expect(function () {
            interaction.parsePayload(payload);
          }).toThrow("Wrong public key specified");
        });
      });
      it("passes through payload if there's no public key", function () {
        var fixture = _unchainedBitcoin.TEST_FIXTURES.multisigs[0];
        var fixtureCopy = _objectSpread({}, fixture);
        Reflect.deleteProperty(fixtureCopy, "publicKey");
        var interaction = new _trezor.TrezorConfirmMultisigAddress(fixtureCopy);
        var payload = [];
        var result = interaction.parsePayload(payload);
        expect(result).toEqual(payload);
      });
    });
  });
  describe("TrezorSignMessage", function () {
    var _bip32Path = "m/45'/0'/0'/0'";
    function interactionBuilder() {
      var bip32Path = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : "";
      var message = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : "";
      return new _trezor.TrezorSignMessage({
        network: _unchainedBitcoin.Network.MAINNET,
        bip32Path: bip32Path || _bip32Path,
        message: message || "hello world"
      });
    }
    itHasStandardMessages(interactionBuilder);
    itThrowsAnErrorOnAnUnsuccessfulRequest(interactionBuilder);
    it("constructor adds error message on invalid bip32path", function () {
      var interaction = new _trezor.TrezorSignMessage({
        bip32Path: "m/foo",
        network: _unchainedBitcoin.Network.MAINNET
      });
      expect(interaction.hasMessagesFor({
        state: _interaction.PENDING,
        level: _interaction.ERROR,
        code: "trezor.bip32_path.path_error"
      })).toBe(true);
    });
    it("uses TrezorConnect.signMessage", function () {
      var interaction = interactionBuilder();
      var _interaction$connectP19 = interaction.connectParams(),
        _interaction$connectP20 = _slicedToArray(_interaction$connectP19, 2),
        method = _interaction$connectP20[0],
        params = _interaction$connectP20[1];
      expect(method).toEqual(_connectWeb["default"].signMessage);
      expect(params.path).toEqual(_bip32Path);
    });
  });
});

//     describe("Test interactions.", () => {
//         describe("Test public key export interactions.", () => {

//             const interaction = new TrezorExportPublicKey({network: NETWORKS.TESTNET, bip32Path: "m/45'/1'/0'/1"});

//             it("should properly report messages for wallet state active", () => {
//                 //const actives =
//                 interaction.messagesFor({state:"active", excludeCodes: ["bip32"]});
//                 // console.log(actives); // TODO: what to test for
//             })

//             it("should properly report messages for wallet state pending", () => {
//                 //const pendings =
//                 interaction.messagesFor({state:"pending", excludeCodes: ["bip32"]});
//                 // console.log(pendings); // TODO: what to test for
//             })

//             it("should not report error for a valid state", () => {
//                 const hasError = interaction.hasMessagesFor({state:"active", level: 'error', code: "bip32"});
//                 expect(hasError).toBe(false);
//             })

//             const badInteraction = new TrezorExportPublicKey({network: NETWORKS.TESTNET, bip32Path: "m/45'/1"});
//             it("should not report error for not meeting the minimum path length for wallet state active", () => {
//                 const hasError = badInteraction.hasMessagesFor({state:"active", level: 'error', code: "trezor.bip32_path.minimum"});
//                 expect(hasError).toBe(false);
//             })

//             it("should properly report error for not meeting the minimum path length for wallet state pending", () => {
//                 const hasError = badInteraction.hasMessagesFor({state:"pending", level: 'error', code: "trezor.bip32_path.minimum"});
//                 expect(hasError).toBe(true);
//             })

//             const interactionTestPathMAINNET = new TrezorExportPublicKey({network: NETWORKS.MAINNET, bip32Path: "m/45'/1'/0'/1"});
//             it("should properly report warning for a testnet derivation path on mainnet for wallet state pending", () => {
//                 const hasWarning = interactionTestPathMAINNET.hasMessagesFor({state:"active", level: 'warning', code: "trezor.bip32_path.mismatch"});
//                 expect(hasWarning).toBe(true);
//             })

//             const interactionMainPathTESTNET = new TrezorExportPublicKey({network: NETWORKS.TESTNET, bip32Path: "m/45'/0'/0'/1"});
//             it("should properly report warning for a mainnet derivation path on testnet for wallet state pending", () => {
//                 const hasWarning = interactionMainPathTESTNET.hasMessagesFor({state:"active", level: 'warning', code: "trezor.bip32_path.mismatch"});
//                 expect(hasWarning).toBe(true);
//             })

//             const interactionTestPathTESTNET = new TrezorExportPublicKey({network: NETWORKS.TESTNET, bip32Path: "m/45'/1'/0'/1"});
//             it("should not report an error for correctly matching derivation path on testnet", () => {
//                 const hasError = interactionTestPathTESTNET.hasMessagesFor({state:"pending", level: 'error', code: "trezor.bip32_path.mismatch"});
//                 expect(hasError).toBe(false);
//             })

//             const interactionMainPathMAINNET = new TrezorExportPublicKey({network: NETWORKS.MAINNET, bip32Path: "m/45'/0'/0'/1"});
//             it("should not report an error for correctly matching derivation path on mainnet", () => {
//                 const hasError = interactionMainPathMAINNET.hasMessagesFor({state:"pending", level: 'error', code: "trezor.bip32_path.mismatch"});
//                 expect(hasError).toBe(false);
//             })

//         })
//     })