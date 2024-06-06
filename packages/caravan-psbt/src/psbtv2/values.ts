export { PSBT_MAGIC_BYTES } from "../constants";
export const PSBT_MAP_SEPARATOR = Buffer.from([0x00]);
export const BIP_32_NODE_REGEX = /(\/[0-9]+'?)/gi;
export const BIP_32_HARDENING_OFFSET = 0x80000000;
