import { useState, useCallback } from "react";
import { useSelector } from "react-redux";
import { createCPFPTransaction, SCRIPT_TYPES } from "@caravan/fees";
import { Network } from "@caravan/bitcoin";
import { PsbtV2 } from "@caravan/psbt";
import { FeeBumpResult, FeeBumpStatus } from "../types";
import {
  useFeeBumpTransaction,
  useFeeBumpTxHex,
  useSelectedFeeRate,
  useSelectedFeePriority,
  useSelectedFeeBumpStrategy,
  useSpendableOutputIndex,
  useChangeAddress,
  useFeeBumpDispatch,
  setFeeBumpResult,
  setFeeBumpError,
  setFeeBumpStatus,
  usePsbtVersion,
} from "../context";

/**
 * Hook for creating CPFP (Child-Pays-For-Parent) transactions
 *
 * This hook provides functionality to create child transactions that spend outputs
 * from unconfirmed parent transactions, effectively accelerating their confirmation
 * by paying higher fees.
 */
export const useCPFP = () => {
  const [isCreating, setIsCreating] = useState(false);

  // Get state from context
  const transaction = useFeeBumpTransaction();
  const txHex = useFeeBumpTxHex();
  const selectedFeeRate = useSelectedFeeRate();
  const selectedPriority = useSelectedFeePriority();
  const selectedStrategy = useSelectedFeeBumpStrategy();
  const spendableOutputIndex = useSpendableOutputIndex();
  const changeAddress = useChangeAddress();
  const selectedPsbtVersion = usePsbtVersion();
  const feeBumpDispatch = useFeeBumpDispatch();

  // Get wallet configuration from Redux
  const network = useSelector(
    (state: any) => state.settings.network,
  ) as Network;
  const requiredSigners = useSelector(
    (state: any) => state.wallet.requiredSigners,
  );
  const totalSigners = useSelector((state: any) => state.wallet.totalSigners);
  const depositNodes = useSelector((state: any) => state.wallet.deposits);
  const changeNodes = useSelector((state: any) => state.wallet.change);
  const addressType = useSelector((state: any) => state.settings.addressType);

  const getScriptType = useCallback(() => {
    switch (addressType) {
      case "P2SH-P2WSH":
        return SCRIPT_TYPES.P2SH_P2WSH;
      case "P2WSH":
        return SCRIPT_TYPES.P2WSH;
      default:
        return SCRIPT_TYPES.P2SH;
    }
  }, [addressType]);

  /**
   * Get available UTXOs for the CPFP child transaction
   */
  const getAvailableUtxos = useCallback(() => {
    // Combine deposit and change UTXOs
    const allUtxos = [...(depositNodes || []), ...(changeNodes || [])];

    // Convert to the format expected by caravan-fees
    return allUtxos
      .filter((utxo: any) => utxo && utxo.txid && typeof utxo.vout === "number")
      .map((utxo: any) => ({
        txid: utxo.txid,
        vout: utxo.vout,
        value: utxo.value?.toString() || "0",
        witnessUtxo: {
          script: Buffer.from(utxo.witnessUtxo?.script || [], "hex"),
          value: parseInt(utxo.value?.toString() || "0"),
        },
      }));
  }, [depositNodes, changeNodes]);

  /**
   * Creates a CPFP transaction
   *
   * @param options Configuration options for the CPFP transaction
   * @returns Promise that resolves to the base64-encoded PSBT
   */
  const createCPFPTx = useCallback(
    async (options: {
      spendableOutputIndex: number;
      changeAddress?: string;
    }) => {
      if (!transaction || !txHex) {
        throw new Error("No transaction selected for CPFP");
      }

      setIsCreating(true);
      feeBumpDispatch(setFeeBumpStatus(FeeBumpStatus.CREATING));

      try {
        // Get available UTXOs
        const availableUtxos = getAvailableUtxos();

        if (availableUtxos.length === 0) {
          throw new Error(
            "No available UTXOs found for CPFP child transaction",
          );
        }

        // Determine change address
        const finalChangeAddress =
          options.changeAddress?.trim() ||
          changeNodes?.[0]?.address ||
          depositNodes?.[0]?.address;

        if (!finalChangeAddress) {
          throw new Error("No change address available for CPFP transaction");
        }

        // Create CPFP transaction using caravan-fees
        const psbtBase64 = createCPFPTransaction({
          originalTx: txHex,
          availableInputs: availableUtxos,
          spendableOutputIndex: options.spendableOutputIndex,
          changeAddress: finalChangeAddress,
          network,
          dustThreshold: "546", // Standard dust threshold
          scriptType: getScriptType(),
          targetFeeRate: selectedFeeRate,
          absoluteFee: "10", // Let the function calculate based on target rate
          requiredSigners,
          totalSigners,
          strict: false, // Allow non-strict mode for better UX
        });

        // Convert PSBT version if needed
        const finalPsbtBase64 =
          selectedPsbtVersion === "v0"
            ? new PsbtV2(psbtBase64).toV0("base64")
            : psbtBase64;

        // Estimate the child transaction fee

        const estimatedChildVsize = 180;
        const estimatedChildFee = Math.ceil(
          selectedFeeRate * estimatedChildVsize,
        ).toString();

        // Create result object
        const result: FeeBumpResult = {
          psbtBase64: finalPsbtBase64,
          newFee: estimatedChildFee,
          newFeeRate: selectedFeeRate,
          strategy: selectedStrategy,
          isCancel: false, // CPFP is never a cancel operation
          priority: selectedPriority,
          createdAt: new Date().toISOString(),
        };

        feeBumpDispatch(setFeeBumpResult(result));
        feeBumpDispatch(setFeeBumpStatus(FeeBumpStatus.SUCCESS));

        return psbtBase64;
      } catch (error) {
        console.error("Error creating CPFP transaction:", error);
        const errorMessage =
          error instanceof Error
            ? error.message
            : "Unknown error creating CPFP transaction";

        feeBumpDispatch(setFeeBumpError(errorMessage));
        feeBumpDispatch(setFeeBumpStatus(FeeBumpStatus.ERROR));
        throw error;
      } finally {
        setIsCreating(false);
      }
    },
    [
      transaction,
      txHex,
      selectedFeeRate,
      selectedPriority,
      selectedStrategy,
      selectedPsbtVersion,
      network,
      requiredSigners,
      totalSigners,
      getAvailableUtxos,
      changeNodes,
      depositNodes,
      feeBumpDispatch,
    ],
  );

  return {
    createCPFPTx,
    isCreating,
  };
};
