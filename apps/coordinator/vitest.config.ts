import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

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
  },
  resolve: {
    alias: {
      utils: resolve(__dirname, 'src/utils'),
      selectors: resolve(__dirname, 'src/selectors'),
      clients: resolve(__dirname, 'src/clients'),
      hooks: resolve(__dirname, 'src/hooks'),
    }
  }
});
