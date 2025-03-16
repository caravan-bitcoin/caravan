// vite.config.ts
import { defineConfig } from "file:///home/maz/dev/sob/caravan/node_modules/vite/dist/node/index.js";
import react from "file:///home/maz/dev/sob/caravan/node_modules/@vitejs/plugin-react/dist/index.mjs";
import { nodePolyfills } from "file:///home/maz/dev/sob/caravan/node_modules/vite-plugin-node-polyfills/dist/index.js";
import path from "path";
import wasm from "file:///home/maz/dev/sob/caravan/node_modules/vite-plugin-wasm/exports/import.mjs";
var __vite_injected_original_dirname = "/home/maz/dev/sob/caravan/apps/coordinator";
var vite_config_default = defineConfig({
  // only need to set the base to a subdirectory when deploying to GitHub Pages
  // otherwise, if running locally or deploying via alternative like vercel or replit,
  // then the sub-path can cause issues
  base: process.env.GH_PAGES || process.env.GITHUB_ACTIONS ? "/caravan/#" : "/#",
  assetsInclude: ["**/*.wasm"],
  resolve: {
    alias: {
      utils: path.resolve(__vite_injected_original_dirname, "./src/utils")
    }
  },
  plugins: [
    wasm(),
    react(),
    nodePolyfills({
      protocolImports: true
    })
  ],
  build: {
    target: "esnext",
    // browsers can handle the latest ES features
    outDir: "build",
    rollupOptions: {
      onwarn(warning, warn) {
        if (warning.code === "MODULE_LEVEL_DIRECTIVE") {
          return;
        }
        warn(warning);
      }
    }
  },
  define: {
    __GIT_SHA__: JSON.stringify(
      process.env.__GIT_SHA__ || (process.env.__VERCEL_GIT_COMMIT_SHA__ || "").slice(0, 7)
    ),
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version),
    "process.env.TREZOR_DEV": process.env.TREZOR_DEV,
    "process.env.TREZOR_CONNECT_URL": process.env.TREZOR_CONNECT_URL,
    "process.env.TREZOR_BLOCKBOOK_URL": process.env.TREZOR_BLOCKBOOK_URL
  },
  optimizeDeps: {
    // needed for local development to support proper handling of wasm
    exclude: ["@caravan/descriptors"]
  }
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCIvaG9tZS9tYXovZGV2L3NvYi9jYXJhdmFuL2FwcHMvY29vcmRpbmF0b3JcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZmlsZW5hbWUgPSBcIi9ob21lL21hei9kZXYvc29iL2NhcmF2YW4vYXBwcy9jb29yZGluYXRvci92aXRlLmNvbmZpZy50c1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9pbXBvcnRfbWV0YV91cmwgPSBcImZpbGU6Ly8vaG9tZS9tYXovZGV2L3NvYi9jYXJhdmFuL2FwcHMvY29vcmRpbmF0b3Ivdml0ZS5jb25maWcudHNcIjtpbXBvcnQgeyBkZWZpbmVDb25maWcgfSBmcm9tIFwidml0ZVwiO1xuaW1wb3J0IHJlYWN0IGZyb20gXCJAdml0ZWpzL3BsdWdpbi1yZWFjdFwiO1xuaW1wb3J0IHsgbm9kZVBvbHlmaWxscyB9IGZyb20gXCJ2aXRlLXBsdWdpbi1ub2RlLXBvbHlmaWxsc1wiO1xuaW1wb3J0IHBhdGggZnJvbSBcInBhdGhcIjtcbmltcG9ydCB3YXNtIGZyb20gXCJ2aXRlLXBsdWdpbi13YXNtXCI7XG5cbi8vIGh0dHBzOi8vdml0ZWpzLmRldi9jb25maWcvXG5leHBvcnQgZGVmYXVsdCBkZWZpbmVDb25maWcoe1xuICAvLyBvbmx5IG5lZWQgdG8gc2V0IHRoZSBiYXNlIHRvIGEgc3ViZGlyZWN0b3J5IHdoZW4gZGVwbG95aW5nIHRvIEdpdEh1YiBQYWdlc1xuICAvLyBvdGhlcndpc2UsIGlmIHJ1bm5pbmcgbG9jYWxseSBvciBkZXBsb3lpbmcgdmlhIGFsdGVybmF0aXZlIGxpa2UgdmVyY2VsIG9yIHJlcGxpdCxcbiAgLy8gdGhlbiB0aGUgc3ViLXBhdGggY2FuIGNhdXNlIGlzc3Vlc1xuICBiYXNlOlxuICAgIHByb2Nlc3MuZW52LkdIX1BBR0VTIHx8IHByb2Nlc3MuZW52LkdJVEhVQl9BQ1RJT05TID8gXCIvY2FyYXZhbi8jXCIgOiBcIi8jXCIsXG4gIGFzc2V0c0luY2x1ZGU6IFtcIioqLyoud2FzbVwiXSxcbiAgcmVzb2x2ZToge1xuICAgIGFsaWFzOiB7XG4gICAgICB1dGlsczogcGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgXCIuL3NyYy91dGlsc1wiKSxcbiAgICB9LFxuICB9LFxuICBwbHVnaW5zOiBbXG4gICAgd2FzbSgpLFxuICAgIHJlYWN0KCksXG4gICAgbm9kZVBvbHlmaWxscyh7XG4gICAgICBwcm90b2NvbEltcG9ydHM6IHRydWUsXG4gICAgfSksXG4gIF0sXG4gIGJ1aWxkOiB7XG4gICAgdGFyZ2V0OiBcImVzbmV4dFwiLCAvLyBicm93c2VycyBjYW4gaGFuZGxlIHRoZSBsYXRlc3QgRVMgZmVhdHVyZXNcbiAgICBvdXREaXI6IFwiYnVpbGRcIixcbiAgICByb2xsdXBPcHRpb25zOiB7XG4gICAgICBvbndhcm4od2FybmluZywgd2Fybikge1xuICAgICAgICBpZiAod2FybmluZy5jb2RlID09PSBcIk1PRFVMRV9MRVZFTF9ESVJFQ1RJVkVcIikge1xuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICB3YXJuKHdhcm5pbmcpO1xuICAgICAgfSxcbiAgICB9LFxuICB9LFxuICBkZWZpbmU6IHtcbiAgICBfX0dJVF9TSEFfXzogSlNPTi5zdHJpbmdpZnkoXG4gICAgICBwcm9jZXNzLmVudi5fX0dJVF9TSEFfXyB8fFxuICAgICAgICAocHJvY2Vzcy5lbnYuX19WRVJDRUxfR0lUX0NPTU1JVF9TSEFfXyB8fCBcIlwiKS5zbGljZSgwLCA3KSxcbiAgICApLFxuICAgIF9fQVBQX1ZFUlNJT05fXzogSlNPTi5zdHJpbmdpZnkocHJvY2Vzcy5lbnYubnBtX3BhY2thZ2VfdmVyc2lvbiksXG4gICAgXCJwcm9jZXNzLmVudi5UUkVaT1JfREVWXCI6IHByb2Nlc3MuZW52LlRSRVpPUl9ERVYsXG4gICAgXCJwcm9jZXNzLmVudi5UUkVaT1JfQ09OTkVDVF9VUkxcIjogcHJvY2Vzcy5lbnYuVFJFWk9SX0NPTk5FQ1RfVVJMLFxuICAgIFwicHJvY2Vzcy5lbnYuVFJFWk9SX0JMT0NLQk9PS19VUkxcIjogcHJvY2Vzcy5lbnYuVFJFWk9SX0JMT0NLQk9PS19VUkwsXG4gIH0sXG4gIG9wdGltaXplRGVwczoge1xuICAgIC8vIG5lZWRlZCBmb3IgbG9jYWwgZGV2ZWxvcG1lbnQgdG8gc3VwcG9ydCBwcm9wZXIgaGFuZGxpbmcgb2Ygd2FzbVxuICAgIGV4Y2x1ZGU6IFtcIkBjYXJhdmFuL2Rlc2NyaXB0b3JzXCJdLFxuICB9LFxufSk7XG4iXSwKICAibWFwcGluZ3MiOiAiO0FBQWdULFNBQVMsb0JBQW9CO0FBQzdVLE9BQU8sV0FBVztBQUNsQixTQUFTLHFCQUFxQjtBQUM5QixPQUFPLFVBQVU7QUFDakIsT0FBTyxVQUFVO0FBSmpCLElBQU0sbUNBQW1DO0FBT3pDLElBQU8sc0JBQVEsYUFBYTtBQUFBO0FBQUE7QUFBQTtBQUFBLEVBSTFCLE1BQ0UsUUFBUSxJQUFJLFlBQVksUUFBUSxJQUFJLGlCQUFpQixlQUFlO0FBQUEsRUFDdEUsZUFBZSxDQUFDLFdBQVc7QUFBQSxFQUMzQixTQUFTO0FBQUEsSUFDUCxPQUFPO0FBQUEsTUFDTCxPQUFPLEtBQUssUUFBUSxrQ0FBVyxhQUFhO0FBQUEsSUFDOUM7QUFBQSxFQUNGO0FBQUEsRUFDQSxTQUFTO0FBQUEsSUFDUCxLQUFLO0FBQUEsSUFDTCxNQUFNO0FBQUEsSUFDTixjQUFjO0FBQUEsTUFDWixpQkFBaUI7QUFBQSxJQUNuQixDQUFDO0FBQUEsRUFDSDtBQUFBLEVBQ0EsT0FBTztBQUFBLElBQ0wsUUFBUTtBQUFBO0FBQUEsSUFDUixRQUFRO0FBQUEsSUFDUixlQUFlO0FBQUEsTUFDYixPQUFPLFNBQVMsTUFBTTtBQUNwQixZQUFJLFFBQVEsU0FBUywwQkFBMEI7QUFDN0M7QUFBQSxRQUNGO0FBQ0EsYUFBSyxPQUFPO0FBQUEsTUFDZDtBQUFBLElBQ0Y7QUFBQSxFQUNGO0FBQUEsRUFDQSxRQUFRO0FBQUEsSUFDTixhQUFhLEtBQUs7QUFBQSxNQUNoQixRQUFRLElBQUksZ0JBQ1QsUUFBUSxJQUFJLDZCQUE2QixJQUFJLE1BQU0sR0FBRyxDQUFDO0FBQUEsSUFDNUQ7QUFBQSxJQUNBLGlCQUFpQixLQUFLLFVBQVUsUUFBUSxJQUFJLG1CQUFtQjtBQUFBLElBQy9ELDBCQUEwQixRQUFRLElBQUk7QUFBQSxJQUN0QyxrQ0FBa0MsUUFBUSxJQUFJO0FBQUEsSUFDOUMsb0NBQW9DLFFBQVEsSUFBSTtBQUFBLEVBQ2xEO0FBQUEsRUFDQSxjQUFjO0FBQUE7QUFBQSxJQUVaLFNBQVMsQ0FBQyxzQkFBc0I7QUFBQSxFQUNsQztBQUNGLENBQUM7IiwKICAibmFtZXMiOiBbXQp9Cg==
