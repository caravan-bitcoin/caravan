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
  weight: number;
  fee: number;
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
  weight: number;
  fee: number;
  status: {
    confirmed: boolean;
    blockHeight?: number;
    blockHash?: string;
    blockTime?: number;
  };
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
