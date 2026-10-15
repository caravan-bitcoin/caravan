import { analyzeMultisigTransactionSignatures } from "../multisigSignatureAnalyzer";

const P2SH_TRANSACTION =
  "0100000001d73e679ff387f1a0628c2ad9d3a966cef05b0931d9f0ea8ba7df3712486c6d9101000000fc004730440220564e4623beaed42fb0302a2ee2e78e1e7cbee5ed256285b831450b70e8dbc2fa022018a29525a2deccbf397a4952d64a9b317bbd926d44418ec3f6cff4b2001b474c014730440220707beb7625cb4b9925bbae2668d34d44de78879728e14bc40d0c84ea7947c9860220230dcbde54882b481e287d852d2545bb0d955af13984d06ff62ba4bd1de6cd59014c69522103684f6787d61cc6af5ea660129f97e312ce0e5276abaf569e842f167c4630126021030c58cc16013c7fdf510ab2b68be808e0de2b25d0f36bb17c60bafd11bb052d9e21020cc7153dd76284f35f8caa86a7d1cae228b10f1bb94dcdbc34ce579b2ea08e1053aeffffffff02a086010000000000160014e09bf5948b620e2f0c239bcf0b8d7cc4e72e5057963f0f000000000016001449cd70ee02b303694f3f07b5c0d6f34cce0c84f500000000";

const P2SH_P2WSH_TRANSACTION =
  "0100000000010107091656218918c30f79148797c87aa5c2dd49335c46614c6c94ce24c30c4ba400000000232200207850fda5543a1a1d0ce8fe3e7dcd8f27935f3582530c5c3a8fc288b185687c44ffffffff01de8501000000000017a914eddeacef07dcb1b1162a2ba777f8fbda176614ed8704004830450221009c3ffa779e7b9d7e3c16797f6a115a041e1df6026e963b20bb71990d351e5e840220020361210576fba1b77846693ccf4fc81839bbf677cc24f41dc32127bad1a4be0147304402206066043094575afffae92f17cb19503bc2bb9b80cd040462b4237f8fc14b39d1022008a9c89d39032d1732b80320194595c7f0411750b426b7c16e8d99b957c3abde0147522102a8513d9931896d5d3afc8063148db75d8851fd1fc41b1098ba2a6a766db563d42103938dd09bf3dd29ddf41f264858accfa40b330c98e0ed27caf77734fac00139ba52ae00000000";

const P2WSH_TRANSACTION =
  "01000000000101a4e3c1c3692cdf7673d8bf0e42b6bd323e7e2f02512a803e5b097fa0ae8e554b0000000000ffffffff0109860100000000002200201e78ff93203125e473770a2113feace9cbd1856704ed02a6df73cc5382d26cb50400473044022055a8e9b906ec3d838d508f654cbcd6619564c36613bdffc73cc35b9254d082ea022026004844cc43ddd24fdbe201a1f0abd6202aac4249ef5965d5dc8cfed39e604301483045022100f6fed44d15fabe1b90be230489b350043065a665ab51c4fb700e966a7d76c63c02204bc315b359014201e4f5bc285aae000414755bcae48f17d9df490a433575d6e30147522102a8513d9931896d5d3afc8063148db75d8851fd1fc41b1098ba2a6a766db563d42103938dd09bf3dd29ddf41f264858accfa40b330c98e0ed27caf77734fac00139ba52ae00000000";

const SEGWIT_PUBLIC_KEYS = [
  "02a8513d9931896d5d3afc8063148db75d8851fd1fc41b1098ba2a6a766db563d4",
  "03938dd09bf3dd29ddf41f264858accfa40b330c98e0ed27caf77734fac00139ba",
];

describe("multisig signature analyzer", () => {
  it("matches legacy P2SH signatures without a previous-output amount", () => {
    const [analysis] = analyzeMultisigTransactionSignatures(P2SH_TRANSACTION);

    expect(analysis.addressType).toBe("P2SH");
    expect(analysis.requiredSigners).toBe(2);
    expect(analysis.totalSigners).toBe(3);
    expect(analysis.matches).toHaveLength(2);
    expect(analysis.unmatchedSignatures).toEqual([]);
    expect(analysis.matches.map(({ publicKey }) => publicKey)).toEqual([
      "03684f6787d61cc6af5ea660129f97e312ce0e5276abaf569e842f167c46301260",
      "020cc7153dd76284f35f8caa86a7d1cae228b10f1bb94dcdbc34ce579b2ea08e10",
    ]);
  });

  it("matches nested SegWit multisig signatures", () => {
    const [analysis] = analyzeMultisigTransactionSignatures(
      P2SH_P2WSH_TRANSACTION,
      [100000],
    );

    expect(analysis.addressType).toBe("P2SH-P2WSH");
    expect(analysis.matches.map(({ publicKey }) => publicKey)).toEqual(
      SEGWIT_PUBLIC_KEYS,
    );
    expect(analysis.unmatchedSignatures).toEqual([]);
  });

  it("matches native SegWit multisig signatures", () => {
    const [analysis] = analyzeMultisigTransactionSignatures(P2WSH_TRANSACTION, [
      100000,
    ]);

    expect(analysis.addressType).toBe("P2WSH");
    expect(analysis.matches.map(({ publicKey }) => publicKey)).toEqual(
      SEGWIT_PUBLIC_KEYS,
    );
    expect(analysis.unmatchedSignatures).toEqual([]);
  });

  it("requires previous-output amounts for SegWit inputs", () => {
    expect(() =>
      analyzeMultisigTransactionSignatures(P2WSH_TRANSACTION),
    ).toThrow(/amount is required/i);
  });
});
