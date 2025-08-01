import { useQueries, useQuery } from "@tanstack/react-query";
import { useSelector } from "react-redux";
import {
  BlockchainClient,
  TransactionDetails,
  WalletTransactionDetails,
} from "@caravan/clients";
import {
  getPendingTransactionIds,
  getWalletAddresses,
  Slice,
} from "selectors/wallet";
import { calculateTransactionValue } from "utils/transactionCalculations";
import { useGetClient } from "hooks/client";
import { bitcoinsToSatoshis } from "@caravan/bitcoin";

// Centralized query key factory for all transaction-related queries
export const transactionKeys = {
  all: ["transactions"] as const,
  tx: (txid: string) => [...transactionKeys.all, txid] as const,
  pending: () => [...transactionKeys.all, "pending"] as const,
  txWithHex: (txid: string) =>
    [...transactionKeys.all, txid, "withHex"] as const,
  coins: (txid: string) => [...transactionKeys.all, txid, "coins"] as const,
  walletHistory: (count: number, skip: number) =>
    [...transactionKeys.all, "walletHistory", count, skip] as const,
  addressHistory: (addresses: string[], count: number, skip: number) =>
    [
      ...transactionKeys.all,
      "addressHistory",
      addresses.sort().join(","),
      count,
      skip,
    ] as const,
  completed: (count: number, skip: number) =>
    [...transactionKeys.all, "completed", count, skip] as const,
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

/**
 * Processes raw transaction data by adding wallet-specific context and filtering.
 *
 * This function works with transactions from both private clients (wallet history)
 * and public clients (address history), as both return WalletTransactionDetails[].
 *
 * @param transactions - Raw transactions from either wallet or address history
 * @param walletAddresses - Addresses belonging to this wallet for value calculation
 * @param onlyConfirmed - Whether to filter out unconfirmed transactions
 * @returns Processed transactions with wallet context (value, direction, etc.)
 */
export const processTransactionsWithWalletContext = (
  transactions: WalletTransactionDetails[],
  walletAddresses: string[],
  onlyConfirmed: boolean = false,
): TransactionDetails[] => {
  // Filter by confirmation status if requested
  const filteredTransactions = onlyConfirmed
    ? transactions.filter((tx) => tx.status?.confirmed === true)
    : transactions;

  // Add wallet-specific context to each transaction
  return filteredTransactions.map((tx) => {
    const valueToWallet = calculateTransactionValue(tx, walletAddresses);

    return {
      ...tx,
      valueToWallet,
      isReceived:
        tx.isReceived !== undefined ? tx.isReceived : valueToWallet > 0,
    };
  });
};

export const useFetchTransactionDetails = (txid: string) => {
  const blockchainClient = useGetClient();
  return useQuery({
    queryKey: transactionKeys.tx(txid),
    queryFn: () => fetchTransactionDetails(txid, blockchainClient),
    enabled: !!blockchainClient && !!txid,
  });
};

// Hook for fetching all pending transactions
const useFetchPendingTransactions = () => {
  const pendingTransactionIds = useSelector(getPendingTransactionIds);
  const blockchainClient = useGetClient();

  return useQueries({
    queries: pendingTransactionIds.map((txid) => ({
      queryKey: transactionKeys.tx(txid),
      queryFn: () => fetchTransactionDetails(txid, blockchainClient),
      enabled: !!blockchainClient && !!txid,
    })),
  });
};

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

// Hook for processed pending transactions with calculated values
export const usePendingTransactions = () => {
  const walletAddresses = useSelector(getWalletAddresses);
  const transactionQueries = useFetchPendingTransactions();

  // Calculate loading and error states
  const isLoading = transactionQueries.some((query) => query.isLoading);
  const error = transactionQueries.find((query) => query.error)?.error;

  // Process transactions with wallet context and filter out confirmed ones
  // Note: This works for both private and public clients since getTransaction()
  // is available on both client types
  const transactions = processTransactionsWithWalletContext(
    transactionQueries
      .filter((query) => query.data && !query.data.status?.confirmed)
      .map((query) => query.data!),
    walletAddresses,
  );

  return {
    transactions,
    isLoading,
    error,
    refetch: () => {
      transactionQueries.forEach((query) => query.refetch());
    },
  };
};

// TanStack Query hook for wallet transaction history (private clients)
export const useWalletTransactionHistory = (count: number, skip: number) => {
  const blockchainClient = useGetClient();

  return useQuery({
    queryKey: transactionKeys.walletHistory(count, skip),
    queryFn: async (): Promise<WalletTransactionDetails[]> => {
      if (!blockchainClient) {
        throw new Error("No blockchain client available");
      }
      return await blockchainClient.getWalletTransactionHistory(count, skip);
    },
    enabled: !!blockchainClient,
  });
};

// TanStack Query hook for address transaction history (public clients)
export const useAddressTransactionHistory = (
  addresses: string[],
  count: number,
  skip: number,
) => {
  const blockchainClient = useGetClient();

  return useQuery({
    queryKey: transactionKeys.addressHistory(addresses, count, skip),
    queryFn: async (): Promise<WalletTransactionDetails[]> => {
      if (!blockchainClient) {
        throw new Error("No blockchain client available");
      }

      if (addresses.length === 0) {
        return [];
      }

      return await blockchainClient.getAddressTransactionHistory(
        addresses,
        count,
        skip,
      );
    },
    enabled: !!blockchainClient && addresses.length > 0,
  });
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
) => {
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
