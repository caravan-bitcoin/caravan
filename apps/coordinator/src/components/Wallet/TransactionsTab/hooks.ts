import { useState, useEffect, useCallback, useMemo } from "react";
import { useSelector } from "react-redux";
import { Transaction, SortDirection, SortBy } from "./types";
import { getTransactionExplorerUrl } from "selectors/wallet";

/**
 * NOTE: This version only shows pending transactions
 *
 * We're currently only tracking pending (unconfirmed) transactions. This is because:
 *
 * - Once UTXOs are spent, their txid's disappear from the wallet state
 * - We'd need to query address histories for private clients, which has privacy issues
 * - We don't have a great way to track transaction history right now
 *
 * When we add confirmed transaction support later, we can create separate hooks
 * for confirmed transactions with their own sorting, pagination, and explorer link handling.
 */

/**
 * ==============================================================================
 * CUSTOM HOOKS
 * ==============================================================================
 */

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
          // Prefer vsize if available, fallback to size
          const aSize = a.vsize !== undefined ? a.vsize : a.size;
          const bSize = b.vsize !== undefined ? b.vsize : b.size;
          comparison = aSize - bSize;
        } else if (sortBy === "fee") {
          // Fee sorting with null/undefined fees handled
          const aFee =
            a.fee !== undefined ? (a.isReceived ? 0 : a.fee || 0) : 0;
          const bFee =
            b.fee !== undefined ? (b.isReceived ? 0 : b.fee || 0) : 0;
          comparison = aFee - bFee;
        } else if (sortBy === "valueToWallet") {
          // Value sorting
          const aValue = a.valueToWallet || 0;
          const bValue = b.valueToWallet || 0;
          comparison = aValue - bValue;
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

  // Sort transactions
  const sortedTransactions = getSortedTransactions(transactions);

  return {
    sortBy,
    sortDirection,
    handleSort,
    sortedTransactions,
  };
};

/**
 * Custom hook to manage pagination for transactions
 */
export const useTransactionPagination = (totalItems: number) => {
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

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
 * Custom hook to handle clicking on transaction explorer links
 */
export const useHandleTransactionExplorerLinkClick = () => {
  const client = useSelector((state: any) => state.client);
  const getExplorerUrl = useSelector(getTransactionExplorerUrl);
  const network = useSelector((state: any) => state.settings.network);

  return useCallback(
    (txid: string) => {
      const explorerUrl = getExplorerUrl(txid);

      // Handle regtest - no public explorer available
      if (network === "regtest" || !explorerUrl) {
        window.alert(
          `Transaction ID: ${txid}\n\nNo public block explorer is available for regtest networks. ` +
            `You can view this transaction in your local bitcoind using:\n` +
            `bitcoin-cli -regtest getrawtransaction ${txid} true`,
        );
        return;
      }

      // Check if user is using a private node
      const isPrivateNode = client.type === "private";

      if (isPrivateNode) {
        // If using private node, warn about privacy implications
        const confirmed = window.confirm(
          "Opening in a block explorer may expose your wallet activity to third parties. Continue?",
        );
        if (!confirmed) return;
      }

      window.open(explorerUrl, "_blank");
    },
    [client, network, getExplorerUrl],
  );
};

/**
 * Custom hook to manage transaction filtering by type
 */
export const useTransactionFilter = (transactions: Transaction[]) => {
  const [filterType, setFilterType] = useState<"all" | "received" | "sent">(
    "all",
  );

  const filteredTransactions = useMemo(() => {
    if (filterType === "all") return transactions;

    return transactions.filter((tx) => {
      if (filterType === "received") {
        return tx.isReceived === true;
      } else {
        // sent transactions
        return tx.isReceived === false || tx.isReceived === undefined;
      }
    });
  }, [transactions, filterType]);

  // Get counts for each filter type
  const counts = useMemo(
    () => ({
      all: transactions.length,
      received: transactions.filter((tx) => tx.isReceived === true).length,
      sent: transactions.filter(
        (tx) => tx.isReceived === false || tx.isReceived === undefined,
      ).length,
    }),
    [transactions],
  );

  return {
    filterType,
    setFilterType,
    filteredTransactions,
    counts,
  };
};
