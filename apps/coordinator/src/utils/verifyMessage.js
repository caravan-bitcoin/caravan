import { Verifier } from "bip322-js";

export const verifyMessageSignature = (address, message, signatureBase64) => {
  try {
    return Verifier.verifySignature(address, message, signatureBase64, false);
  } catch(err) {
    console.log("Signature verification failed:", err);
    return false;
  }
};
