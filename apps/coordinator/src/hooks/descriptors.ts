import {
  encodeDescriptors,
  encodeDescriptorWithMultipath,
} from "@caravan/descriptors";
import { KeyOrigin } from "@caravan/wallets";
import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { getWalletConfig } from "../selectors/wallet";
import { getMaskedDerivation } from "@caravan/bitcoin";

export function useGetDescriptors() {
  const { quorum, extendedPublicKeys, addressType, network } =
    useSelector(getWalletConfig);
  const [descriptors, setDescriptors] = useState<{
    change: string;
    receive: string;
    multipath?: string;
  }>({
    change: "",
    receive: "",
  });

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
      const result = await encodeDescriptors(multisigConfig);
      const multipath = await encodeDescriptorWithMultipath(multisigConfig);
      const descriptors = {
        change: result.change || "",
        receive: result.receive || "",
        multipath: multipath || undefined,
      };
      setDescriptors(descriptors);
    };

    loadAsync();
  }, [quorum, extendedPublicKeys, addressType, network]);
  return descriptors;
}
