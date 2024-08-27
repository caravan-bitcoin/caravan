import React from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
} from "@mui/material";

interface AccelerateFeeDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

const AccelerateFeeDialog: React.FC<AccelerateFeeDialogProps> = ({
  open,
  onClose,
  onConfirm,
}) => (
  <Dialog open={open} onClose={onClose}>
    <DialogTitle>Increase Fees</DialogTitle>
    <DialogContent>
      <Typography>Implement your increase fees UI here</Typography>
    </DialogContent>
    <DialogActions>
      <Button onClick={onClose}>Cancel</Button>
      <Button onClick={onConfirm} color="primary">
        Confirm
      </Button>
    </DialogActions>
  </Dialog>
);

export default AccelerateFeeDialog;
