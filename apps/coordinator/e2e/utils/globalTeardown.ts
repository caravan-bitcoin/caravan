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
            throw new Error(`Failed to unload wallet ${walletName}: ${error}`)
        }
      }
    }
    
    const composeFile = process.env.CI ? 'docker-compose.ci.yml' : 'docker-compose.yml' ;
    execSync(`docker compose -f ${composeFile} down --remove-orphans --volumes`, {
      cwd: path.join(process.cwd(), "e2e"),
      stdio: "inherit"
    })
  } catch (error) {
    throw new Error(`Global Teardown failed: ${error}`);
  }
}

export default globalTeardown;
