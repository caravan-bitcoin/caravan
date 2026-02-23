/**
 * Page Object: Wallet (tabs, refresh, balance).
 *
 * Responsibility of this Page Object : The persistent UI elements that appear across
 * all wallet tabs — the tab bar, refresh button, and balance display.
 *
 */
import { Page, expect } from "@playwright/test";

export class WalletNavigation {
  constructor(private page: Page) {}

  /**
   * Switches to a named tab.
   *
   * WAIT CONTRACT: The tab button is visible AND clicked.
   * Does NOT wait for tab content — individual tab page objects
   * handle their own content readiness in their methods.
   */
  async switchToTab(tab: "Receive" | "Send" | "Transactions" | "Addresses") {
    const tabBtn = this.page.locator(
      `button[role=tab][type=button]:has-text('${tab}')`,
    );
    await expect(tabBtn).toBeVisible({ timeout: 10000 });
    await tabBtn.click();
  }

  async refresh() {
    await this.page.locator("button[type=button]:has-text('Refresh')").click();
  }

  async expectBalance(expectedText: string, timeout = 15000) {
    await expect(this.page.locator('[data-cy="balance"]')).toContainText(
      expectedText,
      { timeout },
    );
  }
}
