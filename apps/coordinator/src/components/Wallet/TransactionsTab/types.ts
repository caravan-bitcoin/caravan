// TODO: This should come from the `clients` package
// Types for the transaction data
import type { TransactionDetails } from "@caravan/clients";
// TODO: This should come from the `clients` package
// Types for the transaction data
export interface Transaction {
  txid: string;
  version: number;
  locktime: number;
  vin: any[]; // Input vector
  vout: any[]; // Output vector
  weight: number;
  status: {
    confirmed: boolean;
    blockTime?: number;
    blockHeight?: number;
  };
  size: number;
  fee: number;
  isReceived?: boolean;
  vsize?: number;
  valueToWallet?: number;
}

export interface TransactionTableProps {
  transactions: Transaction[];
  onSort: (property: SortBy) => void; // Changed from string to SortBy to match the hook
  sortBy: SortBy; // Changed from string to SortBy for consistency
  sortDirection: SortDirection; // Use the proper type instead of "asc" | "desc"
  network?: string;
  onClickTransaction?: (txid: string) => void;
  onAccelerateTransaction?: (tx: TransactionT) => void;
  renderActions?: (tx: TransactionT) => React.ReactNode;
  showAcceleration?: boolean; // Add this prop to control acceleration button visibility
}

// How our Transaction Table's should look like
export interface TransactionT {
  txid: string;
  status: {
    confirmed: boolean;
    blockTime?: number;
    blockHeight?: number;
  };
  size: number;
  fee: number;
  isSpent?: boolean;
  vsize?: number;
  isReceived?: boolean;
  valueToWallet?: number;
}

// For MUI's Select component
export type SelectChangeEvent<Value = string> =
  | (Event & { target: { value: Value; name: string } })
  | React.ChangeEvent<HTMLInputElement>;

// Sorting parameters
export type SortDirection = "asc" | "desc";
export type SortBy = keyof TransactionT | "blockTime" | "valueToWallet";

// Fee Display Component
export interface FeeDisplayProps {
  feeInSats?: number | null;
  isReceived?: boolean;
}

// Value Display Component
export interface ValueDisplayProps {
  valueInSats?: number | null;
}
export interface CompletedTransaction extends TransactionDetails {
  valueToWallet: number;
  isReceived: boolean;
}

export type TransactionType = "pending" | "confirmed";
