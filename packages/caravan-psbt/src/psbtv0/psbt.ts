import {
  ExtendedPublicKey,
  fingerprintToFixedLengthHex,
  generateMultisigFromHex,
  isValidSignature,
  MultisigAddressType,
  multisigSignatureBuffer,
  Network,
  networkData,
  P2SH,
  signatureNoSighashType,
} from "@caravan/bitcoin";
import { Psbt, Transaction } from "bitcoinjs-lib-v6";
import { MultisigWalletConfig } from "@caravan/multisig";
import { toOutputScript } from "bitcoinjs-lib-v6/src/address.js";
import { GlobalXpub } from "bip174/src/lib/interfaces.js";
// asmjs version is less performant than wasm version however
// it should avoid any configuration challenges. If these can
// be sorted out and simplified then we can use the primary module with wasm
import * as ecc from "../../vendor/tiny-secp256k1-asmjs/lib/index.js";
import * as bitcoin from "bitcoinjs-lib-v6";
import { bufferize } from "../functions";
import BigNumber from "bignumber.js";
import { reverseBuffer } from "bitcoinjs-lib-v6/src/bufferutils.js";
import { autoLoadPSBT } from "./utils";

bitcoin.initEccLib(ecc);

export interface PsbtInput {
  hash: string | Buffer;
  index: number;
  transactionHex: string;
  redeemScript?: Buffer;
  witnessScript?: Buffer;
  // a lot of overlap between bip32Derivation
  // and spending wallet. Spending wallet has
  // partial path (for the braid) and only the extended
  // public key, not naked pubkey in the script.
  bip32Derivation?: {
    masterFingerprint: Buffer;
    path: string;
    pubkey: Buffer;
  }[];
  spendingWallet: MultisigWalletConfig;
}

export interface PsbtOutput {
  address: string;
  value: number;
  // only have this information for situations like change outputs
  bip32Derivation?: {
    masterFingerprint: Buffer;
    path: string;
    pubkey: Buffer;
  }[];
  // P2SH should only have redeem script
  // P2WSH should only have witness script
  // P2SH-P2WSH should have both
  redeemScript?: Buffer;
  witnessScript?: Buffer;
}
/**
 * This function seeks to be an updated version of the legacy `unsignedMultisigPSBT` function
 * from @caravan/bitcoin.
 * It takes the network and a set of inputs and outputs which it creates a PSBT from.
 * This combines several operator roles of the PSBT saga into one function, getting a PSBT
 * ready to be signed. It optionally can also add the global xpubs to the PSBT.
 */
export const getUnsignedMultisigPsbtV0 = ({
  network,
  inputs,
  outputs,
  includeGlobalXpubs = false,
}: {
  network: Network;
  inputs: PsbtInput[];
  outputs: PsbtOutput[];
  includeGlobalXpubs?: boolean;
}): Psbt => {
  const psbt = new Psbt({ network: networkData(network) });
  // should eventually support version 2, but to maintain compatibility with
  // older api and existing fixtures, will keep with 1 for now
  psbt.setVersion(1);
  for (const input of inputs) {
    const inputData = psbtInputFormatter(
      input,
      input.spendingWallet.addressType,
    );
    psbt.addInput(inputData);
  }

  const formatted = outputs.map((output) =>
    psbtOutputFormatter(output, network),
  );
  psbt.addOutputs(formatted);
  if (includeGlobalXpubs) {
    addGlobalXpubs(psbt, inputs, network);
  }

  return psbt;
};

const psbtInputFormatter = (
  input: PsbtInput,
  addressType: MultisigAddressType,
) => {
  const tx = Transaction.fromHex(input.transactionHex);
  const inputData: any = { ...input };
  if (addressType === P2SH) {
    const nonWitnessUtxo = tx.toBuffer();
    inputData.nonWitnessUtxo = nonWitnessUtxo;
  } else {
    inputData.witnessUtxo = tx.outs[input.index];
  }

  // Delete key values with undefined values
  Object.keys(inputData).forEach((key) => {
    if (inputData[key] === undefined) {
      delete inputData[key];
    }
  });

  return inputData;
};

const psbtOutputFormatter = (output: PsbtOutput, network: Network) => {
  const script = toOutputScript(output.address, networkData(network));
  const outputData: any = {
    ...output,
    script,
    value: output.value,
  };
  // Delete key values with undefined values
  Object.keys(outputData).forEach((key) => {
    if (outputData[key] === undefined) {
      delete outputData[key];
    }
  });
  return outputData;
};

export const addGlobalXpubs = (
  psbt: Psbt,
  inputs: PsbtInput[],
  network: Network,
) => {
  const globalExtendedPublicKeys: ExtendedPublicKey[] = [];

  // check each input for the xpubs that need to be included
  for (const input of inputs) {
    // only add if the input has a spending wallet defined
    if (input.spendingWallet) {
      // for each input, check the defined xpubs in the spending wallet config
      input.spendingWallet.extendedPublicKeys.forEach((key) => {
        if (!key.bip32Path) {
          return;
        }
        const extendedPublicKey = ExtendedPublicKey.fromBase58(key.xpub);
        extendedPublicKey.network = network;
        extendedPublicKey.path = key.bip32Path;
        extendedPublicKey.rootFingerprint = key.xfp;

        // avoid duplicates
        const alreadyFound = globalExtendedPublicKeys.find(
          (existingExtendedPublicKey: ExtendedPublicKey) =>
            existingExtendedPublicKey.toBase58() ===
            extendedPublicKey.toBase58(),
        );

        // for each extended public key in each input that is not already in the global xpubs, add it
        if (!alreadyFound) {
          globalExtendedPublicKeys.push(extendedPublicKey);
        }
      });
    }
  }

  // convert the extended public keys to the format that the psbt library expects
  const globalXpubs = globalExtendedPublicKeys.map(formatGlobalXpub);

  psbt.updateGlobal({ globalXpub: globalXpubs });
};

const formatGlobalXpub = (extendedPublicKey: ExtendedPublicKey) => {
  const global: Partial<GlobalXpub> = {
    extendedPubkey: extendedPublicKey.encode(),
  };

  if (extendedPublicKey.rootFingerprint) {
    global.masterFingerprint = Buffer.from(
      extendedPublicKey.rootFingerprint,
      "hex",
    );
  } else if (extendedPublicKey.parentFingerprint) {
    // If there is no root fingerprint, this will be the "masked" fingerprint
    // which is the parent fingerprint.
    global.masterFingerprint = Buffer.from(
      fingerprintToFixedLengthHex(extendedPublicKey.parentFingerprint),
      "hex",
    );
  } else {
    global.masterFingerprint = Buffer.alloc(0);
  }
  global.path = extendedPublicKey.path || "";

  return global as GlobalXpub;
};

/**
 * Validate the signature on a psbt for a given input. Returns false if no
 * valid signature is found otherwise returns the public key that was signed for.
 *
 * This is a port of the validateMultisigSignature function from @caravan/bitcoin
 * to support a newer API and be more PSBT-native.
 */
export const validateMultisigPsbtSignature = (
  raw: string | Buffer,
  inputIndex: number,
  inputSignature: Buffer,
  // input amount is required for segwit inputs as it is hashed along w/ tx
  inputAmount?: string,
): boolean | string => {
  const psbt = Psbt.fromBuffer(bufferize(raw));

  if (psbt.inputCount === 0 || psbt.inputCount < inputIndex + 1) {
    throw new Error("Input index is out of range.");
  }
  const signatureBuffer = multisigSignatureBuffer(
    signatureNoSighashType(inputSignature.toString("hex")),
  );

  const input = psbt.data.inputs[inputIndex];
  const msgHash = getHashForSignature(psbt, inputIndex, inputAmount);

  for (const { pubkey } of input.bip32Derivation ?? []) {
    if (isValidSignature(pubkey, msgHash, signatureBuffer)) {
      return pubkey.toString("hex");
    }
  }
  return false;
};

const getHashForSignature = (
  psbt: Psbt,
  inputIndex: number,
  // input amount is required for segwit inputs as it is hashed along w/ tx
  inputAmount?: string,
  sigHashFlag: number = Transaction.SIGHASH_ALL,
): Buffer => {
  const tx = Transaction.fromBuffer(psbt.data.globalMap.unsignedTx.toBuffer());

  const input = psbt.data.inputs[inputIndex];

  if (!input.witnessScript && input.redeemScript) {
    return tx.hashForSignature(inputIndex, input.redeemScript, sigHashFlag);
  } else if (input.witnessScript) {
    if (!inputAmount) {
      throw new Error("Input amount is required for segwit inputs.");
    }

    const amountSats = new BigNumber(inputAmount).toNumber();
    return tx.hashForWitnessV0(
      inputIndex,
      input.witnessScript,
      amountSats,
      sigHashFlag,
    );
  }
  throw new Error("No redeem or witness script found for input.");
};

/***
 * These should be deprecated eventually once we have better typescript support
 * and a more api for handling PSBT saga.
 * They are ports over from the legacy psbt code in caravan/bitcoin
 */

/**
 * Translates a PSBT into inputs/outputs consumable by supported non-PSBT devices in the
 * `@caravan/wallets` library.
 *
 * FIXME - Have only confirmed this is working for P2SH addresses on Ledger on regtest
 */
export function translatePSBT(
  network,
  addressType,
  psbt: string,
  signingKeyDetails,
) {
  if (addressType !== P2SH) {
    throw new Error(
      "Unsupported addressType -- only P2SH is supported right now",
    );
  }

  const localPSBT = autoLoadPSBT(psbt, { network: networkData(network) });

  if (localPSBT === null) return null;

  // The information we need to provide proper @caravan/wallets style objects to the supported
  // non-PSBT devices, we need to grab info from different places from within the PSBT.
  //    1. the "data inputs"
  //    2. the "transaction inputs"
  //
  // We'll do that in the functions below.

  // First, we check that we actually do have any inputs to sign:
  const bip32Derivations = filterRelevantBip32Derivations(
    localPSBT,
    signingKeyDetails,
  );

  // The shape of these return objects are specific to existing code
  // in @caravan/wallets for signing with Trezor and Ledger devices.
  const unchainedInputs = getUnchainedInputsFromPSBT(
    network,
    addressType,
    localPSBT,
  );
  const unchainedOutputs = getUnchainedOutputsFromPSBT(localPSBT);

  return {
    unchainedInputs,
    unchainedOutputs,
    bip32Derivations,
  };
}

/**
 * Create @caravan/wallets style transaction input objects from a PSBT
 */
function getUnchainedInputsFromPSBT(network, addressType, psbt) {
  return psbt.txInputs.map((input, index) => {
    const dataInput = psbt.data.inputs[index];

    // FIXME - this is where we're currently only handling P2SH correctly
    const fundingTxHex = dataInput.nonWitnessUtxo.toString("hex");
    const fundingTx = Transaction.fromHex(fundingTxHex);
    const multisig = generateMultisigFromHex(
      network,
      addressType,
      dataInput.redeemScript.toString("hex"),
    );

    return {
      amountSats: fundingTx.outs[input.index].value,
      index: input.index,
      transactionHex: fundingTxHex,
      txid: reverseBuffer(input.hash).toString("hex"),
      multisig,
    };
  });
}

/**
 * Create @caravan/wallets style transaction output objects from a PSBT
 */
function getUnchainedOutputsFromPSBT(psbt) {
  return psbt.txOutputs.map((output) => ({
    address: output.address,
    amountSats: output.value,
  }));
}

/**
 * Create @caravan/wallets style transaction input objects
 *
 * @param {Object} psbt - Psbt bitcoinjs-lib object
 * @param {Object} signingKeyDetails - Object containing signing key details (Fingerprint + bip32path prefix)
 * @return {Object[]} bip32Derivations - array of signing bip32Derivation objects
 */
function filterRelevantBip32Derivations(psbt, signingKeyDetails) {
  return psbt.data.inputs.map((input) => {
    const bip32Derivation = input.bip32Derivation.filter(
      (b32d) =>
        b32d.path.startsWith(signingKeyDetails.path) &&
        b32d.masterFingerprint.toString("hex") === signingKeyDetails.xfp,
    );

    if (!bip32Derivation.length) {
      throw new Error("Signing key details not included in PSBT");
    }
    return bip32Derivation[0];
  });
}
