import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    setupFiles: "./vitest.setup.ts",
    alias: {
      "bitbox-api": "vitest",
    },
    coverage: {
      provider: "istanbul",
      reporter: "text",
    },
  },
});
