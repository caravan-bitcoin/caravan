import { test, expect } from "@playwright/test";
import bitcoinClient from "../utils/bitcoinClient";
import { clientConfig } from "../utils/bitcoinClient";
import { testStateManager } from "../utils/testState";
import path from "path"
import fs from "fs"

test.describe("Caravan Wallet Creation", () => {
  let testWallets: any[] = [];
  let walletNames: string[] = []
  let client = bitcoinClient();
  
  
  const downloadDir = path.join(__dirname,'../downloads');
  let downloadedWalletFile: string;


  test.beforeAll(async () => {
    console.log("Setting up test wallets...");

    //create download dir if not exists
    if(!fs.existsSync(downloadDir)) {
      fs.mkdirSync(downloadDir,{recursive: true})
    }

    try {
      const state = testStateManager.getState();
      walletNames = state.test_wallet_names;
      testWallets = state.test_wallets;
      console.log("Wallet loaded from global setup:", walletNames);
    } catch (error) {
      console.log("Error in global setup while creating wallets:", error);
    }
  });

  test.beforeEach(async ({ page }) => {
    // Navigate to Caravan
    await page.goto("/");
    await page.waitForLoadState("networkidle");
  });

  //   test('should load Caravan homepage', async ({ page }) => {

  //     const check = await expect(page).toHaveTitle(/Caravan/);
  //     console.log("status", check)

  //     const body = page.locator('body');
  //     await expect(body).toBeVisible();

  //   });

  //   test("should load wallet page", async ({page})=> {

  //     await page.click('button[aria-label="Get started with Caravan"]')

  //     await page.waitForTimeout(1000)

  //    expect(page).toHaveURL(/setup/);
  //    await page.waitForTimeout(1000)

  //    await page.locator('[data-cy="setup-wallet-button"]').click()
  //    await page.waitForTimeout(1000)

  //    await expect(page).toHaveURL(/wallet/)

  //    // Get the first element (wallet name) since there are multiple elements with same data-cy
  //    const def_wallet_name = await page.locator('[data-cy="editable-name-value"]').first().textContent()
  //    await page.waitForTimeout(1000)
  //    expect(def_wallet_name).toBe("My Multisig Wallet");
  //   })

  // test("Test Bitcoin Client successfull private Connection", async ({page}) => {

  //     await page.goto("/#/wallet")

  //     // await page.waitForTimeout(2000)

  //     await page.click('input[name="clientType"][value="private"]')

  //     const def_Url = page.locator('input[value="http://localhost:8332"]');
  //     console.log("def_url",def_Url)
  //     await expect(def_Url).toHaveValue('http://localhost:8332');
  //     await def_Url.fill('http://localhost:8080')

  //     await page.locator('#bitcoind-username').fill(clientConfig.username);
  //     await page.locator('#bitcoind-password').fill(clientConfig.password);

  //     await page.click('button:has-text("Test Connection")');

  //     await expect(page.getByText("Connection Success!")).toBeVisible();

  //     await page.waitForTimeout(2000)

  // })

  // test("Test Bitcoin Client with wrong url", async ({page}) => {

  //     await page.goto("/#/wallet")

  //     // await page.waitForTimeout(2000)

  //     await page.click('input[name="clientType"][value="private"]')

  //     const def_Url = page.locator('input[value="http://localhost:8332"]');

  //     await def_Url.fill('http://localhost:8081')

  //     await page.locator('#bitcoind-username').fill(clientConfig.username);
  //     await page.locator('#bitcoind-password').fill(clientConfig.password);

  //     await page.click('button:has-text("Test Connection")');

  //     await expect(page.getByText("Network Error")).toBeVisible();

  // })
  // test("Test Bitcoin Client with incorrect credentials", async ({page}) => {

  //     await page.goto("/#/wallet")


  //     await page.click('input[name="clientType"][value="private"]')

  //     const def_Url = page.locator('input[value="http://localhost:8332"]');

  //     await def_Url.fill('http://localhost:8080')

  //     await page.locator('#bitcoind-username').fill("random1");
  //     await page.locator('#bitcoind-password').fill(clientConfig.password);

  //     await page.click('button:has-text("Test Connection")');

  //     await expect(page.getByText("Request failed with status code 401")).toBeVisible();

  // })

  test("should create a 2-of-3 multisig wallet", async ({ page }) => {
    console.log("Starting wallet creation test...");

      await page.goto("/#/wallet")

      // await page.waitForTimeout(2000)

      await page.click('input[name="clientType"][value="private"]')

      const def_Url = page.locator('input[value="http://localhost:8332"]');
      console.log("def_url",def_Url)
      await expect(def_Url).toHaveValue('http://localhost:8332');

      await def_Url.fill('http://localhost:8080')

      const watcher_wallet = walletNames[3];

      await page.locator('#bitcoind-username').fill(clientConfig.username);

      await page.locator('#bitcoind-password').fill(clientConfig.password);

      await page.locator("#wallet-name").fill(watcher_wallet)


      await page.click('button:has-text("Test Connection")');

      await expect(page.getByText("Connection Success!")).toBeVisible();

      await page.waitForTimeout(1000)

    //select testnet network for nowcd

    await page.locator("input[name='network'][value='testnet']").setChecked(true);

    await page.waitForTimeout(1000)

    const p2sh_xpub1 = (await client?.extractAddressDescriptors(walletNames[0]))
      ?.p2sh.xpub as string;
    const p2sh_xpub2 = (await client?.extractAddressDescriptors(walletNames[1]))
      ?.p2sh.xpub as string;
    const p2sh_xpub3 = (await client?.extractAddressDescriptors(walletNames[2]))
      ?.p2sh.xpub as string;

   //filling xpub1 
    await page.click("div#public-key-1-importer-select[role='combobox']");

    await page.click(
      "li[role='option'][data-value='text']:has-text('Enter as text')",
    );


    await page.locator('textarea[name="publicKey"]').fill(p2sh_xpub1);


    await page.click("button[type=button]:has-text('Enter')");

    //filling xpub2
    await page.click("div#public-key-2-importer-select[role='combobox']");

    await page.click(
      "li[role='option'][data-value='text']:has-text('Enter as text')",
    );

    await page.locator('textarea[name="publicKey"]').fill(p2sh_xpub2);


    await page.click("button[type=button]:has-text('Enter')");

    //filling xpub3

    await page.click("div#public-key-3-importer-select[role='combobox']");

    await page.click(
      "li[role='option'][data-value='text']:has-text('Enter as text')",
    );

    await page.locator('textarea[name="publicKey"]').fill(p2sh_xpub3);

    await page.waitForTimeout(1000);

    await page.click("button[type=button]:has-text('Enter')");

    await page.waitForTimeout(1000)

    const downloadPromise = page.waitForEvent('download');

    await page.click('button[type=button]:has-text("Download Wallet Details")');

    //Wait for download to complete
    const download = await downloadPromise;

    const suggestedFilename = download.suggestedFilename();
    console.log("downloaded File: ",suggestedFilename)
    console.log("downloaded File Url: ",download.url)
    console.log("downloaded File Path: ",download.path)

    //save the file to our created download dir

    downloadedWalletFile = path.join(downloadDir,suggestedFilename);
    await download.saveAs(downloadedWalletFile);

    expect(fs.existsSync(downloadedWalletFile)).toBe(true);

    const walletData = JSON.parse(fs.readFileSync(downloadedWalletFile, "utf-8"));
    console.log("wallet-data:",walletData);

    expect(walletData).toHaveProperty('name');
    expect(walletData).toHaveProperty('network');
    expect(walletData).toHaveProperty('addressType');
    expect(walletData).toHaveProperty('extendedPublicKeys');

    // Store the downloaded file path in shared state
    testStateManager.updateState({ downloadWalletFile: downloadedWalletFile });
    console.log("downloaded path file", downloadedWalletFile);

     console.log("Wallet creation and download test completed");
  });

  // test("Modify wallet configuration for regtest and missing fingerprint & path", async ({ page }) => {
  //   console.log('Starting wallet config modification');
    
  //   const downloadedWalletFile = testStateManager.getDownloadedWalletFile();
  //   const testFile = JSON.parse(fs.readFileSync(downloadedWalletFile, "utf-8"));
  //   console.log("testfile", testFile);

  //   try {
  //     // Modify the wallet configuration for regtest
  //     testFile.network = 'regtest';
  //     testFile.client.url = 'http://localhost:8080'; // Use regtest port
      
  //     // Save the modified file
  //     const modifiedWalletFile = downloadedWalletFile.replace('.json', '-regtest.json');
  //     fs.writeFileSync(modifiedWalletFile, JSON.stringify(testFile, null, 2));
      
  //     // Store the modified file path in shared state
  //     testStateManager.updateState({ modifiedWalletFile });
      
  //     console.log('Wallet configuration modification completed');
  //     console.log('Modified file saved to:', modifiedWalletFile);
  //   } catch (error) {
  //     console.log("error", error);
  //     throw error;
  //   }
  // });
});
