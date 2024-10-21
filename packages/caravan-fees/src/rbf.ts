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
  UTXO,
} from "./types";
import BigNumber from "bignumber.js";

/**
 * RBF (Replace-By-Fee) Transaction Creation
 *
 * SECURITY NOTE: By default, these functions reuse all inputs from the original
 * transaction in the replacement transaction for acceleration. This is to prevent the "replacement
 * cycle attack" where multiple versions of a transaction could potentially be
 * confirmed if they don't conflict with each other.
 *
 * If you choose to set `reuseAllInputs` to false, be aware of the risks outlined here:
 * https://bitcoinops.org/en/newsletters/2023/10/25/#fn:rbf-warning
 *
 * Only set `reuseAllInputs` to false if you fully understand these risks and have
 * implemented appropriate safeguards in your wallet software.
 */

// Create a utility type for common RBF options
type RbfBaseOptions = Omit<CancelRbfOptions, "cancelAddress">;

/**
 * Validates RBF possibility and suitability.
 * @param analysis - The result of transaction analysis.
 * @param targetFeeRate - The target fee rate for the new transaction.
 * @param fullRBF - Whether to allow full RBF even if not signaled.
 * @param strict - Whether to throw errors for non-recommended strategies.
 */
const validateRbfPossibility = (
  analysis: ReturnType<TransactionAnalyzer["analyze"]>,
  targetFeeRate: number,
  fullRBF: boolean,
  strict: boolean,
): void => {
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
    if (strict) {
      throw new Error(
        `RBF is not the recommended strategy for this transaction. The recommended strategy is: ${analysis.recommendedStrategy}`,
      );
    }
    console.warn(
      `RBF is not the recommended strategy for this transaction. Consider using the recommended strategy: ${analysis.recommendedStrategy}`,
    );
  }

  if (new BigNumber(targetFeeRate).isLessThanOrEqualTo(analysis.feeRate)) {
    throw new Error(
      `Target fee rate (${targetFeeRate} sat/vB) must be higher than the original transaction's fee rate (${analysis.feeRate} sat/vB).`,
    );
  }
};

/**
 * Adds inputs from the original transaction to the new transaction template.
 * @param txAnalyzer - The transaction analyzer instance.
 * @param availableInputs - Available UTXOs.
 * @param options - RBF options.
 * @param isAccelerated - Whether this is for an accelerated RBF transaction.
 * @returns A new BtcTransactionTemplate instance with inputs added and a set of added input identifiers.
 */
const addOriginalInputs = (
  txAnalyzer: TransactionAnalyzer,
  availableInputs: UTXO[],
  options: RbfBaseOptions,
  isAccelerated: boolean,
): { newTxTemplate: BtcTransactionTemplate; addedInputs: Set<string> } => {
  const newTxTemplate = new BtcTransactionTemplate({
    inputs: [],
    outputs: [],
    targetFeeRate: options.targetFeeRate,
    dustThreshold: options.dustThreshold,
    network: options.network,
    scriptType: options.scriptType,
    requiredSigners: options.requiredSigners,
    totalSigners: options.totalSigners,
  });

  const originalInputTemplates = txAnalyzer.getInputTemplates();
  const addedInputs = new Set<string>();

  if (options.reuseAllInputs) {
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
  } else if (isAccelerated) {
    console.warn(
      "Not reusing all inputs can lead to a replacement cycle attack. " +
        "See: https://bitcoinops.org/en/newsletters/2023/10/25/#fn:rbf-warning",
    );

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

  return { newTxTemplate, addedInputs };
};

/**
 * Adds additional inputs to meet fee requirements.
 * @param newTxTemplate - The transaction template to add inputs to.
 * @param availableInputs - Available UTXOs.
 * @param addedInputs - Set of already added input identifiers.
 * @param txAnalyzer - The transaction analyzer instance.
 */
const addAdditionalInputs = (
  newTxTemplate: BtcTransactionTemplate,
  availableInputs: UTXO[],
  addedInputs: Set<string>,
  txAnalyzer: TransactionAnalyzer,
): void => {
  // We continue adding inputs until both the fee rate is satisfied and
  // the absolute fee meets the minimum RBF requirement
  for (const utxo of availableInputs) {
    if (
      newTxTemplate.feeRateSatisfied &&
      new BigNumber(newTxTemplate.currentFee).gte(txAnalyzer.minimumRBFFee) &&
      (newTxTemplate.needsChange || newTxTemplate.outputs.length > 0)
    ) {
      /*
        Stop adding inputs when the following conditions are met:
         1. The fee rate satisfies the target rate (which must be gte original tx fee rate)
         2. The current fee is gte the minimum required absolute RBF fee amount
         3. The tx already has an output or will have enough excess funds to have a change output added
      */
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
};

/**
 * Ensures the new transaction meets RBF requirements.
 * @param newTxTemplate - The new transaction template.
 * @param txAnalyzer - The transaction analyzer instance.
 */
const validateRbfRequirements = (
  newTxTemplate: BtcTransactionTemplate,
  txAnalyzer: TransactionAnalyzer,
): void => {
  const currentFee = new BigNumber(newTxTemplate.currentFee);
  const minRequiredFee = new BigNumber(txAnalyzer.minimumRBFFee);
  const targetFee = new BigNumber(newTxTemplate.targetFeesToPay);

  // Check 1: New fee must be at least the minimum RBF fee
  if (currentFee.isLessThan(minRequiredFee)) {
    throw new Error(
      `New transaction fee (${currentFee.toString()} sats) must be at least the minimum RBF fee (${minRequiredFee.toString()} sats).`,
    );
  }

  // Check 2: Target fees must be paid
  if (currentFee.isLessThan(targetFee)) {
    throw new Error(
      `New transaction fee (${currentFee.toString()} sats) is less than the target fee (${targetFee.toString()} sats).`,
    );
  }
};

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

  // Validate that the target fee rate is higher than the original transaction's fee rate
  if (new BigNumber(targetFeeRate).isLessThanOrEqualTo(analysis.feeRate)) {
    throw new Error(
      `Target fee rate (${targetFeeRate} sat/vB) must be higher than the original transaction's fee rate (${analysis.feeRate} sat/vB).`,
    );
  }

  // Step 2: Verify RBF possibility and suitability
  validateRbfPossibility(analysis, targetFeeRate, fullRBF, strict);

  // Step 3: Create a new transaction template
  // Step 4: Add inputs from the original transaction
  const { newTxTemplate, addedInputs } = addOriginalInputs(
    txAnalyzer,
    availableInputs,
    { ...options, reuseAllInputs },
    false, // Not an accelerated transaction
  );

  // Step 5: Add the cancellation output
  newTxTemplate.addOutput(
    new BtcTxOutputTemplate({
      address: cancelAddress,
      amountSats: "0", // Temporary amount, will be adjusted later
      locked: false,
    }),
  );

  // Step 6: Add more inputs if necessary to meet fee requirements
  addAdditionalInputs(newTxTemplate, availableInputs, addedInputs, txAnalyzer);

  // Step 7: Calculate and set the cancellation output amount
  // Note : We cannot use `newTxTemplate.adjustChangeOutput()` here as we need to set fees first (as per RBF rules) and then set change amount

  const totalInputAmount = new BigNumber(newTxTemplate.totalInputAmount);
  const totalOutputAmount = new BigNumber(newTxTemplate.totalOutputAmount);
  const fee = BigNumber.max(
    newTxTemplate.targetFeesToPay,
    txAnalyzer.minimumRBFFee,
  );
  const cancelOutputAmount = totalInputAmount
    .minus(totalOutputAmount)
    .minus(fee);
  newTxTemplate.outputs[0].setAmount(cancelOutputAmount.toString());

  // Step 8: Ensure the new transaction meets RBF requirements
  validateRbfRequirements(newTxTemplate, txAnalyzer);

  // Step 9: Convert to PSBT and return as base64
  return newTxTemplate.toPsbt(true);
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
    changeIndex,
    changeAddress,
    reuseAllInputs = true,
  } = options;

  // Step 1: Validate change output options
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

  // Step 2: Analyze the original transaction
  const txAnalyzer = new TransactionAnalyzer({
    txHex: originalTx,
    network,
    targetFeeRate,
    absoluteFee,
    availableUtxos: availableInputs,
    requiredSigners,
    totalSigners,
    addressType: scriptType,
    changeOutputIndex: changeIndex,
  });

  txAnalyzer.assumeRBF = fullRBF;

  const analysis = txAnalyzer.analyze();

  // Step 3: Validate RBF possibility and suitability
  validateRbfPossibility(analysis, targetFeeRate, fullRBF, strict);

  // Step 4: Create a new transaction template
  // Step 5: Add inputs from the original transaction
  const { newTxTemplate, addedInputs } = addOriginalInputs(
    txAnalyzer,
    availableInputs,
    { ...options, reuseAllInputs },
    true, // This is an accelerated transaction
  );

  // Step 6: Add all non-change outputs from the original transaction
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

  // Step 7: Add additional inputs if necessary
  addAdditionalInputs(newTxTemplate, availableInputs, addedInputs, txAnalyzer);

  // Step 8: Add or adjust change output
  if (newTxTemplate.needsChangeOutput) {
    const totalInputAmount = new BigNumber(newTxTemplate.totalInputAmount);
    const totalOutputAmount = new BigNumber(newTxTemplate.totalOutputAmount);
    const fee = BigNumber.max(
      newTxTemplate.targetFeesToPay,
      txAnalyzer.minimumRBFFee,
    );
    const changeAmount = totalInputAmount.minus(totalOutputAmount).minus(fee);

    const changeOutput = new BtcTxOutputTemplate({
      address: changeAddress || txAnalyzer.outputs[changeIndex!].address,
      amountSats: changeAmount.toString(),
      locked: false,
    });

    newTxTemplate.addOutput(changeOutput);
    newTxTemplate.adjustChangeOutput();
  }

  // Step 9: Validate RBF requirements
  validateRbfRequirements(newTxTemplate, txAnalyzer);

  // Step 10: Convert to PSBT and return as base64
  return newTxTemplate.toPsbt(true);
};
