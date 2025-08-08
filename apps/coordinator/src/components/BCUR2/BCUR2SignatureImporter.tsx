import React from "react";
import PropTypes from "prop-types";
import { useSelector } from "react-redux";
import IndirectSignatureImporter from "../ScriptExplorer/IndirectSignatureImporter";
import BCUR2Signer from "./BCUR2Signer";

interface SignatureImporter {
  bip32Path?: string | null;
  [key: string]: any;
}

interface ExtendedPublicKeyImporter {
  [key: string]: any;
}

interface BCUR2SignatureImporterProps {
  signatureImporter: SignatureImporter;
  extendedPublicKeyImporter: ExtendedPublicKeyImporter;
  inputs: any[];
  outputs: any[];
  inputsTotalSats: any;
  fee: string;
  validateAndSetSignature: (
    signatures: any,
    callback: (error?: string) => void,
  ) => void;
  network: string;
}

/**
 * BCUR2 Signature Importer using the IndirectSignatureImporter pattern.
 * This follows the same architecture as ColdcardSignatureImporter.
 */
const BCUR2SignatureImporter: React.FC<BCUR2SignatureImporterProps> = ({
  signatureImporter,
  extendedPublicKeyImporter,
  inputs,
  outputs,
  inputsTotalSats,
  fee,
  validateAndSetSignature,
  network,
}) => {
  let unsignedPSBT;
  try {
    const transactionState = useSelector(
      (state: any) => state.spend.transaction,
    );
    unsignedPSBT = transactionState?.unsignedPSBT;
  } catch (error) {
    return (
      <div style={{ padding: "16px", textAlign: "center", color: "#d32f2f" }}>
        <p>Error accessing transaction state.</p>
        <p>Please refresh the page and try again.</p>
      </div>
    );
  }

  // Early validation - if no inputs, show helpful message
  if (!inputs || inputs.length === 0) {
    return (
      <div style={{ padding: "16px", textAlign: "center", color: "#666" }}>
        <p>No transaction inputs available.</p>
        <p>
          Please set up your transaction inputs before importing signatures.
        </p>
      </div>
    );
  }

  // Early validation - if no PSBT, show helpful message
  if (!unsignedPSBT) {
    return (
      <div style={{ padding: "16px", textAlign: "center", color: "#666" }}>
        <p>No base transaction available.</p>
        <p>
          Please ensure the transaction is properly set up before importing
          signatures.
        </p>
      </div>
    );
  }

  try {
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
        Signer={BCUR2Signer}
      />
    );
  } catch (error) {
    return (
      <div style={{ padding: "16px", textAlign: "center", color: "#d32f2f" }}>
        <p>Error initializing signature importer.</p>
        <p>
          Error details:{" "}
          {error instanceof Error ? error.message : String(error)}
        </p>
        <p>Please try refreshing the page.</p>
      </div>
    );
  }
};

BCUR2SignatureImporter.propTypes = {
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

export default BCUR2SignatureImporter;
