import { test, expect } from "@playwright/test";
import { clientConfig } from "../utils/bitcoinClient";

test.describe("Caravan Wallet Creation", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
  });

  test("should load Caravan homepage", async ({ page }) => {
    const check = await expect(page).toHaveTitle(/Caravan/);
    console.log("status", check);

    const body = page.locator("body");
    await expect(body).toBeVisible();
  });

  test("should load wallet page", async ({ page }) => {
    await page.click('button[aria-label="Get started with Caravan"]');

    await page.waitForTimeout(2000);

    expect(page).toHaveURL(/setup/);
    await page.waitForTimeout(2000);

    await page.locator('[data-cy="setup-wallet-button"]').click();
    await page.waitForTimeout(2000);

    await expect(page).toHaveURL(/wallet/);

    const def_wallet_name = await page
      .locator('[data-cy="editable-name-value"]')
      .first()
      .textContent();
    await page.waitForTimeout(2000);
    expect(def_wallet_name).toBe("My Multisig Wallet");
  });

  test("Test Bitcoin Client successfull private Connection", async ({
    page,
  }) => {
    await page.goto("/#/wallet");

    await page.click('input[name="clientType"][value="private"]');

    const def_Url = page.locator('input[value="http://localhost:8332"]');
    console.log("def_url", def_Url);
    await expect(def_Url).toHaveValue("http://localhost:8332");
    await def_Url.fill("http://localhost:8080");

    await page.locator("#bitcoind-username").fill(clientConfig.username);
    await page.locator("#bitcoind-password").fill(clientConfig.password);

    await page.click('button:has-text("Test Connection")');

    await expect(page.getByText("Connection Success!")).toBeVisible();
  });

  test("Test Bitcoin Client with wrong url", async ({ page }) => {
    await page.goto("/#/wallet");

    await page.click('input[name="clientType"][value="private"]');

    const def_Url = page.locator('input[value="http://localhost:8332"]');

    await def_Url.fill("http://localhost:8081");

    await page.locator("#bitcoind-username").fill(clientConfig.username);
    await page.locator("#bitcoind-password").fill(clientConfig.password);

    await page.click('button:has-text("Test Connection")');

    await expect(page.getByText("Network Error")).toBeVisible();
  });
  test("Test Bitcoin Client with incorrect credentials", async ({ page }) => {
    await page.goto("/#/wallet");

    await page.click('input[name="clientType"][value="private"]');

    const def_Url = page.locator('input[value="http://localhost:8332"]');

    await def_Url.fill("http://localhost:8080");

    await page.locator("#bitcoind-username").fill("random1");
    await page.locator("#bitcoind-password").fill(clientConfig.password);

    await page.click('button:has-text("Test Connection")');

    await expect(
      page.getByText("Request failed with status code 401"),
    ).toBeVisible();

    await page.waitForTimeout(2000);
  });
});
