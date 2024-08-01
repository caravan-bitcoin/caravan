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
import { Transaction } from "bitcoinjs-lib-v5";
import BigNumber from "bignumber.js";
import { UTXO, FeeRate } from "./types";
import { payments, address as bitcoinAddress, networks } from "bitcoinjs-lib";

/**
 * Calculate the effective fee rate of a transaction.
 * @param transaction The transaction to analyze
 * @param utxos The UTXOs spent in the transaction
 * @returns The effective fee rate in satoshis per byte
 */
export function calculateEffectiveFeeRate(
  transaction: Transaction,
  utxos: UTXO[],
): FeeRate {
  const totalInput = utxos.reduce(
    (sum, utxo) => sum.plus(utxo.value),
    new BigNumber(0),
  );
  const totalOutput = transaction.outs.reduce(
    (sum, output) => sum.plus(output.value),
    new BigNumber(0),
  );
  const fee = totalInput.minus(totalOutput);
  const feeRate = fee
    .dividedBy(transaction.virtualSize())
    .integerValue(BigNumber.ROUND_CEIL);

  return { satoshisPerByte: feeRate.toNumber() };
}

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
