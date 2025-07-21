import {FullConfig} from "@playwright/test"
import {execSync} from "child_process"
import bitcoinClient from "./bitcoinClient";
import createTestWallets, {checkDockerAvailability} from "./testFixtures"


const globalWalletData ={
    walletNames: [] as string[],
    testWallets: [] as any[]
}

async function globalSetup(_config: FullConfig){

   try {

    await checkDockerAvailability();
    
    const client = bitcoinClient();
    
    await new Promise(resolve => setTimeout(resolve,2000));
    await client?.waitForBitcoinCore();

    const {walletNames, testWallets} = await createTestWallets(client!);

    globalWalletData.walletNames = walletNames;
    globalWalletData.testWallets = testWallets;

    //storing in process.env to access in the test fle
    process.env.TEST_WALLET_NAMES = JSON.stringify(walletNames)
    process.env.TEST_WALLETS = JSON.stringify(testWallets)

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
