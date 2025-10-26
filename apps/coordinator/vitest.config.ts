import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    include: ['src/**/*.{test,spec}.{js,jsx,ts,tsx}'],
    exclude: ['node_modules/**', 'build/**'],
    coverage: {
      provider: 'istanbul',
      reporter: ['text'],
      exclude: ['node_modules/**', 'build/**'],
    }
  }
});
