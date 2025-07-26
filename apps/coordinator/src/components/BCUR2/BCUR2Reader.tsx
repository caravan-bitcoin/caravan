import React from "react";
import { ExtendedPublicKeyData } from "@caravan/wallets";
import { BitcoinNetwork } from "@caravan/bitcoin";
import BCUR2Scanner from "./BCUR2Scanner";

interface BCUR2ReaderBaseProps {
  onStart?: () => void;
  onClear: () => void;
  startText?: string;
  width?: string | number;
  autoStart?: boolean;
  validatePSBT?: (psbt: string) => boolean;
}

interface BCUR2ReaderXPubProps extends BCUR2ReaderBaseProps {
  mode: "xpub";
  network: BitcoinNetwork;
  onSuccess: (data: ExtendedPublicKeyData) => void;
}

interface BCUR2ReaderPSBTProps extends BCUR2ReaderBaseProps {
  mode: "psbt";
  network?: BitcoinNetwork;
  onSuccess: (psbt: string) => void;
}

type BCUR2ReaderProps = BCUR2ReaderXPubProps | BCUR2ReaderPSBTProps;

/**
 * Wrapper component that renders the appropriate BCUR2 reader based on mode.
 * TypeScript ensures type safety for the onSuccess callback based on the mode.
 */
const BCUR2Reader: React.FC<BCUR2ReaderProps> = (props) => {
  return <BCUR2Scanner {...props} />;
};

export default BCUR2Reader;
