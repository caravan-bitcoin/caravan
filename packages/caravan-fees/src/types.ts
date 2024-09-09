import { Network } from "@caravan/bitcoin";
import {
  BtcTxInputTemplate,
  BtcTxOutputTemplate,
} from "./btcTransactionComponents";
import { MULTISIG_ADDRESS_TYPES } from "@caravan/bitcoin";

/**
 * Represents an Unspent Transaction Output (UTXO) with essential information for PSBT creation.
 *
 * @see https://github.com/bitcoin/bips/blob/master/bip-0174.mediawiki
 */
export interface UTXO {
  /** The transaction ID of the UTXO in reversed hex format (big-endian). */
  txid: string;

  /** The output index of the UTXO in its parent transaction. */
  vout: number;

  /** The value of the UTXO in satoshis. */
  value: Satoshis;

  /**
   * The full previous transaction in hexadecimal format.
   * Required for non-segwit inputs in PSBTs.
   */
  prevTxHex?: string;

  /**
   * The witness UTXO information for segwit transactions.
   * Required for segwit inputs in PSBTs.
   */
  witnessUtxo?: {
    script: Buffer;
    value: number;
  };
}

/**
 * Configuration options for the TransactionAnalyzer.
 */
export interface AnalyzerOptions {
  /**
   * The Bitcoin network to use (mainnet, testnet, or regtest).
   */
  network: Network;

  /**
   * The target fee rate in satoshis per vbyte that the user wants to achieve.
   * This is used to determine if fee bumping is necessary and to calculate
   * the new fee for RBF or CPFP.
   */
  targetFeeRate: number;

  /**
   * The absolute fee of the original transaction in satoshis.
   * This is used as the basis for fee calculations and comparisons.
   */
  absoluteFee: string | number;

  /**
   * An array of Unspent Transaction Outputs (UTXOs) that are available
   * for fee bumping. These are potential inputs that can be added to
   * a replacement transaction in RBF, or used to create a child transaction
   * in CPFP.
   */
  availableUtxos: UTXO[];

  /**
   * The index of the change output in the transaction, if known.
   * This helps identify which output is the change and can be
   * adjusted for fee bumping in RBF scenarios.
   */
  changeOutputIndex?: number;

  /**
   * The incremental relay fee in satoshis per vbyte. This is the minimum
   * fee rate increase required for nodes to accept a replacement transaction.
   * It's used in RBF calculations to ensure the new transaction meets
   * network requirements.
   * Default value in Bitcoin Core is 1 sat/vbyte.
   * @see https://github.com/bitcoin/bitcoin/blob/master/src/policy/fees.h
   */
  incrementalRelayFee?: string | number;

  /**
   * The number of signatures required in a multisig setup.
   * This is used to estimate transaction size more accurately
   * for multisig transactions.
   */
  requiredSigners: number;

  /**
   * The total number of signers in a multisig setup.
   * This is used along with requiredSigners to estimate
   * transaction size more accurately for multisig transactions.
   */
  totalSigners: number;

  /**
   * The type of Bitcoin address used (e.g., P2PKH, P2SH, P2WPKH, P2WSH).
   * This is used to determine the input size for different address types
   * when estimating transaction size.
   */
  addressType: ScriptType;

  /**
   * The hexadecimal representation of the raw transaction.
   * This is used for parsing the transaction details directly
   * from the hex .
   */
  txHex: string;
}

/**
 * Enum representing different fee bumping strategies.
 * These strategies are used to increase the fee of a transaction to improve its chances of confirmation.
 */
export enum FeeBumpStrategy {
  /**
   * Replace-By-Fee (RBF) strategy.
   * This involves creating a new transaction that replaces the original one with a higher fee.
   * @see https://github.com/bitcoin/bips/blob/master/bip-0125.mediawiki
   */
  RBF = "RBF",

  /**
   * Child-Pays-for-Parent (CPFP) strategy.
   * This involves creating a new transaction that spends an output of the original transaction,
   * with a high enough fee to incentivize miners to confirm both transactions together.
   * @see https://bitcoinops.org/en/topics/cpfp/
   */
  CPFP = "CPFP",

  /**
   * No fee bumping strategy.
   * This indicates that fee bumping is not necessary or possible for the transaction.
   */
  NONE = "NONE",
}

/**
 * Represents an input in a Bitcoin transaction.
 * Transaction inputs are references to outputs of previous transactions that are being spent.
 */
export interface TransactionInput {
  /**
   * The transaction ID of the previous transaction containing the output being spent.
   */
  txid: string;

  /**
   * The index of the output in the previous transaction that is being spent.
   */
  vout: number;

  /**
   * The sequence number of the input.
   * This is used for relative time locks and signaling RBF.
   * @see https://github.com/bitcoin/bips/blob/master/bip-0068.mediawiki
   * @see https://github.com/bitcoin/bips/blob/master/bip-0125.mediawiki
   */
  sequence: number;

  /**
   * The scriptSig of the input in hexadecimal format.
   * For non-segwit inputs, this contains the unlocking script.
   */
  scriptSig: string;

  /**
   * The witness data for segwit inputs.
   * This is an array of hex strings, each representing a witness element.
   * @see https://github.com/bitcoin/bips/blob/master/bip-0141.mediawiki
   */
  witness: string[];
}

/**
 * Represents an output in a Bitcoin transaction.
 */
export interface TransactionOutput {
  /**
   * The value of the output in satoshis.
   * This is the amount of bitcoin contained in this output.
   */
  value: number;

  /**
   * The scriptPubKey in hexadecimal format.
   * This script defines the conditions that must be met to spend this output.
   */
  scriptPubKey: string;

  /**
   * The Bitcoin address associated with this output.
   * This is derived from the scriptPubKey and provides a human-readable format.
   */
  address: string;

  /**
   * Indicates whether this output is spendable by the user.
   *
   * This is crucial for CPFP (Child-Pays-for-Parent) operations:
   * - If true, this output can be used as an input in a child transaction for CPFP.
   * - This includes both change outputs and any other outputs sent to addresses
   *   controlled by the user's wallet.
   *
   * Note: The term "isChange" is replaced with "isSpendable" to more accurately
   * reflect its purpose in CPFP scenarios.
   */
  isSpendable: boolean;
}

/**
 * Represents a fee rate in satoshis per virtual byte.
 * This is used for fee estimation and fee bumping calculations.
 * @see https://bitcoinops.org/en/topics/fee-estimation/
 */
export type FeeRateSatsPerVByte = number;

/**
 * Represents an amount in satoshis.
 * Satoshis are the smallest unit of bitcoin (1 BTC = 100,000,000 satoshis).
 */
export type Satoshis = string;

/**
 * Represents an amount in bitcoin.
 */
export type BTC = string;

/**
 * Configuration options for creating a transaction template.
 * This is used to set up the initial state and parameters for a new transaction.
 */
export interface TransactionTemplateOptions {
  /**
   * The target fee rate in satoshis per virtual byte.
   * This is used to calculate the appropriate fee for the transaction.
   */
  targetFeeRate: number;

  /**
   * The dust threshold in satoshis.
   * Outputs below this value are considered uneconomical to spend.
   * @see https://github.com/bitcoin/bitcoin/blob/master/src/policy/policy.cpp
   */
  dustThreshold?: Satoshis;

  /**
   * The Bitcoin network to use (mainnet, testnet, or regtest).
   */
  network: Network;

  /**
   * The type of script used for the transaction (e.g., "p2pkh", "p2sh", "p2wpkh", "p2wsh").
   * This affects how the transaction is constructed and signed.
   */
  scriptType: ScriptType;

  /**
   * Optional array of input templates to use in the transaction.
   */
  inputs?: BtcTxInputTemplate[];

  /**
   * Optional array of output templates to use in the transaction.
   */
  outputs?: BtcTxOutputTemplate[];

  /**
   * The number of signatures required in a multisig setup.
   * This is used for multisig transactions and affects the transaction size.
   */
  requiredSigners: number;

  /**
   * The total number of signers in a multisig setup.
   * This is used along with requiredSigners for multisig transactions.
   */
  totalSigners: number;
}

/**
 * Options for creating a cancel RBF transaction.
 */
export interface CancelRbfOptions {
  /**
   * The hex-encoded original transaction to be replaced.
   */
  originalTx: string;

  /**
   * Array of available UTXOs, including the original transaction's inputs.
   */
  availableInputs: UTXO[];

  /**
   * The address where all funds will be sent in the cancellation transaction.
   */
  cancelAddress: string;

  /**
   * The Bitcoin network being used (e.g., mainnet, testnet).
   */
  network: Network;

  /**
   * The dust threshold in satoshis. Outputs below this value are considered "dust"
   * and may not be economically viable to spend.
   */
  dustThreshold: Satoshis;

  /**
   * The type of script used for the transaction (e.g., P2PKH, P2SH, P2WSH).
   */
  scriptType: ScriptType;

  /**
   * The number of required signers for the multisig setup.
   */
  requiredSigners: number;

  /**
   * The total number of signers in the multisig setup.
   */
  totalSigners: number;

  /**
   * The target fee rate in satoshis per virtual byte. This is used to calculate
   * the appropriate fee for the transaction.
   */
  targetFeeRate: FeeRateSatsPerVByte;

  /**
   * The absolute fee of the original transaction in satoshis.
   */
  absoluteFee: Satoshis;

  /**
   * Whether to attempt full RBF even if the transaction doesn't signal it.
   * @default false
   */
  fullRBF?: boolean;

  /**
   * If true, enforces stricter validation rules.
   * @default false
   */
  strict?: boolean;
}

/**
 * Options for creating an accelerated RBF transaction.
 */
export interface AcceleratedRbfOptions
  extends Omit<CancelRbfOptions, "cancelAddress"> {
  /**
   * The index of the change output in the original transaction.
   */
  changeIndex?: number;

  /**
   * The address to use for the new change output, if different from the original.
   */
  changeAddress?: string;
}

/**
 * Options for creating a CPFP transaction.
 */
export interface CPFPOptions {
  /**
   * The hex-encoded original (parent) transaction to be accelerated.
   */
  originalTx: string;

  /**
   * Array of available UTXOs, including the spendable output from the parent transaction.
   */
  availableInputs: UTXO[];

  /**
   * The index of the output in the parent transaction that will be spent in the child transaction.
   */
  spendableOutputIndex: number;

  /**
   * The address where any excess funds (change) will be sent in the child transaction.
   */
  changeAddress: string;

  /**
   * The Bitcoin network being used (e.g., mainnet, testnet).
   */
  network: Network;

  /**
   * The dust threshold in satoshis. Outputs below this value are considered "dust".
   */
  dustThreshold: Satoshis;

  /**
   * The type of script used for the transaction (e.g., P2PKH, P2SH, P2WSH).
   */
  scriptType: ScriptType;

  /**
   * The target fee rate in satoshis per virtual byte. This is used to calculate
   * the appropriate fee for the transaction.
   */
  targetFeeRate: FeeRateSatsPerVByte;

  /**
   * The absolute fee of the original transaction in satoshis.
   */
  absoluteFee: Satoshis;

  /**
   * The number of required signers for the multisig setup.
   */
  requiredSigners: number;

  /**
   * The total number of signers in the multisig setup.
   */
  totalSigners: number;

  /**
   * If true, enforces stricter validation rules.
   * @default false
   */
  strict?: boolean;
}

/**
 * Comprehensive object containing all supported Bitcoin script types.
 * This includes multisig address types from Caravan and additional types.
 *
 * @readonly
 * @enum {string}
 */
export const SCRIPT_TYPES = {
  /** Pay to Public Key Hash */
  P2PKH: "P2PKH",
  /** Pay to Witness Public Key Hash (Native SegWit) */
  P2WPKH: "P2WPKH",
  /** Pay to Script Hash wrapping a Pay to Witness Public Key Hash (Nested SegWit) */
  P2SH_P2WPKH: "P2SH_P2WPKH",
  /** Unknown or unsupported script type */
  UNKNOWN: "UNKNOWN",
  /** Pay to Script Hash */
  P2SH: MULTISIG_ADDRESS_TYPES.P2SH as "P2SH",
  /** Pay to Script Hash wrapping a Pay to Witness Script Hash */
  P2SH_P2WSH: MULTISIG_ADDRESS_TYPES.P2SH_P2WSH as "P2SH-P2WSH",
  /** Pay to Witness Script Hash (Native SegWit for scripts) */
  P2WSH: MULTISIG_ADDRESS_TYPES.P2WSH as "P2WSH",
} as const;

/**
 * Union type representing all possible Bitcoin script types.
 * This type can be used for type checking and autocompletion in functions
 * that deal with different Bitcoin address formats.
 *
 * @typedef {typeof SCRIPT_TYPES[keyof typeof SCRIPT_TYPES]} ScriptType
 */
export type ScriptType = (typeof SCRIPT_TYPES)[keyof typeof SCRIPT_TYPES];
