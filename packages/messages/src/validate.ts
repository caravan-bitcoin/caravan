import { MessageSigningError } from "./types";

// Coldcard's signed-message SD-card flow is the tightest envelope; its
// firmware caps message text around 500 bytes once the BIP-32 path and
// address-format suffix are folded in. 240 leaves margin.
export const MAX_MESSAGE_BYTES = 240;

const NUL_BYTE = String.fromCharCode(0);

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
