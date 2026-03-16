import { defineConfig, devices } from "@playwright/test";

// ── Test Phases ──────────────────────────────────────────────
// smoke/  → App loads, no wallet needed
// setup/  → Import wallet, fund it on regtest
// verify/ → Read-only: assert balances, addresses, UTXO display
// mutate/ → State-changing: sends, fee bumps, CPFP
//
// Ask: "After my test runs, is the wallet balance different?"
//   No  → verify/
//   Yes → mutate/
// ─────────────────────────────────────────────────────────────

export default defineConfig({
  testDir: "./tests",
  /* Run tests in files in parallel*/
  expect: {
    timeout: process.env.CI ? 30000 : 15000,
  },
  fullyParallel: false, // Changed to false for dependent tests

  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  workers: 1,

  // CI retry for transient infrastructure flakiness
  retries: process.env.CI ? 1 : 0,

  // Generous timeouts for regtest operations
  timeout: process.env.CI ? 90000 : 45000,

  reporter: [
    ["html", { outputFolder: "playwright-report" }],
    ["junit", { outputFile: "test-results/junit.xml" }],
  ],

  use: {
    baseURL: "http://localhost:5173",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    actionTimeout: process.env.CI ? 30000 : 15000,
  },

  projects: [
    {
      name: "smoke",
      testMatch: /smoke\/.*\.spec\.ts$/,
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "wallet-setup",
      testMatch: /setup\/.*\.setup\.ts$/,
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "verify-wallet",
      testMatch: /verify\/.*\.spec\.ts$/,
      dependencies: ["wallet-setup"],
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "mutate-wallet",
      testMatch: /mutate\/.*\.spec\.ts$/,
      dependencies: ["verify-wallet"],
      use: { ...devices["Desktop Chrome"] },
    },
  ],

  globalSetup: "./setup/globalSetup.ts",
  globalTeardown: "./setup/globalTeardown.ts",
});
