/**
 * Wallet address type behavior.
 *
 * Dependencies: wallet.setup.ts (via Playwright project dependencies)
 * Preconditions: assertModifiedWalletConfig
 */
import fs from "fs";
import path from "path";
import { test, expect } from "../../fixtures/caravan.fixture";
import { assertModifiedWalletConfig } from "../../fixtures/preconditions";
import { clientConfig } from "../../services/bitcoinClient";
import { testStateManager } from "../../state/testState";

const BITCOIND_PROXY_URL = "http://localhost:8080";

const ADDRESS_TYPES = [
  {
    type: "P2SH",
    label: "Legacy P2SH",
    regex: /^2[1-9A-HJ-NP-Za-km-z]{30,40}$/,
  },
  {
    type: "P2SH-P2WSH",
    label: "Nested SegWit P2SH-P2WSH",
    regex: /^2[1-9A-HJ-NP-Za-km-z]{30,40}$/,
  },
  {
    type: "P2WSH",
    label: "Native SegWit P2WSH",
    regex: /^bcrt1q[0-9a-z]{40,90}$/,
  },
];

function writeWalletConfigForAddressType(addressType: string) {
  const walletFile = testStateManager.getDownloadedWalletFile();
  const walletConfig = JSON.parse(fs.readFileSync(walletFile, "utf-8"));

  // The e2e setup produces one base multisig config from reusable xpubs.
  // Address type is wallet-level metadata, so each variant can reuse that
  // config while exercising Caravan's address derivation/import behavior.
  walletConfig.addressType = addressType;
  walletConfig.name = `E2E ${addressType} Wallet`;
  walletConfig.network = "regtest";
  walletConfig.client = {
    ...(walletConfig.client || {}),
    url: BITCOIND_PROXY_URL,
  };

  const configPath = path.join(
    testStateManager.getState().downloadDir,
    `wallet-${addressType.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.json`,
  );

  fs.writeFileSync(configPath, JSON.stringify(walletConfig, null, 2));
  return configPath;
}

test.describe.serial("Wallet Address Types", () => {
  test.beforeAll(() => {
    assertModifiedWalletConfig();
  });

  for (const { type, label, regex } of ADDRESS_TYPES) {
    test(`imports, displays, and receives funds for ${label}`, async ({
      walletImport,
      walletNav,
      receiveTab,
      btcClient,
    }) => {
      const configPath = writeWalletConfigForAddressType(type);

      await walletImport.importWalletAndPrepare(
        configPath,
        clientConfig.password,
      );
      await walletNav.switchToTab("Receive");

      const address = await receiveTab.getCurrentAddress();
      const initialPathSuffix = await receiveTab.getCurrentPathSuffix();
      expect(address).toMatch(regex);

      const sender = testStateManager.getSender();
      await btcClient.sendToAddress(sender.walletName, address, 1);
      await btcClient.fundAddress(sender.address, sender.walletName, 1);
      await walletNav.refresh();

      await expect
        .poll(async () => receiveTab.getCurrentPathSuffix(), {
          message: `${type} receive path should advance after funding`,
          timeout: 30000,
          intervals: [2000],
        })
        .not.toBe(initialPathSuffix);
    });
  }
});
