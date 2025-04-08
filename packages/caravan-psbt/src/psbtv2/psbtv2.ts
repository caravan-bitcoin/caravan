import { BufferReader, BufferWriter } from "bufio";
import { Psbt } from "bitcoinjs-lib-v6";

import {
  Key,
  Value,
  NonUniqueKeyTypeValue,
  KeyType,
  PsbtGlobalTxModifiableBits,
  SighashType,
  MapSelectorType,
} from "./types";
import {
  getNonUniqueKeyTypeValues,
  getOptionalMappedBytesAsHex,
  getOptionalMappedBytesAsUInt,
  parseDerivationPathNodesToBytes,
} from "./functions";
import { PsbtConversionMaps, PsbtV2Maps } from "./psbtv2maps";
import { bufferize } from "../functions";
/**
 * The PsbtV2 class is intended to represent an easily modifiable and
 * serializable psbt of version 2 conforming to BIP0174. Getters exist for all
 * BIP-defined keytypes. Very few setters and modifier methods exist. As they
 * are added, they should enforce implied and documented rules and limitations.
 *
 * allowTxnVersion1: A Note
 * A psbtv2 must have its transaction version GTE 2 to be bip370 compliant. If
 * this class is instantiated with allowTxnVersion1 set to `true`, then a psbtv2
 * which has had its txn version forceably set to 1 (for example with
 * PsbtV2.dangerouslySetGlobalTxVersion1) can be instantiated. This has,
 * possibly dangerous implications concerning how the locktime might be
 * interpreted.
 *
 * Defining BIPs: https://github.com/bitcoin/bips/blob/master/bip-0174.mediawiki
 * https://github.com/bitcoin/bips/blob/master/bip-0370.mediawiki
 */
export class PsbtV2 extends PsbtV2Maps {
  constructor(psbt?: Buffer | string, allowTxnVersion1 = false) {
    super(psbt);

    if (!psbt) {
      this.create();
    }

    this.validate(allowTxnVersion1);
  }

  /**
   * Globals Getters/Setters
   */

  get PSBT_GLOBAL_XPUB() {
    return getNonUniqueKeyTypeValues(
      this.globalMap,
      KeyType.PSBT_GLOBAL_XPUB,
    ) as NonUniqueKeyTypeValue[];
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
        `PsbtV2 cannot have a global tx version less than 2. Version ${version} specified.`,
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

  get PSBT_GLOBAL_OUTPUT_COUNT() {
    const val = this.globalMap.get(KeyType.PSBT_GLOBAL_OUTPUT_COUNT);

    if (val === undefined) {
      throw Error("PSBT_GLOBAL_OUTPUT_COUNT not set");
    }

    return val.readUInt8(0);
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
        `PsbtV2 cannot have a global version less than 2. Version ${workingVersion} specified. Setting to version 2.`,
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
      KeyType.PSBT_GLOBAL_PROPRIETARY,
    ) as NonUniqueKeyTypeValue[];
  }

  /**
   * Input Getters/Setters
   */

  get PSBT_IN_NON_WITNESS_UTXO() {
    return getOptionalMappedBytesAsHex(
      this.inputMaps,
      KeyType.PSBT_IN_NON_WITNESS_UTXO,
    );
  }

  get PSBT_IN_WITNESS_UTXO() {
    return getOptionalMappedBytesAsHex(
      this.inputMaps,
      KeyType.PSBT_IN_WITNESS_UTXO,
    );
  }

  get PSBT_IN_PARTIAL_SIG() {
    return getNonUniqueKeyTypeValues(
      this.inputMaps,
      KeyType.PSBT_IN_PARTIAL_SIG,
    ) as NonUniqueKeyTypeValue[][];
  }

  get PSBT_IN_SIGHASH_TYPE() {
    return getOptionalMappedBytesAsUInt(
      this.inputMaps,
      KeyType.PSBT_IN_SIGHASH_TYPE,
    );
  }

  get PSBT_IN_REDEEM_SCRIPT() {
    return getOptionalMappedBytesAsHex(
      this.inputMaps,
      KeyType.PSBT_IN_REDEEM_SCRIPT,
    );
  }

  get PSBT_IN_WITNESS_SCRIPT() {
    return getOptionalMappedBytesAsHex(
      this.inputMaps,
      KeyType.PSBT_IN_WITNESS_SCRIPT,
    );
  }

  get PSBT_IN_BIP32_DERIVATION() {
    return getNonUniqueKeyTypeValues(
      this.inputMaps,
      KeyType.PSBT_IN_BIP32_DERIVATION,
    ) as NonUniqueKeyTypeValue[][];
  }

  get PSBT_IN_FINAL_SCRIPTSIG() {
    return getOptionalMappedBytesAsHex(
      this.inputMaps,
      KeyType.PSBT_IN_FINAL_SCRIPTSIG,
    );
  }

  get PSBT_IN_FINAL_SCRIPTWITNESS() {
    return getOptionalMappedBytesAsHex(
      this.inputMaps,
      KeyType.PSBT_IN_FINAL_SCRIPTWITNESS,
    );
  }

  get PSBT_IN_POR_COMMITMENT() {
    return getOptionalMappedBytesAsHex(
      this.inputMaps,
      KeyType.PSBT_IN_POR_COMMITMENT,
    );
  }

  get PSBT_IN_RIPEMD160() {
    return getNonUniqueKeyTypeValues(
      this.inputMaps,
      KeyType.PSBT_IN_RIPEMD160,
    ) as NonUniqueKeyTypeValue[][];
  }

  get PSBT_IN_SHA256() {
    return getNonUniqueKeyTypeValues(
      this.inputMaps,
      KeyType.PSBT_IN_SHA256,
    ) as NonUniqueKeyTypeValue[][];
  }

  get PSBT_IN_HASH160() {
    return getNonUniqueKeyTypeValues(
      this.inputMaps,
      KeyType.PSBT_IN_HASH160,
    ) as NonUniqueKeyTypeValue[][];
  }

  get PSBT_IN_HASH256() {
    return getNonUniqueKeyTypeValues(
      this.inputMaps,
      KeyType.PSBT_IN_HASH256,
    ) as NonUniqueKeyTypeValue[][];
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
      KeyType.PSBT_IN_SEQUENCE,
    );
  }

  get PSBT_IN_REQUIRED_TIME_LOCKTIME() {
    return getOptionalMappedBytesAsUInt(
      this.inputMaps,
      KeyType.PSBT_IN_REQUIRED_TIME_LOCKTIME,
    );
  }

  get PSBT_IN_REQUIRED_HEIGHT_LOCKTIME() {
    return getOptionalMappedBytesAsUInt(
      this.inputMaps,
      KeyType.PSBT_IN_REQUIRED_HEIGHT_LOCKTIME,
    );
  }

  get PSBT_IN_TAP_KEY_SIG() {
    return getOptionalMappedBytesAsHex(
      this.inputMaps,
      KeyType.PSBT_IN_TAP_KEY_SIG,
    );
  }

  get PSBT_IN_TAP_SCRIPT_SIG() {
    return getNonUniqueKeyTypeValues(
      this.inputMaps,
      KeyType.PSBT_IN_TAP_SCRIPT_SIG,
    ) as NonUniqueKeyTypeValue[][];
  }

  get PSBT_IN_TAP_LEAF_SCRIPT() {
    return getNonUniqueKeyTypeValues(
      this.inputMaps,
      KeyType.PSBT_IN_TAP_LEAF_SCRIPT,
    ) as NonUniqueKeyTypeValue[][];
  }

  get PSBT_IN_TAP_BIP32_DERIVATION() {
    return getNonUniqueKeyTypeValues(
      this.inputMaps,
      KeyType.PSBT_IN_TAP_BIP32_DERIVATION,
    ) as NonUniqueKeyTypeValue[][];
  }

  get PSBT_IN_TAP_INTERNAL_KEY() {
    return getOptionalMappedBytesAsHex(
      this.inputMaps,
      KeyType.PSBT_IN_TAP_INTERNAL_KEY,
    );
  }

  get PSBT_IN_TAP_MERKLE_ROOT() {
    return getOptionalMappedBytesAsHex(
      this.inputMaps,
      KeyType.PSBT_IN_TAP_MERKLE_ROOT,
    );
  }

  get PSBT_IN_PROPRIETARY() {
    return getNonUniqueKeyTypeValues(
      this.inputMaps,
      KeyType.PSBT_IN_PROPRIETARY,
    );
  }

  /**
   * Output Getters/Setters
   */

  get PSBT_OUT_REDEEM_SCRIPT() {
    return getOptionalMappedBytesAsHex(
      this.outputMaps,
      KeyType.PSBT_OUT_REDEEM_SCRIPT,
    );
  }

  get PSBT_OUT_WITNESS_SCRIPT() {
    return getOptionalMappedBytesAsHex(
      this.outputMaps,
      KeyType.PSBT_OUT_WITNESS_SCRIPT,
    );
  }

  get PSBT_OUT_BIP32_DERIVATION() {
    return getNonUniqueKeyTypeValues(
      this.outputMaps,
      KeyType.PSBT_OUT_BIP32_DERIVATION,
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
      KeyType.PSBT_OUT_TAP_INTERNAL_KEY,
    );
  }

  get PSBT_OUT_TAP_TREE() {
    return getOptionalMappedBytesAsHex(
      this.outputMaps,
      KeyType.PSBT_OUT_TAP_TREE,
    );
  }

  get PSBT_OUT_TAP_BIP32_DERIVATION() {
    return getNonUniqueKeyTypeValues(
      this.outputMaps,
      KeyType.PSBT_OUT_TAP_BIP32_DERIVATION,
    );
  }

  get PSBT_OUT_PROPRIETARY() {
    return getNonUniqueKeyTypeValues(
      this.outputMaps,
      KeyType.PSBT_OUT_PROPRIETARY,
    );
  }

  /**
   * Operator Role Validation Getters
   */

  /**
   * Returns true if the PsbtV2 is ready for an operator taking the Constructor
   * role.
   *
   * This check assumes that the Creator used this class's constructor method to
   * initialize the PsbtV2 without passing a psbt (constructor  defaults were
   * set).
   */
  get isReadyForConstructor() {
    // At least inputs or outputs must still be modifiable.
    if (
      !this.isModifiable([PsbtGlobalTxModifiableBits.INPUTS]) &&
      !this.isModifiable([PsbtGlobalTxModifiableBits.OUTPUTS])
    ) {
      return false;
    }

    return true;
  }

  /**
   * Returns true if the PsbtV2 is ready for an operator taking the Updater
   * role.
   *
   * Before signatures are added, but after an input is added, a PsbtV2 is
   * likely to be ready for Constructor, ready for Updater, and ready for Signer
   * simultaneously.
   *
   * According to BIP370, the Updater can modify the sequence number, but it is
   * unclear if the Updater retains permissions provided in psbtv0 (BIP174). It
   * is likely not the case that the Updater has the same permissions as
   * previously because it seems to now be the realm of the Constructor to add
   * inputs and outputs.
   */
  get isReadyForUpdater() {
    // In psbtv2, the Updater can set the sequence number, but an input must
    // exist for this to be set.
    if (this.PSBT_GLOBAL_INPUT_COUNT === 0) {
      return false;
    }

    // Inputs must still be modifiable
    if (!this.isModifiable([PsbtGlobalTxModifiableBits.INPUTS])) {
      return false;
    }

    return true;
  }

  /**
   * Returns true if the PsbtV2 is ready for an operator taking the Signer role.
   */
  get isReadyForSigner() {
    // An input must exist before it can be signed.
    if (this.PSBT_GLOBAL_INPUT_COUNT === 0) {
      return false;
    }

    // TODO: Maybe it makes sense to more granularly check if the psbt is fully
    // signed or has minimum signatures. Until then, just check that sigs have
    // not been finalized.
    if (this.isReadyForTransactionExtractor) {
      return false;
    }

    return true;
  }

  /**
   * Returns true if the PsbtV2 is ready for an operator taking the Combiner
   * role.
   */
  get isReadyForCombiner() {
    // The combiner can potentially provide everything that's missing when
    // merging another psbt. If it's at least ready for updates from the
    // following roles, then it's ready for a Combiner.
    return (
      this.isReadyForConstructor ||
      this.isReadyForUpdater ||
      this.isReadyForSigner
    );
  }

  /**
   * Unimplemented. Returns false.
   */
  get isReadyForInputFinalizer() {
    // Checks to see if the psbt contains everything needed to finalize inputs.
    // This can become quite complicated considering multisig and taproot.
    console.warn(
      "PsbtV2.isReadyForInputFinalizer has been called, however, this getter is unimplemented and shouldn't be used.",
    );
    return false;
  }

  /**
   * Returns true if the PsbtV2 is ready for an operator taking the Transaction
   * Extractor role.
   *
   * If all the inputs have been finalized, then the psbt is ready for the
   * Transaction Extractor. According to BIP 174, it's the responsibility of the
   * Input Finalizer to add scriptSigs or scriptWitnesses and then remove other
   * details besides the UTXO. This getter checks that the Input Finalizer has
   * finished its job.
   */
  get isReadyForTransactionExtractor() {
    // Iterate over all inputs

    for (let i = 0; i < this.PSBT_GLOBAL_INPUT_COUNT; i++) {
      // Check for finalized script
      if (
        !this.PSBT_IN_FINAL_SCRIPTSIG[i] &&
        !this.PSBT_IN_FINAL_SCRIPTWITNESS[i]
      ) {
        return false;
      }

      // Check that the corresponding UTXO is still available
      if (
        (this.PSBT_IN_FINAL_SCRIPTSIG[i] &&
          !this.PSBT_IN_NON_WITNESS_UTXO[i]) ||
        (this.PSBT_IN_FINAL_SCRIPTWITNESS[i] && !this.PSBT_IN_WITNESS_UTXO[i])
      ) {
        return false;
      }

      // Check that Input Finalizer removed other values from the input.
      //
      // Test vectors from BIP 370 indicate that a missing PSBT_IN_OUTPUT_INDEX
      // or PSBT_IN_PREVIOUS_TXID should be an invalid psbt, so the getters for
      // these keys will throw unless the values are set. However, the BIP also
      // requires that the Input Finalizer removes all other values from the
      // input map except for the finalized scripts and UTXOs. Since removal of
      // the above mentioned keys will result in an invalid psbt, it's decided
      // here that it's safe to ignore the fact that those keys have not been
      // removed.
      if (
        // Strings
        this.PSBT_IN_REDEEM_SCRIPT[i] ||
        this.PSBT_IN_WITNESS_SCRIPT[i] ||
        this.PSBT_IN_POR_COMMITMENT[i] ||
        this.PSBT_IN_TAP_KEY_SIG[i] ||
        this.PSBT_IN_TAP_INTERNAL_KEY[i] ||
        this.PSBT_IN_TAP_MERKLE_ROOT[i] ||
        // Numbers
        this.PSBT_IN_SIGHASH_TYPE[i] !== null ||
        this.PSBT_IN_SEQUENCE[i] !== null ||
        this.PSBT_IN_REQUIRED_TIME_LOCKTIME[i] !== null ||
        this.PSBT_IN_REQUIRED_HEIGHT_LOCKTIME[i] !== null ||
        // Arrays of non-unique keytype values
        this.PSBT_IN_PARTIAL_SIG[i].filter((el) => el !== null).length > 0 ||
        this.PSBT_IN_BIP32_DERIVATION[i].filter((el) => el !== null).length >
          0 ||
        this.PSBT_IN_RIPEMD160[i].filter((el) => el !== null).length > 0 ||
        this.PSBT_IN_SHA256[i].filter((el) => el !== null).length > 0 ||
        this.PSBT_IN_HASH160[i].filter((el) => el !== null).length > 0 ||
        this.PSBT_IN_HASH256[i].filter((el) => el !== null).length > 0 ||
        this.PSBT_IN_TAP_SCRIPT_SIG[i].filter((el) => el !== null).length > 0 ||
        this.PSBT_IN_TAP_LEAF_SCRIPT[i].filter((el) => el !== null).length >
          0 ||
        this.PSBT_IN_TAP_BIP32_DERIVATION[i].filter((el) => el !== null)
          .length > 0
      ) {
        return false;
      }

      // This input has been finalized. Continue checking the next one.
    }

    // All inputs have been finalized, so this psbt is ready for transaction
    // extraction.
    return true;
  }

  /**
   * Other Getters/Setters
   */

  /**
   * Returns the `nLockTime` field for the psbt as if it were a bitcoin
   * transaction.
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

  /**
   * Ensures that global fields have initial values required by a PsbtV2
   * Creator. It is called by the constructor if constructed without a psbt.
   */
  private create() {
    this.PSBT_GLOBAL_VERSION = 2;
    this.PSBT_GLOBAL_TX_VERSION = 2;
    this.updateGlobalInputCount();
    this.updateGlobalOutputCount();
    // TODO: Right now these values are setting a default. How can it be made to
    // accept values on the constructor method? The Creator role should be
    // allowed to configure these.
    this.PSBT_GLOBAL_FALLBACK_LOCKTIME = 0;
    this.PSBT_GLOBAL_TX_MODIFIABLE = [
      PsbtGlobalTxModifiableBits.INPUTS,
      PsbtGlobalTxModifiableBits.OUTPUTS,
    ];
  }

  /**
   * Checks initial construction of any valid PsbtV2. It is called when a psbt
   * is passed to the constructor or when a new psbt is being created. If
   * constructed with a psbt, this method acts outside of the Creator role to
   * validate the current state of the psbt.
   */
  private validate(allowTxnVersion1: boolean) {
    if (this.PSBT_GLOBAL_VERSION < 2) {
      throw Error("PsbtV2 has a version field set less than 2");
    }
    if (!allowTxnVersion1 && this.PSBT_GLOBAL_TX_VERSION < 2) {
      throw Error("PsbtV2 has a tx version field set less than 2");
    } else if (allowTxnVersion1 && this.PSBT_GLOBAL_TX_VERSION < 2) {
      console.warn("Dangerously setting PsbtV2.PSBT_GLOBAL_TX_VERSION to 1!");
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
      if (amount === undefined || amount === null) {
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

  /**
   * Sets the sequence number for a specific input in the transaction.
   *
   * This private helper method is crucial for implementing RBF and other
   * sequence-based transaction features. It writes the provided sequence
   * number as a 32-bit little-endian unsigned integer and stores it in the
   * appropriate input's map using the PSBT_IN_SEQUENCE key.
   *
   * The sequence number has multiple uses in Bitcoin transactions:
   * 1. Signaling RBF (values < 0xfffffffe)
   * 2. Enabling nLockTime (values < 0xffffffff)
   * 3. Relative timelock with BIP68 (if bit 31 is not set)
   *
   * According to BIP125 (Opt-in Full Replace-by-Fee Signaling):
   *
   * - For a transaction to be considered opt-in RBF, it must have at least
   *   one input with a sequence number < 0xfffffffe.
   * - The recommended sequence for RBF is 0xffffffff-2 (0xfffffffd).
   *
   * Sequence number meanings:
   * - = 0xffffffff: Then the transaction is final no matter the nLockTime.
   * - < 0xfffffffe: Transaction signals for RBF.
   * - < 0xefffffff : Then the transaction signals BIP68 relative locktime.
   *
   * For using nLocktime along with Opt-in RBF, the sequence value
   * should be between 0xf0000000 and 0xfffffffd.
   *
   * Care should be taken when setting sequence numbers to ensure the desired
   * transaction properties are correctly signaled. Improper use can lead to
   * unexpected transaction behavior or rejection by the network.
   *
   * References:
   * - BIP125: Opt-in Full Replace-by-Fee Signaling
   *   https://github.com/bitcoin/bips/blob/master/bip-0125.mediawiki
   * - BIP68: Relative lock-time using consensus-enforced sequence numbers
   *   https://github.com/bitcoin/bips/blob/master/bip-0068.mediawiki
   */
  public setInputSequence(inputIndex: number, sequence: number) {
    // Check if the PSBT is ready for the Updater role
    if (!this.isReadyForUpdater) {
      throw new Error(
        "PSBT is not ready for the Updater role. Sequence cannot be changed.",
      );
    }

    // Check if the input exists
    if (inputIndex < 0 || inputIndex >= this.PSBT_GLOBAL_INPUT_COUNT) {
      throw new Error(`Input at index ${inputIndex} does not exist.`);
    }

    // Set the sequence number
    const bw = new BufferWriter();
    bw.writeU32(sequence);
    this.inputMaps[inputIndex].set(KeyType.PSBT_IN_SEQUENCE, bw.render());
  }

  /**
   * Checks if the transaction signals Replace-by-Fee (RBF).
   *
   * This method determines whether the transaction is eligible for RBF by
   * examining the sequence numbers of all inputs. As per BIP125, a transaction
   * is considered to have opted in to RBF if it contains at least one input
   * with a sequence number less than (0xffffffff - 1).
   *
   * Return value:
   * - true: If any input has a sequence number < 0xfffffffe, indicating RBF.
   * - false: If all inputs have sequence numbers >= 0xfffffffe, indicating no RBF.
   *
   * This method is useful for wallets, block explorers, or any service that
   * needs to determine if a transaction can potentially be replaced before
   * confirmation.
   *
   * References:
   * - BIP125: Opt-in Full Replace-by-Fee Signaling
   *   https://github.com/bitcoin/bips/blob/master/bip-0125.mediawiki
   */
  get isRBFSignaled(): boolean {
    return this.PSBT_IN_SEQUENCE.some(
      (seq) => seq !== null && seq < 0xfffffffe,
    );
  }

  /**
   * This method is provided for compatibility issues and probably shouldn't be
   * used since a PsbtV2 with PSBT_GLOBAL_TX_VERSION = 1 is BIP0370
   * non-compliant. No guarantees can be made here that a serialized PsbtV2
   * which used this method will be compatible with outside consumers.
   *
   * One may wish to instance this class from a partially signed PSBTv0 with a
   * txn version 1 by using the static PsbtV2.FromV0. This method provides a way
   * to override validation logic for the txn version and roles lifecycle
   * defined for PsbtV2.
   */
  public dangerouslySetGlobalTxVersion1() {
    if (!this.isReadyForConstructor) {
      throw Error(
        "The PsbtV2 is not ready for a Constructor. The PSBT_GLOBAL_TX_VERSION should not be forced to version 1.",
      );
    }
    console.warn("Dangerously setting PsbtV2.PSBT_GLOBAL_TX_VERSION to 1!");
    const bw = new BufferWriter();
    bw.writeI32(1);
    this.globalMap.set(KeyType.PSBT_GLOBAL_TX_VERSION, bw.render());
  }

  // Is this a Creator/Constructor role action, or something else? BIPs don't
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
    sighashType,
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
    sighashType?: SighashType;
  }) {
    // TODO: This must accept and add appropriate locktime fields. There is
    // significant validation concerning this step detailed in the BIP0370
    // Constructor role:
    // https://github.com/bitcoin/bips/blob/master/bip-0370.mediawiki#constructor
    //
    // TODO: This method must properly handle the SIGHASH_SINGLE flag. If the
    // `PSBT_GLOBAL_TX_MODIFIABLE` flag `SIGHASH_SINGLE` is present and a
    // signature is present, then adding or removing  inputs or outputs before a
    // signature with sighash_single must happen atomically in pairs.

    if (!this.isReadyForConstructor) {
      throw Error(
        "The PsbtV2 is not ready for a Constructor. Inputs cannot be added.",
      );
    }
    if (!this.isModifiable([PsbtGlobalTxModifiableBits.INPUTS])) {
      throw Error(
        "PsbtV2.PSBT_GLOBAL_TX_MODIFIABLE inputs cannot be modified.",
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
    if (sighashType !== undefined) {
      bw.writeU32(sighashType);
      map.set(KeyType.PSBT_IN_SIGHASH_TYPE, bw.render());
    }

    this.inputMaps.push(map);
    this.updateGlobalInputCount();
    
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
    if (!this.isReadyForConstructor) {
      throw Error(
        "The PsbtV2 is not ready for a Constructor. Outputs cannot be added.",
      );
    }
    if (!this.isModifiable([PsbtGlobalTxModifiableBits.OUTPUTS])) {
      throw Error(
        "PsbtV2.PSBT_GLOBAL_TX_MODIFIABLE outputs cannot be modified.",
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
    this.updateGlobalOutputCount();    
  }

  /**
   * Updater/Signer Methods
   */

  /**
   * Removes an input-map from inputMaps.
   */
  public deleteInput(index: number) {
    if (!this.isReadyForConstructor) {
      throw Error(
        "The PsbtV2 is not ready for a Constructor. Inputs cannot be removed.",
      );
    }
    if (!this.isModifiable([PsbtGlobalTxModifiableBits.INPUTS])) {
      throw Error(
        "PsbtV2.PSBT_GLOBAL_TX_MODIFIABLE inputs cannot be modified.",
      );
    }
    const newInputs = this.inputMaps.filter((_, i) => i !== index);
    this.inputMaps = newInputs;
    this.updateGlobalInputCount();

  }

  /**
   * Removes an output-map from outputMaps.
   */
  public deleteOutput(index: number) {
    if (!this.isReadyForConstructor) {
      throw Error(
        "The PsbtV2 is not ready for a Constructor. Outputs cannot be removed.",
      );
    }
    if (!this.isModifiable([PsbtGlobalTxModifiableBits.OUTPUTS])) {
      throw Error(
        "PsbtV2.PSBT_GLOBAL_TX_MODIFIABLE outputs cannot be modified.",
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
    this.updateGlobalOutputCount();
  }

  /**
   * Checks that all provided flags are present in PSBT_GLOBAL_TX_MODIFIABLE.
   */
  private isModifiable(flags: PsbtGlobalTxModifiableBits[]) {
    for (const flag of flags) {
      if (!this.PSBT_GLOBAL_TX_MODIFIABLE.includes(flag)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Adds a signature for an input. Validates that the input is mapped and does
   * not already have a signature for the pubkey. Also validates for sighash.
   * Other validation is incomplete. Also validates for required args in case
   * typescript is not being used to call the method.
   *
   * The Signer, when it creates a signature, must add the partial sig keypair
   * to the psbt for the input which it is signing. In the case that a
   * particular signer does not, this method can be used to add a signature to
   * the psbt. This method assumes the Signer did the validation outlined in
   * BIP0174 before creating a signature.
   * https://github.com/bitcoin/bips/blob/master/bip-0174.mediawiki#signer
   */
  public addPartialSig(inputIndex: number, pubkey: Buffer, sig: Buffer) {
    if (!this.isReadyForSigner) {
      throw Error(
        "The PsbtV2 is not ready for a Signer. Partial sigs cannot be added.",
      );
    }
    if (!this.inputMaps[inputIndex]) {
      throw Error(`PsbtV2 has no input at ${inputIndex}`);
    }

    if (!pubkey || !sig) {
      throw Error(
        `PsbtV2.addPartialSig() missing argument ${
          (!pubkey && "pubkey") || (!sig && "sig")
        }`,
      );
    }

    const key = `${KeyType.PSBT_IN_PARTIAL_SIG}${pubkey.toString("hex")}`;
    if (this.inputMaps[inputIndex].has(key)) {
      throw Error(
        "PsbtV2 already has a signature for this input with this pubkey",
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

  /**
   * Removes all sigs for an input unless a pubkey is specified. Validates that
   * the input exists. When providing a pubkey, this validates that a sig for
   * the pubkey exists.
   */
  public removePartialSig(inputIndex: number, pubkey?: Buffer) {
    // TODO: What role is allowed to remove a partial sig? Perform that
    // role-check validation here.
    const input = this.inputMaps[inputIndex];

    if (!input) {
      throw Error(`PsbtV2 has no input at ${inputIndex}`);
    }

    if (pubkey) {
      // Pubkey has been provided to remove a specific sig on the input.
      const key = `${KeyType.PSBT_IN_PARTIAL_SIG}${pubkey.toString("hex")}`;
      const sig = this.PSBT_IN_PARTIAL_SIG[inputIndex].find(
        (el) => el.key === key,
      );

      if (!sig) {
        throw Error(
          `PsbtV2 input has no signature from pubkey ${pubkey.toString("hex")}`,
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

  /**
   * Sets values on the proprietary keytype for a global, input, or output map.
   * BIP 174 allows for proprietary values to be set on all maps with the
   * keytype `0xFC`. This method sets byte data to key values defined by the
   * args.
   *
   * Args:
   * - `mapSelector` selects which map to set the proprietary value. If this
   *   value is not `"global"`, then a tuple must be provided with `"inputs"` or
   *   `"outputs"` as the first element and the index `number` on the second
   *   element representing which input or output map to set the value to. An
   *   example looks like `["inputs", 0]`. If the map name doesn't match, the
   *   values will be set to the global map. If the index is missing on
   *   `"inputs"` or `"outputs"`, then it will throw.
   * - `identifier` should be the bytes identifier for the set of proprietary
   *   keytypes.
   * - `subkeyType` accepts bytes proprietary keytype.
   * - `subkeyData` accepts bytes proprietary keydata.
   * - `valueData` accepts bytes which will be written as the proprietary value.
   *
   * From the provided args, a key with the following format will be generated:
   * `0xFC<compact uint identifier length><bytes identifier><bytes
   * subtype><bytes subkeydata>`
   */
  public setProprietaryValue(
    mapSelector: MapSelectorType,
    identifier: Buffer,
    subkeyType: Buffer,
    subkeyData: Buffer,
    valueData: Buffer,
  ) {
    if (
      (mapSelector[0] === "inputs" || mapSelector[0] === "outputs") &&
      typeof mapSelector[1] !== "number"
    ) {
      throw Error(
        "Must specify an index when setting proprietary values to inputs or outputs.",
      );
    }

    let classMap: Map<string, Buffer> = this.globalMap,
      keyType = KeyType.PSBT_GLOBAL_PROPRIETARY;
    if (mapSelector[0] === "inputs") {
      classMap = this.inputMaps[mapSelector[1]];
      keyType = KeyType.PSBT_IN_PROPRIETARY;
    } else if (mapSelector[0] === "outputs") {
      classMap = this.outputMaps[mapSelector[1]];
      keyType = KeyType.PSBT_OUT_PROPRIETARY;
    }

    if (!classMap) {
      throw Error("Map does not exist at that index.");
    }

    const bw = new BufferWriter();
    bw.writeBytes(Buffer.from(keyType, "hex"));
    bw.writeU8(identifier.length);
    bw.writeBytes(identifier);
    bw.writeBytes(subkeyType);
    bw.writeBytes(subkeyData);
    const key = bw.render().toString("hex");
    bw.writeBytes(valueData);
    const value = bw.render();
    classMap.set(key, value);
  }

  /**
   * Ensures the PSBT is in the proper state when adding a partial sig keypair.
   * https://github.com/bitcoin/bips/blob/master/bip-0370.mediawiki#signer
   */
  private handleSighashType(sig: Buffer) {
    const br = new BufferReader(sig.slice(-1));
    let sighashVal = br.readU8();
    let modifiable = this.PSBT_GLOBAL_TX_MODIFIABLE;

    if (!(sighashVal & SighashType.SIGHASH_ANYONECANPAY)) {
      modifiable = modifiable.filter(
        (val) => val !== PsbtGlobalTxModifiableBits.INPUTS,
      );
    } else {
      // Unset SIGHASH_ANYONECANPAY bit for simpler comparisons
      sighashVal ^= SighashType.SIGHASH_ANYONECANPAY;
    }

    // Can't use bitwise the whole way because SIGHASH_SINGLE is a 3.
    if (sighashVal !== SighashType.SIGHASH_NONE) {
      modifiable = modifiable.filter(
        (val) => val !== PsbtGlobalTxModifiableBits.OUTPUTS,
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

  /**
   * Attempts to return a PsbtV2 by converting from a PsbtV0 string or Buffer.
   *
   * This method first starts with a fresh PsbtV2 having just been created. It
   * then takes the PsbtV2 through its operator saga and through the Input
   * Finalizer role. In this sense, validation for each operator role will be
   * performed as the Psbt saga is replayed.
   */
  static FromV0(psbt: string | Buffer, allowTxnVersion1 = false): PsbtV2 {
    const psbtv0Buf = bufferize(psbt);
    const psbtv0 = Psbt.fromBuffer(psbtv0Buf);
    const psbtv0GlobalMap = psbtv0.data.globalMap;

    // Creator Role
    const psbtv2 = new PsbtV2();
    const txVersion = psbtv0.data.getTransaction().readInt32LE(0);
    if (txVersion === 1 && allowTxnVersion1) {
      psbtv2.dangerouslySetGlobalTxVersion1();
    } else {
      psbtv2.PSBT_GLOBAL_TX_VERSION = psbtv0.data
        .getTransaction()
        .readInt32LE(0);
    }

    psbtv2.PSBT_GLOBAL_FALLBACK_LOCKTIME = psbtv0.locktime;

    // Constructor Role
    for (const globalXpub of psbtv0GlobalMap.globalXpub ?? []) {
      psbtv2.addGlobalXpub(
        globalXpub.extendedPubkey,
        globalXpub.masterFingerprint,
        globalXpub.path,
      );
    }

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
        sighashType: input.sighashType,
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

    // Signer Role
    // This may change PSBT_GLOBAL_TX_MODIFIABLE preventing inputs or outputs
    // from being added.
    for (const [index, input] of psbtv0.data.inputs.entries()) {
      for (const sig of input.partialSig || []) {
        psbtv2.addPartialSig(index, sig.pubkey, sig.signature);
      }
    }

    // Input Finalizer
    // TODO: Add input finalizer method which removes other input fields. The
    // Input Finalizer role is supposed to remove the other script and partial
    // sig fields from the input after the input is finalized. This is maybe
    // safe as-is for now since it is building from a v0 conversion.
    for (const [index, input] of psbtv0.data.inputs.entries()) {
      if (input.finalScriptSig) {
        psbtv2.inputMaps[index].set(
          KeyType.PSBT_IN_FINAL_SCRIPTSIG,
          input.finalScriptSig,
        );
      }
      if (input.finalScriptWitness) {
        psbtv2.inputMaps[index].set(
          KeyType.PSBT_IN_FINAL_SCRIPTWITNESS,
          input.finalScriptWitness,
        );
      }
    }

    return psbtv2;
  }

  /**
   * Outputs a serialized PSBTv0 from a best-attempt conversion of the fields in
   * this PSBTv2. Accepts optional desired format as a string (default base64).
   */
  public toV0(format?: "base64" | "hex") {
    const converterMap = new PsbtConversionMaps();
    // Copy the values from this PsbtV2 into the converter map.
    this.copy(converterMap);
    // Creates the unsigned tx and adds it to the map and then removes v2 keys.
    converterMap.convertToV0();
    return converterMap.serialize(format);
  }

  /**
   * Updates the PSBT_GLOBAL_INPUT_COUNT and PSBT_GLOBAL_OUTPUT_COUNT fields
   * in the global map.
   */
  private updateGlobalInputCount() {
    const bw = new BufferWriter();
    bw.writeU8(this.inputMaps.length); // or `.size` if inputMaps is a Map
    this.globalMap.set(KeyType.PSBT_GLOBAL_INPUT_COUNT, bw.render());
  }
  
  /**
   * Updates the PSBT_GLOBAL_OUTPUT_COUNT field in the global map.
   */
  private updateGlobalOutputCount() {
    const bw = new BufferWriter();
    bw.writeU8(this.outputMaps.length); // or `.size` if outputMaps is a Map
    this.globalMap.set(KeyType.PSBT_GLOBAL_OUTPUT_COUNT, bw.render());
  }
}