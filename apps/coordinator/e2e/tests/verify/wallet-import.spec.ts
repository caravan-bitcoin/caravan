/**
 * Wallet configuration import and rendering.
 *
 * Tests the ability to import wallet configuration files and validate
 * that the wallet details are correctly parsed and displayed in the UI.
 *
 * Test Categories:
 *   1. Schema validation - Validates the JSON fixture files themselves
 *   2. UI rendering - Validates that imported configs display correctly
 */
import { test, expect } from "../../fixtures/caravan.fixture";
import path from "path";
import fs from "fs";

const FIXTURES_DIR = path.resolve(process.cwd(), "./fixtures/caravan");

const VALID_WALLET_CASES = [
  {
    file: "bitcoin-2-of-2-P2SH-P2WSH_MAINNET.json",
   
  },
  {
    file: "bitcoin-2-of-2-P2SH-P2WSH_TESTNET.json",
   
  },
  {
    file: "bitcoin-2-of-2-P2SH_MAINNET.json",
  
  },
  {
    file: "bitcoin-2-of-2-P2SH_TESTNET.json",
   
  },
  {
    file: "bitcoin-2-of-2-P2WSH_MAINNET.json",
   
  },
  {
    file: "bitcoin-2-of-2-P2WSH_TESTNET.json",
  
  },
];

test.describe("Importing Existing Wallet Configurations", () => {
  test.describe("Wallet config schema validation", () => {
    test.describe.configure({ mode: "serial" });

    for (const c of VALID_WALLET_CASES) {
      test(`schema is valid for ${c.file}`, async () => {
        // Validate fixture structure without involving the UI.
        const configPath = path.join(FIXTURES_DIR, c.file);

        expect(
          fs.existsSync(configPath),
          `Fixture not found: ${c.file} `,
        ).toBe(
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
      test(`imports ${c.file} from scratch`, async ({ walletImport }) => {
        const configPath = path.join(FIXTURES_DIR, c.file);

        if (!fs.existsSync(configPath)) {
          throw new Error(`Fixture not found: ${configPath}`);
        }

        const wallet = JSON.parse(fs.readFileSync(configPath, "utf-8"));

    
        await walletImport.uploadAndOpenDetailsForValidation(
          configPath,
        );

        // Assert: Verify network selection matches the fixture
        await walletImport.validateNetworkSelection(wallet.network);

        // Assert: Verify address type selection matches the fixture
        await walletImport.validateAddressTypeSelection(wallet.addressType);

        // Assert: Confirm quorum counts match the fixture values
        await walletImport.validateQuorumValues(
          wallet.quorum.requiredSigners,
          wallet.quorum.totalSigners,
        );

        // Assert: Each signer card should show the name, xpub prefix, and BIP32 path
        for (const signer of wallet.extendedPublicKeys) {
          await walletImport.validateSignerCard(signer);
        }

        // Act: Confirm the import
        await walletImport.confirmImport();

        // Assert: Verify the wallet name appears in the summary
        await expect(
          walletImport.getPage().getByText(wallet.name, { exact: true }),
        ).toBeVisible({ timeout: 1000 });

        // Assert: Verify no import errors occurred
        await expect(
          walletImport.getPage().locator('[data-cy="wallet-import-error"]'),
        ).toHaveCount(0, { timeout: 1000 });
      });
    }
  });
});
