import BigNumber from "bignumber.js";
import { AxiosBasicCredentials } from "axios";

/**
 * Interface representing an Unspent Transaction Output (UTXO)
 */
export interface UTXO {
  txid: string;
  vout: number;
  value: number;
  status: {
    confirmed: boolean;
    block_time: number;
  };
}

/**
 * Interface representing a Bitcoin transaction
 */
export interface Transaction {
  txid: string;
  vin: Input[];
  vout: Output[];
  size: number;
  weight: number;
  fee: number;
  isSend: boolean;
  amount: number;
  block_time: number;
}

/**
 * Interface for transaction input details
 */
interface Input {
  prevTxId: string;
  vout: number;
  sequence: number;
}

/**
 * Interface for transaction output details
 */
interface Output {
  scriptPubkeyHex: string;
  scriptPubkeyAddress: string;
  value: number;
}

/**
 * Interface representing fee rate percentiles
 */
export interface FeeRatePercentile {
  avgHeight: number;
  timestamp: number;
  avgFee_0: number;
  avgFee_10: number;
  avgFee_25: number;
  avgFee_50: number;
  avgFee_75: number;
  avgFee_90: number;
  avgFee_100: number;
}

/**
 * Interface representing raw transaction input
 */
interface RawTxInput {
  txid: string;
  vout: number;
  sequence: number;
  scriptSig?: string;
  witness?: string[];
  prevout?: {
    scriptpubkey: string;
    scriptpubkey_asm: string;
    scriptpubkey_type: string;
    scriptpubkey_address: string;
    value: number;
  };
}

/**
 * Interface representing raw transaction output
 */
interface RawTxOutput {
  value: number;
  scriptpubkey: string;
  scriptpubkey_asm?: string;
  scriptpubkey_type?: string;
  scriptpubkey_address?: string;
}

/**
 * Interface representing raw transaction status
 */
interface RawTxStatus {
  confirmed: boolean;
  block_height?: number;
  block_hash?: string;
  block_time?: number;
}

/**
 * Interface representing raw transaction data
 */
export interface RawTransactionData {
  txid: string;
  version: number;
  locktime: number;
  vin: RawTxInput[];
  vout: RawTxOutput[];
  size: number;
  weight: number;
  fee: number;
  status?: RawTxStatus; 
  confirmations?: number;
  blockhash?: string;
  blocktime?: number;
  hex?: string;
}

/**
 * Interface for transaction details
 */
export interface TransactionDetails {
  txid: string;
  version: number;
  locktime: number;
  vin: Array<{ txid: string; vout: number; sequence: number }>;
  vout: Array<{ value: number; scriptPubkey: string; scriptPubkeyAddress?: string }>;
  size: number;
  weight: number;
  fee: number;
  status: {
    confirmed: boolean;
    blockHeight?: number;
    blockHash?: string;
    blockTime?: number;
  };
}

/**
 * Interface representing a transaction from list transactions
 */
export interface ListTransactionsItem {
  involvesWatchonly?: boolean; // Only present if imported addresses were involved
  address: string; // The bitcoin address of the transaction
  category: "send" | "receive" | "generate" | "immature" | "orphan"; // The transaction category
  amount: number; // The amount in BTC
  label?: string; // Optional comment for the address/transaction
  vout: number; // The vout value
  fee?: number; // Only available for 'send' category
  confirmations: number; // Number of confirmations, can be negative
  generated?: boolean; // Only present if transaction only input is coinbase
  trusted?: boolean; // Only present if we consider transaction to be trusted
  blockhash: string; // The block hash containing the transaction
  blockheight?: number; // The block height containing the transaction
  blockindex: number; // The index of the transaction in the block
  blocktime: number; // Block time in UNIX epoch time
  txid: string; // The transaction id
  walletconflicts: string[]; // Conflicting transaction ids
  time: number; // Transaction time in UNIX epoch time
  timereceived: number; // Time received in UNIX epoch time
  comment?: string; // Optional comment associated with the transaction
  "bip125-replaceable": "yes" | "no" | "unknown"; // Replace-by-fee status
  abandoned?: boolean; // Only available for 'send' category
}

/**
 * Interface for Bitcoin node wallet parameters
 */
export interface BitcoindWalletParams {
  baseUrl: string;
  walletName?: string;
  auth: { username: string; password: string };
  method: string;
  params?: any[] | Record<string, any>;
}

/**
 * Interface for the RPC request parameters
 */
export interface RPCRequest {
  jsonrpc: string;
  id: number;
  method: string;
  params: unknown[];
}

/**
 * Interface for RPC response structure
 */
export interface RPCResponse<T = unknown> {
  result: T;
  error?: { code: number; message: string };
  id: number;
}

/**
 * Base parameters for interacting with Bitcoin node
 */
export interface BaseBitcoindArgs {
  url: string;
  auth: AxiosBasicCredentials;
}

/**
 * Interface for Bitcoin node parameters
 */
export interface BitcoindParams {
  url: string;
  auth: { username: string; password: string };
  walletName?: string;
}

/**
 * Interface for unspent output details
 */
export interface UnspentOutput {
  confirmed: boolean;
  txid: string;
  index: number;
  amount: string;
  amountSats: string;
  transactionHex: string;
  time: number;
}

/**
 * Interface for importing Bitcoin address descriptors
 */
export interface ImportDescriptor {
  scriptPubKey: { address: string };
  label?: string;
  timestamp: number;
}

/**
 * Interface for listing unspent transactions
 */
export interface ListUnspentResponse {
  txid: string;
  vout: number;
  address: string;
  label?: string;
  scriptPubKey: string;
  amount: number;
  confirmations: number;
  spendable: boolean;
  solvable: boolean;
  safe: boolean;
}

/**
 * Interface for a transaction response from the node
 */
export interface TransactionResponse {
  amount: number;
  fee: number;
  confirmations: number;
  blockhash: string;
  blockindex: number;
  blocktime: number;
  txid: string;
  time: number;
  timereceived: number;
  hex: string;
}

/**
 * Interface for the import multi-response from Bitcoin node
 */
export interface ImportMultiResponse {
  success: boolean;
  warnings?: string[];
  error?: string;
}

// Used in block_explorer.ts

/**
 * Interface for the block explorer API response format for UTXOs
 */
export interface BlockExplorerUTXOResponse {
  txid: string;
  vout: number;
  value: number;
  status: { confirmed: boolean; block_time: number };
}

/**
 * Interface for block explorer API response for address data
 */
export interface BlockExplorerAddressResponse {
  chain_stats: { funded_txo_count: number };
  mempool_stats: { funded_txo_count: number };
}

/**
 * Interface for formatted UTXO data
 */
export interface FormattedUTXO {
  confirmed: boolean;
  txid: string;
  index: number;
  amount: string;
  amountSats: BigNumber;
  transactionHex: string;
  time: number;
}

/**
 * Constants for client types
 */
export const BLOCK_EXPLORER = "public" as const;
export const BITCOIND = "private" as const;

/**
 * Type representing the client type
 */
export type ClientType = typeof BLOCK_EXPLORER | typeof BITCOIND;

/**
 * Interface for client configuration
 */
export interface ClientConfig {
  type: ClientType;
  url?: string;
  username?: string;
  password?: string;
  walletName?: string;
}

/**
 * Interface for UTXO updates response
 */
export interface UTXOUpdates {
  utxos: UTXO[];
  balanceSats: BigNumber;
  fetchedUTXOs: boolean;
  fetchUTXOsError: string;
  addressKnown?: boolean;
}

/**
 * Subset of ListUnspentResponse with specific fields required by the bitcoindListUnspent function.
 */
export interface ListUnspentResponseSubset
  extends Pick<ListUnspentResponse, "txid" | "amount" | "confirmations" | "vout"> {}
