export declare function __initializeContext(): void;
export declare function isPoint(p: Uint8Array): boolean;
export declare function isPointCompressed(p: Uint8Array): boolean;
export declare function isXOnlyPoint(p: Uint8Array): boolean;
export declare function isPrivate(d: Uint8Array): boolean;
export declare function pointAdd(pA: Uint8Array, pB: Uint8Array, compressed?: boolean): Uint8Array | null;
export declare function pointAddScalar(p: Uint8Array, tweak: Uint8Array, compressed?: boolean): Uint8Array | null;
export declare function pointCompress(p: Uint8Array, compressed?: boolean): Uint8Array;
export declare function pointFromScalar(d: Uint8Array, compressed?: boolean): Uint8Array | null;
export declare function xOnlyPointFromScalar(d: Uint8Array): Uint8Array;
export declare function xOnlyPointFromPoint(p: Uint8Array): Uint8Array;
export declare function pointMultiply(p: Uint8Array, tweak: Uint8Array, compressed?: boolean): Uint8Array | null;
export declare function privateAdd(d: Uint8Array, tweak: Uint8Array): Uint8Array | null;
export declare function privateSub(d: Uint8Array, tweak: Uint8Array): Uint8Array | null;
export declare function privateNegate(d: Uint8Array): Uint8Array;
export interface XOnlyPointAddTweakResult {
    parity: 1 | 0;
    xOnlyPubkey: Uint8Array;
}
export declare function xOnlyPointAddTweak(p: Uint8Array, tweak: Uint8Array): XOnlyPointAddTweakResult | null;
export declare type TweakParity = 1 | 0;
export declare function xOnlyPointAddTweakCheck(point: Uint8Array, tweak: Uint8Array, resultToCheck: Uint8Array, tweakParity?: TweakParity): boolean;
export declare function sign(h: Uint8Array, d: Uint8Array, e?: Uint8Array): Uint8Array;
export interface RecoverableSignature {
    signature: Uint8Array;
    recoveryId: RecoveryIdType;
}
export declare function signRecoverable(h: Uint8Array, d: Uint8Array, e?: Uint8Array): RecoverableSignature;
export declare function signSchnorr(h: Uint8Array, d: Uint8Array, e?: Uint8Array): Uint8Array;
export declare function verify(h: Uint8Array, Q: Uint8Array, signature: Uint8Array, strict?: boolean): boolean;
export declare type RecoveryIdType = 0 | 1 | 2 | 3;
export declare function recover(h: Uint8Array, signature: Uint8Array, recoveryId: RecoveryIdType, compressed?: boolean): Uint8Array | null;
export declare function verifySchnorr(h: Uint8Array, Q: Uint8Array, signature: Uint8Array): boolean;
