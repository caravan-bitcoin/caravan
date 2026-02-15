import { test, expect } from "@playwright/test";

test.describe("Public API Provider Client Connections", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/#/wallet");
    await page.waitForLoadState("networkidle");
  });

  test("should show public provider radio buttons enabled on mainnet", async ({
    page,
  }) => {
    const mempoolRadio = page.getByRole("radio", { name: /Mempool\.space/i });
    const blockstreamRadio = page.getByRole("radio", {
      name: /Blockstream\.info/i,
    });
    const privateRadio = page.getByRole("radio", { name: /Private/i });

    await expect(mempoolRadio).toBeEnabled();
    await expect(blockstreamRadio).toBeEnabled();
    await expect(privateRadio).toBeEnabled();

    // Mempool.space is the default provider
    await expect(mempoolRadio).toBeChecked();
  });

  test("should select Mempool provider and reflect selection in UI", async ({
    page,
  }) => {
    // First switch away from the default to ensure clicking Mempool actually works
    const blockstreamRadio = page.getByRole("radio", {
      name: /Blockstream\.info/i,
    });
    await blockstreamRadio.click();
    await expect(blockstreamRadio).toBeChecked();

    // Now select Mempool
    const mempoolRadio = page.getByRole("radio", { name: /Mempool\.space/i });
    await mempoolRadio.click();

    await expect(mempoolRadio).toBeChecked();
    await expect(blockstreamRadio).not.toBeChecked();

    // Private client settings should NOT be visible
    await expect(page.locator("#bitcoind-username")).not.toBeVisible();
  });

  test("should select Blockstream provider and reflect selection in UI", async ({
    page,
  }) => {
    const blockstreamRadio = page.getByRole("radio", {
      name: /Blockstream\.info/i,
    });
    await blockstreamRadio.click();

    await expect(blockstreamRadio).toBeChecked();

    // Mempool should no longer be checked
    const mempoolRadio = page.getByRole("radio", { name: /Mempool\.space/i });
    await expect(mempoolRadio).not.toBeChecked();

    // Private client settings should NOT be visible
    await expect(page.locator("#bitcoind-username")).not.toBeVisible();
  });

  test("should switch between Mempool, Blockstream, and Private providers", async ({
    page,
  }) => {
    const mempoolRadio = page.getByRole("radio", { name: /Mempool\.space/i });
    const blockstreamRadio = page.getByRole("radio", {
      name: /Blockstream\.info/i,
    });
    const privateRadio = page.getByRole("radio", { name: /Private/i });

    // Mempool should be the default
    await expect(mempoolRadio).toBeChecked();

    // Switch to Blockstream
    await blockstreamRadio.click();
    await expect(blockstreamRadio).toBeChecked();
    await expect(mempoolRadio).not.toBeChecked();
    await expect(page.locator("#bitcoind-username")).not.toBeVisible();

    // Switch to Private — settings panel should appear
    await privateRadio.click();
    await expect(privateRadio).toBeChecked();
    await expect(blockstreamRadio).not.toBeChecked();
    await expect(page.locator("#bitcoind-username")).toBeVisible();

    // Switch back to Mempool — settings panel should disappear
    await mempoolRadio.click();
    await expect(mempoolRadio).toBeChecked();
    await expect(privateRadio).not.toBeChecked();
    await expect(page.locator("#bitcoind-username")).not.toBeVisible();
  });

});

test.describe("Public API Response Validation", () => {
  test("should fetch valid fee estimates from Mempool.space API", async ({
    request,
  }) => {
    await expect(async () => {
      // Get fee data
      const response = await request.get(
        "https://unchained.mempool.space/api/v1/fees/recommended",
      );
      expect(response.ok()).toBeTruthy();

      const data = await response.json();

      expect(data).toHaveProperty("fastestFee");
      expect(data).toHaveProperty("halfHourFee");
      expect(data).toHaveProperty("hourFee");
      expect(data).toHaveProperty("economyFee");
      expect(typeof data.fastestFee).toBe("number");
      expect(typeof data.halfHourFee).toBe("number");
      expect(typeof data.hourFee).toBe("number");
      expect(typeof data.economyFee).toBe("number");
    }).toPass({ timeout: 30_000, intervals: [2_000, 5_000, 10_000] });
  });

  test("should fetch valid fee estimates from Blockstream.info API", async ({
    request,
  }) => {
    await expect(async () => {
      const response = await request.get(
        "https://blockstream.info/api/fee-estimates",
      );
      expect(response.ok()).toBeTruthy();

      const data = await response.json();
      expect(typeof data).toBe("object");
      const keys = Object.keys(data);
      expect(keys.length).toBeGreaterThan(0);

      for (const key of keys) {
        expect(typeof data[key]).toBe("number");
        expect(data[key]).toBeGreaterThan(0);
      }
    }).toPass({ timeout: 30_000, intervals: [2_000, 5_000, 10_000] });
  });

  test("should fetch valid address data from Mempool.space API", async ({
    request,
  }) => {
    await expect(async () => {
      const address = "1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa";
      const response = await request.get(
        `https://unchained.mempool.space/api/address/${address}`,
      );
      expect(response.ok()).toBeTruthy();

      const data = await response.json();

      expect(data).toHaveProperty("chain_stats");
      expect(data.chain_stats).toHaveProperty("funded_txo_count");
      expect(data.chain_stats).toHaveProperty("funded_txo_sum");
      expect(data.chain_stats).toHaveProperty("spent_txo_count");
      expect(data.chain_stats).toHaveProperty("spent_txo_sum");
      expect(data.chain_stats).toHaveProperty("tx_count");
      expect(data).toHaveProperty("mempool_stats");
      expect(typeof data.chain_stats.funded_txo_count).toBe("number");
      expect(typeof data.chain_stats.tx_count).toBe("number");

      // address should be used
      expect(data.chain_stats.funded_txo_count).toBeGreaterThan(0);
    }).toPass({ timeout: 30_000, intervals: [2_000, 5_000, 10_000] });
  });
});
