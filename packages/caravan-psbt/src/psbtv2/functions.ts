import { BufferReader, BufferWriter } from "bufio";
import { validateBIP32Path } from "@caravan/bitcoin";
import { PSBT_MAGIC_BYTES } from "../constants";
import { Key, Value, NonUniqueKeyTypeValue, KeyType } from "./types";
import {
  BIP_32_HARDENING_OFFSET,
  BIP_32_NODE_REGEX,
  PSBT_MAP_SEPARATOR,
} from "./values";
import { bufferize } from "../functions";

/**
 * Some keytypes have keydata which allows for multiple unique keys of the same
 * keytype. Getters which return values from these keys should search and return
 * values from all keys of that keytype. This function matches on the first byte
 * of each key string (hex encoded) and returns all values associated with those
 * keys as an array of string (hex encoded) values.
 */
export function getNonUniqueKeyTypeValues(
  maps: Map<Key, Value> | Map<Key, Value>[],
  keytype: KeyType,
) {
  if (Array.isArray(maps)) {
    // It's a set of input or output maps, so recursively check each map and set
    // values.
    const values: NonUniqueKeyTypeValue[][] = maps.map(
      (map) =>
        // TODO: Figure out a better way to type this
        getNonUniqueKeyTypeValues(map, keytype) as NonUniqueKeyTypeValue[],
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

/**
 * A getter helper for optional keytypes which returns lists of values as hex
 * strings.
 */
export function getOptionalMappedBytesAsHex(
  maps: Map<Key, Value>[],
  keytype: KeyType,
) {
  return maps.map((map) => map.get(keytype)?.toString("hex") ?? null);
}

/**
 * A getter helper for optional keytypes which returns lists of values as
 * numbers.
 */
export function getOptionalMappedBytesAsUInt(
  maps: Map<Key, Value>[],
  keytype: KeyType,
) {
  return maps.map((map) => map.get(keytype)?.readUInt32LE(0) ?? null);
}

/**
 * Accepts a BIP0032 path as a string and returns a Buffer containing uint32
 * values for each path node.
 */
export function parseDerivationPathNodesToBytes(path: string): Buffer {
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

/**
 * Takes a BufferReader and a Map then reads keypairs until it gets to a map
 * separator (keyLen 0x00 byte).
 */
export function readAndSetKeyPairs(map: Map<Key, Buffer>, br: BufferReader) {
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

/**
 * Serializes a Map containing keypairs, includes keylen, and writes to the
 * BufferWriter.
 */
export function serializeMap(map: Map<Key, Value>, bw: BufferWriter): void {
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

/**
 * Attempts to extract the version number as uint32LE from raw psbt regardless
 * of psbt validity.
 */
export function getPsbtVersionNumber(psbt: string | Buffer): number {
  const map = new Map<Key, Value>();
  const buf = bufferize(psbt);
  // Use a view on the same ArrayBuffer to satisfy BufferReader's Uint8Array typing
  const br = new BufferReader(
    new Uint8Array(
      buf.buffer,
      buf.byteOffset + PSBT_MAGIC_BYTES.length,
      buf.byteLength - PSBT_MAGIC_BYTES.length,
    ),
  );
  readAndSetKeyPairs(map, br);
  return map.get(KeyType.PSBT_GLOBAL_VERSION)?.readUInt32LE(0) || 0;
}
