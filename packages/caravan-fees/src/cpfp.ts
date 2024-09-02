import { TransactionAnalyzer } from "./transactionAnalyzer";
import { BtcTransactionTemplate } from "./btcTransactionTemplate";
import {
  BtcTxInputTemplate,
  BtcTxOutputTemplate,
} from "./btcTransactionComponents";
import { FeeBumpStrategy, CPFPOptions } from "./types";
import BigNumber from "bignumber.js";
import { isCPFPFeeSatisfied } from "./utils";

/**
 * Creates a Child-Pays-for-Parent (CPFP) transaction to accelerate the confirmation
 * of an unconfirmed parent transaction.
 *
 * This function implements a simplified version of the CPFP strategy used in Bitcoin Core.
 * It creates a new transaction (child) that spends an output from the original unconfirmed
 * transaction (parent), including a higher fee to incentivize miners to confirm both
 * transactions together.
 *
 * The CPFP calculation process:
 * 1. Analyze the parent transaction to determine its fee, size, and available outputs.
 * 2. Create a child transaction template with the target fee rate for the combined package.
 * 3. Add the spendable output from the parent as an input to the child transaction.
 * 4. Iteratively add additional inputs to the child transaction until the combined
 *    fee rate of the parent and child meets or exceeds the target fee rate.
 * 5. Calculate and set the change output amount for the child transaction.
 * 6. Validate the child transaction and ensure the combined fee rate is sufficient.
 *
 * The combined fee rate is calculated as:
 * (parentFee + childFee) / (parentVsize + childVsize)
 *
 * @param {CPFPOptions} options - Configuration options for creating the CPFP transaction.
 * @returns {string} The base64-encoded PSBT of the CPFP (child) transaction.
 * @throws {Error} If CPFP is not possible, if the transaction creation fails, or if
 *                 the combined fee rate doesn't meet the target (in strict mode).
 *
 * @example
 * const cpfpTx = createCPFPTransaction({
 *   originalTx: originalTxHex,
 *   availableInputs: availableUTXOs,
 *   spendableOutputIndex: 1,
 *   changeAddress: 'bc1q...',
 *   network: Network.MAINNET,
 *   dustThreshold: '546',
 *   scriptType: 'P2WSH',
 *   targetFeeRate: '15',
 *   absoluteFee: '1000',
 *   requiredSigners: 2,
 *   totalSigners: 3,
 *   strict: true
 * });
 *
 * @see https://bitcoinops.org/en/topics/cpfp/ Bitcoin Optech on Child Pays for Parent
 * @see https://github.com/bitcoin/bitcoin/pull/7600 Bitcoin Core CPFP implementation
 */
export const createCPFPTransaction = (options: CPFPOptions): string => {
  const {
    strict = false,
    originalTx,
    network,
    targetFeeRate,
    absoluteFee,
    availableInputs,
    requiredSigners,
    totalSigners,
    scriptType,
    dustThreshold,
    spendableOutputIndex,
    changeAddress,
  } = options;

  // CPFP Calculation Process:
  // Step 1: Analyze the original transaction
  const txAnalyzer = new TransactionAnalyzer({
    txHex: originalTx,
    network,
    changeOutputIndex: spendableOutputIndex,
    targetFeeRate, // We need this param ... very essential for the analyzer to make decisions cannot put it to 0
    absoluteFee,
    availableUtxos: availableInputs,
    requiredSigners,
    totalSigners,
    addressType: scriptType,
  });

  const analysis = txAnalyzer.analyze();
  // Step 2: Verify CPFP suitability
  if (!analysis.canCPFP) {
    throw new Error(
      "CPFP is not possible for this transaction. Ensure the specified output is available for spending.",
    );
  }

  if (analysis.recommendedStrategy !== FeeBumpStrategy.CPFP) {
    console.warn(
      "CPFP is not the recommended strategy for this transaction. Consider using the recommended strategy: " +
        analysis.recommendedStrategy,
    );
  }

  // Step 3: Create a new transaction template for the child transaction
  const childTxTemplate = new BtcTransactionTemplate({
    inputs: [],
    outputs: [],
    targetFeeRate: Number(txAnalyzer.cpfpFeeRate), // Use CPFP-specific fee rate from analyzer
    dustThreshold,
    network,
    scriptType,
    requiredSigners,
    totalSigners,
  });

  // Step 4: Add the spendable output from the parent transaction as an input
  const parentOutput = txAnalyzer.outputs[spendableOutputIndex];
  if (!parentOutput) {
    throw new Error(
      `Spendable output at index ${spendableOutputIndex} not found in the parent transaction.`,
    );
  }

  const parentOutputUTXO = availableInputs.find(
    (utxo) => utxo.txid === analysis.txid && utxo.vout === spendableOutputIndex,
  );

  if (!parentOutputUTXO) {
    throw new Error(
      `UTXO for the spendable output (${analysis.txid}:${spendableOutputIndex}) not found in availableInputs.`,
    );
  }

  childTxTemplate.addInput(BtcTxInputTemplate.fromUTXO(parentOutputUTXO));

  // Step 5: Add a change output (at least 1 output required for a valid transaction)
  childTxTemplate.addOutput(
    new BtcTxOutputTemplate({
      address: changeAddress,
      amountSats: "0", // Initial amount, will be adjusted later
    }),
  );

  /**
   * Step 6: Add additional inputs to cover the CPFP fee requirements
   *
   * This step implements a simplified version of the "Child-pays-for-parent" (CPFP)
   * transaction selection logic, inspired by Bitcoin Core's implementation
   * (https://github.com/bitcoin/bitcoin/pull/7600).
   *
   * In Bitcoin Core, transactions are sorted in the mempool using a modified
   * feerate that considers ancestors. During block creation, transactions are
   * considered in this order. As transactions are selected, a separate map tracks
   * the new feerate-with-ancestors for in-mempool descendants.
   *
   * Our simplified approach:
   * 1. We start with the parent transaction's fee and vsize.
   * 2. We iteratively add inputs to the child transaction.
   * 3. After each input addition, we recalculate the combined fee rate of the
   *    parent and child transactions.
   * 4. We continue adding inputs until the combined fee rate meets or exceeds
   *    the target fee rate.
   *
   * This method ensures that the child transaction provides enough fee to incentivize
   * miners to include both the parent and child transactions in a block, effectively
   * "bumping" the fee of the parent transaction.
   *
   * Note: While this approach is simpler than Bitcoin Core's full implementation,
   * it achieves the core goal of CPFP: ensuring the combined package (parent + child)
   * is attractive for miners to include in a block.
   */

  const parentFee = new BigNumber(analysis.fee);
  const parentVsize = analysis.vsize;

  for (const utxo of availableInputs) {
    if (
      isCPFPFeeSatisfied(
        parentFee,
        parentVsize,
        new BigNumber(childTxTemplate.currentFee),
        childTxTemplate.estimatedVsize,
        parseFloat(txAnalyzer.cpfpFeeRate),
      )
    ) {
      break; // Stop adding inputs once CPFP fee requirements are met
    }
    // Skip if this UTXO is already added
    if (
      childTxTemplate.inputs.some(
        (input) => input.txid === utxo.txid && input.vout === utxo.vout,
      )
    ) {
      continue;
    }
    childTxTemplate.addInput(BtcTxInputTemplate.fromUTXO(utxo));
  }

  // Step 7: Calculate and set the change output amount
  const totalInputAmount = new BigNumber(childTxTemplate.getTotalInputAmount());
  const fee = new BigNumber(childTxTemplate.targetFeesToPay);
  const changeAmount = totalInputAmount.minus(fee);

  if (changeAmount.lte(dustThreshold)) {
    if (strict) {
      throw new Error(
        "Change amount is below the dust threshold. Increase inputs or reduce fee rate.",
      );
    } else {
      console.warn(
        "Change amount is below dust threshold. Adjusting transaction.",
      );

      childTxTemplate.adjustChangeOutput();
    }
  } else {
    childTxTemplate.outputs[0].setAmount(changeAmount.toString());
  }

  childTxTemplate.outputs[0].setAmount(changeAmount.toString());

  // Step 8: Validate the child transaction
  if (!childTxTemplate.validate()) {
    throw new Error(
      "Failed to create a valid CPFP transaction. Ensure all inputs and outputs are valid and fee requirements are met.",
    );
  }

  // Step 9: Ensure the combined (parent + child) fee rate meets the target
  const parentSize = new BigNumber(analysis.vsize);
  const childSize = new BigNumber(childTxTemplate.estimatedVsize);
  const childFee = new BigNumber(childTxTemplate.currentFee);
  const combinedFeeRate = parentFee
    .plus(childFee)
    .dividedBy(parentSize.plus(childSize));

  if (combinedFeeRate.isLessThan(targetFeeRate)) {
    if (strict) {
      throw new Error(
        `Combined fee rate (${combinedFeeRate.toFixed(2)} sat/vB) is below the target CPFP fee rate (${targetFeeRate} sat/vB). Increase inputs or reduce fee rate.`,
      );
    } else {
      console.warn(
        `Combined fee rate (${combinedFeeRate.toFixed(2)} sat/vB) is below the target CPFP fee rate (${targetFeeRate} sat/vB). Transaction may confirm slower than expected.`,
      );
    }
  }

  // Step 10: Convert to PSBT and return as base64
  return childTxTemplate.toPsbt();
};
