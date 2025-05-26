/**
 * This module provides classes for Ledger hardware wallets.
 *
 * The base classes provided are `LedgerDashboardInteraction` and
 * `LedgerBitcoinInteraction` for interactions requiring being in the
 * Ledger dashboard vs. bitcoin app, respectively.
 *
 * The following API classes are implemented:
 *
 * * LedgerGetMetadata
 * * LedgerExportPublicKey
 * * LedgerExportExtendedPublicKey
 * * LedgerSignMultisigTransaction
 * * LedgerSignMessage
 */
import {
  bip32PathToSequence,
  hardenedBIP32Index,
  compressPublicKey,
  scriptToHex,
  multisigRedeemScript,
  multisigWitnessScript,
  P2SH,
  P2SH_P2WSH,
  P2WSH,
  multisigAddressType,
  getParentBIP32Path,
  getFingerprintFromPublicKey,
  deriveExtendedPublicKey,
  unsignedMultisigTransaction,
  validateBIP32Path,
  fingerprintToFixedLengthHex,
  addSignaturesToPSBT,
  BitcoinNetwork,
  validateHex,
  getPsbtVersionNumber,
  PsbtV2,
  ExtendedPublicKey,
} from "@caravan/bitcoin";
import { LegacyInput } from "@caravan/multisig";
import { translatePSBT } from "@caravan/psbt";
import LedgerBtc from "@ledgerhq/hw-app-btc";
import { getAppAndVersion } from "@ledgerhq/hw-app-btc/lib/getAppAndVersion.js";
import { serializeTransactionOutputs } from "@ledgerhq/hw-app-btc/lib/serializeTransaction.js";
import { splitTransaction } from "@ledgerhq/hw-app-btc/lib/splitTransaction.js";
import TransportU2F from "@ledgerhq/hw-transport-u2f";
import TransportWebUSB from "@ledgerhq/hw-transport-webusb";
import { AppClient, PsbtV2 as LedgerPsbtV2 } from "ledger-bitcoin";

import {
  ACTIVE,
  PENDING,
  INFO,
  WARNING,
  ERROR,
  DirectKeystoreInteraction,
} from "./interaction";
import { MultisigWalletPolicy } from "./policy";
import { DeviceError, MultisigWalletConfig } from "./types";

/**
 * Constant defining Ledger interactions.
 */
export const LEDGER = "ledger";

export const LEDGER_V2 = "ledger_v2";


/**
 * Constant representing the action of pushing the left button on a
 * Ledger device.
 */
export const LEDGER_LEFT_BUTTON = "ledger_left_button";

/**
 * Constant representing the action of pushing the right button on a
 * Ledger device.
 */
export const LEDGER_RIGHT_BUTTON = "ledger_right_button";

/**
 * Constant representing the action of pushing both buttons on a
 * Ledger device.
 */
export const LEDGER_BOTH_BUTTONS = "ledger_both_buttons";

export interface AppAndVersion {
  name: string;
  version: string;
  flags: number | Buffer;
}

/**
 * Base class for interactions with Ledger hardware wallets.
 *
 * Subclasses must implement their own `run()` method.  They may use
 * the `withTransport` and `withApp` methods to connect to the Ledger
 * API's transport or app layers, respectively.
 *
 * Errors are not caught, so users of this class (and its subclasses)
 * should use `try...catch` as always.
 *
 * @example
 * import {LedgerInteraction} from "@caravan/wallets";
 * // Simple subclass
 *
 * class SimpleLedgerInteraction extends LedgerInteraction {
 *
 *   constructor({param}) {
 *     super({});
 *     this.param =  param;
 *   }
 *
 *   async run() {
 *     return await this.withApp(async (app, transport) => {
 *       return app.doSomething(this.param); // Not a real Ledger API call
 *     });
 *   }
 *
 * }
 *
 * // usage
 * const interaction = new SimpleLedgerInteraction({param: "foo"});
 * const result = await interaction.run();
 * console.log(result); // whatever value `app.doSomething(...)` returns
 *
 */
export class LedgerInteraction extends DirectKeystoreInteraction {
  appVersion?: string;

  appName?: string;

  /**
   * Adds `pending` messages at the `info` level about ensuring the
   * device is plugged in (`device.connect`) and unlocked
   * (`device.unlock`).  Adds an `active` message at the `info` level
   * when communicating with the device (`device.active`).
   */
  messages() {
    const messages = super.messages();
    messages.push({
      state: PENDING,
      level: INFO,
      text: "Please plug in and unlock your Ledger.",
      code: "device.setup",
    });
    messages.push({
      state: ACTIVE,
      level: INFO,
      text: "Communicating with Ledger...",
      code: "device.active",
    });
    return messages;
  }

  /**
   * Can be called by a subclass during its `run()` method.
   *
   * Creates a transport layer connection and passes control to the
   * `callback` function, with the transport API as the first argument
   * to the function.
   *
   * See the [Ledger API]{@link https://github.com/LedgerHQ/ledgerjs} for general information or a [specific transport API]{@link https://github.com/LedgerHQ/ledgerjs/tree/master/packages/hw-transport-u2f} for examples of API calls.
   *
   * @example
   * async run() {
   *   return await this.withTransport(async (transport) => {
   *     return transport.doSomething(); // Not a real Ledger transport API call
   *   });
   * }
   */
  async withTransport(callback: (transport: any) => any) {
    const useU2F = this.environment.satisfies({
      firefox: ">70",
    });

    if (useU2F) {
      try {
        const transport = await TransportU2F.create();
        return callback(transport);
      } catch (err: unknown) {
        const e = err as DeviceError;
        throw new Error(e.message);
      }
    }

    try {
      const transport = await TransportWebUSB.create();
      return callback(transport);
    } catch (err: unknown) {
      const e = err as DeviceError;
      if (e.message) {
        if (e.message === "No device selected.") {
          e.message = `Select your device in the WebUSB dialog box. Make sure it's plugged in, unlocked, and has the Bitcoin app open.`;
        }
        if (
          e.message ===
          "undefined is not an object (evaluating 'navigator.usb.getDevices')"
        ) {
          e.message = `Safari is not a supported browser.`;
        }
      }
      throw new Error(e.message);
    }
  }

  setAppVersion(): Promise<string> {
    return this.withTransport(async (transport) => {
      const response: AppAndVersion = await getAppAndVersion(transport);
      this.appVersion = response.version;
      this.appName = response.name;
      return this.appVersion;
    });
  }

  async isLegacyApp(): Promise<boolean> {
    const version = await this.setAppVersion();
    const [majorVersion, minorVersion] = version.split(".");
    // if the name includes "Legacy" then it is legacy app
    if (this.appName && Boolean(this.appName.includes("Legacy"))) return true;
    // otherwise check version number. < 2.1.0 is legacy
    return (
      Number(majorVersion) <= 1 ||
      (Number(majorVersion) == 2 && Number(minorVersion) < 1)
    );
  }

  /**
   * Can be called by a subclass during its `run()` method.
   *
   * Creates a transport layer connection, initializes a bitcoin app
   * object, and passes control to the `callback` function, with the
   * app API as the first argument to the function and the transport
   * API as the second.
   *
   * See the [Ledger API]{@link https://github.com/LedgerHQ/ledgerjs} for general information or the [bitcoin app API]{@link https://github.com/LedgerHQ/ledgerjs/tree/master/packages/hw-app-btc} for examples of API calls.
   *
   * @example
   * async run() {
   *   return await this.withApp(async (app, transport) => {
   *     return app.doSomething(); // Not a real Ledger bitcoin app API call
   *   });
   * }
   */
  withApp(callback: (app: any, transport: any) => any) {
    return this.withTransport(async (transport) => {
      let app;
      if (await this.isLegacyApp()) {
        app = new LedgerBtc(transport);
      } else {
        app = new AppClient(transport);
      }
      return callback(app, transport);
    });
  }

  /**
   * Close the Transport to free the interface (E.g. could be used in another tab
   * now that the interaction is over)
   *
   * The way the pubkey/xpub/fingerprints are grabbed makes this a little tricky.
   * Instead of re-writing how that works, let's just add a way to explicitly
   * close the transport.
   */
  closeTransport() {
    return this.withTransport(async (transport) => {
      try {
        await transport.close();
      } catch (err) {
        console.error(err);
      }
    });
  }
}

/**
 * Base class for interactions which must occur when the Ledger device
 * is not in any app but in the dashboard.
 */
export class LedgerDashboardInteraction extends LedgerInteraction {
  /**
   * Adds `pending` and `active` messages at the `info` level urging
   * the user to be in the Ledger dashboard, not the bitcoin app
   * (`ledger.app.dashboard`).
   */
  messages() {
    const messages = super.messages();
    messages.push({
      state: PENDING,
      level: INFO,
      text: "Make sure you have the main Ledger dashboard open, NOT the Bitcoin app.",
      code: "ledger.app.dashboard",
    });
    messages.push({
      state: ACTIVE,
      level: INFO,
      text: "Make sure you have the main Ledger dashboard open, NOT the Bitcoin app.",
      code: "ledger.app.dashboard",
    });
    return messages;
  }
}

/**
 * Base class for interactions which must occur when the Ledger device
 * is open to the bitcoin app.
 */
export abstract class LedgerBitcoinInteraction extends LedgerInteraction {
  /**
   * Whether or not the interaction is supported in legacy versions
   * of the Ledger App (<=v2.0.6)
   */
  abstract isLegacySupported: boolean;

  /**
   * Whether or not the interaction is supported in non-legacy versions
   * of the Ledger App (>=v2.1.0)
   */
  abstract isV2Supported: boolean;

  /**
   * Adds `pending` and `active` messages at the `info` level urging
   * the user to be in the bitcoin app (`ledger.app.bitcoin`).
   */
  messages() {
    const messages = super.messages();
    messages.push({
      state: PENDING,
      level: INFO,
      text: "Then open the Bitcoin app.",
      code: "ledger.app.bitcoin",
    });
    messages.push({
      state: ACTIVE,
      level: INFO,
      text: "Make sure you have opened the Bitcoin app.",
      code: "ledger.app.bitcoin",
    });
    return messages;
  }

  /**
   * Inheriting classes should set properties `this.isLegacySupported`
   * and `this.isV2Supported` to indicate whether a given interaction
   * has support for a given interaction. This method can then be called
   * to check the version of the app being called and return whether or
   * not the interaction is supported based on that version
   */
  async isAppSupported() {
    if (!this.isSupported()) return false;
    if (await this.isLegacyApp()) {
      return this.isLegacySupported;
    }
    return this.isV2Supported;
  }

  /**
   * Inheriting classes should call the super.run()
   * as well as set the properties of support before calling their run
   * in order to check support before calling the actual interaction run
   *
   * The return type has to remain any to get inheritance typing to work.
   */
  async run(): Promise<any> {
    const isSupported = await this.isAppSupported();
    if (!isSupported) {
      throw new Error(
        `Method not supported for this version of Ledger app (${this.appVersion})`
      );
    }
    return isSupported;
  }
}

/**
 * Returns metadata about Ledger device.
 *
 * Includes model name, firmware & MCU versions.
 *
 * @example
 * import {LedgerGetMetadata} from "@caravan/wallets";
 * const interaction = new LedgerGetMetadata();
 * const result = await interaction.run();
 * console.log(result);
 * {
 *   spec: "Nano S v1.4.2 (MCU v1.7)",
 *   model: "Nano S",
 *   version: {
 *     major: "1",
 *     minor: "4",
 *     patch: "2",
 *     string: "1.4.2",
 *   },
 *   mcuVersion: {
 *     major: "1",
 *     minor: "7",
 *     string: "1.7",
 *   }
 * }
 *
 */
export class LedgerGetMetadata extends LedgerDashboardInteraction {
  // FIXME entire implementation here is rickety AF.

  async run() {
    return this.withTransport(async (transport) => {
      try {
        transport.setScrambleKey("B0L0S");
        const rawResult = await transport.send(0xe0, 0x01, 0x00, 0x00);
        return this.parseMetadata(rawResult);
      } finally {
        await super.closeTransport();
      }
    });
  }

  /**
   * Parses the binary data returned from the Ledger API call into a
   * metadata object.
   *
   */
  parseMetadata(response: any[]) {
    try {
      // From
      //
      //   https://github.com/LedgerHQ/ledger-live-common/blob/master/src/hw/getVersion.js
      //   https://github.com/LedgerHQ/ledger-live-common/blob/master/src/hw/getDeviceInfo.js
      //   https://git.xmr.pm/LedgerHQ/ledger-live-common/commit/9ffc75acfc7f1e9aa9101a32b3e7481770fb3b89

      const PROVIDERS = {
        "": 1,
        das: 2,
        club: 3,
        shitcoins: 4,
        ee: 5,
      };
      const ManagerAllowedFlag = 0x08;
      const PinValidatedFlag = 0x80;

      const byteArray = [...response];
      const data = byteArray.slice(0, byteArray.length - 2);
      const targetIdStr = Buffer.from(data.slice(0, 4));
      const targetId = targetIdStr.readUIntBE(0, 4);
      const seVersionLength = data[4];
      let seVersion = Buffer.from(
        data.slice(5, 5 + seVersionLength)
      ).toString();
      const flagsLength = data[5 + seVersionLength];
      let flags = Buffer.from(
        data.slice(
          5 + seVersionLength + 1,
          5 + seVersionLength + 1 + flagsLength
        )
      );

      const mcuVersionLength = data[5 + seVersionLength + 1 + flagsLength];
      let mcuVersion = Buffer.from(
        data.slice(
          7 + seVersionLength + flagsLength,
          7 + seVersionLength + flagsLength + mcuVersionLength
        )
      );
      if (mcuVersion[mcuVersion.length - 1] === 0) {
        mcuVersion = mcuVersion.slice(0, mcuVersion.length - 1);
      }

      let versionString = mcuVersion.toString();

      if (!seVersionLength) {
        seVersion = "0.0.0";
        flags = Buffer.allocUnsafeSlow(0);
        versionString = "";
      }

      /* eslint-disable @typescript-eslint/no-unused-vars, no-bitwise */
      const isOSU = seVersion.includes("-osu");
      const version = seVersion.replace("-osu", "");
      const m = seVersion.match(/([0-9]+.[0-9]+)(.[0-9]+)?(-(.*))?/);
      const [, majMin, , , providerName] = m || [];
      const providerId = PROVIDERS[providerName] || 1;
      const isBootloader = (targetId & 0xf0000000) !== 0x30000000;
      const flag = flags.length > 0 ? flags[0] : 0;
      const managerAllowed = Boolean(flag & ManagerAllowedFlag);
      const pin = Boolean(flag & PinValidatedFlag);
      /* eslint-enable */

      const [majorVersion, minorVersion, patchVersion] = (version || "").split(
        "."
      );
      const [mcuMajorVersion, mcuMinorVersion] = (versionString || "").split(
        "."
      );

      // https://gist.github.com/TamtamHero/b7651ffe6f1e485e3886bf4aba673348
      // +-----------------+------------+
      // |    FirmWare     | Target ID  |
      // +-----------------+------------+
      // | Nano S <= 1.3.1 | 0x31100002 |
      // | Nano S 1.4.x    | 0x31100003 |
      // | Nano S 1.5.x    | 0x31100004 |
      // |                 |            |
      // | Blue 2.0.x      | 0x31000002 |
      // | Blue 2.1.x      | 0x31000004 |
      // | Blue 2.1.x V2   | 0x31010004 |
      // |                 |            |
      // | Nano X          | 0x33000004 |
      // |                 |            |
      // | MCU,any version | 0x01000001 |
      // +-----------------+------------+
      //
      //  Order matters -- high to low minTargetId
      const MODEL_RANGES = [
        {
          minTargetId: 0x33000004,
          model: "Nano X",
        },
        {
          minTargetId: 0x31100002,
          model: "Nano S",
        },
        {
          minTargetId: 0x31100002,
          model: "Blue",
        },
        {
          minTargetId: 0x01000001,
          model: "MCU",
        },
      ];
      let model = "Unknown";
      if (targetId) {
        for (let i = 0; i < MODEL_RANGES.length; i++) {
          const range = MODEL_RANGES[i];
          if (targetId >= range.minTargetId) {
            model = range.model;
            break;
          }
        }
      }

      let spec = `${model} v${version} (MCU v${versionString})`;
      // if (pin) {
      //   spec += " w/PIN";
      // }

      return {
        spec,
        model,
        version: {
          major: majorVersion,
          minor: minorVersion,
          patch: patchVersion,
          string: version,
        },
        mcuVersion: {
          major: mcuMajorVersion,
          minor: mcuMinorVersion,
          string: versionString,
        },
        // pin,
      };
    } catch (e) {
      console.error(e);
      throw new Error("Unable to parse metadata from Ledger device.");
    }
  }
}

export interface LedgerDeviceError {
  text: string;
  code: string;
}

/**
 * Base class for interactions exporting information about an HD node
 * at a given BIP32 path.
 *
 * You may want to use `LedgerExportPublicKey` or
 * `LedgerExportExtendedPublicKey` directly.
 *
 * @example
 * import {MAINNET} from "@caravan/bitcoin";
 * import {LedgerExportHDNode} from "@caravan/wallets";
 * const interaction = new LedgerExportHDNode({network: MAINNET, bip32Path: "m/48'/0'/0'/2'/0"});
 * const node = await interaction.run();
 * console.log(node);
 */
abstract class LedgerExportHDNode extends LedgerBitcoinInteraction {
  bip32Path: string;

  bip32ValidationErrorMessage?: LedgerDeviceError;

  abstract isV2Supported: boolean;

  abstract isLegacySupported: boolean;

  /**
   * Requires a valid BIP32 path to the node to export.
   *
   * @param {object} options - options argument
   * @param {string} bip32Path - the BIP32 path for the HD node
   */
  constructor({ bip32Path }) {
    super();
    this.bip32Path = bip32Path;
    const bip32PathError = validateBIP32Path(bip32Path);
    if (bip32PathError.length) {
      this.bip32ValidationErrorMessage = {
        text: bip32PathError,
        code: "ledger.bip32_path.path_error",
      };
    }
  }

  /**
   * Adds messages related to the warnings Ledger devices produce on various BIP32 paths.
   */
  messages() {
    const messages = super.messages();

    if (this.bip32ValidationErrorMessage) {
      messages.push({
        state: PENDING,
        level: ERROR,
        code: this.bip32ValidationErrorMessage.code,
        text: this.bip32ValidationErrorMessage.text,
      });
    }
    return messages;
  }

  /**
   * Returns whether or not the Ledger device will display a warning
   * to the user about an unusual BIP32 path.
   *
   * A "usual" BIP32 path is exactly 5 segments long.  The segments
   * have the following constraints:
   *
   * - Segment 1: Must be equal to `44'`
   * - Segment 2: Can have any value
   * - Segment 3: Must be between `0'` and `100'`
   * - Segment 4: Must be equal to `0`
   * - Segment 5: Must be between `0 and 50000`
   *
   * Any other kind of path is considered unusual and will trigger the
   * warning.
   */
  hasBIP32PathWarning() {
    // 0 -> 44'
    // 1 -> anything
    // 2 -> 0' - 100'
    // 3 -> 0
    // 4 -> 0 - 50000
    const indices = bip32PathToSequence(this.bip32Path);
    const hardened0 = hardenedBIP32Index(0);
    const hardened44 = hardenedBIP32Index(44);
    const hardened100 = hardenedBIP32Index(100);
    if (indices.length !== 5) {
      return true;
    }
    if (indices[0] !== hardened44) {
      return true;
    }
    if (indices[2] < hardened0 || indices[2] > hardened100) {
      return true;
    }
    if (indices[3] !== 0) {
      return true;
    }
    return indices[4] < 0 || indices[4] > 50000;
  }

  /**
   * Get fingerprint from parent pubkey. This is useful for generating xpubs
   * which need the fingerprint of the parent pubkey
   *
   * Optionally get root fingerprint for device. This is useful for keychecks and necessary
   * for PSBTs
   */
  async getFingerprint(root = false): Promise<number | string> {
    if (await this.isLegacyApp()) {
      const pubkey = root
        ? await this.getMultisigRootPublicKey()
        : await this.getParentPublicKey();
      let fp = getFingerprintFromPublicKey(pubkey);
      // If asked for a root XFP, zero pad it to length of 8.
      return root ? fingerprintToFixedLengthHex(fp) : fp.toString();
    } else if (root) {
      return this.getXfp();
    } else {
      throw new Error(
        `Method not supported for this version of Ledger app (${this.appVersion})`
      );
    }
  }

  // v2 App and above only
  async getXfp() {
    if (await this.isLegacyApp()) {
      return this.getFingerprint(true);
    }

    return this.withApp(async (app) => {
      return await app.getMasterFingerprint();
    });
  }

  getParentPublicKey() {
    return this.withApp(async (app) => {
      const parentPath = getParentBIP32Path(this.bip32Path);
      const key = (await app.getWalletPublicKey(parentPath)).publicKey;
      return key;
    });
  }

  getMultisigRootPublicKey() {
    return this.withApp(async (app) => {
      const key = (await app.getWalletPublicKey()).publicKey; // Call getWalletPublicKey w no path to get BIP32_ROOT (m)
      return key;
    });
  }

  /**
   * See {@link https://github.com/LedgerHQ/ledgerjs/tree/master/packages/hw-app-btc#getwalletpublickey}.
   */
  run() {
    return this.withApp(async (app) => {
      await super.run();
      // only supported by legacy app
      const result = await app.getWalletPublicKey(this.bip32Path);
      return result;
    });
  }
}

/**
 * Returns the public key at a given BIP32 path.
 *
 * @example
 * import {LedgerExportPublicKey} from "@caravan/wallets";
 * const interaction = new LedgerExportPublicKey({bip32Path: "m/48'/0'/0'/2'/0"});
 * const publicKey = await interaction.run();
 * console.log(publicKey);
 * // "03..."
 */
export class LedgerExportPublicKey extends LedgerExportHDNode {
  includeXFP: boolean;

  readonly isLegacySupported = true;

  readonly isV2Supported = false;

  /**
   * @param {string} bip32Path - the BIP32 path for the HD node
   * @param {boolean} includeXFP - return xpub with root fingerprint concatenated
   */
  constructor({ bip32Path, includeXFP = false }) {
    super({ bip32Path });
    this.includeXFP = includeXFP;
  }

  getV2PublicKey() {
    return this.withApp(async (app) => {
      const xpub = await app.getExtendedPubkey(this.bip32Path, true);
      return ExtendedPublicKey.fromBase58(xpub).pubkey;
    });
  }

  /**
   * Parses out and compresses the public key from the response of
   * `LedgerExportHDNode`.
   */
  async run() {
    try {
      if (await this.isLegacyApp()) {
        const result = await super.run();
        const publicKey = this.parsePublicKey((result || {}).publicKey);
        if (this.includeXFP) {
          let rootFingerprint = await this.getXfp();
          return {
            rootFingerprint,
            publicKey,
          };
        }

        return publicKey;
      }
      const publicKey = await this.getV2PublicKey();
      if (this.includeXFP) {
        let rootFingerprint = await this.getXfp();
        return { rootFingerprint, publicKey };
      }
      return publicKey;
    } finally {
      await super.closeTransport();
    }
  }

  /**
   * Compress the given public key.
   */
  parsePublicKey(publicKey?: string) {
    if (publicKey) {
      try {
        return compressPublicKey(publicKey);
      } catch (e) {
        console.error(e);
        throw new Error("Unable to compress public key from Ledger device.");
      }
    } else {
      throw new Error("Received no public key from Ledger device.");
    }
  }
}

/**
 * Class for wallet extended public key (xpub) interaction at a given BIP32 path.
 */
export class LedgerExportExtendedPublicKey extends LedgerExportHDNode {
  network: BitcoinNetwork;

  includeXFP: boolean;

  readonly isLegacySupported = true;

  readonly isV2Supported = true;

  /**
   * @param {string} bip32Path path
   * @param {string} network bitcoin network
   * @param {boolean} includeXFP - return xpub with root fingerprint concatenated
   */
  constructor({ bip32Path, network, includeXFP }) {
    super({ bip32Path });
    this.network = network;
    this.includeXFP = includeXFP;
  }

  messages() {
    return super.messages();
  }

  /**
   * Retrieve extended public key (xpub) from Ledger device for a given BIP32 path
   * @example
   * import {LedgerExportExtendedPublicKey} from "@caravan/wallets";
   * const interaction = new LedgerExportExtendedPublicKey({network, bip32Path});
   * const xpub = await interaction.run();
   * console.log(xpub);
   */
  async run() {
    try {
      if (await this.isLegacyApp()) {
        const walletPublicKey = await super.run();
        const fingerprint = await this.getFingerprint();
        const xpub = deriveExtendedPublicKey(
          this.bip32Path,
          walletPublicKey.publicKey,
          walletPublicKey.chainCode,
          Number(fingerprint),
          this.network
        );

        if (this.includeXFP) {
          const rootFingerprint = await this.getXfp();
          return {
            rootFingerprint,
            xpub,
          };
        }
        return xpub;
      } else {
        const rootFingerprint = await this.getXfp();
        const xpub = await this.withApp(async (app) => {
          return app.getExtendedPubkey(this.bip32Path, true);
        });
        return { xpub, rootFingerprint };
      }
    } finally {
      await super.closeTransport();
    }
  }
}

interface LedgerSignMultisigTransactionArguments {
  network: BitcoinNetwork;

  inputs?: LegacyInput[];

  outputs?: object[];

  bip32Paths?: string[];

  psbt?: string;

  // legacy type for key details. typescript
  // across all libraries should make this more consistent
  keyDetails?: { xfp: string; path: string };

  returnSignatureArray?: boolean;

  pubkeys?: Buffer[];

  v2Options?: LedgerV2SignTxConstructorArguments;
}

/**
 * Returns a signature for a bitcoin transaction with inputs from one
 * or many multisig addresses.
 *
 * - `inputs` is an array of `UTXO` objects from `@caravan/bitcoin`
 * - `outputs` is an array of `TransactionOutput` objects from `@caravan/bitcoin`
 * - `bip32Paths` is an array of (`string`) BIP32 paths, one for each input, identifying the path on this device to sign that input with
 *
 * @example
 * import {
 *   generateMultisigFromHex, TESTNET, P2SH,
 * } from "@caravan/bitcoin";
 * import {LedgerSignMultisigTransaction} from "@caravan/wallets";
 * const redeemScript = "5...ae";
 * const inputs = [
 *   {
 *     txid: "8d276c76b3550b145e44d35c5833bae175e0351b4a5c57dc1740387e78f57b11",
 *     index: 1,
 *     multisig: generateMultisigFromHex(TESTNET, P2SH, redeemScript),
 *     amountSats: '1234000'
 *   },
 *   // other inputs...
 * ];
 * const outputs = [
 *   {
 *     amountSats: '1299659',
 *     address: "2NGHod7V2TAAXC1iUdNmc6R8UUd4TVTuBmp"
 *   },
 *   // other outputs...
 * ];
 * const interaction = new LedgerSignMultisigTransaction({
 *   network: TESTNET,
 *   inputs,
 *   outputs,
 *   bip32Paths: ["m/45'/0'/0'/0", // add more, 1 per input],
 * });
 * const signature = await interaction.run();
 * console.log(signatures);
 * // ["ababab...", // 1 per input]
 */
export class LedgerSignMultisigTransaction extends LedgerBitcoinInteraction {
  network: BitcoinNetwork;

  inputs: LegacyInput[];

  outputs: object[];

  bip32Paths: string[];

  psbt?: string;

  keyDetails?: { xfp: string; path: string };

  returnSignatureArray?: boolean;

  pubkeys?: Buffer[];

  v2Options?: LedgerV2SignTxConstructorArguments;

  readonly isLegacySupported = true;

  readonly isV2Supported = false;

  constructor({
    network,
    inputs = [],
    outputs = [],
    bip32Paths = [],
    psbt,
    keyDetails,
    returnSignatureArray = false,
    v2Options,
  }: LedgerSignMultisigTransactionArguments) {
    super();
    this.network = network;
    if (!psbt || !keyDetails) {
      this.inputs = inputs;
      this.outputs = outputs;
      this.bip32Paths = bip32Paths;
    } else {
      this.psbt = psbt;
      this.returnSignatureArray = returnSignatureArray;

      const translatedPsbt = translatePSBT(
        network,
        v2Options?.addressType || P2SH,
        this.psbt,
        keyDetails
      );

      this.inputs = translatedPsbt?.unchainedInputs;
      this.outputs = translatedPsbt?.unchainedOutputs;
      this.bip32Paths = translatedPsbt?.bip32Derivations.map(
        (b32d) => b32d.path
      );
      this.pubkeys = translatedPsbt?.bip32Derivations.map(
        (b32d) => b32d.pubkey
      );
    }
    this.v2Options = v2Options;
  }

  /**
   * Adds messages describing the signing flow.
   */
  messages() {
    const messages = super.messages();

    messages.push({
      state: ACTIVE,
      level: WARNING,
      code: "ledger.sign.delay",
      text: `Note: this process may take several minutes to complete`,
      preProcessingTime: this.preProcessingTime(),
      postProcessingTime: this.postProcessingTime(),
    });

    if (this.anySegwitInputs()) {
      messages.push({
        state: ACTIVE,
        level: INFO,
        code: "ledger.sign",
        version: "<1.6.0",
        text: `Your Ledger will ask you to "Confirm transaction" and display each output amount and address followed by the the fee amount.`,
        action: LEDGER_RIGHT_BUTTON,
      });

      messages.push({
        state: ACTIVE,
        level: INFO,
        code: "ledger.sign",
        version: ">=1.6.0",
        text: `Confirm each output on your Ledger device and approve the transaction.`,
        messages: [
          {
            text: `Your Ledger will ask you to "Review transaction".`,
            action: LEDGER_RIGHT_BUTTON,
          },
          {
            text: `For each output, your Ledger device will display the output amount...`,
            action: LEDGER_RIGHT_BUTTON,
          },
          {
            text: `...followed by the output address in several parts`,
            action: LEDGER_RIGHT_BUTTON,
          },
          {
            text: `Your Ledger will display the transaction fees.`,
            action: LEDGER_RIGHT_BUTTON,
          },
          {
            text: `Your Ledger will ask you to "Accept and send".`,
            action: LEDGER_BOTH_BUTTONS,
          },
        ],
      });
    } else {
      messages.push({
        state: ACTIVE,
        level: INFO,
        code: "ledger.sign",
        version: "<1.6.0",
        text: `Confirm each output on your Ledger device and approve the transaction.`,
        messages: [
          {
            text: `For each output, your Ledger will display the output amount and address for you to confirm.`,
            action: LEDGER_RIGHT_BUTTON,
          },
          {
            text: `Your Ledger will ask if you want to "Confirm the transaction".  Due to a bug in the Ledger software, your device may display the transaction fee as "UNKNOWN".`,
            action: LEDGER_RIGHT_BUTTON,
          },
        ],
      });

      messages.push({
        state: ACTIVE,
        level: INFO,
        code: "ledger.sign",
        version: ">=1.6.0",
        text: `Confirm each output on your Ledger device and approve the transaction.`,
        messages: [
          {
            text: `For each output, your Ledger will ask you to "Review output".`,
            action: LEDGER_RIGHT_BUTTON,
          },
          {
            text: `Your Ledger will display the output amount.`,
            action: LEDGER_RIGHT_BUTTON,
          },
          {
            text: `Your Ledger will display the output address in several parts.`,
            action: LEDGER_RIGHT_BUTTON,
          },
          {
            text: `Your Ledger will ask if you want to "Accept" the output.`,
            action: LEDGER_BOTH_BUTTONS,
          },
          {
            text: `Your Ledger will ask if you want to "Confirm the transaction".`,
            action: LEDGER_RIGHT_BUTTON,
          },
          {
            text: `Due to a bug in the Ledger software, your device will display the transaction fee as "UNKNOWN".`,
            action: LEDGER_RIGHT_BUTTON,
          },
          {
            text: `Your Ledger will ask you to "Accept and send".`,
            action: LEDGER_BOTH_BUTTONS,
          },
        ],
      });
    }

    return messages;
  }

  preProcessingTime() {
    // FIXME
    return 10;
  }

  postProcessingTime() {
    // FIXME
    return 10;
  }

  /**
   * See {@link https://github.com/LedgerHQ/ledgerjs/tree/master/packages/hw-app-btc#signp2shtransaction}.
   *
   * Input signatures produced will always have a trailing `...01`
   * {@link https://bitcoin.org/en/glossary/sighash-all SIGHASH_ALL}
   * byte.
   */
  async run() {
    // will check app support and throw error if not supported
    try {
      await super.run();
    } catch (e) {
      // in order to support backwards compatibility, if it's not supported
      // we'll try and run with v2 options instead
      if (!this.v2Options || !Object.keys(this.v2Options)) {
        throw e;
      }
      const interaction = new LedgerV2SignMultisigTransaction(this.v2Options);
      return interaction.run();
    }

    return this.withApp(async (app, transport) => {
      try {
        // FIXME: Explain the rationale behind this choice.
        transport.setExchangeTimeout(20000 * this.outputs.length);
        const transactionSignature = await app.signP2SHTransaction({
          inputs: this.ledgerInputs(),
          associatedKeysets: this.ledgerKeysets(),
          outputScriptHex: this.ledgerOutputScriptHex(),
          lockTime: 0, // locktime, 0 is no locktime
          sigHashType: 1, // sighash type, 1 is SIGHASH_ALL
          segwit: this.anySegwitInputs(),
          transactionVersion: 1, // tx version
        });
        // If we were passed a PSBT initially, we want to return a PSBT with partial signatures
        // rather than the normal array of signatures.
        if (this.psbt && !this.returnSignatureArray && this.pubkeys) {
          return addSignaturesToPSBT(
            this.network,
            this.psbt,
            this.pubkeys,
            this.parseSignature(transactionSignature, "buffer")
          );
        } else {
          return this.parseSignature(transactionSignature, "hex");
        }
      } finally {
        transport.close();
      }
    });
  }

  ledgerInputs() {
    return this.inputs.map((input) => {
      const addressType = multisigAddressType(input.multisig);
      const inputTransaction = splitTransaction(input.transactionHex, true); // FIXME: should the 2nd parameter here always be true?
      const scriptFn =
        addressType === P2SH ? multisigRedeemScript : multisigWitnessScript;
      const scriptHex = scriptToHex(scriptFn(input.multisig));
      return [inputTransaction, input.index, scriptHex]; // can add sequence number for RBF as an additional element
    });
  }

  ledgerKeysets() {
    return this.bip32Paths.map((bip32Path) => this.ledgerBIP32Path(bip32Path));
  }

  ledgerOutputScriptHex() {
    const txHex = unsignedMultisigTransaction(
      this.network,
      this.inputs,
      this.outputs
    ).toHex();
    const splitTx = splitTransaction(txHex, this.anySegwitInputs());
    return serializeTransactionOutputs(splitTx).toString("hex");
  }

  ledgerBIP32Path(bip32Path: string) {
    return bip32Path.split("/").slice(1).join("/");
  }

  anySegwitInputs() {
    for (let i = 0; i < this.inputs.length; i++) {
      const input = this.inputs[i];
      const addressType = multisigAddressType(input.multisig);
      if (addressType === P2SH_P2WSH || addressType === P2WSH) {
        return true;
      }
    }
    return false;
  }
}

/**
 * Returns a signature for a given message by a single public key.
 */
export class LedgerSignMessage extends LedgerBitcoinInteraction {
  bip32Path: string;

  message: string;

  bip32ValidationErrorMessage?: LedgerDeviceError;

  readonly isLegacySupported = true;

  readonly isV2Supported = false;

  constructor({ bip32Path, message }: { bip32Path: string; message: string }) {
    super();
    this.bip32Path = bip32Path;
    this.message = message;
    // this.bip32ValidationErrorMessage = false;

    const bip32PathError = validateBIP32Path(bip32Path);
    if (bip32PathError.length) {
      this.bip32ValidationErrorMessage = {
        text: bip32PathError,
        code: "ledger.bip32_path.path_error",
      };
    }
  }

  /**
   * Adds messages describing the signing flow.
   */
  messages() {
    const messages = super.messages();

    if (this.bip32ValidationErrorMessage) {
      messages.push({
        state: PENDING,
        level: ERROR,
        code: this.bip32ValidationErrorMessage.code,
        text: this.bip32ValidationErrorMessage.text,
      });
    }

    messages.push({
      state: ACTIVE,
      level: INFO,
      code: "ledger.sign",
      // (version is optional)
      text: 'Your Ledger will ask you to "Confirm Message" for signing.',
      action: LEDGER_RIGHT_BUTTON,
    });
    // TODO: are more messages required?

    return messages;
  }

  /**
   * See {@link https://github.com/LedgerHQ/ledger-live/tree/develop/libs/ledgerjs/packages/hw-app-btc#signmessagenew}.
   */
  async run() {
    // check app version support first
    await super.run();
    return this.withApp(async (app, transport) => {
      try {
        // TODO: what would be an appropriate amount of time to wait for a
        // signature?
        transport.setExchangeTimeout(20000);

        const vrs = await app.signMessageNew(this.bip32Path, this.message);

        return vrs;
      } finally {
        transport.close();
      }
    });
  }
}

interface RegistrationConstructorArguments extends MultisigWalletConfig {
  policyHmac?: string;
}

/**
 * A base class for any interactions that need to interact with a registered wallet
 * by providing a base constructor that will generate the key origins and the policy
 * from a given braid as well as methods for registering and returning a policy hmac
 */
export abstract class LedgerBitcoinV2WithRegistrationInteraction extends LedgerBitcoinInteraction {
  walletPolicy: MultisigWalletPolicy;

  private policyHmac?: Buffer;

  policyId?: Buffer;

  readonly network: BitcoinNetwork;

  readonly isLegacySupported = false;

  readonly isV2Supported = true;

  constructor({
    policyHmac,
    ...walletConfig
  }: RegistrationConstructorArguments) {
    super();
    if (policyHmac) {
      const error = validateHex(policyHmac);
      if (error) throw new Error(`Invalid policyHmac`);
      // TODO validate length
      this.policyHmac = Buffer.from(policyHmac, "hex");
    }

    this.network = walletConfig.network;

    this.walletPolicy = MultisigWalletPolicy.FromWalletConfig(walletConfig);
  }

  messages() {
    const messages = super.messages();

    messages.push({
      state: PENDING,
      level: INFO,
      code: "ledger.register",
      version: ">=2.1.0",
      text: "New Ledger functionality requires registering wallet details on device before signing a transaction.",
    });

    return messages;
  }

  get POLICY_HMAC() {
    if (this.policyHmac) return this.policyHmac?.toString("hex");
    return "";
  }

  set POLICY_HMAC(policyHmac: string) {
    this.policyHmac = Buffer.from(policyHmac, "hex");
  }

  async getXfp(): Promise<string> {
    return this.withApp(async (app: AppClient) => {
      return app.getMasterFingerprint();
    });
  }

  async registerWallet(verify = false): Promise<Buffer> {
    if (this.policyHmac && !verify) return Promise.resolve(this.policyHmac);

    // if we don't have a registered policy yet, then let's handle that
    return this.withApp(async (app: AppClient) => {
      const policy = this.walletPolicy.toLedgerPolicy();
      const [policyId, policyHmac] = await app.registerWallet(policy);
      const buff = Buffer.from(policyHmac);

      if (
        verify &&
        this.policyHmac &&
        this.policyHmac.toString("hex") !== buff.toString("hex")
      ) {
        console.error(
          `Policy registrations did not match. Expected ${this.policyHmac.toString(
            "hex"
          )}; Actual: ${buff.toString("hex")}`
        );
      }

      this.policyHmac = buff;
      this.policyId = policyId;

      return buff;
    });
  }
}

interface LedgerRegisterWalletPolicyArguments
  extends RegistrationConstructorArguments {
  verify?: boolean;
}
export class LedgerRegisterWalletPolicy extends LedgerBitcoinV2WithRegistrationInteraction {
  readonly verify: boolean;

  constructor({
    verify = false,
    policyHmac,
    ...walletConfig
  }: LedgerRegisterWalletPolicyArguments) {
    super({ policyHmac, ...walletConfig });
    this.verify = verify;
  }

  messages() {
    const messages = super.messages();

    if (!this.POLICY_HMAC || this.verify) {
      messages.push({
        state: ACTIVE,
        level: INFO,
        code: "ledger.register",
        version: ">=2.1.0",
        text: "Confirm each detail about your wallet policy: name, policy, and signing key details",
        messages: [
          {
            text: "Your ledger will first ask you to confirm the wallet name",
            action: LEDGER_RIGHT_BUTTON,
          },
          {
            text: "Next you will have to approve the policy, e.g. sh(sortedmulti(2,@0/**,@1/**,@2/**))",
            action: LEDGER_RIGHT_BUTTON,
          },
          {
            text: "Then you can approve the data you've seen",
            action: LEDGER_BOTH_BUTTONS,
          },
          {
            text: "Finally, approve the key info for each key (root fingerprint, bip32 path, and xpub)",
            action: LEDGER_RIGHT_BUTTON,
          },
        ],
      });
    }
    return messages;
  }

  async run() {
    try {
      await super.run();
      const policy = await this.registerWallet(this.verify);
      return Buffer.from(policy).toString("hex");
    } finally {
      await super.closeTransport();
    }
  }
}

interface ConfirmAddressConstructorArguments
  extends RegistrationConstructorArguments {
  // the expected address to compare against
  expected?: string;
  // whether or not to display the address to the user
  display?: boolean;
  bip32Path: string;
}

/**
 * Interaction for confirming an address on a ledger device. Requires a registered
 * wallet to complete successfully. Only supported on Ledger v2.1.0 or above.
 */
export class LedgerConfirmMultisigAddress extends LedgerBitcoinV2WithRegistrationInteraction {
  braidIndex: 0 | 1;

  addressIndex: number;

  readonly expected?: string;

  readonly display = true;

  constructor({
    policyHmac,
    // addressIndex,
    display,
    expected,
    bip32Path,
    // braidIndex,
    ...walletConfig
  }: ConfirmAddressConstructorArguments) {
    super({ policyHmac, ...walletConfig });

    // Get braid and address indexes from the bip32 path This should
    // always be the final 2 elements in the path.
    const [braidIndex, addressIndex] = bip32Path
      .split("/")
      .slice(-2)
      .map((index) => Number(index));

    if (braidIndex !== 1 && braidIndex !== 0) {
      throw new Error(`Invalid braid index ${braidIndex}`);
    }

    this.braidIndex = braidIndex;

    if (addressIndex < 0)
      throw new Error(`Invalid address index ${addressIndex}`);
    this.addressIndex = addressIndex;

    if (display) {
      this.display = display;
    }

    this.expected = expected;
  }

  /**
   * Adds messages about BIP32 path warnings.
   */
  messages() {
    const messages = super.messages();

    messages.push({
      state: PENDING,
      level: INFO,
      code: "ledger.confirm.address",
      version: ">2.1.0",
      text: `It can take a moment for the ledger to process the wallet and address data`,
    });

    if (this.display) {
      messages.push(
        {
          state: ACTIVE,
          level: INFO,
          code: "ledger.confirm.address",
          version: ">=2.1.0",
          text: `Confirm that the wallet name the address is from is correct`,
          action: LEDGER_RIGHT_BUTTON,
        },
        {
          state: ACTIVE,
          level: INFO,
          code: "ledger.confirm.address",
          version: ">=2.1.0",
          text: `Then your Ledger will show the address across several screens. Verify this matches the address you are confirming.`,
          action: LEDGER_RIGHT_BUTTON,
        }
      );
    }
    return messages;
  }

  getAddress(): Promise<string> {
    return this.withApp(async (app: AppClient) => {
      // make sure wallet is registered or has an hmac
      // before calling this method
      if (!this.POLICY_HMAC) {
        throw new Error(
          "Can't get wallet address without a wallet registration"
        );
      }
      return app.getWalletAddress(
        this.walletPolicy.toLedgerPolicy(),
        Buffer.from(this.POLICY_HMAC, "hex"),
        this.braidIndex,
        this.addressIndex,
        this.display
      );
    });
  }

  async run() {
    try {
      // run the app version support checks, register wallet if necessary
      await super.run();
      await this.registerWallet();
      // TODO doesn't handle catching error where policy doesn't match well
      return await this.getAddress();
    } finally {
      await super.closeTransport();
    }
  }
}

interface LedgerV2SignTxConstructorArguments
  extends RegistrationConstructorArguments {
  psbt: string | Buffer;

  progressCallback?: () => void;
  returnSignatureArray?: boolean;
}

type InputIndex = number;
// a Buffer with either a 33-byte compressed pubkey or a 32-byte
// x-only pubkey whose corresponding secret key was used to sign;
type PubKey = Buffer;
// a Buffer with the corresponding signature.
type SignatureBuffer = Buffer;

type LedgerSignature = { pubkey: PubKey; signature: SignatureBuffer };
// return type of ledger after signing
export type LedgerSignatures = [InputIndex, LedgerSignature];

export class LedgerV2SignMultisigTransaction extends LedgerBitcoinV2WithRegistrationInteraction {
  private psbt: PsbtV2;

  private returnSignatureArray: boolean;

  private signatures: LedgerSignatures[] = [];

  // optionally, a callback that will be called every time a signature is produced during
  //  * the signing process. The callback does not receive any argument, but can be used to track progress.
  public progressCallback?: () => void;

  // keeping this until we have a way to add signatures to psbtv2 directly
  // this will store the the PSBT that was was passed in via args
  private unsignedPsbt: string;

  constructor({
    psbt,
    progressCallback,
    policyHmac,
    returnSignatureArray = false,
    ...walletConfig
  }: LedgerV2SignTxConstructorArguments) {
    super({ policyHmac, ...walletConfig });

    if (progressCallback) this.progressCallback = progressCallback;
    this.returnSignatureArray = returnSignatureArray;

    this.unsignedPsbt = Buffer.isBuffer(psbt) ? psbt.toString("base64") : psbt;

    const psbtVersion = getPsbtVersionNumber(psbt);
    switch (psbtVersion) {
      case 0:
        this.psbt = PsbtV2.FromV0(psbt, true);
        break;
      case 2:
        this.psbt = new PsbtV2(psbt);
        break;
      default:
        throw new Error(`PSBT of unsupported version ${psbtVersion}`);
    }
  }

  async signPsbt(): Promise<LedgerSignatures[]> {
    return this.withApp(async (app: AppClient) => {
      const ledgerPsbt = new LedgerPsbtV2();
      ledgerPsbt.deserialize(
        Buffer.from(this.psbt.serialize("base64"), "base64")
      );
      this.signatures = await app.signPsbt(
        ledgerPsbt,
        this.walletPolicy.toLedgerPolicy(),
        Buffer.from(this.POLICY_HMAC, "hex") || null,
        this.progressCallback
      );
    });
  }

  get SIGNATURES() {
    return this.signatures.map((sig) =>
      Buffer.from(sig[1].signature).toString("hex")
    );
  }

  get SIGNED_PSTBT() {
    return addSignaturesToPSBT(
      this.network,
      this.unsignedPsbt,
      // array of pubkeys as buffers
      this.signatures.map((sig) => Buffer.from(sig[1].pubkey)),
      // array of sigs as buffers
      this.signatures.map((sig) => Buffer.from(sig[1].signature))
    );
  }

  async run() {
    try {
      // run the app version support checks, register wallet if necessary
      await super.run();
      await this.registerWallet();
      await this.signPsbt();
      if (this.returnSignatureArray) return this.SIGNATURES;
      return this.SIGNED_PSTBT;
    } finally {
      await super.closeTransport();
    }
  }
}
