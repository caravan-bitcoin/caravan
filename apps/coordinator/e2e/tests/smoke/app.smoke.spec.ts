/**
 * Basic connectivity and navigation.
 *
 * These tests verify that Caravan loads and Bitcoin Core
 * connection works. They have NO dependency on the setup project
 * — they can run in parallel or before it.
 *
 */
import { test, expect } from "../fixtures/caravan.fixture";
import { clientConfig } from "../services/bitcoinClient";

test.describe("Caravan Smoke Tests", () => {
  test("homepage loads correctly", async ({ homePage }) => {
    await homePage.goto();
    await homePage.expectLoaded();
  });

  test("can navigate to wallet setup", async ({ homePage }) => {
    await homePage.goto();
    await homePage.navigateToWalletSetup();
    const name = await homePage.getDefaultWalletName();
    expect(name).toBe("My Multisig Wallet");
  });

  const connectionScenarios = [
    {
      name: "successful connection",
      url: "http://localhost:8080",
      username: clientConfig.username,
      password: clientConfig.password,
      expectedMessage: "Connection Success!",
    },
    {
      name: "wrong URL",
      url: "http://localhost:8081",
      username: clientConfig.username,
      password: clientConfig.password,
      expectedMessage: "__filename is not defined",
    },
    {
      name: "incorrect credentials",
      url: "http://localhost:8080",
      username: "random1",
      password: clientConfig.password,
      expectedMessage: "__filename is not defined",
    },
  ];

  for (const scenario of connectionScenarios) {
    test(`handles ${scenario.name}`, async ({ walletSetup }) => {
      await walletSetup.setupPrivateClient({
        url: scenario.url,
        username: scenario.username,
        password: scenario.password,
      });
      await walletSetup.expectConnectionMessage(scenario.expectedMessage);
    });
  }
});
