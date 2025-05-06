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

import { Psbt } from "bitcoinjs-lib-v5";
import { BufferReader, BufferWriter } from "bufio";

import { validateBIP32Path } from "./paths";
import { PSBT_MAGIC_BYTES } from "./psbt";
import { validateHex, validBase64 } from "./utils";

/*
Global Types
*/

// Hex encoded string containing <keytype><keydata>. A string is needed for
// Map.get() since it matches by identity. Most commonly, a Key only contains a
// keytype byte, however, some with keydata can allow for multiple unique keys
// of the same type.
type Key = string;

// Values can be of various different types or formats. Here we leave them as
// Buffers so that getters can decide how they should be formatted.
type Value = Buffer;

type NonUniqueKeyTypeValue = { key: string; value: string | null };

// These keytypes are hex bytes, but here they are used as string enums to
// assist in Map lookups. See type Key above for more info.
// eslint-disable-next-line no-shadow
enum KeyType {
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

// Provided to friendly-format the PSBT_GLOBAL_TX_MODIFIABLE bitmask from
// PsbtV2.PSBT_GLOBAL_TX_MODIFIABLE which returns PsbtGlobalTxModifiableBits[].
// eslint-disable-next-line no-shadow
enum PsbtGlobalTxModifiableBits {
  INPUTS = "INPUTS", // 0b00000001
  OUTPUTS = "OUTPUTS", // 0b00000010
  SIGHASH_SINGLE = "SIGHASH_SINGLE", // 0b00000100
}

// eslint-disable-next-line no-shadow
enum SighashType {
  SIGHASH_ALL = 0x01,
  SIGHASH_NONE = 0x02,
  SIGHASH_SINGLE = 0x03,
  SIGHASH_ANYONECANPAY = 0x80,
}

/*
Global Constants
 */

const PSBT_MAP_SEPARATOR = Buffer.from([0x00]);
const BIP_32_NODE_REGEX = /(\/[0-9]+'?)/gi;
const BIP_32_HARDENING_OFFSET = 0x80000000;

/*
Helper Functions
*/

// Ensure base64 and hex strings are a buffer. No-op if already a buffer.
function bufferize(psbt: string | Buffer): Buffer {
  if (Buffer.isBuffer(psbt)) {
    return psbt;
  }

  if (typeof psbt === "string") {
    if (validateHex(psbt) === "") {
      return Buffer.from(psbt, "hex");
    }

    if (validBase64(psbt)) {
      return Buffer.from(psbt, "base64");
    }
  }

  throw Error("Input cannot be bufferized.");
}

// Some keytypes have keydata which allows for multiple unique keys of the same
// keytype. Getters which return values from these keys should search and return
// values from all keys of that keytype. This function matches on the first byte
// of each key string (hex encoded) and returns all values associated with those
// keys as an array of string (hex encoded) values.
function getNonUniqueKeyTypeValues(
  maps: Map<Key, Value> | Map<Key, Value>[],
  keytype: KeyType
) {
  if (Array.isArray(maps)) {
    // It's a set of input or output maps, so recursively check each map and set
    // values.
    const values: NonUniqueKeyTypeValue[][] = maps.map(
      (map) =>
        // TODO: Figure out a better way to type this
        getNonUniqueKeyTypeValues(map, keytype) as NonUniqueKeyTypeValue[]
    );

    return values;
  }

  const map = maps; // Not an array
  const values: NonUniqueKeyTypeValue[] = [];

  for (const [key, value] of map.entries()) {
    if (key.startsWith(keytype)) {
      values.push({ key, value: value?.toString("hex") || null });
    }
  }

  return values;
}

// A getter helper for optional keytypes which returns lists of values as hex
// strings.
function getOptionalMappedBytesAsHex(
  maps: Map<Key, Value>[],
  keytype: KeyType
) {
  return maps.map((map) => map.get(keytype)?.toString("hex") ?? null);
}

// A getter helper for optional keytypes which returns lists of values as
// numbers.
function getOptionalMappedBytesAsUInt(
  maps: Map<Key, Value>[],
  keytype: KeyType
) {
  return maps.map((map) => map.get(keytype)?.readUInt32LE(0) ?? null);
}

// Accepts a BIP0032 path as a string and returns a Buffer containing uint32
// values for each path node.
function parseDerivationPathNodesToBytes(path: string): Buffer {
  const validationMessage = validateBIP32Path(path);
  if (validationMessage !== "") {
    throw Error(validationMessage);
  }

  const bw = new BufferWriter();

  for (const node of path.match(BIP_32_NODE_REGEX) ?? []) {
    // Skip slash and parse int
    let num = parseInt(node.slice(1), 10);

    if (node.indexOf("'") > -1) {
      // Hardened node needs hardening
      num += BIP_32_HARDENING_OFFSET;
    }

    bw.writeU32(num);
  }

  return bw.render();
}

// Takes a BufferReader and a Map then reads keypairs until it gets to a map
// separator (keyLen 0x00 byte);
function readAndSetKeyPairs(map: Map<Key, Buffer>, br: BufferReader) {
  const nextByte: Buffer = br.readBytes(1);
  if (nextByte.equals(PSBT_MAP_SEPARATOR)) {
    return;
  }

  const keyLen = nextByte.readUInt8(0);
  const key = br.readBytes(keyLen);
  const value = br.readVarBytes();

  map.set(key.toString("hex"), value);
  readAndSetKeyPairs(map, br);
}

// Serializes a Map containing keypairs, includes keylen, and writes to the
// BufferWriter.
function serializeMap(map: Map<Key, Value>, bw: BufferWriter): void {
  map.forEach((value, key) => {
    // Add <keylen><keytype><keydata>
    const keyBuf = Buffer.from(key, "hex");
    const keyLen = keyBuf.length;
    bw.writeVarint(keyLen);
    bw.writeString(key, "hex");

    // Add <valuelen><valuedata>
    bw.writeVarint(value.length);
    bw.writeBytes(value);
  });

  bw.writeBytes(PSBT_MAP_SEPARATOR);
}

// This is provided for utility to allow for mapping, map copying, and
// serialization operations for psbts. This does almost no validation, so do not
// rely on it for ensuring a valid psbt.
export abstract class PsbtV2Maps {
  // These maps directly correspond to the maps defined in BIP0174
  protected globalMap: Map<Key, Value> = new Map();
  protected inputMaps: Map<Key, Value>[] = [];
  protected outputMaps: Map<Key, Value>[] = [];

  constructor(psbt?: Buffer | string) {
    if (!psbt) {
      return;
    }

    const buf = bufferize(psbt);
    const br = new BufferReader(buf);
    if (!br.readBytes(PSBT_MAGIC_BYTES.length, true).equals(PSBT_MAGIC_BYTES)) {
      throw Error("PsbtV2 magic bytes are incorrect.");
    }
    // Build globalMap
    readAndSetKeyPairs(this.globalMap, br);
    if (
      // Assuming that psbt being passed in is a valid psbtv2
      !this.globalMap.has(KeyType.PSBT_GLOBAL_VERSION) ||
      !this.globalMap.has(KeyType.PSBT_GLOBAL_TX_VERSION) ||
      !this.globalMap.has(KeyType.PSBT_GLOBAL_INPUT_COUNT) ||
      !this.globalMap.has(KeyType.PSBT_GLOBAL_OUTPUT_COUNT) ||
      this.globalMap.has("00") // PsbtV2 must exclude key 0x00
    ) {
      throw Error("Provided PsbtV2 not valid. Missing required global keys.");
    }

    // Build inputMaps
    const inputCount =
      this.globalMap.get(KeyType.PSBT_GLOBAL_INPUT_COUNT)?.readUInt8(0) ?? 0;
    for (let i = 0; i < inputCount; i++) {
      const map = new Map<Key, Value>();
      readAndSetKeyPairs(map, br);
      this.inputMaps.push(map);
    }

    // Build outputMaps
    const outputCount =
      this.globalMap.get(KeyType.PSBT_GLOBAL_OUTPUT_COUNT)?.readUInt8(0) ?? 0;
    for (let i = 0; i < outputCount; i++) {
      const map = new Map<Key, Value>();
      readAndSetKeyPairs(map, br);
      this.outputMaps.push(map);
    }
  }

  // Return the current state of the psbt as a string in the specified format.
  public serialize(format: "base64" | "hex" = "base64"): string {
    // Build hex string from maps
    const bw = new BufferWriter();
    bw.writeBytes(PSBT_MAGIC_BYTES);
    serializeMap(this.globalMap, bw);

    for (const map of this.inputMaps) {
      serializeMap(map, bw);
    }

    for (const map of this.outputMaps) {
      serializeMap(map, bw);
    }

    return bw.render().toString(format);
  }

  // NOTE: This set of copy methods is made available to
  // achieve parity with the PSBT api required by ledger-bitcoin
  // for creating merklized PSBTs. HOWEVER, it is not recommended
  // to use this when avoidable as copying maps bypasses the validation
  // defined in the constructor, so it could create a psbtv2 in an invalid psbt status.
  // PsbtV2.serialize is preferable whenever possible.
  public copy(to: PsbtV2) {
    this.copyMap(this.globalMap, to.globalMap);
    this.copyMaps(this.inputMaps, to.inputMaps);
    this.copyMaps(this.outputMaps, to.outputMaps);
  }

  private copyMaps(
    from: readonly ReadonlyMap<string, Buffer>[],
    to: Map<string, Buffer>[]
  ) {
    from.forEach((m, index) => {
      const to_index = new Map<Key, Value>();
      this.copyMap(m, to_index);
      to[index] = to_index;
    });
  }

  // eslint-disable-next-line class-methods-use-this
  private copyMap(from: ReadonlyMap<string, Buffer>, to: Map<string, Buffer>) {
    from.forEach((v, k) => to.set(k, Buffer.from(v)));
  }
}

export class PsbtV2 extends PsbtV2Maps {
  constructor(psbt?: Buffer | string) {
    super(psbt);

    if (!psbt) {
      this.create();
    }

    this.validate();
  }

  /**
   * Globals Getters/Setters
   */

  get PSBT_GLOBAL_XPUB() {
    return getNonUniqueKeyTypeValues(this.globalMap, KeyType.PSBT_GLOBAL_XPUB);
  }

  get PSBT_GLOBAL_TX_VERSION() {
    const val = this.globalMap.get(KeyType.PSBT_GLOBAL_TX_VERSION);

    if (val === undefined) {
      throw Error("PSBT_GLOBAL_TX_VERSION not set");
    }

    return val.readInt32LE(0);
  }

  set PSBT_GLOBAL_TX_VERSION(version: number) {
    if (version < 2) {
      // It's unfortunate this setter has to throw, but a PsbtV2 is invalid with
      // a txn version < 2. The Creator role is responsible for setting this
      // value and BIP0370 specifies that it cannot be less than 2.
      // https://github.com/bitcoin/bips/blob/master/bip-0370.mediawiki#cite_note-3
      throw Error(
        `PsbtV2 cannot have a global tx version less than 2. Version ${version} specified.`
      );
    }

    const bw = new BufferWriter();
    bw.writeI32(version);
    this.globalMap.set(KeyType.PSBT_GLOBAL_TX_VERSION, bw.render());
  }

  get PSBT_GLOBAL_FALLBACK_LOCKTIME() {
    return (
      this.globalMap
        .get(KeyType.PSBT_GLOBAL_FALLBACK_LOCKTIME)
        ?.readUInt32LE(0) ?? null
    );
  }

  set PSBT_GLOBAL_FALLBACK_LOCKTIME(locktime: number | null) {
    if (locktime === null) {
      this.globalMap.delete(KeyType.PSBT_GLOBAL_FALLBACK_LOCKTIME);
    } else {
      const bw = new BufferWriter();
      bw.writeI32(locktime);
      this.globalMap.set(KeyType.PSBT_GLOBAL_FALLBACK_LOCKTIME, bw.render());
    }
  }

  get PSBT_GLOBAL_INPUT_COUNT() {
    const val = this.globalMap.get(KeyType.PSBT_GLOBAL_INPUT_COUNT);

    if (val === undefined) {
      throw Error("PSBT_GLOBAL_INPUT_COUNT not set");
    }

    return val.readUInt8(0);
  }

  set PSBT_GLOBAL_INPUT_COUNT(count: number) {
    const bw = new BufferWriter();
    bw.writeU8(count);
    this.globalMap.set(KeyType.PSBT_GLOBAL_INPUT_COUNT, bw.render());
  }

  get PSBT_GLOBAL_OUTPUT_COUNT() {
    const val = this.globalMap.get(KeyType.PSBT_GLOBAL_OUTPUT_COUNT);

    if (val === undefined) {
      throw Error("PSBT_GLOBAL_OUTPUT_COUNT not set");
    }

    return val.readUInt8(0);
  }

  set PSBT_GLOBAL_OUTPUT_COUNT(count: number) {
    const bw = new BufferWriter();
    bw.writeU8(count);
    this.globalMap.set(KeyType.PSBT_GLOBAL_OUTPUT_COUNT, bw.render());
  }

  get PSBT_GLOBAL_TX_MODIFIABLE() {
    const val =
      this.globalMap.get(KeyType.PSBT_GLOBAL_TX_MODIFIABLE)?.readUInt8(0) || 0;
    const modifiable: PsbtGlobalTxModifiableBits[] = [];

    if (val & 0b00000001) {
      modifiable.push(PsbtGlobalTxModifiableBits.INPUTS);
    }
    if (val & 0b00000010) {
      modifiable.push(PsbtGlobalTxModifiableBits.OUTPUTS);
    }
    if (val & 0b00000100) {
      modifiable.push(PsbtGlobalTxModifiableBits.SIGHASH_SINGLE);
    }

    return modifiable;
  }

  set PSBT_GLOBAL_TX_MODIFIABLE(modifiable: PsbtGlobalTxModifiableBits[]) {
    let val = 0b00000000;

    if (modifiable.includes(PsbtGlobalTxModifiableBits.INPUTS)) {
      val |= 0b00000001;
    }
    if (modifiable.includes(PsbtGlobalTxModifiableBits.OUTPUTS)) {
      val |= 0b00000010;
    }
    if (modifiable.includes(PsbtGlobalTxModifiableBits.SIGHASH_SINGLE)) {
      val |= 0b00000100;
    }

    const br = new BufferWriter();
    br.writeU8(val);
    this.globalMap.set(KeyType.PSBT_GLOBAL_TX_MODIFIABLE, br.render());
  }

  get PSBT_GLOBAL_VERSION() {
    const version = this.globalMap
      .get(KeyType.PSBT_GLOBAL_VERSION)
      ?.readUInt32LE(0);
    if (version === undefined) {
      // This should never happen.
      console.warn("PSBT_GLOBAL_VERSION key is missing! Setting to version 2.");
      this.PSBT_GLOBAL_VERSION = 2;
    }
    return version ?? 2;
  }

  set PSBT_GLOBAL_VERSION(version: number) {
    let workingVersion = version;
    if (workingVersion < 2) {
      console.warn(
        `PsbtV2 cannot have a global version less than 2. Version ${workingVersion} specified. Setting to version 2.`
      );
      workingVersion = 2;
    }

    const bw = new BufferWriter();
    bw.writeU32(workingVersion);
    this.globalMap.set(KeyType.PSBT_GLOBAL_VERSION, bw.render());
  }

  get PSBT_GLOBAL_PROPRIETARY() {
    return getNonUniqueKeyTypeValues(
      this.globalMap,
      KeyType.PSBT_GLOBAL_PROPRIETARY
    );
  }

  /**
   * Input Getters/Setters
   */

  get PSBT_IN_NON_WITNESS_UTXO() {
    return getOptionalMappedBytesAsHex(
      this.inputMaps,
      KeyType.PSBT_IN_NON_WITNESS_UTXO
    );
  }

  get PSBT_IN_WITNESS_UTXO() {
    return getOptionalMappedBytesAsHex(
      this.inputMaps,
      KeyType.PSBT_IN_WITNESS_UTXO
    );
  }

  get PSBT_IN_PARTIAL_SIG(): NonUniqueKeyTypeValue[][] {
    return getNonUniqueKeyTypeValues(
      this.inputMaps,
      KeyType.PSBT_IN_PARTIAL_SIG
    ) as NonUniqueKeyTypeValue[][];
  }

  get PSBT_IN_SIGHASH_TYPE() {
    return getOptionalMappedBytesAsUInt(
      this.inputMaps,
      KeyType.PSBT_IN_SIGHASH_TYPE
    );
  }

  get PSBT_IN_REDEEM_SCRIPT() {
    return getOptionalMappedBytesAsHex(
      this.inputMaps,
      KeyType.PSBT_IN_REDEEM_SCRIPT
    );
  }

  get PSBT_IN_WITNESS_SCRIPT() {
    return getOptionalMappedBytesAsHex(
      this.inputMaps,
      KeyType.PSBT_IN_WITNESS_SCRIPT
    );
  }

  get PSBT_IN_BIP32_DERIVATION() {
    return getNonUniqueKeyTypeValues(
      this.inputMaps,
      KeyType.PSBT_IN_BIP32_DERIVATION
    );
  }

  get PSBT_IN_FINAL_SCRIPTSIG() {
    return getOptionalMappedBytesAsHex(
      this.inputMaps,
      KeyType.PSBT_IN_FINAL_SCRIPTSIG
    );
  }

  get PSBT_IN_FINAL_SCRIPTWITNESS() {
    return getOptionalMappedBytesAsHex(
      this.inputMaps,
      KeyType.PSBT_IN_FINAL_SCRIPTWITNESS
    );
  }

  get PSBT_IN_POR_COMMITMENT() {
    return getOptionalMappedBytesAsHex(
      this.inputMaps,
      KeyType.PSBT_IN_POR_COMMITMENT
    );
  }

  get PSBT_IN_RIPEMD160() {
    return getNonUniqueKeyTypeValues(this.inputMaps, KeyType.PSBT_IN_RIPEMD160);
  }

  get PSBT_IN_SHA256() {
    return getNonUniqueKeyTypeValues(this.inputMaps, KeyType.PSBT_IN_SHA256);
  }

  get PSBT_IN_HASH160() {
    return getNonUniqueKeyTypeValues(this.inputMaps, KeyType.PSBT_IN_HASH160);
  }

  get PSBT_IN_HASH256() {
    return getNonUniqueKeyTypeValues(this.inputMaps, KeyType.PSBT_IN_HASH256);
  }

  get PSBT_IN_PREVIOUS_TXID() {
    const indices: string[] = [];
    for (const map of this.inputMaps) {
      const value = map.get(KeyType.PSBT_IN_PREVIOUS_TXID);
      if (!value) {
        throw Error("PSBT_IN_PREVIOUS_TXID not set for an input");
      }
      indices.push(value.toString("hex"));
    }
    return indices;
  }

  get PSBT_IN_OUTPUT_INDEX() {
    const indices: number[] = [];
    for (const map of this.inputMaps) {
      const value = map.get(KeyType.PSBT_IN_OUTPUT_INDEX);
      if (!value) {
        throw Error("PSBT_IN_OUTPUT_INDEX not set for an input");
      }
      indices.push(value.readUInt32LE(0));
    }
    return indices;
  }

  get PSBT_IN_SEQUENCE() {
    return getOptionalMappedBytesAsUInt(
      this.inputMaps,
      KeyType.PSBT_IN_SEQUENCE
    );
  }

  get PSBT_IN_REQUIRED_TIME_LOCKTIME() {
    return getOptionalMappedBytesAsUInt(
      this.inputMaps,
      KeyType.PSBT_IN_REQUIRED_TIME_LOCKTIME
    );
  }

  get PSBT_IN_REQUIRED_HEIGHT_LOCKTIME() {
    return getOptionalMappedBytesAsUInt(
      this.inputMaps,
      KeyType.PSBT_IN_REQUIRED_HEIGHT_LOCKTIME
    );
  }

  get PSBT_IN_TAP_KEY_SIG() {
    return getOptionalMappedBytesAsHex(
      this.inputMaps,
      KeyType.PSBT_IN_TAP_KEY_SIG
    );
  }

  get PSBT_IN_TAP_SCRIPT_SIG() {
    return getNonUniqueKeyTypeValues(
      this.inputMaps,
      KeyType.PSBT_IN_TAP_SCRIPT_SIG
    );
  }

  get PSBT_IN_TAP_LEAF_SCRIPT() {
    return getNonUniqueKeyTypeValues(
      this.inputMaps,
      KeyType.PSBT_IN_TAP_LEAF_SCRIPT
    );
  }

  get PSBT_IN_TAP_BIP32_DERIVATION() {
    return getNonUniqueKeyTypeValues(
      this.inputMaps,
      KeyType.PSBT_IN_TAP_BIP32_DERIVATION
    );
  }

  get PSBT_IN_TAP_INTERNAL_KEY() {
    return getOptionalMappedBytesAsHex(
      this.inputMaps,
      KeyType.PSBT_IN_TAP_INTERNAL_KEY
    );
  }

  get PSBT_IN_TAP_MERKLE_ROOT() {
    return getOptionalMappedBytesAsHex(
      this.inputMaps,
      KeyType.PSBT_IN_TAP_MERKLE_ROOT
    );
  }

  get PSBT_IN_PROPRIETARY() {
    return getNonUniqueKeyTypeValues(
      this.inputMaps,
      KeyType.PSBT_IN_PROPRIETARY
    );
  }

  /**
   * Output Getters/Setters
   */

  get PSBT_OUT_REDEEM_SCRIPT() {
    return getOptionalMappedBytesAsHex(
      this.outputMaps,
      KeyType.PSBT_OUT_REDEEM_SCRIPT
    );
  }

  get PSBT_OUT_WITNESS_SCRIPT() {
    return getOptionalMappedBytesAsHex(
      this.outputMaps,
      KeyType.PSBT_OUT_WITNESS_SCRIPT
    );
  }

  get PSBT_OUT_BIP32_DERIVATION() {
    return getNonUniqueKeyTypeValues(
      this.outputMaps,
      KeyType.PSBT_OUT_BIP32_DERIVATION
    );
  }

  get PSBT_OUT_AMOUNT() {
    const indices: bigint[] = [];
    for (const map of this.outputMaps) {
      const value = map.get(KeyType.PSBT_OUT_AMOUNT);
      if (!value) {
        throw Error("PSBT_OUT_AMOUNT not set for an output");
      }
      const br = new BufferReader(value);
      indices.push(br.readBigI64(value));
    }
    return indices;
  }

  get PSBT_OUT_SCRIPT() {
    const indices: string[] = [];
    for (const map of this.outputMaps) {
      const value = map.get(KeyType.PSBT_OUT_SCRIPT);
      if (!value) {
        // This should never happen, but it can't be gracefully handled.
        throw Error("PSBT_OUT_SCRIPT not set for an output");
      }
      indices.push(value.toString("hex"));
    }
    return indices;
  }

  get PSBT_OUT_TAP_INTERNAL_KEY() {
    return getOptionalMappedBytesAsHex(
      this.outputMaps,
      KeyType.PSBT_OUT_TAP_INTERNAL_KEY
    );
  }

  get PSBT_OUT_TAP_TREE() {
    return getOptionalMappedBytesAsHex(
      this.outputMaps,
      KeyType.PSBT_OUT_TAP_TREE
    );
  }

  get PSBT_OUT_TAP_BIP32_DERIVATION() {
    return getNonUniqueKeyTypeValues(
      this.outputMaps,
      KeyType.PSBT_OUT_TAP_BIP32_DERIVATION
    );
  }

  get PSBT_OUT_PROPRIETARY() {
    return getNonUniqueKeyTypeValues(
      this.outputMaps,
      KeyType.PSBT_OUT_PROPRIETARY
    );
  }

  /**
   * Other Getters/Setters
   */

  get nLockTime() {
    // From BIP0370: The nLockTime field of a transaction is determined by
    // inspecting the PSBT_GLOBAL_FALLBACK_LOCKTIME and each input's
    // PSBT_IN_REQUIRED_TIME_LOCKTIME and PSBT_IN_REQUIRED_HEIGHT_LOCKTIME
    // fields.
    //
    // First collect total locks
    const inputCount = this.PSBT_GLOBAL_INPUT_COUNT;
    const heightLocks = this.PSBT_IN_REQUIRED_HEIGHT_LOCKTIME;
    const timeLocks = this.PSBT_IN_REQUIRED_TIME_LOCKTIME;
    const heights: number[] = [];
    const times: number[] = [];
    for (let i = 0; i < this.PSBT_GLOBAL_INPUT_COUNT; i++) {
      if (heightLocks[i] !== null) {
        heights.push(heightLocks[i] as number);
      }

      if (timeLocks[i] !== null) {
        times.push(timeLocks[i] as number);
      }
    }

    // From BIP0370: If none of the inputs have a PSBT_IN_REQUIRED_TIME_LOCKTIME
    // and *(or) PSBT_IN_REQUIRED_HEIGHT_LOCKTIME, then
    // PSBT_GLOBAL_FALLBACK_LOCKTIME must be used. If
    // PSBT_GLOBAL_FALLBACK_LOCKTIME is not provided, then it is assumed to be
    // 0.
    if (heights.length === 0 && times.length === 0) {
      return this.PSBT_GLOBAL_FALLBACK_LOCKTIME || 0;
    }

    // From BIP0370: If one or more inputs have a PSBT_IN_REQUIRED_TIME_LOCKTIME
    // or PSBT_IN_REQUIRED_HEIGHT_LOCKTIME, then the field chosen is the one
    // which is supported by all of the inputs. This can be determined by
    // looking at all of the inputs which specify a locktime in either of those
    // fields, and choosing the field which is present in all of those inputs.
    // Inputs not specifying a lock time field can take both types of lock
    // times, as can those that specify both. The lock time chosen is then the
    // maximum value of the chosen type of lock time.
    //
    // If a PSBT has both types of locktimes possible because one or more inputs
    // specify both PSBT_IN_REQUIRED_TIME_LOCKTIME and
    // PSBT_IN_REQUIRED_HEIGHT_LOCKTIME, then locktime determined by looking at
    // the PSBT_IN_REQUIRED_HEIGHT_LOCKTIME fields of the inputs must be chosen.
    if (heights.length === inputCount || heights.length > times.length) {
      return Math.max(...heights);
    }
    if (times.length > heights.length) {
      return Math.max(...times);
    }

    return null;
  }

  /**
   * Creator/Constructor Methods
   */

  // This method ensures that global fields have initial values required by a
  // PsbtV2 Creator. It is called by the constructor if constructed without a
  // psbt.
  private create() {
    this.PSBT_GLOBAL_VERSION = 2;
    this.PSBT_GLOBAL_TX_VERSION = 2;
    this.PSBT_GLOBAL_INPUT_COUNT = 0;
    this.PSBT_GLOBAL_OUTPUT_COUNT = 0;
    this.PSBT_GLOBAL_FALLBACK_LOCKTIME = 0;
  }

  // This method should check initial construction of any valid PsbtV2. It is
  // called when a psbt is passed to the constructor or when a new psbt is being
  // created. If constructed with a psbt, this method acts outside of the
  // Creator role to validate the current state of the psbt.
  private validate() {
    if (this.PSBT_GLOBAL_VERSION < 2) {
      throw Error("PsbtV2 has a version field set less than 2");
    }
    if (this.PSBT_GLOBAL_TX_VERSION < 2) {
      throw Error("PsbtV2 has a tx version field set less than 2");
    }

    for (const prevInTxid of this.PSBT_IN_PREVIOUS_TXID) {
      if (!prevInTxid) {
        throw Error("PsbtV2 input is missing PSBT_IN_PREVIOUS_TXID");
      }
    }
    for (const prevInVOut of this.PSBT_IN_OUTPUT_INDEX) {
      if (prevInVOut === undefined) {
        throw Error("PsbtV2 input is missing PSBT_IN_OUTPUT_INDEX");
      }
    }
    for (const amount of this.PSBT_OUT_AMOUNT) {
      if (!amount) {
        throw Error("PsbtV2 input is missing PSBT_OUT_AMOUNT");
      }
    }
    for (const script of this.PSBT_OUT_SCRIPT) {
      if (!script) {
        throw Error("PsbtV2 input is missing PSBT_OUT_SCRIPT");
      }
    }
    for (const locktime of this.PSBT_IN_REQUIRED_TIME_LOCKTIME) {
      if (locktime && locktime < 500000000) {
        throw Error("PsbtV2 input time locktime is less than 500000000.");
      }
    }
    for (const locktime of this.PSBT_IN_REQUIRED_HEIGHT_LOCKTIME) {
      if (locktime && locktime >= 500000000) {
        throw Error("PsbtV2 input hight locktime is gte 500000000.");
      }
    }
  }

  // This method is provided for compatibility issues and probably shouldn't be
  // used since a PsbtV2 with PSBT_GLOBAL_TX_VERSION = 1 is BIP0370
  // non-compliant. No guarantees can be made here that a serialized PsbtV2
  // which used this method will be compatible with outside consumers.
  //
  // One may wish to instance this class from a partially signed
  // PSBTv0 with a txn version 1 by using the static PsbtV2.FromV0. This method
  // provides a way to override validation logic for the txn version and roles
  // lifecycle defined for PsbtV2.
  public dangerouslySetGlobalTxVersion1() {
    console.warn("Dangerously setting PsbtV2.PSBT_GLOBAL_TX_VERSION to 1!");
    const bw = new BufferWriter();
    bw.writeI32(1);
    this.globalMap.set(KeyType.PSBT_GLOBAL_TX_VERSION, bw.render());
  }

  // Is this a Creator/Constructor role action, or something else. BIPs don't
  // define it well.
  public addGlobalXpub(xpub: Buffer, fingerprint: Buffer, path: string) {
    const bw = new BufferWriter();
    bw.writeBytes(Buffer.from(KeyType.PSBT_GLOBAL_XPUB, "hex"));
    bw.writeBytes(xpub);
    const key = bw.render().toString("hex");
    bw.writeBytes(fingerprint);
    const pathBytes = parseDerivationPathNodesToBytes(path);
    bw.writeBytes(pathBytes);
    const value = bw.render();
    this.globalMap.set(key, value);
  }

  public addInput({
    previousTxId,
    outputIndex,
    sequence,
    nonWitnessUtxo,
    witnessUtxo,
    redeemScript,
    witnessScript,
    bip32Derivation,
  }: {
    previousTxId: Buffer | string;
    outputIndex: number;
    sequence?: number;
    nonWitnessUtxo?: Buffer;
    witnessUtxo?: { amount: number; script: Buffer };
    redeemScript?: Buffer;
    witnessScript?: Buffer;
    bip32Derivation?: {
      pubkey: Buffer;
      masterFingerprint: Buffer;
      path: string;
    }[];
  }) {
    // TODO: This must accept and add appropriate locktime fields. There is
    // significant validation concerning this step detailed in the BIP0370
    // Constructor role:
    // https://github.com/bitcoin/bips/blob/master/bip-0370.mediawiki#constructor
    if (!this.isModifiable([PsbtGlobalTxModifiableBits.INPUTS])) {
      throw Error(
        "PsbtV2.PSBT_GLOBAL_TX_MODIFIABLE inputs cannot be modified."
      );
    }
    const map = new Map<Key, Value>();
    const bw = new BufferWriter();
    const prevTxIdBuf = bufferize(previousTxId);
    bw.writeBytes(prevTxIdBuf);

    map.set(KeyType.PSBT_IN_PREVIOUS_TXID, bw.render());
    bw.writeI32(outputIndex);
    map.set(KeyType.PSBT_IN_OUTPUT_INDEX, bw.render());
    if (sequence) {
      bw.writeI32(sequence);
      map.set(KeyType.PSBT_IN_SEQUENCE, bw.render());
    }
    if (nonWitnessUtxo) {
      bw.writeBytes(nonWitnessUtxo);
      map.set(KeyType.PSBT_IN_NON_WITNESS_UTXO, bw.render());
    }
    if (witnessUtxo) {
      bw.writeI64(witnessUtxo.amount);
      bw.writeU8(witnessUtxo.script.length);
      bw.writeBytes(witnessUtxo.script);
      map.set(KeyType.PSBT_IN_WITNESS_UTXO, bw.render());
    }
    if (redeemScript) {
      bw.writeBytes(redeemScript);
      map.set(KeyType.PSBT_IN_REDEEM_SCRIPT, bw.render());
    }
    if (witnessScript) {
      bw.writeBytes(witnessScript);
      map.set(KeyType.PSBT_IN_WITNESS_SCRIPT, bw.render());
    }
    if (bip32Derivation) {
      for (const bip32 of bip32Derivation) {
        bw.writeString(KeyType.PSBT_IN_BIP32_DERIVATION, "hex");
        bw.writeBytes(bip32.pubkey);
        const key = bw.render().toString("hex");
        bw.writeBytes(bip32.masterFingerprint);
        bw.writeBytes(parseDerivationPathNodesToBytes(bip32.path));
        map.set(key, bw.render());
      }
    }

    this.PSBT_GLOBAL_INPUT_COUNT = this.inputMaps.push(map);
  }

  public addOutput({
    amount,
    script,
    redeemScript,
    witnessScript,
    bip32Derivation,
  }: {
    amount: number;
    script: Buffer;
    redeemScript?: Buffer;
    witnessScript?: Buffer;
    bip32Derivation?: {
      pubkey: Buffer;
      masterFingerprint: Buffer;
      path: string;
    }[];
  }) {
    if (!this.isModifiable([PsbtGlobalTxModifiableBits.OUTPUTS])) {
      throw Error(
        "PsbtV2.PSBT_GLOBAL_TX_MODIFIABLE outputs cannot be modified."
      );
    }
    const map = new Map<Key, Value>();
    const bw = new BufferWriter();
    bw.writeI64(amount);
    map.set(KeyType.PSBT_OUT_AMOUNT, bw.render());
    bw.writeBytes(script);
    map.set(KeyType.PSBT_OUT_SCRIPT, bw.render());

    if (redeemScript) {
      bw.writeBytes(redeemScript);
      map.set(KeyType.PSBT_OUT_REDEEM_SCRIPT, bw.render());
    }
    if (witnessScript) {
      bw.writeBytes(witnessScript);
      map.set(KeyType.PSBT_OUT_WITNESS_SCRIPT, bw.render());
    }
    if (bip32Derivation) {
      for (const bip32 of bip32Derivation) {
        bw.writeString(KeyType.PSBT_OUT_BIP32_DERIVATION, "hex");
        bw.writeBytes(bip32.pubkey);
        const key = bw.render().toString("hex");
        bw.writeBytes(bip32.masterFingerprint);
        bw.writeBytes(parseDerivationPathNodesToBytes(bip32.path));
        map.set(key, bw.render());
      }
    }

    this.outputMaps.push(map);
    this.PSBT_GLOBAL_OUTPUT_COUNT = this.outputMaps.length;
  }

  /**
   * Updater/Signer Methods
   */

  // Removes an input-map from inputMaps
  public deleteInput(index: number) {
    if (!this.isModifiable([PsbtGlobalTxModifiableBits.INPUTS])) {
      throw Error(
        "PsbtV2.PSBT_GLOBAL_TX_MODIFIABLE inputs cannot be modified."
      );
    }
    const newInputs = this.inputMaps.filter((_, i) => i !== index);
    this.inputMaps = newInputs;
    this.PSBT_GLOBAL_INPUT_COUNT = this.inputMaps.length;
  }

  // Removes an output-map from outputMaps
  public deleteOutput(index: number) {
    if (!this.isModifiable([PsbtGlobalTxModifiableBits.OUTPUTS])) {
      throw Error(
        "PsbtV2.PSBT_GLOBAL_TX_MODIFIABLE outputs cannot be modified."
      );
      // Alternatively, an output could be removed, but depending on the sighash
      // flags for each signature, it might prompt removing all sigs.
    }

    const newOutputs = this.outputMaps.filter((_, i) => i !== index);

    if (this.isModifiable([PsbtGlobalTxModifiableBits.SIGHASH_SINGLE])) {
      // SIGHASH_SINGLE ties the input to the output, so remove input sig since
      // it is no longer valid.
      this.removePartialSig(index);
    }

    this.outputMaps = newOutputs;
    this.PSBT_GLOBAL_OUTPUT_COUNT = this.outputMaps.length;
  }

  // Checks that provided flags are present in PSBT_GLOBAL_TX_MODIFIABLE.
  private isModifiable(flags: PsbtGlobalTxModifiableBits[]) {
    for (const flag of flags) {
      if (!this.PSBT_GLOBAL_TX_MODIFIABLE.includes(flag)) {
        return false;
      }
    }

    return true;
  }

  // The Signer, when it creates a signature, must add the partial sig keypair
  // to the psbt for the input which it is signing. In the case that a
  // particular signer does not, this method can be used to add a signature to
  // the psbt. This method assumes the Signer did the validation outlined in
  // BIP0174 before creating a signature.
  // https://github.com/bitcoin/bips/blob/master/bip-0174.mediawiki#signer
  public addPartialSig(inputIndex: number, pubkey: Buffer, sig: Buffer) {
    if (!this.inputMaps[inputIndex]) {
      throw Error(`PsbtV2 has no input at ${inputIndex}`);
    }

    if (!pubkey || !sig) {
      throw Error(
        `PsbtV2.addPartialSig() missing argument ${
          (!pubkey && "pubkey") || (!sig && "sig")
        }`
      );
    }

    const key = `${KeyType.PSBT_IN_PARTIAL_SIG}${pubkey.toString("hex")}`;
    if (this.inputMaps[inputIndex].has(key)) {
      throw Error(
        "PsbtV2 already has a signature for this input with this pubkey"
      );
    }

    const modBackup = this.PSBT_GLOBAL_TX_MODIFIABLE;
    try {
      this.inputMaps[inputIndex].set(key, sig);
      this.handleSighashType(sig);
    } catch (err) {
      console.error(err);
      // To remain atomic, attempt to reset everything to the way it was.
      this.inputMaps[inputIndex].delete(key);
      this.PSBT_GLOBAL_TX_MODIFIABLE = modBackup;
    }
  }

  // Removes all sigs for an input unless a pubkey is specified.
  public removePartialSig(inputIndex: number, pubkey?: Buffer) {
    const input = this.inputMaps[inputIndex];

    if (!input) {
      throw Error(`PsbtV2 has no input at ${inputIndex}`);
    }

    if (pubkey) {
      // Pubkey has been provided to remove a specific sig on the input.
      const key = `${KeyType.PSBT_IN_PARTIAL_SIG}${pubkey.toString("hex")}`;
      const sig = this.PSBT_IN_PARTIAL_SIG[inputIndex].find(
        (el) => el.key === key
      );

      if (!sig) {
        throw Error(
          `PsbtV2 input has no signature from pubkey ${pubkey.toString("hex")}`
        );
      }

      input.delete(key);
    } else {
      // Remove all sigs on an input.
      const sigs = this.PSBT_IN_PARTIAL_SIG[inputIndex];
      for (const sig of sigs) {
        input.delete(sig.key);
      }
    }
  }

  // Used to ensure the PSBT is in the proper state when adding a partial sig
  // keypair.
  // https://github.com/bitcoin/bips/blob/master/bip-0370.mediawiki#signer
  private handleSighashType(sig: Buffer) {
    const br = new BufferReader(sig.slice(-1));
    let sighashVal = br.readU8();
    let modifiable = this.PSBT_GLOBAL_TX_MODIFIABLE;

    if (!(sighashVal & SighashType.SIGHASH_ANYONECANPAY)) {
      modifiable = modifiable.filter(
        (val) => val !== PsbtGlobalTxModifiableBits.INPUTS
      );
    } else {
      // Unset SIGHASH_ANYONECANPAY bit for simpler comparisons
      sighashVal ^= SighashType.SIGHASH_ANYONECANPAY;
    }

    // Can't use bitwise the whole way because SIGHASH_SINGLE is a 3.
    if (sighashVal !== SighashType.SIGHASH_NONE) {
      modifiable = modifiable.filter(
        (val) => val !== PsbtGlobalTxModifiableBits.OUTPUTS
      );
    }
    if (
      sighashVal === SighashType.SIGHASH_SINGLE &&
      !modifiable.includes(PsbtGlobalTxModifiableBits.SIGHASH_SINGLE)
    ) {
      modifiable.push(PsbtGlobalTxModifiableBits.SIGHASH_SINGLE);
    }

    this.PSBT_GLOBAL_TX_MODIFIABLE = modifiable;
  }

  // Attempt to return a PsbtV2 by converting from a PsbtV0 string or Buffer
  static FromV0(psbt: string | Buffer, allowTxnVersion1 = false): PsbtV2 {
    const psbtv0Buf = bufferize(psbt);
    const psbtv0 = Psbt.fromBuffer(psbtv0Buf);
    const psbtv0GlobalMap = psbtv0.data.globalMap;

    // Creator Role
    const psbtv2 = new PsbtV2();
    // Set it fully modifiable so that we can add the v0 inputs and outputs.
    psbtv2.PSBT_GLOBAL_TX_MODIFIABLE = [
      PsbtGlobalTxModifiableBits.INPUTS,
      PsbtGlobalTxModifiableBits.OUTPUTS,
    ];
    const txVersion = psbtv0.data.getTransaction().readInt32LE(0);
    if (txVersion === 1 && allowTxnVersion1) {
      psbtv2.dangerouslySetGlobalTxVersion1();
    } else {
      psbtv2.PSBT_GLOBAL_TX_VERSION = psbtv0.data
        .getTransaction()
        .readInt32LE(0);
    }

    // Is this also a Creator role step? Unknown.
    for (const globalXpub of psbtv0GlobalMap.globalXpub ?? []) {
      psbtv2.addGlobalXpub(
        globalXpub.extendedPubkey,
        globalXpub.masterFingerprint,
        globalXpub.path
      );
    }

    // Constructor Role
    const txInputs: any = [];
    for (const [index, txInput] of psbtv0.txInputs.entries()) {
      txInputs[index] = txInput;
    }

    for (const [index, input] of psbtv0.data.inputs.entries()) {
      const txInput = txInputs[index];
      psbtv2.addInput({
        previousTxId: txInput.hash,
        outputIndex: txInput.index,
        sequence: txInput.sequence,
        nonWitnessUtxo: input.nonWitnessUtxo,
        witnessUtxo: input.witnessUtxo && {
          amount: input.witnessUtxo.value,
          script: input.witnessUtxo.script,
        },
        redeemScript: input.redeemScript,
        witnessScript: input.witnessScript,
        bip32Derivation: input.bip32Derivation,
      });
    }

    const txOutputs: any = [];
    for (const [index, txOutput] of psbtv0.txOutputs.entries()) {
      txOutputs[index] = txOutput;
    }

    for (const [index, output] of psbtv0.data.outputs.entries()) {
      const txOutput = txOutputs[index];
      psbtv2.addOutput({
        amount: txOutput.value,
        script: txOutput.script,
        redeemScript: output.redeemScript,
        witnessScript: output.witnessScript,
        bip32Derivation: output.bip32Derivation,
      });
    }

    // Finally, add partialSigs to inputs. This has to be performed last since
    // it may change PSBT_GLOBAL_TX_MODIFIABLE preventing inputs or outputs from
    // being added.
    for (const [index, input] of psbtv0.data.inputs.entries()) {
      for (const sig of input.partialSig || []) {
        psbtv2.addPartialSig(index, sig.pubkey, sig.signature);
      }
    }

    return psbtv2;
  }
}

/**
 * Attempts to extract the version number as uint32LE from raw psbt regardless
 * of psbt validity.
 * @param {string | Buffer} psbt - hex, base64 or buffer of psbt
 * @returns {number} version number
 */
export function getPsbtVersionNumber(psbt: string | Buffer): number {
  const map = new Map<Key, Value>();
  const buf = bufferize(psbt);
  const br = new BufferReader(buf.slice(PSBT_MAGIC_BYTES.length));
  readAndSetKeyPairs(map, br);
  return map.get(KeyType.PSBT_GLOBAL_VERSION)?.readUInt32LE(0) || 0;
}
