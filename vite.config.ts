import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { nodePolyfills } from "vite-plugin-node-polyfills";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig({
  // only need to set the base to a subdirectory when deploying to GitHub Pages
  // otherwise, if running locally or deploying via alternative like vercel or replit,
  // then the sub-path can cause issues
  base:
    process.env.GH_PAGES || process.env.GITHUB_ACTIONS ? "/caravan/#" : "/#",
  resolve: {
    alias: {
      utils: path.resolve(__dirname, "./src/utils"),
    },
  },
  plugins: [
    react(),
    nodePolyfills({
      protocolImports: true,
    }),
  ],
  build: {
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
    __GIT_SHA__: JSON.stringify(process.env.__GIT_SHA__),
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version),
  },
});
