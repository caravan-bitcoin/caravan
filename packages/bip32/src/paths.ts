import { randomInt } from "crypto";
import {
  bip32PathToSequence,
  bip32SequenceToPath,
  deriveChildExtendedPublicKey,
  deriveChildPublicKey,
  ExtendedPublicKey,
  Network,
  validateBIP32Path,
} from "@caravan/bitcoin";
import { Bip32Derivation } from "bip174/src/lib/interfaces";
import { KeyOrigin } from "./types";
/**
 * @description Returns a random BIP32 path of a given depth. The
 * randomness is generated using the Node.js crypto module.
 * Can be used for blinding an xpub.
 * Based on buidl's equivalent function:
 * https://github.com/buidl-bitcoin/buidl-python/blob/main/buidl/blinding.py
 *
 * Approx entropy by depth:
 *       1: 31
 *       2: 62
 *       3: 93
 *       4: 124
 *       5: 155
 *       6: 186
 *       7: 217
 *       8: 248
 *       9: 279
 * @param depth
 * @returns {string} - BIP32 path as string
 */
export const secureSecretPath = (depth: number = 4): string => {
  if (!Number.isInteger(depth)) {
    throw new Error(`depth must be an int: ${depth}`);
  }
  if (depth >= 32) {
    throw new Error(
      `BIP32 requires depth < 256, but this function will not allow you to go anywhere near this high: ${depth}`,
    );
  }
  if (depth < 1) {
    throw new Error(`Depth must be > 0: ${depth}`);
  }
  const to_return: string[] = ["m"];
  for (let i = 0; i < depth; i++) {
    const rand_int = randomInt(0, 2 ** 31 - 1);
    to_return.push(rand_int.toString());
  }
  return to_return.join("/");
};


/**
 * Given two BIP32 paths, combine them into a single path.
 * Useful for creating blinded xpubs when you have the source
 * path and want to append the randomly generated one
 * @param firstPath
 * @param secondPath
 * @returns {string} new combined bip32 path
 */
export const combineBip32Paths = (
  firstPath: string,
  secondPath: string,
): string => {
  let modifiedFirstPath = firstPath.toLowerCase().trim().replace("//", "/");
  if (modifiedFirstPath.endsWith("/")) {
    modifiedFirstPath = modifiedFirstPath.slice(0, -1);
  }
  let modifiedSecondPath = secondPath.toLowerCase().trim().replace("//", "/");
  if (modifiedSecondPath.endsWith("/")) {
    modifiedSecondPath = modifiedSecondPath.slice(0, -1);
  }

  if (modifiedFirstPath === "m") {
    return modifiedSecondPath;
  }

  if (modifiedSecondPath === "m") {
    return modifiedFirstPath;
  }

  // Trim leading "m/" from the second path
  modifiedSecondPath = modifiedSecondPath.slice(2);
  const combined = `${modifiedFirstPath}/${modifiedSecondPath}`;
  if (validateBIP32Path(combined)) {
    throw new Error(
      `Invalid bip32 path: ${combined}: ${firstPath} ${secondPath}`,
    );
  }
  return combined;
};

/**
 *
 * @param xpub {string}
 * @param network [Network]
 * @returns {string} - updated xpub with given network
 */
const setXpubNetwork = (xpub: string, network?: Network): string => {
  if (!network) return xpub;

  const xpubObj = ExtendedPublicKey.fromBase58(xpub);
  xpubObj.setNetwork(network);
  return xpubObj.toBase58();
};

/**
 * Given a source xpub, derive a child xpub at a random path using secureSecretPath
 * defaults to depth 4. Useful for creating blinded xpubs or generating random child
 * xpubs (e.g. strands)
 * @param sourceOrigin {KeyOrigin}
 * @param network [Network] - if not provided will just default to the source xpub's network
 * @returns {KeyOrigin} - Child xpub and path
 */
export const getRandomChildXpub = (sourceOrigin: KeyOrigin, depth = 4, network?: Network): KeyOrigin => {
  const randomPath = secureSecretPath(depth);

  const childXpub = deriveChildExtendedPublicKey(
    setXpubNetwork(sourceOrigin.xpub, network),
    randomPath,
    process.env.BITCOIN_NETWORK as Network,
  );
  const childPath = combineBip32Paths(sourceOrigin.bip32Path, randomPath);

  return {
    xpub: childXpub,
    bip32Path: childPath,
    rootFingerprint: sourceOrigin.rootFingerprint,
  };
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
  const globalSequence = bip32PathToSequence(globalXpub.bip32Path);
  const derivationSequence = bip32PathToSequence(derivation.path);

  const difference = derivationSequence.length - globalSequence.length;
  if (difference < 0)
    throw new Error(
      `Child key longer than parent: Parent: ${globalXpub.bip32Path}, Child: ${derivation.path}`,
    );
  const lastElements = derivationSequence.slice(-difference);
  const relativePath = bip32SequenceToPath(lastElements);

  const childPubkey = deriveChildPublicKey(globalXpub.xpub, relativePath, network);
  return childPubkey === derivation.pubkey.toString("hex");
};

/**
 * Given a derivation and a global xpub, return the unmasked path
 * that can be used to derive the child pubkey from the global xpub.
 * This is useful when you have a child xpub (e.g. a blinded xpub) derived
 * from a masked xpub and you need to generate the full, unmasked path.
 * @param derivation {Bip32Derivation}
 * @param globalXpub {KeyOrigin}
 * @returns {string} - unmasked path
 */
export const getUnmaskedPath = (
  derivation: Bip32Derivation,
  globalXpub: KeyOrigin,
): string => {
  const globalSequence = bip32PathToSequence(globalXpub.bip32Path);
  const derivationSequence = bip32PathToSequence(derivation.path);

  const difference = derivationSequence.length - globalSequence.length;
  if (difference < 0)
    throw new Error(
      `Child key longer than parent: Parent: ${globalXpub.bip32Path}, Child: ${derivation.path}`,
    );
  const lastElements = derivationSequence.slice(-difference);

  return bip32SequenceToPath(globalSequence.concat(lastElements));
};
