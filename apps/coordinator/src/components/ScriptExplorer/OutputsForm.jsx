import React from "react";
import PropTypes from "prop-types";
import { connect } from "react-redux";
import { map } from "lodash";
import BigNumber from "bignumber.js";
import {
  bitcoinsToSatoshis,
  satoshisToBitcoins,
  estimateMultisigTransactionFee,
} from "@caravan/bitcoin";
import {
  Grid,
  Button,
  Tooltip,
  TextField,
  Box,
  IconButton,
  InputAdornment,
  Typography,
  FormHelperText,
  Paper,
  Divider,
  Chip,
} from "@mui/material";
import { Speed } from "@mui/icons-material";
import AddIcon from "@mui/icons-material/Add";
import {
  addOutput as addOutputAction,
  setOutputAmount as setOutputAmountAction,
  setFeeRate as setFeeRateAction,
  setFee as setFeeAction,
  finalizeOutputs as finalizeOutputsAction,
  resetOutputs as resetOutputsAction,
} from "../../actions/transactionActions";
import { updateBlockchainClient } from "../../actions/clientActions";
import { MIN_SATS_PER_BYTE_FEE } from "../Wallet/constants";
import OutputEntry from "./OutputEntry";
import styles from "./styles.module.scss";

class OutputsForm extends React.Component {
  static unitLabel(label, options) {
    let inputProps = {
      endAdornment: (
        <InputAdornment position="end">
          <FormHelperText>{label}</FormHelperText>
        </InputAdornment>
      ),
    };
    if (options) {
      inputProps = {
        ...inputProps,
        ...options,
      };
    }
    return inputProps;
  }

  titleRef = React.createRef();

  outputsTotal = 0;

  constructor(props) {
    super(props);
    this.state = {
      feeRateFetchError: "",
    };
  }

  componentDidMount = () => {
    this.initialOutputState();
    this.scrollToTitle();
  };

  scrollToTitle = () => {
    const { signatureImporters, isWallet } = this.props;
    const finalizedCount = Object.keys(signatureImporters).reduce(
      (o, k) => o + signatureImporters[k].finalized,
      0,
    );
    if (finalizedCount === 0 && !isWallet)
      this.titleRef.current.scrollIntoView({ behavior: "smooth" });
  };

  renderOutputs = () => {
    const { outputs, changeOutputIndex, autoSpend } = this.props;
    return map(outputs).map((output, i) => (
      <Box
        key={i} // eslint-disable-line react/no-array-index-key
        display={autoSpend && changeOutputIndex === i + 1 ? "none" : "block"}
      >
        <Grid container>
          <OutputEntry number={i + 1} />
        </Grid>
      </Box>
    ));
  };

  inputsTotal = () => {
    const { inputsTotalSats } = this.props;
    return satoshisToBitcoins(inputsTotalSats);
  };

  outputsAndFeeTotal = () => {
    const { outputs, fee, updatesComplete, inputs } = this.props;
    let total = outputs
      .map((output) => {
        let { amount } = output;
        if (!amount || !amount.length || Number.isNaN(amount)) amount = 0;
        return new BigNumber(amount);
      })
      .reduce(
        (accumulator, currentValue) => accumulator.plus(currentValue),
        new BigNumber(0),
      );

    // only care to add fee if we have inputs
    // which we won't have in auto-spend wallet output form
    if (fee && inputs.length) total = total.plus(fee);

    if (updatesComplete) {
      this.outputsTotal = total;
      return total.toFixed(8);
    }
    return "0.00000000";
  };

  hasFeeRateFetchError = () => {
    const { feeRateFetchError } = this.state;
    return feeRateFetchError !== "";
  };

  hasFeeRateError = () => {
    const { feeRateError } = this.props;
    return feeRateError !== "";
  };

  hasFeeError = () => {
    const { feeError } = this.props;
    return feeError !== "";
  };

  hasBalanceError = () => {
    const { balanceError } = this.props;
    return balanceError !== "";
  };

  hasError = () => {
    return (
      this.hasFeeRateFetchError() ||
      this.hasFeeRateError() ||
      this.hasFeeError() ||
      this.hasBalanceError()
    );
  };

  handleAddOutput = () => {
    const { addOutput } = this.props;
    addOutput();
  };

  handleFeeRateChange = (event) => {
    const { setFeeRate } = this.props;
    let rate = event.target.value;
    console.log("rate", rate);
    // Limit to 2 decimal places in the input
    if (rate.includes(".")) {
      const parts = rate.split(".");
      if (parts[1] && parts[1].length > 2) return; // Don't accept more than 2 decimals
    }

    setFeeRate(rate === "" ? "0" : rate); // Reducer handles fee calculation and validation
  };

  handleFeeChange = (event) => {
    const { setFee } = this.props;
    setFee(event.target.value);
    // That's it. Reducer handles rate back-calculation.
  };

  // Bump fee by 1 satoshi
  handleFeeBump = () => {
    const { fee, setFee } = this.props;
    try {
      const currentSats = bitcoinsToSatoshis(new BigNumber(fee || 0));
      const bumped = currentSats.plus(1);
      setFee(satoshisToBitcoins(bumped).toString());
    } catch (e) {
      // If current fee is unparseable, ignore
    }
  };

  // Compute estimated fee from rate for display in auto mode
  getEstimatedFeeFromRate = () => {
    const { feeRate, outputs, addressType, requiredSigners, totalSigners } =
      this.props;

    if (!feeRate || parseFloat(feeRate) <= 0) return "—";

    try {
      const estimated = estimateMultisigTransactionFee({
        addressType,
        numInputs: 1, // estimate with 1 input as minimum
        numOutputs: Math.max(outputs.length, 1),
        m: requiredSigners,
        n: totalSigners,
        feesPerByteInSatoshis: feeRate,
      });
      return satoshisToBitcoins(estimated).toString();
    } catch (e) {
      return "—";
    }
  };

  handleFinalize = () => {
    const { finalizeOutputs } = this.props;
    finalizeOutputs(true);
  };

  handleReset = () => {
    const { resetOutputs, isWallet } = this.props;
    resetOutputs();
    if (!isWallet) setTimeout(() => this.initialOutputState(), 0);
  };

  getFeeEstimate = async () => {
    const { getBlockchainClient, setFeeRate } = this.props;
    const client = await getBlockchainClient();
    let feeEstimate;
    let feeRateFetchError = "";
    try {
      feeEstimate = await client.getFeeEstimate();
    } catch (e) {
      feeRateFetchError = "There was an error fetching the fee rate.";
      console.error(e);
    } finally {
      setFeeRate(
        !Number.isNaN(feeEstimate)
          ? feeEstimate.toString()
          : MIN_SATS_PER_BYTE_FEE.toString(),
      );
      this.setState({ feeRateFetchError });
    }
  };

  gatherSignaturesDisabled = () => {
    const { finalizedOutputs, outputs, inputs } = this.props;
    if (inputs.length === 0) return true;
    if (finalizedOutputs || this.hasError()) {
      return true;
    }
    for (let i = 0; i < outputs.length; i += 1) {
      const output = outputs[i];
      if (
        output.address === "" ||
        output.amount === "" ||
        output.addressError !== "" ||
        output.amountError !== ""
      ) {
        return true;
      }
    }
    return false;
  };

  async initialOutputState() {
    const { inputs, outputs } = this.props;
    await this.getFeeEstimate();
    const { inputsTotalSats, fee, setOutputAmount } = this.props;
    const feeSats = bitcoinsToSatoshis(new BigNumber(fee));
    const outputAmount = satoshisToBitcoins(inputsTotalSats.minus(feeSats));
    // only initialize once so we don't lose state
    if (inputs.length && outputs[0].amount === "")
      setOutputAmount(1, outputAmount);
  }

  render() {
    const {
      feeRate,
      fee,
      feeError,
      finalizedOutputs,
      feeRateError,
      balanceError,
      inputs,
      isWallet,
      autoSpend,
    } = this.props;
    const { feeRateFetchError } = this.state;

    // Auto-spend: no inputs selected yet → show estimate from rate, not reducer fee
    // Manual: show reducer fee directly
    const hasInputs = inputs.length > 0;
    const canEditFee = !autoSpend && hasInputs;

    let feeDisplay;
    if (autoSpend) {
      feeDisplay = hasInputs ? fee : this.getEstimatedFeeFromRate();
    } else {
      feeDisplay = fee || "";
    }

    const gridSpacing = isWallet ? 10 : 1;

    return (
      <>
        <Box ref={this.titleRef}>
          {/* ====== Outputs Section ====== */}
          <Box mb={3}>
            <Grid container spacing={gridSpacing}>
              <Grid item xs={7}>
                <Typography
                  variant="caption"
                  className={styles.outputsFormLabel}
                  sx={{ fontWeight: 600, letterSpacing: 0.5 }}
                >
                  RECIPIENT
                </Typography>
              </Grid>
              <Grid item xs={3}>
                <Typography
                  variant="caption"
                  className={styles.outputsFormLabel}
                  sx={{ fontWeight: 600, letterSpacing: 0.5 }}
                >
                  AMOUNT
                </Typography>
              </Grid>
            </Grid>

            {this.renderOutputs()}

            <Button
              color="primary"
              disabled={finalizedOutputs}
              onClick={this.handleAddOutput}
              size="small"
              sx={{ mt: 1 }}
            >
              <AddIcon fontSize="small" sx={{ mr: 0.5 }} /> Add output
            </Button>
          </Box>

          <Divider sx={{ my: 3 }} />

          {/* ====== Fee Section ====== */}
          <Paper
            variant="outlined"
            sx={{
              p: 2.5,
              borderColor: "divider",
              borderRadius: 2,
              backgroundColor: "action.hover",
            }}
          >
            <Box
              display="flex"
              alignItems="center"
              justifyContent="space-between"
              mb={2}
            >
              <Typography
                variant="subtitle2"
                sx={{
                  fontWeight: 600,
                  letterSpacing: 0.5,
                  textTransform: "uppercase",
                  fontSize: "0.75rem",
                  color: "text.secondary",
                }}
              >
                Transaction Fee
              </Typography>
              {autoSpend && (
                <Chip
                  label="Auto-select mode"
                  size="small"
                  variant="outlined"
                  color="info"
                  sx={{ fontSize: "0.65rem", height: 22 }}
                />
              )}
            </Box>

            <Grid container spacing={3} alignItems="flex-start">
              {/* Fee Rate */}
              <Grid item xs={12} sm={5}>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ display: "block", mb: 0.5, fontWeight: 500 }}
                >
                  Fee Rate
                </Typography>
                <TextField
                  fullWidth
                  value={feeRate}
                  variant="outlined"
                  size="small"
                  type="number"
                  inputProps={{ min: 0, step: 0.01 }}
                  name="fee_rate"
                  disabled={finalizedOutputs}
                  onChange={this.handleFeeRateChange}
                  error={this.hasFeeRateError()}
                  helperText={feeRateFetchError || feeRateError}
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <Tooltip placement="top" title="Fetch recommended rate">
                          <span>
                            <IconButton
                              onClick={this.getFeeEstimate}
                              disabled={finalizedOutputs}
                              size="small"
                              color="primary"
                            >
                              <Speed fontSize="small" />
                            </IconButton>
                          </span>
                        </Tooltip>
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          sx={{ ml: 0.5, whiteSpace: "nowrap" }}
                        >
                          sats/vB
                        </Typography>
                      </InputAdornment>
                    ),
                  }}
                />
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ display: "block", mt: 0.5, lineHeight: 1.3 }}
                >
                  Check{" "}
                  <a
                    href="https://mempool.space"
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: "inherit", textDecoration: "underline" }}
                  >
                    mempool.space
                  </a>{" "}
                  for current rates
                </Typography>
              </Grid>

              {/* Estimated Fee */}
              <Grid item xs={12} sm={5}>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ display: "block", mb: 0.5, fontWeight: 500 }}
                >
                  {autoSpend ? "Estimated Fee" : "Fee Amount"}
                </Typography>
                <TextField
                  fullWidth
                  name="fee_total"
                  disabled={finalizedOutputs || !canEditFee}
                  value={feeDisplay}
                  variant="outlined"
                  size="small"
                  type="text"
                  onChange={this.handleFeeChange}
                  error={this.hasFeeError()}
                  helperText={feeError || ""}
                  InputProps={{
                    readOnly: !canEditFee,
                    endAdornment: (
                      <InputAdornment position="end">
                        {/* +1 sat bump — only in manual mode with inputs */}
                        {canEditFee && !finalizedOutputs && (
                          <Tooltip
                            title="Bump fee by +1 satoshi"
                            placement="top"
                          >
                            <span>
                              <IconButton
                                onClick={this.handleFeeBump}
                                size="small"
                                color="primary"
                                sx={{ mr: 0.5 }}
                              >
                                <AddIcon fontSize="small" />
                              </IconButton>
                            </span>
                          </Tooltip>
                        )}
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          sx={{ whiteSpace: "nowrap" }}
                        >
                          BTC
                        </Typography>
                      </InputAdornment>
                    ),
                    sx: {
                      backgroundColor: canEditFee
                        ? "background.paper"
                        : "transparent",
                      "& .MuiOutlinedInput-notchedOutline": {
                        borderStyle: canEditFee ? "solid" : "dashed",
                      },
                    },
                  }}
                />
                {/* Contextual hints */}
                {!canEditFee && !autoSpend && !hasInputs && (
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ display: "block", mt: 0.5, fontStyle: "italic" }}
                  >
                    Select inputs to edit fee directly
                  </Typography>
                )}
                {autoSpend && !hasInputs && (
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ display: "block", mt: 0.5, fontStyle: "italic" }}
                  >
                    Estimate based on ~1 input. Final fee set during coin
                    selection.
                  </Typography>
                )}
                {autoSpend && hasInputs && (
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ display: "block", mt: 0.5, fontStyle: "italic" }}
                  >
                    Finalized during coin selection
                  </Typography>
                )}
                {canEditFee && (
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ display: "block", mt: 0.5 }}
                  >
                    Edit to set exact fee — rate updates automatically
                  </Typography>
                )}
              </Grid>

              <Grid item xs={12} sm={2} />
            </Grid>
          </Paper>

          {/* ====== Totals Section ====== */}
          <Paper
            variant="outlined"
            sx={{
              mt: 3,
              p: 2.5,
              borderColor: "divider",
              borderRadius: 2,
            }}
          >
            <Typography
              variant="subtitle2"
              sx={{
                fontWeight: 600,
                mb: 2,
                letterSpacing: 0.5,
                textTransform: "uppercase",
                fontSize: "0.75rem",
                color: "text.secondary",
              }}
            >
              {!isWallet || (isWallet && !autoSpend)
                ? "Transaction Summary"
                : "Output Summary"}
            </Typography>

            <Grid container spacing={3} alignItems="center">
              {/* Inputs Total — hidden in auto-spend */}
              {(!isWallet || (isWallet && !autoSpend)) && (
                <Grid item xs={12} sm={4}>
                  <Box>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ display: "block", mb: 0.5, fontWeight: 500 }}
                    >
                      Inputs Total
                    </Typography>
                    <Box display="flex" alignItems="baseline" gap={0.5}>
                      <Typography
                        variant="h6"
                        sx={{ fontFamily: "monospace", fontWeight: 600 }}
                      >
                        {this.inputsTotal().toString()}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        BTC
                      </Typography>
                    </Box>
                  </Box>
                </Grid>
              )}

              {/* Outputs + Fee Total */}
              <Grid item xs={12} sm={4}>
                <Box>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ display: "block", mb: 0.5, fontWeight: 500 }}
                  >
                    {!isWallet || (isWallet && !autoSpend)
                      ? "Outputs + Fee"
                      : "Outputs Total"}
                  </Typography>
                  <Box display="flex" alignItems="baseline" gap={0.5}>
                    <Typography
                      variant="h6"
                      sx={{
                        fontFamily: "monospace",
                        fontWeight: 600,
                        color: this.hasBalanceError()
                          ? "error.main"
                          : "text.primary",
                      }}
                    >
                      {this.outputsAndFeeTotal()}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      BTC
                    </Typography>
                  </Box>
                  {balanceError && (
                    <Typography
                      variant="caption"
                      color="error"
                      sx={{ display: "block", mt: 0.5 }}
                    >
                      {balanceError}
                    </Typography>
                  )}
                </Box>
              </Grid>

              {/* Balance difference indicator */}
              {(!isWallet || (isWallet && !autoSpend)) &&
                hasInputs &&
                !this.hasBalanceError() && (
                  <Grid item xs={12} sm={4}>
                    <Chip
                      label="Balanced ✓"
                      color="success"
                      size="small"
                      variant="outlined"
                      sx={{ fontWeight: 500 }}
                    />
                  </Grid>
                )}
            </Grid>
          </Paper>
        </Box>

        {/* ====== Action Buttons (Script Explorer only) ====== */}
        {!isWallet && (
          <Box mt={4}>
            <Grid container spacing={2} justifyContent="center">
              <Grid item>
                <Button
                  variant="contained"
                  color="primary"
                  disabled={this.gatherSignaturesDisabled()}
                  onClick={this.handleFinalize}
                >
                  Gather Signatures
                </Button>
              </Grid>
              <Grid item>
                <Button
                  variant="outlined"
                  color="secondary"
                  disabled={finalizedOutputs}
                  onClick={this.handleReset}
                >
                  Reset Outputs
                </Button>
              </Grid>
            </Grid>
          </Box>
        )}
      </>
    );
  }
}

OutputsForm.propTypes = {
  addOutput: PropTypes.func.isRequired,
  autoSpend: PropTypes.bool.isRequired,
  balanceError: PropTypes.string.isRequired,
  change: PropTypes.shape({
    nextNode: PropTypes.shape({
      multisig: PropTypes.shape({
        address: PropTypes.string,
      }),
    }),
  }).isRequired,
  changeOutputIndex: PropTypes.number.isRequired,
  client: PropTypes.shape({}).isRequired,
  fee: PropTypes.string.isRequired,
  feeError: PropTypes.string.isRequired,
  feeRateError: PropTypes.string.isRequired,
  finalizeOutputs: PropTypes.func.isRequired,
  feeRate: PropTypes.string.isRequired,
  finalizedOutputs: PropTypes.bool.isRequired,
  inputs: PropTypes.arrayOf(PropTypes.shape({})).isRequired,
  inputsTotalSats: PropTypes.shape({
    minus: PropTypes.func,
  }).isRequired,
  isWallet: PropTypes.bool.isRequired,
  network: PropTypes.string.isRequired,
  outputs: PropTypes.arrayOf(
    PropTypes.shape({
      address: PropTypes.string,
      addressError: PropTypes.string,
      amount: PropTypes.string,
      amountError: PropTypes.string,
    }),
  ).isRequired,
  resetOutputs: PropTypes.func.isRequired,
  setFeeRate: PropTypes.func.isRequired,
  setFee: PropTypes.func.isRequired,
  setOutputAmount: PropTypes.func.isRequired,
  signatureImporters: PropTypes.shape({}).isRequired,
  updatesComplete: PropTypes.bool,
  getBlockchainClient: PropTypes.func.isRequired,
  addressType: PropTypes.string.isRequired,
  requiredSigners: PropTypes.number.isRequired,
  totalSigners: PropTypes.number.isRequired,
};

OutputsForm.defaultProps = {
  updatesComplete: false,
};

function mapStateToProps(state) {
  return {
    ...{
      network: state.settings.network,
      addressType: state.settings.addressType,
      requiredSigners: state.settings.requiredSigners,
      totalSigners: state.settings.totalSigners,
      client: state.client,
    },
    ...state.spend.transaction,
    ...state.client,
    signatureImporters: state.spend.signatureImporters,
    change: state.wallet.change,
  };
}

const mapDispatchToProps = {
  addOutput: addOutputAction,
  setOutputAmount: setOutputAmountAction,
  setFeeRate: setFeeRateAction,
  setFee: setFeeAction,
  finalizeOutputs: finalizeOutputsAction,
  resetOutputs: resetOutputsAction,
  getBlockchainClient: updateBlockchainClient,
};

export default connect(mapStateToProps, mapDispatchToProps)(OutputsForm);
