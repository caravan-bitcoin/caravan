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
} from "./bitcoind";
import {
  bitcoindGetAddressStatus,
  bitcoindImportDescriptors,
  bitcoindListUnspent,
  bitcoindWalletInfo,
} from "./wallet";
import BigNumber from "bignumber.js";

export class BlockchainClientError extends Error {
  constructor(message) {
    super(message);
    this.name = "BlockchainClientError";
  }
}

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
  blocktime: number;
}

interface Input {
  txid: string;
  vout: number;
  sequence: number;
}

interface Output {
  scriptPubkeyHex: string;
  scriptPubkeyAddress: string;
  value: number;
}

export enum ClientType {
  PRIVATE = "private",
  BLOCKSTREAM = "blockstream",
  MEMPOOL = "mempool",
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

const delay = () => {
  return new Promise((resolve) => setTimeout(resolve, 500));
};

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

  public async bitcoindRawTxData(txid: string): Promise<any> {
    return await callBitcoind(
      this.bitcoindParams.url,
      this.bitcoindParams.auth,
      "decoderawtransaction",
      [txid],
    );
  }

  public async getAddressTransactions(address: string): Promise<Transaction[]> {
    try {
      if (this.type === ClientType.PRIVATE) {
        const data = await callBitcoind(
          this.bitcoindParams.url,
          this.bitcoindParams.auth,
          "listtransactions",
          [this.bitcoindParams.walletName],
        );

        const txs: Transaction[] = [];
        for (const tx of data) {
          if (tx.address === address) {
            let isTxSend = tx.category === "send" ? true : false;
            const rawTxData = await this.bitcoindRawTxData(tx.txid);
            const transaction: Transaction = {
              txid: tx.txid,
              vin: [],
              vout: [],
              size: rawTxData.size,
              weight: rawTxData.weight,
              fee: tx.fee,
              isSend: isTxSend,
              amount: tx.amount,
              blocktime: tx.blocktime,
            };
            for (const input of rawTxData.vin) {
              transaction.vin.push({
                txid: input.txid,
                vout: input.vout,
                sequence: input.sequence,
              });
            }
            for (const output of rawTxData.vout) {
              transaction.vout.push({
                scriptPubkeyHex: output.scriptPubKey.hex,
                scriptPubkeyAddress: output.scriptPubKey.addresses[0],
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
          isSend: false, // TODO : Need to implement this.
          amount: 0,
          blocktime: tx.status.block_time,
        };

        for (const input of tx.vin) {
          transaction.vin.push({
            txid: input.txid,
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

  // TODO : Implement Caching or Ticker based mechanism to reduce network latency
  public async getFeeRatePercentileForTransaction(
    timestamp: number,
    feeRate: number,
  ): Promise<number> {
    try {
      switch (this.type) {
        case ClientType.PRIVATE:
        // DOUBT : I don't think bitcoind or even blockstream gives this info.
        // Maybe we should compare it only against MEMPOOL with given timestamp and feerate.
        case ClientType.BLOCKSTREAM:
        // DOUBT : Same as above
        case ClientType.MEMPOOL:
          let data = await this.Get(`v1/mining/blocks/fee-rates/all`);
          let feeRatePercentileBlocks: FeeRatePercentile[] = [];
          for (const block of data) {
            let feeRatePercentile: FeeRatePercentile = {
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
          // Find the closest entry by timestamp
          let closestBlock: FeeRatePercentile | null = null;
          let closestDifference: number = Infinity;

          for (const block of feeRatePercentileBlocks) {
            const difference = Math.abs(block.timestamp - timestamp);
            if (difference < closestDifference) {
              closestDifference = difference;
              closestBlock = block;
            }
          }
          if (!closestBlock) {
            throw new Error("No fee rate data found");
          }
          // Find the closest fee rate percentile
          switch (true) {
            case feeRate < closestBlock.avgFee_0:
              return 0;
            case feeRate < closestBlock.avgFee_10:
              return 10;
            case feeRate < closestBlock.avgFee_25:
              return 25;
            case feeRate < closestBlock.avgFee_50:
              return 50;
            case feeRate < closestBlock.avgFee_75:
              return 75;
            case feeRate < closestBlock.avgFee_90:
              return 90;
            case feeRate < closestBlock.avgFee_100:
              return 100;
            default:
              throw new Error("Invalid fee rate");
          }
        default:
          throw new Error("Invalid client type");
      }
    } catch (error: any) {
      throw new Error(`Failed to get fee estimate: ${error.message}`);
    }
  }

  public async getTransactionHex(txid: string): Promise<any> {
    try {
      if (this.type === ClientType.PRIVATE) {
        return await callBitcoind(
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
