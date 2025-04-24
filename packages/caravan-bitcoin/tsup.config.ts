import { provideNavigator, provideSelf } from "@caravan/build-plugins";
import { nodeModulesPolyfillPlugin } from "esbuild-plugins-node-modules-polyfill";
import { defineConfig } from "tsup";

export default defineConfig({
  esbuildPlugins: [
    nodeModulesPolyfillPlugin(),
    provideSelf(),
    provideNavigator(),
  ],
});
