import { BraidDetails } from "./types";

// Mostly useful for dealing with test fixtures and objects from caravan
export const braidDetailsToWalletConfig = (braidDetails: BraidDetails) => {
  return {
    network: braidDetails.network,
    extendedPublicKeys: braidDetails.extendedPublicKeys.map((key) => ({
      xpub: key.base58String,
      bip32Path: key.path,
      xfp: key.rootFingerprint,
    })),
    quorum: {
      requiredSigners: braidDetails.requiredSigners,
      totalSigners: braidDetails.extendedPublicKeys.length,
    },
    name: `${braidDetails.requiredSigners}-of-${braidDetails.extendedPublicKeys.length} ${braidDetails.addressType} ${braidDetails.network} wallet`,
    addressType: braidDetails.addressType,
  };
};
