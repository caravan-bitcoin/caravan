import { useQueries } from "@tanstack/react-query";
import { useSelector } from "react-redux";
import { getPendingTransactionIds, getWalletAddresses } from "selectors/wallet";
import { calculateTransactionValue } from "utils/transactionCalculations";
import { useGetClient } from "hooks/client";

// Query key factory for pending transactions
export const transactionKeys = {
  all: ["transactions"] as const,
  pending: () => [...transactionKeys.all, "pending"] as const,
  pendingTransaction: (txid: string) =>
    [...transactionKeys.pending(), txid] as const,
};

// Service function for fetching transaction details
const fetchTransactionDetails = async (txid: string, client: any) => {
  if (!client) {
    throw new Error("No blockchain client available");
  }
  return await client.getTransaction(txid);
};

// Hook for fetching all pending transactions
export const usePendingTransactions = () => {
  const pendingTransactionIds = useSelector(getPendingTransactionIds);
  const blockchainClient = useGetClient();

  console.log("usePendingTransactions:", {
    pendingTransactionIds,
    hasClient: !!blockchainClient,
    count: pendingTransactionIds.length,
  });

  return useQueries({
    queries: pendingTransactionIds.map((txid) => ({
      queryKey: transactionKeys.pendingTransaction(txid),
      queryFn: () => fetchTransactionDetails(txid, blockchainClient),
      enabled: !!blockchainClient && !!txid,
      // Refetch every 30 seconds to check for confirmation status changes
      refetchInterval: 30000,
      // Stop refetching when window is not focused
      refetchIntervalInBackground: false,
      // Keep retrying on error
      retry: 3,
      // Retry with exponential backoff
      retryDelay: (attemptIndex: number) =>
        Math.min(1000 * 2 ** attemptIndex, 30000),
      // Ensure refetch on window focus works
      refetchOnWindowFocus: true,
      // Keep data fresh
      staleTime: 0,
    })),
  });
};

// Hook for processed pending transactions with calculated values
export const useFetchPendingTransactions = () => {
  const walletAddresses = useSelector(getWalletAddresses);
  const transactionQueries = usePendingTransactions();

  // Calculate loading and error states
  const isLoading = transactionQueries.some((query) => query.isLoading);
  const error = transactionQueries.find((query) => query.error)?.error;

  console.log("useFetchPendingTransactions:", {
    queryCount: transactionQueries.length,
    isLoading,
    hasError: !!error,
    dataCount: transactionQueries.filter((q) => q.data).length,
    confirmedCount: transactionQueries.filter((q) => q.data?.status?.confirmed)
      .length,
  });

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

  console.log("Filtered transactions:", transactions.length);

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
