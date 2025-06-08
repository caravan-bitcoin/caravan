import {
  estimateMultisigP2SHTransactionVSize,
  estimateMultisigP2SH_P2WSHTransactionVSize,
  estimateMultisigP2WSHTransactionVSize,
  Network,
  validateAddress,
} from "@caravan/bitcoin";
import { PsbtV2 } from "@caravan/psbt";
import { BigNumber } from "bignumber.js";
import {
  payments,
  address as bitcoinAddress,
  networks,
  Transaction,
  Network as BitcoinJSNetwork,
} from "bitcoinjs-lib-v6";

import { ScriptType, SCRIPT_TYPES } from "./types";

/**
 * Creates an output script for a given Bitcoin address.
 *
 * This function validates the provided address and creates an appropriate
 * output script based on the address type (P2PKH, P2SH, P2WPKH,P2TR or P2WSH).
 * It supports both mainnet, testnet and regtest addresses.
 *
 * @param {string} destinationAddress - The Bitcoin address to create an output script for.
 * @param {Network} network - The Bitcoin network (mainnet ,testnet or regtest) the address belongs to.
 * @returns {Buffer} The output script as a Buffer.
 * @throws {Error} If the address is invalid or unsupported, or if the output script cannot be created.
 *
 * @example
 * const script = createOutputScript('1BvBMSEYstWetqTFn5Au4m4GFg7xJaNVN2', Network.MAINNET);
 */
export function createOutputScript(
  destinationAddress: string,
  network: Network,
): Buffer {
  // Validate the address
  const addressValidationError = validateAddress(destinationAddress, network);
  if (addressValidationError) {
    throw new Error(addressValidationError);
  }

  // Convert Caravan Network to bitcoinjs-lib network
  const networkMap = {
    [Network.TESTNET]: networks.testnet,
    [Network.REGTEST]: networks.regtest ?? networks.testnet,
    [Network.MAINNET]: networks.bitcoin,
  };

  const bitcoinJsNetwork = networkMap[network];

  try {
    // First, try to create an output script using bitcoinjs-lib
    return bitcoinAddress.toOutputScript(destinationAddress, bitcoinJsNetwork);
  } catch (error) {
    // If toOutputScript fails, it might be a native SegWit address
    try {
      // Try creating a P2WPKH output
      const p2wpkh = payments.p2wpkh({
        address: destinationAddress,
        network: bitcoinJsNetwork,
      });
      if (p2wpkh.output) {
        return p2wpkh.output;
      }

      // If not P2WPKH, try P2WSH
      const p2wsh = payments.p2wsh({
        address: destinationAddress,
        network: bitcoinJsNetwork,
      });
      if (p2wsh.output) {
        return p2wsh.output;
      }

      // If not P2WSH, try P2TR
      const p2tr = payments.p2tr({
        address: destinationAddress,
        network: bitcoinJsNetwork,
      });
      if (p2tr.output) {
        return p2tr.output;
      }

      throw new Error("Unsupported address type");
    } catch (segwitError) {
      throw new Error(`Invalid or unsupported address: ${destinationAddress}`);
    }
  }
}

/**
 * Attempts to derive the address from an output script.
 * @param {Buffer} script - The output script
 * @param {Network} network - The Bitcoin network (e.g., mainnet, testnet) to use for address derivation.
 * @returns {string} The derived address or an error message if unable to derive
 * @protected
 */
export function getOutputAddress(script: Buffer, network: Network): string {
  const bitcoinjsNetwork = mapCaravanNetworkToBitcoinJS(network);

  try {
    // Check for P2PKH (25 bytes, starting with OP_DUP (0x76) and OP_HASH160 (0xa9))
    if (script.length === 25 && script[0] === 0x76 && script[1] === 0xa9) {
      const p2pkhAddress = payments.p2pkh({
        output: script,
        network: bitcoinjsNetwork,
      }).address;
      if (p2pkhAddress) return p2pkhAddress;
    }

    // Check for P2WPKH
    if (script.length === 22 && script[0] === 0x00 && script[1] === 0x14) {
      const p2wpkhAddress = payments.p2wpkh({
        output: script,
        network: bitcoinjsNetwork,
      }).address;
      if (p2wpkhAddress) return p2wpkhAddress;
    }

    // Check for P2WSH
    if (script.length === 34 && script[0] === 0x00 && script[1] === 0x20) {
      const p2wshAddress = payments.p2wsh({
        output: script,
        network: bitcoinjsNetwork,
      }).address;
      if (p2wshAddress) return p2wshAddress;
    }

    // Check for P2SH (23 bytes, starting with OP_HASH160 (0xa9))
    if (script.length === 23 && script[0] === 0xa9 && script[22] === 0x87) {
      return (
        payments.p2sh({ output: script, network: bitcoinjsNetwork }).address ||
        ""
      );
    }

    // Check for P2TR (Taproot, 34 bytes, starting with OP_1 (0x51))
    if (script.length === 34 && script[0] === 0x51) {
      const p2trAddress = payments.p2tr({
        output: script,
        network: bitcoinjsNetwork,
      }).address;
      if (p2trAddress) return p2trAddress;
    }

    // If we couldn't derive an address, return an error message
    return "Unable to derive address";
  } catch (e) {
    console.error("Error deriving address:", e);
    return "Unable to derive address";
  }
}

/**
 * Estimates the virtual size (vsize) of a transaction.
 *
 * This function calculates the estimated vsize for different address types,
 * including P2SH, P2SH_P2WSH, P2WSH, and P2WPKH. The vsize is crucial for
 * fee estimation in Bitcoin transactions, especially for SegWit transactions
 * where the witness data is discounted.
 *
 * Calculation Method:
 * 1. For non-SegWit (P2SH): vsize = transaction size
 * 2. For SegWit (P2SH_P2WSH, P2WSH, P2WPKH):
 *    vsize = (transaction weight) / 4, rounded up
 *    where transaction weight = (base size * 3) + total size
 *
 * References:
 * - BIP141 (SegWit): https://github.com/bitcoin/bips/blob/master/bip-0141.mediawiki
 * - Bitcoin Core weight calculation: https://github.com/bitcoin/bitcoin/blob/master/src/consensus/validation.h
 *
 * @param config - Configuration object for the transaction
 * @param config.addressType - The type of address used (P2SH, P2SH_P2WSH, P2WSH, P2WPKH)
 * @param config.numInputs - Number of inputs in the transaction
 * @param config.numOutputs - Number of outputs in the transaction
 * @param config.m - Number of required signatures (for multisig)
 * @param config.n - Total number of possible signers (for multisig)
 *
 * @returns The estimated virtual size (vsize) of the transaction in vbytes
 *
 * @throws Will throw an error if the address type is unsupported
 */
export function estimateTransactionVsize({
  addressType = SCRIPT_TYPES.P2SH,
  numInputs = 1,
  numOutputs = 1,
  m = 1,
  n = 2,
}: {
  addressType?: ScriptType;
  numInputs?: number;
  numOutputs?: number;
  m?: number;
  n?: number;
} = {}): number {
  switch (addressType) {
    case SCRIPT_TYPES.P2SH:
      return estimateMultisigP2SHTransactionVSize({
        numInputs,
        numOutputs,
        m,
        n,
      });
    case SCRIPT_TYPES.P2SH_P2WSH:
      return estimateMultisigP2SH_P2WSHTransactionVSize({
        numInputs,
        numOutputs,
        m,
        n,
      });
    case SCRIPT_TYPES.P2WSH:
      return estimateMultisigP2WSHTransactionVSize({
        numInputs,
        numOutputs,
        m,
        n,
      });

    default:
      throw new Error(`Unsupported address type: ${addressType}`);
  }
}

/**
 * Initializes the parent PSBT from various input formats.
 *
 * This method supports initializing from a PsbtV2 object, a serialized PSBT string,
 * or a Buffer. It attempts to parse the input as a PsbtV2 and falls back to PsbtV0
 * if necessary, providing backwards compatibility.
 *
 * @private
 * @param {PsbtV2 | string | Buffer} psbt - The parent PSBT in various formats
 * @returns {PsbtV2} An initialized PsbtV2 object
 * @throws {Error} If the PSBT cannot be parsed or converted
 */
export function initializePsbt(psbt: PsbtV2 | string | Buffer): PsbtV2 {
  if (psbt instanceof PsbtV2) {
    return psbt;
  }
  try {
    return new PsbtV2(psbt);
  } catch (error) {
    try {
      return PsbtV2.FromV0(psbt);
    } catch (conversionError) {
      throw new Error(
        "Unable to initialize PSBT. Neither V2 nor V0 format recognized.",
      );
    }
  }
}

/**
 * Calculates the total input value from the given PSBT.
 *
 * This function aggregates the total value of all inputs, considering both
 * witness and non-witness UTXOs. It uses helper functions to parse and sum up
 * the values of each input.
 *
 * @param psbt - The PsbtV2 instance representing the partially signed Bitcoin transaction.
 * @returns The total input value as a BigNumber.
 */
export function calculateTotalInputValue(psbt: PsbtV2): BigNumber {
  let total = new BigNumber(0);
  for (let i = 0; i < psbt.PSBT_GLOBAL_INPUT_COUNT; i++) {
    const witnessUtxo = psbt.PSBT_IN_WITNESS_UTXO[i];
    const nonWitnessUtxo = psbt.PSBT_IN_NON_WITNESS_UTXO[i];
    if (witnessUtxo) {
      total = total.plus(parseWitnessUtxoValue(witnessUtxo, i));
    } else if (nonWitnessUtxo) {
      if (!nonWitnessUtxo) {
        throw new Error(
          `Output index for non-witness UTXO at index ${i} is undefined`,
        );
      }
      total = total.plus(parseNonWitnessUtxoValue(nonWitnessUtxo, i));
    } else {
      throw new Error(`No UTXO data found for input at index ${i}`);
    }
  }
  return total;
}

/**
 * Parses the value of a witness UTXO.
 *
 * Witness UTXOs are expected to have their value encoded in the first 8 bytes
 * of the hex string in little-endian byte order. This function extracts and
 * converts that value to a BigNumber.
 *
 * @param utxo - The hex string representing the witness UTXO.
 * @param index - The index of the UTXO in the PSBT input list.
 * @returns The parsed value as a BigNumber.
 */
export function parseWitnessUtxoValue(
  utxo: string | null,
  index: number,
): BigNumber {
  if (!utxo) {
    console.warn(`Witness UTXO at index ${index} is null`);
    return new BigNumber(0);
  }
  try {
    const buffer = Buffer.from(utxo, "hex");
    // The witness UTXO format is: [value][scriptPubKey]
    // The value is an 8-byte little-endian integer
    const value = buffer.readBigUInt64LE(0);
    return new BigNumber(value.toString());
  } catch (error) {
    console.warn(`Failed to parse witness UTXO at index ${index}:`, error);
    return new BigNumber(0);
  }
}

/**
 * Parses the value of a non-witness UTXO.
 *
 * @param rawTx - The raw transaction hex string.
 * @param outputIndex - The index of the output in the transaction.
 * @returns The parsed value as a BigNumber.
 * @throws Error if the transaction cannot be parsed or the output index is invalid.
 */
export function parseNonWitnessUtxoValue(
  rawTx: string,
  outputIndex: number,
): BigNumber {
  try {
    const tx = Transaction.fromHex(rawTx);

    if (outputIndex < 0 || outputIndex >= tx.outs.length) {
      throw new Error(`Invalid output index: ${outputIndex}`);
    }

    const output = tx.outs[outputIndex];
    return new BigNumber(output.value);
  } catch (error) {
    throw new Error(
      `Failed to parse non-witness UTXO: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

/**
 * Calculates the total output value from the given PSBT.
 *
 * This function sums the values of all outputs in the PSBT.
 *
 * @param psbt - The PsbtV2 instance representing the partially signed Bitcoin transaction.
 * @returns The total output value as a BigNumber.
 */
export function calculateTotalOutputValue(psbt: PsbtV2): BigNumber {
  const sum = psbt.PSBT_OUT_AMOUNT.reduce((acc, amount) => acc + amount, 0n);
  return new BigNumber(sum.toString());
}

/**
 * Maps a Caravan Network to its corresponding BitcoinJS Network.
 *
 * @param {CaravanNetwork} network - The Caravan Network to map.
 * @returns {BitcoinJSNetwork} The corresponding BitcoinJS Network.
 * @throws {Error} If an unsupported network is provided.
 */
export function mapCaravanNetworkToBitcoinJS(
  network: Network,
): BitcoinJSNetwork {
  switch (network) {
    case Network.MAINNET:
      return networks.bitcoin;
    case Network.TESTNET:
      return networks.testnet;
    case Network.REGTEST:
      return networks.regtest;
    case Network.SIGNET:
      // As of the last check, bitcoinjs-lib doesn't have built-in support for signet.
      // If signet support is crucial, you might need to define a custom network.
      throw new Error(
        "Signet is not directly supported in bitcoinjs-lib. Consider defining a custom network if needed.",
      );
    default:
      throw new Error(`Unsupported network: ${network}`);
  }
}

/**
 * Validates a non-witness UTXO (Unspent Transaction Output) for use in a PSBT.
 *
 * This function performs several checks on the provided UTXO to ensure it's valid:
 * 1. Verifies that the transaction can be parsed from the buffer.
 * 2. Checks if the specified output index (vout) is within the range of available outputs.
 * 3. Validates that the output value is a positive number.
 * 4. Ensures that the output script is a valid Buffer.
 *
 * Note: This function does not validate the txid, as the provided buffer represents
 * the previous transaction, not the transaction containing this input.
 *
 * @param {Buffer} utxoBuffer - The raw transaction buffer containing the UTXO.
 * @param {string} txid - The transaction ID of the input (not used in validation, but included for potential future use).
 * @param {number} vout - The index of the output in the transaction that we're spending.
 * @returns {boolean} True if the UTXO is valid, false otherwise.
 *
 * @throws {Error} Implicitly, if there's an issue parsing the transaction. The error is caught and logged, returning false.
 */
export function validateNonWitnessUtxo(
  utxoBuffer: Buffer,
  txid: string,
  vout: number,
): boolean {
  try {
    const tx = Transaction.fromBuffer(utxoBuffer);

    // Validate that the vout is within range
    if (vout < 0 || vout >= tx.outs.length) {
      return false;
    }

    // Get the specific output we're spending
    const output = tx.outs[vout];

    // Validate the output value (should be a positive number)
    if (typeof output.value !== "number" || output.value <= 0) {
      return false;
    }

    // Validate that the output script is a Buffer
    if (!Buffer.isBuffer(output.script)) {
      return false;
    }

    // Note: We can't validate the txid here because tx.getId() would give us
    // the txid of this previous transaction, not our input's txid.

    return true;
  } catch (error) {
    console.error("Error validating non-witness UTXO:", error);
    return false;
  }
}

/**
 * Validates the sequence number of a transaction input.
 *
 * In Bitcoin transactions, the sequence number is used for various purposes including:
 * - Signaling Replace-By-Fee (RBF) when set to a value less than 0xffffffff - 1
 * - Enabling relative timelock when bit 31 is not set (value < 0x80000000)
 *
 * This function checks if the provided sequence number is a valid 32-bit unsigned integer.
 *
 * @param {number} sequence - The sequence number to validate.
 * @returns {boolean} True if the sequence number is valid, false otherwise.
 *
 * @example
 * console.log(validateSequence(0xffffffff)); // true
 * console.log(validateSequence(0xfffffffe)); // true (signals RBF)
 * console.log(validateSequence(0x80000000)); // true (disables relative timelock)
 * console.log(validateSequence(-1)); // false (negative)
 * console.log(validateSequence(0x100000000)); // false (exceeds 32-bit)
 * console.log(validateSequence(1.5)); // false (not an integer)
 *
 * @see https://github.com/bitcoin/bips/blob/master/bip-0068.mediawiki BIP 68 for relative lock-time
 * @see https://github.com/bitcoin/bips/blob/master/bip-0125.mediawiki BIP 125 for opt-in full Replace-by-Fee signaling
 */
export function validateSequence(sequence: number): boolean {
  // Sequence should be a 32-bit unsigned integer
  return Number.isInteger(sequence) && sequence >= 0 && sequence <= 0xffffffff;
}

/**
 * Reverses the byte order of a hexadecimal string (i.e., flips endianness).
 *
 * @param hex - A hexadecimal string (e.g., a transaction ID or block hash).
 * @returns The hex string with reversed byte order.
 *
 * @remarks
 * Bitcoin internally stores many values (like transaction IDs, block hashes, etc.)
 * in little-endian format, even though they are typically represented and
 * communicated externally in big-endian format.
 *
 * This function is particularly important in the `@caravan/fees` because input
 * UTXOs provided by users often include transaction IDs in **big-endian** form
 * (as shown in block explorers or PSBT files), but Bitcoin Core and many raw
 * protocols internally require them in **little-endian**.
 *
 * Reversing the byte order ensures correct internal processing for our @caravan/fees-package, matching Bitcoin's
 * expectations.
 *
 * For example:
 * Big-endian TXID (user-provided): `6fe28c0ab6f1b372c1a6a246ae63f74f931e8365e15a089c68d6190000000000`
 * Little-endian (used in raw tx):  `000000000019d6689c0815e165831e934ff763ae46a2a6c172b3f1b60a8ce26f`
 *
 * This "quirk" is well-documented and explained in:
 * @see {@link https://learnmeabitcoin.com/technical/general/byte-order}
 */
export const reverseHex = (hex: string): string =>
  Buffer.from(hex, "hex").reverse().toString("hex");
