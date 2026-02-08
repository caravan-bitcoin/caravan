import fs from "fs";
import path from "path";
import { test, expect } from "../../fixtures/caravan.fixture";
import { testStateManager } from "../../state/testState";
import { clientConfig } from "../../services/bitcoinClient";

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
  test.beforeEach(async ({ page }) => {
    // Ensure we start with a slight delay to allow any previous cleanup
    await page.waitForTimeout(1000);
  });

  for (const { type, label, regex, skip } of ADDRESS_TYPES) {
    const testFn = skip ? test.skip : test;
    testFn(`should handle ${label} wallet correctly`, async ({ page, walletImport, receiveTab, btcClient }) => {
      try {
        // 1. Get Base Config
        const downloadedWalletFile = testStateManager.getDownloadedWalletFile();
        if (!fs.existsSync(downloadedWalletFile)) {
            throw new Error(`Wallet file not found at ${downloadedWalletFile}. Please run previous tests.`);
        }
        
        const walletConfig = JSON.parse(fs.readFileSync(downloadedWalletFile, "utf-8"));
        
        // 2. Modify Config for Address Type
        walletConfig.addressType = type;
        if (walletConfig.client) {
            walletConfig.client.url = "http://localhost:8080"; 
        } else {
            walletConfig.client = { url: "http://localhost:8080" };
        }
        walletConfig.network = "regtest";
        walletConfig.name = `Wallet ${type}`;
        
        // Save as temporary file
        const tempConfigPath = path.join(
            path.dirname(downloadedWalletFile), 
            `wallet_config_${type}.json`
        );
        fs.writeFileSync(tempConfigPath, JSON.stringify(walletConfig, null, 2));

        // 3. Import into Caravan
        await walletImport.importWalletAndPrepare(tempConfigPath, clientConfig.password);

        // 4. Verify Address Format (Receive Tab)
        await page.locator("button[role=tab][type=button]:has-text('Receive')").click();
        const address = await receiveTab.getCurrentAddress();
        console.log(`Generated ${type} Address: ${address}`);
        
        expect(address).toMatch(regex);

        // 5. Test Basic Transaction (Send data to this address)
        const senderWallet = testStateManager.getState().test_wallet_names[0];
        
        const initialSuffix = await receiveTab.getCurrentPathSuffix();

        // Send 1 BTC
        await btcClient?.sendToAddress(senderWallet, address, 1);

        // Wait for the UI to reflect new tx / increment path
        await expect.poll(async () => {
            return await receiveTab.getCurrentPathSuffix();
        }, {
            message: "Address path should increment after receiving funds",
            timeout: 30000,
            intervals: [1000]
        }).not.toBe(initialSuffix); 

      } catch (error) {
        throw new Error(`Failed testing ${type}: ${error}`);
      }
    });
  }
});
