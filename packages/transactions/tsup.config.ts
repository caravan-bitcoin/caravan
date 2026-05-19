import { provideSelf } from "@caravan/build-plugins";
import { nodeModulesPolyfillPlugin } from "esbuild-plugins-node-modules-polyfill";
import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["cjs", "esm"],
  dts: true,
  clean: true,
  sourcemap: true,
  esbuildPlugins: [
    nodeModulesPolyfillPlugin({
      modules: {
        process: true,
        global: true,
      },
    }),
    provideSelf(),
  ],
});
