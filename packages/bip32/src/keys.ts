import {
  ExtendedPublicKey,
  Network,
  bip32SequenceToPath,
  deriveChildExtendedPublicKey,
  deriveChildPublicKey,
  getNetworkFromPrefix,
} from "@caravan/bitcoin";
import { Bip32Derivation } from "bip174/src/lib/interfaces";

import {
  combineBip32Paths,
  getRelativeBip32Sequence,
  secureSecretPath,
} from "./paths";
import { KeyOrigin } from "./types";

/**
 * When you have a global xpub from a PSBT, it's useful to make
 * sure that a child pubkey can be derived from that psbt. Sometimes
 * the pubkey derivation comes from a masked and/or blinded xpub.
 * So we need to combine the child derivation with the global
 * and confirm that the pubkey can be derived from that source
 * @param derivation {Bip32Derivation} - derivation to validate.
 * This type is from the bitcoinjs-lib bip174 package
 * @param globalXpub {KeyOrigin} - global xpub from the psbt
 * @param network {Network}
 * @returns {boolean} whether the child pubkey can be derived from the global xpub
 */
export const isValidChildPubKey = (
  derivation: Bip32Derivation,
  globalXpub: KeyOrigin,
  network: Network = Network.MAINNET,
): boolean => {
  const lastElements = getRelativeBip32Sequence(
    globalXpub.bip32Path,
    derivation.path,
  );
  const relativePath = bip32SequenceToPath(lastElements);

  const childPubkey = deriveChildPublicKey(
    globalXpub.xpub,
    relativePath,
    network,
  );
  return childPubkey === derivation.pubkey.toString("hex");
};

/**
 *
 * @param xpub {string}
 * @param network [Network]
 * @returns {string} - updated xpub with given network
 */
export const setXpubNetwork = (xpub: string, network?: Network): string => {
  if (!network) return xpub;

  const xpubObj = ExtendedPublicKey.fromBase58(xpub);
  xpubObj.setNetwork(network);
  return xpubObj.toBase58();
};

/**
 * @description Derive a masked key origin from an xpub. Useful for generating
 * descriptors and wallet configurations for keys that don't need to have their
 * key origin info revealed.
 * Bip32 path will use all 0s for the depth of the given xpub and the
 * root fingerprint will be set to the parent fingerprint of the xpub
 * @param xpub {string} - xpub to mask
 * @returns
 */
export const getMaskedKeyOrigin = (xpub: string): KeyOrigin => {
  const { parentFingerprint, depth } = ExtendedPublicKey.fromBase58(xpub);

  // shouldn't happen but making typescript happy
  if (!parentFingerprint || !depth)
    throw new Error("Parent fingerprint or depth not found from xpub");

  return {
    xpub: xpub,
    bip32Path: `m${"/0".repeat(depth)}`,
    rootFingerprint: parentFingerprint.toString(16), // Convert parentFingerprint to hexadecimal string
  };
};

/**
 * Given a source xpub, derive a child xpub at a random path using secureSecretPath
 * defaults to depth 4. Useful for creating blinded xpubs or generating random child
 * xpubs (e.g. strands)
 * @param sourceOrigin {KeyOrigin}
 * @param network [Network] - if not provided will just default to the source xpub's network
 * @returns {KeyOrigin} - Child xpub and path
 */
export const getRandomChildXpub = (
  sourceOrigin: KeyOrigin,
  depth: number = 4,
  network: Network = Network.MAINNET,
): KeyOrigin => {
  const randomPath = secureSecretPath(depth);
  const childXpub = deriveChildExtendedPublicKey(
    setXpubNetwork(sourceOrigin.xpub, network),
    randomPath,
    network,
  );
  const childPath = combineBip32Paths(sourceOrigin.bip32Path, randomPath);

  return {
    xpub: childXpub,
    bip32Path: childPath,
    rootFingerprint: sourceOrigin.rootFingerprint,
  };
};

/**
 * @description Given a source xpub, derive a blinded xpub at a random path.
 * Will target 128 bits of entropy for the path with a depth of 4.
 * @param rawXpub {string} - xpub to blind
 * @returns
 */
export const getBlindedXpub = (rawXpub: string): KeyOrigin => {
  const xpub = ExtendedPublicKey.fromBase58(rawXpub);
  if (!xpub.depth) throw new Error("Depth not found from xpub");
  const secretPath = secureSecretPath(4);

  const network = getNetworkFromPrefix(rawXpub.slice(0, 4));
  const newKey = deriveChildExtendedPublicKey(rawXpub, secretPath, network);

  return {
    xpub: newKey,
    bip32Path: `*/${secretPath.split("/").slice(1).join("/")}`,
    rootFingerprint: xpub?.parentFingerprint?.toString(16) || "",
  };
};
