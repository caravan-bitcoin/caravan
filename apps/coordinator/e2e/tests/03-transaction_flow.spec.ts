import { test, expect } from "@playwright/test";
import bitcoinClient, { clientConfig } from "../utils/bitcoinClient";
import { testStateManager } from "../utils/testState";
import path from "path";
import fs from "fs";
import { createIndividualSignedPsbts } from "../testhelpers/psbtHelpers";
import { selectUTXOs } from "../testhelpers/tableExtractor";

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
      await expect(page.locator('[data-cy="balance"]')).toHaveText('8 BTC')

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

      //Save the file in our created downloads directory
      downloadedUnsignedPsbtFile = path.join(downloadDir, "unsignedPSBT");

      await downloadedFile.saveAs(downloadedUnsignedPsbtFile);

      expect(fs.existsSync(downloadedUnsignedPsbtFile)).toBe(true);

      
      const currentState = testStateManager.getState();
      // Store the downloaded file path in shared state
      testStateManager.updateState({
        downloadDirFiles: { ...currentState.downloadDirFiles, UnsignedPsbt: downloadedUnsignedPsbtFile },
      });

      const walletNames = testStateManager.getWalletsNames().slice(0, 2);
      console.log("walletd for signing: ", walletNames);

      const signedPsbtResult = await createIndividualSignedPsbts(
        walletNames,
        client,
      );

      // Verify the signed PSBT was created successfully and is complete

      // Check if we're now in the preview/sign mode
      await page
        .locator('button[type=button]:has-text("Sign Transaction")')
        .click();

      // Manually enter individual signatures into Caravan's signature importers

      await page.locator("#signature-1-key-select").click();
      await page
        .locator("li[role='option']:has-text('Extended Public Key 1')")
        .click();

      // Select "Enter as text" method - click the select element, not the label
      await page.locator("#signature-1-importer-select").click();

      await page.locator("li[role='option']:has-text('Enter as text')").click();

      const signatures =
        signedPsbtResult.individualPsbts[0].signatures[0].signatures[0]; // First (and typically only) input's signatures
      await page
        .locator("textarea[name='signature']")
        .fill(`[${JSON.stringify(signatures)}]`);

      await page
        .locator("button[type='button']:has-text('Add Signature')")
        .click();

      await page.waitForTimeout(3000);

      //! 2nd signature input

      await page.locator("#signature-2-key-select").click();
      await page
        .locator("li[role='option']:has-text('Extended Public Key 2')")
        .click();

      // Select "Enter as text" method - click the select element, not the label
      await page.locator("#signature-2-importer-select").click();

      await page.locator("li[role='option']:has-text('Enter as text')").click();
      console.log("signatures1: ", signedPsbtResult.individualPsbts.length);

      const signatures1 =
        signedPsbtResult.individualPsbts[1].signatures[0].signatures[0]; // First (and typically only) input's signatures
      await page
        .locator("textarea[name='signature']")
        .fill(`[${JSON.stringify(signatures1)}]`);

      await page
        .locator("button[type='button']:has-text('Add Signature')")
        .click();


      // console.log("=== ATTEMPTING TO BROADCAST TRANSACTION ===");

      // The broadcast button should now be enabled
      const broadcastButton = page.locator(
        "button[type='button']:has-text('Broadcast Transaction')",
      );
      await expect(broadcastButton).toBeEnabled({ timeout: 10000 });

      await broadcastButton.click();


      // Wait for broadcast success
      const successMessage = page.getByText(
        "Transaction successfully broadcast.",
        { exact: true },
      );

      await expect(successMessage).toBeVisible();

      // console.log("=== TRANSACTION SIGNING FLOW TEST COMPLETED ===");
    } catch (error: any) {
      console.log("error", error);
      throw new Error(error);
    }
  });

  test("should create and broadcast transaction with manual coin selection and signed psbt upload", async ({
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
      //going to send page
      await page
        .locator("button[role=tab][type=button]:has-text('Send')")
        .click();

      // Manual toggle on
      const manualToggle = page.getByLabel("Manual");

      if (!(await manualToggle.isChecked())) {
        await manualToggle.click();
      }

      await expect(manualToggle).toBeChecked();
      const receiverAddress = testStateManager.getReceiver().address;
      console.log("destinationAddress", receiverAddress);

      // Receiver Address
      await page.locator('input[name="destination"]').fill(receiverAddress);

      // Amount to send
      await page.locator('input[name="amount"]').fill("3");

      //! rebuild the coordinator image to get this latest ui changes

      // 2. Locate "Replace-by-Fee (RBF)" switch input
      const rbfToggle = page.getByLabel("Replace-by-Fee (RBF)");

      if (await rbfToggle.isChecked()) {
        await rbfToggle.click(); // toggle off
      }

      await expect(rbfToggle).not.toBeChecked();

      const value = await selectUTXOs(page, 3);
      console.log("selected value: ", value);

      const def_fee_rate = await page
        .locator('input[name="fee_rate"][type=number]')
        .inputValue();

      console.log("def fee-rate", def_fee_rate);

      // Get the change funds back to our address
      await page.getByTestId("AddIcon").click();

      // Set to wallet change address
      await page
        .getByLabel("Set to wallet change address")
        .getByRole("button")
        .click();

      await page.getByTestId("AddCircleIcon").click();

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

      //Save the file in our created downloads directory
      downloadedUnsignedPsbtFile = path.join(downloadDir, "unsignedPSBT");

      await downloadedFile.saveAs(downloadedUnsignedPsbtFile);

      expect(fs.existsSync(downloadedUnsignedPsbtFile)).toBe(true);

      const currentState = testStateManager.getState();
      // Store the downloaded file path in shared state
      testStateManager.updateState({
        downloadDirFiles: { ...currentState.downloadDirFiles, UnsignedPsbt: downloadedUnsignedPsbtFile },
      });


      const walletNames = testStateManager.getWalletsNames().slice(0, 2);
      console.log("walletd for signing: ", walletNames);

      const signedPsbtResult = await createIndividualSignedPsbts(
        walletNames,
        client,
      );

      // Verify the signed PSBT was created successfully and is complete

      await page.waitForTimeout(2500);

      // Check if we're now in the preview/sign mode
      await page
        .locator('button[type=button]:has-text("Sign Transaction")')
        .click();
      await page.waitForTimeout(3000);

      console.log("=== ENTERING INDIVIDUAL SIGNATURES INTO CARAVAN ===");

      await page.locator("#signature-1-key-select").click();
      await page
        .locator("li[role='option']:has-text('Extended Public Key 1')")
        .click();

      // Select "Enter as text" method - click the select element, not the label
      await page.locator("#signature-1-importer-select").click();

      await page.locator("li[role='option']:has-text('Enter as text')").click();
    
      // Take each signatures for each input for signer 1
      const signatures1 =
        signedPsbtResult.individualPsbts[0].signatures.map(sig => sig.signatures[0]); 

      const signature1JsonString = JSON.stringify(signatures1)
      await page
        .locator("textarea[name='signature']")
        .fill(signature1JsonString);

      console.log("Signature check: ", signature1JsonString)

      await page
        .locator("button[type='button']:has-text('Add Signature')")
        .click();

      await page.waitForTimeout(3000);

      // 2nd signature input

      await page.locator("#signature-2-key-select").click();
      await page
        .locator("li[role='option']:has-text('Extended Public Key 2')")
        .click();

      // Select "Enter as text" method - click the select element, not the label
      await page.locator("#signature-2-importer-select").click();

      await page.locator("li[role='option']:has-text('Enter as text')").click();

      console.log("signatures1: ", signedPsbtResult.individualPsbts.length);
      // Take each signatures for each input for signer 2
      const signatures2 =
        signedPsbtResult.individualPsbts[1].signatures.map(sig => sig.signatures[0]); 
      
      const signature2JsonString = JSON.stringify(signatures2)
      await page
        .locator("textarea[name='signature']")
        .fill(signature2JsonString);
        console.log("Signature check2: ", signature2JsonString)

      await page
        .locator("button[type='button']:has-text('Add Signature')")
        .click();

      await page.waitForTimeout(3000);

      // The broadcast button should now be enabled
      const broadcastButton = page.locator(
        "button[type='button']:has-text('Broadcast Transaction')",
      );
      await expect(broadcastButton).toBeEnabled({ timeout: 10000 });

      await broadcastButton.click();

      await page.waitForTimeout(3000);

      // Wait for broadcast success
      const successMessage = page.getByText(
        "Transaction successfully broadcast.",
        { exact: true },
      );
      await expect(successMessage).toBeVisible();

    } catch (error: any) {
      console.log("error", error);
      throw new Error(error);
    }
  });
});
