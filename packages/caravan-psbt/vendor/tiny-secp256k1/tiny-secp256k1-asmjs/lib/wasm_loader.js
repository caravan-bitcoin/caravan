// Suppress TS2792: Cannot find module './secp256k1.asm.js'.
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import * as wasm from "./secp256k1.asm.js";
export default wasm;
