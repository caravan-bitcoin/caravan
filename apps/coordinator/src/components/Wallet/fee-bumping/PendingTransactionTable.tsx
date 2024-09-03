import React, { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Chip,
  Typography,
  Button,
  Tooltip,
  IconButton,
  Box,
  CircularProgress,
  Select,
  MenuItem,
  FormControl,
} from "@mui/material";
import { useSelector } from "react-redux";
import {
  blockExplorerTransactionURL,
  satoshisToBitcoins,
} from "@caravan/bitcoin";
import { styled } from "@mui/material/styles";
import { OpenInNew, Search, Edit } from "@mui/icons-material";
import { AnalyzedTransaction } from "./types";
import { formatTxid } from "./utils";
import Copyable from "./../../Copyable";

const StyledTableCell = styled(TableCell)(({ theme }) => ({
  "&.MuiTableCell-head": {
    backgroundColor: theme.palette.grey[200],
    fontWeight: "bold",
  },
}));

const ActionButton = styled(Button)(({ theme }) => ({
  margin: theme.spacing(0.5),
  textTransform: "none",
}));

const TxidCell = styled(TableCell)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  gap: theme.spacing(1),
}));

const AmountHeaderCell = styled(StyledTableCell)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  gap: theme.spacing(1),
}));

const StyledSelect = styled(Select)(({ theme }) => ({
  minWidth: "70px",
  height: "30px",
  fontSize: "0.875rem",
}));

interface TransactionTableProps {
  transactions: AnalyzedTransaction[];
  onRBF: (tx: AnalyzedTransaction) => void;
  onCPFP: (tx: AnalyzedTransaction) => void;
  isLoading: boolean;
  error: string | null;
}

const TransactionTable: React.FC<TransactionTableProps> = ({
  transactions,
  onRBF,
  onCPFP,
  isLoading,
  error,
}) => {
  const network = useSelector((state) => state.settings.network);
  const [amountUnit, setAmountUnit] = useState<"BTC" | "satoshis">("BTC");

  const formatAmount = (amountSats: number) => {
    if (amountUnit === "BTC") {
      return `${satoshisToBitcoins(amountSats)} BTC`;
    } else {
      return `${amountSats} sats`;
    }
  };

  if (isLoading) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        height={200}
      >
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        height={200}
      >
        <Typography color="error">{error}</Typography>
      </Box>
    );
  }

  if (transactions.length === 0) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        height={200}
      >
        <Typography>No pending transactions found.</Typography>
      </Box>
    );
  }

  return (
    <Table>
      <TableHead>
        <TableRow>
          <StyledTableCell>Transaction ID</StyledTableCell>
          <StyledTableCell>Time Elapsed</StyledTableCell>
          <AmountHeaderCell>
            Amount
            <FormControl variant="outlined" size="small">
              <StyledSelect
                value={amountUnit}
                onChange={(e) =>
                  setAmountUnit(e.target.value as "BTC" | "satoshis")
                }
                displayEmpty
              >
                <MenuItem value="BTC">BTC</MenuItem>
                <MenuItem value="satoshis">sats</MenuItem>
              </StyledSelect>
            </FormControl>
          </AmountHeaderCell>
          <StyledTableCell>Current Fee Rate</StyledTableCell>
          <StyledTableCell>Actions</StyledTableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {transactions.map((tx) => (
          <TableRow key={tx.txid} hover>
            <TxidCell>
              <Tooltip title={tx.txid} arrow>
                <span>{formatTxid(tx.txid)}</span>
              </Tooltip>
              <Copyable text={tx.txid} showIcon showText={false}></Copyable>
              <Tooltip title="View on block explorer" arrow>
                <IconButton
                  size="small"
                  href={blockExplorerTransactionURL(tx.txid, network)}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Search fontSize="small" />
                </IconButton>
              </Tooltip>
            </TxidCell>
            <TableCell>{tx.timeElapsed}</TableCell>
            <TableCell>
              <Typography>{formatAmount(tx.amountSats)}</Typography>
            </TableCell>
            <TableCell>
              <Chip
                label={`${tx.currentFeeRate.toFixed(2)} sat/vB`}
                color={tx.currentFeeRate > 4 ? "success" : "warning"}
                size="small"
              />
            </TableCell>
            <TableCell>
              {tx.canRBF && (
                <ActionButton
                  variant="outlined"
                  color="primary"
                  size="small"
                  onClick={() => onRBF(tx)}
                  startIcon={<Edit />}
                >
                  RBF
                </ActionButton>
              )}
              {tx.canCPFP && (
                <ActionButton
                  variant="outlined"
                  color="secondary"
                  size="small"
                  onClick={() => onCPFP(tx)}
                  startIcon={<Edit />}
                >
                  CPFP
                </ActionButton>
              )}
              {!tx.canRBF && !tx.canCPFP && (
                <Typography variant="body2" color="textSecondary">
                  No actions available
                </Typography>
              )}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};

export default TransactionTable;
