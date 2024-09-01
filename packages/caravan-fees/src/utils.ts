import {
  estimateMultisigP2SHTransactionVSize,
  estimateMultisigP2SH_P2WSHTransactionVSize,
  estimateMultisigP2WSHTransactionVSize,
  Network,
  validateAddress,
} from "@caravan/bitcoin";
import {
  payments,
  address as bitcoinAddress,
  networks,
  Transaction,
  Network as BitcoinJSNetwork,
  script,
} from "bitcoinjs-lib-v6";
import { UTXO, ScriptType } from "./types";
import {
  BtcTxInputTemplate,
  BtcTxOutputTemplate,
} from "./btcTransactionComponents";
import { PsbtV2 } from "@caravan/psbt";
import BigNumber from "bignumber.js";

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
  const bitcoinjsNetwork = mapCaravanNetworkToBitcoinJS(network);

  try {
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
    // Try P2PKH as a fallback
    const p2pkhAddress = payments.p2pkh({
      output: script,
      network: bitcoinjsNetwork,
    }).address;
    if (p2pkhAddress) return p2pkhAddress;

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

  // Convert addressType to uppercase for case-insensitive comparison
  const normalizedAddressType = addressType.toUpperCase();

  switch (normalizedAddressType) {
    case "P2SH":
      return estimateMultisigP2SHTransactionVSize({
        numInputs,
        numOutputs,
        m,
        n,
      });
    case "P2SH-P2WSH":
    case "P2SH_P2WSH":
      return estimateMultisigP2SH_P2WSHTransactionVSize({
        numInputs,
        numOutputs,
        m,
        n,
      });
    case "P2WSH":
      return estimateMultisigP2WSHTransactionVSize({
        numInputs,
        numOutputs,
        m,
        n,
      });
    case "P2WPKH":
      return estimateP2WSHMultisigTransactionVSize({
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
 * Estimates the virtual size (vsize) of a P2WSH (Pay-to-Witness-Script-Hash) multisig transaction.
 *
 * P2WSH is a native SegWit format for complex scripts, including multisig. It separates
 * the transaction into witness and non-witness data, providing efficiency benefits.
 *
 * Calculation breakdown:
 * 1. Base size (non-witness data):
 *    - Version: 4 bytes
 *    - Input count: 1 byte (var_int)
 *    - Inputs: numInputs * (36 bytes outpoint + 1 byte empty scriptSig + 4 bytes sequence)
 *    - Output count: 1 byte (var_int)
 *    - Outputs: numOutputs * (8 bytes amount + 1 byte script length + 34 bytes scriptPubKey)
 *    - Locktime: 4 bytes
 *
 * 2. Witness data:
 *    - Marker and flag: 2 bytes
 *    - For each input:
 *      - Number of witness items: 1 byte (var_int)
 *      - OP_0: 1 byte
 *      - Signatures: m * ~72 bytes (assuming max size signatures)
 *      - Witness script: 35 + (n * 34) bytes
 *        (1 byte OP_m + n * 34 bytes for pubkeys + 1 byte OP_n + 1 byte OP_CHECKMULTISIG)
 *
 * 3. Total size = Base size + Witness data size
 * 4. Weight = (Base size * 3) + Total size
 * 5. Virtual size (vsize) = (Weight + 3) / 4 (rounded down)
 *
 * @param config - Configuration object
 * @param config.numInputs - Number of inputs in the transaction
 * @param config.numOutputs - Number of outputs in the transaction
 * @param config.m - Number of required signatures (M in M-of-N multisig)
 * @param config.n - Total number of possible signers (N in M-of-N multisig)
 *
 * @returns The estimated virtual size (vsize) of the P2WSH multisig transaction in vbytes
 */
export function estimateP2WSHMultisigTransactionVSize(config: {
  numInputs: number;
  numOutputs: number;
  m: number;
  n: number;
}): number {
  const { numInputs, numOutputs, m, n } = config;

  // Base size calculation
  const baseSize =
    4 + // Version
    1 + // Input count
    numInputs * (36 + 1 + 4) + // Inputs (outpoint + empty scriptSig + sequence)
    1 + // Output count
    numOutputs * (8 + 1 + 34) + // Outputs (amount + script length + P2WSH scriptPubKey)
    4; // Locktime

  // Witness size calculation
  const witnessSize =
    2 + // Marker and flag
    numInputs *
      (1 + // Number of witness items
        1 + // OP_0
        m * 72 + // m signatures (assuming max size of 72 bytes each)
        (35 + n * 34)); // Witness script (1 OP_m + n * 34 pubkey + 1 OP_n + 1 OP_CHECKMULTISIG)

  const totalSize = baseSize + witnessSize;
  const weight = baseSize * 3 + totalSize;
  const vsize = Math.floor((weight + 3) / 4); // Round down

  return vsize;
}

export const satoshisToBTC = (sats: string): string => {
  return new BigNumber(sats).dividedBy(1e8).toString();
};

export const btcToSatoshis = (btc: string): string => {
  return new BigNumber(btc)
    .multipliedBy(1e8)
    .integerValue(BigNumber.ROUND_DOWN)
    .toString();
};

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
      total = total.plus(parseNonWitnessUtxoValue(nonWitnessUtxo, i, psbt));
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
export function parseWitnessUtxoValue(utxo: string, index: number): BigNumber {
  try {
    const buffer = Buffer.from(utxo, "hex");
    const value = buffer.readUInt32LE(0) + buffer.readUInt32LE(4) * 0x100000000;
    return new BigNumber(value);
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
    const tx = Transaction.fromHex(rawTx);
    const outputIndex = psbt.PSBT_IN_OUTPUT_INDEX[index];
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
 * Estimates the virtual size (vsize) of a transaction represented by a PsbtV2 object.
 *
 * This function provides a comprehensive estimation of the transaction's vsize,
 * which is crucial for fee calculation in Bitcoin transactions. It supports
 * various output types including P2PKH, P2SH, P2WPKH, and P2WSH, as well as
 * their nested variants (e.g., P2SH-P2WPKH, P2SH-P2WSH).
 *
 * The estimation takes into account:
 * - Transaction version (4 bytes)
 * - Input and output counts (1-9 bytes each, depending on the count)
 * - Input details (outpoints, scriptSigs, witnesses)
 * - Output details (value and scriptPubKey)
 * - Locktime (4 bytes)
 *
 * For SegWit transactions, it calculates the weight units and converts to vsize.
 *
 * References:
 * - BIP141 (SegWit): https://github.com/bitcoin/bips/blob/master/bip-0141.mediawiki
 * - BIP143 (Transaction Signature Verification for Version 0 Witness Program):
 *   https://github.com/bitcoin/bips/blob/master/bip-0143.mediawiki
 * - Bitcoin Core weight calculation:
 *   https://github.com/bitcoin/bitcoin/blob/master/src/consensus/validation.h
 *
 * @param {PsbtV2} psbt - The PsbtV2 object representing the transaction.
 * @returns {number} The estimated virtual size (vsize) of the transaction in vbytes.
 *
 * @example
 * const psbt = new PsbtV2(...);
 * const estimatedVsize = estimatePSBTvsize(psbt);
 * console.log(`Estimated vsize: ${estimatedVsize} vbytes`);
 */
export function estimatePSBTvsize(psbt: PsbtV2): number {
  let weight = 0;
  let hasWitness = false;

  // Transaction version (4 bytes)
  weight += 4 * 4;

  // Input count
  weight += getVarIntSize(psbt.PSBT_GLOBAL_INPUT_COUNT) * 4;

  // Inputs
  for (let i = 0; i < psbt.PSBT_GLOBAL_INPUT_COUNT; i++) {
    weight += estimateInputWeight(psbt, i);
    if (psbt.PSBT_IN_WITNESS_UTXO[i] || psbt.PSBT_IN_WITNESS_SCRIPT[i]) {
      hasWitness = true;
    }
  }

  // Output count
  weight += getVarIntSize(psbt.PSBT_GLOBAL_OUTPUT_COUNT) * 4;

  // Outputs
  for (let i = 0; i < psbt.PSBT_GLOBAL_OUTPUT_COUNT; i++) {
    weight += estimateOutputWeight(psbt, i);
  }

  // Locktime (4 bytes)
  weight += 4 * 4;

  // If it's a SegWit transaction, add marker and flag (2 bytes)
  if (hasWitness) {
    weight += 2;
  }

  // Convert weight to vsize (rounded up)
  return Math.ceil(weight / 4);
}

/**
 * Estimates the weight of a single input in the transaction.
 *
 * @param {PsbtV2} psbt - The PsbtV2 object.
 * @param {number} inputIndex - The index of the input to estimate.
 * @returns {number} The estimated weight of the input.
 */
function estimateInputWeight(psbt: PsbtV2, inputIndex: number): number {
  let weight = 0;

  // Outpoint (32 bytes txid + 4 bytes vout)
  weight += 36 * 4;

  const witnessUtxo = psbt.PSBT_IN_WITNESS_UTXO[inputIndex];
  const nonWitnessUtxo = psbt.PSBT_IN_NON_WITNESS_UTXO[inputIndex];
  const redeemScript = psbt.PSBT_IN_REDEEM_SCRIPT[inputIndex];
  const witnessScript = psbt.PSBT_IN_WITNESS_SCRIPT[inputIndex];

  if (witnessUtxo) {
    // SegWit input
    weight += 1; // Empty scriptSig length
    weight += 4 * 4; // Sequence

    // Witness items
    if (redeemScript) {
      // P2SH-P2WPKH or P2SH-P2WSH
      weight += estimateWitnessWeight(psbt, inputIndex);
      weight += redeemScript.length * 4; // scriptSig in non-witness data
    } else if (witnessScript) {
      // Native P2WSH
      weight += estimateWitnessWeight(psbt, inputIndex);
    } else {
      // Native P2WPKH
      weight += 1 + 73 + 34; // Witness: (1 byte num items) + (73 bytes sig) + (34 bytes pubkey)
    }
  } else if (nonWitnessUtxo) {
    // Legacy input
    const tx = Transaction.fromHex(nonWitnessUtxo);
    const scriptPubKey = tx.outs[psbt.PSBT_IN_OUTPUT_INDEX[inputIndex]].script;

    if (redeemScript) {
      // P2SH
      weight +=
        (redeemScript.length +
          73 * psbt.PSBT_IN_PARTIAL_SIG[inputIndex].length) *
        4;
    } else {
      // P2PKH
      weight += (scriptPubKey.length + 73 + 34) * 4; // scriptSig: (scriptPubKey + signature + pubkey)
    }
    weight += 4 * 4; // Sequence
  }

  return weight;
}

/**
 * Estimates the weight of the witness data for a SegWit input.
 *
 * @param {PsbtV2} psbt - The PsbtV2 object.
 * @param {number} inputIndex - The index of the input.
 * @returns {number} The estimated weight of the witness data.
 */
function estimateWitnessWeight(psbt: PsbtV2, inputIndex: number): number {
  let weight = 0;
  const witnessScript = psbt.PSBT_IN_WITNESS_SCRIPT[inputIndex];
  const partialSigs = psbt.PSBT_IN_PARTIAL_SIG[inputIndex];

  weight += 1; // Number of witness items

  if (witnessScript) {
    // P2WSH or P2SH-P2WSH
    weight += partialSigs.length * 73; // Signatures
    weight += witnessScript.length;
  } else {
    // P2WPKH or P2SH-P2WPKH
    weight += 73; // Signature
    weight += 34; // Public key
  }

  return weight;
}

/**
 * Estimates the weight of a single output in the transaction.
 *
 * @param {PsbtV2} psbt - The PsbtV2 object.
 * @param {number} outputIndex - The index of the output to estimate.
 * @returns {number} The estimated weight of the output.
 */
function estimateOutputWeight(psbt: PsbtV2, outputIndex: number): number {
  let weight = 0;

  // Output value (8 bytes)
  weight += 8 * 4;

  // scriptPubKey
  const script = Buffer.from(psbt.PSBT_OUT_SCRIPT[outputIndex], "hex");
  weight += getVarIntSize(script.length) * 4; // scriptPubKey length
  weight += script.length * 4; // scriptPubKey

  return weight;
}

/**
 * Calculates the size of a variable integer (varint) based on its value.
 *
 * @param {number} n - The number to encode as a varint.
 * @returns {number} The size of the varint in bytes.
 */
function getVarIntSize(n: number): number {
  if (n < 0xfd) return 1;
  if (n <= 0xffff) return 3;
  if (n <= 0xffffffff) return 5;
  return 9;
}

function reverseBuffer(buffer: Buffer): Buffer {
  const reversed = Buffer.alloc(buffer.length);
  for (let i = 0; i < buffer.length; i++) {
    reversed[i] = buffer[buffer.length - 1 - i];
  }
  return reversed;
}

export function reverseTxid(txid: string): string {
  return reverseBuffer(Buffer.from(txid, "hex")).toString("hex");
}

/**
 * Creates a Partially Signed Bitcoin Transaction (PSBT) from a transaction template and available UTXOs.
 *
 * This function constructs a PSBT by adding inputs and outputs based on the provided transaction template.
 * It handles both witness and non-witness UTXOs, supporting different script types including P2WSH and P2SH-P2WSH.
 *
 * @param {Object} newTxTemplate - The transaction template containing inputs and outputs.
 * @param {ReadonlyArray<BtcTxInputTemplate>} newTxTemplate.inputs - Array of input objects.
 * @param {ReadonlyArray<BtcTxOutputTemplate>} newTxTemplate.outputs - Array of output objects.
 * @param {ReadonlyArray<UTXO>} availableInputs - Array of available UTXOs to be used as inputs.
 * @param {string} scriptType - The type of script being used (e.g., "P2WSH", "P2SH-P2WSH").
 * @param {Network} network - The Bitcoin network object (mainnet, testnet, etc.).
 *
 * @returns {string} The serialized PSBT as a base64 string.
 *
 * @throws {Error} If a UTXO is not found for any input.
 *
 * @see https://github.com/bitcoin/bips/blob/master/bip-0174.mediawiki - BIP 174 (PSBT)
 */
export function createPsbtFromTemplate(
  newTxTemplate: {
    inputs: ReadonlyArray<BtcTxInputTemplate>;
    outputs: ReadonlyArray<BtcTxOutputTemplate>;
  },
  availableInputs: ReadonlyArray<UTXO>,
  scriptType: string,
  network: Network,
): string {
  const psbt = new PsbtV2();

  newTxTemplate.inputs.forEach((input) => {
    const utxo = availableInputs.find(
      (u) => u.txid === input.txid && u.vout === input.vout,
    );
    if (!utxo) {
      throw new Error(`UTXO not found for input: ${input.txid}:${input.vout}`);
    }

    const inputData: any = {
      previousTxId: input.txid,
      outputIndex: input.vout,
      nonWitnessUtxo: utxo.script, // this is wrong :(
    };

    console.log("check utxo", inputData, utxo, utxo.script);

    const lowerScriptType = scriptType.toLowerCase();
    if (lowerScriptType === "p2wsh" || lowerScriptType === "p2sh-p2wsh") {
      inputData.witnessUtxo = {
        script: utxo.script,
        value: new BigNumber(utxo.value),
      };
    }

    psbt.addInput(inputData);
  });

  newTxTemplate.outputs.forEach((output) => {
    psbt.addOutput({
      script: script.fromASM(
        script.toASM(createOutputScript(output.address, network)),
      ),
      amount: parseInt(output.amountSats),
    });
  });

  return psbt.serialize("base64");
}

/**
 * Retrieves the scriptPubKey for a given Bitcoin transaction input.
 *
 * @param input - The BtcTxInputTemplate instance containing txid, vout, and prevTxHex.
 * @returns {Buffer | undefined} - The scriptPubKey as a Buffer, or undefined if it cannot be found.
 * @throws {Error} - Throws an error if prevTxHex is missing or the output cannot be found.
 */
export function getScriptFromUtxo(
  input: BtcTxInputTemplate,
): Buffer | undefined {
  if (!input.hasPrevTxData()) {
    throw new Error(
      `Previous transaction hex is required for input: ${input.txid}:${input.vout}`,
    );
  }

  const transaction = Transaction.fromHex(input.prevTxHex!);
  const output = transaction.outs[input.vout];

  if (!output) {
    throw new Error(
      `Output not found at vout ${input.vout} in transaction ${input.txid}`,
    );
  }

  return output.script;
}

/**
 * Determines the type of Bitcoin script (e.g., P2PKH, P2SH, P2WPKH, P2WSH, P2SH-P2WPKH, P2SH-P2WSH).
 *
 * @param scriptPubKey - The scriptPubKey to analyze.
 * @returns {ScriptType} - The detected script type.
 */
export function getScriptType(scriptPubKey: Buffer): ScriptType {
  try {
    // Check for Pay-to-PubKey-Hash (P2PKH)
    if (payments.p2pkh({ output: scriptPubKey }).output?.equals(scriptPubKey)) {
      return ScriptType.P2PKH;
    }

    // Check for Pay-to-Script-Hash (P2SH)
    if (payments.p2sh({ output: scriptPubKey }).output?.equals(scriptPubKey)) {
      return ScriptType.P2SH;
    }

    // Check for Pay-to-Witness-PubKey-Hash (P2WPKH)
    if (
      payments.p2wpkh({ output: scriptPubKey }).output?.equals(scriptPubKey)
    ) {
      return ScriptType.P2WPKH;
    }

    // Check for Pay-to-Witness-Script-Hash (P2WSH)
    if (payments.p2wsh({ output: scriptPubKey }).output?.equals(scriptPubKey)) {
      return ScriptType.P2WSH;
    }

    // Check for Pay-to-Script-Hash with Pay-to-Witness-PubKey-Hash (P2SH-P2WPKH)

    const p2shP2wpkh = payments.p2sh({
      redeem: payments.p2wpkh({ output: scriptPubKey }),
    });
    if (p2shP2wpkh.output?.equals(scriptPubKey)) {
      return ScriptType.P2SH_P2WPKH;
    }

    // Check for Pay-to-Script-Hash with Pay-to-Witness-Script-Hash (P2SH-P2WSH)

    const p2shP2wsh = payments.p2sh({
      redeem: payments.p2wsh({ output: scriptPubKey }),
    });
    if (p2shP2wsh.output?.equals(scriptPubKey)) {
      return ScriptType.P2SH_P2WSH;
    }

    // If none of the types match, return 'unknown'
    return ScriptType.UNKNOWN;
  } catch (error) {
    console.error(
      `Error determining script type: ${error instanceof Error ? error.message : String(error)}`,
    );
    return ScriptType.UNKNOWN; // Return 'unknown' if there's an error in processing
  }
}

/**
 * Adds an output to the PSBT.
 *
 * @param {PsbtV2} psbt - The PsbtV2 object.
 * @param {BtcTxOutputTemplate} output - The output template to be processed and added.
 * @param {Network} network - The Bitcoin network object.
 * @throws {Error} - Throws an error if output script creation fails.
 */
export function addOutputToPsbt(
  psbt: PsbtV2,
  output: BtcTxOutputTemplate,
  network: Network,
): void {
  const script = createOutputScript(output.address, network);
  if (!script) {
    throw new Error(
      `Unable to create output script for address: ${output.address}`,
    );
  }
  psbt.addOutput({
    script,
    amount: parseInt(output.amountSats),
  });
}

/**
 * Adds a single input to the provided PSBT based on the given input template.
 * @param {PsbtV2} psbt - The PsbtV2 object.
 * @param input - The input template to be processed and added.
 * @throws {Error} - Throws an error if script extraction or PSBT input addition fails.
 */
export function addInputToPsbt(psbt: PsbtV2, input: BtcTxInputTemplate): void {
  const scriptPubKey = getScriptFromUtxo(input);
  if (!scriptPubKey) {
    throw new Error(
      `Unable to extract script from input: ${input.txid}:${input.vout}`,
    );
  }

  const inputData: any = {
    previousTxId: input.txid,
    outputIndex: input.vout,
    nonWitnessUtxo: Buffer.from(input.prevTxHex!, "hex"), // Use prevTxHex directly from input
  };

  const scriptType = getScriptType(scriptPubKey);

  if (scriptType === "p2wsh" || scriptType === "p2sh-p2wsh") {
    inputData.witnessUtxo = {
      script: scriptPubKey,
      value: new BigNumber(input.amountSats),
    };
  }

  psbt.addInput(inputData);
}
