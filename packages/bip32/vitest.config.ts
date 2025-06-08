import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    exclude: ['node_modules/**', 'dist/**'],
    globals: true,
    environment: "node",
    coverage: {
      provider: "istanbul",
      reporter: "text",
    },
  },
});
