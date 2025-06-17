import { reverseBuffer } from "bitcoinjs-lib/src/bufferutils";
import { Psbt } from "bitcoinjs-lib-v6";
import { createSelector } from "reselect";
import { getSpendableSlices } from "./wallet";
import { UTXO, Input, Slice } from "utils/psbtUtils";

/**
 * Processes inputs from PSBT and matches them with wallet UTXOs.
 */
export const selectInputsFromPSBT = createSelector(
  [getSpendableSlices, (state: any, psbt: Psbt) => psbt],
  (slices: any, psbt: Psbt) => {
    const createInputIdentifier = (txid: string, index: number) =>
      `${txid}:${index}`;

    const inputIdentifiers = new Set(
      psbt.txInputs.map((input) => {
        const txid = reverseBuffer(input.hash).toString("hex");
        return createInputIdentifier(txid, input.index);
      }),
    );

    const inputs: Input[] = [];
    slices.forEach((slice: Slice & { utxos: UTXO }) => {
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

    return inputs;
  },
);
