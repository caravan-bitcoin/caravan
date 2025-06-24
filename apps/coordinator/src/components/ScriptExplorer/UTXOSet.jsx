import React from "react";
import PropTypes from "prop-types";
import { connect } from "react-redux";
import {
  blockExplorerTransactionURL,
  satoshisToBitcoins,
} from "@caravan/bitcoin";
import {
  Table,
  TableHead,
  TableBody,
  TableFooter,
  TableRow,
  TableCell,
  Typography,
  Checkbox,
  Tooltip,
} from "@mui/material";
import { OpenInNew } from "@mui/icons-material";
import BigNumber from "bignumber.js";
import { externalLink } from "utils/ExternalLink";
import Copyable from "../Copyable";
import DustChip from "../DustChip";
// import ScriptTypeChip from "../ScriptTypeChip";
import { getFeeRate } from "../../selectors/transactionSelectors";

import { setInputs as setInputsAction } from "../../actions/transactionActions";
import styles from "./styles.module.scss";

class UTXOSet extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      selectedInputsSats: props.inputsTotalSats,
      currentInputs: props.inputs.map((input) => ({
        ...input,
        checked: props.selectAll,
      })),
      selectAllToggle: true,
    };
  }

  componentDidUpdate(prevProps) {
    // Update local inputs when props change
    if (prevProps.inputs !== this.props.inputs) {
      this.setState({
        currentInputs: this.props.inputs.map((input) => ({
          ...input,
          checked: this.props.selectAll,
        })),
      });
    }

    // Handle multisig scenarios - need to sync with parent checkbox state
    const { multisig, autoSpend } = this.props;
    if (multisig && !autoSpend) {
      const { node, existingTransactionInputs } = this.props;
      const { currentInputs } = this.state;

      const prevSpentInputs = this.getFilteredInputs(
        currentInputs,
        prevProps.existingTransactionInputs,
        true,
      ).length;

      const currentSpentInputs = this.getFilteredInputs(
        currentInputs,
        existingTransactionInputs,
        true,
      ).length;

      const allSelected = currentSpentInputs === currentInputs.length;

      // Sync with parent spend checkbox when needed
      if (
        (prevProps.node.spend !== node.spend ||
          currentSpentInputs !== prevSpentInputs) &&
        allSelected
      ) {
        this.handleSelectAll(node.spend);
      }
    }
  }

  getFilteredInputs = (localInputs, storeInputs, includeMatches) => {
    return localInputs.filter((input) => {
      const matches = storeInputs.filter((utxo) => {
        return utxo.txid === input.txid && utxo.index === input.index;
      });
      return includeMatches ? matches.length > 0 : matches.length === 0;
    });
  };

  handleInputToggle = (idx) => {
    const { currentInputs } = this.state;
    this.setState({ selectAllToggle: false });

    currentInputs[idx].checked = !currentInputs[idx].checked;
    this.updateInputSelection(currentInputs);
  };

  handleSelectAll = (forceState = null) => {
    const { currentInputs, selectAllToggle } = this.state;
    const newState = !selectAllToggle;

    currentInputs.forEach((input) => {
      input.checked = forceState !== null ? forceState : newState;
    });

    this.updateInputSelection(currentInputs);
    this.setState({ selectAllToggle: newState });
  };

  updateInputSelection = (inputs) => {
    const {
      setInputs,
      multisig,
      bip32Path,
      existingTransactionInputs,
      setSpendCheckbox,
    } = this.props;

    let selectedInputs = inputs.filter((input) => input.checked);

    if (multisig) {
      selectedInputs = selectedInputs.map((utxo) => ({
        ...utxo,
        multisig,
        bip32Path,
      }));
    }

    const totalSats = selectedInputs.reduce(
      (sum, input) => sum.plus(input.amountSats),
      new BigNumber(0),
    );

    this.setState({
      selectedInputsSats: totalSats,
    });

    let finalInputs = selectedInputs;

    // For multisig wallets, combine with inputs from other nodes
    if (multisig) {
      const otherInputs = this.getFilteredInputs(
        existingTransactionInputs,
        inputs,
        false,
      );

      if (otherInputs.length > 0) {
        finalInputs = selectedInputs.concat(otherInputs);
      }

      // Update parent checkbox state
      const numSelected = selectedInputs.length;
      if (numSelected === 0) {
        setSpendCheckbox(false);
      } else if (numSelected < inputs.length) {
        setSpendCheckbox("indeterminate");
      } else {
        setSpendCheckbox(true);
      }
    }

    if (finalInputs.length > 0) {
      setInputs(finalInputs);
    } else if (multisig) {
      setInputs([]);
    }
  };

  renderTableRows = () => {
    const { network, showSelection, finalizedOutputs } = this.props;
    const { currentInputs } = this.state;

    // Get fee rate - fallback to 1 if not available
    const feeRate =
      typeof window !== "undefined" && window.__REDUX_STORE__
        ? getFeeRate(window.__REDUX_STORE__.getState())
        : 1;

    return currentInputs.map((input, idx) => {
      const txidClass = `${styles.utxoTxid}${
        input.confirmed ? "" : ` ${styles.unconfirmed}`
      }`;
      const statusText = input.confirmed ? "confirmed" : "unconfirmed";

      return (
        <TableRow hover key={input.txid}>
          {showSelection && (
            <TableCell>
              <Checkbox
                data-testid={`utxo-checkbox-${idx}`}
                checked={input.checked}
                onClick={() => this.handleInputToggle(idx)}
                color="primary"
                disabled={finalizedOutputs}
              />
            </TableCell>
          )}
          <TableCell>{idx + 1}</TableCell>
          <TableCell className={txidClass}>
            <Copyable text={input.txid} showIcon showText={false}>
              <code title={statusText}>{input.txid}</code>
            </Copyable>
          </TableCell>
          <TableCell>
            <Copyable text={input.index.toString()} />
          </TableCell>
          <TableCell>
            <Copyable text={satoshisToBitcoins(input.amountSats)} />
          </TableCell>
          <TableCell>
            {externalLink(
              blockExplorerTransactionURL(input.txid, network),
              <OpenInNew />,
            )}
          </TableCell>
          <TableCell align="right">
            <DustChip
              amountSats={input.amountSats}
              feeRate={feeRate || 1}
              scriptType={input.scriptType || "P2WPKH"}
            />
          </TableCell>
        </TableRow>
      );
    });
  };

  render() {
    const {
      inputsTotalSats,
      showSelection = true,
      hideSelectAllInHeader,
      finalizedOutputs,
    } = this.props;
    const { selectedInputsSats, currentInputs } = this.state;

    return (
      <>
        <Typography variant="h5">
          Available Inputs ({currentInputs.length})
        </Typography>
        <p>These UTXOs will be used as inputs for the new transaction.</p>
        <Table>
          <TableHead>
            <TableRow>
              {showSelection && !hideSelectAllInHeader && (
                <TableCell>
                  <Checkbox
                    data-testid="utxo-select-all-checkbox"
                    checked={this.state.selectAllToggle}
                    onChange={() => this.handleSelectAll()}
                    disabled={finalizedOutputs}
                  />
                </TableCell>
              )}
              {showSelection && hideSelectAllInHeader && <TableCell />}
              <TableCell>Number</TableCell>
              <TableCell>TXID</TableCell>
              <TableCell>Index</TableCell>
              <TableCell>Amount (BTC)</TableCell>
              <TableCell>View</TableCell>
              <TableCell align="right">
                <Tooltip title="Shows if UTXO is dust at current fee rate">
                  <span>Dust Status</span>
                </Tooltip>
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>{this.renderTableRows()}</TableBody>
          <TableFooter>
            <TableRow hover>
              <TableCell colSpan={3}>TOTAL:</TableCell>
              <TableCell colSpan={2}>
                {selectedInputsSats
                  ? satoshisToBitcoins(selectedInputsSats)
                  : satoshisToBitcoins(inputsTotalSats)}
              </TableCell>
            </TableRow>
          </TableFooter>
        </Table>
      </>
    );
  }
}

UTXOSet.propTypes = {
  network: PropTypes.string.isRequired,
  inputs: PropTypes.arrayOf(PropTypes.shape({})).isRequired,
  inputsTotalSats: PropTypes.shape({}).isRequired,
  setInputs: PropTypes.func.isRequired,
  multisig: PropTypes.oneOfType([PropTypes.shape({}), PropTypes.bool]),
  bip32Path: PropTypes.string,
  showSelection: PropTypes.bool,
  hideSelectAllInHeader: PropTypes.bool,
  selectAll: PropTypes.bool,
  finalizedOutputs: PropTypes.bool.isRequired,
  node: PropTypes.shape({
    spend: PropTypes.bool,
  }),
  existingTransactionInputs: PropTypes.arrayOf(PropTypes.shape({})),
  setSpendCheckbox: PropTypes.func,
  autoSpend: PropTypes.bool.isRequired,
};

UTXOSet.defaultProps = {
  multisig: false,
  bip32Path: "",
  showSelection: true,
  hideSelectAllInHeader: false,
  selectAll: true,
  node: {},
  existingTransactionInputs: [],
  setSpendCheckbox: () => {},
};

function mapStateToProps(state) {
  return {
    ...state.settings,
    autoSpend: state.spend.transaction.autoSpend,
    finalizedOutputs: state.spend.transaction.finalizedOutputs,
    existingTransactionInputs: state.spend.transaction.inputs,
  };
}

const mapDispatchToProps = {
  setInputs: setInputsAction,
};

export default connect(mapStateToProps, mapDispatchToProps)(UTXOSet);
