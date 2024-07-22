import { Transaction } from "bitcoinjs-lib-v5";
import {
  unsignedMultisigTransaction, 
  multisigRequiredSigners,
  multisigTotalSigners,
  multisigAddressType
} from "@caravan/bitcoin";
import BigNumber from "bignumber.js";
import { RBFOptions, UTXO, TransactionOutput, FeeRate } from "./types";
import { isRBFSignaled, estimateVirtualSize } from "./utils";

/**
 * Prepare an RBF (Replace-By-Fee) transaction.
 * This function doesn't broadcast the transaction, it just prepares it.
 * @param options RBF options including the original transaction and new fee rate
 * @returns A new transaction ready for signing and broadcasting
 */
export function prepareRBFTransaction(options: RBFOptions): Transaction {
  const {
    transaction,
    newFeeRate,
    utxos,
    subtractFromOutput = false,
    cancelTransaction = false,
    destinationAddress,
    network,
  } = options;

  if (!isRBFSignaled(transaction)) {
    throw new Error("Original transaction is not signaling RBF");
  }

  // Calculate new fee
  const newFee = calculateNewFee(transaction, newFeeRate);

  // Calculate total input amount
  const totalInput = utxos.reduce(
    (sum, utxo) => sum.plus(utxo.value),
    new BigNumber(0)
  );

  let outputs: TransactionOutput[] = [];

  if (cancelTransaction) {
    // For cancellation, send everything back to the destination address minus the new fee
    const cancelAmount = totalInput.minus(newFee);
    outputs.push({ address: destinationAddress!, amountSats: cancelAmount });
  } else if (subtractFromOutput) {
    // Subtract the fee increase from the first non-change output
    const feeIncrease = newFee.minus(calculateFee(transaction, utxos));
    outputs = transaction.outs.map((out, index) => {
      if (index === 0 && !isChangeOutput(out, utxos)) {
        return {
          address: out.address!, // need to fix this implementation by defining a function to derive address from script
          amountSats: new BigNumber(out.value).minus(feeIncrease),
        };
      }
      return { address: out.address!, amountSats: new BigNumber(out.value) };
    });
  } else {
    // Use the original outputs
    outputs = transaction.outs.map((out) => ({
      address: out.address!,
      amountSats: new BigNumber(out.value),
    }));
  }

  // Filter out dust outputs
  outputs = outputs.filter((output) => output.amountSats.isGreaterThan(546));

  // Use Caravan's unsignedMultisigTransaction function to create the new transaction
  return unsignedMultisigTransaction(network, utxos, outputs, true); // true to enable RBF
}

/**
 * Calculate the new fee for an RBF transaction.
 * @param transaction The original transaction
 * @param newFeeRate The new fee rate
 * @returns The new fee amount
 */
function calculateNewFee(transaction: Transaction, newFeeRate: FeeRate): BigNumber {
  const addressType = multisigAddressType(transaction);
  const m = multisigRequiredSigners(transaction);
  const n = multisigTotalSigners(transaction);
  const vsize = estimateVirtualSize(
    addressType,
    transaction.ins.length,
    transaction.outs.length,
    m,
    n
  );
  return new BigNumber(vsize).multipliedBy(newFeeRate.satoshisPerByte);
}


/**
 * Calculate the fee of a transaction.
 * @param transaction The transaction
 * @param utxos The UTXOs spent in the transaction
 * @returns The fee amount
 */
function calculateFee(transaction: Transaction, utxos: UTXO[]): BigNumber {
  const totalInput = utxos.reduce(
    (sum, utxo) => sum.plus(utxo.value),
    new BigNumber(0)
  );
  const totalOutput = transaction.outs.reduce(
    (sum, output) => sum.plus(output.value),
    new BigNumber(0)
  );
  return totalInput.minus(totalOutput);
}

/**
 * Check if an output is likely a change output.
 * @param output The output to check
 * @param utxos The UTXOs spent in the transaction
 * @returns True if the output is likely a change output, false otherwise
 */
function isChangeOutput(output: any, utxos: UTXO[]): boolean {
  return utxos.some((utxo) => utxo.address === output.address);
}
