import { secp256k1 } from "@noble/curves/secp256k1";
import { payments, script, Transaction } from "bitcoinjs-lib-v6";

export type FinalizedMultisigAddressType = "P2SH" | "P2SH-P2WSH" | "P2WSH";

export interface MultisigSignatureMatch {
  publicKey: string;
  publicKeyIndex: number;
  signature: string;
  signatureIndex: number;
  sighashType: number;
}

export interface MultisigInputSignatureAnalysis {
  inputIndex: number;
  addressType: FinalizedMultisigAddressType;
  scriptHex: string;
  requiredSigners: number;
  totalSigners: number;
  matches: MultisigSignatureMatch[];
  unmatchedSignatures: string[];
}

interface FinalizedMultisigInput {
  addressType: FinalizedMultisigAddressType;
  multisigScript: Buffer;
  signatures: Buffer[];
}

function finalizedMultisigInput(
  transaction: Transaction,
  inputIndex: number,
): FinalizedMultisigInput | null {
  const input = transaction.ins[inputIndex];
  if (!input)
    throw new Error(`Transaction has no input at index ${inputIndex}.`);

  if (input.witness.length > 0) {
    if (input.witness.length < 3) return null;
    return {
      addressType: input.script.length > 0 ? "P2SH-P2WSH" : "P2WSH",
      multisigScript: input.witness[input.witness.length - 1],
      signatures: input.witness.slice(1, -1),
    };
  }

  const chunks = script.decompile(input.script);
  if (!chunks || chunks.length < 3) return null;
  const multisigScript = chunks[chunks.length - 1];
  if (!Buffer.isBuffer(multisigScript)) return null;

  return {
    addressType: "P2SH",
    multisigScript,
    signatures: chunks.slice(1, -1).filter(Buffer.isBuffer) as Buffer[],
  };
}

function verifies(
  signature: Buffer,
  messageHash: Buffer,
  publicKey: Buffer,
): boolean {
  try {
    return secp256k1.verify(signature, messageHash, publicKey, {
      format: "compact",
      // High-S signatures are non-standard today but remain valid ECDSA. The
      // analyzer reports historical consensus-valid transactions as well.
      lowS: false,
    });
  } catch (_error) {
    return false;
  }
}

function analyzeInput(
  transaction: Transaction,
  inputIndex: number,
  amountSats?: number | string | null,
): MultisigInputSignatureAnalysis | null {
  const finalized = finalizedMultisigInput(transaction, inputIndex);
  if (!finalized) return null;

  let multisig: ReturnType<typeof payments.p2ms>;
  try {
    multisig = payments.p2ms({ output: finalized.multisigScript });
  } catch (_error) {
    return null;
  }
  if (!multisig.m || !multisig.n || !multisig.pubkeys) return null;
  const publicKeys = multisig.pubkeys;

  if (finalized.addressType !== "P2SH" && amountSats == null) {
    throw new Error(
      `The spent output amount is required for SegWit input ${inputIndex}.`,
    );
  }

  const matches: MultisigSignatureMatch[] = [];
  const unmatchedSignatures: string[] = [];

  finalized.signatures.forEach((encodedSignature, signatureIndex) => {
    let decoded: { hashType: number; signature: Buffer };
    try {
      decoded = script.signature.decode(encodedSignature);
    } catch (_error) {
      unmatchedSignatures.push(encodedSignature.toString("hex"));
      return;
    }

    const hash =
      finalized.addressType === "P2SH"
        ? transaction.hashForSignature(
            inputIndex,
            finalized.multisigScript,
            decoded.hashType,
          )
        : transaction.hashForWitnessV0(
            inputIndex,
            finalized.multisigScript,
            Number(amountSats),
            decoded.hashType,
          );

    const publicKeyIndex = publicKeys.findIndex((publicKey) =>
      verifies(decoded.signature, hash, publicKey),
    );
    if (publicKeyIndex < 0) {
      unmatchedSignatures.push(encodedSignature.toString("hex"));
      return;
    }

    matches.push({
      publicKey: publicKeys[publicKeyIndex].toString("hex"),
      publicKeyIndex,
      signature: encodedSignature.toString("hex"),
      signatureIndex,
      sighashType: decoded.hashType,
    });
  });

  return {
    inputIndex,
    addressType: finalized.addressType,
    scriptHex: finalized.multisigScript.toString("hex"),
    requiredSigners: multisig.m,
    totalSigners: multisig.n,
    matches,
    unmatchedSignatures,
  };
}

/**
 * Identify which concrete public key made each signature in every finalized
 * multisig input in a raw transaction.
 *
 * SegWit signature hashes commit to the spent output amount, so the
 * corresponding `inputAmountsSats` entry is required for P2WSH and
 * P2SH-P2WSH inputs. Legacy P2SH inputs do not need it. The public keys are
 * read from the finalized redeem/witness script; a wallet configuration can
 * then attach signer names or root fingerprints.
 */
export function analyzeMultisigTransactionSignatures(
  transactionHex: string,
  inputAmountsSats: Array<number | string | null> = [],
): MultisigInputSignatureAnalysis[] {
  const transaction = Transaction.fromHex(transactionHex);
  const analyses: MultisigInputSignatureAnalysis[] = [];

  transaction.ins.forEach((_input, inputIndex) => {
    const analysis = analyzeInput(
      transaction,
      inputIndex,
      inputAmountsSats[inputIndex],
    );
    if (analysis) analyses.push(analysis);
  });

  return analyses;
}
