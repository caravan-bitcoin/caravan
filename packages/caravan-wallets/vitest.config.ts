import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "happy-dom",
    alias: {
      "bitbox-api": "vitest",
    },
    coverage: {
      provider: "istanbul",
      reporter: "text",
    },
  },
});
