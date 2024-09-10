import React from "react";
import PropTypes from "prop-types";
import { connect } from "react-redux";
import { map } from "lodash";
import BigNumber from "bignumber.js";
import { bitcoinsToSatoshis, satoshisToBitcoins } from "@caravan/bitcoin";
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
  Slider,
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
import InfoIcon from "@mui/icons-material/Info";
import { WasteMetrics } from "@caravan/health";
import { getWalletConfig } from "../../selectors/wallet";

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
      longTermFeeEstimate: 101,
      wasteAmount: 0,
    };
  }

  componentDidMount = () => {
    this.initialOutputState();
    this.scrollToTitle();
    this.calculateWaste();
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
    this.calculateWaste();
  };

  handleFeeRateChange = (event) => {
    const { setFeeRate } = this.props;
    let rate = event.target.value;
    this.calculateWaste();
    if (
      rate === "" ||
      Number.isNaN(parseFloat(rate, 10)) ||
      parseFloat(rate, 10) < 1
    )
      rate = "0";
    setFeeRate(rate);
  };

  handleFeeChange = (event) => {
    const { setFee } = this.props;
    setFee(event.target.value);
    this.calculateWaste();
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
    const { getBlockchainClient, setFeeRate, onFeeEstimate } = this.props;
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
      // Call the parent's callback function with the feeEstimate
      if (onFeeEstimate) {
        onFeeEstimate(feeEstimate.toString());
      }
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

  handleLongTermFeeEstimateChange = (event, newValue) => {
    this.setState({ longTermFeeEstimate: newValue });
    this.calculateWaste();
  };

  calculateWaste = () => {
    console.log("Called calculate waste");
    const { feeRate, fee } = this.props;
    const { longTermFeeEstimate } = this.state;
    const weight = fee / satoshisToBitcoins(feeRate);
    const wasteMetrics = new WasteMetrics();
    const walletConfig = this.props.walletConfig;
    const scriptType = walletConfig.addressType;
    const config = {
      requiredSignerCount: walletConfig.quorum.requiredSigners,
      totalSignerCount: walletConfig.quorum.totalSigners,
    };
    const wasteAmount = wasteMetrics.spendWasteAmount(
      weight,
      feeRate,
      scriptType,
      config,
      longTermFeeEstimate,
    );
    // console.log(fee, feeRate, weight,walletConfig, wasteAmount);
    this.setState({ wasteAmount });
  };

  render() {
    const {
      feeRate,
      fee,
      finalizedOutputs,
      feeRateError,
      feeError,
      balanceError,
      inputs,
      isWallet,
      autoSpend,
    } = this.props;
    const { feeRateFetchError } = this.state;
    const feeDisplay = inputs && inputs.length > 0 ? fee : "0.0000";
    const feeMt = 3;
    const totalMt = 7;
    const actionMt = 7;
    const gridSpacing = isWallet ? 10 : 1;
    const { longTermFeeEstimate, wasteAmount } = this.state;
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
                    onChange={this.handleFeeChange}
                    error={this.hasFeeError()}
                    helperText={feeError}
                    InputProps={OutputsForm.unitLabel("BTC", {
                      readOnly: true,
                      disableUnderline: true,
                      style: { color: "gray" },
                    })}
                  />
                </Box>
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

          {wasteAmount ? (
            <Grid item xs={12}>
              <h3>
                Waste Analysis
                <Tooltip title="Waste analysis helps calculate inefficiencies in the transaction due to fees, UTXO consolidation, etc.">
                  <IconButton size="small" sx={{ marginLeft: 1 }}>
                    <InfoIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </h3>
              <Typography gutterBottom>
                Spend Waste Amount (SWA): {wasteAmount.toFixed(2)} Sats
                <Tooltip title="SWA represents the amount of waste in Satoshis spent during the transaction due to inefficiencies. Postive SWA means that it would be efficient to spend this transaction later when the feerate decreases. For Negative SWA, spending now could be the best decision.">
                  <IconButton size="small" sx={{ marginLeft: 1 }}>
                    <InfoIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Typography>
              <Slider
                value={longTermFeeEstimate}
                min={1}
                max={500}
                step={1}
                onChange={this.handleLongTermFeeEstimateChange}
                aria-labelledby="long-term-fee-estimate-slider"
              />
              <Typography id="long-term-fee-estimate-slider" gutterBottom>
                Long Term Fee Estimate (L): {longTermFeeEstimate} sats/vB
                <Tooltip title="L refers to the long-term estimated fee rate in Satoshis per vByte for future transactions.">
                  <IconButton size="small" sx={{ marginLeft: 1 }}>
                    <InfoIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Typography>
            </Grid>
          ) : null}
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
  onFeeEstimate: PropTypes.func,
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
  walletConfig: PropTypes.object,
};

OutputsForm.defaultProps = {
  updatesComplete: false,
};

function mapStateToProps(state) {
  return {
    ...{
      network: state.settings.network,
      client: state.client,
    },
    ...state.spend.transaction,
    ...state.client,
    signatureImporters: state.spend.signatureImporters,
    change: state.wallet.change,
    walletConfig: getWalletConfig(state),
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
