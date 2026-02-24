/**
 * Manages shared state between test projects via a JSON file on disk.
 *
 * Playwright's setup projects and dependent projects
 * run in separate Node.js processes. Environment variables and in-memory
 * state don't survive across processes. A state file is the simplest
 * reliable IPC mechanism for this use case.
 *
 * LIFECYCLE:
 *   globalSetup  → creates initial state (wallet names, addresses)
 *   wallet.setup → enriches state (wallet config path, funded addresses)
 *   *.spec.ts    → reads state for assertions
 *   globalTeardown → cleanup
 */
import fs from "fs";
import path from "path";
import { TestState, walletReference } from "./types";

export class TestStateManager {
  private stateFile: string;

  constructor() {
    this.stateFile =
      process.env.TEST_STATE_FILE ||
      path.join(process.cwd(), "e2e/temp/test-state.json");
  }

  getState(): TestState {
    if (!fs.existsSync(this.stateFile)) {
      throw new Error(
        `Test state file not found at ${this.stateFile}. ` +
          "Ensure globalSetup completed successfully.",
      );
    }
    return JSON.parse(fs.readFileSync(this.stateFile, "utf-8"));
  }

  updateState(updates: Partial<TestState>): void {
    let currentState: TestState = {} as TestState;
    if (fs.existsSync(this.stateFile)) {
      currentState = this.getState();
    }
    const newState = { ...currentState, ...updates };
    fs.writeFileSync(this.stateFile, JSON.stringify(newState, null, 2));
  }

  getDownloadedWalletFile(): string {
    const state = this.getState();
    const walletFile = state.downloadDirFiles.WalletFile;
    if (!walletFile) {
      throw new Error(
        "Wallet file path is empty in state. " +
          "Ensure wallet.setup.ts completed the wallet creation step.",
      );
    }
    return walletFile;
  }

  getDownloadedUnsignedPsbtFile(): string {
    const state = this.getState();
    const unsignedPsbtFile = state.downloadDirFiles.UnsignedPsbt;
    if (!unsignedPsbtFile) {
      throw new Error("Unsigned PSBT file path is empty in state.");
    }
    return unsignedPsbtFile;
  }

  getWalletsNames(): string[] {
    return this.getState().test_wallet_names;
  }

  getSender(): walletReference {
    return this.getState().sender;
  }

  getReceiver(): walletReference {
    return this.getState().receiver;
  }

  getWalletAddresses(): string[] {
    const addresses = this.getState().walletAddresses;
    if (!addresses || addresses.length === 0) {
      throw new Error(
        "No wallet addresses in state. " +
          "Ensure wallet.setup.ts completed the address collection step.",
      );
    }
    return addresses;
  }
}

export const testStateManager = new TestStateManager();
