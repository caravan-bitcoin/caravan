/**
 * Provides classes for interacting with Hermit.
 *
 * Hermit uses the Blockchain Commons UR encoding for data IO with
 * individual UR parts represented as QR codes.
 *
 * When receiving data from Hermit, calling applications are
 * responsible for parsing UR parts from the animated sequence of QR
 * codes Hermit displays.  The `BCURDecode` class is designed to make
 * this easy.
 *
 * When sending data to Hermit, these interaction classes encode the
 * data into UR parts.  Calling applications are responsible for
 * displaying these UR parts as an animated QR code sequence.
 *
 * The following API classes are implemented:
 *
 * * HermitExportExtendedPublicKey
 * * HermitSignMultisigTransaction
 */
import { parseSignaturesFromPSBT } from "@caravan/bitcoin";

import { BCUREncoder } from "./bcur";
import {
  IndirectKeystoreInteraction,
  PENDING,
  ACTIVE,
  INFO,
  ERROR,
} from "./interaction";

export const HERMIT = "hermit";

function commandMessage(data) {
  return {
    ...{
      state: PENDING,
      level: INFO,
      code: "hermit.command",
      mode: "wallet",
    },
    ...{ text: `${data.instructions} '${data.command}'` },
    ...data,
  };
}

/**
 * Base class for interactions with Hermit.
 */
export class HermitInteraction extends IndirectKeystoreInteraction {
  messages() {
    const messages = super.messages();
    messages.push({
      state: ACTIVE,
      level: INFO,
      code: "hermit.scanning",
      text: "Scan Hermit QR code sequence now.",
    });
    return messages;
  }
}

/**
 * Reads an extended public key from data returned by Hermit's
 * `display-xpub` command.
 *
 * This interaction class works in tandem with the `BCURDecoder`
 * class.  The `BCURDecoder` parses data from Hermit, this class
 * interprets it.
 *
 * @example
 * // Hermit returns a descriptor encoded as hex through BC-UR.  Some
 * // application function needs to work with the BCURDecoder class to
 * // parse this data.
 * const descriptorHex = readQRCodeSequence();
 *
 * // The interaction parses the data from Hermit
 * const interaction = new HermitExportExtendedPublicKey();
 * const {xpub, bip32Path, rootFingerprint} = interaction.parse(descriptorHex);
 *
 * console.log(xpub);
 * // "xpub..."
 *
 * console.log(bip32Path);
 * // "m/45'/0'/0'"
 *
 * console.log(rootFingerprint);
 * // "abcdefgh"
 *
 */

// FIXME -- move all this descriptor regex and extraction stuff to @caravan/bitcoin
const DESCRIPTOR_REGEXP = new RegExp(
  "^\\[([a-fA-F0-9]{8})((?:/[0-9]+'?)+)\\]([a-km-zA-NP-Z1-9]+)$",
);

export class HermitExportExtendedPublicKey extends HermitInteraction {
  bip32Path: string;

  constructor({ bip32Path }) {
    super();
    this.bip32Path = bip32Path;
  }

  messages() {
    const messages = super.messages();
    messages.push(
      commandMessage({
        instructions:
          "Run the following Hermit command, replacing the BIP32 path if you need to:",
        command: `display-xpub ${this.bip32Path}`,
      }),
    );
    return messages;
  }

  parse(descriptorHex) {
    if (!descriptorHex) {
      throw new Error("No descriptor received from Hermit.");
    }
    const descriptor = Buffer.from(descriptorHex, "hex").toString("utf8");
    const result = descriptor.match(DESCRIPTOR_REGEXP);
    if (result && result.length == 4) {
      return {
        rootFingerprint: result[1],
        bip32Path: `m${result[2]}`,
        xpub: result[3],
      };
    } else {
      throw new Error("Invalid descriptor received from Hermit.");
    }
  }
}

/**
 * Displays a signature request for Hermit's `sign` command and reads
 * the resulting signature.
 *
 * This interaction class works in tandem with the `BCURDecoder`
 * class.  The `BCURDecoder` parses data from Hermit, this class
 * interprets it.
 *
 * @example
 * const interaction = new HermitSignMultisigTransaction({psbt});
 * const urParts = interaction.request();
 * console.log(urParts);
 * // [ "ur:...", "ur:...", ... ]
 *
 * // Some application function which knows how to display an animated
 * // QR code sequence.
 * displayQRCodeSequence(urParts);
 *
 * // Hermit returns a PSBT encoded as hex through BC-UR.  Some
 * // application function needs to work with the BCURDecoder class to
 * // parse this data.
 * const signedPSBTHex = readQRCodeSequence();
 *
 * // The interaction parses the data from Hermit.
 * const signedPSBTBase64 = interaction.parse(signedPSBTHex);
 * console.log(signedPSBTBase64);
 * // "cHNidP8B..."
 *
 */
export class HermitSignMultisigTransaction extends HermitInteraction {
  psbt: string;

  returnSignatureArray: boolean;

  constructor({ psbt, returnSignatureArray = false }) {
    super();
    this.psbt = psbt;
    this.workflow.unshift("request");
    this.returnSignatureArray = returnSignatureArray;
  }

  messages() {
    const messages = super.messages();

    messages.push(
      commandMessage({
        instructions:
          "Run the following Hermit command to scan this signature request:",
        command: "sign",
      }),
    );

    if (!this.psbt) {
      messages.push({
        state: PENDING,
        level: ERROR,
        code: "hermit.sign",
        text: "PSBT is required.",
      });
    }

    // FIXME validate PSBT!

    return messages;
  }

  request() {
    const unsignedPSBTHex = Buffer.from(this.psbt, "base64").toString("hex");
    const encoder = new BCUREncoder(unsignedPSBTHex);
    return encoder.parts();
  }

  parse(signedPSBTHex) {
    try {
      if (!signedPSBTHex) {
        throw new Error();
      }
      if (this.returnSignatureArray) {
        const signatures = parseSignaturesFromPSBT(signedPSBTHex);
        if (!signatures) {
          throw new Error();
        }
        return Object.values(signatures)[0];
      } else {
        return Buffer.from(signedPSBTHex, "hex").toString("base64");
      }
    } catch (err) {
      throw new Error("No signature received from Hermit.");
    }
  }
}
