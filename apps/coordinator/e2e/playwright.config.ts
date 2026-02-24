import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  fullyParallel: false,
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
      testMatch: /\.smoke\.spec\.ts$/,
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "wallet-setup",
      testMatch: "wallet.setup.ts",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      // Phase 1: Read-only tests that verify wallet state
      // These expect the wallet to be untouched (8 BTC, 4 addresses, etc.)
      name: "verify-wallet",
      testMatch: /\.verify\.spec\.ts$/,
      dependencies: ["wallet-setup"],
      use: { ...devices["Desktop Chrome"] },
    },
    {
      // Phase 2: Tests that modify wallet state (send transactions, fee bumps)
      // These run after verification because they change balances
      name: "mutate-wallet",
      testMatch: /\.mutate\.spec\.ts$/,
      dependencies: ["verify-wallet"],
      use: { ...devices["Desktop Chrome"] },
    },
  ],

  globalSetup: "./setup/globalSetup.ts",
  globalTeardown: "./setup/globalTeardown.ts",
});
