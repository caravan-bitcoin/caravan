# E2E Tests

End-to-end tests for Caravan Coordinator using Playwright.

## Prerequisites

- Docker
- Node.js (see `.nvmrc` in project root)

## Quick Start

### 1. Environment Setup

```bash
# Copy the example environment file
cp .env.example .env
```

### 2. Install Dependencies

```bash
npm install
npm run test:install  # Install Playwright browsers
```

### 3. Run Tests

```bash
# Run all tests (everything automated)
npm run test

# Run tests with interactive UI
npm run test:ui

# Run tests in headed mode (see browser)
npm run test:headed
```

## What Happens Automatically

When you run any test command, the system automatically:

1. **Checks Docker availability** - Ensures Docker is running
2. **Pulls images** - Downloads Bitcoin regtest node if needed  
3. **Starts containers** - Spins up Bitcoin node and Caravan coordinator
4. **Waits for connections** - Ensures all services are ready
5. **Creates test wallets** - Sets up Bitcoin wallets for testing
6. **Runs tests** - Executes Playwright tests
7. **Cleans up** - Removes test wallets and stops containers

No manual Docker commands needed! 

## Test Structure

- `tests/caravan_test.spec.ts` - Main test suite
- `utils/` - Automated setup, teardown, and Bitcoin utilities
- `docker-compose.yml` - Bitcoin regtest + Caravan coordinator
- `playwright.config.ts` - Playwright configuration with global setup

## Troubleshooting

- **"Docker is required"**: Install Docker and make sure it's running
- **Port conflicts**: Ensure ports 5173, 8080, and 18443 are free
- **Build issues**: Run `npm run build` from project root first

## Manual Control (Optional)

If you need manual control over containers:

```bash
# Manual start
docker-compose up -d

# Manual stop  
docker-compose down
```

## Reports

- `test-results/` - Test artifacts and screenshots
- `playwright-report/` - HTML test reports (auto-opens on failure) 