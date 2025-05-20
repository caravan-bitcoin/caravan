import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    exclude: ['node_modules/**', 'dist/**'],
    globals: true,
    environment: "node",
    testTimeout: 10000,
    typecheck: {
        tsconfig: './tsconfig.json',
        enabled: false
    }
    coverage: {
      provider: "istanbul",
      reporter: "text",
    },
  },
});
