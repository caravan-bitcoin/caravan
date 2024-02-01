"use strict";

require("core-js/modules/es6.function.name");
require("core-js/modules/es6.array.for-each");
require("core-js/modules/es6.promise");
require("core-js/modules/es6.object.to-string");
require("core-js/modules/es6.reflect.get");
require("core-js/modules/es6.object.create");
require("core-js/modules/es6.reflect.construct");
require("core-js/modules/es6.function.bind");
require("core-js/modules/es6.object.set-prototype-of");
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.WARNING = exports.UnsupportedInteraction = exports.UNSUPPORTED = exports.STATES = exports.PENDING = exports.LEVELS = exports.KeystoreInteraction = exports.IndirectKeystoreInteraction = exports.INFO = exports.ERROR = exports.DirectKeystoreInteraction = exports.ACTIVE = void 0;
require("core-js/modules/es6.array.map");
require("regenerator-runtime/runtime");
require("core-js/modules/es6.regexp.match");
require("core-js/modules/es6.array.filter");
require("core-js/modules/es6.number.constructor");
require("core-js/modules/es7.symbol.async-iterator");
require("core-js/modules/es6.symbol");
require("core-js/modules/es6.object.define-property");
var _bowser = _interopRequireDefault(require("bowser"));
var _unchainedBitcoin = require("unchained-bitcoin");
function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }
function _regeneratorRuntime() { "use strict"; /*! regenerator-runtime -- Copyright (c) 2014-present, Facebook, Inc. -- license (MIT): https://github.com/facebook/regenerator/blob/main/LICENSE */ _regeneratorRuntime = function _regeneratorRuntime() { return exports; }; var exports = {}, Op = Object.prototype, hasOwn = Op.hasOwnProperty, defineProperty = Object.defineProperty || function (obj, key, desc) { obj[key] = desc.value; }, $Symbol = "function" == typeof Symbol ? Symbol : {}, iteratorSymbol = $Symbol.iterator || "@@iterator", asyncIteratorSymbol = $Symbol.asyncIterator || "@@asyncIterator", toStringTagSymbol = $Symbol.toStringTag || "@@toStringTag"; function define(obj, key, value) { return Object.defineProperty(obj, key, { value: value, enumerable: !0, configurable: !0, writable: !0 }), obj[key]; } try { define({}, ""); } catch (err) { define = function define(obj, key, value) { return obj[key] = value; }; } function wrap(innerFn, outerFn, self, tryLocsList) { var protoGenerator = outerFn && outerFn.prototype instanceof Generator ? outerFn : Generator, generator = Object.create(protoGenerator.prototype), context = new Context(tryLocsList || []); return defineProperty(generator, "_invoke", { value: makeInvokeMethod(innerFn, self, context) }), generator; } function tryCatch(fn, obj, arg) { try { return { type: "normal", arg: fn.call(obj, arg) }; } catch (err) { return { type: "throw", arg: err }; } } exports.wrap = wrap; var ContinueSentinel = {}; function Generator() {} function GeneratorFunction() {} function GeneratorFunctionPrototype() {} var IteratorPrototype = {}; define(IteratorPrototype, iteratorSymbol, function () { return this; }); var getProto = Object.getPrototypeOf, NativeIteratorPrototype = getProto && getProto(getProto(values([]))); NativeIteratorPrototype && NativeIteratorPrototype !== Op && hasOwn.call(NativeIteratorPrototype, iteratorSymbol) && (IteratorPrototype = NativeIteratorPrototype); var Gp = GeneratorFunctionPrototype.prototype = Generator.prototype = Object.create(IteratorPrototype); function defineIteratorMethods(prototype) { ["next", "throw", "return"].forEach(function (method) { define(prototype, method, function (arg) { return this._invoke(method, arg); }); }); } function AsyncIterator(generator, PromiseImpl) { function invoke(method, arg, resolve, reject) { var record = tryCatch(generator[method], generator, arg); if ("throw" !== record.type) { var result = record.arg, value = result.value; return value && "object" == _typeof(value) && hasOwn.call(value, "__await") ? PromiseImpl.resolve(value.__await).then(function (value) { invoke("next", value, resolve, reject); }, function (err) { invoke("throw", err, resolve, reject); }) : PromiseImpl.resolve(value).then(function (unwrapped) { result.value = unwrapped, resolve(result); }, function (error) { return invoke("throw", error, resolve, reject); }); } reject(record.arg); } var previousPromise; defineProperty(this, "_invoke", { value: function value(method, arg) { function callInvokeWithMethodAndArg() { return new PromiseImpl(function (resolve, reject) { invoke(method, arg, resolve, reject); }); } return previousPromise = previousPromise ? previousPromise.then(callInvokeWithMethodAndArg, callInvokeWithMethodAndArg) : callInvokeWithMethodAndArg(); } }); } function makeInvokeMethod(innerFn, self, context) { var state = "suspendedStart"; return function (method, arg) { if ("executing" === state) throw new Error("Generator is already running"); if ("completed" === state) { if ("throw" === method) throw arg; return doneResult(); } for (context.method = method, context.arg = arg;;) { var delegate = context.delegate; if (delegate) { var delegateResult = maybeInvokeDelegate(delegate, context); if (delegateResult) { if (delegateResult === ContinueSentinel) continue; return delegateResult; } } if ("next" === context.method) context.sent = context._sent = context.arg;else if ("throw" === context.method) { if ("suspendedStart" === state) throw state = "completed", context.arg; context.dispatchException(context.arg); } else "return" === context.method && context.abrupt("return", context.arg); state = "executing"; var record = tryCatch(innerFn, self, context); if ("normal" === record.type) { if (state = context.done ? "completed" : "suspendedYield", record.arg === ContinueSentinel) continue; return { value: record.arg, done: context.done }; } "throw" === record.type && (state = "completed", context.method = "throw", context.arg = record.arg); } }; } function maybeInvokeDelegate(delegate, context) { var methodName = context.method, method = delegate.iterator[methodName]; if (undefined === method) return context.delegate = null, "throw" === methodName && delegate.iterator["return"] && (context.method = "return", context.arg = undefined, maybeInvokeDelegate(delegate, context), "throw" === context.method) || "return" !== methodName && (context.method = "throw", context.arg = new TypeError("The iterator does not provide a '" + methodName + "' method")), ContinueSentinel; var record = tryCatch(method, delegate.iterator, context.arg); if ("throw" === record.type) return context.method = "throw", context.arg = record.arg, context.delegate = null, ContinueSentinel; var info = record.arg; return info ? info.done ? (context[delegate.resultName] = info.value, context.next = delegate.nextLoc, "return" !== context.method && (context.method = "next", context.arg = undefined), context.delegate = null, ContinueSentinel) : info : (context.method = "throw", context.arg = new TypeError("iterator result is not an object"), context.delegate = null, ContinueSentinel); } function pushTryEntry(locs) { var entry = { tryLoc: locs[0] }; 1 in locs && (entry.catchLoc = locs[1]), 2 in locs && (entry.finallyLoc = locs[2], entry.afterLoc = locs[3]), this.tryEntries.push(entry); } function resetTryEntry(entry) { var record = entry.completion || {}; record.type = "normal", delete record.arg, entry.completion = record; } function Context(tryLocsList) { this.tryEntries = [{ tryLoc: "root" }], tryLocsList.forEach(pushTryEntry, this), this.reset(!0); } function values(iterable) { if (iterable) { var iteratorMethod = iterable[iteratorSymbol]; if (iteratorMethod) return iteratorMethod.call(iterable); if ("function" == typeof iterable.next) return iterable; if (!isNaN(iterable.length)) { var i = -1, next = function next() { for (; ++i < iterable.length;) if (hasOwn.call(iterable, i)) return next.value = iterable[i], next.done = !1, next; return next.value = undefined, next.done = !0, next; }; return next.next = next; } } return { next: doneResult }; } function doneResult() { return { value: undefined, done: !0 }; } return GeneratorFunction.prototype = GeneratorFunctionPrototype, defineProperty(Gp, "constructor", { value: GeneratorFunctionPrototype, configurable: !0 }), defineProperty(GeneratorFunctionPrototype, "constructor", { value: GeneratorFunction, configurable: !0 }), GeneratorFunction.displayName = define(GeneratorFunctionPrototype, toStringTagSymbol, "GeneratorFunction"), exports.isGeneratorFunction = function (genFun) { var ctor = "function" == typeof genFun && genFun.constructor; return !!ctor && (ctor === GeneratorFunction || "GeneratorFunction" === (ctor.displayName || ctor.name)); }, exports.mark = function (genFun) { return Object.setPrototypeOf ? Object.setPrototypeOf(genFun, GeneratorFunctionPrototype) : (genFun.__proto__ = GeneratorFunctionPrototype, define(genFun, toStringTagSymbol, "GeneratorFunction")), genFun.prototype = Object.create(Gp), genFun; }, exports.awrap = function (arg) { return { __await: arg }; }, defineIteratorMethods(AsyncIterator.prototype), define(AsyncIterator.prototype, asyncIteratorSymbol, function () { return this; }), exports.AsyncIterator = AsyncIterator, exports.async = function (innerFn, outerFn, self, tryLocsList, PromiseImpl) { void 0 === PromiseImpl && (PromiseImpl = Promise); var iter = new AsyncIterator(wrap(innerFn, outerFn, self, tryLocsList), PromiseImpl); return exports.isGeneratorFunction(outerFn) ? iter : iter.next().then(function (result) { return result.done ? result.value : iter.next(); }); }, defineIteratorMethods(Gp), define(Gp, toStringTagSymbol, "Generator"), define(Gp, iteratorSymbol, function () { return this; }), define(Gp, "toString", function () { return "[object Generator]"; }), exports.keys = function (val) { var object = Object(val), keys = []; for (var key in object) keys.push(key); return keys.reverse(), function next() { for (; keys.length;) { var key = keys.pop(); if (key in object) return next.value = key, next.done = !1, next; } return next.done = !0, next; }; }, exports.values = values, Context.prototype = { constructor: Context, reset: function reset(skipTempReset) { if (this.prev = 0, this.next = 0, this.sent = this._sent = undefined, this.done = !1, this.delegate = null, this.method = "next", this.arg = undefined, this.tryEntries.forEach(resetTryEntry), !skipTempReset) for (var name in this) "t" === name.charAt(0) && hasOwn.call(this, name) && !isNaN(+name.slice(1)) && (this[name] = undefined); }, stop: function stop() { this.done = !0; var rootRecord = this.tryEntries[0].completion; if ("throw" === rootRecord.type) throw rootRecord.arg; return this.rval; }, dispatchException: function dispatchException(exception) { if (this.done) throw exception; var context = this; function handle(loc, caught) { return record.type = "throw", record.arg = exception, context.next = loc, caught && (context.method = "next", context.arg = undefined), !!caught; } for (var i = this.tryEntries.length - 1; i >= 0; --i) { var entry = this.tryEntries[i], record = entry.completion; if ("root" === entry.tryLoc) return handle("end"); if (entry.tryLoc <= this.prev) { var hasCatch = hasOwn.call(entry, "catchLoc"), hasFinally = hasOwn.call(entry, "finallyLoc"); if (hasCatch && hasFinally) { if (this.prev < entry.catchLoc) return handle(entry.catchLoc, !0); if (this.prev < entry.finallyLoc) return handle(entry.finallyLoc); } else if (hasCatch) { if (this.prev < entry.catchLoc) return handle(entry.catchLoc, !0); } else { if (!hasFinally) throw new Error("try statement without catch or finally"); if (this.prev < entry.finallyLoc) return handle(entry.finallyLoc); } } } }, abrupt: function abrupt(type, arg) { for (var i = this.tryEntries.length - 1; i >= 0; --i) { var entry = this.tryEntries[i]; if (entry.tryLoc <= this.prev && hasOwn.call(entry, "finallyLoc") && this.prev < entry.finallyLoc) { var finallyEntry = entry; break; } } finallyEntry && ("break" === type || "continue" === type) && finallyEntry.tryLoc <= arg && arg <= finallyEntry.finallyLoc && (finallyEntry = null); var record = finallyEntry ? finallyEntry.completion : {}; return record.type = type, record.arg = arg, finallyEntry ? (this.method = "next", this.next = finallyEntry.finallyLoc, ContinueSentinel) : this.complete(record); }, complete: function complete(record, afterLoc) { if ("throw" === record.type) throw record.arg; return "break" === record.type || "continue" === record.type ? this.next = record.arg : "return" === record.type ? (this.rval = this.arg = record.arg, this.method = "return", this.next = "end") : "normal" === record.type && afterLoc && (this.next = afterLoc), ContinueSentinel; }, finish: function finish(finallyLoc) { for (var i = this.tryEntries.length - 1; i >= 0; --i) { var entry = this.tryEntries[i]; if (entry.finallyLoc === finallyLoc) return this.complete(entry.completion, entry.afterLoc), resetTryEntry(entry), ContinueSentinel; } }, "catch": function _catch(tryLoc) { for (var i = this.tryEntries.length - 1; i >= 0; --i) { var entry = this.tryEntries[i]; if (entry.tryLoc === tryLoc) { var record = entry.completion; if ("throw" === record.type) { var thrown = record.arg; resetTryEntry(entry); } return thrown; } } throw new Error("illegal catch attempt"); }, delegateYield: function delegateYield(iterable, resultName, nextLoc) { return this.delegate = { iterator: values(iterable), resultName: resultName, nextLoc: nextLoc }, "next" === this.method && (this.arg = undefined), ContinueSentinel; } }, exports; }
function asyncGeneratorStep(gen, resolve, reject, _next, _throw, key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { Promise.resolve(value).then(_next, _throw); } }
function _asyncToGenerator(fn) { return function () { var self = this, args = arguments; return new Promise(function (resolve, reject) { var gen = fn.apply(self, args); function _next(value) { asyncGeneratorStep(gen, resolve, reject, _next, _throw, "next", value); } function _throw(err) { asyncGeneratorStep(gen, resolve, reject, _next, _throw, "throw", err); } _next(undefined); }); }; }
function _get() { if (typeof Reflect !== "undefined" && Reflect.get) { _get = Reflect.get.bind(); } else { _get = function _get(target, property, receiver) { var base = _superPropBase(target, property); if (!base) return; var desc = Object.getOwnPropertyDescriptor(base, property); if (desc.get) { return desc.get.call(arguments.length < 3 ? target : receiver); } return desc.value; }; } return _get.apply(this, arguments); }
function _superPropBase(object, property) { while (!Object.prototype.hasOwnProperty.call(object, property)) { object = _getPrototypeOf(object); if (object === null) break; } return object; }
function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function"); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, writable: true, configurable: true } }); Object.defineProperty(subClass, "prototype", { writable: false }); if (superClass) _setPrototypeOf(subClass, superClass); }
function _setPrototypeOf(o, p) { _setPrototypeOf = Object.setPrototypeOf ? Object.setPrototypeOf.bind() : function _setPrototypeOf(o, p) { o.__proto__ = p; return o; }; return _setPrototypeOf(o, p); }
function _createSuper(Derived) { var hasNativeReflectConstruct = _isNativeReflectConstruct(); return function _createSuperInternal() { var Super = _getPrototypeOf(Derived), result; if (hasNativeReflectConstruct) { var NewTarget = _getPrototypeOf(this).constructor; result = Reflect.construct(Super, arguments, NewTarget); } else { result = Super.apply(this, arguments); } return _possibleConstructorReturn(this, result); }; }
function _possibleConstructorReturn(self, call) { if (call && (_typeof(call) === "object" || typeof call === "function")) { return call; } else if (call !== void 0) { throw new TypeError("Derived constructors may only return object or undefined"); } return _assertThisInitialized(self); }
function _assertThisInitialized(self) { if (self === void 0) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return self; }
function _isNativeReflectConstruct() { if (typeof Reflect === "undefined" || !Reflect.construct) return false; if (Reflect.construct.sham) return false; if (typeof Proxy === "function") return true; try { Boolean.prototype.valueOf.call(Reflect.construct(Boolean, [], function () {})); return true; } catch (e) { return false; } }
function _getPrototypeOf(o) { _getPrototypeOf = Object.setPrototypeOf ? Object.getPrototypeOf.bind() : function _getPrototypeOf(o) { return o.__proto__ || Object.getPrototypeOf(o); }; return _getPrototypeOf(o); }
function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }
function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, _toPropertyKey(descriptor.key), descriptor); } }
function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); Object.defineProperty(Constructor, "prototype", { writable: false }); return Constructor; }
function _typeof(obj) { "@babel/helpers - typeof"; return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (obj) { return typeof obj; } : function (obj) { return obj && "function" == typeof Symbol && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }, _typeof(obj); }
function _defineProperty(obj, key, value) { key = _toPropertyKey(key); if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }
function _toPropertyKey(arg) { var key = _toPrimitive(arg, "string"); return _typeof(key) === "symbol" ? key : String(key); }
function _toPrimitive(input, hint) { if (_typeof(input) !== "object" || input === null) return input; var prim = input[Symbol.toPrimitive]; if (prim !== undefined) { var res = prim.call(input, hint || "default"); if (_typeof(res) !== "object") return res; throw new TypeError("@@toPrimitive must return a primitive value."); } return (hint === "string" ? String : Number)(input); } /**
                                                                                                                                                                                                                                                                                                                                                                                               * This module provides base classes for modeling interactions with
                                                                                                                                                                                                                                                                                                                                                                                               * keystores.
                                                                                                                                                                                                                                                                                                                                                                                               *
                                                                                                                                                                                                                                                                                                                                                                                               * It also defines several constants used throughout the API for
                                                                                                                                                                                                                                                                                                                                                                                               * categorizing messages.
                                                                                                                                                                                                                                                                                                                                                                                               *
                                                                                                                                                                                                                                                                                                                                                                                               * Integrations with new wallets should begin by creating a base class
                                                                                                                                                                                                                                                                                                                                                                                               * for that wallet by subclassing either `DirectKeystoreInteraction`
                                                                                                                                                                                                                                                                                                                                                                                               * or `IndirectKeystoreInteraction`.
                                                                                                                                                                                                                                                                                                                                                                                               */
/**
 * Constant representing a keystore which is unsupported due to the
 * kind of interaction or combination of paramters provided.
 */
var UNSUPPORTED = "unsupported";

/**
 * Constant representing a keystore pending activation by the user.
 */
exports.UNSUPPORTED = UNSUPPORTED;
var PENDING = "pending";

/**
 * Constant representing a keystore in active use.
 */
exports.PENDING = PENDING;
var ACTIVE = "active";

/**
 * Constant for messages at the "info" level.
 */
exports.ACTIVE = ACTIVE;
var INFO = "info";

/**
 * Constant for messages at the "warning" level.
 */
exports.INFO = INFO;
var WARNING = "warning";

/**
 * Constant for messages at the "error" level.
 */
exports.WARNING = WARNING;
var ERROR = "error";

/**
 * Enumeration of possible keystore states ([PENDING]{@link module:interaction.PENDING}|[ACTIVE]{@link module:interaction.ACTIVE}|[UNSUPPORTED]{@link module:interaction.UNSUPPORTED}).
 *
 */
exports.ERROR = ERROR;
var STATES = [PENDING, ACTIVE, UNSUPPORTED];

/**
 * Enumeration of possible message levels ([INFO]{@link module:interaction.INFO}|[WARNING]{@link module:interaction.WARNING}|[ERROR]{@link module:interaction.ERROR}).
 */
exports.STATES = STATES;
var LEVELS = [INFO, WARNING, ERROR];

/**
 * Represents a message returned by an interaction.
 *
 * Message objects may have additional properties.
 */

/**
 * Represents an image in a message returned by an interaction.
 */
exports.LEVELS = LEVELS;
/**
 * Abstract base class for all keystore interactions.
 *
 * Concrete subclasses will want to subclass either
 * `DirectKeystoreInteraction` or `IndirectKeystoreInteraction`.
 *
 * Defines an API for subclasses to leverage and extend.
 *
 * - Subclasses should not have any internal state.  External tools
 *   (UI frameworks such as React) will maintain state and pass it
 *   into the interaction in order to display properly.
 *
 * - Subclasses may override the default constructor in order to allow
 *   users to pass in parameters.
 *
 * - Subclasses should override the `messages` method to customize
 *   what messages are surfaced in applications at what state of the
 *   user interface.
 *
 * - Subclasses should not try to catch all errors, instead letting
 *   them bubble up the stack.  This allows UI developers to deal with
 *   them as appropriate.
 *
 * @example
 * import {KeystoreInteraction, PENDING, ACTIVE, INFO} from "unchained-wallets";
 * class DoNothingInteraction extends KeystoreInteraction {
 *
 *   constructor({param}) {
 *     super();
 *     this.param = param;
 *   }
 *
 *   messages() {
 *     const messages = super.messages()
 *     messages.push({state: PENDING, level: INFO, text: `Interaction pending: ${this.param}` code: "pending"});
 *     messages.push({state: ACTIVE, level: INFO, text: `Interaction active: ${this.param}` code: "active"});
 *     return messages;
 *   }
 *
 * }
 *
 * // usage
 * const interaction = new DoNothingInteraction({param: "foo"});
 * console.log(interaction.messageTextFor({state: ACTIVE})); // "Interaction active: foo"
 * console.log(interaction.messageTextFor({state: PENDING})); // "Interaction pending: foo"
 *
 */
var KeystoreInteraction = /*#__PURE__*/function () {
  /**
   * Base constructor.
   *
   * Subclasses will often override this constructor to accept options.
   *
   * Just make sure to call `super()` if you do that!
   */
  function KeystoreInteraction() {
    _classCallCheck(this, KeystoreInteraction);
    _defineProperty(this, "environment", void 0);
    this.environment = _bowser["default"].getParser(window.navigator.userAgent);
  }

  /**
   * Subclasses can override this method to indicate they are not
   * supported.
   *
   * This method has access to whatever options may have been passed
   * in by the constructor as well as the ability to interact with
   * `this.environment` to determine whether the functionality is
   * supported.  See the Bowser documentation for more details:
   * https://github.com/lancedikson/bowser
   *
   * @example
   * isSupported() {
   *   return this.environment.satisfies({
   *     * declare browsers per OS
   *     windows: {
   *       "internet explorer": ">10",
   *     },
   *     macos: {
   *       safari: ">10.1"
   *     },
   *
   *     * per platform (mobile, desktop or tablet)
   *     mobile: {
   *       safari: '>=9',
   *       'android browser': '>3.10'
   *     },
   *
   *     * or in general
   *     chrome: "~20.1.1432",
   *     firefox: ">31",
   *     opera: ">=22",
   *
   *     * also supports equality operator
   *     chrome: "=20.1.1432", * will match particular build only
   *
   *     * and loose-equality operator
   *     chrome: "~20",        * will match any 20.* sub-version
   *     chrome: "~20.1"       * will match any 20.1.* sub-version (20.1.19 as well as 20.1.12.42-alpha.1)
   *   });
   * }
   */
  _createClass(KeystoreInteraction, [{
    key: "isSupported",
    value: function isSupported() {
      return true;
    }

    /**
     * Return messages array for this interaction.
     *
     * The messages array is a (possibly empty) array of `Message` objects.
     *
     * Subclasses should override this method and add messages as
     * needed.  Make sure to call `super.messages()` to return an empty
     * messages array for you to begin populating.
     */
  }, {
    key: "messages",
    value: function messages() {
      var messages = [];
      return messages;
    }

    /**
     * Return messages filtered by the given options.
     *
     * Multiple options can be given at once to filter along multiple
     * dimensions.
     *
     * @example
     * import {PENDING, ACTIVE} from "unchained-bitcoin";
     * // Create any interaction instance
     * interaction.messages().forEach(msg => console.log(msg));
     *   { code: "device.connect", state: "pending", level: "info", text: "Please plug in your device."}
     *   { code: "device.active", state: "active", level: "info", text: "Communicating with your device..."}
     *   { code: "device.active.warning", state: "active", level: "warning", text: "Your device will warn you about...", version: "2.x"}
     * interaction.messagesFor({state: PENDING}).forEach(msg => console.log(msg));
     *   { code: "device.connect", state: "pending", level: "info", text: "Please plug in your device."}
     * interaction.messagesFor({code: ACTIVE}).forEach(msg => console.log(msg));
     *   { code: "device.active", state: "active", level: "info", text: "Communicating with your device..."}
     *   { code: "device.active.warning", state: "active", level: "warning", text: "Your device will warn you about...", version: "2.x"}
     * interaction.messagesFor({version: /^2/}).forEach(msg => console.log(msg));
     *   { code: "device.active", state: "active", level: "warning", text: "Your device will warn you about...", version: "2.x"}
     */
  }, {
    key: "messagesFor",
    value: function messagesFor(_ref) {
      var state = _ref.state,
        level = _ref.level,
        code = _ref.code,
        text = _ref.text,
        version = _ref.version;
      return this.messages().filter(function (message) {
        if (state && message.state !== state) {
          return false;
        }
        if (level && message.level !== level) {
          return false;
        }
        if (code && !(message.code || "").match(code)) {
          return false;
        }
        if (text && !(message.text || "").match(text)) {
          return false;
        }
        if (version && !(message.version || "").match(version)) {
          return false;
        }
        return true;
      });
    }

    /**
     * Return whether there are any messages matching the given options.
     */
  }, {
    key: "hasMessagesFor",
    value: function hasMessagesFor(_ref2) {
      var state = _ref2.state,
        level = _ref2.level,
        code = _ref2.code,
        text = _ref2.text,
        version = _ref2.version;
      return this.messagesFor({
        state: state,
        level: level,
        code: code,
        text: text,
        version: version
      }).length > 0;
    }

    /**
     * Return the first message matching the given options (or `null` if none is found).
     */
  }, {
    key: "messageFor",
    value: function messageFor(_ref3) {
      var state = _ref3.state,
        level = _ref3.level,
        code = _ref3.code,
        text = _ref3.text,
        version = _ref3.version;
      var messages = this.messagesFor({
        state: state,
        level: level,
        code: code,
        text: text,
        version: version
      });
      if (messages.length > 0) {
        return messages[0];
      }
      return null;
    }

    /**
     * Retrieve the text of the first message matching the given options
     * (or `null` if none is found).
     */
  }, {
    key: "messageTextFor",
    value: function messageTextFor(_ref4) {
      var state = _ref4.state,
        level = _ref4.level,
        code = _ref4.code,
        text = _ref4.text,
        version = _ref4.version;
      var message = this.messageFor({
        state: state,
        level: level,
        code: code,
        text: text,
        version: version
      });
      return message?.text ?? null;
    }
  }]);
  return KeystoreInteraction;
}();
/**
 * Class used for describing an unsupported interaction.
 *
 * - Always returns `false` when the `isSupported` method is called.
 *
 * - Has a keystore state `unsupported` message at the `error` level.
 *
 * - Throws errors when attempting to call API methods such as `run`,
 *   `request`, and `parse`.
 *
 * @example
 * import {UnsupportedInteraction} from "unchained-wallets";
 * const interaction = new UnsupportedInteraction({text: "failure text", code: "fail"});
 * console.log(interaction.isSupported()); // false
 *
 */
exports.KeystoreInteraction = KeystoreInteraction;
var UnsupportedInteraction = /*#__PURE__*/function (_KeystoreInteraction) {
  _inherits(UnsupportedInteraction, _KeystoreInteraction);
  var _super = _createSuper(UnsupportedInteraction);
  /**
   * Accepts parameters to describe what is unsupported and why.
   *
   * The `text` should be human-readable.  The `code` is for machines.
   */
  function UnsupportedInteraction(_ref5) {
    var _this;
    var text = _ref5.text,
      code = _ref5.code;
    _classCallCheck(this, UnsupportedInteraction);
    _this = _super.call(this);
    _defineProperty(_assertThisInitialized(_this), "text", void 0);
    _defineProperty(_assertThisInitialized(_this), "code", void 0);
    _this.text = text;
    _this.code = code;
    return _this;
  }

  /**
   * By design, this method always returns false.
   */
  _createClass(UnsupportedInteraction, [{
    key: "isSupported",
    value: function isSupported() {
      return false;
    }

    /**
     * Returns a single `error` level message at the `unsupported`
     * state.
     */
  }, {
    key: "messages",
    value: function messages() {
      var messages = _get(_getPrototypeOf(UnsupportedInteraction.prototype), "messages", this).call(this);
      messages.push({
        state: UNSUPPORTED,
        level: ERROR,
        code: this.code,
        text: this.text
      });
      return messages;
    }

    /**
     * Throws an error.
     *
     */
  }, {
    key: "run",
    value: function () {
      var _run = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee() {
        return _regeneratorRuntime().wrap(function _callee$(_context) {
          while (1) switch (_context.prev = _context.next) {
            case 0:
              throw new Error(this.text);
            case 1:
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
     * Throws an error.
     *
     */
  }, {
    key: "request",
    value: function request() {
      throw new Error(this.text);
    }

    /**
     * Throws an error.
     *
     */
  }, {
    key: "parse",
    value: function parse() {
      throw new Error(this.text);
    }
  }]);
  return UnsupportedInteraction;
}(KeystoreInteraction);
/**
 * Base class for direct keystore interactions.
 *
 * Subclasses *must* implement a `run` method which communicates
 * directly with the keystore.  This method must be asynchronous
 * (return a `Promise`) to accommodate delays with network, devices,
 * &c.
 *
 * @example
 * import {DirectKeystoreInteraction} from "unchained-wallets";
 * class SimpleDirectInteraction extends DirectKeystoreInteraction {   *
 *
 *   constructor({param}) {
 *     super();
 *     this.param = param;
 *   }
 *
 *   async run() {
 *     // Or do something complicated...
 *     return this.param;
 *   }
 * }
 *
 * const interaction = new SimpleDirectInteraction({param: "foo"});
 *
 * const result = await interaction.run();
 * console.log(result);
 * // "foo"
 *
 */
exports.UnsupportedInteraction = UnsupportedInteraction;
var DirectKeystoreInteraction = /*#__PURE__*/function (_KeystoreInteraction2) {
  _inherits(DirectKeystoreInteraction, _KeystoreInteraction2);
  var _super2 = _createSuper(DirectKeystoreInteraction);
  /**
   * Sets the `this.direct` property to `true`.  This property can be
   * utilized when introspecting on interaction classes..
   *
   * @constructor
   */
  function DirectKeystoreInteraction() {
    var _this2;
    _classCallCheck(this, DirectKeystoreInteraction);
    _this2 = _super2.call(this);
    _defineProperty(_assertThisInitialized(_this2), "direct", void 0);
    _this2.direct = true;
    return _this2;
  }

  /**
   * Initiate the intended interaction and return a result.
   *
   * Subclasses *must* override this function.  This function must
   * always return a promise as it is designed to be called within an
   * `await` block.
   */
  _createClass(DirectKeystoreInteraction, [{
    key: "run",
    value: function () {
      var _run2 = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee2() {
        return _regeneratorRuntime().wrap(function _callee2$(_context2) {
          while (1) switch (_context2.prev = _context2.next) {
            case 0:
              throw new Error("Override the `run` method in this interaction.");
            case 1:
            case "end":
              return _context2.stop();
          }
        }, _callee2);
      }));
      function run() {
        return _run2.apply(this, arguments);
      }
      return run;
    }()
    /**
     * Throws an error.
     */
  }, {
    key: "request",
    value: function request() {
      throw new Error("This interaction is direct and does not support a `request` method.");
    }

    /**
     * Throws an error.
     */
  }, {
    key: "parse",
    value: function parse() {
      throw new Error("This interaction is direct and does not support a `parse` method.");
    }
  }, {
    key: "signatureFormatter",
    value: function signatureFormatter(inputSignature) {
      var format = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : "hex";
      // Ledger signatures include the SIGHASH byte (0x01) if signing for P2SH-P2WSH or P2WSH ...
      // but NOT for P2SH ... This function should always return the signature with SIGHASH byte appended.
      // While we don't anticipate Trezor making firmware changes to include SIGHASH bytes with signatures,
      // We'll go ahead and make sure that we're not double adding the SIGHASH
      // byte in case they do in the future.

      var signatureWithSigHashByte = "".concat((0, _unchainedBitcoin.signatureNoSighashType)(inputSignature), "01");
      if (format === "buffer") {
        return Buffer.from(signatureWithSigHashByte, "hex");
      } else {
        return signatureWithSigHashByte;
      }
    }
  }, {
    key: "parseSignature",
    value: function parseSignature(transactionSignature) {
      var _this3 = this;
      var format = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : "hex";
      return (transactionSignature || []).map(function (inputSignature) {
        return _this3.signatureFormatter(inputSignature, format);
      });
    }
  }]);
  return DirectKeystoreInteraction;
}(KeystoreInteraction);
/**
 * Base class for indirect keystore interactions.
 *
 * Subclasses *must* implement two methods: `request` and `parse`.
 * Application code will pass the result of calling `request` to some
 * external process (HTTP request, QR code, &c.) and pass the response
 * to `parse` which should return a result.
 *
 * @example
 * import {IndirectKeystoreInteraction} from "unchained-wallets";
 * class SimpleIndirectInteraction extends IndirectKeystoreInteraction {   *
 *
 *   constructor({param}) {
 *     super();
 *     this.param = param;
 *   }
 *
 *   request() {
 *     // Construct the data to be passed to the keystore...
 *     return this.param;
 *   }
 *
 *   parse(response) {
 *     // Parse data returned from the keystore...
 *     return response;
 *   }
 *
 * }
 *
 * const interaction = new SimpleIndirectInteraction({param: "foo"});
 *
 * const request = interaction.request();
 * const response = "bar"; // Or do something complicated with `request`
 * const result = interaction.parse(response);
 * console.log(result);
 * // "bar"
 *
 */
exports.DirectKeystoreInteraction = DirectKeystoreInteraction;
var IndirectKeystoreInteraction = /*#__PURE__*/function (_KeystoreInteraction3) {
  _inherits(IndirectKeystoreInteraction, _KeystoreInteraction3);
  var _super3 = _createSuper(IndirectKeystoreInteraction);
  /**
   * Sets the `this.indirect` property to `true`.  This property can
   * be utilized when introspecting on interaction classes.
   *
   * The `this.workflow` property is an array containing one or both
   * of the strings `request` and/or `parse`.  Their presence and
   * order indicates to calling applications whether they are
   * necessary and in which order they should be run.
   */
  function IndirectKeystoreInteraction() {
    var _this4;
    _classCallCheck(this, IndirectKeystoreInteraction);
    _this4 = _super3.call(this);
    _defineProperty(_assertThisInitialized(_this4), "indirect", void 0);
    _defineProperty(_assertThisInitialized(_this4), "workflow", void 0);
    _this4.indirect = true;
    _this4.workflow = ["parse"];
    return _this4;
  }

  /**
   * Provide the request.
   *
   * Subclasses *may* override this function.  It can return any kind
   * of object.  Strings, data for QR codes, HTTP requests, command
   * lines, functions, &c. are all allowed.  Whatever is appropriate
   * for the interaction.
   *
   */
  _createClass(IndirectKeystoreInteraction, [{
    key: "request",
    value: function request() {
      throw new Error("Override the `request` method in this interaction.");
    }

    /**
     * Parse the response into a result.
     *
     * Subclasses *must* override this function.  It must accept an
     * appropriate kind of `response` object and return the final result
     * of this interaction.
     *
     */
  }, {
    key: "parse",
    value: function parse(response) {
      throw new Error("Override the `parse` method in this interaction.");
    }

    /**
     * Throws an error.
     */
  }, {
    key: "run",
    value: function () {
      var _run3 = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee3() {
        return _regeneratorRuntime().wrap(function _callee3$(_context3) {
          while (1) switch (_context3.prev = _context3.next) {
            case 0:
              throw new Error("This interaction is indirect and does not support a `run` method.");
            case 1:
            case "end":
              return _context3.stop();
          }
        }, _callee3);
      }));
      function run() {
        return _run3.apply(this, arguments);
      }
      return run;
    }()
  }]);
  return IndirectKeystoreInteraction;
}(KeystoreInteraction);
exports.IndirectKeystoreInteraction = IndirectKeystoreInteraction;