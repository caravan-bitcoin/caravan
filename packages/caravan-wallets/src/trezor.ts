/**
 * Constant defining Trezor interactions.
 */
export const TREZOR = "trezor";

/**
 * Provides classes for interacting with Trezor hardware wallets.
 *
 * The base class provided is `TrezorInteraction` which wraps calls to [`TrezorConnect`]{@link https://github.com/trezor/connect}.  New interactions should subclass `TrezorInteraction`.
 *
 * Many Trezor calls require knowing the bitcoin network.  This
 * library uses the API defined by `@caravan/bitcoin` to label
 * bitcoin networks, and this is the value expected in several off the
 * constructors for classes in this module.
 *
 * The value of the `network` is mapped internally to
 * `this.trezorCoin`.  This value is useful to subclasses implementing
 * the `params()` method as many TrezorConnect methods require the
 * `coin` parameter.
 *
 * The following API classes are implemented:
 *
 * * TrezorGetMetadata
 * * TrezorExportPublicKey
 * * TrezorExportExtendedPublicKey
 * * TrezorSignMultisigTransaction
 * * TrezorConfirmMultisigAddress
 */
import {
  bip32PathToSequence,
  multisigAddress,
  multisigPublicKeys,
  multisigRequiredSigners,
  multisigAddressType,
  P2SH,
  P2SH_P2WSH,
  P2WSH,
  networkData,
  validateBIP32Path,
  fingerprintToFixedLengthHex,
  addSignaturesToPSBT,
  Network,
} from "@caravan/bitcoin";
import { translatePSBT } from "@caravan/psbt";
import TrezorConnectDefault, {
  TrezorConnect as TrezorConnectType,
} from "@trezor/connect-web";
import { BigNumber } from "bignumber.js";
import { ECPair, payments, Payment } from "bitcoinjs-lib";

import { MULTISIG_ROOT } from "./constants";
import {
  DirectKeystoreInteraction,
  PENDING,
  ACTIVE,
  INFO,
  ERROR,
} from "./interaction";


/**
 * What's going on with this TrezorConnect import?
 * For some reason the way trezor/connect and trezor/connect-web export their default
 * export gets ignored from some build systems (it might be a webpack issue, but we haven't been
 * able to narrow it down exactly). In caravan-coordinator, the vite build is able to find
 * the default export correctly. In builds that don't respect the built @trezor/connect code,
 * the exports.default value and instead falls back to the tsbuild.__exportStar exports. When
 * this happens we need to pull the `TrezorConnect` object from the default property of the module.
 */
let TrezorConnect: TrezorConnectType & { default?: TrezorConnectType } =
  TrezorConnectDefault;

if (TrezorConnect && TrezorConnect.default) {
  TrezorConnect = TrezorConnect.default;
}

const ADDRESS_SCRIPT_TYPES = {
  [P2SH]: "SPENDMULTISIG",
  [P2SH_P2WSH]: "SPENDP2SHWITNESS",
  [P2WSH]: "SPENDWITNESS",
};

/**
 * Constant representing the action of pushing the left button on a
 * Trezor device.
 */
export const TREZOR_LEFT_BUTTON = "trezor_left_button";

/**
 * Constant representing the action of pushing the right button on a
 * Trezor device.
 */
export const TREZOR_RIGHT_BUTTON = "trezor_right_button";

/**
 * Constant representing the action of pushing both buttons on a
 * Trezor device.
 */
export const TREZOR_BOTH_BUTTONS = "trezor_both_buttons";

/**
 * Constant representing the action of pushing and holding the Confirm
 * button on a Trezor model T device.
 */
export const TREZOR_PUSH_AND_HOLD_BUTTON = "trezor_push_and_hold_button";

// eslint-disable-next-line no-process-env
const env_variables = { ...process.env }; // Accessing directly does not appear to work, let's make a copy

const ENV_TREZOR_CONNECT_URL =
  env_variables.TREZOR_CONNECT_URL ||
  env_variables.REACT_APP_TREZOR_CONNECT_URL ||
  env_variables.VITE_TREZOR_CONNECT_URL;
const ENV_TREZOR_BLOCKBOOK_URL =
  env_variables.TREZOR_BLOCKBOOK_URL ||
  env_variables.REACT_APP_TREZOR_BLOCKBOOK_URL ||
  env_variables.VITE_TREZOR_BLOCKBOOK_URL;

const TREZOR_CONNECT_URL =
  ENV_TREZOR_CONNECT_URL ||
  (typeof window === "undefined"
    ? ""
    : `https://${window?.location.hostname}:8088/`);
const TREZOR_BLOCKBOOK_URL =
  ENV_TREZOR_BLOCKBOOK_URL ||
  (typeof window === "undefined"
    ? ""
    : `http://${window?.location.hostname}:3035/`);

const TREZOR_DEV =
  env_variables.TREZOR_DEV ||
  env_variables.REACT_APP_TREZOR_DEV ||
  env_variables.VITE_TREZOR_DEV;

const TREZOR_APP_NAME = env_variables.TREZOR_APP_NAME || "Caravan";

try {
  TrezorConnect.init({
    connectSrc: TREZOR_DEV
      ? TREZOR_CONNECT_URL
      : "https://connect.trezor.io/9.6.0/", // pinning to this connect version to avoid backwards incompatible changes
    coreMode: "auto", // default value still required to enable WebUSB support
    lazyLoad: true, // this param prevents iframe injection until a TrezorConnect.method is called
    manifest: {
      appName: TREZOR_APP_NAME,
      email: "help@unchained.com",
      appUrl: "https://github.com/caravan-bitcoin/caravan",
    },
  });
} catch (e) {
  // We hit this if we run this code outside of a browser, for example
  // during unit testing.
  if (env_variables.NODE_ENV !== "test") {
    console.error("Unable to call TrezorConnect.manifest.");
  }
}

/**
 * Base class for interactions with Trezor hardware wallets.
 *
 * Assumes we are using TrezorConnect to talk to the device.
 *
 * Subclasses *must* implement a method `this.connectParams` which
 * returns a 2-element array.  The first element of this array should
 * be a `TrezorConnect` method to use (e.g. -
 * `TrezorConnect.getAddress`).  The second element of this array
 * should be the parameters to pass to the given `TrezorConnect`
 * method.
 *
 * Errors thrown when calling TrezorConnect are not caught, so users
 * of this class (and its subclasses) should use `try...catch` as
 * always.
 *
 * Unsuccessful responses (the request succeeded but the Trezor device
 * returned an error message) are intercepted and thrown as errors.
 * This allows upstream `try...catch` blocks to intercept errors &
 * failures uniformly.
 *
 * Subclasses *may* implement the `parse(payload)` method which
 * accepts the response payload object and returns the relevant data.
 *
 * Subclasses will also want to implement a `messages()` method to
 * manipulate the messages returned to the user for each interaction.
 *
 * @example
 * import {TrezorInteraction} from "@caravan/wallets";
 * // Simple subclass
 *
 * class SimpleTrezorInteraction extends TrezorInteraction {
 *
 *   constructor({network, param}) {
 *     super({network});
 *     this.param =  param;
 *   }
 *
 *   connectParams() {
 *     return [
 *       TrezorConnect.doSomething, // Not a real TrezorConnect function...
 *       {
 *         // Many Trezor methods require the `coin` parameter.  The
 *         // value of `this.trezorCoin` is set appropriately based on the
 *         // `network` provided in the constructor.
 *         coin: this.trezorCoin,
 *
 *         // Pass whatever arguments are required
 *         // by the TrezorConnect function being called.
 *         param: this.param,
 *         // ...
 *       }
 *     ];
 *   }
 *
 *   parsePayload(payload) {
 *     return payload.someValue;
 *   }
 *
 * }
 * // usage
 * import {Network} from "@caravan/bitcoin";
 * const interaction = new SimpleTrezorInteraction({network: Network.MAINNET, param: "foo"});
 * const result = await interaction.run();
 * console.log(result); // someValue from payload
 */
export class TrezorInteraction extends DirectKeystoreInteraction {
  network: Network | null;

  trezorCoin: string;

  constructor({ network }: { network: Network | null }) {
    super();
    this.network = network;
    this.trezorCoin = trezorCoin(network);
  }

  /**
   * Default messages are added asking the user to plug in their
   * Trezor device (`device.connect`) and about the TrezorConnect
   * popups (`trezor.connect.generic`).
   *
   * Subclasses should override this method and add their own messages
   * (don't forget to call `super()`).
   */
  messages() {
    const messages = super.messages();

    messages.push({
      version: "One",
      state: PENDING,
      level: INFO,
      text: "Make sure your Trezor device is plugged in.",
      code: "device.connect",
    });

    messages.push({
      version: "T",
      state: PENDING,
      level: INFO,
      text: "Make sure your Trezor device is plugged in and unlocked.",
      code: "device.connect",
    });

    messages.push({
      state: ACTIVE,
      level: INFO,
      text: "Your browser should now open a new window to Trezor Connect. Ensure you have enabled popups for this site.",
      code: "trezor.connect.generic",
    });

    return messages;
  }

  /**
   * Awaits the call of `this.method`, passing in the output of
   * `this.params()`.
   *
   * If the call returns but is unsuccessful (`result.success`) is
   * false, will throw the returned error message.  If some other
   * error is thrown, it will not be caught.
   *
   * Otherwise it returns the result of passing `result.payload` to
   * `this.parsePayload`.
   */
  async run() {
    const [method, params] = this.connectParams();

    if (TREZOR_DEV && method === TrezorConnect.signTransaction) {
      await TrezorConnect.blockchainSetCustomBackend({
        coin: "Regtest",
        blockchainLink: {
          type: "blockbook",
          url: [TREZOR_BLOCKBOOK_URL],
        },
      });
    }

    if (typeof method === "function") {
      const result = await method(params);
      if (!result.success) {
        throw new Error(result.payload.error);
      }
      return this.parsePayload(result.payload);
    } else {
      throw new Error("TrezorConnect method is not a function");
    }
  }

  /**
   * Override this method in a subclass to return a 2-element array.
   *
   * The first element should be a functin to call, typically a
   * `TrezorConnect` method, e.g. `TrezorConnect.getAddress`.
   *
   * The second element should be the parameters to pass to this
   * function.
   *
   * By default, the function passed just throws an error.
   */
  connectParams() {
    return [
      () => {
        throw new Error(
          "Override the `connectParams` method on a subclass of TrezorInteraction."
        );
      },
      {},
    ];
  }

  /**
   * Override this method in a subclass to parse the payload of a
   * successful response from the device.
   *
   * By default, the entire payload is returned.
   */
  parsePayload(payload) {
    return payload;
  }
}

/**
 * Returns metadata about Trezor device.
 *
 * Includes model name, device label, firmware version, &
 * PIN/passphrase enablement.
 *
 * @example
 * import {TrezorGetMetadata} from "@caravan/wallets";
 * const interaction = new TrezorGetMetadata();
 * const result = await interaction.run();
 * console.log(result);
 * {
 *   spec: "Model 1 v1.8.3 w/PIN",
 *   model: "Model 1",
 *   version: {
 *     major: 1,
 *     minor: 8,
 *     patch: 3,
 *     string: "1.8.3",
 *   },
 *   label: "My Trezor",
 *   pin: true,
 *   passphrase: false,
 * }
 */
export class TrezorGetMetadata extends TrezorInteraction {
  /**
   * This class doesn't actually require a `network`.
   */
  constructor() {
    super({ network: null });
  }

  /**
   * It is underdocumented, but TrezorConnect does support the
   * `getFeatures` API call.
   *
   * See {@link https://github.com/trezor/connect/blob/v8/src/js/core/methods/GetFeatures.js}.
   */
  connectParams() {
    return [TrezorConnect.getFeatures, {}];
  }

  /**
   * Parses Trezor device featuress into an appropriate metadata
   * shape.
   */
  parsePayload(payload) {
    // Example result:
    //
    // {
    //   bootloader_hash: "5112...846e9"
    //   bootloader_mode: null
    //   device_id: "BDF9...F198"
    //   firmware_present: null
    //   flags: 0
    //   fw_major: null
    //   fw_minor: null
    //   fw_patch: null
    //   fw_vendor: null
    //   fw_vendor_keys: null
    //   imported: false
    //   initialized: true
    //   label: "My Trezor"
    //   language: null
    //   major_version: 1
    //   minor_version: 6
    //   model: "1"
    //   needs_backup: false
    //   no_backup: null
    //   passphrase_cached: false
    //   passphrase_protection: false
    //   patch_version: 3
    //   pin_cached: true
    //   pin_protection: true
    //   revision: "ef8...862d7"
    //   unfinished_backup: null
    //   vendor: "bitcointrezor.com"
    // }
    const {
      major_version,
      minor_version,
      patch_version,
      label,
      model,
      pin_protection,
      passphrase_protection,
    } = payload;
    let spec = `Model ${model} v.${major_version}.${minor_version}.${patch_version}`;
    if (pin_protection) {
      spec += " w/PIN";
    }
    if (passphrase_protection) {
      spec += " w/PASS";
    }
    return {
      spec,
      model: `Model ${model}`,
      version: {
        major: major_version,
        minor: minor_version,
        patch: patch_version,
        string: `${major_version}.${minor_version}.${patch_version}`,
      },
      label,
      pin: pin_protection,
      passphrase: passphrase_protection,
    };
  }
}

/**
 * Base class for interactions exporting information about an HD node
 * at a given BIP32 path.
 *
 * You may want to use `TrezorExportPublicKey` or
 * `TrezorExportExtendedPublicKey` directly.
 *
 * @example
 * import {Network} from "@caravan/bitcoin";
 * import {TrezorExportHDNode} from "@caravan/wallets";
 * const interaction = new TrezorExportHDNode({network: Network.MAINNET, bip32Path: "m/48'/0'/0'/2'/0"});
 * const node = await interaction.run();
 * console.log(node); // {publicKey: "", xpub: "", ...}
 *
 */
export class TrezorExportHDNode extends TrezorInteraction {
  bip32Path: string;

  includeXFP: boolean;

  bip32ValidationErrorMessage: { text?: string; code?: string };

  constructor({ network, bip32Path, includeXFP = false }) {
    super({ network });
    this.bip32Path = bip32Path;
    this.includeXFP = includeXFP;
    this.bip32ValidationErrorMessage = {};
    const bip32PathError = validateBIP32Path(bip32Path);
    if (bip32PathError.length) {
      this.bip32ValidationErrorMessage = {
        text: bip32PathError,
        code: "trezor.bip32_path.path_error",
      };
    }
  }

  /**
   * Adds messages related to warnings Trezor devices make depending
   * on the BIP32 path passed.
   */
  messages() {
    const messages = super.messages();

    const bip32PathSegments = (this.bip32Path || "").split("/");
    if (bip32PathSegments.length < 4) {
      // m, 45', 0', 0', ...
      messages.push({
        state: PENDING,
        level: ERROR,
        text: "BIP32 path must be at least depth 3.",
        code: "trezor.bip32_path.minimum",
      });
    }

    if (Object.entries(this.bip32ValidationErrorMessage).length) {
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
      text: "Confirm in the Trezor Connect window that you want to 'Export public key'. You may be prompted to enter your PIN.",
      code: "trezor.connect.export_hdnode",
    });

    return messages;
  }

  extractDetailsFromPayload({ payload, pubkey }) {
    if (payload.length !== 2) {
      throw new Error("Payload does not have two responses.");
    }
    let keyMaterial = "";
    let rootFingerprint = "";
    for (let i = 0; i < payload.length; i++) {
      // Find the payload with bip32 = MULTISIG_ROOT to get xfp
      if (payload[i].serializedPath === MULTISIG_ROOT) {
        let fp = payload[i].fingerprint;
        rootFingerprint = fingerprintToFixedLengthHex(fp);
      } else {
        keyMaterial = pubkey ? payload[i].publicKey : payload[i].xpub;
      }
    }
    return {
      rootFingerprint,
      keyMaterial,
    };
  }

  /**
   * See {@link https://github.com/trezor/connect/blob/v8/docs/methods/getPublicKey.md}.
   */
  connectParams() {
    if (this.includeXFP) {
      return [
        TrezorConnect.getPublicKey,
        {
          bundle: [{ path: this.bip32Path }, { path: MULTISIG_ROOT }],
          coin: this.trezorCoin,
          crossChain: true,
        },
      ];
    }
    return [
      TrezorConnect.getPublicKey,
      {
        path: this.bip32Path,
        coin: this.trezorCoin,
        crossChain: true,
      },
    ];
  }
}

/**
 * Returns the public key at a given BIP32 path.
 *
 * @example
 * import {Network} from "@caravan/bitcoin";
 * import {TrezorExportPublicKey} from "@caravan/wallets";
 * const interaction = new TrezorExportPublicKey({network: Network.MAINNET, bip32Path: "m/48'/0'/0'/2'/0"});
 * const publicKey = await interaction.run();
 * console.log(publicKey);
 * // "03..."
 */
export class TrezorExportPublicKey extends TrezorExportHDNode {
  constructor({ network, bip32Path, includeXFP = false }) {
    super({
      network,
      bip32Path,
      includeXFP,
    });
    this.includeXFP = includeXFP;
  }

  /**
   * Parses the public key from the HD node response.
   *
   */
  parsePayload(payload) {
    if (this.includeXFP) {
      const { rootFingerprint, keyMaterial } = this.extractDetailsFromPayload({
        payload,
        pubkey: true,
      });
      return {
        rootFingerprint,
        publicKey: keyMaterial,
      };
    }
    return payload.publicKey;
  }
}

/**
 * Returns the extended public key at a given BIP32 path.
 *
 * @example
 * import {Network} from "@caravan/bitcoin";
 * import {TrezorExportExtendedPublicKey} from "@caravan/wallets";
 * const interaction = new TrezorExportExtendedPublicKey({network: Network.MAINNET, bip32Path: "m/48'/0'/0'"});
 * const xpub = await interaction.run();
 * console.log(xpub);
 * // "xpub..."
 */
export class TrezorExportExtendedPublicKey extends TrezorExportHDNode {
  constructor({ network, bip32Path, includeXFP = false }) {
    super({
      network,
      bip32Path,
      includeXFP,
    });
    this.includeXFP = includeXFP;
  }

  /**
   * Parses the extended public key from the HD node response.
   *
   * If asking for XFP, return object with xpub and the root fingerprint.
   */
  parsePayload(payload) {
    if (this.includeXFP) {
      const { rootFingerprint, keyMaterial } = this.extractDetailsFromPayload({
        payload,
        pubkey: false,
      });
      return {
        rootFingerprint,
        xpub: keyMaterial,
      };
    }
    return payload.xpub;
  }
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
 * import {TrezorSignMultisigTransaction} from "@caravan/wallets";
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
 * const interaction = new TrezorSignMultisigTransaction({
 *   network: TESTNET,
 *   inputs,
 *   outputs,
 *   bip32Paths: ["m/45'/0'/0'/0", // add more, 1 per input],
 * });
 * const signature = await interaction.run();
 * console.log(signatures);
 * // ["ababab...", // 1 per input]
 */
export class TrezorSignMultisigTransaction extends TrezorInteraction {
  inputs: any[];

  outputs: any[];

  bip32Paths: string[];

  psbt?: string;

  returnSignatureArray?: boolean;

  pubkeys?: any;

  constructor({
    network,
    inputs,
    outputs,
    bip32Paths,
    psbt,
    keyDetails,
    returnSignatureArray,
    addressType,
  }) {
    super({ network });
    if (!psbt || !keyDetails) {
      this.inputs = inputs;
      this.outputs = outputs;
      this.bip32Paths = bip32Paths;
    } else {
      this.psbt = psbt;
      this.returnSignatureArray = returnSignatureArray || false;
      if (typeof this.psbt !== "string") {
        throw new Error("PSBT must be a string");
      }
      const translatedPsbt = translatePSBT(
        network,
        addressType,
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
  }

  /**
   * Adds messages describing the signing flow.
   */
  messages() {
    const messages = super.messages();

    messages.push({
      state: ACTIVE,
      level: INFO,
      text: `Confirm in the Trezor Connect window that you want to 'Sign ${this.network} transaction'.  You may be prompted to enter your PIN.`,
      code: "trezor.connect.sign",
    });

    messages.push({
      state: ACTIVE,
      level: INFO,
      version: "One",
      text: "Confirm each output on your Trezor device and approve the transaction.",
      messages: [
        {
          text: "For each output, your Trezor device will display the output amount and address.",
          action: TREZOR_RIGHT_BUTTON,
        },
        {
          text: "Your Trezor device will display the total output amounts and fee amount.",
          action: TREZOR_RIGHT_BUTTON,
        },
      ],
      code: "trezor.sign",
    });

    messages.push({
      state: ACTIVE,
      level: INFO,
      version: "T",
      text: "Confirm each output on your Trezor device and approve the transaction.",
      messages: [
        {
          text: `For each input, your Trezor device will display a "Confirm path" dialogue displaying the input BIP32 path.  It is safe to continue`,
          action: TREZOR_RIGHT_BUTTON,
        },
        {
          text: `For each output, your Trezor device will display a "Confirm sending" dialogue displaying the output amount and address.`,
          action: TREZOR_RIGHT_BUTTON,
        },
        {
          text: `Your Trezor device will display the "Confirm transaction" dialogue displaying the total output amount and fee amount.`,
          action: TREZOR_PUSH_AND_HOLD_BUTTON,
        },
      ],
      code: "trezor.sign",
    });

    return messages;
  }

  /**
   * See {@link https://github.com/trezor/connect/blob/v8/docs/methods/signTransaction.md}.
   */
  connectParams() {
    return [
      TrezorConnect.signTransaction,
      {
        inputs: this.inputs.map((input, inputIndex) =>
          trezorInput(input, this.bip32Paths[inputIndex])
        ),
        outputs: this.outputs.map((output) => trezorOutput(output)),
        coin: this.trezorCoin,
      },
    ];
  }

  /**
   * Parses the signature(s) out of the response payload.
   *
   * Ensures each input's signature hasa a trailing `...01` {@link https://bitcoin.org/en/glossary/sighash-all SIGHASH_ALL} byte.
   */
  parsePayload(payload) {
    // If we were passed a PSBT initially, we want to return a PSBT with partial signatures
    // rather than the normal array of signatures.
    if (this.psbt && !this.returnSignatureArray) {
      return addSignaturesToPSBT(
        this.network,
        this.psbt,
        this.pubkeys,
        this.parseSignature(payload.signatures, "buffer")
      );
    } else {
      return this.parseSignature(payload.signatures, "hex");
    }
  }
}

/*
 * Shows a multisig address on the device and prompts the user to
 * confirm it.
 * If the optional publicKey parameter is used, the public key at
 * the given BIP32 path is checked, returning an error if they don't match.
 *
 * Without the publicKey parameter, this function simply checks that the
 * public key at the given BIP32 path is in the redeemscript (with
 * validation on-device.
 *
 * @example
 * import {
 *   generateMultisigFromPublicKeys, Network, P2SH,
 * } from "@caravan/bitcoin";
 * import {TrezorConfirmMultisigAddress} from "@caravan/wallets";
 * import * as TrezorRest from '@trezor/connect-web';
 * import * as TrezorConnect from '@trezor/connect-web';
 * const multisig = generateMultisigFromPublicKeys(Network.MAINNET, P2SH, 2, "03a...", "03b...");
 * const interaction = new TrezorConfirmMultisigAddress({network: Network.MAINNET, bip32Path: "m/45'/0'/0'/0/0", multisig});
 * await interaction.run();
 */
export class TrezorConfirmMultisigAddress extends TrezorInteraction {
  bip32Path: string;

  multisig: any;

  publicKey: string;

  constructor({ network, bip32Path, multisig, publicKey }) {
    super({ network });
    this.bip32Path = bip32Path;
    this.multisig = multisig;
    this.publicKey = publicKey;
  }

  /**
   * Adds messages about BIP32 path warnings.
   */
  messages() {
    const messages = super.messages();

    if (this.publicKey) {
      messages.push({
        state: ACTIVE,
        level: INFO,
        text: `Confirm in the Trezor Connect window that you want to ‘Export multiple ${this.trezorCoin} addresses’. You may be prompted to enter your PIN. You may also receive a warning about your selected BIP32 path.`,
        code: "trezor.connect.confirm_address",
      });
    } else {
      messages.push({
        state: ACTIVE,
        level: INFO,
        text: `Confirm in the Trezor Connect window that you want to 'Export ${this.trezorCoin} address'.  You may be prompted to enter your PIN.`,
        code: "trezor.connect.confirm_address",
      });
    }

    messages.push({
      state: ACTIVE,
      level: INFO,
      version: "One",
      text: "It is safe to continue and confirm the address on your Trezor device.",
      messages: [
        // FIXME this only shows up on P2SH?
        {
          text: `Your Trezor device may display a warning "Wrong address path for selected coin".  It is safe to continue`,
          action: TREZOR_RIGHT_BUTTON,
        },
        {
          text: `Your Trezor device will display the multisig address and BIP32 path.`,
          action: TREZOR_RIGHT_BUTTON,
        },
      ],
      code: "trezor.confirm_address",
    });

    messages.push({
      state: ACTIVE,
      level: INFO,
      version: "T",
      text: "Confirm the addresss on your Trezor device.",
      messages: [
        {
          text: `For each signer in your quorum, your Trezor device will display a "Confirm path" dialogue displaying the signer's BIP32 path.  It is safe to continue`,
          action: TREZOR_RIGHT_BUTTON,
        },
        {
          text: `Your Trezor device will display the multisig address.`,
          action: TREZOR_RIGHT_BUTTON,
        },
      ],
      code: "trezor.confirm_address",
    });

    return messages;
  }

  /**
   * See {@link https://github.com/trezor/connect/blob/v8/docs/methods/getAddress.md}.
   */
  connectParams() {
    if (this.publicKey) {
      return [
        TrezorConnect.getAddress,
        {
          bundle: [
            {
              path: this.bip32Path,
              showOnTrezor: false,
              coin: this.trezorCoin,
              crossChain: true,
            },
            {
              path: this.bip32Path,
              address: multisigAddress(this.multisig),
              showOnTrezor: true,
              coin: this.trezorCoin,
              crossChain: true,
              multisig: {
                m: multisigRequiredSigners(this.multisig),
                pubkeys: multisigPublicKeys(this.multisig).map((publicKey) =>
                  trezorPublicKey(publicKey)
                ),
              },
              scriptType:
                ADDRESS_SCRIPT_TYPES[multisigAddressType(this.multisig)],
            },
          ],
        },
      ];
    } else {
      return [
        TrezorConnect.getAddress,
        {
          path: this.bip32Path,
          address: multisigAddress(this.multisig),
          showOnTrezor: true,
          coin: this.trezorCoin,
          crossChain: true,
          multisig: {
            m: multisigRequiredSigners(this.multisig),
            pubkeys: multisigPublicKeys(this.multisig).map((publicKey) =>
              trezorPublicKey(publicKey)
            ),
          },
          scriptType: ADDRESS_SCRIPT_TYPES[multisigAddressType(this.multisig)],
        },
      ];
    }
  }

  parsePayload(payload) {
    if (!this.publicKey) {
      return payload;
    }
    const keyPair = ECPair.fromPublicKey(Buffer.from(this.publicKey, "hex"));
    let payment: Payment = { pubkey: keyPair.publicKey };
    if (this.network) {
      payment.network = networkData(this.network);
    }
    const { address } = payments.p2pkh(payment);
    if (address !== payload[0].address && address !== payload[1].address) {
      throw new Error("Wrong public key specified");
    }
    return payload;
  }
}

/**
 * Returns a signature for a message given a bip32 path.
 */
export class TrezorSignMessage extends TrezorInteraction {
  bip32Path: string;

  message: string;

  bip32ValidationErrorMessage: any;

  constructor({ network = "", bip32Path = "", message = "" }) {
    super({ network: Network[network] });
    this.bip32Path = bip32Path;
    this.message = message;

    this.bip32ValidationErrorMessage = {};
    const bip32PathError = validateBIP32Path(bip32Path);
    if (bip32PathError.length) {
      this.bip32ValidationErrorMessage = {
        text: bip32PathError,
        code: "trezor.bip32_path.path_error",
      };
    }
  }

  /**
   * Adds messages describing the signing flow.
   */
  messages() {
    const messages = super.messages();

    const bip32PathSegments = (this.bip32Path || "").split("/");
    if (bip32PathSegments.length < 4) {
      // m, 45', 0', 0', ...
      messages.push({
        state: PENDING,
        level: ERROR,
        text: "BIP32 path must be at least depth 3.",
        code: "trezor.bip32_path.minimum",
      });
    }

    if (Object.entries(this.bip32ValidationErrorMessage).length) {
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
      text: "Confirm in the Trezor Connect window that you want to 'Sign message'.  You may be prompted to enter your PIN.",
      code: "trezor.connect.sign",
    });

    messages.push({
      state: ACTIVE,
      level: INFO,
      text: "Confirm the message to be signed on your Trezor device and approve for signing.",
      code: "trezor.sign",
    });

    return messages;
  }

  /**
   * See {@link https://github.com/trezor/connect/blob/v8/docs/methods/signMessage.md}.
   */
  connectParams() {
    return [
      TrezorConnect.signMessage,
      {
        path: this.bip32Path,
        message: this.message,
      },
    ];
  }
}

/**
 * Returns the Trezor API version of the given network.
 */
export function trezorCoin(network: Network | null) {
  const testnet_network = TREZOR_DEV ? "Regtest" : "Testnet";
  return network === Network.MAINNET ? "Bitcoin" : testnet_network;
}

function trezorInput(input, bip32Path) {
  const requiredSigners = multisigRequiredSigners(input.multisig);
  const publicKeys = multisigPublicKeys(input.multisig);
  const addressType = multisigAddressType(input.multisig);
  const spendType = ADDRESS_SCRIPT_TYPES[addressType];
  return {
    script_type: spendType,
    multisig: {
      m: requiredSigners,
      pubkeys: publicKeys.map((publicKey) => trezorPublicKey(publicKey)),
      signatures: Array(publicKeys.length).fill(""),
    },
    prev_hash: input.txid,
    prev_index: input.index,
    address_n: bip32PathToSequence(bip32Path),
    ...(input.amountSats && {
      amount: new BigNumber(input.amountSats).toString(),
    }),
  };
}

function trezorPublicKey(publicKey) {
  return {
    address_n: [],
    node: {
      // FIXME are all these 0's OK?
      depth: 0,
      child_num: 0,
      fingerprint: 0,
      chain_code: "0".repeat(64),
      public_key: publicKey,
    },
  };
}

function trezorOutput(output) {
  return {
    amount: new BigNumber(output.amountSats).toFixed(0),
    address: output.address,
    script_type: "PAYTOADDRESS",
  };
}
