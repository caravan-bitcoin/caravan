/**
 * This module provides functions for calculating & validating
 * transaction fees.
 */
/**
 * Validate the given transaction fee rate (in Satoshis/vbyte).
 *
 * - Must be a parseable as a number.
 *
 * - Cannot be negative (zero is OK).
 *
 * - Cannot be greater than the limit set by
 *   `MAX_FEE_RATE_SATS_PER_VBYTE`.
 */
export declare function validateFeeRate(feeRateSatsPerVbyte: any): "" | "Invalid fee rate." | "Fee rate cannot be negative." | "Fee rate is too high.";
/**
 * Validate the given transaction fee (in Satoshis).
 *
 * - Must be a parseable as a number.
 *
 * - Cannot be negative (zero is OK).
 *
 * - Cannot exceed the total input amount.
 *
 * - Cannot be higher than the limit set by `MAX_FEE_SATS`.
 */
export declare function validateFee(feeSats: any, inputsTotalSats: any): "" | "Invalid fee." | "Invalid total input amount." | "Fee cannot be negative." | "Total input amount must be positive." | "Fee is too high.";
/**
 * Estimate transaction fee rate based on actual fee and address type, number of inputs and number of outputs.
 */
export declare function estimateMultisigTransactionFeeRate(config: any): string | null;
/**
 * Estimate transaction fee based on fee rate, address type, number of inputs and outputs.
 */
export declare function estimateMultisigTransactionFee(config: any): string | null;
