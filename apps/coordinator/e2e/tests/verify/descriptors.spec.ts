/**
 * Wallet descriptor export verification.
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

test.describe("Wallet Descriptor Export", () => {
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

  test("downloads receive and change descriptors as JSON", async ({
    walletConfig,
  }) => {
    const descriptors = await walletConfig.downloadDescriptorsJson();

    expect(descriptors).toHaveProperty("receive");
    expect(descriptors).toHaveProperty("change");
    expect(descriptors.receive).toEqual(expect.any(String));
    expect(descriptors.change).toEqual(expect.any(String));
    expect(descriptors.receive).toMatch(/#([a-z0-9]{8})$/i);
    expect(descriptors.change).toMatch(/#([a-z0-9]{8})$/i);
    expect(descriptors.receive).toContain("sortedmulti");
    expect(descriptors.change).toContain("sortedmulti");
  });
});
