import React, { useState } from "react";
import PropTypes from "prop-types";
import { connect } from "react-redux";

import { Button } from "@mui/material";
import Copyable from "./Copyable";

const UnsignedTransaction = ({ unsignedTransaction, unsignedPSBT }) => {
  const [showUnsignedTransaction, setShowUnsignedTransaction] = useState(false);

  console.log("UnsignedTransaction render - PSBT present:", !!unsignedPSBT);

  const handleShowUnsignedTransaction = () => {
    setShowUnsignedTransaction(true);
  };

  const handleHideUnsignedTransaction = () => {
    setShowUnsignedTransaction(false);
  };

  const renderUnsignedTransaction = () => {
    if (showUnsignedTransaction) {
      const hex = unsignedTransaction.toHex();
      console.log("Showing transaction hex and PSBT:", {
        hexLength: hex.length,
        hasPSBT: !!unsignedPSBT,
      });
      return (
        <div>
          <small>
            <Button size="small" onClick={handleHideUnsignedTransaction}>
              Hide Unsigned Transaction
            </Button>
          </small>
          <p>
            <Copyable text={hex} showIcon />
          </p>
          {unsignedPSBT && (
            <p>
              <Copyable text={unsignedPSBT} showText={false} showIcon>
                Unsigned PSBT
              </Copyable>
            </p>
          )}
        </div>
      );
    }
    return (
      <small>
        <Button size="small" onClick={handleShowUnsignedTransaction}>
          Show Unsigned Transaction
        </Button>
      </small>
    );
  };
  return renderUnsignedTransaction();
};

UnsignedTransaction.propTypes = {
  unsignedTransaction: PropTypes.shape({
    toHex: PropTypes.func,
  }).isRequired,
  unsignedPSBT: PropTypes.string.isRequired,
};

function mapStateToProps(state) {
  return {
    unsignedTransaction: state.spend.transaction.unsignedTransaction,
    unsignedPSBT: state.spend.transaction.unsignedPSBT,
  };
}

const mapDispatchToProps = {};

export default connect(
  mapStateToProps,
  mapDispatchToProps,
)(UnsignedTransaction);
