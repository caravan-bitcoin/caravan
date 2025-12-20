import { polyfillNode } from "esbuild-plugin-polyfill-node";
import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm", "cjs"],
  dts: false,
  experimentalDts: true,
  clean: true,
  outExtension({ format }) {
    return {
      js: format === "esm" ? ".js" : ".cjs",
      dts: format === "esm" ? ".d.mts" : ".d.cts",
    };
  },
  esbuildPlugins: [polyfillNode({ polyfills: { crypto: false } })],
});
