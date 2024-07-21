// import {
//   privscyScoreByTxTopology,
//   addressReuseFactor,
//   addressTypeFactor,
//   utxoSpreadFactor,
//   utxoSetLengthWeight,
//   utxoValueWeightageFactor,
//   privacyScore,
//   WalletUTXOs,
// } from "./privacy"; // Adjust the import according to the actual file name
// import { BlockchainClient } from "@caravan/clients";
// import type { UTXO, Transaction } from "@caravan/clients/src/client";

// describe("Privacy Score Functions", () => {
//   let mockClient: BlockchainClient;

//   beforeEach(() => {
//     mockClient = {
//       getAddressStatus: jest.fn(),
//       getAddressTransactions: jest.fn(),
//     } as unknown as BlockchainClient;
//   });

//   describe("privscyScoreByTxTopology", () => {
//     it("should calculate the privacy score based on transaction topology (i.e number of inputs and outputs)", () => {
//       const transaction: Transaction = {
//         vin: [
//           {
//             txid: "input1",
//             vout: 0,
//             witness: [],
//             sequence: 0,
//           },
//           {
//             txid: "input2",
//             vout: 0,
//             witness: [],
//             sequence: 0,
//           },
//         ], // 2 inputs
//         vout: [
//           { scriptPubkeyHex: "", scriptPubkeyAddress: "", value: 0 },
//           { scriptPubkeyHex: "", scriptPubkeyAddress: "", value: 0 },
//           { scriptPubkeyHex: "", scriptPubkeyAddress: "", value: 0 },
//         ], // 3 Outputs
//         txid: "",
//         size: 0,
//         weight: 0,
//         fee: 0,
//       };

//       jest
//         .spyOn(mockClient, "getAddressStatus")
//         .mockResolvedValue(Promise.resolve(undefined));

//       const score: number = +privscyScoreByTxTopology(
//         transaction,
//         mockClient,
//       ).toFixed(3);
//       expect(score).toBe(0.92); // Example expected score based on the given inputs/outputs
//     });
//   });

//   describe("addressReuseFactor", () => {
//     it("should calculate the address reuse factor", async () => {
//       const utxos: Array<WalletUTXOs> = [
//         {
//           address: "address1",
//           utxos: [{ value: 10 } as UTXO, { value: 5 } as UTXO],
//         },
//         {
//           address: "address2",
//           utxos: [{ value: 8 } as UTXO],
//         },
//       ];

//       // Mocking the client behavior for reused addresses
//       jest
//         .spyOn(mockClient, "getAddressTransactions")
//         .mockImplementation((address: string) => {
//           if (address === "address1") {
//             return Promise.resolve([
//               { txid: "tx1" } as Transaction,
//               { txid: "tx2" } as Transaction,
//             ]); // Reused address
//           } else {
//             return Promise.resolve([{ txid: "tx3" } as Transaction]); // Not reused address
//           }
//         });

//       const factor = await addressReuseFactor(utxos, mockClient);
//       expect(factor).toBeCloseTo(0.652); // Example expected factor
//     });
//   });

//   describe("addressTypeFactor", () => {
//     it("should calculate the address type factor", () => {
//       const transactions: Transaction[] = [
//         {
//           vin: [
//             {
//               txid: "input1",
//               vout: 0,
//               witness: [],
//               sequence: 0,
//             },
//             {
//               txid: "input2",
//               vout: 1,
//               witness: [],
//               sequence: 0,
//             },
//           ], // 2 inputs
//           vout: [
//             { scriptPubkeyHex: "", scriptPubkeyAddress: "123", value: 0 },
//             { scriptPubkeyHex: "", scriptPubkeyAddress: "bc123", value: 0 },
//             { scriptPubkeyHex: "", scriptPubkeyAddress: "bc1213", value: 0 },
//           ],
//           txid: "",
//           size: 0,
//           weight: 0,
//           fee: 0,
//         },
//       ];

//       const factor = addressTypeFactor(transactions, "P2WSH");
//       expect(factor).toBeCloseTo(0.333); // Example expected factor
//     });
//   });

//   describe("utxoSpreadFactor", () => {
//     it("should calculate the UTXO spread factor", () => {
//       const utxos: Array<WalletUTXOs> = [
//         {
//           address: "address1",
//           utxos: [{ value: 10 } as UTXO, { value: 5 } as UTXO],
//         },
//         {
//           address: "address2",
//           utxos: [{ value: 8 } as UTXO],
//         },
//       ];

//       const factor = utxoSpreadFactor(utxos);
//       expect(factor).toBeCloseTo(0.778); // Example expected factor
//     });
//   });

//   describe("utxoSetLengthWeight", () => {
//     it("should calculate the UTXO set length weight", () => {
//       const utxos: Array<WalletUTXOs> = [
//         {
//           address: "address1",
//           utxos: [{ value: 10 } as UTXO, { value: 5 } as UTXO],
//         },
//         {
//           address: "address2",
//           utxos: [{ value: 8 } as UTXO],
//         },
//         {
//           address: "address3",
//           utxos: [{ value: 10 } as UTXO, { value: 5 } as UTXO],
//         },
//         {
//           address: "address4",
//           utxos: [{ value: 8 } as UTXO],
//         },
//       ];

//       const weight = utxoSetLengthWeight(utxos);
//       expect(weight).toBe(0.75); // Example expected weight
//     });
//   });

//   describe("utxoValueWeightageFactor", () => {
//     it("should calculate the UTXO value weightage factor", () => {
//       const utxos: Array<WalletUTXOs> = [
//         {
//           address: "address1",
//           utxos: [{ value: 10 } as UTXO, { value: 5 } as UTXO],
//         },
//         {
//           address: "address2",
//           utxos: [{ value: 8 } as UTXO],
//         },
//       ];

//       const factor = utxoValueWeightageFactor(utxos);
//       expect(factor).toBeCloseTo(0.116); // Example expected factor
//     });
//   });

//   // describe("privacyScore", () => {
//   //   it("should calculate the overall privacy score", () => {
//   //     const transactions: Transaction[] = [
//   //       {
//   //         vin: [
//   //           {
//   //             txid: "input1",
//   //             vout: 0,
//   //             witness: [],
//   //             sequence: 0,
//   //           },
//   //           {
//   //             txid: "input2",
//   //             vout: 1,
//   //             witness: [],
//   //             sequence: 0,
//   //           },
//   //         ], // 2 inputs
//   //         vout: [
//   //           { scriptPubkeyHex: "", scriptPubkeyAddress: "", value: 0 },
//   //           { scriptPubkeyHex: "", scriptPubkeyAddress: "", value: 0 },
//   //           { scriptPubkeyHex: "", scriptPubkeyAddress: "", value: 0 },
//   //         ],
//   //         txid: "",
//   //         size: 0,
//   //         weight: 0,
//   //         fee: 0,
//   //       },
//   //     ];
//   //     const utxos: Array<WalletUTXOs> = [
//   //       {
//   //         address: "address1",
//   //         utxos: [{ value: 10 } as UTXO, { value: 5 } as UTXO],
//   //       },
//   //       {
//   //         address: "address2",
//   //         utxos: [{ value: 8 } as UTXO],
//   //       },
//   //     ];

//   //     const score = privacyScore(transactions, utxos, "P2WSH", mockClient);
//   //     expect(score).toBeCloseTo(0.5); // Example expected overall score
//   //   });
//   // });
// });
