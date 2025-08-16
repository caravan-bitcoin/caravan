import React from "react";
import { useSelector } from "react-redux";
import IndirectSignatureImporter from "../ScriptExplorer/IndirectSignatureImporter";
import BCUR2Signer from "./BCUR2Signer";

interface SignatureImporter {
  bip32Path?: string | null;
  method?: string;
  finalized?: boolean;
  name?: string;
  signature?: string | string[];
  publicKeys?: string[];
}

interface ExtendedPublicKeyImporter {
  method?: string;
  name?: string;
  bip32Path?: string;
  extendedPublicKey?: string;
  finalized?: boolean;
  conflict?: boolean;
  rootXfp?: string;
  bip32PathModified?: boolean;
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
  const unsignedPsbt = useSelector(
    (state: any) => state.spend?.transaction?.unsignedPSBT,
  );

  if (!unsignedPsbt)
    return (
      <div style={{ padding: "16px", textAlign: "center", color: "#d32f2f" }}>
        <p>Error accessing transaction state.</p>
        <p>Please refresh the page and try again.</p>
      </div>
    );

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

  return (
    <IndirectSignatureImporter
      network={network}
      signatureImporter={signatureImporter}
      inputs={inputs}
      outputs={outputs}
      inputsTotalSats={inputsTotalSats}
      fee={fee}
      psbt={unsignedPsbt}
      extendedPublicKeyImporter={extendedPublicKeyImporter}
      validateAndSetSignature={validateAndSetSignature}
      Signer={BCUR2Signer}
    />
  );
};

export default BCUR2SignatureImporter;
