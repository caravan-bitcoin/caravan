import { defineConfig } from "tsup";
import { nodeModulesPolyfillPlugin } from "esbuild-plugins-node-modules-polyfill";
import { provideSelf, provideNavigator } from "@caravan/build-plugins";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm", "cjs"],
  dts: {
    resolve: true,
  },
  clean: true,
  outExtension({ format }) {
    return { js: format === "esm" ? ".mjs" : ".js" };
  },
  esbuildPlugins: [
    nodeModulesPolyfillPlugin({
      modules: {
        fs: true,
        crypto: true,
      },
    }),
    provideSelf(),
    provideNavigator(),
  ],
  // Don't bundle these dependencies - let consumers install them separately
  external: [
    "bitcoinjs-lib-v6",
    "bip174",
    "bufio",
    "@caravan/bitcoin",
    "@caravan/bip32",
    "@caravan/multisig",
    "bignumber.js",
    "buffer",
    "@noble/curves",
    "uint8array-tools",
  ],
});
