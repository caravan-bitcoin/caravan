import { describe, expect, it } from "vitest";
import { secp256k1 } from "@noble/curves/secp256k1";

import {
  generateDLEQProof,
  multiplyCompressedPoint,
  verifyDLEQProof,
} from "./dleq";
import { verifySilentPaymentDLEQProof } from "./silentpayment";
function hex(s: string): Buffer {
  return Buffer.from(s, "hex");
}

function pubkeyFromSecret(secret: Buffer): Buffer {
  return Buffer.from(
    secp256k1.ProjectivePoint.BASE.multiply(
      BigInt(`0x${secret.toString("hex")}`),
    ).toRawBytes(true),
  );
}

describe("BIP374 DLEQ", () => {
  it("generates a proof that verifies", () => {
    const secret = hex(
      "0000000000000000000000000000000000000000000000000000000000000001",
    );
    const baseSecret = hex(
      "0000000000000000000000000000000000000000000000000000000000000002",
    );
    const auxRand = Buffer.alloc(32, 0);

    const publicKey = pubkeyFromSecret(secret);
    const basePoint = pubkeyFromSecret(baseSecret);
    const result = multiplyCompressedPoint(basePoint, secret);

    const proof = generateDLEQProof({
      secret,
      basePoint,
      auxRand,
    });

    expect(proof.length).toBe(64);

    expect(
      verifyDLEQProof({
        proof,
        publicKey,
        basePoint,
        result,
      }),
    ).toBe(true);
  });

  it("fails verification with the wrong public key", () => {
    const secret = hex(
      "0000000000000000000000000000000000000000000000000000000000000001",
    );
    const wrongSecret = hex(
      "0000000000000000000000000000000000000000000000000000000000000003",
    );
    const baseSecret = hex(
      "0000000000000000000000000000000000000000000000000000000000000002",
    );

    const basePoint = pubkeyFromSecret(baseSecret);
    const result = multiplyCompressedPoint(basePoint, secret);
    const wrongPublicKey = pubkeyFromSecret(wrongSecret);

    const proof = generateDLEQProof({
      secret,
      basePoint,
      auxRand: Buffer.alloc(32, 0),
    });

    expect(
      verifyDLEQProof({
        proof,
        publicKey: wrongPublicKey,
        basePoint,
        result,
      }),
    ).toBe(false);
  });

  it("fails verification with the wrong base point", () => {
    const secret = hex(
      "0000000000000000000000000000000000000000000000000000000000000001",
    );
    const baseSecret = hex(
      "0000000000000000000000000000000000000000000000000000000000000002",
    );
    const wrongBaseSecret = hex(
      "0000000000000000000000000000000000000000000000000000000000000003",
    );

    const publicKey = pubkeyFromSecret(secret);
    const basePoint = pubkeyFromSecret(baseSecret);
    const wrongBasePoint = pubkeyFromSecret(wrongBaseSecret);
    const result = multiplyCompressedPoint(basePoint, secret);

    const proof = generateDLEQProof({
      secret,
      basePoint,
      auxRand: Buffer.alloc(32, 0),
    });

    expect(
      verifyDLEQProof({
        proof,
        publicKey,
        basePoint: wrongBasePoint,
        result,
      }),
    ).toBe(false);
  });

  it("fails verification with the wrong ECDH result", () => {
    const secret = hex(
      "0000000000000000000000000000000000000000000000000000000000000001",
    );
    const baseSecret = hex(
      "0000000000000000000000000000000000000000000000000000000000000002",
    );
    const wrongSecret = hex(
      "0000000000000000000000000000000000000000000000000000000000000003",
    );

    const publicKey = pubkeyFromSecret(secret);
    const basePoint = pubkeyFromSecret(baseSecret);
    const wrongResult = multiplyCompressedPoint(basePoint, wrongSecret);

    const proof = generateDLEQProof({
      secret,
      basePoint,
      auxRand: Buffer.alloc(32, 0),
    });

    expect(
      verifyDLEQProof({
        proof,
        publicKey,
        basePoint,
        result: wrongResult,
      }),
    ).toBe(false);
  });

  it("fails verification when proof bytes are mutated", () => {
    const secret = hex(
      "0000000000000000000000000000000000000000000000000000000000000001",
    );
    const baseSecret = hex(
      "0000000000000000000000000000000000000000000000000000000000000002",
    );

    const publicKey = pubkeyFromSecret(secret);
    const basePoint = pubkeyFromSecret(baseSecret);
    const result = multiplyCompressedPoint(basePoint, secret);

    const proof = generateDLEQProof({
      secret,
      basePoint,
      auxRand: Buffer.alloc(32, 0),
    });

    const mutated = Buffer.from(proof);
    mutated[0] ^= 1;

    expect(
      verifyDLEQProof({
        proof: mutated,
        publicKey,
        basePoint,
        result,
      }),
    ).toBe(false);
  });

  it("rejects malformed proof lengths", () => {
    const secret = hex(
      "0000000000000000000000000000000000000000000000000000000000000001",
    );
    const baseSecret = hex(
      "0000000000000000000000000000000000000000000000000000000000000002",
    );

    const publicKey = pubkeyFromSecret(secret);
    const basePoint = pubkeyFromSecret(baseSecret);
    const result = multiplyCompressedPoint(basePoint, secret);

    expect(
      verifyDLEQProof({
        proof: Buffer.alloc(63),
        publicKey,
        basePoint,
        result,
      }),
    ).toBe(false);

    expect(
      verifyDLEQProof({
        proof: Buffer.alloc(65),
        publicKey,
        basePoint,
        result,
      }),
    ).toBe(false);
  });
});
