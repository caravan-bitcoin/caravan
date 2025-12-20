import { polyfillNode } from "esbuild-plugin-polyfill-node";
import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm", "cjs"],
  dts: true,
  clean: true,
  outExtension({ format }) {
    return { js: format === "esm" ? ".js" : ".cjs" };
  },
  esbuildPlugins: [polyfillNode({ polyfills: { crypto: false } })],
});
