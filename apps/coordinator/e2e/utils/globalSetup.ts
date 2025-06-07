//steps

//1. import and set the correct arg
//2. set it in the playwright-config as well
//3. then lets say execute a simple cmd also, just for checking if thats works
//4. then can add a simple, 

import {FullConfig} from "@playwright/test"
import {execSync} from "child_process"
import { BitcoinCoreService } from "./bitcoinServices";
import { rpcConfig } from "./bitcoinServices";

const clientConfig:rpcConfig = {
    username: "abhishek",
    password: "abhishek",
    host: "http://localhost:18443",
    port: 18443,
}

async function globalSetup(_config: FullConfig){

   try {
    console.log("Starting docker containers");
    execSync("docker compose up -d", {
        stdio: "inherit",
        cwd: process.cwd()
    })

    console.log("Waiting for continers to be ready...");
    await new Promise(resolve => setTimeout(resolve,10000));

    const client = new BitcoinCoreService(clientConfig);

    const checkConnection = await client.testRpcConnection();
    console.log("checkConnection",checkConnection)

    
   } catch (error) {
    console.log("Global setup failed:", error)
    try {
        //cleaning up on failures

        execSync("docker compose down",{
            stdio: "inherit",
            cwd: process.cwd()
        })
        console.log("")
        
    } catch (clearupError) {
        console.log("Error while cleaning up",clearupError)
    }
   }
}

export default globalSetup
