import { defineConfig } from "tsup";
import { nodeModulesPolyfillPlugin } from "esbuild-plugins-node-modules-polyfill";
import { provideNavigator, provideSelf } from "@caravan/build-plugins";

export default defineConfig({
  esbuildPlugins: [
    nodeModulesPolyfillPlugin(),
    provideSelf(),
    provideNavigator(),
  ],
});
