import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { useSelector } from "react-redux";
import { useMemo, useRef, useEffect } from "react";
import {
  getWalletAddresses,
  getSpentSlices,
  SliceWithLastUsed,
  WalletState,
  selectProcessedTransactions,
} from "selectors/wallet";
import { useGetClient } from "hooks/client";
import { transactionKeys } from "clients/transactions";

const DEFAULT_PAGE_SIZE = 100;
const TRANSACTION_STALE_TIME = 30 * 1000; // Reduced to 30 seconds for more responsive updates

export const usePublicClientTransactionsWithLoadMore = (
  pageSize: number = DEFAULT_PAGE_SIZE,
) => {
  const queryClient = useQueryClient();
  const blockchainClient = useGetClient();
  const clientType = blockchainClient?.type;

  // Get current addresses
  const walletAddresses = useSelector(getWalletAddresses);
  const spentSlices = useSelector(getSpentSlices) as SliceWithLastUsed[];

  // Determine addresses to query
  const currentAddresses = useMemo(() => {
    const spentAddresses =
      spentSlices
        ?.map((slice: SliceWithLastUsed) => slice.multisig?.address)
        .filter(Boolean) || [];
    return walletAddresses.length > 0 ? walletAddresses : spentAddresses;
  }, [walletAddresses, spentSlices]);

  // Create stable query key based on sorted addresses
  const addressesKey = useMemo(() => {
    return currentAddresses.slice().sort().join(",");
  }, [currentAddresses]);

  const queryKey = useMemo(
    () => [
      ...transactionKeys.all,
      "infinite",
      "public",
      addressesKey,
      pageSize,
    ],
    [addressesKey, pageSize],
  );

  // Effect to invalidate queries when addresses change significantly
  const prevAddressesRef = useRef<string>("");
  useEffect(() => {
    const currentKey = addressesKey;
    const prevKey = prevAddressesRef.current;

    if (prevKey && prevKey !== currentKey) {
      queryClient.invalidateQueries({
        queryKey: transactionKeys.all,
        exact: false,
      });
    }

    prevAddressesRef.current = currentKey;
  }, [addressesKey, queryClient]);

  const infiniteQuery = useInfiniteQuery({
    queryKey,
    queryFn: async ({ pageParam = 0 }) => {
      if (!blockchainClient) {
        throw new Error("No blockchain client available");
      }

      if (currentAddresses.length === 0) {
        return [];
      }

      const rawTransactions =
        await blockchainClient.getAddressTransactionHistory(
          currentAddresses,
          pageSize,
          pageParam,
        );

      return selectProcessedTransactions(
        rawTransactions,
        walletAddresses,
        "all",
      );
    },
    enabled:
      !!blockchainClient &&
      clientType === "public" &&
      currentAddresses.length > 0,
    getNextPageParam: (lastPage, allPages) => {
      return lastPage.length >= pageSize
        ? allPages.length * pageSize
        : undefined;
    },
    refetchOnWindowFocus: true, // Enable refetch on window focus
    staleTime: TRANSACTION_STALE_TIME,
    // Add refetch interval for automatic updates
    refetchInterval: 60000, // Refetch every minute
    refetchIntervalInBackground: false,
  });

  const allTransactions = useMemo(
    () => infiniteQuery.data?.pages.flat() || [],
    [infiniteQuery.data?.pages],
  );

  return {
    data: allTransactions,
    isLoading: infiniteQuery.isLoading,
    isLoadingMore: infiniteQuery.isFetchingNextPage,
    error: infiniteQuery.error,
    hasMore: infiniteQuery.hasNextPage ?? false,
    loadMore: () => infiniteQuery.fetchNextPage(),
    reset: () => infiniteQuery.refetch(),
    refetch: infiniteQuery.refetch,
    totalLoaded: allTransactions.length,
    // Method to force refresh all transaction data
    forceRefresh: () => {
      queryClient.invalidateQueries({
        queryKey: transactionKeys.all,
        exact: false,
      });
    },
  };
};

// Enhanced private client version
export const usePrivateClientTransactionsWithLoadMore = (
  pageSize: number = DEFAULT_PAGE_SIZE,
) => {
  const queryClient = useQueryClient();
  const blockchainClient = useGetClient();
  const walletAddresses = useSelector(getWalletAddresses);
  const clientType = useSelector((state: WalletState) => state.client.type);

  const queryKey = useMemo(
    () => [...transactionKeys.all, "infinite", "private", pageSize],
    [pageSize],
  );

  const infiniteQuery = useInfiniteQuery({
    queryKey,
    queryFn: async ({ pageParam = 0 }) => {
      const rawTransactions =
        await blockchainClient.getWalletTransactionHistory(pageSize, pageParam);
      return selectProcessedTransactions(
        rawTransactions,
        walletAddresses,
        "confirmed",
      );
    },
    enabled: !!blockchainClient && clientType === "private",
    getNextPageParam: (lastPage, allPages) => {
      return lastPage.length >= pageSize
        ? allPages.length * pageSize
        : undefined;
    },
    refetchOnWindowFocus: true,
    staleTime: TRANSACTION_STALE_TIME,
    refetchInterval: 60000,
    refetchIntervalInBackground: false,
  });

  const allTransactions = useMemo(
    () => infiniteQuery.data?.pages.flat() || [],
    [infiniteQuery.data?.pages],
  );

  return {
    data: allTransactions,
    isLoading: infiniteQuery.isLoading,
    isLoadingMore: infiniteQuery.isFetchingNextPage,
    error: infiniteQuery.error,
    hasMore: infiniteQuery.hasNextPage ?? false,
    loadMore: () => infiniteQuery.fetchNextPage(),
    reset: () => infiniteQuery.refetch(),
    refetch: infiniteQuery.refetch,
    totalLoaded: allTransactions.length,
    forceRefresh: () => {
      queryClient.invalidateQueries({
        queryKey: transactionKeys.all,
        exact: false,
      });
    },
  };
};

// Main hook with enhanced refresh capabilities
export const useCompletedTransactionsWithLoadMore = (
  pageSize: number = DEFAULT_PAGE_SIZE,
) => {
  const clientType = useSelector((state: WalletState) => state.client.type);

  const privateQuery = usePrivateClientTransactionsWithLoadMore(pageSize);
  const publicQuery = usePublicClientTransactionsWithLoadMore(pageSize);

  return clientType === "private" ? privateQuery : publicQuery;
};

// Hook for transaction state change events
export const useTransactionStateSync = () => {
  const queryClient = useQueryClient();

  // Function to call when a transaction changes state (pending -> confirmed)
  const onTransactionStateChange = (txid?: string) => {
    // Invalidate all transaction queries to pick up state changes
    queryClient.invalidateQueries({
      queryKey: transactionKeys.all,
      exact: false,
    });

    // If specific transaction, also invalidate its individual query
    if (txid) {
      queryClient.invalidateQueries({
        queryKey: transactionKeys.tx(txid),
      });
    }
  };

  // Function to call when wallet balance changes (indicates new transactions)
  const onBalanceChange = () => {
    queryClient.invalidateQueries({
      queryKey: transactionKeys.all,
      exact: false,
    });
  };

  return {
    onTransactionStateChange,
    onBalanceChange,
  };
};
