import { useQueries, useQuery } from "@tanstack/react-query";
import { useSelector } from "react-redux";
import { useMemo } from "react";
import { BlockchainClient, TransactionDetails } from "@caravan/clients";
import {
  getPendingTransactionIds,
  getWalletAddresses,
  Slice,
  selectProcessedTransactions,
} from "selectors/wallet";
import { useGetClient } from "hooks/client";
import { bitcoinsToSatoshis } from "@caravan/bitcoin";

// Centralized query key factory for all transaction-related queries
export const transactionKeys = {
  all: ["transactions"] as const,
  tx: (txid: string) => [...transactionKeys.all, txid] as const,
  pending: () => [...transactionKeys.all, "pending"] as const,
  txWithHex: (txid: string) =>
    [...transactionKeys.all, txid, "withHex"] as const,
  coins: (txid: string) => [...transactionKeys.all, txid, "coins"] as const,
  walletHistory: (count: number, skip: number) =>
    [...transactionKeys.all, "walletHistory", count, skip] as const,
  addressHistory: (addresses: string[], count: number, skip: number) =>
    [
      ...transactionKeys.all,
      "addressHistory",
      addresses.sort().join(","),
      count,
      skip,
    ] as const,
  completed: (count: number, skip: number) =>
    [...transactionKeys.all, "completed", count, skip] as const,
};

// Service function for fetching transaction details
const fetchTransactionDetails = async (
  txid: string,
  client: BlockchainClient,
): Promise<TransactionDetails> => {
  if (!client) {
    throw new Error("No blockchain client available");
  }
  return await client.getTransaction(txid);
};

// Basic hook for fetching single transaction details
export const useFetchTransactionDetails = (txid: string) => {
  const blockchainClient = useGetClient();
  return useQuery({
    queryKey: transactionKeys.tx(txid),
    queryFn: () => fetchTransactionDetails(txid, blockchainClient),
    enabled: !!blockchainClient && !!txid,
  });
};

// Hook for fetching pending transaction IDs and their details
const useFetchPendingTransactions = () => {
  const pendingTransactionIds = useSelector(getPendingTransactionIds);
  const blockchainClient = useGetClient();

  return useQueries({
    queries: pendingTransactionIds.map((txid) => ({
      queryKey: transactionKeys.tx(txid),
      queryFn: () => fetchTransactionDetails(txid, blockchainClient),
      enabled: !!blockchainClient && !!txid,
    })),
  });
};

// Hook for fetching transactions with their hex data
export const useTransactionsWithHex = (txids: string[]) => {
  const blockchainClient = useGetClient();
  return useQueries({
    queries: txids.map((txid) => ({
      queryKey: transactionKeys.txWithHex(txid),
      queryFn: async () => {
        const [transaction, transactionHex] = await Promise.all([
          blockchainClient.getTransaction(txid),
          blockchainClient.getTransactionHex(txid),
        ]);

        return { txid, transaction, transactionHex };
      },
      enabled: !!txid,
    })),
  });
};

// Basic hook for raw pending transactions (no processing)
export const useRawPendingTransactions = () => {
  const transactionQueries = useFetchPendingTransactions();

  const isLoading = transactionQueries.some((query) => query.isLoading);
  const error = transactionQueries.find((query) => query.error)?.error;

  const transactions = transactionQueries
    .filter((query) => query.data)
    .map((query) => query.data!);

  return {
    transactions,
    isLoading,
    error,
    refetch: () => {
      transactionQueries.forEach((query) => query.refetch());
    },
  };
};

// Hook for processed pending transactions - uses selector
export const usePendingTransactions = () => {
  const walletAddresses = useSelector(getWalletAddresses);
  const rawPendingQuery = useRawPendingTransactions();

  const transactions = useMemo(() => {
    if (!rawPendingQuery.transactions) return [];
    return selectProcessedTransactions(
      rawPendingQuery.transactions,
      walletAddresses,
      "unconfirmed",
    );
  }, [rawPendingQuery.transactions, walletAddresses]);

  return {
    transactions,
    isLoading: rawPendingQuery.isLoading,
    error: rawPendingQuery.error,
    refetch: rawPendingQuery.refetch,
  };
};

export interface Coin {
  prevTxId: string;
  vout: number;
  address: string;
  value: string;
  prevTxHex: string;
  slice?: Slice;
}

// Service function for fetching transaction coins (spendable outputs from prev txs)
export const fetchTransactionCoins = async (
  txid: string,
  client: BlockchainClient,
): Promise<Map<string, Coin>> => {
  const transaction = await client.getTransaction(txid);
  const coins = new Map<string, Coin>();

  for (const input of transaction.vin) {
    const { txid, vout } = input;

    // Skip if we don't have valid identifiers
    if (!txid || vout === undefined) continue;
    const coinId = `${txid}:${vout}`;

    const [prevTxHex, prevTx] = await Promise.all([
      client.getTransactionHex(txid),
      client.getTransaction(txid),
    ]);

    if (!prevTx || !prevTxHex) {
      throw new Error(
        `Failed to fetch prev tx info for input ${coinId}. Are you sure the transaction was sent from this wallet?`,
      );
    }

    const coinAddress = prevTx.vout[vout].scriptPubkeyAddress;
    const coinValue = bitcoinsToSatoshis(prevTx.vout[vout].value.toString());

    if (!coinAddress) {
      throw new Error(`Failed to fetch coin address for input ${coinId}.`);
    }

    coins.set(coinAddress, {
      prevTxId: txid,
      vout,
      address: coinAddress,
      value: coinValue,
      prevTxHex,
    });
  }
  return coins;
};

// Basic hook for fetching transaction coins
export const useTransactionCoins = (txid: string) => {
  const blockchainClient = useGetClient();

  return useQuery({
    queryKey: transactionKeys.coins(txid),
    queryFn: () => fetchTransactionCoins(txid, blockchainClient),
    enabled: !!blockchainClient && !!txid,
  });
};
