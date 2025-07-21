import { test, expect, Page } from "@playwright/test";
import bitcoinClient from "../utils/bitcoinClient";
import { clientConfig } from "../utils/bitcoinClient";
import setupPrivateClient from "../testhelpers/clientHelpers"


test.describe("Caravan Wallet Creation", () => {
  let testWallets: any[] = [];
  let walletNames: string[] = []
  let client = bitcoinClient();

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
      expectedMessage: "Network Error"
    },
    {
      name: "incorrect credentials",
      url: "http://localhost:8080",
      username: "random1",
      password: clientConfig.password,
      expectedMessage: "Request failed with status code 401"
    }

  ]

  test.beforeAll(async () => {
    // Setting up test wallets...

    if(process.env.TEST_WALLET_NAMES && process.env.TEST_WALLETS){
      walletNames= JSON.parse(process.env.TEST_WALLET_NAMES);
      testWallets = JSON.parse(process.env.TEST_WALLETS)
    }else{
      console.log("Error in global setup while creating wallets")
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


    const p2pkh_xpub1 = (await client?.extractAddressDescriptors(walletNames[0]))
      ?.p2pkh.xpub as string;
    const p2pkh_xpub2 = (await client?.extractAddressDescriptors(walletNames[1]))
      ?.p2pkh.xpub as string;
    const p2pkh_xpub3 = (await client?.extractAddressDescriptors(walletNames[2]))
      ?.p2pkh.xpub as string;

    await page.click("div#public-key-1-importer-select[role='combobox']");

    await page.click(
      "li[role='option'][data-value='text']:has-text('Enter as text')",
    );

    //filling xpub1 
    await page.locator('textarea[name="publicKey"]').fill(p2pkh_xpub1);

    await page.click("button[type=button]:has-text('Enter')");

   
    await page.click("div#public-key-2-importer-select[role='combobox']");

    await page.click(
      "li[role='option'][data-value='text']:has-text('Enter as text')",
    );

    //filling xpub2
    await page.locator('textarea[name="publicKey"]').fill(p2pkh_xpub2);
    
    await page.click("button[type=button]:has-text('Enter')");

    await page.click("div#public-key-3-importer-select[role='combobox']");

    await page.click(
      "li[role='option'][data-value='text']:has-text('Enter as text')",
    );
    
    //filling xpub3
    await page.locator('textarea[name="publicKey"]').fill(p2pkh_xpub3);

    await page.click("button[type=button]:has-text('Enter')");

    await page.locator("button#confirm-wallet[type='button']").click()

  });
});
