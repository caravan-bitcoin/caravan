import React, { useState, useEffect } from "react";
import PropTypes from "prop-types";
import { useSelector, useDispatch } from "react-redux";
import { satoshisToBitcoins } from "@caravan/bitcoin";

// Components
import { TableRow, TableCell, Checkbox } from "@mui/material";
import AddressExpander from "./AddressExpander";

// Actions
import {
  setInputs as setInputsAction,
  updateAutoSpendAction as updateAutoSpendActionImport,
} from "../../actions/transactionActions";
import { WALLET_MODES } from "../../actions/walletActions";

const Node = ({ addNode, bip32Path, updateNode }) => {
  const [indeterminate, setIndeterminate] = useState(false);
  const [checked, setChecked] = useState(false);

  // Determine if this is a change address
  const change = (bip32Path || "").split("/")[1] === "1";

  // Use useSelector to get all required data from Redux store
  const walletMode = useSelector((state) => state.wallet.common.walletMode);
  const transactionData = useSelector((state) => state.spend.transaction);
  const braid = useSelector(
    (state) => state.wallet[change ? "change" : "deposits"],
  );
  const nodeData = useSelector(
    (state) =>
      state.wallet[change ? "change" : "deposits"].nodes[bip32Path] || {},
  );

  // Extract all the props we need from Redux state
  const {
    addressKnown = false,
    balanceSats = { isEqualTo: () => false },
    fetchedUTXOs = false,
    multisig = {},
    present = false,
    spend = false,
    utxos = [],
  } = nodeData;

  const { inputs = [], feeRate } = transactionData;
  const braidNode = braid.nodes[bip32Path];

  const dispatch = useDispatch();

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
    dispatch(setInputsAction(newInputs));
    updateNode(change, { spend: e.target.checked, bip32Path });
    dispatch(updateAutoSpendActionImport(false));
    // Fee rate is now managed in Redux store - no need to set it here
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
  bip32Path: PropTypes.string.isRequired,
  updateNode: PropTypes.func.isRequired,
};

Node.defaultProps = {};

export default Node;
