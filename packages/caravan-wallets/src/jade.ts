import { randomBytes } from "crypto";

import {
  BitcoinNetwork,
  ExtendedPublicKey,
  getPsbtVersionNumber,
  PsbtV2,
  MultisigAddressType,
  P2SH,
  P2SH_P2WSH,
  P2WSH,
  bip32PathToSequence,
  bip32SequenceToPath,
} from "@caravan/bitcoin";

import { getRelativeBip32Sequence } from "@caravan/bip32";

import {
  Jade,
  JadeInterface,
  SerialTransport,
  IJade,
  IJadeInterface,
  JadeTransport,
  base64ToBytes,
  bytesToBase64,
  MultisigDescriptor,
  SignerDescriptor,
  ReceiveOptions,
} from "jadets";

import {
  DirectKeystoreInteraction,
  PENDING,
  ACTIVE,
  INFO,
} from "./interaction";

import { MultisigWalletConfig } from "./types";


export const JADE = "jade";

const DEFAULT_NETWORK = "mainnet";

function variantFromAddressType(
  t: MultisigAddressType,
): MultisigDescriptor["variant"] {
  switch (t) {
    case P2SH:
      return "sh(multi(k))";
    case P2WSH:
      return "wsh(multi(k))";
    case P2SH_P2WSH:
      return "sh(wsh(multi(k)))";
    default:
      throw new Error(`Unsupported addressType ${t}`);
  }
}

function fingerprintFromHex(xfp: string): Uint8Array {
  return Uint8Array.from(Buffer.from(xfp, "hex"));
}

function walletConfigToJadeDescriptor(
  cfg: MultisigWalletConfig,
): MultisigDescriptor {
  const signers: SignerDescriptor[] = cfg.extendedPublicKeys.map((ek) => ({
    fingerprint: fingerprintFromHex(ek.xfp),
    derivation: bip32PathToSequence(ek.bip32Path),
    xpub: ek.xpub,
    path: [],
  }));

  return {
    variant: variantFromAddressType(cfg.addressType),
    sorted: true,
    threshold: cfg.quorum.requiredSigners,
    signers,
  };
}

function getSignatureArray(
  fingerprint: string | null,
  parsedPsbt: any,
): string[] {
  const sigArray: string[] = [];

  for (let i = 0; i < parsedPsbt.PSBT_GLOBAL_INPUT_COUNT; i++) {
    const derivations = parsedPsbt.PSBT_IN_BIP32_DERIVATION[i];
    if (!Array.isArray(derivations)) {
      throw new Error(
        `bip32 derivations expected to be an array for input ${i}`,
      );
    }

    const myDerivation = derivations.find(
      (d: any) => d.value!.substr(0, 8) === fingerprint,
    );
    if (!myDerivation) {
      console.warn(`Could not find our pubkey in input ${i}, skipping`);
      continue;
    }

    const pubKey = myDerivation.key.substr(2);

    const partialSigs = parsedPsbt.PSBT_IN_PARTIAL_SIG[i];
    if (!Array.isArray(partialSigs)) {
      throw new Error(
        `Partial signatures expected to be an array for input ${i}`,
      );
    }

    const mySigEntry = partialSigs.find(
      (s: any) => s.key.substr(2) === pubKey,
    );
    if (!mySigEntry) {
      throw new Error(`Could not find our signature for input ${i}`);
    }

    sigArray.push(mySigEntry.value!);
  }

  return sigArray;
}

export class JadeInteraction extends DirectKeystoreInteraction {
  protected transport: JadeTransport;

  protected ijade: IJadeInterface;

  protected jade: IJade;

  constructor() {
    super();
    this.transport = new SerialTransport({});
    this.ijade = new JadeInterface(this.transport);
    this.jade = new Jade(this.ijade);
  }

  /**
   * Provides a list of status messages for the UI.
   */
  messages() {
    const messages = super.messages();
    messages.push({
      state: PENDING,
      level: INFO,
      text: "Please connect your Jade device.",
      code: "device.setup",
    });
    messages.push({
      state: ACTIVE,
      level: INFO,
      text: "Communicating with Jade...",
      code: "device.active",
    });
    return messages;
  }

  async withDevice<T>(
    network: string,
    f: (jade: IJade) => Promise<T>,
  ): Promise<T> {
    try {
      await this.jade.connect();

      const httpRequestFn = async (params: any): Promise<{ body: any }> => {
        const url = params.urls[0];
        const response = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(params.data),
        });
        if (!response.ok) {
          throw new Error("HTTP request failed in authUser");
        }
        const body = await response.json();
        return { body };
      };

      const unlockResult = await this.jade.authUser(network, httpRequestFn);
      if (unlockResult !== true) {
        throw new Error("Failed to unlock Jade device");
      }

      try {
        return await f(this.jade);
      } finally {
        await this.jade.disconnect();
      }
    } catch (err: any) {
      throw new Error(err.message);
    }
  }

  async run(): Promise<any> {
    return null;
  }
}

export class JadeGetMetadata extends JadeInteraction {
  async run(): Promise<{
    spec: string;
    version: { major: string; minor: string; patch: string; string: string };
    model: string;
  }> {
    return this.withDevice("mainnet", async (jade: IJade) => {
      const versionInfo = await jade.getVersionInfo();
      const version = versionInfo.JADE_VERSION || "";
      const [major, minor, patch] = version.split(".");
      return {
        spec: `Jade v${version}`,
        version: {
          major: major || "",
          minor: minor || "",
          patch: patch || "",
          string: version,
        },
        model: versionInfo.BOARD_TYPE,
      };
    });
  }
}

export class JadeExportPublicKey extends JadeInteraction {
  network: BitcoinNetwork;

  bip32Path: string;

  includeXFP: boolean;

  constructor({
    network,
    bip32Path,
    includeXFP,
  }: {
    network: BitcoinNetwork;
    bip32Path: string;
    includeXFP: boolean;
  }) {
    super();
    this.network = network;
    this.bip32Path = bip32Path;
    this.includeXFP = includeXFP;
  }

  messages() {
    return super.messages();
  }

  async run() {
    return await this.withDevice(this.network, async (jade: IJade) => {
      const path = bip32PathToSequence(this.bip32Path);
      const xpub = await jade.getXpub(this.network, path);
      const publicKey = ExtendedPublicKey.fromBase58(xpub).pubkey;
      const rootFingerprint = await jade.getMasterFingerPrint(this.network);
      if (this.includeXFP) {
        return { publicKey, rootFingerprint };
      }
      return publicKey;
    });
  }
}

export class JadeExportExtendedPublicKey extends JadeInteraction {
  network: BitcoinNetwork;

  bip32Path: string;

  includeXFP: boolean;

  constructor({
    network,
    bip32Path,
    includeXFP,
  }: {
    network: BitcoinNetwork;
    bip32Path: string;
    includeXFP: boolean;
  }) {
    super();
    this.network = network;
    this.bip32Path = bip32Path;
    this.includeXFP = includeXFP;
  }

  messages() {
    return super.messages();
  }

  async run() {
    return await this.withDevice(this.network, async (jade: IJade) => {
      const path = bip32PathToSequence(this.bip32Path);
      const xpub = await jade.getXpub(this.network, path);
      const rootFingerprint = await jade.getMasterFingerPrint(this.network);
      if (this.includeXFP) {
        return { xpub, rootFingerprint };
      }
      return xpub;
    });
  }
}

export class JadeRegisterWalletPolicy extends JadeInteraction {
  walletConfig: MultisigWalletConfig;

  constructor({ walletConfig }: { walletConfig: MultisigWalletConfig }) {
    super();
    this.walletConfig = walletConfig;
  }

  async run() {
    return await this.withDevice(
      this.walletConfig.network,
      async (jade: IJade) => {
        const descriptor = walletConfigToJadeDescriptor(this.walletConfig);
        let multisigName = await jade.getMultiSigName(
          this.walletConfig.network,
          descriptor,
        );

        if (!multisigName) {
          multisigName = `jade${randomBytes(4).toString("hex")}`;
          await jade.registerMultisig(
            this.walletConfig.network,
            multisigName,
            descriptor,
          );
        }
      }
    );
  }
}

export class JadeConfirmMultisigAddress extends JadeInteraction {
  network: BitcoinNetwork;

  bip32Path: string;

  walletConfig: MultisigWalletConfig;

  constructor({
    network,
    bip32Path,
    walletConfig,
  }: {
    network: BitcoinNetwork;
    bip32Path: string;
    walletConfig: MultisigWalletConfig;
  }) {
    super();
    this.network = network;
    this.bip32Path = bip32Path;
    this.walletConfig = walletConfig;
  }

  async run() {
    return await this.withDevice(this.network, async (jade: IJade) => {
      const descriptor = walletConfigToJadeDescriptor(this.walletConfig);
      let multisigName = await jade.getMultiSigName(this.network, descriptor);

      if (!multisigName) {
        multisigName = `jade${randomBytes(4).toString("hex")}`;
        await jade.registerMultisig(this.network, multisigName, descriptor);
      }
      const paths = descriptor.signers.map((signer) => {
		  let childPath = bip32SequenceToPath(signer.derivation);
		  return getRelativeBip32Sequence(childPath, this.bip32Path);

      });

      const opts: ReceiveOptions = {
        paths,
        multisigName,
      };

      const multisigAddress = await jade.getReceiveAddress(this.network, opts);
      return multisigAddress;
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

export class JadeSignMultisigTransaction extends JadeInteraction {
  private walletConfig: MultisigWalletConfig;

  private returnSignatureArray: boolean;

  private unsignedPsbt: Uint8Array;

  private base64string: string;

  constructor({
    walletConfig,
    psbt,
    returnSignatureArray = false,
  }: {
    walletConfig: MultisigWalletConfig;
    psbt: string;
    returnSignatureArray: boolean;
  }) {
    super();
    this.walletConfig = walletConfig;
    this.returnSignatureArray = returnSignatureArray;
    this.unsignedPsbt = base64ToBytes(psbt);
    this.base64string = psbt;
  }

  async run() {
    return await this.withDevice(
      this.walletConfig.network,
      async (jade: IJade) => {
        const signedPSBT = await jade.signPSBT(
          this.walletConfig.network,
          this.unsignedPsbt,
        );

        if (this.returnSignatureArray) {
          const b64string = bytesToBase64(signedPSBT);
          const parsedPsbt = parsePsbt(b64string);
          const fingerprint = await jade.getMasterFingerPrint(
            this.walletConfig.network,
          );
          return getSignatureArray(fingerprint, parsedPsbt);
        }

        return signedPSBT;
      }
    );
  }
}


export class JadeSignMessage extends JadeInteraction {
  bip32Path: string;

  message: string;

  network: string;

  constructor({ bip32Path, message }: { bip32Path: string; message: string }) {
    super();
    this.bip32Path = bip32Path;
    this.message = message;
    this.network = DEFAULT_NETWORK;
  }

  async run() {
    return await this.withDevice(this.network, async (jade: IJade) => {
      const path = bip32PathToSequence(this.bip32Path);
      return await jade.signMessage(path, this.message);
    });
  }
}

