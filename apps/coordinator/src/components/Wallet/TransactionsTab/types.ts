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
}

export interface TransactionTableProps {
  transactions: Transaction[];
  onSort: (property: keyof Transaction) => void;
  sortBy: string;
  sortDirection: "asc" | "desc";
  network?: string;
  onClickTransaction?: (txid: string) => void;
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
}

// For MUI's Select component
export type SelectChangeEvent<Value = string> =
  | (Event & { target: { value: Value; name: string } })
  | React.ChangeEvent<HTMLInputElement>;

// Sorting parameters
export type SortDirection = "asc" | "desc";
export type SortBy = keyof Transaction | "blockTime";
