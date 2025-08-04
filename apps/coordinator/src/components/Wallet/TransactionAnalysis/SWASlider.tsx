import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Slider,
  Tooltip,
  IconButton,
  Alert,
  AlertTitle,
  Button,
} from "@mui/material";
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

const SpendRecommendation = ({
  initialWasteScore,
  wasteAmount,
}: {
  initialWasteScore: BigNumber;
  wasteAmount: BigNumber;
}) => {
  const wasteDifference = wasteAmount.minus(initialWasteScore);

  const shouldSpendNow = wasteDifference.isLessThan(0);
  let text = "";
  let title = "";

  if (shouldSpendNow) {
    title = "Now's a good time to spend";
    text =
      "Based on your long term fee rate expectations, spending now could produce less waste for your wallet. This might be a good time to spend this transaction.";
  } else {
    title = "Consider waiting to spend";
    text =
      "Based on your long term fee rate expectations, waiting to spend could produce less waste for your wallet. If you can afford to wait, consider letting the fee market adjust before spending.";
  }

  if (wasteDifference.isZero()) {
    return null;
  }

  return (
    <Alert severity={shouldSpendNow ? "success" : "warning"}>
      <AlertTitle>{title}</AlertTitle>
      {text}
    </Alert>
  );
};

export const SWASlider = () => {
  const { fee, feeRate, outputs, inputs } = useSelector(
    (state: RootState) => state.spend.transaction,
  );
  const [longTermFeeEstimate, setLongTermFeeEstimate] = useState<number>(
    Number(feeRate),
  );
  const [wasteAmount, setWasteAmount] = useState<BigNumber>(new BigNumber(0));

  // going to use this for comparisons
  const [initialWasteScore, setInitialWasteScore] = useState<BigNumber>(
    new BigNumber(0),
  );

  const changeAddress = useSelector(
    (state: RootState) => state.spend.transaction.changeAddress,
  );
  const walletConfig = useSelector(getWalletConfig);

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

      if (initialWasteScore.isZero()) {
        setInitialWasteScore(new BigNumber(newWasteAmount));
      }
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

  return (
    <Box className="swa-slider-container">
      {/* Header */}
      <Typography variant="h6" className="waste-analysis-title">
        Waste Analysis
      </Typography>
      <Typography variant="body2" className="waste-analysis-description">
        Analyzes whether spending this bitcoin now vs later when the fee market
        might be different is more efficient for the long term health of your
        wallet&apos;s UTXO set. Optimize your bitcoin spending by using Bitcoin
        Core&apos;s waste analysis formula.
      </Typography>
      <Typography
        variant="body2"
        className="waste-analysis-description"
        sx={{
          mt: 2,
        }}
      >
        <a
          href="https://bitcoin.stackexchange.com/questions/113622/what-does-waste-metric-mean-in-the-context-of-coin-selection"
          target="_blank"
          rel="noopener noreferrer"
        >
          What is the &quot;Waste Metric&quot;?
        </a>
        <Tooltip title="Factors that impact waste include fee rate fluctuations over time, if your transaction has a change output (which would need to be spent in the future), or a large number of inputs.">
          <InfoIcon className="info-icon" />
        </Tooltip>
        <br />
        <br />
        Factors that impact waste include fee rate fluctuations over time, if
        your transaction has a change output (which would need to be spent in
        the future), or a large number of inputs.
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
          {longTermFeeEstimate !== Number(feeRate) && (
            <Button
              variant="outlined"
              size="small"
              onClick={() => setLongTermFeeEstimate(Number(feeRate))}
            >
              Reset
            </Button>
          )}
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

        <SpendRecommendation
          initialWasteScore={initialWasteScore}
          wasteAmount={wasteAmount}
        />
      </Box>
    </Box>
  );
};
