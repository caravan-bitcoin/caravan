/**
 * Page Object: Wallet configuration import flow.
 *
 * Responsibility of this Page Object: Loading a previously-created wallet config file
 * into Caravan — uploading the JSON, entering the password,
 * confirming, and importing addresses.
 *
 * This is the most-used page object: every behavioral test's
 * beforeEach calls importWalletAndPrepare().
 *
 */
import { Page, expect } from "@playwright/test";

export class WalletImportPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto("/#/wallet");
  }

  async importConfig(configPath: string, password: string) {
    await this.page.setInputFiles("input#upload-config", configPath);
    await this.page.locator("#bitcoind-password").fill(password);
    await this.page.locator("#confirm-wallet").click();

    // Wait for the wallet to actually load.
    // Two possible states:
    //   A) First time → "Import Addresses" button appears
    //   B) Already imported → Tab buttons appear directly
    //
    // We check for ANY button in the wallet action area ...
    await expect(
      this.page
        .locator("button:has-text('Import Addresses'), button[role=tab]")
        .first(),
    ).toBeVisible({ timeout: 15000 });
  }

  /**
   * Clicks "Import Addresses" if the button is available and enabled.
   *
   * WAIT CONTRACT: When this returns, addresses are imported
   * (success message visible) OR import wasn't needed.
   */
  async importAddressesIfNeeded() {
    const btn = this.page.locator(
      "button[type=button]:has-text('Import Addresses')",
    );

    const isVisible = await btn.isVisible().catch(() => false);
    if (!isVisible) return;

    const isEnabled = await btn.isEnabled().catch(() => false);
    if (!isEnabled) return;

    await btn.click();
    await expect(this.page.locator('text="Addresses imported."')).toBeVisible({
      timeout: 30000,
    });
  }

  async importWalletAndPrepare(configPath: string, password: string) {
    await this.goto();
    await this.importConfig(configPath, password);
    await this.importAddressesIfNeeded();
  }
}
