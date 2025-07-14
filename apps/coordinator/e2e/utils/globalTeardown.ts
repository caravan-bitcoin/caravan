import { FullConfig } from "@playwright/test";
import { execSync } from "child_process";
import path from "path";
import bitcoinClient from "./bitcoinClient";

async function globalTeardown(_config: FullConfig) {
  try {
    const client = bitcoinClient();

    // Cleaning up test wallets...

    if (process.env.TEST_WALLET_NAMES) {
      const walletNames = JSON.parse(process.env.TEST_WALLET_NAMES);

      for (const walletName in walletNames) {
        try {
          const exist = await client?.walletExists(walletName);
          if (exist) {
            await client?.unloadWallet(walletName);
          }
        } catch (error) {
            console.log("error",error)
        }
      }
    }

    //removing docker containers after use
    // execSync("docker compose down", {
    //   cwd: process.cwd(),
    //   stdio: "inherit",
    // });
    execSync("docker compose stop", {
      cwd: path.join(process.cwd(),"e2e"),
      stdio: "inherit",
    });

    console.log("Global Teardown completes");
  } catch (error) {
    console.log("Global Teardown failed:", error);
  }
}

export default globalTeardown;
