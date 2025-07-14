import { useQueries, useQuery } from "@tanstack/react-query";
import { useSelector } from "react-redux";
import { BlockchainClient, TransactionDetails } from "@caravan/clients";
import {
  getPendingTransactionIds,
  getWalletAddresses,
  Slice,
} from "selectors/wallet";
import { calculateTransactionValue } from "utils/transactionCalculations";
import { useGetClient } from "hooks/client";
import { bitcoinsToSatoshis } from "@caravan/bitcoin";

// Query key factory for pending transactions
const transactionKeys = {
  all: ["transactions"] as const,
  tx: (txid: string) => [...transactionKeys.all, txid] as const,
  pending: () => [...transactionKeys.all, "pending"] as const,
  txWithHex: (txid: string) =>
    [...transactionKeys.all, txid, "withHex"] as const,
  // all the coins for a given transaction
  coins: (txid: string) => [...transactionKeys.all, txid, "coins"] as const,
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

export const useFetchTransactionDetails = (txid: string) => {
  const blockchainClient = useGetClient();
  return useQuery({
    queryKey: transactionKeys.tx(txid),
    queryFn: () => fetchTransactionDetails(txid, blockchainClient),
    enabled: !!blockchainClient && !!txid,
  });
};

// Hook for fetching all pending transactions
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

export const useTransactionWithHex = (txid: string) => {
  const blockchainClient = useGetClient();
  return useQuery({
    queryKey: transactionKeys.txWithHex(txid),
    queryFn: async () => {
      const [transaction, transactionHex] = await Promise.all([
        blockchainClient.getTransaction(txid),
        blockchainClient.getTransactionHex(txid),
      ]);
      return { txid, transaction, transactionHex };
    },
    enabled: !!blockchainClient && !!txid,
  });
};

// Hook for processed pending transactions with calculated values
export const usePendingTransactions = () => {
  const walletAddresses = useSelector(getWalletAddresses);
  const transactionQueries = useFetchPendingTransactions();

  // Calculate loading and error states
  const isLoading = transactionQueries.some((query) => query.isLoading);
  const error = transactionQueries.find((query) => query.error)?.error;

  // Process transactions with calculated values and filter out confirmed ones
  const transactions = transactionQueries
    .filter((query) => query.data && !query.data.status?.confirmed)
    .map((query) => {
      const tx = query.data!;
      return {
        ...tx,
        valueToWallet: calculateTransactionValue(tx, walletAddresses),
        isReceived:
          tx.isReceived !== undefined
            ? tx.isReceived
            : calculateTransactionValue(tx, walletAddresses) > 0,
      };
    });

  return {
    transactions,
    isLoading,
    error,
    refetch: () => {
      // Refetch all transaction queries
      transactionQueries.forEach((query) => query.refetch());
    },
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
) => {
  const coins = new Map<string, Coin>();
  const transaction = await client.getTransaction(txid);
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

/**
 * @description Fetches all the coins for a given transaction.
 * @param txid - The transaction ID to fetch coins from
 * @returns The coins from the transaction
 */
export const useTransactionCoins = (txid: string) => {
  const client = useGetClient();
  const { data: transaction } = useFetchTransactionDetails(txid);

  return useQuery({
    queryKey: transactionKeys.coins(txid),
    queryFn: async () => {
      if (!transaction) {
        throw new Error("Transaction not found");
      }
      const coins = await fetchTransactionCoins(txid, client);
      return {
        transaction,
        coins,
      };
    },
    enabled: !!transaction && !!client,
  });
};
