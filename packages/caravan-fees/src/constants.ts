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
export const DEFAULT_DUST_THRESHOLD = 546; // in satoshis

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
 * The default maximum size (in virtual bytes) for a child transaction in
 * a Child-Pays-for-Parent (CPFP) scenario.
 *
 * This is not a protocol rule, but a reasonable limit to prevent creating
 * overly large transactions. It can be adjusted based on specific requirements.
 */
export const DEFAULT_MAX_CHILD_TX_SIZE = 1000;

/**
 * The default maximum number of additional inputs to consider when
 * bumping fees through RBF or CPFP.
 *
 * This limit helps manage transaction complexity and size. It's a balance
 * between allowing sufficient inputs for fee bumping and keeping
 * transactions manageable. This can be adjusted based on wallet policies
 * or user preferences.
 */
export const DEFAULT_MAX_ADDITIONAL_INPUTS = 3;

/**
 * Constant representing the estimated vsize increase when adding a single input.
 * This is a conservative estimate for a P2WSH multisig input.
 * The actual size may vary based on the number of signatures (M) and total keys (N).
 */
export const ESTIMATED_MULTISIG_INPUT_VSIZE = 140; // vbytes

/**
 * Constant representing the estimated vsize for a change output.
 * This assumes a P2WSH multisig output.
 */
export const ESTIMATED_MULTISIG_CHANGE_OUTPUT_VSIZE = 43; // vbytes

/**
 * Constant representing the estimated vsize increase for each signature in a multisig input.
 * This is used to account for the variable size based on the number of required signatures.
 */
export const ESTIMATED_SIGNATURE_VSIZE = 72; // vbytes

/**
 * Constant representing the estimated vsize increase for each public key in a multisig script.
 * This is used to account for the variable size based on the total number of keys.
 */
export const ESTIMATED_PUBKEY_VSIZE = 34; // vbytes
