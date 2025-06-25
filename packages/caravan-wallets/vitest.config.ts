import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./vitest.setup.ts'],
    exclude: ['node_modules/**', "lib/**"],
    coverage: {
      provider: "istanbul",
      reporter: ["text"],
    },
  }
})
