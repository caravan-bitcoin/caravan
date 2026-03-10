/**
 * Creates the initial test state file during globalSetup.
 * This runs BEFORE any test project, including wallet.setup.ts.
 */
import path from "path";
import fs from "fs";
import { TestState } from "./types";

export function createInitialTestState(
  walletNames: string[],
  testWallets: any[],
  senderAddress: string,
  receiverAddress: string,
): TestState {
  return {
    downloadDir: path.join(process.cwd(), "e2e/downloads"),
    uploadDir: path.join(process.cwd(), "e2e/uploads"),
    downloadDirFiles: {
      WalletFile: "",
      UnsignedPsbt: "",
    },
    test_wallet_names: walletNames,
    test_wallets: testWallets,
    sender: {
      address: senderAddress,
      walletName: walletNames[0],
    },
    receiver: {
      address: receiverAddress,
      walletName: walletNames[1],
    },
    walletAddresses: [],
    timestamp: Date.now(),
  };
}

export function createAndSaveTestState(
  walletNames: string[],
  testWallets: any[],
  senderAddress: string,
  receiverAddress: string,
): string {
  const testStateFile = path.join(process.cwd(), "e2e/temp/test-state.json");
  const tempDir = path.dirname(testStateFile);

  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }

  const testState = createInitialTestState(
    walletNames,
    testWallets,
    senderAddress,
    receiverAddress,
  );

  fs.writeFileSync(testStateFile, JSON.stringify(testState, null, 2));
  return testStateFile;
}
