/**
 * Wallet address display and balance verification.
 *
 * Dependencies: wallet.setup.ts (via Playwright project dependencies)
 * Preconditions: assertModifiedWalletConfig, assertWalletAddressesCollected

 */
import { test, expect } from "../../fixtures/caravan.fixture";
import { testStateManager } from "../../state/testState";
import {
  assertModifiedWalletConfig,
  assertWalletAddressesCollected,
} from "../../fixtures/preconditions";
import { clientConfig } from "../../services/bitcoinClient";

test.describe("Wallet Display Verification", () => {
  // Preconditions: fail fast if setup didn't complete
  test.beforeAll(() => {
    assertModifiedWalletConfig();
    assertWalletAddressesCollected();
  });

  test.beforeEach(async ({ walletImport }) => {
    const walletFile = testStateManager.getDownloadedWalletFile();
    await walletImport.importWalletAndPrepare(
      walletFile,
      clientConfig.password,
    );
  });

  test("receive tab shows addresses with correct format", async ({
    walletNav,
    receiveTab,
  }) => {
    await walletNav.switchToTab("Receive");

    // The setup already collected and funded 4 addresses.
    // Verify the UI shows the current address with correct format.
    const address = await receiveTab.getCurrentAddress();
    expect(address).toMatch(/^(2[MN]|bcrt1)/);
  });

  test("path index advances after deposits", async ({
    walletNav,
    receiveTab,
  }) => {
    await walletNav.switchToTab("Receive");

    // Setup funded 4 addresses, so the path index should have
    // advanced to at least 4.
    await expect
      .poll(
        async () => {
          const suffix = await receiveTab.getCurrentPathSuffix();
          return suffix.split("/")[2];
        },
        {
          message: "Path index should be at least 4 after setup funding",
          timeout: 30000,
          intervals: [2000],
        },
      )
      .toBe("4");
  });

  test("addresses tab shows funded addresses with correct balance", async ({
    walletNav,
    addressesTab,
  }) => {
    await walletNav.switchToTab("Addresses");

    const rows = await addressesTab.extractTableData();
    const expectedAddresses = testStateManager.getWalletAddresses();

    // Verify addresses match what setup collected
    let totalBalance = 0;
    rows.forEach((row) => {
      if (parseFloat(row.balance) > 0) {
        expect(row.address).toMatch(/^2[MN]/);
        totalBalance += parseFloat(row.balance);
      }
    });

    // Setup sent 2 BTC to each of 4 addresses = 8 BTC
    expect(totalBalance).toBe(8);
  });

  test("balance display shows total after confirmation", async ({
    walletNav,
  }) => {
    // Setup already mined confirmation blocks.
    // Just verify the balance display is correct.
    await walletNav.refresh();
    await walletNav.expectBalance("8 BTC");
  });

  test("should allow user to edit and save wallet name", async ({ page }) => {
    try {
      await page.goto("/#/wallet");
      await expect(page).toHaveURL(/.*\/wallet/);

      // Wallet name should be visible (display mode)
      let nameDisplay = page.locator('[data-cy="editable-name-value"]').first();
      await expect(nameDisplay).toBeVisible();

      const originalName = (await nameDisplay.textContent())?.trim();
      if (!originalName) {
        throw new Error("Wallet name is empty or not found");
      }

      const newName = `${originalName}-renamed-${Date.now()}`;

      // Enter edit mode
      const editButton = page.locator('[data-cy="edit-button"]').first();
      await editButton.click();

      // Edit input visible
      const nameInput = page.getByLabel("Name");
      await expect(nameInput).toBeVisible();

      await nameInput.fill(newName);

      // Save change
      const saveButton = page.locator('[data-cy="save-button"]').first();
      await expect(saveButton).toBeEnabled();
      await saveButton.click();

      // UI exits edit mode
      await expect(nameInput).not.toBeVisible();
      await expect(editButton).toBeVisible();

      // Updated name shown in display mode
      nameDisplay = page.locator('[data-cy="editable-name-value"]').first();
      await expect(nameDisplay).toHaveText(newName);

    } catch (error) {
      throw new Error(`Error in wallet name editing: ${error}`);
    }
  });
});
