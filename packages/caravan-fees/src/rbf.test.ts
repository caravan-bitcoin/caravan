import { prepareRBFTransaction } from "./rbf";
import { Transaction } from "bitcoinjs-lib-v5";
import { Network, unsignedMultisigTransaction } from "@caravan/bitcoin";
import BigNumber from "bignumber.js";
import { RBFOptions, UTXO } from "./types";

jest.mock("@caravan/bitcoin");
jest.mock("./utils");

describe("RBF", () => {
  let mockTransaction: Transaction;
  let mockUTXOs: UTXO[];
  let mockOptions: RBFOptions;

  beforeEach(() => {
    mockTransaction = {
      ins: [{ sequence: 0xfffffffd }],
      outs: [{ value: 90000, address: "address1" }],
      getAddressType: jest.fn().mockReturnValue("P2SH"),
      getRequiredSigners: jest.fn().mockReturnValue(2),
      getTotalSigners: jest.fn().mockReturnValue(3),
    } as unknown as Transaction;
    mockUTXOs = [
      {
        txid: "txid1",
        vout: 0,
        value: new BigNumber(100000),
        address: "address1",
        scriptPubKey: "script1",
      },
    ];
    mockOptions = {
      transaction: mockTransaction,
      newFeeRate: { satoshisPerByte: 10 },
      utxos: mockUTXOs,
      network: Network.TESTNET,
    };

    // Mock utility functions
    jest.requireMock("./utils").isRBFSignaled.mockReturnValue(true);
    jest.requireMock("./utils").estimateVirtualSize.mockReturnValue(200);
    (unsignedMultisigTransaction as jest.Mock).mockReturnValue(
      {} as Transaction
    );
  });

  it("should prepare RBF transaction", () => {
    const result = prepareRBFTransaction(mockOptions);
    expect(result).toBeDefined();
    expect(unsignedMultisigTransaction).toHaveBeenCalled();
  });

  it("should throw error if transaction is not RBF enabled", () => {
    jest.requireMock("./utils").isRBFSignaled.mockReturnValue(false);
    expect(() => prepareRBFTransaction(mockOptions)).toThrow(
      "Original transaction is not signaling RBF"
    );
  });

  it("should handle cancelTransaction option", () => {
    mockOptions.cancelTransaction = true;
    mockOptions.destinationAddress = "cancelAddress";
    prepareRBFTransaction(mockOptions);
    expect(unsignedMultisigTransaction).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      expect.arrayContaining([
        expect.objectContaining({ address: "cancelAddress" }),
      ]),
      true
    );
  });

  it("should handle subtractFromOutput option", () => {
    mockOptions.subtractFromOutput = true;
    prepareRBFTransaction(mockOptions);
    expect(unsignedMultisigTransaction).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      expect.arrayContaining([
        expect.objectContaining({ amountSats: expect.any(BigNumber) }),
      ]),
      true
    );
  });
});
