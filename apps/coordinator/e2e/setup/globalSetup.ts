/**
 * Playwright globalSetup — runs once before all projects.
 *
 * Responsibilities:
 *   1. Start Docker containers (Bitcoin Core + Caravan)
 *   2. Wait for Bitcoin Core RPC to be ready
 *   3. Create test wallets and fund the sender
 *   4. Save initial test state to disk
 *
 * This does NOT interact with the browser. Browser-level
 * setup (wallet creation in Caravan UI) is handled by
 * the wallet.setup.ts project.
 */
import { FullConfig } from "@playwright/test";
import { execSync } from "child_process";
import bitcoinClient from "../services/bitcoinClient";
import createTestWalletsAndFund, {
  checkDockerAvailability,
} from "./testFixtures";
import { createAndSaveTestState } from "../state/testStateSetup";

async function globalSetup(_config: FullConfig) {
  try {
    await checkDockerAvailability();

    const client = bitcoinClient();
    await new Promise((resolve) => setTimeout(resolve, 2000));
    await client?.waitForBitcoinCore();

    const { walletNames, testWallets, senderAddress, receiverAddress } =
      await createTestWalletsAndFund(client!);

    const testStateFile = createAndSaveTestState(
      walletNames,
      testWallets,
      senderAddress,
      receiverAddress,
    );

    process.env.TEST_STATE_FILE = testStateFile;
  } catch (error) {
    if (
      error instanceof Error &&
      !error.message.includes("Docker is required")
    ) {
      try {
        execSync("docker compose down", {
          stdio: "inherit",
          cwd: process.cwd(),
        });
      } catch (cleanupError) {
        console.log("Cleanup error (non-fatal):", cleanupError);
      }
    }
    throw new Error(`Global setup failed: ${error}`);
  }
}

export default globalSetup;
