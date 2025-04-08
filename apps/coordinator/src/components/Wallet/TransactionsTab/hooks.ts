import { useState, useEffect, useCallback, useMemo } from "react";
import { useSelector } from "react-redux";
import {
  blockExplorerTransactionURL,
  bitcoinsToSatoshis,
} from "@caravan/bitcoin";
import { Transaction, SortDirection, SortBy } from "./types";
import { useGetClient } from "../../../hooks/client";

/**
 * NOTE: This version only shows pending transactions
 *
 * We're currently only tracking pending (unconfirmed) transactions and have
 * commented out the code for confirmed/spent transactions. This is because:
 *
 * - Once UTXOs are spent, their txid's disappear from the wallet state
 * - We'd need to query address histories for private clients, which has privacy issues
 * - We don't have a great way to track transaction history right now
 *
 * The commented code is still here in case we figure out a better approach later.
 * For now, we're keeping it simple and just showing what's pending.
 */

/**
 * ==============================================================================
 * TRANSACTION VALUE CALCULATION HELPERS
 * ==============================================================================
 */

/**
 * Helper function to check if we have complete input data for a transaction
 */
const hasCompleteInputData = (tx: any): boolean => {
  if (!tx.vin || !Array.isArray(tx.vin)) return false;

  return tx.vin.every(
    (input: any) =>
      input.prevout && input.prevout.scriptpubkey_address !== undefined,
  );
};

/**
 * Calculate transaction value from transaction details (private client)
 * This gives the most accurate calculation as bitcoind provides detailed category information and amount field
 */
const calculateValueFromDetails = (details: any[]): number => {
  return details.reduce((valueToWallet, detail) => {
    const amountInSats = Number(bitcoinsToSatoshis(detail.amount));

    if (
      detail.category === "receive" ||
      detail.category === "generate" ||
      detail.category === "immature" ||
      detail.category === "send" // Amount is already negative for send
    ) {
      return valueToWallet + amountInSats;
    }

    return valueToWallet;
  }, 0);
};

/**
 * Convert output value to satoshis, handling both string and number formats
 */
const outputValueToSatoshis = (value: any): number => {
  if (typeof value === "undefined" || value === null) return 0;
  return Number(bitcoinsToSatoshis(value));
};

/**
 * Calculate value based on inputs and outputs when we have complete data
 */
const calculateValueFromCompleteData = (
  tx: any,
  walletAddresses: string[],
): number => {
  let walletInputsSum = 0;
  let totalChange = 0;

  // Sum all inputs from our wallet
  for (const input of tx.vin) {
    if (
      input.prevout &&
      input.prevout.scriptpubkey_address &&
      walletAddresses.includes(input.prevout.scriptpubkey_address)
    ) {
      walletInputsSum += outputValueToSatoshis(input.prevout.value);
    }
  }

  // Sum all outputs to our wallet
  for (const output of tx.vout) {
    const outputAddress = output.scriptPubkeyAddress;
    if (outputAddress && walletAddresses.includes(outputAddress)) {
      totalChange += outputValueToSatoshis(output.value);
    }
  }

  // Net value = outputs to wallet - inputs from wallet
  return totalChange - walletInputsSum;
};

/**
 * Estimate transaction value when we only have outputs (incomplete input data)
 */
const estimateValueFromOutputs = (
  tx: any,
  walletAddresses: string[],
  totalChange: number,
): number => {
  // If transaction is explicitly marked as received or we have outputs to our wallet addresses
  if (tx.isReceived === true || totalChange > 0) {
    return totalChange;
  }

  // If transaction is explicitly marked as sent
  if (tx.isReceived === false) {
    // At minimum, we spent the fee
    let spentAmount = tx.fee ? Number(bitcoinsToSatoshis(tx.fee)) : 0;

    // Add outputs to non-wallet addresses (funds leaving our wallet)
    for (const output of tx.vout) {
      const outputAddress = output.scriptPubkeyAddress;
      const outputValue = outputValueToSatoshis(output.value);

      // If this isn't a wallet address, we sent money to it
      if (outputAddress && !walletAddresses.includes(outputAddress)) {
        spentAmount += outputValue;
      }
    }

    // Value to wallet is negative spent amount
    return -spentAmount;
  }

  // If we can't determine direction, best guess is sum of outputs to our wallet
  return totalChange;
};

/**
 * Calculate wallet outputs sum for a transaction
 */
const calculatetotalChange = (tx: any, walletAddresses: string[]): number => {
  let totalChange = 0;

  if (!tx?.vout || !Array.isArray(tx.vout)) return 0;

  for (const output of tx.vout) {
    const outputAddress = output.scriptPubkeyAddress;
    if (outputAddress && walletAddresses.includes(outputAddress)) {
      totalChange += outputValueToSatoshis(output.value);
    }
  }

  return totalChange;
};

/**
 * ==============================================================================
 * WHY WE DON'T FETCH PREVIOUS TRANSACTIONS FOR INPUTS
 * ==============================================================================
 *
 * While it's technically possible to get more accurate data by looking up each input's
 * previous transaction, we don't implement this approach for several important reasons:
 *
 * 1. PERFORMANCE IMPACT: Each transaction with N inputs would require N additional
 *    API calls. For a transaction with 10 inputs, that's 10 more network requests.
 *
 * 2. RATE LIMITING: Public blockchain APIs typically have strict rate limits.
 *    This approach would quickly exhaust those limits, especially for wallets
 *    with many transactions.
 *
 * 3. USER EXPERIENCE: The transaction table would load much more slowly - potentially
 *    taking 5-10 seconds or more to display instead of near-instant loading.
 *
 * 4. RELIABILITY: If any of these additional lookups fail (timeouts, network issues),
 *    the calculations would be incomplete anyway.
 *
 * 5. PRIVACY: For private nodes, making these lookups means accessing transactions
 *    that might not be in your wallet, requiring txindex=1 (full transaction indexing)
 *    which many users don't enable.
 *
 * Instead, we use a combination of available data and heuristics to provide a good
 * estimate of transaction value without these additional network requests.
 */

/**
 * Calculate the net value of a transaction to the wallet
 * Returns value in satoshis (positive for incoming, negative for outgoing)
 */
const calculateTransactionValue = (
  tx: any,
  walletAddresses: string[],
): number => {
  // Skip calculation if tx is invalid
  if (!tx) return 0;

  // CASE 1: Private client with details array - most accurate calculation
  if (tx.details && Array.isArray(tx.details)) {
    return calculateValueFromDetails(tx.details);
  }

  // CASE 2: Public client or private client without details field
  if (tx.vin && tx.vout) {
    // Calculate sum of all outputs to wallet addresses
    const totalChange = calculatetotalChange(tx, walletAddresses);

    // If we have complete input data with prevout information
    if (hasCompleteInputData(tx)) {
      return calculateValueFromCompleteData(tx, walletAddresses);
    }

    // Otherwise estimate based on outputs and transaction direction
    return estimateValueFromOutputs(tx, walletAddresses, totalChange);
  }

  // CASE 3: Not enough data to calculate
  return 0;
};

/**
 * ==============================================================================
 * CUSTOM HOOKS
 * ==============================================================================
 */

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

  // Get wallet addresses
  const walletAddresses = useWalletAddresses();

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

      // Track addresses with active UTXOs only - pending transactions
      const addressesWithActiveUTXOs = new Set<string>();

      // COMMENTED FOR PENDING-ONLY IMPLEMENTATION
      // const addressesWithSpentUTXOs = new Set<string>();
      // const spentTxids = new Set<string>();

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
          }
          // COMMENTED FOR PENDING-ONLY IMPLEMENTATION
          /*
          else if (node.addressUsed) {
            // Address has been used but has no UTXOs (spent)
            addressesWithSpentUTXOs.add(node.multisig.address);
          }
                 */
        }
      });

      // COMMENTED FOR PENDING-ONLY IMPLEMENTATION
      /*
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
       */

      // Fetch transaction details in parallel
      const txPromises = Array.from(txids).map((txid) =>
        fetchTransactionDetails(txid),
      );

      const txDetails = await Promise.all(txPromises);

      if (mounted) {
        const processedTransactions = txDetails
          .filter((tx): tx is any => tx !== null)
          .map((tx) => {
            // Calculate value to wallet
            const valueToWallet = calculateTransactionValue(
              tx,
              walletAddresses,
            );
            // Determine if transaction is received based on value if not already set
            const isReceived =
              tx.isReceived !== undefined ? tx.isReceived : valueToWallet > 0;

            return {
              ...tx,
              valueToWallet,
              isReceived,
            };
          });
        setTransactions(processedTransactions);
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
  }, [
    blockchainClient,
    deposits.nodes,
    change.nodes,
    mounted,
    walletAddresses,
  ]);

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

  // Split and sort transactions
  const pendingTxs = getSortedTransactions(
    transactions.filter((tx) => !tx.status.confirmed),
  );

  // COMMENTED FOR PENDING-ONLY IMPLEMENTATION
  /*
  const confirmedTxs = getSortedTransactions(
    transactions.filter((tx) => tx.status.confirmed),
  );
  */

  return {
    sortBy,
    sortDirection,
    handleSort,
    pendingTxs,
    // COMMENTED FOR PENDING-ONLY IMPLEMENTATION
    // confirmedTxs,
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

/**
 * Custom hook to access all wallet addresses from Redux
 */
export const useWalletAddresses = () => {
  // Get deposits and change addresses from Redux
  const deposits = useSelector((state: any) => state.wallet.deposits);
  const change = useSelector((state: any) => state.wallet.change);

  // Extract all addresses from wallet nodes
  const addresses = useMemo(() => {
    const depositAddresses = Object.values(deposits.nodes || {})
      .map((node: any) => node.multisig?.address)
      .filter(Boolean);

    const changeAddresses = Object.values(change.nodes || {})
      .map((node: any) => node.multisig?.address)
      .filter(Boolean);

    return [...depositAddresses, ...changeAddresses];
  }, [deposits.nodes, change.nodes]);

  return addresses;
};
