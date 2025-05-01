import { defineConfig } from 'vitest/config';
export default defineConfig({
  plugins: [],
  test: {
    include: ["src/**/*.test.ts"],
    exclude: ["node_modules/**", "dist/**", "src/bitbox.ts"],
    globals: true,
    environment: "jsdom",
    testTimeout: 10000,
    setupFiles: "./vitest.setup.ts",
    typecheck: {
      tsconfig: "./tsconfig.json",
      enabled: false,
    },
  },
});