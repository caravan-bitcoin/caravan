import React, { useState, useEffect, useMemo } from "react";
import { Box, Typography, Slider, Tooltip, IconButton } from "@mui/material";
import InfoIcon from "@mui/icons-material/Info";
import { useSelector } from "react-redux";
import { bitcoinsToSatoshis } from "@caravan/bitcoin";
import { getWalletConfig } from "../../../selectors/wallet";
import { calculateWasteMetric } from "@caravan/health";
import "../styles.css";

export const SWASlider = () => {
  const [longTermFeeEstimate, setLongTermFeeEstimate] = useState<number>(101);
  const [wasteAmount, setWasteAmount] = useState<number>(0);

  const fee = useSelector((state: any) => state.spend.transaction.fee);
  const feeRate = useSelector((state: any) => state.spend.transaction.feeRate);
  const outputs = useSelector((state: any) => state.spend.transaction.outputs);
  const inputs = useSelector((state: any) => state.spend.transaction.inputs);
  const changeAddress = useSelector(
    (state: any) => state.spend.transaction.changeAddress,
  );
  const walletConfig = useSelector(getWalletConfig);

  const getFeeLevelInfo = (feeRate: number) => {
    if (feeRate <= 10) {
      return { label: "Very Low Fees", className: "fee-level-very-low" };
    } else if (feeRate <= 50) {
      return { label: "Low Fees", className: "fee-level-low" };
    } else if (feeRate <= 100) {
      return { label: "Medium Fees", className: "fee-level-medium" };
    } else if (feeRate <= 200) {
      return { label: "High Fees", className: "fee-level-high" };
    } else {
      return { label: "Very High Fees", className: "fee-level-very-high" };
    }
  };

  const formatNumber = (num: number) =>
    num.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ",");

  const handleSliderChange = (event: Event, value: number | number[]) => {
    const newValue = Array.isArray(value) ? value[0] : value;
    setLongTermFeeEstimate(newValue);
  };

  // Calculate all waste metrics
  useEffect(() => {
    if (!fee || !feeRate || !walletConfig || !outputs || !inputs) return;

    try {
      const feeRateSatPerVb = Number(feeRate);

      // Calculate ratio
      let nonChangeOutputsTotalSats = 0;
      outputs.forEach((output: any) => {
        const amountSats = output.amountSats
          ? Number(output.amountSats)
          : Number(bitcoinsToSatoshis(output.amount));

        if (output.address !== changeAddress) {
          nonChangeOutputsTotalSats += amountSats;
        }
      });

      // Prepare parameters for waste calculation
      const coinAmounts = inputs.map((input: any) =>
        input.amountSats
          ? Number(input.amountSats)
          : Number(bitcoinsToSatoshis(input.amount)),
      );

      const hasChange = outputs.some(
        (output: any) => output.address === changeAddress,
      );

      // Calculate waste using the health package function
      const newWasteAmount = calculateWasteMetric({
        coinAmounts,
        config: {
          scriptType: walletConfig.addressType,
          requiredSigners: walletConfig.quorum.requiredSigners,
          totalSigners: walletConfig.quorum.totalSigners,
        },
        effectiveFeeRate: feeRateSatPerVb,
        estimatedLongTermFeeRate: longTermFeeEstimate,
        hasChange,
        spendAmount: nonChangeOutputsTotalSats,
      });

      setWasteAmount(newWasteAmount);
    } catch (err) {
      console.error("Error calculating waste metrics:", err);
      setWasteAmount(0);
    }
  }, [
    fee,
    feeRate,
    outputs,
    inputs,
    changeAddress,
    walletConfig,
    longTermFeeEstimate,
  ]);

  const feeLevelInfo = useMemo(
    () => getFeeLevelInfo(longTermFeeEstimate),
    [longTermFeeEstimate],
  );

  return (
    <Box className="swa-slider-container">
      {/* Header */}
      <Typography variant="h6" className="waste-analysis-title">
        Waste Analysis
      </Typography>
      <Typography variant="body2" className="waste-analysis-description">
        Analyzes if spending Bitcoin now is efficient or if waiting could be
        cheaper
      </Typography>

      {/* Fee Waste Box */}
      <Box className="potential-fee-waste-container">
        <Typography variant="subtitle1" className="potential-fee-waste-title">
          Potential Fee Waste
        </Typography>

        {/* Slider */}
        <Box className="slider-container">
          <Box className="gradient-track" />
          <Slider
            value={longTermFeeEstimate}
            min={1}
            max={500}
            step={1}
            onChange={handleSliderChange}
            aria-labelledby="long-term-fee-estimate-slider"
            className="custom-slider"
          />
        </Box>

        {/* Waste Amount */}
        <Box className="waste-amount-container">
          <Typography variant="h4" className="waste-amount-text">
            {formatNumber(wasteAmount)}
          </Typography>
          <Typography variant="body2" className="waste-amount-units">
            sats
          </Typography>
          <Tooltip title="Waste metric = weight×(feerate−longtermfeerate)+change+excess">
            <IconButton size="small" className="info-icon-button">
              <InfoIcon className="info-icon" />
            </IconButton>
          </Tooltip>
        </Box>

        {/* Fee Estimate Info */}
        <Typography
          id="long-term-fee-estimate-slider"
          variant="body2"
          className="fee-estimate-text"
        >
          Long Term Fee Estimate (L): {longTermFeeEstimate.toLocaleString()}{" "}
          sats/vB
          <Tooltip title="Long-term fee rate estimate for redeeming UTXOs">
            <IconButton size="small" className="info-icon-button">
              <InfoIcon className="info-icon" />
            </IconButton>
          </Tooltip>
        </Typography>

        {/* Label */}
        <Typography
          variant="body2"
          className={`fee-level-indicator ${feeLevelInfo.className}`}
        >
          {feeLevelInfo.label}
        </Typography>
      </Box>
    </Box>
  );
};
