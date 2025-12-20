import { execSync } from "child_process";
import { polyfillNode } from "esbuild-plugin-polyfill-node";
import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm", "cjs"],
  dts: true,
  experimentalDts: false,
  clean: true,
  outExtension({ format }) {
    return { js: format === "esm" ? ".js" : ".cjs" };
  },
  esbuildPlugins: [polyfillNode({ polyfills: { crypto: false } })],
  onSuccess() {
    execSync("node ./scripts/emit-dual-dts.js", { stdio: "inherit" });
  },
});
import { execSync } from "child_process";
