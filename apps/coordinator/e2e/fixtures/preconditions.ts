/**
 * Precondition validators — circuit breakers for cross-project dependencies.
 * Every function is pure: reads files, validates, returns value or throws.
 * No side effects. No browser interaction.
 */
import fs from "fs";
import { testStateManager } from "../state/testState";

export function assertWalletFileDownloaded(): string {
  const file = testStateManager.getDownloadedWalletFile();

  if (!fs.existsSync(file)) {
    throw new Error(
      `PRECONDITION FAILED: Wallet config not found at ${file}.\n` +
        "This test depends on wallet.setup.ts completing successfully.",
    );
  }

  let config: any;
  try {
    config = JSON.parse(fs.readFileSync(file, "utf-8"));
  } catch {
    throw new Error(
      `PRECONDITION FAILED: Wallet config at ${file} is not valid JSON.`,
    );
  }

  if (!config.extendedPublicKeys?.length) {
    throw new Error(
      "PRECONDITION FAILED: Wallet config has no extendedPublicKeys.",
    );
  }

  return file;
}

export function assertModifiedWalletConfig(): string {
  const file = assertWalletFileDownloaded();
  const config = JSON.parse(fs.readFileSync(file, "utf-8"));

  if (config.network !== "regtest") {
    throw new Error(
      `PRECONDITION FAILED: Wallet network is "${config.network}", expected "regtest".\n` +
        "This test depends on wallet.setup.ts completing the config modification step.",
    );
  }

  const allXfpsValid = config.extendedPublicKeys.every(
    (k: any) => k.xfp && k.xfp.length === 8,
  );
  if (!allXfpsValid) {
    throw new Error(
      "PRECONDITION FAILED: Not all extended public keys have valid xfp values.",
    );
  }

  return file;
}

export function assertWalletAddressesCollected(): string[] {
  const addresses = testStateManager.getWalletAddresses();
  if (addresses.length < 4) {
    throw new Error(
      `PRECONDITION FAILED: Only ${addresses.length} addresses in state (expected 4+).\n` +
        "This test depends on wallet.setup.ts completing address collection.",
    );
  }
  return addresses;
}

export function assertUnsignedPsbtExists(): string {
  const file = testStateManager.getDownloadedUnsignedPsbtFile();

  if (!fs.existsSync(file)) {
    throw new Error(`PRECONDITION FAILED: Unsigned PSBT not found at ${file}.`);
  }

  const content = fs.readFileSync(file, "utf-8").trim();
  if (content.length < 10) {
    throw new Error(
      `PRECONDITION FAILED: PSBT file too short (${content.length} chars).`,
    );
  }

  return file;
}
