/**
 * This module provides an API around the multisig capabilities of the
 * bitcoinjs-lib library.  The API is functional but requires you
 * creating and passing around a [`Multisig`]{@link module:multisig.MULTISIG} object.
 *
 * This `Multisig` object represents the combination of:
 *
 * 1) a sequence of N public keys
 * 2) the number of required signers (M)
 * 3) the address type  (P2SH, P2SH-P2WSH, P2WSH)
 * 4) the bitcoin network
 *
 * This corresponds to a unique bitcoin multisig address.  Note that
 * since (3) & (4) can change without changing (1) & (2), different
 * `Multisig` objects (and their corresponding bitcoin addresses) can
 * have different representations but the same security rules as to
 * who can sign.
 *
 * You can create `Multisig` objects yourself using the following
 * functions:
 *
 * - `generateMultisigFromPublicKeys` which takes public keys as input
 * - `generateMultisigFromHex` which takes a redeem/witness script as input
 *
 * Once you have a `Multisig` object you can pass it around in your
 * code and then ask questions about it using the other functions
 * defined in this module.
 *
 * You can manipulate `Multisig` objects directly but it's better to
 * use the functions from API provided by this module.
 */

import { payments } from "bitcoinjs-lib-v5";

import { networkData } from "./networks";
import { P2SH } from "./p2sh";
import { P2SH_P2WSH } from "./p2sh_p2wsh";
import { P2WSH } from "./p2wsh";
import { toHexString } from "./utils";


/**
 * Describes the return type of several functions in the
 * `payments` module of bitcoinjs-lib.
 *
 * The following functions in this module will return objects of this
 * type:
 *
 * - `generateMultisigFromPublicKeys` which takes public keys as input
 * - `generateMultisigFromHex` which takes a redeem/witness script as input
 *
 * The remaining functions accept these objects as arguments.
 */

/**
 * Enumeration of possible multisig address types ([P2SH]{@link module:p2sh.P2SH}|[P2SH_P2WSH]{@link module:p2sh_p2wsh.P2SH_P2WSH}|[P2WSH]{@link module:p2wsh.P2WSH}).
 */
export const MULTISIG_ADDRESS_TYPES = {
  P2SH,
  P2SH_P2WSH,
  P2WSH,
};

/**
 * Return an M-of-N [`Multisig`]{@link module:multisig.MULTISIG}
 * object by specifying the total number of signers (M) and the public
 * keys (N total).
 */
export function generateMultisigFromPublicKeys(
  network,
  addressType,
  requiredSigners,
  ...publicKeys
) {
  const multisig = payments.p2ms({
    m: requiredSigners,
    pubkeys: publicKeys.map((hex) => Buffer.from(hex, "hex")),
    network: networkData(network),
  });
  return generateMultisigFromRaw(addressType, multisig);
}

/**
 * Return an M-of-N [`Multisig`]{@link module.multisig:Multisig}
 * object by passing a script in hex.
 *
 * If the `addressType` is `P2SH` then the script hex being passed is
 * the redeem script.  If the `addressType` is P2SH-wrapped SegWit
 * (`P2SH_P2WSH`) or native SegWit (`P2WSH`) then the script hex being
 * passed is the witness script.
 *
 * In practice, the same script hex can be thought of as any of
 * several address types, depending on context.
 */
export function generateMultisigFromHex(
  network,
  addressType,
  multisigScriptHex
) {
  const multisig = payments.p2ms({
    output: Buffer.from(multisigScriptHex, "hex"),
    network: networkData(network),
  });
  return generateMultisigFromRaw(addressType, multisig);
}

/**
 * Return an M-of-N [`Multisig`]{@link module.multisig:Multisig}
 * object by passing in a raw P2MS multisig object (from bitcoinjs-lib).
 *
 * This function is only used internally, do not call it directly.
 */
export function generateMultisigFromRaw(addressType, multisig) {
  switch (addressType) {
    case P2SH:
      return payments.p2sh({ redeem: multisig });
    case P2SH_P2WSH:
      return payments.p2sh({
        redeem: payments.p2wsh({ redeem: multisig }),
      });
    case P2WSH:
      return payments.p2wsh({ redeem: multisig });
    default:
      return null;
  }
}

/**
 * Return the [address type]{@link module:multisig.MULTISIG_ADDRESS_TYPES} of the given `Multisig` object.
 */
export function multisigAddressType(multisig) {
  if (multisig.redeem.redeem) {
    return P2SH_P2WSH;
  } else {
    // FIXME why is multisig.witness null?
    // if (multisig.witness) {
    if (multisig.address.match(/^(tb|bc)/)) {
      return P2WSH;
    } else {
      return P2SH;
    }
  }
}

/**
 * Return the number of required signers of the given `Multisig`
 * object.
 */
export function multisigRequiredSigners(multisig) {
  return multisigAddressType(multisig) === P2SH_P2WSH
    ? multisig.redeem.redeem.m
    : multisig.redeem.m;
}

/**
 * Return the number of total signers (public keys) of the given
 * `Multisig` object.
 */
export function multisigTotalSigners(multisig) {
  return multisigAddressType(multisig) === P2SH_P2WSH
    ? multisig.redeem.redeem.n
    : multisig.redeem.n;
}

/**
 * Return the multisig script for the given `Multisig` object.
 *
 * If the address type of the given multisig object is P2SH, the
 * redeem script will be returned.  Otherwise, the witness script will
 * be returned.
 */
export function multisigScript(multisig) {
  switch (multisigAddressType(multisig)) {
    case P2SH:
      return multisigRedeemScript(multisig);
    case P2SH_P2WSH:
      return multisigWitnessScript(multisig);
    case P2WSH:
      return multisigWitnessScript(multisig);
    default:
      /* istanbul ignore next */
      // multisigAddressType only returns one of the 3 above choices
      return null;
  }
}

/**
 * Return the redeem script for the given `Multisig` object.
 *
 * If the address type of the given multisig object is P2WSH, this
 * will return null.
 */
export function multisigRedeemScript(multisig) {
  switch (multisigAddressType(multisig)) {
    case P2SH:
      return multisig.redeem;
    case P2SH_P2WSH:
      return multisig.redeem;
    case P2WSH:
      return null;
    default:
      /* istanbul ignore next */
      // multisigAddressType only returns one of the 3 above choices
      return null;
  }
}

/**
 * Return the witness script for the given `Multisig` object.
 *
 * If the address type of the given multisig object is P2SH, this will
 * return null.
 */
export function multisigWitnessScript(multisig) {
  switch (multisigAddressType(multisig)) {
    case P2SH:
      return null;
    case P2SH_P2WSH:
      return multisig.redeem.redeem;
    case P2WSH:
      return multisig.redeem;
    default:
      /* istanbul ignore next */
      // multisigAddressType only returns one of the 3 above choices
      return null;
  }
}

/**
 * Return the (compressed) public keys in hex for the given `Multisig`
 * object.
 *
 * The public keys are in the order used in the corresponding
 * redeem/witness script.
 */
export function multisigPublicKeys(multisig) {
  return (
    multisigAddressType(multisig) === P2SH
      ? multisigRedeemScript(multisig)
      : multisigWitnessScript(multisig)
  ).pubkeys.map(toHexString);
}

/**
 * Return the address for a given `Multisig` object.
 */
export function multisigAddress(multisig) {
  return multisig.address;
}

/**
 * Return the braid details (if known) for a given `Multisig` object.
 */
export function multisigBraidDetails(multisig) {
  return multisig.braidDetails ? multisig.braidDetails : null;
}
