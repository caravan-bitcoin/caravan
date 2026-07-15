import { address } from "bitcoinjs-lib-v5";

import { TEST_FIXTURES } from "./fixtures";
import { generateMultisigFromHex } from "./multisig";
import { networkData, Network } from "./networks";
import { P2SH } from "./p2sh";
import { P2SH_P2WSH } from "./p2sh_p2wsh";
import { P2WSH } from "./p2wsh";
import {
  unsignedMultisigTransaction,
  signedMultisigTransaction,
  unsignedMultisigPSBT,
  unsignedTransactionObjectFromPSBT,
} from "./transactions";
import { toHexString } from "./utils";


// FIXME: transactionbuilder is deprecating, but we know this. remove this after addressing.
console.warn = vi.fn();

describe("transactions", () => {
  describe("unsignedMultisigTransaction", () => {
    describe("validating arguments", () => {
      const fixture = TEST_FIXTURES.transactions[0];

      it("throws an error when there are no inputs", () => {
        expect(() => {
          unsignedMultisigTransaction(fixture.network, [], fixture.outputs);
        }).toThrow(/at least one input/i);
      });

      it("throws an error when there an input is invalid", () => {
        expect(() => {
          unsignedMultisigTransaction(fixture.network, [{}], fixture.outputs);
        }).toThrow(/does not have.*txid/i);
      });

      it("throws an error when there are no outputs", () => {
        expect(() => {
          unsignedMultisigTransaction(fixture.network, fixture.inputs, []);
        }).toThrow(/at least one output/i);
      });

      it("throws an error when there an output is invalid", () => {
        expect(() => {
          unsignedMultisigTransaction(fixture.network, fixture.inputs, [{}]);
        }).toThrow(/does not have.*amount/i);
      });
    });

    TEST_FIXTURES.transactions.forEach((fixture) => {
      it(`can construct an unsigned multisig transaction which ${fixture.description}`, () => {
        const transaction = unsignedMultisigTransaction(
          fixture.network,
          fixture.inputs,
          fixture.outputs,
        );
        if (fixture.psbt) {
          const transactionFromPSBT = unsignedTransactionObjectFromPSBT(
            unsignedMultisigPSBT(
              fixture.network,
              fixture.inputs,
              fixture.outputs,
            ),
          );
          expect(transaction).toEqual(transactionFromPSBT);
        }
        expect(transaction.ins.length).toEqual(fixture.inputs.length);
        expect(transaction.outs.length).toEqual(fixture.outputs.length);
        fixture.inputs.forEach((input, inputIndex) => {
          expect(transaction.ins[inputIndex].index).toEqual(input.index);
          // TXIDs are displayed in reversed order
          const reversedTXIDBuffer = transaction.ins[inputIndex].hash;
          // Don't want to modify buffer in place so use Buffer.from
          expect(
            toHexString(Buffer.from(reversedTXIDBuffer).reverse()),
          ).toEqual(input.txid);
        });
        fixture.outputs.forEach((output, outputIndex) => {
          expect(transaction.outs[outputIndex].value).toEqual(
            Number(output.amountSats),
          );
          expect(
            address.fromOutputScript(
              transaction.outs[outputIndex].script,
              networkData(fixture.network),
            ),
          ).toEqual(output.address);
        });
        expect(transaction.toHex()).toEqual(fixture.hex);
      });
    });
  });

  describe("unsignedMultisigPSBT", () => {
    describe("validating arguments", () => {
      const fixture = TEST_FIXTURES.transactions[0];

      it("throws an error when there are no inputs", () => {
        expect(() => {
          unsignedMultisigPSBT(fixture.network, [], fixture.outputs);
        }).toThrow(/at least one input/i);
      });

      it("throws an error when there an input is invalid", () => {
        expect(() => {
          unsignedMultisigPSBT(fixture.network, [{}], fixture.outputs);
        }).toThrow(/does not have.*txid/i);
      });

      it("throws an error when there are no outputs", () => {
        expect(() => {
          unsignedMultisigPSBT(fixture.network, fixture.inputs, []);
        }).toThrow(/at least one output/i);
      });

      it("throws an error when there an output is invalid", () => {
        expect(() => {
          unsignedMultisigPSBT(fixture.network, fixture.inputs, [{}]);
        }).toThrow(/does not have.*amount/i);
      });
    });

    TEST_FIXTURES.transactions.forEach((fixture) => {
      it(`can construct an unsigned multisig PSBT which ${fixture.description}`, () => {
        if (fixture.psbt) {
          const psbt = unsignedMultisigPSBT(
            fixture.network,
            fixture.inputs,
            fixture.outputs,
          );
          expect(fixture.psbt).toEqual(psbt.data.toBase64());
        }
      });
    });

    TEST_FIXTURES.transactions.forEach((fixture) => {
      it(`can construct an unsigned multisig PSBT with global xpubs which ${fixture.description}`, () => {
        if (fixture.psbt) {
          const psbt = unsignedMultisigPSBT(
            fixture.network,
            fixture.inputs,
            fixture.outputs,
            true,
          );

          expect(fixture.psbt).not.toEqual(psbt.data.toBase64());
          expect(fixture.psbtWithGlobalXpub).toEqual(psbt.data.toBase64());
        }
      });
    });
  });

  describe("signedMultisigTransaction", () => {
    const fixture = TEST_FIXTURES.transactions[0];

    it("throws an error when there are no inputs", () => {
      expect(() => {
        signedMultisigTransaction(fixture.network, [], fixture.outputs);
      }).toThrow(/at least one input/i);
    });

    it("throws an error when there an input is invalid", () => {
      expect(() => {
        signedMultisigTransaction(fixture.network, [{}], fixture.outputs);
      }).toThrow(/does not have.*txid/i);
    });

    it("throws an error when there are no outputs", () => {
      expect(() => {
        signedMultisigTransaction(fixture.network, fixture.inputs, []);
      }).toThrow(/at least one output/i);
    });

    it("throws an error when there an output is invalid", () => {
      expect(() => {
        signedMultisigTransaction(fixture.network, fixture.inputs, [{}]);
      }).toThrow(/does not have.*amount/i);
    });

    it("throws an error when there are no transaction signatures", () => {
      expect(() => {
        signedMultisigTransaction(
          fixture.network,
          fixture.inputs,
          fixture.outputs,
        );
      }).toThrow(/at least one transaction signature/i);
      expect(() => {
        signedMultisigTransaction(
          fixture.network,
          fixture.inputs,
          fixture.outputs,
          [],
        );
      }).toThrow(/at least one transaction signature/i);
    });

    it("throws an error when there a transaction signature doesn't contain enough input signatures", () => {
      expect(() => {
        signedMultisigTransaction(
          fixture.network,
          fixture.inputs,
          fixture.outputs,
          [[]],
        );
      }).toThrow(/insufficient input signatures/i);
      expect(() => {
        signedMultisigTransaction(
          fixture.network,
          fixture.inputs,
          fixture.outputs,
          [fixture.signature, []],
        );
      }).toThrow(/insufficient input signatures/i);
    });

    it("throws an error when too few input signatures are given", () => {
      expect(() => {
        signedMultisigTransaction(
          fixture.network,
          fixture.inputs,
          fixture.outputs,
          [fixture.signature],
        );
      }).toThrow(/insufficient signatures for input/i);
    });

    it("throws an error when an invalid input signature is given", () => {
      expect(() => {
        signedMultisigTransaction(
          fixture.network,
          fixture.inputs,
          fixture.outputs,
          [fixture.signature, ["foo", "bar", "baz"]],
        );
      }).toThrow(/invalid signature for input/i);
    });

    it("throws an error when a duplicate input signature is given", () => {
      expect(() => {
        signedMultisigTransaction(
          fixture.network,
          fixture.inputs,
          fixture.outputs,
          [fixture.signature, fixture.signature],
        );
      }).toThrow(/duplicate signature for input/i);
    });

    it("can construct a valid signed P2SH transaction", () => {
      const redeemScriptHex =
        "522103684f6787d61cc6af5ea660129f97e312ce0e5276abaf569e842f167c4630126021030c58cc16013c7fdf510ab2b68be808e0de2b25d0f36bb17c60bafd11bb052d9e21020cc7153dd76284f35f8caa86a7d1cae228b10f1bb94dcdbc34ce579b2ea08e1053ae";
      const multisig = generateMultisigFromHex(
        Network.TESTNET,
        P2SH,
        redeemScriptHex,
      );

      // This transaction has already been broadcast as
      // 57a87bfa6283f0d0f50da5205c5392a7a0ba27a888164920983e7bdd9f716ca6,
      // but no matter.
      const inputs = [
        {
          txid: "916d6c481237dfa78beaf0d931095bf0ce66a9d3d92a8c62a0f187f39f673ed7",
          index: 1,
          multisig,
        },
      ];
      const outputs = [
        {
          address: "tb1quzdlt9ytvg8z7rprn08shrtucnnju5zhf7jlsf",
          amountSats: 100000,
        },
        {
          address: "tb1qf8xhpmszkvpkjnelq76up4hnfn8qep8406safy",
          amountSats: 999318,
        },
      ];

      const transactionSignature1 = [
        "30440220564e4623beaed42fb0302a2ee2e78e1e7cbee5ed256285b831450b70e8dbc2fa022018a29525a2deccbf397a4952d64a9b317bbd926d44418ec3f6cff4b2001b474c",
      ];
      const transactionSignature2 = [
        "30440220707beb7625cb4b9925bbae2668d34d44de78879728e14bc40d0c84ea7947c9860220230dcbde54882b481e287d852d2545bb0d955af13984d06ff62ba4bd1de6cd59",
      ];
      const signedTransactionHex =
        "0100000001d73e679ff387f1a0628c2ad9d3a966cef05b0931d9f0ea8ba7df3712486c6d9101000000fc004730440220564e4623beaed42fb0302a2ee2e78e1e7cbee5ed256285b831450b70e8dbc2fa022018a29525a2deccbf397a4952d64a9b317bbd926d44418ec3f6cff4b2001b474c014730440220707beb7625cb4b9925bbae2668d34d44de78879728e14bc40d0c84ea7947c9860220230dcbde54882b481e287d852d2545bb0d955af13984d06ff62ba4bd1de6cd59014c69522103684f6787d61cc6af5ea660129f97e312ce0e5276abaf569e842f167c4630126021030c58cc16013c7fdf510ab2b68be808e0de2b25d0f36bb17c60bafd11bb052d9e21020cc7153dd76284f35f8caa86a7d1cae228b10f1bb94dcdbc34ce579b2ea08e1053aeffffffff02a086010000000000160014e09bf5948b620e2f0c239bcf0b8d7cc4e72e5057963f0f000000000016001449cd70ee02b303694f3f07b5c0d6f34cce0c84f500000000";

      const signedTransaction = signedMultisigTransaction(
        Network.TESTNET,
        inputs,
        outputs,
        [transactionSignature1, transactionSignature2],
      );

      expect(signedTransaction.toHex()).toEqual(signedTransactionHex);
    });

    it("can construct a valid signed P2SH_P2WSH transaction", () => {
      const witnessScriptHex =
        "522102a8513d9931896d5d3afc8063148db75d8851fd1fc41b1098ba2a6a766db563d42103938dd09bf3dd29ddf41f264858accfa40b330c98e0ed27caf77734fac00139ba52ae";
      const multisig = generateMultisigFromHex(
        Network.TESTNET,
        P2SH_P2WSH,
        witnessScriptHex,
      );

      // This transaction has already been broadcast as
      // 5534800520ae753688c20bfcd6b2c859c57bf681745a934e8e863c49af872411,
      // but no matter.
      const inputs = [
        {
          txid: "a44b0cc324ce946c4c61465c3349ddc2a57ac8978714790fc318892156160907",
          index: 0,
          amountSats: 100000,
          multisig,
        },
      ];
      const outputs = [
        {
          address: "2NEvxtWnKxqcKDYnx8bYXhabQE33P5xAT5S",
          amountSats: 99806,
        },
      ];

      const transactionSignature1 = [
        "30450221009c3ffa779e7b9d7e3c16797f6a115a041e1df6026e963b20bb71990d351e5e840220020361210576fba1b77846693ccf4fc81839bbf677cc24f41dc32127bad1a4be01",
      ];
      const transactionSignature2 = [
        "304402206066043094575afffae92f17cb19503bc2bb9b80cd040462b4237f8fc14b39d1022008a9c89d39032d1732b80320194595c7f0411750b426b7c16e8d99b957c3abde01",
      ];
      const signedTransactionHex =
        "0100000000010107091656218918c30f79148797c87aa5c2dd49335c46614c6c94ce24c30c4ba400000000232200207850fda5543a1a1d0ce8fe3e7dcd8f27935f3582530c5c3a8fc288b185687c44ffffffff01de8501000000000017a914eddeacef07dcb1b1162a2ba777f8fbda176614ed8704004830450221009c3ffa779e7b9d7e3c16797f6a115a041e1df6026e963b20bb71990d351e5e840220020361210576fba1b77846693ccf4fc81839bbf677cc24f41dc32127bad1a4be0147304402206066043094575afffae92f17cb19503bc2bb9b80cd040462b4237f8fc14b39d1022008a9c89d39032d1732b80320194595c7f0411750b426b7c16e8d99b957c3abde0147522102a8513d9931896d5d3afc8063148db75d8851fd1fc41b1098ba2a6a766db563d42103938dd09bf3dd29ddf41f264858accfa40b330c98e0ed27caf77734fac00139ba52ae00000000";

      const signedTransaction = signedMultisigTransaction(
        Network.TESTNET,
        inputs,
        outputs,
        [transactionSignature1, transactionSignature2],
      );

      expect(signedTransaction.toHex()).toEqual(signedTransactionHex);
    });

    it("can construct a valid signed P2WSH transaction", () => {
      const witnessScriptHex =
        "522102a8513d9931896d5d3afc8063148db75d8851fd1fc41b1098ba2a6a766db563d42103938dd09bf3dd29ddf41f264858accfa40b330c98e0ed27caf77734fac00139ba52ae";
      const multisig = generateMultisigFromHex(
        Network.TESTNET,
        P2WSH,
        witnessScriptHex,
      );

      // This transaction has already been broadcast as
      // f6dc10f035ac242d3b8446c090920e17196eb9d5843a71fd0e3c1987db94f04a,
      // but no matter.
      const inputs = [
        {
          txid: "4b558eaea07f095b3e802a51022f7e3e32bdb6420ebfd87376df2c69c3c1e3a4",
          index: 0,
          amountSats: 100000,
          multisig,
        },
      ];
      const outputs = [
        {
          address:
            "tb1qreu0lyeqxyj7gumhpgs38l4va89arpt8qnks9fklw0x98qkjdj6sgg3anx",
          amountSats: 99849,
        },
      ];

      const transactionSignature1 = [
        "3044022055a8e9b906ec3d838d508f654cbcd6619564c36613bdffc73cc35b9254d082ea022026004844cc43ddd24fdbe201a1f0abd6202aac4249ef5965d5dc8cfed39e604301",
      ];
      const transactionSignature2 = [
        "3045022100f6fed44d15fabe1b90be230489b350043065a665ab51c4fb700e966a7d76c63c02204bc315b359014201e4f5bc285aae000414755bcae48f17d9df490a433575d6e301",
      ];
      const signedTransactionHex =
        "01000000000101a4e3c1c3692cdf7673d8bf0e42b6bd323e7e2f02512a803e5b097fa0ae8e554b0000000000ffffffff0109860100000000002200201e78ff93203125e473770a2113feace9cbd1856704ed02a6df73cc5382d26cb50400473044022055a8e9b906ec3d838d508f654cbcd6619564c36613bdffc73cc35b9254d082ea022026004844cc43ddd24fdbe201a1f0abd6202aac4249ef5965d5dc8cfed39e604301483045022100f6fed44d15fabe1b90be230489b350043065a665ab51c4fb700e966a7d76c63c02204bc315b359014201e4f5bc285aae000414755bcae48f17d9df490a433575d6e30147522102a8513d9931896d5d3afc8063148db75d8851fd1fc41b1098ba2a6a766db563d42103938dd09bf3dd29ddf41f264858accfa40b330c98e0ed27caf77734fac00139ba52ae00000000";

      const signedTransaction = signedMultisigTransaction(
        Network.TESTNET,
        inputs,
        outputs,
        [transactionSignature1, transactionSignature2],
      );

      expect(signedTransaction.toHex()).toEqual(signedTransactionHex);
    });
  });
});
