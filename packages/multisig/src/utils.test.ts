import { TEST_FIXTURES } from "@caravan/bitcoin";

import { MultisigWalletConfig } from "./types";
import { braidDetailsToWalletConfig } from "./utils";

describe("braidDetailsToWalletConfig", () => {
  TEST_FIXTURES.transactions.forEach((fixture) => {
    it("can convert braid details to a wallet config", () => {
      const walletConfig: MultisigWalletConfig = braidDetailsToWalletConfig(
        fixture.braidDetails,
      );
      expect(walletConfig).toHaveProperty("network");
      expect(walletConfig).toHaveProperty("addressType");
      expect(walletConfig).toHaveProperty("extendedPublicKeys");
      expect(walletConfig).toHaveProperty("quorum");
      expect(walletConfig).toHaveProperty("name");
    });
  });
});
