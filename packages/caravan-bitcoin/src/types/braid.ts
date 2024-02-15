import { BitcoinNetwork } from "./networks";
import { MultisigAddressType } from "./addresses";

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
