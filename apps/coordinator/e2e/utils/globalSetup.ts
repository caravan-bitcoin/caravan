import {FullConfig} from "@playwright/test"
import {execSync} from "child_process"
import bitcoinClient from "./bitcoinClient";
import path from "path";
import fs from "fs";
import {TestState} from "./testState"

//will define the wallet type later (if can)
const globalWalletData ={
    walletNames: [] as string[],
    testWallets: [] as any[]
}


async function globalSetup(_config: FullConfig){

   try {
    // console.log("Starting docker containers");
    // execSync("docker compose up -d", {
    //     stdio: "inherit",
    //     cwd: process.cwd()
    // })

    console.log("Waiting for continers to be ready...");
    await new Promise(resolve => setTimeout(resolve,2000));

    const client = bitcoinClient();

    const checkConnection = await client?.testRpcConnection();
    console.log("checkConnection",checkConnection)

    console.log("Creating test wallets in globally...")

    // const timestamp = Date.now();
    
    const walletNames: string[] = [
        `test_wallet_1`,
        `test_wallet_2`,
        `test_wallet_3`,
        `watcher_wallet`
    ]

    for (const walletName in walletNames){
        try {
            const exist = await client?.walletexists(walletName);
        if(exist){
            console.log("Cleaning up the existing wallets")
            await client?.unloadWallet(walletName);
        }
        } catch (error) {
            console.log(`Wallet ${walletName} doesnt exist or already unloaded`)
        }
    }

    const wallet1 = await client?.createWallet({wallet_name: walletNames[0]});
    const wallet2 = await client?.createWallet({wallet_name: walletNames[1]});
    const wallet3 = await client?.createWallet({wallet_name: walletNames[2]});

    const watcher_wallet = await client?.createWallet({wallet_name: walletNames[3], disable_private_keys: true})

    const testWallets = [wallet1, wallet2,wallet3,watcher_wallet];

    // globalWalletData.walletNames = walletNames;
    // globalWalletData.testWallets = testWallets;

    //storing in process.env to access in the test fle
    // process.env.TEST_WALLET_NAMES = JSON.stringify(walletNames)
    // process.env.TEST_WALLETS = JSON.stringify(testWallets)

    console.log("Test wallets created successfully globally")

    let testStateFile = path.join(__dirname,"../temp/test-state.json");
    let tempDir = path.dirname(testStateFile);

    if(!fs.existsSync(tempDir)){
        fs.mkdirSync(tempDir, {recursive: true})
    }
     
    // Storing initial state
    const testState: TestState = {
        downloadWalletFile: '',
        test_wallet_names: walletNames,
        test_wallets: testWallets,
        walletAddress: '',
        timestamp: Date.now()
    }

    fs.writeFileSync(testStateFile, JSON.stringify(testState,null,2))
    process.env.TEST_STATE_FILE = testStateFile


   } catch (error) {
    console.log("Global setup failed:", error)
    try {
        //cleaning up on failures

        // execSync("docker compose down",{
        //     stdio: "inherit",
        //     cwd: process.cwd()
        // })
        console.log("")
        
    } catch (clearupError) {
        console.log("Error while cleaning up",clearupError)
    }
   }
}

export default globalSetup
