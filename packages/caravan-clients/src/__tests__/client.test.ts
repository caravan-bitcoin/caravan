import { Network, satoshisToBitcoins } from "@caravan/bitcoin";
import {
  BlockchainClient,
  ClientType,
  ClientBase,
  UTXO,
  BlockchainClientError,
} from "../client";
import * as bitcoind from "../bitcoind";
import * as wallet from "../wallet";
import BigNumber from "bignumber.js";

import {
  vi,
  beforeEach,
  afterEach,
  Mocked,
  MockInstance,
  describe,
  it,
  expect,
} from "vitest";

import axios from "axios";
vi.mock("axios");

describe("ClientBase", () => {
  const mockHost = "https://example.com";
  const mockData = { foo: "bar" };
  let mockedAxios: Mocked<typeof axios>;
  beforeEach(() => {
    vi.resetAllMocks();
    mockedAxios = axios as Mocked<typeof axios>;
  });

  it("should make a GET request", async () => {
    const mockResponse = { success: true };
    mockedAxios.request.mockResolvedValueOnce({ data: mockResponse });

    const client = new ClientBase(false, mockHost);
    const result = await client.Get("/path");

    expect(axios.request).toHaveBeenCalledWith({
      method: "GET",
      url: mockHost + "/path",
      withCredentials: false,
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    });
    expect(result).toEqual(mockResponse);
  });

  it("should make a POST request", async () => {
    const mockResponse = { success: true };
    mockedAxios.request.mockResolvedValueOnce({ data: mockResponse });

    const client = new ClientBase(false, mockHost);
    const result = await client.Post("/path", mockData);

    expect(axios.request).toHaveBeenCalledWith({
      method: "POST",
      url: mockHost + "/path",
      data: mockData,
      withCredentials: false,
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    });
    expect(result).toEqual(mockResponse);
  });

  it("should throw an error when the request fails", async () => {
    const mockError = new Error("Request failed");
    mockedAxios.request.mockRejectedValueOnce(mockError);

    const client = new ClientBase(false, mockHost);

    await expect(client.Get("/path")).rejects.toThrow(mockError);
  });

  it("should throttle the requests when throttled is true", async () => {
    const mockResponse = { success: true };
    mockedAxios.request.mockResolvedValueOnce({ data: mockResponse });

    const client = new ClientBase(true, mockHost);

    const startTime = Date.now();
    await client.Get("/path");
    const endTime = Date.now();

    const elapsedTime = endTime - startTime;
    expect(elapsedTime).toBeGreaterThan(499); // Assuming delay() is 500
  });
});

// TODO: Should have some e2e tests to protect against API changes

describe("BlockchainClient", () => {
  it("should throw an error if the network is invalid", () => {
    expect(() => {
      new BlockchainClient({
        type: ClientType.BLOCKSTREAM,
        network: Network.REGTEST,
      });
    }).toThrow("Invalid network");
    expect(() => {
      new BlockchainClient({
        type: ClientType.MEMPOOL,
        network: Network.REGTEST,
      });
    }).toThrow("Invalid network");
    expect(() => {
      new BlockchainClient({
        type: ClientType.BLOCKSTREAM,
        network: Network.SIGNET,
      });
    }).toThrow("Invalid network");
  });

  it("should set the mainnet host for a public client", () => {
    const blockstream = new BlockchainClient({
      type: ClientType.BLOCKSTREAM,
      network: Network.MAINNET,
    });
    expect(blockstream.host).toEqual("https://blockstream.info/api");
    const mempool = new BlockchainClient({
      type: ClientType.MEMPOOL,
      network: Network.MAINNET,
    });
    expect(mempool.host).toEqual("https://unchained.mempool.space/api");
  });

  it("should set the testnet host for a public client", () => {
    const blockstream = new BlockchainClient({
      type: ClientType.BLOCKSTREAM,
      network: Network.TESTNET,
    });
    expect(blockstream.host).toEqual("https://blockstream.info/testnet/api");
    const mempool = new BlockchainClient({
      type: ClientType.MEMPOOL,
      network: Network.TESTNET,
    });
    expect(mempool.host).toEqual("https://unchained.mempool.space/testnet/api");
  });

  it("should set the signet host for a public client", () => {
    const mempool = new BlockchainClient({
      type: ClientType.MEMPOOL,
      network: Network.SIGNET,
    });
    expect(mempool.host).toEqual("https://unchained.mempool.space/signet/api");
    expect(() => {
      new BlockchainClient({
        type: ClientType.BLOCKSTREAM,
        network: Network.SIGNET,
      });
    }).toThrow("Invalid network");
  });

  describe("broadcastTransaction", () => {
    it("should broadcast a transaction (PRIVATE client)", async () => {
      // Mock the response from the API
      const mockResponse = { success: true };
      const mockBitcoindSendRawTransaction = vi.spyOn(
        bitcoind,
        "bitcoindSendRawTransaction",
      );
      mockBitcoindSendRawTransaction.mockResolvedValue(mockResponse);
      // Create a new instance of BlockchainClient with a mock axios instance
      const blockchainClient = new BlockchainClient({
        type: ClientType.PRIVATE,
        network: Network.MAINNET,
      });

      // Call the broadcastTransaction method
      const rawTx = "rawTransaction";
      const result = await blockchainClient.broadcastTransaction(rawTx);

      // Verify the mock bitcoindSendRawTransaction was called with the correct parameters
      expect(mockBitcoindSendRawTransaction).toHaveBeenCalledWith({
        hex: rawTx,
        ...blockchainClient.bitcoindParams,
      });

      // Verify the returned result
      expect(result).toEqual(mockResponse);
    });

    it("should broadcast a transaction (MEMPOOL client)", async () => {
      // Mock the response from the API
      const mockResponse = "txid";
      const mockPost = vi.fn().mockResolvedValue(mockResponse);
      // Create a new instance of BlockchainClient with a mock axios instance
      const blockchainClient = new BlockchainClient({
        type: ClientType.MEMPOOL,
        network: Network.MAINNET,
      });
      blockchainClient.Post = mockPost;

      // Call the broadcastTransaction method
      const rawTx = "rawTransaction";
      const result = await blockchainClient.broadcastTransaction(rawTx);

      // Verify the mock axios instance was called with the correct URL and data
      expect(mockPost).toHaveBeenCalledWith(`/tx`, rawTx);

      // Verify the returned result
      expect(result).toEqual(mockResponse);
    });
    it("should broadcast a transaction (BLOCKSTREAM client)", async () => {
      // Mock the response from the API
      const mockResponse = "txid";
      const mockPost = vi.fn().mockResolvedValue(mockResponse);
      // Create a new instance of BlockchainClient with a mock axios instance
      const blockchainClient = new BlockchainClient({
        type: ClientType.BLOCKSTREAM,
        network: Network.MAINNET,
      });
      blockchainClient.Post = mockPost;

      // Call the broadcastTransaction method
      const rawTx = "rawTransaction";
      const result = await blockchainClient.broadcastTransaction(rawTx);

      // Verify the mock axios instance was called with the correct URL and data
      expect(mockPost).toHaveBeenCalledWith(`/tx`, rawTx);

      // Verify the returned result
      expect(result).toEqual(mockResponse);
    });
  });

  describe("getTransactionHex", () => {
    let mockCallBitcoind: MockInstance;

    beforeEach(() => {
      mockCallBitcoind = vi.spyOn(bitcoind, "callBitcoind");
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it("should get the transaction hex for a given txid (PRIVATE client)", async () => {
      // Mock the response from the API
      const mockResponse = "transactionHex";
      mockCallBitcoind.mockResolvedValue(mockResponse);
      // Create a new instance of BlockchainClient with a mock axios instance
      const blockchainClient = new BlockchainClient({
        type: ClientType.PRIVATE,
        network: Network.MAINNET,
      });

      // Call the getTransactionHex method
      const txid = "txid123";
      const transactionHex = await blockchainClient.getTransactionHex(txid);

      // Verify the mock axios instance was called with the correct URL
      expect(mockCallBitcoind).toHaveBeenCalledWith(
        blockchainClient.bitcoindParams.url,
        blockchainClient.bitcoindParams.auth,
        "gettransaction",
        [txid],
      );

      // Verify the returned transaction hex
      expect(transactionHex).toEqual(mockResponse);
    });

    it("should throw an error when failing to get the transaction hex (PRIVATE client)", async () => {
      // Mock the error from the API
      const mockError = new Error("Failed to fetch transaction hex");
      mockCallBitcoind.mockRejectedValue(mockError);
      // Create a new instance of BlockchainClient with a mock axios instance
      const blockchainClient = new BlockchainClient({
        type: ClientType.PRIVATE,
        network: Network.MAINNET,
      });

      // Call the getTransactionHex method
      const txid = "txid123";
      let error;
      try {
        await blockchainClient.getTransactionHex(txid);
      } catch (err) {
        error = err;
      }

      // Verify the mock axios instance was called with the correct URL
      expect(mockCallBitcoind).toHaveBeenCalled();

      // Verify the error message
      expect(error).toEqual(
        new Error(`Failed to get transaction: ${mockError.message}`),
      );
    });

    it("should get the transaction hex for a given txid (MEMPOOL client)", async () => {
      // Mock the response from the API
      const mockResponse = "transactionHex";
      const mockGet = vi.fn().mockResolvedValue(mockResponse);
      // Create a new instance of BlockchainClient with a mock axios instance
      const blockchainClient = new BlockchainClient({
        type: ClientType.MEMPOOL,
        network: Network.MAINNET,
      });
      blockchainClient.Get = mockGet;

      // Call the getTransactionHex method
      const txid = "txid123";
      const transactionHex = await blockchainClient.getTransactionHex(txid);

      // Verify the mock axios instance was called with the correct URL
      expect(mockGet).toHaveBeenCalledWith(`/tx/${txid}/hex`);

      // Verify the returned transaction hex
      expect(transactionHex).toEqual(mockResponse);
    });

    it("should throw an error when failing to get the transaction hex (MEMPOOL client)", async () => {
      // Mock the error from the API
      const mockError = new Error("Failed to fetch transaction hex");
      const mockGet = vi.fn().mockRejectedValue(mockError);
      // Create a new instance of BlockchainClient with a mock axios instance
      const blockchainClient = new BlockchainClient({
        type: ClientType.MEMPOOL,
        network: Network.MAINNET,
      });
      blockchainClient.Get = mockGet;

      // Call the getTransactionHex method
      const txid = "txid123";
      let error;
      try {
        await blockchainClient.getTransactionHex(txid);
      } catch (err) {
        error = err;
      }

      // Verify the mock axios instance was called with the correct URL
      expect(mockGet).toHaveBeenCalledWith(`/tx/${txid}/hex`);

      // Verify the error message
      expect(error).toEqual(
        new Error(`Failed to get transaction: ${mockError.message}`),
      );
    });
  });

  describe("formatUtxo", () => {
    it("should get UTXO details for a given UTXO (MEMPOOL client)", async () => {
      // Mock the response from the API
      const mockTransactionResult = "transactionHex";
      const mockGetTransactionHex = vi
        .fn()
        .mockResolvedValue(mockTransactionResult);

      // Create a new instance of BlockchainClient with mock methods
      const blockchainClient = new BlockchainClient({
        type: ClientType.MEMPOOL,
        network: Network.MAINNET,
      });
      blockchainClient.getTransactionHex = mockGetTransactionHex;

      // Call the getUtxo method
      const utxo = {
        txid: "txid123",
        vout: 0,
        value: 100,
        status: {
          confirmed: true,
          block_time: 1634567890,
        },
      };
      const result = await blockchainClient.formatUtxo(utxo);

      // Verify the mock methods were called with the correct parameters
      expect(mockGetTransactionHex).toHaveBeenCalledWith(utxo.txid);

      // Verify the returned result
      expect(result).toEqual({
        confirmed: utxo.status.confirmed,
        txid: utxo.txid,
        index: utxo.vout,
        amount: satoshisToBitcoins(utxo.value),
        amountSats: new BigNumber(utxo.value),
        transactionHex: mockTransactionResult,
        time: utxo.status.block_time,
      });
    });
  });

  describe("fetchAddressUtxos", () => {
    it("should fetch UTXOs using bitcoindListUnspent (PRIVATE client)", async () => {
      // Mock the response from bitcoindListUnspent
      const mockUnspent = [
        {
          txid: "txid1",
          amount: ".0001",
          amountSats: "1000",
          index: 1,
          confirmed: true,
          transactionHex: "hex",
          time: "string",
        },
        {
          txid: "txid1",
          amount: ".0001",
          amountSats: "1000",
          index: 1,
          confirmed: true,
          transactionHex: "hex",
          time: "string",
        },
      ];
      const mockBitcoindListUnspent = vi
        .spyOn(wallet, "bitcoindListUnspent")
        .mockResolvedValue(mockUnspent);

      // Create a new instance of BlockchainClient with ClientType.PRIVATE
      const blockchainClient = new BlockchainClient({
        type: ClientType.PRIVATE,
        network: Network.MAINNET,
      });

      // Call the fetchAddressUtxos method
      const address = "1ABCxyz";
      const result = await blockchainClient.fetchAddressUtxos(address);

      // Verify that bitcoindListUnspent was called with the correct parameters
      expect(mockBitcoindListUnspent).toHaveBeenCalledWith({
        ...blockchainClient.bitcoindParams,
        address,
      });

      // Verify the returned result
      expect(result.utxos).toEqual(mockUnspent);
      expect(result.balanceSats).toEqual(new BigNumber(2000));
      expect(result.addressKnown).toBe(true);
      expect(result.fetchedUTXOs).toBe(true);
      expect(result.fetchUTXOsError).toBe("");
    });

    it("should handle the case when the address is not found (PRIVATE client)", async () => {
      // Mock the error from bitcoindListUnspent
      const mockError = new Error("Address not found");
      const mockBitcoindListUnspent = vi
        .spyOn(wallet, "bitcoindListUnspent")
        .mockRejectedValue(mockError);

      const mockIsWalletAddressNotFoundError = vi
        .spyOn(bitcoind, "isWalletAddressNotFoundError")
        .mockReturnValue(true);

      // Create a new instance of BlockchainClient with ClientType.PRIVATE
      const blockchainClient = new BlockchainClient({
        type: ClientType.PRIVATE,
        network: Network.MAINNET,
      });

      // Call the fetchAddressUtxos method
      const address = "1ABCxyz";
      const result = await blockchainClient.fetchAddressUtxos(address);

      // Verify that bitcoindListUnspent was called with the correct parameters
      expect(mockBitcoindListUnspent).toHaveBeenCalledWith({
        ...blockchainClient.bitcoindParams,
        address,
      });
      expect(mockIsWalletAddressNotFoundError).toHaveBeenCalledWith(mockError);
      // Verify the returned result
      expect(result.utxos).toEqual([]);
      expect(result.balanceSats).toEqual(new BigNumber(0));
      expect(result.addressKnown).toBe(false);
      expect(result.fetchedUTXOs).toBe(true);
      expect(result.fetchUTXOsError).toBe("");
    });

    it("should handle other errors when fetching UTXOs (PRIVATE client)", async () => {
      // Mock the error from bitcoindListUnspent
      const mockError = new Error("Failed to fetch UTXOs");
      const mockIsWalletAddressNotFoundError = vi
        .spyOn(bitcoind, "isWalletAddressNotFoundError")
        .mockReturnValue(false);
      const mockBitcoindListUnspent = vi
        .spyOn(wallet, "bitcoindListUnspent")
        .mockRejectedValue(mockError);

      // Create a new instance of BlockchainClient with ClientType.PRIVATE
      const blockchainClient = new BlockchainClient({
        type: ClientType.PRIVATE,
        network: Network.MAINNET,
      });

      // Call the fetchAddressUtxos method
      const address = "1ABCxyz";
      const result = await blockchainClient.fetchAddressUtxos(address);

      // Verify that bitcoindListUnspent was called with the correct parameters
      expect(mockBitcoindListUnspent).toHaveBeenCalledWith({
        ...blockchainClient.bitcoindParams,
        address,
      });
      expect(mockIsWalletAddressNotFoundError).toHaveBeenCalledWith(mockError);

      // Verify the returned result
      expect(result.utxos).toEqual([]);
      expect(result.balanceSats).toEqual(new BigNumber(0));
      expect(result.addressKnown).toBe(true);
      expect(result.fetchedUTXOs).toBe(false);
      expect(result.fetchUTXOsError).toBe(mockError.toString());
    });

    it("should fetch UTXOs using the Get method (MEMPOOL client)", async () => {
      const mockTransactionResult = "transactionHex";
      const mockGetTransactionHex = vi
        .fn()
        .mockResolvedValue(mockTransactionResult);

      // Mock the response from the Get method
      const mockUtxos: UTXO[] = [
        {
          txid: "txid1",
          vout: 0,
          value: 100,
          status: { confirmed: true, block_time: 21 },
        },
        {
          txid: "txid2",
          vout: 1,
          value: 200,
          status: { confirmed: true, block_time: 42 },
        },
      ];
      const mockGet = vi.fn().mockResolvedValue(mockUtxos);

      // Create a new instance of BlockchainClient with ClientType.MEMPOOL
      const blockchainClient = new BlockchainClient({
        type: ClientType.MEMPOOL,
        network: Network.MAINNET,
      });
      blockchainClient.Get = mockGet;
      blockchainClient.getTransactionHex = mockGetTransactionHex;

      // Call the fetchAddressUtxos method
      const address = "1ABCxyz";
      const result = await blockchainClient.fetchAddressUtxos(address);

      // Verify that the Get method was called with the correct URL
      expect(mockGet).toHaveBeenCalledWith(`/address/${address}/utxo`);
      // Verify the returned result
      expect(result.utxos).toEqual(
        await Promise.all(
          mockUtxos.map((utxo: UTXO) => blockchainClient.formatUtxo(utxo)),
        ),
      );
      expect(result.balanceSats).toEqual(new BigNumber(300));
      expect(result.addressKnown).toBe(true);
      expect(result.fetchedUTXOs).toBe(true);
      expect(result.fetchUTXOsError).toBe("");
    });

    it("should handle errors when fetching UTXOs (MEMPOOL client)", async () => {
      // Mock the error from the Get method
      const mockError = new Error("Failed to fetch UTXOs");
      const mockGet = vi.fn().mockRejectedValue(mockError);

      // Create a new instance of BlockchainClient with ClientType.MEMPOOL
      const blockchainClient = new BlockchainClient({
        type: ClientType.MEMPOOL,
        network: Network.MAINNET,
      });
      blockchainClient.Get = mockGet;

      // Call the fetchAddressUtxos method
      const address = "1ABCxyz";
      const result = await blockchainClient.fetchAddressUtxos(address);

      // Verify that the Get method was called with the correct URL
      expect(mockGet).toHaveBeenCalledWith(`/address/${address}/utxo`);

      // Verify the returned result
      expect(result.utxos).toEqual([]);
      expect(result.balanceSats).toEqual(new BigNumber(0));
      expect(result.addressKnown).toBe(true);
      expect(result.fetchedUTXOs).toBe(false);
      expect(result.fetchUTXOsError).toBe(mockError.toString());
    });
  });

  describe("getAddressStatus", () => {
    it("should get the status for a given address (PRIVATE client)", async () => {
      // Mock the response from the API
      const mockResponse = {
        confirmed: true,
        balance: 500,
      };
      const mockBitcoindGetAddressStatus = vi.spyOn(
        wallet,
        "bitcoindGetAddressStatus",
      );
      mockBitcoindGetAddressStatus.mockResolvedValue(mockResponse);
      // Create a new instance of BlockchainClient with a mock axios instance
      const blockchainClient = new BlockchainClient({
        type: ClientType.PRIVATE,
        network: Network.MAINNET,
      });

      // Call the getAddressStatus method
      const address = "1ABCxyz";
      const status = await blockchainClient.getAddressStatus(address);

      // Verify the mock bitcoindGetAddressStatus was called with the correct parameters
      expect(mockBitcoindGetAddressStatus).toHaveBeenCalledWith({
        address,
        ...blockchainClient.bitcoindParams,
      });

      // Verify the returned status
      expect(status).toEqual(mockResponse);
    });

    it("should throw an error when failing to get the status for a given address (PRIVATE CLIENT)", async () => {
      // Mock the error from the API
      const mockError = new Error("Failed to fetch address status");
      const mockBitcoindGetAddressStatus = vi.spyOn(
        wallet,
        "bitcoindGetAddressStatus",
      );
      mockBitcoindGetAddressStatus.mockRejectedValue(mockError);
      // Create a new instance of BlockchainClient with a mock axios instance
      const blockchainClient = new BlockchainClient({
        type: ClientType.PRIVATE,
        network: Network.MAINNET,
      });

      // Call the getAddressStatus method
      const address = "1ABCxyz";
      let error;
      try {
        await blockchainClient.getAddressStatus(address);
      } catch (err) {
        error = err;
      }
      // Verify the mock bitcoindGetAddressStatus was called with the correct parameters
      expect(mockBitcoindGetAddressStatus).toHaveBeenCalledWith({
        address,
        ...blockchainClient.bitcoindParams,
      });

      // Verify the error message
      expect(error).toEqual(
        new Error(
          `Failed to get status for address ${address}: ${mockError.message}`,
        ),
      );
    });

    it("should get the status for a given address (MEMPOOL client)", async () => {
      // Mock the response from the API
      const mockResponse = {
        chain_stats: {
          funded_txo_count: 1,
          funded_txo_sum: 1000000,
          spent_txo_count: 0,
          spent_txo_sum: 0,
          tx_count: 1,
        },
        mempool_stats: {
          funded_txo_count: 0,
          funded_txo_sum: 0,
          spent_txo_count: 0,
          spent_txo_sum: 0,
          tx_count: 0,
        },
      };
      const mockGet = vi.fn().mockResolvedValue(mockResponse);
      // Create a new instance of BlockchainClient with a mock axios instance
      const blockchainClient = new BlockchainClient({
        type: ClientType.MEMPOOL,
        network: Network.MAINNET,
      });
      blockchainClient.Get = mockGet;

      // Call the getAddressStatus method
      const address = "1ABCxyz";
      const status = await blockchainClient.getAddressStatus(address);

      // Verify the mock axios instance was called with the correct URL
      expect(mockGet).toHaveBeenCalledWith(`/address/${address}`);

      // Verify the returned status
      expect(status).toEqual({ used: true });

      mockResponse.chain_stats.funded_txo_count = 0;
      expect(await blockchainClient.getAddressStatus(address)).toEqual({
        used: false,
      });
      mockResponse.mempool_stats.funded_txo_count = 1;
      expect(await blockchainClient.getAddressStatus(address)).toEqual({
        used: true,
      });
    });

    it("should throw an error when failing to get the status for a given address (MEMPOOL client)", async () => {
      // Mock the error from the API
      const mockError = new Error("Failed to fetch address status");
      const mockGet = vi.fn().mockRejectedValue(mockError);
      // Create a new instance of BlockchainClient with a mock axios instance
      const blockchainClient = new BlockchainClient({
        type: ClientType.MEMPOOL,
        network: Network.MAINNET,
      });
      blockchainClient.Get = mockGet;

      // Call the getAddressStatus method
      const address = "1ABCxyz";
      let error;
      try {
        await blockchainClient.getAddressStatus(address);
      } catch (err: unknown) {
        if (err instanceof Error) {
          error = err?.message;
        } else {
          throw err;
        }
      }

      // Verify the mock axios instance was called with the correct URL
      expect(mockGet).toHaveBeenCalledWith(`/address/${address}`);

      // Verify the error message
      expect(error).toEqual(
        `Failed to get status for address ${address}: ${mockError.message}`,
      );
    });
  });

  describe("getFeeEstimate", () => {
    it("should get the fee estimate for a given number of blocks (PRIVATE client)", async () => {
      // Mock the response from the API
      const mockResponse = 10;
      const mockEstimateSmartFee = vi.spyOn(
        bitcoind,
        "bitcoindEstimateSmartFee",
      );
      mockEstimateSmartFee.mockResolvedValue(mockResponse);
      // Create a new instance of BlockchainClient with a mock axios instance
      const blockchainClient = new BlockchainClient({
        type: ClientType.PRIVATE,
        network: Network.MAINNET,
      });

      // Call the getFeeEstimate method
      const blocks = 2;
      const feeEstimate = await blockchainClient.getFeeEstimate(blocks);

      // Verify the mock bitcoindEstimateSmartFee was called with the correct parameters
      expect(mockEstimateSmartFee).toHaveBeenCalledWith({
        numBlocks: blocks,
        ...blockchainClient.bitcoindParams,
      });

      // Verify the returned fee estimate
      expect(feeEstimate).toEqual(mockResponse);
    });

    it("should get the fee estimate for a given number of blocks (BLOCKSTREAM client)", async () => {
      // Mock the response from the API
      const mockResponse = [5, 10, 15];
      const mockGet = vi.fn().mockResolvedValue(mockResponse);
      // Create a new instance of BlockchainClient with a mock axios instance
      const blockchainClient = new BlockchainClient({
        type: ClientType.BLOCKSTREAM,
        network: Network.MAINNET,
      });
      blockchainClient.Get = mockGet;

      // Call the getFeeEstimate method
      const blocks = 2;
      const feeEstimate = await blockchainClient.getFeeEstimate(blocks);

      // Verify the mock axios instance was called with the correct URL
      expect(mockGet).toHaveBeenCalledWith(`/fee-estimates`);

      // Verify the returned fee estimate
      expect(feeEstimate).toEqual(mockResponse[blocks]);
    });

    it("should get the fee estimate for a given number of blocks (MEMPOOL client)", async () => {
      // Mock the response from the API
      const mockResponse = {
        fastestFee: 20,
        halfHourFee: 10,
        hourFee: 5,
        economyFee: 2,
      } as Record<string, number>;
      const mockGet = vi.fn().mockResolvedValue(mockResponse);
      // Create a new instance of BlockchainClient with a mock axios instance
      const blockchainClient = new BlockchainClient({
        type: ClientType.MEMPOOL,
        network: Network.MAINNET,
      });
      blockchainClient.Get = mockGet;

      // Call the getFeeEstimate method
      const blocks = {
        fastestFee: 1,
        halfHourFee: 3,
        hourFee: 6,
        economyFee: 7,
      } as Record<string, number>;

      for (const block in blocks) {
        const feeEstimate = await blockchainClient.getFeeEstimate(
          blocks[block],
        );

        // Verify the mock axios instance was called with the correct URL
        expect(mockGet).toHaveBeenCalledWith("/v1/fees/recommended");
        // Verify the returned fee estimate
        expect(feeEstimate).toEqual(mockResponse[block]);
      }
    });
  });

  describe("importDescriptors", () => {
    it("should throw BlockchainClientError if not a private client", () => {
      const blockchainClient = new BlockchainClient({
        type: ClientType.BLOCKSTREAM,
        network: Network.MAINNET,
      });

      expect(() =>
        blockchainClient.importDescriptors({
          receive: "receive",
          change: "change",
          rescan: true,
        }),
      ).rejects.toThrow(BlockchainClientError);
    });

    it("calls bitcoindImportDescriptors with descriptors to import and rescan", async () => {
      const mockImportDescriptors = vi.spyOn(
        wallet,
        "bitcoindImportDescriptors",
      );
      mockImportDescriptors.mockResolvedValue({});
      const blockchainClient = new BlockchainClient({
        type: ClientType.PRIVATE,
        network: Network.MAINNET,
      });

      const receive = "receive";
      const change = "change";
      await blockchainClient.importDescriptors({
        receive,
        change,
        rescan: true,
      });
      expect(mockImportDescriptors).toHaveBeenCalledWith({
        receive,
        change,
        rescan: true,
        ...blockchainClient.bitcoindParams,
      });
    });

    it("calls bitcoindImportDescriptors with descriptors to import without rescan", async () => {
      const mockImportDescriptors = vi.spyOn(
        wallet,
        "bitcoindImportDescriptors",
      );
      mockImportDescriptors.mockResolvedValue({});
      const blockchainClient = new BlockchainClient({
        type: ClientType.PRIVATE,
        network: Network.MAINNET,
      });

      const receive = "receive";
      const change = "change";
      await blockchainClient.importDescriptors({
        receive,
        change,
        rescan: false,
      });
      expect(mockImportDescriptors).toHaveBeenCalledWith({
        receive,
        change,
        rescan: false,
        ...blockchainClient.bitcoindParams,
      });
    });
  });
  describe("getWalletInfo", () => {
    it("should throw BlockchainClientError if not a private client", () => {
      const blockchainClient = new BlockchainClient({
        type: ClientType.BLOCKSTREAM,
        network: Network.MAINNET,
      });

      expect(() => blockchainClient.getWalletInfo()).rejects.toThrow(
        BlockchainClientError,
      );
    });

    it("calls bitcoindImportDescriptors with descriptors to import", async () => {
      const mockImportDescriptors = vi.spyOn(wallet, "bitcoindWalletInfo");
      mockImportDescriptors.mockResolvedValue({});
      const blockchainClient = new BlockchainClient({
        type: ClientType.PRIVATE,
        network: Network.MAINNET,
      });

      await blockchainClient.getWalletInfo();
      expect(mockImportDescriptors).toHaveBeenCalledWith({
        ...blockchainClient.bitcoindParams,
      });
    });
  });
});
