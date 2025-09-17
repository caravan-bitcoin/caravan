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

export const DEFAULT_PAGE_SIZE = 100;
const TRANSACTION_STALE_TIME = 30 * 1000; // Reduced to 30 seconds for more responsive updates

// Common query options shared between public and private hooks
const getCommonQueryOptions = (pageSize: number, pendingCount: number = 0) => ({
  getNextPageParam: (lastPage: any[], allPages: any[][]) => {
    const effectiveMinPageSize = Math.max(1, pageSize - pendingCount);
    return lastPage.length >= effectiveMinPageSize
      ? allPages.length * pageSize
      : undefined;
  },
  refetchOnWindowFocus: true,
  staleTime: TRANSACTION_STALE_TIME,
  refetchInterval: 60000,
  refetchIntervalInBackground: false,
});

export const usePublicClientTransactionsWithLoadMore = (
  pageSize: number = DEFAULT_PAGE_SIZE,
  pendingCount: number = 0,
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
    queryKey: transactionKeys.confirmedHistory(pageSize + pendingCount),
    queryFn: async ({ pageParam = 0 }) => {
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
        "confirmed",
      );
    },
    enabled:
      !!blockchainClient &&
      clientType === "public" &&
      currentAddresses.length > 0,
    ...getCommonQueryOptions(pageSize, pendingCount),
  });

  const allTransactions = useMemo(
    () => infiniteQuery.data?.pages.flat() || [],
    [infiniteQuery.data?.pages],
  );

  return {
    ...infiniteQuery, // Expose all infiniteQuery properties
    data: allTransactions, // Maintain flattened data for backward compatibility
    totalLoaded: allTransactions.length,
  };
};

// Enhanced private client version
export const usePrivateClientTransactionsWithLoadMore = (
  pageSize: number = DEFAULT_PAGE_SIZE,
  pendingCount: number = 0,
) => {
  const blockchainClient = useGetClient();
  const walletAddresses = useSelector(getWalletAddresses);
  const clientType = blockchainClient?.type;
  // Need to use this as a key because once we get an update
  // on pending, then the total query size changes and we want to invalidate cache
  const totalPageSize = pageSize + pendingCount;
  const infiniteQuery = useInfiniteQuery({
    queryKey: transactionKeys.confirmedHistory(totalPageSize),
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
    ...getCommonQueryOptions(pageSize, pendingCount),
  });

  const allTransactions = useMemo(
    () => infiniteQuery.data?.pages.flat() || [],
    [infiniteQuery.data?.pages],
  );

  return {
    ...infiniteQuery, // Expose all infiniteQuery properties
    data: allTransactions, // Maintain flattened data for backward compatibility
    totalLoaded: allTransactions.length,
  };
};

// Main hook with enhanced refresh capabilities
export const useCompletedTransactionsWithLoadMore = (
  pageSize: number = DEFAULT_PAGE_SIZE,
  pendingCount: number = 0,
) => {
  const clientType = useSelector((state: WalletState) => state.client.type);

  const privateQuery = usePrivateClientTransactionsWithLoadMore(
    pageSize,
    pendingCount,
  );
  const publicQuery = usePublicClientTransactionsWithLoadMore(
    pageSize,
    pendingCount,
  );

  return clientType === "private" ? privateQuery : publicQuery;
};
