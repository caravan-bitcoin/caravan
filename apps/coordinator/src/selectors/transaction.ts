import { Psbt } from "bitcoinjs-lib-v6";
import { createSelector } from "reselect";
import { getSpendableSlices, WalletState } from "./wallet";
import {
  UTXO,
  Input,
  Slice,
  reverseTxidEndianness,
  getSequenceForInput,
  getInputIdentifiersFromPsbt,
  mapSignaturesToImporters,
  extractSignaturesFromPSBT,
  createInputIdentifier,
} from "utils/psbtUtils";

// ====================
// SELECTORS
// ====================

export const selectInputIdentifiersFromPSBT = createSelector(
  [(state: WalletState, psbt: Psbt) => psbt],
  (psbt: Psbt) => getInputIdentifiersFromPsbt(psbt),
);

/**
 * Selector for "available inputs" from the unspent store
 * This is the first strategy - normal PSBT case where we get all the inputs we have in our wallet
 */
export const selectAvailableInputsFromPSBT = createSelector(
  [getSpendableSlices, (state: WalletState, psbt: Psbt) => psbt],
  (slices: any[], psbt: Psbt) => {
    const inputIdentifiers = getInputIdentifiersFromPsbt(psbt);

    // Build a quick lookup from txid:index -> wallet input
    const identifierToInput = new Map<string, Input>();

    slices.forEach((slice: Slice & { utxos: UTXO }) => {
      Object.entries(slice.utxos || {}).forEach(([, utxo]) => {
        const inputIdentifier = createInputIdentifier(utxo.txid, utxo.index);
        if (inputIdentifiers.has(inputIdentifier)) {
          identifierToInput.set(inputIdentifier, {
            ...utxo,
            multisig: slice.multisig,
            bip32Path: slice.bip32Path,
            change: slice.change,
            sequence: getSequenceForInput(psbt, inputIdentifier),
          });
        }
      });
    });

    // Return inputs ordered to match the PSBT input order
    const orderedInputs: Input[] = [];
    const psbtInputIdsInOrder: string[] = psbt.txInputs.map((txIn) =>
      // Here we are converting from big-endian to little-endian format to have the txid in the same format as they are in PSBT class
      createInputIdentifier(reverseTxidEndianness(txIn.hash), txIn.index),
    );

    psbtInputIdsInOrder.forEach((id) => {
      const input = identifierToInput.get(id);
      if (input) orderedInputs.push(input);
    });

    return orderedInputs;
  },
);

/**
 * Selector to find input identifiers that are missing from available wallet UTXOs.
 * These are inputs that the PSBT references but aren't currently visible in our
 * spendable slices (likely because they're consumed by pending transactions).
 *
 * This is used for RBF PSBT scenarios where we need to reconstruct UTXOs that
 * are "hidden" by pending transactions.
 *
 * @returns Set<string> of input identifiers (txid:index) that need reconstruction
 */
export const selectMissingInputIdentifiersFromPSBT = createSelector(
  [selectInputIdentifiersFromPSBT, selectAvailableInputsFromPSBT],
  (allRequiredInputIds: Set<string>, availableInputs: Input[]) => {
    const availableInputIds = new Set(
      availableInputs.map((input) =>
        createInputIdentifier(input.txid, input.index),
      ),
    );

    // Set difference: all required - available = missing
    return new Set(
      [...allRequiredInputIds].filter((id) => !availableInputIds.has(id)),
    );
  },
);

/**
 * Selector to extract signatures from PSBT
 */
export const selectSignaturesFromPSBT = createSelector(
  [selectAvailableInputsFromPSBT, (state: any, psbt: Psbt) => psbt],
  (inputs, psbt) => extractSignaturesFromPSBT(psbt, inputs),
);

/**
 * Selector to get signatures formatted for importers
 */
export const selectSignaturesForImporters = createSelector(
  [selectSignaturesFromPSBT],
  (signatureSets) => mapSignaturesToImporters(signatureSets),
);
