import React, { useState, useEffect, useMemo } from "react";
import { Box, Typography, Slider, Tooltip, IconButton } from "@mui/material";
import InfoIcon from "@mui/icons-material/Info";
import { useSelector } from "react-redux";
import { bitcoinsToSatoshis } from "@caravan/bitcoin";
import { getWalletConfig, WalletState } from "../../../selectors/wallet";
import { calculateWasteMetric } from "@caravan/health";
import BigNumber from "bignumber.js";
import "../styles.css";

interface TransactionState {
  fee: number;
  feeRate: number;
  outputs: any[];
  inputs: any[];
  changeAddress: string;
}

interface SpendState {
  transaction: TransactionState;
}

interface RootState {
  wallet: WalletState;
  spend: SpendState;
}

export const SWASlider = () => {
  const { fee, feeRate, outputs, inputs } = useSelector(
    (state: RootState) => state.spend.transaction,
  );
  const [longTermFeeEstimate, setLongTermFeeEstimate] = useState<number>(feeRate);
  const [wasteAmount, setWasteAmount] = useState<BigNumber>(new BigNumber(0));


  const changeAddress = useSelector(
    (state: RootState) => state.spend.transaction.changeAddress,
  );
  const walletConfig = useSelector(getWalletConfig);

  enum FeeLevel {
    VeryLow = "Very Low Fees",
    Low = "Low Fees",
    Medium = "Medium Fees",
    High = "High Fees",
    VeryHigh = "Very High Fees",
  }

  // somewhat arbitrarily based on historical levels of fee rate fluctuations as of 2025
  // https://mempool.space/graphs/mining/block-fee-rates
  const FEE_LEVELS = [
    { max: 10, label: FeeLevel.VeryLow, className: "fee-level-very-low" },
    { max: 50, label: FeeLevel.Low, className: "fee-level-low" },
    { max: 100, label: FeeLevel.Medium, className: "fee-level-medium" },
    { max: 200, label: FeeLevel.High, className: "fee-level-high" },
    {
      max: Infinity,
      label: FeeLevel.VeryHigh,
      className: "fee-level-very-high",
    },
  ];

  const getFeeLevelInfo = (feeRate: number) => {
    return FEE_LEVELS.find(({ max }) => feeRate <= max)!;
  };

  /**
   * formatNumber
   * ------------
   * Takes a BigNumber input, rounds it to the nearest integer,
   * and returns a string with commas inserted as thousands separators.
   * BigNumber is preferred over Number because JavaScript's Number type can
   * introduce precision errors with floating point arithmetic.
   *
   * @param num – the BigNumber to format
   * @returns a formatted string like "1,234,567"
   */
  const formatNumber = (num: BigNumber) =>
    num.integerValue(BigNumber.ROUND_HALF_UP).toFormat();

  const handleSliderChange = (event: Event, value: number | number[]) => {
    const newValue = Array.isArray(value) ? value[0] : value;
    setLongTermFeeEstimate(newValue);
  };

  const valuetext = (value: number) => {
    return `${value} sats/vB`;
  };

  // Calculate all waste metrics
  useEffect(() => {
    if (!fee || !feeRate || !walletConfig || !outputs || !inputs) return;

    try {
      const feeRateSatPerVb = new BigNumber(feeRate);

      let nonChangeOutputsTotalSats = new BigNumber(0);
      outputs.forEach((output: any) => {
        const amountSats = output.amountSats
          ? new BigNumber(output.amountSats)
          : new BigNumber(bitcoinsToSatoshis(output.amount));

        if (output.address !== changeAddress) {
          nonChangeOutputsTotalSats =
            nonChangeOutputsTotalSats.plus(amountSats);
        }
      });

      // Prepare parameters for waste calculation
      const coinAmounts = inputs.map((input: any) => {
        const amountSats = input.amountSats
          ? new BigNumber(input.amountSats)
          : new BigNumber(bitcoinsToSatoshis(input.amount));
        return amountSats.toNumber();
      });

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
        effectiveFeeRate: feeRateSatPerVb.toNumber(),
        estimatedLongTermFeeRate: longTermFeeEstimate,
        hasChange,
        spendAmount: nonChangeOutputsTotalSats.toNumber(),
      });

      setWasteAmount(new BigNumber(newWasteAmount));
    } catch (err) {
      console.error("Error calculating waste metrics:", err);
      setWasteAmount(new BigNumber(0));
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
        Analyzes whether spending this bitcoin now vs later when fee market might be different is more efficient for the long term health of your wallet's UTXO set.
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
            valueLabelDisplay="auto"
            getAriaValueText={valuetext}
            valueLabelFormat={valuetext}
          />
        </Box>

        {/* Waste Amount */}
        <Box className="waste-amount-container">
          <Typography variant="h4" className="waste-amount-text">
            {formatNumber(wasteAmount)}
          </Typography>
          <Typography variant="body2" className="waste-amount-units">
            units of waste
          </Typography>
          <Tooltip title="Shows how much waste this transaction will create or destroy (if negative) for your wallet if spent now depending on your long term fee rate expectations">
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
          <Tooltip title="Expected fee rate in the future. Depending on how long you're able to wait to send this transaction, what do you expect the fees to be. This will help determine if it's better to wait to send this transaction.">
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
