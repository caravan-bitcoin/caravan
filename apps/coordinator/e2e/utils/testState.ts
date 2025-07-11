import fs from "fs";
import path from "path";
import { TestState } from "./types";

export class TestStateManager {
  private stateFile: string;

  constructor() {
    this.stateFile = process.env.TEST_STATE_FILE || path.join(process.cwd(), "e2e/temp/test-state.json");
  }

  getState(): TestState {
    if (!fs.existsSync(this.stateFile)) {
      throw new Error("Test state file not found.")
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

    if(!state.downloadWalletFile){
      throw new Error('Wallet file not yet downloaded. Make sure wallet creation test ran first.');

    }
    return state.downloadWalletFile;
  }

  getWalletsNames(){
    const state = this.getState();
    return state.test_wallet_names
  }
}

export const testStateManager = new TestStateManager();