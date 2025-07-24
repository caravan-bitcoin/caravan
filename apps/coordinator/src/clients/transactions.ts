import { useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSelector } from "react-redux";
import { useEffect, useRef } from "react";
import { BlockchainClient, TransactionDetails } from "@caravan/clients";
import {
  getPendingTransactionIds,
  getWalletAddresses,
  Slice,
  getSpentSlices,
  SliceWithLastUsed,
} from "selectors/wallet";
import { calculateTransactionValue } from "utils/transactionCalculations";
import { useGetClient } from "hooks/client";
import { bitcoinsToSatoshis } from "@caravan/bitcoin";

// Define the state interface for proper typing
interface RootState {
  client: {
    type: "public" | "private";
  };
}

// Query key factory for transactions
const transactionKeys = {
  all: ["transactions"] as const,
  tx: (txid: string) => [...transactionKeys.all, txid] as const,
  pending: () => [...transactionKeys.all, "pending"] as const,
  completed: (count: number, skip: number) =>
    [...transactionKeys.all, "completed", count, skip] as const,
  txWithHex: (txid: string) =>
    [...transactionKeys.all, txid, "withHex"] as const,
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

// Hook for processed pending transactions with calculated values
export const usePendingTransactions = () => {
  const queryClient = useQueryClient();
  const walletAddresses = useSelector(getWalletAddresses);
  const transactionQueries = useFetchPendingTransactions();

  // Keep track of previous pending transaction IDs to detect changes
  const prevPendingTxIds = useRef<string[]>([]);
  const currentPendingTxIds = useSelector(getPendingTransactionIds);

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

  // 🔥 KEY FIX: Detect when transactions move from pending to confirmed
  useEffect(() => {
    const prevIds = prevPendingTxIds.current;
    const currentIds = currentPendingTxIds;

    // Find transactions that were pending but are no longer in the pending list
    const confirmedTransactionIds = prevIds.filter(
      (id) => !currentIds.includes(id),
    );

    if (confirmedTransactionIds.length > 0) {
      // Invalidate completed transactions cache to trigger refetch
      queryClient.invalidateQueries({
        queryKey: transactionKeys.all,
        predicate: (query) => {
          // Invalidate all completed transaction queries
          return (
            query.queryKey[0] === "transactions" &&
            query.queryKey.includes("completed")
          );
        },
      });
    }

    // Update the ref with current pending IDs
    prevPendingTxIds.current = currentIds;
  }, [currentPendingTxIds, queryClient]);

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

// Hook for completed transactions with address-based fetching
export const useCompletedTransactions = (
  count: number = 10,
  skip: number = 0,
) => {
  const blockchainClient = useGetClient();
  const clientType = useSelector((state: RootState) => state.client.type);
  const walletAddresses = useSelector(getWalletAddresses);

  // Get spent addresses for public clients - with proper typing
  const spentSlices = useSelector(getSpentSlices) as SliceWithLastUsed[];
  const spentAddresses = spentSlices.map(
    (slice: SliceWithLastUsed) => slice.multisig.address,
  );

  return useQuery({
    queryKey: transactionKeys.completed(count, skip),
    queryFn: async (): Promise<TransactionDetails[]> => {
      if (!blockchainClient) {
        throw new Error("No blockchain client available");
      }

      let transactions: TransactionDetails[];
      if (clientType === "private") {
        // For private clients, use wallet transaction history
        transactions = await blockchainClient.getWalletTransactionHistory(
          count,
          skip,
        );
      } else {
        // For public clients, query wallet addresses (not just spent ones)
        const addressesToQuery =
          walletAddresses.length > 0 ? walletAddresses : [];

        if (addressesToQuery.length === 0) {
          return [];
        }

        try {
          transactions = await blockchainClient.getAddressTransactionHistory(
            addressesToQuery,
            count,
            skip,
          );
        } catch (error) {
          console.error("Error fetching address transaction history:", error);
          // Fallback: if querying all addresses fails, try just spent addresses
          if (spentAddresses.length > 0) {
            transactions = await blockchainClient.getAddressTransactionHistory(
              spentAddresses,
              count,
              skip,
            );
          } else {
            throw error;
          }
        }
      }

      // Filter out pending transactions (only confirmed ones)
      const confirmedTransactions = transactions.filter(
        (tx) => tx.status?.confirmed === true,
      );

      // Add wallet-specific metadata
      return confirmedTransactions.map((tx) => ({
        ...tx,
        valueToWallet: calculateTransactionValue(tx, walletAddresses),
        isReceived:
          tx.isReceived !== undefined
            ? tx.isReceived
            : calculateTransactionValue(tx, walletAddresses) > 0,
      }));
    },
    enabled:
      !!blockchainClient &&
      (clientType === "private" || walletAddresses.length > 0),
    staleTime: 30000, // Cache for 30 seconds
    // 🔥 KEY FIX: Add refetch settings to ensure fresh data
    refetchOnWindowFocus: true, // Refetch when user comes back to tab
    refetchInterval: 60000, // Poll every 60 seconds for new confirmed transactions
  });
};

// Rest of your existing code (Coin interface, fetchTransactionCoins, etc.)
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
