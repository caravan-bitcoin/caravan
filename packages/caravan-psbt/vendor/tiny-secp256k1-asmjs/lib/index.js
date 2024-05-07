import { compare } from "uint8array-tools";
import * as validate from "./validate.js";
import wasm from "./wasm_loader.js";
const WASM_BUFFER = new Uint8Array(wasm.memory.buffer);
const WASM_PRIVATE_KEY_PTR = wasm.PRIVATE_INPUT.value;
const WASM_PUBLIC_KEY_INPUT_PTR = wasm.PUBLIC_KEY_INPUT.value;
const WASM_PUBLIC_KEY_INPUT_PTR2 = wasm.PUBLIC_KEY_INPUT2.value;
const WASM_X_ONLY_PUBLIC_KEY_INPUT_PTR = wasm.X_ONLY_PUBLIC_KEY_INPUT.value;
const WASM_X_ONLY_PUBLIC_KEY_INPUT2_PTR = wasm.X_ONLY_PUBLIC_KEY_INPUT2.value;
const WASM_TWEAK_INPUT_PTR = wasm.TWEAK_INPUT.value;
const WASM_HASH_INPUT_PTR = wasm.HASH_INPUT.value;
const WASM_EXTRA_DATA_INPUT_PTR = wasm.EXTRA_DATA_INPUT.value;
const WASM_SIGNATURE_INPUT_PTR = wasm.SIGNATURE_INPUT.value;
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
        return wasm.isPoint(p.length) === 1;
    }
    finally {
        PUBLIC_KEY_INPUT.fill(0);
    }
}
export function __initializeContext() {
    wasm.initializeContext();
}
export function isPoint(p) {
    return validate.isDERPoint(p) && _isPoint(p);
}
export function isPointCompressed(p) {
    return validate.isPointCompressed(p) && _isPoint(p);
}
export function isXOnlyPoint(p) {
    return validate.isXOnlyPoint(p) && _isPoint(p);
}
export function isPrivate(d) {
    return validate.isPrivate(d);
}
export function pointAdd(pA, pB, compressed) {
    validate.validatePoint(pA);
    validate.validatePoint(pB);
    const outputlen = assumeCompression(compressed, pA);
    try {
        PUBLIC_KEY_INPUT.set(pA);
        PUBLIC_KEY_INPUT2.set(pB);
        return wasm.pointAdd(pA.length, pB.length, outputlen) === 1
            ? PUBLIC_KEY_INPUT.slice(0, outputlen)
            : null;
    }
    finally {
        PUBLIC_KEY_INPUT.fill(0);
        PUBLIC_KEY_INPUT2.fill(0);
    }
}
export function pointAddScalar(p, tweak, compressed) {
    validate.validatePoint(p);
    validate.validateTweak(tweak);
    const outputlen = assumeCompression(compressed, p);
    try {
        PUBLIC_KEY_INPUT.set(p);
        TWEAK_INPUT.set(tweak);
        return wasm.pointAddScalar(p.length, outputlen) === 1
            ? PUBLIC_KEY_INPUT.slice(0, outputlen)
            : null;
    }
    finally {
        PUBLIC_KEY_INPUT.fill(0);
        TWEAK_INPUT.fill(0);
    }
}
export function pointCompress(p, compressed) {
    validate.validatePoint(p);
    const outputlen = assumeCompression(compressed, p);
    try {
        PUBLIC_KEY_INPUT.set(p);
        wasm.pointCompress(p.length, outputlen);
        return PUBLIC_KEY_INPUT.slice(0, outputlen);
    }
    finally {
        PUBLIC_KEY_INPUT.fill(0);
    }
}
export function pointFromScalar(d, compressed) {
    validate.validatePrivate(d);
    const outputlen = assumeCompression(compressed);
    try {
        PRIVATE_KEY_INPUT.set(d);
        return wasm.pointFromScalar(outputlen) === 1
            ? PUBLIC_KEY_INPUT.slice(0, outputlen)
            : null;
    }
    finally {
        PRIVATE_KEY_INPUT.fill(0);
        PUBLIC_KEY_INPUT.fill(0);
    }
}
export function xOnlyPointFromScalar(d) {
    validate.validatePrivate(d);
    try {
        PRIVATE_KEY_INPUT.set(d);
        wasm.xOnlyPointFromScalar();
        return X_ONLY_PUBLIC_KEY_INPUT.slice(0, validate.X_ONLY_PUBLIC_KEY_SIZE);
    }
    finally {
        PRIVATE_KEY_INPUT.fill(0);
        X_ONLY_PUBLIC_KEY_INPUT.fill(0);
    }
}
export function xOnlyPointFromPoint(p) {
    validate.validatePoint(p);
    try {
        PUBLIC_KEY_INPUT.set(p);
        wasm.xOnlyPointFromPoint(p.length);
        return X_ONLY_PUBLIC_KEY_INPUT.slice(0, validate.X_ONLY_PUBLIC_KEY_SIZE);
    }
    finally {
        PUBLIC_KEY_INPUT.fill(0);
        X_ONLY_PUBLIC_KEY_INPUT.fill(0);
    }
}
export function pointMultiply(p, tweak, compressed) {
    validate.validatePoint(p);
    validate.validateTweak(tweak);
    const outputlen = assumeCompression(compressed, p);
    try {
        PUBLIC_KEY_INPUT.set(p);
        TWEAK_INPUT.set(tweak);
        return wasm.pointMultiply(p.length, outputlen) === 1
            ? PUBLIC_KEY_INPUT.slice(0, outputlen)
            : null;
    }
    finally {
        PUBLIC_KEY_INPUT.fill(0);
        TWEAK_INPUT.fill(0);
    }
}
export function privateAdd(d, tweak) {
    validate.validatePrivate(d);
    validate.validateTweak(tweak);
    try {
        PRIVATE_KEY_INPUT.set(d);
        TWEAK_INPUT.set(tweak);
        return wasm.privateAdd() === 1
            ? PRIVATE_KEY_INPUT.slice(0, validate.PRIVATE_KEY_SIZE)
            : null;
    }
    finally {
        PRIVATE_KEY_INPUT.fill(0);
        TWEAK_INPUT.fill(0);
    }
}
export function privateSub(d, tweak) {
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
        return wasm.privateSub() === 1
            ? PRIVATE_KEY_INPUT.slice(0, validate.PRIVATE_KEY_SIZE)
            : null;
    }
    finally {
        PRIVATE_KEY_INPUT.fill(0);
        TWEAK_INPUT.fill(0);
    }
}
export function privateNegate(d) {
    validate.validatePrivate(d);
    try {
        PRIVATE_KEY_INPUT.set(d);
        wasm.privateNegate();
        return PRIVATE_KEY_INPUT.slice(0, validate.PRIVATE_KEY_SIZE);
    }
    finally {
        PRIVATE_KEY_INPUT.fill(0);
    }
}
export function xOnlyPointAddTweak(p, tweak) {
    validate.validateXOnlyPoint(p);
    validate.validateTweak(tweak);
    try {
        X_ONLY_PUBLIC_KEY_INPUT.set(p);
        TWEAK_INPUT.set(tweak);
        const parity = wasm.xOnlyPointAddTweak();
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
export function xOnlyPointAddTweakCheck(point, tweak, resultToCheck, tweakParity) {
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
            return wasm.xOnlyPointAddTweakCheck(tweakParity) === 1;
        }
        else {
            wasm.xOnlyPointAddTweak();
            const newKey = X_ONLY_PUBLIC_KEY_INPUT.slice(0, validate.X_ONLY_PUBLIC_KEY_SIZE);
            return compare(newKey, resultToCheck) === 0;
        }
    }
    finally {
        X_ONLY_PUBLIC_KEY_INPUT.fill(0);
        X_ONLY_PUBLIC_KEY_INPUT2.fill(0);
        TWEAK_INPUT.fill(0);
    }
}
export function sign(h, d, e) {
    validate.validateHash(h);
    validate.validatePrivate(d);
    validate.validateExtraData(e);
    try {
        HASH_INPUT.set(h);
        PRIVATE_KEY_INPUT.set(d);
        if (e !== undefined)
            EXTRA_DATA_INPUT.set(e);
        wasm.sign(e === undefined ? 0 : 1);
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
export function signRecoverable(h, d, e) {
    validate.validateHash(h);
    validate.validatePrivate(d);
    validate.validateExtraData(e);
    try {
        HASH_INPUT.set(h);
        PRIVATE_KEY_INPUT.set(d);
        if (e !== undefined)
            EXTRA_DATA_INPUT.set(e);
        const recoveryId = wasm.signRecoverable(e === undefined ? 0 : 1);
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
export function signSchnorr(h, d, e) {
    validate.validateHash(h);
    validate.validatePrivate(d);
    validate.validateExtraData(e);
    try {
        HASH_INPUT.set(h);
        PRIVATE_KEY_INPUT.set(d);
        if (e !== undefined)
            EXTRA_DATA_INPUT.set(e);
        wasm.signSchnorr(e === undefined ? 0 : 1);
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
export function verify(h, Q, signature, strict = false) {
    validate.validateHash(h);
    validate.validatePoint(Q);
    validate.validateSignature(signature);
    try {
        HASH_INPUT.set(h);
        PUBLIC_KEY_INPUT.set(Q);
        SIGNATURE_INPUT.set(signature);
        return wasm.verify(Q.length, strict === true ? 1 : 0) === 1 ? true : false;
    }
    finally {
        HASH_INPUT.fill(0);
        PUBLIC_KEY_INPUT.fill(0);
        SIGNATURE_INPUT.fill(0);
    }
}
export function recover(h, signature, recoveryId, compressed = false) {
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
        return wasm.recover(outputlen, recoveryId) === 1
            ? PUBLIC_KEY_INPUT.slice(0, outputlen)
            : null;
    }
    finally {
        HASH_INPUT.fill(0);
        SIGNATURE_INPUT.fill(0);
        PUBLIC_KEY_INPUT.fill(0);
    }
}
export function verifySchnorr(h, Q, signature) {
    validate.validateHash(h);
    validate.validateXOnlyPoint(Q);
    validate.validateSignature(signature);
    try {
        HASH_INPUT.set(h);
        X_ONLY_PUBLIC_KEY_INPUT.set(Q);
        SIGNATURE_INPUT.set(signature);
        return wasm.verifySchnorr() === 1 ? true : false;
    }
    finally {
        HASH_INPUT.fill(0);
        X_ONLY_PUBLIC_KEY_INPUT.fill(0);
        SIGNATURE_INPUT.fill(0);
    }
}
