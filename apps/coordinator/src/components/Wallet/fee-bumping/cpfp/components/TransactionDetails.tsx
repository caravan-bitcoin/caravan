import React from "react";
import {
  Typography,
  Button,
  Collapse,
  List,
  ListItem,
  ListItemText,
  Divider,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import { satoshisToBitcoins } from "@caravan/bitcoin";
import { TransactionDetailsBox } from "../styles";

interface TransactionDetailsProps {
  title: string;
  tx: any;
  expanded: boolean;
  setExpanded: (expanded: boolean) => void;
}

const TransactionDetails: React.FC<TransactionDetailsProps> = ({
  title,
  tx,
  expanded,
  setExpanded,
}) => {
  return (
    <TransactionDetailsBox>
      <Typography variant="h6" gutterBottom>
        {title}
      </Typography>
      <Button
        onClick={() => setExpanded(!expanded)}
        startIcon={expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
      >
        {expanded ? "Hide Details" : "Show Details"}
      </Button>
      <Collapse in={expanded}>
        <List>
          <ListItem>
            <ListItemText
              primary="TXID"
              secondary={tx.txid || tx.analyzer?.txid || "N/A"}
            />
          </ListItem>
          <ListItem>
            <ListItemText
              primary="Size"
              secondary={`${tx.size || tx.estimatedVsize || "N/A"} vBytes`}
            />
          </ListItem>
          <ListItem>
            <ListItemText
              primary="Fee"
              secondary={`${satoshisToBitcoins(tx.fee || tx.currentFee || "0")} BTC`}
            />
          </ListItem>
          <Divider />
          <ListItem>
            <ListItemText primary="Inputs" />
          </ListItem>
          {(tx.inputs || tx.analyzer?.inputs || []).map(
            (input: any, index: number) => (
              <ListItem key={`input-${index}`} sx={{ pl: 4 }}>
                <ListItemText
                  primary={`Input ${index + 1}`}
                  secondary={`${input.txid || input.hash}:${input.vout || input.index}`}
                />
              </ListItem>
            ),
          )}
          <Divider />
          <ListItem>
            <ListItemText primary="Outputs" />
          </ListItem>
          {(tx.outputs || tx.analyzer?.outputs || []).map(
            (output: any, index: number) => (
              <ListItem key={`output-${index}`} sx={{ pl: 4 }}>
                <ListItemText
                  primary={`Output ${index + 1}`}
                  secondary={`${output.address || "N/A"}: ${satoshisToBitcoins(output.value || output.amountSats || "0")} BTC`}
                />
              </ListItem>
            ),
          )}
        </List>
      </Collapse>
    </TransactionDetailsBox>
  );
};

export default TransactionDetails;
