import { URL, fileURLToPath } from "url";
export function path(wasmFilename) {
    const url = new URL(wasmFilename, import.meta.url);
    return fileURLToPath(url);
}
