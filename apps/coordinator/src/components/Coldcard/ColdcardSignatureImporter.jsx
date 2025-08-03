import React from "react";
import PropTypes from "prop-types";
import IndirectSignatureImporter from "../ScriptExplorer/IndirectSignatureImporter";
import ColdcardSigner from "./ColdcardSigner";
import { useSelector } from "react-redux";

const ColdcardSignatureImporter = ({
  signatureImporter,
  extendedPublicKeyImporter,
  inputs,
  outputs,
  inputsTotalSats,
  fee,
  validateAndSetSignature,
  network,
}) => {
  const { unsignedPSBT } = useSelector((state) => state.spend.transaction);
  return (
    <IndirectSignatureImporter
      network={network}
      signatureImporter={signatureImporter}
      inputs={inputs}
      outputs={outputs}
      inputsTotalSats={inputsTotalSats}
      fee={fee}
      psbt={unsignedPSBT}
      extendedPublicKeyImporter={extendedPublicKeyImporter}
      validateAndSetSignature={validateAndSetSignature}
      Signer={ColdcardSigner}
    />
  );
};

ColdcardSignatureImporter.propTypes = {
  network: PropTypes.string.isRequired,
  inputs: PropTypes.arrayOf(PropTypes.shape({})).isRequired,
  outputs: PropTypes.arrayOf(PropTypes.shape({})).isRequired,
  signatureImporter: PropTypes.shape({
    bip32Path: PropTypes.string,
  }).isRequired,
  validateAndSetSignature: PropTypes.func.isRequired,
  extendedPublicKeyImporter: PropTypes.shape({}).isRequired,
  inputsTotalSats: PropTypes.shape({}).isRequired,
  fee: PropTypes.string.isRequired,
};

export default ColdcardSignatureImporter;
