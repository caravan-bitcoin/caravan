import { bitcoinsToSatoshis } from "@caravan/bitcoin";

// TODO: All types should come from the `clients` package or a centralized type definition
// This discussion references the changes we need in future refactors :
// https://github.com/caravan-bitcoin/caravan/pull/225#discussion_r2048700059

/**
 * Check if a transaction output belongs to the wallet
 */
export const belongsToWallet = (
  output: { scriptPubkeyAddress?: string },
  walletAddresses: string[],
): boolean => {
  const outputAddress = output.scriptPubkeyAddress;
  return Boolean(outputAddress && walletAddresses.includes(outputAddress));
};

/**
 * Helper function to check if we have complete input data for a transaction
 */
export const hasCompleteInputData = (tx: any): boolean => {
  if (!tx.vin || !Array.isArray(tx.vin)) return false;

  return tx.vin.every(
    (input: any) =>
      input.prevout && input.prevout.scriptpubkey_address !== undefined,
  );
};

/**
 * Calculate transaction value from transaction details (private client)
 * This gives the most accurate calculation as bitcoind provides detailed category information and amount field
 * TODO: waiting for issue #192 (https://github.com/caravan-bitcoin/caravan/issues/192) to be fixed so we
 * have better typing for the details array
 */
export const calculateValueFromDetails = (details: any[]): number => {
  return details.reduce((valueToWallet, detail) => {
    const amountInSats = Number(bitcoinsToSatoshis(detail.amount));

    if (["receive", "generate", "immature", "send"].includes(detail.category)) {
      return valueToWallet + amountInSats;
    }

    return valueToWallet;
  }, 0);
};

/**
 * Convert output value to satoshis, handling both string and number formats
 */
export const outputValueToSatoshis = (value?: number | string): number => {
  return Number(bitcoinsToSatoshis(value ?? 0));
};

/**
 * Calculate value based on inputs and outputs when we have complete data
 */
export const calculateValueFromCompleteData = (
  tx: any,
  walletAddresses: string[],
): number => {
  // Sum all inputs from our wallet
  const walletInputsSum = tx.vin
    .filter(
      (input: any) =>
        input.prevout &&
        input.prevout.scriptpubkey_address &&
        walletAddresses.includes(input.prevout.scriptpubkey_address),
    )
    .reduce(
      (sum: number, input: any) =>
        sum + outputValueToSatoshis(input.prevout.value),
      0,
    );

  // Calculate total change (outputs back to our wallet)
  const totalChange = calculateTotalChange(tx, walletAddresses);

  // Net value = outputs to wallet - inputs from wallet
  return totalChange - walletInputsSum;
};

/**
 * Estimate transaction value when we only have outputs (incomplete input data)
 */
export const estimateValueFromOutputs = (
  tx: any,
  walletAddresses: string[],
  totalChange: number,
): number => {
  // If transaction is explicitly marked as received or we have outputs to our wallet addresses
  if (tx.isReceived && totalChange > 0) {
    return totalChange;
  }

  // If transaction is explicitly marked as sent
  if (!tx.isReceived) {
    // At minimum, we spent the fee
    let spentAmount = tx.fee ?? 0;

    // Add outputs to non-wallet addresses (funds leaving our wallet)
    spentAmount += tx.vout
      .filter(
        (output: any) =>
          output.scriptPubkeyAddress &&
          !walletAddresses.includes(output.scriptPubkeyAddress),
      )
      .reduce(
        (sum: number, output: any) => sum + outputValueToSatoshis(output.value),
        0,
      );

    // Value to wallet is negative spent amount
    return -spentAmount;
  }
  // If we can't determine direction, best guess is sum of outputs to our wallet
  return totalChange;
};

/**
 * Calculate wallet outputs sum for a transaction
 */
export const calculateTotalChange = (
  tx: any,
  walletAddresses: string[],
): number => {
  if (!tx?.vout || !Array.isArray(tx.vout)) return 0;
  return tx.vout
    .filter((output: any) => belongsToWallet(output, walletAddresses))
    .reduce((total: number, output: any) => {
      return total + outputValueToSatoshis(output.value);
    }, 0);
};

/**
 * ==============================================================================
 * WHY WE DON'T FETCH PREVIOUS TRANSACTIONS FOR INPUTS
 * ==============================================================================
 *
 * While it's technically possible to get more accurate data by looking up each input's
 * previous transaction, we don't implement this approach for several important reasons:
 *
 * 1. PERFORMANCE IMPACT: Each transaction with N inputs would require N additional
 *    API calls. For a transaction with 10 inputs, that's 10 more network requests.
 *
 * 2. RATE LIMITING: Public blockchain APIs typically have strict rate limits.
 *    This approach would quickly exhaust those limits, especially for wallets
 *    with many transactions.
 *
 * 3. USER EXPERIENCE: The transaction table would load much more slowly - potentially
 *    taking 5-10 seconds or more to display instead of near-instant loading.
 *
 * 4. RELIABILITY: If any of these additional lookups fail (timeouts, network issues),
 *    the calculations would be incomplete anyway.
 *
 * 5. PRIVACY: For private nodes, making these lookups means accessing transactions
 *    that might not be in your wallet, requiring txindex=1 (full transaction indexing)
 *    which many users don't enable.
 *
 * Instead, we use a combination of available data and heuristics to provide a good
 * estimate of transaction value without these additional network requests.
 */

/**
 * Calculate the net value of a transaction to the wallet
 * Returns value in satoshis (positive for incoming, negative for outgoing)
 */
export const calculateTransactionValue = (
  tx: any,
  walletAddresses: string[],
): number => {
  // Skip calculation if tx is invalid
  if (!tx) return 0;

  // CASE 1: Private client with details array - most accurate calculation
  if (tx.details && Array.isArray(tx.details)) {
    const fees = tx.fee ?? 0;
    return calculateValueFromDetails(tx.details) - fees;
  }

  // CASE 2: Public client or private client without details field
  if (tx.vin && tx.vout) {
    // Calculate sum of all outputs to wallet addresses
    const totalChange = calculateTotalChange(tx, walletAddresses);

    // If we have complete input data with prevout information
    if (hasCompleteInputData(tx)) {
      return calculateValueFromCompleteData(tx, walletAddresses);
    }
    // Otherwise estimate based on outputs and transaction direction
    return estimateValueFromOutputs(tx, walletAddresses, totalChange);
  }

  // CASE 3: Not enough data to calculate
  return 0;
};
