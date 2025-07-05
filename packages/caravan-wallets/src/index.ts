// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import { Network } from "@caravan/bitcoin";
import {
  braidDetailsToWalletConfig,
  MultisigWalletConfig,
  LegacyInput,
  LegacyOutput,
  BraidDetails,
} from "@caravan/multisig";
import {
  convertLegacyInput,
  convertLegacyOutput,
  getUnsignedMultisigPsbtV0,
} from "@caravan/psbt";

import { version } from "../package.json";

import {
  BCUR2,
  BCUR2ExportExtendedPublicKey,
} from "./bcur2/interactions";
import {
  BITBOX,
  BitBoxGetMetadata,
  BitBoxExportPublicKey,
  BitBoxExportExtendedPublicKey,
  BitBoxConfirmMultisigAddress,
  BitBoxRegisterWalletPolicy,
  BitBoxSignMultisigTransaction,
} from "./bitbox";
import {
  COLDCARD,
  ColdcardExportPublicKey,
  ColdcardExportExtendedPublicKey,
  ColdcardSignMultisigTransaction,
  ColdcardMultisigWalletConfig,
} from "./coldcard";
import {
  CUSTOM,
  CustomExportExtendedPublicKey,
  CustomSignMultisigTransaction,
} from "./custom";
import {
  HERMIT,
  HermitExportExtendedPublicKey,
  HermitSignMultisigTransaction,
} from "./hermit";
import { UNSUPPORTED, UnsupportedInteraction } from "./interaction";
import {
  JADE,
  JadeGetMetadata,
  JadeExportPublicKey,
  JadeExportExtendedPublicKey,
  JadeConfirmMultisigAddress,
  JadeRegisterWalletPolicy,
  JadeSignMultisigTransaction,
  JadeSignMessage,
} from "./jade";
import {
  LEDGER,
  LEDGER_V2,
  LedgerGetMetadata,
  LedgerExportPublicKey,
  LedgerExportExtendedPublicKey,
  LedgerSignMultisigTransaction,
  LedgerSignMessage,
  LedgerConfirmMultisigAddress,
  LedgerRegisterWalletPolicy,
  LedgerV2SignMultisigTransaction,
} from "./ledger";
import {
  TREZOR,
  TrezorGetMetadata,
  TrezorExportPublicKey,
  TrezorExportExtendedPublicKey,
  TrezorSignMultisigTransaction,
  TrezorConfirmMultisigAddress,
  TrezorSignMessage,
} from "./trezor";

/**
 * Current @caravan/wallets version.
 */
export const VERSION: string = version;

export { MULTISIG_ROOT } from "./constants";

/**
 * Keystores which support direct interactions.
 */
export const DIRECT_KEYSTORES = {
  JADE,
  BITBOX,
  TREZOR,
  LEDGER,
  LEDGER_V2,
} as const;

/**
 * Keystores which support indirect interactions.
 */
export const INDIRECT_KEYSTORES = {
  HERMIT,
  COLDCARD,
  CUSTOM,
  BCUR2,
} as const;

/**
 * Supported keystores.
 */
export const KEYSTORES = {
  ...DIRECT_KEYSTORES,
  ...INDIRECT_KEYSTORES,
} as const;

type KEYSTORE_KEYS = keyof typeof KEYSTORES;
export type KEYSTORE_TYPES = (typeof KEYSTORES)[KEYSTORE_KEYS];

/**
 * Return an interaction class for obtaining metadata from the given
 * `keystore`.
 *
 * **Supported keystores:** BitBox, Trezor, Ledger
 *
 * @example
 * import {GetMetadata, TREZOR} from "@caravan/wallets";
 * // Works similarly for Ledger.
 * const interaction = GetMetadata({keystore: TREZOR});
 * const metadata = await interaction.run();
 */
export function GetMetadata({ keystore }: { keystore: KEYSTORE_TYPES }) {
  switch (keystore) {
    case JADE:
      return new JadeGetMetadata();
    case BITBOX:
      return new BitBoxGetMetadata({});
    case LEDGER:
      return new LedgerGetMetadata();
    case TREZOR:
      return new TrezorGetMetadata();
    default:
      return new UnsupportedInteraction({
        code: "unsupported",
        text: "This keystore does not return a version.",
      });
  }
}

/**
 * Return an interaction class for exporting a public key from the
 * given `keystore` for the given `bip32Path` and `network`.
 *
 * **Supported keystores:** Trezor, Ledger, Hermit
 *
 * @example
 * import {MAINNET} from "@caravan/bitcoin";
 * import {ExportPublicKey, TREZOR, HERMIT} from "@caravan/wallets";
 * // Works similarly for Ledger
 * const interaction = ExportPublicKey({keystore: TREZOR, network: MAINNET, bip32Path: "m/45'/0'/0'/0/0"});
 * const publicKey = await interaction.run();
 */
export function ExportPublicKey({
  keystore,
  network,
  bip32Path,
  includeXFP,
}: {
  keystore: KEYSTORE_TYPES;
  network: Network;
  bip32Path: string;
  includeXFP: boolean;
}) {
  switch (keystore) {
    case JADE:
      return new JadeExportPublicKey({
        network,
        bip32Path,
        includeXFP,
      });
    case BITBOX:
      return new BitBoxExportPublicKey({
        network,
        bip32Path,
        includeXFP,
      });
    case COLDCARD:
      return new ColdcardExportPublicKey({
        network,
        bip32Path,
      });
    case LEDGER:
      return new LedgerExportPublicKey({
        bip32Path,
        includeXFP,
      });
    case TREZOR:
      return new TrezorExportPublicKey({
        network,
        bip32Path,
        includeXFP,
      });
    default:
      return new UnsupportedInteraction({
        code: "unsupported",
        text: "This keystore is not supported when exporting public keys.",
      });
  }
}

/**
 * Return an interaction class for signing a message by the given `keystore`
 * for the given `bip32Path`.
 *
 * **Supported keystores:** Ledger, Trezor
 */
export function SignMessage({
  keystore,
  bip32Path,
  message,
}: {
  keystore: KEYSTORE_TYPES;
  bip32Path: string;
  message: string;
}) {
  switch (keystore) {
    case JADE:
      return new JadeSignMessage({
        bip32Path,
        message,
      });
    case LEDGER:
      return new LedgerSignMessage({
        bip32Path,
        message,
      });
    case TREZOR:
      return new TrezorSignMessage({
        bip32Path,
        message,
      });
    default:
      return new UnsupportedInteraction({
        code: "unsupported",
        text: "This keystore is not supported when signing a message.",
      });
  }
}

/**
 * Return an interaction class for exporting an extended public key
 * from the given `keystore` for the given `bip32Path` and `network`.
 *
 * **Supported keystores:** Trezor, Hermit, Ledger
 *
 * @example
 * import {MAINNET} from "@caravan/bitcoin";
 * import {ExportExtendedPublicKey, TREZOR, HERMIT} from "@caravan/wallets";
 * // Works similarly for Ledger
 * const interaction = ExportExtendedPublicKey({keystore: TREZOR, network: MAINNET, bip32Path: "m/45'/0'/0'/0/0"});
 * const xpub = await interaction.run();
 */
export function ExportExtendedPublicKey({
  keystore,
  network,
  bip32Path,
  includeXFP,
}: {
  keystore: KEYSTORE_TYPES;
  network: Network;
  bip32Path: string;
  includeXFP: boolean;
}) {
  switch (keystore) {
    case JADE:
      return new JadeExportExtendedPublicKey({
        bip32Path,
        network,
        includeXFP,
      });
    case BITBOX:
      return new BitBoxExportExtendedPublicKey({
        bip32Path,
        network,
        includeXFP,
      });
    case COLDCARD:
      return new ColdcardExportExtendedPublicKey({
        bip32Path,
        network,
      });
    case CUSTOM:
      return new CustomExportExtendedPublicKey({
        bip32Path,
        network,
      });
    case HERMIT:
      return new HermitExportExtendedPublicKey({
        bip32Path,
      });
    case LEDGER:
      return new LedgerExportExtendedPublicKey({
        bip32Path,
        network,
        includeXFP,
      });
    case TREZOR:
      return new TrezorExportExtendedPublicKey({
        bip32Path,
        network,
        includeXFP,
      });
    case BCUR2:
      return new BCUR2ExportExtendedPublicKey({
        bip32Path,
        network,
      });
    default:
      return new UnsupportedInteraction({
        code: "unsupported",
        text: "This keystore is not supported when exporting extended public keys.",
      });
  }
}

/**
 * Return an interaction class for signing a multisig transaction with
 * the given `keystore`.
 *
 * The inputs are objects which have `txid`, `index`, and a `multisig`
 * object, the last which is a `Multisig` object from
 * `@caravan/bitcoin`.
 *
 * The outputs are objects which have `address` and `amountSats` (an
 * integer).
 *
 * `bip32Paths` is an array of BIP32 paths for the public keys on this
 * device, one for each input.
 *
 * **Supported keystores:** Trezor, Ledger, Hermit
 *
 * @example
 * import {
 *   generateMultisigFromHex, TESTNET, P2SH,
 * } from "@caravan/bitcoin";
 * import {SignMultisigTransaction, TREZOR} from "@caravan/wallets";
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
 * const interaction = SignMultisigTransaction({
 *   keystore: TREZOR, // works the same for Ledger
 *   network: TESTNET,
 *   inputs,
 *   outputs,
 *   bip32Paths: ["m/45'/0'/0'/0", // add more, 1 per input],
 * });
 * const signature = await interaction.run();
 * console.log(signatures);
 * // ["ababab...", // 1 per input]
 *
 */
export interface SignMultisigTransactionArgs {
  keystore: KEYSTORE_TYPES;
  network: Network;
  inputs?: LegacyInput[];
  outputs?: LegacyOutput[];
  bip32Paths?: string[];
  psbt: string;
  keyDetails: { xfp: string; path: string };
  returnSignatureArray?: boolean;
  walletConfig: MultisigWalletConfig;
  policyHmac?: string;
  progressCallback?: () => void;
}
export function SignMultisigTransaction({
  keystore,
  network,
  inputs,
  outputs,
  bip32Paths,
  psbt,
  keyDetails,
  returnSignatureArray = false,
  walletConfig,
  policyHmac,
  progressCallback,
}: SignMultisigTransactionArgs) {
  switch (keystore) {
    case JADE: {
      let _psbt = psbt;
      if (!_psbt)
        _psbt = getUnsignedMultisigPsbtV0({
          network,
          inputs: inputs ? inputs.map(convertLegacyInput) : [],
          outputs: outputs ? outputs.map(convertLegacyOutput) : [],
        }).toBase64();
      return new JadeSignMultisigTransaction({
        walletConfig,
        psbt,
        returnSignatureArray,
      });
    }
    case BITBOX: {
      let _psbt = psbt;
      if (!_psbt)
        _psbt = getUnsignedMultisigPsbtV0({
          network,
          inputs: inputs ? inputs.map(convertLegacyInput) : [],
          outputs: outputs ? outputs.map(convertLegacyOutput) : [],
        }).toBase64();
      return new BitBoxSignMultisigTransaction({
        walletConfig,
        psbt,
        returnSignatureArray,
      });
    }
    case COLDCARD:
      return new ColdcardSignMultisigTransaction({
        network,
        inputs,
        outputs,
        bip32Paths,
        psbt,
      });
    case CUSTOM:
      return new CustomSignMultisigTransaction({
        network,
        inputs,
        outputs,
        bip32Paths,
        psbt,
      });
    case HERMIT:
      return new HermitSignMultisigTransaction({
        psbt,
        returnSignatureArray,
      });
    case LEDGER: {
      let _psbt = psbt;
      if (!_psbt)
        _psbt = getUnsignedMultisigPsbtV0({
          network,
          inputs: inputs ? inputs.map(convertLegacyInput) : [],
          outputs: outputs ? outputs.map(convertLegacyOutput) : [],
        }).toBase64();
      return new LedgerSignMultisigTransaction({
        network,
        inputs,
        outputs,
        bip32Paths,
        psbt: _psbt,
        keyDetails,
        returnSignatureArray,
        v2Options: {
          ...walletConfig,
          policyHmac,
          psbt: _psbt,
          progressCallback,
          returnSignatureArray,
        },
      });
    }
    case LEDGER_V2:
      // if we can know for sure which version of the app
      // we're going to be interacting with then we
      // can return this interaction explicitly without
      // waiting for catching failures and using fallbacks
      // as in the above with v2Options
      return new LedgerV2SignMultisigTransaction({
        ...walletConfig,
        policyHmac,
        psbt,
        progressCallback,
        returnSignatureArray,
      });
    case TREZOR:
      return new TrezorSignMultisigTransaction({
        network,
        inputs,
        outputs,
        bip32Paths,
        psbt,
        keyDetails,
        addressType: walletConfig.addressType,
        returnSignatureArray,
      });
    default:
      return new UnsupportedInteraction({
        code: "unsupported",
        text: "This keystore is not supported when signing multisig transactions.",
      });
  }
}

/**
 * Return an interaction class for confirming a multisig address with
 * the given `keystore`.
 *
 * The `multisig` parameter is a `Multisig` object from
 * `@caravan/bitcoin`.
 *
 * `bip32Path` is the BIP32 path for the publiic key in the address on
 * this device.
 *
 * `publicKey` optional, is the public key expected to be at `bip32Path`.
 *
 * **Supported keystores:** Trezor, Ledger
 *
 * @example
 * import {
 *   generateMultisigFromHex, TESTNET, P2SH,
 * } from "@caravan/bitcoin";
 * import {
 *   ConfirmMultisigAddress,
 *   multisigPublicKeys,
 *   trezorPublicKey,
 *   TREZOR} from "@caravan/wallets";
 * const redeemScript = "5...ae";
 * const multisig = generateMultisigFromHex(TESTNET, P2SH, redeemScript);
 * const interaction = ConfirmMultisigAddress({
 *   keystore: TREZOR,
 *   network: TESTNET,
 *   multisig,
 *   bip32Path: "m/45'/1'/0'/0/0",
 * });
 * await interaction.run();
 *
 * With publicKey:
 * const redeemScript = "5...ae";
 * const multisig = generateMultisigFromHex(TESTNET, P2SH, redeemScript);
 * const publicKey = trezorPublicKey(multisigPublicKeys(this.multisig)[2])
 * const interaction = ConfirmMultisigAddress({
 *   keystore: TREZOR,
 *   publicKey,
 *   network: TESTNET,
 *   multisig,
 *   bip32Path: "m/45'/1'/0'/0/0",
 * });
 * await interaction.run();
 *
 *
 */
export function ConfirmMultisigAddress({
  keystore,
  network,
  bip32Path,
  multisig,
  publicKey,
  name,
  policyHmac,
  walletConfig,
}: {
  keystore: KEYSTORE_TYPES;
  network: Network;
  bip32Path: string;
  multisig: Record<string, any>;
  publicKey?: string;
  name?: string;
  policyHmac?: string;
  walletConfig?: MultisigWalletConfig;
}) {
  switch (keystore) {
    case JADE: {
      const braidDetails: BraidDetails = JSON.parse(multisig.braidDetails);
      const _walletConfig =
        walletConfig || braidDetailsToWalletConfig(braidDetails);
      return new JadeConfirmMultisigAddress({
        network,
        bip32Path,
        walletConfig: _walletConfig,
      });
    }
    case BITBOX: {
      const braidDetails: BraidDetails = JSON.parse(multisig.braidDetails);
      const _walletConfig =
        walletConfig || braidDetailsToWalletConfig(braidDetails);
      return new BitBoxConfirmMultisigAddress({
        network,
        bip32Path,
        walletConfig: _walletConfig,
      });
    }
    case TREZOR:
      return new TrezorConfirmMultisigAddress({
        network,
        bip32Path,
        multisig,
        publicKey,
      });
    case LEDGER: {
      // TODO: clean this up. The reason for this is that
      // we're expecting this malleable object `multisig` that
      // gets passed in but really these interactions should
      // just get a braid or something derived from it.
      const braidDetails: BraidDetails = JSON.parse(multisig.braidDetails);
      const _walletConfig =
        walletConfig || braidDetailsToWalletConfig(braidDetails);
      return new LedgerConfirmMultisigAddress({
        // this is for the name of the wallet the address being confirmed is from
        name,
        ..._walletConfig,
        expected: multisig.address,
        bip32Path,
        policyHmac,
      });
    }
    default:
      return new UnsupportedInteraction({
        code: UNSUPPORTED,
        text: "This keystore is not supported when confirming multisig addresses.",
      });
  }
}

/**
 * Return a class for registering a wallet policy.
 * **Supported keystores:** BitBox, Ledger
 */
// TODO: superfluous with the ConfigAdapter?
// This name sounds better, but ConfigAdapter can cover Coldcard too
export function RegisterWalletPolicy({
  keystore,
  policyHmac,
  verify = false,
  ...walletConfig
}: {
  keystore: KEYSTORE_TYPES;
  policyHmac?: string;
  verify: boolean;
} & MultisigWalletConfig) {
  switch (keystore) {
    case JADE:
      return new JadeRegisterWalletPolicy({
        walletConfig,
      });
    case BITBOX:
      return new BitBoxRegisterWalletPolicy({
        walletConfig,
      });
    case LEDGER:
      return new LedgerRegisterWalletPolicy({
        ...walletConfig,
        policyHmac,
        verify,
      });
    default:
      return new UnsupportedInteraction({
        code: "unsupported",
        text: "This keystore is not supported when translating external spend configuration files.",
      });
  }
}

/**
 * Return a class for creating a multisig config file for a
 * given keystore or coordinator.
 */
export function ConfigAdapter({
  KEYSTORE,
  jsonConfig,
  policyHmac,
}: {
  KEYSTORE: KEYSTORE_TYPES;
  jsonConfig: string | MultisigWalletConfig;
  policyHmac?: string;
}) {
  switch (KEYSTORE) {
    case JADE: {
      let walletConfig: MultisigWalletConfig;
      if (typeof jsonConfig === "string") {
        walletConfig = JSON.parse(jsonConfig);
      } else {
        walletConfig = jsonConfig;
      }
      return new JadeRegisterWalletPolicy({
        walletConfig,
      });
    }
    case BITBOX: {
      let walletConfig: MultisigWalletConfig;
      if (typeof jsonConfig === "string") {
        walletConfig = JSON.parse(jsonConfig);
      } else {
        walletConfig = jsonConfig;
      }
      return new BitBoxRegisterWalletPolicy({
        walletConfig,
      });
    }
    case COLDCARD:
      return new ColdcardMultisigWalletConfig({
        jsonConfig,
      });
    case LEDGER: {
      let walletConfig: MultisigWalletConfig;
      if (typeof jsonConfig === "string") {
        walletConfig = JSON.parse(jsonConfig);
      } else {
        walletConfig = jsonConfig;
      }

      return new LedgerRegisterWalletPolicy({ ...walletConfig, policyHmac });
    }
    default:
      return new UnsupportedInteraction({
        code: "unsupported",
        text: "This keystore is not supported when translating external spend configuration files.",
      });
  }
}

export * from "./interaction";
export * from "./jade";
export * from "./bitbox";
export * from "./bcur";
export * from "./bcur2/interactions";
export * from "./bcur2/decoder";
export * from "./coldcard";
export * from "./custom";
export * from "./hermit";
export * from "./ledger";
export * from "./trezor";
export * from "./policy";
export * from "./types";
