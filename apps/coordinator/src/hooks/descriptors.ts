import { encodeDescriptors } from "@caravan/descriptors";
import { KeyOrigin } from "@caravan/wallets";
import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { getWalletConfig } from "../selectors/wallet";
import { getMaskedDerivation } from "@caravan/bitcoin";

export function useGetDescriptors() {
  const walletConfig = useSelector(getWalletConfig);
  const [descriptors, setDescriptors] = useState({ change: "", receive: "" });

  useEffect(() => {
    const loadAsync = async () => {
      const multisigConfig = {
        requiredSigners: walletConfig.quorum.requiredSigners,
        keyOrigins: walletConfig.extendedPublicKeys.map(
          ({ xfp, bip32Path, xpub }: KeyOrigin) => ({
            xfp,
            bip32Path: getMaskedDerivation({ xpub, bip32Path }),
            xpub,
          }),
        ),
        addressType: walletConfig.addressType,
        network: walletConfig.network,
      };
      const { change, receive } = await encodeDescriptors(multisigConfig);
      setDescriptors({ change, receive });
    };
    loadAsync();
  }, [walletConfig]);
  return descriptors;
}
