/* eslint-disable @typescript-eslint/no-explicit-any */
/*
TODO: cleanup the no explicit any. added to quickly type error catches
*/
import axios, { Method } from "axios";
import { Network, satoshisToBitcoins, sortInputs } from "@caravan/bitcoin";
import {
  bitcoindEstimateSmartFee,
  bitcoindParams,
  bitcoindSendRawTransaction,
  isWalletAddressNotFoundError,
  callBitcoind,
  bitcoindRawTxData,
} from "./bitcoind";
import {
  bitcoindGetAddressStatus,
  bitcoindImportDescriptors,
  bitcoindListUnspent,
  bitcoindWalletInfo,
} from "./wallet";
import BigNumber from "bignumber.js";
import {
  FeeRatePercentile,
  Transaction,
  UTXO,
  TransactionDetails,
  RawTransactionData,
  ListTransactionsItem,
  TransactionResponse,
} from "./types";

export class BlockchainClientError extends Error {
  constructor(message) {
    super(message);
    this.name = "BlockchainClientError";
  }
}

export enum ClientType {
  PRIVATE = "private",
  BLOCKSTREAM = "blockstream",
  MEMPOOL = "mempool",
}

const delay = () => {
  return new Promise((resolve) => setTimeout(resolve, 500));
};

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
  network?: Network;
  throttled?: boolean;
  client?: BitcoindClientConfig;
}

export class BlockchainClient extends ClientBase {
  public readonly type: ClientType;
  public readonly network?: Network;
  public readonly bitcoindParams: BitcoindParams;

  constructor({
    type,
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
      type !== ClientType.PRIVATE &&
      network !== Network.MAINNET &&
      network !== Network.TESTNET &&
      network !== Network.SIGNET
    ) {
      throw new Error("Invalid network");
    }
    if (type !== ClientType.MEMPOOL && network === Network.SIGNET) {
      throw new Error("Invalid network");
    }

    let host = "";

    if (type === ClientType.BLOCKSTREAM) {
      host = "https://blockstream.info";
    } else if (type === ClientType.MEMPOOL) {
      host = "https://unchained.mempool.space";
    }
    if (type !== ClientType.PRIVATE && network !== Network.MAINNET) {
      host += `/${network}`;
    }
    if (type !== ClientType.PRIVATE) {
      host += "/api";
    }
    super(throttled, host);
    this.network = network;
    this.type = type;
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
      if (this.type === "private" && isWalletAddressNotFoundError(error)) {
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
        case ClientType.BLOCKSTREAM:
          fees = await this.Get(`/fee-estimates`);
          return fees[blocks];
        case ClientType.MEMPOOL:
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
        default:
          throw new Error("Invalid client type");
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
        this.type === ClientType.BLOCKSTREAM
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
        return await callBitcoind<TransactionResponse>(
          this.bitcoindParams.url,
          this.bitcoindParams.auth,
          "gettransaction",
          [txid],
        );
      }
      return await this.Get(`/tx/${txid}/hex`);
    } catch (error: any) {
      throw new Error(`Failed to get transaction: ${error.message}`);
    }
  }

  public async getTransaction(txid: string): Promise<TransactionDetails> {
    try {
      let txData: RawTransactionData;

      if (this.type === ClientType.PRIVATE) {
        const response = await bitcoindRawTxData({
          url: this.bitcoindParams.url,
          auth: this.bitcoindParams.auth,
          txid,
        });
        txData = response;
      } else if (
        this.type === ClientType.BLOCKSTREAM ||
        this.type === ClientType.MEMPOOL
      ) {
        txData = await this.Get(`/tx/${txid}`);
      } else {
        throw new Error("Invalid client type");
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
}
