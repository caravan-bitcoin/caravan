import React, { useState } from "react";
import { Box, Grid, Switch, Typography } from "@mui/material";
import ExtendedPublicKeyImporter from "./ExtendedPublicKeyImporter";
import { WalletDescriptorImporter } from "./WalletDescriptorImporter";

export const ExtendedPublicKeyImporters = ({
  totalSigners,
  configuring,
}: {
  totalSigners: number;
  configuring: boolean;
}) => {
  const [withDescriptors, setWithDescriptors] = useState(false);

  const extendedPublicKeyImporters = [];
  for (
    let extendedPublicKeyImporterNum = 1;
    extendedPublicKeyImporterNum <= totalSigners;
    extendedPublicKeyImporterNum += 1
  ) {
    extendedPublicKeyImporters.push(
      <Box
        key={extendedPublicKeyImporterNum}
        mt={extendedPublicKeyImporterNum === 1 ? 0 : 2}
        display={configuring ? "block" : "none"}
      >
        <ExtendedPublicKeyImporter
          key={extendedPublicKeyImporterNum}
          number={extendedPublicKeyImporterNum}
        />
      </Box>,
    );
  }

  if (configuring) {
    return (
      <>
        <Box pb={3} sx={{ display: "flex", justifyContent: "center" }}>
          <Typography variant="h5">
            <Switch
              aria-label="Set Descriptors"
              onChange={() => setWithDescriptors(!withDescriptors)}
              checked={withDescriptors}
            />
            Configure with descriptor
          </Typography>
        </Box>
        {withDescriptors ? (
          <Grid item>
            <WalletDescriptorImporter />
          </Grid>
        ) : (
          extendedPublicKeyImporters
        )}
      </>
    );
  }

  return <>{extendedPublicKeyImporters}</>;
};
