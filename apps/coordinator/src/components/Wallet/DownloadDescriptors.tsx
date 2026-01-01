import React, { useState } from "react";

import { useSelector } from "react-redux";
import { Alert, Button, Menu, MenuItem } from "@mui/material";

import { getWalletConfig } from "../../selectors/wallet";
import { downloadFile } from "../../utils";
import { useGetDescriptors } from "../../hooks";
import { formatSparrowExport, formatJsonExport } from "../../utils/descriptors";

function getDescriptorFileName(
  walletName: string | undefined,
  walletUuid: string,
  extension: string,
): string {
  const name = walletName
    ? walletName.replace(/\s+/g, "_").toLowerCase()
    : walletUuid;
  return `caravan_descriptors_${name}.${extension}`;
}

export const DownloadDescriptors = () => {
  const walletConfig = useSelector(getWalletConfig);
  const descriptors = useGetDescriptors();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [error, setError] = useState<string | null>(null);
  const open = Boolean(anchorEl);

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setError(null);
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleDownloadSparrow = async () => {
    setError(null);
    try {
      const content = await formatSparrowExport(descriptors);
      const filename = getDescriptorFileName(
        walletConfig.name,
        walletConfig.uuid,
        "txt",
      );
      downloadFile(content, filename);
      handleClose();
    } catch (e) {
      const message = e instanceof Error ? e.message : "Unknown error occurred";
      setError(`Error generating Sparrow format: ${message}`);
      handleClose();
    }
  };

  const handleDownloadJson = async () => {
    setError(null);
    try {
      const content = await formatJsonExport(descriptors);
      const filename = getDescriptorFileName(
        walletConfig.name,
        walletConfig.uuid,
        "json",
      );
      downloadFile(content, filename);
      handleClose();
    } catch (e) {
      const message = e instanceof Error ? e.message : "Unknown error occurred";
      setError(`Error generating JSON format: ${message}`);
      handleClose();
    }
  };

  const hasDescriptors =
    descriptors.change || descriptors.receive || descriptors.multipath;

  return (
    <>
      <Button
        variant="outlined"
        onClick={handleClick}
        disabled={!hasDescriptors}
      >
        Download Descriptors
      </Button>
      <Menu anchorEl={anchorEl} open={open} onClose={handleClose}>
        <MenuItem onClick={handleDownloadSparrow}>
          Download Sparrow Format (.txt)
        </MenuItem>
        <MenuItem onClick={handleDownloadJson}>
          Download JSON Format (.json)
        </MenuItem>
      </Menu>
      {error && (
        <Alert severity="error" onClose={() => setError(null)} sx={{ mt: 2 }}>
          {error}
        </Alert>
      )}
    </>
  );
};
