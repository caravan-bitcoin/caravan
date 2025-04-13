import { CryptoHDKey, CryptoAccount, URRegistryDecoder } from "@keystonehq/bc-ur-registry";
import { ExtendedPublicKey, Network, BitcoinNetwork } from "@caravan/bitcoin";

interface DecodedData {
  type: string;
  xpub: string;
  xfp?: string;
  path?: string;
}

export class BCURDecoder2 {
  private decoder: URRegistryDecoder;
  private error: string | null = null;
  private progress: string = "Idle";
  private network: BitcoinNetwork = Network.MAINNET;

  constructor(network: BitcoinNetwork = Network.MAINNET) {
    this.decoder = new URRegistryDecoder();
    this.network = network;
  }

  reset() {
    this.decoder = new URRegistryDecoder();
    this.error = null;
    this.progress = "Idle";
  }

  private handleDecodedResult(type: string, cbor: Buffer): DecodedData | null {
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
      console.error("Error decoding UR:", err);
      this.error = err.message || String(err);
      return null;
    }
  }

  receivePart(text: string): void {
    try {
      if (!text.toUpperCase().startsWith("UR:")) {
        this.error = "Invalid QR format: Must start with UR:";
        return;
      }

      this.decoder.receivePart(text);
      
      if (!this.decoder.isComplete()) {
        const progress = this.decoder.getProgress();
        this.progress = `Processing QR parts: ${Math.round(progress * 100)}%`;
      } else {
        this.progress = "Complete";
      }
    } catch (err: any) {
      this.error = err.message || String(err);
    }
  }

  isComplete(): boolean {
    return this.decoder.isComplete() || !!this.error;
  }

  getProgress(): string {
    return this.progress;
  }

  getError(): string | null {
    return this.error;
  }

  getDecodedData(): DecodedData | null {
    if (!this.decoder.isComplete()) return null;

    try {
      const result = this.decoder.resultUR();
      return this.handleDecodedResult(result.type, Buffer.from(result.cbor.buffer));
    } catch (err: any) {
      this.error = err.message || String(err);
      return null;
    }
  }
}
