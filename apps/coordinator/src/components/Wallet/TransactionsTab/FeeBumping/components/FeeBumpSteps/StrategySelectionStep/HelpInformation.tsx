import React from "react";
import { Alert, AlertTitle, Box, Typography } from "@mui/material";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";

export const HelpInformation = () => {
  return (
    <Box mt={3}>
      <Alert severity="info" icon={<InfoOutlinedIcon />}>
        <AlertTitle>What are fee bumping strategies?</AlertTitle>
        <Typography variant="body2">
          Fee bumping allows you to accelerate a pending transaction by
          increasing its fee. This makes it more attractive to miners and
          increases the chance of faster confirmation.
        </Typography>

        <Typography variant="body2" mt={1}>
          <strong>RBF (Replace-By-Fee):</strong> Creates a new transaction that
          replaces the original one. Requires that the original transaction
          signals RBF.
        </Typography>

        <Typography variant="body2" mt={1}>
          <strong>CPFP (Child-Pays-for-Parent):</strong> Creates a new
          transaction that spends an output from the original transaction. The
          child transaction includes a high enough fee to incentivize miners to
          include both transactions.
        </Typography>
      </Alert>
    </Box>
  );
};
