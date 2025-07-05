import { estimateMultisigTransactionFee } from "@caravan/bitcoin";
import { WasteMetrics, getSpendTypeScore } from "@caravan/health";
import { walletFingerprintAnalysis } from "../utils/privacyUtils";
import type { UTXO } from "@caravan/fees";
import type { MultisigAddressType } from "@caravan/bitcoin";

export interface Output {
  address: string;
  amountSats: number;
  scriptType: MultisigAddressType;
}

export interface TransactionAnalysisInput {
  inputs: UTXO[];
  outputs: Output[];
  feeRate: number;
  addressType: MultisigAddressType;
  requiredSigners: number;
  totalSigners: number;
}

export function analyzeTransaction({
  inputs,
  outputs,
  feeRate,
  addressType,
  requiredSigners,
  totalSigners,
}: TransactionAnalysisInput) {
  // Use WasteMetrics for dust calculation
  const wasteMetrics = new WasteMetrics();

  // Find inputs that are too small to spend economically
  const problematicInputs = inputs.filter((input) => {
    const dustLimit = wasteMetrics.calculateDustLimits(feeRate, addressType, {
      requiredSignerCount: requiredSigners,
      totalSignerCount: totalSigners,
    }).lowerLimit;
    return Number(input.value) < dustLimit;
  });

  // Check outputs for dust
  const dustyOutputs = outputs.filter((output) => {
    const dustLimit = wasteMetrics.calculateDustLimits(
      feeRate,
      output.scriptType,
      {
        requiredSignerCount: requiredSigners,
        totalSignerCount: totalSigners,
      },
    ).lowerLimit;
    return output.amountSats < dustLimit;
  });

  // Privacy analysis spend type score and wallet fingerprinting
  const spendTypeScore = getSpendTypeScore(inputs.length, outputs.length);
  const fingerprinting = walletFingerprintAnalysis(
    outputs.map((o) => ({ scriptType: o.scriptType, amount: o.amountSats })),
    addressType,
  );

  const inputTotal = inputs.reduce(
    (total, input) => total + Number(input.value),
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

    // Privacy analysis
    privacy: {
      ...fingerprinting,
      spendTypeScore,
    },

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
