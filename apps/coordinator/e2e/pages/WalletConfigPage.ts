/**
 * Page Object: wallet configuration actions.
 */
import fs from "fs";
import { Page, expect } from "@playwright/test";

export class WalletConfigPage {
  constructor(private page: Page) {}

  async downloadDescriptorsJson() {
    const downloadButton = this.page.getByRole("button", {
      name: "Download Descriptors",
    });
    await expect(downloadButton).toBeVisible({ timeout: 15000 });
    await expect(downloadButton).toBeEnabled();
    await downloadButton.click();

    const jsonOption = this.page.getByRole("menuitem", {
      name: "Download JSON Format (.json)",
    });
    await expect(jsonOption).toBeVisible({ timeout: 15000 });

    const downloadPromise = this.page.waitForEvent("download");
    await jsonOption.click();

    const download = await downloadPromise;
    const path = await download.path();

    if (!path) {
      throw new Error("Descriptor JSON download did not produce a file path.");
    }

    return JSON.parse(fs.readFileSync(path, "utf-8"));
  }
}
