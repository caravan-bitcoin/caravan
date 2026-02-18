import { useQuery, useQueryClient, useQueries } from "@tanstack/react-query";
import { useSelector } from "react-redux";
import { useMemo, useEffect } from "react";
import { BlockchainClient, TransactionDetails } from "@caravan/clients";
import {
  getWalletAddresses,
  getSpentSlices,
  Slice,
  SliceWithLastUsed,
  WalletState,
  selectProcessedTransactions,
} from "selectors/wallet";
import { calculateTransactionValue } from "utils/transactionCalculations";
import { useGetClient } from "hooks/client";
import { bitcoinsToSatoshis } from "@caravan/bitcoin";

const MAX_TRANSACTIONS_TO_FETCH = 500;

// Centralized query key factory for all transaction-related queries
export const transactionKeys = {
  all: ["transactions"] as const,
  tx: (txid: string) => [...transactionKeys.all, txid] as const,
  pending: () => [...transactionKeys.all, "pending"] as const,
  pendingHistory: () => [...transactionKeys.all, "pending", "history"] as const,
  txWithHex: (txid: string) =>
    [...transactionKeys.all, txid, "withHex"] as const,
  coins: (txid: string) => [...transactionKeys.all, txid, "coins"] as const,
  confirmedHistory: () =>
    [...transactionKeys.all, "confirmed", "history"] as const,
};

// Service function for fetching transaction details
const fetchTransactionDetails = async (
  txid: string,
  client: BlockchainClient,
): Promise<TransactionDetails> => {
  if (!client) {
    throw new Error("No blockchain client available");
  }
  return await client.getTransaction(txid);
};

// Basic hook for fetching single transaction details
export const useFetchTransactionDetails = (txid: string) => {
  const blockchainClient = useGetClient();
  return useQuery({
    queryKey: transactionKeys.tx(txid),
    queryFn: () => fetchTransactionDetails(txid, blockchainClient),
    enabled: !!blockchainClient && !!txid,
  });
};

// Hook for fetching transactions with their hex data
export const useTransactionsWithHex = (txids: string[]) => {
  const blockchainClient = useGetClient();
  return useQueries({
    queries: txids.map((txid) => ({
      queryKey: transactionKeys.txWithHex(txid),
      queryFn: async () => {
        const [transaction, transactionHex] = await Promise.all([
          blockchainClient.getTransaction(txid),
          blockchainClient.getTransactionHex(txid),
        ]);

        return { txid, transaction, transactionHex };
      },
      enabled: !!txid,
    })),
  });
};

// Basic hook for raw pending transactions (no processing)
export const usePublicClientPendingTransactions = () => {
  const blockchainClient = useGetClient();
  const clientType = blockchainClient?.type;
  const queryClient = useQueryClient();

  const walletAddresses = useSelector(getWalletAddresses);
  const spentSlices = useSelector(getSpentSlices) as SliceWithLastUsed[];

  const currentAddresses = useMemo(() => {
    const spentAddresses =
      spentSlices
        ?.map((slice: SliceWithLastUsed) => slice.multisig?.address)
        .filter(Boolean) || [];
    return walletAddresses.length > 0 ? walletAddresses : spentAddresses;
  }, [walletAddresses, spentSlices]);

  useEffect(() => {
    if (currentAddresses.length > 0 && clientType === "public") {
      queryClient.invalidateQueries({
        queryKey: transactionKeys.pendingHistory(),
      });
    }
  }, [currentAddresses.length, clientType, queryClient]);

  return useQuery({
    queryKey: transactionKeys.pendingHistory(),
    queryFn: async () => {
      const rawTransactions =
        await blockchainClient.getAddressTransactionHistory(
          currentAddresses,
          MAX_TRANSACTIONS_TO_FETCH,
          0,
        );

      const pendingTx = selectProcessedTransactions(
        rawTransactions,
        walletAddresses,
        "pending",
      );

      const seenTxids = new Set<string>();
      const deduplicated = pendingTx.filter((tx) => {
        if (seenTxids.has(tx.txid)) return false;
        seenTxids.add(tx.txid);
        return true;
      });

      return deduplicated.map((tx) => ({
        ...tx,
        valueToWallet: calculateTransactionValue(tx, walletAddresses),
      }));
    },
    enabled:
      !!blockchainClient &&
      clientType === "public" &&
      currentAddresses.length > 0,
    staleTime: 10000, // 10 seconds
    refetchInterval: 30000, // 30 seconds
  });
};

export const usePrivateClientPendingTransactions = () => {
  const blockchainClient = useGetClient();
  const walletAddresses = useSelector(getWalletAddresses);
  const clientType = blockchainClient?.type;
  const queryClient = useQueryClient();

  useEffect(() => {
    if (clientType === "private" && blockchainClient) {
      queryClient.invalidateQueries({
        queryKey: transactionKeys.pendingHistory(),
      });
    }
  }, [walletAddresses.length, clientType, queryClient, blockchainClient]);

  return useQuery({
    queryKey: transactionKeys.pendingHistory(),
    queryFn: async () => {
      const rawTransactions =
        await blockchainClient.getWalletTransactionHistory(
          MAX_TRANSACTIONS_TO_FETCH,
          0,
        );

      const pendingTx = selectProcessedTransactions(
        rawTransactions,
        walletAddresses,
        "pending",
      );

      const seenTxids = new Set<string>();
      const deduplicated = pendingTx.filter((tx) => {
        if (seenTxids.has(tx.txid)) return false;
        seenTxids.add(tx.txid);
        return true;
      });

      return deduplicated.map((tx) => ({
        ...tx,
        valueToWallet: calculateTransactionValue(tx, walletAddresses),
      }));
    },
    enabled: !!blockchainClient && clientType === "private",
    staleTime: 10000,
    refetchInterval: 30000,
  });
};

export const usePendingTransactions = () => {
  const clientType = useSelector((state: WalletState) => state.client.type);
  const privateQuery = usePrivateClientPendingTransactions();
  const publicQuery = usePublicClientPendingTransactions();

  const query = clientType === "private" ? privateQuery : publicQuery;

  return {
    transactions: query.data || [],
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
};

export interface Coin {
  prevTxId: string;
  vout: number;
  address: string;
  value: string;
  prevTxHex: string;
  slice?: Slice;
}

// Service function for fetching transaction coins (spendable outputs from prev txs)
export const fetchTransactionCoins = async (
  txid: string,
  client: BlockchainClient,
): Promise<Map<string, Coin>> => {
  const transaction = await client.getTransaction(txid);
  const coins = new Map<string, Coin>();

  for (const input of transaction.vin) {
    const { txid, vout } = input;

    // Skip if we don't have valid identifiers
    if (!txid || vout === undefined) continue;
    const coinId = `${txid}:${vout}`;

    const [prevTxHex, prevTx] = await Promise.all([
      client.getTransactionHex(txid),
      client.getTransaction(txid),
    ]);

    if (!prevTx || !prevTxHex) {
      throw new Error(
        `Failed to fetch prev tx info for input ${coinId}. Are you sure the transaction was sent from this wallet?`,
      );
    }

    const coinAddress = prevTx.vout[vout].scriptPubkeyAddress;
    const coinValue = bitcoinsToSatoshis(prevTx.vout[vout].value.toString());

    if (!coinAddress) {
      throw new Error(`Failed to fetch coin address for input ${coinId}.`);
    }

    coins.set(coinAddress, {
      prevTxId: txid,
      vout,
      address: coinAddress,
      value: coinValue,
      prevTxHex,
    });
  }
  return coins;
};
