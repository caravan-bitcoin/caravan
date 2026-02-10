import { test, expect } from "@playwright/test";
import { testStateManager } from "../utils/testState";
import fs from "fs";
import path from "path";
import bitcoinClient, { clientConfig } from "../utils/bitcoinClient";
import {
  getCurrentReceiveAddress,
  getCurrentPathSuffix,
} from "../testhelpers/tableExtractor";

const ADDRESS_TYPES = [
  { 
    type: "P2WSH", 
    label: "Native SegWit (P2WSH)", 
    regex: /^bcrt1q[0-9a-z]{58}$/  
  },
  { 
    type: "P2SH-P2WSH", 
    label: "Nested SegWit (P2SH-P2WSH)", 
    regex: /^2[1-9A-HJ-NP-Za-km-z]{30,40}$/ 
  },
  { 
    type: "P2TR", 
    label: "Taproot (P2TR)", 
    regex: /^bcrt1p.{50,}$/, 
    skip: true 
  }
];

test.describe("Wallet Address Types", () => {
  const client = bitcoinClient();

  test.beforeEach(async ({ page }) => {
    // Ensure we start with a slight delay to allow any previous cleanup
    await page.waitForTimeout(1000);
  });

  for (const { type, label, regex, skip } of ADDRESS_TYPES) {
    const testFn = skip ? test.skip : test;
    testFn(`should handle ${label} wallet correctly`, async ({ page }) => {
      try {
        // 1. Get Base Config
        const downloadedWalletFile = testStateManager.getDownloadedWalletFile();
        if (!fs.existsSync(downloadedWalletFile)) {
            throw new Error(`Wallet file not found at ${downloadedWalletFile}. Please run previous tests.`);
        }
        
        const walletConfig = JSON.parse(fs.readFileSync(downloadedWalletFile, "utf-8"));
        
        // 2. Modify Config for Address Type
        walletConfig.addressType = type;
        walletConfig.name = `Wallet ${type}`;
        walletConfig.network = "regtest";
        walletConfig.client.url = "http://localhost:8080"; 
        
        // Save as temporary file
        const tempConfigPath = path.join(
            path.dirname(downloadedWalletFile), 
            `wallet_config_${type}.json`
        );
        fs.writeFileSync(tempConfigPath, JSON.stringify(walletConfig, null, 2));

        // 3. Import into Caravan
        await page.goto("/#/wallet");
        await page.setInputFiles("input#upload-config", tempConfigPath);
        await page.locator("#bitcoind-password").fill(clientConfig.password);
        await page.locator("#confirm-wallet").click();

        // 4. Handle Address Import (if needed)
        await page.waitForTimeout(1000);
        const importBtn = page.locator("button[type=button]:has-text('Import Addresses')");
        // Use isVisible() because isEnabled() waits for the element to exist, causing timeout if it's not there
        if (await importBtn.isVisible()) {
          await importBtn.click();
          await expect(page.locator('text="Addresses imported."')).toBeVisible({ timeout: 60000 });
        }

        // 5. Verify Address Format (Receive Tab)
        await page.locator("button[role=tab][type=button]:has-text('Receive')").click();
        const address = await getCurrentReceiveAddress(page);
        console.log(`Generated ${type} Address: ${address}`);
        
        expect(address).toMatch(regex);

        // 6. Test Basic Transaction (Send data to this address)
        // Fund the address to see if it receives (updating the UI)
        const senderWallet = testStateManager.getState().test_wallet_names[0];
        
        // Send 1 BTC
        await client?.sendToAddress(senderWallet, address, 1);

        // Expect the path index to increment or the UI to reflect new tx
        // The 'next Address' button logic works by checking if the address changes or path increments
        // Here we just wait for the Receive tab to show we received funds? 
        // Or wait for the "Address" to change on the Receive page if "show next address" is auto?
        // Caravan usually shows the next fresh address. If we sent to current, it becomes "used". 
        // So the "current address" shown should eventually update to the next one.
        
        await expect.poll(async () => {
            return await getCurrentPathSuffix(page);
        }, {
            message: "Address path should increment after receiving funds",
            timeout: 30000,
            intervals: [1000]
        }).not.toBe("0/0"); // Assuming it starts at 0/0 and moves to 0/1

      } catch (error) {
        throw new Error(`Failed testing ${type}: ${error}`);
      }
    });
  }
});
