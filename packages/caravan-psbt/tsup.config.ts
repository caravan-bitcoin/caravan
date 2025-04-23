import { defineConfig } from "tsup";
import { nodeModulesPolyfillPlugin } from "esbuild-plugins-node-modules-polyfill";
import { provideSelf, provideNavigator } from "@caravan/build-plugins";

export default defineConfig({
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
});
