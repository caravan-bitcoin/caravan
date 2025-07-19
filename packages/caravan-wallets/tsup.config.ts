import { defineConfig } from "tsup";
import { nodeModulesPolyfillPlugin } from "esbuild-plugins-node-modules-polyfill";
import { provideNavigator, provideSelf } from "@caravan/build-plugins";

export default defineConfig({
  esbuildPlugins: [
    nodeModulesPolyfillPlugin({
      modules: {
        process: false,
        util: true,
        crypto: true,
        buffer: true,
        assert: true,
      },
    }),
    provideSelf(),
    provideNavigator(),
  ],
  // make sure that the bitbox-api package is not bundled
  external: ["bitbox-api"],
  // noExternal makes sure that certain packages are bundled
  // in the final package rather than independently installed
  noExternal: ["@caravan/psbt"],
});
