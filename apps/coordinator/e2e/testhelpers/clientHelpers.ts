import { Page } from "@playwright/test";
import { clientConfig } from "../utils/bitcoinClient";
import { ClientSetupOptions } from "../utils/types";
import { testStateManager } from "../utils/testState";


export default async function setupPrivateClient(page: Page, options: ClientSetupOptions ){

  const {
      url = 'http://localhost:8080',
      username = clientConfig.username,
      password = clientConfig.password,
      watcherWallet = testStateManager.getState().test_wallet_names[3]
  } = options;

    await page.goto("/#/wallet");
    await page.click('input[name="clientType"][value="private"]');
  
    const urlField = page.locator('input[value="http://localhost:8332"]');
    await urlField.fill(url);
    
    await page.locator('#bitcoind-username').fill(username);
    await page.locator('#bitcoind-password').fill(password);
    await page.locator("#wallet-name").fill(watcherWallet)
    
    await page.click('button:has-text("Test Connection")');
  
  }