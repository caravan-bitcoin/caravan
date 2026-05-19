/**
 * Page Object: Send tab — transaction form and PSBT download.
 */
import { Page, expect } from "@playwright/test";

export class SendTab {
  constructor(private page: Page) {}

  async fillRecipient(address: string, amount: string) {
    await this.page.locator('input[name="destination"]').fill(address);
    await this.page.locator('input[name="amount"]').fill(amount);
  }

  async getFeeRate(): Promise<string> {
    return await this.page
      .locator('input[name="fee_rate"][type=number]')
      .inputValue();
  }

  /**
   * Sets a toggle to the desired state.
   *
   * Read current → click only if wrong → verify final state.
   * Never blindly click a toggle — you might flip it the wrong way.
   */
  async setManualCoinSelection(enabled: boolean) {
    const toggle = this.page.getByLabel("Manual");
    const isChecked = await toggle.isChecked();
    if (enabled !== isChecked) await toggle.click();

    if (enabled) {
      await expect(toggle).toBeChecked();
    } else {
      await expect(toggle).not.toBeChecked();
    }
  }

  async setRbf(enabled: boolean) {
    const toggle = this.page.getByLabel("Replace-by-Fee (RBF)");
    const isChecked = await toggle.isChecked();
    if (enabled !== isChecked) await toggle.click();

    if (enabled) {
      await expect(toggle).toBeChecked();
    } else {
      await expect(toggle).not.toBeChecked();
    }
  }

  /**
   * Selects UTXOs until target amount is met.
   */
  async selectUTXOs(targetAmount: number): Promise<number> {
    const mainTable = this.page.getByTestId("main-utxo-table");
    await expect(mainTable).toBeVisible();

    const rows = mainTable.locator('[data-testid^="main-utxo-row-"]');
    let selected = 0;

    for (const row of await rows.all()) {
      if (selected >= targetAmount) break;

      const balanceText = await row.locator("td").nth(3).textContent();
      const balance = parseFloat((balanceText ?? "").trim());

      const checkbox = row.locator('input[name="spend"][type="checkbox"]');

      // checkbox must be visible and not disabled
      await expect(checkbox).toBeVisible({ timeout: 5000 });

      if (!(await checkbox.isDisabled())) {
        await checkbox.check();
        selected += balance;
      }
    }

    return selected;
  }

  async addChangeOutput() {
    await this.page.getByTestId("AddIcon").click();
    await this.page
      .getByLabel("Set to wallet change address")
      .getByRole("button")
      .click();
    await this.page.getByTestId("AddCircleIcon").click();
  }

  async previewTransaction() {
    const btn = this.page.locator('button:has-text("Preview Transaction")');
    await expect(btn).toBeEnabled({ timeout: 10000 });
    await btn.click();
  }

  async downloadUnsignedPsbt(savePath: string): Promise<string> {
    const btn = this.page.locator(
      'button[type=button]:has-text("Download Unsigned PSBT")',
    );

    // Step 1: Button must be ready (no timer running yet)
    await expect(btn).toBeVisible({ timeout: 15000 });
    await expect(btn).toBeEnabled({ timeout: 5000 });

    // Step 2: Register listener (timer starts NOW)
    const downloadPromise = this.page.waitForEvent("download");

    // Step 3: Click immediately (full timeout available for download)
    await btn.click();

    // Step 4: Save
    const download = await downloadPromise;
    await download.saveAs(savePath);
    return savePath;
  }
}
