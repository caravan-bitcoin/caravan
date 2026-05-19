/**
 * Wallet descriptor export verification.
 *
 * Dependencies: wallet.setup.ts (via Playwright project dependencies)
 * Preconditions: assertModifiedWalletConfig
 */
import { test, expect } from "../../fixtures/caravan.fixture";
import { assertModifiedWalletConfig } from "../../fixtures/preconditions";
import { clientConfig } from "../../services/bitcoinClient";
import { testStateManager } from "../../state/testState";

test.describe("Wallet Descriptor Export", () => {
  test.beforeAll(() => {
    assertModifiedWalletConfig();
  });

  test.beforeEach(async ({ walletImport }) => {
    const walletFile = testStateManager.getDownloadedWalletFile();
    await walletImport.importWalletAndPrepare(
      walletFile,
      clientConfig.password,
    );
  });

  test("downloads receive and change descriptors as JSON", async ({
    walletConfig,
  }) => {
    const descriptors = await walletConfig.downloadDescriptorsJson();

    expect(descriptors).toHaveProperty("receive");
    expect(descriptors).toHaveProperty("change");
    expect(descriptors.receive).toEqual(expect.any(String));
    expect(descriptors.change).toEqual(expect.any(String));
    expect(descriptors.receive).toMatch(/#([a-z0-9]{8})$/i);
    expect(descriptors.change).toMatch(/#([a-z0-9]{8})$/i);
    expect(descriptors.receive).toContain("sortedmulti");
    expect(descriptors.change).toContain("sortedmulti");
  });
});
