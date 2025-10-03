import { FullConfig } from "@playwright/test";
import { execSync } from "child_process";

import bitcoinClient from "./bitcoinClient";
import createTestWalletsAndFund, {
  checkDockerAvailability,
} from "./testFixtures";
import { createAndSaveTestState } from "./testStateSetup";

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
    // Only attempt Docker cleanup if Docker is actually available
    if (
      error instanceof Error &&
      !error.message.includes("Docker is required")
    ) {
      try {
        execSync("docker compose down", {
          stdio: "inherit",
          cwd: process.cwd(),
        });
      } catch (clearupError) {
        console.log("Error while cleaning up", clearupError);
      }
    }
    throw new Error(`Global setup failed: ${error}`);
  }
}

export default globalSetup;
