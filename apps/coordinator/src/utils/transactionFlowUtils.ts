import { satoshisToBitcoins, bitcoinsToSatoshis } from "@caravan/bitcoin";
import BigNumber from "bignumber.js";

/**
 * Transform historical transaction data to TransactionFlowDiagram props
 *
 * This handles both public client transactions (with prevout data) and
 * private client transactions, providing the best data available.
 *
 * NOTE: For historical transactions, input values may not be available because
 * the `prevout` data is stripped during client normalization. In this case,
 * we calculate the total input value from outputs + fee, but individual input
 * values will be marked as unknown.
 */

export interface FlowDiagramInput {
  txid: string;
  index: number;
  amountSats: string;
  valueUnknown?: boolean; // Flag to indicate input value couldn't be determined
  multisig?: {
    name?: string;
  };
}

export interface FlowDiagramOutput {
  address: string;
  amount: string; // in BTC
  scriptType?: string;
}

export interface FlowDiagramProps {
  inputs: FlowDiagramInput[];
  outputs: FlowDiagramOutput[];
  fee: string; // in BTC
  changeAddress?: string;
  inputsTotalSats: BigNumber;
  status:
    | "draft"
    | "partial"
    | "ready"
    | "broadcast-pending"
    | "unconfirmed"
    | "confirmed"
    | "finalized"
    | "rbf"
    | "dropped"
    | "conflicted"
    | "rejected"
    | "unknown";
  confirmations?: number;
}

/**
 * Detect script type from address prefix (heuristic)
 */
const detectScriptTypeFromAddress = (address?: string): string | undefined => {
  if (!address) return undefined;

  // P2WPKH/P2WSH (native segwit) - bc1q or tb1q/bc1p/tb1p
  if (address.startsWith("bc1q") || address.startsWith("tb1q")) {
    // Could be P2WPKH (20 byte hash) or P2WSH (32 byte hash)
    // Bech32 addresses with 42 chars are typically P2WPKH, 62 chars are P2WSH
    return address.length === 42 ? "P2WPKH" : "P2WSH";
  }

  // P2TR (taproot) - bc1p or tb1p
  if (address.startsWith("bc1p") || address.startsWith("tb1p")) {
    return "P2TR";
  }

  // P2SH (could be P2SH-P2WPKH or P2SH-P2WSH) - starts with 3 (mainnet) or 2 (testnet)
  if (address.startsWith("3") || address.startsWith("2")) {
    return "P2SH";
  }

  // P2PKH (legacy) - starts with 1 (mainnet) or m/n (testnet)
  if (
    address.startsWith("1") ||
    address.startsWith("m") ||
    address.startsWith("n")
  ) {
    return "P2PKH";
  }

  return undefined;
};

/**
 * Transform a raw transaction from the blockchain client into
 * props suitable for the TransactionFlowDiagram component.
 *
 * @param tx - Raw transaction from blockchain client
 * @param walletAddresses - Array of wallet addresses to identify change outputs
 * @returns FlowDiagramProps ready for the component
 */
export const transformTransactionToFlowDiagram = (
  tx: any,
  walletAddresses: string[] = [],
): FlowDiagramProps => {
  // First, transform outputs to calculate total output value
  // Handle both normalized format (BTC string) and raw mempool format (satoshis number)
  const outputs: FlowDiagramOutput[] = (tx.vout || []).map((output: any) => {
    let amountBtc: string;

    if (typeof output.value === "string") {
      // Already in BTC format (normalized)
      amountBtc = output.value;
    } else if (typeof output.value === "number") {
      // Could be satoshis (raw mempool) or BTC (normalized)
      // If > 21M, definitely satoshis; if < 21, definitely BTC
      // Between 21 and 21M is ambiguous but rare - assume satoshis for raw data
      if (output.value > 21) {
        amountBtc = satoshisToBitcoins(output.value.toString());
      } else {
        amountBtc = output.value.toFixed(8);
      }
    } else {
      amountBtc = "0";
    }

    const address =
      output.scriptPubkeyAddress ||
      output.scriptpubkey_address ||
      output.address;
    const scriptType = detectScriptTypeFromAddress(address);

    return {
      address: address || "Unknown",
      amount: amountBtc,
      scriptType,
    };
  });

  // Calculate total outputs in satoshis
  const totalOutputsSats = outputs.reduce(
    (sum, output) => sum.plus(BigNumber(bitcoinsToSatoshis(output.amount))),
    BigNumber(0),
  );

  // Get fee in satoshis - tx.fee might already be in sats or could be in BTC
  let feeSats = BigNumber(0);
  if (tx.fee !== null && tx.fee !== undefined) {
    // If fee > 1, it's likely already in satoshis; otherwise it might be BTC
    if (tx.fee > 1) {
      feeSats = BigNumber(tx.fee);
    } else {
      feeSats = BigNumber(bitcoinsToSatoshis(tx.fee.toString()));
    }
  }

  // Calculate total input value = total outputs + fee
  const calculatedInputsTotalSats = totalOutputsSats.plus(feeSats);

  // Check if we have prevout data for inputs (raw mempool.space data includes this)
  const hasPrevoutData = (tx.vin || []).some(
    (input: any) => input.prevout?.value !== undefined,
  );

  // Transform inputs
  const inputs: FlowDiagramInput[] = (tx.vin || []).map(
    (input: any, idx: number) => {
      let amountSats = "0";
      let valueUnknown = true;

      // Try to get amount from prevout if available
      // Raw mempool.space data has prevout.value in satoshis
      if (input.prevout?.value !== undefined) {
        amountSats = input.prevout.value.toString();
        valueUnknown = false;
      } else if (!hasPrevoutData && (tx.vin || []).length === 1) {
        // If single input and no prevout data, we know the total
        amountSats = calculatedInputsTotalSats.toString();
        valueUnknown = false;
      }

      // Detect script type from prevout address if available
      // Raw mempool uses snake_case, normalized might use camelCase
      const prevoutAddress =
        input.prevout?.scriptpubkey_address ||
        input.prevout?.scriptPubkeyAddress;
      const scriptType = detectScriptTypeFromAddress(prevoutAddress);

      return {
        txid: input.txid || `unknown-${idx}`,
        index: input.vout ?? idx,
        amountSats,
        valueUnknown,
        multisig: scriptType
          ? {
              name: scriptType.toLowerCase(),
            }
          : undefined,
      };
    },
  );

  // Use calculated total for inputs (since individual values may be unknown)
  const inputsTotalSats = hasPrevoutData
    ? inputs.reduce(
        (sum, input) => sum.plus(BigNumber(input.amountSats)),
        BigNumber(0),
      )
    : calculatedInputsTotalSats;

  // Fee in BTC
  const feeBtc = satoshisToBitcoins(feeSats.toString());

  // Determine change address - any output that goes to a wallet address
  // and is not the only output (heuristic)
  let changeAddress: string | undefined;
  if (outputs.length > 1) {
    const walletOutput = outputs.find(
      (o) => o.address && walletAddresses.includes(o.address),
    );
    if (walletOutput) {
      changeAddress = walletOutput.address;
    }
  }

  // Determine status based on confirmation state
  let status: FlowDiagramProps["status"] = "unknown";
  if (tx.status) {
    if (tx.status.confirmed) {
      const blockHeight = tx.status.blockHeight || tx.status.block_height;
      // If we have block height info, we could calculate confirmations
      // For now, just mark as confirmed
      status = "confirmed";
    } else {
      status = "unconfirmed";
    }
  }

  // Calculate confirmations if we have block info
  let confirmations: number | undefined;
  if (tx.status?.confirmed && tx.status?.blockHeight) {
    // We'd need current block height to calculate this
    // For now, leave it undefined - can be enhanced later
    confirmations = undefined;
  }

  return {
    inputs,
    outputs,
    fee: feeBtc,
    changeAddress,
    inputsTotalSats,
    status,
    confirmations,
  };
};

/**
 * Format satoshis to BTC with proper precision
 */
export const formatSats = (sats: number | string | BigNumber): string => {
  const btc = satoshisToBitcoins(sats.toString());
  return `${btc} BTC`;
};

/**
 * Format address for display (truncate middle)
 */
export const formatAddress = (address: string): string => {
  if (address.length <= 20) return address;
  return `${address.slice(0, 10)}...${address.slice(-8)}`;
};
