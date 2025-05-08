/**
 * Provides classes for interacting via text-based copy/paste XPUBs and
 * download/sign generic PSBT files using a custom "device'
 *
 * The following API classes are implemented:
 *
 * * CustomExportExtendedPublicKey
 * * CustomSignMultisigTransaction
 */
import {
  parseSignaturesFromPSBT,
  Network,
  validateBIP32Path,
  validateRootFingerprint,
  ExtendedPublicKey,
  BitcoinNetwork,
} from "@caravan/bitcoin";
import {
  convertLegacyInput,
  convertLegacyOutput,
  getUnsignedMultisigPsbtV0,
} from "@caravan/psbt";

import {
  IndirectKeystoreInteraction,
  PENDING,
  ACTIVE,
  INFO,
  ERROR,
} from "./interaction";

export const CUSTOM = "custom";

/**
 * Base class for interactions with Custom "devices"
 */
export class CustomInteraction extends IndirectKeystoreInteraction {}

/**
 * Base class for text-based (or clipboard pasted) ExtendedPublicKey
 * This class handles parsing/validating the xpub and relevant
 * derivation properties. If no root fingerprint is provided, one will
 * be deterministically assigned.
 *
 * @example
 * const interaction = new CustomExportExtendedPublicKey({network: Network.MAINNET, bip32Path: "m/45'/0'/0'"});
 * const {xpub, rootFingerprint, bip32Path} = interaction.parse({xpub: xpub..., rootFingerprint: 0f056943});
 * console.log(xpub);
 * // "xpub..."
 * console.log(rootFingerprint);
 * // "0f056943"
 * console.log(bip32Path);
 * // "m/45'/0'/0'"
 * ** OR **
 * * const {xpub, rootFingerprint, bip32Path} = interaction.parse({xpub: xpub...});
 * console.log(xpub);
 * // "xpub..."
 * console.log(rootFingerprint);
 * // "096aed5e"
 * console.log(bip32Path);
 * // "m/45'/0'/0'"
 */
export class CustomExportExtendedPublicKey extends CustomInteraction {
  network: BitcoinNetwork;

  bip32Path: string;

  validationErrorMessages: any[];

  constructor({ network, bip32Path }) {
    super();
    if (
      [Network.MAINNET, Network.TESTNET, Network.REGTEST].find(
        (net) => net === network
      )
    ) {
      this.network = network;
    } else {
      throw new Error("Unknown network.");
    }
    this.validationErrorMessages = [];
    this.bip32Path = bip32Path;
    const bip32PathError = validateBIP32Path(bip32Path);
    if (bip32PathError.length) {
      this.validationErrorMessages.push({
        code: "custom.bip32_path.path_error",
        text: bip32PathError,
      });
    }
  }

  isSupported() {
    return this.validationErrorMessages.length === 0;
  }

  messages() {
    const messages = super.messages();

    if (this.validationErrorMessages.length) {
      this.validationErrorMessages.forEach((e) => {
        messages.push({
          state: PENDING,
          level: ERROR,
          code: e.code,
          text: e.text,
        });
      });
    }

    messages.push({
      state: PENDING,
      level: INFO,
      code: "custom.import_xpub",
      text: "Type or paste the extended public key here.",
    });
    return messages;
  }

  /**
   * Parse the provided JSON and do some basic error checking
   */
  parse(data) {
    // build ExtendedPublicKey struct (validation happens in constructor)
    let xpubClass;
    let rootFingerprint;
    try {
      xpubClass = ExtendedPublicKey.fromBase58(data.xpub);
    } catch (e) {
      throw new Error("Not a valid ExtendedPublicKey.");
    }
    try {
      if (data.rootFingerprint === "" || !data.rootFingerprint) {
        const pkLen = xpubClass.pubkey.length;
        // If no fingerprint is provided, we will assign one deterministically
        rootFingerprint = xpubClass.pubkey.substring(pkLen - 8);
      } else {
        validateRootFingerprint(data.rootFingerprint);
        rootFingerprint = data.rootFingerprint;
      }
    } catch (e: any) {
      throw new Error(
        `Root fingerprint validation error: ${e.message.toLowerCase()}.`
      );
    }
    const numSlashes = this.bip32Path.split("/").length;
    const bipDepth = this.bip32Path.startsWith("m/")
      ? numSlashes - 1
      : numSlashes;

    if (xpubClass.depth !== bipDepth) {
      throw new Error(
        `Depth of ExtendedPublicKey (${xpubClass.depth}) does not match depth of BIP32 path (${bipDepth}).`
      );
    }

    return {
      xpub: xpubClass.base58String,
      rootFingerprint,
      bip32Path: this.bip32Path,
    };
  }
}

/**
 * Returns signature request data via a PSBT for a Custom "device" to sign and
 * accepts a PSBT for parsing signatures from a Custom "device"
 *
 * @example
 * const interaction = new CustomSignMultisigTransaction({network, inputs, outputs, bip32paths, psbt});
 * console.log(interaction.request());
 * // "cHNidP8BA..."
 *
 * // Parse signatures from a signed PSBT
 * const signatures = interaction.parse(psbt);
 * console.log(signatures);
 * // {'029e866...': ['3045...01', ...]}
 *
 */
export class CustomSignMultisigTransaction extends CustomInteraction {
  network: BitcoinNetwork;

  inputs: any;

  outputs: any;

  bip32Paths: any;

  psbt: any;

  constructor({ network, inputs, outputs, bip32Paths, psbt }) {
    super();
    this.network = network;
    this.inputs = inputs;
    this.outputs = outputs;
    this.bip32Paths = bip32Paths;

    if (psbt) {
      this.psbt = psbt;
    } else {
      try {
        this.psbt = getUnsignedMultisigPsbtV0({
          network,
          inputs: inputs.map(convertLegacyInput),
          outputs: outputs.map(convertLegacyOutput),
        });
      } catch (e) {
        throw new Error(
          "Unable to build the PSBT from the provided parameters."
        );
      }
    }
  }

  messages() {
    const messages = super.messages();
    messages.push({
      state: PENDING,
      level: INFO,
      code: "custom.download_psbt",
      text: `Download and save this PSBT file.`,
    });
    messages.push({
      state: PENDING,
      level: INFO,
      code: "custom.sign_psbt",
      text: `Add your signature to the PSBT.`,
    });
    messages.push({
      state: ACTIVE,
      level: INFO,
      code: "custom.sign_psbt",
      text: `Verify the transaction details and sign.`,
    });
    messages.push({
      state: ACTIVE,
      level: INFO,
      code: "custom.upload_signed_psbt",
      text: `Upload the signed PSBT.`,
    });
    return messages;
  }

  /**
   * Request for the PSBT data that needs to be signed.
   *
   * NOTE: the application may be expecting the PSBT in some format
   * other than the direct Object.
   *
   * E.g. PSBT in Base64 is interaction().request().toBase64()
   */
  request() {
    return this.psbt;
  }

  /**
   * This calls a function in @caravan/bitcoin which parses
   * PSBT files for sigantures and then returns an object with the format
   * {
   *   pubkey1 : [sig1, sig2, ...],
   *   pubkey2 : [sig1, sig2, ...]
   * }
   * This format may change in the future or there may be additional options for return type.
   */
  parse(psbtObject) {
    const signatures = parseSignaturesFromPSBT(psbtObject);
    if (!signatures || Object.keys(signatures).length === 0) {
      throw new Error(
        "No signatures found in the PSBT. Did you upload the right one?"
      );
    }
    return signatures;
  }
}
