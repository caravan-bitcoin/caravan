import { test, expect } from "@playwright/test";
import { testStateManager } from "../utils/testState";

import fs from "fs";
import bitcoinClient, { getClientConfig } from "../utils/bitcoinClient";
import {
  extractAddressTableData,
  getCurrentReceiveAddress,
  getCurrentPathSuffix,
} from "../testhelpers/tableExtractor";
import { extractMultiWalletDescriptors } from "../testhelpers/bitcoinDescriptors";

test.describe("Wallet Regtest Configuration", () => {
  const client = bitcoinClient();
  const clientConfig = getClientConfig()

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

      const senderWallet = testStateManager.getState().test_wallet_names[0];

      const txids: string[] = [];

      for (const address of walletAddresses) {
        const txid = await client?.sendToAddress(senderWallet, address, 0.5);
        txids.push(txid);
      }

      //Should update to the next index when a deposit is received
      const currentPathSuffix = await getCurrentPathSuffix(page);

      const pathIndex = currentPathSuffix.split("/")[2];

      //Should end with 4 (as starting index = 0), as we have send 4 times
      expect(pathIndex).toBe("4");

      await page
        .locator(
          "button[role=tab][type=button]:has-text('Pending Transactions')",
        )
        .click();

      await page.locator("button[type=button]:has-text('Refresh')").click();

      await page
        .locator("button[role=tab][type=button]:has-text('Addresses')")
        .click();

      // Extract address table data using helper
      const addressTable = await extractAddressTableData(page);

      // This includes both pending and confirmed tx
      let totalBalance = 0;

      addressTable.forEach((row, index) => {
        expect(row.address).toMatch(/^2[MN]/);
        totalBalance += parseFloat(row.balance);
      });

      //Sending 0.5btc each to 4 addresses
      expect(totalBalance).toBe(2);

      const senderAddress = testStateManager.getSenderAddress();
      const walletNames = testStateManager.getWalletsNames();

      // Mine 4 more block to confirm our pending txs
      await client?.fundAddress(senderAddress, walletNames[0], 4);

      await page.locator("button[type=button]:has-text('Refresh')").click();

      // Confirming the balance after confirming tx
      await expect(page.locator('[data-cy="balance"]')).toHaveText("2 BTC");
    } catch (error) {
      throw new Error(`Error in wallet import: ${error}`);
    }
  });
});
