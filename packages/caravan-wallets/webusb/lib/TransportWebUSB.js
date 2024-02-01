"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
exports.__esModule = true;
var hw_transport_1 = __importDefault(require("@ledgerhq/hw-transport"));
var hid_framing_1 = __importDefault(require("@ledgerhq/devices/hid-framing"));
var devices_1 = require("@ledgerhq/devices");
var logs_1 = require("@ledgerhq/logs");
var errors_1 = require("@ledgerhq/errors");
var webusb_1 = require("./webusb");
var configurationValue = 1;
var endpointNumber = 3;
/**
 * WebUSB Transport implementation
 * @example
 * import TransportWebUSB from "@ledgerhq/hw-transport-webusb";
 * ...
 * TransportWebUSB.create().then(transport => ...)
 */
var TransportWebUSB = /** @class */ (function (_super) {
    __extends(TransportWebUSB, _super);
    function TransportWebUSB(device, interfaceNumber) {
        var _this = _super.call(this) || this;
        _this.channel = Math.floor(Math.random() * 0xffff);
        _this.packetSize = 64;
        _this._disconnectEmitted = false;
        _this._emitDisconnect = function (e) {
            if (_this._disconnectEmitted)
                return;
            _this._disconnectEmitted = true;
            _this.emit("disconnect", e);
        };
        _this.device = device;
        _this.interfaceNumber = interfaceNumber;
        _this.deviceModel = (0, devices_1.identifyUSBProductId)(device.productId);
        return _this;
    }
    /**
     * Similar to create() except it will always display the device permission (even if some devices are already accepted).
     */
    TransportWebUSB.request = function () {
        return __awaiter(this, void 0, void 0, function () {
            var device;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, (0, webusb_1.requestLedgerDevice)()];
                    case 1:
                        device = _a.sent();
                        return [2 /*return*/, TransportWebUSB.open(device)];
                }
            });
        });
    };
    /**
     * Similar to create() except it will never display the device permission (it returns a Promise<?Transport>, null if it fails to find a device).
     */
    TransportWebUSB.openConnected = function () {
        return __awaiter(this, void 0, void 0, function () {
            var devices;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, (0, webusb_1.getLedgerDevices)()];
                    case 1:
                        devices = _a.sent();
                        if (devices.length === 0)
                            return [2 /*return*/, null];
                        return [2 /*return*/, TransportWebUSB.open(devices[0])];
                }
            });
        });
    };
    /**
     * Create a Ledger transport with a USBDevice
     */
    TransportWebUSB.open = function (device) {
        return __awaiter(this, void 0, void 0, function () {
            var iface, interfaceNumber, e_1, transport, onDisconnect;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, device.open()];
                    case 1:
                        _a.sent();
                        if (!(device.configuration === null)) return [3 /*break*/, 3];
                        return [4 /*yield*/, device.selectConfiguration(configurationValue)];
                    case 2:
                        _a.sent();
                        _a.label = 3;
                    case 3: return [4 /*yield*/, gracefullyResetDevice(device)];
                    case 4:
                        _a.sent();
                        iface = device.configurations[0].interfaces.find(function (_a) {
                            var alternates = _a.alternates;
                            return alternates.some(function (a) { return a.interfaceClass === 255; });
                        });
                        if (!iface) {
                            throw new errors_1.TransportInterfaceNotAvailable("No WebUSB interface found for your Ledger device. Please upgrade firmware or contact techsupport.");
                        }
                        interfaceNumber = iface.interfaceNumber;
                        _a.label = 5;
                    case 5:
                        _a.trys.push([5, 7, , 9]);
                        return [4 /*yield*/, device.claimInterface(interfaceNumber)];
                    case 6:
                        _a.sent();
                        return [3 /*break*/, 9];
                    case 7:
                        e_1 = _a.sent();
                        return [4 /*yield*/, device.close()];
                    case 8:
                        _a.sent();
                        throw new errors_1.TransportInterfaceNotAvailable(e_1.message);
                    case 9:
                        transport = new TransportWebUSB(device, interfaceNumber);
                        onDisconnect = function (e) {
                            if (device === e.device) {
                                // $FlowFixMe
                                navigator.usb.removeEventListener("disconnect", onDisconnect);
                                transport._emitDisconnect(new errors_1.DisconnectedDevice());
                            }
                        };
                        // $FlowFixMe
                        navigator.usb.addEventListener("disconnect", onDisconnect);
                        return [2 /*return*/, transport];
                }
            });
        });
    };
    /**
     * Release the transport device
     */
    TransportWebUSB.prototype.close = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.exchangeBusyPromise];
                    case 1:
                        _a.sent();
                        return [4 /*yield*/, this.device.releaseInterface(this.interfaceNumber)];
                    case 2:
                        _a.sent();
                        return [4 /*yield*/, gracefullyResetDevice(this.device)];
                    case 3:
                        _a.sent();
                        return [4 /*yield*/, this.device.close()];
                    case 4:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Exchange with the device using APDU protocol.
     * @param apdu
     * @returns a promise of apdu response
     */
    TransportWebUSB.prototype.exchange = function (apdu) {
        return __awaiter(this, void 0, void 0, function () {
            var b;
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.exchangeAtomicImpl(function () { return __awaiter(_this, void 0, void 0, function () {
                            var _a, channel, packetSize, framing, blocks, i, result, acc, r, buffer;
                            return __generator(this, function (_b) {
                                switch (_b.label) {
                                    case 0:
                                        _a = this, channel = _a.channel, packetSize = _a.packetSize;
                                        (0, logs_1.log)("apdu", "=> " + apdu.toString("hex"));
                                        framing = (0, hid_framing_1["default"])(channel, packetSize);
                                        blocks = framing.makeBlocks(apdu);
                                        i = 0;
                                        _b.label = 1;
                                    case 1:
                                        if (!(i < blocks.length)) return [3 /*break*/, 4];
                                        return [4 /*yield*/, this.device.transferOut(endpointNumber, blocks[i])];
                                    case 2:
                                        _b.sent();
                                        _b.label = 3;
                                    case 3:
                                        i++;
                                        return [3 /*break*/, 1];
                                    case 4:
                                        if (!!(result = framing.getReducedResult(acc))) return [3 /*break*/, 6];
                                        return [4 /*yield*/, this.device.transferIn(endpointNumber, packetSize)];
                                    case 5:
                                        r = _b.sent();
                                        buffer = Buffer.from(r.data.buffer);
                                        acc = framing.reduceResponse(acc, buffer);
                                        return [3 /*break*/, 4];
                                    case 6:
                                        (0, logs_1.log)("apdu", "<= " + result.toString("hex"));
                                        return [2 /*return*/, result];
                                }
                            });
                        }); })["catch"](function (e) {
                            if (e && e.message && e.message.includes("disconnected")) {
                                _this._emitDisconnect(e);
                                throw new errors_1.DisconnectedDeviceDuringOperation(e.message);
                            }
                            throw e;
                        })];
                    case 1:
                        b = _a.sent();
                        return [2 /*return*/, b];
                }
            });
        });
    };
    TransportWebUSB.prototype.setScrambleKey = function () { };
    /**
     * Check if WebUSB transport is supported.
     */
    TransportWebUSB.isSupported = webusb_1.isSupported;
    /**
     * List the WebUSB devices that was previously authorized by the user.
     */
    TransportWebUSB.list = webusb_1.getLedgerDevices;
    /**
     * Actively listen to WebUSB devices and emit ONE device
     * that was either accepted before, if not it will trigger the native permission UI.
     *
     * Important: it must be called in the context of a UI click!
     */
    TransportWebUSB.listen = function (observer) {
        var unsubscribed = false;
        (0, webusb_1.getFirstLedgerDevice)().then(function (device) {
            if (!unsubscribed) {
                var deviceModel = (0, devices_1.identifyUSBProductId)(device.productId);
                observer.next({
                    type: "add",
                    descriptor: device,
                    deviceModel: deviceModel
                });
                observer.complete();
            }
        }, function (error) {
            if (window.DOMException &&
                error instanceof window.DOMException &&
                error.code === 18) {
                observer.error(new errors_1.TransportWebUSBGestureRequired(error.message));
            }
            else {
                observer.error(new errors_1.TransportOpenUserCancelled(error.message));
            }
        });
        function unsubscribe() {
            unsubscribed = true;
        }
        return {
            unsubscribe: unsubscribe
        };
    };
    return TransportWebUSB;
}(hw_transport_1["default"]));
exports["default"] = TransportWebUSB;
function gracefullyResetDevice(device) {
    return __awaiter(this, void 0, void 0, function () {
        var err_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    return [4 /*yield*/, device.reset()];
                case 1:
                    _a.sent();
                    return [3 /*break*/, 3];
                case 2:
                    err_1 = _a.sent();
                    console.warn(err_1);
                    return [3 /*break*/, 3];
                case 3: return [2 /*return*/];
            }
        });
    });
}
//# sourceMappingURL=TransportWebUSB.js.map
