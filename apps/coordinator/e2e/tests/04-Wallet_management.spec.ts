import { test, expect } from "@playwright/test";
import path from "path";
import fs from "fs";

const FIXTURES_DIR = path.join(process.cwd(), "fixtures/caravan");

const VALID_WALLET_CASES = [
  {
    file: "bitcoin-2-of-2-P2SH_MAINNET.json",
    addressType: /p2sh/i,
    network: /mainnet/i,
    quorum: "2 of 2",
  },
  {
    file: "bitcoin-2-of-2-P2SH_TESTNET.json",
    addressType: /p2sh/i,
    network: /testnet/i,
    quorum: "2 of 2",
  },
];

test.describe("Importing Existing Wallet Configurations", () => {
  test.describe("Wallet config schema validation", () => {
    test.describe.configure({ mode: "serial" });

    for (const c of VALID_WALLET_CASES) {
      test(`schema is valid for ${c.file}`, async () => {
        // Validate fixture structure without involving the UI.
        const configPath = path.join(FIXTURES_DIR, c.file);

        expect(fs.existsSync(configPath), `Fixture not found: ${c.file}`).toBe(
          true,
        );

        const wallet = JSON.parse(fs.readFileSync(configPath, "utf-8"));

        expect(wallet).toHaveProperty("name");
        expect(wallet).toHaveProperty("addressType");
        expect(wallet).toHaveProperty("network");
        expect(wallet).toHaveProperty("client");
        expect(wallet.client).toHaveProperty("type");
        expect(wallet).toHaveProperty("quorum");
        expect(wallet).toHaveProperty("extendedPublicKeys");
        expect(wallet).toHaveProperty("startingAddressIndex");

        expect(wallet.quorum).toHaveProperty("requiredSigners");
        expect(wallet.quorum).toHaveProperty("totalSigners");

        expect(Array.isArray(wallet.extendedPublicKeys)).toBe(true);
        expect(wallet.extendedPublicKeys.length).toBeGreaterThan(0);

        // Ensure each signer entry contains the fields the UI expects to render.
        wallet.extendedPublicKeys.forEach((key: any, index: number) => {
          expect(key, `missing name at index ${index}`).toHaveProperty("name");
          expect(key, `missing xpub at index ${index}`).toHaveProperty("xpub");
          expect(key, `missing bip32Path at index ${index}`).toHaveProperty(
            "bip32Path",
          );
          expect(key, `missing xfp at index ${index}`).toHaveProperty("xfp");
        });
      });
    }
  });

  test.describe("Valid wallet configs load correctly", () => {
    for (const c of VALID_WALLET_CASES) {
      test(`imports ${c.file} from scratch`, async ({ page }) => {
        // Import the fixture through the UI and verify that key fields are rendered.
        const configPath = path.join(FIXTURES_DIR, c.file);

        if (!fs.existsSync(configPath)) {
          throw new Error(`Fixture not found: ${configPath}`);
        }

        const wallet = JSON.parse(fs.readFileSync(configPath, "utf-8"));

        await page.goto("/#/wallet");

        // Upload the JSON config to the file input.
        await page.setInputFiles("input#upload-config", configPath);

        // Open editable sections so we can assert on selections and details.
        await page.getByRole("link", { name: /edit details/i }).click();

        // Verify network selection matches the fixture.
        const networkSection = page
          .getByRole("heading", { name: /network/i })
          .locator("..");
        await expect(
          page.getByRole("radio", { name: wallet.network }),
        ).toBeChecked();

        // Verify address type selection matches the fixture.
        const addressTypeSection = page
          .getByRole("heading", { name: /address type/i })
          .locator("..");

        await expect(
          page.getByRole("radio", { name: wallet.addressType, exact: true }),
        ).toBeChecked();

        // Confirm quorum counts match the fixture values.
        const quorumCard = page
          .getByText("Quorum", { exact: true })
          .locator("..")
          .locator("..")
          .locator("..");
        const columns = quorumCard.locator(".MuiGrid-grid-xs-3");

        const requiredColumn = columns.filter({ hasText: "Required" });
        await expect(
          requiredColumn.getByRole("heading", {
            name: String(wallet.quorum.requiredSigners),
            level: 2,
          }),
        ).toBeVisible();

        const totalColumn = columns.filter({ hasText: "Total" });
        await expect(
          totalColumn.getByRole("heading", {
            name: String(wallet.quorum.totalSigners),
            level: 2,
          }),
        ).toBeVisible();

        // Each signer card should show the name, xpub prefix, and BIP32 path.
        for (const signer of wallet.extendedPublicKeys) {
          const signerCard = page
            .locator('[data-cy="editable-name-value"]', {
              hasText: signer.name,
            })
            .locator('xpath=ancestor::div[contains(@class,"MuiCard-root")]');

          await expect(signerCard).toBeVisible();

          await expect(
            signerCard.getByText(signer.xpub.slice(0, 12)),
          ).toBeVisible();

          await expect(
            signerCard.getByText(signer.bip32Path, { exact: true }),
          ).toBeVisible();
        }

        // Confirm import and wait briefly for the wallet summary to render.
        await page.locator("#confirm-wallet").click();
        await page.waitForTimeout(1000);

        await expect(page.getByText(wallet.name, { exact: true })).toBeVisible({
          timeout: 1000,
        });

        await expect(
          page.locator('[data-cy="wallet-import-error"]'),
        ).toHaveCount(0, { timeout: 1000 });
      });
    }
  });
});