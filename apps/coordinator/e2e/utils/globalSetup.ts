import {FullConfig} from "@playwright/test"
import {execSync} from "child_process"
import bitcoinClient from "./bitcoinClient";


async function globalSetup(_config: FullConfig){

   try {
    console.log("Starting docker containers");
    execSync("docker compose up -d", {
        stdio: "inherit",
        cwd: process.cwd()
    })

    console.log("Waiting for continers to be ready...");
    await new Promise(resolve => setTimeout(resolve,10000));

    const client = bitcoinClient();

    const checkConnection = await client?.testRpcConnection();
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
