import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["src/components/**/*.test.{tsx,jsx}"],
    exclude: ["node_modules/**", "dist/**"],
    globals: true,
    environment: "jsdom",
    setupFiles: "./vitest.setup.ts",
    coverage: {
      provider: "istanbul",
      reporter: ["text", "html", "lcov"],
      reportsDirectory: "./coverage",
    },
  },
  resolve: {
    alias: {
      // This simulates jest's moduleNameMapper for CSS modules
      "^.+\\.module\\.(css|sass|scss)$": "identity-obj-proxy",
    },
    extensions: [
      ".web.cjs",
      ".js",
      ".web.ts",
      ".ts",
      ".web.tsx",
      ".tsx",
      ".json",
      ".web.cjsx",
      ".jsx",
      ".node",
    ],
  },
});
