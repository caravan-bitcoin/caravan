import { estimateMultisigTransactionFee } from "@caravan/bitcoin";
import { isDustUTXO, walletFingerprintAnalysis } from "../utils/dustUtils";

interface UTXO {
  txid: string;
  index: number;
  amountSats: number;
  scriptType: string;
  confirmed: boolean;
}

interface Output {
  address: string;
  amountSats: number;
  scriptType: string;
}

interface TransactionAnalysisProps {
  inputs: UTXO[];
  outputs: Output[];
  feeRate: number;
  addressType: string;
  requiredSigners: number;
  totalSigners: number;
}

/**
 * Utility function to analyze transaction inputs and outputs for various issues
 * like dust UTXOs, wallet fingerprinting (privacy), and fee calculations.
 */
export function analyzeTransaction({
  inputs,
  outputs,
  feeRate,
  addressType,
  requiredSigners,
  totalSigners,
}: TransactionAnalysisProps) {
  // Find inputs that are too small to spend economically
  const problematicInputs = inputs.filter((input) =>
    isDustUTXO(input.amountSats, input.scriptType, feeRate),
  );

  // Check outputs for dust as well
  const dustyOutputs = outputs.filter((output) =>
    isDustUTXO(output.amountSats, output.scriptType, feeRate),
  );

  // Wallet fingerprinting privacy analysis
  const walletFingerprinting = walletFingerprintAnalysis(
    outputs.map((output) => ({ ...output, amount: output.amountSats })),
    addressType,
  );

  // Use @caravan/bitcoin for fee and size estimation
  const inputTotal = inputs.reduce(
    (total, input) => total + input.amountSats,
    0,
  );
  const outputTotal = outputs.reduce(
    (total, output) => total + output.amountSats,
    0,
  );
  const calculatedFee = inputTotal - outputTotal;

  const estimatedFee = estimateMultisigTransactionFee({
    addressType,
    numInputs: inputs.length,
    numOutputs: outputs.length,
    m: requiredSigners,
    n: totalSigners,
    feesPerByteInSatoshis: feeRate,
  });

  return {
    // Dust-related analysis
    dust: {
      inputs: problematicInputs,
      outputs: dustyOutputs,
      inputCount: problematicInputs.length,
      outputCount: dustyOutputs.length,
      hasDustInputs: problematicInputs.length > 0,
      hasDustOutputs: dustyOutputs.length > 0,
    },

    // Wallet fingerprinting privacy analysis
    walletFingerprinting,

    // Transaction overview
    summary: {
      inputCount: inputs.length,
      outputCount: outputs.length,
      totalInputValue: inputTotal,
      totalOutputValue: outputTotal,
      totalFee: calculatedFee,
      estimatedFee,
      requestedFeeRate: feeRate,
    },
  };
}
