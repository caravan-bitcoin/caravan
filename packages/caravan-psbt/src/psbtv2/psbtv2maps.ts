import { BufferReader, BufferWriter } from "bufio";

import { readAndSetKeyPairs, serializeMap } from "./functions";
import { Key, KeyType, Value } from "./types";
import { PSBT_MAGIC_BYTES } from "../constants";
import { PsbtV2 } from "./psbtv2";
import { bufferize } from "../functions";

/**
 * This abstract class is provided for utility to allow for mapping, map
 * copying, and serialization operations for psbts. This does almost no
 * validation, so do not rely on it for ensuring a valid psbt.
 */
export abstract class PsbtV2Maps {
  // These maps directly correspond to the maps defined in BIP0174 and extended
  // in BIP0370
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

  /**
   * Return the current state of the psbt as a string in the specified format.
   */
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

  /**
   * Copies the maps in this PsbtV2 object to another PsbtV2 object.
   *
   * NOTE: This copy method is made available to achieve parity with the PSBT
   * api required by `ledger-bitcoin` for creating merklized PSBTs. HOWEVER, it
   * is not recommended to use this when avoidable as copying maps bypasses the
   * validation defined in the constructor, so it could create a psbtv2 in an
   * invalid psbt state. PsbtV2.serialize is preferable whenever possible.
   */
  public copy(to: PsbtV2) {
    this.copyMap(this.globalMap, to.globalMap);
    this.copyMaps(this.inputMaps, to.inputMaps);
    this.copyMaps(this.outputMaps, to.outputMaps);
  }

  private copyMaps(
    from: readonly ReadonlyMap<string, Buffer>[],
    to: Map<string, Buffer>[],
  ) {
    from.forEach((m, index) => {
      const to_index = new Map<Key, Value>();
      this.copyMap(m, to_index);
      to[index] = to_index;
    });
  }

  private copyMap(from: ReadonlyMap<string, Buffer>, to: Map<string, Buffer>) {
    from.forEach((v, k) => to.set(k, Buffer.from(v)));
  }
}
