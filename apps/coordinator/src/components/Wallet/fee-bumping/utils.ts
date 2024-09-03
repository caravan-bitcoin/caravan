import { satoshisToBitcoins } from "@caravan/bitcoin";

export const calculateTimeElapsed = (timestamp: number): string => {
  const now = Date.now();
  const elapsed = now - timestamp * 1000;
  const minutes = Math.floor(elapsed / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days} day${days > 1 ? "s" : ""}`;
  if (hours > 0) return `${hours} hour${hours > 1 ? "s" : ""}`;
  return `${minutes} minute${minutes > 1 ? "s" : ""}`;
};

export const formatAmount = (amountSats: number): string => {
  return satoshisToBitcoins(amountSats);
};

export const formatTxid = (txid: string): string => {
  return `${txid.substring(0, 8)}...`;
};
