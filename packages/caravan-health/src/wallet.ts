import { AddressUtxos, Transaction, FeeRatePercentile } from "./types";

export class WalletMetrics {
  public addressUsageMap: Map<string, number> = new Map();
  public transactions: Transaction[] = [];
  public utxos: AddressUtxos = {};

  constructor(transactions?: Transaction[], utxos?: AddressUtxos) {
    if (transactions) {
      this.transactions = transactions;
      this.addressUsageMap = this.constructAddressUsageMap();
    }
    if (utxos) {
      this.utxos = utxos;
    }
  }
  /*
    Name : UTXO Mass Factor

    Calculation :
      The mass factor is calculated based on the number of UTXOs in the set.

    Expected Range : [0,1]
    - 0 for UTXO set length >= 50
    - 0.25 for UTXO set length >= 25 and <= 49
    - 0.5 for UTXO set length >= 15 and <= 24
    - 0.75 for UTXO set length >= 5 and <= 14
    - 1 for UTXO set length < 5
  */
  utxoMassFactor(): number {
    let utxoSetLength = 0;
    const utxos = this.utxos;
    for (const address in utxos) {
      const addressUtxos = utxos[address];
      utxoSetLength += addressUtxos.length;
    }
    let utxoMassFactor: number;
    if (utxoSetLength >= 50) {
      utxoMassFactor = 0;
    } else if (utxoSetLength >= 25 && utxoSetLength <= 49) {
      utxoMassFactor = 0.25;
    } else if (utxoSetLength >= 15 && utxoSetLength <= 24) {
      utxoMassFactor = 0.5;
    } else if (utxoSetLength >= 5 && utxoSetLength <= 14) {
      utxoMassFactor = 0.75;
    } else {
      utxoMassFactor = 1;
    }
    return utxoMassFactor;
  }

  /*
    Utility function that helps to obtain the fee rate of the transaction
  */
  getFeeRateForTransaction(transaction: Transaction): number {
    const fees: number = transaction.fee;
    const weight: number = transaction.weight;
    return fees / weight;
  }

  /*
    Utility function that helps to obtain the percentile of the fees paid by user in tx block
  */
  getFeeRatePercentileScore(
    timestamp: number,
    feeRate: number,
    feeRatePercentileHistory: FeeRatePercentile[],
  ): number {
    const percentile: number = this.getClosestPercentile(
      timestamp,
      feeRate,
      feeRatePercentileHistory,
    );
    return 1 - percentile / 100;
  }

  /*
    Utility function that helps to obtain the closest percentile of the fees paid by user in tx block
  */
  getClosestPercentile(
    timestamp: number,
    feeRate: number,
    feeRatePercentileHistory: FeeRatePercentile[],
  ): number {
    // Find the closest entry by timestamp
    let closestBlock: FeeRatePercentile | null = null;
    let closestDifference: number = Infinity;

    for (const block of feeRatePercentileHistory) {
      const difference = Math.abs(block.timestamp - timestamp);
      if (difference <= closestDifference) {
        closestDifference = difference;
        closestBlock = block;
      }
    }
    if (!closestBlock) {
      throw new Error("No fee rate data found");
    }
    // Find the closest fee rate percentile
    switch (true) {
      case feeRate <= closestBlock.avgFee_0:
        return 0;
      case feeRate <= closestBlock.avgFee_10:
        return 10;
      case feeRate <= closestBlock.avgFee_25:
        return 25;
      case feeRate <= closestBlock.avgFee_50:
        return 50;
      case feeRate <= closestBlock.avgFee_75:
        return 75;
      case feeRate <= closestBlock.avgFee_90:
        return 90;
      case feeRate <= closestBlock.avgFee_100:
        return 100;
      default:
        throw new Error("Invalid fee rate");
    }
  }

  constructAddressUsageMap(): Map<string, number> {
    const addressUsageMap: Map<string, number> = new Map();
    const transactions = this.transactions;
    for (const tx of transactions) {
      for (const output of tx.vout) {
        const address = output.scriptPubkeyAddress;
        if (addressUsageMap.has(address)) {
          addressUsageMap.set(address, addressUsageMap.get(address)! + 1);
        } else {
          addressUsageMap.set(address, 1);
        }
      }
    }
    return addressUsageMap;
  }

  /* 
    Utility function to check if the given address was used already in past transactions
  */
  isReusedAddress(address: string): boolean {
    return (
      this.addressUsageMap.has(address) &&
      this.addressUsageMap.get(address)! > 1
    );
  }
}
