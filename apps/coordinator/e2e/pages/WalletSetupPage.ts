/**
 * Page Object: Wallet creation flow.
 *
 * Responsibility of this Page Object: Everything involved in creating a NEW multisig
 * wallet through the Caravan UI — filling xpubs, testing connections,
 * and downloading the wallet configuration file.
 */
import { Page, expect } from "@playwright/test";
import { ClientSetupOptions } from "../state/types";
import { clientConfig } from "../services/bitcoinClient";
import { testStateManager } from "../state/testState";

export class WalletSetupPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto("/#/wallet");
  }

  async setupPrivateClient(options: ClientSetupOptions = {}) {
    const {
      url = "http://localhost:8080",
      username = clientConfig.username,
      password = clientConfig.password,
      watcherWallet = testStateManager.getState().test_wallet_names[3],
    } = options;

    await this.goto();
    await this.page
      .locator("input[name='network'][value='regtest']")
      .setChecked(true);

    const urlField = this.page.locator('input[value="http://localhost:18443"]');
    await urlField.fill(url);

    await this.page.locator("#bitcoind-username").fill(username);
    await this.page.locator("#bitcoind-password").fill(password);
    await this.page.locator("#wallet-name").fill(watcherWallet);

    await this.page.click('button:has-text("Test Connection")');
  }

  async expectConnectionMessage(message: string) {
    await expect(this.page.getByText(message)).toBeVisible({
      timeout: 15000,
    });
  }

  async fillExtendedPublicKey(keyNumber: number, xpub: string) {
    await this.page.click(
      `div#public-key-${keyNumber}-importer-select[role='combobox']`,
    );
    await this.page.click(
      "li[role='option'][data-value='text']:has-text('Enter as text')",
    );
    await this.page.locator('textarea[name="publicKey"]').fill(xpub);
    await this.page.click("button[type=button]:has-text('Enter')");
  }

  async selectRegtestNetwork() {
    await this.page
      .locator("input[name='network'][value='regtest']")
      .setChecked(true);
  }

  async downloadWalletDetails(saveDir: string): Promise<string> {
    const btn = this.page.locator(
      'button[type=button]:has-text("Download Wallet Details")',
    );
    await expect(btn).toBeVisible({ timeout: 10000 });

    const downloadPromise = this.page.waitForEvent("download");
    await btn.click();

    const download = await downloadPromise;
    const filename = download.suggestedFilename();
    const savePath = `${saveDir}/${filename}`;
    await download.saveAs(savePath);

    return savePath;
  }
}
