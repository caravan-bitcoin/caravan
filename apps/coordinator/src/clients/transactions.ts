import { useQuery, useQueries } from "@tanstack/react-query";
import { BlockchainClient, TransactionDetails } from "@caravan/clients";
import { Slice } from "selectors/wallet";
import { useGetClient } from "hooks/client";
import { bitcoinsToSatoshis } from "@caravan/bitcoin";
import { Transaction } from "bitcoinjs-lib";
import { Buffer } from "buffer";

// Centralized query key factory for all transaction-related queries
export const transactionKeys = {
  all: ["transactions"] as const,
  tx: (txid: string) => [...transactionKeys.all, txid] as const,
  txWithHex: (txid: string) =>
    [...transactionKeys.all, txid, "withHex"] as const,
  coins: (txid: string) => [...transactionKeys.all, txid, "coins"] as const,
  confirmedHistory: () => [...transactionKeys.all, "confirmed"] as const,
  pendingHistory: () => [...transactionKeys.all, "unconfirmed"] as const,
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

export interface Coin {
  prevTxId: string;
  vout: number;
  address: string;
  value: string;
  prevTxHex: string;
  slice?: Slice;
}

/** Fetch the previous-output amounts needed to verify SegWit signatures. */
export const fetchTransactionInputAmountsSats = async (
  transactionHex: string,
  client: BlockchainClient,
): Promise<Array<number | null>> => {
  const transaction = Transaction.fromHex(transactionHex);

  return Promise.all(
    transaction.ins.map(async (input) => {
      // P2WPKH and key-path Taproot witnesses cannot contain multisig scripts.
      if (input.witness.length < 3) return null;

      const previousTxId = Buffer.from(input.hash).reverse().toString("hex");
      const previousTransaction = await client.getTransaction(previousTxId);
      const previousOutput = previousTransaction.vout[input.index];
      if (!previousOutput) {
        throw new Error(
          `Could not find output ${input.index} of ${previousTxId}.`,
        );
      }

      return Number(bitcoinsToSatoshis(previousOutput.value).toString());
    }),
  );
};

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
