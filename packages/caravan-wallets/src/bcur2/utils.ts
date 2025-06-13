import { ExtendedPublicKey, BitcoinNetwork } from "@caravan/bitcoin";
import { CryptoHDKey, CryptoAccount } from "@keystonehq/bc-ur-registry";

import { ExtendedPublicKeyData } from "./decoder";

/**
 * Process a CBOR buffer containing crypto-account data and extract extended public key information
 */
export function processCryptoAccountCBOR(
  cbor: Buffer,
  network: BitcoinNetwork
): ExtendedPublicKeyData {
  const account = CryptoAccount.fromCBOR(cbor);
  const descriptors = account.getOutputDescriptors();
  if (!descriptors.length) throw new Error("No output descriptors found");

  // Ensure we have only 1 descriptor here
  const hdKey = descriptors[0].getCryptoKey();
  if (!hdKey || !(hdKey instanceof CryptoHDKey)) {
    throw new Error("Invalid HDKey in crypto-account");
  }

  return processHDKey(hdKey, network, "crypto-account");
}

/**
 * Process a CBOR buffer containing crypto-hdkey data and extract extended public key information
 */
export function processCryptoHDKeyCBOR(
  cbor: Buffer,
  network: BitcoinNetwork
): ExtendedPublicKeyData {
  const hdkey = CryptoHDKey.fromCBOR(cbor);
  if (!hdkey) {
    throw new Error("Invalid crypto-hdkey data");
  }

  return processHDKey(hdkey, network, "crypto-hdkey");
}

/**
 * Common logic for processing an HDKey and extracting extended public key data
 */
function processHDKey(
  hdKey: CryptoHDKey,
  network: BitcoinNetwork,
  type: "crypto-account" | "crypto-hdkey"
): ExtendedPublicKeyData {
  // Extract components from CryptoHDKey
  const chainCode = hdKey.getChainCode();
  const key = hdKey.getKey();
  const parentFp = hdKey.getParentFingerprint() || Buffer.alloc(4);
  const origin = hdKey.getOrigin();
  const rootFingerprint = origin
    ?.getSourceFingerprint()
    ?.toString("hex")
    ?.toUpperCase();
  const bip32Path = origin?.getPath();

  // Get depth and index from path
  const components = origin?.getComponents() || [];
  const depth = components.length;
  const lastComponent = components[components.length - 1];

  // Handle hardened vs non-hardened indices
  let index = 0;
  if (lastComponent) {
    if (lastComponent.isHardened()) {
      index = lastComponent.getIndex() + 0x80000000;
    } else {
      index = lastComponent.getIndex();
    }
  }

  // Create xpub with proper network version
  const xpubObj = new ExtendedPublicKey({
    depth,
    index,
    chaincode: chainCode.toString("hex"),
    pubkey: key.toString("hex"),
    parentFingerprint: parentFp.readUInt32BE(0),
    network,
  });

  const xpub = xpubObj.toBase58();
  if (!xpub) throw new Error("Failed to construct xpub from HDKey");

  return { type, xpub, rootFingerprint, bip32Path };
}
