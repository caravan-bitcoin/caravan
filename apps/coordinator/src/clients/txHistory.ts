import { useQuery } from "@tanstack/react-query";
import { useSelector } from "react-redux";
import { useMemo } from "react";
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

  const query = useQuery({
    queryKey: [...transactionKeys.confirmedHistory(), addressesKey],
    queryFn: async () => {
      if (currentAddresses.length === 0) {
        return [];
      }
      // So we fetch all transactions in one call and let the blockchain client handle this efficiently
      const rawTransactions =
        await blockchainClient.getAddressTransactionHistory(
          currentAddresses,
          MAX_TRANSACTIONS_TO_FETCH,
          0,
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
      return selectProcessedTransactions(
        rawTransactions,
        walletAddresses,
        "confirmed",
      );
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
