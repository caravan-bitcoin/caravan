import React from "react";

import { useSelector } from "react-redux";
import { Button } from "@mui/material";

import { getWalletConfig } from "../../selectors/wallet";
import { downloadFile } from "../../utils";
import { useGetDescriptors } from "../../hooks";

export const DownloadDescriptors = () => {
  const walletConfig = useSelector(getWalletConfig);
  const descriptors = useGetDescriptors();

  const handleDownload = () => {
    if (descriptors.change) {
      downloadFile(
        JSON.stringify(descriptors, null, 2),
        `${walletConfig.uuid}.txt`,
      );
    }
  };

  return (
    <Button
      variant="outlined"
      onClick={handleDownload}
      disabled={!descriptors.change || !descriptors.receive}
    >
      Download Descriptors
    </Button>
  );
};
