/**
 * Page Object: Signature import and transaction broadcast.
 */
import { Page, expect } from "@playwright/test";

export class SignTab {
  constructor(private page: Page) {}

  async goToSignMode() {
    const btn = this.page.locator(
      'button[type=button]:has-text("Sign Transaction")',
    );
    await expect(btn).toBeVisible({ timeout: 10000 });
    await btn.click();
  }

  /**
   * Imports a signature for a specific key slot.
   *
   * @param keyNumber — 1-indexed key slot (matches "Extended Public Key N")
   * @param signaturesJson — JSON string of the signatures array
   */
  async importSignature(keyNumber: number, signaturesJson: string) {
    // Select which key
    await this.page.locator(`#signature-${keyNumber}-key-select`).click();
    await this.page
      .locator(`li[role='option']:has-text('Extended Public Key ${keyNumber}')`)
      .click();

    // Select "Enter as text" method
    await this.page.locator(`#signature-${keyNumber}-importer-select`).click();
    await this.page
      .locator("li[role='option']:has-text('Enter as text')")
      .click();

    // Fill signature data
    await this.page.locator("textarea[name='signature']").fill(signaturesJson);

    // Submit
    await this.page
      .locator("button[type='button']:has-text('Add Signature')")
      .click();
  }

  /**
   * Broadcasts and verifies success.
   *
   * WAIT CONTRACT: Returns only after "Transaction successfully broadcast."
   * is visible on screen.
   */
  async broadcastAndVerify() {
    const btn = this.page.locator(
      "button[type='button']:has-text('Broadcast Transaction')",
    );

    // Wait for all signatures to be processed
    await expect(btn).toBeEnabled({ timeout: 15000 });
    await btn.click();

    // Wait for success message
    await expect(
      this.page.getByText("Transaction successfully broadcast.", {
        exact: true,
      }),
    ).toBeVisible({ timeout: 15000 });
  }
}
