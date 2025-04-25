# @caravan/multisig

A utility library for handling data related to caravan multisig wallet configurations.

## Development

### Dependencies

Some dependencies are listed in `devDependencies` rather than `dependencies` to ensure proper handling of dynamic requires in the browser environment. This is necessary because:

1. When these dependencies are in `dependencies`, tsup tries to bundle them into the final output
2. This causes issues with dynamic requires (like `require('buffer')`) in the browser environment
3. By keeping them in `devDependencies`, tsup treats them as external dependencies, allowing the bundler (Vite) to handle them properly

This affects:

- `@caravan/bitcoin`
- `ledger-bitcoin`

These dependencies are still required at runtime, but they need to be handled as external dependencies to work correctly in both development and production environments.
