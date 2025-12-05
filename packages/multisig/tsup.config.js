import { nodeModulesPolyfillPlugin } from "esbuild-plugins-node-modules-polyfill";
import { defineConfig } from "tsup";
import { copyFileSync, existsSync } from "fs";
import { join } from "path";

export default defineConfig({
  esbuildPlugins: [nodeModulesPolyfillPlugin()],
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
