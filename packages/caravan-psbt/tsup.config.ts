import { defineConfig } from "tsup";
import { polyfillNode } from "esbuild-plugin-polyfill-node";
import ProvideSelf from "./provide-self";


export default defineConfig({
  esbuildPlugins: [
    polyfillNode({
      polyfills: {
        fs: true,
        crypto: true,
      },
    }),
    ProvideSelf(),
  ],
});
