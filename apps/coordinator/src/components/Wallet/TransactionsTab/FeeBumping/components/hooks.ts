import { TransactionAnalyzer } from "@caravan/fees";
import { validateTransactionInputs } from "../utils";
import { FeePriority, useFeeEstimates } from "clients/fees";
import { MultisigAddressType, Network } from "@caravan/bitcoin";
import { useGetAvailableUtxos } from "../context/hooks";
import { selectWalletConfig } from "selectors/wallet";
import { useSelector } from "react-redux";
import { useMemo, useState } from "react";
import { TransactionDetails } from "@caravan/clients";

export const useAnalyzeTransaction = (
  transaction: TransactionDetails,
  txHex: string,
) => {
  const {
    availableUtxos,
    isLoading: isLoadingAvailableUtxos,
    isError: isErrorAvailableUtxos,
  } = useGetAvailableUtxos(transaction!);
  const { data: feeEstimates, isLoading: isLoadingFeeEstimates } =
    useFeeEstimates();
  const { network, addressType, requiredSigners, totalSigners } =
    useSelector(selectWalletConfig);

  const [error, setError] = useState("");

  const analysis = useMemo(() => {
    if (
      !transaction ||
      !txHex ||
      !availableUtxos.length ||
      isLoadingFeeEstimates
    )
      return null;
    try {
      // Validate inputs
      validateTransactionInputs(txHex, transaction.fee, availableUtxos);

      // Create analyzer with wallet-specific parameters
      const analyzer = new TransactionAnalyzer({
        txHex,
        network: network as Network,
        targetFeeRate: feeEstimates[FeePriority.MEDIUM] ?? 0,
        absoluteFee: transaction.fee.toString(),
        availableUtxos,
        requiredSigners,
        totalSigners,
        addressType: addressType as MultisigAddressType,
      });

      return analyzer.analyze();
    } catch (error) {
      console.error("Error analyzing transaction:", error);
      setError(
        error instanceof Error
          ? error.message
          : "Unknown error analyzing transaction",
      );
    }
  }, [
    transaction?.txid,
    txHex,
    availableUtxos.length,
    feeEstimates,
    network,
    addressType,
    requiredSigners,
    totalSigners,
  ]);

  return {
    analysis,
    error,
    isLoading: isLoadingAvailableUtxos || isLoadingFeeEstimates,
    isError: isErrorAvailableUtxos,
  };
};
