import { Transaction } from "bitcoinjs-lib-v5";
import { unsignedMultisigTransaction } from "@caravan/bitcoin";
import BigNumber from "bignumber.js";
import { CPFPOptions, UTXO } from "./types";
import { estimateVirtualSize } from "./utils";

/**
 * Prepare a CPFP (Child-Pays-for-Parent) transaction.
 * This function doesn't broadcast the transaction, it just prepares it.
 * @param options CPFP options including the parent transaction and new fee rate
 * @returns A new transaction ready for signing and broadcasting
 */
export function prepareCPFPTransaction(options: CPFPOptions): Transaction {
  const {
    parentTransaction,
    newFeeRate,
    availableUTXOs,
    destinationAddress,
    network,
    multisigDetails,
  } = options;

  // Find suitable output from parent transaction to spend
  const parentOutput = findSuitableParentOutput(
    parentTransaction,
    availableUTXOs
  );
  if (!parentOutput) {
    throw new Error("No suitable output found in parent transaction for CPFP");
  }

  const childSize = estimateChildTransactionSize({
    inputCount: 1, // We're spending one output from the parent
    outputCount: 2, // Destination output and potentially change
    addressType: multisigDetails.addressType,
    requiredSigners: multisigDetails.requiredSigners,
    totalSigners: multisigDetails.totalSigners,
  });
  // Calculate required fee for both transactions
  const combinedSize = parentTransaction.virtualSize() + childSize;
  const requiredFee = new BigNumber(combinedSize).multipliedBy(
    newFeeRate.satoshisPerByte
  );

  // Calculate amount to send to destination
  const outputAmount = new BigNumber(parentOutput.value).minus(requiredFee);

  if (outputAmount.isLessThan(546)) {
    // Check if output would be dust
    throw new Error("CPFP transaction would create a dust output");
  }

  const inputs = [{ ...parentOutput, txid: parentTransaction.getId() }];
  const outputs = [{ address: destinationAddress, amountSats: outputAmount }];

  // Use Caravan's unsignedMultisigTransaction function to create the new transaction
  return unsignedMultisigTransaction(network, inputs, outputs, true); // true to enable RBF
}

/**
 * Find a suitable output from the parent transaction to use for CPFP.
 * @param parentTransaction The parent transaction
 * @param availableUTXOs Available UTXOs that can be spent
 * @returns A suitable output or null if none found
 */
function findSuitableParentOutput(
  parentTransaction: Transaction,
  availableUTXOs: UTXO[]
): { index: number; value: number } | null {
  for (let i = 0; i < parentTransaction.outs.length; i++) {
    const output = parentTransaction.outs[i];
    if (
      availableUTXOs.some(
        (utxo) => utxo.txid === parentTransaction.getId() && utxo.vout === i
      )
    ) {
      return { index: i, value: output.value };
    }
  }
  return null;
}

function estimateChildTransactionSize(options: {
  inputCount: number;
  outputCount: number;
  addressType: string;
  requiredSigners: number;
  totalSigners: number;
}): number {
  const {
    inputCount,
    outputCount,
    addressType,
    requiredSigners,
    totalSigners,
  } = options;

  return estimateVirtualSize(
    addressType,
    inputCount,
    outputCount,
    requiredSigners,
    totalSigners
  );
}
