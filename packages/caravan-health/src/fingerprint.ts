import { getAddressType, Network } from "@caravan/bitcoin";
import { ScriptType } from "@caravan/fees";

export function scriptTypeFingerprints(
  inputScriptType: ScriptType,
  outputAddresses: string[],
  network: Network,
): boolean[] {
  return outputAddresses.map((address) => {
    const addressType = getAddressType(address, network);
    return addressType === inputScriptType;
  });
}

function log2(x: number): number {
  return Math.log(x) / Math.LN2;
}

function shannonEntropy(str: string): number {
  const counts: Record<string, number> = {};
  for (const char of str) {
    counts[char] = (counts[char] || 0) + 1;
  }
  const total = str.length;
  return Object.values(counts).reduce((entropy, count) => {
    const probability = count / total;
    return entropy - probability * log2(probability);
  }, 0);
}

export function amountFingerprints(amounts: string[]): boolean[] {
  if (amounts.length === 0) return [];

  // Right pad to 8 decimals
  const paddedRight = amounts.map((a) => {
    const [whole, frac = ""] = a.split(".");
    return whole + "." + frac.padEnd(8, "0");
  });

  // Remove dot for uniformity, then left pad to max length
  const noDot = paddedRight.map((a) => a.replace(".", ""));
  const maxLen = Math.max(...noDot.map((a) => a.length));
  const paddedAmounts = noDot.map((a) => a.padStart(maxLen, "0"));

  // Compute entropy for each padded amount
  const entropies = paddedAmounts.map((a) => shannonEntropy(a));
  const maxEntropy = Math.max(...entropies);

  // Mark true if this output has the maximum entropy
  return entropies.map((e) => e === maxEntropy);
}
