import { TransactionAnalyzer } from "./transactionAnalyzer";
import { BtcTransactionTemplate } from "./btcTransactionTemplate";
import { Network } from "@caravan/bitcoin";
import {
  BtcTxInputTemplate,
  BtcTxOutputTemplate,
} from "./btcTransactionComponents";
import { Satoshis, TxOutputType, UTXO, FeeBumpStrategy } from "./types";

/**
 * Creates a cancel Replace-By-Fee (RBF) transaction.
 *
 * This function creates a new transaction that double-spends at least one input
 * from the original transaction, effectively cancelling it by sending all funds
 * to a new address minus the required fees.
 *
 * @param {string} originalTx - The hex-encoded original transaction to be replaced.
 * @param {UTXO[]} availableInputs - Array of available UTXOs, including the original transaction's inputs.
 * @param {string} cancelAddress - The address where all funds will be sent in the cancellation transaction.
 * @param {Network} network - The Bitcoin network being used (e.g., mainnet, testnet).
 * @param {number} dustThreshold -  The dust threshold in satoshis. Outputs below this value are considered
 "dust" and may not be economically viable to spend. This is used in Default Bitcoin Core value is 546 satoshis .
 * @param {string} scriptType - The type of script used for the transaction (e.g., P2PKH, P2SH, P2WSH).
 * @param {number} requiredSigners - The number of required signers for the multisig setup.
 * @param {number} totalSigners - The total number of signers in the multisig setup.
 * @returns {string} The base64-encoded PSBT of the cancel RBF transaction.
 * @throws {Error} If RBF is not possible or if the transaction creation fails.
 *
 * @example
 * const cancelTx = createCancelRbfTransaction(
 *   originalTxHex,
 *   availableUTXOs,
 *   'bc1q...', // cancel address
 *   Network.MAINNET,
 *   'P2WSH',
 *   2, // required signers
 *   3  // total signers
 * );
 *
 * @see https://github.com/bitcoin/bips/blob/master/bip-0125.mediawiki BIP 125: Opt-in Full Replace-by-Fee Signaling
 * @see https://developer.bitcoin.org/devguide/transactions.html#locktime-and-sequence-number Bitcoin Core's guide on locktime and sequence numbers
 */
export const createCancelRbfTransaction = (
  originalTx: string,
  availableInputs: UTXO[],
  cancelAddress: string,
  network: Network,
  dustThreshold: number,
  scriptType: string,
  requiredSigners: number,
  totalSigners: number,
): string => {
  // Step 1: Analyze the original transaction
  const txAnalyzer = new TransactionAnalyzer({
    txHex: originalTx,
    network,
    targetFeeRate: 0, // We'll use the analyzer's recommendation
    absoluteFee: 0, // This will be calculated by the analyzer
    availableUtxos: availableInputs,
    dustThreshold,
    requiredSigners,
    totalSigners,
    addressType: scriptType,
  });

  const analysis = txAnalyzer.analyze();

  // Step 2: Verify RBF possibility and suitability
  if (!analysis.canRBF) {
    throw new Error(
      "RBF is not possible for this transaction. Ensure at least one input has a sequence number < 0xfffffffe.",
    );
  }

  if (analysis.recommendedStrategy !== FeeBumpStrategy.RBF) {
    console.warn(
      "RBF is not the recommended strategy for this transaction. Consider using the recommended strategy: " +
        analysis.recommendedStrategy,
    );
  }

  // Step 3: Create a new transaction template
  const newTxTemplate = new BtcTransactionTemplate({
    inputs: [],
    outputs: [],
    targetFeeRate: Number(txAnalyzer.rbfFeeRate), // Use RBF-specific fee rate from analyzer
    dustThreshold: Number(txAnalyzer.getDustThreshold),
    network,
    scriptType,
    requiredSigners,
    totalSigners,
  });

  // Step 4: Add the cancellation output
  newTxTemplate.addOutput(
    new BtcTxOutputTemplate({
      address: cancelAddress,
      amountSats: 0, // Temporary amount, will be adjusted later
      type: TxOutputType.DESTINATION,
    }),
  );

  // Step 5: Add one input from the original transaction
  const originalInputTemplate = txAnalyzer.getInputTemplates()[0];
  const originalInput = availableInputs.find(
    (utxo) =>
      utxo.txid === originalInputTemplate.txid &&
      utxo.vout === originalInputTemplate.vout,
  );

  if (!originalInput) {
    throw new Error(
      "Original input not found in available UTXOs. Ensure availableInputs includes the original transaction's inputs.",
    );
  }

  newTxTemplate.addInput(
    new BtcTxInputTemplate({
      txid: originalInput.txid,
      vout: originalInput.vout,
      amountSats: originalInput.value,
    }),
  );

  // Step 6: Add more inputs if necessary to meet fee requirements
  for (const utxo of availableInputs) {
    if (newTxTemplate.feeRateSatisfied && newTxTemplate.areFeesPayPaid()) {
      break; // Stop adding inputs once fee requirements are met
    }
    // Skip if this UTXO is already added
    if (utxo.txid === originalInput.txid && utxo.vout === originalInput.vout) {
      continue;
    }
    newTxTemplate.addInput(
      new BtcTxInputTemplate({
        txid: utxo.txid,
        vout: utxo.vout,
        amountSats: utxo.value,
      }),
    );
  }

  // Step 7: Calculate and set the cancellation output amount
  const totalInputAmount = newTxTemplate.getTotalInputAmount();
  const fee = newTxTemplate.targetFeesToPay;
  const cancelOutputAmount = totalInputAmount - fee;
  newTxTemplate.outputs[0].setAmount(cancelOutputAmount);

  // Step 8: Ensure the new transaction meets RBF requirements
  const currentFee = newTxTemplate.currentFee;
  const originalFee = BigInt(analysis.fee);
  if (currentFee <= originalFee) {
    throw new Error(
      "New transaction fee must be higher than the original fee for RBF. Current fee: " +
        currentFee +
        ", Original fee: " +
        originalFee,
    );
  }

  // Step 9: Validate the transaction
  if (!newTxTemplate.validate()) {
    throw new Error(
      "Failed to create a valid cancel RBF transaction. Ensure all inputs and outputs are valid and fee requirements are met.",
    );
  }

  // Step 10: Convert to PSBT and return as base64
  const psbt = newTxTemplate.toPsbt();
  return psbt.serialize("base64");
};

/**
 * Creates an accelerated Replace-By-Fee (RBF) transaction.
 *
 * This function creates a new transaction that replaces the original one
 * with a higher fee, aiming to accelerate its confirmation. It preserves
 * the original outputs except for the change output, which is adjusted to
 * accommodate the higher fee.
 *
 * @param {string} originalTx - The hex-encoded original transaction to be replaced.
 * @param {UTXO[]} availableInputs - Array of available UTXOs, including the original transaction's inputs.
 * @param {number} [changeIndex] - The index of the change output in the original transaction.
 * @param {string} [changeAddress] - The address to use for the new change output, if different from the original.
 * @param {Network} network - The Bitcoin network being used (e.g., mainnet, testnet).
 * @param {number} dustThreshold -  The dust threshold in satoshis. Outputs below this value are considered
 "dust" and may not be economically viable to spend. This is used in Default Bitcoin Core value is 546 satoshis .
 * @param {string} scriptType - The type of script used for the transaction (e.g., P2PKH, P2SH, P2WSH).
 * @param {number} requiredSigners - The number of required signers for the multisig setup.
 * @param {number} totalSigners - The total number of signers in the multisig setup.
 * @returns {string} The base64-encoded PSBT of the accelerated RBF transaction.
 * @throws {Error} If RBF is not possible or if the transaction creation fails.
 *
 * @example
 * const acceleratedTx = createAcceleratedRbfTransaction(
 *   originalTxHex,
 *   availableUTXOs,
 *   1, // change output index
 *   'bc1q...', // new change address (optional)
 *   Network.MAINNET,
 *   'P2WSH',
 *   2, // required signers
 *   3  // total signers
 * );
 *
 * @see https://github.com/bitcoin/bips/blob/master/bip-0125.mediawiki BIP 125: Opt-in Full Replace-by-Fee Signaling
 * @see https://developer.bitcoin.org/devguide/transactions.html#locktime-and-sequence-number Bitcoin Core's guide on locktime and sequence numbers
 */
export const createAcceleratedRbfTransaction = (
  originalTx: string,
  availableInputs: UTXO[],
  network: Network,
  dustThreshold: number,
  scriptType: string,
  requiredSigners: number,
  totalSigners: number,
  changeIndex?: number,
  changeAddress?: string,
): string => {
  if (changeIndex === undefined && !changeAddress) {
    throw new Error(
      "Either changeIndex or changeAddress must be provided for handling the change output.",
    );
  }

  // Step 1: Analyze the original transaction
  const txAnalyzer = new TransactionAnalyzer({
    txHex: originalTx,
    network,
    dustThreshold,
    targetFeeRate: 0, // We'll use the analyzer's recommendation
    absoluteFee: 0, // This will be calculated by the analyzer
    availableUtxos: availableInputs,
    requiredSigners,
    totalSigners,
    addressType: scriptType,
    changeOutputIndex: changeIndex,
  });

  const analysis = txAnalyzer.analyze();

  // Step 2: Verify RBF possibility and suitability
  if (!analysis.canRBF) {
    throw new Error(
      "RBF is not possible for this transaction. Ensure at least one input has a sequence number < 0xfffffffe.",
    );
  }

  if (analysis.recommendedStrategy !== FeeBumpStrategy.RBF) {
    console.warn(
      "RBF is not the recommended strategy for this transaction. Consider using the recommended strategy: " +
        analysis.recommendedStrategy,
    );
  }

  // Step 3: Create a new transaction template
  const newTxTemplate = new BtcTransactionTemplate({
    inputs: [],
    outputs: [],
    targetFeeRate: Number(txAnalyzer.rbfFeeRate), // Use RBF-specific fee rate from analyzer
    dustThreshold: Number(txAnalyzer.getDustThreshold),
    network,
    scriptType,
    requiredSigners,
    totalSigners,
  });

  // Step 4: Add all non-change outputs from the original transaction
  txAnalyzer.outputs.forEach((output, index) => {
    if (index !== changeIndex) {
      newTxTemplate.addOutput(
        new BtcTxOutputTemplate({
          address: output.address,
          amountSats: output.value as Satoshis,
          type: TxOutputType.DESTINATION,
        }),
      );
    }
  });

  // Step 5: Add all inputs from the original transaction
  txAnalyzer.getInputTemplates().forEach((inputTemplate) => {
    const input = availableInputs.find(
      (utxo) =>
        utxo.txid === inputTemplate.txid && utxo.vout === inputTemplate.vout,
    );
    if (!input) {
      throw new Error(
        `Input ${inputTemplate.txid}:${inputTemplate.vout} not found in available UTXOs. Ensure availableInputs includes the original transaction's inputs.`,
      );
    }
    newTxTemplate.addInput(
      new BtcTxInputTemplate({
        txid: input.txid,
        vout: input.vout,
        amountSats: input.value,
      }),
    );
  });

  // Step 6: Add more inputs if necessary to meet fee requirements
  for (const utxo of availableInputs) {
    if (newTxTemplate.feeRateSatisfied && newTxTemplate.areFeesPayPaid()) {
      break; // Stop adding inputs once fee requirements are met
    }
    // Skip if this UTXO is already added
    if (
      newTxTemplate.inputs.some(
        (input) => input.txid === utxo.txid && input.vout === utxo.vout,
      )
    ) {
      continue;
    }
    newTxTemplate.addInput(
      new BtcTxInputTemplate({
        txid: utxo.txid,
        vout: utxo.vout,
        amountSats: utxo.value,
      }),
    );
  }

  // Step 7: Add or adjust change output
  const totalInputAmount = newTxTemplate.getTotalInputAmount();
  const totalOutputAmount = newTxTemplate.getTotalOutputAmount();
  const fee = newTxTemplate.targetFeesToPay;
  const changeAmount = totalInputAmount - totalOutputAmount - fee;

  if (changeAmount > Number(txAnalyzer.getDustThreshold)) {
    const changeOutput = new BtcTxOutputTemplate({
      address: changeAddress || txAnalyzer.outputs[changeIndex!].address,
      amountSats: changeAmount,
      type: TxOutputType.CHANGE,
    });
    newTxTemplate.addOutput(changeOutput);
  }

  // Step 8: Ensure the new transaction meets RBF requirements
  const currentFee = newTxTemplate.currentFee;
  const originalFee = BigInt(analysis.fee);
  if (currentFee <= originalFee) {
    throw new Error(
      "New transaction fee must be higher than the original fee for RBF. Current fee: " +
        currentFee +
        ", Original fee: " +
        originalFee,
    );
  }

  // Step 9: Validate the transaction
  if (!newTxTemplate.validate()) {
    throw new Error(
      "Failed to create a valid accelerated RBF transaction. Ensure all inputs and outputs are valid and fee requirements are met.",
    );
  }

  // Step 10: Convert to PSBT and return as base64
  const psbt = newTxTemplate.toPsbt();
  return psbt.serialize("base64");
};
