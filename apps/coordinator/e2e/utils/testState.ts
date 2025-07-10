import fs from "fs";
import path from "path";

export interface TestState {
  downloadWalletFile: string,
  test_wallet_names: string[],
  test_wallets: any[]
  walletAddress: string
  timestamp: number
}

export class TestStateManager {
  private stateFile: string;

  constructor() {
    this.stateFile = process.env.TEST_STATE_FILE || path.join(__dirname,"../temp/test-state.json")
  }

  getState():TestState {
    if(!fs.existsSync(this.stateFile)){
      throw new Error("Test state file not found.")
    }
    return JSON.parse(fs.readFileSync(this.stateFile,'utf-8'));
  }

  updateState(updates: Partial<TestState>):void {
    const currentState = this.getState();
    const newState = {...currentState,...updates};
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