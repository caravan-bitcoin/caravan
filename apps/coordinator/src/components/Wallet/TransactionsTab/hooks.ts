import { useState, useEffect, useCallback } from "react";
import { useSelector } from "react-redux";
import { blockExplorerTransactionURL } from "@caravan/bitcoin";
import { Transaction, SortDirection, SortBy } from "./types";
import { useGetClient } from "../../../hooks/client";

/**
 * Custom hook to manage transaction fetching and state
 */
export const useFetchTransactions = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(true);

  // Use selectors to get state from Redux store
  const deposits = useSelector((state: any) => state.wallet.deposits);
  const change = useSelector((state: any) => state.wallet.change);

  const blockchainClient = useGetClient();

  // Helper function to fetch individual transaction details
  const fetchTransactionDetails = async (txid: string) => {
    try {
      if (!blockchainClient) {
        throw new Error("No blockchain client available");
      }
      return await blockchainClient.getTransaction(txid);
    } catch (err) {
      console.error(`Error fetching tx ${txid}:`, err);
      return null;
    }
  };

  // Fetch transactions
  const fetchTransactions = useCallback(async () => {
    if (!mounted) return;

    setIsLoading(true);
    setError(null);

    try {
      if (!blockchainClient) {
        throw new Error("No blockchain client available");
      }

      // Set to store transaction IDs
      const txids = new Set<string>();

      // As some addresses can belong to UTXO's that no longer belong to the wallet so we separate addresses with active UTXOs and spent UTXOs
      const addressesWithActiveUTXOs = new Set<string>();
      const addressesWithSpentUTXOs = new Set<string>();

      // Track which transactions are from spent UTXOs
      const spentTxids = new Set<string>();

      //Now we process all nodes to categorize addresses
      [
        ...Object.values(deposits.nodes),
        ...Object.values(change.nodes),
      ].forEach((node: any) => {
        if (node && node.multisig && node.multisig.address) {
          if (node.utxos && node.utxos.length > 0) {
            // Address has active UTXOs
            addressesWithActiveUTXOs.add(node.multisig.address);

            // Add transaction IDs from active UTXOs
            node.utxos.forEach((utxo: any) => {
              if (utxo.txid) txids.add(utxo.txid);
            });
          } else if (node.addressUsed) {
            // Address has been used but has no UTXOs (spent)
            addressesWithSpentUTXOs.add(node.multisig.address);
          }
        }
      });

      // Only fetch transaction history for addresses with spent UTXOs
      for (const address of addressesWithSpentUTXOs) {
        try {
          const txHistory =
            await blockchainClient.getAddressTransactions(address);
          txHistory.forEach((tx) => {
            txids.add(tx.txid);
            // Mark this transaction as coming from a spent UTXO needed to tag spent TX's in tableRow
            spentTxids.add(tx.txid);
          });
        } catch (err) {
          console.error(`Error fetching history for address ${address}:`, err);
        }
      }

      // Fetch transaction details in parallel
      const txPromises = Array.from(txids).map((txid) =>
        fetchTransactionDetails(txid),
      );

      const txDetails = await Promise.all(txPromises);

      if (mounted) {
        setTransactions(
          txDetails.filter((tx): tx is Transaction => tx !== null),
        );
        setError(null);
      }
    } catch (err) {
      if (mounted) {
        setError((err as Error).message);
      }
    } finally {
      if (mounted) {
        setIsLoading(false);
      }
    }
  }, [blockchainClient, deposits.nodes, change.nodes, mounted]);

  // Initialize and clean up
  useEffect(() => {
    fetchTransactions();

    return () => {
      setMounted(false);
    };
  }, [fetchTransactions]);

  return {
    transactions,
    isLoading,
    error,
    fetchTransactions,
  };
};

/**
 * Custom hook to manage transaction sorting
 */
export const useSortedTransactions = (transactions: Transaction[]) => {
  const [sortBy, setSortBy] = useState<SortBy>("blockTime");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  // Handle sorting
  const handleSort = (property: SortBy) => {
    const isAsc = sortBy === property && sortDirection === "asc";
    setSortDirection(isAsc ? "desc" : "asc");
    setSortBy(property);
  };

  // Sort transactions
  const getSortedTransactions = useCallback(
    (txs: Transaction[]) => {
      return [...txs].sort((a, b) => {
        // Handle different sorting properties
        let comparison = 0;

        if (sortBy === "blockTime") {
          comparison = (a.status.blockTime || 0) - (b.status.blockTime || 0);
        } else if (sortBy === "size") {
          comparison = a.size - b.size;
        } else if (sortBy === "fee") {
          comparison = (a.fee || 0) - (b.fee || 0);
        } else {
          // For any other property that might be sortable
          const aValue = a[sortBy as keyof Transaction];
          const bValue = b[sortBy as keyof Transaction];

          if (typeof aValue === "number" && typeof bValue === "number") {
            comparison = aValue - bValue;
          } else if (typeof aValue === "string" && typeof bValue === "string") {
            comparison = aValue.localeCompare(bValue);
          }
        }

        return sortDirection === "desc" ? -comparison : comparison;
      });
    },
    [sortBy, sortDirection],
  );

  // Split and sort transactions
  const pendingTxs = getSortedTransactions(
    transactions.filter((tx) => !tx.status.confirmed),
  );
  const confirmedTxs = getSortedTransactions(
    transactions.filter((tx) => tx.status.confirmed),
  );

  return {
    sortBy,
    sortDirection,
    handleSort,
    pendingTxs,
    confirmedTxs,
  };
};

/**
 * Custom hook to manage pagination
 */
export const usePagination = (totalItems: number) => {
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(5);

  // Reset page when total items changes
  useEffect(() => {
    setPage(1);
  }, [totalItems]);

  // Get current page items
  const getCurrentPageItems = useCallback(
    <T>(items: T[]) => {
      const startIndex = (page - 1) * rowsPerPage;
      return items.slice(startIndex, startIndex + rowsPerPage);
    },
    [page, rowsPerPage],
  );

  // Calculate total pages
  const totalPages = Math.ceil(totalItems / rowsPerPage);

  // Handle page change
  const handlePageChange = (
    _event: React.ChangeEvent<unknown>,
    newPage: number,
  ) => {
    setPage(newPage);
  };

  // Handle rows per page change
  const handleRowsPerPageChange = (event: { target: { value: string } }) => {
    setRowsPerPage(Number(event.target.value));
    setPage(1); // Reset to first page when changing rows per page
  };

  return {
    page,
    rowsPerPage,
    totalPages,
    getCurrentPageItems,
    handlePageChange,
    handleRowsPerPageChange,
  };
};

/**
 * Custom hook to handle clicking on transaction links
 */
export const useHandleExplorerLinkClick = () => {
  const network = useSelector((state: any) => state.settings.network);
  const client = useSelector((state: any) => state.client);

  return useCallback(
    (txid: string) => {
      // Check if user is using a private node
      const isPrivateNode = client.type === "private";

      if (isPrivateNode) {
        // If using private node, warn about privacy implications
        const confirmed = window.confirm(
          "Opening in a block explorer may expose your wallet activity to third parties. Continue?",
        );
        if (!confirmed) return;
      }

      // Determine which block explorer to use based on the blockchain client type
      let explorerUrl = blockExplorerTransactionURL(txid, network);

      if (client.blockchainClient?.type) {
        const clientType = client.blockchainClient.type;
        if (clientType === "mempool") {
          explorerUrl = `https://${network === "mainnet" ? "" : "testnet."}mempool.space/tx/${txid}`;
        } else if (clientType === "blockstream") {
          explorerUrl = `https://blockstream.info/${network === "mainnet" ? "" : "testnet/"}tx/${txid}`;
        }
      }

      window.open(explorerUrl, "_blank");
    },
    [network, client],
  );
};
