import React from "react";
import PropTypes from "prop-types";
import { connect } from "react-redux";
import { map } from "lodash";
import BigNumber from "bignumber.js";
import {
  bitcoinsToSatoshis,
  satoshisToBitcoins,
  estimateMultisigTransactionFeeRate,
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
      lastEditedFeeField: "rate", // Track which field was edited last: 'rate' or 'amount'
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
    const { setFeeRate, setFee, inputs, outputs } = this.props;
    const { addressType, requiredSigners: m, totalSigners: n } = this.props;

    let rate = event.target.value;
    if (
      rate === "" ||
      Number.isNaN(parseFloat(rate, 10)) ||
      parseFloat(rate, 10) < 1
    )
      rate = "0";

    setFeeRate(rate);
    this.setState({ lastEditedFeeField: "rate" });

    // Optional: Update fee amount if inputs are already selected
    if (inputs.length > 0 && parseFloat(rate) > 0) {
      const actualOutputs = outputs.filter(
        (o) => o.amount && o.amount !== "",
      ).length;
      const estimatedFees = estimateMultisigTransactionFee({
        addressType,
        numInputs: inputs.length,
        numOutputs: actualOutputs,
        m,
        n,
        feesPerByteInSatoshis: rate,
      });
      console.log("estimatedFees", estimatedFees);
      const feeInBTC = satoshisToBitcoins(estimatedFees);
      setFee(feeInBTC);
    }
  };

  handleFeeChange = (event) => {
    const { setFee, setFeeRate, inputs, outputs } = this.props;
    const { addressType, requiredSigners: m, totalSigners: n } = this.props;

    const feeAmount = event.target.value;
    setFee(feeAmount);
    this.setState({ lastEditedFeeField: "amount" });

    // Calculate effective fee rate from the entered fee amount
    if (
      inputs.length > 0 &&
      feeAmount &&
      !Number.isNaN(parseFloat(feeAmount))
    ) {
      // Count actual outputs (excluding empty ones and change if auto-calculated)
      const actualOutputs = outputs.filter(
        (o) => o.amount && o.amount !== "",
      ).length;
      const feeSats = bitcoinsToSatoshis(new BigNumber(feeAmount));
      const estimatedFeeRate = estimateMultisigTransactionFeeRate({
        addressType,
        numInputs: inputs.length,
        numOutputs: actualOutputs,
        m,
        n,
        feesInSatoshis: feeSats,
      });

      if (estimatedFeeRate > 0) {
        // Update fee rate to show what rate this fee amount represents
        setFeeRate(estimatedFeeRate);
      }
    }
    console.log("fee", { setFee, setFeeRate, inputs, outputs });
  };

  // Helper to show effective fee rate when user edits fee amount
  getFeeHelperText = () => {
    const { feeError, inputs } = this.props;
    const { lastEditedFeeField } = this.state;

    if (feeError) return feeError;

    if (lastEditedFeeField === "amount" && inputs.length > 0) {
      return "Note: Fee rate shown is effective rate. Actual rate may vary after coin selection.";
    }

    return "";
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
      finalizedOutputs,
      feeRateError,
      balanceError,
      inputs,
      isWallet,
      autoSpend,
    } = this.props;
    const { feeRateFetchError, lastEditedFeeField } = this.state;
    const feeDisplay = inputs && inputs.length > 0 ? fee : "0.0000";
    const feeMt = 3;
    const totalMt = 7;
    const actionMt = 7;
    const gridSpacing = isWallet ? 10 : 1;
    return (
      <>
        <Box ref={this.titleRef}>
          <Grid container spacing={gridSpacing}>
            <Grid item xs={4}>
              <Typography variant="caption" className={styles.outputsFormLabel}>
                To
              </Typography>
            </Grid>
            <Grid item xs={3}>
              &nbsp;
            </Grid>
            <Grid item xs={3}>
              <Typography variant="caption" className={styles.outputsFormLabel}>
                Amount
              </Typography>
            </Grid>
          </Grid>

          <Grid>{this.renderOutputs()}</Grid>

          <Grid item container spacing={gridSpacing}>
            <Grid item xs={12}>
              <Button
                color="primary"
                disabled={finalizedOutputs}
                onClick={this.handleAddOutput}
              >
                <AddIcon /> Add output
              </Button>
            </Grid>
          </Grid>
          <Grid item container spacing={gridSpacing}>
            <Grid item xs={3}>
              <Box mt={feeMt}>
                <Typography
                  variant="caption"
                  className={styles.outputsFormLabel}
                >
                  Fee Rate
                </Typography>
                <TextField
                  fullWidth
                  value={feeRate}
                  variant="standard"
                  type="number"
                  minimum={0}
                  step={1}
                  name="fee_rate"
                  disabled={finalizedOutputs}
                  onChange={this.handleFeeRateChange}
                  error={this.hasFeeRateError()}
                  helperText={feeRateFetchError || feeRateError}
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <Tooltip placement="top" title="Estimate best rate">
                          <small>
                            <IconButton
                              onClick={this.getFeeEstimate}
                              disabled={finalizedOutputs}
                            >
                              <Speed />
                            </IconButton>
                          </small>
                        </Tooltip>
                        <FormHelperText>Sats/byte</FormHelperText>
                      </InputAdornment>
                    ),
                  }}
                />
              </Box>
              <Typography variant="caption" className={styles.outputsFormLabel}>
                Refer to mempool monitoring websites to ensure your selected fee
                rate is appropriate.
              </Typography>
            </Grid>

            <Grid item xs={4}>
              <Box mt={feeMt}>&nbsp;</Box>
            </Grid>
            {!isWallet || (isWallet && !autoSpend) ? (
              <Grid item xs={3}>
                <Box mt={feeMt}>
                  <Typography
                    variant="caption"
                    className={styles.outputsFormLabel}
                  >
                    Estimated Fees
                  </Typography>
                  <TextField
                    fullWidth
                    name="fee_total"
                    disabled={finalizedOutputs}
                    value={feeDisplay}
                    variant="standard"
                    type="number"
                    onChange={this.handleFeeChange}
                    error={this.hasFeeError()}
                    helperText={this.getFeeHelperText()}
                    InputProps={OutputsForm.unitLabel("BTC", {
                      readOnly: false,
                      disableUnderline: false,
                      style: { color: "inherit" },
                    })}
                  />
                </Box>
                {lastEditedFeeField === "amount" && inputs.length > 0 && (
                  <Typography
                    variant="caption"
                    color="textSecondary"
                    sx={{ display: "block", mt: 0.5 }}
                  >
                    Effective rate: {feeRate} sats/vB
                  </Typography>
                )}
              </Grid>
            ) : (
              ""
            )}

            <Grid item xs={2} />
          </Grid>

          <Grid item container spacing={gridSpacing}>
            <Grid item xs={4}>
              <Box mt={totalMt}>
                <Typography variant="h6">
                  {!isWallet || (isWallet && !autoSpend)
                    ? "Totals"
                    : "Output Total"}
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={3}>
              <Box
                display={
                  !isWallet || (isWallet && !autoSpend) ? "block" : "none"
                }
                mt={totalMt}
              >
                <TextField
                  fullWidth
                  label="Inputs Total"
                  readOnly
                  value={this.inputsTotal()}
                  variant="standard"
                  disabled={finalizedOutputs}
                  InputProps={OutputsForm.unitLabel("BTC", { readOnly: true })}
                />
              </Box>
            </Grid>
            <Grid item xs={3}>
              <Box mt={totalMt}>
                <TextField
                  fullWidth
                  label={
                    !isWallet || (isWallet && !autoSpend)
                      ? "Outputs & Fee Total"
                      : ""
                  }
                  value={this.outputsAndFeeTotal()}
                  variant="standard"
                  error={this.hasBalanceError()}
                  disabled={finalizedOutputs}
                  helperText={balanceError}
                  InputProps={OutputsForm.unitLabel("BTC", {
                    readOnly: true,
                    disableUnderline: true,
                  })}
                />
              </Box>
            </Grid>
            <Grid item xs={2} />
          </Grid>
        </Box>

        {!isWallet && (
          <Box mt={actionMt}>
            <Grid container spacing={3} justifyContent="center">
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
                  variant="contained"
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
