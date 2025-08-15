import { useInfiniteQuery } from "@tanstack/react-query";
import { useSelector } from "react-redux";
import {
  getWalletAddresses,
  getSpentSlices,
  SliceWithLastUsed,
  WalletState,
  selectProcessedTransactions,
} from "selectors/wallet";
import { useGetClient } from "hooks/client";
import { transactionKeys } from "clients/transactions";

/**
 * Default page size for transaction pagination
 * @constant {number}
 */
const DEFAULT_PAGE_SIZE = 100;

/**
 * Cache duration for transaction data (5 minutes)
 * @constant {number}
 */
const TRANSACTION_STALE_TIME = 5 * 60 * 1000;

// ============= PRIVATE CLIENT IMPLEMENTATION =============

/**
 * Hook for fetching transaction history from private blockchain clients with pagination
 * Uses TanStack Query's infinite query for efficient data loading
 *
 * Private clients have direct wallet access and can query transaction history
 * without specifying addresses (e.g., Bitcoin Core with wallet enabled)
 *
 * @param {number} [pageSize=100] - Number of transactions to load per page
 * @returns {Object} Transaction query result with pagination controls
 * @returns {TransactionDetails[]} returns.data - Flattened array of all loaded transactions
 * @returns {boolean} returns.isLoading - True during initial data load
 * @returns {boolean} returns.isLoadingMore - True when fetching additional pages
 * @returns {Error|null} returns.error - Error object if query fails
 * @returns {boolean} returns.hasMore - True if more pages are available
 * @returns {Function} returns.loadMore - Function to fetch the next page
 * @returns {Function} returns.reset - Function to reset and refetch from the beginning
 * @returns {Function} returns.refetch - Function to refetch current data
 * @returns {number} returns.totalLoaded - Total count of loaded transactions
 */
export const usePrivateClientTransactionsWithLoadMore = (
  pageSize: number = DEFAULT_PAGE_SIZE,
) => {
  const blockchainClient = useGetClient();
  const walletAddresses = useSelector(getWalletAddresses);
  const clientType = useSelector((state: WalletState) => state.client.type);

  /**
   * Infinite query configuration for paginated transaction loading
   * Each page fetches 'pageSize' transactions with automatic offset calculation
   */
  const infiniteQuery = useInfiniteQuery({
    queryKey: [...transactionKeys.all, "infinite", "private", pageSize],

    /**
     * Fetch function for each page of transactions
     * @param {number} pageParam - Offset for pagination (managed by TanStack Query)
     */
    queryFn: async ({ pageParam = 0 }) => {
      // Fetch raw transactions from the blockchain client
      const rawTransactions =
        await blockchainClient.getWalletTransactionHistory(pageSize, pageParam);

      // Process transactions to add wallet-specific metadata
      // This includes calculating balances, identifying change addresses, etc.
      return selectProcessedTransactions(
        rawTransactions,
        walletAddresses,
        "confirmed",
      );
    },

    // Only enable query when we have a private client
    enabled: !!blockchainClient && clientType === "private",

    /**
     * Determine if there are more pages to load
     * If the last page returned fewer items than pageSize, we've reached the end
     */
    getNextPageParam: (lastPage, allPages) => {
      if (lastPage.length < pageSize) {
        return undefined; // No more pages
      }
      // Calculate offset for next page based on total pages loaded
      return allPages.length * pageSize;
    },

    refetchOnWindowFocus: false, // Don't refetch when window regains focus
    staleTime: TRANSACTION_STALE_TIME, // Cache data for 5 minutes
  });

  // Flatten paginated data into single array for easier consumption
  const allTransactions = infiniteQuery.data?.pages.flat() || [];

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

/**
 * Hook for fetching transaction history from public blockchain clients with pagination
 * Public clients require explicit addresses to query (e.g., Blockstream, Mempool.space)
 *
 * Handles fallback scenarios when primary address queries fail, attempting
 * to query spent addresses as a backup strategy
 *
 * @param {number} [pageSize=100] - Number of transactions to load per page
 * @returns {Object} Transaction query result with pagination controls (same as private client)
 */
export const usePublicClientTransactionsWithLoadMore = (
  pageSize: number = DEFAULT_PAGE_SIZE,
) => {
  const blockchainClient = useGetClient();
  const walletAddresses = useSelector(getWalletAddresses);
  const clientType = blockchainClient?.type;
  /**
   * Fallback address strategy:
   * 1. Use wallet addresses if available (normal operation)
   * 2. Fall back to spent addresses for imported/watch-only wallets
   */
  const spentSlices = useSelector(getSpentSlices) as SliceWithLastUsed[];
  const spentAddresses = spentSlices.map(
    (slice: SliceWithLastUsed) => slice.multisig.address,
  );

  const addressesToQuery =
    walletAddresses.length > 0 ? walletAddresses : spentAddresses;

  const infiniteQuery = useInfiniteQuery({
    // Include addresses in query key for proper cache invalidation
    queryKey: [
      ...transactionKeys.all,
      "infinite",
      "public",
      addressesToQuery.sort().join(","), // Sorted for consistent cache keys
      pageSize,
    ],

    queryFn: async ({ pageParam = 0 }) => {
      if (!blockchainClient) {
        throw new Error("No blockchain client available");
      }

      if (addressesToQuery.length === 0) {
        console.warn("No addresses available to query for transaction history");
        return [];
      }

      try {
        /**
         * Primary query attempt:
         * Query all available addresses for transaction history
         */
        const rawTransactions =
          await blockchainClient.getAddressTransactionHistory(
            addressesToQuery,
            pageSize,
            pageParam,
          );

        return selectProcessedTransactions(
          rawTransactions,
          walletAddresses,
          "all",
        );
      } catch (error) {
        /**
         * Fallback query strategy:
         * If querying all addresses fails (e.g., API rate limits, too many addresses),
         * attempt to query just the spent addresses as these are typically fewer
         */
        console.error("Error fetching address transaction history:", error);

        if (spentAddresses.length > 0 && walletAddresses.length > 0) {
          console.warn("Falling back to spent addresses only");

          const rawTransactions =
            await blockchainClient.getAddressTransactionHistory(
              spentAddresses,
              pageSize,
              pageParam,
            );

          return selectProcessedTransactions(
            rawTransactions,
            walletAddresses,
            "all",
          );
        }
        throw error;
      }
    },

    enabled:
      !!blockchainClient &&
      clientType === "public" &&
      addressesToQuery.length > 0,

    getNextPageParam: (lastPage, allPages) => {
      if (lastPage.length < pageSize) {
        return undefined;
      }
      return allPages.length * pageSize;
    },

    refetchOnWindowFocus: false,
    staleTime: TRANSACTION_STALE_TIME,
  });

  const allTransactions = infiniteQuery.data?.pages.flat() || [];

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

/**
 * Smart hook for fetching completed transactions with pagination support.
 *
 * Automatically selects between private and public client implementations.
 * This is the primary hook for loading transaction history in the UI,
 * providing a consistent interface regardless of the underlying client type.
 *
 * @param pageSize - Number of transactions to load per page (default: 100)
 * @returns Unified transaction query result with pagination
 *
 * @example
 * ```ts
 * const {
 *   data,
 *   isLoading,
 *   loadMore,
 *   hasMore
 * } = useCompletedTransactionsWithLoadMore(100);
 * ```
 */
export const useCompletedTransactionsWithLoadMore = (
  pageSize: number = DEFAULT_PAGE_SIZE,
) => {
  const clientType = useSelector((state: WalletState) => state.client.type);

  const privateQuery = usePrivateClientTransactionsWithLoadMore(pageSize);
  const publicQuery = usePublicClientTransactionsWithLoadMore(pageSize);
  return clientType === "private" ? privateQuery : publicQuery;
};
