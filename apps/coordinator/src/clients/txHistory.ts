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
import { calculateTransactionValue } from "utils/transactionCalculations";

// How many transactions to fetch in total
// This is a reasonable limit that covers most use cases without overwhelming the browser and also prevents the
// cascading complexity where the query keys change, cache invalidation gets messy, and the logic becomes hard to follow
const MAX_TRANSACTIONS_TO_FETCH = 500;
const TRANSACTION_STALE_TIME = 30 * 1000; // 30 seconds
const PENDING_STALE_TIME = 10 * 1000; // 10 seconds - shorter for pending

export const usePublicClientTransactions = (
  filter: "confirmed" | "unconfirmed" = "confirmed",
) => {
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

  const queryKey =
    filter === "confirmed"
      ? transactionKeys.confirmedHistory()
      : transactionKeys.pendingHistory();

  // When addresses change, we invalidate the cache
  // rather than creating a new cache with a different key. This basically tells React Query
  // that the data at this location is now stale, please refetch it
  useEffect(() => {
    if (currentAddresses.length > 0 && clientType === "public") {
      queryClient.invalidateQueries({ queryKey });
    }
  }, [currentAddresses.length, clientType, queryClient]);

  return useQuery({
    queryKey,
    queryFn: async () => {
      // So we fetch all transactions in one call and let the blockchain client handle this efficiently
      const rawTransactions =
        await blockchainClient.getAddressTransactionHistory(
          currentAddresses,
          MAX_TRANSACTIONS_TO_FETCH,
          0,
        );

      const processedTransactions = selectProcessedTransactions(
        rawTransactions,
        walletAddresses,
        filter,
      );

      // Deduplication step — when querying multiple addresses, a transaction that
      // touches more than one wallet address (e.g., send with change) will be returned
      // by the API for each address. We deduplicate here at fetch time.
      const seenTxids = new Set<string>();
      const deduplicated = processedTransactions.filter((tx) => {
        if (seenTxids.has(tx.txid)) {
          return false;
        }
        seenTxids.add(tx.txid);
        return true;
      });

      // We need to ensure every transaction has valueToWallet in satoshis for consistent sorting
      return deduplicated.map((tx) => ({
        ...tx,
        valueToWallet: calculateTransactionValue(tx, walletAddresses),
      }));
    },
    enabled:
      !!blockchainClient &&
      clientType === "public" &&
      currentAddresses.length > 0,
    staleTime:
      filter === "confirmed" ? TRANSACTION_STALE_TIME : PENDING_STALE_TIME,
    refetchOnWindowFocus: true,
    refetchInterval: filter === "confirmed" ? 60000 : 30000,
    refetchIntervalInBackground: false,
  });
};

export const usePrivateClientTransactions = (
  filter: "confirmed" | "unconfirmed" = "confirmed",
) => {
  const blockchainClient = useGetClient();
  const walletAddresses = useSelector(getWalletAddresses);
  const clientType = blockchainClient?.type;
  const queryClient = useQueryClient();

  const queryKey =
    filter === "confirmed"
      ? transactionKeys.confirmedHistory()
      : transactionKeys.pendingHistory();

  // When addresses change, we invalidate the cache
  // rather than creating a new cache with a different key. This basically tells React Query
  // that the data at this location is now stale, please refetch it
  useEffect(() => {
    if (clientType === "private" && blockchainClient) {
      queryClient.invalidateQueries({ queryKey });
    }
  }, [walletAddresses.length, clientType, queryClient, blockchainClient]);

  return useQuery({
    queryKey,
    queryFn: async () => {
      // Fetch all transactions from the wallet in one call
      const rawTransactions =
        await blockchainClient.getWalletTransactionHistory(
          MAX_TRANSACTIONS_TO_FETCH,
          0,
        );

      // Process transactions according to the requested filter
      const filteredTx = selectProcessedTransactions(
        rawTransactions,
        walletAddresses,
        filter,
      );

      // Deduplication step — this fixes the issue where private nodes serving multiple
      // wallets might return the same transaction more than once. By handling it here
      // in the query, we ensure it's done once at fetch time rather than repeatedly
      // during every UI render.
      const seenTxids = new Set<string>();
      const deduplicated = filteredTx.filter((tx) => {
        if (seenTxids.has(tx.txid)) {
          return false;
        }
        seenTxids.add(tx.txid);
        return true;
      });

      // We need to ensure every transaction has valueToWallet in satoshis for consistent sorting
      return deduplicated.map((tx) => ({
        ...tx,
        valueToWallet: calculateTransactionValue(tx, walletAddresses),
      }));
    },
    enabled: !!blockchainClient && clientType === "private",
    staleTime:
      filter === "confirmed" ? TRANSACTION_STALE_TIME : PENDING_STALE_TIME,
    refetchOnWindowFocus: true,
    refetchInterval: filter === "confirmed" ? 60000 : 30000,
    refetchIntervalInBackground: false,
  });
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

/**
 * Hook for fetching unconfirmed (pending) transactions.
 * Reuses the existing public/private client hooks with "unconfirmed" filter.
 */
export const usePendingTransactions = () => {
  const clientType = useSelector((state: WalletState) => state.client.type);
  const privateQuery = usePrivateClientTransactions("unconfirmed");
  const publicQuery = usePublicClientTransactions("unconfirmed");

  const query = clientType === "private" ? privateQuery : publicQuery;

  return {
    transactions: query.data || [],
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
};
