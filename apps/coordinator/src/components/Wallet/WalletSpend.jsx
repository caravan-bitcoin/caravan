import React from "react";
import PropTypes from "prop-types";
import { connect } from "react-redux";
import BigNumber from "bignumber.js";
import {
  Box,
  Card,
  CardContent,
  Grid,
  Switch,
  FormControlLabel,
  Button,
  Alert,
  AlertTitle,
} from "@mui/material";

import {
  updateDepositSliceAction,
  updateChangeSliceAction,
  resetNodesSpend as resetNodesSpendAction,
  autoSelectCoins as autoSelectCoinsAction,
} from "../../actions/walletActions";
import {
  setInputs as setInputsAction,
  setFeeRate as setFeeRateAction,
  addOutput,
  setOutputAddress,
  updateAutoSpendAction,
  setChangeAddressAction,
  finalizeOutputs as finalizeOutputsAction,
  SPEND_STEP_CREATE,
  SPEND_STEP_PREVIEW,
  SPEND_STEP_SIGN,
  setRBF,
  setSpendStep as setSpendStepAction,
  deleteChangeOutput as deleteChangeOutputAction,
  importPSBT as importPSBTAction,
} from "../../actions/transactionActions";
import { naiveCoinSelection } from "../../utils";
import NodeSet from "./NodeSet";
import OutputsForm from "../ScriptExplorer/OutputsForm";
import WalletSign from "./WalletSign";
import TransactionPreview from "./TransactionPreview";
import { PSBTImportComponent } from "./PSBTImportComponent";
import { bigNumberPropTypes } from "../../proptypes/utils";
import {
  dustAnalysis,
  privacyAnalysis,
} from "../../utils/transactionAnalysisUtils";

class WalletSpend extends React.Component {
  outputsAmount = new BigNumber(0);

  coinSelection = naiveCoinSelection;

  feeAmount = new BigNumber(0);

  constructor(props) {
    super(props);
    this.state = {
      importPSBTDisabled: false,
      importPSBTError: "",
      feeEstimate: "",
    };
  }
  handleFeeEstimate = (feeEstimate) => {
    this.setState({ feeEstimate });
  };

  componentDidUpdate = (prevProps) => {
    const { finalizedOutputs } = this.props;
    if (finalizedOutputs && !prevProps.finalizedOutputs) {
      this.showPreview();
    }
  };

  previewDisabled = () => {
    const {
      finalizedOutputs,
      outputs,
      feeRateError,
      feeError,
      inputs,
      balanceError,
      autoSpend,
    } = this.props;

    if (inputs.length === 0 && !autoSpend) return true;
    if (finalizedOutputs || feeRateError || feeError || balanceError) {
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

  showSignTransaction = () => {
    const { setSpendStep } = this.props;
    setSpendStep(SPEND_STEP_SIGN);
  };

  handleShowPreview = () => {
    const { autoSelectCoins, autoSpend, finalizeOutputs } = this.props;
    if (autoSpend) autoSelectCoins();
    else finalizeOutputs(true);
  };

  showPreview = () => {
    const { setSpendStep } = this.props;
    setSpendStep(SPEND_STEP_PREVIEW);
  };

  showCreate = () => {
    const {
      finalizeOutputs,
      setSpendStep,
      resetNodesSpend,
      deleteChangeOutput,
    } = this.props;
    setSpendStep(SPEND_STEP_CREATE);
    finalizeOutputs(false);
    // for auto spend view, user doesn't have direct knowledge of
    // input nodes and change. So when going back to edit a transaction
    // we want to clear these from the state, since these are added automatically
    // when going from output form to transaction preview
    // for manual spend view, we don't store which utxo is selected right now
    // So when going back to edit a transaction we want to clear everything
    // from the state so that there are no surprises
    resetNodesSpend();
    deleteChangeOutput();
  };

  handleSpendMode = (event) => {
    const { updateAutoSpend, resetNodesSpend, deleteChangeOutput } = this.props;
    updateAutoSpend(!event.target.checked);
    resetNodesSpend();
    deleteChangeOutput();
  };

  handleImportPSBT = (psbtText, resolvedInputs, hasPendingInputs) => {
    const { importPSBT } = this.props;
    try {
      importPSBT(psbtText, resolvedInputs, hasPendingInputs);
    } catch (error) {
      // The PSBTImportComponent will handle error display
      throw new Error(error);
    }
  };

  render() {
    const {
      autoSpend,
      changeAddress,
      changeNode,
      updateNode,
      addNode,
      spendingStep,
      fee,
      feeRate,
      inputs,
      inputsTotalSats,
      outputs,
      selectedUTXOs,
      transactionOutputs,
      addressType,
      requiredSigners,
      totalSigners,
    } = this.props;

    const dust = dustAnalysis({
      inputs: selectedUTXOs || [],
      outputs: transactionOutputs || [],
      feeRate: feeRate || 1,
      addressType,
      requiredSigners,
      totalSigners,
    });
    const privacy = privacyAnalysis({
      inputs: selectedUTXOs || [],
      outputs: transactionOutputs || [],
      feeRate: feeRate || 1,
      addressType,
      requiredSigners,
      totalSigners,
    });

    return (
      <Card>
        <CardContent>
          {/* Alerts for dust and fingerprinting */}
          {dust.hasDustInputs && (
            <Alert severity="warning" sx={{ mb: 2 }}>
              <AlertTitle>Dust Inputs Detected</AlertTitle>
              {dust.inputCount} of your selected inputs may be considered dust
              at {feeRate} sat/vB. This could result in higher fees or
              uneconomical spending.
            </Alert>
          )}
          {privacy && privacy.hasWalletFingerprinting && (
            <Alert severity="warning" sx={{ mb: 2 }}>
              <AlertTitle>Wallet Fingerprinting Detected</AlertTitle>
              {privacy.reason ||
                "This transaction leaks privacy: exactly one output matches the wallet's script type, making it easy to identify change and link future transactions."}
              <br />
              Output types: {privacy.scriptTypes.join(", ")}
            </Alert>
          )}
          <Grid container>
            {spendingStep === SPEND_STEP_SIGN && (
              <Grid item md={12}>
                <Box>
                  <WalletSign />
                </Box>
              </Grid>
            )}
            {spendingStep === SPEND_STEP_CREATE && (
              <Grid item md={12}>
                <Grid container direction="row-reverse">
                  <Box display="flex-end">
                    <Box p={1}>
                      <FormControlLabel
                        control={
                          <Switch
                            checked={!autoSpend}
                            onChange={this.handleSpendMode}
                          />
                        }
                        label="Manual"
                      />
                      {/* Add RBF Toggle */}
                      <FormControlLabel
                        control={
                          <Switch
                            checked={this.props.enableRBF}
                            onChange={(e) =>
                              this.props.setRBF(e.target.checked)
                            }
                            color="primary"
                          />
                        }
                        label="Replace-by-Fee (RBF)"
                      />
                    </Box>
                  </Box>
                </Grid>
                <Box component="div" display={autoSpend ? "none" : "block"}>
                  <NodeSet
                    addNode={addNode}
                    updateNode={updateNode}
                    feeRate={feeRate}
                  />
                </Box>
                <OutputsForm onFeeEstimate={this.handleFeeEstimate} />
                <Box mt={2}>
                  <Button
                    onClick={this.handleShowPreview}
                    variant="contained"
                    color="primary"
                    disabled={this.previewDisabled()}
                  >
                    Preview Transaction
                  </Button>
                </Box>
                <PSBTImportComponent onImport={this.handleImportPSBT} />
              </Grid>
            )}
            {spendingStep === SPEND_STEP_PREVIEW && (
              <Grid item md={12}>
                <Box mt={3}>
                  <TransactionPreview
                    changeAddress={changeAddress}
                    changeNode={changeNode}
                    editTransaction={this.showCreate}
                    fee={fee}
                    feeRate={feeRate}
                    inputs={inputs}
                    inputsTotalSats={inputsTotalSats}
                    outputs={outputs}
                    handleSignTransaction={() => this.showSignTransaction()}
                  />
                </Box>
              </Grid>
            )}
          </Grid>
        </CardContent>
      </Card>
    );
  }
}

WalletSpend.propTypes = {
  addNode: PropTypes.func.isRequired,
  autoSpend: PropTypes.bool,
  autoSelectCoins: PropTypes.func.isRequired,
  balanceError: PropTypes.string,
  changeNode: PropTypes.shape({
    multisig: PropTypes.shape({
      address: PropTypes.string,
    }),
  }).isRequired,
  changeNodes: PropTypes.shape({}),
  changeAddress: PropTypes.string.isRequired,
  deleteChangeOutput: PropTypes.func.isRequired,
  depositNodes: PropTypes.shape({}),
  enableRBF: PropTypes.bool,
  setRBF: PropTypes.func.isRequired,
  fee: PropTypes.string.isRequired,
  feeError: PropTypes.string,
  feeRate: PropTypes.string.isRequired,
  feeRateError: PropTypes.string,
  finalizeOutputs: PropTypes.func.isRequired,
  finalizedOutputs: PropTypes.bool,
  inputs: PropTypes.arrayOf(PropTypes.shape({})).isRequired,
  inputsTotalSats: PropTypes.shape(bigNumberPropTypes).isRequired,
  outputs: PropTypes.arrayOf(
    PropTypes.shape({
      address: PropTypes.string,
      amount: PropTypes.string,
      addressError: PropTypes.string,
      amountError: PropTypes.string,
    }),
  ).isRequired,
  resetNodesSpend: PropTypes.func.isRequired,
  setSpendStep: PropTypes.func.isRequired,
  spendingStep: PropTypes.number,
  updateAutoSpend: PropTypes.func.isRequired,
  updateNode: PropTypes.func.isRequired,
  importPSBT: PropTypes.func.isRequired,
  selectedUTXOs: PropTypes.arrayOf(PropTypes.shape({})),
  transactionOutputs: PropTypes.arrayOf(PropTypes.shape({})),
  addressType: PropTypes.string,
  requiredSigners: PropTypes.number,
  totalSigners: PropTypes.number,
  network: PropTypes.string.isRequired,
};

WalletSpend.defaultProps = {
  autoSpend: false,
  balanceError: null,
  changeNodes: {},
  depositNodes: {},
  enableRBF: true,
  finalizedOutputs: false,
  feeError: null,
  feeRateError: null,
  spendingStep: 0,
  selectedUTXOs: [],
  transactionOutputs: [],
  addressType: "",
  requiredSigners: 0,
  totalSigners: 0,
};

function mapStateToProps(state) {
  return {
    ...state.spend.transaction,
    changeNodes: state.wallet.change.nodes,
    changeNode: state.wallet.change.nextNode,
    depositNodes: state.wallet.deposits.nodes,
    autoSpend: state.spend.transaction.autoSpend,
    enableRBF: state.spend.transaction.enableRBF,
    network: state.settings.network,
    selectedUTXOs: state.spend.transaction.selectedUTXOs,
    transactionOutputs: state.spend.transaction.transactionOutputs,
    addressType: state.settings?.addressType,
    requiredSigners: state.settings?.requiredSigners,
    totalSigners: state.settings?.totalSigners,
  };
}

const mapDispatchToProps = {
  autoSelectCoins: autoSelectCoinsAction,
  deleteChangeOutput: deleteChangeOutputAction,
  updateAutoSpend: updateAutoSpendAction,
  setInputs: setInputsAction,
  updateChangeSlice: updateChangeSliceAction,
  updateDepositSlice: updateDepositSliceAction,
  setAddress: setOutputAddress,
  resetNodesSpend: resetNodesSpendAction,
  setFeeRate: setFeeRateAction,
  addOutput,
  setRBF,
  finalizeOutputs: finalizeOutputsAction,
  setChangeAddress: setChangeAddressAction,
  setSpendStep: setSpendStepAction,
  importPSBT: importPSBTAction,
};

export default connect(mapStateToProps, mapDispatchToProps)(WalletSpend);
