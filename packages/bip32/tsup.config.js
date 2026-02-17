import { polyfillNode } from "esbuild-plugin-polyfill-node";
import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  dts: {
    resolve: true,
  },
  clean: true,
  outExtension({ format }) {
    return { js: ".js" };
  },
  esbuildPlugins: [polyfillNode({ polyfills: { crypto: false } })],
});
