"use strict";

function _typeof(obj) { "@babel/helpers - typeof"; return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (obj) { return typeof obj; } : function (obj) { return obj && "function" == typeof Symbol && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }, _typeof(obj); }
require("core-js/modules/es6.object.set-prototype-of");
require("core-js/modules/es6.object.create");
require("core-js/modules/es6.object.define-properties");
require("core-js/modules/es7.object.get-own-property-descriptors");
require("core-js/modules/es6.array.filter");
require("core-js/modules/web.dom.iterable");
require("core-js/modules/es6.array.iterator");
require("core-js/modules/es6.object.keys");
require("core-js/modules/es6.object.define-property");
require("core-js/modules/es6.number.constructor");
require("core-js/modules/es6.string.iterator");
require("core-js/modules/es6.array.from");
require("core-js/modules/es6.function.name");
require("core-js/modules/es7.symbol.async-iterator");
require("core-js/modules/es6.symbol");
require("core-js/modules/es6.array.is-array");
require("core-js/modules/es6.regexp.to-string");
require("core-js/modules/es6.date.to-string");
require("regenerator-runtime/runtime");
require("core-js/modules/es6.promise");
require("core-js/modules/es6.object.to-string");
require("core-js/modules/es6.array.for-each");
var _unchainedBitcoin = require("unchained-bitcoin");
var _interaction = require("./interaction");
var _ledger = require("./ledger");
var _policy = require("./policy");
function _regeneratorRuntime() { "use strict"; /*! regenerator-runtime -- Copyright (c) 2014-present, Facebook, Inc. -- license (MIT): https://github.com/facebook/regenerator/blob/main/LICENSE */ _regeneratorRuntime = function _regeneratorRuntime() { return exports; }; var exports = {}, Op = Object.prototype, hasOwn = Op.hasOwnProperty, defineProperty = Object.defineProperty || function (obj, key, desc) { obj[key] = desc.value; }, $Symbol = "function" == typeof Symbol ? Symbol : {}, iteratorSymbol = $Symbol.iterator || "@@iterator", asyncIteratorSymbol = $Symbol.asyncIterator || "@@asyncIterator", toStringTagSymbol = $Symbol.toStringTag || "@@toStringTag"; function define(obj, key, value) { return Object.defineProperty(obj, key, { value: value, enumerable: !0, configurable: !0, writable: !0 }), obj[key]; } try { define({}, ""); } catch (err) { define = function define(obj, key, value) { return obj[key] = value; }; } function wrap(innerFn, outerFn, self, tryLocsList) { var protoGenerator = outerFn && outerFn.prototype instanceof Generator ? outerFn : Generator, generator = Object.create(protoGenerator.prototype), context = new Context(tryLocsList || []); return defineProperty(generator, "_invoke", { value: makeInvokeMethod(innerFn, self, context) }), generator; } function tryCatch(fn, obj, arg) { try { return { type: "normal", arg: fn.call(obj, arg) }; } catch (err) { return { type: "throw", arg: err }; } } exports.wrap = wrap; var ContinueSentinel = {}; function Generator() {} function GeneratorFunction() {} function GeneratorFunctionPrototype() {} var IteratorPrototype = {}; define(IteratorPrototype, iteratorSymbol, function () { return this; }); var getProto = Object.getPrototypeOf, NativeIteratorPrototype = getProto && getProto(getProto(values([]))); NativeIteratorPrototype && NativeIteratorPrototype !== Op && hasOwn.call(NativeIteratorPrototype, iteratorSymbol) && (IteratorPrototype = NativeIteratorPrototype); var Gp = GeneratorFunctionPrototype.prototype = Generator.prototype = Object.create(IteratorPrototype); function defineIteratorMethods(prototype) { ["next", "throw", "return"].forEach(function (method) { define(prototype, method, function (arg) { return this._invoke(method, arg); }); }); } function AsyncIterator(generator, PromiseImpl) { function invoke(method, arg, resolve, reject) { var record = tryCatch(generator[method], generator, arg); if ("throw" !== record.type) { var result = record.arg, value = result.value; return value && "object" == _typeof(value) && hasOwn.call(value, "__await") ? PromiseImpl.resolve(value.__await).then(function (value) { invoke("next", value, resolve, reject); }, function (err) { invoke("throw", err, resolve, reject); }) : PromiseImpl.resolve(value).then(function (unwrapped) { result.value = unwrapped, resolve(result); }, function (error) { return invoke("throw", error, resolve, reject); }); } reject(record.arg); } var previousPromise; defineProperty(this, "_invoke", { value: function value(method, arg) { function callInvokeWithMethodAndArg() { return new PromiseImpl(function (resolve, reject) { invoke(method, arg, resolve, reject); }); } return previousPromise = previousPromise ? previousPromise.then(callInvokeWithMethodAndArg, callInvokeWithMethodAndArg) : callInvokeWithMethodAndArg(); } }); } function makeInvokeMethod(innerFn, self, context) { var state = "suspendedStart"; return function (method, arg) { if ("executing" === state) throw new Error("Generator is already running"); if ("completed" === state) { if ("throw" === method) throw arg; return doneResult(); } for (context.method = method, context.arg = arg;;) { var delegate = context.delegate; if (delegate) { var delegateResult = maybeInvokeDelegate(delegate, context); if (delegateResult) { if (delegateResult === ContinueSentinel) continue; return delegateResult; } } if ("next" === context.method) context.sent = context._sent = context.arg;else if ("throw" === context.method) { if ("suspendedStart" === state) throw state = "completed", context.arg; context.dispatchException(context.arg); } else "return" === context.method && context.abrupt("return", context.arg); state = "executing"; var record = tryCatch(innerFn, self, context); if ("normal" === record.type) { if (state = context.done ? "completed" : "suspendedYield", record.arg === ContinueSentinel) continue; return { value: record.arg, done: context.done }; } "throw" === record.type && (state = "completed", context.method = "throw", context.arg = record.arg); } }; } function maybeInvokeDelegate(delegate, context) { var methodName = context.method, method = delegate.iterator[methodName]; if (undefined === method) return context.delegate = null, "throw" === methodName && delegate.iterator["return"] && (context.method = "return", context.arg = undefined, maybeInvokeDelegate(delegate, context), "throw" === context.method) || "return" !== methodName && (context.method = "throw", context.arg = new TypeError("The iterator does not provide a '" + methodName + "' method")), ContinueSentinel; var record = tryCatch(method, delegate.iterator, context.arg); if ("throw" === record.type) return context.method = "throw", context.arg = record.arg, context.delegate = null, ContinueSentinel; var info = record.arg; return info ? info.done ? (context[delegate.resultName] = info.value, context.next = delegate.nextLoc, "return" !== context.method && (context.method = "next", context.arg = undefined), context.delegate = null, ContinueSentinel) : info : (context.method = "throw", context.arg = new TypeError("iterator result is not an object"), context.delegate = null, ContinueSentinel); } function pushTryEntry(locs) { var entry = { tryLoc: locs[0] }; 1 in locs && (entry.catchLoc = locs[1]), 2 in locs && (entry.finallyLoc = locs[2], entry.afterLoc = locs[3]), this.tryEntries.push(entry); } function resetTryEntry(entry) { var record = entry.completion || {}; record.type = "normal", delete record.arg, entry.completion = record; } function Context(tryLocsList) { this.tryEntries = [{ tryLoc: "root" }], tryLocsList.forEach(pushTryEntry, this), this.reset(!0); } function values(iterable) { if (iterable) { var iteratorMethod = iterable[iteratorSymbol]; if (iteratorMethod) return iteratorMethod.call(iterable); if ("function" == typeof iterable.next) return iterable; if (!isNaN(iterable.length)) { var i = -1, next = function next() { for (; ++i < iterable.length;) if (hasOwn.call(iterable, i)) return next.value = iterable[i], next.done = !1, next; return next.value = undefined, next.done = !0, next; }; return next.next = next; } } return { next: doneResult }; } function doneResult() { return { value: undefined, done: !0 }; } return GeneratorFunction.prototype = GeneratorFunctionPrototype, defineProperty(Gp, "constructor", { value: GeneratorFunctionPrototype, configurable: !0 }), defineProperty(GeneratorFunctionPrototype, "constructor", { value: GeneratorFunction, configurable: !0 }), GeneratorFunction.displayName = define(GeneratorFunctionPrototype, toStringTagSymbol, "GeneratorFunction"), exports.isGeneratorFunction = function (genFun) { var ctor = "function" == typeof genFun && genFun.constructor; return !!ctor && (ctor === GeneratorFunction || "GeneratorFunction" === (ctor.displayName || ctor.name)); }, exports.mark = function (genFun) { return Object.setPrototypeOf ? Object.setPrototypeOf(genFun, GeneratorFunctionPrototype) : (genFun.__proto__ = GeneratorFunctionPrototype, define(genFun, toStringTagSymbol, "GeneratorFunction")), genFun.prototype = Object.create(Gp), genFun; }, exports.awrap = function (arg) { return { __await: arg }; }, defineIteratorMethods(AsyncIterator.prototype), define(AsyncIterator.prototype, asyncIteratorSymbol, function () { return this; }), exports.AsyncIterator = AsyncIterator, exports.async = function (innerFn, outerFn, self, tryLocsList, PromiseImpl) { void 0 === PromiseImpl && (PromiseImpl = Promise); var iter = new AsyncIterator(wrap(innerFn, outerFn, self, tryLocsList), PromiseImpl); return exports.isGeneratorFunction(outerFn) ? iter : iter.next().then(function (result) { return result.done ? result.value : iter.next(); }); }, defineIteratorMethods(Gp), define(Gp, toStringTagSymbol, "Generator"), define(Gp, iteratorSymbol, function () { return this; }), define(Gp, "toString", function () { return "[object Generator]"; }), exports.keys = function (val) { var object = Object(val), keys = []; for (var key in object) keys.push(key); return keys.reverse(), function next() { for (; keys.length;) { var key = keys.pop(); if (key in object) return next.value = key, next.done = !1, next; } return next.done = !0, next; }; }, exports.values = values, Context.prototype = { constructor: Context, reset: function reset(skipTempReset) { if (this.prev = 0, this.next = 0, this.sent = this._sent = undefined, this.done = !1, this.delegate = null, this.method = "next", this.arg = undefined, this.tryEntries.forEach(resetTryEntry), !skipTempReset) for (var name in this) "t" === name.charAt(0) && hasOwn.call(this, name) && !isNaN(+name.slice(1)) && (this[name] = undefined); }, stop: function stop() { this.done = !0; var rootRecord = this.tryEntries[0].completion; if ("throw" === rootRecord.type) throw rootRecord.arg; return this.rval; }, dispatchException: function dispatchException(exception) { if (this.done) throw exception; var context = this; function handle(loc, caught) { return record.type = "throw", record.arg = exception, context.next = loc, caught && (context.method = "next", context.arg = undefined), !!caught; } for (var i = this.tryEntries.length - 1; i >= 0; --i) { var entry = this.tryEntries[i], record = entry.completion; if ("root" === entry.tryLoc) return handle("end"); if (entry.tryLoc <= this.prev) { var hasCatch = hasOwn.call(entry, "catchLoc"), hasFinally = hasOwn.call(entry, "finallyLoc"); if (hasCatch && hasFinally) { if (this.prev < entry.catchLoc) return handle(entry.catchLoc, !0); if (this.prev < entry.finallyLoc) return handle(entry.finallyLoc); } else if (hasCatch) { if (this.prev < entry.catchLoc) return handle(entry.catchLoc, !0); } else { if (!hasFinally) throw new Error("try statement without catch or finally"); if (this.prev < entry.finallyLoc) return handle(entry.finallyLoc); } } } }, abrupt: function abrupt(type, arg) { for (var i = this.tryEntries.length - 1; i >= 0; --i) { var entry = this.tryEntries[i]; if (entry.tryLoc <= this.prev && hasOwn.call(entry, "finallyLoc") && this.prev < entry.finallyLoc) { var finallyEntry = entry; break; } } finallyEntry && ("break" === type || "continue" === type) && finallyEntry.tryLoc <= arg && arg <= finallyEntry.finallyLoc && (finallyEntry = null); var record = finallyEntry ? finallyEntry.completion : {}; return record.type = type, record.arg = arg, finallyEntry ? (this.method = "next", this.next = finallyEntry.finallyLoc, ContinueSentinel) : this.complete(record); }, complete: function complete(record, afterLoc) { if ("throw" === record.type) throw record.arg; return "break" === record.type || "continue" === record.type ? this.next = record.arg : "return" === record.type ? (this.rval = this.arg = record.arg, this.method = "return", this.next = "end") : "normal" === record.type && afterLoc && (this.next = afterLoc), ContinueSentinel; }, finish: function finish(finallyLoc) { for (var i = this.tryEntries.length - 1; i >= 0; --i) { var entry = this.tryEntries[i]; if (entry.finallyLoc === finallyLoc) return this.complete(entry.completion, entry.afterLoc), resetTryEntry(entry), ContinueSentinel; } }, "catch": function _catch(tryLoc) { for (var i = this.tryEntries.length - 1; i >= 0; --i) { var entry = this.tryEntries[i]; if (entry.tryLoc === tryLoc) { var record = entry.completion; if ("throw" === record.type) { var thrown = record.arg; resetTryEntry(entry); } return thrown; } } throw new Error("illegal catch attempt"); }, delegateYield: function delegateYield(iterable, resultName, nextLoc) { return this.delegate = { iterator: values(iterable), resultName: resultName, nextLoc: nextLoc }, "next" === this.method && (this.arg = undefined), ContinueSentinel; } }, exports; }
function asyncGeneratorStep(gen, resolve, reject, _next, _throw, key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { Promise.resolve(value).then(_next, _throw); } }
function _asyncToGenerator(fn) { return function () { var self = this, args = arguments; return new Promise(function (resolve, reject) { var gen = fn.apply(self, args); function _next(value) { asyncGeneratorStep(gen, resolve, reject, _next, _throw, "next", value); } function _throw(err) { asyncGeneratorStep(gen, resolve, reject, _next, _throw, "throw", err); } _next(undefined); }); }; }
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
function _arrayWithHoles(arr) { if (Array.isArray(arr)) return arr; } /**
                                                                       * @jest-environment jsdom
                                                                       */
function itHasStandardMessages(interactionBuilder) {
  it("has a message about ensuring your device is plugged in", function () {
    expect(interactionBuilder().hasMessagesFor({
      state: _interaction.PENDING,
      level: _interaction.INFO,
      code: "device.setup",
      text: "plug in and unlock"
    })).toBe(true);
  });
  it("has a message about communicating with your device", function () {
    expect(interactionBuilder().hasMessagesFor({
      state: _interaction.ACTIVE,
      level: _interaction.INFO,
      code: "device.active",
      text: "Communicating"
    })).toBe(true);
  });
}
function itHasDashboardMessages(interactionBuilder) {
  itHasStandardMessages(interactionBuilder);
  it("has messages about being in the dashboard, not an app", function () {
    expect(interactionBuilder().hasMessagesFor({
      state: _interaction.ACTIVE,
      level: _interaction.INFO,
      code: "ledger.app.dashboard",
      text: "NOT the Bitcoin app"
    })).toBe(true);
    expect(interactionBuilder().hasMessagesFor({
      state: _interaction.PENDING,
      level: _interaction.INFO,
      code: "ledger.app.dashboard",
      text: "NOT the Bitcoin app"
    })).toBe(true);
  });
}
function itHasAppMessages(interactionBuilder) {
  itHasStandardMessages(interactionBuilder);
  it("has messages about being in the Bitcoin app", function () {
    expect(interactionBuilder().hasMessagesFor({
      state: _interaction.ACTIVE,
      level: _interaction.INFO,
      code: "ledger.app.bitcoin",
      text: "opened the Bitcoin app"
    })).toBe(true);
    expect(interactionBuilder().hasMessagesFor({
      state: _interaction.PENDING,
      level: _interaction.INFO,
      code: "ledger.app.bitcoin",
      text: "open the Bitcoin app"
    })).toBe(true);
  });
}
describe("ledger", function () {
  describe("LedgerGetMetadata", function () {
    function interactionBuilder() {
      return new _ledger.LedgerGetMetadata();
    }
    itHasDashboardMessages(interactionBuilder);
    describe("parseMetadata", function () {
      it("successfully parses metadata", function () {
        var response = [49, 16, 0, 3, 5, 49, 46, 52, 46, 50, 4, 166, 0, 0, 0, 4, 49, 46, 54, 0, 32, 52, 200, 225, 237, 153, 74, 68, 110, 247, 12, 155, 37, 109, 138, 110, 1, 235, 148, 154, 186, 75, 24, 185, 249, 163, 155, 127, 56, 120, 37, 49, 3, 144, 0];
        var metadata = interactionBuilder().parseMetadata(response);
        expect(metadata).toBeTruthy();
        expect(metadata.spec).toEqual("Nano S v1.4.2 (MCU v1.6)");
        expect(metadata.model).toEqual("Nano S");
        expect(metadata.version).toBeTruthy();
        expect(metadata.version.major).toEqual("1");
        expect(metadata.version.minor).toEqual("4");
        expect(metadata.version.patch).toEqual("2");
        expect(metadata.version.string).toEqual("1.4.2");
        expect(metadata.mcuVersion).toBeTruthy();
        expect(metadata.mcuVersion.major).toEqual("1");
        expect(metadata.mcuVersion.minor).toEqual("6");
        expect(metadata.mcuVersion.string).toEqual("1.6");
      });
      it("throws and logs an error when metadata can't be parsed", function () {
        console.error = jest.fn();
        expect(function () {
          interactionBuilder().parseMetadata([]);
        }).toThrow(/unable to parse/i);
        expect(console.error).toHaveBeenCalled();
      });
    });
  });
  describe("LedgerExportPublicKey", function () {
    function interactionBuilder(bip32Path) {
      return new _ledger.LedgerExportPublicKey({
        bip32Path: bip32Path || "m/45'/0'/0'/0/0"
      });
    }
    itHasAppMessages(interactionBuilder);
    it("constructor adds error message on invalid bip32path", function () {
      expect(interactionBuilder("m/foo").hasMessagesFor({
        state: _interaction.PENDING,
        level: _interaction.ERROR,
        code: "ledger.bip32_path.path_error"
      })).toBe(true);
    });
    describe("parsePublicKey", function () {
      it("throws an error when no public key is found", function () {
        expect(function () {
          interactionBuilder().parsePublicKey();
        }).toThrow(/no public key/);
      });
      it("throws and logs an error when the public key can't be compressed", function () {
        console.error = jest.fn();
        expect(function () {
          interactionBuilder().parsePublicKey();
        }).toThrow(/received no public key/i);
        // TODO: this is broken in unchained-bitcoin
        // the underlying function call should fail when not
        // given a valid hex string, instead it's just converting
        // to an empty string which can still convert
        // expect(() => {
        //   interactionBuilder().parsePublicKey("foobar");
        // }).toThrow(/unable to compress/i);
        // expect(() => {
        //   interactionBuilder().parsePublicKey("");
        // }).toThrow(/unable to compress/i);
        expect(function () {
          // @ts-expect-error for a test
          interactionBuilder().parsePublicKey(1);
        }).toThrow(/unable to compress/i);
        expect(console.error).toHaveBeenCalled();
      });
      it("extracts and compresses the public key", function () {
        expect(interactionBuilder().parsePublicKey("0429b3e0919adc41a316aad4f41444d9bf3a9b639550f2aa735676ffff25ba3898d6881e81d2e0163348ff07b3a9a3968401572aa79c79e7edb522f41addc8e6ce")).toEqual("0229b3e0919adc41a316aad4f41444d9bf3a9b639550f2aa735676ffff25ba3898");
      });
    });
  });
  describe("LedgerSignMultisigTransaction", function () {
    _unchainedBitcoin.TEST_FIXTURES.transactions.forEach(function (fixture) {
      describe("for a transaction which ".concat(fixture.description), function () {
        function interactionBuilder() {
          return new _ledger.LedgerSignMultisigTransaction(fixture);
        }
        itHasAppMessages(interactionBuilder);
        it("has a message about delays during signing", function () {
          var interaction = interactionBuilder();
          var message = interaction.messageFor({
            state: _interaction.ACTIVE,
            level: _interaction.WARNING,
            code: "ledger.sign.delay"
          });
          expect(message).not.toBe(null);
          expect(message?.preProcessingTime).toEqual(interaction.preProcessingTime());
          expect(message?.postProcessingTime).toEqual(interaction.postProcessingTime());
        });
        if (fixture.segwit) {
          describe("a message about approving the transaction", function () {
            it("for version <1.6.0", function () {
              var interaction = interactionBuilder();
              var message = interaction.messageFor({
                state: _interaction.ACTIVE,
                level: _interaction.INFO,
                version: "<1.6.0",
                code: "ledger.sign"
              });
              expect(message).not.toBe(null);
            });
            it("for version >=1.6.0", function () {
              var interaction = interactionBuilder();
              var message = interaction.messageFor({
                state: _interaction.ACTIVE,
                level: _interaction.INFO,
                version: ">=1.6.0",
                code: "ledger.sign"
              });
              expect(message).not.toBe(null);
              expect(message?.messages).not.toBeUndefined();
              expect(message?.messages?.length).toEqual(5);
            });
          });
        } else {
          describe("a message about approving the transaction", function () {
            it("for version <1.6.0", function () {
              var interaction = interactionBuilder();
              var message = interaction.messageFor({
                state: _interaction.ACTIVE,
                level: _interaction.INFO,
                version: "<1.6.0",
                code: "ledger.sign"
              });
              expect(message).not.toBe(null);
              expect(message?.messages).not.toBeUndefined();
              expect(message?.messages?.length).toEqual(2);
            });
            it("for version >=1.6.0", function () {
              var interaction = interactionBuilder();
              var message = interaction.messageFor({
                state: _interaction.ACTIVE,
                level: _interaction.INFO,
                version: ">=1.6.0",
                code: "ledger.sign"
              });
              expect(message).not.toBe(null);
              expect(message?.messages).not.toBeUndefined();
              expect(message?.messages?.length).toEqual(7);
            });
          });
        }
        it("checks signatures include proper SIGHASH byte", function () {
          // Signature format:
          //   first byte signifies DER encoding           (0x30)
          //   second byte is length of signature in bytes (0x03)
          // The string length is however long the signature is minus these two starting bytes
          // plain signature without SIGHASH (foobar is 3 bytes, string length = 6, which is 3 bytes)
          expect(interactionBuilder().parseSignature(["3003foobar"])).toEqual(["3003foobar01"]);
          // signature actually ends in 0x01 (foob01 is 3 bytes, string length = 6, which is 3 bytes)
          expect(interactionBuilder().parseSignature(["3003foob01"])).toEqual(["3003foob0101"]);
          // signature with sighash already included (foobar is 3 bytes, string length = 8, which is 4 bytes) ...
          // we expect this to chop off the 01 and add it back
          expect(interactionBuilder().parseSignature(["3003foobar01"])).toEqual(["3003foobar01"]);
        });
      });
    });
    var tx = _unchainedBitcoin.TEST_FIXTURES.transactions[0];
    var keyDetails = {
      xfp: _unchainedBitcoin.ROOT_FINGERPRINT,
      path: "m/45'/1'/100'"
    };
    function psbtInteractionBuilder() {
      return new _ledger.LedgerSignMultisigTransaction({
        network: tx.network,
        inputs: [],
        outputs: [],
        bip32Paths: [],
        psbt: tx.psbt,
        keyDetails: keyDetails
      });
    }
    itHasAppMessages(psbtInteractionBuilder);
  });
  describe("LedgerExportExtendedPublicKey", function () {
    function interactionBuilder(bip32Path) {
      return new _ledger.LedgerExportExtendedPublicKey({
        bip32Path: bip32Path || "m/45'/0'/0'/0/0",
        network: _unchainedBitcoin.Network.TESTNET,
        includeXFP: true
      });
    }
    itHasAppMessages(interactionBuilder);
  });
  describe("LedgerSignMessage", function () {
    function interactionBuilder() {
      var bip32Path = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : "m/48'/1'/0'/2'/0/0";
      var message = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : "hello world";
      return new _ledger.LedgerSignMessage({
        bip32Path: bip32Path,
        message: message
      });
    }
    itHasAppMessages(interactionBuilder);
    it("constructor adds error message on invalid bip32path", function () {
      expect(interactionBuilder("m/foo").hasMessagesFor({
        state: _interaction.PENDING,
        level: _interaction.ERROR,
        code: "ledger.bip32_path.path_error"
      })).toBe(true);
    });
  });
  function getMockedApp() {
    var mockApp = {
      registerWallet: jest.fn(),
      getWalletAddress: jest.fn(),
      signPsbt: jest.fn(),
      getMasterFingerprint: jest.fn()
    };
    jest.mock("ledger-bitcoin", function () {
      return jest.fn().mockImplementation(function () {
        return mockApp;
      });
    });
    var mockWithApp = jest.fn().mockImplementation(function (callback) {
      return callback(mockApp);
    });
    return [mockApp, mockWithApp];
  }
  function addInteractionMocks(interaction, mockWithApp) {
    jest.spyOn(interaction, "isAppSupported").mockReturnValue(Promise.resolve(true));
    jest.spyOn(interaction, "withApp").mockImplementation(mockWithApp);
    jest.spyOn(interaction, "withTransport").mockImplementation(function () {
      return Promise.resolve(jest.fn);
    });
  }
  describe("LedgerRegisterWalletPolicy", function () {
    var mockApp, mockWithApp;
    beforeEach(function () {
      var _getMockedApp = getMockedApp(),
        _getMockedApp2 = _slicedToArray(_getMockedApp, 2),
        app = _getMockedApp2[0],
        withApp = _getMockedApp2[1];
      mockWithApp = withApp;
      mockApp = app;
    });
    afterEach(function () {
      jest.resetAllMocks();
    });
    function interactionBuilder(policyHmac, verify) {
      var walletConfig = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : (0, _policy.braidDetailsToWalletConfig)(_unchainedBitcoin.TEST_FIXTURES.braids[0]);
      var interaction = new _ledger.LedgerRegisterWalletPolicy(_objectSpread(_objectSpread({}, walletConfig), {}, {
        policyHmac: policyHmac,
        verify: verify
      }));
      addInteractionMocks(interaction, mockWithApp);
      return interaction;
    }
    it("returns existing policyHmac if exists and not verifying", /*#__PURE__*/_asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee() {
      var interaction;
      return _regeneratorRuntime().wrap(function _callee$(_context) {
        while (1) switch (_context.prev = _context.next) {
          case 0:
            interaction = interactionBuilder("deadbeef", false);
            _context.t0 = expect;
            _context.next = 4;
            return interaction.run();
          case 4:
            _context.t1 = _context.sent;
            (0, _context.t0)(_context.t1).toEqual("deadbeef");
          case 6:
          case "end":
            return _context.stop();
        }
      }, _callee);
    })));
    it("registers braid/wallet with ledger app", /*#__PURE__*/_asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee2() {
      var interaction, expectedHmac, result;
      return _regeneratorRuntime().wrap(function _callee2$(_context2) {
        while (1) switch (_context2.prev = _context2.next) {
          case 0:
            interaction = interactionBuilder();
            expectedHmac = Buffer.from("deadbeef");
            mockApp.registerWallet.mockReturnValue(Promise.resolve([Buffer.from("id"), expectedHmac]));
            _context2.next = 5;
            return interaction.run();
          case 5:
            result = _context2.sent;
            expect(mockApp.registerWallet).toBeCalledWith(interaction.walletPolicy.toLedgerPolicy());
            expect(result).toEqual(expectedHmac.toString("hex"));
          case 8:
          case "end":
            return _context2.stop();
        }
      }, _callee2);
    })));
    it("verifies against a registration mismatch", /*#__PURE__*/_asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee3() {
      var interaction, expectedHmac, result;
      return _regeneratorRuntime().wrap(function _callee3$(_context3) {
        while (1) switch (_context3.prev = _context3.next) {
          case 0:
            console.error = jest.fn();
            interaction = interactionBuilder("beef", true);
            expectedHmac = Buffer.from("deadbeef");
            mockApp.registerWallet.mockReturnValue(Promise.resolve([Buffer.from("id"), expectedHmac]));
            _context3.next = 6;
            return interaction.run();
          case 6:
            result = _context3.sent;
            // returns the correct registration value but console errors
            // that there was a mismatch
            expect(console.error).toHaveBeenCalled();
            expect(result).toEqual(expectedHmac.toString("hex"));
          case 9:
          case "end":
            return _context3.stop();
        }
      }, _callee3);
    })));
  });
  describe("LedgerConfirmMultisigAddress", function () {
    var mockApp, mockWithApp;
    beforeEach(function () {
      var _getMockedApp3 = getMockedApp(),
        _getMockedApp4 = _slicedToArray(_getMockedApp3, 2),
        app = _getMockedApp4[0],
        withApp = _getMockedApp4[1];
      mockWithApp = withApp;
      mockApp = app;
      var expectedHmac = Buffer.from("deadbeef");
      mockApp.registerWallet.mockReturnValue(Promise.resolve([Buffer.from("id"), expectedHmac]));
    });
    afterEach(function () {
      jest.resetAllMocks();
    });
    function interactionBuilder(policyHmac, expected) {
      var walletConfig = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : (0, _policy.braidDetailsToWalletConfig)(_unchainedBitcoin.TEST_FIXTURES.multisigs[0].braidDetails);
      var bip32Path = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : _unchainedBitcoin.TEST_FIXTURES.multisigs[0].bip32Path;
      var interaction = new _ledger.LedgerConfirmMultisigAddress(_objectSpread({
        policyHmac: policyHmac,
        expected: expected,
        bip32Path: bip32Path
      }, walletConfig));
      addInteractionMocks(interaction, mockWithApp);
      return interaction;
    }
    it("registers policy if none passed in and calls address method", /*#__PURE__*/_asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee4() {
      var interaction, expectedAddress, address;
      return _regeneratorRuntime().wrap(function _callee4$(_context4) {
        while (1) switch (_context4.prev = _context4.next) {
          case 0:
            interaction = interactionBuilder();
            expectedAddress = "payme";
            mockApp.getWalletAddress.mockReturnValue(Promise.resolve(expectedAddress));
            _context4.next = 5;
            return interaction.run();
          case 5:
            address = _context4.sent;
            expect(mockApp.registerWallet).toHaveBeenCalled();
            expect(mockApp.getWalletAddress).toHaveBeenCalledWith(interaction.walletPolicy.toLedgerPolicy(), Buffer.from(interaction.POLICY_HMAC, "hex"), interaction.braidIndex, interaction.addressIndex, interaction.display);
            expect(address).toEqual(expectedAddress);
          case 9:
          case "end":
            return _context4.stop();
        }
      }, _callee4);
    })));
  });
  describe("LedgerV2SignMultisigTransaction", function () {
    var expectedSigs, mockApp, mockWithApp;
    beforeEach(function () {
      var _getMockedApp5 = getMockedApp(),
        _getMockedApp6 = _slicedToArray(_getMockedApp5, 2),
        app = _getMockedApp6[0],
        withApp = _getMockedApp6[1];
      mockWithApp = withApp;
      mockApp = app;
      expectedSigs = [[0, {
        pubkey: Buffer.from(fixture.publicKeys[0], "hex"),
        signature: Buffer.from(fixture.signature[0], "hex")
      }]];
      mockApp.signPsbt.mockReturnValue(Promise.resolve(expectedSigs));
    });
    afterEach(function () {
      jest.resetAllMocks();
    });
    var fixture = _unchainedBitcoin.TEST_FIXTURES.transactions[0];
    function interactionBuilder() {
      var policyHmac = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : fixture.policyHmac;
      var walletConfig = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : (0, _policy.braidDetailsToWalletConfig)(fixture.braidDetails);
      var psbt = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : fixture.psbt;
      var progressCallback = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : function () {};
      var interaction;
      var options = _objectSpread({
        policyHmac: policyHmac,
        psbt: psbt,
        progressCallback: progressCallback
      }, walletConfig);
      interaction = new _ledger.LedgerV2SignMultisigTransaction(_objectSpread(_objectSpread({}, options), {}, {
        returnSignatureArray: true
      }));
      addInteractionMocks(interaction, mockWithApp);
      return interaction;
    }
    it("signs psbt", /*#__PURE__*/_asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee5() {
      var interaction, sigs;
      return _regeneratorRuntime().wrap(function _callee5$(_context5) {
        while (1) switch (_context5.prev = _context5.next) {
          case 0:
            interaction = interactionBuilder();
            _context5.next = 3;
            return interaction.run();
          case 3:
            sigs = _context5.sent;
            expect(sigs).toStrictEqual([fixture.signature[0]]);
            // confirming that the psbt used is version 2
            expect(interaction.psbt.PSBT_GLOBAL_VERSION).toBe(2);
            expect(mockApp.signPsbt).toHaveBeenCalledWith(interaction.psbt, interaction.walletPolicy.toLedgerPolicy(), interaction.policyHmac, interaction.progressCallback);
          case 7:
          case "end":
            return _context5.stop();
        }
      }, _callee5);
    })));
  });
});