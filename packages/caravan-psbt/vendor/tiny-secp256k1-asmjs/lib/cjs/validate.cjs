"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateSigrPMinusN = exports.validateSignatureNonzeroRS = exports.validateSignatureCustom = exports.validateSignature = exports.validateExtraData = exports.validateHash = exports.validateTweak = exports.validateXOnlyPoint = exports.validatePoint = exports.validatePrivate = exports.validateParity = exports.isPointCompressed = exports.isDERPoint = exports.isXOnlyPoint = exports.isPoint = exports.isPrivate = exports.isZero = exports.SIGNATURE_SIZE = exports.EXTRA_DATA_SIZE = exports.HASH_SIZE = exports.TWEAK_SIZE = exports.X_ONLY_PUBLIC_KEY_SIZE = exports.PUBLIC_KEY_UNCOMPRESSED_SIZE = exports.PUBLIC_KEY_COMPRESSED_SIZE = exports.PRIVATE_KEY_SIZE = void 0;
const buffer_1 = require("buffer");
const validate_error_js_1 = require("./validate_error.cjs");
exports.PRIVATE_KEY_SIZE = 32;
exports.PUBLIC_KEY_COMPRESSED_SIZE = 33;
exports.PUBLIC_KEY_UNCOMPRESSED_SIZE = 65;
exports.X_ONLY_PUBLIC_KEY_SIZE = 32;
exports.TWEAK_SIZE = 32;
exports.HASH_SIZE = 32;
exports.EXTRA_DATA_SIZE = 32;
exports.SIGNATURE_SIZE = 64;
const BN32_ZERO = new Uint8Array(32);
const BN32_N = new Uint8Array([
    255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255,
    254, 186, 174, 220, 230, 175, 72, 160, 59, 191, 210, 94, 140, 208, 54, 65, 65,
]);
// Difference between field and order
const BN32_P_MINUS_N = new Uint8Array([
    0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 69, 81, 35, 25, 80, 183, 95,
    196, 64, 45, 161, 114, 47, 201, 186, 238,
]);
function isUint8Array(value) {
    return value instanceof Uint8Array || value instanceof buffer_1.Buffer;
}
function cmpBN32(data1, data2) {
    for (let i = 0; i < 32; ++i) {
        if (data1[i] !== data2[i]) {
            return data1[i] < data2[i] ? -1 : 1;
        }
    }
    return 0;
}
function isZero(x) {
    return cmpBN32(x, BN32_ZERO) === 0;
}
exports.isZero = isZero;
function isPrivate(x) {
    return (isUint8Array(x) &&
        x.length === exports.PRIVATE_KEY_SIZE &&
        cmpBN32(x, BN32_ZERO) > 0 &&
        cmpBN32(x, BN32_N) < 0);
}
exports.isPrivate = isPrivate;
function isPoint(p) {
    return (isUint8Array(p) &&
        (p.length === exports.PUBLIC_KEY_COMPRESSED_SIZE ||
            p.length === exports.PUBLIC_KEY_UNCOMPRESSED_SIZE ||
            p.length === exports.X_ONLY_PUBLIC_KEY_SIZE));
}
exports.isPoint = isPoint;
function isXOnlyPoint(p) {
    return isUint8Array(p) && p.length === exports.X_ONLY_PUBLIC_KEY_SIZE;
}
exports.isXOnlyPoint = isXOnlyPoint;
function isDERPoint(p) {
    return (isUint8Array(p) &&
        (p.length === exports.PUBLIC_KEY_COMPRESSED_SIZE ||
            p.length === exports.PUBLIC_KEY_UNCOMPRESSED_SIZE));
}
exports.isDERPoint = isDERPoint;
function isPointCompressed(p) {
    return isUint8Array(p) && p.length === exports.PUBLIC_KEY_COMPRESSED_SIZE;
}
exports.isPointCompressed = isPointCompressed;
function isTweak(tweak) {
    return (isUint8Array(tweak) &&
        tweak.length === exports.TWEAK_SIZE &&
        cmpBN32(tweak, BN32_N) < 0);
}
function isHash(h) {
    return isUint8Array(h) && h.length === exports.HASH_SIZE;
}
function isExtraData(e) {
    return e === undefined || (isUint8Array(e) && e.length === exports.EXTRA_DATA_SIZE);
}
function isSignature(signature) {
    return (isUint8Array(signature) &&
        signature.length === 64 &&
        cmpBN32(signature.subarray(0, 32), BN32_N) < 0 &&
        cmpBN32(signature.subarray(32, 64), BN32_N) < 0);
}
function isSigrLessThanPMinusN(signature) {
    return (isUint8Array(signature) &&
        signature.length === 64 &&
        cmpBN32(signature.subarray(0, 32), BN32_P_MINUS_N) < 0);
}
function validateParity(p) {
    if (p !== 0 && p !== 1)
        (0, validate_error_js_1.throwError)(validate_error_js_1.ERROR_BAD_PARITY);
}
exports.validateParity = validateParity;
function validatePrivate(d) {
    if (!isPrivate(d))
        (0, validate_error_js_1.throwError)(validate_error_js_1.ERROR_BAD_PRIVATE);
}
exports.validatePrivate = validatePrivate;
function validatePoint(p) {
    if (!isPoint(p))
        (0, validate_error_js_1.throwError)(validate_error_js_1.ERROR_BAD_POINT);
}
exports.validatePoint = validatePoint;
function validateXOnlyPoint(p) {
    if (!isXOnlyPoint(p))
        (0, validate_error_js_1.throwError)(validate_error_js_1.ERROR_BAD_POINT);
}
exports.validateXOnlyPoint = validateXOnlyPoint;
function validateTweak(tweak) {
    if (!isTweak(tweak))
        (0, validate_error_js_1.throwError)(validate_error_js_1.ERROR_BAD_TWEAK);
}
exports.validateTweak = validateTweak;
function validateHash(h) {
    if (!isHash(h))
        (0, validate_error_js_1.throwError)(validate_error_js_1.ERROR_BAD_HASH);
}
exports.validateHash = validateHash;
function validateExtraData(e) {
    if (!isExtraData(e))
        (0, validate_error_js_1.throwError)(validate_error_js_1.ERROR_BAD_EXTRA_DATA);
}
exports.validateExtraData = validateExtraData;
function validateSignature(signature) {
    if (!isSignature(signature))
        (0, validate_error_js_1.throwError)(validate_error_js_1.ERROR_BAD_SIGNATURE);
}
exports.validateSignature = validateSignature;
function validateSignatureCustom(validatorFn) {
    if (!validatorFn())
        (0, validate_error_js_1.throwError)(validate_error_js_1.ERROR_BAD_SIGNATURE);
}
exports.validateSignatureCustom = validateSignatureCustom;
function validateSignatureNonzeroRS(signature) {
    if (isZero(signature.subarray(0, 32)))
        (0, validate_error_js_1.throwError)(validate_error_js_1.ERROR_BAD_SIGNATURE);
    if (isZero(signature.subarray(32, 64)))
        (0, validate_error_js_1.throwError)(validate_error_js_1.ERROR_BAD_SIGNATURE);
}
exports.validateSignatureNonzeroRS = validateSignatureNonzeroRS;
function validateSigrPMinusN(signature) {
    if (!isSigrLessThanPMinusN(signature))
        (0, validate_error_js_1.throwError)(validate_error_js_1.ERROR_BAD_RECOVERY_ID);
}
exports.validateSigrPMinusN = validateSigrPMinusN;
