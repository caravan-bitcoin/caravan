import { useQueries, useQuery } from "@tanstack/react-query";
import { useSelector } from "react-redux";
import { BlockchainClient, TransactionDetails } from "@caravan/clients";
import {
  getPendingTransactionIds,
  getWalletAddresses,
  Slice,
} from "selectors/wallet";
import { calculateTransactionValue } from "utils/transactionCalculations";
import { useGetClient } from "hooks/client";
import { bitcoinsToSatoshis } from "@caravan/bitcoin";

// Query key factory for pending transactions
const transactionKeys = {
  all: ["transactions"] as const,
  tx: (txid: string) => [...transactionKeys.all, txid] as const,
  pending: () => [...transactionKeys.all, "pending"] as const,
  pendingTx: (txid: string) => [...transactionKeys.pending(), txid],
  // fees for pending transaction
  pendingTxFee: (txid: string) => [...transactionKeys.pendingTx(txid), "fee"],
  txWithHex: (txid: string) =>
    [...transactionKeys.all, txid, "withHex"] as const,
  // all the coins for a given transaction
  coins: (txid: string) => [...transactionKeys.all, txid, "coins"] as const,
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

export const useFetchTransactionDetails = (txid: string) => {
  const blockchainClient = useGetClient();
  return useQuery({
    queryKey: transactionKeys.tx(txid),
    queryFn: () => fetchTransactionDetails(txid, blockchainClient),
    enabled: !!blockchainClient && !!txid,
  });
};

// Service function for fetching pending transaction fees
const fetchPendingTransactionFee = async (
  txid: string,
  client: BlockchainClient,
) => {
  if (!client) {
    throw new Error("No blockchain client available");
  }
  return await client.getFeesForPendingTransaction(txid);
};

export const useFetchPendingFeesForTxids = (txids: string[]) => {
  const blockchainClient = useGetClient();
  const feeQueries = useQueries({
    queries: txids.map((txid) => ({
      queryKey: transactionKeys.pendingTxFee(txid),
      queryFn: () => fetchPendingTransactionFee(txid, blockchainClient!),
      enabled: !!blockchainClient && !!txid,
    })),
  });

  // Build a map: txid → fee (string or null)
  const feeMap = new Map<string, string | null>();
  txids.forEach((txid, i) => {
    console.log("test", feeQueries[i].data, txid);
    feeMap.set(txid, feeQueries[i].data ?? null);
  });

  return {
    feeMap,
    isLoading: feeQueries.some((q) => q.isLoading),
    error: feeQueries.find((q) => q.error)?.error,
    refetchAll: () => feeQueries.forEach((q) => q.refetch()),
  };
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

  // Process transactions with calculated values and filter out confirmed ones
  const pendingTransactions = transactionQueries
    .filter((query) => query.data && !query.data.status?.confirmed)
    .map((query) => query.data!);

  // Now we find the txid which we recieved without any fees-field
  const missingFeeTxids = pendingTransactions
    .filter((txid) => !txid.fee)
    .map((tx) => tx.txid);

  const {
    feeMap,
    isLoading: feesLoading,
    error: feesError,
    refetchAll: refetchFees,
  } = useFetchPendingFeesForTxids(missingFeeTxids);

  const transactions = pendingTransactions.map((tx) => {
    const fee = tx.fee || Number(feeMap.get(tx.txid)) || 0;

    return {
      ...tx,
      fee,
      valueToWallet: calculateTransactionValue(tx, walletAddresses),
      isReceived:
        tx.isReceived !== undefined
          ? tx.isReceived
          : calculateTransactionValue(tx, walletAddresses) > 0,
    };
  });

  return {
    transactions,
    isLoading: isLoading || feesLoading,
    error: error || feesError,
    refetch: () => {
      // Refetch all transaction queries
      transactionQueries.forEach((query) => query.refetch());
      refetchFees();
    },
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
