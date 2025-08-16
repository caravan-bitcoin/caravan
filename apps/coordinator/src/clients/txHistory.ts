import { useInfiniteQuery } from "@tanstack/react-query";
import { useSelector } from "react-redux";
import { useMemo, useRef } from "react";
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
const TRANSACTION_STALE_TIME = 5 * 60 * 1000;

export const usePublicClientTransactionsWithLoadMore = (
  pageSize: number = DEFAULT_PAGE_SIZE,
) => {
  const blockchainClient = useGetClient();
  const clientType = blockchainClient?.type;

  // Get current addresses
  const walletAddresses = useSelector(getWalletAddresses);
  const spentSlices = useSelector(getSpentSlices) as SliceWithLastUsed[];

  // Create a stable snapshot of addresses for the query
  const addressesSnapshotRef = useRef<string[] | null>(null);
  const isInitialLoadRef = useRef(true);

  // Determine addresses to query
  const currentAddresses = useMemo(() => {
    const spentAddresses =
      spentSlices
        ?.map((slice: SliceWithLastUsed) => slice.multisig?.address)
        .filter(Boolean) || [];
    return walletAddresses.length > 0 ? walletAddresses : spentAddresses;
  }, [walletAddresses, spentSlices]);

  // SOLUTION: Use a stable address snapshot for queries
  // Only update the snapshot when addresses change significantly OR on initial load
  const stableAddresses = useMemo(() => {
    // On initial load, always use current addresses
    if (isInitialLoadRef.current && currentAddresses.length > 0) {
      addressesSnapshotRef.current = [...currentAddresses];
      isInitialLoadRef.current = false;
      return addressesSnapshotRef.current;
    }

    // For subsequent updates, only change if addresses changed significantly
    // This prevents incremental address generation from triggering new queries
    if (addressesSnapshotRef.current) {
      const currentCount = currentAddresses.length;
      const snapshotCount = addressesSnapshotRef.current.length;

      // Only update if:
      // 1. Address count changed by more than 10 (significant change)
      // 2. OR if we have significantly fewer addresses (wallet changed)
      const significantIncrease = currentCount > snapshotCount + 10;
      const significantDecrease = currentCount < snapshotCount * 0.5;

      if (significantIncrease || significantDecrease) {
        addressesSnapshotRef.current = [...currentAddresses];
        return addressesSnapshotRef.current;
      }
      return addressesSnapshotRef.current;
    }

    // Fallback: use current addresses
    return currentAddresses;
  }, [currentAddresses]);

  // Stable query key based on stable addresses
  const addressesKey = useMemo(() => {
    return stableAddresses.slice().sort().join(",");
  }, [stableAddresses]);

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

  const infiniteQuery = useInfiniteQuery({
    queryKey,
    queryFn: async ({ pageParam = 0 }) => {
      if (!blockchainClient) {
        throw new Error("No blockchain client available");
      }

      if (stableAddresses.length === 0) {
        return [];
      }

      const rawTransactions =
        await blockchainClient.getAddressTransactionHistory(
          stableAddresses,
          pageSize,
          pageParam,
        );

      // Use current wallet addresses for processing (not the stable snapshot)
      // This ensures proper transaction categorization with the latest addresses
      return selectProcessedTransactions(
        rawTransactions,
        walletAddresses, // Use current addresses for processing
        "all",
      );
    },
    enabled:
      !!blockchainClient &&
      clientType === "public" &&
      stableAddresses.length > 0,
    getNextPageParam: (lastPage, allPages) => {
      return lastPage.length >= pageSize
        ? allPages.length * pageSize
        : undefined;
    },
    refetchOnWindowFocus: false,
    staleTime: TRANSACTION_STALE_TIME,
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
    reset: () => {
      // Reset the address snapshot on manual reset
      addressesSnapshotRef.current = null;
      isInitialLoadRef.current = true;
      return infiniteQuery.refetch();
    },
    refetch: infiniteQuery.refetch,
    totalLoaded: allTransactions.length,
    // Expose method to force address refresh when needed
    refreshAddresses: () => {
      addressesSnapshotRef.current = [...currentAddresses];
      infiniteQuery.refetch();
    },
  };
};

// Private client version (unchanged)
export const usePrivateClientTransactionsWithLoadMore = (
  pageSize: number = DEFAULT_PAGE_SIZE,
) => {
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
    refetchOnWindowFocus: false,
    staleTime: TRANSACTION_STALE_TIME,
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
  };
};

// Main hook
export const useCompletedTransactionsWithLoadMore = (
  pageSize: number = DEFAULT_PAGE_SIZE,
) => {
  const clientType = useSelector((state: WalletState) => state.client.type);

  const privateQuery = usePrivateClientTransactionsWithLoadMore(pageSize);
  const publicQuery = usePublicClientTransactionsWithLoadMore(pageSize);

  return clientType === "private" ? privateQuery : publicQuery;
};
