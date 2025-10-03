import { AxiosBasicCredentials } from "axios";
import { BigNumber } from "bignumber.js";

export interface UTXO {
  txid: string;
  vout: number;
  value: number;
  status: {
    confirmed: boolean;
    block_time: number;
  };
}

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

interface Input {
  prevTxId: string;
  vout: number;
  sequence: number;
}

interface Output {
  scriptPubkeyHex: string;
  scriptPubkeyAddress: string;
  value: number;
}

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

interface RawTxOutput {
  value: number;
  scriptpubkey: string;
  scriptpubkey_asm?: string;
  scriptpubkey_type?: string;
  scriptpubkey_address?: string;
}

interface RawTxStatus {
  confirmed: boolean;
  block_height?: number;
  block_hash?: string;
  block_time?: number;
}

export interface RawTransactionData {
  txid: string;
  version: number;
  locktime: number;
  vin: RawTxInput[];
  vout: RawTxOutput[];
  size: number;
  vsize?: number;
  weight: number;
  fee: number;
  amount?: number;
  details?: {
    address: string;
    category:
      | "send"
      | "receive"
      | "generate"
      | "immature"
      | "orphan"
      | "unknown";
    amount: number; // Amount (negative for outgoing)
    vout: number; // Output index
    fee?: number; // Fee amount (if category is "send")
    abandoned?: boolean; // If the transaction was abandoned
    label?: string; // Address label if any
  }[];
  category?:
    | "send"
    | "receive"
    | "generate"
    | "immature"
    | "orphan"
    | "unknown";
  status?: RawTxStatus; // Optional for private node
  // Additional fields for private node
  confirmations?: number;
  blockhash?: string;
  blocktime?: number;
  hex?: string;
}

export interface TransactionDetails {
  txid: string;
  version: number;
  locktime: number;
  vin: Array<{
    txid: string;
    vout: number;
    sequence: number;
  }>;
  vout: Array<{
    value: number;
    scriptPubkey: string;
    scriptPubkeyAddress?: string;
  }>;
  size: number;
  vsize?: number;
  weight: number;
  fee: number;
  status: {
    confirmed: boolean;
    blockHeight?: number;
    blockHash?: string;
    blockTime?: number;
  };
  isReceived?: boolean;
}

export interface WalletTransactionDetails extends TransactionDetails {
  amount?: number;
  confirmations?: number;
  category?: string;
  address?: string;
  abandoned?: boolean;
  time?: number;
}

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

export interface BitcoindWalletParams<T> {
  baseUrl: string; // Base URL of the Bitcoin node
  walletName?: string; // Optional wallet name for multi-wallet setups
  auth: {
    // Auth credentials for the node
    username: string;
    password: string;
  };
  method: string; // RPC method to call
  params?: unknown[]; // Support both array and object params

  responseType?: T;
}

// Used in bitcoind.ts

/**
 * Interface for the RPC request parameters
 */
export interface RPCRequest {
  jsonrpc: string;
  id: number;
  method: string;
  params: unknown[]; // using unknown instead of any beacuse forces us to check the type before using it, while any allows unsafe operations without warnings
}

/**
 * Interface for RPC response structure
 */
export interface RPCResponse<T = unknown> {
  result: T;
  error?: {
    code: number;
    message: string;
  };
  id: number;
}

export interface BaseBitcoindArgs {
  url: string;
  auth: AxiosBasicCredentials;
}

export interface BitcoindParams {
  url: string;
  auth: {
    username: string;
    password: string;
  };
  walletName?: string;
}

/**
 * Interface for unspent transaction output details
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

export interface ImportDescriptor {
  scriptPubKey: {
    address: string;
  };
  label?: string;
  timestamp: number;
}

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
  status: {
    confirmed: boolean;
    block_time: number;
  };
}

/**
 * Interface for the block explorer API response for address data
 */
export interface BlockExplorerAddressResponse {
  chain_stats: {
    funded_txo_count: number;
  };
  mempool_stats: {
    funded_txo_count: number;
  };
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

// Used in blockchain.ts
export const BLOCK_EXPLORER = "public" as const;
export const BITCOIND = "private" as const;

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
 * Interface for Bitcoin wallet transaction response
 * @see https://developer.bitcoin.org/reference/rpc/gettransaction.html
 */
export interface WalletTransactionResponse {
  amount: number; // The total amount (negative for outgoing transactions)
  fee: number; // The fee amount (negative for outgoing transactions)
  confirmations: number; // Number of confirmations
  blockhash?: string; // The block hash containing the transaction
  blockheight?: number; // The block height containing the transaction
  blockindex?: number; // Position of tx in the block
  blocktime?: number; // Block time in UNIX epoch time
  txid: string; // The transaction ID
  wtxid?: string; // The witness transaction ID
  walletconflicts: string[]; // Conflicting transaction IDs
  mempoolconflicts?: string[]; // Conflicts in mempool
  time: number; // Transaction time in UNIX epoch time
  timereceived: number; // Time received in UNIX epoch time
  "bip125-replaceable": "yes" | "no" | "unknown"; // Replace-by-fee status

  details: {
    address: string;
    category:
      | "send"
      | "receive"
      | "generate"
      | "immature"
      | "orphan"
      | "unknown";
    amount: number; // Amount (negative for outgoing)
    vout: number; // Output index
    fee?: number; // Fee amount (if category is "send")
    abandoned?: boolean; // If the transaction was abandoned
    label?: string; // Address label if any
  }[];

  hex: string; // Raw transaction data

  decoded?: {
    // Only present when verbose=true
    txid: string;
    hash: string; // Witness transaction hash
    version: number;
    size: number; // Transaction size in bytes
    vsize: number; // Virtual size (for segwit)
    weight: number; // Transaction weight
    locktime: number;

    vin: {
      txid: string; // Input transaction ID
      vout: number; // Referenced output
      scriptSig: {
        asm: string;
        hex: string;
      };
      txinwitness?: string[]; // Witness data (for segwit inputs)
      sequence: number;
    }[];

    vout: {
      value: number; // Output amount in BTC
      n: number; // Output index
      scriptPubKey: {
        asm: string;
        desc?: string; // Output descriptor
        hex: string;
        address?: string; // Bitcoin address
        type: string; // Script type
      };
    }[];
  };
  lastprocessedblock?: {
    // Information about the last processed block
    hash: string;
    height: number;
  };
}

export interface MempoolEntry {
  vsize: number;
  weight: number;
  fee?: number;
  modifiedfee?: number;
  time: number;
  height: number;
  descendantcount: number;
  descendantsize: number;
  ancestorcount: number;
  ancestorsize: number;
  wtxid: string;
  fees: {
    base: number;
    modified: number;
    ancestor: number;
    descendant: number;
  };
  depends: string[];
  spentby: string[];
  "bip125-replaceable": boolean;
  unbroadcast: boolean;
}
