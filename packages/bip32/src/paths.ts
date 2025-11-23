import {
  bip32PathToSequence,
  bip32SequenceToPath,
  validateBIP32Path,
} from "@caravan/bitcoin";
import { Bip32Derivation } from "bip174/src/lib/interfaces";

import { KeyOrigin } from "./types";
import { secureRandomInt } from "./utils";

/**
 * Returns a random BIP32 path of a given depth. The
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
  const toReturn: string[] = ["m"];
  for (let i = 0; i < depth; i++) {
    const randInt = secureRandomInt();
    toReturn.push(randInt.toString());
  }
  return toReturn.join("/");
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
 * A utility function to get the relative BIP32 sequence of a child key
 * Given two paths, we want the path difference from the child.
 *
 * @example
 * getRelativeBip32Sequence("m/45'/0'/0'", "m/45'/0'/0'/0/0")
 * // returns [0, 0]
 * @param parentPath The path of the parent key from which the child should be derived
 * @param childPath The full path of the child derived from the parent
 * @returns
 */
export const getRelativeBip32Sequence = (
  parentPath: string,
  childPath: string,
) => {
  const parentSequence = bip32PathToSequence(parentPath);
  const childSequence = bip32PathToSequence(childPath);

  const difference = childSequence.length - parentSequence.length;
  if (difference < 0) {
    throw new Error(
      `Child key shorter than parent: Parent: ${parentPath}, Child: ${childPath}`,
    );
  }
  return childSequence.slice(-difference);
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
  const lastElements = getRelativeBip32Sequence(
    globalXpub.bip32Path,
    derivation.path,
  );

  return bip32SequenceToPath(globalSequence.concat(lastElements));
};
