import React from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
} from "@mui/material";

interface RBFOptionsDialogProps {
  open: boolean;
  onClose: () => void;
  onIncreaseFees: () => void;
  onCancelTx: () => void;
}

const RBFOptionsDialog: React.FC<RBFOptionsDialogProps> = ({
  open,
  onClose,
  onIncreaseFees,
  onCancelTx,
}) => (
  <Dialog open={open} onClose={onClose}>
    <DialogTitle>RBF Options</DialogTitle>
    <DialogContent>
      <Typography>
        Do you want to increase fees or cancel the transaction?
      </Typography>
    </DialogContent>
    <DialogActions>
      <Button onClick={onIncreaseFees} color="primary">
        Increase Fees
      </Button>
      <Button onClick={onCancelTx} color="secondary">
        Cancel Transaction
      </Button>
    </DialogActions>
  </Dialog>
);

export default RBFOptionsDialog;
