import { usePsbtDetails } from "../../../../../hooks";
import { satoshisToBitcoins } from "@caravan/bitcoin";

export const usePsbtHook = (psbtHex: string | null) => {
  const { txTemplate, error, calculateFee } = usePsbtDetails(psbtHex!);
  return { txTemplate, error, calculateFee };
};

export const calculateFees = (
  txTemplate: any,
  previewTxTemplate: any | null,
  calculatePreviewFee: () => string,
) => {
  const currentFees = satoshisToBitcoins(txTemplate.currentFee);
  const newFees = previewTxTemplate
    ? satoshisToBitcoins(calculatePreviewFee())
    : currentFees;
  const additionalFees = satoshisToBitcoins(
    (
      parseFloat(calculatePreviewFee()) - parseFloat(txTemplate.currentFee)
    ).toString(),
  );

  return { currentFees, newFees, additionalFees };
};
