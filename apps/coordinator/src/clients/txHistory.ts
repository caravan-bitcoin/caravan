import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSelector } from "react-redux";
import { useMemo, useEffect } from "react";
import {
  getWalletAddresses,
  getSpentSlices,
  SliceWithLastUsed,
  WalletState,
  selectProcessedTransactions,
} from "selectors/wallet";
import { useGetClient } from "hooks/client";
import { transactionKeys } from "clients/transactions";

// How many transactions to fetch in total
// This is a reasonable limit that covers most use cases without overwhelming the browser and also prevents the
// cascading complexity where the query keys change, cache invalidation gets messy, and the logic becomes hard to follow
const MAX_TRANSACTIONS_TO_FETCH = 500;
const TRANSACTION_STALE_TIME = 30 * 1000; // 30 seconds

export const usePublicClientTransactions = () => {
  const blockchainClient = useGetClient();
  const clientType = blockchainClient?.type;
  const queryClient = useQueryClient();

  // Get current addresses
  const walletAddresses = useSelector(getWalletAddresses);
  const spentSlices = useSelector(getSpentSlices) as SliceWithLastUsed[];

  // Determine current addresses that we need to query
  const currentAddresses = useMemo(() => {
    const spentAddresses =
      spentSlices
        ?.map((slice: SliceWithLastUsed) => slice.multisig?.address)
        .filter(Boolean) || [];
    return walletAddresses.length > 0 ? walletAddresses : spentAddresses;
  }, [walletAddresses, spentSlices]);

  // When addresses change, we invalidate the cache
  // rather than creating a new cache with a different key. This basically tells React Query
  // that the data at this location is now stale, please refetch it
  useEffect(() => {
    if (currentAddresses.length > 0 && clientType === "public") {
      queryClient.invalidateQueries({
        queryKey: transactionKeys.confirmedHistory(),
      });
    }
  }, [currentAddresses.length, clientType, queryClient]);

  const query = useQuery({
    queryKey: transactionKeys.confirmedHistory(),
    queryFn: async () => {
      // So we fetch all transactions in one call and let the blockchain client handle this efficiently
      const rawTransactions =
        await blockchainClient.getAddressTransactionHistory(
          currentAddresses,
          MAX_TRANSACTIONS_TO_FETCH,
          0,
        );

      // for public clients we don't expect the deduplication problem we have for private nodes so we don't handle that
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
    staleTime: TRANSACTION_STALE_TIME,
    refetchOnWindowFocus: true,
    refetchInterval: 60000, // Refetch every minute
    refetchIntervalInBackground: false,
  });

  return {
    transactions: query.data || [],
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
};

export const usePrivateClientTransactions = () => {
  const blockchainClient = useGetClient();
  const walletAddresses = useSelector(getWalletAddresses);
  const clientType = blockchainClient?.type;
  const queryClient = useQueryClient();

  // When addresses change, we invalidate the cache
  // rather than creating a new cache with a different key. This basically tells React Query
  // that the data at this location is now stale, please refetch it
  useEffect(() => {
    if (clientType === "private" && blockchainClient) {
      queryClient.invalidateQueries({
        queryKey: transactionKeys.confirmedHistory(),
      });
    }
  }, [walletAddresses.length, clientType, queryClient, blockchainClient]);

  const query = useQuery({
    queryKey: transactionKeys.confirmedHistory(),
    queryFn: async () => {
      // Fetch all transactions from the wallet in one call
      const rawTransactions =
        await blockchainClient.getWalletTransactionHistory(
          MAX_TRANSACTIONS_TO_FETCH,
          0,
        );

      // Process transactions to add wallet-specific data
      const confirmedTx = selectProcessedTransactions(
        rawTransactions,
        walletAddresses,
        "confirmed",
      );

      // Deduplication step — this fixes the issue where private nodes serving multiple
      // wallets might return the same transaction more than once. By handling it here
      // in the query, we ensure it's done once at fetch time rather than repeatedly
      // during every UI render.
      const seenTxids = new Set<string>();
      const deduplicated = confirmedTx.filter((tx) => {
        if (seenTxids.has(tx.txid)) {
          return false;
        }
        seenTxids.add(tx.txid);
        return true;
      });

      return deduplicated;
    },
    enabled: !!blockchainClient && clientType === "private",
    staleTime: TRANSACTION_STALE_TIME,
    refetchOnWindowFocus: true,
    refetchInterval: 60000,
    refetchIntervalInBackground: false,
  });

  return {
    transactions: query.data || [],
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
};

/**
 * Main hook that routes to the appropriate client type.
 * Returns all confirmed transactions - UI handles pagination.
 */
export const useConfirmedTransactions = () => {
  const clientType = useSelector((state: WalletState) => state.client.type);

  const privateQuery = usePrivateClientTransactions();
  const publicQuery = usePublicClientTransactions();

  return clientType === "private" ? privateQuery : publicQuery;
};
