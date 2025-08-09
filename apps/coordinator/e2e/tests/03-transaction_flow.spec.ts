import { test, expect } from "@playwright/test";
import bitcoinClient, { clientConfig } from "../utils/bitcoinClient";
import { testStateManager } from "../utils/testState";
import path from "path";
import fs from "fs";
import { createIndividualSignedPsbts } from "../testhelpers/psbtHelpers";
import { selectUTXOs } from "../testhelpers/tableExtractor";

test.describe("Transaction Creation and Signing", () => {
  const client = bitcoinClient();
  let downloadedUnsignedPsbtFile: any;
  let downloadDir: string;
  let uploadDir: string

  test.beforeAll(async () => {
    try {
      const currentState = testStateManager.getState();
      // Get directories
      downloadDir = currentState.downloadDir;
      uploadDir = currentState.uploadDir;
      
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
    } catch (error) {
      throw new Error(`Error in global setup while creating wallets: ${error}`);
    }
  });
  test.beforeEach(async ({ page }) => {
    // Get the modified wallet
    const walletConfig = testStateManager.getDownloadedWalletFile();

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
  });

  test("should create and broadcast transaction with auto coin selection and signed psbt upload", async ({
    page,
  }) => {
    try {
      const receiverAddress = testStateManager.getReceiver().address;

      // Receiver Address
      await page.locator('input[name="destination"]').fill(receiverAddress);

      await page.waitForTimeout(2000);

      // Amount to send
      await page.locator('input[name="amount"]').fill("0.5");

      await page.locator('input[name="fee_rate"][type=number]').inputValue();

      //Preview Tx
      await page.locator('button:has-text("Preview Transaction")').click();

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
        downloadDirFiles: {
          ...currentState.downloadDirFiles,
          UnsignedPsbt: downloadedUnsignedPsbtFile,
        },
      });

      const walletNames = testStateManager.getWalletsNames().slice(0, 2);

      const signedPsbtResult = await createIndividualSignedPsbts(
        walletNames,
        client,
      );

      // Check if we're now in the preview/sign mode
      await page
        .locator('button[type=button]:has-text("Sign Transaction")')
        .click();

      // Manually enter individual signatures into Caravan's signature importers

      await page.locator("#signature-1-key-select").click();
      await page
        .locator("li[role='option']:has-text('Extended Public Key 1')")
        .click();

      // Select "Enter as text" method
      await page.locator("#signature-1-importer-select").click();

      await page.locator("li[role='option']:has-text('Enter as text')").click();

      const signer1Sigs = signedPsbtResult.individualPsbts[0].signatures.map(
        (sig) => sig.signatures[0],
      );

      const signer1SigsJsonString = JSON.stringify(signer1Sigs);
      await page
        .locator("textarea[name='signature']")
        .fill(signer1SigsJsonString);

      await page
        .locator("button[type='button']:has-text('Add Signature')")
        .click();

      // 2nd signature input

      await page.locator("#signature-2-key-select").click();
      await page
        .locator("li[role='option']:has-text('Extended Public Key 2')")
        .click();

      // Select "Enter as text" method
      await page.locator("#signature-2-importer-select").click();

      await page.locator("li[role='option']:has-text('Enter as text')").click();

      const signer2Sigs = signedPsbtResult.individualPsbts[1].signatures.map(
        (sig) => sig.signatures[0],
      );

      const signer2SigsJsonString = JSON.stringify(signer2Sigs);

      await page
        .locator("textarea[name='signature']")
        .fill(signer2SigsJsonString);

      await page
        .locator("button[type='button']:has-text('Add Signature')")
        .click();
      await page.waitForTimeout(5000);

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
    } catch (error: any) {
      throw new Error(error);
    }
  });

  test("should create and broadcast transaction with manual coin selection and signed psbt upload", async ({
    page,
  }) => {
    try {
      // Manual toggle on
      const manualToggle = page.getByLabel("Manual");

      if (!(await manualToggle.isChecked())) {
        await manualToggle.click();
      }

      await expect(manualToggle).toBeChecked();
      const receiverAddress = testStateManager.getReceiver().address;

      // Receiver Address
      await page.locator('input[name="destination"]').fill(receiverAddress);

      // Amount to send
      await page.locator('input[name="amount"]').fill("3");

      // 2. Locate "Replace-by-Fee (RBF)" switch input
      const rbfToggle = page.getByLabel("Replace-by-Fee (RBF)");

      // toggle off (for these tests)
      if (await rbfToggle.isChecked()) {
        await rbfToggle.click();
      }

      await expect(rbfToggle).not.toBeChecked();

      await selectUTXOs(page, 3);

      await page.locator('input[name="fee_rate"][type=number]').inputValue();

      // Get the change funds back to our address
      await page.getByTestId("AddIcon").click();

      // Set to wallet change address
      await page
        .getByLabel("Set to wallet change address")
        .getByRole("button")
        .click();

      await page.getByTestId("AddCircleIcon").click();

      //Preview Tx
      await page.locator('button:has-text("Preview Transaction")').click();

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
        downloadDirFiles: {
          ...currentState.downloadDirFiles,
          UnsignedPsbt: downloadedUnsignedPsbtFile,
        },
      });

      const walletNames = testStateManager.getWalletsNames().slice(0, 2);

      const signedPsbtResult = await createIndividualSignedPsbts(
        walletNames,
        client,
      );

      // Check if we're now in the preview/sign mode
      await page
        .locator('button[type=button]:has-text("Sign Transaction")')
        .click();

      await page.locator("#signature-1-key-select").click();
      await page
        .locator("li[role='option']:has-text('Extended Public Key 1')")
        .click();

      // Select "Enter as text" method - click the select element, not the label
      await page.locator("#signature-1-importer-select").click();

      await page.locator("li[role='option']:has-text('Enter as text')").click();

      // Take each signatures for each input for signer 1
      const signer1Sigs = signedPsbtResult.individualPsbts[0].signatures.map(
        (sig) => sig.signatures[0],
      );

      const signer1SigsJsonString = JSON.stringify(signer1Sigs);
      await page
        .locator("textarea[name='signature']")
        .fill(signer1SigsJsonString);

      await page
        .locator("button[type='button']:has-text('Add Signature')")
        .click();

      // 2nd signature input

      await page.locator("#signature-2-key-select").click();
      await page
        .locator("li[role='option']:has-text('Extended Public Key 2')")
        .click();

      // Select "Enter as text" method
      await page.locator("#signature-2-importer-select").click();

      await page.locator("li[role='option']:has-text('Enter as text')").click();

      // Take each signatures for each input for signer 2
      const signer2Sigs = signedPsbtResult.individualPsbts[1].signatures.map(
        (sig) => sig.signatures[0],
      );

      const signer2SigsJsonString = JSON.stringify(signer2Sigs);
      await page
        .locator("textarea[name='signature']")
        .fill(signer2SigsJsonString);

      await page
        .locator("button[type='button']:has-text('Add Signature')")
        .click();

      // The broadcast button should now be enabled
      const broadcastButton = page.locator(
        "button[type='button']:has-text('Broadcast Transaction')",
      );
      await expect(broadcastButton).toBeEnabled({ timeout: 10000 });

      await broadcastButton.click();

      await page.waitForTimeout(1000);

      // Wait for broadcast success
      const successMessage = page.getByText(
        "Transaction successfully broadcast.",
        { exact: true },
      );
      await expect(successMessage).toBeVisible();

      await page.waitForTimeout(1000);
    } catch (error: any) {
      throw new Error(error);
    }
  });
});
