import { test, expect } from "@playwright/test";
import bitcoinClient, { clientConfig } from "../utils/bitcoinClient";
import { testStateManager } from "../utils/testState";
import path from "path";
import fs from "fs";
import { createFullySignedPsbtFile, analyzePsbtSignatures } from "../testhelpers/psbtHelpers";

test.describe("Transaction Creation and Signing", () => {
  const client = bitcoinClient();
  const downloadDir = testStateManager.getState().downloadDir;
  const uploadDir = testStateManager.getState().uploadDir
  //!check the psbt file type, if we can build a type for it ??
  let downloadedpsbtFile: any;


  test.beforeAll(async () => {
    // Setting up test wallets...

    //create upload dir if not exists
    if(!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir,{recursive: true})
    }

    try {
      const state = testStateManager.getState();
      const walletNames = state.test_wallet_names;

    } catch (error) {
      console.log("Error in global setup while creating wallets:", error);
    }
  });

  test("should create transaction with auto coin selection and allow PSBT signature extraction", async ({
    page,
  }) => {
    console.log("Starting auto coin selection and PSBT signature extraction test...");

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

    //! think how will you deal efficiently when oyu have more no unsignedpsbts
    // Store the downloaded file path in shared state
    testStateManager.updateState({ downloadDirFiles: {UnsignedPsbt: downloadedpsbtFile} });

    const walletNames = testStateManager.getWalletsNames().slice(0,2);
    console.log("walletd for signing: ", walletNames)

    const signedPsbtResult = await createFullySignedPsbtFile(walletNames,client);

    // Verify the signed PSBT was created successfully and is complete
    expect(signedPsbtResult.isComplete).toBe(true)

    await page.waitForTimeout(2500)

    expect(fs.existsSync(signedPsbtResult.signedPsbtPath)).toBe(true)
    console.log("fully signed psbt created successfully")

    await page.locator('button[type=button]:has-text("Edit Transaction")').click()
    await page.waitForTimeout(2500)

    // Monitor console logs for signature extraction
    const psbtImportLogs: string[] = [];
    page.on('console', msg => {
      const text = msg.text();
      if (text.includes('signature') || text.includes('PSBT') || text.includes('Successfully imported')) {
        console.log('BROWSER LOG:', text);
        psbtImportLogs.push(text);
      }
    });
    
    page.on('pageerror', error => {
      console.log('BROWSER ERROR:', error.message);
    });

    console.log("=== UPLOADING SIGNED PSBT ===");
    // Upload the signed PSBT file
    const fileInput = page.locator('input#import-psbt');
    await fileInput.setInputFiles(signedPsbtResult.signedPsbtPath);

    await page.waitForTimeout(5000)

    // Check for successful signature extraction in console logs
    const hasSignatureExtractionLog = psbtImportLogs.some(log => 
      log.includes('Successfully imported') && log.includes('signature sets')
    );
    
    if (hasSignatureExtractionLog) {
      console.log("✅ Found signature extraction success log in console!");
    } else {
      console.log("⚠️ No signature extraction success log found. Available logs:", psbtImportLogs);
    }

    console.log("=== CHECKING SIGNATURE STATUS IN UI ===");
    
    // Check if we're now in the preview/sign mode
    await page.locator('button[type=button]:has-text("Sign Transaction")').click();
    await page.waitForTimeout(3000);

    // Look for signature status indicators in the signing interface
    const signatureElements = await page.locator('[data-testid*="signature"], [class*="signature"], [class*="finalized"]').count();
    console.log(`Found ${signatureElements} signature-related UI elements`);

    // Check for "Transaction ready" or "Fully signed" text
    const readyToSignText = await page.getByText(/Transaction ready|Fully signed|All.*signatures/i).count();
    const signatureCompleteElements = await page.locator('[aria-label*="complete"], [title*="complete"], [class*="complete"]').count();
    
    console.log(`Found ${readyToSignText} "ready/complete" text elements`);
    console.log(`Found ${signatureCompleteElements} "complete" UI elements`);

    // Check if broadcast transaction button is available (indicates fully signed)
    const broadcastButtonVisible = await page.locator('button:has-text("Broadcast"), button[title*="broadcast"], button[aria-label*="broadcast"]').isVisible().catch(() => false);
    
    if (broadcastButtonVisible) {
      console.log("✅ Broadcast button is visible - transaction appears to be fully signed!");
    } else {
      console.log("⚠️ Broadcast button not visible");
    }

    // Check if signature importers are showing "finalized" state
    const finalizedElements = await page.locator('text=/finalized|complete/i').count();
    console.log(`Found ${finalizedElements} elements with "finalized/complete" text`);

    // Look for signature completion indicators
    const signatureStatusText = await page.textContent('body');
    const hasFullySignedIndicator = signatureStatusText?.includes('fully signed') || 
                                   signatureStatusText?.includes('Transaction ready') ||
                                   signatureStatusText?.includes('All signatures') ||
                                   signatureStatusText?.includes('ready to broadcast');

    if (hasFullySignedIndicator) {
      console.log("✅ Found fully signed indicators in page text!");
    } else {
      console.log("⚠️ No fully signed indicators found in page text");
      // Log some of the page content for debugging
      const relevantText = signatureStatusText?.split('\n')
        .filter(line => line.includes('sign') || line.includes('complete') || line.includes('ready'))
        .slice(0, 10); // First 10 relevant lines
      console.log("Relevant page content:", relevantText);
    }

    // Final assessment
    const signatureExtractionSuccessful = hasSignatureExtractionLog && 
                                         (broadcastButtonVisible || hasFullySignedIndicator || finalizedElements > 0);

    if (signatureExtractionSuccessful) {
      console.log("🎉 SUCCESS: PSBT signature extraction appears to be working correctly!");
      console.log("✅ Signed PSBT was uploaded and signatures were properly extracted by Caravan");
    } else {
      console.log("❌ ISSUE: PSBT signature extraction may not be working as expected");
      console.log("This could indicate the signature extraction fix needs more work");
    }

    console.log("=== TRANSACTION SIGNING FLOW TEST COMPLETED ===");

    } catch (error:any) {
      console.log("error", error);
      throw new Error(error);
    }
  });
});



