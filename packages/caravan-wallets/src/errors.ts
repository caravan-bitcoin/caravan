import { MessageSigningError } from "@caravan/messages";

/**
 * Translate a raw SDK throw from a hardware-wallet driver into the
 * keystore-agnostic `MessageSigningError` shape. Lives in
 * `@caravan/wallets` (not in `@caravan/messages`) because the
 * heuristic is specifically about vendor SDK quirks.
 *
 * `MessageSigningError` instances pass through untouched so structured
 * errors raised by the keystore layer (MalformedResponse,
 * MalformedRequest) don't get clobbered into TransportError when they
 * bubble up through the same try/catch.
 *
 * The classifier is lenient: each SDK reports rejection differently
 * (Ledger statusCode 0x6985, Trezor "Cancelled" payload, BitBox
 * "user abort", Jade "...rejected"). Over-tagging a transport drop
 * as DeviceRejected is preferred over the reverse — the user-facing
 * string for "rejected" still reads sensibly to a user whose USB
 * cable was unplugged, but the reverse is confusing.
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
