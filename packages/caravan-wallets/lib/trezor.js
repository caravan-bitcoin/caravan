"use strict";

require("core-js/modules/es6.string.iterator");
require("core-js/modules/es6.array.from");
require("core-js/modules/es6.function.name");
require("core-js/modules/es6.array.is-array");
require("core-js/modules/es6.promise");
require("core-js/modules/es6.reflect.get");
require("core-js/modules/es6.object.create");
require("core-js/modules/es6.reflect.construct");
require("core-js/modules/es6.function.bind");
require("core-js/modules/es6.object.set-prototype-of");
require("core-js/modules/es6.object.define-properties");
require("core-js/modules/es7.object.get-own-property-descriptors");
require("core-js/modules/es6.array.for-each");
require("core-js/modules/es6.array.filter");
require("core-js/modules/es6.object.keys");
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.TrezorSignMultisigTransaction = exports.TrezorSignMessage = exports.TrezorInteraction = exports.TrezorGetMetadata = exports.TrezorExportPublicKey = exports.TrezorExportHDNode = exports.TrezorExportExtendedPublicKey = exports.TrezorConfirmMultisigAddress = exports.TREZOR_RIGHT_BUTTON = exports.TREZOR_PUSH_AND_HOLD_BUTTON = exports.TREZOR_LEFT_BUTTON = exports.TREZOR_BOTH_BUTTONS = exports.TREZOR = void 0;
exports.trezorCoin = trezorCoin;
require("core-js/modules/es6.string.repeat");
require("core-js/modules/es6.regexp.to-string");
require("core-js/modules/es6.date.to-string");
require("core-js/modules/es6.array.fill");
require("core-js/modules/es6.array.map");
require("core-js/modules/web.dom.iterable");
require("core-js/modules/es6.array.iterator");
require("core-js/modules/es6.object.to-string");
require("core-js/modules/es7.object.entries");
require("core-js/modules/es6.regexp.split");
require("regenerator-runtime/runtime");
require("core-js/modules/es6.number.constructor");
require("core-js/modules/es7.symbol.async-iterator");
require("core-js/modules/es6.symbol");
require("core-js/modules/es6.object.define-property");
var _bignumber = _interopRequireDefault(require("bignumber.js"));
var _unchainedBitcoin = require("unchained-bitcoin");
var _bitcoinjsLib = require("bitcoinjs-lib");
var _interaction = require("./interaction");
var _index = require("./index");
var _connectWeb = _interopRequireDefault(require("@trezor/connect-web"));
var _ADDRESS_SCRIPT_TYPES;
function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }
function _regeneratorRuntime() { "use strict"; /*! regenerator-runtime -- Copyright (c) 2014-present, Facebook, Inc. -- license (MIT): https://github.com/facebook/regenerator/blob/main/LICENSE */ _regeneratorRuntime = function _regeneratorRuntime() { return exports; }; var exports = {}, Op = Object.prototype, hasOwn = Op.hasOwnProperty, defineProperty = Object.defineProperty || function (obj, key, desc) { obj[key] = desc.value; }, $Symbol = "function" == typeof Symbol ? Symbol : {}, iteratorSymbol = $Symbol.iterator || "@@iterator", asyncIteratorSymbol = $Symbol.asyncIterator || "@@asyncIterator", toStringTagSymbol = $Symbol.toStringTag || "@@toStringTag"; function define(obj, key, value) { return Object.defineProperty(obj, key, { value: value, enumerable: !0, configurable: !0, writable: !0 }), obj[key]; } try { define({}, ""); } catch (err) { define = function define(obj, key, value) { return obj[key] = value; }; } function wrap(innerFn, outerFn, self, tryLocsList) { var protoGenerator = outerFn && outerFn.prototype instanceof Generator ? outerFn : Generator, generator = Object.create(protoGenerator.prototype), context = new Context(tryLocsList || []); return defineProperty(generator, "_invoke", { value: makeInvokeMethod(innerFn, self, context) }), generator; } function tryCatch(fn, obj, arg) { try { return { type: "normal", arg: fn.call(obj, arg) }; } catch (err) { return { type: "throw", arg: err }; } } exports.wrap = wrap; var ContinueSentinel = {}; function Generator() {} function GeneratorFunction() {} function GeneratorFunctionPrototype() {} var IteratorPrototype = {}; define(IteratorPrototype, iteratorSymbol, function () { return this; }); var getProto = Object.getPrototypeOf, NativeIteratorPrototype = getProto && getProto(getProto(values([]))); NativeIteratorPrototype && NativeIteratorPrototype !== Op && hasOwn.call(NativeIteratorPrototype, iteratorSymbol) && (IteratorPrototype = NativeIteratorPrototype); var Gp = GeneratorFunctionPrototype.prototype = Generator.prototype = Object.create(IteratorPrototype); function defineIteratorMethods(prototype) { ["next", "throw", "return"].forEach(function (method) { define(prototype, method, function (arg) { return this._invoke(method, arg); }); }); } function AsyncIterator(generator, PromiseImpl) { function invoke(method, arg, resolve, reject) { var record = tryCatch(generator[method], generator, arg); if ("throw" !== record.type) { var result = record.arg, value = result.value; return value && "object" == _typeof(value) && hasOwn.call(value, "__await") ? PromiseImpl.resolve(value.__await).then(function (value) { invoke("next", value, resolve, reject); }, function (err) { invoke("throw", err, resolve, reject); }) : PromiseImpl.resolve(value).then(function (unwrapped) { result.value = unwrapped, resolve(result); }, function (error) { return invoke("throw", error, resolve, reject); }); } reject(record.arg); } var previousPromise; defineProperty(this, "_invoke", { value: function value(method, arg) { function callInvokeWithMethodAndArg() { return new PromiseImpl(function (resolve, reject) { invoke(method, arg, resolve, reject); }); } return previousPromise = previousPromise ? previousPromise.then(callInvokeWithMethodAndArg, callInvokeWithMethodAndArg) : callInvokeWithMethodAndArg(); } }); } function makeInvokeMethod(innerFn, self, context) { var state = "suspendedStart"; return function (method, arg) { if ("executing" === state) throw new Error("Generator is already running"); if ("completed" === state) { if ("throw" === method) throw arg; return doneResult(); } for (context.method = method, context.arg = arg;;) { var delegate = context.delegate; if (delegate) { var delegateResult = maybeInvokeDelegate(delegate, context); if (delegateResult) { if (delegateResult === ContinueSentinel) continue; return delegateResult; } } if ("next" === context.method) context.sent = context._sent = context.arg;else if ("throw" === context.method) { if ("suspendedStart" === state) throw state = "completed", context.arg; context.dispatchException(context.arg); } else "return" === context.method && context.abrupt("return", context.arg); state = "executing"; var record = tryCatch(innerFn, self, context); if ("normal" === record.type) { if (state = context.done ? "completed" : "suspendedYield", record.arg === ContinueSentinel) continue; return { value: record.arg, done: context.done }; } "throw" === record.type && (state = "completed", context.method = "throw", context.arg = record.arg); } }; } function maybeInvokeDelegate(delegate, context) { var methodName = context.method, method = delegate.iterator[methodName]; if (undefined === method) return context.delegate = null, "throw" === methodName && delegate.iterator["return"] && (context.method = "return", context.arg = undefined, maybeInvokeDelegate(delegate, context), "throw" === context.method) || "return" !== methodName && (context.method = "throw", context.arg = new TypeError("The iterator does not provide a '" + methodName + "' method")), ContinueSentinel; var record = tryCatch(method, delegate.iterator, context.arg); if ("throw" === record.type) return context.method = "throw", context.arg = record.arg, context.delegate = null, ContinueSentinel; var info = record.arg; return info ? info.done ? (context[delegate.resultName] = info.value, context.next = delegate.nextLoc, "return" !== context.method && (context.method = "next", context.arg = undefined), context.delegate = null, ContinueSentinel) : info : (context.method = "throw", context.arg = new TypeError("iterator result is not an object"), context.delegate = null, ContinueSentinel); } function pushTryEntry(locs) { var entry = { tryLoc: locs[0] }; 1 in locs && (entry.catchLoc = locs[1]), 2 in locs && (entry.finallyLoc = locs[2], entry.afterLoc = locs[3]), this.tryEntries.push(entry); } function resetTryEntry(entry) { var record = entry.completion || {}; record.type = "normal", delete record.arg, entry.completion = record; } function Context(tryLocsList) { this.tryEntries = [{ tryLoc: "root" }], tryLocsList.forEach(pushTryEntry, this), this.reset(!0); } function values(iterable) { if (iterable) { var iteratorMethod = iterable[iteratorSymbol]; if (iteratorMethod) return iteratorMethod.call(iterable); if ("function" == typeof iterable.next) return iterable; if (!isNaN(iterable.length)) { var i = -1, next = function next() { for (; ++i < iterable.length;) if (hasOwn.call(iterable, i)) return next.value = iterable[i], next.done = !1, next; return next.value = undefined, next.done = !0, next; }; return next.next = next; } } return { next: doneResult }; } function doneResult() { return { value: undefined, done: !0 }; } return GeneratorFunction.prototype = GeneratorFunctionPrototype, defineProperty(Gp, "constructor", { value: GeneratorFunctionPrototype, configurable: !0 }), defineProperty(GeneratorFunctionPrototype, "constructor", { value: GeneratorFunction, configurable: !0 }), GeneratorFunction.displayName = define(GeneratorFunctionPrototype, toStringTagSymbol, "GeneratorFunction"), exports.isGeneratorFunction = function (genFun) { var ctor = "function" == typeof genFun && genFun.constructor; return !!ctor && (ctor === GeneratorFunction || "GeneratorFunction" === (ctor.displayName || ctor.name)); }, exports.mark = function (genFun) { return Object.setPrototypeOf ? Object.setPrototypeOf(genFun, GeneratorFunctionPrototype) : (genFun.__proto__ = GeneratorFunctionPrototype, define(genFun, toStringTagSymbol, "GeneratorFunction")), genFun.prototype = Object.create(Gp), genFun; }, exports.awrap = function (arg) { return { __await: arg }; }, defineIteratorMethods(AsyncIterator.prototype), define(AsyncIterator.prototype, asyncIteratorSymbol, function () { return this; }), exports.AsyncIterator = AsyncIterator, exports.async = function (innerFn, outerFn, self, tryLocsList, PromiseImpl) { void 0 === PromiseImpl && (PromiseImpl = Promise); var iter = new AsyncIterator(wrap(innerFn, outerFn, self, tryLocsList), PromiseImpl); return exports.isGeneratorFunction(outerFn) ? iter : iter.next().then(function (result) { return result.done ? result.value : iter.next(); }); }, defineIteratorMethods(Gp), define(Gp, toStringTagSymbol, "Generator"), define(Gp, iteratorSymbol, function () { return this; }), define(Gp, "toString", function () { return "[object Generator]"; }), exports.keys = function (val) { var object = Object(val), keys = []; for (var key in object) keys.push(key); return keys.reverse(), function next() { for (; keys.length;) { var key = keys.pop(); if (key in object) return next.value = key, next.done = !1, next; } return next.done = !0, next; }; }, exports.values = values, Context.prototype = { constructor: Context, reset: function reset(skipTempReset) { if (this.prev = 0, this.next = 0, this.sent = this._sent = undefined, this.done = !1, this.delegate = null, this.method = "next", this.arg = undefined, this.tryEntries.forEach(resetTryEntry), !skipTempReset) for (var name in this) "t" === name.charAt(0) && hasOwn.call(this, name) && !isNaN(+name.slice(1)) && (this[name] = undefined); }, stop: function stop() { this.done = !0; var rootRecord = this.tryEntries[0].completion; if ("throw" === rootRecord.type) throw rootRecord.arg; return this.rval; }, dispatchException: function dispatchException(exception) { if (this.done) throw exception; var context = this; function handle(loc, caught) { return record.type = "throw", record.arg = exception, context.next = loc, caught && (context.method = "next", context.arg = undefined), !!caught; } for (var i = this.tryEntries.length - 1; i >= 0; --i) { var entry = this.tryEntries[i], record = entry.completion; if ("root" === entry.tryLoc) return handle("end"); if (entry.tryLoc <= this.prev) { var hasCatch = hasOwn.call(entry, "catchLoc"), hasFinally = hasOwn.call(entry, "finallyLoc"); if (hasCatch && hasFinally) { if (this.prev < entry.catchLoc) return handle(entry.catchLoc, !0); if (this.prev < entry.finallyLoc) return handle(entry.finallyLoc); } else if (hasCatch) { if (this.prev < entry.catchLoc) return handle(entry.catchLoc, !0); } else { if (!hasFinally) throw new Error("try statement without catch or finally"); if (this.prev < entry.finallyLoc) return handle(entry.finallyLoc); } } } }, abrupt: function abrupt(type, arg) { for (var i = this.tryEntries.length - 1; i >= 0; --i) { var entry = this.tryEntries[i]; if (entry.tryLoc <= this.prev && hasOwn.call(entry, "finallyLoc") && this.prev < entry.finallyLoc) { var finallyEntry = entry; break; } } finallyEntry && ("break" === type || "continue" === type) && finallyEntry.tryLoc <= arg && arg <= finallyEntry.finallyLoc && (finallyEntry = null); var record = finallyEntry ? finallyEntry.completion : {}; return record.type = type, record.arg = arg, finallyEntry ? (this.method = "next", this.next = finallyEntry.finallyLoc, ContinueSentinel) : this.complete(record); }, complete: function complete(record, afterLoc) { if ("throw" === record.type) throw record.arg; return "break" === record.type || "continue" === record.type ? this.next = record.arg : "return" === record.type ? (this.rval = this.arg = record.arg, this.method = "return", this.next = "end") : "normal" === record.type && afterLoc && (this.next = afterLoc), ContinueSentinel; }, finish: function finish(finallyLoc) { for (var i = this.tryEntries.length - 1; i >= 0; --i) { var entry = this.tryEntries[i]; if (entry.finallyLoc === finallyLoc) return this.complete(entry.completion, entry.afterLoc), resetTryEntry(entry), ContinueSentinel; } }, "catch": function _catch(tryLoc) { for (var i = this.tryEntries.length - 1; i >= 0; --i) { var entry = this.tryEntries[i]; if (entry.tryLoc === tryLoc) { var record = entry.completion; if ("throw" === record.type) { var thrown = record.arg; resetTryEntry(entry); } return thrown; } } throw new Error("illegal catch attempt"); }, delegateYield: function delegateYield(iterable, resultName, nextLoc) { return this.delegate = { iterator: values(iterable), resultName: resultName, nextLoc: nextLoc }, "next" === this.method && (this.arg = undefined), ContinueSentinel; } }, exports; }
function _slicedToArray(arr, i) { return _arrayWithHoles(arr) || _iterableToArrayLimit(arr, i) || _unsupportedIterableToArray(arr, i) || _nonIterableRest(); }
function _nonIterableRest() { throw new TypeError("Invalid attempt to destructure non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }
function _unsupportedIterableToArray(o, minLen) { if (!o) return; if (typeof o === "string") return _arrayLikeToArray(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return Array.from(o); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen); }
function _arrayLikeToArray(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) arr2[i] = arr[i]; return arr2; }
function _iterableToArrayLimit(arr, i) { var _i = null == arr ? null : "undefined" != typeof Symbol && arr[Symbol.iterator] || arr["@@iterator"]; if (null != _i) { var _s, _e, _x, _r, _arr = [], _n = !0, _d = !1; try { if (_x = (_i = _i.call(arr)).next, 0 === i) { if (Object(_i) !== _i) return; _n = !1; } else for (; !(_n = (_s = _x.call(_i)).done) && (_arr.push(_s.value), _arr.length !== i); _n = !0); } catch (err) { _d = !0, _e = err; } finally { try { if (!_n && null != _i["return"] && (_r = _i["return"](), Object(_r) !== _r)) return; } finally { if (_d) throw _e; } } return _arr; } }
function _arrayWithHoles(arr) { if (Array.isArray(arr)) return arr; }
function asyncGeneratorStep(gen, resolve, reject, _next, _throw, key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { Promise.resolve(value).then(_next, _throw); } }
function _asyncToGenerator(fn) { return function () { var self = this, args = arguments; return new Promise(function (resolve, reject) { var gen = fn.apply(self, args); function _next(value) { asyncGeneratorStep(gen, resolve, reject, _next, _throw, "next", value); } function _throw(err) { asyncGeneratorStep(gen, resolve, reject, _next, _throw, "throw", err); } _next(undefined); }); }; }
function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }
function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, _toPropertyKey(descriptor.key), descriptor); } }
function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); Object.defineProperty(Constructor, "prototype", { writable: false }); return Constructor; }
function _get() { if (typeof Reflect !== "undefined" && Reflect.get) { _get = Reflect.get.bind(); } else { _get = function _get(target, property, receiver) { var base = _superPropBase(target, property); if (!base) return; var desc = Object.getOwnPropertyDescriptor(base, property); if (desc.get) { return desc.get.call(arguments.length < 3 ? target : receiver); } return desc.value; }; } return _get.apply(this, arguments); }
function _superPropBase(object, property) { while (!Object.prototype.hasOwnProperty.call(object, property)) { object = _getPrototypeOf(object); if (object === null) break; } return object; }
function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function"); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, writable: true, configurable: true } }); Object.defineProperty(subClass, "prototype", { writable: false }); if (superClass) _setPrototypeOf(subClass, superClass); }
function _setPrototypeOf(o, p) { _setPrototypeOf = Object.setPrototypeOf ? Object.setPrototypeOf.bind() : function _setPrototypeOf(o, p) { o.__proto__ = p; return o; }; return _setPrototypeOf(o, p); }
function _createSuper(Derived) { var hasNativeReflectConstruct = _isNativeReflectConstruct(); return function _createSuperInternal() { var Super = _getPrototypeOf(Derived), result; if (hasNativeReflectConstruct) { var NewTarget = _getPrototypeOf(this).constructor; result = Reflect.construct(Super, arguments, NewTarget); } else { result = Super.apply(this, arguments); } return _possibleConstructorReturn(this, result); }; }
function _possibleConstructorReturn(self, call) { if (call && (_typeof(call) === "object" || typeof call === "function")) { return call; } else if (call !== void 0) { throw new TypeError("Derived constructors may only return object or undefined"); } return _assertThisInitialized(self); }
function _assertThisInitialized(self) { if (self === void 0) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return self; }
function _isNativeReflectConstruct() { if (typeof Reflect === "undefined" || !Reflect.construct) return false; if (Reflect.construct.sham) return false; if (typeof Proxy === "function") return true; try { Boolean.prototype.valueOf.call(Reflect.construct(Boolean, [], function () {})); return true; } catch (e) { return false; } }
function _getPrototypeOf(o) { _getPrototypeOf = Object.setPrototypeOf ? Object.getPrototypeOf.bind() : function _getPrototypeOf(o) { return o.__proto__ || Object.getPrototypeOf(o); }; return _getPrototypeOf(o); }
function ownKeys(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); enumerableOnly && (symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; })), keys.push.apply(keys, symbols); } return keys; }
function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = null != arguments[i] ? arguments[i] : {}; i % 2 ? ownKeys(Object(source), !0).forEach(function (key) { _defineProperty(target, key, source[key]); }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)) : ownKeys(Object(source)).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } return target; }
function _typeof(obj) { "@babel/helpers - typeof"; return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (obj) { return typeof obj; } : function (obj) { return obj && "function" == typeof Symbol && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }, _typeof(obj); }
function _defineProperty(obj, key, value) { key = _toPropertyKey(key); if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }
function _toPropertyKey(arg) { var key = _toPrimitive(arg, "string"); return _typeof(key) === "symbol" ? key : String(key); }
function _toPrimitive(input, hint) { if (_typeof(input) !== "object" || input === null) return input; var prim = input[Symbol.toPrimitive]; if (prim !== undefined) { var res = prim.call(input, hint || "default"); if (_typeof(res) !== "object") return res; throw new TypeError("@@toPrimitive must return a primitive value."); } return (hint === "string" ? String : Number)(input); } /* eslint-disable max-lines*/ /**
                                                                                                                                                                                                                                                                                                                                                                                                                             * Provides classes for interacting with Trezor hardware wallets.
                                                                                                                                                                                                                                                                                                                                                                                                                             *
                                                                                                                                                                                                                                                                                                                                                                                                                             * The base class provided is `TrezorInteraction` which wraps calls to [`TrezorConnect`]{@link https://github.com/trezor/connect}.  New interactions should subclass `TrezorInteraction`.
                                                                                                                                                                                                                                                                                                                                                                                                                             *
                                                                                                                                                                                                                                                                                                                                                                                                                             * Many Trezor calls require knowing the bitcoin network.  This
                                                                                                                                                                                                                                                                                                                                                                                                                             * library uses the API defined by `unchained-bitcoin` to label
                                                                                                                                                                                                                                                                                                                                                                                                                             * bitcoin networks, and this is the value expected in several off the
                                                                                                                                                                                                                                                                                                                                                                                                                             * constructors for classes in this module.
                                                                                                                                                                                                                                                                                                                                                                                                                             *
                                                                                                                                                                                                                                                                                                                                                                                                                             * The value of the `network` is mapped internally to
                                                                                                                                                                                                                                                                                                                                                                                                                             * `this.trezorCoin`.  This value is useful to subclasses implementing
                                                                                                                                                                                                                                                                                                                                                                                                                             * the `params()` method as many TrezorConnect methods require the
                                                                                                                                                                                                                                                                                                                                                                                                                             * `coin` parameter.
                                                                                                                                                                                                                                                                                                                                                                                                                             *
                                                                                                                                                                                                                                                                                                                                                                                                                             * The following API classes are implemented:
                                                                                                                                                                                                                                                                                                                                                                                                                             *
                                                                                                                                                                                                                                                                                                                                                                                                                             * * TrezorGetMetadata
                                                                                                                                                                                                                                                                                                                                                                                                                             * * TrezorExportPublicKey
                                                                                                                                                                                                                                                                                                                                                                                                                             * * TrezorExportExtendedPublicKey
                                                                                                                                                                                                                                                                                                                                                                                                                             * * TrezorSignMultisigTransaction
                                                                                                                                                                                                                                                                                                                                                                                                                             * * TrezorConfirmMultisigAddress
                                                                                                                                                                                                                                                                                                                                                                                                                             */
/**
 * Constant defining Trezor interactions.
 */
var TREZOR = "trezor";
exports.TREZOR = TREZOR;
var ADDRESS_SCRIPT_TYPES = (_ADDRESS_SCRIPT_TYPES = {}, _defineProperty(_ADDRESS_SCRIPT_TYPES, _unchainedBitcoin.P2SH, "SPENDMULTISIG"), _defineProperty(_ADDRESS_SCRIPT_TYPES, _unchainedBitcoin.P2SH_P2WSH, "SPENDP2SHWITNESS"), _defineProperty(_ADDRESS_SCRIPT_TYPES, _unchainedBitcoin.P2WSH, "SPENDWITNESS"), _ADDRESS_SCRIPT_TYPES);

/**
 * Constant representing the action of pushing the left button on a
 * Trezor device.
 */
var TREZOR_LEFT_BUTTON = "trezor_left_button";

/**
 * Constant representing the action of pushing the right button on a
 * Trezor device.
 */
exports.TREZOR_LEFT_BUTTON = TREZOR_LEFT_BUTTON;
var TREZOR_RIGHT_BUTTON = "trezor_right_button";

/**
 * Constant representing the action of pushing both buttons on a
 * Trezor device.
 */
exports.TREZOR_RIGHT_BUTTON = TREZOR_RIGHT_BUTTON;
var TREZOR_BOTH_BUTTONS = "trezor_both_buttons";

/**
 * Constant representing the action of pushing and holding the Confirm
 * button on a Trezor model T device.
 */
exports.TREZOR_BOTH_BUTTONS = TREZOR_BOTH_BUTTONS;
var TREZOR_PUSH_AND_HOLD_BUTTON = "trezor_push_and_hold_button";

// eslint-disable-next-line no-process-env
exports.TREZOR_PUSH_AND_HOLD_BUTTON = TREZOR_PUSH_AND_HOLD_BUTTON;
var env_variables = _objectSpread({}, process.env); // Accessing directly does not appear to work, let's make a copy

var ENV_TREZOR_CONNECT_URL = env_variables.TREZOR_CONNECT_URL || env_variables.REACT_APP_TREZOR_CONNECT_UR || env_variables.VITE_TREZOR_CONNECT_URL;
var ENV_TREZOR_BLOCKBOOK_URL = env_variables.TREZOR_BLOCKBOOK_URL || env_variables.REACT_APP_TREZOR_BLOCKBOOK_URL || env_variables.VITE_TREZOR_BLOCKBOOK_URL;
var TREZOR_CONNECT_URL = ENV_TREZOR_CONNECT_URL || "https://".concat(window.location.hostname, ":8088/");
var TREZOR_BLOCKBOOK_URL = ENV_TREZOR_BLOCKBOOK_URL || "http://".concat(window.location.hostname, ":3035/");
var TREZOR_DEV = env_variables.TREZOR_DEV || env_variables.REACT_APP_TREZOR_DEV || env_variables.VITE_TREZOR_DEV;
try {
  _connectWeb["default"].init({
    connectSrc: TREZOR_DEV ? TREZOR_CONNECT_URL : "https://connect.trezor.io/9.1.9/",
    // pinning to this connect version to avoid backwards incompatible changes
    lazyLoad: true,
    // this param prevents iframe injection until a TrezorConnect.method is called
    manifest: {
      email: "help@unchained.com",
      appUrl: "https://github.com/unchained-capital/unchained-wallets"
    }
  });
} catch (e) {
  // We hit this if we run this code outside of a browser, for example
  // during unit testing.
  if (env_variables.NODE_ENV !== "test") {
    console.error("Unable to call TrezorConnect.manifest.");
  }
}

/**
 * Base class for interactions with Trezor hardware wallets.
 *
 * Assumes we are using TrezorConnect to talk to the device.
 *
 * Subclasses *must* implement a method `this.connectParams` which
 * returns a 2-element array.  The first element of this array should
 * be a `TrezorConnect` method to use (e.g. -
 * `TrezorConnect.getAddress`).  The second element of this array
 * should be the parameters to pass to the given `TrezorConnect`
 * method.
 *
 * Errors thrown when calling TrezorConnect are not caught, so users
 * of this class (and its subclasses) should use `try...catch` as
 * always.
 *
 * Unsuccessful responses (the request succeeded but the Trezor device
 * returned an error message) are intercepted and thrown as errors.
 * This allows upstream `try...catch` blocks to intercept errors &
 * failures uniformly.
 *
 * Subclasses *may* implement the `parse(payload)` method which
 * accepts the response payload object and returns the relevant data.
 *
 * Subclasses will also want to implement a `messages()` method to
 * manipulate the messages returned to the user for each interaction.
 *
 * @example
 * import {TrezorInteraction} from "unchained-wallets";
 * // Simple subclass
 *
 * class SimpleTrezorInteraction extends TrezorInteraction {
 *
 *   constructor({network, param}) {
 *     super({network});
 *     this.param =  param;
 *   }
 *
 *   connectParams() {
 *     return [
 *       TrezorConnect.doSomething, // Not a real TrezorConnect function...
 *       {
 *         // Many Trezor methods require the `coin` parameter.  The
 *         // value of `this.trezorCoin` is set appropriately based on the
 *         // `network` provided in the constructor.
 *         coin: this.trezorCoin,
 *
 *         // Pass whatever arguments are required
 *         // by the TrezorConnect function being called.
 *         param: this.param,
 *         // ...
 *       }
 *     ];
 *   }
 *
 *   parsePayload(payload) {
 *     return payload.someValue;
 *   }
 *
 * }
 * // usage
 * import {Network} from "unchained-bitcoin";
 * const interaction = new SimpleTrezorInteraction({network: Network.MAINNET, param: "foo"});
 * const result = await interaction.run();
 * console.log(result); // someValue from payload
 */
var TrezorInteraction = /*#__PURE__*/function (_DirectKeystoreIntera) {
  _inherits(TrezorInteraction, _DirectKeystoreIntera);
  var _super = _createSuper(TrezorInteraction);
  function TrezorInteraction(_ref) {
    var _this;
    var network = _ref.network;
    _classCallCheck(this, TrezorInteraction);
    _this = _super.call(this);
    _defineProperty(_assertThisInitialized(_this), "network", void 0);
    _defineProperty(_assertThisInitialized(_this), "trezorCoin", void 0);
    _this.network = network;
    _this.trezorCoin = trezorCoin(network);
    return _this;
  }

  /**
   * Default messages are added asking the user to plug in their
   * Trezor device (`device.connect`) and about the TrezorConnect
   * popups (`trezor.connect.generic`).
   *
   * Subclasses should override this method and add their own messages
   * (don't forget to call `super()`).
   */
  _createClass(TrezorInteraction, [{
    key: "messages",
    value: function messages() {
      var messages = _get(_getPrototypeOf(TrezorInteraction.prototype), "messages", this).call(this);
      messages.push({
        version: "One",
        state: _interaction.PENDING,
        level: _interaction.INFO,
        text: "Make sure your Trezor device is plugged in.",
        code: "device.connect"
      });
      messages.push({
        version: "T",
        state: _interaction.PENDING,
        level: _interaction.INFO,
        text: "Make sure your Trezor device is plugged in and unlocked.",
        code: "device.connect"
      });
      messages.push({
        state: _interaction.ACTIVE,
        level: _interaction.INFO,
        text: "Your browser should now open a new window to Trezor Connect. Ensure you have enabled popups for this site.",
        code: "trezor.connect.generic"
      });
      return messages;
    }

    /**
     * Awaits the call of `this.method`, passing in the output of
     * `this.params()`.
     *
     * If the call returns but is unsuccessful (`result.success`) is
     * false, will throw the returned error message.  If some other
     * error is thrown, it will not be caught.
     *
     * Otherwise it returns the result of passing `result.payload` to
     * `this.parsePayload`.
     */
  }, {
    key: "run",
    value: function () {
      var _run = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee() {
        var _this$connectParams, _this$connectParams2, method, params, result;
        return _regeneratorRuntime().wrap(function _callee$(_context) {
          while (1) switch (_context.prev = _context.next) {
            case 0:
              _this$connectParams = this.connectParams(), _this$connectParams2 = _slicedToArray(_this$connectParams, 2), method = _this$connectParams2[0], params = _this$connectParams2[1];
              if (!(TREZOR_DEV && method === _connectWeb["default"].signTransaction)) {
                _context.next = 4;
                break;
              }
              _context.next = 4;
              return _connectWeb["default"].blockchainSetCustomBackend({
                coin: "Regtest",
                blockchainLink: {
                  type: "blockbook",
                  url: [TREZOR_BLOCKBOOK_URL]
                }
              });
            case 4:
              if (!(typeof method === "function")) {
                _context.next = 13;
                break;
              }
              _context.next = 7;
              return method(params);
            case 7:
              result = _context.sent;
              if (result.success) {
                _context.next = 10;
                break;
              }
              throw new Error(result.payload.error);
            case 10:
              return _context.abrupt("return", this.parsePayload(result.payload));
            case 13:
              throw new Error("TrezorConnect method is not a function");
            case 14:
            case "end":
              return _context.stop();
          }
        }, _callee, this);
      }));
      function run() {
        return _run.apply(this, arguments);
      }
      return run;
    }()
    /**
     * Override this method in a subclass to return a 2-element array.
     *
     * The first element should be a functin to call, typically a
     * `TrezorConnect` method, e.g. `TrezorConnect.getAddress`.
     *
     * The second element should be the parameters to pass to this
     * function.
     *
     * By default, the function passed just throws an error.
     */
  }, {
    key: "connectParams",
    value: function connectParams() {
      return [function () {
        throw new Error("Override the `connectParams` method on a subclass of TrezorInteraction.");
      }, {}];
    }

    /**
     * Override this method in a subclass to parse the payload of a
     * successful response from the device.
     *
     * By default, the entire payload is returned.
     */
  }, {
    key: "parsePayload",
    value: function parsePayload(payload) {
      return payload;
    }
  }]);
  return TrezorInteraction;
}(_interaction.DirectKeystoreInteraction);
/**
 * Returns metadata about Trezor device.
 *
 * Includes model name, device label, firmware version, &
 * PIN/passphrase enablement.
 *
 * @example
 * import {TrezorGetMetadata} from "unchained-wallets";
 * const interaction = new TrezorGetMetadata();
 * const result = await interaction.run();
 * console.log(result);
 * {
 *   spec: "Model 1 v1.8.3 w/PIN",
 *   model: "Model 1",
 *   version: {
 *     major: 1,
 *     minor: 8,
 *     patch: 3,
 *     string: "1.8.3",
 *   },
 *   label: "My Trezor",
 *   pin: true,
 *   passphrase: false,
 * }
 */
exports.TrezorInteraction = TrezorInteraction;
var TrezorGetMetadata = /*#__PURE__*/function (_TrezorInteraction) {
  _inherits(TrezorGetMetadata, _TrezorInteraction);
  var _super2 = _createSuper(TrezorGetMetadata);
  /**
   * This class doesn't actually require a `network`.
   */
  function TrezorGetMetadata() {
    _classCallCheck(this, TrezorGetMetadata);
    return _super2.call(this, {
      network: null
    });
  }

  /**
   * It is underdocumented, but TrezorConnect does support the
   * `getFeatures` API call.
   *
   * See {@link https://github.com/trezor/connect/blob/v8/src/js/core/methods/GetFeatures.js}.
   */
  _createClass(TrezorGetMetadata, [{
    key: "connectParams",
    value: function connectParams() {
      return [_connectWeb["default"].getFeatures, {}];
    }

    /**
     * Parses Trezor device featuress into an appropriate metadata
     * shape.
     */
  }, {
    key: "parsePayload",
    value: function parsePayload(payload) {
      // Example result:
      //
      // {
      //   bootloader_hash: "5112...846e9"
      //   bootloader_mode: null
      //   device_id: "BDF9...F198"
      //   firmware_present: null
      //   flags: 0
      //   fw_major: null
      //   fw_minor: null
      //   fw_patch: null
      //   fw_vendor: null
      //   fw_vendor_keys: null
      //   imported: false
      //   initialized: true
      //   label: "My Trezor"
      //   language: null
      //   major_version: 1
      //   minor_version: 6
      //   model: "1"
      //   needs_backup: false
      //   no_backup: null
      //   passphrase_cached: false
      //   passphrase_protection: false
      //   patch_version: 3
      //   pin_cached: true
      //   pin_protection: true
      //   revision: "ef8...862d7"
      //   unfinished_backup: null
      //   vendor: "bitcointrezor.com"
      // }
      var major_version = payload.major_version,
        minor_version = payload.minor_version,
        patch_version = payload.patch_version,
        label = payload.label,
        model = payload.model,
        pin_protection = payload.pin_protection,
        passphrase_protection = payload.passphrase_protection;
      var spec = "Model ".concat(model, " v.").concat(major_version, ".").concat(minor_version, ".").concat(patch_version);
      if (pin_protection) {
        spec += " w/PIN";
      }
      if (passphrase_protection) {
        spec += " w/PASS";
      }
      return {
        spec: spec,
        model: "Model ".concat(model),
        version: {
          major: major_version,
          minor: minor_version,
          patch: patch_version,
          string: "".concat(major_version, ".").concat(minor_version, ".").concat(patch_version)
        },
        label: label,
        pin: pin_protection,
        passphrase: passphrase_protection
      };
    }
  }]);
  return TrezorGetMetadata;
}(TrezorInteraction);
/**
 * Base class for interactions exporting information about an HD node
 * at a given BIP32 path.
 *
 * You may want to use `TrezorExportPublicKey` or
 * `TrezorExportExtendedPublicKey` directly.
 *
 * @example
 * import {Network} from "unchained-bitcoin";
 * import {TrezorExportHDNode} from "unchained-wallets";
 * const interaction = new TrezorExportHDNode({network: Network.MAINNET, bip32Path: "m/48'/0'/0'/2'/0"});
 * const node = await interaction.run();
 * console.log(node); // {publicKey: "", xpub: "", ...}
 *
 */
exports.TrezorGetMetadata = TrezorGetMetadata;
var TrezorExportHDNode = /*#__PURE__*/function (_TrezorInteraction2) {
  _inherits(TrezorExportHDNode, _TrezorInteraction2);
  var _super3 = _createSuper(TrezorExportHDNode);
  function TrezorExportHDNode(_ref2) {
    var _this2;
    var network = _ref2.network,
      bip32Path = _ref2.bip32Path,
      _ref2$includeXFP = _ref2.includeXFP,
      includeXFP = _ref2$includeXFP === void 0 ? false : _ref2$includeXFP;
    _classCallCheck(this, TrezorExportHDNode);
    _this2 = _super3.call(this, {
      network: network
    });
    _defineProperty(_assertThisInitialized(_this2), "bip32Path", void 0);
    _defineProperty(_assertThisInitialized(_this2), "includeXFP", void 0);
    _defineProperty(_assertThisInitialized(_this2), "bip32ValidationErrorMessage", void 0);
    _this2.bip32Path = bip32Path;
    _this2.includeXFP = includeXFP;
    _this2.bip32ValidationErrorMessage = {};
    var bip32PathError = (0, _unchainedBitcoin.validateBIP32Path)(bip32Path);
    if (bip32PathError.length) {
      _this2.bip32ValidationErrorMessage = {
        text: bip32PathError,
        code: "trezor.bip32_path.path_error"
      };
    }
    return _this2;
  }

  /**
   * Adds messages related to warnings Trezor devices make depending
   * on the BIP32 path passed.
   */
  _createClass(TrezorExportHDNode, [{
    key: "messages",
    value: function messages() {
      var messages = _get(_getPrototypeOf(TrezorExportHDNode.prototype), "messages", this).call(this);
      var bip32PathSegments = (this.bip32Path || "").split("/");
      if (bip32PathSegments.length < 4) {
        // m, 45', 0', 0', ...
        messages.push({
          state: _interaction.PENDING,
          level: _interaction.ERROR,
          text: "BIP32 path must be at least depth 3.",
          code: "trezor.bip32_path.minimum"
        });
      }
      if (Object.entries(this.bip32ValidationErrorMessage).length) {
        messages.push({
          state: _interaction.PENDING,
          level: _interaction.ERROR,
          code: this.bip32ValidationErrorMessage.code,
          text: this.bip32ValidationErrorMessage.text
        });
      }
      messages.push({
        state: _interaction.ACTIVE,
        level: _interaction.INFO,
        text: "Confirm in the Trezor Connect window that you want to 'Export public key'. You may be prompted to enter your PIN.",
        code: "trezor.connect.export_hdnode"
      });
      return messages;
    }
  }, {
    key: "extractDetailsFromPayload",
    value: function extractDetailsFromPayload(_ref3) {
      var payload = _ref3.payload,
        pubkey = _ref3.pubkey;
      if (payload.length !== 2) {
        throw new Error("Payload does not have two responses.");
      }
      var keyMaterial = "";
      var rootFingerprint = "";
      for (var i = 0; i < payload.length; i++) {
        // Find the payload with bip32 = MULTISIG_ROOT to get xfp
        if (payload[i].serializedPath === _index.MULTISIG_ROOT) {
          var fp = payload[i].fingerprint;
          rootFingerprint = (0, _unchainedBitcoin.fingerprintToFixedLengthHex)(fp);
        } else {
          keyMaterial = pubkey ? payload[i].publicKey : payload[i].xpub;
        }
      }
      return {
        rootFingerprint: rootFingerprint,
        keyMaterial: keyMaterial
      };
    }

    /**
     * See {@link https://github.com/trezor/connect/blob/v8/docs/methods/getPublicKey.md}.
     */
  }, {
    key: "connectParams",
    value: function connectParams() {
      if (this.includeXFP) {
        return [_connectWeb["default"].getPublicKey, {
          bundle: [{
            path: this.bip32Path
          }, {
            path: _index.MULTISIG_ROOT
          }],
          coin: this.trezorCoin,
          crossChain: true
        }];
      }
      return [_connectWeb["default"].getPublicKey, {
        path: this.bip32Path,
        coin: this.trezorCoin,
        crossChain: true
      }];
    }
  }]);
  return TrezorExportHDNode;
}(TrezorInteraction);
/**
 * Returns the public key at a given BIP32 path.
 *
 * @example
 * import {Network} from "unchained-bitcoin";
 * import {TrezorExportPublicKey} from "unchained-wallets";
 * const interaction = new TrezorExportPublicKey({network: Network.MAINNET, bip32Path: "m/48'/0'/0'/2'/0"});
 * const publicKey = await interaction.run();
 * console.log(publicKey);
 * // "03..."
 */
exports.TrezorExportHDNode = TrezorExportHDNode;
var TrezorExportPublicKey = /*#__PURE__*/function (_TrezorExportHDNode) {
  _inherits(TrezorExportPublicKey, _TrezorExportHDNode);
  var _super4 = _createSuper(TrezorExportPublicKey);
  function TrezorExportPublicKey(_ref4) {
    var _this3;
    var network = _ref4.network,
      bip32Path = _ref4.bip32Path,
      _ref4$includeXFP = _ref4.includeXFP,
      includeXFP = _ref4$includeXFP === void 0 ? false : _ref4$includeXFP;
    _classCallCheck(this, TrezorExportPublicKey);
    _this3 = _super4.call(this, {
      network: network,
      bip32Path: bip32Path,
      includeXFP: includeXFP
    });
    _this3.includeXFP = includeXFP;
    return _this3;
  }

  /**
   * Parses the public key from the HD node response.
   *
   */
  _createClass(TrezorExportPublicKey, [{
    key: "parsePayload",
    value: function parsePayload(payload) {
      if (this.includeXFP) {
        var _this$extractDetailsF = this.extractDetailsFromPayload({
            payload: payload,
            pubkey: true
          }),
          rootFingerprint = _this$extractDetailsF.rootFingerprint,
          keyMaterial = _this$extractDetailsF.keyMaterial;
        return {
          rootFingerprint: rootFingerprint,
          publicKey: keyMaterial
        };
      }
      return payload.publicKey;
    }
  }]);
  return TrezorExportPublicKey;
}(TrezorExportHDNode);
/**
 * Returns the extended public key at a given BIP32 path.
 *
 * @example
 * import {Network} from "unchained-bitcoin";
 * import {TrezorExportExtendedPublicKey} from "unchained-wallets";
 * const interaction = new TrezorExportExtendedPublicKey({network: Network.MAINNET, bip32Path: "m/48'/0'/0'"});
 * const xpub = await interaction.run();
 * console.log(xpub);
 * // "xpub..."
 */
exports.TrezorExportPublicKey = TrezorExportPublicKey;
var TrezorExportExtendedPublicKey = /*#__PURE__*/function (_TrezorExportHDNode2) {
  _inherits(TrezorExportExtendedPublicKey, _TrezorExportHDNode2);
  var _super5 = _createSuper(TrezorExportExtendedPublicKey);
  function TrezorExportExtendedPublicKey(_ref5) {
    var _this4;
    var network = _ref5.network,
      bip32Path = _ref5.bip32Path,
      _ref5$includeXFP = _ref5.includeXFP,
      includeXFP = _ref5$includeXFP === void 0 ? false : _ref5$includeXFP;
    _classCallCheck(this, TrezorExportExtendedPublicKey);
    _this4 = _super5.call(this, {
      network: network,
      bip32Path: bip32Path,
      includeXFP: includeXFP
    });
    _this4.includeXFP = includeXFP;
    return _this4;
  }

  /**
   * Parses the extended public key from the HD node response.
   *
   * If asking for XFP, return object with xpub and the root fingerprint.
   */
  _createClass(TrezorExportExtendedPublicKey, [{
    key: "parsePayload",
    value: function parsePayload(payload) {
      if (this.includeXFP) {
        var _this$extractDetailsF2 = this.extractDetailsFromPayload({
            payload: payload,
            pubkey: false
          }),
          rootFingerprint = _this$extractDetailsF2.rootFingerprint,
          keyMaterial = _this$extractDetailsF2.keyMaterial;
        return {
          rootFingerprint: rootFingerprint,
          xpub: keyMaterial
        };
      }
      return payload.xpub;
    }
  }]);
  return TrezorExportExtendedPublicKey;
}(TrezorExportHDNode);
/**
 * Returns a signature for a bitcoin transaction with inputs from one
 * or many multisig addresses.
 *
 * - `inputs` is an array of `UTXO` objects from `unchained-bitcoin`
 * - `outputs` is an array of `TransactionOutput` objects from `unchained-bitcoin`
 * - `bip32Paths` is an array of (`string`) BIP32 paths, one for each input, identifying the path on this device to sign that input with
 *
 * @example
 * import {
 *   generateMultisigFromHex, TESTNET, P2SH,
 * } from "unchained-bitcoin";
 * import {TrezorSignMultisigTransaction} from "unchained-wallets";
 * const redeemScript = "5...ae";
 * const inputs = [
 *   {
 *     txid: "8d276c76b3550b145e44d35c5833bae175e0351b4a5c57dc1740387e78f57b11",
 *     index: 1,
 *     multisig: generateMultisigFromHex(TESTNET, P2SH, redeemScript),
 *     amountSats: '1234000'
 *   },
 *   // other inputs...
 * ];
 * const outputs = [
 *   {
 *     amountSats: '1299659',
 *     address: "2NGHod7V2TAAXC1iUdNmc6R8UUd4TVTuBmp"
 *   },
 *   // other outputs...
 * ];
 * const interaction = new TrezorSignMultisigTransaction({
 *   network: TESTNET,
 *   inputs,
 *   outputs,
 *   bip32Paths: ["m/45'/0'/0'/0", // add more, 1 per input],
 * });
 * const signature = await interaction.run();
 * console.log(signatures);
 * // ["ababab...", // 1 per input]
 */
exports.TrezorExportExtendedPublicKey = TrezorExportExtendedPublicKey;
var TrezorSignMultisigTransaction = /*#__PURE__*/function (_TrezorInteraction3) {
  _inherits(TrezorSignMultisigTransaction, _TrezorInteraction3);
  var _super6 = _createSuper(TrezorSignMultisigTransaction);
  function TrezorSignMultisigTransaction(_ref6) {
    var _this5;
    var network = _ref6.network,
      inputs = _ref6.inputs,
      outputs = _ref6.outputs,
      bip32Paths = _ref6.bip32Paths,
      psbt = _ref6.psbt,
      keyDetails = _ref6.keyDetails,
      returnSignatureArray = _ref6.returnSignatureArray;
    _classCallCheck(this, TrezorSignMultisigTransaction);
    _this5 = _super6.call(this, {
      network: network
    });
    _defineProperty(_assertThisInitialized(_this5), "inputs", void 0);
    _defineProperty(_assertThisInitialized(_this5), "outputs", void 0);
    _defineProperty(_assertThisInitialized(_this5), "bip32Paths", void 0);
    _defineProperty(_assertThisInitialized(_this5), "psbt", void 0);
    _defineProperty(_assertThisInitialized(_this5), "returnSignatureArray", void 0);
    _defineProperty(_assertThisInitialized(_this5), "pubkeys", void 0);
    if (!psbt || !keyDetails) {
      _this5.inputs = inputs;
      _this5.outputs = outputs;
      _this5.bip32Paths = bip32Paths;
    } else {
      _this5.psbt = psbt;
      _this5.returnSignatureArray = returnSignatureArray || false;
      var translatedPsbt = (0, _unchainedBitcoin.translatePSBT)(network, _unchainedBitcoin.P2SH, _this5.psbt, keyDetails);
      _this5.inputs = translatedPsbt?.unchainedInputs;
      _this5.outputs = translatedPsbt?.unchainedOutputs;
      _this5.bip32Paths = translatedPsbt?.bip32Derivations.map(function (b32d) {
        return b32d.path;
      });
      _this5.pubkeys = translatedPsbt?.bip32Derivations.map(function (b32d) {
        return b32d.pubkey;
      });
    }
    return _this5;
  }

  /**
   * Adds messages describing the signing flow.
   */
  _createClass(TrezorSignMultisigTransaction, [{
    key: "messages",
    value: function messages() {
      var messages = _get(_getPrototypeOf(TrezorSignMultisigTransaction.prototype), "messages", this).call(this);
      messages.push({
        state: _interaction.ACTIVE,
        level: _interaction.INFO,
        text: "Confirm in the Trezor Connect window that you want to 'Sign ".concat(this.network, " transaction'.  You may be prompted to enter your PIN."),
        code: "trezor.connect.sign"
      });
      messages.push({
        state: _interaction.ACTIVE,
        level: _interaction.INFO,
        version: "One",
        text: "Confirm each output on your Trezor device and approve the transaction.",
        messages: [{
          text: "For each output, your Trezor device will display the output amount and address.",
          action: TREZOR_RIGHT_BUTTON
        }, {
          text: "Your Trezor device will display the total output amounts and fee amount.",
          action: TREZOR_RIGHT_BUTTON
        }],
        code: "trezor.sign"
      });
      messages.push({
        state: _interaction.ACTIVE,
        level: _interaction.INFO,
        version: "T",
        text: "Confirm each output on your Trezor device and approve the transaction.",
        messages: [{
          text: "For each input, your Trezor device will display a \"Confirm path\" dialogue displaying the input BIP32 path.  It is safe to continue",
          action: TREZOR_RIGHT_BUTTON
        }, {
          text: "For each output, your Trezor device will display a \"Confirm sending\" dialogue displaying the output amount and address.",
          action: TREZOR_RIGHT_BUTTON
        }, {
          text: "Your Trezor device will display the \"Confirm transaction\" dialogue displaying the total output amount and fee amount.",
          action: TREZOR_PUSH_AND_HOLD_BUTTON
        }],
        code: "trezor.sign"
      });
      return messages;
    }

    /**
     * See {@link https://github.com/trezor/connect/blob/v8/docs/methods/signTransaction.md}.
     */
  }, {
    key: "connectParams",
    value: function connectParams() {
      var _this6 = this;
      return [_connectWeb["default"].signTransaction, {
        inputs: this.inputs.map(function (input, inputIndex) {
          return trezorInput(input, _this6.bip32Paths[inputIndex]);
        }),
        outputs: this.outputs.map(function (output) {
          return trezorOutput(output);
        }),
        coin: this.trezorCoin
      }];
    }

    /**
     * Parses the signature(s) out of the response payload.
     *
     * Ensures each input's signature hasa a trailing `...01` {@link https://bitcoin.org/en/glossary/sighash-all SIGHASH_ALL} byte.
     */
  }, {
    key: "parsePayload",
    value: function parsePayload(payload) {
      // If we were passed a PSBT initially, we want to return a PSBT with partial signatures
      // rather than the normal array of signatures.
      if (this.psbt && !this.returnSignatureArray) {
        return (0, _unchainedBitcoin.addSignaturesToPSBT)(this.network, this.psbt, this.pubkeys, this.parseSignature(payload.signatures, "buffer"));
      } else {
        return this.parseSignature(payload.signatures, "hex");
      }
    }
  }]);
  return TrezorSignMultisigTransaction;
}(TrezorInteraction);
/**
 * Shows a multisig address on the device and prompts the user to
 * confirm it.
 * If the optional publicKey parameter is used, the public key at
 * the given BIP32 path is checked, returning an error if they don't match.
 *
 * Without the publicKey parameter, this function simply checks that the
 * public key at the given BIP32 path is in the redeemscript (with
 * validation on-device.
 *
 * @example
 * import {
 *   generateMultisigFromPublicKeys, Network, P2SH,
 * } from "unchained-bitcoin";
 * import {TrezorConfirmMultisigAddress} from "unchained-wallets";
 * const multisig = generateMultisigFromPublicKeys(Network.MAINNET, P2SH, 2, "03a...", "03b...");
 * const interaction = new TrezorConfirmMultisigAddress({network: Network.MAINNET, bip32Path: "m/45'/0'/0'/0/0", multisig});
 * await interaction.run();
 */
exports.TrezorSignMultisigTransaction = TrezorSignMultisigTransaction;
var TrezorConfirmMultisigAddress = /*#__PURE__*/function (_TrezorInteraction4) {
  _inherits(TrezorConfirmMultisigAddress, _TrezorInteraction4);
  var _super7 = _createSuper(TrezorConfirmMultisigAddress);
  function TrezorConfirmMultisigAddress(_ref7) {
    var _this7;
    var network = _ref7.network,
      bip32Path = _ref7.bip32Path,
      multisig = _ref7.multisig,
      publicKey = _ref7.publicKey;
    _classCallCheck(this, TrezorConfirmMultisigAddress);
    _this7 = _super7.call(this, {
      network: network
    });
    _defineProperty(_assertThisInitialized(_this7), "bip32Path", void 0);
    _defineProperty(_assertThisInitialized(_this7), "multisig", void 0);
    _defineProperty(_assertThisInitialized(_this7), "publicKey", void 0);
    _this7.bip32Path = bip32Path;
    _this7.multisig = multisig;
    _this7.publicKey = publicKey;
    return _this7;
  }

  /**
   * Adds messages about BIP32 path warnings.
   */
  _createClass(TrezorConfirmMultisigAddress, [{
    key: "messages",
    value: function messages() {
      var messages = _get(_getPrototypeOf(TrezorConfirmMultisigAddress.prototype), "messages", this).call(this);
      if (this.publicKey) {
        messages.push({
          state: _interaction.ACTIVE,
          level: _interaction.INFO,
          text: "Confirm in the Trezor Connect window that you want to \u2018Export multiple ".concat(this.trezorCoin, " addresses\u2019. You may be prompted to enter your PIN. You may also receive a warning about your selected BIP32 path."),
          code: "trezor.connect.confirm_address"
        });
      } else {
        messages.push({
          state: _interaction.ACTIVE,
          level: _interaction.INFO,
          text: "Confirm in the Trezor Connect window that you want to 'Export ".concat(this.trezorCoin, " address'.  You may be prompted to enter your PIN."),
          code: "trezor.connect.confirm_address"
        });
      }
      messages.push({
        state: _interaction.ACTIVE,
        level: _interaction.INFO,
        version: "One",
        text: "It is safe to continue and confirm the address on your Trezor device.",
        messages: [
        // FIXME this only shows up on P2SH?
        {
          text: "Your Trezor device may display a warning \"Wrong address path for selected coin\".  It is safe to continue",
          action: TREZOR_RIGHT_BUTTON
        }, {
          text: "Your Trezor device will display the multisig address and BIP32 path.",
          action: TREZOR_RIGHT_BUTTON
        }],
        code: "trezor.confirm_address"
      });
      messages.push({
        state: _interaction.ACTIVE,
        level: _interaction.INFO,
        version: "T",
        text: "Confirm the addresss on your Trezor device.",
        messages: [{
          text: "For each signer in your quorum, your Trezor device will display a \"Confirm path\" dialogue displaying the signer's BIP32 path.  It is safe to continue",
          action: TREZOR_RIGHT_BUTTON
        }, {
          text: "Your Trezor device will display the multisig address.",
          action: TREZOR_RIGHT_BUTTON
        }],
        code: "trezor.confirm_address"
      });
      return messages;
    }

    /**
     * See {@link https://github.com/trezor/connect/blob/v8/docs/methods/getAddress.md}.
     */
  }, {
    key: "connectParams",
    value: function connectParams() {
      if (this.publicKey) {
        return [_connectWeb["default"].getAddress, {
          bundle: [{
            path: this.bip32Path,
            showOnTrezor: false,
            coin: this.trezorCoin,
            crossChain: true
          }, {
            path: this.bip32Path,
            address: (0, _unchainedBitcoin.multisigAddress)(this.multisig),
            showOnTrezor: true,
            coin: this.trezorCoin,
            crossChain: true,
            multisig: {
              m: (0, _unchainedBitcoin.multisigRequiredSigners)(this.multisig),
              pubkeys: (0, _unchainedBitcoin.multisigPublicKeys)(this.multisig).map(function (publicKey) {
                return trezorPublicKey(publicKey);
              })
            },
            scriptType: ADDRESS_SCRIPT_TYPES[(0, _unchainedBitcoin.multisigAddressType)(this.multisig)]
          }]
        }];
      } else {
        return [_connectWeb["default"].getAddress, {
          path: this.bip32Path,
          address: (0, _unchainedBitcoin.multisigAddress)(this.multisig),
          showOnTrezor: true,
          coin: this.trezorCoin,
          crossChain: true,
          multisig: {
            m: (0, _unchainedBitcoin.multisigRequiredSigners)(this.multisig),
            pubkeys: (0, _unchainedBitcoin.multisigPublicKeys)(this.multisig).map(function (publicKey) {
              return trezorPublicKey(publicKey);
            })
          },
          scriptType: ADDRESS_SCRIPT_TYPES[(0, _unchainedBitcoin.multisigAddressType)(this.multisig)]
        }];
      }
    }
  }, {
    key: "parsePayload",
    value: function parsePayload(payload) {
      if (!this.publicKey) {
        return payload;
      }
      var keyPair = _bitcoinjsLib.ECPair.fromPublicKey(Buffer.from(this.publicKey, "hex"));
      var payment = {
        pubkey: keyPair.publicKey
      };
      if (this.network) {
        payment.network = (0, _unchainedBitcoin.networkData)(this.network);
      }
      var _payments$p2pkh = _bitcoinjsLib.payments.p2pkh(payment),
        address = _payments$p2pkh.address;
      if (address !== payload[0].address && address !== payload[1].address) {
        throw new Error("Wrong public key specified");
      }
      return payload;
    }
  }]);
  return TrezorConfirmMultisigAddress;
}(TrezorInteraction);
/**
 * Returns a signature for a message given a bip32 path.
 */
exports.TrezorConfirmMultisigAddress = TrezorConfirmMultisigAddress;
var TrezorSignMessage = /*#__PURE__*/function (_TrezorInteraction5) {
  _inherits(TrezorSignMessage, _TrezorInteraction5);
  var _super8 = _createSuper(TrezorSignMessage);
  function TrezorSignMessage(_ref8) {
    var _this8;
    var _ref8$network = _ref8.network,
      network = _ref8$network === void 0 ? "" : _ref8$network,
      _ref8$bip32Path = _ref8.bip32Path,
      bip32Path = _ref8$bip32Path === void 0 ? "" : _ref8$bip32Path,
      _ref8$message = _ref8.message,
      message = _ref8$message === void 0 ? "" : _ref8$message;
    _classCallCheck(this, TrezorSignMessage);
    _this8 = _super8.call(this, {
      network: _unchainedBitcoin.Network[network]
    });
    _defineProperty(_assertThisInitialized(_this8), "bip32Path", void 0);
    _defineProperty(_assertThisInitialized(_this8), "message", void 0);
    _defineProperty(_assertThisInitialized(_this8), "bip32ValidationErrorMessage", void 0);
    _this8.bip32Path = bip32Path;
    _this8.message = message;
    _this8.bip32ValidationErrorMessage = {};
    var bip32PathError = (0, _unchainedBitcoin.validateBIP32Path)(bip32Path);
    if (bip32PathError.length) {
      _this8.bip32ValidationErrorMessage = {
        text: bip32PathError,
        code: "trezor.bip32_path.path_error"
      };
    }
    return _this8;
  }

  /**
   * Adds messages describing the signing flow.
   */
  _createClass(TrezorSignMessage, [{
    key: "messages",
    value: function messages() {
      var messages = _get(_getPrototypeOf(TrezorSignMessage.prototype), "messages", this).call(this);
      var bip32PathSegments = (this.bip32Path || "").split("/");
      if (bip32PathSegments.length < 4) {
        // m, 45', 0', 0', ...
        messages.push({
          state: _interaction.PENDING,
          level: _interaction.ERROR,
          text: "BIP32 path must be at least depth 3.",
          code: "trezor.bip32_path.minimum"
        });
      }
      if (Object.entries(this.bip32ValidationErrorMessage).length) {
        messages.push({
          state: _interaction.PENDING,
          level: _interaction.ERROR,
          code: this.bip32ValidationErrorMessage.code,
          text: this.bip32ValidationErrorMessage.text
        });
      }
      messages.push({
        state: _interaction.ACTIVE,
        level: _interaction.INFO,
        text: "Confirm in the Trezor Connect window that you want to 'Sign message'.  You may be prompted to enter your PIN.",
        code: "trezor.connect.sign"
      });
      messages.push({
        state: _interaction.ACTIVE,
        level: _interaction.INFO,
        text: "Confirm the message to be signed on your Trezor device and approve for signing.",
        code: "trezor.sign"
      });
      return messages;
    }

    /**
     * See {@link https://github.com/trezor/connect/blob/v8/docs/methods/signMessage.md}.
     */
  }, {
    key: "connectParams",
    value: function connectParams() {
      return [_connectWeb["default"].signMessage, {
        path: this.bip32Path,
        message: this.message
      }];
    }
  }]);
  return TrezorSignMessage;
}(TrezorInteraction);
/**
 * Returns the Trezor API version of the given network.
 */
exports.TrezorSignMessage = TrezorSignMessage;
function trezorCoin(network) {
  var testnet_network = TREZOR_DEV ? "Regtest" : "Testnet";
  return network === _unchainedBitcoin.Network.MAINNET ? "Bitcoin" : testnet_network;
}
function trezorInput(input, bip32Path) {
  var requiredSigners = (0, _unchainedBitcoin.multisigRequiredSigners)(input.multisig);
  var publicKeys = (0, _unchainedBitcoin.multisigPublicKeys)(input.multisig);
  var addressType = (0, _unchainedBitcoin.multisigAddressType)(input.multisig);
  var spendType = ADDRESS_SCRIPT_TYPES[addressType];
  return _objectSpread({
    script_type: spendType,
    multisig: {
      m: requiredSigners,
      pubkeys: publicKeys.map(function (publicKey) {
        return trezorPublicKey(publicKey);
      }),
      signatures: Array(publicKeys.length).fill("")
    },
    prev_hash: input.txid,
    prev_index: input.index,
    address_n: (0, _unchainedBitcoin.bip32PathToSequence)(bip32Path)
  }, input.amountSats && {
    amount: new _bignumber["default"](input.amountSats).toString()
  });
}
function trezorPublicKey(publicKey) {
  return {
    address_n: [],
    node: {
      // FIXME are all these 0's OK?
      depth: 0,
      child_num: 0,
      fingerprint: 0,
      chain_code: "0".repeat(64),
      public_key: publicKey
    }
  };
}
function trezorOutput(output) {
  return {
    amount: new _bignumber["default"](output.amountSats).toFixed(0),
    address: output.address,
    script_type: "PAYTOADDRESS"
  };
}