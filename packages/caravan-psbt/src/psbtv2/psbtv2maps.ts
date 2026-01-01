import { BufferReader, BufferWriter } from "bufio";
import { Transaction } from "bitcoinjs-lib-v6";

import { readAndSetKeyPairs, serializeMap } from "./functions";
import { Key, KeyType, V0KeyTypes, Value } from "./types";
import { PSBT_MAGIC_BYTES } from "../constants";
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
    const br = new BufferReader(buf as any);
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

    // Cast bw.render() to Buffer and explicitly specify encoding type
    const rendered = bw.render() as Buffer;
    return rendered.toString(format as BufferEncoding);
  }

  /**
   * Copies the maps in this PsbtV2Maps object to another PsbtV2Maps object.
   *
   * NOTE: This copy method is made available to achieve parity with the PSBT
   * api required by `ledger-bitcoin` for creating merklized PSBTs. HOWEVER, it
   * is not recommended to use this when avoidable as copying maps bypasses the
   * validation defined in the constructor, so it could create a psbtv2 in an
   * invalid psbt state. PsbtV2.serialize is preferable whenever possible.
   */
  public copy(to: PsbtV2Maps) {
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

/**
 * A PsbtV2Maps class that allows for the addition of and removal of map fields
 * specifically for converting between PSBT versions.
 */
export class PsbtConversionMaps extends PsbtV2Maps {
  /**
   * Builds the unsigned transaction that is required on global map key 0x00 for
   * a PSBTv0. Relies on bitcoinjs-lib to construct the transaction.
   */
  private buildUnsignedTx() {
    const tx = new Transaction();

    tx.version =
      this.globalMap.get(KeyType.PSBT_GLOBAL_TX_VERSION)?.readUInt8() || 0;
    tx.locktime =
      this.globalMap
        .get(KeyType.PSBT_GLOBAL_FALLBACK_LOCKTIME)
        ?.readUInt32LE() || 0;

    const numInputs =
      this.globalMap.get(KeyType.PSBT_GLOBAL_INPUT_COUNT)?.readUInt8() || 0;
    const numOutputs =
      this.globalMap.get(KeyType.PSBT_GLOBAL_OUTPUT_COUNT)?.readUInt8() || 0;

    for (let i = 0; i < numInputs; i++) {
      if (!this.inputMaps[i].has(KeyType.PSBT_IN_PREVIOUS_TXID)) {
        console.warn(`Input ${i} is missing previous txid. Skipping.`);
        continue;
      }
      tx.addInput(
        this.inputMaps[i].get(KeyType.PSBT_IN_PREVIOUS_TXID) as Buffer,
        this.inputMaps[i].get(KeyType.PSBT_IN_OUTPUT_INDEX)?.readUint32LE() ||
          0,
        this.inputMaps[i].get(KeyType.PSBT_IN_SEQUENCE)?.readUint32LE(),
      );
    }

    for (let i = 0; i < numOutputs; i++) {
      if (
        !this.outputMaps[i].has(KeyType.PSBT_OUT_SCRIPT) ||
        !this.outputMaps[i].has(KeyType.PSBT_OUT_AMOUNT)
      ) {
        console.warn(
          `Output ${i} is missing previous out script or amount. Skipping.`,
        );
        continue;
      }
      const bigintAmount = (
        this.outputMaps[i].get(KeyType.PSBT_OUT_AMOUNT) as Buffer
      ).readBigInt64LE();
      const numberAmount = parseInt(bigintAmount.toString());
      tx.addOutput(
        this.outputMaps[i].get(KeyType.PSBT_OUT_SCRIPT) as Buffer,
        numberAmount,
      );
    }

    return tx.toBuffer();
  }

  /**
   * Warns and then deletes map values. Intended for use when converting to a
   * PsbtV0.
   */
  private v0delete(map: Map<Key, Value>, key: KeyType) {
    if (map.has(key)) {
      const keyName = Object.keys(KeyType)[Object.values(KeyType).indexOf(key)];
      console.warn(
        `Key ${keyName} key is not supported on PSBTv0 and will be omitted.`,
      );
    }

    map.delete(key);
  }

  /**
   * Constructs an unsigned txn to be added to the PSBT_GLOBAL_UNSIGNED_TX key
   * which is required on PsbtV0. Then removes all the fields which a PsbtV0 is
   * incompatible with.
   */
  public convertToV0 = () => {
    this.globalMap.set(
      V0KeyTypes.PSBT_GLOBAL_UNSIGNED_TX,
      this.buildUnsignedTx(),
    );

    this.v0delete(this.globalMap, KeyType.PSBT_GLOBAL_TX_VERSION);
    this.v0delete(this.globalMap, KeyType.PSBT_GLOBAL_FALLBACK_LOCKTIME);
    this.v0delete(this.globalMap, KeyType.PSBT_GLOBAL_INPUT_COUNT);
    this.v0delete(this.globalMap, KeyType.PSBT_GLOBAL_OUTPUT_COUNT);
    this.v0delete(this.globalMap, KeyType.PSBT_GLOBAL_TX_MODIFIABLE);
    this.v0delete(this.globalMap, KeyType.PSBT_GLOBAL_VERSION);

    for (const inputMap of this.inputMaps) {
      this.v0delete(inputMap, KeyType.PSBT_IN_PREVIOUS_TXID);
      this.v0delete(inputMap, KeyType.PSBT_IN_OUTPUT_INDEX);
      this.v0delete(inputMap, KeyType.PSBT_IN_SEQUENCE);
      this.v0delete(inputMap, KeyType.PSBT_IN_REQUIRED_TIME_LOCKTIME);
      this.v0delete(inputMap, KeyType.PSBT_IN_REQUIRED_HEIGHT_LOCKTIME);
    }

    for (const outputMap of this.outputMaps) {
      this.v0delete(outputMap, KeyType.PSBT_OUT_AMOUNT);
      this.v0delete(outputMap, KeyType.PSBT_OUT_SCRIPT);
    }
  };
}
