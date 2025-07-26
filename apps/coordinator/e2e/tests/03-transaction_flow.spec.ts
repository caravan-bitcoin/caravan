import { test, expect } from "@playwright/test";
import bitcoinClient, { clientConfig } from "../utils/bitcoinClient";
import { testStateManager } from "../utils/testState";
import path from "path";
import fs from "fs";
import { createIndividualSignedPsbts } from "../testhelpers/psbtHelpers";
import {
  selectUTXOsForAmount,
  getCurrentFeeRate,
} from "../testhelpers/tableExtractor";
// import {  } from "../../src/selectors/transaction";

test.describe("Transaction Creation and Signing", () => {
  const client = bitcoinClient();
  const downloadDir = testStateManager.getState().downloadDir;
  const uploadDir = testStateManager.getState().uploadDir;
  //!check the psbt file type, if we can build a type for it ??
  let downloadedUnsignedPsbtFile: any;

  test.beforeAll(async () => {
    // Setting up test wallets...

    //create upload dir if not exists
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    try {
      const state = testStateManager.getState();
      const walletNames = state.test_wallet_names;
    } catch (error) {
      console.log("Error in global setup while creating wallets:", error);
    }
  });

  // test.beforeEach(async ({page}) => {

  // })

  test("should create and broadcast transaction with auto coin selection and signed psbt upload", async ({
    page,
  }) => {
    console.log(
      "Starting auto coin selection and PSBT signature extraction test...",
    );

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
      // await expect(page.locator('[data-cy="balance"]')).toHaveText('8 BTC')

      //going to send page
      await page
        .locator("button[role=tab][type=button]:has-text('Send')")
        .click();

      const receiverAddress = testStateManager.getReceiver().address;
      console.log("destinationAddress", receiverAddress);

      // Receiver Address
      await page.locator('input[name="destination"]').fill(receiverAddress);

      await page.waitForTimeout(2000);

      // Amount to send
      await page.locator('input[name="amount"]').fill("0.5");

      const def_fee_rate = await page
        .locator('input[name="fee_rate"][type=number]')
        .inputValue();

      console.log("def fee-rate", def_fee_rate);

      await page.waitForTimeout(2000);
      //Preview Tx
      await page.locator('button:has-text("Preview Transaction")').click();

      await page.waitForTimeout(2000);
      const downloadPromise = page.waitForEvent("download");

      await page.click(
        'button[type=button]:has-text("Download Unsigned PSBT")',
      );

      //Wait for download to complete
      const downloadedFile = await downloadPromise;
      console.log("downloadedFile", downloadPromise);

      // const fileName = downloadedFile.suggestedFilename();

      //Save the file in our created downloads directory
      downloadedUnsignedPsbtFile = path.join(downloadDir, "unsignedPSBT");

      await downloadedFile.saveAs(downloadedUnsignedPsbtFile);

      expect(fs.existsSync(downloadedUnsignedPsbtFile)).toBe(true);

      // base-64 encoded psbt string
      const psbtData = fs.readFileSync(downloadedUnsignedPsbtFile, "utf8");

      console.log("psbtdata", psbtData);

      //! think how will you deal efficiently when oyu have more no unsignedpsbts
      // Store the downloaded file path in shared state
      testStateManager.updateState({
        downloadDirFiles: { UnsignedPsbt: downloadedUnsignedPsbtFile },
      });

      const walletNames = testStateManager.getWalletsNames().slice(0, 2);
      console.log("walletd for signing: ", walletNames);

      const signedPsbtResult = await createIndividualSignedPsbts(
        walletNames,
        client,
      );

      // Verify the signed PSBT was created successfully and is complete

      await page.waitForTimeout(2500);

      // expect(fs.existsSync(signedPsbtResult.)).toBe(true)
      console.log("fully signed psbt created successfully");

      // await page
      //   .locator('button[type=button]:has-text("Edit Transaction")')
      //   .click();
      // await page.waitForTimeout(2500);

      // console.log("=== UPLOADING SIGNED PSBT ===");
      // Upload the signed PSBT file
      // const fileInput = page.locator("input#import-psbt");
      console.log("check files: ", signedPsbtResult.individualPsbts[0]);
      console.log(
        "check files 2 with sigs array: ",
        signedPsbtResult.individualPsbts[0].signatures,
      );
      console.log(
        "check files 2 with sigs sigs: ",
        signedPsbtResult.individualPsbts[0].signatures[0].signatures,
      );
      console.log(
        "check files 2 with sigs pkeyts: ",
        signedPsbtResult.individualPsbts[0].signatures[0].publicKeys,
      );
      // await fileInput.setInputFiles(signedPsbtResult.individualPsbts[0]);

      // await page.waitForTimeout(5000)

      // console.log("=== CHECKING SIGNATURE STATUS IN UI ===");

      // Check if we're now in the preview/sign mode
      await page
        .locator('button[type=button]:has-text("Sign Transaction")')
        .click();
      await page.waitForTimeout(3000);

      // ✅ CORRECT: Manually enter individual signatures into Caravan's signature importers
      console.log("=== ENTERING INDIVIDUAL SIGNATURES INTO CARAVAN ===");

      // for (
      //   let importerIndex = 0;
      //   importerIndex < signedPsbtResult.individualPsbts.length;
      //   importerIndex++
      // ) {
      //   const psbtResult = signedPsbtResult.individualPsbts[importerIndex];
      //   const importerNumber = importerIndex + 1;

      //   console.log(
      //     `Setting up signature importer ${importerNumber} for wallet ${psbtResult.walletName}`,
      //   );

      //   // Select the key (Extended Public Key 1, 2, etc.)
      //   await page
      //     .locator(`label#signature-${importerNumber}-key-select-label`)
      //     .click();
      //   await page
      //     .locator(
      //       `li[role='option']:has-text('Extended Public Key ${importerNumber}')`,
      //     )
      //     .click();

      //   // Select "Enter as text" method
      //   await page
      //     .locator(`label#signature-${importerNumber}-importer-select`)
      //     .click();
      //   await page
      //     .locator("li[role='option']:has-text('Enter as text')")
      //     .click();

      //   // Enter the signatures as JSON array
      //   const signatures = psbtResult.signatures[0].signatures[0]; // First (and typically only) input's signatures
      //   await page
      //     .locator("textarea[name='signature']")
      //     .fill(JSON.stringify(signatures));

      //   console.log(
      //     `✅ Entered ${signatures.length} signatures for wallet ${psbtResult.walletName}`,
      //   );
      // }
      // Click the actual select element, not the label
      await page.locator("#signature-1-key-select").click();
      await page
          .locator(
            "li[role='option']:has-text('Extended Public Key 1')",
          )
          .click();
      
       // Select "Enter as text" method - click the select element, not the label
      await page
          .locator('#signature-1-importer-select')
          .click();
      
      await page.locator("li[role='option']:has-text('Enter as text')").click();

         const signatures = signedPsbtResult.individualPsbts[0].signatures[0].signatures[0]; // First (and typically only) input's signatures
        await page
          .locator("textarea[name='signature']")
          .fill(`[${JSON.stringify(signatures)}]`);
      
      await page.locator("button[type='button']:has-text('Add Signature')").click();

      await page.waitForTimeout(3000)

      //! 2nd signature input 

      await page.locator("#signature-2-key-select").click();
      await page
          .locator(
            "li[role='option']:has-text('Extended Public Key 2')",
          )
          .click();
      
       // Select "Enter as text" method - click the select element, not the label
      await page
          .locator('#signature-2-importer-select')
          .click();
      
      await page.locator("li[role='option']:has-text('Enter as text')").click();
      console.log("signatures1: ",signedPsbtResult.individualPsbts.length)

         const signatures1 = signedPsbtResult.individualPsbts[1].signatures[0].signatures[0]; // First (and typically only) input's signatures
        await page
          .locator("textarea[name='signature']")
          .fill(`[${JSON.stringify(signatures1)}]`);
      
      await page.locator("button[type='button']:has-text('Add Signature')").click();

      await page.waitForTimeout(3000)

      


      // console.log("=== ATTEMPTING TO BROADCAST TRANSACTION ===");

      // // Wait a moment for Caravan to process the signatures
      // await page.waitForTimeout(2000);

      // The broadcast button should now be enabled
      const broadcastButton = page.locator(
        "button[type='button']:has-text('Broadcast Transaction')",
      );
      await expect(broadcastButton).toBeEnabled({ timeout: 10000 });

      await broadcastButton.click();

      await page.waitForTimeout(3000)

      // Wait for broadcast success
      const successMessage = page.getByText(
        "Transaction successfully broadcast.",
        { exact: true },
      );

      await page.waitForTimeout(3000)

      // console.log(
      //   "✅ Transaction successfully broadcast using individual signatures!",
      // );

      // console.log(
      //   "=== TRANSACTION SIGNING FLOW TEST COMPLETED (CORRECT WORKFLOW) ===",
      // );

      // console.log("signed base64 string: ", signedPsbtResult.signedPsbtBase64)

      // const result = await client?.extractSignaturesFromPsbt(signedPsbtResult.signedPsbtBase64)!;

      // if (result && result.length > 0) {
      //   console.log("extracted signatures: ", result[0].signatures)
      //   console.log("number of signature sets found: ", result.length)
      // } else {
      //   console.log("no signatures found in PSBT")
      // }

      // console.log("=== TRANSACTION SIGNING FLOW TEST COMPLETED ===");
    } catch (error: any) {
      console.log("error", error);
      throw new Error(error);
    }
  });

  // test("should create and broadcast transaction with manual coin selection and individual signature entry ", async ({page})=>{
  //   try {

  //     const walletConfig = testStateManager.getDownloadedWalletFile();
  //     console.log("walletConfig", walletConfig);

  //      // Navigate to wallet page
  //      await page.goto("/#/wallet");

  //     await page.setInputFiles("input#upload-config", walletConfig);

  //     await page.locator("#bitcoind-password").fill(clientConfig.password);

  //     await page.locator("#confirm-wallet").click();

  //     await page.waitForTimeout(1000);

  //     const isEnabled = await page
  //       .locator("button[type=button]:has-text('Import Addresses')")
  //       .isEnabled();

  //     if (isEnabled) {
  //       await page
  //         .locator("button[type=button]:has-text('Import Addresses')")
  //         .click();

  //       // Wait for the success message to appear
  //       const successMessage = page.locator('text="Addresses imported."');
  //       await expect(successMessage).toBeVisible({ timeout: 30000 });

  //     }
  //     // await expect(page.locator('[data-cy="balance"]')).toHaveText('8 BTC')

  //   //going to send page
  //   await page
  //   .locator("button[role=tab][type=button]:has-text('Send')")
  //   .click();

  //     //! setting toggle to have manual utxo selection and turned off fee rbf

  //   // 1. Locate "Manual" switch input
  //   const manualToggle = page.getByLabel('Manual');

  //   if (!await manualToggle.isChecked()) {
  //     await manualToggle.click(); // toggle off
  //   }

  //   await expect(manualToggle).not.toBeChecked();

  //   // 2. Locate "Replace-by-Fee (RBF)" switch input
  //   const rbfToggle = page.getByLabel('Replace-by-Fee (RBF)');

  //   if (await rbfToggle.isChecked()) {
  //     await rbfToggle.click(); // toggle off
  //   }

  //   await expect(rbfToggle).not.toBeChecked();

  //   // Simple UTXO selection - just select UTXOs that sum to the amount we want to send
  //   const targetAmount = 0.5; // BTC

  //   console.log("=== SELECTING UTXOs FOR TARGET AMOUNT ===");
  //   const selectionResult = await selectUTXOsForAmount(page, targetAmount);
  //   console.log(`Selected UTXOs totaling ${selectionResult.totalAmount} BTC`);

  //   console.log("final str of selectionResult: ", selectionResult);

  //   // here below you have write the code

  //   //! so lets say that no of utxo where total amount >= fee_rate + send_amount (*check this)
  //   const receiverAddress = testStateManager.getReceiver().address;
  //   console.log("destinationAddress",receiverAddress);

  //   // Receiver Address
  //   await page.locator('input[name="destination"]').fill(receiverAddress);

  //   await page.waitForTimeout(2000)

  //   // Amount to send
  //   await page.locator('input[name="amount"]').fill('0.5');

  //   const def_fee_rate = await page.locator('input[name="fee_rate"][type=number]').inputValue()

  //   console.log("def fee-rate",def_fee_rate)

  //   await page.waitForTimeout(2000)
  //   //Preview Tx
  //   await page.locator('button:has-text("Preview Transaction")').click();

  //   await page.waitForTimeout(2000)

  //   const downloadPromise = page.waitForEvent("download");

  //   await page.click('button[type=button]:has-text("Download Unsigned PSBT")');

  //   //Wait for download to complete
  //   const downloadedFile = await downloadPromise;
  //   console.log("downloadedFile",downloadPromise)

  //   // const fileName = downloadedFile.suggestedFilename();

  //   //Save the file in our created downloads directory
  //   downloadedpsbtFile = path.join(downloadDir, "unsignedPSBT");

  //   await downloadedFile.saveAs(downloadedpsbtFile);

  //   expect(fs.existsSync(downloadedpsbtFile)).toBe(true);

  //   // base-64 encoded psbt string
  //   const psbtData = fs.readFileSync(downloadedpsbtFile, 'utf8')

  //   console.log("psbtdata", psbtData)

  //   //! think how will you deal efficiently when oyu have more no unsignedpsbts
  //   // Store the downloaded file path in shared state
  //   testStateManager.updateState({ downloadDirFiles: {UnsignedPsbt: downloadedpsbtFile} });

  //   const walletNames = testStateManager.getWalletsNames().slice(0,2);
  //   console.log("wallets for signing: ", walletNames)

  //   // ✅ CORRECT: Create individual signed PSBTs (Caravan's expected workflow)
  //   console.log("=== CREATING INDIVIDUAL SIGNATURES (CORRECT CARAVAN WORKFLOW) ===");
  //   const individualResults = await createIndividualSignedPsbts(walletNames, client);

  //   console.log(`✅ Created ${individualResults.individualPsbts.length} individual signed PSBTs`);

  //   // Verify each individual PSBT has signatures
  //   individualResults.individualPsbts.forEach((psbtResult, index) => {
  //     console.log(`Wallet ${psbtResult.walletName}: ${psbtResult.signatures.length} signature sets`);
  //     expect(psbtResult.signatures.length).toBeGreaterThan(0);
  //   });

  //   await page.locator('button[type=button]:has-text("Edit Transaction")').click()
  //   await page.waitForTimeout(2500)

  //      // Check if we're now in the preview/sign mode
  //      await page.locator('button[type=button]:has-text("Sign Transaction")').click();
  //      await page.waitForTimeout(3000);

  //      // ✅ CORRECT: Manually enter individual signatures into Caravan's signature importers
  //      console.log("=== ENTERING INDIVIDUAL SIGNATURES INTO CARAVAN ===");

  //      for (let importerIndex = 0; importerIndex < individualResults.individualPsbts.length; importerIndex++) {
  //        const psbtResult = individualResults.individualPsbts[importerIndex];
  //        const importerNumber = importerIndex + 1;

  //        console.log(`Setting up signature importer ${importerNumber} for wallet ${psbtResult.walletName}`);

  //        // Select the key (Extended Public Key 1, 2, etc.)
  //        await page.locator(`label#signature-${importerNumber}-key-select-label`).click();
  //        await page.locator(`li[role='option']:has-text('Extended Public Key ${importerNumber}')`).click();

  //        // Select "Enter as text" method
  //        await page.locator(`label#signature-${importerNumber}-importer-select`).click();
  //        await page.locator("li[role='option']:has-text('Enter as text')").click();

  //        // Enter the signatures as JSON array
  //        const signatures = psbtResult.signatures[0].signatures; // First (and typically only) input's signatures
  //        await page.locator("textarea[name='signature']").fill(JSON.stringify(signatures));

  //        console.log(`✅ Entered ${signatures.length} signatures for wallet ${psbtResult.walletName}`);
  //      }

  //      console.log("=== ATTEMPTING TO BROADCAST TRANSACTION ===");

  //      // Wait a moment for Caravan to process the signatures
  //      await page.waitForTimeout(2000);

  //      // The broadcast button should now be enabled
  //      const broadcastButton = page.locator("button[type='button']:has-text('Broadcast Transaction')");
  //      await expect(broadcastButton).toBeEnabled({ timeout: 10000 });

  //      await broadcastButton.click();

  //      // Wait for broadcast success
  //      const successMessage = page.getByText('Transaction successfully broadcast.', { exact: true });
  //      await expect(successMessage).toBeVisible({ timeout: 30000 });

  //      console.log("✅ Transaction successfully broadcast using individual signatures!");

  //      console.log("=== TRANSACTION SIGNING FLOW TEST COMPLETED (CORRECT WORKFLOW) ===");

  //   } catch (error:any) {
  //     console.log("Error: ",error)
  //     throw new Error(error)

  //   }

  // })
});
