import { randomBytes } from "crypto";

import { getRelativeBip32Sequence } from "@caravan/bip32";
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
  JadeHttpRequestFunction,
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

export function variantFromAddressType(
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

export function fingerprintFromHex(xfp: string): Uint8Array {
  return Uint8Array.from(Buffer.from(xfp, "hex"));
}

export function walletConfigToJadeDescriptor(
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

export function getSignatureArray(
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

export interface JadeDependencies {
  transport?: JadeTransport;
  jadeInterface?: IJadeInterface;
  jade?: IJade;
}

export class JadeInteraction extends DirectKeystoreInteraction {
  protected transport: JadeTransport;

  protected ijade: IJadeInterface;

  protected jade: IJade;

  protected network: BitcoinNetwork;

  constructor(network?: BitcoinNetwork, dependencies?: JadeDependencies) {
    super();
    this.network = network ?? (DEFAULT_NETWORK as BitcoinNetwork);

    // Dependency injections or default to an instance from jadets
    this.transport = dependencies?.transport ?? new SerialTransport({}); 
    this.ijade = dependencies?.jadeInterface ?? new JadeInterface(this.transport);
    this.jade = dependencies?.jade ?? new Jade(this.ijade);
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

  protected get rpcNetwork(): string {
    return this.network === "regtest" ? "localtest" : this.network;
  }

  async withDevice<T>(
  fn: (jade: IJade) => Promise<T>,
): Promise<T> {
  let connected = false;

  try {
    await this.jade.connect();
    connected = true;

    // Perform user handshake. The params for the http request is filled by the jade device
    // this function will then call to the Blockstream pin server @ https://jadepin.blockstream.com/get_pin
    // in order to authorize the user from the device.
    // for more information on how this works you can read the docs @ 
    // https://github.com/Blockstream/Jade/blob/master/docs/index.rst#welcome-to-jades-rpc-documentation
  const httpRequestFn: JadeHttpRequestFunction = async (params) => {
    const firstUrl = params.urls[0];
    const url = typeof firstUrl === 'string' ? firstUrl : firstUrl.url || firstUrl.onion;
    
    if (!url) throw new Error("No URL provided in http request params");

    const res = await fetch(url, {
      method: params.method || "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params.data),
    });

    if (!res.ok) throw new Error("HTTP request failed in authUser");
    return { body: await res.json() };
  };

  const unlocked = await this.jade.authUser(this.rpcNetwork, httpRequestFn);
  if (unlocked !== true) throw new Error("Failed to unlock Jade device");

  //run jade action
  return await fn(this.jade);
  } finally {
    if (connected) {
      try {
        await this.jade.disconnect();
      } catch (e: any) {
        // preserve original error (if any) but log disconnect issue
        console.warn("Jade disconnect failed:", e.message ?? e);
      }
    }
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
    return this.withDevice(async (jade: IJade) => {
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
  bip32Path: string;

  includeXFP: boolean;

  constructor({
    network,
    bip32Path,
    includeXFP,
    dependencies,
  }: {
    network?: BitcoinNetwork;
    bip32Path: string;
    includeXFP: boolean;
    dependencies?: JadeDependencies;
  }) {
    super(network, dependencies);
    this.bip32Path = bip32Path;
    this.includeXFP = includeXFP;
  }

  messages() {
    return super.messages();
  }

  async run() {
    return await this.withDevice(async (jade: IJade) => {
      const path = bip32PathToSequence(this.bip32Path);
      const xpub = await jade.getXpub(this.rpcNetwork, path);
      const publicKey = ExtendedPublicKey.fromBase58(xpub).pubkey;
      const rootFingerprint = await jade.getMasterFingerPrint(this.rpcNetwork);
      if (this.includeXFP) {
        return { publicKey, rootFingerprint };
      }
      return publicKey;
    });
  }
}

export class JadeExportExtendedPublicKey extends JadeInteraction {

  bip32Path: string;

  includeXFP: boolean;

  constructor({
    network,
    bip32Path,
    includeXFP,
    dependencies,
  }: {
    network?: BitcoinNetwork;
    bip32Path: string;
    includeXFP: boolean;
    dependencies?: JadeDependencies;
  }) {
    super(network, dependencies);
    this.bip32Path = bip32Path;
    this.includeXFP = includeXFP;
  }

  messages() {
    return super.messages();
  }

  async run() {
    return await this.withDevice(async (jade: IJade) => {
      const path = bip32PathToSequence(this.bip32Path);
      const xpub = await jade.getXpub(this.rpcNetwork, path);
      const rootFingerprint = await jade.getMasterFingerPrint(this.rpcNetwork);
      if (this.includeXFP) {
        return { xpub, rootFingerprint };
      }
      return xpub;
    });
  }
}

export class JadeRegisterWalletPolicy extends JadeInteraction {
  walletConfig: MultisigWalletConfig;

  constructor({ walletConfig, dependencies }: { walletConfig: MultisigWalletConfig, dependencies?: JadeDependencies }) {
    super(walletConfig.network, dependencies);
    this.walletConfig = walletConfig;
  }

  async run() {
    return await this.withDevice(
      async (jade: IJade) => {
        const descriptor = walletConfigToJadeDescriptor(this.walletConfig);
        let multisigName = await jade.getMultiSigName(
          this.rpcNetwork,
          descriptor,
        );

        if (!multisigName) {
          multisigName = `jade${randomBytes(4).toString("hex")}`;
          await jade.registerMultisig(
            this.rpcNetwork,
            multisigName,
            descriptor,
          );
        }
      }
    );
  }
}

export class JadeConfirmMultisigAddress extends JadeInteraction {

  bip32Path: string;

  walletConfig: MultisigWalletConfig;

  constructor({
    network,
    bip32Path,
    walletConfig,
    dependencies,
  }: {
    network?: BitcoinNetwork;
    bip32Path: string;
    walletConfig: MultisigWalletConfig;
    dependencies?: JadeDependencies;
  }) {
    super(network, dependencies);
    this.bip32Path = bip32Path;
    this.walletConfig = walletConfig;
  }

  async run() {
    return await this.withDevice(async (jade: IJade) => {
      const descriptor = walletConfigToJadeDescriptor(this.walletConfig);
      let multisigName = await jade.getMultiSigName(this.rpcNetwork, descriptor);

      if (!multisigName) {
        multisigName = `jade${randomBytes(4).toString("hex")}`;
        await jade.registerMultisig(this.rpcNetwork, multisigName, descriptor);
      }
      const paths = descriptor.signers.map((signer) => {
        let childPath = bip32SequenceToPath(signer.derivation);
        return getRelativeBip32Sequence(childPath, this.bip32Path);
      });

      const opts: ReceiveOptions = {
        paths,
        multisigName,
      };

      const multisigAddress = await jade.getReceiveAddress(this.rpcNetwork, opts);
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
    dependencies,
  }: {
    walletConfig: MultisigWalletConfig;
    psbt: string;
    returnSignatureArray: boolean;
    dependencies?: JadeDependencies;
  }) {
    super(walletConfig.network, dependencies);
    this.walletConfig = walletConfig;
    this.returnSignatureArray = returnSignatureArray;
    this.unsignedPsbt = base64ToBytes(psbt);
    this.base64string = psbt;
  }

  async run() {
    return await this.withDevice(
      async (jade: IJade) => {
        const signedPSBT = await jade.signPSBT(
          this.rpcNetwork,
          this.unsignedPsbt,
        );

        if (this.returnSignatureArray) {
          const b64string = bytesToBase64(signedPSBT);
          const parsedPsbt = parsePsbt(b64string);
          const fingerprint = await jade.getMasterFingerPrint(
            this.rpcNetwork,
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
  
  constructor({ 
    bip32Path, 
    message, 
    network,
    dependencies 
  }: { 
    bip32Path: string; 
    message: string;
    network?: BitcoinNetwork;
    dependencies?: JadeDependencies;
  }) {
    super(network, dependencies);
    this.bip32Path = bip32Path;
    this.message = message;
  }
  
  async run() {
    return await this.withDevice(async (jade: IJade) => {
      const path = bip32PathToSequence(this.bip32Path);
      return await jade.signMessage(path, this.message);
    });
  }
}
