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
 * RBF (Replace-By-Fee) Transaction Creation
 *
 * SECURITY NOTE: By default, these functions reuse all inputs from the original
 * transaction in the replacement transaction while acceleration. This is to prevent the "replacement
 * cycle attack" where multiple versions of a transaction could potentially be
 * confirmed if they don't conflict with each other.
 *
 * If you choose to set `reuseAllInputs` to false, be aware of the risks outlined here:
 * https://bitcoinops.org/en/newsletters/2023/10/25/#fn:rbf-warning
 *
 * Only set `reuseAllInputs` to false if you fully understand these risks and have
 * implemented appropriate safeguards in your wallet software.
 */

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
 *   reuseAllInputs: false, // Default behavior, more efficient fee wise
 * });
 *
 * @see https://github.com/bitcoin/bips/blob/master/bip-0125.mediawiki BIP 125: Opt-in Full Replace-by-Fee Signaling
 * @see https://developer.bitcoin.org/devguide/transactions.html#locktime-and-sequence-number Bitcoin Core's guide on locktime and sequence numbers
 * @see https://bitcoinops.org/en/newsletters/2023/10/25/#fn:rbf-warning Bitcoin Optech on replacement cycle attacks
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
    reuseAllInputs = false,
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
  const originalTxFee = new BigNumber(txAnalyzer.fee);

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

  // Step 5: Add inputs from the original transaction
  const originalInputTemplates = txAnalyzer.getInputTemplates();
  const addedInputs = new Set();

  if (reuseAllInputs) {
    // Add all original inputs
    originalInputTemplates.forEach((template) => {
      const input = availableInputs.find(
        (utxo) => utxo.txid === template.txid && utxo.vout === template.vout,
      );
      if (input) {
        newTxTemplate.addInput(BtcTxInputTemplate.fromUTXO(input));
        addedInputs.add(`${input.txid}:${input.vout}`);
      }
    });
  } else {
    // Add at least one input from the original transaction

    // TO DO (MRIGESH)
    // Add coin selection algorithm to add best suited input to start with ...
    const originalInput = availableInputs.find((utxo) =>
      originalInputTemplates.some(
        (template) =>
          template.txid === utxo.txid && template.vout === template.vout,
      ),
    );
    if (!originalInput) {
      throw new Error(
        "None of the original transaction inputs found in available UTXOs.",
      );
    }
    newTxTemplate.addInput(BtcTxInputTemplate.fromUTXO(originalInput));
    addedInputs.add(`${originalInput.txid}:${originalInput.vout}`);
  }

  // Step 6: Add more inputs if necessary to meet fee requirements

  // We continue adding inputs until both the fee rate is satisfied and
  // the absolute fee meets the minimum RBF requirement
  for (const utxo of availableInputs) {
    if (
      newTxTemplate.feeRateSatisfied &&
      new BigNumber(newTxTemplate.currentFee).gte(
        BigNumber.max(newTxTemplate.targetFeesToPay, originalTxFee),
      )
    ) {
      // Stop adding inputs when both conditions are met:
      // 1. The fee rate satisfies the target rate
      // 2. The current fee is greater than or equal to the maximum of:
      //    a) The target fee based on the desired rate by user
      //    b) The minimum fee required for a valid RBF replacement >= original fees
      break;
    }
    // Skip if this UTXO is already added
    const utxoKey = `${utxo.txid}:${utxo.vout}`;
    if (addedInputs.has(utxoKey)) {
      continue;
    }
    newTxTemplate.addInput(BtcTxInputTemplate.fromUTXO(utxo));
    addedInputs.add(utxoKey);
  }

  // Step 7: Calculate and set the cancellation output amount

  const totalInputAmount = new BigNumber(newTxTemplate.getTotalInputAmount());
  // Ensure we're using the higher of the target fee and the original fee
  const fee = BigNumber.max(newTxTemplate.targetFeesToPay, originalTxFee);
  // The cancel output receives all funds minus the fee
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
  const targetFeeForNewSize = new BigNumber(newTxTemplate.targetFeesToPay);

  // Calculate the minimum required fee as the maximum of:
  // 1. The original transaction fee (to satisfy RBF rules)
  // 2. The target fee for the new transaction size
  const minRequiredFee = BigNumber.max(originalTxFee, targetFeeForNewSize);

  if (currentFee.isLessThan(minRequiredFee)) {
    if (strict) {
      throw new Error(
        `New transaction fee (${currentFee.toString()} sats) must be at least ${minRequiredFee.toString()} sats. ` +
          `This is the higher of the original tx fee (${originalTxFee.toString()} sats) and ` +
          `the target fee for the new size (${targetFeeForNewSize.toString()} sats).`,
      );
    } else {
      console.warn(
        `New transaction fee (${currentFee.toString()} sats) is lower than the required minimum of ${minRequiredFee.toString()} sats. ` +
          `This is the higher of the original tx fee (${originalTxFee.toString()} sats) and ` +
          `the target fee for the new size (${targetFeeForNewSize.toString()} sats). ` +
          `Transaction may not be accepted by all nodes.`,
      );
    }
  } else if (currentFee.isGreaterThan(minRequiredFee.times(1.5))) {
    // Optional: Warn if the fee is significantly higher than necessary
    console.warn(
      `New transaction fee (${currentFee.toString()} sats) is significantly higher than the minimum required fee (${minRequiredFee.toString()} sats). ` +
        `Consider optimizing the fee to avoid overpayment.`,
    );
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
 *   reuseAllInputs: true, // Default behavior, safer option
 * });
 *
 * @see https://github.com/bitcoin/bips/blob/master/bip-0125.mediawiki BIP 125: Opt-in Full Replace-by-Fee Signaling
 * @see https://developer.bitcoin.org/devguide/transactions.html#locktime-and-sequence-number Bitcoin Core's guide on locktime and sequence numbers
 * @see https://bitcoinops.org/en/newsletters/2023/10/25/#fn:rbf-warning Bitcoin Optech on replacement cycle attacks
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
    reuseAllInputs = true,
  } = options;

  // Validate change output options
  if (changeIndex !== undefined && changeAddress !== undefined) {
    throw new Error(
      "Provide either changeIndex or changeAddress, not both. This ensures unambiguous handling of the change output.",
    );
  }
  if (changeIndex === undefined && changeAddress === undefined) {
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
  const originalTxFee = new BigNumber(txAnalyzer.fee);

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

  // Step 5: Add inputs from the original transaction
  const originalInputTemplates = txAnalyzer.getInputTemplates();

  if (reuseAllInputs) {
    // Add all original inputs
    originalInputTemplates.forEach((template) => {
      const input = availableInputs.find(
        (utxo) => utxo.txid === template.txid && utxo.vout === template.vout,
      );
      if (input) {
        newTxTemplate.addInput(BtcTxInputTemplate.fromUTXO(input));
      }
    });
  } else {
    console.warn(
      "Not reusing all inputs can lead to a replacement cycle attack. " +
        "See: https://bitcoinops.org/en/newsletters/2023/10/25/#fn:rbf-warning",
    );
    // Add at least one input from the original transaction
    let singleInputAdded = false;
    originalInputTemplates.some((template) => {
      const input = availableInputs.find(
        (utxo) => utxo.txid === template.txid && utxo.vout === template.vout,
      );
      if (input) {
        newTxTemplate.addInput(BtcTxInputTemplate.fromUTXO(input));
        singleInputAdded = true;
        return true; // Stop after adding one input
      }
      return false;
    });

    if (!singleInputAdded) {
      throw new Error(
        "None of the original transaction's inputs were found in available UTXOs. At least one original input is required for RBF.",
      );
    }
  }

  // Step 6: Add more inputs if necessary to meet fee requirements
  for (const utxo of availableInputs) {
    if (
      newTxTemplate.feeRateSatisfied &&
      new BigNumber(newTxTemplate.currentFee).gte(
        BigNumber.max(newTxTemplate.targetFeesToPay, originalTxFee),
      )
    ) {
      // Stop adding inputs when both conditions are met:
      // 1. The fee rate satisfies the target rate
      // 2. The current fee is greater than or equal to the maximum of:
      //    a) The target fee based on the desired rate by user
      //    b) The minimum fee required for a valid RBF replacement >= original fees
      break;
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
    // Ensure we're using the higher of the target fee and the original fees
    const fee = BigNumber.max(newTxTemplate.targetFeesToPay, originalTxFee);
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
  const targetFeeForNewSize = new BigNumber(newTxTemplate.targetFeesToPay);

  // Calculate the minimum required fee as the maximum of:
  // 1. The original transaction fee (to satisfy RBF rules)
  // 2. The target fee for the new transaction size
  const minRequiredFee = BigNumber.max(originalTxFee, targetFeeForNewSize);

  if (currentFee.isLessThan(minRequiredFee)) {
    if (strict) {
      throw new Error(
        `New transaction fee (${currentFee.toString()} sats) must be at least ${minRequiredFee.toString()} sats. ` +
          `This is the higher of the original tx fee (${originalTxFee.toString()} sats) and ` +
          `the target fee for the new size (${targetFeeForNewSize.toString()} sats).`,
      );
    } else {
      console.warn(
        `New transaction fee (${currentFee.toString()} sats) is lower than the required minimum of ${minRequiredFee.toString()} sats. ` +
          `This is the higher of the original tx fee (${originalTxFee.toString()} sats) and ` +
          `the target fee for the new size (${targetFeeForNewSize.toString()} sats). ` +
          `Transaction may not be accepted by all nodes.`,
      );
    }
  } else if (currentFee.isGreaterThan(minRequiredFee.times(1.5))) {
    // Optional: Warn if the fee is significantly higher than necessary
    console.warn(
      `New transaction fee (${currentFee.toString()} sats) is significantly higher than the minimum required fee (${minRequiredFee.toString()} sats). ` +
        `Consider optimizing the fee to avoid overpayment.`,
    );
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
