import {
  blockExplorerURL,
  blockExplorerAPIURL,
  blockExplorerTransactionURL,
  blockExplorerAddressURL,
} from "./block_explorer";
import { Network } from "./networks";

describe("block_explorer", () => {
  describe("blockExplorerURL", () => {
    it("should properly return the base mainnet block explorer url for empty path", () => {
      expect(blockExplorerURL("", Network.MAINNET)).toBe(
        "https://mempool.space"
      );
    });

    it("should properly return the mainnet block explorer url for a given path path", () => {
      const path =
        "/block/00000000000000000011341d69792271766e4683e29b3ea169eacc59bde10a57";
      expect(blockExplorerURL(path, Network.MAINNET)).toBe(
        `https://mempool.space${path}`
      );
    });

    it("should properly return the base testnet block explorer url for empty path", () => {
      expect(blockExplorerURL("", Network.TESTNET)).toBe(
        "https://mempool.space/testnet"
      );
    });

    it("should properly return the testnet block explorer url for a given path path", () => {
      const path =
        "/tx/4f0ef69f88829bd2f6b7793e32dd8bfcfbc87ddb9a2de3d8ef3f2aabbaff0be3";
      expect(blockExplorerURL(path, Network.TESTNET)).toBe(
        `https://mempool.space/testnet${path}`
      );
    });
  });

  describe("blockExplorerAPIURL", () => {
    it("should properly return the mainnet block explorer api url for path", () => {
      const path =
        "/tx/1814a10fb22e9551a17a94a1e68971e19b4f59eaf1689e0af85b97929b3b9ae0";
      expect(blockExplorerAPIURL(path, Network.MAINNET)).toBe(
        `https://mempool.space/api${path}`
      );
    });

    it("should properly return the testnet block explorer api url for path", () => {
      const path =
        "/tx/4f0ef69f88829bd2f6b7793e32dd8bfcfbc87ddb9a2de3d8ef3f2aabbaff0be3";
      expect(blockExplorerAPIURL(path, Network.TESTNET)).toBe(
        `https://mempool.space/testnet/api${path}`
      );
    });
  });

  describe("blockExplorerTransactionURL", () => {
    it("should properly return the mainnet block explorer transaction url for a given path", () => {
      const path =
        "1814a10fb22e9551a17a94a1e68971e19b4f59eaf1689e0af85b97929b3b9ae0";
      expect(blockExplorerTransactionURL(path, Network.MAINNET)).toBe(
        `https://mempool.space/tx/${path}`
      );
    });

    it("should properly return the testnet block explorer transaction url for a given path", () => {
      const path =
        "4f0ef69f88829bd2f6b7793e32dd8bfcfbc87ddb9a2de3d8ef3f2aabbaff0be3";
      expect(blockExplorerTransactionURL(path, Network.TESTNET)).toBe(
        `https://mempool.space/testnet/tx/${path}`
      );
    });
  });

  describe("blockExplorerAddressURL", () => {
    it("should properly return the mainnet block explorer address url for a given path", () => {
      const path = "39YqNoLULDpbjmeCTdGJ42DQhrQLzRcMdX";
      expect(blockExplorerAddressURL(path, Network.MAINNET)).toBe(
        `https://mempool.space/address/${path}`
      );
    });

    it("should properly return the testnet block explorer address url for a given path", () => {
      const path = "2N16oE62ZjAPup985dFBQYAuy5zpDraH7Hk";
      expect(blockExplorerAddressURL(path, Network.TESTNET)).toBe(
        `https://mempool.space/testnet/address/${path}`
      );
    });
  });
});
