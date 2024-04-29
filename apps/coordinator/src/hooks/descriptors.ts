import { encodeDescriptors } from "@caravan/descriptors";
import { KeyOrigin } from "@caravan/wallets";
import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { getWalletConfig } from "../selectors/wallet";
import { getMaskedDerivation } from "@caravan/bitcoin";

export function useGetDescriptors() {
  const { quorum, extendedPublicKeys, addressType, network } =
    useSelector(getWalletConfig);
  const [descriptors, setDescriptors] = useState({ change: "", receive: "" });

  useEffect(() => {
    const loadAsync = async () => {
      const multisigConfig = {
        requiredSigners: quorum.requiredSigners,
        keyOrigins: extendedPublicKeys.map(
          ({ xfp, bip32Path, xpub }: KeyOrigin) => ({
            xfp,
            bip32Path: getMaskedDerivation({ xpub, bip32Path }),
            xpub,
          }),
        ),
        addressType: addressType,
        network: network,
      };
      const { change, receive } = await encodeDescriptors(multisigConfig);
      setDescriptors({ change, receive });
    };

    loadAsync();
  }, [quorum, extendedPublicKeys, addressType, network]);
  return descriptors;
}
