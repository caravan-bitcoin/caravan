import { useQuery } from "@tanstack/react-query";
import { useSelector } from "react-redux";
import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { TransactionDetails } from "@caravan/clients";
import {
  getWalletAddresses,
  getSpentSlices,
  SliceWithLastUsed,
  WalletState,
} from "selectors/wallet";
import { dustAnalysis, privacyAnalysis } from "utils/transactionAnalysisUtils";
import type { MultisigAddressType } from "@caravan/bitcoin";
import { useGetClient } from "hooks/client";
import {
  transactionKeys,
  processTransactionsWithWalletData,
} from "clients/transactions";

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

// PRIVATE CLIENT HOOKS - Only for wallet-based queries
export const usePrivateClientTransactions = (
  count: number = 10,
  skip: number = 0,
) => {
  const blockchainClient = useGetClient();
  const walletAddresses = useSelector(getWalletAddresses);
  const clientType = useSelector((state: WalletState) => state.client.type);

  return useQuery({
    queryKey: transactionKeys.walletHistory(count, skip),
    queryFn: async (): Promise<TransactionDetails[]> => {
      if (!blockchainClient) {
        throw new Error("No blockchain client available");
      }

      const rawTransactions =
        await blockchainClient.getWalletTransactionHistory(count, skip);

      return processTransactionsWithWalletData(
        rawTransactions,
        walletAddresses,
        true, // filter confirmed transactions only
      );
    },
    enabled: !!blockchainClient && clientType === "private",
  });
};

export const usePrivateClientTransactionsWithLoadMore = (
  pageSize: number = 100,
) => {
  const blockchainClient = useGetClient();
  const walletAddresses = useSelector(getWalletAddresses);
  const clientType = useSelector((state: WalletState) => state.client.type);

  // State for managing loaded transactions and pagination
  const [allTransactions, setAllTransactions] = useState<TransactionDetails[]>(
    [],
  );
  const [currentOffset, setCurrentOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  const { isLoading, error, isFetching, refetch } = useQuery(
    transactionKeys.completed(pageSize, currentOffset),
    async (): Promise<TransactionDetails[]> => {
      if (!blockchainClient) {
        throw new Error("No blockchain client available");
      }

      const rawTransactions =
        await blockchainClient.getWalletTransactionHistory(
          pageSize,
          currentOffset,
        );

      const processedTransactions = processTransactionsWithWalletData(
        rawTransactions,
        walletAddresses,
        true, // filter confirmed transactions only
      );

      setHasMore(processedTransactions.length === pageSize);
      return processedTransactions;
    },
    {
      enabled: !!blockchainClient && clientType === "private",
      onSuccess: (newTransactions) => {
        if (currentOffset === 0) {
          setAllTransactions(newTransactions);
        } else {
          setAllTransactions((prev) => {
            const existingTxIds = new Set(prev.map((tx) => tx.txid));
            const uniqueNewTransactions = newTransactions.filter(
              (tx) => !existingTxIds.has(tx.txid),
            );
            return [...prev, ...uniqueNewTransactions];
          });
        }
      },
    },
  );

  // Reset state when client changes
  const isInitialMount = useRef(true);
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    setCurrentOffset(0);
    setAllTransactions([]);
    setHasMore(true);
  }, [blockchainClient]);

  const loadMore = useCallback(() => {
    if (!isFetching && hasMore) {
      setCurrentOffset(currentOffset + pageSize);
    }
  }, [isFetching, hasMore, currentOffset, pageSize]);

  const reset = useCallback(() => {
    setCurrentOffset(0);
    setAllTransactions([]);
    setHasMore(true);
    refetch();
  }, [refetch]);

  return {
    data: allTransactions,
    isLoading: isLoading && currentOffset === 0,
    isLoadingMore: isFetching && currentOffset > 0,
    error,
    hasMore,
    loadMore,
    reset,
    refetch,
    totalLoaded: allTransactions.length,
  };
};

// PUBLIC CLIENT HOOKS - Only for address-based queries
export const usePublicClientTransactions = (
  count: number = 10,
  skip: number = 0,
) => {
  const blockchainClient = useGetClient();
  const walletAddresses = useSelector(getWalletAddresses);
  const clientType = useSelector((state: WalletState) => state.client.type);

  // Get spent addresses as fallback
  const spentSlices = useSelector(getSpentSlices) as SliceWithLastUsed[];
  const spentAddresses = spentSlices.map(
    (slice: SliceWithLastUsed) => slice.multisig.address,
  );

  const addressesToQuery =
    walletAddresses.length > 0 ? walletAddresses : spentAddresses;

  return useQuery({
    queryKey: transactionKeys.addressHistory(addressesToQuery, count, skip),
    queryFn: async (): Promise<TransactionDetails[]> => {
      if (!blockchainClient) {
        throw new Error("No blockchain client available");
      }

      if (addressesToQuery.length === 0) {
        return [];
      }

      const rawTransactions =
        await blockchainClient.getAddressTransactionHistory(
          addressesToQuery,
          count,
          skip,
        );

      return processTransactionsWithWalletData(
        rawTransactions,
        walletAddresses,
        true, // filter confirmed transactions only
      );
    },
    enabled:
      !!blockchainClient &&
      clientType === "public" &&
      addressesToQuery.length > 0,
  });
};

export const usePublicClientTransactionsWithLoadMore = (
  pageSize: number = 100,
) => {
  const blockchainClient = useGetClient();
  const walletAddresses = useSelector(getWalletAddresses);
  const clientType = useSelector((state: WalletState) => state.client.type);

  // Get spent addresses as fallback
  const spentSlices = useSelector(getSpentSlices) as SliceWithLastUsed[];
  const spentAddresses = spentSlices.map(
    (slice: SliceWithLastUsed) => slice.multisig.address,
  );

  const addressesToQuery =
    walletAddresses.length > 0 ? walletAddresses : spentAddresses;

  // State for managing loaded transactions and pagination
  const [allTransactions, setAllTransactions] = useState<TransactionDetails[]>(
    [],
  );
  const [currentOffset, setCurrentOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  const { isLoading, error, isFetching, refetch } = useQuery(
    transactionKeys.completed(pageSize, currentOffset),
    async (): Promise<TransactionDetails[]> => {
      if (!blockchainClient) {
        throw new Error("No blockchain client available");
      }

      if (addressesToQuery.length === 0) {
        console.warn("No addresses available to query for transaction history");
        return [];
      }

      try {
        const rawTransactions =
          await blockchainClient.getAddressTransactionHistory(
            addressesToQuery,
            pageSize,
            currentOffset,
          );

        const processedTransactions = processTransactionsWithWalletData(
          rawTransactions,
          walletAddresses,
          true, // filter confirmed transactions only
        );

        setHasMore(processedTransactions.length === pageSize);
        return processedTransactions;
      } catch (error) {
        console.error("Error fetching address transaction history:", error);
        // Fallback: if querying all addresses fails, try just spent addresses
        if (spentAddresses.length > 0 && walletAddresses.length > 0) {
          const rawTransactions =
            await blockchainClient.getAddressTransactionHistory(
              spentAddresses,
              pageSize,
              currentOffset,
            );

          const processedTransactions = processTransactionsWithWalletData(
            rawTransactions,
            walletAddresses,
            true,
          );

          setHasMore(processedTransactions.length === pageSize);
          return processedTransactions;
        }
        throw error;
      }
    },
    {
      enabled:
        !!blockchainClient &&
        clientType === "public" &&
        addressesToQuery.length > 0,
      onSuccess: (newTransactions) => {
        if (currentOffset === 0) {
          setAllTransactions(newTransactions);
        } else {
          setAllTransactions((prev) => {
            const existingTxIds = new Set(prev.map((tx) => tx.txid));
            const uniqueNewTransactions = newTransactions.filter(
              (tx) => !existingTxIds.has(tx.txid),
            );
            return [...prev, ...uniqueNewTransactions];
          });
        }
      },
    },
  );

  // Reset state when addresses or client changes
  const isInitialMount = useRef(true);
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    setCurrentOffset(0);
    setAllTransactions([]);
    setHasMore(true);
  }, [blockchainClient, addressesToQuery.length]);

  const loadMore = useCallback(() => {
    if (!isFetching && hasMore) {
      setCurrentOffset(currentOffset + pageSize);
    }
  }, [isFetching, hasMore, currentOffset, pageSize]);

  const reset = useCallback(() => {
    setCurrentOffset(0);
    setAllTransactions([]);
    setHasMore(true);
    refetch();
  }, [refetch]);

  return {
    data: allTransactions,
    isLoading: isLoading && currentOffset === 0,
    isLoadingMore: isFetching && currentOffset > 0,
    error,
    hasMore,
    loadMore,
    reset,
    refetch,
    totalLoaded: allTransactions.length,
  };
};

// UNIFIED HOOKS - Smart hooks that choose the right implementation based on client type
export const useCompletedTransactions = (
  count: number = 10,
  skip: number = 0,
) => {
  const clientType = useSelector((state: WalletState) => state.client.type);

  const privateQuery = usePrivateClientTransactions(count, skip);
  const publicQuery = usePublicClientTransactions(count, skip);

  // Return the appropriate query based on client type
  // The unused query will just be disabled via the `enabled` condition in each hook
  return clientType === "private" ? privateQuery : publicQuery;
};

export const useCompletedTransactionsWithLoadMore = (
  pageSize: number = 100,
) => {
  const clientType = useSelector((state: WalletState) => state.client.type);

  const privateQuery = usePrivateClientTransactionsWithLoadMore(pageSize);
  const publicQuery = usePublicClientTransactionsWithLoadMore(pageSize);

  // Return the appropriate query based on client type
  // The unused query will just be disabled via the `enabled` condition in each hook
  return clientType === "private" ? privateQuery : publicQuery;
};
