import {
  ExtendedPublicKey,
  MultisigAddressType,
  Network,
  networkData,
  P2SH,
} from "@caravan/bitcoin";
import { Psbt, Transaction } from "bitcoinjs-lib";
import { MultisigWalletConfig } from "@caravan/wallets";
import { toOutputScript } from "bitcoinjs-lib/src/address";
import * as bitcoin from "bitcoinjs-lib";
import * as ecc from "tiny-secp256k1";

bitcoin.initEccLib(ecc);

export const idToHash = (txid: string): Buffer => {
  return Buffer.from(txid, "hex").reverse();
};

export interface PsbtInput {
  hash: string | Buffer;
  index: number;
  transactionHex: string;
  redeemScript?: Buffer;
  witnessScript?: Buffer;
  bip32Derivation?: {
    masterFingerprint: Buffer;
    path: string;
    pubkey: Buffer;
  }[];
}

export interface PsbtOutput {
  address: string;
  value: number;
  bip32Derivation?: {
    masterFingerprint: Buffer;
    path: string;
    pubkey: Buffer;
  }[];
  redeemScript?: Buffer;
  witnessScript?: Buffer;
}
/**
 * This function seeks to be an updated version of the legacy `unsignedMultisigPSBT` function
 * from @caravan/bitcoin.
 */
export const getUnsignedMultisigPsbtV0 = ({
  network,
  inputs,
  outputs,
  multisigConfig,
  includeGlobalXpubs = false,
}: {
  network: Network;
  inputs: PsbtInput[];
  outputs: PsbtOutput[];
  multisigConfig: MultisigWalletConfig;
  includeGlobalXpubs: boolean;
}) => {
  const psbt = new Psbt({ network: networkData(network) });
  // should eventually support version 2, but to maintain compatibility with
  // older api and existing fixtures, will keep with 1 for now
  psbt.setVersion(1);
  for (const input of inputs) {
    const inputData = psbtInputFormatter(input, multisigConfig.addressType);
    psbt.addInput(inputData);
  }

  const formatted = outputs.map((output) =>
    psbtOutputFormatter(output, network),
  );
  psbt.addOutputs(formatted);
  const tx = psbt.data.globalMap.unsignedTx.toBuffer().toString("hex");
  if (multisigConfig && includeGlobalXpubs) {
    addGlobalXpubs(psbt, multisigConfig);
  }

  return { ...psbt, tx };
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
  const outputData: any = {
    ...output,
    script: toOutputScript(output.address, networkData(network)),
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
  multisigConfig: MultisigWalletConfig,
) => {
  const globalXpubs = multisigConfig.extendedPublicKeys.map(
    ({ xfp, bip32Path, xpub }) => {
      return {
        extendedPubkey: ExtendedPublicKey.fromBase58(xpub).encode(),
        masterFingerprint: xfp ? Buffer.from(xfp, "hex") : Buffer.alloc(0),
        path: bip32Path || "",
      };
    },
  );
  psbt.updateGlobal({ globalXpub: globalXpubs });
};
