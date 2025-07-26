import { useQuery } from "@tanstack/react-query";
import { useSelector } from "react-redux";
import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { TransactionDetails, WalletTransactionDetails } from "@caravan/clients";
import {
  getWalletAddresses,
  getSpentSlices,
  SliceWithLastUsed,
  WalletState,
} from "selectors/wallet";
import { calculateTransactionValue } from "utils/transactionCalculations";
import { useGetClient } from "hooks/client";
import { dustAnalysis, privacyAnalysis } from "utils/transactionAnalysisUtils";
import type { MultisigAddressType } from "@caravan/bitcoin";

// Query key factory for completed transactions
const transactionKeys = {
  all: ["transactions"] as const,
  completed: (count: number, skip: number) =>
    [...transactionKeys.all, "completed", count, skip] as const,
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
};

export function useTransactionAnalysis() {
  const {
    inputs = [],
    outputs = [],
    feeRate = 1,
  } = useSelector((state: any) => state.spend?.transaction || {});
  const { requiredSigners, totalSigners } = useSelector(
    (state: WalletState) => state.settings || {},
  );
  const addressType = useSelector(
    (state: WalletState) => state.settings?.addressType,
  ) as MultisigAddressType;

  return useMemo(() => {
    const dust = dustAnalysis({
      inputs,
      outputs,
      feeRate,
      addressType,
      requiredSigners,
      totalSigners,
    });
    const privacy = privacyAnalysis({
      inputs,
      outputs,
      feeRate,
      addressType,
      requiredSigners,
      totalSigners,
    });
    return { dust, privacy };
  }, [inputs, outputs, feeRate, requiredSigners, totalSigners, addressType]);
}

// TanStack Query hook for wallet transaction history (private clients)
const useWalletTransactionHistory = (count: number, skip: number) => {
  const blockchainClient = useGetClient();

  return useQuery({
    queryKey: transactionKeys.walletHistory(count, skip),
    queryFn: async (): Promise<WalletTransactionDetails[]> => {
      if (!blockchainClient) {
        throw new Error("No blockchain client available");
      }
      return await blockchainClient.getWalletTransactionHistory(count, skip);
    },
    enabled: !!blockchainClient,
    staleTime: 30000, // Cache for 30 seconds
    cacheTime: 5 * 60 * 1000, // Keep cache for 5 minutes
  });
};

// TanStack Query hook for address transaction history (public clients)
const useAddressTransactionHistory = (
  addresses: string[],
  count: number,
  skip: number,
) => {
  const blockchainClient = useGetClient();

  return useQuery({
    queryKey: transactionKeys.addressHistory(addresses, count, skip),
    queryFn: async (): Promise<WalletTransactionDetails[]> => {
      if (!blockchainClient) {
        throw new Error("No blockchain client available");
      }

      if (addresses.length === 0) {
        return [];
      }

      return await blockchainClient.getAddressTransactionHistory(
        addresses,
        count,
        skip,
      );
    },
    enabled: !!blockchainClient && addresses.length > 0,
    staleTime: 30000, // Cache for 30 seconds
    cacheTime: 5 * 60 * 1000, // Keep cache for 5 minutes
  });
};

// NEW HOOKS: Load more functionality for completed transactions
export const useCompletedTransactionsWithLoadMore = (
  pageSize: number = 100,
) => {
  const blockchainClient = useGetClient();
  const clientType = useSelector((state: WalletState) => state.client.type);
  const walletAddresses = useSelector(getWalletAddresses);

  // State for managing loaded transactions and pagination
  const [allTransactions, setAllTransactions] = useState<TransactionDetails[]>(
    [],
  );
  const [currentOffset, setCurrentOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  // Get spent addresses for public clients
  const spentSlices = useSelector(getSpentSlices) as SliceWithLastUsed[];
  const spentAddresses = spentSlices.map(
    (slice: SliceWithLastUsed) => slice.multisig.address,
  );

  // Query for fetching transactions
  const { isLoading, error, isFetching, refetch } = useQuery(
    transactionKeys.completed(pageSize, currentOffset),
    async (): Promise<TransactionDetails[]> => {
      if (!blockchainClient) {
        throw new Error("No blockchain client available");
      }

      let transactions: WalletTransactionDetails[];

      if (clientType === "private") {
        // For private clients, use wallet transaction history
        transactions = await blockchainClient.getWalletTransactionHistory(
          pageSize,
          currentOffset,
        );
      } else {
        // For public clients, use all wallet addresses
        const addressesToQuery =
          walletAddresses.length > 0 ? walletAddresses : [];

        if (addressesToQuery.length === 0) {
          console.warn(
            "No wallet addresses available to query for transaction history",
          );
          return [];
        }

        try {
          transactions = await blockchainClient.getAddressTransactionHistory(
            addressesToQuery,
            pageSize,
            currentOffset,
          );
        } catch (error) {
          console.error("Error fetching address transaction history:", error);
          // Fallback: if querying all addresses fails, try just spent addresses
          if (spentAddresses.length > 0) {
            transactions = await blockchainClient.getAddressTransactionHistory(
              spentAddresses,
              pageSize,
              currentOffset,
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
      const processedTransactions = confirmedTransactions.map((tx) => ({
        ...tx,
        valueToWallet: calculateTransactionValue(tx, walletAddresses),
        isReceived:
          tx.isReceived !== undefined
            ? tx.isReceived
            : calculateTransactionValue(tx, walletAddresses) > 0,
      }));

      // Determine if there are more transactions
      const mightHaveMore = confirmedTransactions.length === pageSize;
      setHasMore(mightHaveMore);

      return processedTransactions;
    },
    {
      enabled:
        !!blockchainClient &&
        (clientType === "private" || walletAddresses.length > 0),
      staleTime: 0, // Set to 0 so data is always considered stale
      cacheTime: 5 * 60 * 1000, // Keep cache for 5 minutes but mark as stale immediately
      refetchOnMount: true, // Always refetch when component mounts
      refetchOnWindowFocus: false, // Optional: disable refetch on window focus
      onSuccess: (newTransactions) => {
        if (currentOffset === 0) {
          // First load - replace all transactions
          setAllTransactions(newTransactions);
        } else {
          // Load more - append to existing transactions
          setAllTransactions((prev) => {
            // Avoid duplicates by checking txid
            const existingTxIds = new Set(prev.map((tx) => tx.txid));
            const uniqueNewTransactions = newTransactions.filter(
              (tx) => !existingTxIds.has(tx.txid),
            );

            return [...prev, ...uniqueNewTransactions];
          });
        }
      },
      onError: (error) => {
        console.error("Query error:", error);
      },
    },
  );

  // Reset state when key dependencies change (but not on initial mount)
  const isInitialMount = useRef(true);

  useEffect(() => {
    if (isInitialMount.current) {
      // Skip reset on initial mount
      isInitialMount.current = false;
      return;
    }

    setCurrentOffset(0);
    setAllTransactions([]);
    setHasMore(true);
  }, [blockchainClient, clientType, walletAddresses.length]);

  // Load more function
  const loadMore = useCallback(() => {
    if (!isFetching && hasMore) {
      const newOffset = currentOffset + pageSize;
      setCurrentOffset(newOffset);
    } else {
      console.log("Cannot load more:", { isFetching, hasMore });
    }
  }, [isFetching, hasMore, currentOffset, pageSize]);

  // Reset function (useful for refreshing)
  const reset = useCallback(() => {
    setCurrentOffset(0);
    setAllTransactions([]);
    setHasMore(true);
    refetch();
  }, [refetch]);

  return {
    data: allTransactions,
    isLoading: isLoading && currentOffset === 0, // Only show loading for initial load
    isLoadingMore: isFetching && currentOffset > 0, // Show loading more for subsequent loads
    error,
    hasMore,
    loadMore,
    reset,
    refetch,
    totalLoaded: allTransactions.length,
    currentOffset,
    pageSize,
  };
};

// Hook for completed transactions with address-based fetching
export const useCompletedTransactions = (
  count: number = 10,
  skip: number = 0,
) => {
  const clientType = useSelector((state: WalletState) => state.client.type);
  const walletAddresses = useSelector(getWalletAddresses);

  // Get spent addresses for public clients - with proper typing
  const spentSlices = useSelector(getSpentSlices) as SliceWithLastUsed[];
  const spentAddresses = spentSlices.map(
    (slice: SliceWithLastUsed) => slice.multisig.address,
  );

  // Use appropriate query based on client type
  const walletHistoryQuery = useWalletTransactionHistory(count, skip);
  const addressHistoryQuery = useAddressTransactionHistory(
    walletAddresses.length > 0 ? walletAddresses : spentAddresses,
    count,
    skip,
  );

  // Select the appropriate query based on client type
  const activeQuery =
    clientType === "private" ? walletHistoryQuery : addressHistoryQuery;
  const { data: rawTransactions = [], ...queryResult } = activeQuery;

  // Process transactions with wallet-specific metadata
  const processedTransactions = useMemo(() => {
    // Filter out pending transactions (only confirmed ones)
    const confirmedTransactions = rawTransactions.filter(
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
  }, [rawTransactions, walletAddresses]);

  return {
    ...queryResult,
    data: processedTransactions,
  };
};
