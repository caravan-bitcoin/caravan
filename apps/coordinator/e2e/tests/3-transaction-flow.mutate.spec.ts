/**
 * Transaction creation, signing, and broadcast.
 *
 * Dependencies: wallet.setup.ts (via Playwright project dependencies)
 * Preconditions: assertModifiedWalletConfig
 *
 * Two scenarios tested:
 *   1. Auto coin selection — Caravan picks UTXOs automatically
 *   2. Manual coin selection — User picks specific UTXOs
 *
 * Both follow the same flow: fill form → preview → download PSBT →
 * sign via RPC → import signatures → broadcast → verify success.
 */
import { test, expect } from "../fixtures/caravan.fixture";
import { testStateManager } from "../state/testState";
import { assertModifiedWalletConfig } from "../fixtures/preconditions";
import { createIndividualSignedPsbts } from "../services/psbtHelpers";
import { clientConfig } from "../services/bitcoinClient";
import path from "path";
import fs from "fs";

test.describe("Transaction Creation and Signing", () => {
  let downloadDir: string;
  let uploadDir: string;

  test.beforeAll(() => {
    assertModifiedWalletConfig();

    const state = testStateManager.getState();
    downloadDir = state.downloadDir;
    uploadDir = state.uploadDir;

    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
  });

  test.beforeEach(async ({ walletImport, walletNav }) => {
    const walletFile = testStateManager.getDownloadedWalletFile();
    await walletImport.importWalletAndPrepare(
      walletFile,
      clientConfig.password,
    );
    await walletNav.switchToTab("Send");
  });

  test("auto coin selection: create, sign, broadcast", async ({
    sendTab,
    signTab,
    btcClient,
  }) => {
    // ─── Arrange ────────────────────────────────────────────
    const receiver = testStateManager.getReceiver().address;

    // ─── Act: Fill form and download PSBT ───────────────────
    await sendTab.fillRecipient(receiver, "0.5");
    await sendTab.getFeeRate();
    await sendTab.previewTransaction();

    const psbtPath = path.join(downloadDir, "unsignedPSBT-auto");
    await sendTab.downloadUnsignedPsbt(psbtPath);

    // ─── Assert: PSBT file exists ───────────────────────────
    expect(fs.existsSync(psbtPath)).toBe(true);

    // Persist for potential downstream tests
    const currentState = testStateManager.getState();
    testStateManager.updateState({
      downloadDirFiles: {
        ...currentState.downloadDirFiles,
        UnsignedPsbt: psbtPath,
      },
    });

    // ─── Act: Sign with Bitcoin Core wallets ────────────────
    const walletNames = testStateManager.getWalletsNames().slice(0, 2);
    const result = await createIndividualSignedPsbts(walletNames, btcClient);

    // ─── Act: Import signatures into Caravan UI ─────────────
    await signTab.goToSignMode();

    const sigs1 = result.individualPsbts[0].signatures.map(
      (s) => s.signatures[0],
    );
    await signTab.importSignature(1, JSON.stringify(sigs1));

    const sigs2 = result.individualPsbts[1].signatures.map(
      (s) => s.signatures[0],
    );
    await signTab.importSignature(2, JSON.stringify(sigs2));

    // ─── Act + Assert: Broadcast ────────────────────────────
    await signTab.broadcastAndVerify();
  });

  test("manual coin selection: create, sign, broadcast", async ({
    sendTab,
    signTab,
    btcClient,
  }) => {
    // ─── Arrange ────────────────────────────────────────────
    const receiver = testStateManager.getReceiver().address;

    // ─── Act: Configure manual selection ────────────────────
    await sendTab.setManualCoinSelection(true);
    await sendTab.fillRecipient(receiver, "3");
    await sendTab.setRbf(false);
    await sendTab.selectUTXOs(3);
    await sendTab.getFeeRate();
    await sendTab.addChangeOutput();

    // ─── Act: Preview and download ──────────────────────────
    await sendTab.previewTransaction();

    const psbtPath = path.join(downloadDir, "unsignedPSBT-manual");
    await sendTab.downloadUnsignedPsbt(psbtPath);

    // ─── Assert: PSBT file exists ───────────────────────────
    expect(fs.existsSync(psbtPath)).toBe(true);

    // Persist
    const currentState = testStateManager.getState();
    testStateManager.updateState({
      downloadDirFiles: {
        ...currentState.downloadDirFiles,
        UnsignedPsbt: psbtPath,
      },
    });

    // ─── Act: Sign ──────────────────────────────────────────
    const walletNames = testStateManager.getWalletsNames().slice(0, 2);
    const result = await createIndividualSignedPsbts(walletNames, btcClient);

    await signTab.goToSignMode();

    const sigs1 = result.individualPsbts[0].signatures.map(
      (s) => s.signatures[0],
    );
    await signTab.importSignature(1, JSON.stringify(sigs1));

    const sigs2 = result.individualPsbts[1].signatures.map(
      (s) => s.signatures[0],
    );
    await signTab.importSignature(2, JSON.stringify(sigs2));

    // ─── Act + Assert: Broadcast ────────────────────────────
    await signTab.broadcastAndVerify();
  });
});
