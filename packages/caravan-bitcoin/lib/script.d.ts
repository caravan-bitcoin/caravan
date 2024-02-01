/**
 * This module provides functions for converting generic bitcoin
 * scripts to hex or opcodes.
 */
/**
 * Extracts the ASM (opcode) representation of a script from a
 * `Multisig` object.
 */
export declare function scriptToOps(multisig: any): string;
/**
 * Extracts the hex representation of a script from a `Multisig`
 * object.
 */
export declare function scriptToHex(multisigScript: any): any;
