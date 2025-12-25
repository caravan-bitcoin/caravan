import { provideSelf, provideNavigator } from "@caravan/build-plugins";
import { nodeModulesPolyfillPlugin } from "esbuild-plugins-node-modules-polyfill";
import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm", "cjs"],
  dts: true,
  clean: true,
  outExtension({ format }) {
    return { js: format === "esm" ? ".mjs" : ".js" };
  },
  esbuildPlugins: [
    nodeModulesPolyfillPlugin(),
    provideSelf(),
    provideNavigator(),
  ],
});
