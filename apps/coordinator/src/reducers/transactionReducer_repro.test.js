
import reducer, { initialState } from "./transactionReducer";
import {
    SET_INPUTS,
    SET_OUTPUT_ADDRESS,
} from "../actions/transactionActions";
import { Network } from "@caravan/bitcoin";
import BigNumber from "bignumber.js";

describe("transactionReducer Issue #58 reproduction", () => {
    const address = "2NGHod7V2TAAXC1iUdNmc6R8UUd4TVTuBmp"; 

    it("should catch duplicate address when adding output then input", () => {
        let state = initialState();
        state.network = Network.TESTNET;

        state = reducer(state, {
            type: SET_OUTPUT_ADDRESS,
            number: 1,
            value: address,
        });

        state = reducer(state, {
            type: SET_INPUTS,
            value: [
                {
                    txid: "0000000000000000000000000000000000000000000000000000000000000001",
                    index: 0,
                    amountSats: new BigNumber(1000),
                    multisig: { address: address },
                },
            ],
        });

        expect(state.outputs[0].addressError).toBe("Output address cannot equal input address.");
    });

    it("should catch duplicate address when adding input then output", () => {
        let state = initialState();
        state.network = Network.TESTNET;

        state = reducer(state, {
            type: SET_INPUTS,
            value: [
                {
                    txid: "0000000000000000000000000000000000000000000000000000000000000001",
                    index: 0,
                    amountSats: new BigNumber(1000),
                    multisig: { address: address },
                },
            ],
        });

        state = reducer(state, {
            type: SET_OUTPUT_ADDRESS,
            number: 1,
            value: address,
        });

        expect(state.outputs[0].addressError).toBe("Output address cannot equal input address.");
    });
});
