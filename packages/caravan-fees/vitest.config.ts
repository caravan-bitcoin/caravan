import { defineConfig } from "vitest/config";
if (typeof global.self === "undefined") {
  global.self = global as Window & typeof globalThis;
}

export default defineConfig({
  define: {
    self: "globalThis",
  },
  test: {
    globals: true,
    environment: "node",
    coverage: {
      provider: "istanbul",
      reporter: ["text", "html", "lcov"],
      reportsDirectory: "./coverage" 
    }
  },
});
