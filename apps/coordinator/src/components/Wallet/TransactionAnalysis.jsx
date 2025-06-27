import React from "react";
import PropTypes from "prop-types";
import {
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Typography,
  Box,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { SWASlider } from "./SWASlider";

export const TransactionAnalysis = ({
  wasteAmount,
  longTermFeeEstimate,
  onFeeEstimateChange,
}) => {
  return (
    <Box className="transaction-analysis-container">
      <Accordion className="transaction-analysis-accordion">
        <AccordionSummary
          expandIcon={<ExpandMoreIcon />}
          aria-controls="transaction-analysis-content"
          id="transaction-analysis-header"
          className="transaction-analysis-accordion-summary"
        >
          <Box className="transaction-analysis-header">
            <Typography
              variant="h6"
              component="h2"
              className="transaction-analysis-title"
            >
              Transaction Analysis
            </Typography>
            <Typography
              variant="body2"
              className="transaction-analysis-subtitle"
            >
              Optimize your Bitcoin spending efficiency
            </Typography>
          </Box>
        </AccordionSummary>

        <AccordionDetails className="transaction-analysis-accordion-details">
          <SWASlider
            wasteAmount={wasteAmount}
            longTermFeeEstimate={longTermFeeEstimate}
            onFeeEstimateChange={onFeeEstimateChange}
          />
        </AccordionDetails>
      </Accordion>
    </Box>
  );
};

TransactionAnalysis.propTypes = {
  wasteAmount: PropTypes.number.isRequired,
  longTermFeeEstimate: PropTypes.number.isRequired,
  onFeeEstimateChange: PropTypes.func.isRequired,
  defaultExpanded: PropTypes.bool,
};
