import {FullConfig} from "@playwright/test"
import {execSync} from "child_process"
import path from "path";
import fs from "fs";

import bitcoinClient from "./bitcoinClient";
import createTestWallets, {checkDockerAvailability} from "./testFixtures"
import { TestState } from "./types";

async function globalSetup(_config: FullConfig){

   try {

    await checkDockerAvailability();
    
    const client = bitcoinClient();
    
    await new Promise(resolve => setTimeout(resolve,2000));
    await client?.waitForBitcoinCore();

    const {walletNames, testWallets} = await createTestWallets(client!);

    const newAddress = await client?.getNewAddress(walletNames[0]);
    
    await client?.fundAddress(newAddress,walletNames[0]);

    let testStateFile = path.join(process.cwd(), "e2e/temp/test-state.json");
    let tempDir = path.dirname(testStateFile);

    if(!fs.existsSync(tempDir)){
        fs.mkdirSync(tempDir, {recursive: true})
    }
     
    // Storing initial state
    const testState: TestState = {
        downloadWalletFile: '',
        test_wallet_names: walletNames,
        test_wallets: testWallets,
        walletAddress: newAddress,
        timestamp: Date.now(),
    }

    fs.writeFileSync(testStateFile, JSON.stringify(testState,null,2))
    process.env.TEST_STATE_FILE = testStateFile

   } catch (error) {
    console.log("Global setup failed:", error)
    
    // Only attempt Docker cleanup if Docker is actually available
    if (error instanceof Error && !error.message.includes("Docker is required")) {
        try {
            execSync("docker compose down",{
                stdio: "inherit",
                cwd: process.cwd()
            })
            
        } catch (clearupError) {
            console.log("Error while cleaning up",clearupError)
        }
    }
    throw error;
   }
}


export default globalSetup
