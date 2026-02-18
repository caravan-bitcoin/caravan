import { test, expect } from "@playwright/test";
import { testStateManager } from "../utils/testState";

import fs from "fs";
import bitcoinClient, { clientConfig } from "../utils/bitcoinClient";
import {
  extractAddressTableData,
  getCurrentReceiveAddress,
  getCurrentPathSuffix,
} from "../testhelpers/tableExtractor";
import { extractMultiWalletDescriptors } from "../testhelpers/bitcoinDescriptors";

test.describe("Wallet Regtest Configuration", () => {
  const client = bitcoinClient();

  test.beforeEach(async ({ page }) => {
    await page.waitForTimeout(1000);
  });

  test("should modify wallet configuration for regtest", async ({ page }) => {
    try {
      // Get the downloaded wallet file from previous tests
      const downloadedWalletFile = testStateManager.getDownloadedWalletFile();
      const walletConfig = JSON.parse(
        fs.readFileSync(downloadedWalletFile, "utf-8"),
      );

      walletConfig.network = "regtest";
      walletConfig.client.url = "http://localhost:8080";

      const allWalletNames = testStateManager.getWalletsNames();
      // Only use the first 3 wallets (signing wallets), not the watcher wallet
      const walletNames = allWalletNames.slice(0, 3);

      // Extract descriptors for all wallets efficiently using helper with client
      const { xfps, formattedPaths } = await extractMultiWalletDescriptors(
        walletNames,
        client,
        "p2pkh",
      );

      walletConfig.extendedPublicKeys.forEach((key: any, index: number) => {
        key.xfp = xfps[index];
        key.bip32Path = formattedPaths[index];
      });

      walletConfig.extendedPublicKeys.forEach((key: any, index: number) => {});

      // Save the modified file
      const configToWrite = JSON.stringify(walletConfig, null, 2);
      fs.writeFileSync(downloadedWalletFile, configToWrite);
    } catch (error) {
      throw new Error(`Error in wallet config modification: ${error}`);
    }
  });

  test("should import modified wallet config in Caravan & match the address", async ({
    page,
  }) => {
    try {
      // Get the modified wallet file
      const modifiedWalletFile = testStateManager.getDownloadedWalletFile();

      if (!fs.existsSync(modifiedWalletFile)) {
        throw new Error(`File does not exist at path: ${modifiedWalletFile}`);
      }

      // Navigate to wallet page
      await page.goto("/#/wallet");

      await page.setInputFiles("input#upload-config", modifiedWalletFile);

      await page.locator("#bitcoind-password").fill(clientConfig.password);

      await page.locator("#confirm-wallet").click();

      await page.waitForTimeout(1000);

      const isEnabled = await page
        .locator("button[type=button]:has-text('Import Addresses')")
        .isEnabled();

      if (isEnabled) {
        await page
          .locator("button[type=button]:has-text('Import Addresses')")
          .click();

        // Wait for the success message to appear
        const successMessage = page.locator('text="Addresses imported."');
        await expect(successMessage).toBeVisible({ timeout: 30000 });
      }

      await page
        .locator("button[role=tab][type=button]:has-text('Receive')")
        .click();

      const walletAddresses: string[] = [];

      for (let i = 0; i < 4; i++) {
        // Extract current address using helper
        const currentAddress = await getCurrentReceiveAddress(page);
        walletAddresses.push(currentAddress);

        // Only click next if not last iteration
        if (i < 4) {
          await page
            .locator("button[type=button]:has-text('Next Address')")
            .click();

          await page.waitForFunction(
            (prevAddress) => {
              const addressElement = document.querySelector(
                "tbody tr td:nth-child(5) code",
              );
              return addressElement?.textContent?.trim() !== prevAddress;
            },
            currentAddress,
            { timeout: 1000 },
          );
        }
      }

      const senderWallet = testStateManager.getState().test_wallet_names[0];

      const txids: string[] = [];

      for (const address of walletAddresses) {
        const txid = await client?.sendToAddress(senderWallet, address, 2);
        txids.push(txid);
      }

      //Should update to the next index when a deposit is received
      await expect
        .poll(
          async () => {
            const currentPathSuffix = await getCurrentPathSuffix(page);
            const pathIndex = currentPathSuffix.split("/")[2];
            return pathIndex;
          },
          {
            message: "Path index should be 4",
            timeout: 30000,
            intervals: [2000, 2000, 2000],
          },
        )
        .toBe("4");

      // Wait for pending transactions button to be stable
      const txButton = page.locator(
        "button[role=tab][type=button]:has-text('Transactions')",
      );

      await expect(txButton).toBeVisible({ timeout: 15000 });
      await txButton.click({ timeout: 15000 });

      await page.locator("button[type=button]:has-text('Refresh')").click();

      await page
        .locator("button[role=tab][type=button]:has-text('Addresses')")
        .click();

      await page.waitForTimeout(2000);

      // Extract address table data using helper
      const addressTable = await extractAddressTableData(page);

      // This includes both pending and confirmed tx
      let totalBalance = 0;

      addressTable.forEach((row, index) => {
        expect(row.address).toMatch(/^2[MN]/);
        console.log(`address ${index + 1}: ${row.address}`);
        totalBalance += parseFloat(row.balance);
      });

      //Sending 2btc each to 4 addresses
      expect(totalBalance).toBe(8);

      const senderRef = testStateManager.getSender();

      // Mine 4 more block to confirm our pending txs
      await client?.fundAddress(senderRef.address, senderRef.walletName, 4);

      await page.locator("button[type=button]:has-text('Refresh')").click();

      await expect(page.locator('[data-cy="balance"]')).toContainText("8 BTC", {
        timeout: 15000,
      });
    } catch (error) {
      throw new Error(`Error in wallet import: ${error}`);
    }
  });
  test("should allow user to edit and save wallet name", async ({ page }) => {
  try {
    await page.goto("/#/wallet");
    await expect(page).toHaveURL(/.*\/wallet/);

    // Wallet name should be visible (display mode)
    let nameDisplay = page.locator('[data-cy="editable-name-value"]').first();
    await expect(nameDisplay).toBeVisible();

    const originalName = (await nameDisplay.textContent())?.trim();
    if (!originalName) {
      throw new Error("Wallet name is empty or not found");
    }

    const newName = `${originalName}-renamed-${Date.now()}`;

    // Enter edit mode
    const editButton = page.locator('[data-cy="edit-button"]').first();
    await editButton.click();

    // Edit input visible
    const nameInput = page.getByLabel("Name");
    await expect(nameInput).toBeVisible();

    await nameInput.fill(newName);

    // Save change
    const saveButton = page.locator('[data-cy="save-button"]').first();
    await expect(saveButton).toBeEnabled();
    await saveButton.click();

    // UI exits edit mode
    await expect(nameInput).not.toBeVisible();
    await expect(editButton).toBeVisible();

    // Updated name shown in display mode
    nameDisplay = page.locator('[data-cy="editable-name-value"]').first();
    await expect(nameDisplay).toHaveText(newName);

  } catch (error) {
    throw new Error(`Error in wallet name editing: ${error}`);
  }
});
});
