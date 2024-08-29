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

// Constants (in satoshis)
export const ABSURDLY_HIGH_FEE_RATE = "1000"; // 1000 sats/vbyte
export const ABSURDLY_HIGH_ABS_FEE = "1000000"; // 0.01 BTC
