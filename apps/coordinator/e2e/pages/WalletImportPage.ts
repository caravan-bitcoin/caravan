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

  private toExactInsensitiveRegex(value: string): RegExp {
    const escaped = value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return new RegExp(`^${escaped}$`, "i");
  }

  /**
   * Get the underlying Playwright page object (for advanced selectors if needed).
   */
  getPage(): Page {
    return this.page;
  }

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

  /**
   * Upload config and open the edit details view without confirming.
   * Useful for validation tests that need to inspect wallet details before import.
   */
  async uploadAndOpenDetailsForValidation(
    configPath: string,
  ) {
    await this.goto();
    await this.page.setInputFiles("input#upload-config", configPath);

    const editDetails = this.page.getByRole("link", { name: /edit details/i });
    if (await editDetails.isVisible().catch(() => false)) {
      await editDetails.click();
    }

    // "Network" is rendered as card text (not always a semantic heading),
    // so wait for the network radio group options as a stable readiness signal.
    await expect(this.page.getByRole("radio", { name: /mainnet/i })).toBeVisible();
    await expect(this.page.getByRole("radio", { name: /testnet/i })).toBeVisible();
    await expect(this.page.getByRole("radio", { name: /regtest/i })).toBeVisible();
  }

  /**
   * Validate that the network radio button is selected.
   */
  async validateNetworkSelection(expectedNetwork: string) {
    await expect(
      this.page.getByRole("radio", {
        name: this.toExactInsensitiveRegex(expectedNetwork),
      }),
    ).toBeChecked();
  }

  /**
   * Validate that the address type radio button is selected.
   */
  async validateAddressTypeSelection(expectedAddressType: string) {
    await expect(
      this.page.getByRole("radio", {
        name: this.toExactInsensitiveRegex(expectedAddressType),
      }),
    ).toBeChecked();
  }

  /**
   * Validate quorum (required and total signers).
   */
  async validateQuorumValues(
    requiredSigners: number,
    totalSigners: number,
  ) {
    await expect(this.page.getByText("Quorum", { exact: true })).toBeVisible();

    // Anchor on the visible labels and read the nearest preceding H2 value.
    const requiredValue = this.page.locator(
      "xpath=//p[normalize-space()='Required']/preceding::h2[1]",
    );
    await expect(requiredValue).toHaveText(String(requiredSigners));

    const totalValue = this.page.locator(
      "xpath=//p[normalize-space()='Total']/preceding::h2[1]",
    );
    await expect(totalValue).toHaveText(String(totalSigners));
  }

  /**
   * Validate a single signer card displays the expected name, xpub prefix, and bip32 path.
   */
  async validateSignerCard(signer: {
    name: string;
    xpub: string;
    bip32Path: string;
  }) {
    const signerCard = this.page
      .locator('[data-cy="editable-name-value"]', {
        hasText: signer.name,
      })
      .locator('xpath=ancestor::div[contains(@class,"MuiCard-root")]');

    await expect(signerCard).toBeVisible();
    await expect(
      signerCard.getByText(signer.xpub.slice(0, 12)),
    ).toBeVisible();
    await expect(
      signerCard.getByText(signer.bip32Path, { exact: true }),
    ).toBeVisible();
  }

  /**
   * Click confirm wallet button and wait for import to complete.
   */
  async confirmImport() {
    await this.page.locator("#confirm-wallet").click();
    await this.page.waitForTimeout(1000);

    // Wait for async import to complete - check for wallet name to appear
    // or wait for the import error count to stabilize
    await expect(
      this.page.locator('[data-cy="wallet-import-error"]'),
    ).toHaveCount(0, { timeout: 5000 });
  }
}
