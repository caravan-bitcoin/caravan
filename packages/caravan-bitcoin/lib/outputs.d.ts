/**
 * This module provides functions for validating transaction
 * output and amounts.
 */
import BigNumber from "bignumber.js";
/**
 * Represents an output in a transaction.
 */
/**
 * Validates the given transaction outputs.
 *
 * Returns an error message if there are no outputs.  Passes each output to [`validateOutput`]{@link module:transactions.validateOutput}.
 */
export declare function validateOutputs(network: any, outputs: any, inputsTotalSats?: any): string;
/**
 * Validate the given transaction output.
 *
 * - Validates the presence and value of `address`.
 *
 * - Validates the presence and value of `amountSats`.  If `inputsTotalSats`
 *   is also passed, this will be taken into account when validating the
 *   amount.
 */
export declare function validateOutput(network: any, output: any, inputsTotalSats?: any): string;
/**
 * Validate the given output amount (in Satoshis).
 *
 * - Must be a parseable as a number.
 *
 * - Cannot be negative (zero is OK).
 *
 * - Cannot be smaller than the limit set by `DUST_LIMIT_SATS`.
 *
 * - Cannot exceed the total input amount (this check is only run if
 *   `inputsTotalSats` is passed.
 *
 *   TODO: minSats accepting a BigNumber is only to maintain some backward
 *   compatibility. Ideally, the arg would not expose this lib's dependencies to
 *   the caller. It should be made to only accept number or string.
 */
export declare function validateOutputAmount(amountSats: any, maxSats?: number | string, minSats?: number | string | BigNumber): "" | "Invalid total input amount." | "Total input amount must be positive." | "Invalid output amount." | "Output amount must be positive." | "Output amount is too small." | "Output amount is too large.";
