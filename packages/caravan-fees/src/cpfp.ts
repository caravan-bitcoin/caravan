import { BigNumber } from "bignumber.js";

import {
  BtcTxInputTemplate,
  BtcTxOutputTemplate,
} from "./btcTransactionComponents";
import { BtcTransactionTemplate } from "./btcTransactionTemplate";
import { TransactionAnalyzer } from "./transactionAnalyzer";
import { FeeBumpStrategy, CPFPOptions, UTXO } from "./types";
import { createOutputScript } from "./utils";

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
    targetFeeRate, // We need this param. It is required for the analyzer to make decisions and so cannot be 0.
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
    if (strict) {
      throw new Error(
        `CPFP is not the recommended strategy for this transaction. The recommended strategy is: ${analysis.recommendedStrategy}`,
      );
    }
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
    ...(options.globalXpubs && { globalXpubs: options.globalXpubs }), // Only add if user-code provides us globalXpubs
  });

  // Step 4: Add the spendable output from the parent transaction as an input
  const parentOutput = txAnalyzer.outputs[spendableOutputIndex];
  if (!parentOutput) {
    throw new Error(
      `Spendable output at index ${spendableOutputIndex} not found in the parent transaction.`,
    );
  }

  // Create a UTXO from the parent transaction's output
  const parentOutputUTXO: UTXO = {
    txid: analysis.txid,
    vout: spendableOutputIndex,
    value: parentOutput.amountSats,
    witnessUtxo: {
      script: createOutputScript(parentOutput.address, network),
      value: parseInt(parentOutput.amountSats),
    },

    prevTxHex: originalTx,
  };

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

  for (const utxo of availableInputs) {
    if (
      isCPFPFeeSatisfied(txAnalyzer, childTxTemplate) &&
      childTxTemplate.needsChange
    ) {
      break; // Stop adding inputs once CPFP fee requirements and change requirements (to ensure we don't end up with dust Output) are met
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

  // needsChange returns true if there is enough left over greater than dust.
  // Since we already added a zero amount output for change, it takes into account the full size of the tx.
  if (!childTxTemplate.needsChange && strict) {
    throw new Error(
      "Not enough inputs to create a non-dusty change output in the child transaction",
    );
  }

  // Step 7: Calculate and set the change output amount
  childTxTemplate.adjustChangeOutput();

  // Step 8: Validate the child transaction
  if (!childTxTemplate.validate()) {
    throw new Error(
      "Failed to create a valid CPFP transaction. Ensure all inputs and outputs are valid and fee requirements are met.",
    );
  }

  // Step 9: Validate the combined (parent + child) fee rate
  validateCPFPPackage(txAnalyzer, childTxTemplate, strict);

  // Step 10: Convert to PSBT and return as base64
  return childTxTemplate.toPsbt(true);
};

/**
 * Determines if the combined fee rate of a parent and child transaction meets or exceeds
 * the target fee rate for a Child-Pays-for-Parent (CPFP) transaction.
 *
 * This function calculates the combined fee rate of a parent transaction and its child
 * (CPFP) transaction, then compares it to the target fee rate. It's used to ensure that
 * the CPFP transaction provides sufficient fee incentive for miners to include both
 * transactions in a block.
 *
 * The combined fee rate is calculated as:
 * (parentFee + childFee) / (parentVsize + childVsize)
 *
 * @param {TransactionAnalyzer} txAnalyzer - The analyzer containing parent transaction information and CPFP fee rate.
 * @param {BtcTransactionTemplate} childTxTemplate - The child transaction template.
 * @returns {boolean} True if the combined fee rate meets or exceeds the target fee rate, false otherwise.
 *
 * @example
 * const txAnalyzer = new TransactionAnalyzer({...});
 * const childTxTemplate = new BtcTransactionTemplate({...});
 * const isSatisfied = isCPFPFeeSatisfied(txAnalyzer, childTxTemplate);
 * console.log(isSatisfied); // true or false
 *
 * @throws {Error} If any of the input parameters are negative.
 */
export function isCPFPFeeSatisfied(
  txAnalyzer: TransactionAnalyzer,
  childTxTemplate: BtcTransactionTemplate,
): boolean {
  // Input validation
  if (!txAnalyzer || !childTxTemplate) {
    throw new Error("Invalid analyzer or child transaction template.");
  }
  const parentFee = new BigNumber(txAnalyzer.fee);
  const parentVsize = txAnalyzer.vsize;
  const childFee = new BigNumber(childTxTemplate.currentFee);
  const childVsize = childTxTemplate.estimatedVsize;
  const targetFeeRate = parseFloat(txAnalyzer.cpfpFeeRate);

  const combinedFee = parentFee.plus(childFee);
  const combinedVsize = parentVsize + childVsize;
  const combinedFeeRate = combinedFee.dividedBy(combinedVsize);

  return combinedFeeRate.gte(targetFeeRate);
}

/**
 * Validates that the combined fee rate of a parent and child transaction
 * meets or exceeds the target fee rate for a Child-Pays-for-Parent (CPFP) transaction.
 *
 * This function calculates the combined fee rate of the parent transaction (from the analyzer)
 * and its child transaction, then compares it to the target CPFP fee rate. It ensures
 * that the CPFP transaction provides sufficient fee incentive for miners to include both
 * transactions in a block.
 *
 * @param {TransactionAnalyzer} txAnalyzer - The analyzer containing parent transaction information and CPFP fee rate.
 * @param {BtcTransactionTemplate} childTxTemplate - The child transaction template.
 * @param {boolean} strict - If true, throws an error when the fee rate is not satisfied. If false, only logs a warning.
 * @returns {void}
 *
 * @throws {Error} If the combined fee rate is below the target fee rate in strict mode.
 */
export function validateCPFPPackage(
  txAnalyzer: TransactionAnalyzer,
  childTxTemplate: BtcTransactionTemplate,
  strict: boolean,
): void {
  const parentFee = new BigNumber(txAnalyzer.fee);
  const parentSize = new BigNumber(txAnalyzer.vsize);
  const childFee = new BigNumber(childTxTemplate.currentFee);
  const childSize = new BigNumber(childTxTemplate.estimatedVsize);

  const combinedFeeRate = parentFee
    .plus(childFee)
    .dividedBy(parentSize.plus(childSize));

  if (combinedFeeRate.isLessThan(txAnalyzer.targetFeeRate)) {
    const message = `Combined fee rate (${combinedFeeRate.toFixed(2)} sat/vB) is below the target CPFP fee rate (${txAnalyzer.targetFeeRate.toFixed(2)} sat/vB). ${strict ? "Increase inputs or reduce fee rate." : "Transaction may confirm slower than expected."}`;

    if (strict) {
      throw new Error(message);
    } else {
      console.warn(message);
    }
  }
}
