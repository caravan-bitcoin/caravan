import {
  ExtendedPublicKey,
  P2SH,
  P2SH_P2WSH,
  P2WSH,
  validateBIP32Path,
  validateExtendedPublicKey,
  validateRootFingerprint,
  getMaskedDerivation,
  Network,
  validateExtendedPublicKeyForNetwork,
} from "@caravan/bitcoin";
import { BraidDetails, MultisigWalletConfig } from "@caravan/multisig";
import { WalletPolicy } from "ledger-bitcoin";

export class KeyOrigin {
  readonly xfp: string;

  readonly bip32Path: string;

  readonly xpub: string;

  readonly network: Network;

  constructor({ xfp, bip32Path, xpub, network }) {
    // throws an error if not valid
    validateRootFingerprint(xfp);
    this.xfp = xfp;

    // returns error string or empty string if valid
    const pathError = validateBIP32Path(bip32Path);
    if (pathError) throw new Error(pathError);
    this.bip32Path = bip32Path;

    // returns error string or empty string if valid
    const xpubError = validateExtendedPublicKey(xpub, network);
    if (xpubError) throw new Error(xpubError);
    this.xpub = xpub;
    this.network = network;
  }

  /**
   * Returns a key origin information in descriptor format
   * @returns {string} policy template string
   */
  toString() {
    let path = this.bip32Path;
    if (this.bip32Path[0] === "m") {
      path = this.bip32Path.slice(1);
    }

    return `[${this.xfp}${path}]${this.xpub}`;
  }

  static fromString(str: string, _network?: Network) {
    let network = _network;
    const match = str.match(
      /^\[([0-9a-f]{8})((?:\/[0-9]+'?)+)\](((?:x|t)pub)[A-Za-z0-9]+)$/
    );
    if (!match) {
      throw new Error("Invalid key origin string");
    }
    const xpub = match[3];
    const prefix = match[3].slice(0, 4);

    if (network) {
      const error = validateExtendedPublicKeyForNetwork(xpub, network);
      if (error) throw new Error(error);
    } else if (!network && prefix === "xpub") {
      network = Network.MAINNET;
    } else if (!network && prefix === "tpub") {
      network = Network.TESTNET;
    } else {
      throw new Error("Invalid network");
    }

    return new KeyOrigin({
      xfp: match[1],
      bip32Path: `m${match[2]}`,
      xpub,
      network,
    });
  }
}

export type MultisigScriptType = "sh" | "wsh" | "tr";

/**
 * Takes a wallet config and translates it into a wallet policy template string
 * @param {MultisigWalletConfig} walletConfig - multisig wallet configuration object
 * @returns {string} valid policy template string
 */
export const getPolicyTemplateFromWalletConfig = (
  walletConfig: MultisigWalletConfig
) => {
  let scriptType: MultisigScriptType;
  let requiredSigners = Number(walletConfig.quorum.requiredSigners);
  let nested = false;
  switch (walletConfig.addressType) {
    case P2SH:
      scriptType = "sh";
      break;
    case P2WSH:
      scriptType = "wsh";
      break;
    case "P2TR":
      scriptType = "tr";
      break;
    case P2SH_P2WSH:
      scriptType = "wsh";
      nested = true;
      break;
    default:
      throw new Error(`Unknown address type: ${walletConfig.addressType}`);
  }

  const signersString = walletConfig.extendedPublicKeys
    .map((_, index) => `@${index}/**`)
    .join(",");

  const policy = `${scriptType}(sortedmulti(${requiredSigners},${signersString}))`;
  if (nested) return `sh(${policy})`;

  return policy;
};

export const getKeyOriginsFromWalletConfig = (
  walletConfig: MultisigWalletConfig
): KeyOrigin[] => {
  return walletConfig.extendedPublicKeys.map((key): KeyOrigin => {
    const xpub = ExtendedPublicKey.fromBase58(key.xpub);
    xpub.setNetwork(walletConfig.network);
    return new KeyOrigin({
      xfp: key.xfp,
      xpub: xpub.toBase58(),
      // makes sure to support case where derivation is "unknown" and we want to mask it
      bip32Path: getMaskedDerivation(key),
      network: walletConfig.network,
    });
  });
};

export class MultisigWalletPolicy {
  readonly name: string;

  private template: string;

  private keyOrigins: KeyOrigin[];

  constructor({
    name,
    template,
    keyOrigins,
  }: {
    name: string;
    template: string;
    keyOrigins: KeyOrigin[];
  }) {
    // this is an unstated restriction from ledger
    // if we don't check it here then registration will fail
    // with an opaque error about invalid input data
    // TODO: should this be left as full length and only
    // abbreviated when translating to a ledger policy?
    if (name.length > 64) {
      console.warn(
        `Wallet policy name too long. (${name.length}) greater than max of 64 chars.`
      );
      this.name = `${name.slice(0, 61)}...`.trim();
    } else {
      this.name = name;
    }

    this.name = this.name.trim();

    validateMultisigPolicyTemplate(template);
    this.template = template;

    const totalSignerCount = getTotalSignerCountFromTemplate(template);
    if (totalSignerCount !== keyOrigins.length) {
      throw new Error(
        `Expected ${totalSignerCount} key origins but ${keyOrigins.length} were passed`
      );
    }

    // sort key origins consistently no matter the order they are passed into the constructor
    // so that the preimage for registrations is not malleable
    this.keyOrigins = keyOrigins.sort((a, b) => a.xpub.localeCompare(b.xpub));
  }

  toJSON() {
    return JSON.stringify({
      name: this.name,
      template: this.template,
      keyOrigins: this.keyOrigins,
    });
  }

  toLedgerPolicy() {
    return new WalletPolicy(this.name, this.template, this.keys);
  }

  get keys() {
    return this.keyOrigins.map((ko) => ko.toString());
  }

  static FromWalletConfig(config: MultisigWalletConfig): MultisigWalletPolicy {
    const template = getPolicyTemplateFromWalletConfig(config);
    const keyOrigins = getKeyOriginsFromWalletConfig(config);
    // prefer uuid to name because it's less likely to change
    const name = config.uuid || config.name;
    if (!name) throw new Error("Policy template requires a name");

    return new this({ name, template, keyOrigins });
  }
}

export const validateMultisigPolicyScriptType = (template) => {
  const acceptedScripts = ["sh", "wsh"];
  let hasMatch = acceptedScripts.some((script) => template.startsWith(script));

  if (!hasMatch)
    throw new Error(
      `Invalid script type in template ${template}. Only script types \
${acceptedScripts.join(", ")} accepted`
    );
};

export const validateMultisigPolicyKeys = (template) => {
  const requiredSigners = Number(template.match(/\d+/)[0]);

  if (!requiredSigners)
    throw new Error(
      "Expected to find a required number of signers from the quorum"
    );

  const count = getTotalSignerCountFromTemplate(template);

  if (!count || count < requiredSigners) {
    throw new Error(
      `Required signers in policy ${template} is ` +
        `${requiredSigners} but found only ${count} total keys`
    );
  }
};

export const getTotalSignerCountFromTemplate = (template) => {
  return template.match(/@\d+\/\*\*/g).length;
};

export const validateMultisigPolicyTemplate = (template) => {
  validateMultisigPolicyScriptType(template);
  validateMultisigPolicyKeys(template);
};

// Mostly useful for dealing with test fixtures and objects from caravan
export const braidDetailsToWalletConfig = (braidDetails: BraidDetails) => {
  return {
    network: braidDetails.network,
    extendedPublicKeys: braidDetails.extendedPublicKeys.map((key) => ({
      xpub: key.base58String,
      bip32Path: key.path,
      xfp: key.rootFingerprint,
    })),
    quorum: {
      requiredSigners: braidDetails.requiredSigners,
      totalSigners: braidDetails.extendedPublicKeys.length,
    },
    name: `${braidDetails.requiredSigners}-of-${braidDetails.extendedPublicKeys.length} ${braidDetails.addressType} ${braidDetails.network} wallet`,
    addressType: braidDetails.addressType,
  };
};
