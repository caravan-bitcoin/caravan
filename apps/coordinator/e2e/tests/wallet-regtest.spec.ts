import { test, expect } from "@playwright/test";
import { testStateManager } from "../utils/testState";

import fs from "fs";
import bitcoinClient, { clientConfig } from "../utils/bitcoinClient";

test.describe("Wallet Regtest Configuration", () => {

   const client = bitcoinClient();
  
  test("should modify wallet configuration for regtest", async ({ page }) => {
    console.log('Starting wallet config modification for regtest');
    
    try {
      // Get the downloaded wallet file from previous tests
      const downloadedWalletFile = testStateManager.getDownloadedWalletFile();
      const walletConfig = JSON.parse(fs.readFileSync(downloadedWalletFile, "utf-8"));
      
      console.log("Original wallet config network:", walletConfig.network);
      
      walletConfig.network = 'regtest';
      walletConfig.client.url = 'http://localhost:8080';

      const walletNames= testStateManager.getWalletsNames();

      const xfp1 = (await client?.extractAddressDescriptors(walletNames[0]))?.p2sh.fingerPrint;
      const xfp2 = (await client?.extractAddressDescriptors(walletNames[1]))?.p2sh.fingerPrint;
      const xfp3 = (await client?.extractAddressDescriptors(walletNames[2]))?.p2sh.fingerPrint;

      const xpfs = [xfp1,xfp2,xfp3];

      const path1 = (await client?.extractAddressDescriptors(walletNames[0]))?.p2sh.path;
      const path2 = (await client?.extractAddressDescriptors(walletNames[1]))?.p2sh.path;
      const path3 = (await client?.extractAddressDescriptors(walletNames[2]))?.p2sh.path;

      const paths = [path1, path2, path3];
      
      walletConfig.extendedPublicKeys.forEach((key: any, index: number) => {
        key.xfp = xpfs[index];
        key.bip32Path = paths[index];
      });
      
      // Save the modified file
    //   const modifiedFile = downloadedWalletFile.replace('.json', '-regtest-modified.json');
      fs.writeFileSync(downloadedWalletFile, JSON.stringify(walletConfig, null, 2));
      
    //   // Update shared state
    //   testStateManager.updateState({ 
    //     downloadWalletFile: JSON.stringify(walletConfig, null ,2)
    //   });
      
    //   console.log('Wallet config modified successfully');
    //   console.log('Modified file:', modifiedFile);
      
    } catch (error) {
      console.log("Error in wallet config modification:", error);
      throw error;
    }
  });

  test("should import modified wallet config in Caravan", async ({ page }) => {
    console.log('Starting wallet import test');
    
    try {
      // Get the modified wallet file
      const modifiedWalletFile = testStateManager.getDownloadedWalletFile();
      console.log("modifiedwalletFile", modifiedWalletFile);
      
      // Debug: Check if file exists
      if (!fs.existsSync(modifiedWalletFile)) {
        throw new Error(`File does not exist at path: ${modifiedWalletFile}`);
      }
      console.log("File exists, size:", fs.statSync(modifiedWalletFile).size, "bytes");
      
      // Navigate to wallet page
      await page.goto("/#/wallet");
      
      await page.waitForTimeout(2000);

    
      const inputExists = await page.locator('input#upload-config').count();
      console.log("Number of upload-config inputs found:", inputExists);
      
    
      console.log("Setting input files...");
      await page.setInputFiles('input#upload-config', modifiedWalletFile);
      
      // Wait a bit for the file to be set
      await page.waitForTimeout(3000);

      await page.locator("#bitcoind-password").fill(clientConfig.password)
      
      await page.locator("#confirm-wallet").click();

      // chk1: Wait for loading spinner/indicator to appear then disappear
      // await page.waitForSelector('.loading-spinner', { state: 'visible' });
      // await page.waitForSelector('.loading-spinner', { state: 'hidden' });

      // chk2: Wait for a specific element that appears after loading
      // await page.waitForSelector('#wallet-loaded', { timeout: 30000 });

      // chk3: Wait for loading overlay to disappear (common pattern)
      // await page.waitForSelector('.loading-overlay', { state: 'hidden', timeout: 30000 });

      // chk4 Wait for network requests to complete
      // await page.waitForLoadState('networkidle');

      // chk5: Wait for a custom condition (e.g., no loading classes present)
      // await page.waitForFunction(() => !document.querySelector('.loading'));

      // chk6: Wait for specific text to appear/disappear
      // await page.waitForSelector('text="Loading..."', { state: 'hidden' });

      // For now, using a longer timeout to handle the loading
      await page.waitForTimeout(40000);

      console.log('Loading completed, wallet should be imported');
      
    } catch (error) {
      console.log("Error in wallet import:", error);
      throw error;
    }
  });
});