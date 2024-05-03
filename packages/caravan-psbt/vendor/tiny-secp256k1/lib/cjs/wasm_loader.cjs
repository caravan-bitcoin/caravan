"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = require("fs");
const wasm_path_cjs_js_1 = require("./wasm_path_cjs.cjs");
const rand = require("./rand.cjs");
const validate_error = require("./validate_error.cjs");
const binary = (0, fs_1.readFileSync)((0, wasm_path_cjs_js_1.path)("secp256k1.wasm"));
const imports = {
    "./rand.js": rand,
    "./validate_error.js": validate_error,
};
const mod = new WebAssembly.Module(binary);
const instance = new WebAssembly.Instance(mod, imports);
exports.default = instance.exports;
