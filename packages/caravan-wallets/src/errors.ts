import { MessageSigningError } from "@caravan/messages";

/**
 * Translate a raw SDK throw into a `MessageSigningError`. Existing
 * `MessageSigningError` instances pass through unchanged.
 */
export function wrapSdkError(
  keystore: string,
  err: unknown,
): MessageSigningError {
  if (err instanceof MessageSigningError) {
    return err;
  }
  const errObj = err as { message?: unknown; statusCode?: unknown };
  const rawMessage =
    typeof errObj.message === "string" ? errObj.message : String(err);
  const statusCode =
    typeof errObj.statusCode === "number" ? errObj.statusCode : null;
  const lower = rawMessage.toLowerCase();
  const looksLikeRejection =
    statusCode === 0x6985 ||
    lower.includes("cancel") ||
    lower.includes("reject") ||
    lower.includes("denied") ||
    lower.includes("declined") ||
    lower.includes("aborted by user") ||
    lower.includes("user abort");
  return new MessageSigningError({
    kind: looksLikeRejection ? "DeviceRejected" : "TransportError",
    keystore,
    userMessage: looksLikeRejection
      ? "Signing was rejected on the device."
      : rawMessage || "Communication with the device failed.",
    cause: err,
  });
}
