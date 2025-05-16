/*** This module provides classes for BitBox hardware wallets.
 *
 * The following API classes are implemented:
 *
 * * BitBoxGetMetadata
 * * BitBoxExportPublicKey
 * * BitBoxExportExtendedPublicKey
 * * BitBoxSignMultisigTransaction
 */

import {
  BitcoinNetwork,
  getPsbtVersionNumber,
  PsbtV2,
  ExtendedPublicKey,
  MultisigAddressType,
} from "@caravan/bitcoin";
import {
  BtcCoin,
  BtcMultisigScriptType,
  BtcScriptConfig,
  PairedBitBox,
} from 'bitbox-api';

import {
  ACTIVE,
  PENDING,
  INFO,
  DirectKeystoreInteraction,
} from "./interaction";
import { MultisigWalletConfig } from "./types";


/**
 * Constant defining BitBox interactions.
 */
export const BITBOX = "bitbox";

// Callback for showing the BitBox pairing code. It returns a function to hide it again.
export type TShowPairingCode = (pairingCode: string) => (() => void) | null;

function convertNetwork(network: BitcoinNetwork): BtcCoin {
  switch (network) {
    case 'mainnet':
      return 'btc';
    case 'regtest':
      return 'rbtc';
    default:
      return 'tbtc';
  }
}

function convertToBtcMultisigScriptType(addressType: MultisigAddressType): BtcMultisigScriptType {
  switch (addressType) {
    case 'P2WSH':
      return 'p2wsh';
    case 'P2SH-P2WSH':
      return 'p2wshP2sh';
    default:
      throw new Error(`BitBox does not support ${addressType} multisig.`);
  }
}

async function convertMultisig(pairedBitBox: PairedBitBox, walletConfig: MultisigWalletConfig): Promise<{ scriptConfig: BtcScriptConfig; keypathAccount: string; }> {
  const ourRootFingerprint = await pairedBitBox.rootFingerprint();

  const ourXpubIndex = walletConfig.extendedPublicKeys.findIndex(key => key.xfp == ourRootFingerprint);
  if (ourXpubIndex === -1) {
    throw new Error('This BitBox02 seems to not be present in the multisig quorum.');
  }
  const scriptConfig = {
    multisig: {
      threshold: walletConfig.quorum.requiredSigners,
      scriptType: convertToBtcMultisigScriptType(walletConfig.addressType),
      xpubs: walletConfig.extendedPublicKeys.map(key => key.xpub),
      ourXpubIndex,
    },
  };
  const keypathAccount = walletConfig.extendedPublicKeys[ourXpubIndex].bip32Path;
  return {
    scriptConfig,
    keypathAccount,
  }
}

/**
 * Base class for interactions with BitBox hardware wallets.
 *
 * Subclasses must implement their own `run()` method.  They may use
 * the `withDevice` method to connect to the BitBox API.
 *
 * @example
 * import {BitBoxInteraction} from "@caravan/wallets";
 * // Simple subclass
 *
 * class SimpleBitBoxInteraction extends BitBoxInteraction {
 *
 *   constructor({param}) {
 *     super({});
 *     this.param =  param;
 *   }
 *
 *   async run() {
 *     return await this.withDevice(async (pairedBitBox) => {
 *       return pairedBitBox.doSomething(this.param); // Not a real BitBox API call
 *     });
 *   }
 *
 * }
 *
 * // usage
 * const interaction = new SimpleBitBoxInteraction({param: "foo"});
 * const result = await interaction.run();
 * console.log(result); // whatever value `app.doSomething(...)` returns
 *
 * The `showPairingCode` callback can be supplied to display and hide the BitBox pairing code.
 * If not provided, the default is to open a browser popup showing the pairing code.
 */
export class BitBoxInteraction extends DirectKeystoreInteraction {
  appVersion?: string;

  appName?: string;

  showPairingCode?: TShowPairingCode;

  constructor({ showPairingCode }: { showPairingCode?: TShowPairingCode }) {
    super();
    this.showPairingCode = showPairingCode;
  }

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
      text: "Please plug in your BitBox.",
      code: "device.setup",
    });
    messages.push({
      state: ACTIVE,
      level: INFO,
      text: "Communicating with BitBox...",
      code: "device.active",
    });
    return messages;
  }

  showPairingCodePopup(pairingCode: string): (() => void) | null {
    if (this.showPairingCode) {
      return this.showPairingCode(pairingCode);
    }
    const htmlContent = `
<!doctype html>
<html>
  <head>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta charset="utf-8">
    <title>BitBox02 pairing</title>
  </head>
  <body>
    <h1 style="text-align:center;">BitBox02 pairing code</h1>
    <div id="code" style="white-space:pre;font-family:monospace,monospace;text-align:center;font-size:large;"></div>
  </body>
</html>
`;
    const popup = window.open(
      '',
      'popupWindow',
      'width=400,height=300',
    );
    if (popup) {
      popup.document.write(htmlContent);
      popup.document.close();
      const codeElement = popup.document.getElementById("code");
      if (codeElement) {
        const textNode = popup.document.createTextNode(pairingCode);
        codeElement.appendChild(textNode);
      }
      return () => {
        popup.close();
      };
    }
    return null;
  }

  async withDevice<T>(f: (device: PairedBitBox) => Promise<T>): Promise<T> {
    const bitbox = await import('bitbox-api');

    let hidePairingCode: (() => void) | null = null;
    try {
      const unpaired = await bitbox.bitbox02ConnectAuto(() => {
        if (hidePairingCode) {
          hidePairingCode();
        }
      })
      const pairing = await unpaired.unlockAndPair()
      const pairingCode = pairing.getPairingCode()
      if (pairingCode) {
        hidePairingCode = this.showPairingCodePopup(pairingCode);
        // TODO: display pairing code to the user.
        console.log('Pairing code:', pairingCode);
      }
      const pairedBitBox = await pairing.waitConfirm()
      if (hidePairingCode) {
        hidePairingCode();
      }
      try {
        return await f(pairedBitBox)
      } finally {
        pairedBitBox.close()
      }
    } catch (err) {
      const typedErr = bitbox.ensureError(err)
      const isErrorUnknown = typedErr.code === 'unknown-js'
      const errorMessage = isErrorUnknown ? typedErr.err! : typedErr.message
      throw new Error(errorMessage);
    } finally {
      if (hidePairingCode) {
        hidePairingCode();
      }
    }
  }

  async maybeRegisterMultisig(pairedBitBox: PairedBitBox, walletConfig: MultisigWalletConfig): Promise<{ scriptConfig: BtcScriptConfig, keypathAccount: string; }> {
    const { scriptConfig, keypathAccount } = await convertMultisig(pairedBitBox, walletConfig);
    const isRegistered = await pairedBitBox.btcIsScriptConfigRegistered(
      convertNetwork(walletConfig.network),
      scriptConfig,
      keypathAccount,
    );
    // No name means the user inputs it on the device.
    // eslint-disable-next-line no-undefined
    const name = undefined;
    if (!isRegistered) {
      await pairedBitBox.btcRegisterScriptConfig(
        convertNetwork(walletConfig.network),
        scriptConfig,
        keypathAccount,
        'autoXpubTpub',
        name,
      );
    }
    return { scriptConfig, keypathAccount };
  }

  // Dummy to satsify the return types of all subclass run() functions.
  async run(): Promise<any> {
  }
}

/**
 * Returns metadata about the BitBox device.
 *
 * @example
 * import {BitBoxGetMetadata} from "@caravan/wallets";
 * const interaction = new BitBoxGetMetadata();
 * const result = await interaction.run();
 * console.log(result);
 * {
 *   spec: "bitbox02-btconly 9.18.0",
 *   version: {
 *     major: "9",
 *     minor: "18",
 *     patch: "0",
 *     string: "9.18.0"",
 *   },

 *   model: "bitbox02-btconly",
 * }
 *
 */
export class BitBoxGetMetadata extends BitBoxInteraction {
  constructor({ showPairingCode }: { showPairingCode?: TShowPairingCode }) {
    super({ showPairingCode });
  }

  async run() {
    return this.withDevice(async (pairedBitBox) => {
      const product = pairedBitBox.product();
      const version = pairedBitBox.version();
      const [majorVersion, minorVersion, patchVersion] = (version || "").split(
        "."
      );
      return {
        spec: `${product} v${version}`,
        version: {
          major: majorVersion,
          minor: minorVersion,
          patch: patchVersion,
          string: version,
        },
        model: product,
      };
    });
  }
}

/**
 * Class for public key interaction at a given BIP32 path.
 */
export class BitBoxExportPublicKey extends BitBoxInteraction {
  network: BitcoinNetwork;

  bip32Path: string;

  includeXFP: boolean;

  /**
   * @param {string} bip32Path path
   * @param {boolean} includeXFP - return xpub with root fingerprint concatenated
   */
  constructor({ showPairingCode, network, bip32Path, includeXFP }: {
    showPairingCode?: TShowPairingCode;
    network: BitcoinNetwork;
    bip32Path: string;
    includeXFP: boolean;
  }) {
    super({ showPairingCode });
    this.network = network;
    this.bip32Path = bip32Path;
    this.includeXFP = includeXFP;
  }

  messages() {
    return super.messages();
  }

  /**
   * Retrieve the compressed public key for a given BIP32 path
   */
  async run() {
    return await this.withDevice(async (pairedBitBox) => {
      const xpub = await pairedBitBox.btcXpub(
        convertNetwork(this.network),
        this.bip32Path,
        this.network === 'mainnet' ? 'xpub' : 'tpub',
        false);
      const publicKey = ExtendedPublicKey.fromBase58(xpub).pubkey;
      if (this.includeXFP) {
        const rootFingerprint = await pairedBitBox.rootFingerprint();
        return { publicKey, rootFingerprint };
      }
      return publicKey;
    });
  }
}

/**
 * Class for wallet extended public key (xpub) interaction at a given BIP32 path.
 */
export class BitBoxExportExtendedPublicKey extends BitBoxInteraction {
  bip32Path: string;

  network: BitcoinNetwork;

  includeXFP: boolean;

  /**
   * @param {string} bip32Path path
   * @param {string} network bitcoin network
   * @param {boolean} includeXFP - return xpub with root fingerprint concatenated
   */
  constructor({ showPairingCode, bip32Path, network, includeXFP }: {
    showPairingCode?: TShowPairingCode;
    network: BitcoinNetwork;
    bip32Path: string;
    includeXFP: boolean;
  }) {
    super({ showPairingCode });
    this.bip32Path = bip32Path;
    this.network = network;
    this.includeXFP = includeXFP;
  }

  messages() {
    return super.messages();
  }

  /**
   * Retrieve extended public key (xpub) from BitBox device for a given BIP32 path
   * @example
   * import {BitBoxExportExtendedPublicKey} from "@caravan/wallets";
   * const interaction = new BitBoxExportExtendedPublicKey({network, bip32Path});
   * const xpub = await interaction.run();
   * console.log(xpub);
   */
  async run() {
    return await this.withDevice(async (pairedBitBox) => {
      const xpub = await pairedBitBox.btcXpub(
        convertNetwork(this.network),
        this.bip32Path,
        this.network === 'mainnet' ? 'xpub' : 'tpub',
        false);
      if (this.includeXFP) {
        const rootFingerprint = await pairedBitBox.rootFingerprint();
        return { xpub, rootFingerprint };
      }
      return xpub;
    });
  }
}

export class BitBoxRegisterWalletPolicy extends BitBoxInteraction {
  walletConfig: MultisigWalletConfig;

  constructor({
    showPairingCode,
    walletConfig
  }: {
    showPairingCode?: TShowPairingCode;
    walletConfig: MultisigWalletConfig;
  }) {
    super({ showPairingCode });
    this.walletConfig = walletConfig;
  }

  messages() {
    const messages = super.messages();
    return messages;
  }

  async run() {
    return await this.withDevice(async (pairedBitBox) => {
      await this.maybeRegisterMultisig(pairedBitBox, this.walletConfig);
      // BitBox does not use HMACs for registrations, so we we don't return anything here.
    });
  }
}

export class BitBoxConfirmMultisigAddress extends BitBoxInteraction {
  network: BitcoinNetwork;

  bip32Path: string;

  walletConfig: MultisigWalletConfig;

  constructor({ showPairingCode, network, bip32Path, walletConfig }: {
    showPairingCode?: TShowPairingCode;
    network: BitcoinNetwork;
    bip32Path: string;
    walletConfig: MultisigWalletConfig;
  }) {
    super({ showPairingCode });
    this.network = network;
    this.bip32Path = bip32Path;
    this.walletConfig = walletConfig;
  }

  /**
   * Adds messages about BIP32 path warnings.
   */
  messages() {
    const messages = super.messages();
    return messages;
  }

  async run() {
    const display = true;
    return await this.withDevice(async (pairedBitBox) => {
      const { scriptConfig } = await this.maybeRegisterMultisig(pairedBitBox, this.walletConfig);
      const address = await pairedBitBox.btcAddress(
        convertNetwork(this.network),
        this.bip32Path,
        scriptConfig,
        display,
      );
      return {
        address,
        serializedPath: this.bip32Path,
      };
    });
  }
}

function parsePsbt(psbt: string): PsbtV2 {
  const psbtVersion = getPsbtVersionNumber(psbt);
  switch (psbtVersion) {
    case 0:
      return PsbtV2.FromV0(psbt, true);
    case 2:
      return new PsbtV2(psbt);
    default:
      throw new Error(`PSBT of unsupported version ${psbtVersion}`);
  }
}

export class BitBoxSignMultisigTransaction extends BitBoxInteraction {
  private walletConfig: MultisigWalletConfig;

  private returnSignatureArray: boolean;

  // keeping this until we have a way to add signatures to psbtv2 directly
  // this will store the the PSBT that was was passed in via args
  private unsignedPsbt: string;

  constructor({
    showPairingCode,
    walletConfig,
    psbt,
    returnSignatureArray = false,
  }: {
    showPairingCode?: TShowPairingCode;
    walletConfig: MultisigWalletConfig;
    psbt: any;
    returnSignatureArray: boolean;
  }) {
    super({ showPairingCode });
    this.walletConfig = walletConfig;
    this.returnSignatureArray = returnSignatureArray;

    this.unsignedPsbt = Buffer.isBuffer(psbt) ? psbt.toString("base64") : psbt;
  }

  async run() {
    return await this.withDevice(async (pairedBitBox) => {
      const { scriptConfig, keypathAccount } = await this.maybeRegisterMultisig(pairedBitBox, this.walletConfig);
      const signedPsbt = await pairedBitBox.btcSignPSBT(
        convertNetwork(this.walletConfig.network),
        this.unsignedPsbt,
        {
          scriptConfig,
          keypath: keypathAccount,
        },
        'default',
      );
      if (this.returnSignatureArray) {
        // Extract the sigs for that belong to us (identified by the root fingerprint).
        // This only works reliably if the fingerprint is unique, i.e. all signers have different
        // fingerprints.
        const ourRootFingerprint = await pairedBitBox.rootFingerprint();
        const parsedPsbt = parsePsbt(signedPsbt);
        let sigArray: string[] = [];
        for (let i = 0; i < parsedPsbt.PSBT_GLOBAL_INPUT_COUNT; i++) {
          const bip32Derivations = parsedPsbt.PSBT_IN_BIP32_DERIVATION[i];
          if (!Array.isArray(bip32Derivations)) {
            throw new Error('bip32 derivations expected to be an array');
          }
          const bip32Derivation = bip32Derivations.find(entry => entry.value!.substr(0, 8) == ourRootFingerprint);
          if (!bip32Derivation) {
            throw new Error('could not find our pubkey in the signed PSBT');
          }
          // First byte of the key is 0x06, the PSBT key.
          const pubKey = bip32Derivation.key.substr(2);
          // First byte of the key is 0x02, the PSBT key.
          const partialSig = parsedPsbt.PSBT_IN_PARTIAL_SIG[i].find(e => e.key.substr(2) === pubKey);
          if (!partialSig) {
            throw new Error('could not find our signature in the signed PSBT');
          }
          sigArray.push(partialSig.value!);
        }

        return sigArray;
      }
      return signedPsbt;
    });
  }
}
