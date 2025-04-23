import { networkData } from "@caravan/bitcoin";
import {
  getPsbtVersionNumber,
  PsbtV2,
  autoLoadPSBT as psbtPackageAutoLoad,
} from "@caravan/psbt";

/**
 * Loads a PSBT from a string or buffer, handling both PSBTv0 and PSBTv2 formats.
 * Uses only functionality from the @caravan/psbt package.
 *
 * @param {string|Buffer} psbtText - The PSBT as a string or buffer
 * @param {string} network - The Bitcoin network (mainnet, testnet, etc.)
 * @returns {Object} The PSBT object compatible with bitcoinjs-lib
 * @throws {Error} If the PSBT cannot be parsed
 */
export function loadPsbt(psbtText, network) {
  const options = { network: networkData(network) };

  try {
    // Try to determine the PSBT version
    const version = getPsbtVersionNumber(psbtText);

    if (version >= 2) {
      // It's a PSBTv2, convert it to PSBTv0 format for compatibility
      console.log(
        `Detected PSBTv2 (version ${version}), converting to PSBTv0 format`,
      );
      try {
        const psbtv2 = new PsbtV2(psbtText, true); // Allow version 1 transactions if needed
        const psbtv0Base64 = psbtv2.toV0("base64");
        // Use the autoLoadPSBT from @caravan/psbt
        return psbtPackageAutoLoad(psbtv0Base64, options);
      } catch (e) {
        console.error("Failed to parse PSBTv2:", e);
        throw new Error(`Failed to parse PSBTv2: ${e.message}`);
      }
    } else {
      // It's a PSBTv0, use the autoLoadPSBT from @caravan/psbt
      const psbt = psbtPackageAutoLoad(psbtText, options);
      if (!psbt) {
        throw new Error("Could not parse PSBT. Invalid format.");
      }
      return psbt;
    }
  } catch (e) {
    console.error("Error loading PSBT:", e);
    throw new Error(`Error loading PSBT: ${e.message}`);
  }
}
