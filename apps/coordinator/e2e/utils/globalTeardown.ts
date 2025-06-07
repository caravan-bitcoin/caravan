import {FullConfig} from "@playwright/test"
import { execSync } from "child_process"

async function globalTeardown(_config: FullConfig){
    try {
        console.log("Stopping docker containers...")
        //removing docker containers after use
        execSync("docker compose down -v", {
            cwd: process.cwd() ,
            stdio: "inherit"
        })

        console.log("Global Teardown completes")
        
    } catch (error) {
        console.log("Global Teardown failed:", error)
    }
}

export default globalTeardown;
