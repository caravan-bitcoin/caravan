"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.throwError = exports.ERROR_BAD_RECOVERY_ID = exports.ERROR_BAD_PARITY = exports.ERROR_BAD_EXTRA_DATA = exports.ERROR_BAD_SIGNATURE = exports.ERROR_BAD_HASH = exports.ERROR_BAD_TWEAK = exports.ERROR_BAD_POINT = exports.ERROR_BAD_PRIVATE = void 0;
exports.ERROR_BAD_PRIVATE = 0;
exports.ERROR_BAD_POINT = 1;
exports.ERROR_BAD_TWEAK = 2;
exports.ERROR_BAD_HASH = 3;
exports.ERROR_BAD_SIGNATURE = 4;
exports.ERROR_BAD_EXTRA_DATA = 5;
exports.ERROR_BAD_PARITY = 6;
exports.ERROR_BAD_RECOVERY_ID = 7;
const ERRORS_MESSAGES = {
    [exports.ERROR_BAD_PRIVATE.toString()]: "Expected Private",
    [exports.ERROR_BAD_POINT.toString()]: "Expected Point",
    [exports.ERROR_BAD_TWEAK.toString()]: "Expected Tweak",
    [exports.ERROR_BAD_HASH.toString()]: "Expected Hash",
    [exports.ERROR_BAD_SIGNATURE.toString()]: "Expected Signature",
    [exports.ERROR_BAD_EXTRA_DATA.toString()]: "Expected Extra Data (32 bytes)",
    [exports.ERROR_BAD_PARITY.toString()]: "Expected Parity (1 | 0)",
    [exports.ERROR_BAD_RECOVERY_ID.toString()]: "Bad Recovery Id",
};
function throwError(errcode) {
    const message = ERRORS_MESSAGES[errcode.toString()] || `Unknow error code: ${errcode}`;
    throw new TypeError(message);
}
exports.throwError = throwError;
