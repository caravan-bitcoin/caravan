import { polyfillNode } from "esbuild-plugin-polyfill-node";
import { defineConfig } from "tsup";
import { copyFileSync, existsSync } from "fs";
import { join } from "path";

export default defineConfig({
  esbuildPlugins: [polyfillNode({ polyfills: { crypto: false } })],
  onSuccess: async () => {
    const distDir = join(process.cwd(), "dist");
    const dtsFile = join(distDir, "index.d.ts");
    const dmtsFile = join(distDir, "index.d.mts");
    const dctsFile = join(distDir, "index.d.cts");

    if (existsSync(dtsFile)) {
      copyFileSync(dtsFile, dmtsFile);
      copyFileSync(dtsFile, dctsFile);
      console.log("✓ Generated index.d.mts and index.d.cts");
    }
  },
});
