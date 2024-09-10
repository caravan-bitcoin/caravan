import {
  callBitcoindWallet,
  bitcoindWalletInfo,
  bitcoindImportDescriptors,
  bitcoindGetAddressStatus,
  bitcoindListUnspent,
} from "../wallet";

import { beforeEach, afterEach, vi, describe, it, expect } from "vitest";

import * as bitcoind from "../bitcoind";
import BigNumber from "bignumber.js";

describe("Wallet Functions", () => {
  const baseUrl = "http://localhost:8332";
  const auth = {
    username: "username",
    password: "password",
  };
  const walletName = "myWallet";
  let mockCallBitcoind;
  const expectedWalletPath = `${baseUrl}/wallet/${walletName}`;

  beforeEach(() => {
    mockCallBitcoind = vi.fn();
    vi.spyOn(bitcoind, "callBitcoind").mockImplementation(mockCallBitcoind);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("callBitcoindWallet", () => {
    it("should add wallet path to url", () => {
      callBitcoindWallet({
        baseUrl,
        walletName,
        auth,
        method: "getwalletinfo",
      });
      expect(mockCallBitcoind).toHaveBeenCalledWith(
        expectedWalletPath,
        auth,
        "getwalletinfo",
        undefined,
      );
    });

    it("should call bitcoind normally if no wallet name", () => {
      callBitcoindWallet({
        baseUrl,
        auth,
        method: "getblockchaininfo",
      });
      expect(mockCallBitcoind).toHaveBeenCalledWith(
        `${baseUrl}/`,
        auth,
        "getblockchaininfo",
        undefined,
      );
    });
  });

  describe("bitcoindWalletInfo", () => {
    it("should call callBitcoindWallet with getwalletinfo", () => {
      bitcoindWalletInfo({ url: baseUrl, auth, walletName });
      expect(mockCallBitcoind).toHaveBeenCalledWith(
        expectedWalletPath,
        auth,
        "getwalletinfo",
        undefined,
      );
    });
  });

  describe("bitcoindImportDescriptors", () => {
    it("should call callBitcoindWallet with importdescriptors", () => {
      const receive = "receive";
      const change = "change";
      const descriptorParams = [
        { desc: receive, internal: false },
        { desc: change, internal: true },
      ].map((d) => ({
        ...d,
        range: [0, 1005],
        timestamp: "now",
        watchonly: true,
        active: true,
      }));
      bitcoindImportDescriptors({
        url: baseUrl,
        auth,
        walletName,
        receive,
        change,
        rescan: false,
      });
      expect(mockCallBitcoind).toHaveBeenCalledWith(
        expectedWalletPath,
        auth,
        "importdescriptors",
        [descriptorParams],
      );
    });

    it("should call callBitcoindWallet with importdescriptors to rescan entire blockhain", () => {
      const receive = "receive";
      const change = "change";
      const descriptorParams = [
        { desc: receive, internal: false },
        { desc: change, internal: true },
      ].map((d) => ({
        ...d,
        range: [0, 1005],
        timestamp: 0,
        watchonly: true,
        active: true,
      }));
      bitcoindImportDescriptors({
        url: baseUrl,
        auth,
        walletName,
        receive,
        change,
        rescan: true,
      });
      expect(mockCallBitcoind).toHaveBeenCalledWith(
        expectedWalletPath,
        auth,
        "importdescriptors",
        [descriptorParams],
      );
    });
  });

  describe("bitcoindGetAddressStatus", () => {
    it("should call callBitcoindWallet with getaddressinfo", async () => {
      mockCallBitcoind.mockResolvedValue({ result: 1 });
      const address = "address";
      const result = await bitcoindGetAddressStatus({
        url: baseUrl,
        auth,
        walletName,
        address,
      });
      expect(mockCallBitcoind).toHaveBeenCalledWith(
        expectedWalletPath,
        auth,
        "getreceivedbyaddress",
        [address],
      );
      expect(result).toEqual({ used: true });
    });

    it("should throw an error if no result", async () => {
      const consoleErrorMock = vi.spyOn(console, "error");
      consoleErrorMock.mockImplementation(() => {});
      mockCallBitcoind.mockResolvedValue({ result: undefined });
      const address = "address";

      const resp: any = await bitcoindGetAddressStatus({
        url: baseUrl,
        auth,
        walletName,
        address,
      });
      expect(resp.message).toMatch(`Error: invalid response from ${baseUrl}`);
      expect(consoleErrorMock).toHaveBeenCalled();
    });
  });

  describe("bitcoindListUnspent", () => {
    it("should return unspent utxos", async () => {
      const address = "address";
      const utxos = [
        {
          txid: "txid1",
          vout: 0,
          address,
          amount: 0.1,
          confirmations: 1,
          spendable: true,
        },
        {
          txid: "txid2",
          vout: 0,
          address,
          amount: 0.1,
          confirmations: 1,
          spendable: true,
        },
      ];

      // mock the first call to 'listunspent'
      mockCallBitcoind.mockResolvedValueOnce({
        result: utxos,
      });

      const getTransactionResponse = {
        txid: "txid",
        vout: 1,
        amount: 0.1,
        hex: "txhex",
        blocktime: 123456789,
      };
      // mock the second call to 'gettransaction'
      mockCallBitcoind.mockResolvedValueOnce({
        result: getTransactionResponse,
      });

      mockCallBitcoind.mockResolvedValueOnce({
        result: getTransactionResponse,
      });

      const response = await bitcoindListUnspent({
        url: baseUrl,
        auth,
        walletName,
        address,
      });
      expect(mockCallBitcoind).toHaveBeenNthCalledWith(
        1,
        expectedWalletPath,
        auth,
        "listunspent",
        { minconf: 0, maxconf: 9999999, addresses: [address] },
      );

      expect(mockCallBitcoind).toHaveBeenNthCalledWith(
        2,
        expectedWalletPath,
        auth,
        "gettransaction",
        { txid: utxos[0].txid },
      );

      expect(mockCallBitcoind).toHaveBeenNthCalledWith(
        3,
        expectedWalletPath,
        auth,
        "gettransaction",
        { txid: utxos[1].txid },
      );

      expect(response).toEqual([
        {
          txid: utxos[0].txid,
          index: utxos[0].vout,
          amount: BigNumber("0.1").toFixed(8),
          amountSats: "10000000",
          confirmed: true,
          transactionHex: getTransactionResponse.hex,
          time: getTransactionResponse.blocktime,
        },
        {
          txid: utxos[1].txid,
          index: utxos[1].vout,
          amount: BigNumber("0.1").toFixed(8),
          amountSats: "10000000",
          confirmed: true,
          transactionHex: getTransactionResponse.hex,
          time: getTransactionResponse.blocktime,
        },
      ]);
    });
  });
});
