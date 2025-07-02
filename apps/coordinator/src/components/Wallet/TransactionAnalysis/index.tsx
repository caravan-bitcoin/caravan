import React from "react";
import {
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Typography,
  Box,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { SWASlider } from "./SWASlider";

export const TransactionAnalysis = () => {
  return (
    <Box className="transaction-analysis-container">
      <Accordion defaultExpanded>
        <AccordionSummary
          expandIcon={<ExpandMoreIcon />}
          aria-controls="transaction-analysis-content"
          id="transaction-analysis-header"
        >
          <Box>
            <Typography variant="h6">Transaction Analysis</Typography>
            <Typography variant="body2">
              Optimize your Bitcoin spending efficiency
            </Typography>
          </Box>
        </AccordionSummary>
        <AccordionDetails>
          <SWASlider />
        </AccordionDetails>
      </Accordion>
    </Box>
  );
};

export default TransactionAnalysis;
