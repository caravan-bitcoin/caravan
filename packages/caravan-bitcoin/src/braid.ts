/**
 * This module provides functions for braids, which is how we define
 * a group of xpubs with some additional multisig information to define
 * a multisig setup. Sometimes, the word `wallet` is used here, but we
 * view the traditional use of the word 'wallet' as a collection of Braids.
 */

import assert from "assert";

import { Struct } from "bufio";

import {
  validateExtendedPublicKey,
  deriveChildPublicKey,
  extendedPublicKeyRootFingerprint,
} from "./keys";
import {
  MULTISIG_ADDRESS_TYPES,
  generateMultisigFromPublicKeys,
} from "./multisig";
import { Network } from "./networks";
import {
  bip32PathToSequence,
  validateBIP32Index,
  validateBIP32Path,
} from "./paths";

// In building the information objects that PSBTs want, one must include information
// about the root fingerprint for the device. If that information is unknown, just fill
// it in with zeros.
const FAKE_ROOT_FINGERPRINT = "00000000";

/**
 * Struct object for encoding and decoding braids.
 */
export class Braid extends Struct {
  public addressType;
  public network;
  public extendedPublicKeys;
  public requiredSigners;
  public index;
  public sequence;

  constructor(options?) {
    super();
    if (!options || !Object.keys(options).length) {
      return this;
    }

    assert(
      Object.values(MULTISIG_ADDRESS_TYPES).includes(options.addressType),
      `Expected addressType to be one of:  ${Object.values(
        MULTISIG_ADDRESS_TYPES,
      )}. You sent ${options.addressType}`,
    );
    this.addressType = options.addressType;
    assert(
      Object.values(Network).includes(options.network),
      `Expected network to be one of:  ${Object.values(Network)}.`,
    );
    this.network = options.network;

    options.extendedPublicKeys.forEach((xpub) => {
      const xpubValidationError = validateExtendedPublicKey(
        typeof xpub === "string" ? xpub : xpub.base58String,
        this.network,
      );
      assert(!xpubValidationError.length, xpubValidationError);
    });
    this.extendedPublicKeys = options.extendedPublicKeys;

    assert(typeof options.requiredSigners === "number");
    assert(
      options.requiredSigners <= this.extendedPublicKeys.length,
      `Can't have more requiredSigners than there are keys.`,
    );
    this.requiredSigners = options.requiredSigners;

    // index is a technically a bip32path, but it's also just an
    // unhardened index (single number) - if we think of the bip32path as a
    // filepath, then this is a directory that historically/typically tells you
    // deposit (0) or change (1) braid, but could be any unhardened index.
    const pathError = validateBIP32Index(options.index, { mode: "unhardened" });
    assert(!pathError.length, pathError);
    this.index = options.index;
    this.sequence = bip32PathToSequence(this.index);
  }

  toJSON() {
    return braidConfig(this);
  }

  static fromData(data) {
    return new this(data);
  }

  static fromJSON(string) {
    return new this(JSON.parse(string));
  }
}

export function braidConfig(braid) {
  return JSON.stringify({
    network: braid.network,
    addressType: braid.addressType,
    extendedPublicKeys: braid.extendedPublicKeys,
    requiredSigners: braid.requiredSigners,
    index: braid.index,
  });
}

/**
 * Returns the braid's network
 */
export function braidNetwork(braid) {
  return braid.network;
}

/**
 * Returns the braid's addressType
 */
export function braidAddressType(braid) {
  return braid.addressType;
}

/**
 * Returns the braid's extendedPublicKeys
 */
export function braidExtendedPublicKeys(braid) {
  return braid.extendedPublicKeys;
}

/**
 * Returns the braid's requiredSigners
 */
export function braidRequiredSigners(braid) {
  return braid.requiredSigners;
}

/**
 * Returns the braid's index
 */
export function braidIndex(braid) {
  return braid.index;
}

/**
 * Validate that a requested path is derivable from a particular braid
 * e.g. it's both a valid bip32path *and* its first index is the same as the index
 */
export function validateBip32PathForBraid(braid, path) {
  const pathError = validateBIP32Path(path);
  assert(!pathError.length, pathError);

  // The function bip32PathToSequence blindly slices the first index after splitting on '/',
  // so make sure the slash is there. E.g. a path of "0/0" would validate in the above function,
  // but fail to do what we expect here unless we prepend '/' as '/0/0'.
  const pathToCheck =
    path.startsWith("m/") || path.startsWith("/") ? path : "/" + path;
  const pathSequence = bip32PathToSequence(pathToCheck);
  assert(
    pathSequence[0].toString() === braid.index,
    `Cannot derive paths outside of the braid's index: ${braid.index}`,
  );
}

/**
 * Returns an object with a braid's pubkeys + bip32derivation info
 * at a particular path (respects the index)
 */
function derivePublicKeyObjectsAtPath(braid, path) {
  validateBip32PathForBraid(braid, path);
  const dataRichPubKeyObjects = {};
  const actualPathSuffix = path.startsWith("m/") ? path.slice(2) : path;

  braidExtendedPublicKeys(braid).forEach((xpub) => {
    const completePath = xpub.path + "/" + actualPathSuffix;
    // Provide ability to work whether this was called with plain xpub strings or with xpub structs
    const pubkey = deriveChildPublicKey(
      typeof xpub === "string" ? xpub : xpub.base58String,
      path,
      braidNetwork(braid),
    );
    // It's ok if this is faked - but at least one of them should be correct otherwise
    // signing won't work. On Coldcard, this must match what was included in the multisig
    // wallet config file.
    const rootFingerprint = extendedPublicKeyRootFingerprint(xpub);
    const masterFingerprint = rootFingerprint
      ? rootFingerprint
      : FAKE_ROOT_FINGERPRINT;
    dataRichPubKeyObjects[pubkey] = {
      masterFingerprint: Buffer.from(masterFingerprint, "hex"),
      path: completePath,
      pubkey: Buffer.from(pubkey, "hex"),
    };
  });
  return dataRichPubKeyObjects;
}

/**
 * Returns the braid's pubkeys at particular path (respects the index)
 */
export function generatePublicKeysAtPath(braid, path) {
  return Object.keys(derivePublicKeyObjectsAtPath(braid, path)).sort(); // BIP67
}

/**
 * Returns the braid's pubkeys at particular index under the index
 */
export function generatePublicKeysAtIndex(braid, index) {
  let pathToDerive = braidIndex(braid);
  pathToDerive += "/" + index.toString();
  return generatePublicKeysAtPath(braid, pathToDerive);
}

/**
 * Returns the braid's bip32PathDerivation (array of bip32 infos)
 * @param {Braid} braid the braid to interrogate
 * @param {string} path what suffix to generate bip32PathDerivation at
 * @returns {Object[]} array of getBip32Derivation objects
 */
export function generateBip32DerivationByPath(braid, path) {
  return Object.values(derivePublicKeyObjectsAtPath(braid, path));
}

/**
 * Returns the braid's bip32PathDerivation at a particular index (array of bip32 info)
 */
export function generateBip32DerivationByIndex(braid, index) {
  let pathToDerive = braidIndex(braid); // deposit or change
  pathToDerive += "/" + index.toString();
  return generateBip32DerivationByPath(braid, pathToDerive);
}

/**
 * Returns a braid-aware Multisig object at particular path (respects index)
 */
export function deriveMultisigByPath(braid, path) {
  const pubkeys = generatePublicKeysAtPath(braid, path);
  const bip32Derivation = generateBip32DerivationByPath(braid, path);
  return generateBraidAwareMultisigFromPublicKeys(
    braid,
    pubkeys,
    bip32Derivation,
  );
}

/**
 * Returns a braid-aware Multisig object at particular index
 */
export function deriveMultisigByIndex(braid, index) {
  let pathToDerive = braidIndex(braid);
  pathToDerive += "/" + index.toString();
  return deriveMultisigByPath(braid, pathToDerive);
}

/**
 * Returns a braid-aware Multisig object from a set of public keys
 */
function generateBraidAwareMultisigFromPublicKeys(
  braid,
  pubkeys,
  bip32Derivation,
): any {
  let braidAwareMultisig = {};
  const multisig = generateMultisigFromPublicKeys(
    braidNetwork(braid),
    braidAddressType(braid),
    braidRequiredSigners(braid),
    ...pubkeys,
  );
  braidAwareMultisig = {
    ...multisig,
    braidDetails: braidConfig(braid),
    bip32Derivation: bip32Derivation,
  };
  return braidAwareMultisig;
}

/**
 * Generate a braid from its parts
 */
export function generateBraid(
  network,
  addressType,
  extendedPublicKeys,
  requiredSigners,
  index,
) {
  return new Braid({
    network,
    addressType,
    extendedPublicKeys,
    requiredSigners,
    index,
  });
}
