import { describe, it, expect } from "vitest";
import {
  blockExplorerURL,
  blockExplorerAPIURL,
  blockExplorerTransactionURL,
  blockExplorerAddressURL,
} from "../block_explorer";
import { Network } from "../networks";

describe("block_explorer", () => {
  describe("blockExplorerURL", () => {
    it("should properly return the base mainnet block explorer url for empty path", () => {
      expect(blockExplorerURL("", Network.MAINNET)).toEqual("https://mempool.space");
    });

    it("should properly return the mainnet block explorer url for a given path", () => {
      const path = "/block/00000000000000000011341d69792271766e4683e29b3ea169eacc59bde10a57";
      expect(blockExplorerURL(path, Network.MAINNET)).toEqual(
        "https://mempool.space/block/00000000000000000011341d69792271766e4683e29b3ea169eacc59bde10a57"
      );
    });

    it("should properly return the base testnet block explorer url for empty path", () => {
      expect(blockExplorerURL("", Network.TESTNET)).toEqual("https://mempool.space/testnet");
    });

    it("should properly return the testnet block explorer url for a given path", () => {
      const path = "/block/00000000000000000011341d69792271766e4683e29b3ea169eacc59bde10a57";
      expect(blockExplorerURL(path, Network.TESTNET)).toEqual(
        "https://mempool.space/testnet/block/00000000000000000011341d69792271766e4683e29b3ea169eacc59bde10a57"
      );
    });
  });

  describe("blockExplorerAPIURL", () => {
    it("should properly return the base mainnet block explorer API url for empty path", () => {
      expect(blockExplorerAPIURL("", Network.MAINNET)).toEqual("https://mempool.space/api");
    });

    it("should properly return the mainnet block explorer API url for a given path", () => {
      const path = "/block/00000000000000000011341d69792271766e4683e29b3ea169eacc59bde10a57";
      expect(blockExplorerAPIURL(path, Network.MAINNET)).toEqual(
        "https://mempool.space/api/block/00000000000000000011341d69792271766e4683e29b3ea169eacc59bde10a57"
      );
    });

    it("should properly return the base testnet block explorer API url for empty path", () => {
      expect(blockExplorerAPIURL("", Network.TESTNET)).toEqual("https://mempool.space/testnet/api");
    });

    it("should properly return the testnet block explorer API url for a given path", () => {
      const path = "/block/00000000000000000011341d69792271766e4683e29b3ea169eacc59bde10a57";
      expect(blockExplorerAPIURL(path, Network.TESTNET)).toEqual(
        "https://mempool.space/testnet/api/block/00000000000000000011341d69792271766e4683e29b3ea169eacc59bde10a57"
      );
    });
  });

  describe("blockExplorerTransactionURL", () => {
    it("should properly return the mainnet block explorer transaction url", () => {
      const txid = "00000000000000000011341d69792271766e4683e29b3ea169eacc59bde10a57";
      expect(blockExplorerTransactionURL(txid, Network.MAINNET)).toEqual(
        "https://mempool.space/tx/00000000000000000011341d69792271766e4683e29b3ea169eacc59bde10a57"
      );
    });

    it("should properly return the testnet block explorer transaction url", () => {
      const txid = "00000000000000000011341d69792271766e4683e29b3ea169eacc59bde10a57";
      expect(blockExplorerTransactionURL(txid, Network.TESTNET)).toEqual(
        "https://mempool.space/testnet/tx/00000000000000000011341d69792271766e4683e29b3ea169eacc59bde10a57"
      );
    });
  });

  describe("blockExplorerAddressURL", () => {
    it("should properly return the mainnet block explorer address url", () => {
      const address = "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh";
      expect(blockExplorerAddressURL(address, Network.MAINNET)).toEqual(
        "https://mempool.space/address/bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh"
      );
    });

    it("should properly return the testnet block explorer address url", () => {
      const address = "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh";
      expect(blockExplorerAddressURL(address, Network.TESTNET)).toEqual(
        "https://mempool.space/testnet/address/bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh"
      );
    });
  });
});
