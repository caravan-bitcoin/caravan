import { defineConfig } from "tsup";
import { nodeModulesPolyfillPlugin } from "esbuild-plugins-node-modules-polyfill";
import { provideNavigator, provideSelf } from "@caravan/build-plugins";
import { copyFileSync, existsSync } from "fs";
import { join } from "path";

export default defineConfig({
  esbuildPlugins: [
    nodeModulesPolyfillPlugin({
      modules: {
        process: false,
        util: true,
        crypto: true,
        buffer: true,
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
  onSuccess: async () => {
    const distDir = join(process.cwd(), "dist");
    const dtsFile = join(distDir, "index.d.ts");
    const dmtsFile = join(distDir, "index.d.mts");

    if (existsSync(dtsFile)) {
      copyFileSync(dtsFile, dmtsFile);
      console.log("✓ Generated index.d.mts");
    }
  },
});
