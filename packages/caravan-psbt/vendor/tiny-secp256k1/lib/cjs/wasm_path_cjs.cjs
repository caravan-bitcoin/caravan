"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.path = void 0;
const nodePath = require("path");
function path(wasmFilename) {
    // Since we know this file will only be used by cjs
    // and we know that wasm file will always be in the parent dir
    // We can translate to the parent directory without problem
    const pathname = nodePath.join(__dirname, "..", wasmFilename);
    return pathname;
}
exports.path = path;
