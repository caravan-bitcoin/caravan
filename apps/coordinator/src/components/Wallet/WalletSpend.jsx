import React, { useState, useEffect, useCallback } from "react";
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
  FormHelperText,
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
  setSpendStep as setSpendStepAction,
  deleteChangeOutput as deleteChangeOutputAction,
  importPSBT as importPSBTAction,
} from "../../actions/transactionActions";
import { naiveCoinSelection } from "../../utils";
import NodeSet from "./NodeSet";
import OutputsForm from "../ScriptExplorer/OutputsForm";
import WalletSign from "./WalletSign";
import TransactionPreview from "./TransactionPreview";
import { bigNumberPropTypes } from "../../proptypes/utils";
import { useTransactionAnalysis } from '../../hooks/useTransactionAnalysis';

function WalletSpend(props) {
  const [importPSBTDisabled, setImportPSBTDisabled] = useState(false);
  const [importPSBTError, setImportPSBTError] = useState("");
  const [feeEstimate, setFeeEstimate] = useState("");

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
    setSpendStep,
    autoSelectCoins,
    finalizeOutputs,
    resetNodesSpend,
    deleteChangeOutput,
    updateAutoSpend,
    importPSBT,
  } = props;

  useEffect(() => {
    // componentDidUpdate for finalizedOutputs
    if (props.finalizedOutputs) {
      setSpendStep(SPEND_STEP_PREVIEW);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.finalizedOutputs]);

  const previewDisabled = useCallback(() => {
    if (inputs.length === 0 && !autoSpend) return true;
    if (
      props.finalizedOutputs ||
      props.feeRateError ||
      props.feeError ||
      props.balanceError
    ) {
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
  }, [inputs, outputs, autoSpend, props.finalizedOutputs, props.feeRateError, props.feeError, props.balanceError]);

  const showSignTransaction = useCallback(() => {
    setSpendStep(SPEND_STEP_SIGN);
  }, [setSpendStep]);

  const handleShowPreview = useCallback(() => {
    if (autoSpend) autoSelectCoins();
    else finalizeOutputs(true);
  }, [autoSpend, autoSelectCoins, finalizeOutputs]);

  const showCreate = useCallback(() => {
    setSpendStep(SPEND_STEP_CREATE);
    finalizeOutputs(false);
    resetNodesSpend();
    deleteChangeOutput();
  }, [setSpendStep, finalizeOutputs, resetNodesSpend, deleteChangeOutput]);

  const handleSpendMode = useCallback((event) => {
    updateAutoSpend(!event.target.checked);
    resetNodesSpend();
    deleteChangeOutput();
  }, [updateAutoSpend, resetNodesSpend, deleteChangeOutput]);

  const setPSBTToggleAndError = (disabled, errorMessage) => {
    setImportPSBTDisabled(disabled);
    setImportPSBTError(errorMessage);
  };

  const handleImportPSBT = ({ target }) => {
    setPSBTToggleAndError(true, "");
    try {
      if (target.files.length === 0) {
        setPSBTToggleAndError(false, "No PSBT provided.");
        return;
      }
      if (target.files.length > 1) {
        setPSBTToggleAndError(false, "Multiple PSBTs provided.");
        return;
      }
      const fileReader = new FileReader();
      fileReader.onload = (event) => {
        try {
          const psbtText = event.target.result;
          importPSBT(psbtText);
          setPSBTToggleAndError(false, "");
        } catch (e) {
          setPSBTToggleAndError(false, e.message);
        }
      };
      fileReader.readAsText(target.files[0]);
    } catch (e) {
      setPSBTToggleAndError(false, e.message);
    }
  };

  const transactionAnalysis = useTransactionAnalysis({
    inputs: selectedUTXOs || [],
    outputs: transactionOutputs || [],
    feeRate: feeRate || 1
  });

  return (
    <Card>
      <CardContent>
        {/* Alerts for dust and fingerprinting */}
        {transactionAnalysis.dust.hasDustInputs && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            <AlertTitle>Dust Inputs Detected</AlertTitle>
            {transactionAnalysis.dust.inputCount} of your selected inputs may be considered dust at {feeRate} sat/vB. 
            This could result in higher fees or uneconomical spending.
          </Alert>
        )}
        {transactionAnalysis.fingerprinting.hasFingerprinting && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            <AlertTitle>Output Fingerprinting Detected</AlertTitle>
            Your transaction outputs use mixed script types ({transactionAnalysis.fingerprinting.scriptTypes.join(', ')}), 
            which may compromise privacy.
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
                          onChange={handleSpendMode}
                        />
                      }
                      label="Manual"
                    />
                  </Box>
                </Box>
              </Grid>
              <Box component="div" display={autoSpend ? "none" : "block"}>
                <NodeSet addNode={addNode} updateNode={updateNode} />
              </Box>
              <OutputsForm />
              <Box mt={2}>
                <Button
                  onClick={handleShowPreview}
                  variant="contained"
                  color="primary"
                  disabled={previewDisabled()}
                >
                  Preview Transaction
                </Button>
              </Box>
              <Box mt={2}>
                <label htmlFor="import-psbt">
                  <input
                    style={{ display: "none" }}
                    id="import-psbt"
                    name="import-psbt"
                    accept="application/base64"
                    onChange={handleImportPSBT}
                    type="file"
                  />

                  <Button
                    color="primary"
                    variant="contained"
                    component="span"
                    disabled={importPSBTDisabled}
                    style={{ marginTop: "20px" }}
                  >
                    Import PSBT
                  </Button>
                  <FormHelperText error>{importPSBTError}</FormHelperText>
                </label>
              </Box>
            </Grid>
          )}
          {spendingStep === SPEND_STEP_PREVIEW && (
            <Grid item md={12}>
              <Box mt={3}>
                <TransactionPreview
                  changeAddress={changeAddress}
                  changeNode={changeNode}
                  editTransaction={showCreate}
                  fee={fee}
                  feeRate={feeRate}
                  inputs={inputs}
                  inputsTotalSats={inputsTotalSats}
                  outputs={outputs}
                  handleSignTransaction={showSignTransaction}
                />
              </Box>
            </Grid>
          )}
        </Grid>
      </CardContent>
    </Card>
  );
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
};

WalletSpend.defaultProps = {
  autoSpend: false,
  balanceError: null,
  changeNodes: {},
  depositNodes: {},
  finalizedOutputs: false,
  feeError: null,
  feeRateError: null,
  spendingStep: 0,
  selectedUTXOs: [],
  transactionOutputs: [],
};

function mapStateToProps(state) {
  return {
    ...state.spend.transaction,
    changeNodes: state.wallet.change.nodes,
    changeNode: state.wallet.change.nextNode,
    depositNodes: state.wallet.deposits.nodes,
    autoSpend: state.spend.transaction.autoSpend,
    selectedUTXOs: state.spend.transaction.selectedUTXOs,
    transactionOutputs: state.spend.transaction.transactionOutputs,
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
  finalizeOutputs: finalizeOutputsAction,
  setChangeAddress: setChangeAddressAction,
  setSpendStep: setSpendStepAction,
  importPSBT: importPSBTAction,
};

export default connect(mapStateToProps, mapDispatchToProps)(WalletSpend);
