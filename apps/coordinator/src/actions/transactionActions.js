import BigNumber from "bignumber.js";
import { reverseBuffer } from "bitcoinjs-lib/src/bufferutils.js";
import {
  estimateMultisigTransactionFee,
  satoshisToBitcoins,
  bitcoinsToSatoshis,
} from "@caravan/bitcoin";
import {
  loadPsbt,
  extractSignaturesFromPSBT,
  mapSignaturesToImporters,
} from "../utils/psbtUtils";
import {
  getSpendableSlices,
  getConfirmedBalance,
  getAllSlices,
} from "../selectors/wallet";
import {
  setSignatureImporterSignature,
  setSignatureImporterPublicKeys,
  setSignatureImporterFinalized,
  setSignatureImporterComplete,
} from "./signatureImporterActions";

import { DUST_IN_BTC } from "../utils/constants";

export const CHOOSE_PERFORM_SPEND = "CHOOSE_PERFORM_SPEND";

export const SET_REQUIRED_SIGNERS = "SET_REQUIRED_SIGNERS";
export const SET_TOTAL_SIGNERS = "SET_TOTAL_SIGNERS";

export const SET_INPUTS = "SET_INPUTS";
export const SET_ENABLE_RBF = "SET_ENABLE_RBF";

export const ADD_OUTPUT = "ADD_OUTPUT";
export const SET_OUTPUT_ADDRESS = "SET_OUTPUT_ADDRESS";
export const SET_OUTPUT_AMOUNT = "SET_OUTPUT_AMOUNT";
export const DELETE_OUTPUT = "DELETE_OUTPUT";

export const SET_FEE_RATE = "SET_FEE_RATE";
export const SET_FEE = "SET_FEE";

export const FINALIZE_OUTPUTS = "FINALIZE_OUTPUTS";
export const RESET_OUTPUTS = "RESET_OUTPUTS";

export const SET_TXID = "SET_TXID";
export const RESET_TRANSACTION = "RESET_TRANSACTION";
export const SET_IS_WALLET = "SET_IS_WALLET";
export const SET_CHANGE_OUTPUT_INDEX = "SET_CHANGE_OUTPUT_INDEX";
export const SET_CHANGE_OUTPUT_MULTISIG = "SET_CHANGE_OUTPUT_MULTISIG";
export const SET_UNSIGNED_PSBT = "SET_UNSIGNED_PSBT";
export const RESET_PSBT = "RESET_PSBT";
export const UPDATE_AUTO_SPEND = "UPDATE_AUTO_SPEND";
export const SET_CHANGE_ADDRESS = "SET_CHANGE_ADDRESS";
export const SET_SIGNING_KEY = "SET_SIGNING_KEY";
export const SET_SPEND_STEP = "SET_SPEND_STEP";
export const SET_BALANCE_ERROR = "SET_BALANCE_ERROR";
export const SPEND_STEP_CREATE = 0;
export const SPEND_STEP_PREVIEW = 1;
export const SPEND_STEP_SIGN = 2;

export function choosePerformSpend() {
  return {
    type: CHOOSE_PERFORM_SPEND,
  };
}

export function setRequiredSigners(number) {
  return {
    type: SET_REQUIRED_SIGNERS,
    value: number,
  };
}

export function setTotalSigners(number) {
  return {
    type: SET_TOTAL_SIGNERS,
    value: number,
  };
}

export function setInputs(inputs) {
  return {
    type: SET_INPUTS,
    value: inputs,
  };
}

export function addOutput() {
  return {
    type: ADD_OUTPUT,
  };
}

export function setChangeOutputIndex(number) {
  return {
    type: SET_CHANGE_OUTPUT_INDEX,
    value: number,
  };
}

export function setChangeOutputMultisig(number, multisig) {
  return {
    type: SET_CHANGE_OUTPUT_MULTISIG,
    number,
    value: multisig,
  };
}

export function setOutputAddress(number, address) {
  return {
    type: SET_OUTPUT_ADDRESS,
    number,
    value: address,
  };
}

export function setOutputAmount(number, amountString) {
  return {
    type: SET_OUTPUT_AMOUNT,
    number,
    value: amountString,
  };
}

export function setChangeAddressAction(value) {
  return {
    type: SET_CHANGE_ADDRESS,
    value,
  };
}

export function setChangeOutput({ value, address }) {
  return (dispatch, getState) => {
    const {
      spend: {
        transaction: { outputs, changeOutputIndex },
      },
    } = getState();
    // add output for change if there's none set (or it's set to zero)
    // if there's a change index then we use that
    // otherwise put it at the end of the outputs
    if (!changeOutputIndex) dispatch(addOutput());

    // output/change indexes are not zero-indexed
    const index = changeOutputIndex || outputs.length + 1;
    dispatch(setChangeOutputIndex(index));
    dispatch(setChangeAddressAction(address));
    dispatch(setOutputAddress(index, address));
    dispatch(setOutputAmount(index, value));
  };
}

export function deleteOutput(number) {
  return {
    type: DELETE_OUTPUT,
    number,
  };
}

export function deleteChangeOutput() {
  return (dispatch, getState) => {
    const { changeOutputIndex } = getState().spend.transaction;
    if (!changeOutputIndex) return;

    dispatch(deleteOutput(changeOutputIndex));
  };
}

export function setFeeRate(valueString) {
  return {
    type: SET_FEE_RATE,
    value: valueString,
  };
}

export function setFee(valueString) {
  return {
    type: SET_FEE,
    value: valueString,
  };
}

export function finalizeOutputs(finalized) {
  return {
    type: FINALIZE_OUTPUTS,
    value: finalized,
  };
}

export function resetOutputs() {
  return {
    type: RESET_OUTPUTS,
  };
}

export function setBalanceError(message) {
  return {
    type: SET_BALANCE_ERROR,
    value: message,
  };
}

export function setUnsignedPSBT(value) {
  return {
    type: SET_UNSIGNED_PSBT,
    value,
  };
}

export function resetPSBT() {
  return {
    type: RESET_PSBT,
  };
}

export function resetTransaction() {
  return {
    type: RESET_TRANSACTION,
  };
}

export function setTXID(txid) {
  return {
    type: SET_TXID,
    value: txid,
  };
}

export function setIsWallet() {
  return {
    type: SET_IS_WALLET,
  };
}

export function updateAutoSpendAction(value) {
  return {
    type: UPDATE_AUTO_SPEND,
    value,
  };
}

export function setSigningKey(number, extendedPublicKeyImporterIndex) {
  return {
    type: SET_SIGNING_KEY,
    number,
    value: extendedPublicKeyImporterIndex,
  };
}

export function setSpendStep(value) {
  return {
    type: SET_SPEND_STEP,
    value,
  };
}

/**
 * @description Given an output index and the current state of the transaction,
 * calculate an estimated fee for a tx with all spendable utxos as inputs,
 * and then use that to determine value of an output that spends all spendable funds
 * minus fee. Dispatches an action to add that value to the given output.
 * @param {Number} outputIndex - 1-indexed location of the output
 * to add all remaining spendable funds to
 */
export function setMaxSpendOnOutput(outputIndex) {
  return (dispatch, getState) => {
    const spendableSlices = getSpendableSlices(getState());
    const confirmedBalance = getConfirmedBalance(getState());
    const {
      settings: { addressType, requiredSigners, totalSigners },
      spend: {
        transaction: { outputs, feeRate },
      },
    } = getState();
    const numInputs = spendableSlices.reduce(
      (count, slice) => count + slice.utxos.length,
      0,
    );
    const estimatedFee = estimateMultisigTransactionFee({
      addressType,
      numInputs,
      numOutputs: outputs.length,
      m: requiredSigners,
      n: totalSigners,
      feesPerByteInSatoshis: feeRate,
    });

    const totalOutputValue = outputs.reduce(
      (total, output) =>
        total.plus(output.amount.length ? output.amountSats : 0),
      new BigNumber(0),
    );

    const spendAllAmount = new BigNumber(
      satoshisToBitcoins(
        new BigNumber(confirmedBalance)
          .minus(outputs.length > 1 ? totalOutputValue : 0)
          .minus(estimatedFee)
          .toFixed(8),
      ),
    );

    if (
      (spendAllAmount.isLessThanOrEqualTo(satoshisToBitcoins(estimatedFee)) &&
        outputs.length > 1) ||
      spendAllAmount.isLessThan(DUST_IN_BTC)
    )
      return dispatch(
        setBalanceError(
          "Not enough available funds for max spend. Clear other outputs or wait for incoming deposits to confirm.",
        ),
      );
    return dispatch(setOutputAmount(outputIndex, spendAllAmount.toString()));
  };
}

/// RBF UTIL FUNCTION

/**
 * Reverses a hex string by reversing pairs of characters (bytes)
 * Example: "abcd1234" becomes "3412cdab"
 */
function reverseHexString(hexString) {
  if (!hexString || hexString.length % 2 !== 0) {
    return hexString;
  }

  const bytes = [];
  for (let i = 0; i < hexString.length; i += 2) {
    bytes.push(hexString.substr(i, 2));
  }

  return bytes.reverse().join("");
}

/**
 * Gets pending transactions from the wallet and reconstructs UTXO details for RBF
 * This approach works around Bitcoin Core's listunspent limitations by using
 * pending transaction data to find UTXOs that are already spent in unconfirmed transactions.
 *
 * @param {Object} blockchainClient - Blockchain client instance
 * @param {Object} state - Current Redux state containing wallet data
 * @returns {Promise<Array>} Array of reconstructed UTXO objects with wallet metadata
 */
async function getUtxosFromPendingTransactions(blockchainClient, state) {
  try {
    // Get all wallet nodes (deposits + change)
    const deposits = state.wallet.deposits;
    const change = state.wallet.change;
    const allSlices = getAllSlices(state);

    // Collect transaction IDs from all UTXOs in the wallet
    // This gives us all transactions that have created UTXOs for this wallet
    const txids = new Set();

    [...Object.values(deposits.nodes), ...Object.values(change.nodes)].forEach(
      (node) => {
        if (node && node.multisig && node.multisig.address) {
          if (node.utxos && node.utxos.length > 0) {
            // Add transaction IDs from active UTXOs
            node.utxos.forEach((utxo) => {
              if (utxo.txid) txids.add(utxo.txid);
            });
          }
        }
      },
    );

    // Fetch full transaction details for each transaction ID
    const fetchTransactionDetails = async (txid) => {
      try {
        return await blockchainClient.getTransaction(txid);
      } catch (err) {
        console.error(`Error fetching tx ${txid}:`, err);
        return null;
      }
    };

    const txPromises = Array.from(txids).map((txid) =>
      fetchTransactionDetails(txid),
    );
    const txDetails = await Promise.all(txPromises);

    // Filter to get only pending (unconfirmed) transactions
    const pendingTxs = txDetails
      .filter((tx) => tx !== null)
      .filter((tx) => !tx.status?.confirmed);

    const reconstructedUtxos = [];

    // For each pending transaction, get its full details to extract input UTXOs
    for (const pendingTx of pendingTxs) {
      try {
        // Get full transaction details from Bitcoin Core
        // This gives us the complete input,output information
        const fullTxDetails = await blockchainClient.getTransaction(
          pendingTx.txid,
        );

        // Process each input from the pending transaction
        if (fullTxDetails.vin && Array.isArray(fullTxDetails.vin)) {
          for (const input of fullTxDetails.vin) {
            // Each input represents a UTXO that was spent in this pending transaction
            // We need to reconstruct the original UTXO details

            if (!input.txid || input.vout === undefined) {
              console.warn(
                `⚠️ Invalid input in transaction ${pendingTx.txid}:`,
                input,
              );
              continue;
            }

            try {
              // Get the original transaction that created this UTXO
              // This tells us which address received the funds originally
              const originalTx = await blockchainClient.getTransaction(
                input.txid,
              );

              // Look at the specific output (vout) that was spent
              const originalOutput = originalTx.vout?.[input.vout];
              if (!originalOutput) {
                console.warn(
                  `⚠️ Could not find output ${input.vout} in transaction ${input.txid}`,
                );
                continue;
              }

              const outputAddress =
                originalOutput.scriptPubkeyAddress ||
                originalOutput.scriptPubKey?.address;
              if (!outputAddress) {
                console.warn(
                  `⚠️ No address found for output ${input.txid}:${input.vout}`,
                );
                continue;
              }

              // Find the corresponding wallet slice for this address
              // This gives us the multisig details, BIP32 path, etc.
              const matchingSlice = allSlices.find(
                (slice) => slice.multisig?.address === outputAddress,
              );

              if (!matchingSlice) {
                console.log(
                  `ℹ️ Address ${outputAddress} not found in wallet slices (might be external)`,
                );
                continue;
              }

              // Reconstruct the UTXO object with all necessary details for signing
              const reconstructedUtxo = {
                txid: input.txid,
                index: input.vout,
                // Convert amount from BTC to satoshis
                amountSats: bitcoinsToSatoshis(originalOutput.value.toString()),
                amount: originalOutput.value.toString(),
                confirmed: originalTx.status?.confirmed || false,
                // Add wallet-specific metadata needed for signing
                multisig: matchingSlice.multisig,
                bip32Path: matchingSlice.bip32Path,
                change: matchingSlice.change,
                // Additional metadata for debugging
                _source: "pending_transaction",
                _pendingTxid: pendingTx.txid,
                _originalTxid: input.txid,
              };

              reconstructedUtxos.push(reconstructedUtxo);
            } catch (txError) {
              console.warn(
                `⚠️ Failed to get details for input ${input.txid}:${input.vout}:`,
                txError.message,
              );
            }
          }
        }
      } catch (error) {
        console.warn(
          `⚠️ Failed to analyze pending transaction ${pendingTx.txid}:`,
          error.message,
        );
      }
    }

    return reconstructedUtxos;
  } catch (error) {
    console.error(`❌ Failed to get UTXOs from pending transactions:`, error);
    throw error;
  }
}

/**
 * Processes inputs from PSBT and matches them with wallet UTXOs.
 * Handles both normal PSBTs and RBF PSBTs by using multiple strategies.
 *
 * Strategy 1: Check spendable slices (normal PSBT case)
 * Strategy 2: Reconstruct UTXOs from pending transactions (RBF case)
 *
 * This approach is necessary because Bitcoin Core's listunspent doesn't reliably
 * return UTXOs that are already spent in pending transactions, even with include_unsafe=true.
 * Instead, we analyze pending transactions to find and reconstruct the UTXO details.
 */
async function processInputsFromPSBT(psbt, state) {
  const createInputIdentifier = (txid, index) => `${txid}:${index}`;

  const inputIdentifiers = new Set(
    psbt.txInputs.map((input) => {
      const txid = reverseBuffer(input.hash).toString("hex");
      return createInputIdentifier(txid, input.index);
    }),
  );

  const inputs = [];

  // Strategy 1: Try spendable slices first (normal PSBT case)
  getSpendableSlices(state).forEach((slice) => {
    Object.entries(slice.utxos).forEach(([, utxo]) => {
      const inputIdentifier = createInputIdentifier(utxo.txid, utxo.index);
      if (inputIdentifiers.has(inputIdentifier)) {
        const input = {
          ...utxo,
          multisig: slice.multisig,
          bip32Path: slice.bip32Path,
          change: slice.change,
        };
        inputs.push(input);
      }
    });
  });

  // Strategy 2: If we didn't find all inputs, reconstruct from pending transactions (RBF case)
  // This is the key innovation - instead of fighting with listunspent, we use pending
  // transaction data to reconstruct the UTXO details we need
  if (inputs.length < psbt.txInputs.length) {
    const { blockchainClient } = state.client;
    if (!blockchainClient) {
      throw new Error("No blockchain client available for UTXO lookup");
    }

    // Get all UTXOs that we can reconstruct from pending transactions
    const reconstructedUtxos = await getUtxosFromPendingTransactions(
      blockchainClient,
      state,
    );

    // Track which inputs we've already found to avoid duplicates
    const foundInputIds = new Set(
      inputs.map((inp) => createInputIdentifier(inp.txid, inp.index)),
    );

    // Match reconstructed UTXOs with the inputs we need
    reconstructedUtxos.forEach((utxo) => {
      const inputIdentifier = createInputIdentifier(
        // For some reason, the txid returned by `getUtxosFromPendingTransactions` is in big-endian,
        // while the one expected by the RBF PSBT builder should be in little-endian.
        // However, in our case, the txid seems to already be in big-endian — so we reverse it here.
        // This feels a bit hacky, but changing the original behavior would break normal PSBT imports,
        // so we're keeping this localized workaround.
        //
        // The root cause might lie in how @caravan/fees constructs the PSBT,
        // which in turn could be influenced by @caravan/psbt internals.
        //
        // If we have time later, it might be worth tracing the full data path and standardizing it,
        // but for now, this keeps things working without breaking existing flows
        reverseHexString(utxo.txid),
        utxo.index,
      );

      // Only add if we need this input and haven't already found it
      if (
        inputIdentifiers.has(inputIdentifier) &&
        !foundInputIds.has(inputIdentifier)
      ) {
        inputs.push(utxo);
        foundInputIds.add(inputIdentifier);
      }
    });
  }

  return inputs;
}

/**
 * Processes outputs from PSBT and adds them to the transaction.
 */
function processOutputsFromPSBT(psbt, dispatch) {
  let outputsTotalSats = new BigNumber(0);

  psbt.txOutputs.forEach((output, outputIndex) => {
    const number = outputIndex + 1;
    outputsTotalSats = outputsTotalSats.plus(BigNumber(output.value));

    if (number > 1) {
      dispatch(addOutput());
    }

    // Check if this is a change output (has script/witness script)
    if (output.script) {
      dispatch(setChangeOutputIndex(number));
      dispatch(setChangeAddressAction(output.address));
    }

    dispatch(setOutputAddress(number, output.address));
    dispatch(setOutputAmount(number, satoshisToBitcoins(output.value)));
  });

  return { outputsTotalSats };
}

export function importPSBT(psbtText) {
  return async (dispatch, getState) => {
    let state = getState();
    const { network } = state.settings;
    try {
      // Handles both PSBTv0 and PSBTv2
      const psbt = loadPsbt(psbtText, network);
      if (!psbt) {
        throw new Error("Could not parse PSBT.");
      }

      if (psbt.txInputs.length === 0) {
        throw new Error("PSBT does not contain any inputs.");
      }
      if (psbt.txOutputs.length === 0) {
        throw new Error("PSBT does not contain any outputs.");
      }

      dispatch(resetOutputs());
      dispatch(setUnsignedPSBT(psbt.toBase64()));

      // ==== PROCESS INPUTS ====
      const inputs = await processInputsFromPSBT(psbt, state);

      if (inputs.length === 0) {
        throw new Error("PSBT does not contain any UTXOs from this wallet.");
      }
      if (inputs.length !== psbt.txInputs.length) {
        throw new Error(
          `Only ${inputs.length} of ${psbt.txInputs.length} PSBT inputs are UTXOs in this wallet.`,
        );
      }

      dispatch(setInputs(inputs));

      // ==== PROCESS INPUTS ====
      const { outputsTotalSats } = processOutputsFromPSBT(psbt, dispatch);

      // Calculate and set fee
      state = getState(); //Now we get updated state after setting inputs
      const inputsTotalSats = BigNumber(
        state.spend.transaction.inputsTotalSats,
      );
      const feeSats = inputsTotalSats.minus(outputsTotalSats);
      const fee = satoshisToBitcoins(feeSats);
      dispatch(setFee(fee));

      // ==== Extract and import signatures ====
      try {
        const signatureSets = extractSignaturesFromPSBT(psbt, inputs);

        if (signatureSets.length > 0) {
          // Map signatures to Caravan's signature importers
          const importerData = mapSignaturesToImporters(signatureSets);

          // Update signature importers state
          importerData.forEach((sigData) => {
            // Set the signature data for this importer
            dispatch(
              setSignatureImporterSignature(
                sigData.importerNumber,
                sigData.signatures,
              ),
            );

            // Set the public keys
            dispatch(
              setSignatureImporterPublicKeys(
                sigData.importerNumber,
                sigData.publicKeys,
              ),
            );

            // Mark as finalized since we have a complete signature set
            dispatch(
              setSignatureImporterFinalized(sigData.importerNumber, true),
            );

            // Use setSignatureImporterComplete for the complete signature
            dispatch(
              setSignatureImporterComplete(sigData.importerNumber, {
                signature: sigData.signatures,
                publicKeys: sigData.publicKeys,
                finalized: true,
              }),
            );
          });
        } else {
          console.log(
            "ℹ️ No complete signature sets found in PSBT (this is normal for unsigned PSBTs)",
          );
        }
      } catch (signatureError) {
        // Don't fail the entire import if signature extraction fails
        console.warn(
          "⚠️ Failed to extract signatures, but continuing with PSBT import:",
          signatureError.message,
        );
      }

      // Finalize the transaction
      dispatch(finalizeOutputs(true));
    } catch (error) {
      console.error("❌ PSBT import failed:", error);
      throw error;
    }
  };
}

export function importHermitPSBT(psbtText) {
  return (dispatch, getState) => {
    const state = getState();
    const { network } = state.settings;
    //Handles both PSBTv0 and PSBTv2
    const psbt = loadPsbt(psbtText, network);
    if (!psbt) {
      throw new Error("Could not parse PSBT.");
    }

    if (psbt.txInputs.length === 0) {
      throw new Error("PSBT does not contain any inputs.");
    }
    if (psbt.txOutputs.length === 0) {
      throw new Error("PSBT does not contain any outputs.");
    }

    dispatch(resetOutputs());
    dispatch(setUnsignedPSBT(psbt.toBase64()));
    // To extend this support beyond the bare bones here, it will be necessary to handle
    // any included signatures if this PSBT is already partially signed. However, for now
    // we just skip over that, treating every PSBT as if it is unsigned whether it has
    // any signatures included or not.
  };
}

// There are two implicit constraints on legacyPSBT support as written
//    1. All UTXOs being spent are from the same redeem script (e.g. single address spend)
//    2. There is no change - we are sweeping all funds to a single address. e.g. len(psbt.txOutputs) == 1
export function importLegacyPSBT(psbtText) {
  return (dispatch, getState) => {
    const state = getState();
    const { network } = state.settings;
    //Handles both PSBTv0 and PSBTv2
    const psbt = loadPsbt(psbtText, network);
    if (!psbt) {
      throw new Error("Could not parse PSBT.");
    }
    return psbt;
  };
}

export function setRBF(enabled) {
  return {
    type: SET_ENABLE_RBF,
    value: enabled,
  };
}
