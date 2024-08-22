import {
  estimateMultisigP2SHTransactionVSize,
  estimateMultisigP2SH_P2WSHTransactionVSize,
  estimateMultisigP2WSHTransactionVSize,
  Network,
  networkData,
  validateAddress,
} from "@caravan/bitcoin";
import {
  payments,
  address as bitcoinAddress,
  networks,
} from "bitcoinjs-lib-v6";

import { Satoshis, BTC } from "./types";

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
 * Attempts to derive the address from an output script.
 * @param {Buffer} script - The output script
 * @param {Network} network - The Bitcoin network (e.g., mainnet, testnet) to use for address derivation.
 * @returns {string} The derived address or an error message if unable to derive
 * @protected
 */
export function getOutputAddress(script: Buffer, network: Network): string {
  try {
    const p2pkhAddress = payments.p2pkh({
      output: script,
      network: networkData(network),
    }).address;
    const p2shAddress = payments.p2sh({
      output: script,
      network: networkData(network),
    }).address;
    const p2wpkhAddress = payments.p2wpkh({
      output: script,
      network: networkData(network),
    }).address;
    const p2wshAddress = payments.p2wsh({
      output: script,
      network: networkData(network),
    }).address;

    return (
      p2pkhAddress ||
      p2shAddress ||
      p2wpkhAddress ||
      p2wshAddress ||
      "Unable to derive address"
    );
  } catch (e) {
    return "Unable to derive address";
  }
}

/**
 * Estimates the virtual size (vsize) of a Multisig transaction.
 *
 * This function can be called with or without a configuration object. If no configuration
 * is provided, it will use the following defaults:
 *   - addressType: 'P2SH'
 *   - numInputs: 1
 *   - numOutputs: 1
 *   - m: 1 (required signatures for multisig)
 *   - n: 2 (total possible signers for multisig)
 *
 * @param config - An optional object containing the following properties:
 *   - addressType: The type of address used in the transaction (e.g., 'P2SH', 'P2SH_P2WSH', 'P2WSH').
 *   - numInputs: The number of inputs in the child transaction.
 *   - numOutputs: The number of outputs in the child transaction.
 *   - m: The number of required signatures in a multisig transaction.
 *   - n: The total number of possible signers in a multisig transaction.
 *
 * @returns The estimated virtual size (vsize) of the CPFP transaction in bytes.
 *
 * @throws Will throw an error if the address type is unsupported.
 */
export function estimateTransactionVsize(
  config: {
    addressType?: string;
    numInputs?: number;
    numOutputs?: number;
    m?: number;
    n?: number;
  } = {},
): number {
  const {
    addressType = "P2SH",
    numInputs = 1,
    numOutputs = 1,
    m = 1,
    n = 2,
  } = config;

  switch (addressType) {
    case "P2SH":
      return estimateMultisigP2SHTransactionVSize({
        ...config,
        numInputs,
        numOutputs,
        m,
        n,
      });
    case "P2SH_P2WSH":
      return estimateMultisigP2SH_P2WSHTransactionVSize({
        ...config,
        numInputs,
        numOutputs,
        m,
        n,
      });
    case "P2WSH":
      return estimateMultisigP2WSHTransactionVSize({
        ...config,
        numInputs,
        numOutputs,
        m,
        n,
      });
    default:
      throw new Error("Unsupported address type for CPFP");
  }
}

export const satoshisToBTC = (sats: Satoshis): BTC => sats / 1e8;
export const btcToSatoshis = (btc: BTC): Satoshis => Math.round(btc * 1e8);
