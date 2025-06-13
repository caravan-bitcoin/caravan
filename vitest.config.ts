import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      enabled: true,
      provider: 'istanbul',
      reportsDirectory: './coverage',
      reporter: ['text', 'html', 'lcov'],
      exclude: [
        'node_modules',
        'dist',
        '**/*.test.{ts,tsx}',
        'coverage/**',
        '**/*.d.ts',
        'vitest.config.ts',
        'vitest.setup.ts',
        'apps/*/build/**',
        'packages/*/dist/**'
      ]
    },
    include: [
      'apps/**/*.{ts,tsx}',
      'packages/**/*.{ts,tsx}'
    ]
  }
});
