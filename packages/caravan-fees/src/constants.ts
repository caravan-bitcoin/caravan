/**
 * The dust threshold in satoshis. Outputs below this value are considered "dust"
 * and generally not relayed by the network.
 *
 * This value is derived from the Bitcoin Core implementation, where it's
 * calculated as 3 * 182 satoshis for a standard P2PKH output, assuming
 * a minimum relay fee of 1000 satoshis/kB.
 *
 * @see https://github.com/bitcoin/bitcoin/blob/master/src/policy/policy.cpp
 */
export const DEFAULT_DUST_THRESHOLD_IN_SATS = "546"; // in satoshis

/**
 * The sequence number used to signal Replace-by-Fee (RBF) for a transaction input.
 *
 * As per BIP125, a transaction signals RBF if at least one of its inputs has
 * a sequence number less than (0xffffffff - 1). This constant uses
 * (0xffffffff - 2) to clearly signal RBF while leaving room for other
 * potential sequence number use cases.
 *
 * @see https://github.com/bitcoin/bips/blob/master/bip-0125.mediawiki
 */
export const RBF_SEQUENCE = 0xffffffff - 2;

/**
 * Constants for Bitcoin transaction fee safeguards
 *
 * These constants are used to prevent accidental or malicious creation of
 * transactions with excessively high fees. They serve as upper bounds for
 * fee rates and absolute fees in the context of RBF and CPFP operations.
 */

/**
 * Maximum allowable fee rate in satoshis per virtual byte (sat/vB).
 *
 * @constant
 * @type {string}
 * @default "1000"
 *
 * This constant represents an absurdly high fee rate of 1000 sat/vB.
 * It's used as a safety check to prevent transactions with unreasonably
 * high fee rates, which could result in significant financial loss.
 *
 * Context:
 * - Normal fee rates typically range from 1-100 sat/vB, depending on network congestion.
 * - A fee rate of 1000 sat/vB is considered extremely high and likely unintentional.
 * - This safeguard helps protect users from inputting errors or potential fee-sniping attacks.
 *
 * Usage:
 * - In fee estimation functions for RBF and CPFP.
 * - As a validation check before broadcasting transactions.
 */
export const ABSURDLY_HIGH_FEE_RATE = "1000";

/**
 * Maximum allowable absolute fee in satoshis.
 *
 * @constant
 * @type {string}
 * @default "2500000"
 *
 * This constant represents an absurdly high absolute fee of 2,500,000 satoshis (0.025 BTC).
 * It serves as a cap on the total transaction fee, regardless of the transaction's size.
 *
 * Context:
 * - 1,000,000 satoshis = 0.025 BTC, which is a significant amount for a transaction fee.
 * - This limit helps prevent accidental loss of large amounts of Bitcoin due to fee miscalculations.
 * - It's particularly important for larger transactions where a high fee rate could lead to substantial fees.
 *
 * Usage:
 * - In fee calculation functions for both regular transactions and fee-bumping operations (RBF, CPFP).
 * - As a final safety check before transaction signing and broadcasting.
 */
export const ABSURDLY_HIGH_ABS_FEE = "2500000";
