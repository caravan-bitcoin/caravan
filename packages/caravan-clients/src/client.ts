/* eslint-disable @typescript-eslint/no-explicit-any */
/*
TODO: cleanup the no explicit any. added to quickly type error catches
*/
import { Network, satoshisToBitcoins, sortInputs } from "@caravan/bitcoin";
import axios, { Method } from "axios";
import { BigNumber } from "bignumber.js";

import {
  bitcoindEstimateSmartFee,
  bitcoindParams,
  bitcoindSendRawTransaction,
  isWalletAddressNotFoundError,
  callBitcoind,
  bitcoindRawTxData,
} from "./bitcoind";
import {
  FeeRatePercentile,
  Transaction,
  UTXO,
  TransactionDetails,
  RawTransactionData,
  ListTransactionsItem,
  WalletTransactionResponse,
  WalletTransactionDetails,
  MempoolEntry,
} from "./types";
import {
  bitcoindGetAddressStatus,
  bitcoindImportDescriptors,
  bitcoindListUnspent,
  bitcoindWalletInfo,
  bitcoindGetWalletTransaction,
  callBitcoindWallet,
  FullTransactionItem,
} from "./wallet";

export class BlockchainClientError extends Error {
  constructor(message) {
    super(message);
    this.name = "BlockchainClientError";
  }
}

export enum ClientType {
  PRIVATE = "private",
  PUBLIC = "public",
  MEMPOOL = "mempool",
  BLOCKSTREAM = "blockstream",
}

export enum PublicBitcoinProvider {
  BLOCKSTREAM = "blockstream",
  MEMPOOL = "mempool",
}

const delay = () => {
  return new Promise((resolve) => setTimeout(resolve, 500));
};

/**
 * Transforms a wallet transaction response to the standard raw transaction format
 * used by the the package. This ensures consistency in transaction data handling
 * regardless of the source (wallet transaction, raw transaction, or explorer API).
 *
 * @param walletTx - The wallet transaction response from bitcoind
 * @returns Standardized raw transaction data
 */
export function transformWalletTransactionToRawTransactionData(
  walletTx: WalletTransactionResponse,
): RawTransactionData {
    // Make sure decoded data exists as it has fields like size,etc
  if (!walletTx.decoded) {
    throw new Error(
      "Transaction decoded data is missing. Make sure verbose=true was passed to gettransaction.",
    );
  }  
  // Convert fee from BTC to satoshis (and make positive)
  const feeSats = Math.abs(walletTx.fee || 0) * 100000000;

    // Safely access category from details array if it exists
  const category =
    walletTx.details && walletTx.details.length > 0
      ? walletTx.details[0]["category"]
      : "unknown"; // Default category if details is missing
  return {
    amount: walletTx.amount,
    txid: walletTx.txid,
    version: walletTx.decoded.version,
    locktime: walletTx.decoded.locktime,
    size: walletTx.decoded.size,
    vsize: walletTx.decoded.vsize,
    weight: walletTx.decoded.weight,
    category: category,
    details: walletTx.details,
    fee: feeSats, // Convert from BTC to satoshis
    vin: walletTx.decoded.vin.map((input) => ({
      txid: input.txid,
      vout: input.vout,
      sequence: input.sequence,
    })),
    vout: walletTx.decoded.vout.map((output) => ({
      value: output.value,
      scriptpubkey: output.scriptPubKey.hex,
      scriptpubkey_address: output.scriptPubKey.address,
    })),
    confirmations: walletTx.confirmations,
    blockhash: walletTx.blockhash,
    blocktime: walletTx.blocktime,
    status: {
      confirmed: (walletTx.confirmations || 0) > 0,
      block_height: walletTx.blockheight,
      block_hash: walletTx.blockhash,
      block_time: walletTx.blocktime,
    },
    hex: walletTx.hex,
  };
}

/**
 * Normalizes transaction data from different sources (private node, blockstream, mempool)
 * into a consistent format for use throughout the application.
 *
 * @param txData - Raw transaction data from various sources
 * @param clientType - The type of client that provided the data (private, blockstream, mempool)
 * @returns Normalized transaction details in a consistent format
 */
export function normalizeTransactionData(
  txData: RawTransactionData,
  clientType: ClientType,
): TransactionDetails {
  // Determine if this is a received transaction
  const isReceived = txData.category === "receive" || false;
  return {
    txid: txData.txid,
    version: txData.version,
    locktime: txData.locktime,
    vin: txData.vin.map((input: any) => ({
      txid: input.txid,
      vout: input.vout,
      sequence: input.sequence,
    })),
    vout: txData.vout.map((output: any) => ({
      value:
        clientType === ClientType.PRIVATE
          ? output.value
          : satoshisToBitcoins(output.value),
      scriptPubkey: output.scriptpubkey,
      scriptPubkeyAddress: output.scriptpubkey_address,
    })),
    size: txData.size,
        // add the amount property to the returned object if txData.amount is defined
    ...(txData.amount !== undefined && { amount: txData.amount }),
        // add the vsize property to the returned object if txData.vsize is defined
    ...(txData.vsize !== undefined && { vsize: txData.vsize }),
        // add the category property to the returned object if txData.category is defined ( For Private clients)
    ...(isReceived !== undefined && { isReceived }),
        // add the details property to the returned object if txData.details is defined ( For Private clients)
    ...(txData.details !== undefined && { details: txData.details }),
    weight: txData.weight,
    fee: clientType === ClientType.PRIVATE ? txData.fee || 0 : txData.fee,
    status: {
      confirmed: txData.status?.confirmed ?? txData.confirmations! > 0,
      blockHeight: txData.status?.block_height ?? undefined,
      blockHash: txData.status?.block_hash ?? txData.blockhash,
      blockTime: txData.status?.block_time ?? txData.blocktime,
    },
  };
}

export class ClientBase {
  private readonly throttled: boolean;
  public readonly host: string;

  constructor(throttled: boolean, host: string) {
    this.throttled = throttled;
    this.host = host;
  }

  private async throttle() {
    if (this.throttled) {
      await delay();
    }
  }

  private async Request(method: Method, path: string, data?: any) {
    await this.throttle();
    try {
      const response = await axios.request({
        method,
        url: this.host + path,
        data,
        withCredentials: false,
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      });
      return response.data;
    } catch (e: any) {
      throw (e.response && e.response.data) || e;
    }
  }

  public async Get(path: string) {
    return this.Request("GET", path);
  }

  public async Post(path: string, data?: any) {
    return this.Request("POST", path, data);
  }
}

export interface BitcoindClientConfig {
  url: string;
  username: string;
  password: string;
  walletName?: string;
}

export interface BitcoindParams {
  url: string;
  auth: {
    username: string;
    password: string;
  };
  walletName?: string;
}

export interface BlockchainClientParams {
  type: ClientType;
  provider?: PublicBitcoinProvider;
  network?: Network;
  throttled?: boolean;
  client?: BitcoindClientConfig;
}

export class BlockchainClient extends ClientBase {
  public readonly type: ClientType;
  public readonly provider?: PublicBitcoinProvider;
  public readonly network?: Network;
  public readonly bitcoindParams: BitcoindParams;

  constructor({
    type,
    provider,
    network,
    throttled = false,
    client = {
      url: "",
      username: "",
      password: "",
      walletName: "",
    },
  }: BlockchainClientParams) {
        // regtest not supported by public explorers
    if (
      type === ClientType.PUBLIC &&
      network !== Network.MAINNET &&
      network !== Network.TESTNET &&
      network !== Network.SIGNET
    ) {
      throw new Error("Invalid network");
    }

        // Blockstream does not support Signet
    if (
      type === ClientType.PUBLIC &&
      provider === PublicBitcoinProvider.BLOCKSTREAM &&
      network === Network.SIGNET
    ) {
      throw new Error("Invalid network: Blockstream does not support Signet");
    }

    if (type === ClientType.PRIVATE && provider) {
      throw new Error("Provider cannot be set for private client type");
    }

        // Backwards compatibility for older configs where client.type = 'mempool' or 'blockstream'
    if (type === ClientType.MEMPOOL || type === ClientType.BLOCKSTREAM) {
            // eslint-disable-next-line no-param-reassign
      provider = type as any;
            // eslint-disable-next-line no-param-reassign
      type = ClientType.PUBLIC;
    }

    if (type === ClientType.PUBLIC && !provider) {
            // Default to mempool if no provider is specified for a public client
      // eslint-disable-next-line no-param-reassign
      provider = PublicBitcoinProvider.MEMPOOL;
    }

    let hostURL = "";
    if (type === ClientType.PUBLIC) {
      if (provider === PublicBitcoinProvider.BLOCKSTREAM) {
        hostURL = "https://blockstream.info";
      } else if (provider === PublicBitcoinProvider.MEMPOOL) {
        hostURL = "https://unchained.mempool.space";
      }
      if (network !== Network.MAINNET) {
        hostURL += `/${network}`;
      }
      hostURL += "/api";
    }

    super(throttled, hostURL);
    this.network = network;
    this.type = type;
    this.provider = provider;
    this.bitcoindParams = bitcoindParams(client);
  }

  public async getAddressUtxos(address: string): Promise<any> {
    try {
      if (this.type === ClientType.PRIVATE) {
        return bitcoindListUnspent({
          address,
          ...this.bitcoindParams,
        });
      }
      return await this.Get(`/address/${address}/utxo`);
    } catch (error: any) {
      throw new Error(
        `Failed to get UTXOs for address ${address}: ${error.message}`,
      );
    }
  }

  public async getAddressTransactions(address: string): Promise<Transaction[]> {
    try {
      if (this.type === ClientType.PRIVATE) {
        const data = await callBitcoind<ListTransactionsItem[]>(
          this.bitcoindParams.url,
          this.bitcoindParams.auth,
          "listtransactions",
          [this.bitcoindParams.walletName],
        );

        const txs: Transaction[] = [];
        for (const tx of data.result) {
          if (tx.address === address) {
            const rawTxData = await bitcoindRawTxData({
              url: this.bitcoindParams.url,
              auth: this.bitcoindParams.auth,
              txid: tx.txid,
            });
            const transaction: Transaction = {
              txid: tx.txid,
              vin: [],
              vout: [],
              size: rawTxData.size,
              weight: rawTxData.weight,
              fee: tx.fee!,
              isSend: tx.category === "send" ? true : false,
              amount: tx.amount,
              block_time: tx.blocktime,
            };
            for (const input of rawTxData.vin) {
              transaction.vin.push({
                prevTxId: input.txid,
                vout: input.vout,
                sequence: input.sequence,
              });
            }
            for (const output of rawTxData.vout) {
              transaction.vout.push({
                scriptPubkeyHex: output.scriptPubKey.hex,
                scriptPubkeyAddress: output.scriptPubKey.address,
                value: output.value,
              });
            }
            txs.push(transaction);
          }
        }
        return txs;
      }

     // For Mempool and Blockstream
      const data = await this.Get(`/address/${address}/txs`);
      const txs: Transaction[] = [];
      for (const tx of data.txs) {
        const transaction: Transaction = {
          txid: tx.txid,
          vin: [],
          vout: [],
          size: tx.size,
          weight: tx.weight,
          fee: tx.fee,
          isSend: false,
          amount: 0,
          block_time: tx.status.block_time,
        };

        for (const input of tx.vin) {
          if (input.prevout.scriptpubkey_address === address) {
            transaction.isSend = true;
          }
          transaction.vin.push({
            prevTxId: input.txid,
            vout: input.vout,
            sequence: input.sequence,
          });
        }

        let total_amount = 0;
        for (const output of tx.vout) {
          total_amount += output.value;
          transaction.vout.push({
            scriptPubkeyHex: output.scriptpubkey,
            scriptPubkeyAddress: output.scriptpubkey_address,
            value: output.value,
          });
        }
        transaction.amount = total_amount;
        txs.push(transaction);
      }
      return txs;
    } catch (error: any) {
      throw new Error(
        `Failed to get transactions for address ${address}: ${error.message}`,
      );
    }
  }

  public async broadcastTransaction(rawTx: string): Promise<any> {
    try {
      if (this.type === ClientType.PRIVATE) {
        return bitcoindSendRawTransaction({
          hex: rawTx,
          ...this.bitcoindParams,
        });
      }
      return await this.Post(`/tx`, rawTx);
    } catch (error: any) {
      throw new Error(`Failed to broadcast transaction: ${error.message}`);
    }
  }

  public async formatUtxo(utxo: UTXO): Promise<any> {
    const transactionHex = await this.getTransactionHex(utxo.txid);
    const amount = new BigNumber(utxo.value);
    return {
      confirmed: utxo.status.confirmed,
      txid: utxo.txid,
      index: utxo.vout,
      amount: satoshisToBitcoins(utxo.value),
      amountSats: amount,
      transactionHex,
      time: utxo.status.block_time,
    };
  }

  public async fetchAddressUtxos(address: string): Promise<any> {
    let unsortedUTXOs;

    let updates = {
      utxos: [],
      balanceSats: BigNumber(0),
      addressKnown: true,
      fetchedUTXOs: false,
      fetchUTXOsError: "",
    };
    try {
      if (this.type === ClientType.PRIVATE) {
        unsortedUTXOs = await bitcoindListUnspent({
          ...this.bitcoindParams,
          address,
        });
      } else {
        const utxos: UTXO[] = await this.Get(`/address/${address}/utxo`);
        unsortedUTXOs = await Promise.all(
          utxos.map(async (utxo) => await this.formatUtxo(utxo)),
        );
      }
    } catch (error: Error | any) {
      if (
        this.type === ClientType.PRIVATE &&
        isWalletAddressNotFoundError(error)
      ) {
        updates = {
          utxos: [],
          balanceSats: BigNumber(0),
          addressKnown: false,
          fetchedUTXOs: true,
          fetchUTXOsError: "",
        };
      } else {
        updates = { ...updates, fetchUTXOsError: error.toString() };
      }
    }
        // if no utxos then return updates object as is
    if (!unsortedUTXOs) return updates;

        // sort utxos
    const utxos = sortInputs(unsortedUTXOs);
    interface ExtendedUtxo extends UTXO {
      amountSats: BigNumber;
      transactionHex: string;
      time: number;
    }
        // calculate the total balance from all utxos
    const balanceSats = utxos
      .map((utxo: ExtendedUtxo) => utxo.amountSats)
      .reduce(
        (accumulator: BigNumber, currentValue: BigNumber) =>
          accumulator.plus(currentValue),
        new BigNumber(0),
      );

    return {
      ...updates,
      balanceSats,
      utxos,
      fetchedUTXOs: true,
      fetchUTXOsError: "",
    };
  }

  public async getAddressStatus(address: string): Promise<any> {
    try {
      if (this.type === ClientType.PRIVATE) {
        return await bitcoindGetAddressStatus({
          address,
          ...this.bitcoindParams,
        });
      }
      const addressData = await this.Get(`/address/${address}`);
      return {
        used:
          addressData.chain_stats.funded_txo_count > 0 ||
          addressData.mempool_stats.funded_txo_count > 0,
      };
    } catch (error: any) {
      throw new Error(
        `Failed to get status for address ${address}: ${error.message}`,
      );
    }
  }

  public async getFeeEstimate(blocks: number = 3): Promise<any> {
    let fees;
    try {
      switch (this.type) {
        case ClientType.PRIVATE:
          return bitcoindEstimateSmartFee({
            numBlocks: +blocks,
            ...this.bitcoindParams,
          });
        case ClientType.PUBLIC:
          if (!this.provider) {
            throw new Error("Provider is required for public client type");
          }
          if (this.provider === PublicBitcoinProvider.BLOCKSTREAM) {
            fees = await this.Get(`/fee-estimates`);
            return fees[blocks];
          } else if (this.provider === PublicBitcoinProvider.MEMPOOL) {
            fees = await this.Get("/v1/fees/recommended");
            if (blocks === 1) {
              return fees.fastestFee;
            } else if (blocks <= 3) {
              return fees.halfHourFee;
            } else if (blocks <= 6) {
              return fees.hourFee;
            } else {
              return fees.economyFee;
            }
          } else {
            throw new Error("Invalid provider type for public client");
          }
        default:
          throw new Error(`Invalid client type: ${this.type}`);
      }
    } catch (error: any) {
      throw new Error(`Failed to get fee estimate: ${error.message}`);
    }
  }

  public async getBlockFeeRatePercentileHistory(): Promise<
    FeeRatePercentile[]
  > {
    try {
      if (
        this.type === ClientType.PRIVATE ||
        this.provider === PublicBitcoinProvider.BLOCKSTREAM
      ) {
        throw new Error(
          "Not supported for private clients and blockstream. Currently only supported for mempool",
        );
      }

      const data = await this.Get(`/v1/mining/blocks/fee-rates/all`);

      const feeRatePercentileBlocks: FeeRatePercentile[] = [];
      for (const block of data) {
        const feeRatePercentile: FeeRatePercentile = {
          avgHeight: block?.avgHeight,
          timestamp: block?.timestamp,
          avgFee_0: block?.avgFee_0,
          avgFee_10: block?.avgFee_10,
          avgFee_25: block?.avgFee_25,
          avgFee_50: block?.avgFee_50,
          avgFee_75: block?.avgFee_75,
          avgFee_90: block?.avgFee_90,
          avgFee_100: block?.avgFee_100,
        };
        feeRatePercentileBlocks.push(feeRatePercentile);
      }
      return feeRatePercentileBlocks;
    } catch (error: any) {
      throw new Error(
        `Failed to get feerate percentile block: ${error.message}`,
      );
    }
  }

  public async getTransactionHex(txid: string): Promise<any> {
    try {
      if (this.type === ClientType.PRIVATE) {
        const response = (await callBitcoindWallet({
          baseUrl: this.bitcoindParams.url,
          walletName: this.bitcoindParams.walletName,
          auth: this.bitcoindParams.auth,
          method: "gettransaction",
          params: [txid, true, true], // [txid, include_watchonly, verbose]
        })) as any;

        if (response?.result?.hex) {
          return response.result.hex;
        }

        throw new Error("Transaction not found in wallet or missing hex data");
      }
      return await this.Get(`/tx/${txid}/hex`);
    } catch (error: any) {
      throw new Error(`Failed to get transaction: ${error.message}`);
    }
  }

    /**
   * Retrieves transaction history for one or more addresses (public clients only)
   *
   * This method is designed for public blockchain explorers (Mempool/Blockstream) that
   * maintain address indexes, allowing efficient address-specific queries.
   *
   * Why this method is PUBLIC CLIENT ONLY:
   * - Public APIs maintain address indexes for efficient lookups
   * - Bitcoin Core doesn't support address-specific queries (see getWalletTransactionHistory)
   * - Allows querying multiple addresses with Promise.all for efficiency
   *
   * For PRIVATE clients: Use getWalletTransactionHistory() which returns all wallet transactions
   *
   * @param address - Single address or array of addresses to query
   * @param count - Number of transactions to return per address (1-100)
   * @param skip - Number of transactions to skip for pagination
   * @returns Combined array of transactions sorted by time (newest first)
   * @throws Error if called on private client
   *
   * @example
   * // Single address
   * const txs = await client.getAddressTransactionHistory("bc1q...");
   *
   * // Multiple addresses
   * const txs = await client.getAddressTransactionHistory(["bc1q...", "bc1p..."]);
   *
   * @see getWalletTransactionHistory - For private clients
   */

  public async getAddressTransactionHistory(
    address: string | string[],
    count: number = 10,
    skip: number = 0,
  ): Promise<TransactionDetails[]> {
    if (count < 1 || count > 100000) {
      throw new Error("Count must be between 1 and 100000");
    }
    if (skip < 0) {
      throw new Error("Skip must be non-negative");
    }

    try {
      if (this.type === ClientType.PRIVATE) {
        throw new Error("Use getWalletTransactionHistory for private clients");
      }

      if (!this.provider) {
        throw new Error("Provider must be specified for public clients");
      }

      const addresses = Array.isArray(address) ? address : [address];
      const allTransactions: any[] = [];
      let anyAddressFailed = false;
      let firstError: Error | null = null;

            // Use allSettled to handle partial failures
      const results = await Promise.allSettled(
        addresses.map(async (addr) => {
          try {
            const query =
              this.provider === PublicBitcoinProvider.BLOCKSTREAM
                ? `limit=${count}&offset=${skip}`
                : `count=${count}&skip=${skip}`;
            const endpoint = `/address/${addr}/txs?${query}`;
            const response = await this.Get(endpoint);

            // Robust response handling
            let transactions: any[] = [];

                        // Case 1: Response is already an array
            if (Array.isArray(response)) {
              transactions = response;
            }
            // Case 2: Response is an object with nested array
            else if (response && typeof response === "object") {
              const nestedKeys = [
                "transactions",
                "txs",
                "data",
                "items",
                "result",
              ];
              for (const key of nestedKeys) {
                if (Array.isArray(response[key])) {
                  transactions = response[key];
                  break;
                }
              }
              // Case 3: Single transaction object (only if it has a txid)
              if (transactions.length === 0 && response.txid) {
                transactions = [response];
              }
            } 
            // Case 4: Unexpected format - just return empty array
            else {
              console.warn("Unexpected transaction response format:", response);
              transactions = [];
            }

                        // Always ensure we return an array
            return Array.isArray(transactions) ? transactions : [];
          } catch (error) {
            anyAddressFailed = true;
            firstError = error as Error;
            throw error; // Re-throw to mark promise as rejected
          }
        }),
      );

            // Process allSettled results - include empty arrays too
      for (const result of results) {
        if (result.status === "fulfilled") {
          const transactions = result.value;
          if (Array.isArray(transactions)) {
            allTransactions.push(...transactions);
          }
        }
      }

            // Throw if any address failed AND we got no results at all
      if (anyAddressFailed && allTransactions.length === 0) {
        throw (
          firstError ||
          new Error("Failed to fetch transactions for all addresses")
        );
      }

            // Defensive: Ensure allTransactions is always an array
      if (!Array.isArray(allTransactions)) {
        console.warn("allTransactions is not an array:", allTransactions);
        return [];
      }

            // Sort by timestamp (newest first) and apply pagination
      const sortedTransactions = allTransactions
        .sort((a, b) => {
          const timeA = a?.time || a?.timestamp || 0;
          const timeB = b?.time || b?.timestamp || 0;
          return timeB - timeA;
        })
        .slice(0, count);

       // Final safety check
      if (!Array.isArray(sortedTransactions)) {
        console.warn("sortedTransactions is not an array:", sortedTransactions);
        return [];
      }

            // Map to normalized format with error handling
      try {
        return sortedTransactions.map((rawTx: any) => {
          if (!rawTx || typeof rawTx !== "object") {
            console.warn("Invalid transaction object:", rawTx);
                        // Return a minimal valid transaction object
            return {
              txid: "unknown",
              version: 1,
              locktime: 0,
              vin: [],
              vout: [],
              size: 0,
              weight: 0,
              fee: 0,
              isReceived: false,
              status: {
                confirmed: false,
                blockHeight: undefined,
                blockHash: undefined,
                blockTime: undefined,
              },
            } as TransactionDetails;
          }
          return normalizeTransactionData(rawTx, ClientType.PUBLIC);
        });
      } catch (mapError) {
        console.error("Error in transaction mapping:", mapError);
        console.error("sortedTransactions:", sortedTransactions);
        throw mapError;
      }
    } catch (error: any) {
      throw new Error(
        `Failed to get address transaction history: ${error.message}`,
      );
    }
  }

  /**
   * Retrieves transaction history for a Bitcoin Core wallet (private client only)
   *
   * This method returns only "send" (spent) transactions from the wallet. This design
   * decision was made after extensive discussion about Bitcoin Core's limitations:
   *
   * 1. Bitcoin Core doesn't maintain an address index for performance/privacy reasons
   * 2. The `listtransactions` RPC returns ALL wallet transactions with no address filtering
   * 3. Filtering by address after fetching would be O(n*m) complexity for multiple addresses
   *
   * Why this method is PRIVATE CLIENT ONLY:
   * - Public APIs (Mempool/Blockstream) support direct address querying
   * - Bitcoin Core requires different approach due to lack of address indexing
   * - This inconsistency is intentional to optimize for each client type's capabilities
   *
   * Why only "send" transactions:
   * - Unspent "receive" transactions are already available via fetchAddressUtxos()
   * - Avoids duplication of data that's accessible through UTXO methods
   * - Focuses on spent transactions which are needed for transaction history
   * - Coordinator can combine this with UTXO data for complete history
   *
   * For PUBLIC clients: Use getAddressTransactionHistory() which supports address filtering
   *
   * @param count - Number of transactions to return (1-1000)
   * @param skip - Number of transactions to skip for pagination
   * @param includeWatchOnly - Include watch-only addresses in results
   * @returns Array of spent transactions from the wallet
   * @throws Error if called on public client or if wallet name is missing
   *
   * @example
   * // For private client - get last 100 spent transactions
   * const spentTxs = await client.getWalletTransactionHistory(100);
   *
   * // For public client - use getAddressTransactionHistory instead
   * const addressTxs = await client.getAddressTransactionHistory(address);
   *
   * @see getAddressTransactionHistory - For public clients
   * @see fetchAddressUtxos - For unspent transactions
   */

  public async getWalletTransactionHistory(
    count: number = 100,
    skip: number = 0,
    includeWatchOnly: boolean = true,
  ): Promise<WalletTransactionDetails[]> {
    if (count < 1 || count > 100000) {
      throw new Error("Count must be between 1 and 100000");
    }
    if (skip < 0) {
      throw new Error("Skip must be non-negative");
    }

    if (this.type !== ClientType.PRIVATE) {
      throw new Error(
        "This method is only supported for private clients. Use getAddressTransactionHistory for public clients",
      );
    }

  // Call Bitcoin Core's listtransactions directly to get ALL transactions (not just spent ones)
    const response = await callBitcoindWallet({
      baseUrl: this.bitcoindParams.url,
      walletName: this.bitcoindParams.walletName,
      auth: this.bitcoindParams.auth,
      method: "listtransactions",
      params: ["*", count, skip, includeWatchOnly],
    });

    if (!response?.result || !Array.isArray(response.result)) {
      throw new Error("Failed to retrieve transactions from Bitcoin Core");
    }

  // Include both send AND receive transactions (and other categories)
    const allTransactions = response.result.filter(
      (tx: ListTransactionsItem) => 
        tx.category === "send" || 
        tx.category === "receive" || 
        tx.category === "generate" ||
        tx.category === "immature"
    );

  // Fetch detailed transaction info in parallel to get size/weight data
    const detailedTransactions = await Promise.allSettled(
      allTransactions.map(async (tx): Promise<FullTransactionItem> => {
        try {
        // Get full transaction details which includes size/vsize/weight
          const fullTx = await callBitcoindWallet({
            baseUrl: this.bitcoindParams.url,
            walletName: this.bitcoindParams.walletName,
            auth: this.bitcoindParams.auth,
            method: "gettransaction",
          params: [tx.txid, false, true], // [txid, include_watchonly, verbose]
          }) as { result?: WalletTransactionResponse };

        // Extract size data with proper fallbacks
          const decoded = fullTx.result?.decoded;
          const size = decoded?.size ?? 0;
        const vsize = decoded?.vsize ?? decoded?.size ?? 0; // Use size as fallback for vsize
        const weight = decoded?.weight ?? (decoded?.size ? decoded.size * 4 : 0); // Estimate weight as size * 4

          return {
            ...tx,
            size,
            vsize,
            weight,
          };
        } catch (error) {
          console.warn(`Failed to fetch details for transaction ${tx.txid}:`, error);
        // Fallback to original transaction data with 0 size
          return {
            ...tx,
            size: 0,
            vsize: 0,
            weight: 0,
          };
        }
      })
    );

    return detailedTransactions.map((result, index) => {
      const enhancedTx: FullTransactionItem = result.status === 'fulfilled' 
        ? result.value 
        : {
            ...allTransactions[index],
            size: 0,
            vsize: 0,
            weight: 0,
          };
      
      const feeSats = enhancedTx.fee ? Math.abs(enhancedTx.fee * 100000000) : 0;
    
    // Determine if this is a received transaction
      const isReceived = enhancedTx.category === "receive" || 
                        enhancedTx.category === "generate" || 
                        enhancedTx.category === "immature";
      
    const transformedTx: WalletTransactionDetails = {
        txid: enhancedTx.txid,
        version: 1,
        locktime: 0,
        vin: [],
        vout: [],
      size: enhancedTx.size || 0,       
      vsize: enhancedTx.vsize || 0,      
      weight: enhancedTx.weight || 0,  
        fee: feeSats,
      isReceived: isReceived,
        status: {
          confirmed: enhancedTx.confirmations > 0,
          blockHeight: enhancedTx.blockheight,
          blockHash: enhancedTx.blockhash,
          blockTime: enhancedTx.blocktime,
        },
      // Required wallet-specific properties
        amount: enhancedTx.amount,
        confirmations: enhancedTx.confirmations,
        category: enhancedTx.category,
        address: enhancedTx.address,
        abandoned: enhancedTx.abandoned,
        time: enhancedTx.time,
      };
    
    return transformedTx;
    });
  }
  

  /**
   * Gets detailed information about a wallet transaction including fee information
   *
   * This method is specifically for transactions that are tracked by the wallet,
   * and provides fee information that isn't available in the general getTransaction
   * method. This is especially useful for private nodes where fee information is
   * critical for UI display.
   *
   * @see https://developer.bitcoin.org/reference/rpc/gettransaction.html
   *
   * @param txid - Transaction ID to retrieve
   * @returns Normalized transaction details with fee information
   */

  public async getWalletTransaction(txid: string): Promise<TransactionDetails> {
    if (this.type !== ClientType.PRIVATE) {
      throw new BlockchainClientError(
        "Wallet transactions are only available for private Bitcoin nodes",
      );
    }

    try {
      const walletTxData = await bitcoindGetWalletTransaction({
        url: this.bitcoindParams.url,
        auth: this.bitcoindParams.auth,
        walletName: this.bitcoindParams.walletName,
        txid,
      });

      const normalizedTxData: RawTransactionData =
        transformWalletTransactionToRawTransactionData(walletTxData);

      return normalizeTransactionData(normalizedTxData, this.type);
    } catch (error: any) {
      throw new Error(`Failed to get wallet transaction: ${error.message}`);
    }
  }

  public async getTransaction(
    txid: string,
    forceRawTx: boolean = false,
  ): Promise<TransactionDetails> {
    try {
      let txData: RawTransactionData;

      switch (this.type) {
        case ClientType.PRIVATE:
          if (!forceRawTx && this.bitcoindParams.walletName) {
            try {
              return await this.getWalletTransaction(txid);
            } catch (walletError: any) {
              console.warn(
                `Wallet transaction lookup failed, falling back to raw transaction: ${walletError.message}`,
              );
            }
          }
          txData = await bitcoindRawTxData({
            url: this.bitcoindParams.url,
            auth: this.bitcoindParams.auth,
            txid,
          });
          break;
        case ClientType.PUBLIC:
          if (
            this.provider === PublicBitcoinProvider.BLOCKSTREAM ||
            this.provider === PublicBitcoinProvider.MEMPOOL
          ) {
            txData = await this.Get(`/tx/${txid}`);
          } else {
            throw new Error("Invalid provider for public client."); // Should not happen with constructor guards
          }
          break;
        // Cases for deprecated direct mempool/blockstream types if they existed in ClientType before
        // and if the current enum still has them for some reason (e.g. backward compatibility layer)
        // However, the goal of the PR was to consolidate these under ClientType.PUBLIC and a provider.
        // So, ideally, direct cases for MEMPOOL/BLOCKSTREAM in ClientType shouldn't be needed here
        // if the constructor correctly maps them to ClientType.PUBLIC and sets the provider.
        default:
          // This will catch if type is 'mempool' or 'blockstream' string literals if not handled by constructor
          throw new Error(`Invalid client type: ${this.type}`);
      }
      return normalizeTransactionData(txData, this.type);
    } catch (error: any) {
      throw new Error(`Failed to get transaction: ${error.message}`);
    }
  }

  public async importDescriptors({
    receive,
    change,
    rescan,
  }: {
    receive: string;
    change: string;
    rescan: boolean;
  }): Promise<object> {
    if (this.type !== ClientType.PRIVATE) {
      throw new BlockchainClientError(
        "Only private clients support descriptor importing",
      );
    }

    return await bitcoindImportDescriptors({
      receive,
      change,
      rescan,
      ...this.bitcoindParams,
    });
  }

  public async getWalletInfo() {
    if (this.type !== ClientType.PRIVATE) {
      throw new BlockchainClientError(
        "Only private clients support wallet info",
      );
    }

    return await bitcoindWalletInfo({ ...this.bitcoindParams });
  }

  /**
   * Retrieves the fee information for a pending (incoming) transaction .
   *
   * Standard methods like `getTransaction` do not provide fee details for transactions
   * where the user is the recipient. However, this information is required for
   * fee bumping strategies like CPFP (Child Pays For Parent).
   *
   * This method :
   * - For private nodes: Uses `getmempoolentry` to fetch fee data from the node's mempool
   * - For public APIs: Uses mempool.space transaction endpoint to get fee information
   * - Returns null if the transaction is not pending (not in mempool)
   *
   * @see https://developer.bitcoin.org/reference/rpc/getmempoolentry.html?highlight=getmempoolentry
   * @see https://mempool.space/docs/api/rest#get-transaction
   *
   * @param txid - Transaction ID to get fees
   * @returns Tx fees in BTC, or null if transaction is not pending
   */
  public async getFeesForPendingTransaction(
    txid: string,
  ): Promise<string | null> {
    try {
      if (this.type === ClientType.PRIVATE) {
        const rpcResponse = await callBitcoindWallet({
          baseUrl: this.bitcoindParams.url,
          walletName: this.bitcoindParams.walletName,
          auth: this.bitcoindParams.auth,
          method: "getmempoolentry",
          params: [txid],
        });
        const mempoolEntry = rpcResponse.result as MempoolEntry;

        if (!mempoolEntry || !mempoolEntry.fees) {
          return null;
        }
        return mempoolEntry.fees.base.toString();
      }
      const txData: RawTransactionData = await this.Get(`/tx/${txid}`);
      if (txData && txData.fee && !txData.status?.confirmed) {
        return satoshisToBitcoins(txData.fee);
      }

      return null;
    } catch (error: any) {
      throw new Error(`Failed to get wallet transaction: ${error.message}`);
    }
  }
}
