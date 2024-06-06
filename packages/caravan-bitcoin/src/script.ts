import { script } from "bitcoinjs-lib-v5";

/**
 * This module provides functions for converting generic bitcoin
 * scripts to hex or opcodes.
 */

/**
 * Extracts the ASM (opcode) representation of a script from a
 * `Multisig` object.
 */
export function scriptToOps(multisig) {
  return script.toASM(multisig.output);
}

/**
 * Extracts the hex representation of a script from a `Multisig`
 * object.
 */
export function scriptToHex(multisigScript) {
  return multisigScript.output.toString("hex");
}
