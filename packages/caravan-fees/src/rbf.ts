import { TransactionAnalyzer } from "./transactionAnalyzer";
import { BtcTransactionTemplate } from "./btcTransactionTemplate";
import {
  BtcTxInputTemplate,
  BtcTxOutputTemplate,
} from "./btcTransactionComponents";
import {
  FeeBumpStrategy,
  CancelRbfOptions,
  AcceleratedRbfOptions,
} from "./types";
import BigNumber from "bignumber.js";

/**
 * Creates a cancel Replace-By-Fee (RBF) transaction.
 *
 * This function creates a new transaction that double-spends at least one input
 * from the original transaction, effectively cancelling it by sending all funds
 * to a new address minus the required fees.
 *
 * @param {CancelRbfOptions} options - Configuration options for creating the cancel RBF transaction.
 * @returns {string} The base64-encoded PSBT of the cancel RBF transaction.
 * @throws {Error} If RBF is not possible or if the transaction creation fails.
 *
 * @example
 * const cancelTx = createCancelRbfTransaction({
 *   originalTx: originalTxHex,
 *   availableInputs: availableUTXOs,
 *   cancelAddress: 'bc1q...', // cancel address
 *   network: Network.MAINNET,
 *   dustThreshold: '546',
 *   scriptType: 'P2WSH',
 *   requiredSigners: 2,
 *   totalSigners: 3,
 *   targetFeeRate: '10',
 *   absoluteFee: '1000',
 *   fullRBF: false,
 *   strict: true
 * });
 *
 * @see https://github.com/bitcoin/bips/blob/master/bip-0125.mediawiki BIP 125: Opt-in Full Replace-by-Fee Signaling
 * @see https://developer.bitcoin.org/devguide/transactions.html#locktime-and-sequence-number Bitcoin Core's guide on locktime and sequence numbers
 */
export const createCancelRbfTransaction = (
  options: CancelRbfOptions,
): string => {
  const {
    fullRBF = false,
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
    cancelAddress,
  } = options;
  // Step 1: Analyze the original transaction
  const txAnalyzer = new TransactionAnalyzer({
    txHex: originalTx,
    network,
    targetFeeRate,
    absoluteFee,
    availableUtxos: availableInputs,
    requiredSigners,
    totalSigners,
    addressType: scriptType,
  });

  txAnalyzer.assumeRBF = fullRBF;

  const analysis = txAnalyzer.analyze();

  // Step 2: Verify RBF possibility and suitability
  if (!analysis.canRBF) {
    if (fullRBF) {
      console.warn(
        "Transaction does not signal RBF. Proceeding with full RBF, which may not be accepted by all nodes.",
      );
    } else {
      throw new Error(
        "RBF is not possible for this transaction. Ensure at least one input has a sequence number < 0xfffffffe.",
      );
    }
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
    dustThreshold,
    network,
    scriptType,
    requiredSigners,
    totalSigners,
  });

  // Step 4: Add the cancellation output and delete all previous outputs

  newTxTemplate.addOutput(
    new BtcTxOutputTemplate({
      address: cancelAddress,
      amountSats: "0", // Temporary amount, will be adjusted later
      locked: false,
    }),
  );

  // TO DO (MRIGESH)
  // Add coin selection algorithm to add best suited input to start with

  // Step 5: Add one input from the original transaction
  const originalInputTemplates = txAnalyzer.getInputTemplates();
  const originalInput = availableInputs.find((utxo) =>
    originalInputTemplates.some(
      (template) => template.txid === utxo.txid && template.vout === utxo.vout,
    ),
  );

  if (!originalInput) {
    throw new Error(
      "None of the original transaction inputs found in available UTXOs.",
    );
  }

  newTxTemplate.addInput(BtcTxInputTemplate.fromUTXO(originalInput));

  // Step 6: Add more inputs if necessary to meet fee requirements
  for (const utxo of availableInputs) {
    if (newTxTemplate.feeRateSatisfied && newTxTemplate.areFeesPaid()) {
      break; // Stop adding inputs once fee requirements are met
    }
    // Skip if this UTXO is already added
    if (utxo.txid === originalInput.txid && utxo.vout === originalInput.vout) {
      continue;
    }
    newTxTemplate.addInput(BtcTxInputTemplate.fromUTXO(utxo));
  }

  // Step 7: Calculate and set the cancellation output amount
  const totalInputAmount = new BigNumber(newTxTemplate.getTotalInputAmount());
  const fee = new BigNumber(newTxTemplate.targetFeesToPay);
  const cancelOutputAmount = totalInputAmount.minus(fee);

  if (cancelOutputAmount.isLessThan(dustThreshold)) {
    if (strict) {
      throw new Error(
        "Cancel output would be dust. Increase inputs or fee rate.",
      );
    } else {
      console.warn(
        "Cancel output amount is below dust threshold. Adjusting transaction.",
      );
      newTxTemplate.outputs[0].setAmount("0");
    }
  } else {
    newTxTemplate.outputs[0].setAmount(cancelOutputAmount.toString());
  }

  // Step 8: Ensure the new transaction meets RBF requirements
  const currentFee = new BigNumber(newTxTemplate.currentFee);
  const minRequiredFee = new BigNumber(analysis.fee).plus(
    txAnalyzer.minimumRBFFee,
  );

  if (currentFee.isLessThan(minRequiredFee)) {
    if (strict) {
      throw new Error(
        `New transaction fee (${currentFee.toString()} sats) must be higher than the minimum required fee for RBF (${minRequiredFee.toString()} sats).`,
      );
    } else {
      console.warn(
        `New transaction fee (${currentFee.toString()} sats) is lower than the recommended minimum fee for RBF (${minRequiredFee.toString()} sats). Transaction may not be accepted by all nodes.`,
      );
    }
  }

  // Step 9: Validate the transaction
  if (!newTxTemplate.validate()) {
    throw new Error(
      "Failed to create a valid cancel RBF transaction. Ensure all inputs and outputs are valid and fee requirements are met.",
    );
  }

  // Step 10: Convert to PSBT and return as base64
  return newTxTemplate.toPsbt();
};

/**
 * Creates an accelerated Replace-By-Fee (RBF) transaction.
 *
 * This function creates a new transaction that replaces the original one
 * with a higher fee, aiming to accelerate its confirmation. It preserves
 * the original outputs except for the change output, which is adjusted to
 * accommodate the higher fee.
 *
 * @param {AcceleratedRbfOptions} options - Configuration options for creating the accelerated RBF transaction.
 * @returns {string} The base64-encoded PSBT of the accelerated RBF transaction.
 * @throws {Error} If RBF is not possible or if the transaction creation fails.
 *
 * @example
 * const acceleratedTx = createAcceleratedRbfTransaction({
 *   originalTx: originalTxHex,
 *   availableInputs: availableUTXOs,
 *   network: Network.MAINNET,
 *   dustThreshold: '546',
 *   scriptType: 'P2WSH',
 *   requiredSigners: 2,
 *   totalSigners: 3,
 *   targetFeeRate: '20',
 *   absoluteFee: '1000',
 *   changeIndex: 1,
 *   changeAddress: 'bc1q...',
 *   fullRBF: false,
 *   strict: true
 * });
 *
 * @see https://github.com/bitcoin/bips/blob/master/bip-0125.mediawiki BIP 125: Opt-in Full Replace-by-Fee Signaling
 * @see https://developer.bitcoin.org/devguide/transactions.html#locktime-and-sequence-number Bitcoin Core's guide on locktime and sequence numbers
 */
export const createAcceleratedRbfTransaction = (
  options: AcceleratedRbfOptions,
): string => {
  const {
    fullRBF = false,
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
    changeIndex,
    changeAddress,
  } = options;

  if (changeIndex === undefined && !changeAddress) {
    throw new Error(
      "Either changeIndex or changeAddress must be provided for handling the change output.",
    );
  }

  // Step 1: Analyze the original transaction
  const txAnalyzer = new TransactionAnalyzer({
    txHex: originalTx,
    network,
    targetFeeRate, // We need this param ... very essential for the analyzer to make decisions cannot put it to 0
    absoluteFee,
    availableUtxos: availableInputs,
    requiredSigners,
    totalSigners,
    addressType: scriptType,
    changeOutputIndex: changeIndex,
  });

  txAnalyzer.assumeRBF = fullRBF;
  const analysis = txAnalyzer.analyze();

  // Step 2: Verify RBF possibility and suitability
  if (!analysis.canRBF) {
    if (fullRBF) {
      console.warn(
        "Transaction does not signal RBF. Proceeding with full RBF, which may not be accepted by all nodes.",
      );
    } else {
      throw new Error(
        "RBF is not possible for this transaction. Ensure at least one input has a sequence number < 0xfffffffe.",
      );
    }
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
    dustThreshold,
    network,
    scriptType,
    requiredSigners,
    totalSigners,
  });

  // Step 4: Add all non-change outputs from the original transaction
  txAnalyzer.getOutputTemplates().forEach((outputTemplate) => {
    if (!outputTemplate.isMalleable) {
      newTxTemplate.addOutput(
        new BtcTxOutputTemplate({
          address: outputTemplate.address,
          amountSats: outputTemplate.amountSats,
          locked: true,
        }),
      );
    }
  });

  // Step 5: Add at least one input from the original transaction
  let singleInputAdded = false;
  txAnalyzer.getInputTemplates().forEach((inputTemplate) => {
    const input = availableInputs.find(
      (utxo) =>
        inputTemplate.txid === utxo.txid && inputTemplate.vout === utxo.vout,
    );
    if (input) {
      newTxTemplate.addInput(BtcTxInputTemplate.fromUTXO(input));
      singleInputAdded = true;
    }
  });

  // Check if at least one original input was added
  if (!singleInputAdded) {
    throw new Error(
      "None of the original transaction's inputs were found in available UTXOs. At least one original input is required for RBF.",
    );
  }

  // Step 6: Add more inputs if necessary to meet fee requirements
  for (const utxo of availableInputs) {
    if (newTxTemplate.feeRateSatisfied && newTxTemplate.areFeesPaid()) {
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
    newTxTemplate.addInput(BtcTxInputTemplate.fromUTXO(utxo));
  }

  // Step 7: Add or adjust change output
  if (newTxTemplate.needsChangeOutput) {
    const totalInputAmount = new BigNumber(newTxTemplate.getTotalInputAmount());
    const totalOutputAmount = new BigNumber(
      newTxTemplate.getTotalOutputAmount(),
    );
    const fee = new BigNumber(newTxTemplate.targetFeesToPay);
    const changeAmount = totalInputAmount.minus(totalOutputAmount).minus(fee);

    if (changeAmount.gt(dustThreshold)) {
      const changeOutput = new BtcTxOutputTemplate({
        address: changeAddress || txAnalyzer.outputs[changeIndex!].address,
        amountSats: changeAmount.toString(),
        locked: false,
      });
      newTxTemplate.addOutput(changeOutput);
    } else if (strict) {
      throw new Error(
        "Change amount is below dust threshold. Increase inputs or reduce fee rate.",
      );
    } else {
      console.warn(
        "Change amount is below dust threshold. Omitting change output.",
      );
    }

    newTxTemplate.adjustChangeOutput();
  }

  // Step 8: Ensure the new transaction meets RBF requirements
  const currentFee = new BigNumber(newTxTemplate.currentFee);
  const minRequiredFee = new BigNumber(analysis.fee).plus(
    txAnalyzer.minimumRBFFee,
  );

  if (currentFee.isLessThan(minRequiredFee)) {
    if (strict) {
      throw new Error(
        `New transaction fee (${currentFee.toString()} sats) must be higher than the minimum required fee for RBF (${minRequiredFee.toString()} sats).`,
      );
    } else {
      console.warn(
        `New transaction fee (${currentFee.toString()} sats) is lower than the recommended minimum fee for RBF (${minRequiredFee.toString()} sats). Transaction may not be accepted by all nodes.`,
      );
    }
  }

  // Step 9: Validate the transaction
  if (!newTxTemplate.validate()) {
    throw new Error(
      "Failed to create a valid accelerated RBF transaction. Ensure all inputs and outputs are valid and fee requirements are met.",
    );
  }

  // Step 10: Convert to PSBT and return as base64
  return newTxTemplate.toPsbt();
};
