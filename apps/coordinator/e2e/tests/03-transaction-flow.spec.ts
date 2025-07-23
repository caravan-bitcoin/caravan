import { test, expect } from "@playwright/test";
import bitcoinClient, { clientConfig } from "../utils/bitcoinClient";
import { testStateManager } from "../utils/testState";
import path from "path";
import fs from "fs";

test.describe("Transaction Creation and Signing", () => {
  const client = bitcoinClient();
  const downloadDir = path.join(process.cwd(),'e2e/downloads');
  //!check the psbt file type, if we can build a type for it ??
  let downloadedpsbtFile: any;

  test("should create transaction with auto coin selection and allow manual signing", async ({
    page,
  }) => {
    console.log("Starting auto coin selection and manual signing test...");

    try {
      // Get the modified wallet
      const walletConfig = testStateManager.getDownloadedWalletFile();
      console.log("walletConfig", walletConfig);

       // Navigate to wallet page
       await page.goto("/#/wallet");

      await page.setInputFiles("input#upload-config", walletConfig);

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
      await expect(page.locator('[data-cy="balance"]')).toHaveText('2 BTC')
    //   const balanceText = await page.locator('[data-cy="balance"]').textContent() as string;
    //   const balanceValue = parseFloat(balanceText?.replace(' BTC',''));
    //   console.log("balance:",balanceText)
    //   console.log("balanceVal:", balanceValue)

    //going to send page 
    await page
    .locator("button[role=tab][type=button]:has-text('Send')")
    .click();

    const receiverAddress = testStateManager.getReceiver().address;
    console.log("destinationAddress",receiverAddress);

    // Receiver Address
    await page.locator('input[name="destination"]').fill(receiverAddress);

    await page.waitForTimeout(2000)

    // Amount to send
    await page.locator('input[name="amount"]').fill('0.5');

    const def_fee_rate = await page.locator('input[name="fee_rate"][type=number]').inputValue()

    console.log("def fee-rate",def_fee_rate)

    await page.waitForTimeout(2000)
    //Preview Tx
    await page.locator('button:has-text("Preview Transaction")').click();
    
    await page.waitForTimeout(2000)

    const downloadPromise = page.waitForEvent("download");

    await page.click('button[type=button]:has-text("Download Unsigned PSBT")');

    //Wait for download to complete
    const downloadedFile = await downloadPromise;
    console.log("downloadedFile",downloadPromise)

    // const fileName = downloadedFile.suggestedFilename();

    //Save the file in our created downloads directory
    downloadedpsbtFile = path.join(downloadDir, "unsignedPSBT");

    await downloadedFile.saveAs(downloadedpsbtFile);

    expect(fs.existsSync(downloadedpsbtFile)).toBe(true);

    // base-64 encoded psbt string 
    const psbtData = fs.readFileSync(downloadedpsbtFile, 'utf8')

    console.log("psbtdata", psbtData)

    // Store the downloaded file path in shared state
    // testStateManager.updateState({ downloadWalletFile: downloadedWalletFile });

    

    //! steps more 
    // 1. check inside the psbt data 
    // 2. make new methods for psbt signing, 
    // 3. sign the tx and get the signatures, check also what does we get after signing 
    // what will happen in case we sign with wrong wallet, do we got any sort of error as well
    // 




    //!handling the PSBT file 

    } catch (error:any) {
      console.log("error", error);
      throw new Error(error);
    }
  });
});

/*
//!
    const downloadPromise = page.waitForEvent('download');

    await page.click('button[type=button]:has-text("Download Wallet Details")');

    //Wait for download to complete
    const download = await downloadPromise;

    const suggestedFilename = download.suggestedFilename();

    //Save the file to our created download dir

    downloadedWalletFile = path.join(downloadDir,suggestedFilename);
    await download.saveAs(downloadedWalletFile);

    expect(fs.existsSync(downloadedWalletFile)).toBe(true);

    const walletData = JSON.parse(fs.readFileSync(downloadedWalletFile, "utf-8"));

    expect(walletData).toHaveProperty('name');
    expect(walletData).toHaveProperty('network');
    expect(walletData).toHaveProperty('addressType');
    expect(walletData).toHaveProperty('extendedPublicKeys');

    // Store the downloaded file path in shared state
    testStateManager.updateState({ downloadWalletFile: downloadedWalletFile });
//!
*/

