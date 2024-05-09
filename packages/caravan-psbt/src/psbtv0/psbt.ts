import {
  ExtendedPublicKey,
  fingerprintToFixedLengthHex,
  MultisigAddressType,
  Network,
  networkData,
  P2SH,
} from "@caravan/bitcoin";
import { Psbt, Transaction } from "bitcoinjs-lib-v6";
import { MultisigWalletConfig } from "@caravan/multisig";
import { toOutputScript } from "bitcoinjs-lib-v6/src/address";
import { GlobalXpub } from "bip174/src/lib/interfaces.js";
// asmjs version is less performant than wasm version however
// it should avoid any configuration challenges. If these can
// be sorted out and simplified then we can use the primary module with wasm
import * as ecc from "../../vendor/tiny-secp256k1-asmjs/lib/index.js";
import * as bitcoin from "bitcoinjs-lib-v6";
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
