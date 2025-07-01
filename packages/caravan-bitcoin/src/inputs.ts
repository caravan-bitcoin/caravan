/**
 * This module provides functions for sorting & validating multisig
 * transaction inputs.
 */

import { multisigBraidDetails } from "./multisig";
import { getP2SHInputSize, P2SH } from "./p2sh";
import { getP2SH_P2WSHInputSize, P2SH_P2WSH } from "./p2sh_p2wsh";
import { getP2WSHInputSize, getWitnessWeight, P2WSH } from "./p2wsh";
import { MultisigAddressType } from "./types";
import { validateHex } from "./utils";

/**
 * Represents a transaction input.
 *
 * The [`Multisig`]{@link module:multisig.MULTISIG} object represents
 * the address the corresponding UTXO belongs to.
 */

/**
 * Sorts the given inputs according to the [BIP69 standard]{@link https://github.com/bitcoin/bips/blob/master/bip-0069.mediawiki#transaction-inputs}: ascending lexicographic order.
 */
export function sortInputs(inputs) {
  return inputs.sort((input1, input2) => {
    if (input1.txid > input2.txid) {
      return 1;
    } else {
      if (input1.txid < input2.txid) {
        return -1;
      } else {
        return input1.index < input2.index ? -1 : 1;
      }
    }
  });
}

/**
 * Validates the given transaction inputs.
 *
 * Returns an error message if there are no inputs.  Passes each output to [`validateMultisigInput`]{@link module:transactions.validateOutput}.
 */
export function validateMultisigInputs(inputs, braidRequired = false) {
  if (!inputs || inputs.length === 0) {
    return "At least one input is required.";
  }
  const utxoIDs: string[] = [];
  for (let inputIndex = 0; inputIndex < inputs.length; inputIndex++) {
    const input = inputs[inputIndex];
    if (
      braidRequired &&
      input.multisig &&
      !multisigBraidDetails(input.multisig)
    ) {
      return "At least one input cannot be traced back to its set of extended public keys.";
    }
    const error = validateMultisigInput(input);
    if (error) {
      return error;
    }
    const utxoID = `${input.txid}:${input.index}`;
    if (utxoIDs.includes(utxoID)) {
      return `Duplicate input: ${utxoID}`;
    }
    utxoIDs.push(utxoID);
  }
  return "";
}

/**
 * Validates the given transaction input.
 *
 * - Validates the presence and value of the transaction ID (`txid`) property.
 *
 * - Validates the presence and value of the transaction index (`index`) property.
 *
 * - Validates the presence of the `multisig` property.
 */
export function validateMultisigInput(input) {
  if (!input.txid) {
    return "Does not have a transaction ID ('txid') property.";
  }
  let error = validateTransactionID(input.txid);
  if (error) {
    return error;
  }
  if (input.index !== 0 && !input.index) {
    return "Does not have a transaction index ('index') property.";
  }
  error = validateTransactionIndex(input.index);
  if (error) {
    return error;
  }
  if (!input.multisig) {
    return "Does not have a multisig object ('multisig') property.";
  }
  return "";
}

/**
 * Calculates the weight (virtual size) of a single input based on the script type and signing parameters.
 *
 * @param scriptType - The type of script (P2SH, P2WSH, P2SH-P2WSH)
 * @param m - Number of required signers
 * @param n - Total number of signers
 * @returns The input weight in virtual bytes (vbytes) accounting for witness discount
 */
export function calculateInputWeight(
  scriptType: MultisigAddressType,
  m: number,
  n: number,
): number {
  switch (scriptType) {
    case P2SH:
      // P2SH has no witness discount, return actual size including signatures
      return getP2SHInputSize(m, n);
    case P2WSH: {
      return getP2WSHInputSize() + getWitnessWeight(m, n);
    }
    case P2SH_P2WSH: {
      return getP2SH_P2WSHInputSize() + getWitnessWeight(m, n);
    }
    default:
      throw new Error(`Unsupported script type: ${scriptType}`);
  }
}

const TXID_LENGTH = 64;

/**
 * Validates the given transaction ID.
 */
export function validateTransactionID(txid?) {
  if (txid === null || txid === undefined || txid === "") {
    return "TXID cannot be blank.";
  }
  const error = validateHex(txid);
  if (error) {
    return `TXID is invalid (${error})`;
  }
  if (txid.length !== TXID_LENGTH) {
    return `TXID is invalid (must be ${TXID_LENGTH}-characters)`;
  }
  return "";
}

/**
 * Validates the given transaction index.
 */
export function validateTransactionIndex(indexString?) {
  if (indexString === null || indexString === undefined || indexString === "") {
    return "Index cannot be blank.";
  }
  const index = parseInt(indexString, 10);
  if (!isFinite(index)) {
    return "Index is invalid";
  }
  if (index < 0) {
    return "Index cannot be negative.";
  }
  return "";
}
