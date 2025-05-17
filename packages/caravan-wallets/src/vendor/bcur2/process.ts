import { CryptoHDKey, CryptoAccount, URRegistryDecoder } from "@keystonehq/bc-ur-registry";
import { ExtendedPublicKey, Network, BitcoinNetwork } from "@caravan/bitcoin";

interface ProcessedData {
  type: string;
  xpub: string;
  xfp?: string;
  path?: string;
}

export class URProcessor {
  private decoder: URRegistryDecoder;
  private network: BitcoinNetwork;

  constructor(network: BitcoinNetwork = Network.MAINNET) {
    this.decoder = new URRegistryDecoder();
    this.network = network;
  }

  reset() {
    this.decoder = new URRegistryDecoder();
  }

  handlePart(text: string): { progress: number } {
    if (!text.toUpperCase().startsWith("UR:")) {
      throw new Error("Invalid QR format: Must start with UR:");
    }
    this.decoder.receivePart(text);
    return { progress: this.decoder.getProgress() };
  }

  isComplete(): boolean {
    return this.decoder.isComplete();
  }

  getResult(): ProcessedData | null {
    if (!this.decoder.isComplete()) return null;

    try {
      const result = this.decoder.resultUR();
      return this.processDecodedResult(result.type, Buffer.from(result.cbor.buffer));
    } catch (err: any) {
      throw err;
    }
  }

  private processDecodedResult(type: string, cbor: Buffer): ProcessedData | null {
    try {
      if (type === "crypto-account") {
        const account = CryptoAccount.fromCBOR(cbor);
        const descriptors = account.getOutputDescriptors();
        if (!descriptors.length) throw new Error("No output descriptors found");
        
        const hdKey = descriptors[0].getCryptoKey();
        if (!hdKey || !(hdKey instanceof CryptoHDKey)) {
          throw new Error("Invalid HDKey in crypto-account");
        }

        // Extract components from CryptoHDKey
        const chainCode = hdKey.getChainCode();
        const key = hdKey.getKey();
        const origin = hdKey.getOrigin();
        const xfp = origin?.getSourceFingerprint()?.toString("hex")?.toUpperCase();
        const path = origin?.getPath();
        const depth = origin?.getDepth() || 0;
        const components = origin?.getComponents() || [];
        const index = components.length > 0 ? components[components.length - 1]?.getIndex() || 0 : 0;
        const parentFp = origin?.getSourceFingerprint() || Buffer.alloc(4);

        // Construct ExtendedPublicKey
        const xpubObj = new ExtendedPublicKey({
          depth,
          index,
          chaincode: chainCode.toString('hex'),
          pubkey: key.toString('hex'), 
          parentFingerprint: parentFp.readUInt32BE(0),
          network: this.network
        });

        const xpub = xpubObj.toBase58();

        if (!xpub) throw new Error("Failed to construct xpub from HDKey");
        return { type, xpub, xfp, path };
      }

      if (type === "crypto-hdkey") {
        const hdkey = CryptoHDKey.fromCBOR(cbor);
        if (!hdkey) {
          throw new Error("Invalid crypto-hdkey data");
        }

        const xpub = hdkey.toString();
        const origin = hdkey.getOrigin();
        const xfp = origin?.getSourceFingerprint()?.toString("hex")?.toUpperCase();
        const path = origin?.getPath();

        if (!xpub) throw new Error("xpub missing in crypto-hdkey");
        return { type, xpub, xfp, path };
      }

      throw new Error(`Unsupported UR type: ${type}`);
    } catch (err: any) {
      throw err;
    }
  }
}
