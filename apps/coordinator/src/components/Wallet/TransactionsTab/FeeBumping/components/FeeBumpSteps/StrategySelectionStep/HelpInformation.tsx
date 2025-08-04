import React from "react";
import { Alert, AlertTitle, Box, Typography } from "@mui/material";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";

export const HelpInformation = () => {
  return (
    <Box mt={3}>
      <Alert
        icon={<InfoOutlinedIcon />}
        sx={{
          backgroundColor: "rgba(232, 245, 255, 0.5)", // Custom background color
        }}
      >
        <AlertTitle>What are fee bumping strategies?</AlertTitle>
        <Typography variant="body2" component="div">
          <Box component="span" display="block">
            Fee bumping allows you to accelerate a pending transaction by
            increasing its fee.
          </Box>
          <Box component="span" display="block">
            This is especially useful when fees rise unexpectedly, or when a
            transaction is time-sensitive.
          </Box>
        </Typography>
      </Alert>
    </Box>
  );
};
