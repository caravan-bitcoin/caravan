import { WasteMetrics, getSpendTypeScore } from "@caravan/health";
import { walletFingerprintAnalysis } from "../utils/privacyUtils";
import type { UTXO } from "@caravan/transactions";
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

export function dustAnalysis({
  inputs,
  outputs,
  feeRate,
  addressType,
  requiredSigners,
  totalSigners,
}: TransactionAnalysisInput) {
  const wasteMetrics = new WasteMetrics();

  const problematicInputs = inputs.filter((input) => {
    const dustLimit = wasteMetrics.calculateDustLimits(feeRate, addressType, {
      requiredSignerCount: requiredSigners,
      totalSignerCount: totalSigners,
    }).lowerLimit;
    return Number(input.value) < dustLimit;
  });

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

  return {
    inputs: problematicInputs,
    outputs: dustyOutputs,
    inputCount: problematicInputs.length,
    outputCount: dustyOutputs.length,
    hasDustInputs: problematicInputs.length > 0,
    hasDustOutputs: dustyOutputs.length > 0,
  };
}

export function privacyAnalysis({
  inputs,
  outputs,
  addressType,
}: TransactionAnalysisInput) {
  const spendTypeScore = getSpendTypeScore(inputs.length, outputs.length);
  const fingerprinting = walletFingerprintAnalysis(
    outputs.map((o) => ({ scriptType: o.scriptType, amount: o.amountSats })),
    addressType,
  );
  return {
    ...fingerprinting,
    spendTypeScore,
  };
}
