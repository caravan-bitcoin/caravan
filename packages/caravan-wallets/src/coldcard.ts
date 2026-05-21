/**
 * Provides classes for interacting with a Coldcard via TXT/JSON/PSBT files
 *
 * The following API classes are implemented:
 *
 * * ColdcardExportPublicKey
 * * ColdcardExportExtendedPublicKey
 * * ColdcardSignMultisigTransaction
 * * ColdcardMultisigWalletConfig
 */
import { ensureXpubAtPath } from "@caravan/bip32";
import {
  fingerprintToFixedLengthHex,
  parseSignaturesFromPSBT,
  ExtendedPublicKey,
  Network,
  validateBIP32Path,
  getRelativeBIP32Path,
  getMaskedDerivation,
  MultisigAddressType,
  P2SH,
  P2SH_P2WSH,
  P2WSH,
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
import {
  Entry,
  MessageSigningError,
  validateMessage,
} from "./messages";
import { WalletConfigKeyDerivation } from "./types";

export const COLDCARD = "coldcard";
// Our constants use 'P2SH-P2WSH', their file uses 'P2SH_P2WSH' :\
export const COLDCARD_BASE_BIP32_PATHS = {
  "m/45'": P2SH,
  "m/48'/0'/0'/1'": P2SH_P2WSH.replace("-", "_"),
  "m/48'/0'/0'/2'": P2WSH,
  "m/48'/1'/0'/1'": P2SH_P2WSH.replace("-", "_"),
  "m/48'/1'/0'/2'": P2WSH,
};
const COLDCARD_BASE_CHROOTS = Object.keys(COLDCARD_BASE_BIP32_PATHS);

export const COLDCARD_WALLET_CONFIG_VERSION = "1.0.0";

/**
 * Base class for interactions with Coldcard
 */
export class ColdcardInteraction extends IndirectKeystoreInteraction {}

/**
 * Base class for JSON Multisig file-based interactions with Coldcard
 * This class handles the file that comes from the `Export XPUB` menu item.
 */
class ColdcardMultisigSettingsFileParser extends ColdcardInteraction {
  network: BitcoinNetwork;

  bip32Path: string;

  bip32ValidationErrorMessage: { text?: string; code?: string };

  bip32ValidationError: string;

  constructor({
    network,
    bip32Path,
  }: {
    network: BitcoinNetwork;
    bip32Path: string;
  }) {
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
    this.bip32Path = bip32Path;
    this.bip32ValidationErrorMessage = {};
    this.bip32ValidationError = this.validateColdcardBip32Path(bip32Path);
  }

  isSupported() {
    return !this.bip32ValidationError.length;
  }

  // TODO make these messages more robust
  //   (e.g use `menuchoices` as an array of `menuchoicemessages`)
  messages() {
    const messages = super.messages();

    if (Object.entries(this.bip32ValidationErrorMessage).length) {
      messages.push({
        state: PENDING,
        level: ERROR,
        code: this.bip32ValidationErrorMessage.code,
        text: this.bip32ValidationErrorMessage.text,
      });
    }

    messages.push({
      state: PENDING,
      level: INFO,
      code: "coldcard.export_xpub",
      text: "Go to Settings > Multisig Wallets > Export XPUB",
    });
    messages.push({
      state: PENDING,
      level: INFO,
      code: "coldcard.select_account",
      text: "Enter 0 for account",
    });
    messages.push({
      state: PENDING,
      level: INFO,
      code: "coldcard.upload_key",
      text: "Upload the JSON file from your Coldcard.",
    });
    return messages;
  }

  chrootForBIP32Path(bip32Path) {
    for (let i = 0; i < COLDCARD_BASE_CHROOTS.length; i++) {
      const chroot = COLDCARD_BASE_CHROOTS[i];
      if (bip32Path.startsWith(chroot)) {
        return chroot;
      }
    }
    return null;
  }

  /**
   * This validates three things for an incoming Coldcard bip32Path
   *
   * 1. Is the bip32path valid syntactically?
   * 2. Does the bip32path start with one of the known Coldcard chroots?
   * 3. Are there any hardened indices in the relative path below the chroot?
   */
  validateColdcardBip32Path(bip32Path: string) {
    const bip32PathError = validateBIP32Path(bip32Path);
    if (bip32PathError.length) {
      this.bip32ValidationErrorMessage = {
        text: bip32PathError,
        code: "coldcard.bip32_path.path_error",
      };
      return bip32PathError;
    }
    const coldcardChroot = this.chrootForBIP32Path(bip32Path);
    if (coldcardChroot) {
      if (coldcardChroot === bip32Path) {
        // asking for known base path, no deeper derivation
        return "";
      }
      const relativePath = getRelativeBIP32Path(coldcardChroot, bip32Path);
      const relativePathError = validateBIP32Path(relativePath, {
        mode: "unhardened",
      });
      if (relativePathError) {
        this.bip32ValidationErrorMessage = {
          text: relativePathError,
          code: "coldcard.bip32_path.no_hardened_relative_path_error",
        };
        return relativePathError;
      }
      return "";
    }
    const unknownColdcardParentBip32PathError = `The bip32Path must begin with one of the known Coldcard paths: ${COLDCARD_BASE_CHROOTS}`;
    this.bip32ValidationErrorMessage = {
      text: unknownColdcardParentBip32PathError,
      code: "coldcard.bip32_path.unknown_chroot_error",
    };
    return unknownColdcardParentBip32PathError;
  }

  /**
   * Parse the Coldcard JSON file and do some basic error checking
   * add a field for rootFingerprint (it can sometimes be calculated
   * if not explicitly included)
   *
   */
  parse(file: Record<string, unknown> | string) {
    //In the case of keys (json), the file will look like:
    //
    //{
    //   "p2sh_deriv": "m/45'",
    //   "p2sh": "tpubDA4nUAdTmY...MmtZaVFEU5MtMfj7H",
    //   "p2wsh_p2sh_deriv": "m/48'/1'/0'/1'",          // originally they had this backwards
    //   "p2wsh_p2sh": "Upub5THcs...Qh27gWiL2wDoVwaW",  // originally they had this backwards
    //   "p2sh_p2wsh_deriv": "m/48'/1'/0'/1'",          // now it's right
    //   "p2sh_p2wsh": "Upub5THcs...Qh27gWiL2wDoVwaW",  // now it's right
    //   "p2wsh_deriv": "m/48'/1'/0'/2'",
    //   "p2wsh": "Vpub5n7tBWyvv...2hTzyeSKtZ5PQ1MRN",
    //   "xfp": "12abcdef"
    // }
    //
    // For now, we will derive unhardened from `p2sh_deriv`
    // FIXME: assume we will gain the ability to ask Coldcard for an arbitrary path
    //   (or at least a p2sh hardened path deeper than m/45')

    let data;
    if (typeof file === "object") {
      data = file;
    } else if (typeof file === "string") {
      try {
        data = JSON.parse(file);
      } catch (error) {
        throw new Error("Unable to parse JSON.");
      }
    } else {
      throw new Error("Not valid JSON.");
    }

    if (Object.keys(data).length === 0) {
      throw new Error("Empty JSON file.");
    }

    // Coldcard changed the format of keys in the exported file to match
    // the convention of p2sh-p2wsh instead of what they had before
    // which was p2wsh-p2sh ... so one of these sets needs to be
    // in the file.
    if (
      !data.p2sh_deriv ||
      !data.p2sh ||
      !data.p2wsh_deriv ||
      !data.p2wsh ||
      ((!data.p2wsh_p2sh_deriv || !data.p2wsh_p2sh) &&
        (!data.p2sh_p2wsh_deriv || !data.p2sh_p2wsh))
    ) {
      throw new Error(
        "Missing required params. Was this file exported from a Coldcard?  If you are using firmware version 4.1.0 please upgrade to 4.1.1 or later."
      );
    }

    const xpubClass = ExtendedPublicKey.fromBase58(data.p2sh);
    if (!data.xfp && xpubClass.depth !== 1) {
      throw new Error("No xfp in JSON file.");
    }

    // We can only find the fingerprint in the xpub if the depth is one
    // because the xpub includes its parent's fingerprint.
    let xfpFromWithinXpub =
      xpubClass.depth === 1
        ? xpubClass.parentFingerprint &&
          fingerprintToFixedLengthHex(xpubClass.parentFingerprint)
        : null;

    // Sanity check if you send in a depth one xpub, we should get the same fingerprint
    if (
      xfpFromWithinXpub &&
      data.xfp &&
      xfpFromWithinXpub !== data.xfp.toLowerCase()
    ) {
      throw new Error(
        "Computed fingerprint does not match the one in the file."
      );
    }

    const rootFingerprint = data.xfp ? data.xfp : xfpFromWithinXpub;
    data.rootFingerprint = rootFingerprint.toLowerCase();

    return data;
  }

  /**
   * This method will take the result from the Coldcard JSON and:
   *
   * 1. determine which t/U/V/x/Y/Zpub to use
   * 2. derive deeper if necessary (and able) using functionality
   *    from @caravan/bitcoin
   *
   */
  deriveDeeperXpubIfNecessary(result: Record<string, unknown> | string) {
    const knownColdcardChroot = this.chrootForBIP32Path(this.bip32Path);
    let addressType = "";
    if (knownColdcardChroot !== null) {
      addressType = COLDCARD_BASE_BIP32_PATHS[knownColdcardChroot];
    }
    if (!knownColdcardChroot) {
      throw new Error(
        `Unable to determine Coldcard script type from ${this.bip32Path}`,
      );
    }

    // result could have p2wsh_p2sh or p2sh_p2wsh based on firmware version. Blah!
    if (addressType.includes("_") && !result[addressType.toLowerCase()]) {
      // Firmware < v3.2.0
      addressType = "p2wsh_p2sh";
    }

    // NOTE: If the addressType is segwit, the imported key will not be in the xpub/tpub formats
    // this will convert it.
    return ensureXpubAtPath(
      {
        xpub: result[addressType.toLowerCase()],
        bip32Path: knownColdcardChroot,
      },
      this.bip32Path,
      this.network,
    );
  }
}

/**
 * Reads a public key and (optionally) derives deeper from data in an
 * exported JSON file uploaded from the Coldcard.
 *
 * @example
 * const interaction = new ColdcardExportPublicKey();
 * const reader = new FileReader(); // application dependent
 * const jsonFile = reader.readAsText('ccxp-0F056943.json'); // application dependent
 * const {publicKey, rootFingerprint, bip32Path} = interaction.parse(jsonFile);
 * console.log(publicKey);
 * // "026942..."
 * console.log(rootFingerprint);
 * // "0f056943"
 * console.log(bip32Path);
 * // "m/45'/0/0"
 */
export class ColdcardExportPublicKey extends ColdcardMultisigSettingsFileParser {
  constructor({ network, bip32Path }) {
    super({
      network,
      bip32Path,
    });
  }

  messages() {
    return super.messages();
  }

  parse(xpubJSONFile) {
    const result = super.parse(xpubJSONFile);
    const xpub = this.deriveDeeperXpubIfNecessary(result);

    return {
      publicKey: ExtendedPublicKey.fromBase58(xpub).pubkey,
      rootFingerprint: result.rootFingerprint,
      bip32Path: this.bip32Path,
    };
  }
}

/**
 * Reads an extended public key and (optionally) derives deeper from data in an
 * exported JSON file uploaded from the Coldcard.
 *
 * @example
 * const interaction = new ColdcardExportExtendedPublicKey({network: Network.MAINNET, bip32Path: 'm/45'/0/0'});
 * const reader = new FileReader(); // application dependent
 * const jsonFile = reader.readAsText('ccxp-0F056943.json'); // application dependent
 * const {xpub, rootFingerprint, bip32Path} = interaction.parse(jsonFile);
 * console.log(xpub);
 * // "xpub..."
 * console.log(rootFingerprint);
 * // "0f056943"
 * console.log(bip32Path);
 * // "m/45'/0/0"
 */
export class ColdcardExportExtendedPublicKey extends ColdcardMultisigSettingsFileParser {
  constructor({ network, bip32Path }) {
    super({
      network,
      bip32Path,
    });
  }

  messages() {
    return super.messages();
  }

  parse(xpubJSONFile) {
    const result = super.parse(xpubJSONFile);
    const xpub = this.deriveDeeperXpubIfNecessary(result);

    return {
      xpub,
      rootFingerprint: result.rootFingerprint,
      bip32Path: this.bip32Path,
    };
  }
}

/**
 * Returns signature request data via a PSBT for a Coldcard to sign and
 * accepts a PSBT for parsing signatures from a Coldcard device
 *
 * @example
 * const interaction = new ColdcardSignMultisigTransaction({network, inputs, outputs, bip32paths, psbt});
 * console.log(interaction.request());
 * // "cHNidP8BA..."
 *
 * // Parse signatures from a signed PSBT
 * const signatures = interaction.parse(psbt);
 * console.log(signatures);
 * // {'029e866...': ['3045...01', ...]}
 *
 */
export class ColdcardSignMultisigTransaction extends ColdcardInteraction {
  network: string;

  psbt: any;

  inputs: any[];

  outputs: any[];

  bip32Paths: string[];

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
        if (!inputs?.length || !outputs?.length) {
          // NOTE: This should be fine since a PSBT can be created
          // as empty and added to. But the current API for psbts
          // and expected interactions don't yet support the PSBT saga
          // so we'll throw for now.
          throw new Error("Missing inputs or outputs.");
        }
        this.psbt = getUnsignedMultisigPsbtV0({
          network,
          inputs: inputs.map(convertLegacyInput),
          outputs: outputs.map(convertLegacyOutput),
        });
      } catch (e) {
        console.error("Error building PSBT", e);
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
      code: "coldcard.install_multisig_config",
      text: `Ensure your Coldcard has the multisig wallet installed.`,
    });
    messages.push({
      state: PENDING,
      level: INFO,
      code: "coldcard.download_psbt",
      text: `Download and save this PSBT file to your SD card.`,
    });
    messages.push({
      state: PENDING,
      level: INFO,
      code: "coldcard.transfer_psbt",
      text: `Transfer the PSBT file to your Coldcard.`,
    });
    messages.push({
      state: ACTIVE,
      level: INFO,
      code: "coldcard.transfer_psbt",
      text: `Transfer the PSBT file to your Coldcard.`,
    });
    messages.push({
      state: ACTIVE,
      level: INFO,
      code: "coldcard.select_psbt",
      text: `Choose 'Ready To Sign' and select the PSBT.`,
    });
    messages.push({
      state: ACTIVE,
      level: INFO,
      code: "coldcard.sign_psbt",
      text: `Verify the transaction details and sign.`,
    });
    messages.push({
      state: ACTIVE,
      level: INFO,
      code: "coldcard.upload_signed_psbt",
      text: `Upload the signed PSBT below.`,
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

/**
 * Returns a valid multisig wallet config text file to send over to a Coldcard
 *
 * NOTE: technically only the root xfp of the signing device is required to be
 * correct, but we recommend only setting up the multisig wallet on the Coldcard
 * with complete xfp information. Here we actually turn this recommendation into a
 * requirement so as to minimize the number of wallet-config installations.
 *
 * This will likely move to its own generic class soon, and we'll only leave
 * the specifics of `adapt()` behind.
 *
 * This is an example Coldcard config file from
 * https://coldcardwallet.com/docs/multisig
 *
 * # Coldcard Multisig setup file (exported from 4369050F)
 * #
 * Name: MeMyself
 * Policy: 2 of 4
 * Derivation: m/45'
 * Format: P2WSH
 *
 * D0CFA66B: tpubD9429UXFGCTKJ9NdiNK4rC5...DdP9
 * 8E697B74: tpubD97nVL37v5tWyMf9ofh5rzn...XgSc
 * BE26B07B: tpubD9ArfXowvGHnuECKdGXVKDM...FxPa
 * 4369050F: tpubD8NXmKsmWp3a3DXhbihAYbY...9C8n
 *
 */
export class ColdcardMultisigWalletConfig {
  jsonConfig: any;

  name: string;

  requiredSigners: number;

  totalSigners: number;

  addressType: MultisigAddressType;

  extendedPublicKeys: WalletConfigKeyDerivation[];

  constructor({ jsonConfig }) {
    if (typeof jsonConfig === "object") {
      this.jsonConfig = jsonConfig;
    } else if (typeof jsonConfig === "string") {
      try {
        this.jsonConfig = JSON.parse(jsonConfig);
      } catch (error) {
        throw new Error("Unable to parse JSON.");
      }
    } else {
      throw new Error("Not valid JSON.");
    }

    if (this.jsonConfig.uuid || this.jsonConfig.name) {
      this.name = this.jsonConfig.uuid || this.jsonConfig.name;
    } else {
      throw new Error("Configuration file needs a UUID or a name.");
    }

    if (
      this.jsonConfig.quorum.requiredSigners &&
      this.jsonConfig.quorum.totalSigners
    ) {
      this.requiredSigners = this.jsonConfig.quorum.requiredSigners;
      this.totalSigners = this.jsonConfig.quorum.totalSigners;
    } else {
      throw new Error(
        "Configuration file needs quorum.requiredSigners and quorum.totalSigners."
      );
    }

    if (this.jsonConfig.addressType) {
      this.addressType = jsonConfig.addressType;
    } else {
      throw new Error("Configuration file needs addressType.");
    }

    if (
      this.jsonConfig.extendedPublicKeys &&
      this.jsonConfig.extendedPublicKeys.every((xpub) => {
        // For each xpub, check that xfp exists, the length is 8, type is string, and valid hex
        if (!xpub.xfp || xpub.xfp === "Unknown") {
          throw new Error("ExtendedPublicKeys missing at least one xfp.");
        }
        if (typeof xpub.xfp !== "string") {
          throw new Error("XFP not a string");
        }
        if (xpub.xfp.length !== 8) {
          throw new Error("XFP not length 8");
        }
        if (isNaN(Number(`0x${xpub.xfp}`))) {
          throw new Error("XFP is invalid hex");
        }
        return true;
      })
    ) {
      this.extendedPublicKeys = this.jsonConfig.extendedPublicKeys;
    } else {
      throw new Error("Configuration file needs extendedPublicKeys.");
    }
  }

  /**
   * Output to be written to a text file and uploaded to Coldcard.
   */
  adapt() {
    let output = `# Coldcard Multisig setup file (exported from @caravan/wallets)
# https://github.com/caravan-bitcoin/caravan/packages/caravan-wallets
# v${COLDCARD_WALLET_CONFIG_VERSION}
#
Name: ${this.name}
Policy: ${this.requiredSigners} of ${this.totalSigners}
Format: ${this.addressType}

`;
    // We need to loop over xpubs and output `Derivation: bip32path` and `xfp: xpub` for each
    let xpubs = this.extendedPublicKeys.map((xpub) => {
      // Mask the derivation to the appropriate depth if it is not known
      const derivation = getMaskedDerivation(xpub);
      return `Derivation: ${derivation}\n${xpub.xfp}: ${xpub.xpub}`;
    });
    output += xpubs.join("\n");
    output += "\n";
    return output;
  }
}

/**
 * Coldcard sign-message interaction over SD card / Virtual Disk file
 * exchange — the established BIP-137 flow for Coldcard.
 *
 * Request file: a plain-text file with up to 3 lines per the Coldcard
 * docs:
 *
 *     {message}
 *     {bip32Path}
 *     {addressFormat}   // one of: p2pkh, p2sh-p2wpkh, p2wpkh
 *
 * caravan signs at the cosigner key as P2WPKH single-key (the SeedSigner
 * workaround pattern), so the third line is always "p2wpkh".
 *
 * Response file: Coldcard emits an armored "Bitcoin Signed Message" file
 * with the canonical structure
 *
 *     -----BEGIN BITCOIN SIGNED MESSAGE-----
 *     {message}
 *     -----BEGIN SIGNATURE-----
 *     {bitcoin address}
 *     {base64 BIP-137 signature}
 *     -----END BITCOIN SIGNED MESSAGE-----
 *
 * parse() extracts the base64 signature line from that block and returns
 * a canonical Entry. The signature is the standard 65-byte BIP-137 wire
 * form, base64-encoded; caravan's loose-mode verifier handles Coldcard's
 * header-byte encoding (which uses the segwit-bech32 range for P2WPKH).
 *
 * BIP-322 is intentionally not supported on this class. Coldcard's
 * BIP-322 firmware mode is the "Proof of Reserve" PSBT flow (Mk 5.5.0 /
 * Q 1.4.0Q+), which proves wallet-level UTXO control via the BIP-322
 * FULL form — a different use case from caravan's per-cosigner-key
 * BIP-322 Simple need. A future, separate `ColdcardSignMessageBIP322`
 * (or similarly named) interaction class can wrap the Proof-of-Reserve
 * PSBT flow if/when caravan needs that capability; caravan does not
 * model protocol selection as a runtime flag on this class.
 */
export class ColdcardSignMessage extends ColdcardInteraction {
  bip32Path: string;

  message: string;

  expectedPubkey: string;

  constructor({
    bip32Path,
    message,
    expectedPubkey,
  }: {
    bip32Path: string;
    message: string;
    expectedPubkey: string;
  }) {
    super();

    validateMessage(message, COLDCARD);

    this.bip32Path = bip32Path;
    this.message = message;
    this.expectedPubkey = expectedPubkey;
    this.workflow = ["request", "parse"];
  }

  messages() {
    const messages = super.messages();
    messages.push({
      state: PENDING,
      level: INFO,
      code: "coldcard.download_sign_message_file",
      text: "Download and save this text file to your SD card.",
    });
    messages.push({
      state: ACTIVE,
      level: INFO,
      code: "coldcard.sign_message",
      text: "On the Coldcard: Advanced > File Management > Sign Text File. Confirm the message and sign.",
    });
    messages.push({
      state: ACTIVE,
      level: INFO,
      code: "coldcard.upload_signed_message_file",
      text: "Upload the signed message file produced by your Coldcard below.",
    });
    return messages;
  }

  /**
   * Build the .txt request file for Coldcard's sign-text-file flow.
   * Three lines: message, BIP-32 path, address format (always p2wpkh
   * since we sign per cosigner pubkey as single-key).
   */
  request(): string {
    return `${this.message}\n${this.bip32Path}\np2wpkh\n`;
  }

  /**
   * Parse the armored "Bitcoin Signed Message" file Coldcard returns
   * over SD card. Extract the base64 signature and wrap as an Entry.
   */
  parse(file: string): Entry {
    if (typeof file !== "string" || file.length === 0) {
      throw new MessageSigningError({
        kind: "MalformedResponse",
        keystore: COLDCARD,
        userMessage: "Empty Coldcard signed-message file.",
      });
    }

    const lines = file.split(/\r?\n/);
    const sigStart = lines.findIndex((l) => l.includes("BEGIN SIGNATURE"));
    if (sigStart < 0) {
      throw new MessageSigningError({
        kind: "MalformedResponse",
        keystore: COLDCARD,
        userMessage:
          "Coldcard signed-message file is missing the '-----BEGIN SIGNATURE-----' delimiter.",
      });
    }
    // Per Coldcard's armored output, the signature is the second
    // non-empty line after the BEGIN SIGNATURE marker (first line is
    // the bitcoin address, second is the base64 sig).
    const afterMarker = lines
      .slice(sigStart + 1)
      .filter((l) => l.length > 0 && !l.includes("-----"));
    if (afterMarker.length < 2) {
      throw new MessageSigningError({
        kind: "MalformedResponse",
        keystore: COLDCARD,
        userMessage:
          "Coldcard signed-message file does not contain both an address line and a signature line.",
      });
    }
    const signature = afterMarker[1].trim();
    if (signature.length === 0) {
      throw new MessageSigningError({
        kind: "MalformedResponse",
        keystore: COLDCARD,
        userMessage: "Coldcard returned an empty signature line.",
      });
    }

    return {
      bip32Path: this.bip32Path,
      signature,
      expectedPubkey: this.expectedPubkey,
    };
  }
}
