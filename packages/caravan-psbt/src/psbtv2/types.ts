/**
 * Hex encoded string containing `<keytype><keydata>`. A string is needed for
 * Map.get() since it matches by identity. Most commonly, a `Key` only contains a
 * keytype byte, however, some with keydata can allow for multiple unique keys
 * of the same type.
 */
export type Key = string;

/**
 * Values can be of various different types or formats. Here we leave them as
 * Buffers so that getters can decide how they should be formatted.
 */
export type Value = Buffer;

export type NonUniqueKeyTypeValue = { key: string; value: string | null };

/**
 * KeyTypes are hex bytes, but within this module are used as string enums to
 * assist in Map lookups. See type `Key` for more info.
 */
export enum KeyType {
  PSBT_GLOBAL_XPUB = "01",
  PSBT_GLOBAL_TX_VERSION = "02",
  PSBT_GLOBAL_FALLBACK_LOCKTIME = "03",
  PSBT_GLOBAL_INPUT_COUNT = "04",
  PSBT_GLOBAL_OUTPUT_COUNT = "05",
  PSBT_GLOBAL_TX_MODIFIABLE = "06",
  PSBT_GLOBAL_VERSION = "fb",
  PSBT_GLOBAL_PROPRIETARY = "fc",

  PSBT_IN_NON_WITNESS_UTXO = "00",
  PSBT_IN_WITNESS_UTXO = "01",
  PSBT_IN_PARTIAL_SIG = "02",
  PSBT_IN_SIGHASH_TYPE = "03",
  PSBT_IN_REDEEM_SCRIPT = "04",
  PSBT_IN_WITNESS_SCRIPT = "05",
  PSBT_IN_BIP32_DERIVATION = "06",
  PSBT_IN_FINAL_SCRIPTSIG = "07",
  PSBT_IN_FINAL_SCRIPTWITNESS = "08",
  PSBT_IN_POR_COMMITMENT = "09",
  PSBT_IN_RIPEMD160 = "0a",
  PSBT_IN_SHA256 = "0b",
  PSBT_IN_HASH160 = "0c",
  PSBT_IN_HASH256 = "0d",
  PSBT_IN_PREVIOUS_TXID = "0e",
  PSBT_IN_OUTPUT_INDEX = "0f",
  PSBT_IN_SEQUENCE = "10",
  PSBT_IN_REQUIRED_TIME_LOCKTIME = "11",
  PSBT_IN_REQUIRED_HEIGHT_LOCKTIME = "12",
  PSBT_IN_TAP_KEY_SIG = "13",
  PSBT_IN_TAP_SCRIPT_SIG = "14",
  PSBT_IN_TAP_LEAF_SCRIPT = "15",
  PSBT_IN_TAP_BIP32_DERIVATION = "16",
  PSBT_IN_TAP_INTERNAL_KEY = "17",
  PSBT_IN_TAP_MERKLE_ROOT = "18",
  PSBT_IN_PROPRIETARY = "fc",

  PSBT_OUT_REDEEM_SCRIPT = "00",
  PSBT_OUT_WITNESS_SCRIPT = "01",
  PSBT_OUT_BIP32_DERIVATION = "02",
  PSBT_OUT_AMOUNT = "03",
  PSBT_OUT_SCRIPT = "04",
  PSBT_OUT_TAP_INTERNAL_KEY = "05",
  PSBT_OUT_TAP_TREE = "06",
  PSBT_OUT_TAP_BIP32_DERIVATION = "07",
  PSBT_OUT_PROPRIETARY = "fc",
}

/**
 * Provided to friendly-format the `PSBT_GLOBAL_TX_MODIFIABLE` bitmask from
 * `PsbtV2.PSBT_GLOBAL_TX_MODIFIABLE` which returns
 * `PsbtGlobalTxModifiableBits[]`.
 */
export enum PsbtGlobalTxModifiableBits {
  INPUTS = "INPUTS", // 0b00000001
  OUTPUTS = "OUTPUTS", // 0b00000010
  SIGHASH_SINGLE = "SIGHASH_SINGLE", // 0b00000100
}

export enum SighashType {
  SIGHASH_ALL = 0x01,
  SIGHASH_NONE = 0x02,
  SIGHASH_SINGLE = 0x03,
  SIGHASH_ANYONECANPAY = 0x80,
}
