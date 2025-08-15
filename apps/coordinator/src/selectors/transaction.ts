import { Psbt } from "bitcoinjs-lib-v6";
import { createSelector } from "reselect";
import { getSpendableSlices, WalletState } from "./wallet";
import {
  UTXO,
  Input,
  Slice,
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
    const availableInputs: Input[] = [];
    slices.forEach((slice: Slice & { utxos: UTXO }) => {
      Object.entries(slice.utxos || {}).forEach(([, utxo]) => {
        const inputIdentifier = createInputIdentifier(utxo.txid, utxo.index);
        if (inputIdentifiers.has(inputIdentifier)) {
          const input = {
            ...utxo,
            multisig: slice.multisig,
            bip32Path: slice.bip32Path,
            change: slice.change,
            sequence: getSequenceForInput(psbt, inputIdentifier),
          };
          availableInputs.push(input);
        }
      });
    });
    return availableInputs;
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
