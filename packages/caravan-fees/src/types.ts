import { Network } from "@caravan/bitcoin";
import {
  BtcTxInputTemplate,
  BtcTxOutputTemplate,
} from "./btcTransactionComponents";

/**
 * Represents an Unspent Transaction Output (UTXO).
 * UTXOs are used as inputs for new transactions and are crucial for fee bumping operations.
 */
export interface UTXO {
  /**
   * The transaction ID of the UTXO.
   * This is the unique identifier of the transaction that created this output.
   */
  txid: string;

  /**
   * The output index of the UTXO in its parent transaction.
   * This, combined with the txid, uniquely identifies the UTXO.
   */
  vout: number;

  /**
   * The value of the UTXO in satoshis.
   * This represents the amount of bitcoin contained in this output.
   */
  value: Satoshis;

  /**
   * The locking script of the UTXO.
   * This script defines the conditions that must be met to spend this output.
   */
  script: Buffer;
  /**
   * The hexadecimal representation of the previous transaction.
   * This is used to reconstruct the complete input data for spending the UTXO.
   * This field is optional and may be provided to facilitate operations that require
   * knowledge of the previous transaction's structure.
   */
  prevTxHex?: string;

  /**
   * The sequence number of the UTXO input.
   * This is used to control the conditions under which the UTXO can be spent.
   * For example, it may be used for replace-by-fee (RBF) functionality.
   * This field is optional and may be included if sequence number management is needed.
   */
  sequence?: number;
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
  addressType: string;

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
  scriptType: string;

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
  requiredSigners?: number;

  /**
   * The total number of signers in a multisig setup.
   * This is used along with requiredSigners for multisig transactions.
   */
  totalSigners?: number;
}

export enum ScriptType {
  P2PKH = "p2pkh",
  P2SH = "p2sh",
  P2WPKH = "p2wpkh",
  P2WSH = "p2wsh",
  P2SH_P2WPKH = "p2sh-p2wpkh",
  P2SH_P2WSH = "p2sh-p2wsh",
  UNKNOWN = "unknown",
}