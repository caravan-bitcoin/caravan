interface WebAssemblyMemory {
    buffer: Uint8Array;
}
interface WebAssemblyGlobal {
    value: number;
}
declare type RecoveryIdType = 0 | 1 | 2 | 3;
interface Secp256k1WASM {
    memory: WebAssemblyMemory;
    PRIVATE_INPUT: WebAssemblyGlobal;
    PUBLIC_KEY_INPUT: WebAssemblyGlobal;
    PUBLIC_KEY_INPUT2: WebAssemblyGlobal;
    X_ONLY_PUBLIC_KEY_INPUT: WebAssemblyGlobal;
    X_ONLY_PUBLIC_KEY_INPUT2: WebAssemblyGlobal;
    TWEAK_INPUT: WebAssemblyGlobal;
    HASH_INPUT: WebAssemblyGlobal;
    EXTRA_DATA_INPUT: WebAssemblyGlobal;
    SIGNATURE_INPUT: WebAssemblyGlobal;
    initializeContext: () => void;
    isPoint: (p: number) => number;
    pointAdd: (pA: number, pB: number, outputlen: number) => number;
    pointAddScalar: (p: number, outputlen: number) => number;
    pointCompress: (p: number, outputlen: number) => number;
    pointFromScalar: (outputlen: number) => number;
    xOnlyPointFromScalar: () => number;
    xOnlyPointFromPoint: (inputLen: number) => number;
    xOnlyPointAddTweak: () => 1 | 0 | -1;
    xOnlyPointAddTweakCheck: (parity: number) => number;
    pointMultiply: (p: number, outputlen: number) => number;
    privateAdd: () => number;
    privateSub: () => number;
    privateNegate: () => void;
    sign: (e: number) => void;
    signRecoverable: (e: number) => 0 | 1 | 2 | 3;
    signSchnorr: (e: number) => void;
    verify: (Q: number, strict: number) => number;
    verifySchnorr: () => number;
    recover: (outputlen: number, recoveryId: RecoveryIdType) => number;
}
declare const _default: Secp256k1WASM;
export default _default;
