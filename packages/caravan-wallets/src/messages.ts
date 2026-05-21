/**
 * Per-cosigner message-signing primitives shared by all keystores.
 *
 * Stage 4a foundation; will move to `@caravan/messages` in Stage 4b.
 *
 * - `Entry`: canonical record produced by each keystore's
 *   `SignMessage.run()`.
 * - `verifyMessageSignature`: pubkey-aware verifier that wraps
 *   bip322-js in loose mode. Loose mode is required because the
 *   BIP-322 spec prohibits BIP-137 signatures over P2WPKH addresses,
 *   and caravan's cosigner paths in P2WSH multisig wallets canonicalize
 *   to P2WPKH — strict mode would reject every Ledger / Trezor / Jade
 *   signature against such a path.
 * - `validateMessage`: encoding gate (UTF-8, no NUL, <=240 bytes).
 *   Surrounding whitespace is a UI concern (Stage 4b's Sign Message
 *   tab), not a library one.
 * - `MessageSigningError`: closed-set error taxonomy used by every
 *   per-keystore interaction class.
 *
 * Protocol selection (BIP-137 vs BIP-322) is NOT modeled as a runtime
 * flag on these primitives. Each per-keystore `SignMessage` interaction
 * class implements exactly one protocol; future BIP-322 support will
 * land as additional per-keystore classes (e.g.
 * `ColdcardSignMessageBIP322`) rather than as a switch on the existing
 * classes.
 */
import { Verifier, Address } from "bip322-js";

export type Entry = {
  bip32Path: string;
  signature: string;
  expectedPubkey: string;
};

export type MessageSigningErrorKind =
  | "DeviceRejected"
  | "TransportError"
  | "MalformedResponse"
  | "MalformedRequest";

export class MessageSigningError extends Error {
  readonly kind: MessageSigningErrorKind;

  readonly keystore: string;

  readonly userMessage: string;

  constructor(args: {
    kind: MessageSigningErrorKind;
    keystore: string;
    userMessage: string;
    cause?: unknown;
  }) {
    // Structured `.message` for logs ("[Kind/KEYSTORE] user-facing
    // text"); plain `.userMessage` for UI surfaces so the UI doesn't
    // have to strip the prefix.
    super(`[${args.kind}/${args.keystore}] ${args.userMessage}`, {
      cause: args.cause,
    });
    this.name = "MessageSigningError";
    this.kind = args.kind;
    this.keystore = args.keystore;
    this.userMessage = args.userMessage;
  }
}

// Coldcard's signed-message SD-card file is the tightest envelope:
// the Coldcard firmware caps message-text input around 500 bytes once
// the BIP-32 path and address-format suffix are folded in. 240 leaves
// margin and matches what other multisig coordinators allow.
export const MAX_MESSAGE_BYTES = 240;

const NUL_BYTE = String.fromCharCode(0);
const HEX_RE = /^[0-9a-fA-F]+$/;
const COMPRESSED_PUBKEY_BYTES = 33;

export function validateMessage(message: string, keystore: string): void {
  if (typeof message !== "string") {
    throw new MessageSigningError({
      kind: "MalformedRequest",
      keystore,
      userMessage: "Message must be a string.",
    });
  }
  if (message.includes(NUL_BYTE)) {
    throw new MessageSigningError({
      kind: "MalformedRequest",
      keystore,
      userMessage: "Message must not contain NUL bytes.",
    });
  }
  const byteLength = Buffer.byteLength(message, "utf8");
  if (byteLength > MAX_MESSAGE_BYTES) {
    throw new MessageSigningError({
      kind: "MalformedRequest",
      keystore,
      userMessage: `Message must be <=${MAX_MESSAGE_BYTES} bytes (UTF-8). Got ${byteLength}.`,
    });
  }
}

export function verifyMessageSignature(args: {
  message: string;
  signature: string;
  expectedPubkey: string;
}): boolean {
  const { message, signature, expectedPubkey } = args;
  if (!HEX_RE.test(expectedPubkey)) {
    return false;
  }
  const pubkeyBuf = Buffer.from(expectedPubkey, "hex");
  if (pubkeyBuf.length !== COMPRESSED_PUBKEY_BYTES) {
    return false;
  }
  let address: string;
  try {
    address = Address.convertPubKeyIntoAddress(pubkeyBuf, "p2wpkh").mainnet;
  } catch {
    return false;
  }
  try {
    return Verifier.verifySignature(address, message, signature, false);
  } catch {
    return false;
  }
}
