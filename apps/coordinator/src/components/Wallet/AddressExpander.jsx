import React from "react";
import PropTypes from "prop-types";
import { connect } from "react-redux";
import { satoshisToBitcoins } from "@caravan/bitcoin";
import {
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Typography,
  Table,
  TableBody,
  TableRow,
  TableCell,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import UTXOSet from "../ScriptExplorer/UTXOSet";

/**
 * AddressExpander displays details for a single wallet address (node),
 * including its BIP32 path, balance, UTXO count, and a table of UTXOs.
 * Used as an expandable panel in the wallet UI.
 */
function AddressExpander(props) {
  const { node, setSpendCheckbox, network, addressType } = props;

  // Attach the current address type to each UTXO for display purposes
  const utxosWithScriptType = node.utxos.map((utxo) => ({
    ...utxo,
    scriptType: addressType,
  }));

  return (
    <Accordion className="address-expander">
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Typography>{node.multisig.address}</Typography>
      </AccordionSummary>
      <AccordionDetails>
        <Table>
          <TableBody>
            <TableRow>
              <TableCell>BIP32 Path</TableCell>
              <TableCell>
                <code>{node.bip32Path}</code>
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell>Balance</TableCell>
              <TableCell>{satoshisToBitcoins(node.balanceSats)} BTC</TableCell>
            </TableRow>
            <TableRow>
              <TableCell>UTXOs</TableCell>
              <TableCell>{node.utxos.length}</TableCell>
            </TableRow>
          </TableBody>
        </Table>

        {/* Only show the UTXO table if there are UTXOs for this address */}
        {node.utxos.length > 0 && (
          <UTXOSet
            inputs={utxosWithScriptType}
            inputsTotalSats={node.balanceSats}
            multisig={node.multisig}
            bip32Path={node.bip32Path}
            node={node}
            setSpendCheckbox={setSpendCheckbox}
            hideSelectAllInHeader
            network={network}
            showSelection={false}
            finalizedOutputs
          />
        )}
      </AccordionDetails>
    </Accordion>
  );
}

AddressExpander.propTypes = {
  node: PropTypes.shape({
    balanceSats: PropTypes.shape({}),
    bip32Path: PropTypes.string,
    multisig: PropTypes.shape({
      address: PropTypes.string,
    }),
    utxos: PropTypes.arrayOf(PropTypes.shape({})),
    spend: PropTypes.bool,
  }).isRequired,
  setSpendCheckbox: PropTypes.func.isRequired,
  network: PropTypes.string.isRequired,
  addressType: PropTypes.string.isRequired,
};

function mapStateToProps(state) {
  return {
    network: state.settings.network,
    addressType: state.settings.addressType,
  };
}

export default connect(mapStateToProps)(AddressExpander);
