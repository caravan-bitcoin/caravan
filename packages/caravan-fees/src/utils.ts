import {
  P2SH,
  P2SH_P2WSH,
  P2WSH,
  estimateMultisigP2SHTransactionVSize,
  estimateMultisigP2SH_P2WSHTransactionVSize,
  estimateMultisigP2WSHTransactionVSize,
  Network,
  validateAddress,
} from "@caravan/bitcoin";
import { PsbtV2 } from "@caravan/psbt";
import BigNumber from "bignumber.js";
import {
  payments,
  address as bitcoinAddress,
  networks,
  Transaction,
} from "bitcoinjs-lib-v6";

import {
  BaseErrorType,
  RbfErrorType,
  CpfpErrorType,
  ErrorType,
  ErrorMessage,
  TransactionState,
} from "./types";

/**
 * Estimate the virtual size of a transaction based on its address type and input/output count.
 * @param addressType The type of address (P2SH, P2SH_P2WSH, or P2WSH)
 * @param inputCount Number of inputs
 * @param outputCount Number of outputs
 * @param m Number of required signers
 * @param n Total number of signers
 * @returns Estimated virtual size in vbytes
 */
export function estimateVirtualSize(
  addressType: string,
  inputCount: number,
  outputCount: number,
  m: number,
  n: number,
): number {
  const config = {
    numInputs: inputCount,
    numOutputs: outputCount,
    m,
    n,
  };

  switch (addressType) {
    case P2SH:
      return estimateMultisigP2SHTransactionVSize(config);
    case P2SH_P2WSH:
      return estimateMultisigP2SH_P2WSHTransactionVSize(config);
    case P2WSH:
      return estimateMultisigP2WSHTransactionVSize(config);
    default:
      throw new Error("Unsupported address type");
  }
}

/**
 * Creates an output script for a given Bitcoin address.
 *
 * This function validates the provided address and creates an appropriate
 * output script based on the address type (P2PKH, P2SH, P2WPKH, or P2WSH).
 * It supports both mainnet and testnet addresses.
 *
 * @param {string} destinationAddress - The Bitcoin address to create an output script for.
 * @param {Network} network - The Bitcoin network (mainnet or testnet) the address belongs to.
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
  const bitcoinJsNetwork =
    network === Network.TESTNET ? networks.testnet : networks.bitcoin;

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

      throw new Error("Unsupported address type");
    } catch (segwitError) {
      throw new Error(`Invalid or unsupported address: ${destinationAddress}`);
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
      total = total.plus(parseNonWitnessUtxoValue(nonWitnessUtxo, i, psbt));
    } else {
      console.log("check UTXO", witnessUtxo, nonWitnessUtxo);
      console.warn(`No UTXO data found for input at index ${i}`);
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
export function parseWitnessUtxoValue(utxo: string, index: number): BigNumber {
  try {
    const valueHex = utxo.slice(0, 16);
    const valueReversed = Buffer.from(valueHex, "hex").reverse();
    const value = new BigNumber(valueReversed.toString("hex"), 16);
    return value;
  } catch (error) {
    console.warn(`Failed to parse witness UTXO at index ${index}:`, error);
    return new BigNumber(0);
  }
}

/**
 * Parses the value of a non-witness UTXO.
 *
 * Non-witness UTXOs require parsing the raw transaction hex to retrieve the
 * correct output value based on the output index specified in the PSBT. This
 * function handles that parsing and conversion.
 *
 * @param rawTx - The raw transaction hex string.
 * @param index - The index of the non-witness UTXO in the PSBT input list.
 * @param psbt - The PsbtV2 instance representing the partially signed Bitcoin transaction.
 * @returns The parsed value as a BigNumber.
 */
export function parseNonWitnessUtxoValue(
  rawTx: string,
  index: number,
  psbt: PsbtV2,
): BigNumber {
  try {
    const psbtInstance = psbt;
    const tx = Transaction.fromHex(rawTx);
    const outputIndex = psbtInstance.PSBT_IN_OUTPUT_INDEX[index];
    if (outputIndex === undefined) {
      throw new Error(
        `Output index for non-witness UTXO at index ${index} is undefined`,
      );
    }
    const output = tx.outs[outputIndex];
    return new BigNumber(output.value);
  } catch (error) {
    console.warn(`Failed to parse non-witness UTXO at index ${index}:`, error);
    return new BigNumber(0);
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
  return psbt.PSBT_OUT_AMOUNT.reduce(
    (sum, amount) => sum.plus(new BigNumber(amount.toString())),
    new BigNumber(0),
  );
}

/**
 * Initializes a PSBT instance from various input formats.
 *
 * This function attempts to create a PsbtV2 instance from the input, whether it is
 * already a PsbtV2 instance, a hex string, or a Buffer. It also tries to handle
 * PSBT V0 format if the input is not recognized as a V2 format.
 *
 * @param psbt - The input PSBT which can be a PsbtV2 instance, a hex string, or a Buffer.
 * @returns The initialized PsbtV2 instance.
 * @throws Error if the input format is not recognized as either V2 or V0.
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

// Base Error class
export class TransactionError<
  T extends ErrorType,
  S extends TransactionState,
> extends Error {
  constructor(
    public type: T,
    public state: S,
    message?: string,
  ) {
    super(message || getDefaultErrorMessage(type, state));
    this.name = "TransactionError";
  }
}

export function getDefaultErrorMessage<
  T extends ErrorType,
  S extends TransactionState,
>(type: T, state: S): ErrorMessage<T, S> {
  switch (type) {
    // Base error types
    case BaseErrorType.INVALID_STATE:
      return `Invalid state: ${state}. Expected a different state.` as ErrorMessage<
        T,
        S
      >;
    case BaseErrorType.INSUFFICIENT_FUNDS:
      return "Insufficient funds to cover the required amount" as ErrorMessage<
        T,
        S
      >;
    case BaseErrorType.DUST_OUTPUT:
      return "Operation would result in a dust output" as ErrorMessage<T, S>;
    case BaseErrorType.INVALID_FEE_RATE:
      return "Invalid fee rate specified" as ErrorMessage<T, S>;
    case BaseErrorType.PSBT_MODIFICATION_ERROR:
      return "Error modifying the PSBT" as ErrorMessage<T, S>;
    case BaseErrorType.INVALID_TRANSACTION:
      return "The transaction is invalid or malformed" as ErrorMessage<T, S>;
    case BaseErrorType.UNSUPPORTED_OPERATION:
      return "This operation is not supported in the current context" as ErrorMessage<
        T,
        S
      >;

    // RBF error types
    case RbfErrorType.ACCELERATION_FAILED:
      return "Failed to accelerate the transaction" as ErrorMessage<T, S>;
    case RbfErrorType.CANCELLATION_FAILED:
      return "Failed to cancel the transaction" as ErrorMessage<T, S>;

    // CPFP error types
    case CpfpErrorType.PARENT_TX_INVALID:
      return "The parent transaction is invalid" as ErrorMessage<T, S>;
    case CpfpErrorType.CHILD_TX_CREATION_FAILED:
      return "Failed to create the child transaction" as ErrorMessage<T, S>;

    default:
      return "An unknown error occurred" as ErrorMessage<T, S>;
  }
}
