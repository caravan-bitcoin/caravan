/**
 * @file This file primarily contains utility functions migrated from the
 * legacy psbt module in @caravan/bitcoin. With the new @caravan/psbt
 * module, the goal is to make a more modular and legible API. But in order
 * to make migrations easier from the old API, we need to provide conversion functions
 * for converting the deeply nested objects in the legacy API.
 */
import {
  generateBip32DerivationByIndex,
  generateBraid,
  multisigAddressType,
  multisigBraidDetails,
  multisigRedeemScript,
  multisigWitnessScript,
  Network,
  P2SH,
  P2SH_P2WSH,
  P2WSH,
} from "@caravan/bitcoin";
import {
  braidDetailsToWalletConfig,
  MultisigWalletConfig,
} from "@caravan/multisig";
import { PsbtInput, PsbtOutput } from "./psbt";
import BigNumber from "bignumber.js";
import { Psbt } from "bitcoinjs-lib-v6";
export const idToHash = (txid: string): Buffer => {
  return Buffer.from(txid, "hex").reverse();
};
import { PSBT_MAGIC_BYTES } from "../constants";
import { bufferize } from "../functions";
import { BufferReader } from "bufio";

// pulling functions from the old transactions/psbt file
// so we can work with the fixtures and their deeply
// nested objects
export function psbtMultisigLock(multisig) {
  if (!multisig) {
    return {};
  }
  const multisigLock: any = {};

  // eslint-disable-next-line default-case
  switch (multisigAddressType(multisig)) {
    case P2SH:
      multisigLock.redeemScript = multisigRedeemScript(multisig).output;
      break;
    case P2WSH:
      multisigLock.witnessScript = multisigWitnessScript(multisig).output;
      break;
    case P2SH_P2WSH: // need both
      multisigLock.witnessScript = multisigWitnessScript(multisig).output;
      multisigLock.redeemScript = multisigRedeemScript(multisig).output;
      break;
  }
  return multisigLock;
}

export function getBip32Derivation(multisig, index = 0) {
  if (!multisig) {
    return;
  }
  // Already have one, return it
  if (multisig.bip32Derivation) {
    return multisig.bip32Derivation;
  }
  // Otherwise generate it
  const config = JSON.parse(multisigBraidDetails(multisig));
  const braid = generateBraid(
    config.network,
    config.addressType,
    config.extendedPublicKeys,
    config.requiredSigners,
    config.index,
  );
  return generateBip32DerivationByIndex(braid, index);
}

export interface LegacyMultisig {
  /**
   * JSON stringified object with the following properties:
   * braidDetails: {
   *   network: Network;
   *   addressType: number;
   *   extendedPublicKeys: string[];
   *   requiredSigners: number;
   *   index: string;
   * };
   */
  braidDetails: string;
  bip32Derivation?: {
    masterFingerprint: string;
    path: string;
    pubkey: Buffer;
  }[];
  redeem?: {
    output: Buffer;
  };
  witness?: {
    output: Buffer;
  };
}

// This may be incomplete as the fixture objects are extremely opaque.
// Hopefully we can build on this though as we work to convert more
// code to fully typed Typescript.
export interface LegacyInput {
  txid: string;
  index: number;
  transactionHex: string;
  amountSats: number | string;
  multisig: LegacyMultisig;
}

export interface LegacyOutput {
  address: string;
  amountSats: number | string;
  bip32Derivation?: {
    masterFingerprint: string;
    path: string;
    pubkey: Buffer;
  }[];
  witnessScript?: Buffer;
  redeemScript?: Buffer;
  multisig?: LegacyMultisig;
}

export const convertLegacyInput = (input: LegacyInput): PsbtInput => {
  return {
    hash: idToHash(input.txid),
    index: input.index,
    transactionHex: input.transactionHex,
    bip32Derivation:
      input.multisig.bip32Derivation || getBip32Derivation(input.multisig),
    ...psbtMultisigLock(input.multisig),
    spendingWallet: getWalletConfigFromInput(input),
  };
};

export const convertLegacyOutput = (output: LegacyOutput): PsbtOutput => {
  return {
    address: output.address,
    value: new BigNumber(output.amountSats).toNumber(),
    bip32Derivation:
      output.bip32Derivation || getBip32Derivation(output.multisig),
    witnessScript: output.witnessScript,
    redeemScript: output.redeemScript,
    ...psbtMultisigLock(output.multisig),
  };
};

export const getWalletConfigFromInput = (
  input: LegacyInput,
): MultisigWalletConfig => {
  return braidDetailsToWalletConfig(JSON.parse(input.multisig.braidDetails));
};

export const psbtArgsFromFixture = (
  fixture: any,
): {
  network: Network;
  inputs: PsbtInput[];
  outputs: PsbtOutput[];
} => {
  return {
    network: fixture.network as Network,
    inputs: fixture.inputs.map(convertLegacyInput),
    outputs: fixture.outputs.map(convertLegacyOutput),
  };
};

/**
 * Given a string, try to create a Psbt object based on MAGIC (hex or Base64)
 */
export function autoLoadPSBT(psbtFromFile, options?: any) {
  let psbtBuff;
  try {
    psbtBuff = bufferize(psbtFromFile);
  } catch (e) {
    return null;
  }
  try {
    const br = new BufferReader(psbtBuff);
    if (!br.readBytes(PSBT_MAGIC_BYTES.length, true).equals(PSBT_MAGIC_BYTES)) {
      return null;
    }
  } catch (e) {
    return null;
  }

  return Psbt.fromBuffer(psbtBuff, options);
}
