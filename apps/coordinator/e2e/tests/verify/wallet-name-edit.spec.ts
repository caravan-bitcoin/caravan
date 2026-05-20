/**
 * Wallet name editing verification.
 *
 * Dependencies: wallet.setup.ts (via Playwright project dependencies)
 * Preconditions: assertModifiedWalletConfig
 */
import fs from "fs";
import path from "path";
import { test, expect } from "../../fixtures/caravan.fixture";
import { assertModifiedWalletConfig } from "../../fixtures/preconditions";
import { testStateManager } from "../../state/testState";

function writeWalletConfigWithoutClient() {
  const walletFile = testStateManager.getDownloadedWalletFile();
  const walletConfig = JSON.parse(fs.readFileSync(walletFile, "utf-8"));
  delete walletConfig.client;

  const configPath = path.join(
    testStateManager.getState().downloadDir,
    "wallet-config-without-client.json",
  );

  fs.writeFileSync(configPath, JSON.stringify(walletConfig, null, 2));
  return configPath;
}

test.describe("Wallet Name Editing", () => {
  test.beforeAll(() => {
    assertModifiedWalletConfig();
  });

  test.beforeEach(async ({ page }) => {
    await page.goto("/#/wallet");
    await page.evaluate(() => sessionStorage.clear());
    await page.reload();

    await page.setInputFiles(
      "input#upload-config",
      writeWalletConfigWithoutClient(),
    );
    await expect(
      page.getByRole("button", { name: "Download Descriptors" }),
    ).toBeVisible();
  });

  test("wallet name can be edited and saved", async ({ page }) => {
    const nameDisplay = page.locator('[data-cy="editable-name-value"]').first();
    await expect(nameDisplay).toBeVisible();

    const originalName = (await nameDisplay.textContent())?.trim();
    expect(originalName).toBeTruthy();

    const newName = `${originalName}-renamed`;

    await page.locator('[data-cy="edit-button"]').first().click();

    const nameInput = page.getByLabel("Name").first();
    await expect(nameInput).toBeVisible();
    await nameInput.fill(newName);

    await page.locator('[data-cy="save-button"]').first().click();

    await expect(nameInput).not.toBeVisible();
    await expect(nameDisplay).toHaveText(newName);
  });
});
