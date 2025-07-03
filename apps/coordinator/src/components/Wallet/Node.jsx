import React, { useState, useEffect } from "react";
import PropTypes from "prop-types";
import { connect, useSelector } from "react-redux";
import { satoshisToBitcoins } from "@caravan/bitcoin";

// Components
import { TableRow, TableCell, Checkbox } from "@mui/material";
import AddressExpander from "./AddressExpander";

// Actions
import {
  setInputs as setInputsAction,
  setFeeRate as setFeeRateAction,
  updateAutoSpendAction as updateAutoSpendActionImport,
} from "../../actions/transactionActions";
import { WALLET_MODES } from "../../actions/walletActions";

const Node = ({
  addNode,
  addressKnown,
  balanceSats,
  bip32Path,
  braidNode,
  change,
  fetchedUTXOs,
  inputs,
  multisig,
  present,
  setInputs,
  spend,
  updateAutoSpend,
  updateNode,
  utxos,
  walletMode,
}) => {
  const [indeterminate, setIndeterminate] = useState(false);
  const [checked, setChecked] = useState(false);

  const feeRate = useSelector((state) => state.spend.transaction.feeRate);

  useEffect(() => {
    generate();
  }, []);

  // Passing this fn down to the UTXOSet so we can get updates here, from there.
  const setSpendCheckbox = (value) => {
    if (value === "indeterminate") {
      setIndeterminate(true);
      setChecked(false);
      markSpending(true);
    } else if (value === spend) {
      // handles select/de-select all as well as have selected some and click select all
      setIndeterminate(false);
      setChecked(value);
      markSpending(value);
    } else {
      // handles the case of de-selecting one-by-one until there's nothing left selected
      // or there's only one utxo and we're selecting to spend it or not instead of at
      // the top level select-all or deselect-all
      setIndeterminate(false);
      setChecked(value);
      markSpending(value);
    }
  };

  const markSpending = (value) => {
    updateNode(change, { spend: value, bip32Path });
  };

  const maxUtxoDate = () => {
    if (!utxos.length) return "";
    const maxtime = Math.max(...utxos.map((utxo) => utxo.time));
    if (Number.isNaN(maxtime)) return "Pending";
    return new Date(1000 * maxtime).toLocaleDateString();
  };

  const renderAddress = () => {
    return (
      <AddressExpander
        node={braidNode}
        setSpendCheckbox={setSpendCheckbox}
        feeRate={feeRate}
      />
    );
  };

  const generate = () => {
    if (!present) {
      addNode(change, bip32Path);
    }
  };

  const handleSpend = (e) => {
    let newInputs;

    if (e.target.getAttribute("data-indeterminate")) {
      // remove any inputs that are ours
      newInputs = inputs.filter((input) => {
        const newUtxos = utxos.filter((utxo) => {
          return utxo.txid === input.txid && utxo.index === input.index;
        });
        return newUtxos.length === 0;
      });
      // then add all ours back
      newInputs = newInputs.concat(
        utxos.map((utxo) => ({ ...utxo, multisig, bip32Path })),
      );
      setIndeterminate(false);
      setChecked(true);
    } else if (e.target.checked) {
      newInputs = inputs.concat(
        utxos.map((utxo) => ({ ...utxo, multisig, bip32Path })),
      );
    } else {
      newInputs = inputs.filter((input) => {
        const newUtxos = utxos.filter((utxo) => {
          return utxo.txid === input.txid && utxo.index === input.index;
        });
        return newUtxos.length === 0;
      });
    }
    setInputs(newInputs);
    updateNode(change, { spend: e.target.checked, bip32Path });
    updateAutoSpend(false);
  };

  const spending = walletMode === WALLET_MODES.SPEND;

  return (
    <TableRow key={bip32Path}>
      {spending && (
        <TableCell>
          <Checkbox
            id={bip32Path}
            name="spend"
            onChange={handleSpend}
            checked={checked}
            disabled={!fetchedUTXOs || balanceSats.isEqualTo(0)}
            indeterminate={indeterminate}
          />
        </TableCell>
      )}
      <TableCell>
        <code>{bip32Path.replace("m", "*")}</code>
      </TableCell>
      <TableCell>{utxos.length}</TableCell>
      <TableCell>
        {fetchedUTXOs && addressKnown ? satoshisToBitcoins(balanceSats) : ""}
      </TableCell>
      <TableCell>{maxUtxoDate()}</TableCell>
      <TableCell>{multisig ? renderAddress() : "..."}</TableCell>
    </TableRow>
  );
};

Node.propTypes = {
  addNode: PropTypes.func.isRequired,
  addressKnown: PropTypes.bool.isRequired,
  balanceSats: PropTypes.shape({
    isEqualTo: PropTypes.func,
  }).isRequired,
  bip32Path: PropTypes.string.isRequired,
  braidNode: PropTypes.shape({}).isRequired,
  change: PropTypes.bool.isRequired,
  fetchedUTXOs: PropTypes.bool.isRequired,
  inputs: PropTypes.arrayOf(
    PropTypes.shape({
      index: PropTypes.number,
      txid: PropTypes.string,
    }),
  ).isRequired,
  multisig: PropTypes.shape({}),
  present: PropTypes.bool,
  setFeeRate: PropTypes.func.isRequired,
  setInputs: PropTypes.func.isRequired,
  spend: PropTypes.bool.isRequired,
  updateAutoSpend: PropTypes.func.isRequired,
  updateNode: PropTypes.func.isRequired,
  utxos: PropTypes.arrayOf(PropTypes.shape({})).isRequired,
  walletMode: PropTypes.number.isRequired,
};

Node.defaultProps = {
  multisig: {},
  present: false,
};

function mapStateToProps(state, ownProps) {
  const change = (ownProps.bip32Path || "").split("/")[1] === "1"; // // m, 0, 1
  const braid = state.wallet[change ? "change" : "deposits"];
  return {
    ...state.settings,
    ...{ change },
    ...braid.nodes[ownProps.bip32Path],
    ...state.spend.transaction,
    walletMode: state.wallet.common.walletMode,
    braidNode: braid.nodes[ownProps.bip32Path],
    // feeRate is now accessed via useSelector, not props
  };
}

const mapDispatchToProps = {
  setInputs: setInputsAction,
  setFeeRate: setFeeRateAction,
  updateAutoSpend: updateAutoSpendActionImport,
};

export default connect(mapStateToProps, mapDispatchToProps)(Node);
