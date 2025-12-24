import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useGetClient } from "hooks/client";
import { useCallback } from "react";

const TRANSACTION_DETAILS_KEY = "transaction-details";

/**
 * Hook to fetch full transaction details including prevout data.
 * This is used for the Transaction Flow Diagram where we need input values.
 *
 * For public clients (mempool.space), we fetch the raw transaction which includes
 * prevout data with input values and addresses.
 *
 * This is fetched on-demand (when user expands a transaction row) to avoid
 * the overhead of fetching prevout data for all transactions in the list.
 */
export const useTransactionDetails = (txid: string | null, enabled: boolean) => {
  const blockchainClient = useGetClient();

  return useQuery(
    [TRANSACTION_DETAILS_KEY, txid],
    async () => {
      if (!txid || !blockchainClient) return null;

      // For public clients, fetch directly from the API to get raw data with prevout
      if (blockchainClient.type === "public") {
        try {
          // Fetch raw transaction from mempool.space which includes prevout
          const response = await blockchainClient.Get(`/tx/${txid}`);
          return response;
        } catch (error) {
          console.error("Failed to fetch transaction details:", error);
          return null;
        }
      }

      // For private clients, use the standard getTransaction
      // (prevout data won't be available, but we handle that gracefully)
      try {
        const tx = await blockchainClient.getTransaction(txid);
        return tx;
      } catch (error) {
        console.error("Failed to fetch transaction details:", error);
        return null;
      }
    },
    {
      enabled: enabled && !!txid && !!blockchainClient,
      staleTime: 5 * 60 * 1000, // Cache for 5 minutes - transaction details don't change
      cacheTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
    },
  );
};

/**
 * Hook to prefetch transaction details on hover.
 * This makes the expand feel instant since data is already cached.
 */
export const usePrefetchTransactionDetails = () => {
  const queryClient = useQueryClient();
  const blockchainClient = useGetClient();

  const prefetch = useCallback(
    (txid: string) => {
      if (!txid || !blockchainClient) return;

      // Only prefetch if not already in cache
      const cached = queryClient.getQueryData([TRANSACTION_DETAILS_KEY, txid]);
      if (cached) return;

      queryClient.prefetchQuery(
        [TRANSACTION_DETAILS_KEY, txid],
        async () => {
          if (blockchainClient.type === "public") {
            try {
              return await blockchainClient.Get(`/tx/${txid}`);
            } catch {
              return null;
            }
          }
          try {
            return await blockchainClient.getTransaction(txid);
          } catch {
            return null;
          }
        },
        {
          staleTime: 5 * 60 * 1000,
          cacheTime: 10 * 60 * 1000,
        },
      );
    },
    [blockchainClient, queryClient],
  );

  return prefetch;
};

