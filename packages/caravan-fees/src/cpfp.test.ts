import { prepareCPFPTransaction } from "./cpfp";
import { Transaction } from "bitcoinjs-lib-v5";
import { Network, unsignedMultisigTransaction } from "@caravan/bitcoin";
import BigNumber from "bignumber.js";
import { CPFPOptions, UTXO } from "./types";

jest.mock("@caravan/bitcoin");
jest.mock("./utils");

describe("CPFP", () => {
  let mockParentTransaction: Transaction;
  let mockUTXOs: UTXO[];
  let mockOptions: CPFPOptions;

  beforeEach(() => {
    mockParentTransaction = {
      getId: jest.fn().mockReturnValue("parentTxId"),
      outs: [{ value: 100000, address: "address1" }],
      virtualSize: jest.fn().mockReturnValue(200),
      getAddressType: jest.fn().mockReturnValue("P2SH"),
      getRequiredSigners: jest.fn().mockReturnValue(2),
      getTotalSigners: jest.fn().mockReturnValue(3),
    } as unknown as Transaction;
    mockUTXOs = [
      {
        txid: "parentTxId",
        vout: 0,
        value: new BigNumber(100000),
        address: "address1",
        scriptPubKey: "script1",
      },
    ];
    mockOptions = {
      parentTransaction: mockParentTransaction,
      newFeeRate: { satoshisPerByte: 10 },
      availableUTXOs: mockUTXOs,
      destinationAddress: "destinationAddress",
      network: Network.TESTNET,
    };

    // Mock utility functions
    jest.requireMock("./utils").estimateVirtualSize.mockReturnValue(200);
    (unsignedMultisigTransaction as jest.Mock).mockReturnValue(
      {} as Transaction
    );
  });

  it("should prepare CPFP transaction", () => {
    const result = prepareCPFPTransaction(mockOptions);
    expect(result).toBeDefined();
    expect(unsignedMultisigTransaction).toHaveBeenCalled();
  });

  it("should throw error if no suitable parent output found", () => {
    mockOptions.availableUTXOs = [];
    expect(() => prepareCPFPTransaction(mockOptions)).toThrow(
      "No suitable output found in parent transaction for CPFP"
    );
  });

  it("should throw error if CPFP transaction would create dust output", () => {
    mockOptions.newFeeRate = { satoshisPerByte: 1000 }; // Unrealistically high fee to force dust output
    expect(() => prepareCPFPTransaction(mockOptions)).toThrow(
      "CPFP transaction would create a dust output"
    );
  });

  it("should calculate correct fee for child transaction", () => {
    prepareCPFPTransaction(mockOptions);
    const expectedFee = new BigNumber(400).multipliedBy(10); // (200 + 200) * 10
    expect(unsignedMultisigTransaction).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      expect.arrayContaining([
        expect.objectContaining({
          amountSats: new BigNumber(100000).minus(expectedFee),
        }),
      ]),
      true
    );
  });
});
