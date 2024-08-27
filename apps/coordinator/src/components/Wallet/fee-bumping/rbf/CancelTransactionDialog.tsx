import React from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
} from "@mui/material";

interface CancelTransactionDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

const CancelTransactionDialog: React.FC<CancelTransactionDialogProps> = ({
  open,
  onClose,
  onConfirm,
}) => (
  <Dialog open={open} onClose={onClose}>
    <DialogTitle>Cancel Transaction</DialogTitle>
    <DialogContent>
      <Typography>Implement your cancel transaction UI here</Typography>
    </DialogContent>
    <DialogActions>
      <Button onClick={onClose}>Back</Button>
      <Button onClick={onConfirm} color="secondary">
        Confirm Cancellation
      </Button>
    </DialogActions>
  </Dialog>
);

export default CancelTransactionDialog;
