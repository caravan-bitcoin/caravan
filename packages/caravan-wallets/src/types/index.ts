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

// This is currently only used in bcur.ts
export interface Summary {
  success: boolean;
  current: number;
  length: number;
}
