import fs from "fs";
import path from "path";
import { TestState, walletReference } from "./types";

export class TestStateManager {
  private stateFile: string;

  constructor() {
    this.stateFile = process.env.TEST_STATE_FILE || path.join(process.cwd(), "e2e/temp/test-state.json");
  }

  getState(): TestState {
    if (!fs.existsSync(this.stateFile)) {
      throw new Error("Test state file not found.");
    }
    return JSON.parse(fs.readFileSync(this.stateFile, 'utf-8'))
  }

  updateState(updates: Partial<TestState>): void {
    let currentState: TestState = {} as TestState;
    if (fs.existsSync(this.stateFile)) {
      currentState = this.getState();
    }
    const newState = { ...currentState, ...updates };
    fs.writeFileSync(this.stateFile, JSON.stringify(newState, null,2));
  }

  getDownloadedWalletFile(): string{
    const state = this.getState();
    const walletFile = state.downloadDirFiles.WalletFile
    
    if(!walletFile){
      throw new Error('Wallet file not yet downloaded. Make sure wallet creation test ran first.');
    }
    return walletFile;
  }

  getDownloadedUnsignedPsbtFile(): string{
    const state = this.getState();
    const unsignedPsbtFile = state.downloadDirFiles.UnsignedPsbt

    if(!unsignedPsbtFile){
      throw new Error("Unsigned psbt file not yet downloaded.");
    }

    return unsignedPsbtFile;
  }

  getWalletsNames(){
    const state = this.getState();
    return state.test_wallet_names
  }

  getSender():walletReference{
    const state = this.getState();
    return state.sender;
  }

  getReceiver():walletReference {
    const state = this.getState();
    return state.receiver;
  }
}

export const testStateManager = new TestStateManager();
