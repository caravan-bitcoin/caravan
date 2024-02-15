/**
 * The PsbtV2 class is intended to represent an easily modifiable and
 * serializable psbt of version 2 conforming to BIP0174. Getters exist for all
 * BIP-defined keytypes. Very few setters and modifier methods exist. As they
 * are added, they should enforce implied and documented rules and limitations.
 *
 * Defining BIPs:
 * https://github.com/bitcoin/bips/blob/master/bip-0174.mediawiki
 * https://github.com/bitcoin/bips/blob/master/bip-0370.mediawiki
 */
/// <reference types="node" />
type Key = string;
type Value = Buffer;
type NonUniqueKeyTypeValue = {
    key: string;
    value: string | null;
};
declare enum PsbtGlobalTxModifiableBits {
    INPUTS = "INPUTS",
    OUTPUTS = "OUTPUTS",
    SIGHASH_SINGLE = "SIGHASH_SINGLE"
}
export declare abstract class PsbtV2Maps {
    protected globalMap: Map<Key, Value>;
    protected inputMaps: Map<Key, Value>[];
    protected outputMaps: Map<Key, Value>[];
    constructor(psbt?: Buffer | string);
    serialize(format?: "base64" | "hex"): string;
    copy(to: PsbtV2): void;
    private copyMaps;
    private copyMap;
}
export declare class PsbtV2 extends PsbtV2Maps {
    constructor(psbt?: Buffer | string);
    /**
     * Globals Getters/Setters
     */
    get PSBT_GLOBAL_XPUB(): NonUniqueKeyTypeValue[] | NonUniqueKeyTypeValue[][];
    get PSBT_GLOBAL_TX_VERSION(): number;
    set PSBT_GLOBAL_TX_VERSION(version: number);
    get PSBT_GLOBAL_FALLBACK_LOCKTIME(): number | null;
    set PSBT_GLOBAL_FALLBACK_LOCKTIME(locktime: number | null);
    get PSBT_GLOBAL_INPUT_COUNT(): number;
    set PSBT_GLOBAL_INPUT_COUNT(count: number);
    get PSBT_GLOBAL_OUTPUT_COUNT(): number;
    set PSBT_GLOBAL_OUTPUT_COUNT(count: number);
    get PSBT_GLOBAL_TX_MODIFIABLE(): PsbtGlobalTxModifiableBits[];
    set PSBT_GLOBAL_TX_MODIFIABLE(modifiable: PsbtGlobalTxModifiableBits[]);
    get PSBT_GLOBAL_VERSION(): number;
    set PSBT_GLOBAL_VERSION(version: number);
    get PSBT_GLOBAL_PROPRIETARY(): NonUniqueKeyTypeValue[] | NonUniqueKeyTypeValue[][];
    /**
     * Input Getters/Setters
     */
    get PSBT_IN_NON_WITNESS_UTXO(): (string | null)[];
    get PSBT_IN_WITNESS_UTXO(): (string | null)[];
    get PSBT_IN_PARTIAL_SIG(): NonUniqueKeyTypeValue[][];
    get PSBT_IN_SIGHASH_TYPE(): (number | null)[];
    get PSBT_IN_REDEEM_SCRIPT(): (string | null)[];
    get PSBT_IN_WITNESS_SCRIPT(): (string | null)[];
    get PSBT_IN_BIP32_DERIVATION(): NonUniqueKeyTypeValue[] | NonUniqueKeyTypeValue[][];
    get PSBT_IN_FINAL_SCRIPTSIG(): (string | null)[];
    get PSBT_IN_FINAL_SCRIPTWITNESS(): (string | null)[];
    get PSBT_IN_POR_COMMITMENT(): (string | null)[];
    get PSBT_IN_RIPEMD160(): NonUniqueKeyTypeValue[] | NonUniqueKeyTypeValue[][];
    get PSBT_IN_SHA256(): NonUniqueKeyTypeValue[] | NonUniqueKeyTypeValue[][];
    get PSBT_IN_HASH160(): NonUniqueKeyTypeValue[] | NonUniqueKeyTypeValue[][];
    get PSBT_IN_HASH256(): NonUniqueKeyTypeValue[] | NonUniqueKeyTypeValue[][];
    get PSBT_IN_PREVIOUS_TXID(): string[];
    get PSBT_IN_OUTPUT_INDEX(): number[];
    get PSBT_IN_SEQUENCE(): (number | null)[];
    get PSBT_IN_REQUIRED_TIME_LOCKTIME(): (number | null)[];
    get PSBT_IN_REQUIRED_HEIGHT_LOCKTIME(): (number | null)[];
    get PSBT_IN_TAP_KEY_SIG(): (string | null)[];
    get PSBT_IN_TAP_SCRIPT_SIG(): NonUniqueKeyTypeValue[] | NonUniqueKeyTypeValue[][];
    get PSBT_IN_TAP_LEAF_SCRIPT(): NonUniqueKeyTypeValue[] | NonUniqueKeyTypeValue[][];
    get PSBT_IN_TAP_BIP32_DERIVATION(): NonUniqueKeyTypeValue[] | NonUniqueKeyTypeValue[][];
    get PSBT_IN_TAP_INTERNAL_KEY(): (string | null)[];
    get PSBT_IN_TAP_MERKLE_ROOT(): (string | null)[];
    get PSBT_IN_PROPRIETARY(): NonUniqueKeyTypeValue[] | NonUniqueKeyTypeValue[][];
    /**
     * Output Getters/Setters
     */
    get PSBT_OUT_REDEEM_SCRIPT(): (string | null)[];
    get PSBT_OUT_WITNESS_SCRIPT(): (string | null)[];
    get PSBT_OUT_BIP32_DERIVATION(): NonUniqueKeyTypeValue[] | NonUniqueKeyTypeValue[][];
    get PSBT_OUT_AMOUNT(): bigint[];
    get PSBT_OUT_SCRIPT(): string[];
    get PSBT_OUT_TAP_INTERNAL_KEY(): (string | null)[];
    get PSBT_OUT_TAP_TREE(): (string | null)[];
    get PSBT_OUT_TAP_BIP32_DERIVATION(): NonUniqueKeyTypeValue[] | NonUniqueKeyTypeValue[][];
    get PSBT_OUT_PROPRIETARY(): NonUniqueKeyTypeValue[] | NonUniqueKeyTypeValue[][];
    /**
     * Other Getters/Setters
     */
    get nLockTime(): number | null;
    /**
     * Creator/Constructor Methods
     */
    private create;
    private validate;
    dangerouslySetGlobalTxVersion1(): void;
    addGlobalXpub(xpub: Buffer, fingerprint: Buffer, path: string): void;
    addInput({ previousTxId, outputIndex, sequence, nonWitnessUtxo, witnessUtxo, redeemScript, witnessScript, bip32Derivation, }: {
        previousTxId: Buffer | string;
        outputIndex: number;
        sequence?: number;
        nonWitnessUtxo?: Buffer;
        witnessUtxo?: {
            amount: number;
            script: Buffer;
        };
        redeemScript?: Buffer;
        witnessScript?: Buffer;
        bip32Derivation?: {
            pubkey: Buffer;
            masterFingerprint: Buffer;
            path: string;
        }[];
    }): void;
    addOutput({ amount, script, redeemScript, witnessScript, bip32Derivation, }: {
        amount: number;
        script: Buffer;
        redeemScript?: Buffer;
        witnessScript?: Buffer;
        bip32Derivation?: {
            pubkey: Buffer;
            masterFingerprint: Buffer;
            path: string;
        }[];
    }): void;
    /**
     * Updater/Signer Methods
     */
    deleteInput(index: number): void;
    deleteOutput(index: number): void;
    private isModifiable;
    addPartialSig(inputIndex: number, pubkey: Buffer, sig: Buffer): void;
    removePartialSig(inputIndex: number, pubkey?: Buffer): void;
    private handleSighashType;
    static FromV0(psbt: string | Buffer, allowTxnVersion1?: boolean): PsbtV2;
}
/**
 * Attempts to extract the version number as uint32LE from raw psbt regardless
 * of psbt validity.
 * @param {string | Buffer} psbt - hex, base64 or buffer of psbt
 * @returns {number} version number
 */
export declare function getPsbtVersionNumber(psbt: string | Buffer): number;
export {};
