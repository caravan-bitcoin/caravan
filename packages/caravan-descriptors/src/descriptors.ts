import { getRustAPI } from "./wasmLoader";
import {
  BitcoinNetwork,
  MultisigAddressType,
  validateExtendedPublicKeyForNetwork,
} from "@caravan/bitcoin";

// TODO: should come from unchained-wallets
export interface KeyOrigin {
  xfp: string;
  bip32Path: string;
  xpub: string;
}

// should be a 32 byte hex string
export type PolicyHmac = string;
// should be an 8 byte hex string
export type RootFingerprint = string;

export interface MultisigWalletConfig {
  requiredSigners: number;
  addressType: MultisigAddressType;
  keyOrigins: KeyOrigin[];
  network: BitcoinNetwork | "bitcoin";
}

export const decodeDescriptors = async (
  internal: string,
  external: string,
  network?: BitcoinNetwork,
): Promise<MultisigWalletConfig> => {
  const { ExtendedDescriptor, CaravanConfig, Network } = await getRustAPI();
  const external_descriptor = ExtendedDescriptor.from_str(external);
  const internal_descriptor = ExtendedDescriptor.from_str(internal);
  let _network: BitcoinNetwork | "bitcoin";
  if (network === "mainnet" || !network) {
    _network = "bitcoin";
  } else {
    _network = network;
  }
  const config = CaravanConfig.new(
    Network.from_str(_network),
    external_descriptor,
    internal_descriptor,
    "test1",
    "public",
  );
  const configObj = JSON.parse(config.to_string_pretty());
  const requiredSigners = configObj.quorum.requiredSigners;
  const keyOrigins = configObj.extendedPublicKeys.map(
    ({ bip32Path, xpub, xfp }: KeyOrigin): KeyOrigin => {
      if (network) {
        const error = validateExtendedPublicKeyForNetwork(xpub, network);
        if (error) {
          throw new Error(
            `xpubs do not match expected network ${network}: ${error}`,
          );
        }
      }
      return {
        bip32Path,
        xpub,
        xfp,
      };
    },
  );

  return {
    addressType: config.address_type() as MultisigAddressType,
    requiredSigners,
    keyOrigins,
    network: _network,
  };
};

export const encodeDescriptors = async (
  config: MultisigWalletConfig,
): Promise<{ receive: string; change: string }> => {
  const bdk = await getRustAPI();
  const { MultisigWalletConfig: RsWalletConfig } = bdk;
  const wallet = RsWalletConfig.from_str(JSON.stringify(config));

  return {
    receive: wallet.external_descriptor().to_string(),
    change: wallet.internal_descriptor().to_string(),
  };
};

const checksumRegex = /#[0-9a-zA-Z]{8}/g;

export const getChecksum = async (descriptor: string) => {
  // let's just check that the descriptor is valid
  try {
    await getWalletFromDescriptor(descriptor);
  } catch (e) {
    if (e instanceof Error) {
      throw new Error(`Invalid descriptor: ${e.message}`);
    } else {
      throw e;
    }
  }
  const checksum = descriptor.match(checksumRegex);
  const pieces = descriptor.split("#");
  if (!checksum || pieces.length !== 2) {
    throw new Error("Could not find valid checksum");
  }
  return pieces[1];
};

export const getWalletFromDescriptor = async (
  descriptor: string,
  network?: BitcoinNetwork,
): Promise<MultisigWalletConfig> => {
  let internal: string = "",
    external: string = "";
  if (descriptor.includes("0/*")) {
    external = descriptor;
    internal = descriptor.replace(/0\/\*/g, "1/*").replace(checksumRegex, "");
  } else if (descriptor.includes("1/*")) {
    internal = descriptor;
    external = descriptor.replace(/1\/\*/g, "0/*").replace(checksumRegex, "");
  }
  return await decodeDescriptors(internal, external, network);
};

export default { encodeDescriptors, decodeDescriptors };
