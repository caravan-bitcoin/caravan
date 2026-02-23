/**
 * Page Object: Caravan landing page.
 */
import { Page, expect } from "@playwright/test";

export class HomePage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto("/");
    await this.page.waitForLoadState("networkidle");
  }

  async expectLoaded() {
    await expect(this.page).toHaveTitle(/Caravan/);
    await expect(
      this.page.getByRole("heading", {
        name: /Secure your bitcoin with Caravan.*multisig coordinator/i,
      }),
    ).toBeVisible();
  }

  async navigateToWalletSetup() {
    await this.page.click('button[aria-label="Get started with Caravan"]');
    await expect(this.page).toHaveURL(/setup/);
    await this.page.locator('[data-cy="setup-wallet-button"]').click();
    await expect(this.page).toHaveURL(/wallet/);
  }

  async getDefaultWalletName(): Promise<string> {
    const el = this.page.locator('[data-cy="editable-name-value"]').first();
    await expect(el).toBeVisible();
    return (await el.textContent()) ?? "";
  }
}
