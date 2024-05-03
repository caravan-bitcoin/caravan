"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// Suppress TS2792: Cannot find module './secp256k1.wasm'.
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
const wasm = require("./secp256k1.wasm");
exports.default = wasm;
