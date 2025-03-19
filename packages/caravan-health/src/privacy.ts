import { SpendType, MultisigAddressType, Network, Transaction } from "./types";
import { getAddressType } from "@caravan/bitcoin";
import { WalletMetrics } from "./wallet";
import { determineSpendType, getSpendTypeScore } from "./spendType";

// Deniability Factor is a normalizing quantity that increases the score by a certain factor in cases of self-payment.
// More about deniability: https://www.truthcoin.info/blog/deniability/
const DENIABILITY_FACTOR = 1.5;

export class PrivacyMetrics extends WalletMetrics {
  /**
   * Computes the topology score for a given transaction.
   * @param {Transaction} transaction - The transaction to evaluate.
   * @returns {number} Privacy score based on transaction topology.
   */
  getTopologyScore(transaction: Transaction): number {
    const numberOfInputs: number = transaction.vin.length;
    const numberOfOutputs: number = transaction.vout.length;

    const spendType: SpendType = determineSpendType(
      numberOfInputs,
      numberOfOutputs,
    );
    const score: number = getSpendTypeScore(numberOfInputs, numberOfOutputs);

    if (spendType === SpendType.Consolidation) {
      return score;
    }

    for (const output of transaction.vout) {
      const address = output.scriptPubkeyAddress;
      const isReused = this.isReusedAddress(address);
      if (isReused) {
        return score;
      }
    }

    return score * DENIABILITY_FACTOR;
  }

  /**
   * Computes the mean topology privacy score (MTPS) for the wallet.
   * @returns {number} Mean topology score across transactions.
   */
  getMeanTopologyScore(): number {
    const transactions = this.transactions;
    if (transactions.length === 0) return 0; // Prevent division by zero

    let privacyScore = 0;
    for (const tx of transactions) {
      const topologyScore = this.getTopologyScore(tx);
      privacyScore += topologyScore;
    }
    return privacyScore / transactions.length;
  }

  /**
   * Calculates the Address Reuse Factor (ARF).
   * @returns {number} A metric measuring the proportion of reused addresses.
   */
  addressReuseFactor(): number {
    let reusedAmount: number = 0;
    let totalAmount: number = 0;
    const utxos = this.utxos;

    for (const address in utxos) {
      const addressUtxos = utxos[address];
      for (const utxo of addressUtxos) {
        totalAmount += utxo.value;
        if (this.isReusedAddress(address)) {
          reusedAmount += utxo.value;
        }
      }
    }

    return totalAmount === 0 ? 0 : reusedAmount / totalAmount; // Prevent division by zero
  }

  /**
   * Calculates the Address Type Factor (ATF) based on the variety of address types used.
   * @param {MultisigAddressType} walletAddressType - The type of addresses used in the wallet.
   * @param {Network} network - The Bitcoin network.
   * @returns {number} The address type factor score.
   */
  addressTypeFactor(
    walletAddressType: MultisigAddressType,
    network: Network,
  ): number {
    const addressCounts: Record<MultisigAddressType, number> = {
      P2WSH: 0,
      P2SH: 0,
      P2PKH: 0,
      P2TR: 0,
      UNKNOWN: 0,
      "P2SH-P2WSH": 0,
    };

    this.transactions.forEach((tx) => {
      tx.vout.forEach((output) => {
        const addressType = getAddressType(output.scriptPubkeyAddress, network);
        addressCounts[addressType]++;
      });
    });

    const totalAddresses = Object.values(addressCounts).reduce(
      (a, b) => a + b,
      0,
    );
    const walletTypeCount = addressCounts[walletAddressType];

    if (walletTypeCount === 0 || totalAddresses === walletTypeCount) {
      return 1;
    }
    return 1 / (walletTypeCount + 1);
  }

  /**
   * Computes the UTXO Spread Factor based on the distribution of UTXO values.
   * @returns {number} A measure of UTXO value dispersion.
   */
  utxoSpreadFactor(): number {
    const amounts: number[] = [];
    const utxos = this.utxos;

    for (const address in utxos) {
      utxos[address].forEach((utxo) => {
        amounts.push(utxo.value);
      });
    }

    if (amounts.length === 0) return 0; // Prevent division by zero

    const mean =
      amounts.reduce((sum, amount) => sum + amount, 0) / amounts.length;
    const variance =
      amounts.reduce((sum, amount) => sum + Math.pow(amount - mean, 2), 0) /
      amounts.length;
    const stdDev = Math.sqrt(variance);

    return stdDev / (stdDev + 1);
  }

  /**
   * Computes the UTXO Mass Factor (UMF) based on the number of UTXOs.
   * @returns {number} A measure of the number of UTXOs.
   */
  utxoMassFactor(): number {
    const totalUtxos = Object.values(this.utxos).reduce(
      (sum, utxos) => sum + utxos.length,
      0,
    );
    return totalUtxos / (totalUtxos + 1);
  }

  /**
   * Computes the UTXO Value Dispersion Factor (UVDF).
   * @returns {number} A metric combining UTXO spread and UTXO mass.
   */
  utxoValueDispersionFactor(): number {
    const UMF = this.utxoMassFactor();
    const USF = this.utxoSpreadFactor();
    return (USF + UMF) * 0.15 - 0.15;
  }

  /**
   * Computes the Weighted Privacy Score (WPS) for the wallet.
   * @param {MultisigAddressType} walletAddressType - The wallet's address type.
   * @param {Network} network - The Bitcoin network.
   * @returns {number} A weighted score representing overall privacy health.
   */
  getWalletPrivacyScore(
    walletAddressType: MultisigAddressType,
    network: Network,
  ): number {
    const meanTopologyScore = this.getMeanTopologyScore();
    const ARF = this.addressReuseFactor();
    const ATF = this.addressTypeFactor(walletAddressType, network);
    const UVDF = this.utxoValueDispersionFactor();

    return (
      (meanTopologyScore * (1 - 0.5 * ARF) + 0.1 * (1 - ARF)) * (1 - ATF) +
      0.1 * UVDF
    );
  }
}
