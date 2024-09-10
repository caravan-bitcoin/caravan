import { polyfillNode } from "esbuild-plugin-polyfill-node";
import { defineConfig } from "tsup";

export default defineConfig({
  esbuildPlugins: [polyfillNode({ polyfills: { crypto: false } })],
});
