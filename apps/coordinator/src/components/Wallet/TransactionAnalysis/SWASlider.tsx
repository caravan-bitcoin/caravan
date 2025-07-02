import React, { useState, useEffect, useMemo } from "react";
import { Box, Typography, Slider, Tooltip, IconButton } from "@mui/material";
import InfoIcon from "@mui/icons-material/Info";
import { useSelector } from "react-redux";
import {
  bitcoinsToSatoshis,
  getP2SH_P2WSHOutputSize,
  getP2SHOutputSize,
  calculateInputWeight,
} from "@caravan/bitcoin";
import { getWalletConfig } from "../../../selectors/wallet";
import { WasteMetrics } from "@caravan/health";
import "../styles.css";

export const SWASlider = () => {
  const [longTermFeeEstimate, setLongTermFeeEstimate] = useState<number>(101);
  const [wasteAmount, setWasteAmount] = useState<number>(0);
  const [dustLimits, setDustLimits] = useState<{
    lowerLimit: number;
    upperLimit: number;
  }>({
    lowerLimit: 0,
    upperLimit: 0,
  });
  const [ratio, setRatio] = useState<number>(0);

  const fee = useSelector((state: any) => state.spend.transaction.fee);
  const feeRate = useSelector((state: any) => state.spend.transaction.feeRate);
  const inputsTotalSats = useSelector(
    (state: any) => state.spend.transaction.inputsTotalSats,
  );
  const outputs = useSelector((state: any) => state.spend.transaction.outputs);
  const inputs = useSelector((state: any) => state.spend.transaction.inputs);
  const changeAddress = useSelector(
    (state: any) => state.spend.transaction.changeAddress,
  );
  const walletConfig = useSelector(getWalletConfig);

  const getFeeLevelInfo = (feeRate: number) => {
    if (feeRate <= 100) {
      return { label: "Very Low Fees", className: "fee-level-very-low" };
    } else if (feeRate <= 200) {
      return { label: "Low Fees", className: "fee-level-low" };
    } else if (feeRate <= 300) {
      return { label: "Medium Fees", className: "fee-level-medium" };
    } else if (feeRate <= 400) {
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

  // Calculate output size based on address type
  const getOutputSizeBytes = (scriptType: string) => {
    switch (scriptType) {
      case "P2WSH":
        return 43; // 8 (value) + 1 (script length) + 34 (witness script hash)
      case "P2SH-P2WSH":
        return getP2SH_P2WSHOutputSize() + 9; // + value and script length
      case "P2SH":
        return getP2SHOutputSize() + 9; // + value and script length
      default:
        return 43; // Default to P2WSH size
    }
  };

  // Calculate all waste metrics
  useEffect(() => {
    if (
      !fee ||
      !feeRate ||
      !inputsTotalSats ||
      !walletConfig ||
      !outputs ||
      !inputs
    )
      return;

    try {
      const feeInSats = Number(bitcoinsToSatoshis(fee));
      const feeRateSatPerVb = Number(feeRate);
      const inputsTotal = Number(inputsTotalSats);

      // Calculate outputs and ratio
      let nonChangeOutputsTotalSats = 0;
      let outputsTotal = 0;

      outputs.forEach((output: any) => {
        const amountSats = output.amountSats
          ? Number(output.amountSats)
          : Number(bitcoinsToSatoshis(output.amount));

        outputsTotal += amountSats;

        if (output.address !== changeAddress) {
          nonChangeOutputsTotalSats += amountSats;
        }
      });

      const newRatio =
        nonChangeOutputsTotalSats > 0
          ? (feeInSats / nonChangeOutputsTotalSats) * 100
          : 0;
      setRatio(newRatio);

      // Calculate weight using Caravan's input weight function
      const inputWeight = calculateInputWeight(
        walletConfig.addressType,
        walletConfig.quorum.requiredSigners,
        walletConfig.quorum.totalSigners,
      );

      // Total weight = (input weight * number of inputs) + output weights
      const outputWeight = outputs.reduce((total: number, output: any) => {
        const scriptType =
          output.address === changeAddress
            ? walletConfig.addressType
            : output.scriptType || walletConfig.addressType;
        return total + getOutputSizeBytes(scriptType) * 4; // Convert bytes to weight units
      }, 0);

      const totalWeight = inputWeight * inputs.length + outputWeight;

      // Calculate dust limits using WasteMetrics
      const wm = new WasteMetrics();
      const riskMultiplier = Math.max(
        longTermFeeEstimate / feeRateSatPerVb,
        1.1,
      );

      const newDustLimits = wm.calculateDustLimits(
        feeRateSatPerVb,
        walletConfig.addressType,
        {
          requiredSignerCount: walletConfig.quorum.requiredSigners,
          totalSignerCount: walletConfig.quorum.totalSigners,
        },
        riskMultiplier,
      );
      setDustLimits(newDustLimits);

      // Calculate change cost
      let changeCost = 0;
      const changeOutput = outputs.find(
        (o: any) => o.address === changeAddress,
      );
      if (changeOutput) {
        const outputSize = getOutputSizeBytes(walletConfig.addressType);
        changeCost = outputSize * longTermFeeEstimate;
      }

      // Calculate excess
      const excess = Math.max(0, inputsTotal - (outputsTotal + feeInSats));

      // Final waste calculation using total weight
      const newWasteAmount = Math.max(
        0,
        totalWeight * (feeRateSatPerVb - longTermFeeEstimate) + // Fee difference
          changeCost + // Change output cost
          excess, // Input excess
      );
      setWasteAmount(newWasteAmount);
    } catch (err) {
      console.error("Error calculating waste metrics:", err);
      setWasteAmount(0);
      setRatio(0);
      setDustLimits({ lowerLimit: 0, upperLimit: 0 });
    }
  }, [
    fee,
    feeRate,
    inputsTotalSats,
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
      <Typography variant="h6" className="waste-analysis-title">
        Waste Analysis
      </Typography>
      <Typography variant="body2" className="waste-analysis-description">
        Analyzes if spending Bitcoin now is efficient or if waiting could be
        cheaper
      </Typography>

      <Box className="potential-fee-waste-container">
        <Box mb={2}>
          <Typography>
            <strong>Fees→Amount Ratio:</strong> {ratio.toFixed(6)}%
          </Typography>
          <Typography>
            <strong>Dust Limits:</strong> {dustLimits.lowerLimit.toFixed(2)}{" "}
            sats — {dustLimits.upperLimit.toFixed(2)} sats
          </Typography>
        </Box>

        <Typography variant="h6" className="potential-fee-waste-title">
          Potential Fee Waste
        </Typography>

        <Box className="waste-amount-container">
          <Typography variant="h4" className="waste-amount-text">
            {formatNumber(wasteAmount)} sats
          </Typography>
          <Tooltip title="This shows how much extra you may be paying by spending coins now based on the waste calculation algorithm.">
            <IconButton size="small" className="info-icon-button">
              <InfoIcon className="info-icon" />
            </IconButton>
          </Tooltip>
        </Box>

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

        <Typography
          id="long-term-fee-estimate-slider"
          variant="body2"
          className="fee-estimate-text"
        >
          Long Term Fee Estimate (L): {longTermFeeEstimate.toLocaleString()}{" "}
          sats/vB
          <Tooltip title="L is a hypothetical future fee rate used to evaluate output viability and calculate potential waste from spending UTXOs now versus later.">
            <IconButton size="small" className="info-icon-button">
              <InfoIcon className="info-icon" />
            </IconButton>
          </Tooltip>
        </Typography>

        <Typography
          variant="body2"
          className={`fee-level-indicator ${feeLevelInfo.className}`}
        >
          {feeLevelInfo.label}
        </Typography>
      </Box>

      <Typography variant="body2" className="swa-description">
        Waste analysis indicates whether it is economical to spend UTXOs now or
        wait to consolidate later when fees could be lower, based on the
        calculated waste metrics.
      </Typography>
    </Box>
  );
};
