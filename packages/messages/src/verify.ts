import { Verifier, Address } from "bip322-js";

/**
 * Verify a base64 signature against the canonical P2WPKH address
 * derived from `expectedPubkey`. Returns a boolean — never throws.
 *
 * Wraps `bip322-js` in loose-verification mode: the BIP-322 spec
 * prohibits BIP-137-style signatures over P2WPKH addresses, but
 * caravan's cosigner paths in P2WSH multisig wallets canonicalize to
 * P2WPKH, so strict mode would reject every BIP-137 signature against
 * a real caravan cosigner path.
 *
 * Address type is hardcoded P2WPKH — that's the only shape caravan
 * cosigner paths produce. Stage 4a callers don't need an addressType
 * parameter; if a future use case wants external-interop with
 * non-P2WPKH signatures, add it then.
 */
export function verifyMessageSignature(args: {
  message: string;
  signature: string;
  expectedPubkey: string;
}): boolean {
  const { message, signature, expectedPubkey } = args;
  if (!(/^[0-9a-fA-F]+$/).test(expectedPubkey)) {
    return false;
  }
  const pubkeyBuf = Buffer.from(expectedPubkey, "hex");
  if (pubkeyBuf.length !== 33) {
    return false;
  }
  let address: string;
  try {
    address = Address.convertPubKeyIntoAddress(pubkeyBuf, "p2wpkh").mainnet;
  } catch {
    return false;
  }
  try {
    return Verifier.verifySignature(address, message, signature, false);
  } catch {
    return false;
  }
}
