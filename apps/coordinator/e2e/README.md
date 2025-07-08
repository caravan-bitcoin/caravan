# E2E Tests

End-to-end tests for Caravan Coordinator using Playwright.

## Prerequisites

- Docker
- Node.js (see `.nvmrc` in project root)

## Quick Start

### 1. Environment Setup

```bash
# From the coordinator directory (apps/coordinator/)
cp .env.example .env
```

### 2. Install Dependencies

```bash
# From project root - installs all workspace dependencies
npm install

# Install Playwright browsers (from coordinator directory)
cd apps/coordinator
npm run test:e2e:install
```

### 3. Run Tests

```bash
# From project root - Turbo will handle dependencies
npm run test:e2e --filter=caravan-coordinator

# Or from coordinator directory
cd apps/coordinator
npm run test:e2e       # Run all tests (everything automated)
npm run test:e2e:ui    # Run tests with interactive UI  
npm run test:e2e:headed # Run tests in headed mode (see browser)
```

## What Happens Automatically

When you run any test command, the system automatically:

1. **Builds dependencies** - Turbo ensures all required packages are built
2. **Checks Docker availability** - Ensures Docker is running
3. **Pulls images** - Downloads Bitcoin regtest node if needed  
4. **Starts containers** - Spins up Bitcoin node and Caravan coordinator
5. **Waits for connections** - Ensures all services are ready
6. **Creates test wallets** - Sets up Bitcoin wallets for testing
7. **Runs tests** - Executes Playwright tests
8. **Cleans up** - Removes test wallets and stops containers

No manual Docker commands needed! Turbo handles build dependencies automatically.


## Test Structure

- `tests/caravan_test.spec.ts` - Main test suite
- `utils/` - Automated setup, teardown, and Bitcoin utilities
- `docker-compose.yml` - Bitcoin regtest + Caravan coordinator
- `playwright.config.ts` - Playwright configuration with global setup

## Troubleshooting

- **"Docker is required"**: Install Docker and make sure it's running
- **Port conflicts**: Ensure ports 5173, 8080, and 18443 are free
- **Build issues**: Run `npm run build --filter=caravan-coordinator` from project root first
- **Turbo cache issues**: Clear cache with `npx turbo clean`

## Manual Control (Optional)

If you need manual control over containers:

```bash
# From e2e directory (apps/coordinator/e2e/)
docker-compose up -d    # Manual start
docker-compose down     # Manual stop
```

## Reports

- `test-results/` - Test artifacts and screenshots
- `playwright-report/` - HTML test reports (auto-opens on failure)

## Workspace Integration

The e2e tests are part of the Turbo monorepo workflow:

- Environment files: `apps/coordinator/.env.example`
- Dependencies: Managed in `apps/coordinator/package.json`  
- Configuration: Uses Turbo's task dependency system
- Caching: Build artifacts cached, test results are not (appropriate for e2e) 