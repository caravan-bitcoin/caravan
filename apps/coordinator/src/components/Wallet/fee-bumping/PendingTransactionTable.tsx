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
import { Search, Edit, TrendingUp, TrendingDown } from "@mui/icons-material";
import { RootState, ExtendedAnalyzer } from "components/types/fees";
import TransactionActions from "./TransactionActions";
import { formatTxid } from "./utils";
import Copyable from "./../../Copyable";

const StyledTableCell = styled(TableCell)(({ theme }) => ({
  "&.MuiTableCell-head": {
    backgroundColor: theme.palette.grey[200],
    fontWeight: "bold",
  },
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

const StyledSelect = styled(Select)(() => ({
  minWidth: "70px",
  height: "30px",
  fontSize: "0.875rem",
}));

const FeeRateComparison = styled(Box)(({ theme }) => ({
  display: "flex",
  flexDirection: "column",
  alignItems: "flex-start",
  gap: theme.spacing(0.5),
}));

const FeeRateRow = styled(Box)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  gap: theme.spacing(1),
}));

interface TransactionTableProps {
  transactions: ExtendedAnalyzer[];
  onRBF: (tx: ExtendedAnalyzer) => void;
  onCPFP: (tx: ExtendedAnalyzer) => void;
  isLoading: boolean;
  currentFeeRate: number;
  error: string | null;
}

const TransactionTable: React.FC<TransactionTableProps> = ({
  transactions,
  onRBF,
  onCPFP,
  isLoading,
  currentFeeRate,
  error,
}) => {
  const network = useSelector((state: RootState) => state.settings.network);
  const [amountUnit, setAmountUnit] = useState<"BTC" | "satoshis">("BTC");

  const formatAmount = (amountSats: number) => {
    if (amountUnit === "BTC") {
      return `${satoshisToBitcoins(amountSats)} BTC`;
    } else {
      return `${amountSats} sats`;
    }
  };

  const renderFeeRateComparison = (tx: ExtendedAnalyzer) => {
    const txFeeRate = parseFloat(tx.analyzer.feeRate);
    const feeRateDiff = currentFeeRate - txFeeRate;
    const icon =
      feeRateDiff > 0 ? (
        <TrendingUp color="error" fontSize="small" />
      ) : (
        <TrendingDown color="success" fontSize="small" />
      );

    return (
      <FeeRateComparison>
        <FeeRateRow>
          <Typography variant="body2">Paid:</Typography>
          <Chip label={`${txFeeRate.toFixed(2)} sat/vB`} size="small" />
        </FeeRateRow>
        <FeeRateRow>
          <Typography variant="body2">Current:</Typography>
          <Chip label={`${currentFeeRate.toFixed(2)} sat/vB`} size="small" />
          {icon}
        </FeeRateRow>
      </FeeRateComparison>
    );
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
    <Table size="small">
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
          <StyledTableCell>Fee Rate</StyledTableCell>
          <StyledTableCell>Recommended Strategy</StyledTableCell>
          <StyledTableCell>Actions</StyledTableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {transactions.map((tx) => (
          <TableRow key={tx.analyzer.txid} hover>
            <TxidCell>
              <Tooltip title={tx.analyzer.txid} arrow>
                <span>{formatTxid(tx.analyzer.txid)}</span>
              </Tooltip>
              <Copyable
                text={tx.analyzer.txid}
                showIcon
                showText={false}
              ></Copyable>
              <Tooltip title="View on block explorer" arrow>
                <IconButton
                  size="small"
                  href={blockExplorerTransactionURL(tx.analyzer.txid, network)}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Search fontSize="small" />
                </IconButton>
              </Tooltip>
            </TxidCell>
            <TableCell>{tx.timeElapsed}</TableCell>
            <TableCell>
              <Typography variant="body2">
                {formatAmount(parseInt(tx.analyzer.fee))}
              </Typography>
            </TableCell>
            <TableCell>{renderFeeRateComparison(tx)}</TableCell>
            <TableCell>
              <Typography variant="body2">
                {tx.analyzer.recommendedStrategy === "NONE"
                  ? "No action needed"
                  : tx.canRBF
                    ? tx.analyzer.recommendedStrategy
                    : "CPFP"}
              </Typography>
            </TableCell>
            <TransactionActions tx={tx} onRBF={onRBF} onCPFP={onCPFP} />
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};

export default TransactionTable;
