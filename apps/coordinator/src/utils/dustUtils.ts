/**
 * Helper functions for checking dust outputs and privacy issues
 */

export interface ScriptTypeConfig {
  name: string;
  inputScriptSize: number;
  outputScriptSize: number;
}

// Different Bitcoin address types and their sizes
export const SCRIPT_TYPES: Record<string, ScriptTypeConfig> = {
  'P2PKH': {
    name: 'Legacy',
    inputScriptSize: 148,
    outputScriptSize: 34
  },
  
  'P2SH': {
    name: 'Nested SegWit',
    inputScriptSize: 91,
    outputScriptSize: 32
  },
  
  'P2WPKH': {
    name: 'Native SegWit',
    inputScriptSize: 68,
    outputScriptSize: 31
  },
  
  'P2WSH': {
    name: 'SegWit Script',
    inputScriptSize: 104,
    outputScriptSize: 43
  },
  
  'P2TR': {
    name: 'Taproot',
    inputScriptSize: 57,
    outputScriptSize: 43
  }
};

// How much extra we multiply the fee by when checking for dust
// This follows Bitcoin Core's approach - if it costs more than 3x the normal
// fee to spend an output, it's considered dust
const DUST_FEE_MULTIPLIER = 3;

/**
 * Figure out the minimum amount needed to not be considered dust
 * Basically, if it costs more to spend than it's worth, it's dust
 */
export function calculateDustThreshold(scriptType: string, feeRate: number): number {
  const scriptConfig = SCRIPT_TYPES[scriptType];
  
  if (!scriptConfig) {
    console.warn(`Don't recognize script type: ${scriptType}, falling back to P2WPKH`);
    return calculateDustThreshold('P2WPKH', feeRate);
  }
  
  // Calculate how much it would cost to spend this output later
  // We use a higher fee rate (3x) to be safe
  const costToSpend = (scriptConfig.inputScriptSize * feeRate * DUST_FEE_MULTIPLIER) / 1000;
  return Math.ceil(costToSpend);
}

/**
 * Check if a UTXO is too small to be worth spending (dust)
 */
export function isDustUTXO(amountSats: number, scriptType: string, feeRate: number): boolean {
  const minAmount = calculateDustThreshold(scriptType, feeRate);
  return amountSats <= minAmount;
}

/**
 * Get a friendly name for the script type
 */
export function getScriptTypeName(scriptType: string): string {
  return SCRIPT_TYPES[scriptType]?.name || scriptType;
}

/**
 * Check if transaction outputs mix different address types
 * This can be a privacy issue since it makes transactions more identifiable
 */
export function analyzeOutputFingerprinting(outputs: Array<{ scriptType: string; amount: number }>) {
  const addressTypes = outputs.map(output => output.scriptType);
  const uniqueTypes = [...new Set(addressTypes)];
  
  const hasPrivacyIssue = uniqueTypes.length > 1;
  
  return {
    hasFingerprinting: hasPrivacyIssue,
    scriptTypes: uniqueTypes,
    primaryScriptType: addressTypes[0],
    mixedTypes: hasPrivacyIssue ? uniqueTypes : null
  };
}