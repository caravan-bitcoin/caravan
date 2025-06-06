import {
  DirectKeystoreInteraction,
  PENDING,
  ACTIVE,
  INFO,
} from "./interaction";

import {
  Jade,
  JadeInterface,
  SerialTransport,
  IJade,
  IJadeInterface,
  JadeTransport,
  base64ToBytes,
} from "jadets";

import {
  BitcoinNetwork,
  ExtendedPublicKey,
  getPsbtVersionNumber,
  PsbtV2,
  MultisigAddressType,
} from "@caravan/bitcoin";

import { MultisigWalletConfig } from "./types";

export const JADE = "jade";

function convertToMyMultisigVariant(addressType: MultisigAddressType): string {
  switch (addressType) {
    case "P2SH":
      return `sh(multi(k))`;
    case "P2WSH":
      return `wsh(multi(k))`;
    case "P2SH-P2WSH":
      return `sh(wsh(multi(k)))`;
    default:
      throw new Error(`Unsupported multisig address type: ${addressType}`);
  }
}

function parseBip32Path(path_i: string): number[] {
  let path = path_i;
  if (path.startsWith("m/")) {
    path = path.substring(2);
  } else if (path.startsWith("m")) {
    path = path.substring(1);
    if (path.startsWith("/")) {
      path = path.substring(1);
    }
  }
  const segments = path.split("/");
  const result: number[] = [];
  for (const segment of segments) {
    // Check if the segment is hardened (ends with "'" or "h")
    let hardened = false;
    let numStr = segment;
    if (segment.endsWith("'") || segment.endsWith("h")) {
      hardened = true;
      numStr = segment.slice(0, -1);
    }
    const index = parseInt(numStr, 10);
    if (isNaN(index)) {
      throw new Error(`Invalid path segment: ${segment}`);
    }
    // Hardened index = index + 0x80000000 (2^31)
    result.push(index + (hardened ? 0x80000000 : 0));
  }
  return result;
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
      // Connect to the device.
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
  //make sure network comes out right

  messages() {
    return super.messages();
  }

  async run() {
    return await this.withDevice(this.network, async (jade: IJade) => {
      const path = parseBip32Path(this.bip32Path);
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
  //make sure network comes out right

  messages() {
    return super.messages();
  }

  async run() {
    return await this.withDevice(this.network, async (jade: IJade) => {
      const path = parseBip32Path(this.bip32Path);
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
        const ping = await jade.ping();
        return ping;
      },
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

  /**
   * Adds messages about BIP32 path warnings.
   */

  async run() {
    return await this.withDevice(this.network, async (jade: IJade) => {
      const ping = await jade.ping();
      return {
        ping,
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
	this.base64string = psbt
  }

  async run() {
    return await this.withDevice(
      this.walletConfig.network,
      async (jade: IJade) => {
		  console.log(this.base64string);
		  console.log("hi");
        const signedPSBT = await jade.signPSBT(
          this.walletConfig.network,
          this.unsignedPsbt,
        );
        return signedPSBT;
      },
    );
  }
}
