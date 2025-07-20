import { test, expect } from "@playwright/test";
import bitcoinClient, { clientConfig } from "../utils/bitcoinClient";
import { testStateManager } from "../utils/testState";

test.describe("Transaction Creation and Signing", () => {
  const client = bitcoinClient();

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
    const walletNames = testStateManager.getWalletsNames();



    const receiverAddress = testStateManager.getReceiver().address;
    console.log("destinationAddress",receiverAddress);

    // Destination Address
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

    //!handling the PSBT file 

    } catch (error:any) {
      console.log("error", error);
      throw new Error(error);
    }
  });
});

