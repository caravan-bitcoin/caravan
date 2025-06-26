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

      const paths = [path1, path2, path3].map(path => "m/" + path?.replace(/h/g, "'"));
      
      walletConfig.extendedPublicKeys.forEach((key: any, index: number) => {
        key.xfp = xpfs[index];
        key.bip32Path = paths[index];
      });
      console.log("path1 check",paths[0])
      
      // Save the modified file
    //   const modifiedFile = downloadedWalletFile.replace('.json', '-regtest-modified.json');
      fs.writeFileSync(downloadedWalletFile, JSON.stringify(walletConfig, null, 2));
      
    // Update shared state
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

  test("should import modified wallet config in Caravan & match the address", async ({ page }) => {
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

      await page.locator("#bitcoind-password").fill(clientConfig.password)
      
      await page.locator("#confirm-wallet").click();

      await page.waitForTimeout(4000);

      await page.locator("button[type=button]:has-text('Import Addresses')").click();

      // Wait for the success message to appear
      const successMessage = page.locator('text="Addresses imported."');
      await expect(successMessage).toBeVisible({ timeout: 30000 });

      await page.locator("button[role=tab][type=button]:has-text('Receive')").click();

      await page.waitForSelector('table');

      //Extract complete table data 
      const tableData = await page.evaluate(() => {
        const rows = Array.from(document.querySelectorAll('tbody tr'));
        console.log("rows:", rows)

        return rows.map(row => {
          const cells = Array.from(row.querySelectorAll('td'));
          return {
            pathSuffix: cells[1]?.textContent?.trim(),
            utxos: cells[2]?.textContent?.trim(),
            balance: cells[3]?.textContent?.trim(),
            address: cells[4]?.querySelector('code')?.textContent?.trim()
          }
        })
      })
      console.log("table data", tableData)

      tableData.forEach((row,index) => {
        expect(row.address).toMatch(/^2[MN]/);
        console.log(`Address matched for row: ${index + 1}`)
      })
      

      console.log('Wallet uploaded successfully - "Addresses imported." message appeared');
      
    } catch (error) {
      console.log("Error in wallet import:", error);
      throw error;
    }
  });
});