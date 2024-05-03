"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifySchnorr = exports.recover = exports.verify = exports.signSchnorr = exports.signRecoverable = exports.sign = exports.xOnlyPointAddTweakCheck = exports.xOnlyPointAddTweak = exports.privateNegate = exports.privateSub = exports.privateAdd = exports.pointMultiply = exports.xOnlyPointFromPoint = exports.xOnlyPointFromScalar = exports.pointFromScalar = exports.pointCompress = exports.pointAddScalar = exports.pointAdd = exports.isPrivate = exports.isXOnlyPoint = exports.isPointCompressed = exports.isPoint = exports.__initializeContext = void 0;
const uint8array_tools_1 = require("uint8array-tools");
const validate = require("./validate.cjs");
const wasm_loader_js_1 = require("./wasm_loader.cjs");
const WASM_BUFFER = new Uint8Array(wasm_loader_js_1.default.memory.buffer);
const WASM_PRIVATE_KEY_PTR = wasm_loader_js_1.default.PRIVATE_INPUT.value;
const WASM_PUBLIC_KEY_INPUT_PTR = wasm_loader_js_1.default.PUBLIC_KEY_INPUT.value;
const WASM_PUBLIC_KEY_INPUT_PTR2 = wasm_loader_js_1.default.PUBLIC_KEY_INPUT2.value;
const WASM_X_ONLY_PUBLIC_KEY_INPUT_PTR = wasm_loader_js_1.default.X_ONLY_PUBLIC_KEY_INPUT.value;
const WASM_X_ONLY_PUBLIC_KEY_INPUT2_PTR = wasm_loader_js_1.default.X_ONLY_PUBLIC_KEY_INPUT2.value;
const WASM_TWEAK_INPUT_PTR = wasm_loader_js_1.default.TWEAK_INPUT.value;
const WASM_HASH_INPUT_PTR = wasm_loader_js_1.default.HASH_INPUT.value;
const WASM_EXTRA_DATA_INPUT_PTR = wasm_loader_js_1.default.EXTRA_DATA_INPUT.value;
const WASM_SIGNATURE_INPUT_PTR = wasm_loader_js_1.default.SIGNATURE_INPUT.value;
const PRIVATE_KEY_INPUT = WASM_BUFFER.subarray(WASM_PRIVATE_KEY_PTR, WASM_PRIVATE_KEY_PTR + validate.PRIVATE_KEY_SIZE);
const PUBLIC_KEY_INPUT = WASM_BUFFER.subarray(WASM_PUBLIC_KEY_INPUT_PTR, WASM_PUBLIC_KEY_INPUT_PTR + validate.PUBLIC_KEY_UNCOMPRESSED_SIZE);
const PUBLIC_KEY_INPUT2 = WASM_BUFFER.subarray(WASM_PUBLIC_KEY_INPUT_PTR2, WASM_PUBLIC_KEY_INPUT_PTR2 + validate.PUBLIC_KEY_UNCOMPRESSED_SIZE);
const X_ONLY_PUBLIC_KEY_INPUT = WASM_BUFFER.subarray(WASM_X_ONLY_PUBLIC_KEY_INPUT_PTR, WASM_X_ONLY_PUBLIC_KEY_INPUT_PTR + validate.X_ONLY_PUBLIC_KEY_SIZE);
const X_ONLY_PUBLIC_KEY_INPUT2 = WASM_BUFFER.subarray(WASM_X_ONLY_PUBLIC_KEY_INPUT2_PTR, WASM_X_ONLY_PUBLIC_KEY_INPUT2_PTR + validate.X_ONLY_PUBLIC_KEY_SIZE);
const TWEAK_INPUT = WASM_BUFFER.subarray(WASM_TWEAK_INPUT_PTR, WASM_TWEAK_INPUT_PTR + validate.TWEAK_SIZE);
const HASH_INPUT = WASM_BUFFER.subarray(WASM_HASH_INPUT_PTR, WASM_HASH_INPUT_PTR + validate.HASH_SIZE);
const EXTRA_DATA_INPUT = WASM_BUFFER.subarray(WASM_EXTRA_DATA_INPUT_PTR, WASM_EXTRA_DATA_INPUT_PTR + validate.EXTRA_DATA_SIZE);
const SIGNATURE_INPUT = WASM_BUFFER.subarray(WASM_SIGNATURE_INPUT_PTR, WASM_SIGNATURE_INPUT_PTR + validate.SIGNATURE_SIZE);
function assumeCompression(compressed, p) {
    if (compressed === undefined) {
        return p !== undefined ? p.length : validate.PUBLIC_KEY_COMPRESSED_SIZE;
    }
    return compressed
        ? validate.PUBLIC_KEY_COMPRESSED_SIZE
        : validate.PUBLIC_KEY_UNCOMPRESSED_SIZE;
}
function _isPoint(p) {
    try {
        PUBLIC_KEY_INPUT.set(p);
        return wasm_loader_js_1.default.isPoint(p.length) === 1;
    }
    finally {
        PUBLIC_KEY_INPUT.fill(0);
    }
}
function __initializeContext() {
    wasm_loader_js_1.default.initializeContext();
}
exports.__initializeContext = __initializeContext;
function isPoint(p) {
    return validate.isDERPoint(p) && _isPoint(p);
}
exports.isPoint = isPoint;
function isPointCompressed(p) {
    return validate.isPointCompressed(p) && _isPoint(p);
}
exports.isPointCompressed = isPointCompressed;
function isXOnlyPoint(p) {
    return validate.isXOnlyPoint(p) && _isPoint(p);
}
exports.isXOnlyPoint = isXOnlyPoint;
function isPrivate(d) {
    return validate.isPrivate(d);
}
exports.isPrivate = isPrivate;
function pointAdd(pA, pB, compressed) {
    validate.validatePoint(pA);
    validate.validatePoint(pB);
    const outputlen = assumeCompression(compressed, pA);
    try {
        PUBLIC_KEY_INPUT.set(pA);
        PUBLIC_KEY_INPUT2.set(pB);
        return wasm_loader_js_1.default.pointAdd(pA.length, pB.length, outputlen) === 1
            ? PUBLIC_KEY_INPUT.slice(0, outputlen)
            : null;
    }
    finally {
        PUBLIC_KEY_INPUT.fill(0);
        PUBLIC_KEY_INPUT2.fill(0);
    }
}
exports.pointAdd = pointAdd;
function pointAddScalar(p, tweak, compressed) {
    validate.validatePoint(p);
    validate.validateTweak(tweak);
    const outputlen = assumeCompression(compressed, p);
    try {
        PUBLIC_KEY_INPUT.set(p);
        TWEAK_INPUT.set(tweak);
        return wasm_loader_js_1.default.pointAddScalar(p.length, outputlen) === 1
            ? PUBLIC_KEY_INPUT.slice(0, outputlen)
            : null;
    }
    finally {
        PUBLIC_KEY_INPUT.fill(0);
        TWEAK_INPUT.fill(0);
    }
}
exports.pointAddScalar = pointAddScalar;
function pointCompress(p, compressed) {
    validate.validatePoint(p);
    const outputlen = assumeCompression(compressed, p);
    try {
        PUBLIC_KEY_INPUT.set(p);
        wasm_loader_js_1.default.pointCompress(p.length, outputlen);
        return PUBLIC_KEY_INPUT.slice(0, outputlen);
    }
    finally {
        PUBLIC_KEY_INPUT.fill(0);
    }
}
exports.pointCompress = pointCompress;
function pointFromScalar(d, compressed) {
    validate.validatePrivate(d);
    const outputlen = assumeCompression(compressed);
    try {
        PRIVATE_KEY_INPUT.set(d);
        return wasm_loader_js_1.default.pointFromScalar(outputlen) === 1
            ? PUBLIC_KEY_INPUT.slice(0, outputlen)
            : null;
    }
    finally {
        PRIVATE_KEY_INPUT.fill(0);
        PUBLIC_KEY_INPUT.fill(0);
    }
}
exports.pointFromScalar = pointFromScalar;
function xOnlyPointFromScalar(d) {
    validate.validatePrivate(d);
    try {
        PRIVATE_KEY_INPUT.set(d);
        wasm_loader_js_1.default.xOnlyPointFromScalar();
        return X_ONLY_PUBLIC_KEY_INPUT.slice(0, validate.X_ONLY_PUBLIC_KEY_SIZE);
    }
    finally {
        PRIVATE_KEY_INPUT.fill(0);
        X_ONLY_PUBLIC_KEY_INPUT.fill(0);
    }
}
exports.xOnlyPointFromScalar = xOnlyPointFromScalar;
function xOnlyPointFromPoint(p) {
    validate.validatePoint(p);
    try {
        PUBLIC_KEY_INPUT.set(p);
        wasm_loader_js_1.default.xOnlyPointFromPoint(p.length);
        return X_ONLY_PUBLIC_KEY_INPUT.slice(0, validate.X_ONLY_PUBLIC_KEY_SIZE);
    }
    finally {
        PUBLIC_KEY_INPUT.fill(0);
        X_ONLY_PUBLIC_KEY_INPUT.fill(0);
    }
}
exports.xOnlyPointFromPoint = xOnlyPointFromPoint;
function pointMultiply(p, tweak, compressed) {
    validate.validatePoint(p);
    validate.validateTweak(tweak);
    const outputlen = assumeCompression(compressed, p);
    try {
        PUBLIC_KEY_INPUT.set(p);
        TWEAK_INPUT.set(tweak);
        return wasm_loader_js_1.default.pointMultiply(p.length, outputlen) === 1
            ? PUBLIC_KEY_INPUT.slice(0, outputlen)
            : null;
    }
    finally {
        PUBLIC_KEY_INPUT.fill(0);
        TWEAK_INPUT.fill(0);
    }
}
exports.pointMultiply = pointMultiply;
function privateAdd(d, tweak) {
    validate.validatePrivate(d);
    validate.validateTweak(tweak);
    try {
        PRIVATE_KEY_INPUT.set(d);
        TWEAK_INPUT.set(tweak);
        return wasm_loader_js_1.default.privateAdd() === 1
            ? PRIVATE_KEY_INPUT.slice(0, validate.PRIVATE_KEY_SIZE)
            : null;
    }
    finally {
        PRIVATE_KEY_INPUT.fill(0);
        TWEAK_INPUT.fill(0);
    }
}
exports.privateAdd = privateAdd;
function privateSub(d, tweak) {
    validate.validatePrivate(d);
    validate.validateTweak(tweak);
    // We can not pass zero tweak to WASM, because WASM use `secp256k1_ec_seckey_negate` for tweak negate.
    // (zero is not valid seckey)
    if (validate.isZero(tweak)) {
        return new Uint8Array(d);
    }
    try {
        PRIVATE_KEY_INPUT.set(d);
        TWEAK_INPUT.set(tweak);
        return wasm_loader_js_1.default.privateSub() === 1
            ? PRIVATE_KEY_INPUT.slice(0, validate.PRIVATE_KEY_SIZE)
            : null;
    }
    finally {
        PRIVATE_KEY_INPUT.fill(0);
        TWEAK_INPUT.fill(0);
    }
}
exports.privateSub = privateSub;
function privateNegate(d) {
    validate.validatePrivate(d);
    try {
        PRIVATE_KEY_INPUT.set(d);
        wasm_loader_js_1.default.privateNegate();
        return PRIVATE_KEY_INPUT.slice(0, validate.PRIVATE_KEY_SIZE);
    }
    finally {
        PRIVATE_KEY_INPUT.fill(0);
    }
}
exports.privateNegate = privateNegate;
function xOnlyPointAddTweak(p, tweak) {
    validate.validateXOnlyPoint(p);
    validate.validateTweak(tweak);
    try {
        X_ONLY_PUBLIC_KEY_INPUT.set(p);
        TWEAK_INPUT.set(tweak);
        const parity = wasm_loader_js_1.default.xOnlyPointAddTweak();
        return parity !== -1
            ? {
                parity,
                xOnlyPubkey: X_ONLY_PUBLIC_KEY_INPUT.slice(0, validate.X_ONLY_PUBLIC_KEY_SIZE),
            }
            : null;
    }
    finally {
        X_ONLY_PUBLIC_KEY_INPUT.fill(0);
        TWEAK_INPUT.fill(0);
    }
}
exports.xOnlyPointAddTweak = xOnlyPointAddTweak;
function xOnlyPointAddTweakCheck(point, tweak, resultToCheck, tweakParity) {
    validate.validateXOnlyPoint(point);
    validate.validateXOnlyPoint(resultToCheck);
    validate.validateTweak(tweak);
    const hasParity = tweakParity !== undefined;
    if (hasParity)
        validate.validateParity(tweakParity);
    try {
        X_ONLY_PUBLIC_KEY_INPUT.set(point);
        X_ONLY_PUBLIC_KEY_INPUT2.set(resultToCheck);
        TWEAK_INPUT.set(tweak);
        if (hasParity) {
            return wasm_loader_js_1.default.xOnlyPointAddTweakCheck(tweakParity) === 1;
        }
        else {
            wasm_loader_js_1.default.xOnlyPointAddTweak();
            const newKey = X_ONLY_PUBLIC_KEY_INPUT.slice(0, validate.X_ONLY_PUBLIC_KEY_SIZE);
            return (0, uint8array_tools_1.compare)(newKey, resultToCheck) === 0;
        }
    }
    finally {
        X_ONLY_PUBLIC_KEY_INPUT.fill(0);
        X_ONLY_PUBLIC_KEY_INPUT2.fill(0);
        TWEAK_INPUT.fill(0);
    }
}
exports.xOnlyPointAddTweakCheck = xOnlyPointAddTweakCheck;
function sign(h, d, e) {
    validate.validateHash(h);
    validate.validatePrivate(d);
    validate.validateExtraData(e);
    try {
        HASH_INPUT.set(h);
        PRIVATE_KEY_INPUT.set(d);
        if (e !== undefined)
            EXTRA_DATA_INPUT.set(e);
        wasm_loader_js_1.default.sign(e === undefined ? 0 : 1);
        return SIGNATURE_INPUT.slice(0, validate.SIGNATURE_SIZE);
    }
    finally {
        HASH_INPUT.fill(0);
        PRIVATE_KEY_INPUT.fill(0);
        if (e !== undefined)
            EXTRA_DATA_INPUT.fill(0);
        SIGNATURE_INPUT.fill(0);
    }
}
exports.sign = sign;
function signRecoverable(h, d, e) {
    validate.validateHash(h);
    validate.validatePrivate(d);
    validate.validateExtraData(e);
    try {
        HASH_INPUT.set(h);
        PRIVATE_KEY_INPUT.set(d);
        if (e !== undefined)
            EXTRA_DATA_INPUT.set(e);
        const recoveryId = wasm_loader_js_1.default.signRecoverable(e === undefined ? 0 : 1);
        const signature = SIGNATURE_INPUT.slice(0, validate.SIGNATURE_SIZE);
        return {
            signature,
            recoveryId,
        };
    }
    finally {
        HASH_INPUT.fill(0);
        PRIVATE_KEY_INPUT.fill(0);
        if (e !== undefined)
            EXTRA_DATA_INPUT.fill(0);
        SIGNATURE_INPUT.fill(0);
    }
}
exports.signRecoverable = signRecoverable;
function signSchnorr(h, d, e) {
    validate.validateHash(h);
    validate.validatePrivate(d);
    validate.validateExtraData(e);
    try {
        HASH_INPUT.set(h);
        PRIVATE_KEY_INPUT.set(d);
        if (e !== undefined)
            EXTRA_DATA_INPUT.set(e);
        wasm_loader_js_1.default.signSchnorr(e === undefined ? 0 : 1);
        return SIGNATURE_INPUT.slice(0, validate.SIGNATURE_SIZE);
    }
    finally {
        HASH_INPUT.fill(0);
        PRIVATE_KEY_INPUT.fill(0);
        if (e !== undefined)
            EXTRA_DATA_INPUT.fill(0);
        SIGNATURE_INPUT.fill(0);
    }
}
exports.signSchnorr = signSchnorr;
function verify(h, Q, signature, strict = false) {
    validate.validateHash(h);
    validate.validatePoint(Q);
    validate.validateSignature(signature);
    try {
        HASH_INPUT.set(h);
        PUBLIC_KEY_INPUT.set(Q);
        SIGNATURE_INPUT.set(signature);
        return wasm_loader_js_1.default.verify(Q.length, strict === true ? 1 : 0) === 1 ? true : false;
    }
    finally {
        HASH_INPUT.fill(0);
        PUBLIC_KEY_INPUT.fill(0);
        SIGNATURE_INPUT.fill(0);
    }
}
exports.verify = verify;
function recover(h, signature, recoveryId, compressed = false) {
    validate.validateHash(h);
    validate.validateSignature(signature);
    validate.validateSignatureNonzeroRS(signature);
    if (recoveryId & 2) {
        validate.validateSigrPMinusN(signature);
    }
    validate.validateSignatureCustom(() => isXOnlyPoint(signature.subarray(0, 32)));
    const outputlen = assumeCompression(compressed);
    try {
        HASH_INPUT.set(h);
        SIGNATURE_INPUT.set(signature);
        return wasm_loader_js_1.default.recover(outputlen, recoveryId) === 1
            ? PUBLIC_KEY_INPUT.slice(0, outputlen)
            : null;
    }
    finally {
        HASH_INPUT.fill(0);
        SIGNATURE_INPUT.fill(0);
        PUBLIC_KEY_INPUT.fill(0);
    }
}
exports.recover = recover;
function verifySchnorr(h, Q, signature) {
    validate.validateHash(h);
    validate.validateXOnlyPoint(Q);
    validate.validateSignature(signature);
    try {
        HASH_INPUT.set(h);
        X_ONLY_PUBLIC_KEY_INPUT.set(Q);
        SIGNATURE_INPUT.set(signature);
        return wasm_loader_js_1.default.verifySchnorr() === 1 ? true : false;
    }
    finally {
        HASH_INPUT.fill(0);
        X_ONLY_PUBLIC_KEY_INPUT.fill(0);
        SIGNATURE_INPUT.fill(0);
    }
}
exports.verifySchnorr = verifySchnorr;
