import { defineConfig } from "tsup";
import { polyfillNode } from "esbuild-plugin-polyfill-node";

export default defineConfig({
  esbuildPlugins: [
    polyfillNode({
      globals: { process: false },
    }),
  ],
  // make sure that the bitbox-api package is not bundled
  external: ["bitbox-api"],
  // noExternal makes sure that certain packages are bundled
  // in the final package rather than independently installed
  noExternal: ["@caravan/psbt"],
});
