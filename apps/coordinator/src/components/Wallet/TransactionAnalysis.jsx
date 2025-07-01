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
  metrics = {
    ratio: 0,
    dustLimits: { lowerLimit: 0, upperLimit: 0 },
    wasteAmount: 0,
  },
  longTermFeeEstimate,
  onFeeEstimateChange,
  defaultExpanded = false,
}) => {
  const { wasteAmount = 0 } = metrics || {};

  return (
    <Box className="transaction-analysis-container">
      <Accordion defaultExpanded={defaultExpanded}>
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
  metrics: PropTypes.shape({
    ratio: PropTypes.number,
    dustLimits: PropTypes.shape({
      lowerLimit: PropTypes.number,
      upperLimit: PropTypes.number,
    }),
    wasteAmount: PropTypes.number,
  }),
  longTermFeeEstimate: PropTypes.number.isRequired,
  onFeeEstimateChange: PropTypes.func.isRequired,
  defaultExpanded: PropTypes.bool,
};

TransactionAnalysis.defaultProps = {
  metrics: {
    ratio: 0,
    dustLimits: { lowerLimit: 0, upperLimit: 0 },
    wasteAmount: 0,
  },
  defaultExpanded: false,
};
