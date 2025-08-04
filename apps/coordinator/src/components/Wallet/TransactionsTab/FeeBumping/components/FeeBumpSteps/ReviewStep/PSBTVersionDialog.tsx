/* eslint-disable react/prop-types */
import React from "react";
import {
  Box,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  FormControlLabel,
  Radio,
  RadioGroup,
} from "@mui/material";
import { Download, FileDownload } from "@mui/icons-material";

export interface PSBTVersionDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (version: "v0" | "v2") => void;
  selectedVersion: "v0" | "v2";
  onVersionChange: (version: "v0" | "v2") => void;
}

export const PSBTVersionDialog: React.FC<PSBTVersionDialogProps> = React.memo(
  ({ open, onClose, onConfirm, selectedVersion, onVersionChange }) => (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Box display="flex" alignItems="center">
          <FileDownload sx={{ mr: 1 }} />
          Select PSBT Version
        </Box>
      </DialogTitle>

      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Choose the PSBT (Partially Signed Bitcoin Transaction) version to
          download:
        </Typography>

        <FormControl component="fieldset" fullWidth>
          <RadioGroup
            value={selectedVersion}
            onChange={(e) => onVersionChange(e.target.value as "v0" | "v2")}
          >
            <FormControlLabel
              value="v2"
              control={<Radio />}
              label={
                <Box>
                  <Typography variant="body1">PSBT v2 (Recommended)</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Latest format with enhanced features and better hardware
                    wallet support
                  </Typography>
                </Box>
              }
            />
            <FormControlLabel
              value="v0"
              control={<Radio />}
              label={
                <Box>
                  <Typography variant="body1">PSBT v0 (Legacy)</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Older format for compatibility with legacy systems
                  </Typography>
                </Box>
              }
            />
          </RadioGroup>
        </FormControl>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} color="inherit">
          Cancel
        </Button>
        <Button
          onClick={() => onConfirm(selectedVersion)}
          variant="contained"
          startIcon={<Download />}
        >
          Download PSBT {selectedVersion.toUpperCase()}
        </Button>
      </DialogActions>
    </Dialog>
  ),
);

PSBTVersionDialog.displayName = "PSBTVersionDialog";
