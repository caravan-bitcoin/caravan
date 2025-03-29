import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { nodePolyfills } from "vite-plugin-node-polyfills";
import path from "path";
import wasm from "vite-plugin-wasm";

// https://vitejs.dev/config/
export default defineConfig({
  // only need to set the base to a subdirectory when deploying to GitHub Pages
  // otherwise, if running locally or deploying via alternative like vercel or replit,
  // then the sub-path can cause issues
  base:
    process.env.GH_PAGES || process.env.GITHUB_ACTIONS ? "/caravan/#" : "/#",
  assetsInclude: ["**/*.wasm"],
  resolve: {
    alias: {
      utils: path.resolve(__dirname, "./src/utils"),
    },
  },
  plugins: [
    wasm(),
    react(),
    nodePolyfills({
      protocolImports: true,
    }),
  ],
  build: {
    target: "esnext", // browsers can handle the latest ES features
    outDir: "build",
    rollupOptions: {
      onwarn(warning, warn) {
        if (warning.code === "MODULE_LEVEL_DIRECTIVE") {
          return;
        }
        warn(warning);
      },
    },
  },
  define: {
    __GIT_SHA__: JSON.stringify(
      process.env.__GIT_SHA__ ||
        (process.env.__VERCEL_GIT_COMMIT_SHA__ || "").slice(0, 7),
    ),
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version),
    "process.env.TREZOR_DEV": process.env.TREZOR_DEV,
    "process.env.TREZOR_CONNECT_URL": process.env.TREZOR_CONNECT_URL,
    "process.env.TREZOR_BLOCKBOOK_URL": process.env.TREZOR_BLOCKBOOK_URL,
  },
  optimizeDeps: {
    // needed for local development to support proper handling of wasm
    exclude: ["@caravan/descriptors"],
  },
});
