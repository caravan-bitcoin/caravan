import { test, expect, Page } from "@playwright/test";
import bitcoinClient from "../utils/bitcoinClient";
import { clientConfig } from "../utils/bitcoinClient";
import setupPrivateClient from "../testhelpers/clientHelpers"

import { testStateManager } from "../utils/testState";
import path from "path"
import fs from "fs"
import { extractMultiWalletDescriptors } from "../testhelpers/bitcoinDescriptors";

test.describe("Caravan Wallet Creation", () => {
  let walletNames: string[] = []
  let client = bitcoinClient();
  
  
  const downloadDir = path.join(process.cwd(),'e2e/downloads');
  let downloadedWalletFile: string;


  const connectionScenarios = [
    {
      name: "successful connection",
      url: "http://localhost:8080",
      username: clientConfig.username,
      password: clientConfig.password,
      expectedMessage: "Connection Success!"
    },
    {
      name: "wrong URL",
      url: "http://localhost:8081",
      username: clientConfig.username,
      password: clientConfig.password,
      expectedMessage: "__filename is not defined"
    },
    {
      name: "incorrect credentials",
      url: "http://localhost:8080",
      username: "random1",
      password: clientConfig.password,
      expectedMessage: "__filename is not defined"
    }

  ]

  test.beforeAll(async () => {
    // Setting up test wallets...

    //create download dir if not exists
    if(!fs.existsSync(downloadDir)) {
      fs.mkdirSync(downloadDir,{recursive: true})
    }

    try {
      const state = testStateManager.getState();
      walletNames = state.test_wallet_names;

    } catch (error) {
      throw new Error(`Error in global setup while creating wallets: ${error}`)
    }
  });


  test.beforeEach(async ({ page }) => {
    // Navigate to Caravan
    await page.goto("/");
    await page.waitForLoadState("networkidle");
  });

  test('should load Caravan homepage', async ({ page }) => {
    await expect(page).toHaveTitle(/Caravan/);
    await expect(page.getByRole('heading', {
      name: /Secure your bitcoin with Caravan.*multisig coordinator/i 
    })).toBeVisible();
  });
  
  test('should navigate to wallet setup', async ({ page }) => {
    await page.click('button[aria-label="Get started with Caravan"]');
    expect(page).toHaveURL(/setup/);
    
    await page.locator('[data-cy="setup-wallet-button"]').click();
    await expect(page).toHaveURL(/wallet/);
    
    const def_wallet_name = await page.locator('[data-cy="editable-name-value"]').first().textContent();
    expect(def_wallet_name).toBe("My Multisig Wallet");
  });

  for (const scenario of connectionScenarios) {
    test(`should handle private connection with ${scenario.name}`,async ({page})=>{
      await setupPrivateClient(page, {
        url: scenario.url,
        username: scenario.username,
        password: scenario.password
      })

      await expect(page.getByText(scenario.expectedMessage)).toBeVisible();
    })
  }

  test("should create a 2-of-3 multisig wallet", async ({ page }) => {

    await setupPrivateClient(page, {});

    await expect(page.getByText("Connection Success!")).toBeVisible();

    await page.locator("input[name='network'][value='testnet']").setChecked(true);


    const { descriptors } = await extractMultiWalletDescriptors(walletNames.slice(0, 3), client, "p2pkh");
    const p2pkh_xpub1 = descriptors[0].xpub;
    const p2pkh_xpub2 = descriptors[1].xpub; 
    const p2pkh_xpub3 = descriptors[2].xpub;

   //filling xpub1 
    await page.click("div#public-key-1-importer-select[role='combobox']");

    await page.click(
      "li[role='option'][data-value='text']:has-text('Enter as text')",
    );

    await page.locator('textarea[name="publicKey"]').fill(p2pkh_xpub1);

    await page.click("button[type=button]:has-text('Enter')");

      //filling xpub2
    await page.click("div#public-key-2-importer-select[role='combobox']");

    await page.click(
      "li[role='option'][data-value='text']:has-text('Enter as text')",
    );

    
    await page.locator('textarea[name="publicKey"]').fill(p2pkh_xpub2);
    
    await page.click("button[type=button]:has-text('Enter')");

    //filling xpub3
    await page.click("div#public-key-3-importer-select[role='combobox']");

    await page.click(
      "li[role='option'][data-value='text']:has-text('Enter as text')",
    );
    
    await page.locator('textarea[name="publicKey"]').fill(p2pkh_xpub3);

    await page.click("button[type=button]:has-text('Enter')");

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
    
  });
});
