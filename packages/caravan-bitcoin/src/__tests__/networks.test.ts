import { describe, it, expect } from "vitest";
import {
  Network,
  networkLabel,
  networkData,
  getNetworkFromPrefix,
} from "../networks";
import { networks } from "bitcoinjs-lib-v5";

describe("networks", () => {
  describe("networkLabel", () => {
    it("returns a human-readable network name", () => {
      expect(networkLabel(Network.MAINNET)).toEqual("Mainnet");
      expect(networkLabel(Network.TESTNET)).toEqual("Testnet");
      expect(networkLabel(Network.REGTEST)).toEqual("Testnet");
    });
  });

  describe("networkData", () => {
    it("returns correct network data", () => {
      expect(networkData(Network.MAINNET)).toMatchObject(networks.bitcoin);
      expect(networkData(Network.TESTNET)).toMatchObject(networks.testnet);
      expect(networkData(Network.REGTEST)).toMatchObject(networks.regtest);
    });
  });

  describe("getNetworkFromPrefix", () => {
    it("throws error on unknown prefix", () => {
      expect(() => getNetworkFromPrefix("foo")).toThrowError(/Unrecognized extended public key prefix/i);
    });
    it("returns testnet for testnet prefixes, case insensitive", () => {
      expect(getNetworkFromPrefix("tpub")).toBe(Network.TESTNET);
      expect(getNetworkFromPrefix("upub")).toBe(Network.TESTNET);
      expect(getNetworkFromPrefix("vpub")).toBe(Network.TESTNET);
      expect(getNetworkFromPrefix("Tpub")).toBe(Network.TESTNET);
      expect(getNetworkFromPrefix("UPub")).toBe(Network.TESTNET);
      expect(getNetworkFromPrefix("VPUB")).toBe(Network.TESTNET);
    });
    it("returns mainnet for mainnet prefixes, case insensitive", () => {
      expect(getNetworkFromPrefix("xpub")).toBe(Network.MAINNET);
      expect(getNetworkFromPrefix("ypub")).toBe(Network.MAINNET);
      expect(getNetworkFromPrefix("zpub")).toBe(Network.MAINNET);
      expect(getNetworkFromPrefix("Xpub")).toBe(Network.MAINNET);
      expect(getNetworkFromPrefix("YPub")).toBe(Network.MAINNET);
      expect(getNetworkFromPrefix("ZPUB")).toBe(Network.MAINNET);
    });
  });
});
