/**
 * Wallet infrastructure creation.
 *
 * This is NOT a behavioral test — it's infrastructure that runs
 * once before all behavioral tests. Playwright's "dependencies"
 * config ensures this completes before wallet-tests project starts.
 *
 * WHAT IT DOES:
 *   1. Creates a 2-of-3 multisig wallet through the Caravan UI
 *   2. Downloads the wallet config JSON
 *   3. Modifies the config for regtest (adds xfps, changes network)
 *   4. Imports the modified wallet to collect addresses
 *   5. Funds those addresses via Bitcoin Core RPC
 *   6. Mines blocks to confirm transactions
 *   7. Saves all state for behavioral tests to consume
 *
 */
import { test, expect } from "../fixtures/caravan.fixture";
import { testStateManager } from "../state/testState";
import { extractMultiWalletDescriptors } from "../services/descriptors";
import { clientConfig } from "../services/bitcoinClient";
import fs from "fs";

test.describe("Wallet Setup", () => {
  let walletNames: string[] = [];
  const downloadDir = testStateManager.getState().downloadDir;

  test.beforeAll(async () => {
    if (!fs.existsSync(downloadDir)) {
      fs.mkdirSync(downloadDir, { recursive: true });
    }
    walletNames = testStateManager.getWalletsNames();
  });

  test("create multisig wallet and download config", async ({
    walletSetup,
    btcClient,
  }) => {
    await walletSetup.setupPrivateClient({});
    await walletSetup.expectConnectionMessage("Connection Success!");
    await walletSetup.selectRegtestNetwork();

    // Arrange: Get xpubs from test wallets
    const { descriptors } = await extractMultiWalletDescriptors(
      walletNames.slice(0, 3),
      btcClient,
      "p2pkh",
    );

    // Act: Create wallet through UI
    await walletSetup.fillExtendedPublicKey(1, descriptors[0].xpub);
    await walletSetup.fillExtendedPublicKey(2, descriptors[1].xpub);
    await walletSetup.fillExtendedPublicKey(3, descriptors[2].xpub);

    const downloadedFile = await walletSetup.downloadWalletDetails(downloadDir);

    // Assert: File is valid
    expect(fs.existsSync(downloadedFile)).toBe(true);
    const walletData = JSON.parse(fs.readFileSync(downloadedFile, "utf-8"));
    expect(walletData).toHaveProperty("name");
    expect(walletData).toHaveProperty("extendedPublicKeys");

    // Persist: Save path for downstream
    testStateManager.updateState({
      downloadDirFiles: { WalletFile: downloadedFile },
    });
  });

  test("modify wallet config for regtest", async ({ btcClient }) => {
    // Arrange
    const walletFile = testStateManager.getDownloadedWalletFile();
    const config = JSON.parse(fs.readFileSync(walletFile, "utf-8"));

    // Act: Patch config
    config.network = "regtest";
    config.client.url = "http://localhost:8080";

    const signingWallets = walletNames.slice(0, 3);
    const { xfps, formattedPaths } = await extractMultiWalletDescriptors(
      signingWallets,
      btcClient,
      "p2pkh",
    );

    config.extendedPublicKeys.forEach((key: any, i: number) => {
      key.xfp = xfps[i];
      key.bip32Path = formattedPaths[i];
    });

    // Persist
    fs.writeFileSync(walletFile, JSON.stringify(config, null, 2));

    //Assert: Verify modifications
    const saved = JSON.parse(fs.readFileSync(walletFile, "utf-8"));
    expect(saved.network).toBe("regtest");
    expect(saved.extendedPublicKeys[0].xfp).toHaveLength(8);
  });

  test("import wallet, collect addresses, and fund", async ({
    walletImport,
    walletNav,
    receiveTab,
    btcClient,
  }) => {
    const walletFile = testStateManager.getDownloadedWalletFile();

    // Arrange: Import the modified wallet
    await walletImport.importWalletAndPrepare(
      walletFile,
      clientConfig.password,
    );
    await walletNav.switchToTab("Receive");

    // Act: Collect 4 addresses
    const addresses = await receiveTab.collectAddresses(4);

    // Act: Fund each with 2 BTC
    const senderWallet = walletNames[0];
    for (const address of addresses) {
      await btcClient.sendToAddress(senderWallet, address, 2);
    }

    // Act: Mine blocks to confirm
    const senderRef = testStateManager.getSender();
    await btcClient.fundAddress(senderRef.address, senderRef.walletName, 4);

    // Persist: Save addresses for behavioral tests
    testStateManager.updateState({ walletAddresses: addresses });
  });
});
