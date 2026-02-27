import { networks } from "bitcoinjs-lib-v5";

import {
  Network,
  networkLabel,
  networkData,
  getNetworkFromPrefix,
} from "./networks";


describe("networks", () => {
  describe("networkLabel", () => {
    it("returns a human-readable network name", () => {
      expect(networkLabel(Network.MAINNET)).toBe("Mainnet");
      expect(networkLabel(Network.TESTNET)).toBe("Testnet3");
      expect(networkLabel(Network.TESTNET4)).toBe("Testnet4");
      expect(networkLabel(Network.REGTEST)).toBe("Regtest");
      expect(networkLabel(Network.SIGNET)).toBe("Signet");
      expect(networkLabel("foobar")).toBe("Testnet");
    });
  });

  describe("networkData", () => {
    it("returns the correct network data object", () => {
      expect(networkData(Network.MAINNET)).toBe(networks.bitcoin);
      expect(networkData(Network.TESTNET)).toBe(networks.testnet);
      expect(networkData(Network.REGTEST)).toBe(networks.regtest);
      // Testnet4 and Signet return custom network objects
      expect(networkData(Network.TESTNET4)).toHaveProperty("bech32", "tb");
      expect(networkData(Network.SIGNET)).toHaveProperty("bech32", "tb");
      expect(networkData("foobar")).toBe(networks.testnet);
    });
  });

  describe("getNetworkFromPrefix", () => {
    it("throws error on unknown prefix", () => {
      expect(() => getNetworkFromPrefix("foo")).toThrow(
        /Unrecognized extended public key prefix/i
      );
      expect(() => getNetworkFromPrefix("kpub")).toThrow(
        /Unrecognized extended public key prefix/i
      );
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
