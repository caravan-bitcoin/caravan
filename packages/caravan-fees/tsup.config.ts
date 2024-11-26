import { defineConfig } from "tsup";
import { polyfillNode } from "esbuild-plugin-polyfill-node";

export default defineConfig({
  esbuildPlugins: [
    polyfillNode({
      globals: {
        process: true,
        global: true,
      },
    }),
  ],
});
