import { BitcoinNetwork, Network } from "@caravan/bitcoin";
import { URProcessor } from "./vendor/bcur2/process";

interface DecodedData {
  type: string;
  xpub: string;
  xfp?: string;
  path?: string;
}

export class BCURDecoder2 {
  private processor: URProcessor;

  private error: string | null = null;

  private progress: string = "Idle";

  setProgress(value: string): void {
    this.progress = value;
  }

  setError(value: string): void {
    this.error = value;
  }

  constructor(network: BitcoinNetwork = Network.MAINNET) {
    this.processor = new URProcessor(network);
  }

  reset() {
    this.processor = new URProcessor();
    this.error = null;
    this.progress = "Idle";
  }

  private handleDecodedResult(type: string, data: DecodedData): DecodedData | null {
    try {
      return data;
    } catch (err: any) {
      console.error("Error decoding UR:", err);
      this.error = err.message || String(err);
      return null;
    }
  }

  receivePart(text: string): void {
    try {
      if (text.toUpperCase().startsWith("UR:")) {
        const { progress } = this.processor.handlePart(text);
      
        if (this.processor.isComplete()) {
          this.progress = "Complete";
        } else {
          this.progress = `Processing QR parts: ${Math.round(progress * 100)}%`;
        }
      } else {
        this.error = "Invalid QR format: Must start with UR:";
      }
    } catch (err: any) {
      this.error = err.message || String(err);
    }
  }

  isComplete(): boolean {
    return this.processor.isComplete() || Boolean(this.error);
  }

  getProgress(): string {
    return this.progress;
  }

  getError(): string | null {
    return this.error;
  }

  getDecodedData(): DecodedData | null {
    if (!this.processor.isComplete()) return null;

    try {
      const result = this.processor.getResult();
      if (!result) return null;
      return this.handleDecodedResult(result.type, result);
    } catch (err: any) {
      this.error = err.message || String(err);
      return null;
    }
  }
}
