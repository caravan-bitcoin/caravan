import { useQueries } from "@tanstack/react-query";
import { useSelector } from "react-redux";
import { getPendingTransactionIds, getWalletAddresses } from "selectors/wallet";
import { calculateTransactionValue } from "utils/transactionCalculations";
import { useGetClient } from "hooks/client";

// Query key factory for pending transactions
const transactionKeys = {
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
const useFetchPendingTransactions = () => {
  const pendingTransactionIds = useSelector(getPendingTransactionIds);
  const blockchainClient = useGetClient();

  return useQueries({
    queries: pendingTransactionIds.map((txid) => ({
      queryKey: transactionKeys.pendingTransaction(txid),
      queryFn: () => fetchTransactionDetails(txid, blockchainClient),
      enabled: !!blockchainClient && !!txid,
    })),
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
