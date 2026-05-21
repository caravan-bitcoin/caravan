export type SignMessageResult = {
  bip32Path: string;
  signature: string;
  pubkey: string;
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
    super(`[${args.kind}/${args.keystore}] ${args.userMessage}`, {
      cause: args.cause,
    });
    this.name = "MessageSigningError";
    this.kind = args.kind;
    this.keystore = args.keystore;
    this.userMessage = args.userMessage;
  }
}
