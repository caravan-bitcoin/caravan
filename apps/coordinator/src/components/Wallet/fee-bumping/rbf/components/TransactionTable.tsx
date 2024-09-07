import React from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
  Paper,
} from "@mui/material";
import { styled } from "@mui/material/styles";
import { satoshisToBitcoins } from "@caravan/bitcoin";
import { TransactionTableProps } from "../types";

const StyledPaper = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(2),
  margin: theme.spacing(2, 0),
  backgroundColor: theme.palette.background.default,
}));

const TransactionTable: React.FC<TransactionTableProps> = ({
  title,
  items,
  isInputs,
  template,
}) => (
  <StyledPaper elevation={3}>
    <Typography variant="h6" gutterBottom>
      {title}
    </Typography>
    <Table size="small">
      <TableHead>
        <TableRow>
          <TableCell>Address</TableCell>
          {isInputs && <TableCell align="right">UTXO count</TableCell>}
          <TableCell align="right">Amount (BTC)</TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {items.map((item, index) => (
          <TableRow key={index}>
            <TableCell>{isInputs ? item.txid : item.address}</TableCell>
            {isInputs && <TableCell align="right">1</TableCell>}
            <TableCell align="right">
              {satoshisToBitcoins(item.amountSats)} BTC
            </TableCell>
          </TableRow>
        ))}
        <TableRow>
          <TableCell colSpan={isInputs ? 2 : 1}>
            <strong>TOTAL:</strong>
          </TableCell>
          <TableCell align="right">
            <strong>
              {satoshisToBitcoins(
                isInputs
                  ? template.getTotalInputAmount()
                  : template.getTotalOutputAmount(),
              )}{" "}
              BTC
            </strong>
          </TableCell>
        </TableRow>
      </TableBody>
    </Table>
  </StyledPaper>
);

export default TransactionTable;
