import React from "react";
import { ExtendedPublicKeyData } from "@caravan/wallets";
import { BitcoinNetwork } from "@caravan/bitcoin";
import BCUR2XPubReader from "./BCUR2XPubReader";
import BCUR2PSBTReader from "./BCUR2PSBTReader";

type ScanMode = "xpub" | "psbt";

interface BCUR2ReaderProps {
  onStart?: () => void;
  onSuccess?: (data: ExtendedPublicKeyData) => void;
  onPSBTSuccess?: (psbt: string) => void;
  onClear: () => void;
  startText?: string;
  width?: string | number;
  network?: BitcoinNetwork;
  mode?: ScanMode;
  autoStart?: boolean;
}

/**
 * Wrapper component that provides backward compatibility for BCUR2Reader.
 * Automatically selects the appropriate reader based on the provided callbacks.
 * If both onSuccess and onPSBTSuccess are provided, defaults to PSBT mode.
 */
const BCUR2Reader: React.FC<BCUR2ReaderProps> = ({
  onStart,
  onSuccess,
  onPSBTSuccess,
  onClear,
  startText,
  width,
  network,
  mode,
  autoStart = false,
}) => {
  // Determine the mode based on props if not explicitly provided
  const detectedMode: ScanMode = mode || (onPSBTSuccess ? "psbt" : "xpub");

  if (detectedMode === "psbt" && onPSBTSuccess) {
    return (
      <BCUR2PSBTReader
        onStart={onStart}
        onSuccess={onPSBTSuccess}
        onClear={onClear}
        startText={startText}
        width={width}
        autoStart={autoStart}
      />
    );
  }

  if (detectedMode === "xpub" && onSuccess) {
    return (
      <BCUR2XPubReader
        onStart={onStart}
        onSuccess={onSuccess}
        onClear={onClear}
        startText={startText}
        width={width}
        network={network}
        autoStart={autoStart}
      />
    );
  }

  // Fallback - should not normally reach here
  throw new Error(
    "BCUR2Reader: Either onSuccess (for xpub) or onPSBTSuccess (for PSBT) must be provided",
  );
};

export default BCUR2Reader;
