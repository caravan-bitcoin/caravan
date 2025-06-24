import { useMemo } from "react";
import { isDustUTXO, analyzeOutputFingerprinting } from "../utils/dustUtils";

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

interface UseTransactionAnalysisProps {
  inputs: UTXO[];
  outputs: Output[];
  feeRate: number;
}

// Transaction size estimation constants
// These aren't perfect but good enough for most common cases
const INPUT_SIZE_ESTIMATE = 68; // Typical P2WPKH input size in vbytes
const OUTPUT_SIZE_ESTIMATE = 31; // Typical P2WPKH output size in vbytes
const TX_OVERHEAD = 11; // Basic transaction overhead (version, locktime, etc.)

/**
 * Hook to analyze transaction inputs and outputs for various issues
 * like dust UTXOs, privacy concerns, and fee calculations.
 *
 * Uses memoization so we don't recalculate everything on every render.
 */
export function useTransactionAnalysis({
  inputs,
  outputs,
  feeRate,
}: UseTransactionAnalysisProps) {
  return useMemo(() => {
    // Find inputs that are too small to spend economically
    const problematicInputs = inputs.filter((input) =>
      isDustUTXO(input.amountSats, input.scriptType, feeRate),
    );

    // Check outputs for dust as well
    const dustyOutputs = outputs.filter((output) =>
      isDustUTXO(output.amountSats, output.scriptType, feeRate),
    );

    // Check if outputs mix different script types (privacy issue)
    const privacyAnalysis = analyzeOutputFingerprinting(
      outputs.map((output) => ({ ...output, amount: output.amountSats })),
    );

    // Basic transaction math
    const inputTotal = inputs.reduce(
      (total, input) => total + input.amountSats,
      0,
    );
    const outputTotal = outputs.reduce(
      (total, output) => total + output.amountSats,
      0,
    );
    const calculatedFee = inputTotal - outputTotal;

    // Rough transaction size calculation
    const estimatedSize =
      inputs.length * INPUT_SIZE_ESTIMATE +
      outputs.length * OUTPUT_SIZE_ESTIMATE +
      TX_OVERHEAD;

    // What fee rate are we actually paying?
    const actualFeeRate =
      calculatedFee > 0 && estimatedSize > 0
        ? Math.ceil(calculatedFee / estimatedSize)
        : 0;

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

      // Privacy analysis
      fingerprinting: privacyAnalysis,

      // Transaction overview
      summary: {
        inputCount: inputs.length,
        outputCount: outputs.length,
        totalInputValue: inputTotal,
        totalOutputValue: outputTotal,
        totalFee: calculatedFee,
        requestedFeeRate: feeRate,
        effectiveFeeRate: actualFeeRate,
        estimatedTxSize: estimatedSize,
      },
    };
  }, [inputs, outputs, feeRate]);
}
