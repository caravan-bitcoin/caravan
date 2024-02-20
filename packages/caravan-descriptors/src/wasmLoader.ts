type WasmWebModule = typeof import("../caravan-rs/pkg-web/caravan_rs");
type WasmNodeModule = typeof import("../caravan-rs/pkg-nodejs/caravan_rs");

let init: WasmWebModule["default"];
let ExtendedDescriptor:
  | WasmWebModule["ExtendedDescriptor"]
  | WasmNodeModule["ExtendedDescriptor"];
let CaravanConfig:
  | WasmWebModule["CaravanConfig"]
  | WasmNodeModule["CaravanConfig"];
let Network: WasmWebModule["Network"] | WasmNodeModule["Network"];
let MultisigWalletConfig:
  | WasmWebModule["MultisigWalletConfig"]
  | WasmNodeModule["MultisigWalletConfig"];

async function initWasm() {
  if (typeof window !== "undefined") {
    // Browser environment
    const module = await import("../caravan-rs/pkg-web/caravan_rs");
    ({
      default: init,
      ExtendedDescriptor,
      CaravanConfig,
      Network,
      MultisigWalletConfig,
    } = module);
    // need to tell the js where the wasm module is to init with
    // this ends up getting called from built js code from wasm-pack build
    // so it's relative to that file
    await init();
  } else {
    // Node.js environment
    const module = await import("../caravan-rs/pkg-nodejs/caravan_rs");
    ({ ExtendedDescriptor, CaravanConfig, Network, MultisigWalletConfig } =
      module);
  }
}

// export default bdkWasm;
export async function getRustAPI() {
  if (!init) {
    await initWasm();
  }

  return { ExtendedDescriptor, CaravanConfig, Network, MultisigWalletConfig };
}
