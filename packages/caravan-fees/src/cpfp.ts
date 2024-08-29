import { TransactionAnalyzer } from "./transactionAnalyzer";
import { BtcTransactionTemplate } from "./btcTransactionTemplate";
import {
  BtcTxInputTemplate,
  BtcTxOutputTemplate,
} from "./btcTransactionComponents";
import { Network } from "@caravan/bitcoin";
import { TxOutputType, UTXO, FeeBumpStrategy, Satoshis } from "./types";
import BigNumber from "bignumber.js";

/**
 * Creates a Child-Pays-for-Parent (CPFP) transaction to accelerate the confirmation
 * of an unconfirmed parent transaction.
 *
 * This function creates a new transaction (child) that spends an output from the
 * original unconfirmed transaction (parent). The child transaction includes a higher
 * fee to incentivize miners to confirm both the parent and child transactions together.
 *
 * @param {string} originalTx - The hex-encoded original (parent) transaction to be accelerated.
 * @param {UTXO[]} availableInputs - Array of available UTXOs, including the spendable output from the parent transaction.
 * @param {number} spendableOutputIndex - The index of the output in the parent transaction that will be spent in the child transaction.
 * @param {string} changeAddress - The address where any excess funds (change) will be sent in the child transaction.
 * @param {Network} network - The Bitcoin network being used (e.g., mainnet, testnet).
 * @param {Satoshis} dustThreshold - The dust threshold in satoshis. Outputs below this value are considered "dust".
 * @param {string} scriptType - The type of script used for the transaction (e.g., P2PKH, P2SH, P2WSH).
 * @param {Satoshis} absoluteFee - The absolute fee of the original transaction in satoshis.
 * @param {number} requiredSigners - The number of required signers for the multisig setup.
 * @param {number} totalSigners - The total number of signers in the multisig setup.
 * @param {boolean} [strict=false] - If true, enforces stricter validation rules.
 * @returns {string} The base64-encoded PSBT of the CPFP (child) transaction.
 * @throws {Error} If CPFP is not possible or if the transaction creation fails.
 *
 * @example
 * const cpfpTx = createCPFPTransaction(
 *   originalTxHex,
 *   availableUTXOs,
 *   1, // spendable output index
 *   'bc1q...', // change address
 *   Network.MAINNET,
 *   '546', // dust threshold
 *   'P2WSH',
 *   '1000', // absolute fee
 *   2, // required signers
 *   3,  // total signers
 *   true // strict mode
 * );
 *
 * @see https://bitcoinops.org/en/topics/cpfp/ Bitcoin Optech on Child Pays for Parent
 * @see https://github.com/bitcoin/bips/blob/master/bip-0125.mediawiki#implementation-details-1 BIP 125: Implementation details related to CPFP
 */
export const createCPFPTransaction = (
  originalTx: string,
  availableInputs: UTXO[],
  spendableOutputIndex: number,
  changeAddress: string,
  network: Network,
  dustThreshold: Satoshis,
  scriptType: string,
  absoluteFee: Satoshis,
  requiredSigners: number,
  totalSigners: number,
  strict: boolean = false,
): string => {
  // Step 1: Analyze the original transaction
  const txAnalyzer = new TransactionAnalyzer({
    txHex: originalTx,
    network,
    targetFeeRate: 0, // We'll use the analyzer's recommendation
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

  childTxTemplate.addInput(
    new BtcTxInputTemplate({
      txid: analysis.txid,
      vout: spendableOutputIndex,
      amountSats: parentOutputUTXO.value.toString(),
    }),
  );

  // Step 5: Add a change output (at least 1 output required for a valid transaction)
  childTxTemplate.addOutput(
    new BtcTxOutputTemplate({
      address: changeAddress,
      amountSats: "0", // Initial amount, will be adjusted later
      type: TxOutputType.CHANGE,
    }),
  );

  // Step 6: Add additional inputs if necessary to cover the fee
  for (const utxo of availableInputs) {
    if (childTxTemplate.feeRateSatisfied && childTxTemplate.areFeesPaid()) {
      break; // Stop adding inputs once fee requirements are met
    }
    // Skip if this UTXO is already added
    if (
      childTxTemplate.inputs.some(
        (input) => input.txid === utxo.txid && input.vout === utxo.vout,
      )
    ) {
      continue;
    }
    childTxTemplate.addInput(
      new BtcTxInputTemplate({
        txid: utxo.txid,
        vout: utxo.vout,
        amountSats: utxo.value.toString(),
      }),
    );
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
  const parentFee = new BigNumber(analysis.fee);
  const childFee = new BigNumber(childTxTemplate.currentFee);
  const combinedFeeRate = parentFee
    .plus(childFee)
    .dividedBy(parentSize.plus(childSize));

  const cpfpFeeRate = new BigNumber(txAnalyzer.cpfpFeeRate);

  if (combinedFeeRate.isLessThan(cpfpFeeRate)) {
    if (strict) {
      throw new Error(
        `Combined fee rate (${combinedFeeRate.toFixed(2)} sat/vB) is below the target CPFP fee rate (${txAnalyzer.cpfpFeeRate} sat/vB). Increase inputs or reduce fee rate.`,
      );
    } else {
      console.warn(
        `Combined fee rate (${combinedFeeRate.toFixed(2)} sat/vB) is below the target CPFP fee rate (${txAnalyzer.cpfpFeeRate} sat/vB). Transaction may confirm slower than expected.`,
      );
    }
  }

  // Step 10: Convert to PSBT and return as base64
  return childTxTemplate.toPsbt();
};
