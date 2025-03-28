# Vitest Tests

This directory contains tests migrated from Jest to Vitest.

## Running Tests

To run tests:

```bash
# Run all Vitest tests
npm run test:vitest

# Run a specific test file
npm run test:vitest -- filename.test.js

# Run tests with UI
npm run test:vitest:ui

# Run tests in watch mode
npm run test:vitest:watch

# Run tests with coverage
npm run test:vitest:coverage
```

## Migration Strategy

When migrating tests from Jest to Vitest:

1. Start with simple, self-contained test files
2. Place new tests in `src/tests-vitest/` with a `.test.js` or `.spec.js` extension
3. Once tests are verified working:
   - Create a backup of the original Jest test file
   - Move the new test file to the original location
   - Update Vitest config to include the original test location

## Migration Notes

When migrating tests from Jest to Vitest:

1. Import test functions from Vitest:

   ```js
   import { describe, it, expect, beforeEach, afterEach } from "vitest";
   ```

2. Most Jest assertions work the same in Vitest, but watch for subtle differences in:

   - Mocking
   - Timers
   - Async behavior

3. Update imports if needed (some packages might need different imports for Vitest)

## Helpful Resources

- [Vitest Documentation](https://vitest.dev/)
- [Migration Guide from Jest](https://vitest.dev/guide/migration.html)
