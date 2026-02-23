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
    // Phase 1: Smoke tests (no external dependencies)
    {
      name: "smoke",
      testMatch: "smoke.spec.ts",
      use: { ...devices["Desktop Chrome"] },
    },

    // Phase 2: Infrastructure setup
    {
      name: "wallet-setup",
      testMatch: "wallet.setup.ts",
      use: { ...devices["Desktop Chrome"] },
    },

    // Phase 3: Behavioral tests (depend on setup completing)
    {
      name: "wallet-tests",
      testMatch: /wallet-display|transaction-flow/,
      dependencies: ["wallet-setup"],
      use: { ...devices["Desktop Chrome"] },
    },
  ],

  globalSetup: "./setup/globalSetup.ts",
  globalTeardown: "./setup/globalTeardown.ts",
});
