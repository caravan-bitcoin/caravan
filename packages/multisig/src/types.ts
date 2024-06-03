import { MultisigAddressType, BitcoinNetwork } from "@caravan/bitcoin";

export interface DeviceError extends Error {
  message: string;
}

// really should be interchangeable with KeyDerivations
// but unfortunately there are inconsistent property names
// in different contexts
export interface WalletConfigKeyDerivation {
  xfp: string;
  bip32Path: string;
  xpub: string;
}

// should be a 32 byte hex string
export type PolicyHmac = string;
// should be an 8 byte hex string
export type RootFingerprint = string;
// a map of xfps to their corresponding hmac of the wallet policy
// that contains this map
export interface LedgerPolicyHmacs {
  xfp: string;
  policyHmac: PolicyHmac;
}

export interface MultisigWalletConfig {
  name?: string;
  uuid?: string;
  quorum: {
    requiredSigners: number;
    // shouldn't be necessary as it can be
    // inferred from the extendedPublicKeys
    // but still exists in most cases
    totalSigners?: number;
  };
  addressType: MultisigAddressType;
  extendedPublicKeys: WalletConfigKeyDerivation[];
  network: BitcoinNetwork;
  // list of policy hmacs registering the policy of the
  // wallet for which this is a configuration for.
  // this is optional and can have no values or up to
  // n total hmacs, where n is the total number of
  // signers in the quorum (equal to extendedPublicKeys.length)
  ledgerPolicyHmacs?: LedgerPolicyHmacs[];
}

export interface LegacyMultisig {
  /**
   * JSON stringified object with the following properties:
   * braidDetails: {
   *   network: Network;
   *   addressType: number;
   *   extendedPublicKeys: string[];
   *   requiredSigners: number;
   *   index: string;
   * };
   */
  braidDetails: string;
  bip32Derivation?: {
    masterFingerprint: string;
    path: string;
    pubkey: Buffer;
  }[];
}

// This may be incomplete as the fixture objects are extremely opaque.
// Hopefully we can build on this though as we work to convert more
// code to fully typed Typescript.
export interface LegacyInput {
  txid: string;
  index: number;
  transactionHex: string;
  amountSats: number | string;
  multisig: LegacyMultisig;
}

export interface LegacyOutput {
  address: string;
  amountSats: number | string;
  bip32Derivation?: {
    masterFingerprint: string;
    path: string;
    pubkey: Buffer;
  }[];
  witnessScript?: Buffer;
  redeemScript?: Buffer;
  multisig?: LegacyMultisig;
}

/**
 * A "Braid" is one of the two sources of derivation information for a
 * multisig wallet (there will be a receive braid and a change braid).
 * BraidDetails provide the data necessary to generate these addresses.
 * This is manifestation in particular however is a somewhat legacy construction
 * as some other objects in the caravan ecosystem would
 * serialize braid details such as these in nested data structures (see LegacyMultisig).
 *
 */
export interface BraidDetails {
  network: BitcoinNetwork;
  addressType: MultisigAddressType;
  extendedPublicKeys: {
    path: string;
    index: number;
    depth: number;
    chaincode: string;
    pubkey: string;
    parentFingerprint: number;
    version: string;
    rootFingerprint: string;
    base58String: string;
  }[];
  requiredSigners: number;
  index: number;
}
