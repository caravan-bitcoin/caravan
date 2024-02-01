"use strict";

require("core-js/modules/es6.object.define-properties");
require("core-js/modules/es7.object.get-own-property-descriptors");
require("core-js/modules/es6.array.filter");
require("core-js/modules/es6.array.index-of");
require("core-js/modules/es6.string.iterator");
require("core-js/modules/es6.array.from");
require("core-js/modules/es6.array.is-array");
require("core-js/modules/es6.array.for-each");
require("core-js/modules/es6.reflect.get");
require("core-js/modules/es6.object.create");
require("core-js/modules/es6.reflect.construct");
require("core-js/modules/es6.function.bind");
require("core-js/modules/es6.object.set-prototype-of");
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.LedgerV2SignMultisigTransaction = exports.LedgerSignMultisigTransaction = exports.LedgerSignMessage = exports.LedgerRegisterWalletPolicy = exports.LedgerInteraction = exports.LedgerGetMetadata = exports.LedgerExportPublicKey = exports.LedgerExportExtendedPublicKey = exports.LedgerDashboardInteraction = exports.LedgerConfirmMultisigAddress = exports.LedgerBitcoinV2WithRegistrationInteraction = exports.LedgerBitcoinInteraction = exports.LEDGER_V2 = exports.LEDGER_RIGHT_BUTTON = exports.LEDGER_LEFT_BUTTON = exports.LEDGER_BOTH_BUTTONS = exports.LEDGER = void 0;
require("core-js/modules/es6.promise");
require("core-js/modules/es6.array.map");
require("core-js/modules/web.dom.iterable");
require("core-js/modules/es6.array.iterator");
require("core-js/modules/es6.object.keys");
require("core-js/modules/es6.regexp.match");
require("core-js/modules/es6.regexp.replace");
require("core-js/modules/es6.regexp.to-string");
require("core-js/modules/es6.date.to-string");
require("core-js/modules/es6.object.to-string");
require("core-js/modules/es7.array.includes");
require("core-js/modules/es6.string.includes");
require("core-js/modules/es6.regexp.split");
require("core-js/modules/es6.function.name");
require("regenerator-runtime/runtime");
require("core-js/modules/es6.number.constructor");
require("core-js/modules/es7.symbol.async-iterator");
require("core-js/modules/es6.symbol");
require("core-js/modules/es6.object.define-property");
var _unchainedBitcoin = require("unchained-bitcoin");
var _interaction = require("./interaction");
var _splitTransaction = require("@ledgerhq/hw-app-btc/lib/splitTransaction");
var _serializeTransaction = require("@ledgerhq/hw-app-btc/lib/serializeTransaction");
var _getAppAndVersion = require("@ledgerhq/hw-app-btc/lib/getAppAndVersion");
var _ledgerBitcoin = require("ledger-bitcoin");
var _policy = require("./policy");
var _hwTransportU2f = _interopRequireDefault(require("@ledgerhq/hw-transport-u2f"));
var _hwTransportWebusb = _interopRequireDefault(require("@ledgerhq/hw-transport-webusb"));
var _hwAppBtc = _interopRequireDefault(require("@ledgerhq/hw-app-btc"));
var _excluded = ["policyHmac"],
  _excluded2 = ["verify", "policyHmac"],
  _excluded3 = ["policyHmac", "display", "expected", "bip32Path"],
  _excluded4 = ["psbt", "progressCallback", "policyHmac", "returnSignatureArray"];
function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }
function ownKeys(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); enumerableOnly && (symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; })), keys.push.apply(keys, symbols); } return keys; }
function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = null != arguments[i] ? arguments[i] : {}; i % 2 ? ownKeys(Object(source), !0).forEach(function (key) { _defineProperty(target, key, source[key]); }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)) : ownKeys(Object(source)).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } return target; }
function _objectWithoutProperties(source, excluded) { if (source == null) return {}; var target = _objectWithoutPropertiesLoose(source, excluded); var key, i; if (Object.getOwnPropertySymbols) { var sourceSymbolKeys = Object.getOwnPropertySymbols(source); for (i = 0; i < sourceSymbolKeys.length; i++) { key = sourceSymbolKeys[i]; if (excluded.indexOf(key) >= 0) continue; if (!Object.prototype.propertyIsEnumerable.call(source, key)) continue; target[key] = source[key]; } } return target; }
function _objectWithoutPropertiesLoose(source, excluded) { if (source == null) return {}; var target = {}; var sourceKeys = Object.keys(source); var key, i; for (i = 0; i < sourceKeys.length; i++) { key = sourceKeys[i]; if (excluded.indexOf(key) >= 0) continue; target[key] = source[key]; } return target; }
function _toConsumableArray(arr) { return _arrayWithoutHoles(arr) || _iterableToArray(arr) || _unsupportedIterableToArray(arr) || _nonIterableSpread(); }
function _nonIterableSpread() { throw new TypeError("Invalid attempt to spread non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }
function _iterableToArray(iter) { if (typeof Symbol !== "undefined" && iter[Symbol.iterator] != null || iter["@@iterator"] != null) return Array.from(iter); }
function _arrayWithoutHoles(arr) { if (Array.isArray(arr)) return _arrayLikeToArray(arr); }
function _slicedToArray(arr, i) { return _arrayWithHoles(arr) || _iterableToArrayLimit(arr, i) || _unsupportedIterableToArray(arr, i) || _nonIterableRest(); }
function _nonIterableRest() { throw new TypeError("Invalid attempt to destructure non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }
function _unsupportedIterableToArray(o, minLen) { if (!o) return; if (typeof o === "string") return _arrayLikeToArray(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return Array.from(o); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen); }
function _arrayLikeToArray(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) arr2[i] = arr[i]; return arr2; }
function _iterableToArrayLimit(arr, i) { var _i = null == arr ? null : "undefined" != typeof Symbol && arr[Symbol.iterator] || arr["@@iterator"]; if (null != _i) { var _s, _e, _x, _r, _arr = [], _n = !0, _d = !1; try { if (_x = (_i = _i.call(arr)).next, 0 === i) { if (Object(_i) !== _i) return; _n = !1; } else for (; !(_n = (_s = _x.call(_i)).done) && (_arr.push(_s.value), _arr.length !== i); _n = !0); } catch (err) { _d = !0, _e = err; } finally { try { if (!_n && null != _i["return"] && (_r = _i["return"](), Object(_r) !== _r)) return; } finally { if (_d) throw _e; } } return _arr; } }
function _arrayWithHoles(arr) { if (Array.isArray(arr)) return arr; }
function _regeneratorRuntime() { "use strict"; /*! regenerator-runtime -- Copyright (c) 2014-present, Facebook, Inc. -- license (MIT): https://github.com/facebook/regenerator/blob/main/LICENSE */ _regeneratorRuntime = function _regeneratorRuntime() { return exports; }; var exports = {}, Op = Object.prototype, hasOwn = Op.hasOwnProperty, defineProperty = Object.defineProperty || function (obj, key, desc) { obj[key] = desc.value; }, $Symbol = "function" == typeof Symbol ? Symbol : {}, iteratorSymbol = $Symbol.iterator || "@@iterator", asyncIteratorSymbol = $Symbol.asyncIterator || "@@asyncIterator", toStringTagSymbol = $Symbol.toStringTag || "@@toStringTag"; function define(obj, key, value) { return Object.defineProperty(obj, key, { value: value, enumerable: !0, configurable: !0, writable: !0 }), obj[key]; } try { define({}, ""); } catch (err) { define = function define(obj, key, value) { return obj[key] = value; }; } function wrap(innerFn, outerFn, self, tryLocsList) { var protoGenerator = outerFn && outerFn.prototype instanceof Generator ? outerFn : Generator, generator = Object.create(protoGenerator.prototype), context = new Context(tryLocsList || []); return defineProperty(generator, "_invoke", { value: makeInvokeMethod(innerFn, self, context) }), generator; } function tryCatch(fn, obj, arg) { try { return { type: "normal", arg: fn.call(obj, arg) }; } catch (err) { return { type: "throw", arg: err }; } } exports.wrap = wrap; var ContinueSentinel = {}; function Generator() {} function GeneratorFunction() {} function GeneratorFunctionPrototype() {} var IteratorPrototype = {}; define(IteratorPrototype, iteratorSymbol, function () { return this; }); var getProto = Object.getPrototypeOf, NativeIteratorPrototype = getProto && getProto(getProto(values([]))); NativeIteratorPrototype && NativeIteratorPrototype !== Op && hasOwn.call(NativeIteratorPrototype, iteratorSymbol) && (IteratorPrototype = NativeIteratorPrototype); var Gp = GeneratorFunctionPrototype.prototype = Generator.prototype = Object.create(IteratorPrototype); function defineIteratorMethods(prototype) { ["next", "throw", "return"].forEach(function (method) { define(prototype, method, function (arg) { return this._invoke(method, arg); }); }); } function AsyncIterator(generator, PromiseImpl) { function invoke(method, arg, resolve, reject) { var record = tryCatch(generator[method], generator, arg); if ("throw" !== record.type) { var result = record.arg, value = result.value; return value && "object" == _typeof(value) && hasOwn.call(value, "__await") ? PromiseImpl.resolve(value.__await).then(function (value) { invoke("next", value, resolve, reject); }, function (err) { invoke("throw", err, resolve, reject); }) : PromiseImpl.resolve(value).then(function (unwrapped) { result.value = unwrapped, resolve(result); }, function (error) { return invoke("throw", error, resolve, reject); }); } reject(record.arg); } var previousPromise; defineProperty(this, "_invoke", { value: function value(method, arg) { function callInvokeWithMethodAndArg() { return new PromiseImpl(function (resolve, reject) { invoke(method, arg, resolve, reject); }); } return previousPromise = previousPromise ? previousPromise.then(callInvokeWithMethodAndArg, callInvokeWithMethodAndArg) : callInvokeWithMethodAndArg(); } }); } function makeInvokeMethod(innerFn, self, context) { var state = "suspendedStart"; return function (method, arg) { if ("executing" === state) throw new Error("Generator is already running"); if ("completed" === state) { if ("throw" === method) throw arg; return doneResult(); } for (context.method = method, context.arg = arg;;) { var delegate = context.delegate; if (delegate) { var delegateResult = maybeInvokeDelegate(delegate, context); if (delegateResult) { if (delegateResult === ContinueSentinel) continue; return delegateResult; } } if ("next" === context.method) context.sent = context._sent = context.arg;else if ("throw" === context.method) { if ("suspendedStart" === state) throw state = "completed", context.arg; context.dispatchException(context.arg); } else "return" === context.method && context.abrupt("return", context.arg); state = "executing"; var record = tryCatch(innerFn, self, context); if ("normal" === record.type) { if (state = context.done ? "completed" : "suspendedYield", record.arg === ContinueSentinel) continue; return { value: record.arg, done: context.done }; } "throw" === record.type && (state = "completed", context.method = "throw", context.arg = record.arg); } }; } function maybeInvokeDelegate(delegate, context) { var methodName = context.method, method = delegate.iterator[methodName]; if (undefined === method) return context.delegate = null, "throw" === methodName && delegate.iterator["return"] && (context.method = "return", context.arg = undefined, maybeInvokeDelegate(delegate, context), "throw" === context.method) || "return" !== methodName && (context.method = "throw", context.arg = new TypeError("The iterator does not provide a '" + methodName + "' method")), ContinueSentinel; var record = tryCatch(method, delegate.iterator, context.arg); if ("throw" === record.type) return context.method = "throw", context.arg = record.arg, context.delegate = null, ContinueSentinel; var info = record.arg; return info ? info.done ? (context[delegate.resultName] = info.value, context.next = delegate.nextLoc, "return" !== context.method && (context.method = "next", context.arg = undefined), context.delegate = null, ContinueSentinel) : info : (context.method = "throw", context.arg = new TypeError("iterator result is not an object"), context.delegate = null, ContinueSentinel); } function pushTryEntry(locs) { var entry = { tryLoc: locs[0] }; 1 in locs && (entry.catchLoc = locs[1]), 2 in locs && (entry.finallyLoc = locs[2], entry.afterLoc = locs[3]), this.tryEntries.push(entry); } function resetTryEntry(entry) { var record = entry.completion || {}; record.type = "normal", delete record.arg, entry.completion = record; } function Context(tryLocsList) { this.tryEntries = [{ tryLoc: "root" }], tryLocsList.forEach(pushTryEntry, this), this.reset(!0); } function values(iterable) { if (iterable) { var iteratorMethod = iterable[iteratorSymbol]; if (iteratorMethod) return iteratorMethod.call(iterable); if ("function" == typeof iterable.next) return iterable; if (!isNaN(iterable.length)) { var i = -1, next = function next() { for (; ++i < iterable.length;) if (hasOwn.call(iterable, i)) return next.value = iterable[i], next.done = !1, next; return next.value = undefined, next.done = !0, next; }; return next.next = next; } } return { next: doneResult }; } function doneResult() { return { value: undefined, done: !0 }; } return GeneratorFunction.prototype = GeneratorFunctionPrototype, defineProperty(Gp, "constructor", { value: GeneratorFunctionPrototype, configurable: !0 }), defineProperty(GeneratorFunctionPrototype, "constructor", { value: GeneratorFunction, configurable: !0 }), GeneratorFunction.displayName = define(GeneratorFunctionPrototype, toStringTagSymbol, "GeneratorFunction"), exports.isGeneratorFunction = function (genFun) { var ctor = "function" == typeof genFun && genFun.constructor; return !!ctor && (ctor === GeneratorFunction || "GeneratorFunction" === (ctor.displayName || ctor.name)); }, exports.mark = function (genFun) { return Object.setPrototypeOf ? Object.setPrototypeOf(genFun, GeneratorFunctionPrototype) : (genFun.__proto__ = GeneratorFunctionPrototype, define(genFun, toStringTagSymbol, "GeneratorFunction")), genFun.prototype = Object.create(Gp), genFun; }, exports.awrap = function (arg) { return { __await: arg }; }, defineIteratorMethods(AsyncIterator.prototype), define(AsyncIterator.prototype, asyncIteratorSymbol, function () { return this; }), exports.AsyncIterator = AsyncIterator, exports.async = function (innerFn, outerFn, self, tryLocsList, PromiseImpl) { void 0 === PromiseImpl && (PromiseImpl = Promise); var iter = new AsyncIterator(wrap(innerFn, outerFn, self, tryLocsList), PromiseImpl); return exports.isGeneratorFunction(outerFn) ? iter : iter.next().then(function (result) { return result.done ? result.value : iter.next(); }); }, defineIteratorMethods(Gp), define(Gp, toStringTagSymbol, "Generator"), define(Gp, iteratorSymbol, function () { return this; }), define(Gp, "toString", function () { return "[object Generator]"; }), exports.keys = function (val) { var object = Object(val), keys = []; for (var key in object) keys.push(key); return keys.reverse(), function next() { for (; keys.length;) { var key = keys.pop(); if (key in object) return next.value = key, next.done = !1, next; } return next.done = !0, next; }; }, exports.values = values, Context.prototype = { constructor: Context, reset: function reset(skipTempReset) { if (this.prev = 0, this.next = 0, this.sent = this._sent = undefined, this.done = !1, this.delegate = null, this.method = "next", this.arg = undefined, this.tryEntries.forEach(resetTryEntry), !skipTempReset) for (var name in this) "t" === name.charAt(0) && hasOwn.call(this, name) && !isNaN(+name.slice(1)) && (this[name] = undefined); }, stop: function stop() { this.done = !0; var rootRecord = this.tryEntries[0].completion; if ("throw" === rootRecord.type) throw rootRecord.arg; return this.rval; }, dispatchException: function dispatchException(exception) { if (this.done) throw exception; var context = this; function handle(loc, caught) { return record.type = "throw", record.arg = exception, context.next = loc, caught && (context.method = "next", context.arg = undefined), !!caught; } for (var i = this.tryEntries.length - 1; i >= 0; --i) { var entry = this.tryEntries[i], record = entry.completion; if ("root" === entry.tryLoc) return handle("end"); if (entry.tryLoc <= this.prev) { var hasCatch = hasOwn.call(entry, "catchLoc"), hasFinally = hasOwn.call(entry, "finallyLoc"); if (hasCatch && hasFinally) { if (this.prev < entry.catchLoc) return handle(entry.catchLoc, !0); if (this.prev < entry.finallyLoc) return handle(entry.finallyLoc); } else if (hasCatch) { if (this.prev < entry.catchLoc) return handle(entry.catchLoc, !0); } else { if (!hasFinally) throw new Error("try statement without catch or finally"); if (this.prev < entry.finallyLoc) return handle(entry.finallyLoc); } } } }, abrupt: function abrupt(type, arg) { for (var i = this.tryEntries.length - 1; i >= 0; --i) { var entry = this.tryEntries[i]; if (entry.tryLoc <= this.prev && hasOwn.call(entry, "finallyLoc") && this.prev < entry.finallyLoc) { var finallyEntry = entry; break; } } finallyEntry && ("break" === type || "continue" === type) && finallyEntry.tryLoc <= arg && arg <= finallyEntry.finallyLoc && (finallyEntry = null); var record = finallyEntry ? finallyEntry.completion : {}; return record.type = type, record.arg = arg, finallyEntry ? (this.method = "next", this.next = finallyEntry.finallyLoc, ContinueSentinel) : this.complete(record); }, complete: function complete(record, afterLoc) { if ("throw" === record.type) throw record.arg; return "break" === record.type || "continue" === record.type ? this.next = record.arg : "return" === record.type ? (this.rval = this.arg = record.arg, this.method = "return", this.next = "end") : "normal" === record.type && afterLoc && (this.next = afterLoc), ContinueSentinel; }, finish: function finish(finallyLoc) { for (var i = this.tryEntries.length - 1; i >= 0; --i) { var entry = this.tryEntries[i]; if (entry.finallyLoc === finallyLoc) return this.complete(entry.completion, entry.afterLoc), resetTryEntry(entry), ContinueSentinel; } }, "catch": function _catch(tryLoc) { for (var i = this.tryEntries.length - 1; i >= 0; --i) { var entry = this.tryEntries[i]; if (entry.tryLoc === tryLoc) { var record = entry.completion; if ("throw" === record.type) { var thrown = record.arg; resetTryEntry(entry); } return thrown; } } throw new Error("illegal catch attempt"); }, delegateYield: function delegateYield(iterable, resultName, nextLoc) { return this.delegate = { iterator: values(iterable), resultName: resultName, nextLoc: nextLoc }, "next" === this.method && (this.arg = undefined), ContinueSentinel; } }, exports; }
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
function _typeof(obj) { "@babel/helpers - typeof"; return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (obj) { return typeof obj; } : function (obj) { return obj && "function" == typeof Symbol && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }, _typeof(obj); }
function _defineProperty(obj, key, value) { key = _toPropertyKey(key); if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }
function _toPropertyKey(arg) { var key = _toPrimitive(arg, "string"); return _typeof(key) === "symbol" ? key : String(key); }
function _toPrimitive(input, hint) { if (_typeof(input) !== "object" || input === null) return input; var prim = input[Symbol.toPrimitive]; if (prim !== undefined) { var res = prim.call(input, hint || "default"); if (_typeof(res) !== "object") return res; throw new TypeError("@@toPrimitive must return a primitive value."); } return (hint === "string" ? String : Number)(input); } /**
                                                                                                                                                                                                                                                                                                                                                                                               * This module provides classes for Ledger hardware wallets.
                                                                                                                                                                                                                                                                                                                                                                                               *
                                                                                                                                                                                                                                                                                                                                                                                               * The base classes provided are `LedgerDashboardInteraction` and
                                                                                                                                                                                                                                                                                                                                                                                               * `LedgerBitcoinInteraction` for interactions requiring being in the
                                                                                                                                                                                                                                                                                                                                                                                               * Ledger dashboard vs. bitcoin app, respectively.
                                                                                                                                                                                                                                                                                                                                                                                               *
                                                                                                                                                                                                                                                                                                                                                                                               * The following API classes are implemented:
                                                                                                                                                                                                                                                                                                                                                                                               *
                                                                                                                                                                                                                                                                                                                                                                                               * * LedgerGetMetadata
                                                                                                                                                                                                                                                                                                                                                                                               * * LedgerExportPublicKey
                                                                                                                                                                                                                                                                                                                                                                                               * * LedgerExportExtendedPublicKey
                                                                                                                                                                                                                                                                                                                                                                                               * * LedgerSignMultisigTransaction
                                                                                                                                                                                                                                                                                                                                                                                               * * LedgerSignMessage
                                                                                                                                                                                                                                                                                                                                                                                               */
/**
 * Constant defining Ledger interactions.
 */
var LEDGER = "ledger";
exports.LEDGER = LEDGER;
var LEDGER_V2 = "ledger_v2";
exports.LEDGER_V2 = LEDGER_V2;
/**
 * Constant representing the action of pushing the left button on a
 * Ledger device.
 */
var LEDGER_LEFT_BUTTON = "ledger_left_button";

/**
 * Constant representing the action of pushing the right button on a
 * Ledger device.
 */
exports.LEDGER_LEFT_BUTTON = LEDGER_LEFT_BUTTON;
var LEDGER_RIGHT_BUTTON = "ledger_right_button";

/**
 * Constant representing the action of pushing both buttons on a
 * Ledger device.
 */
exports.LEDGER_RIGHT_BUTTON = LEDGER_RIGHT_BUTTON;
var LEDGER_BOTH_BUTTONS = "ledger_both_buttons";
exports.LEDGER_BOTH_BUTTONS = LEDGER_BOTH_BUTTONS;
/**
 * Base class for interactions with Ledger hardware wallets.
 *
 * Subclasses must implement their own `run()` method.  They may use
 * the `withTransport` and `withApp` methods to connect to the Ledger
 * API's transport or app layers, respectively.
 *
 * Errors are not caught, so users of this class (and its subclasses)
 * should use `try...catch` as always.
 *
 * @example
 * import {LedgerInteraction} from "unchained-wallets";
 * // Simple subclass
 *
 * class SimpleLedgerInteraction extends LedgerInteraction {
 *
 *   constructor({param}) {
 *     super({});
 *     this.param =  param;
 *   }
 *
 *   async run() {
 *     return await this.withApp(async (app, transport) => {
 *       return app.doSomething(this.param); // Not a real Ledger API call
 *     });
 *   }
 *
 * }
 *
 * // usage
 * const interaction = new SimpleLedgerInteraction({param: "foo"});
 * const result = await interaction.run();
 * console.log(result); // whatever value `app.doSomething(...)` returns
 *
 */
var LedgerInteraction = /*#__PURE__*/function (_DirectKeystoreIntera) {
  _inherits(LedgerInteraction, _DirectKeystoreIntera);
  var _super = _createSuper(LedgerInteraction);
  function LedgerInteraction() {
    var _this;
    _classCallCheck(this, LedgerInteraction);
    for (var _len = arguments.length, args = new Array(_len), _key = 0; _key < _len; _key++) {
      args[_key] = arguments[_key];
    }
    _this = _super.call.apply(_super, [this].concat(args));
    _defineProperty(_assertThisInitialized(_this), "appVersion", void 0);
    _defineProperty(_assertThisInitialized(_this), "appName", void 0);
    return _this;
  }
  _createClass(LedgerInteraction, [{
    key: "messages",
    value:
    /**
     * Adds `pending` messages at the `info` level about ensuring the
     * device is plugged in (`device.connect`) and unlocked
     * (`device.unlock`).  Adds an `active` message at the `info` level
     * when communicating with the device (`device.active`).
     */
    function messages() {
      var messages = _get(_getPrototypeOf(LedgerInteraction.prototype), "messages", this).call(this);
      messages.push({
        state: _interaction.PENDING,
        level: _interaction.INFO,
        text: "Please plug in and unlock your Ledger.",
        code: "device.setup"
      });
      messages.push({
        state: _interaction.ACTIVE,
        level: _interaction.INFO,
        text: "Communicating with Ledger...",
        code: "device.active"
      });
      return messages;
    }

    /**
     * Can be called by a subclass during its `run()` method.
     *
     * Creates a transport layer connection and passes control to the
     * `callback` function, with the transport API as the first argument
     * to the function.
     *
     * See the [Ledger API]{@link https://github.com/LedgerHQ/ledgerjs} for general information or a [specific transport API]{@link https://github.com/LedgerHQ/ledgerjs/tree/master/packages/hw-transport-u2f} for examples of API calls.
     *
     * @example
     * async run() {
     *   return await this.withTransport(async (transport) => {
     *     return transport.doSomething(); // Not a real Ledger transport API call
     *   });
     * }
     */
  }, {
    key: "withTransport",
    value: function () {
      var _withTransport = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee(callback) {
        var useU2F, _transport, e, _transport2, _e;
        return _regeneratorRuntime().wrap(function _callee$(_context) {
          while (1) switch (_context.prev = _context.next) {
            case 0:
              useU2F = this.environment.satisfies({
                firefox: ">70"
              });
              if (!useU2F) {
                _context.next = 13;
                break;
              }
              _context.prev = 2;
              _context.next = 5;
              return _hwTransportU2f["default"].create();
            case 5:
              _transport = _context.sent;
              return _context.abrupt("return", callback(_transport));
            case 9:
              _context.prev = 9;
              _context.t0 = _context["catch"](2);
              e = _context.t0;
              throw new Error(e.message);
            case 13:
              _context.prev = 13;
              _context.next = 16;
              return _hwTransportWebusb["default"].create();
            case 16:
              _transport2 = _context.sent;
              return _context.abrupt("return", callback(_transport2));
            case 20:
              _context.prev = 20;
              _context.t1 = _context["catch"](13);
              _e = _context.t1;
              if (_e.message) {
                if (_e.message === "No device selected.") {
                  _e.message = "Select your device in the WebUSB dialog box. Make sure it's plugged in, unlocked, and has the Bitcoin app open.";
                }
                if (_e.message === "undefined is not an object (evaluating 'navigator.usb.getDevices')") {
                  _e.message = "Safari is not a supported browser.";
                }
              }
              throw new Error(_e.message);
            case 25:
            case "end":
              return _context.stop();
          }
        }, _callee, this, [[2, 9], [13, 20]]);
      }));
      function withTransport(_x) {
        return _withTransport.apply(this, arguments);
      }
      return withTransport;
    }()
  }, {
    key: "setAppVersion",
    value: function setAppVersion() {
      var _this2 = this;
      return this.withTransport( /*#__PURE__*/function () {
        var _ref = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee2(transport) {
          var response;
          return _regeneratorRuntime().wrap(function _callee2$(_context2) {
            while (1) switch (_context2.prev = _context2.next) {
              case 0:
                _context2.next = 2;
                return (0, _getAppAndVersion.getAppAndVersion)(transport);
              case 2:
                response = _context2.sent;
                _this2.appVersion = response.version;
                _this2.appName = response.name;
                return _context2.abrupt("return", _this2.appVersion);
              case 6:
              case "end":
                return _context2.stop();
            }
          }, _callee2);
        }));
        return function (_x2) {
          return _ref.apply(this, arguments);
        };
      }());
    }
  }, {
    key: "isLegacyApp",
    value: function () {
      var _isLegacyApp = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee3() {
        var version, _version$split, _version$split2, majorVersion, minorVersion;
        return _regeneratorRuntime().wrap(function _callee3$(_context3) {
          while (1) switch (_context3.prev = _context3.next) {
            case 0:
              _context3.next = 2;
              return this.setAppVersion();
            case 2:
              version = _context3.sent;
              _version$split = version.split("."), _version$split2 = _slicedToArray(_version$split, 2), majorVersion = _version$split2[0], minorVersion = _version$split2[1]; // if the name includes "Legacy" then it is legacy app
              if (!(this.appName && Boolean(this.appName.includes("Legacy")))) {
                _context3.next = 6;
                break;
              }
              return _context3.abrupt("return", true);
            case 6:
              return _context3.abrupt("return", Number(majorVersion) <= 1 || Number(minorVersion) < 1);
            case 7:
            case "end":
              return _context3.stop();
          }
        }, _callee3, this);
      }));
      function isLegacyApp() {
        return _isLegacyApp.apply(this, arguments);
      }
      return isLegacyApp;
    }()
    /**
     * Can be called by a subclass during its `run()` method.
     *
     * Creates a transport layer connection, initializes a bitcoin app
     * object, and passes control to the `callback` function, with the
     * app API as the first argument to the function and the transport
     * API as the second.
     *
     * See the [Ledger API]{@link https://github.com/LedgerHQ/ledgerjs} for general information or the [bitcoin app API]{@link https://github.com/LedgerHQ/ledgerjs/tree/master/packages/hw-app-btc} for examples of API calls.
     *
     * @example
     * async run() {
     *   return await this.withApp(async (app, transport) => {
     *     return app.doSomething(); // Not a real Ledger bitcoin app API call
     *   });
     * }
     */
  }, {
    key: "withApp",
    value: function withApp(callback) {
      var _this3 = this;
      return this.withTransport( /*#__PURE__*/function () {
        var _ref2 = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee4(transport) {
          var app;
          return _regeneratorRuntime().wrap(function _callee4$(_context4) {
            while (1) switch (_context4.prev = _context4.next) {
              case 0:
                _context4.next = 2;
                return _this3.isLegacyApp();
              case 2:
                if (!_context4.sent) {
                  _context4.next = 6;
                  break;
                }
                app = new _hwAppBtc["default"](transport);
                _context4.next = 7;
                break;
              case 6:
                app = new _ledgerBitcoin.AppClient(transport);
              case 7:
                return _context4.abrupt("return", callback(app, transport));
              case 8:
              case "end":
                return _context4.stop();
            }
          }, _callee4);
        }));
        return function (_x3) {
          return _ref2.apply(this, arguments);
        };
      }());
    }

    /**
     * Close the Transport to free the interface (E.g. could be used in another tab
     * now that the interaction is over)
     *
     * The way the pubkey/xpub/fingerprints are grabbed makes this a little tricky.
     * Instead of re-writing how that works, let's just add a way to explicitly
     * close the transport.
     */
  }, {
    key: "closeTransport",
    value: function closeTransport() {
      return this.withTransport( /*#__PURE__*/function () {
        var _ref3 = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee5(transport) {
          return _regeneratorRuntime().wrap(function _callee5$(_context5) {
            while (1) switch (_context5.prev = _context5.next) {
              case 0:
                _context5.prev = 0;
                _context5.next = 3;
                return transport.close();
              case 3:
                _context5.next = 8;
                break;
              case 5:
                _context5.prev = 5;
                _context5.t0 = _context5["catch"](0);
                console.error(_context5.t0);
              case 8:
              case "end":
                return _context5.stop();
            }
          }, _callee5, null, [[0, 5]]);
        }));
        return function (_x4) {
          return _ref3.apply(this, arguments);
        };
      }());
    }
  }]);
  return LedgerInteraction;
}(_interaction.DirectKeystoreInteraction);
/**
 * Base class for interactions which must occur when the Ledger device
 * is not in any app but in the dashboard.
 */
exports.LedgerInteraction = LedgerInteraction;
var LedgerDashboardInteraction = /*#__PURE__*/function (_LedgerInteraction) {
  _inherits(LedgerDashboardInteraction, _LedgerInteraction);
  var _super2 = _createSuper(LedgerDashboardInteraction);
  function LedgerDashboardInteraction() {
    _classCallCheck(this, LedgerDashboardInteraction);
    return _super2.apply(this, arguments);
  }
  _createClass(LedgerDashboardInteraction, [{
    key: "messages",
    value:
    /**
     * Adds `pending` and `active` messages at the `info` level urging
     * the user to be in the Ledger dashboard, not the bitcoin app
     * (`ledger.app.dashboard`).
     */
    function messages() {
      var messages = _get(_getPrototypeOf(LedgerDashboardInteraction.prototype), "messages", this).call(this);
      messages.push({
        state: _interaction.PENDING,
        level: _interaction.INFO,
        text: "Make sure you have the main Ledger dashboard open, NOT the Bitcoin app.",
        code: "ledger.app.dashboard"
      });
      messages.push({
        state: _interaction.ACTIVE,
        level: _interaction.INFO,
        text: "Make sure you have the main Ledger dashboard open, NOT the Bitcoin app.",
        code: "ledger.app.dashboard"
      });
      return messages;
    }
  }]);
  return LedgerDashboardInteraction;
}(LedgerInteraction);
/**
 * Base class for interactions which must occur when the Ledger device
 * is open to the bitcoin app.
 */
exports.LedgerDashboardInteraction = LedgerDashboardInteraction;
var LedgerBitcoinInteraction = /*#__PURE__*/function (_LedgerInteraction2) {
  _inherits(LedgerBitcoinInteraction, _LedgerInteraction2);
  var _super3 = _createSuper(LedgerBitcoinInteraction);
  function LedgerBitcoinInteraction() {
    var _this4;
    _classCallCheck(this, LedgerBitcoinInteraction);
    for (var _len2 = arguments.length, args = new Array(_len2), _key2 = 0; _key2 < _len2; _key2++) {
      args[_key2] = arguments[_key2];
    }
    _this4 = _super3.call.apply(_super3, [this].concat(args));
    _defineProperty(_assertThisInitialized(_this4), "isLegacySupported", void 0);
    _defineProperty(_assertThisInitialized(_this4), "isV2Supported", void 0);
    return _this4;
  }
  /**
   * Whether or not the interaction is supported in legacy versions
   * of the Ledger App (<=v2.0.6)
   */
  /**
   * Whether or not the interaction is supported in non-legacy versions
   * of the Ledger App (>=v2.1.0)
   */
  _createClass(LedgerBitcoinInteraction, [{
    key: "messages",
    value:
    /**
     * Adds `pending` and `active` messages at the `info` level urging
     * the user to be in the bitcoin app (`ledger.app.bitcoin`).
     */
    function messages() {
      var messages = _get(_getPrototypeOf(LedgerBitcoinInteraction.prototype), "messages", this).call(this);
      messages.push({
        state: _interaction.PENDING,
        level: _interaction.INFO,
        text: "Then open the Bitcoin app.",
        code: "ledger.app.bitcoin"
      });
      messages.push({
        state: _interaction.ACTIVE,
        level: _interaction.INFO,
        text: "Make sure you have opened the Bitcoin app.",
        code: "ledger.app.bitcoin"
      });
      return messages;
    }

    /**
     * Inheriting classes should set properties `this.isLegacySupported`
     * and `this.isV2Supported` to indicate whether a given interaction
     * has support for a given interaction. This method can then be called
     * to check the version of the app being called and return whether or
     * not the interaction is supported based on that version
     */
  }, {
    key: "isAppSupported",
    value: function () {
      var _isAppSupported = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee6() {
        return _regeneratorRuntime().wrap(function _callee6$(_context6) {
          while (1) switch (_context6.prev = _context6.next) {
            case 0:
              if (this.isSupported()) {
                _context6.next = 2;
                break;
              }
              return _context6.abrupt("return", false);
            case 2:
              _context6.next = 4;
              return this.isLegacyApp();
            case 4:
              if (!_context6.sent) {
                _context6.next = 6;
                break;
              }
              return _context6.abrupt("return", this.isLegacySupported);
            case 6:
              return _context6.abrupt("return", this.isV2Supported);
            case 7:
            case "end":
              return _context6.stop();
          }
        }, _callee6, this);
      }));
      function isAppSupported() {
        return _isAppSupported.apply(this, arguments);
      }
      return isAppSupported;
    }()
    /**
     * Inheriting classes should call the super.run()
     * as well as set the properties of support before calling their run
     * in order to check support before calling the actual interaction run
     *
     * The return type has to remain any to get inheritance typing to work.
     */
  }, {
    key: "run",
    value: function () {
      var _run = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee7() {
        var isSupported;
        return _regeneratorRuntime().wrap(function _callee7$(_context7) {
          while (1) switch (_context7.prev = _context7.next) {
            case 0:
              _context7.next = 2;
              return this.isAppSupported();
            case 2:
              isSupported = _context7.sent;
              if (isSupported) {
                _context7.next = 5;
                break;
              }
              throw new Error("Method not supported for this version of Ledger app (".concat(this.appVersion, ")"));
            case 5:
              return _context7.abrupt("return", isSupported);
            case 6:
            case "end":
              return _context7.stop();
          }
        }, _callee7, this);
      }));
      function run() {
        return _run.apply(this, arguments);
      }
      return run;
    }()
  }]);
  return LedgerBitcoinInteraction;
}(LedgerInteraction);
/**
 * Returns metadata about Ledger device.
 *
 * Includes model name, firmware & MCU versions.
 *
 * @example
 * import {LedgerGetMetadata} from "unchained-wallets";
 * const interaction = new LedgerGetMetadata();
 * const result = await interaction.run();
 * console.log(result);
 * {
 *   spec: "Nano S v1.4.2 (MCU v1.7)",
 *   model: "Nano S",
 *   version: {
 *     major: "1",
 *     minor: "4",
 *     patch: "2",
 *     string: "1.4.2",
 *   },
 *   mcuVersion: {
 *     major: "1",
 *     minor: "7",
 *     string: "1.7",
 *   }
 * }
 *
 */
exports.LedgerBitcoinInteraction = LedgerBitcoinInteraction;
var LedgerGetMetadata = /*#__PURE__*/function (_LedgerDashboardInter) {
  _inherits(LedgerGetMetadata, _LedgerDashboardInter);
  var _super4 = _createSuper(LedgerGetMetadata);
  function LedgerGetMetadata() {
    _classCallCheck(this, LedgerGetMetadata);
    return _super4.apply(this, arguments);
  }
  _createClass(LedgerGetMetadata, [{
    key: "run",
    value: // FIXME entire implementation here is rickety AF.
    function () {
      var _run2 = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee9() {
        var _this5 = this;
        return _regeneratorRuntime().wrap(function _callee9$(_context9) {
          while (1) switch (_context9.prev = _context9.next) {
            case 0:
              return _context9.abrupt("return", this.withTransport( /*#__PURE__*/function () {
                var _ref4 = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee8(transport) {
                  var rawResult;
                  return _regeneratorRuntime().wrap(function _callee8$(_context8) {
                    while (1) switch (_context8.prev = _context8.next) {
                      case 0:
                        _context8.prev = 0;
                        transport.setScrambleKey("B0L0S");
                        _context8.next = 4;
                        return transport.send(0xe0, 0x01, 0x00, 0x00);
                      case 4:
                        rawResult = _context8.sent;
                        return _context8.abrupt("return", _this5.parseMetadata(rawResult));
                      case 6:
                        _context8.prev = 6;
                        _context8.next = 9;
                        return _get(_getPrototypeOf(LedgerGetMetadata.prototype), "closeTransport", _this5).call(_this5);
                      case 9:
                        return _context8.finish(6);
                      case 10:
                      case "end":
                        return _context8.stop();
                    }
                  }, _callee8, null, [[0,, 6, 10]]);
                }));
                return function (_x5) {
                  return _ref4.apply(this, arguments);
                };
              }()));
            case 1:
            case "end":
              return _context9.stop();
          }
        }, _callee9, this);
      }));
      function run() {
        return _run2.apply(this, arguments);
      }
      return run;
    }()
    /**
     * Parses the binary data returned from the Ledger API call into a
     * metadata object.
     *
     */
  }, {
    key: "parseMetadata",
    value: function parseMetadata(response) {
      try {
        // From
        //
        //   https://github.com/LedgerHQ/ledger-live-common/blob/master/src/hw/getVersion.js
        //   https://github.com/LedgerHQ/ledger-live-common/blob/master/src/hw/getDeviceInfo.js
        //   https://git.xmr.pm/LedgerHQ/ledger-live-common/commit/9ffc75acfc7f1e9aa9101a32b3e7481770fb3b89

        var PROVIDERS = {
          "": 1,
          das: 2,
          club: 3,
          shitcoins: 4,
          ee: 5
        };
        var ManagerAllowedFlag = 0x08;
        var PinValidatedFlag = 0x80;
        var byteArray = _toConsumableArray(response);
        var data = byteArray.slice(0, byteArray.length - 2);
        var targetIdStr = Buffer.from(data.slice(0, 4));
        var targetId = targetIdStr.readUIntBE(0, 4);
        var seVersionLength = data[4];
        var seVersion = Buffer.from(data.slice(5, 5 + seVersionLength)).toString();
        var flagsLength = data[5 + seVersionLength];
        var flags = Buffer.from(data.slice(5 + seVersionLength + 1, 5 + seVersionLength + 1 + flagsLength));
        var mcuVersionLength = data[5 + seVersionLength + 1 + flagsLength];
        var mcuVersion = Buffer.from(data.slice(7 + seVersionLength + flagsLength, 7 + seVersionLength + flagsLength + mcuVersionLength));
        if (mcuVersion[mcuVersion.length - 1] === 0) {
          mcuVersion = mcuVersion.slice(0, mcuVersion.length - 1);
        }
        var versionString = mcuVersion.toString();
        if (!seVersionLength) {
          seVersion = "0.0.0";
          flags = Buffer.allocUnsafeSlow(0);
          versionString = "";
        }

        /* eslint-disable no-unused-vars, no-bitwise */
        var isOSU = seVersion.includes("-osu");
        var version = seVersion.replace("-osu", "");
        var m = seVersion.match(/([0-9]+.[0-9]+)(.[0-9]+)?(-(.*))?/);
        var _ref5 = m || [],
          _ref6 = _slicedToArray(_ref5, 5),
          majMin = _ref6[1],
          providerName = _ref6[4];
        var providerId = PROVIDERS[providerName] || 1;
        var isBootloader = (targetId & 0xf0000000) !== 0x30000000;
        var flag = flags.length > 0 ? flags[0] : 0;
        var managerAllowed = Boolean(flag & ManagerAllowedFlag);
        var pin = Boolean(flag & PinValidatedFlag);
        /* eslint-enable */

        var _split = (version || "").split("."),
          _split2 = _slicedToArray(_split, 3),
          majorVersion = _split2[0],
          minorVersion = _split2[1],
          patchVersion = _split2[2];
        var _split3 = (versionString || "").split("."),
          _split4 = _slicedToArray(_split3, 2),
          mcuMajorVersion = _split4[0],
          mcuMinorVersion = _split4[1];

        // https://gist.github.com/TamtamHero/b7651ffe6f1e485e3886bf4aba673348
        // +-----------------+------------+
        // |    FirmWare     | Target ID  |
        // +-----------------+------------+
        // | Nano S <= 1.3.1 | 0x31100002 |
        // | Nano S 1.4.x    | 0x31100003 |
        // | Nano S 1.5.x    | 0x31100004 |
        // |                 |            |
        // | Blue 2.0.x      | 0x31000002 |
        // | Blue 2.1.x      | 0x31000004 |
        // | Blue 2.1.x V2   | 0x31010004 |
        // |                 |            |
        // | Nano X          | 0x33000004 |
        // |                 |            |
        // | MCU,any version | 0x01000001 |
        // +-----------------+------------+
        //
        //  Order matters -- high to low minTargetId
        var MODEL_RANGES = [{
          minTargetId: 0x33000004,
          model: "Nano X"
        }, {
          minTargetId: 0x31100002,
          model: "Nano S"
        }, {
          minTargetId: 0x31100002,
          model: "Blue"
        }, {
          minTargetId: 0x01000001,
          model: "MCU"
        }];
        var model = "Unknown";
        if (targetId) {
          for (var i = 0; i < MODEL_RANGES.length; i++) {
            var range = MODEL_RANGES[i];
            if (targetId >= range.minTargetId) {
              model = range.model;
              break;
            }
          }
        }
        var spec = "".concat(model, " v").concat(version, " (MCU v").concat(versionString, ")");
        // if (pin) {
        //   spec += " w/PIN";
        // }

        return {
          spec: spec,
          model: model,
          version: {
            major: majorVersion,
            minor: minorVersion,
            patch: patchVersion,
            string: version
          },
          mcuVersion: {
            major: mcuMajorVersion,
            minor: mcuMinorVersion,
            string: versionString
          }
          // pin,
        };
      } catch (e) {
        console.error(e);
        throw new Error("Unable to parse metadata from Ledger device.");
      }
    }
  }]);
  return LedgerGetMetadata;
}(LedgerDashboardInteraction);
exports.LedgerGetMetadata = LedgerGetMetadata;
/**
 * Base class for interactions exporting information about an HD node
 * at a given BIP32 path.
 *
 * You may want to use `LedgerExportPublicKey` or
 * `LedgerExportExtendedPublicKey` directly.
 *
 * @example
 * import {MAINNET} from "unchained-bitcoin";
 * import {LedgerExportHDNode} from "unchained-wallets";
 * const interaction = new LedgerExportHDNode({network: MAINNET, bip32Path: "m/48'/0'/0'/2'/0"});
 * const node = await interaction.run();
 * console.log(node);
 */
var LedgerExportHDNode = /*#__PURE__*/function (_LedgerBitcoinInterac) {
  _inherits(LedgerExportHDNode, _LedgerBitcoinInterac);
  var _super5 = _createSuper(LedgerExportHDNode);
  /**
   * Requires a valid BIP32 path to the node to export.
   *
   * @param {object} options - options argument
   * @param {string} bip32Path - the BIP32 path for the HD node
   */
  function LedgerExportHDNode(_ref7) {
    var _this6;
    var bip32Path = _ref7.bip32Path;
    _classCallCheck(this, LedgerExportHDNode);
    _this6 = _super5.call(this);
    _defineProperty(_assertThisInitialized(_this6), "bip32Path", void 0);
    _defineProperty(_assertThisInitialized(_this6), "bip32ValidationErrorMessage", void 0);
    _defineProperty(_assertThisInitialized(_this6), "isV2Supported", void 0);
    _defineProperty(_assertThisInitialized(_this6), "isLegacySupported", void 0);
    _this6.bip32Path = bip32Path;
    var bip32PathError = (0, _unchainedBitcoin.validateBIP32Path)(bip32Path);
    if (bip32PathError.length) {
      _this6.bip32ValidationErrorMessage = {
        text: bip32PathError,
        code: "ledger.bip32_path.path_error"
      };
    }
    return _this6;
  }

  /**
   * Adds messages related to the warnings Ledger devices produce on various BIP32 paths.
   */
  _createClass(LedgerExportHDNode, [{
    key: "messages",
    value: function messages() {
      var messages = _get(_getPrototypeOf(LedgerExportHDNode.prototype), "messages", this).call(this);
      if (this.bip32ValidationErrorMessage) {
        messages.push({
          state: _interaction.PENDING,
          level: _interaction.ERROR,
          code: this.bip32ValidationErrorMessage.code,
          text: this.bip32ValidationErrorMessage.text
        });
      }
      return messages;
    }

    /**
     * Returns whether or not the Ledger device will display a warning
     * to the user about an unusual BIP32 path.
     *
     * A "usual" BIP32 path is exactly 5 segments long.  The segments
     * have the following constraints:
     *
     * - Segment 1: Must be equal to `44'`
     * - Segment 2: Can have any value
     * - Segment 3: Must be between `0'` and `100'`
     * - Segment 4: Must be equal to `0`
     * - Segment 5: Must be between `0 and 50000`
     *
     * Any other kind of path is considered unusual and will trigger the
     * warning.
     */
  }, {
    key: "hasBIP32PathWarning",
    value: function hasBIP32PathWarning() {
      // 0 -> 44'
      // 1 -> anything
      // 2 -> 0' - 100'
      // 3 -> 0
      // 4 -> 0 - 50000
      var indices = (0, _unchainedBitcoin.bip32PathToSequence)(this.bip32Path);
      var hardened0 = (0, _unchainedBitcoin.hardenedBIP32Index)(0);
      var hardened44 = (0, _unchainedBitcoin.hardenedBIP32Index)(44);
      var hardened100 = (0, _unchainedBitcoin.hardenedBIP32Index)(100);
      if (indices.length !== 5) {
        return true;
      }
      if (indices[0] !== hardened44) {
        return true;
      }
      if (indices[2] < hardened0 || indices[2] > hardened100) {
        return true;
      }
      if (indices[3] !== 0) {
        return true;
      }
      return indices[4] < 0 || indices[4] > 50000;
    }

    /**
     * Get fingerprint from parent pubkey. This is useful for generating xpubs
     * which need the fingerprint of the parent pubkey
     *
     * Optionally get root fingerprint for device. This is useful for keychecks and necessary
     * for PSBTs
     */
  }, {
    key: "getFingerprint",
    value: function () {
      var _getFingerprint = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee10() {
        var root,
          pubkey,
          fp,
          _args10 = arguments;
        return _regeneratorRuntime().wrap(function _callee10$(_context10) {
          while (1) switch (_context10.prev = _context10.next) {
            case 0:
              root = _args10.length > 0 && _args10[0] !== undefined ? _args10[0] : false;
              _context10.next = 3;
              return this.isLegacyApp();
            case 3:
              if (!_context10.sent) {
                _context10.next = 18;
                break;
              }
              if (!root) {
                _context10.next = 10;
                break;
              }
              _context10.next = 7;
              return this.getMultisigRootPublicKey();
            case 7:
              _context10.t0 = _context10.sent;
              _context10.next = 13;
              break;
            case 10:
              _context10.next = 12;
              return this.getParentPublicKey();
            case 12:
              _context10.t0 = _context10.sent;
            case 13:
              pubkey = _context10.t0;
              fp = (0, _unchainedBitcoin.getFingerprintFromPublicKey)(pubkey); // If asked for a root XFP, zero pad it to length of 8.
              return _context10.abrupt("return", root ? (0, _unchainedBitcoin.fingerprintToFixedLengthHex)(fp) : fp.toString());
            case 18:
              if (!root) {
                _context10.next = 22;
                break;
              }
              return _context10.abrupt("return", this.getXfp());
            case 22:
              throw new Error("Method not supported for this version of Ledger app (".concat(this.appVersion, ")"));
            case 23:
            case "end":
              return _context10.stop();
          }
        }, _callee10, this);
      }));
      function getFingerprint() {
        return _getFingerprint.apply(this, arguments);
      }
      return getFingerprint;
    }() // v2 App and above only
  }, {
    key: "getXfp",
    value: function () {
      var _getXfp = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee12() {
        return _regeneratorRuntime().wrap(function _callee12$(_context12) {
          while (1) switch (_context12.prev = _context12.next) {
            case 0:
              _context12.next = 2;
              return this.isLegacyApp();
            case 2:
              if (!_context12.sent) {
                _context12.next = 4;
                break;
              }
              return _context12.abrupt("return", this.getFingerprint(true));
            case 4:
              return _context12.abrupt("return", this.withApp( /*#__PURE__*/function () {
                var _ref8 = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee11(app) {
                  return _regeneratorRuntime().wrap(function _callee11$(_context11) {
                    while (1) switch (_context11.prev = _context11.next) {
                      case 0:
                        _context11.next = 2;
                        return app.getMasterFingerprint();
                      case 2:
                        return _context11.abrupt("return", _context11.sent);
                      case 3:
                      case "end":
                        return _context11.stop();
                    }
                  }, _callee11);
                }));
                return function (_x6) {
                  return _ref8.apply(this, arguments);
                };
              }()));
            case 5:
            case "end":
              return _context12.stop();
          }
        }, _callee12, this);
      }));
      function getXfp() {
        return _getXfp.apply(this, arguments);
      }
      return getXfp;
    }()
  }, {
    key: "getParentPublicKey",
    value: function getParentPublicKey() {
      var _this7 = this;
      return this.withApp( /*#__PURE__*/function () {
        var _ref9 = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee13(app) {
          var parentPath, key;
          return _regeneratorRuntime().wrap(function _callee13$(_context13) {
            while (1) switch (_context13.prev = _context13.next) {
              case 0:
                parentPath = (0, _unchainedBitcoin.getParentBIP32Path)(_this7.bip32Path);
                _context13.next = 3;
                return app.getWalletPublicKey(parentPath);
              case 3:
                key = _context13.sent.publicKey;
                return _context13.abrupt("return", key);
              case 5:
              case "end":
                return _context13.stop();
            }
          }, _callee13);
        }));
        return function (_x7) {
          return _ref9.apply(this, arguments);
        };
      }());
    }
  }, {
    key: "getMultisigRootPublicKey",
    value: function getMultisigRootPublicKey() {
      return this.withApp( /*#__PURE__*/function () {
        var _ref10 = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee14(app) {
          var key;
          return _regeneratorRuntime().wrap(function _callee14$(_context14) {
            while (1) switch (_context14.prev = _context14.next) {
              case 0:
                _context14.next = 2;
                return app.getWalletPublicKey();
              case 2:
                key = _context14.sent.publicKey;
                return _context14.abrupt("return", key);
              case 4:
              case "end":
                return _context14.stop();
            }
          }, _callee14);
        }));
        return function (_x8) {
          return _ref10.apply(this, arguments);
        };
      }());
    }

    /**
     * See {@link https://github.com/LedgerHQ/ledgerjs/tree/master/packages/hw-app-btc#getwalletpublickey}.
     */
  }, {
    key: "run",
    value: function run() {
      var _this8 = this;
      return this.withApp( /*#__PURE__*/function () {
        var _ref11 = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee15(app) {
          var result;
          return _regeneratorRuntime().wrap(function _callee15$(_context15) {
            while (1) switch (_context15.prev = _context15.next) {
              case 0:
                _context15.next = 2;
                return _get(_getPrototypeOf(LedgerExportHDNode.prototype), "run", _this8).call(_this8);
              case 2:
                _context15.next = 4;
                return app.getWalletPublicKey(_this8.bip32Path);
              case 4:
                result = _context15.sent;
                return _context15.abrupt("return", result);
              case 6:
              case "end":
                return _context15.stop();
            }
          }, _callee15);
        }));
        return function (_x9) {
          return _ref11.apply(this, arguments);
        };
      }());
    }
  }]);
  return LedgerExportHDNode;
}(LedgerBitcoinInteraction);
/**
 * Returns the public key at a given BIP32 path.
 *
 * @example
 * import {LedgerExportPublicKey} from "unchained-wallets";
 * const interaction = new LedgerExportPublicKey({bip32Path: "m/48'/0'/0'/2'/0"});
 * const publicKey = await interaction.run();
 * console.log(publicKey);
 * // "03..."
 */
var LedgerExportPublicKey = /*#__PURE__*/function (_LedgerExportHDNode) {
  _inherits(LedgerExportPublicKey, _LedgerExportHDNode);
  var _super6 = _createSuper(LedgerExportPublicKey);
  /**
   * @param {string} bip32Path - the BIP32 path for the HD node
   * @param {boolean} includeXFP - return xpub with root fingerprint concatenated
   */
  function LedgerExportPublicKey(_ref12) {
    var _this9;
    var bip32Path = _ref12.bip32Path,
      _ref12$includeXFP = _ref12.includeXFP,
      includeXFP = _ref12$includeXFP === void 0 ? false : _ref12$includeXFP;
    _classCallCheck(this, LedgerExportPublicKey);
    _this9 = _super6.call(this, {
      bip32Path: bip32Path
    });
    _defineProperty(_assertThisInitialized(_this9), "includeXFP", void 0);
    _defineProperty(_assertThisInitialized(_this9), "isLegacySupported", true);
    _defineProperty(_assertThisInitialized(_this9), "isV2Supported", false);
    _this9.includeXFP = includeXFP;
    return _this9;
  }
  _createClass(LedgerExportPublicKey, [{
    key: "getV2PublicKey",
    value: function getV2PublicKey() {
      var _this10 = this;
      return this.withApp( /*#__PURE__*/function () {
        var _ref13 = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee16(app) {
          var xpub;
          return _regeneratorRuntime().wrap(function _callee16$(_context16) {
            while (1) switch (_context16.prev = _context16.next) {
              case 0:
                _context16.next = 2;
                return app.getExtendedPubkey(_this10.bip32Path, true);
              case 2:
                xpub = _context16.sent;
                return _context16.abrupt("return", _unchainedBitcoin.ExtendedPublicKey.fromBase58(xpub).pubkey);
              case 4:
              case "end":
                return _context16.stop();
            }
          }, _callee16);
        }));
        return function (_x10) {
          return _ref13.apply(this, arguments);
        };
      }());
    }

    /**
     * Parses out and compresses the public key from the response of
     * `LedgerExportHDNode`.
     */
  }, {
    key: "run",
    value: function () {
      var _run3 = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee17() {
        var result, _publicKey, rootFingerprint, publicKey, _rootFingerprint;
        return _regeneratorRuntime().wrap(function _callee17$(_context17) {
          while (1) switch (_context17.prev = _context17.next) {
            case 0:
              _context17.prev = 0;
              _context17.next = 3;
              return this.isLegacyApp();
            case 3:
              if (!_context17.sent) {
                _context17.next = 14;
                break;
              }
              _context17.next = 6;
              return _get(_getPrototypeOf(LedgerExportPublicKey.prototype), "run", this).call(this);
            case 6:
              result = _context17.sent;
              _publicKey = this.parsePublicKey((result || {}).publicKey);
              if (!this.includeXFP) {
                _context17.next = 13;
                break;
              }
              _context17.next = 11;
              return this.getXfp();
            case 11:
              rootFingerprint = _context17.sent;
              return _context17.abrupt("return", {
                rootFingerprint: rootFingerprint,
                publicKey: _publicKey
              });
            case 13:
              return _context17.abrupt("return", _publicKey);
            case 14:
              _context17.next = 16;
              return this.getV2PublicKey();
            case 16:
              publicKey = _context17.sent;
              if (!this.includeXFP) {
                _context17.next = 22;
                break;
              }
              _context17.next = 20;
              return this.getXfp();
            case 20:
              _rootFingerprint = _context17.sent;
              return _context17.abrupt("return", {
                rootFingerprint: _rootFingerprint,
                publicKey: publicKey
              });
            case 22:
              return _context17.abrupt("return", publicKey);
            case 23:
              _context17.prev = 23;
              _context17.next = 26;
              return _get(_getPrototypeOf(LedgerExportPublicKey.prototype), "closeTransport", this).call(this);
            case 26:
              return _context17.finish(23);
            case 27:
            case "end":
              return _context17.stop();
          }
        }, _callee17, this, [[0,, 23, 27]]);
      }));
      function run() {
        return _run3.apply(this, arguments);
      }
      return run;
    }()
    /**
     * Compress the given public key.
     */
  }, {
    key: "parsePublicKey",
    value: function parsePublicKey(publicKey) {
      if (publicKey) {
        try {
          return (0, _unchainedBitcoin.compressPublicKey)(publicKey);
        } catch (e) {
          console.error(e);
          throw new Error("Unable to compress public key from Ledger device.");
        }
      } else {
        throw new Error("Received no public key from Ledger device.");
      }
    }
  }]);
  return LedgerExportPublicKey;
}(LedgerExportHDNode);
/**
 * Class for wallet extended public key (xpub) interaction at a given BIP32 path.
 */
exports.LedgerExportPublicKey = LedgerExportPublicKey;
var LedgerExportExtendedPublicKey = /*#__PURE__*/function (_LedgerExportHDNode2) {
  _inherits(LedgerExportExtendedPublicKey, _LedgerExportHDNode2);
  var _super7 = _createSuper(LedgerExportExtendedPublicKey);
  /**
   * @param {string} bip32Path path
   * @param {string} network bitcoin network
   * @param {boolean} includeXFP - return xpub with root fingerprint concatenated
   */
  function LedgerExportExtendedPublicKey(_ref14) {
    var _this11;
    var bip32Path = _ref14.bip32Path,
      network = _ref14.network,
      includeXFP = _ref14.includeXFP;
    _classCallCheck(this, LedgerExportExtendedPublicKey);
    _this11 = _super7.call(this, {
      bip32Path: bip32Path
    });
    _defineProperty(_assertThisInitialized(_this11), "network", void 0);
    _defineProperty(_assertThisInitialized(_this11), "includeXFP", void 0);
    _defineProperty(_assertThisInitialized(_this11), "isLegacySupported", true);
    _defineProperty(_assertThisInitialized(_this11), "isV2Supported", true);
    _this11.network = network;
    _this11.includeXFP = includeXFP;
    return _this11;
  }
  _createClass(LedgerExportExtendedPublicKey, [{
    key: "messages",
    value: function messages() {
      return _get(_getPrototypeOf(LedgerExportExtendedPublicKey.prototype), "messages", this).call(this);
    }

    /**
     * Retrieve extended public key (xpub) from Ledger device for a given BIP32 path
     * @example
     * import {LedgerExportExtendedPublicKey} from "unchained-wallets";
     * const interaction = new LedgerExportExtendedPublicKey({network, bip32Path});
     * const xpub = await interaction.run();
     * console.log(xpub);
     */
  }, {
    key: "run",
    value: function () {
      var _run4 = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee19() {
        var _this12 = this;
        var walletPublicKey, fingerprint, xpub, rootFingerprint, _rootFingerprint2, _xpub;
        return _regeneratorRuntime().wrap(function _callee19$(_context19) {
          while (1) switch (_context19.prev = _context19.next) {
            case 0:
              _context19.prev = 0;
              _context19.next = 3;
              return this.isLegacyApp();
            case 3:
              if (!_context19.sent) {
                _context19.next = 19;
                break;
              }
              _context19.next = 6;
              return _get(_getPrototypeOf(LedgerExportExtendedPublicKey.prototype), "run", this).call(this);
            case 6:
              walletPublicKey = _context19.sent;
              _context19.next = 9;
              return this.getFingerprint();
            case 9:
              fingerprint = _context19.sent;
              xpub = (0, _unchainedBitcoin.deriveExtendedPublicKey)(this.bip32Path, walletPublicKey.publicKey, walletPublicKey.chainCode, Number(fingerprint), this.network);
              if (!this.includeXFP) {
                _context19.next = 16;
                break;
              }
              _context19.next = 14;
              return this.getXfp();
            case 14:
              rootFingerprint = _context19.sent;
              return _context19.abrupt("return", {
                rootFingerprint: rootFingerprint,
                xpub: xpub
              });
            case 16:
              return _context19.abrupt("return", xpub);
            case 19:
              _context19.next = 21;
              return this.getXfp();
            case 21:
              _rootFingerprint2 = _context19.sent;
              _context19.next = 24;
              return this.withApp( /*#__PURE__*/function () {
                var _ref15 = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee18(app) {
                  return _regeneratorRuntime().wrap(function _callee18$(_context18) {
                    while (1) switch (_context18.prev = _context18.next) {
                      case 0:
                        return _context18.abrupt("return", app.getExtendedPubkey(_this12.bip32Path, true));
                      case 1:
                      case "end":
                        return _context18.stop();
                    }
                  }, _callee18);
                }));
                return function (_x11) {
                  return _ref15.apply(this, arguments);
                };
              }());
            case 24:
              _xpub = _context19.sent;
              return _context19.abrupt("return", {
                xpub: _xpub,
                rootFingerprint: _rootFingerprint2
              });
            case 26:
              _context19.prev = 26;
              _context19.next = 29;
              return _get(_getPrototypeOf(LedgerExportExtendedPublicKey.prototype), "closeTransport", this).call(this);
            case 29:
              return _context19.finish(26);
            case 30:
            case "end":
              return _context19.stop();
          }
        }, _callee19, this, [[0,, 26, 30]]);
      }));
      function run() {
        return _run4.apply(this, arguments);
      }
      return run;
    }()
  }]);
  return LedgerExportExtendedPublicKey;
}(LedgerExportHDNode);
exports.LedgerExportExtendedPublicKey = LedgerExportExtendedPublicKey;
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
 * import {LedgerSignMultisigTransaction} from "unchained-wallets";
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
 * const interaction = new LedgerSignMultisigTransaction({
 *   network: TESTNET,
 *   inputs,
 *   outputs,
 *   bip32Paths: ["m/45'/0'/0'/0", // add more, 1 per input],
 * });
 * const signature = await interaction.run();
 * console.log(signatures);
 * // ["ababab...", // 1 per input]
 */
var LedgerSignMultisigTransaction = /*#__PURE__*/function (_LedgerBitcoinInterac2) {
  _inherits(LedgerSignMultisigTransaction, _LedgerBitcoinInterac2);
  var _super8 = _createSuper(LedgerSignMultisigTransaction);
  function LedgerSignMultisigTransaction(_ref16) {
    var _this13;
    var network = _ref16.network,
      _ref16$inputs = _ref16.inputs,
      inputs = _ref16$inputs === void 0 ? [] : _ref16$inputs,
      _ref16$outputs = _ref16.outputs,
      outputs = _ref16$outputs === void 0 ? [] : _ref16$outputs,
      _ref16$bip32Paths = _ref16.bip32Paths,
      bip32Paths = _ref16$bip32Paths === void 0 ? [] : _ref16$bip32Paths,
      psbt = _ref16.psbt,
      keyDetails = _ref16.keyDetails,
      _ref16$returnSignatur = _ref16.returnSignatureArray,
      returnSignatureArray = _ref16$returnSignatur === void 0 ? false : _ref16$returnSignatur,
      v2Options = _ref16.v2Options;
    _classCallCheck(this, LedgerSignMultisigTransaction);
    _this13 = _super8.call(this);
    _defineProperty(_assertThisInitialized(_this13), "network", void 0);
    _defineProperty(_assertThisInitialized(_this13), "inputs", void 0);
    _defineProperty(_assertThisInitialized(_this13), "outputs", void 0);
    _defineProperty(_assertThisInitialized(_this13), "bip32Paths", void 0);
    _defineProperty(_assertThisInitialized(_this13), "psbt", void 0);
    _defineProperty(_assertThisInitialized(_this13), "keyDetails", void 0);
    _defineProperty(_assertThisInitialized(_this13), "returnSignatureArray", void 0);
    _defineProperty(_assertThisInitialized(_this13), "pubkeys", void 0);
    _defineProperty(_assertThisInitialized(_this13), "v2Options", void 0);
    _defineProperty(_assertThisInitialized(_this13), "isLegacySupported", true);
    _defineProperty(_assertThisInitialized(_this13), "isV2Supported", false);
    _this13.network = network;
    if (!psbt || !keyDetails) {
      _this13.inputs = inputs;
      _this13.outputs = outputs;
      _this13.bip32Paths = bip32Paths;
    } else {
      _this13.psbt = psbt;
      _this13.returnSignatureArray = returnSignatureArray;
      var translatedPsbt = (0, _unchainedBitcoin.translatePSBT)(network, _unchainedBitcoin.P2SH, _this13.psbt, keyDetails);
      _this13.inputs = translatedPsbt?.unchainedInputs;
      _this13.outputs = translatedPsbt?.unchainedOutputs;
      _this13.bip32Paths = translatedPsbt?.bip32Derivations.map(function (b32d) {
        return b32d.path;
      });
      _this13.pubkeys = translatedPsbt?.bip32Derivations.map(function (b32d) {
        return b32d.pubkey;
      });
    }
    _this13.v2Options = v2Options;
    return _this13;
  }

  /**
   * Adds messages describing the signing flow.
   */
  _createClass(LedgerSignMultisigTransaction, [{
    key: "messages",
    value: function messages() {
      var messages = _get(_getPrototypeOf(LedgerSignMultisigTransaction.prototype), "messages", this).call(this);
      messages.push({
        state: _interaction.ACTIVE,
        level: _interaction.WARNING,
        code: "ledger.sign.delay",
        text: "Note: this process may take several minutes to complete",
        preProcessingTime: this.preProcessingTime(),
        postProcessingTime: this.postProcessingTime()
      });
      if (this.anySegwitInputs()) {
        messages.push({
          state: _interaction.ACTIVE,
          level: _interaction.INFO,
          code: "ledger.sign",
          version: "<1.6.0",
          text: "Your Ledger will ask you to \"Confirm transaction\" and display each output amount and address followed by the the fee amount.",
          action: LEDGER_RIGHT_BUTTON
        });
        messages.push({
          state: _interaction.ACTIVE,
          level: _interaction.INFO,
          code: "ledger.sign",
          version: ">=1.6.0",
          text: "Confirm each output on your Ledger device and approve the transaction.",
          messages: [{
            text: "Your Ledger will ask you to \"Review transaction\".",
            action: LEDGER_RIGHT_BUTTON
          }, {
            text: "For each output, your Ledger device will display the output amount...",
            action: LEDGER_RIGHT_BUTTON
          }, {
            text: "...followed by the output address in several parts",
            action: LEDGER_RIGHT_BUTTON
          }, {
            text: "Your Ledger will display the transaction fees.",
            action: LEDGER_RIGHT_BUTTON
          }, {
            text: "Your Ledger will ask you to \"Accept and send\".",
            action: LEDGER_BOTH_BUTTONS
          }]
        });
      } else {
        messages.push({
          state: _interaction.ACTIVE,
          level: _interaction.INFO,
          code: "ledger.sign",
          version: "<1.6.0",
          text: "Confirm each output on your Ledger device and approve the transaction.",
          messages: [{
            text: "For each output, your Ledger will display the output amount and address for you to confirm.",
            action: LEDGER_RIGHT_BUTTON
          }, {
            text: "Your Ledger will ask if you want to \"Confirm the transaction\".  Due to a bug in the Ledger software, your device may display the transaction fee as \"UNKNOWN\".",
            action: LEDGER_RIGHT_BUTTON
          }]
        });
        messages.push({
          state: _interaction.ACTIVE,
          level: _interaction.INFO,
          code: "ledger.sign",
          version: ">=1.6.0",
          text: "Confirm each output on your Ledger device and approve the transaction.",
          messages: [{
            text: "For each output, your Ledger will ask you to \"Review output\".",
            action: LEDGER_RIGHT_BUTTON
          }, {
            text: "Your Ledger will display the output amount.",
            action: LEDGER_RIGHT_BUTTON
          }, {
            text: "Your Ledger will display the output address in several parts.",
            action: LEDGER_RIGHT_BUTTON
          }, {
            text: "Your Ledger will ask if you want to \"Accept\" the output.",
            action: LEDGER_BOTH_BUTTONS
          }, {
            text: "Your Ledger will ask if you want to \"Confirm the transaction\".",
            action: LEDGER_RIGHT_BUTTON
          }, {
            text: "Due to a bug in the Ledger software, your device will display the transaction fee as \"UNKNOWN\".",
            action: LEDGER_RIGHT_BUTTON
          }, {
            text: "Your Ledger will ask you to \"Accept and send\".",
            action: LEDGER_BOTH_BUTTONS
          }]
        });
      }
      return messages;
    }
  }, {
    key: "preProcessingTime",
    value: function preProcessingTime() {
      // FIXME
      return 10;
    }
  }, {
    key: "postProcessingTime",
    value: function postProcessingTime() {
      // FIXME
      return 10;
    }

    /**
     * See {@link https://github.com/LedgerHQ/ledgerjs/tree/master/packages/hw-app-btc#signp2shtransaction}.
     *
     * Input signatures produced will always have a trailing `...01`
     * {@link https://bitcoin.org/en/glossary/sighash-all SIGHASH_ALL}
     * byte.
     */
  }, {
    key: "run",
    value: function () {
      var _run5 = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee21() {
        var _this14 = this;
        var interaction;
        return _regeneratorRuntime().wrap(function _callee21$(_context21) {
          while (1) switch (_context21.prev = _context21.next) {
            case 0:
              _context21.prev = 0;
              _context21.next = 3;
              return _get(_getPrototypeOf(LedgerSignMultisigTransaction.prototype), "run", this).call(this);
            case 3:
              _context21.next = 11;
              break;
            case 5:
              _context21.prev = 5;
              _context21.t0 = _context21["catch"](0);
              if (!(!this.v2Options || !Object.keys(this.v2Options))) {
                _context21.next = 9;
                break;
              }
              throw _context21.t0;
            case 9:
              interaction = new LedgerV2SignMultisigTransaction(this.v2Options);
              return _context21.abrupt("return", interaction.run());
            case 11:
              return _context21.abrupt("return", this.withApp( /*#__PURE__*/function () {
                var _ref17 = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee20(app, transport) {
                  var transactionSignature;
                  return _regeneratorRuntime().wrap(function _callee20$(_context20) {
                    while (1) switch (_context20.prev = _context20.next) {
                      case 0:
                        _context20.prev = 0;
                        // FIXME: Explain the rationale behind this choice.
                        transport.setExchangeTimeout(20000 * _this14.outputs.length);
                        _context20.next = 4;
                        return app.signP2SHTransaction({
                          inputs: _this14.ledgerInputs(),
                          associatedKeysets: _this14.ledgerKeysets(),
                          outputScriptHex: _this14.ledgerOutputScriptHex(),
                          lockTime: 0,
                          // locktime, 0 is no locktime
                          sigHashType: 1,
                          // sighash type, 1 is SIGHASH_ALL
                          segwit: _this14.anySegwitInputs(),
                          transactionVersion: 1 // tx version
                        });
                      case 4:
                        transactionSignature = _context20.sent;
                        if (!(_this14.psbt && !_this14.returnSignatureArray && _this14.pubkeys)) {
                          _context20.next = 9;
                          break;
                        }
                        return _context20.abrupt("return", (0, _unchainedBitcoin.addSignaturesToPSBT)(_this14.network, _this14.psbt, _this14.pubkeys, _this14.parseSignature(transactionSignature, "buffer")));
                      case 9:
                        return _context20.abrupt("return", _this14.parseSignature(transactionSignature, "hex"));
                      case 10:
                        _context20.prev = 10;
                        transport.close();
                        return _context20.finish(10);
                      case 13:
                      case "end":
                        return _context20.stop();
                    }
                  }, _callee20, null, [[0,, 10, 13]]);
                }));
                return function (_x12, _x13) {
                  return _ref17.apply(this, arguments);
                };
              }()));
            case 12:
            case "end":
              return _context21.stop();
          }
        }, _callee21, this, [[0, 5]]);
      }));
      function run() {
        return _run5.apply(this, arguments);
      }
      return run;
    }()
  }, {
    key: "ledgerInputs",
    value: function ledgerInputs() {
      return this.inputs.map(function (input) {
        var addressType = (0, _unchainedBitcoin.multisigAddressType)(input.multisig);
        var inputTransaction = (0, _splitTransaction.splitTransaction)(input.transactionHex, true); // FIXME: should the 2nd parameter here always be true?
        var scriptFn = addressType === _unchainedBitcoin.P2SH ? _unchainedBitcoin.multisigRedeemScript : _unchainedBitcoin.multisigWitnessScript;
        var scriptHex = (0, _unchainedBitcoin.scriptToHex)(scriptFn(input.multisig));
        return [inputTransaction, input.index, scriptHex]; // can add sequence number for RBF as an additional element
      });
    }
  }, {
    key: "ledgerKeysets",
    value: function ledgerKeysets() {
      var _this15 = this;
      return this.bip32Paths.map(function (bip32Path) {
        return _this15.ledgerBIP32Path(bip32Path);
      });
    }
  }, {
    key: "ledgerOutputScriptHex",
    value: function ledgerOutputScriptHex() {
      var txHex = (0, _unchainedBitcoin.unsignedMultisigTransaction)(this.network, this.inputs, this.outputs).toHex();
      var splitTx = (0, _splitTransaction.splitTransaction)(txHex, this.anySegwitInputs());
      return (0, _serializeTransaction.serializeTransactionOutputs)(splitTx).toString("hex");
    }
  }, {
    key: "ledgerBIP32Path",
    value: function ledgerBIP32Path(bip32Path) {
      return bip32Path.split("/").slice(1).join("/");
    }
  }, {
    key: "anySegwitInputs",
    value: function anySegwitInputs() {
      for (var i = 0; i < this.inputs.length; i++) {
        var input = this.inputs[i];
        var addressType = (0, _unchainedBitcoin.multisigAddressType)(input.multisig);
        if (addressType === _unchainedBitcoin.P2SH_P2WSH || addressType === _unchainedBitcoin.P2WSH) {
          return true;
        }
      }
      return false;
    }
  }]);
  return LedgerSignMultisigTransaction;
}(LedgerBitcoinInteraction);
/**
 * Returns a signature for a given message by a single public key.
 */
exports.LedgerSignMultisigTransaction = LedgerSignMultisigTransaction;
var LedgerSignMessage = /*#__PURE__*/function (_LedgerBitcoinInterac3) {
  _inherits(LedgerSignMessage, _LedgerBitcoinInterac3);
  var _super9 = _createSuper(LedgerSignMessage);
  function LedgerSignMessage(_ref18) {
    var _this16;
    var bip32Path = _ref18.bip32Path,
      message = _ref18.message;
    _classCallCheck(this, LedgerSignMessage);
    _this16 = _super9.call(this);
    _defineProperty(_assertThisInitialized(_this16), "bip32Path", void 0);
    _defineProperty(_assertThisInitialized(_this16), "message", void 0);
    _defineProperty(_assertThisInitialized(_this16), "bip32ValidationErrorMessage", void 0);
    _defineProperty(_assertThisInitialized(_this16), "isLegacySupported", true);
    _defineProperty(_assertThisInitialized(_this16), "isV2Supported", false);
    _this16.bip32Path = bip32Path;
    _this16.message = message;
    // this.bip32ValidationErrorMessage = false;

    var bip32PathError = (0, _unchainedBitcoin.validateBIP32Path)(bip32Path);
    if (bip32PathError.length) {
      _this16.bip32ValidationErrorMessage = {
        text: bip32PathError,
        code: "ledger.bip32_path.path_error"
      };
    }
    return _this16;
  }

  /**
   * Adds messages describing the signing flow.
   */
  _createClass(LedgerSignMessage, [{
    key: "messages",
    value: function messages() {
      var messages = _get(_getPrototypeOf(LedgerSignMessage.prototype), "messages", this).call(this);
      if (this.bip32ValidationErrorMessage) {
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
        code: "ledger.sign",
        // (version is optional)
        text: 'Your Ledger will ask you to "Confirm Message" for signing.',
        action: LEDGER_RIGHT_BUTTON
      });
      // TODO: are more messages required?

      return messages;
    }

    /**
     * See {@link https://github.com/LedgerHQ/ledger-live/tree/develop/libs/ledgerjs/packages/hw-app-btc#signmessagenew}.
     */
  }, {
    key: "run",
    value: function () {
      var _run6 = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee23() {
        var _this17 = this;
        return _regeneratorRuntime().wrap(function _callee23$(_context23) {
          while (1) switch (_context23.prev = _context23.next) {
            case 0:
              _context23.next = 2;
              return _get(_getPrototypeOf(LedgerSignMessage.prototype), "run", this).call(this);
            case 2:
              return _context23.abrupt("return", this.withApp( /*#__PURE__*/function () {
                var _ref19 = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee22(app, transport) {
                  var vrs;
                  return _regeneratorRuntime().wrap(function _callee22$(_context22) {
                    while (1) switch (_context22.prev = _context22.next) {
                      case 0:
                        _context22.prev = 0;
                        // TODO: what would be an appropriate amount of time to wait for a
                        // signature?
                        transport.setExchangeTimeout(20000);
                        _context22.next = 4;
                        return app.signMessageNew(_this17.bip32Path, _this17.message);
                      case 4:
                        vrs = _context22.sent;
                        return _context22.abrupt("return", vrs);
                      case 6:
                        _context22.prev = 6;
                        transport.close();
                        return _context22.finish(6);
                      case 9:
                      case "end":
                        return _context22.stop();
                    }
                  }, _callee22, null, [[0,, 6, 9]]);
                }));
                return function (_x14, _x15) {
                  return _ref19.apply(this, arguments);
                };
              }()));
            case 3:
            case "end":
              return _context23.stop();
          }
        }, _callee23, this);
      }));
      function run() {
        return _run6.apply(this, arguments);
      }
      return run;
    }()
  }]);
  return LedgerSignMessage;
}(LedgerBitcoinInteraction);
exports.LedgerSignMessage = LedgerSignMessage;
/**
 * A base class for any interactions that need to interact with a registered wallet
 * by providing a base constructor that will generate the key origins and the policy
 * from a given braid as well as methods for registering and returning a policy hmac
 */
var LedgerBitcoinV2WithRegistrationInteraction = /*#__PURE__*/function (_LedgerBitcoinInterac4) {
  _inherits(LedgerBitcoinV2WithRegistrationInteraction, _LedgerBitcoinInterac4);
  var _super10 = _createSuper(LedgerBitcoinV2WithRegistrationInteraction);
  function LedgerBitcoinV2WithRegistrationInteraction(_ref20) {
    var _this18;
    var policyHmac = _ref20.policyHmac,
      walletConfig = _objectWithoutProperties(_ref20, _excluded);
    _classCallCheck(this, LedgerBitcoinV2WithRegistrationInteraction);
    _this18 = _super10.call(this);
    _defineProperty(_assertThisInitialized(_this18), "walletPolicy", void 0);
    _defineProperty(_assertThisInitialized(_this18), "policyHmac", void 0);
    _defineProperty(_assertThisInitialized(_this18), "policyId", void 0);
    _defineProperty(_assertThisInitialized(_this18), "network", void 0);
    _defineProperty(_assertThisInitialized(_this18), "isLegacySupported", false);
    _defineProperty(_assertThisInitialized(_this18), "isV2Supported", true);
    if (policyHmac) {
      var error = (0, _unchainedBitcoin.validateHex)(policyHmac);
      if (error) throw new Error("Invalid policyHmac");
      // TODO validate length
      _this18.policyHmac = Buffer.from(policyHmac, "hex");
    }
    _this18.network = walletConfig.network;
    _this18.walletPolicy = _policy.MultisigWalletPolicy.FromWalletConfig(walletConfig);
    return _this18;
  }
  _createClass(LedgerBitcoinV2WithRegistrationInteraction, [{
    key: "messages",
    value: function messages() {
      var messages = _get(_getPrototypeOf(LedgerBitcoinV2WithRegistrationInteraction.prototype), "messages", this).call(this);
      messages.push({
        state: _interaction.PENDING,
        level: _interaction.INFO,
        code: "ledger.register",
        version: ">=2.1.0",
        text: "New Ledger functionality requires registering wallet details on device before signing a transaction."
      });
      return messages;
    }
  }, {
    key: "POLICY_HMAC",
    get: function get() {
      if (this.policyHmac) return this.policyHmac?.toString("hex");
      return "";
    },
    set: function set(policyHmac) {
      this.policyHmac = Buffer.from(policyHmac, "hex");
    }
  }, {
    key: "getXfp",
    value: function () {
      var _getXfp2 = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee25() {
        return _regeneratorRuntime().wrap(function _callee25$(_context25) {
          while (1) switch (_context25.prev = _context25.next) {
            case 0:
              return _context25.abrupt("return", this.withApp( /*#__PURE__*/function () {
                var _ref21 = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee24(app) {
                  return _regeneratorRuntime().wrap(function _callee24$(_context24) {
                    while (1) switch (_context24.prev = _context24.next) {
                      case 0:
                        return _context24.abrupt("return", app.getMasterFingerprint());
                      case 1:
                      case "end":
                        return _context24.stop();
                    }
                  }, _callee24);
                }));
                return function (_x16) {
                  return _ref21.apply(this, arguments);
                };
              }()));
            case 1:
            case "end":
              return _context25.stop();
          }
        }, _callee25, this);
      }));
      function getXfp() {
        return _getXfp2.apply(this, arguments);
      }
      return getXfp;
    }()
  }, {
    key: "registerWallet",
    value: function () {
      var _registerWallet = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee27() {
        var _this19 = this;
        var verify,
          _args27 = arguments;
        return _regeneratorRuntime().wrap(function _callee27$(_context27) {
          while (1) switch (_context27.prev = _context27.next) {
            case 0:
              verify = _args27.length > 0 && _args27[0] !== undefined ? _args27[0] : false;
              if (!(this.policyHmac && !verify)) {
                _context27.next = 3;
                break;
              }
              return _context27.abrupt("return", Promise.resolve(this.policyHmac));
            case 3:
              return _context27.abrupt("return", this.withApp( /*#__PURE__*/function () {
                var _ref22 = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee26(app) {
                  var policy, _yield$app$registerWa, _yield$app$registerWa2, policyId, policyHmac, buff;
                  return _regeneratorRuntime().wrap(function _callee26$(_context26) {
                    while (1) switch (_context26.prev = _context26.next) {
                      case 0:
                        policy = _this19.walletPolicy.toLedgerPolicy();
                        _context26.next = 3;
                        return app.registerWallet(policy);
                      case 3:
                        _yield$app$registerWa = _context26.sent;
                        _yield$app$registerWa2 = _slicedToArray(_yield$app$registerWa, 2);
                        policyId = _yield$app$registerWa2[0];
                        policyHmac = _yield$app$registerWa2[1];
                        buff = Buffer.from(policyHmac);
                        if (verify && _this19.policyHmac && _this19.policyHmac.toString("hex") !== buff.toString("hex")) {
                          console.error("Policy registrations did not match. Expected ".concat(_this19.policyHmac.toString("hex"), "; Actual: ").concat(buff.toString("hex")));
                        }
                        _this19.policyHmac = buff;
                        _this19.policyId = policyId;
                        return _context26.abrupt("return", buff);
                      case 12:
                      case "end":
                        return _context26.stop();
                    }
                  }, _callee26);
                }));
                return function (_x17) {
                  return _ref22.apply(this, arguments);
                };
              }()));
            case 4:
            case "end":
              return _context27.stop();
          }
        }, _callee27, this);
      }));
      function registerWallet() {
        return _registerWallet.apply(this, arguments);
      }
      return registerWallet;
    }()
  }]);
  return LedgerBitcoinV2WithRegistrationInteraction;
}(LedgerBitcoinInteraction);
exports.LedgerBitcoinV2WithRegistrationInteraction = LedgerBitcoinV2WithRegistrationInteraction;
var LedgerRegisterWalletPolicy = /*#__PURE__*/function (_LedgerBitcoinV2WithR) {
  _inherits(LedgerRegisterWalletPolicy, _LedgerBitcoinV2WithR);
  var _super11 = _createSuper(LedgerRegisterWalletPolicy);
  function LedgerRegisterWalletPolicy(_ref23) {
    var _this20;
    var _ref23$verify = _ref23.verify,
      verify = _ref23$verify === void 0 ? false : _ref23$verify,
      policyHmac = _ref23.policyHmac,
      walletConfig = _objectWithoutProperties(_ref23, _excluded2);
    _classCallCheck(this, LedgerRegisterWalletPolicy);
    _this20 = _super11.call(this, _objectSpread({
      policyHmac: policyHmac
    }, walletConfig));
    _defineProperty(_assertThisInitialized(_this20), "verify", void 0);
    _this20.verify = verify;
    return _this20;
  }
  _createClass(LedgerRegisterWalletPolicy, [{
    key: "messages",
    value: function messages() {
      var messages = _get(_getPrototypeOf(LedgerRegisterWalletPolicy.prototype), "messages", this).call(this);
      if (!this.POLICY_HMAC || this.verify) {
        messages.push({
          state: _interaction.ACTIVE,
          level: _interaction.INFO,
          code: "ledger.register",
          version: ">=2.1.0",
          text: "Confirm each detail about your wallet policy: name, policy, and signing key details",
          messages: [{
            text: "Your ledger will first ask you to confirm the wallet name",
            action: LEDGER_RIGHT_BUTTON
          }, {
            text: "Next you will have to approve the policy, e.g. sh(sortedmulti(2,@0/**,@1/**,@2/**))",
            action: LEDGER_RIGHT_BUTTON
          }, {
            text: "Then you can approve the data you've seen",
            action: LEDGER_BOTH_BUTTONS
          }, {
            text: "Finally, approve the key info for each key (root fingerprint, bip32 path, and xpub)",
            action: LEDGER_RIGHT_BUTTON
          }]
        });
      }
      return messages;
    }
  }, {
    key: "run",
    value: function () {
      var _run7 = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee28() {
        var policy;
        return _regeneratorRuntime().wrap(function _callee28$(_context28) {
          while (1) switch (_context28.prev = _context28.next) {
            case 0:
              _context28.prev = 0;
              _context28.next = 3;
              return _get(_getPrototypeOf(LedgerRegisterWalletPolicy.prototype), "run", this).call(this);
            case 3:
              _context28.next = 5;
              return this.registerWallet(this.verify);
            case 5:
              policy = _context28.sent;
              return _context28.abrupt("return", Buffer.from(policy).toString("hex"));
            case 7:
              _context28.prev = 7;
              _context28.next = 10;
              return _get(_getPrototypeOf(LedgerRegisterWalletPolicy.prototype), "closeTransport", this).call(this);
            case 10:
              return _context28.finish(7);
            case 11:
            case "end":
              return _context28.stop();
          }
        }, _callee28, this, [[0,, 7, 11]]);
      }));
      function run() {
        return _run7.apply(this, arguments);
      }
      return run;
    }()
  }]);
  return LedgerRegisterWalletPolicy;
}(LedgerBitcoinV2WithRegistrationInteraction);
exports.LedgerRegisterWalletPolicy = LedgerRegisterWalletPolicy;
/**
 * Interaction for confirming an address on a ledger device. Requires a registered
 * wallet to complete successfully. Only supported on Ledger v2.1.0 or above.
 */
var LedgerConfirmMultisigAddress = /*#__PURE__*/function (_LedgerBitcoinV2WithR2) {
  _inherits(LedgerConfirmMultisigAddress, _LedgerBitcoinV2WithR2);
  var _super12 = _createSuper(LedgerConfirmMultisigAddress);
  function LedgerConfirmMultisigAddress(_ref24) {
    var _this21;
    var policyHmac = _ref24.policyHmac,
      display = _ref24.display,
      expected = _ref24.expected,
      bip32Path = _ref24.bip32Path,
      walletConfig = _objectWithoutProperties(_ref24, _excluded3);
    _classCallCheck(this, LedgerConfirmMultisigAddress);
    _this21 = _super12.call(this, _objectSpread({
      policyHmac: policyHmac
    }, walletConfig));

    // Get braid and address indexes from the bip32 path This should
    // always be the final 2 elements in the path.
    _defineProperty(_assertThisInitialized(_this21), "braidIndex", void 0);
    _defineProperty(_assertThisInitialized(_this21), "addressIndex", void 0);
    _defineProperty(_assertThisInitialized(_this21), "expected", void 0);
    _defineProperty(_assertThisInitialized(_this21), "display", true);
    var _bip32Path$split$slic = bip32Path.split("/").slice(-2).map(function (index) {
        return Number(index);
      }),
      _bip32Path$split$slic2 = _slicedToArray(_bip32Path$split$slic, 2),
      braidIndex = _bip32Path$split$slic2[0],
      addressIndex = _bip32Path$split$slic2[1];
    if (braidIndex !== 1 && braidIndex !== 0) {
      throw new Error("Invalid braid index ".concat(braidIndex));
    }
    _this21.braidIndex = braidIndex;
    if (addressIndex < 0) throw new Error("Invalid address index ".concat(addressIndex));
    _this21.addressIndex = addressIndex;
    if (display) {
      _this21.display = display;
    }
    _this21.expected = expected;
    return _this21;
  }

  /**
   * Adds messages about BIP32 path warnings.
   */
  _createClass(LedgerConfirmMultisigAddress, [{
    key: "messages",
    value: function messages() {
      var messages = _get(_getPrototypeOf(LedgerConfirmMultisigAddress.prototype), "messages", this).call(this);
      messages.push({
        state: _interaction.PENDING,
        level: _interaction.INFO,
        code: "ledger.confirm.address",
        version: ">2.1.0",
        text: "It can take a moment for the ledger to process the wallet and address data"
      });
      if (this.display) {
        messages.push({
          state: _interaction.ACTIVE,
          level: _interaction.INFO,
          code: "ledger.confirm.address",
          version: ">=2.1.0",
          text: "Confirm that the wallet name the address is from is correct",
          action: LEDGER_RIGHT_BUTTON
        }, {
          state: _interaction.ACTIVE,
          level: _interaction.INFO,
          code: "ledger.confirm.address",
          version: ">=2.1.0",
          text: "Then your Ledger will show the address across several screens. Verify this matches the address you are confirming.",
          action: LEDGER_RIGHT_BUTTON
        });
      }
      return messages;
    }
  }, {
    key: "getAddress",
    value: function getAddress() {
      var _this22 = this;
      return this.withApp( /*#__PURE__*/function () {
        var _ref25 = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee29(app) {
          return _regeneratorRuntime().wrap(function _callee29$(_context29) {
            while (1) switch (_context29.prev = _context29.next) {
              case 0:
                if (_this22.POLICY_HMAC) {
                  _context29.next = 2;
                  break;
                }
                throw new Error("Can't get wallet address without a wallet registration");
              case 2:
                return _context29.abrupt("return", app.getWalletAddress(_this22.walletPolicy.toLedgerPolicy(), Buffer.from(_this22.POLICY_HMAC, "hex"), _this22.braidIndex, _this22.addressIndex, _this22.display));
              case 3:
              case "end":
                return _context29.stop();
            }
          }, _callee29);
        }));
        return function (_x18) {
          return _ref25.apply(this, arguments);
        };
      }());
    }
  }, {
    key: "run",
    value: function () {
      var _run8 = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee30() {
        return _regeneratorRuntime().wrap(function _callee30$(_context30) {
          while (1) switch (_context30.prev = _context30.next) {
            case 0:
              _context30.prev = 0;
              _context30.next = 3;
              return _get(_getPrototypeOf(LedgerConfirmMultisigAddress.prototype), "run", this).call(this);
            case 3:
              _context30.next = 5;
              return this.registerWallet();
            case 5:
              _context30.next = 7;
              return this.getAddress();
            case 7:
              return _context30.abrupt("return", _context30.sent);
            case 8:
              _context30.prev = 8;
              _context30.next = 11;
              return _get(_getPrototypeOf(LedgerConfirmMultisigAddress.prototype), "closeTransport", this).call(this);
            case 11:
              return _context30.finish(8);
            case 12:
            case "end":
              return _context30.stop();
          }
        }, _callee30, this, [[0,, 8, 12]]);
      }));
      function run() {
        return _run8.apply(this, arguments);
      }
      return run;
    }()
  }]);
  return LedgerConfirmMultisigAddress;
}(LedgerBitcoinV2WithRegistrationInteraction); // a Buffer with either a 33-byte compressed pubkey or a 32-byte
// x-only pubkey whose corresponding secret key was used to sign;
// a Buffer with the corresponding signature.
// return type of ledger after signing
exports.LedgerConfirmMultisigAddress = LedgerConfirmMultisigAddress;
var LedgerV2SignMultisigTransaction = /*#__PURE__*/function (_LedgerBitcoinV2WithR3) {
  _inherits(LedgerV2SignMultisigTransaction, _LedgerBitcoinV2WithR3);
  var _super13 = _createSuper(LedgerV2SignMultisigTransaction);
  // optionally, a callback that will be called every time a signature is produced during
  //  * the signing process. The callback does not receive any argument, but can be used to track progress.

  // keeping this until we have a way to add signatures to psbtv2 directly
  // this will store the the PSBT that was was passed in via args

  function LedgerV2SignMultisigTransaction(_ref26) {
    var _this23;
    var psbt = _ref26.psbt,
      progressCallback = _ref26.progressCallback,
      policyHmac = _ref26.policyHmac,
      _ref26$returnSignatur = _ref26.returnSignatureArray,
      returnSignatureArray = _ref26$returnSignatur === void 0 ? false : _ref26$returnSignatur,
      walletConfig = _objectWithoutProperties(_ref26, _excluded4);
    _classCallCheck(this, LedgerV2SignMultisigTransaction);
    _this23 = _super13.call(this, _objectSpread({
      policyHmac: policyHmac
    }, walletConfig));
    _defineProperty(_assertThisInitialized(_this23), "psbt", void 0);
    _defineProperty(_assertThisInitialized(_this23), "returnSignatureArray", void 0);
    _defineProperty(_assertThisInitialized(_this23), "signatures", []);
    _defineProperty(_assertThisInitialized(_this23), "progressCallback", void 0);
    _defineProperty(_assertThisInitialized(_this23), "unsignedPsbt", void 0);
    if (progressCallback) _this23.progressCallback = progressCallback;
    _this23.returnSignatureArray = returnSignatureArray;
    _this23.unsignedPsbt = Buffer.isBuffer(psbt) ? psbt.toString("base64") : psbt;
    var psbtVersion = (0, _unchainedBitcoin.getPsbtVersionNumber)(psbt);
    switch (psbtVersion) {
      case 0:
        _this23.psbt = _unchainedBitcoin.PsbtV2.FromV0(psbt, true);
        break;
      case 2:
        _this23.psbt = new _unchainedBitcoin.PsbtV2(psbt);
        break;
      default:
        throw new Error("PSBT of unsupported version ".concat(psbtVersion));
    }
    return _this23;
  }
  _createClass(LedgerV2SignMultisigTransaction, [{
    key: "signPsbt",
    value: function () {
      var _signPsbt = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee32() {
        var _this24 = this;
        return _regeneratorRuntime().wrap(function _callee32$(_context32) {
          while (1) switch (_context32.prev = _context32.next) {
            case 0:
              return _context32.abrupt("return", this.withApp( /*#__PURE__*/function () {
                var _ref27 = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee31(app) {
                  var ledgerPsbt;
                  return _regeneratorRuntime().wrap(function _callee31$(_context31) {
                    while (1) switch (_context31.prev = _context31.next) {
                      case 0:
                        ledgerPsbt = new _ledgerBitcoin.PsbtV2();
                        ledgerPsbt.deserialize(Buffer.from(_this24.psbt.serialize("base64"), "base64"));
                        _context31.next = 4;
                        return app.signPsbt(ledgerPsbt, _this24.walletPolicy.toLedgerPolicy(), Buffer.from(_this24.POLICY_HMAC, "hex") || null, _this24.progressCallback);
                      case 4:
                        _this24.signatures = _context31.sent;
                      case 5:
                      case "end":
                        return _context31.stop();
                    }
                  }, _callee31);
                }));
                return function (_x19) {
                  return _ref27.apply(this, arguments);
                };
              }()));
            case 1:
            case "end":
              return _context32.stop();
          }
        }, _callee32, this);
      }));
      function signPsbt() {
        return _signPsbt.apply(this, arguments);
      }
      return signPsbt;
    }()
  }, {
    key: "SIGNATURES",
    get: function get() {
      return this.signatures.map(function (sig) {
        return Buffer.from(sig[1].signature).toString("hex");
      });
    }
  }, {
    key: "SIGNED_PSTBT",
    get: function get() {
      return (0, _unchainedBitcoin.addSignaturesToPSBT)(this.network, this.unsignedPsbt,
      // array of pubkeys as buffers
      this.signatures.map(function (sig) {
        return Buffer.from(sig[1].pubkey);
      }),
      // array of sigs as buffers
      this.signatures.map(function (sig) {
        return Buffer.from(sig[1].signature);
      }));
    }
  }, {
    key: "run",
    value: function () {
      var _run9 = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee33() {
        return _regeneratorRuntime().wrap(function _callee33$(_context33) {
          while (1) switch (_context33.prev = _context33.next) {
            case 0:
              _context33.prev = 0;
              _context33.next = 3;
              return _get(_getPrototypeOf(LedgerV2SignMultisigTransaction.prototype), "run", this).call(this);
            case 3:
              _context33.next = 5;
              return this.registerWallet();
            case 5:
              _context33.next = 7;
              return this.signPsbt();
            case 7:
              if (!this.returnSignatureArray) {
                _context33.next = 9;
                break;
              }
              return _context33.abrupt("return", this.SIGNATURES);
            case 9:
              return _context33.abrupt("return", this.SIGNED_PSTBT);
            case 10:
              _context33.prev = 10;
              _context33.next = 13;
              return _get(_getPrototypeOf(LedgerV2SignMultisigTransaction.prototype), "closeTransport", this).call(this);
            case 13:
              return _context33.finish(10);
            case 14:
            case "end":
              return _context33.stop();
          }
        }, _callee33, this, [[0,, 10, 14]]);
      }));
      function run() {
        return _run9.apply(this, arguments);
      }
      return run;
    }()
  }]);
  return LedgerV2SignMultisigTransaction;
}(LedgerBitcoinV2WithRegistrationInteraction);
exports.LedgerV2SignMultisigTransaction = LedgerV2SignMultisigTransaction;