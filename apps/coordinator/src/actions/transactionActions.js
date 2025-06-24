import BigNumber from "bignumber.js";
import {
  estimateMultisigTransactionFee,
  satoshisToBitcoins,
} from "@caravan/bitcoin";
import { getSpendableSlices, getConfirmedBalance } from "../selectors/wallet";
import {
  selectInputsFromPSBT,
  selectSignaturesFromPSBT,
  selectSignaturesForImporters,
} from "../selectors/transaction";
import {
  setSignatureImporterSignature,
  setSignatureImporterPublicKeys,
  setSignatureImporterFinalized,
  setSignatureImporterComplete,
} from "./signatureImporterActions";

import { DUST_IN_BTC } from "../utils/constants";
import { loadPsbt } from "../utils/psbtUtils";

export const CHOOSE_PERFORM_SPEND = "CHOOSE_PERFORM_SPEND";

export const SET_REQUIRED_SIGNERS = "SET_REQUIRED_SIGNERS";
export const SET_TOTAL_SIGNERS = "SET_TOTAL_SIGNERS";

export const SET_INPUTS = "SET_INPUTS";

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

/**
 * Sets outputs from a PSBT into Redux state.
 * This thunk:
 *  - Iterates over each PSBT output
 *  - Dispatches actions to reflect each output in the UI state
 *  - Identifies and sets the change output if applicable
 *
 * @param psbt - The partially signed Bitcoin transaction
 * @returns A thunk function for Redux
 */
function setOutputsFromPSBT(psbt) {
  return (dispatch) => {
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
  };
}

/**
 * Extracts and imports partial signatures from a PSBT into Caravan's signature importers.
 *
 * This is the main entry point for processing signatures when importing a PSBT that
 * has already been partially signed by other wallets/tools. It handles the entire
 * workflow from signature extraction to updating the Redux state.
 *
 * @description The function performs these key steps:
 *   1. Extracts signature data from the PSBT using our composed selectors
 *   2. Transforms the signatures into Caravan's internal format
 *   3. Updates the signature importers state via multiple Redux actions
 *   4. Handles errors gracefully without breaking the PSBT import flow
 *
 * @param {Psbt} psbt - The PSBT object containing partial signatures to extract
 *
 * @returns {Function} Redux thunk function that takes (dispatch, getState)
 *
 * @example
 * // In your PSBT import flow:
 * dispatch(setSignaturesFromPsbt(psbt));
 *
 * @see extractSignaturesFromPSBT - For the core signature extraction logic
 * @see mapSignaturesToImporters - For signature format transformation
 *
 * @throws {Error} Logs warnings for signature extraction failures but doesn't throw
 *                 to avoid breaking the overall PSBT import process
 */
export function setSignaturesFromPsbt(psbt) {
  return (dispatch, getState) => {
    // === STEP 1: Extract signature sets from the PSBT ===
    // This uses our composed selectors to:
    // - Get wallet UTXOs that match PSBT inputs (selectInputsFromPSBT)
    // - Parse partial signatures from PSBT data
    // - Group signatures by signer (one signer signs ALL inputs)
    const state = getState();
    const signatureSets = selectSignaturesFromPSBT(state, psbt);
    // === STEP 2: Process signatures if any were found ===
    if (signatureSets.length > 0) {
      // Transform raw signature data into Caravan's signature importer format
      // This maps each signature set to an "importer" (numbered 1, 2, 3...)
      // that corresponds to Caravan's UI signature input slots
      const importerData = selectSignaturesForImporters(state, psbt);
      // === STEP 3: Update Redux state for each signature set ===
      // For each complete signature set, we need to update multiple parts
      // of the signature importer state. This is Caravan's pattern for
      // managing signature data across the signing workflow.
      importerData.forEach((sigData) => {
        // Set the raw signature data (hex-encoded signatures)
        dispatch(
          setSignatureImporterSignature(
            sigData.importerNumber,
            sigData.signatures,
          ),
        );

        // Set the public keys that correspond to these signatures
        // These are used for signature verification
        dispatch(
          setSignatureImporterPublicKeys(
            sigData.importerNumber,
            sigData.publicKeys,
          ),
        );

        // Mark this importer as "finalized" - meaning we have a complete
        // signature set and it's ready for use in transaction construction
        dispatch(setSignatureImporterFinalized(sigData.importerNumber, true));

        // Set the complete signature data object
        // This is Caravan's "master" action that bundles everything together
        // and is used by the signing components to display signature status
        dispatch(
          setSignatureImporterComplete(sigData.importerNumber, {
            signature: sigData.signatures,
            publicKeys: sigData.publicKeys,
            finalized: true,
          }),
        );
      });
    }
  };
}

/**
 * Calculates and sets the transaction fee based on current state.
 *
 * This action creator encapsulates the fee calculation logic by:
 * 1. Getting the current inputsTotalSats from state
 * 2. Calculating fee as the difference between inputs and outputs
 * 3. Converting from satoshis to bitcoins
 * 4. Dispatching the setFee action
 *
 * @param {BigNumber} outputsTotalSats - Total satoshis in all outputs
 * @returns {Function} Redux thunk function
 */
export function setFeeFromState(outputsTotalSats) {
  return (dispatch, getState) => {
    const state = getState();
    const inputsTotalSats = BigNumber(state.spend.transaction.inputsTotalSats);
    const feeSats = inputsTotalSats.minus(outputsTotalSats);
    const fee = satoshisToBitcoins(feeSats);
    dispatch(setFee(fee));
  };
}

export function importPSBT(psbtText) {
  return (dispatch, getState) => {
    let state = getState();
    const { network } = state.settings;

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
    const inputs = selectInputsFromPSBT(getState(), psbt);

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
    const { outputsTotalSats } = dispatch(setOutputsFromPSBT(psbt));

    // Calculate and set fee
    dispatch(setFeeFromState(outputsTotalSats));

    // ==== Extract and import signatures (If they are present)====
    dispatch(setSignaturesFromPsbt(psbt));

    // Finalize the transaction
    dispatch(finalizeOutputs(true));
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
