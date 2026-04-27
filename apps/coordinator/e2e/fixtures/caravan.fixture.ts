/**
 * Playwright custom fixtures for our E2E tests.
 */
import { test as base } from "@playwright/test";
import { HomePage } from "../pages/HomePage";
import { WalletSetupPage } from "../pages/WalletSetupPage";
import { WalletImportPage } from "../pages/WalletImportPage";
import { WalletNavigation } from "../pages/WalletNavigation";
import { ReceiveTab } from "../pages/ReceiveTab";
import { AddressesTab } from "../pages/AddressesTab";
import { SendTab } from "../pages/SendTab";
import { SignTab } from "../pages/SignTab";
import bitcoinClient from "../services/bitcoinClient";
import { BitcoinCoreService } from "../services/bitcoinServices";

type CaravanFixtures = {
  homePage: HomePage;
  walletSetup: WalletSetupPage;
  walletImport: WalletImportPage;
  walletNav: WalletNavigation;
  receiveTab: ReceiveTab;
  addressesTab: AddressesTab;
  sendTab: SendTab;
  signTab: SignTab;
  btcClient: BitcoinCoreService;
};

export const test = base.extend<CaravanFixtures>({
  homePage: async ({ page }, use) => {
    await use(new HomePage(page));
  },
  walletSetup: async ({ page }, use) => {
    await use(new WalletSetupPage(page));
  },
  walletImport: async ({ page }, use) => {
    await use(new WalletImportPage(page));
  },
  walletNav: async ({ page }, use) => {
    await use(new WalletNavigation(page));
  },
  receiveTab: async ({ page }, use) => {
    await use(new ReceiveTab(page));
  },
  addressesTab: async ({ page }, use) => {
    await use(new AddressesTab(page));
  },
  sendTab: async ({ page }, use) => {
    await use(new SendTab(page));
  },
  signTab: async ({ page }, use) => {
    await use(new SignTab(page));
  },
  btcClient: async ({}, use) => {
    await use(bitcoinClient());
  },
});

export { expect } from "@playwright/test";
