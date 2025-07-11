import { test, expect } from "@playwright/test";
import { testStateManager } from "../utils/testState";

import fs from "fs";
import bitcoinClient, { clientConfig } from "../utils/bitcoinClient";
import { recieveTableData } from "../utils/types";


test.describe("Wallet Regtest Configuration", () => {
  const client = bitcoinClient();

  test("should modify wallet configuration for regtest", async ({ page }) => {
    console.log("Starting wallet config modification for regtest");

    try {
      // Get the downloaded wallet file from previous tests
      const downloadedWalletFile = testStateManager.getDownloadedWalletFile();
      const walletConfig = JSON.parse(
        fs.readFileSync(downloadedWalletFile, "utf-8"),
      );

      console.log("Original wallet config network:", walletConfig.network);

      walletConfig.network = "regtest";
      walletConfig.client.url = "http://localhost:8080";

      const walletNames = testStateManager.getWalletsNames();

      const xfp1 = (await client?.extractAddressDescriptors(walletNames[0]))
        ?.p2pkh.fingerPrint;
      const xfp2 = (await client?.extractAddressDescriptors(walletNames[1]))
        ?.p2pkh.fingerPrint;
      const xfp3 = (await client?.extractAddressDescriptors(walletNames[2]))
        ?.p2pkh.fingerPrint;

      const xpfs = [xfp1, xfp2, xfp3];

      const path1 = (await client?.extractAddressDescriptors(walletNames[0]))
        ?.p2pkh.path;
      const path2 = (await client?.extractAddressDescriptors(walletNames[1]))
        ?.p2pkh.path;
      const path3 = (await client?.extractAddressDescriptors(walletNames[2]))
        ?.p2pkh.path;

      const paths = [path1, path2, path3].map(
        (path) => "m/" + path?.replace(/h/g, "'"),
      );

      walletConfig.extendedPublicKeys.forEach((key: any, index: number) => {
        key.xfp = xpfs[index];
        key.bip32Path = paths[index];
      });
      console.log("path1 check", paths[0]);

      // Save the modified file
      //   const modifiedFile = downloadedWalletFile.replace('.json', '-regtest-modified.json');
      fs.writeFileSync(
        downloadedWalletFile,
        JSON.stringify(walletConfig, null, 2),
      );

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

  test("should import modified wallet config in Caravan & match the address", async ({
    page,
  }) => {
    console.log("Starting wallet import test");

    try {
      // Get the modified wallet file
      const modifiedWalletFile = testStateManager.getDownloadedWalletFile();
      console.log("modifiedwalletFile", modifiedWalletFile);

      if (!fs.existsSync(modifiedWalletFile)) {
        throw new Error(`File does not exist at path: ${modifiedWalletFile}`);
      }
      console.log(
        "File exists, size:",
        fs.statSync(modifiedWalletFile).size,
        "bytes",
      );

      // Navigate to wallet page
      await page.goto("/#/wallet");

      const inputExists = await page.locator("input#upload-config").count();
      console.log("Number of upload-config inputs found:", inputExists);

      console.log("Setting input files...");
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
      let recieveTableData: recieveTableData[] ;

      for (let i = 0; i < 4; i++) {
        await page.waitForSelector("table");

        //Extract complete table data
        recieveTableData = await page.evaluate(() => {
          const rows = Array.from(document.querySelectorAll("tbody tr"));
          console.log("rows:", rows);

          return rows.map((row) => {
            const cells = Array.from(row.querySelectorAll("td"));
            return {
              pathSuffix: cells[1]?.textContent?.trim()!,
              utxos: cells[2]?.textContent?.trim()!,
              balance: cells[3]?.textContent?.trim()!,
              address: cells[4]?.querySelector("code")?.textContent?.trim()!,
            };
          });
        });
        console.log("table data", recieveTableData);
        const currentAddress = recieveTableData[0].address!;
        walletAddresses.push(currentAddress);
        
        // Only click next if not last iteration
        if(i<4){
          await page
          .locator("button[type=button]:has-text('Next Address')")
          .click();

          await page.waitForFunction((prevAddress) =>{
            const addressElement = document.querySelector("tbody tr td:nth-child(5) code");
            return addressElement?.textContent?.trim() !== prevAddress;
          },
          currentAddress,
          {timeout: 1000}
         );

        };

        //! or below approach also works (remove one after discuss)
        // walletAddresses.push(recieveTableData[0].address!);
    
        // await page
        //   .locator("button[type=button]:has-text('Next Address')")
        //   .click();
        //   await page.waitForTimeout(1000);
      }
      console.log("walletAddresses", walletAddresses);
      const senderWallet = testStateManager.getState().test_wallet_names[0];
      console.log("senderWallet", senderWallet);

      const txids: string[] = [];

      for (const address of walletAddresses) {
        console.log("address check in walletAddressses", address);
        const txid = await client?.sendToAddress(senderWallet, address, 0.5);
        txids.push(txid);
      }

      console.log("txids", txids);

      //Should update to the next index when a deposit is received
     
      const lastPathSuffix = await page.evaluate(() => {
        const rows = Array.from(document.querySelectorAll("tbody tr"));
        console.log("rows:", rows);

        return rows.map((row) => {
          const cells = Array.from(row.querySelectorAll("td"));
          return {
            pathSuffix: cells[1]?.textContent?.trim()!,
            utxos: cells[2]?.textContent?.trim()!,
            balance: cells[3]?.textContent?.trim()!,
            address: cells[4]?.querySelector("code")?.textContent?.trim()!,
          };
        });
      });
      
      const pathIndex = lastPathSuffix[0].pathSuffix.split("/")[2];

      //Should end with 4 (as starting index = 0), as we have send 4 times 
      expect(pathIndex).toBe("4")

      await page
        .locator(
          "button[role=tab][type=button]:has-text('Pending Transactions')",
        )
        .click();
        
      await page.locator("button[type=button]:has-text('Refresh')").click()


      await page
        .locator("button[role=tab][type=button]:has-text('Addresses')")
        .click();

      await page.waitForTimeout(4000);

      const addressTable = await page.evaluate(() => {
        const rows = Array.from(document.querySelectorAll("tbody tr"));
        console.log("rows check", rows);

        return rows.map((row) => {
          const cells = Array.from(row.querySelectorAll("td"));
          console.log("cells check:", cells);
          return {
            pathSuffix: cells[1]?.textContent?.trim(),
            utxos: cells[2]?.textContent?.trim(),
            balance: cells[3]?.textContent?.trim(),
            last_used: cells[4]?.textContent?.trim(),
            address: cells[5]?.querySelector("code")?.textContent?.trim(),
          };
        });
      });
      console.log("addressTable", addressTable);

      // This includes both pending and confirmed tx
      let totalBalance= 0;

      addressTable.forEach((row, index) => {
        expect(row.address).toMatch(/^2[MN]/);
        totalBalance += parseFloat(row.balance!);
        console.log(`Address matched for row: ${index + 1}`);
      });
      
      //Sending 0.5btc each to 4 addresses
      expect(totalBalance).toBe(2)

      console.log(
        'Wallet uploaded successfully - "Addresses imported." message appeared',
      );
    } catch (error) {
      console.log("Error in wallet import:", error);
      throw error;
    }
  });

  
});
